// Story IR -> Twee 3 / Harlowe 3.
//
// Output dialect
// --------------
// The document is Twee 3 (https://github.com/iftechfoundation/twine-specs/blob/master/twee-3-specification.md):
// a flat text file of ':: Name [tags]' headers, each followed by that
// passage's body, plus the two required special passages 'StoryTitle' and
// 'StoryData'. Twine 2.6+ imports it directly, and tweego compiles it.
//
// Passage bodies are Harlowe 3 (https://twine2.neocities.org/), Twine's
// default story format. We deliberately target a *small* subset, because the
// IR needs a small subset and because every macro used here is one more
// thing that can break on a format upgrade:
//
//   (set: $v to x) / (set: $v to it + n)           state
//   (if:) (else-if:) (else:) + hooks               branching
//   not / and / or / is / is not / > >= < <= / mod condition operators
//   (random: 1, n)                                 the weighted roll
//   (go-to: "Name")                                auto-resolution out of a random passage
//   (text-colour: gray)[...]                       greying a blocked link
//   [[display->Target]]                            links
//   ##heading   ''bold''   //italic//   ---        markup
//
// Notably NOT used:
//   * (visited:) / visits — not present across every Harlowe 3.x point
//     release, and its semantics shifted mid-series. Every "have I been here
//     before" test below runs off a $seen_<passage id> flag this exporter
//     declares and sets itself, so the text.first / text.repeat axis is
//     ours to control rather than the format's.
//   * (display:), datamaps, arrays, custom macros — nothing in the IR needs
//     them, and they make the emitted Twee much harder to hand-edit
//     afterwards, which is a thing authors actually do.
//
// Shape of the emitted story
// --------------------------
// Two kinds of passage come out of this exporter:
//
//   * a *story passage* per ir.passages entry, named by its IR id;
//   * a *transition passage* per ir.links entry, named by its IR link id.
//
// The transition passages exist because an IR link carries narration (text)
// and side effects (onTraverse), and plain [[a->b]] markup can carry
// neither. Harlowe's (link-reveal-goto:) could, but a link written as a
// macro is invisible to Twine's story map — the imported story would draw as
// a heap of unconnected passages, which makes the result useless to edit.
// Spending one passage per link keeps the map intact and keeps every jump
// expressible as [[...]].
//
// State is initialised in a 'startup'-tagged passage rather than at the top
// of the start passage: Harlowe runs 'startup' once per session, whereas the
// start passage can be re-entered (meta.topology "bidirectional" makes that
// likely) and would then reset the whole state vector mid-story.

const crypto = require('node:crypto')

// Pinned rather than floating: a Twee file names the format version it was
// authored against, and letting that drift would mean an upstream Harlowe
// release could change this output's behaviour without a commit here.
const TWINE_FORMAT = { name: 'Harlowe', version: '3.3.9' }

// The startup passage's name. Not an IR id, so it is checked against the
// IR's ids below rather than assumed free.
const INIT_PASSAGE = 'StoryInit'

// --- text objects -------------------------------------------------------

// Spec 7: consumers must accept a bare string wherever a text object is
// expected. story-ir.js exports the same helper, but this exporter is loaded
// by tests that may run before that module exists, so it carries its own
// three-line copy rather than a load-order dependency.
function normalizeText (t) {
  if (t == null) return null
  if (typeof t === 'string') return { first: t }
  return t
}

function firstText (t) {
  const n = normalizeText(t)
  return n && n.first != null ? n.first : ''
}

// repeat falls back to first (spec 7), so a text object that only
// distinguishes the first encounter still renders on every later one.
function repeatText (t) {
  const n = normalizeText(t)
  if (!n) return ''
  return n.repeat != null ? n.repeat : (n.first != null ? n.first : '')
}

function variantsOf (t) {
  const n = normalizeText(t)
  return n && Array.isArray(n.variants) ? n.variants : []
}

// --- escaping -----------------------------------------------------------

// Display text for [[display->Target]].
//
// Stripped, and why:
//   [  ]   Harlowe hook delimiters *and* the link's own brackets. A single
//          ']' in display text closes the link early and dumps the target
//          name into the prose; a '[' opens a hook that swallows the rest of
//          the passage.
//   |      the alternate link separator, [[display|Target]]. One of these in
//          display text retargets the link at whatever follows it.
//   <  >   the two link arrows are '->' and '<-'; removing the angle
//          brackets makes either arrow unformable, which is the only reason
//          a lone '-' can safely be left intact. '<' also opens raw HTML in
//          Harlowe. If you ever loosen this rule you must start escaping '-'
//          as well, or 'a - > b' becomes a retarget.
//
// Whitespace is then collapsed, because a newline inside [[ ]] splits the
// link across two lines and Harlowe stops parsing it as a link at all.
function sanitizeDisplayText (s) {
  return String(s == null ? '' : s)
    .replace(/[[\]|<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Prose in a passage body. Narrator output is arbitrary generated English,
// so it has to be defused rather than trusted.
//
//   &      first, so the entities introduced below are not double-escaped.
//   <      Harlowe passes raw HTML straight through to the DOM.
//   $name  would interpolate a story variable, printing 0 for the ones that
//          do not exist. '&#36;' renders as a literal '$'.
//   [ ]    become ( ) rather than being deleted: hook delimiters would
//          otherwise capture the rest of the passage, and a paren keeps the
//          author's bracketing legible. Lossy, but generated prose contains
//          brackets about never, and a swallowed passage is unrecoverable.
//   ^::    Twee reads a line starting with '::' as a new passage header; the
//          Twee 3 spec's escape for that is a leading backslash.
//
// Left alone deliberately: '//' (Harlowe italics — it only bites inside a
// URL, which no narrator emits), '*' and '_' (emphasis markup that mostly
// does what someone writing prose would have wanted anyway).
function escapeProse (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\$(?=[A-Za-z_])/g, '&#36;')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/^::/gm, '\\::')
}

// Twee tags are whitespace-separated inside [ ], so a tag may contain
// neither. Empty results are dropped rather than emitted as a bare space,
// which some Twee parsers read as a tag named "".
function sanitizeTag (s) {
  return String(s == null ? '' : s)
    .replace(/[[\]]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// --- IFID ---------------------------------------------------------------

// Twine requires an IFID and treats it as the story's identity: two files
// with the same IFID are the same story to it. Generating one randomly would
// rewrite every golden file on every run and make two builds of the same
// seed look like different stories, so it is derived from the two fields
// that already define the build — meta.id and meta.seed.
//
// SHA-1 gives 20 bytes; the first 16 become the UUID, with the version and
// variant bits forced so the result is a well-formed RFC-4122 v4 string. It
// is not random, but nothing downstream checks that — Twine only checks the
// shape. Uppercase because that is what Twine itself writes.
function deriveIfid (meta) {
  const m = meta || {}
  const h = crypto.createHash('sha1')
    .update('graphgram-twee ' + String(m.id) + ' ' + String(m.seed))
    .digest()
  const b = Buffer.from(h.subarray(0, 16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const hex = b.toString('hex').toUpperCase()
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-')
}

// --- conditions (spec 8) ------------------------------------------------

// Harlowe compares with words, not symbols: '=' is not an operator and 'is'
// is. Ordering comparisons do use symbols. Mixing up the two families
// produces a runtime error dialog in the player rather than a build failure
// here, hence the explicit table.
const COMPARATORS = {
  is: 'is',
  eq: 'is',
  ne: 'is not',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<='
}

function harloweLiteral (v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  return JSON.stringify(String(v))
}

// Sub-expressions of and/or are parenthesised because Harlowe's precedence
// between them is not something a reader of the emitted file should have to
// know, and the IR's nesting is the only authority on grouping.
function wrap (expr) {
  return /^\S+$/.test(expr) ? expr : '(' + expr + ')'
}

// Compiles a spec-8 condition to a Harlowe boolean expression. null in
// (always-open) gives null out, so callers can test for "no gate at all"
// rather than comparing against the string 'true'.
function harloweCondition (cond) {
  if (cond == null) return null
  if (Array.isArray(cond.all)) {
    if (!cond.all.length) return 'true'
    // A one-element all/any is just its element: buildStoryIR wraps most
    // single conditions in an all, and parenthesising those would bury every
    // gate in the story under a redundant layer of brackets.
    if (cond.all.length === 1) return harloweCondition(cond.all[0])
    return cond.all.map(c => wrap(harloweCondition(c))).join(' and ')
  }
  if (Array.isArray(cond.any)) {
    // An empty any is false, not true: "one of nothing" is unsatisfiable.
    if (!cond.any.length) return 'false'
    if (cond.any.length === 1) return harloweCondition(cond.any[0])
    return cond.any.map(c => wrap(harloweCondition(c))).join(' or ')
  }
  if (cond.not != null) return 'not ' + wrap(harloweCondition(cond.not))
  if (cond.var != null) {
    for (const key of Object.keys(COMPARATORS)) {
      if (Object.prototype.hasOwnProperty.call(cond, key)) {
        return '$' + cond.var + ' ' + COMPARATORS[key] + ' ' + harloweLiteral(cond[key])
      }
    }
    throw new Error('twine: condition on $' + cond.var + ' has no comparator (want one of ' +
      Object.keys(COMPARATORS).join(', ') + ')')
  }
  throw new Error('twine: unrecognised condition ' + JSON.stringify(cond))
}

// --- effects (spec 8) ---------------------------------------------------

// add is emitted as 'it + n' / 'it - n' rather than '$v + n' so the variable
// name appears exactly once; a rename that missed one of two occurrences
// would silently read one variable and write another. Negative deltas become
// a subtraction because 'it + -20' is legal but reads like a typo.
function harloweEffect (eff, itemVars) {
  if (!eff || eff.op == null) throw new Error('twine: effect without an op: ' + JSON.stringify(eff))
  switch (eff.op) {
    case 'set':
      return '(set: $' + eff.var + ' to ' + harloweLiteral(eff.value) + ')'
    case 'add': {
      const n = Number(eff.value)
      if (!isFinite(n)) {
        throw new Error('twine: add effect on $' + eff.var + ' has non-numeric value ' + JSON.stringify(eff.value))
      }
      return '(set: $' + eff.var + ' to it ' + (n < 0 ? '- ' + String(-n) : '+ ' + String(n)) + ')'
    }
    case 'acquire': {
      const v = (itemVars || {})[eff.item]
      if (v == null) throw new Error('twine: acquire of unknown item "' + eff.item + '"')
      return '(set: $' + v + ' to true)'
    }
    default:
      throw new Error('twine: unsupported effect op "' + eff.op + '"')
  }
}

// --- weighted random ----------------------------------------------------

function gcd (a, b) { return b ? gcd(b, a % b) : a }

// Harlowe's (random:) only deals in whole numbers, but IR weights need not
// be whole — the monster-battle primitive emits probabilities summing to 1.
// So scale every weight by the smallest power of ten that makes them all
// (near-)integral, then divide out the gcd to keep the roll's range small
// and the emitted arithmetic readable.
//
// A weight that rounds to 0 is clamped to 1: an outcome the IR declared
// possible must stay reachable, and a 1-in-N chance is a smaller lie than
// never.
function integerWeights (weights) {
  let scale = 1
  for (let k = 0; k <= 6; k++) {
    scale = Math.pow(10, k)
    if (weights.every(w => Math.abs(w * scale - Math.round(w * scale)) < 1e-6)) break
  }
  const ints = weights.map(w => Math.max(1, Math.round(w * scale)))
  const g = ints.reduce((a, b) => gcd(a, b))
  return ints.map(n => n / g)
}

// --- naming -------------------------------------------------------------

// The exporter's own bookkeeping variables. IR var names are lowercase-only
// (spec 3) and passage/link ids in practice carry an uppercase prefix, so
// these normally cannot clash — but "normally" is not "never", and a clash
// would make a passage's seen flag alias a story variable and quietly
// destroy the first/repeat distinction. assertNoVarCollisions turns that
// into a build error instead of a wrong story.
function seenVar (passageId) { return 'seen_' + passageId }
function takenVar (linkId) { return 'taken_' + linkId }
function cycleVar (id) { return 'cycle_' + id }

function assertNoVarCollisions (names) {
  const seen = new Set()
  const dupes = []
  names.forEach(n => {
    if (seen.has(n)) dupes.push(n)
    seen.add(n)
  })
  if (dupes.length) {
    throw new Error('twine: Harlowe variable name collision on $' + dupes.join(', $') +
      ' - an IR var is shadowing an exporter flag; rename the IR var')
  }
}

// --- body construction --------------------------------------------------

// Macro-only lines are wrapped in Harlowe's { } collapsing markup so the
// macros print nothing. The line break around the block still survives, so a
// run of (set:)s can leave one blank line in the rendered output. That is
// deliberate: the alternative, a trailing '\' line-break escape, also eats
// the *following* break and silently welds paragraphs together. A stray
// blank line is cosmetic; a lost paragraph break is not.
function macroLine (macros) {
  return macros.length ? '{' + macros.join('') + '}' : null
}

// first / repeat / variants for a text object, keyed on a flag the caller
// owns and clears. The (if:)/(else:) pair is emitted even when `repeat` is
// absent and both arms are therefore identical: the mechanism then looks the
// same in every passage, and an author opening the Twee to add repeat text
// has an obvious slot to put it in rather than having to build the branch. variants (spec 7) are round-robin, not random: after the
// repeat text has been shown once the cycle counter walks the list and
// wraps, so the same trajectory always produces the same prose.
//
// The counter is read modulo (1 + variants.length) with the repeat text at
// residue 1, so the sequence after the first visit is
// repeat, v0, v1, ..., repeat, v0, ... — never two of the same in a row and
// never skipping one. The last variant lands on residue 0 and is written as
// the (else:) so the chain always has a fallback.
function firstRepeatBlock (text, flagVar, counterVar) {
  const lines = ['(if: not $' + flagVar + ')[', escapeProse(firstText(text))]
  const vars = variantsOf(text)

  if (!vars.length) {
    lines.push('](else:)[')
    lines.push(escapeProse(repeatText(text)))
    lines.push(']')
    return lines
  }

  const period = 1 + vars.length
  lines.push('](else:)[')
  lines.push('{(set: $' + counterVar + ' to it + 1)}')
  lines.push('(if: $' + counterVar + ' mod ' + period + ' is 1)[')
  lines.push(escapeProse(repeatText(text)))
  vars.forEach((v, i) => {
    lines.push(i === vars.length - 1
      ? '](else:)['
      : '](else-if: $' + counterVar + ' mod ' + period + ' is ' + (i + 2) + ')[')
    lines.push(escapeProse(v))
  })
  lines.push(']')
  lines.push(']')
  return lines
}

function effectLines (effects, itemVars, items) {
  const out = []
  const pending = []
  const flush = () => {
    const line = macroLine(pending.splice(0))
    if (line) out.push(line)
  }
  ;(effects || []).forEach(eff => {
    // acquire is the one effect with narration attached: the item's takeText
    // describes the act of picking it up. It must print *before* the (set:),
    // because the item's own var is what distinguishes a first pickup from a
    // repeat one — set it first and every pickup reads as a repeat.
    if (eff.op === 'acquire' && items[eff.item] && items[eff.item].takeText) {
      flush()
      const item = items[eff.item]
      out.push('(if: not $' + item.var + ')[')
      out.push(escapeProse(firstText(item.takeText)))
      out.push('](else:)[')
      out.push(escapeProse(repeatText(item.takeText)))
      out.push(']')
    }
    pending.push(harloweEffect(eff, itemVars))
  })
  flush()
  return out
}

function header (name, tags) {
  const clean = (tags || []).map(sanitizeTag).filter(Boolean)
  return ':: ' + name + (clean.length ? ' [' + clean.join(' ') + ']' : '')
}

// --- passages -----------------------------------------------------------

// A player-facing link. The [[...]] sits on its own line inside the hook
// rather than immediately after it: '(if: c)[[[text->T]]]' opens with three
// '[' and Harlowe cannot tell the hook opener from the link opener there.
function choiceLink (l) {
  const lines = []
  const display = sanitizeDisplayText(firstText(l.linkText)) || 'Continue'
  const markup = '[[' + display + '->' + l.id + ']]'
  const cond = harloweCondition(l.condition)

  if (cond == null) {
    lines.push(markup)
    return lines
  }

  lines.push('(if: ' + cond + ')[')
  lines.push(markup)
  if (l.whenBlocked === 'hide') {
    // hide: nothing at all when the condition fails, so the player never
    // learns the way exists.
    lines.push(']')
    return lines
  }
  lines.push('](else:)[')
  const closed = normalizeText(l.closedText)
  if (closed) {
    lines.push(escapeProse(firstText(closed)))
  } else {
    // show with no closedText (spec 6: "greyed/with closedText"). Greying the
    // affordance still tells the player the way exists, which is the whole
    // point of show; printing nothing would be indistinguishable from hide.
    lines.push('(text-colour: gray)[' + escapeProse(display) + ']')
  }
  lines.push(']')
  return lines
}

// The weighted roll for a random passage.
//
// (random: 1, TOTAL) is inclusive at both ends, so it yields one of TOTAL
// equiprobable integers. Walking the cumulative sums means outcome i is
// taken exactly when cum[i-1] < r <= cum[i], i.e. on exactly ints[i] of the
// TOTAL integers, which is the definition of its weight. The '<=' paired
// with the exclusive lower bound is what makes that exact: a '<' here would
// give the first outcome one chance too few and the last one too many, and
// nothing downstream would ever notice.
//
// The final branch is (else:), not another (if:), so no roll can fall
// through the chain and strand the player on a dispatcher passage.
function randomDispatch (p, byLink) {
  const outgoing = (p.links || []).map(id => byLink[id])
  const ints = integerWeights(outgoing.map(l => {
    const w = Number(l.weight)
    if (!(w > 0)) {
      throw new Error('twine: random link ' + l.id + ' has non-positive weight ' + JSON.stringify(l.weight))
    }
    return w
  }))
  const total = ints.reduce((a, b) => a + b, 0)

  const lines = ['{(set: _r to (random: 1, ' + total + '))}']
  let cum = 0
  outgoing.forEach((l, i) => {
    cum += ints[i]
    lines.push(i === outgoing.length - 1
      ? '(else:)[(go-to: "' + l.id + '")]'
      : (i === 0 ? '(if: ' : '(else-if: ') + '_r <= ' + cum + ')[(go-to: "' + l.id + '")]')
  })
  return lines
}

function storyPassage (p, ctx) {
  const { byLink, items, itemVars } = ctx
  const lines = [header(p.id, p.tags)]

  // A random passage is a dispatcher, not a scene: (go-to:) fires during
  // render and discards everything the passage would have printed, so its
  // narration cannot live here. It is emitted at the top of each outgoing
  // transition passage instead — exactly one of which runs — which puts the
  // roll's setup text immediately above its outcome text, where it reads.
  const isRandom = p.role === 'random'
  if (!isRandom) {
    if (p.title) lines.push('##' + escapeProse(p.title))
    lines.push(...firstRepeatBlock(p.text, seenVar(p.id), cycleVar(p.id)))
    lines.push('{(set: $' + seenVar(p.id) + ' to true)}')
  }

  lines.push(...effectLines(p.onEnter, itemVars, items))

  if (p.status) lines.push('//' + escapeProse(p.status) + '//')

  if (isRandom) {
    lines.push(...randomDispatch(p, byLink))
    return lines
  }

  const outgoing = (p.links || []).map(id => byLink[id])
  if (!outgoing.length) {
    // Spec 5: only ending/death may be linkless. The closing line exists so a
    // player can tell "the story is over" from "the generator dropped a
    // link", which otherwise look identical in Harlowe.
    lines.push('')
    lines.push('---')
    lines.push(p.role === 'death' ? "''YOU HAVE DIED''" : "''THE END''")
    return lines
  }

  lines.push('')
  outgoing.forEach(l => lines.push(...choiceLink(l)))
  return lines
}

// One passage per link: the narration and effects of taking it, then a
// single link on to the destination.
function transitionPassage (l, from, ctx) {
  const { byPassage, items, itemVars } = ctx
  const lines = [header(l.id, ['transition', l.kind === 'random' ? 'outcome' : 'choice'])]

  // Narration borrowed from a random source (see storyPassage). Its seen flag
  // is set here rather than in the dispatcher, because the dispatcher runs
  // before this passage renders and would make every roll read as a repeat
  // visit.
  if (from.role === 'random') {
    if (from.title) lines.push('##' + escapeProse(from.title))
    lines.push(...firstRepeatBlock(from.text, seenVar(from.id), cycleVar(from.id)))
    lines.push('{(set: $' + seenVar(from.id) + ' to true)}')
  }

  lines.push(...firstRepeatBlock(l.text, takenVar(l.id), cycleVar(l.id)))
  lines.push('{(set: $' + takenVar(l.id) + ' to true)}')
  lines.push(...effectLines(l.onTraverse, itemVars, items))

  const dest = byPassage[l.to]
  if (!dest) throw new Error('twine: link ' + l.id + ' points at unknown passage "' + l.to + '"')
  lines.push('')
  lines.push('[[Continue->' + dest.id + ']]')
  return lines
}

// --- validation ---------------------------------------------------------

// Spec 10 puts validation in story-ir.js, a sibling this exporter must not
// require unconditionally: the exporters and the IR builder land
// independently, and a missing sibling should degrade to "no extra checks",
// not to a crash on require. The structural failures this exporter cannot
// survive (unknown link id, unknown passage id, unknown item) are raised
// where they bite, above.
function validate (ir) {
  let validateStoryIR = null
  try {
    validateStoryIR = require('../story-ir').validateStoryIR
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e
  }
  return typeof validateStoryIR === 'function' ? validateStoryIR(ir) : []
}

// --- the exporter -------------------------------------------------------

/**
 * exportTwine(ir, opts) -> string, the complete .twee document.
 *
 * opts:
 *   ifid          override the derived IFID (to pin an existing story)
 *   format        story format name        (default 'Harlowe')
 *   formatVersion story format version     (default '3.3.9')
 *   title         override meta.title
 *   validate      run validateStoryIR first (default true)
 */
function exportTwine (ir, opts) {
  const o = opts || {}
  if (!ir || !Array.isArray(ir.passages)) throw new Error('twine: not a Story IR')

  if (o.validate !== false) {
    const problems = validate(ir)
    if (problems && problems.length) {
      throw new Error('twine: invalid Story IR:\n  ' + problems.join('\n  '))
    }
  }

  const passages = ir.passages
  const links = ir.links || []
  const byPassage = {}
  passages.forEach(p => { byPassage[p.id] = p })
  const byLink = {}
  links.forEach(l => { byLink[l.id] = l })

  const items = {}
  const itemVars = {}
  ;(ir.items || []).forEach(it => {
    items[it.id] = it
    itemVars[it.id] = it.var || ('has_' + it.id)
  })

  if (byPassage[INIT_PASSAGE] || byLink[INIT_PASSAGE]) {
    throw new Error('twine: the IR declares "' + INIT_PASSAGE +
      '", which the exporter needs for its startup passage')
  }

  // Every Harlowe global the story will touch, in declaration order. Harlowe
  // raises a runtime error on 'not $x' when $x has never been set, so the
  // exporter's own flags must be initialised as carefully as the IR's state
  // vector — a missed flag is an error dialog on the player's first visit.
  const inits = []
  ;(ir.vars || []).forEach(v => inits.push([v.name, harloweLiteral(v.init)]))
  passages.forEach(p => {
    inits.push([seenVar(p.id), 'false'])
    if (variantsOf(p.text).length) inits.push([cycleVar(p.id), '0'])
  })
  links.forEach(l => {
    inits.push([takenVar(l.id), 'false'])
    if (variantsOf(l.text).length) inits.push([cycleVar(l.id), '0'])
  })
  assertNoVarCollisions(inits.map(pair => pair[0]))

  const out = []

  out.push(header('StoryTitle'))
  out.push(String(o.title != null ? o.title : ((ir.meta && ir.meta.title) || 'Untitled')))
  out.push('')

  out.push(header('StoryData'))
  out.push(JSON.stringify({
    ifid: o.ifid || deriveIfid(ir.meta),
    format: o.format || TWINE_FORMAT.name,
    'format-version': o.formatVersion || TWINE_FORMAT.version,
    start: ir.start
  }))
  out.push('')

  // 'startup' is a Harlowe special tag: the passage runs once, before the
  // first passage renders. The whole body sits inside { } so the (set:)s
  // contribute no text to the passage they are prepended to.
  out.push(header(INIT_PASSAGE, ['startup']))
  out.push('{')
  inits.forEach(pair => out.push('(set: $' + pair[0] + ' to ' + pair[1] + ')'))
  out.push('}')
  out.push('')

  // Passages in IR order (spec 1 fixes it, and golden files depend on it),
  // each immediately followed by the transition passages for its outgoing
  // links, so a link and the passage that offers it stay adjacent in the file.
  passages.forEach(p => {
    out.push(...storyPassage(p, { ir, byPassage, byLink, items, itemVars }))
    out.push('')
    ;(p.links || []).forEach(lid => {
      const l = byLink[lid]
      if (!l) throw new Error('twine: passage ' + p.id + ' references unknown link "' + lid + '"')
      out.push(...transitionPassage(l, p, { byPassage, items, itemVars }))
      out.push('')
    })
  })

  // Collapse runs of blank lines: hooks and macro blocks each contribute
  // their own, and three blank lines in a row is just noise in a file people
  // open in the Twine editor.
  return out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n'
}

module.exports = {
  exportTwine,
  TWINE_FORMAT,
  deriveIfid,
  harloweCondition,
  harloweEffect,
  integerWeights,
  sanitizeDisplayText,
  escapeProse,
  normalizeText
}
