// Story IR -> a ChoiceScript project.
//
// The IR contract lives in docs/spec/story-ir.md; the golden instance is
// test/fixtures/story-ir.sample.json. This module is a pure function of the
// IR: it returns a map of file name to file contents and never touches the
// filesystem, because where a project directory lives is the CLI's business.
//
// --- the ChoiceScript subset targeted here -----------------------------
//
// Command reference: https://choicescriptdev.fandom.com/wiki/ChoiceScript_Commands
// Introduction:      https://www.choiceofgames.com/make-your-own-games/choicescript-intro/
// Source of truth:   https://github.com/dfabulich/choicescript/blob/main/web/scene.js
//
//   startup.txt only   *title *author *scene_list *create
//   flow               *label *goto *goto_scene *choice *selectable_if
//                      *if *elseif *else *rand *page_break *ending
//   state              *set (assignment and implicit-operand arithmetic)
//   display            *stat_chart, ${...} and @{cond a|b} substitution
//
// Everything else in the language — *gosub, *temp, *fake_choice, *achieve,
// multireplace over non-boolean indices, fairmath (%+) — is deliberately out
// of scope: the IR has no way to ask for any of it.
//
// Four engine facts drive most of the code below, all checked against
// web/scene.js rather than against the prose documentation:
//
//   1. Indentation is semantic and a mis-indent is a parse error, so every
//      line is emitted through a buffer that takes a depth, never as a
//      hand-written indented string.
//   2. A *choice with no runtime-selectable option throws "No selectable
//      options" and kills the game. Both ways of conditioning an option
//      count: a false *if hides it, and a false *selectable_if marks it
//      unselectable, and neither satisfies the engine's
//      atLeastOneSelectableOption. Hence emitFallbackOption below.
//   3. Expressions allow exactly one binary operator per parenthesis level
//      (Scene.prototype.evaluateExpr), so conditions are fully parenthesized,
//      and `not` is a *function*: `not(x)`, never `not x`.
//   4. `*set x -20` means "subtract 20" — a leading operator is implicitly
//      applied to the variable itself. Assigning a negative literal therefore
//      has to go through parentheses: `*set x (0 - 20)`.

// story-ir.js is being written in parallel with this exporter. Tolerate its
// absence so that the exporter and its tests stand alone, but use its
// validator the moment it exists: emitting a broken game is worse than
// refusing to emit one.
let storyIR = null
try {
  storyIR = require('../story-ir')
} catch (e) {
  storyIR = null
}

const INDENT = '  '

// scene.js validateVariable() reserves exactly these six names plus the
// `choice_` prefix. The task brief also names command words (`if`, `goto`,
// `label`, `return`, `else`, `choice`, `not`); the engine tolerates those as
// variable names, but a variable that shadows a command turns generated
// source into a puzzle, so they are refused here too.
const RESERVED_VARS = [
  'and', 'or', 'true', 'false', 'scene', 'scenename',
  'choice', 'if', 'else', 'goto', 'label', 'return', 'not'
]

// Scene names ChoiceScript owns. A story scene that collided with either
// would either be run twice or replace the stats screen.
const RESERVED_SCENES = ['startup', 'choicescript_stats']

// --- small text helpers -------------------------------------------------

// The IR permits a bare string wherever a text object is expected (§7), and
// buildStoryIR is allowed to take that shortcut, so every read goes through
// here. story-ir.js exports the same helper; prefer it when present so the
// two cannot drift.
function normalizeText (t) {
  if (storyIR && typeof storyIR.normalizeText === 'function') return storyIR.normalizeText(t)
  if (t == null) return null
  if (typeof t === 'string') return { first: t }
  return t
}

function firstOf (t) {
  const n = normalizeText(t)
  return n && n.first != null ? String(n.first) : ''
}

function repeatOf (t) {
  const n = normalizeText(t)
  if (!n) return ''
  return String(n.repeat != null ? n.repeat : (n.first == null ? '' : n.first))
}

// Does this slot actually say something different on a revisit? Only then is
// a boolean worth spending a *create on. `variants` is ignored: round-robin
// sampling needs a per-slot counter and a modulo chain, and the IR spec files
// it as future work.
function hasRepeatVariant (t) {
  const n = normalizeText(t)
  return !!(n && n.repeat != null && n.repeat !== n.first)
}

function titleize (name) {
  if (/^[a-z]{1,3}$/.test(name)) return name.toUpperCase()
  return String(name).split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function slugify (s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'story'
}

// --- escaping -----------------------------------------------------------

// `${`, `$!{`, `$!!{`, `@{` and `@!{` open a substitution, and an unclosed
// one is a parse error rather than a stray dollar sign on the page. There is
// no backslash escape for the sigil, so the sigil is replaced by a
// substitution that prints it. Do this pass BEFORE the bracket pass, which
// introduces `${...}` of its own.
function escapeSigils (s) {
  return s.replace(/([$@])(!?!?\{)/g, (m, sigil, rest) => '${"' + sigil + '"}' + rest)
}

// ui.js rewrites exactly this set of bracket tags into HTML and passes every
// other bracket through untouched, so only these need neutralizing — again by
// printing the opening bracket as a string rather than writing it literally.
const MARKUP_TAG = /\[(?:\/?[bi]|\/?url(?:=[^\]\n]*)?|[nc]\/)\]/g

function escapeMarkup (s) {
  return s.replace(MARKUP_TAG, m => '${"["}' + m.slice(1))
}

function escapeProse (s, opts) {
  let out = escapeSigils(String(s == null ? '' : s))
  if (!opts.allowMarkup) out = escapeMarkup(out)
  return out
}

// A line whose first non-space character is `*` parses as a command and a `#`
// can be mistaken for a choice option. Printing an empty string first costs
// nothing on the page and moves the offending character off the front.
function defuseLineStart (line) {
  return /^[*#]/.test(line) ? '${""}' + line : line
}

// --- expression compilation ---------------------------------------------

function csLiteral (v) {
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') {
    if (!isFinite(v)) throw new Error('choicescript: non-finite number in IR: ' + v)
    // See fact 4 in the header: a bare leading `-` is the subtraction
    // operator, not a sign.
    return v < 0 ? '(0 - ' + Math.abs(v) + ')' : String(v)
  }
  if (v == null) return 'false'
  return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

const COMPARISONS = { eq: '=', ne: '!=', gt: '>', gte: '>=', lt: '<', lte: '<=' }

// Fold a list of already-compiled operands with a named operator, wrapping
// each operand so the result has one operator per parenthesis level.
function foldOperands (parts, op) {
  return parts.reduce((a, b) => '(' + a + ') ' + op + ' (' + b + ')')
}

// IR condition (§8) -> a ChoiceScript expression. Returns 'true' for the
// empty conjunction so that callers can test compiled === 'true' to decide
// whether an option is guaranteed selectable.
function compileCondition (cond, seen) {
  if (cond == null) return 'true'
  if (cond.all) {
    if (!cond.all.length) return 'true'
    return foldOperands(cond.all.map(c => compileCondition(c, seen)), 'and')
  }
  if (cond.any) {
    if (!cond.any.length) return 'false'
    return foldOperands(cond.any.map(c => compileCondition(c, seen)), 'or')
  }
  if (cond.not) return 'not(' + compileCondition(cond.not, seen) + ')'
  if (cond.var == null) throw new Error('choicescript: condition names no variable: ' + JSON.stringify(cond))
  if (seen) seen(cond.var)
  if ('is' in cond) {
    if (typeof cond.is === 'boolean') return cond.is ? cond.var : 'not(' + cond.var + ')'
    return cond.var + ' = ' + csLiteral(cond.is)
  }
  const key = Object.keys(COMPARISONS).find(k => k in cond)
  if (!key) throw new Error('choicescript: condition has no comparison: ' + JSON.stringify(cond))
  // ChoiceScript spells equality with a single `=`; `==` is a tokenizer error.
  return cond.var + ' ' + COMPARISONS[key] + ' ' + csLiteral(cond[key])
}

// --- line buffer --------------------------------------------------------

// The only place indentation is produced. Callers pass a depth; nobody
// anywhere writes a leading space by hand.
function lineBuffer () {
  const lines = []
  return {
    push (depth, text) {
      lines.push(depth > 0 ? INDENT.repeat(depth) + text : text)
    },
    blank () {
      if (lines.length && lines[lines.length - 1] !== '') lines.push('')
    },
    text () {
      while (lines.length && lines[lines.length - 1] === '') lines.pop()
      return lines.join('\n') + '\n'
    }
  }
}

// --- variable registry --------------------------------------------------

function assertVariableName (name) {
  if (typeof name !== 'string' || !name.length) {
    throw new Error('choicescript: variable name must be a non-empty string, got ' + JSON.stringify(name))
  }
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    throw new Error('choicescript: unsafe variable name "' + name +
      '"; ChoiceScript wants lowercase letters, digits and underscores, starting with a letter')
  }
  if (RESERVED_VARS.indexOf(name) >= 0) {
    throw new Error('choicescript: "' + name + '" is a reserved word and cannot be a *create name')
  }
  if (/^choice_/.test(name)) {
    throw new Error('choicescript: "' + name + '" uses the reserved `choice_` prefix')
  }
}

// Declared IR vars plus the ones this exporter needs for itself (visit
// memory, the *rand target). Allocation suffixes on collision rather than
// throwing: an IR is entitled to a variable called `cs_roll`, and losing the
// export over a name clash would be absurd.
function varRegistry (ir) {
  const inits = new Map()
  const order = []

  function declare (name, init) {
    assertVariableName(name)
    if (inits.has(name)) throw new Error('choicescript: duplicate variable "' + name + '" in ir.vars')
    inits.set(name, init)
    order.push(name)
    return name
  }

  ;(ir.vars || []).forEach(v => declare(v.name, v.init))

  return {
    order,
    init: name => inits.get(name),
    has: name => inits.has(name),
    alloc (base, init) {
      let name = base
      let n = 2
      while (inits.has(name)) name = base + '_' + (n++)
      return declare(name, init)
    }
  }
}

// --- the exporter -------------------------------------------------------

/**
 * Export a Story IR as a ChoiceScript project.
 *
 * @param {object} ir - a Story IR v1 document
 * @param {object} [opts]
 * @param {string} [opts.author] - byline for *author
 * @param {string} [opts.sceneName] - story scene file stem; defaults to meta.id
 * @param {string} [opts.fallbackText] - label for the guaranteed-selectable option
 * @param {boolean} [opts.allowMarkup] - pass [b]/[i]/[n/] in prose through unescaped
 * @param {boolean} [opts.validate] - set false to skip validateStoryIR
 * @returns {{files: Object<string,string>, entry: string}}
 */
function exportChoiceScript (ir, opts) {
  opts = opts || {}
  if (!ir || typeof ir !== 'object') throw new Error('choicescript: no IR given')

  if (opts.validate !== false && storyIR && typeof storyIR.validateStoryIR === 'function') {
    const problems = storyIR.validateStoryIR(ir)
    if (problems && problems.length) {
      throw new Error('choicescript: invalid Story IR:\n  ' + problems.join('\n  '))
    }
  }

  const meta = ir.meta || {}
  const passages = ir.passages || []
  if (!passages.length) throw new Error('choicescript: IR has no passages')

  const linkById = new Map((ir.links || []).map(l => [l.id, l]))
  const itemById = new Map((ir.items || []).map(i => [i.id, i]))
  const vars = varRegistry(ir)

  // scene.js lowercases both *label definitions and *goto targets, so two IR
  // ids differing only in case would silently alias. Catch that here instead
  // of shipping a game where one room is unreachable.
  const labelOf = new Map()
  const takenLabels = new Set()
  passages.forEach(p => {
    const label = String(p.id).toLowerCase()
    if (!/^[a-z_][a-z0-9_]*$/.test(label)) {
      throw new Error('choicescript: passage id "' + p.id + '" is not a legal *label')
    }
    if (takenLabels.has(label)) {
      throw new Error('choicescript: passage ids "' + p.id + '" and another collide once lowercased for *label')
    }
    takenLabels.add(label)
    labelOf.set(p.id, label)
  })

  if (!labelOf.has(ir.start)) throw new Error('choicescript: ir.start "' + ir.start + '" is not a passage')

  let sceneName = slugify(opts.sceneName || meta.id || 'story')
  if (RESERVED_SCENES.indexOf(sceneName) >= 0) sceneName = sceneName + '_story'

  // Visit memory, allocated only where a slot actually has different words
  // the second time. An unused *create is dead weight in the stats file and
  // one more thing for a human editor to wonder about.
  const passageFlag = new Map()
  passages.forEach(p => {
    if (hasRepeatVariant(p.text)) passageFlag.set(p.id, vars.alloc('cs_seen_' + labelOf.get(p.id), false))
  })
  const linkFlag = new Map()
  ;(ir.links || []).forEach(l => {
    if (hasRepeatVariant(l.linkText) || hasRepeatVariant(l.text)) {
      linkFlag.set(l.id, vars.alloc('cs_took_' + String(l.id).toLowerCase(), false))
    }
  })

  // Reaching an *else by falling off the end of the *if branch above it is an
  // error in ChoiceScript ("It is illegal to fall in to an *else statement"),
  // which would condemn every first/repeat branch here to a *goto and a label
  // of its own. This flag is the engine's own opt-out (Scene.prototype.else
  // consults it before throwing), so it is declared once and the branches stay
  // readable.
  const ICF = 'implicit_control_flow'
  if (vars.has(ICF) && vars.init(ICF) !== true) {
    throw new Error('choicescript: the IR declares ' + ICF + ' as ' + JSON.stringify(vars.init(ICF)) +
      '; this exporter needs it true, because it emits *if/*else without a *goto in every branch')
  }
  if (!vars.has(ICF)) vars.alloc(ICF, true)

  const hasRandom = passages.some(p => p.role === 'random' && (p.links || []).length > 1)
  // *rand refuses to assign to a variable that does not already exist, so the
  // die has to be declared up front like everything else.
  const rollVar = hasRandom ? vars.alloc('cs_roll', 0) : null

  const referenced = new Set()
  const noteVar = name => {
    if (!vars.has(name)) {
      throw new Error('choicescript: IR references undeclared variable "' + name + '"')
    }
    referenced.add(name)
  }

  const byId = new Map(passages.map(p => [p.id, p]))
  const story = emitStoryScene({
    ir, meta, passages, byId, linkById, itemById, labelOf, passageFlag, linkFlag,
    rollVar, vars, noteVar, opts
  })

  const files = {}
  files['startup.txt'] = emitStartup({ meta, vars, sceneName, opts })
  files[sceneName + '.txt'] = story
  files['choicescript_stats.txt'] = emitStats({ ir, meta, vars, opts })

  return { files, entry: 'startup.txt' }
}

// --- startup.txt --------------------------------------------------------

function emitStartup (ctx) {
  const { meta, vars, sceneName, opts } = ctx
  const buf = lineBuffer()

  buf.push(0, '*comment Generated by ' + (meta.generator || 'graphgram') +
    ' from Story IR; edits here are overwritten on the next build.')
  if (meta.id != null) buf.push(0, '*comment example: ' + meta.id + ', seed: ' + meta.seed + ', theme: ' + meta.theme)
  buf.blank()

  // *title, *author, *scene_list and *create are ChoiceScript's
  // initialCommands: legal only in startup.txt and only before the first
  // command that is not one of them (scene.js runCommand). *goto_scene at the
  // bottom is therefore the first non-initial command in the file.
  buf.push(0, '*title ' + oneLine(escapeProse(meta.title || 'Untitled', opts)))
  buf.push(0, '*author ' + oneLine(escapeProse(opts.author || 'graphgram', opts)))
  buf.push(0, '*scene_list')
  buf.push(1, 'startup')
  buf.push(1, sceneName)
  buf.blank()

  buf.push(0, '*comment State. implicit_control_flow lets an *if branch end without a *goto.')
  vars.order.forEach(name => {
    buf.push(0, '*create ' + name + ' ' + createValue(vars.init(name)))
  })
  buf.blank()

  buf.push(0, '*goto_scene ' + sceneName)
  return buf.text()
}

// *create accepts one token only: a number, true/false, or a quoted string
// (Scene.prototype.createVariable). A negative initial value is two tokens
// and is rejected, so it is created at zero and corrected by the *set that
// opens the story scene.
function createValue (init) {
  if (typeof init === 'boolean') return init ? 'true' : 'false'
  if (typeof init === 'number') return init < 0 ? '0' : String(init)
  if (init == null) return 'false'
  return csLiteral(init)
}

function negativeInits (vars) {
  return vars.order
    .map(name => ({ name, init: vars.init(name) }))
    .filter(v => typeof v.init === 'number' && v.init < 0)
}

// --- the story scene ----------------------------------------------------

function emitStoryScene (ctx) {
  const { ir, meta, passages, labelOf, vars, opts } = ctx
  const buf = lineBuffer()

  buf.push(0, '*comment Generated by ' + (meta.generator || 'graphgram') + ' from Story IR.')

  negativeInits(vars).forEach(v => {
    buf.push(0, '*set ' + v.name + ' ' + csLiteral(v.init))
  })

  // The scene is entered by a bare *goto_scene, which starts at line 0 and
  // falls into whatever label comes first, so the start passage must be
  // written first rather than merely be first in IR order.
  const start = passages.find(p => p.id === ir.start)
  const rest = passages.filter(p => p.id !== ir.start)
  ;[start].concat(rest).forEach(p => emitPassage(buf, p, ctx))

  return buf.text()
}

function emitPassage (buf, passage, ctx) {
  const { labelOf, linkById, passageFlag, opts } = ctx
  buf.blank()
  buf.push(0, '*label ' + labelOf.get(passage.id))

  if (passage.title) {
    buf.push(0, '[b]' + oneLine(escapeProse(passage.title, opts)) + '[/b]')
  }

  emitVariantText(buf, 0, passage.text, passageFlag.get(passage.id), ctx)
  if (passageFlag.has(passage.id)) buf.push(0, '*set ' + passageFlag.get(passage.id) + ' true')

  emitEffects(buf, 0, passage.onEnter, ctx)

  const links = (passage.links || []).map(id => {
    const link = linkById.get(id)
    if (!link) throw new Error('choicescript: passage ' + passage.id + ' names unknown link ' + id)
    return link
  })

  if (!links.length) {
    // Terminal. *ending offers the Play Again menu; *finish would fall into
    // the next scene in *scene_list, and there is no next scene.
    buf.push(0, '*ending')
    return
  }

  if (passage.role === 'random') emitRandom(buf, passage, links, ctx)
  else emitChoice(buf, passage, links, ctx)
}

// first/repeat as an *if/*else pair. Without a flag there is only ever one
// thing to say, so no branch is emitted at all.
function emitVariantText (buf, depth, textObj, flag, ctx) {
  const first = firstOf(textObj)
  // A flag may exist for the sake of some *other* slot on the same element —
  // a link whose affordance changes but whose narration does not — in which
  // case branching here would emit the same paragraph twice.
  if (!flag || !hasRepeatVariant(textObj)) {
    emitProse(buf, depth, first, ctx)
    return
  }
  buf.push(depth, '*if not(' + flag + ')')
  emitProse(buf, depth + 1, first, ctx)
  buf.push(depth, '*else')
  emitProse(buf, depth + 1, repeatOf(textObj), ctx)
}

// Prose is emitted one physical line at a time, each one trimmed and then
// re-indented by the buffer: a line that arrived with leading whitespace of
// its own would otherwise read as a change of block depth.
function emitProse (buf, depth, str, ctx) {
  const text = escapeProse(str, ctx.opts)
  if (!text.trim()) {
    // An empty *if branch is a parse error ("Expected a line" / dangling
    // block), so a blank slot still has to print something.
    if (depth > 0) buf.push(depth, '*comment (no text)')
    return
  }
  text.split('\n').forEach(raw => {
    const line = raw.trim()
    if (!line) buf.blank()
    else buf.push(depth, defuseLineStart(line))
  })
}

function oneLine (s) {
  return String(s).replace(/\s*\n\s*/g, ' ').trim()
}

function emitEffects (buf, depth, effects, ctx) {
  ;(effects || []).forEach(fx => {
    if (!fx || !fx.op) throw new Error('choicescript: malformed effect ' + JSON.stringify(fx))
    if (fx.op === 'set') {
      ctx.noteVar(fx.var)
      buf.push(depth, '*set ' + fx.var + ' ' + csLiteral(fx.value))
    } else if (fx.op === 'add') {
      ctx.noteVar(fx.var)
      if (typeof fx.value !== 'number') throw new Error('choicescript: "add" needs a number, got ' + JSON.stringify(fx.value))
      // A leading operator makes the variable its own left operand. `%+` is
      // fairmath, a different thing entirely, and is never what "add" means.
      buf.push(depth, '*set ' + fx.var + ' ' + (fx.value < 0 ? '-' + Math.abs(fx.value) : '+' + fx.value))
    } else if (fx.op === 'acquire') {
      emitAcquire(buf, depth, fx, ctx)
    } else {
      throw new Error('choicescript: unknown effect op "' + fx.op + '"')
    }
  })
}

// The item's own var doubles as the "have I picked this up before" flag, so
// takeText gets its first/repeat branch for free.
function emitAcquire (buf, depth, fx, ctx) {
  const item = ctx.itemById.get(fx.item)
  if (!item) throw new Error('choicescript: acquire names unknown item "' + fx.item + '"')
  ctx.noteVar(item.var)
  const take = normalizeText(item.takeText)
  if (take) {
    buf.push(depth, '*if not(' + item.var + ')')
    emitProse(buf, depth + 1, firstOf(take), ctx)
    if (hasRepeatVariant(take)) {
      buf.push(depth, '*else')
      emitProse(buf, depth + 1, repeatOf(take), ctx)
    }
  }
  buf.push(depth, '*set ' + item.var + ' true')
}

// --- choices ------------------------------------------------------------

function emitChoice (buf, passage, links, ctx) {
  const { opts } = ctx

  const options = links.map(link => renderOption(link, ctx))

  // Narration for a link the player can see but cannot take. A disabled
  // option never runs its body, so the only place closedText can be said is
  // before the menu.
  options.forEach(opt => {
    if (opt.blockedNarration) {
      buf.push(0, '*if not(' + opt.condition + ')')
      emitProse(buf, 1, opt.blockedNarration, ctx)
    }
  })

  buf.push(0, '*choice')

  // Duplicate option text is a hard error ("conflicts with option"), and two
  // links out of one room can easily share an affordance.
  const used = new Set()
  options.forEach(opt => {
    let label = opt.label
    let n = 2
    while (used.has(label)) label = opt.label + ' (' + (n++) + ')'
    used.add(label)
    opt.label = label
  })

  options.forEach(opt => emitOption(buf, 1, opt, ctx))

  // Fact 2 in the header: if every option can be conditioned away, the engine
  // throws at runtime rather than showing an empty menu. One option that no
  // condition can touch makes that impossible. It leads back into this same
  // passage, which is the only destination guaranteed to exist and to be
  // legal from here.
  if (!options.some(opt => opt.unconditional)) {
    let label = opts.fallbackText || 'Wait, and take stock.'
    let n = 2
    while (used.has(label)) label = (opts.fallbackText || 'Wait, and take stock.') + ' (' + (n++) + ')'
    used.add(label)
    buf.push(1, '#' + oneLine(escapeProse(label, opts)))
    buf.push(2, '*goto ' + ctx.labelOf.get(passage.id))
  }
}

function renderOption (link, ctx) {
  const { opts, linkFlag, labelOf } = ctx
  const condition = compileCondition(link.condition, ctx.noteVar)
  const unconditional = condition === 'true'
  const flag = linkFlag.get(link.id)

  const dest = labelOf.get(link.to)
  if (!dest) throw new Error('choicescript: link ' + link.id + ' points at unknown passage ' + link.to)

  const first = oneLine(escapeProse(firstOf(link.linkText), opts))
  const repeat = oneLine(escapeProse(repeatOf(link.linkText), opts))
  // A random link carries no affordance text; if a choice link is silent too,
  // the destination's name is the only honest label available.
  const destPassage = ctx.byId.get(link.to) || {}
  const fallbackLabel = oneLine(escapeProse(destPassage.title || dest, opts))

  let label = first || fallbackLabel
  // @{(flag) a|b} picks the first alternative when the flag is true. The
  // alternatives are split on a naive `|`, with no escape, so text carrying a
  // pipe or a brace cannot go inside one; in that case the option keeps its
  // first-visit wording and only the body varies.
  if (flag && hasRepeatVariant(link.linkText) && multireplaceSafe(first) && multireplaceSafe(repeat)) {
    label = '@{(' + flag + ') ' + repeat + '|' + first + '}'
  }

  return {
    link,
    condition,
    unconditional,
    label,
    dest,
    flag,
    blockedNarration: (!unconditional && link.whenBlocked !== 'hide' && link.closedText)
      ? firstOf(link.closedText) : null
  }
}

function multireplaceSafe (s) {
  return !/[|{}]/.test(s)
}

function emitOption (buf, depth, opt, ctx) {
  const link = opt.link
  let bodyDepth

  if (opt.unconditional) {
    buf.push(depth, '#' + opt.label)
    bodyDepth = depth + 1
  } else if (link.whenBlocked === 'hide') {
    // A plain *if around the option removes it from the menu entirely.
    buf.push(depth, '*if (' + opt.condition + ')')
    buf.push(depth + 1, '#' + opt.label)
    bodyDepth = depth + 2
  } else {
    // *selectable_if shows the option greyed out. It only parses in the
    // inline form — condition in parentheses, then a space, then the #option
    // on the same line (Scene.prototype.parseOptionIf).
    buf.push(depth, '*selectable_if (' + opt.condition + ') #' + opt.label)
    bodyDepth = depth + 1
  }

  emitLinkBody(buf, bodyDepth, opt, ctx)
}

function emitLinkBody (buf, depth, opt, ctx) {
  const link = opt.link
  emitVariantText(buf, depth, link.text, opt.flag, ctx)
  if (opt.flag) buf.push(depth, '*set ' + opt.flag + ' true')
  emitEffects(buf, depth, link.onTraverse, ctx)
  buf.push(depth, '*goto ' + opt.dest)
}

// --- random passages ----------------------------------------------------

function emitRandom (buf, passage, links, ctx) {
  const { rollVar } = ctx

  links.forEach(l => {
    if (l.kind !== 'random') throw new Error('choicescript: passage ' + passage.id + ' is random but link ' + l.id + ' is not')
  })

  if (links.length === 1) {
    // Nothing to roll for; the single outcome is the passage's continuation.
    emitRandomBranch(buf, 0, links[0], ctx)
    return
  }

  const weights = integerWeights(links.map(l => l.weight))
  const total = weights.reduce((a, b) => a + b, 0)

  buf.push(0, '*rand ' + rollVar + ' 1 ' + total)

  let cumulative = 0
  links.forEach((link, i) => {
    cumulative += weights[i]
    if (i === links.length - 1) {
      // The last arm is *else, not another comparison: rounding or a stray
      // weight can never leave the roll falling through into the next
      // passage's *label.
      buf.push(0, '*else')
    } else {
      buf.push(0, (i === 0 ? '*if (' : '*elseif (') + rollVar + ' <= ' + cumulative + ')')
    }
    emitRandomBranch(buf, 1, link, ctx)
  })
}

function emitRandomBranch (buf, depth, link, ctx) {
  const flag = ctx.linkFlag.get(link.id)
  const dest = ctx.labelOf.get(link.to)
  if (!dest) throw new Error('choicescript: link ' + link.id + ' points at unknown passage ' + link.to)
  emitVariantText(buf, depth, link.text, flag, ctx)
  if (flag) buf.push(depth, '*set ' + flag + ' true')
  emitEffects(buf, depth, link.onTraverse, ctx)
  // The outcome of a roll deserves its own beat; without a break it runs
  // straight into the destination's description as one wall of prose.
  buf.push(depth, '*page_break')
  buf.push(depth, '*goto ' + dest)
}

// *rand rolls a whole number when given whole bounds, so cumulative weight
// thresholds have to be integers. Fractional weights are scaled rather than
// rounded away, which would silently drop a rare outcome.
function integerWeights (weights) {
  const ws = weights.map(w => {
    const n = typeof w === 'number' && w > 0 ? w : 1
    return n
  })
  const scale = ws.every(w => Number.isInteger(w)) ? 1 : 1000
  return ws.map(w => Math.max(1, Math.round(w * scale)))
}

// --- choicescript_stats.txt ---------------------------------------------

function emitStats (ctx) {
  const { ir, meta, vars, opts } = ctx
  const buf = lineBuffer()

  buf.push(0, '*comment Generated by ' + (meta.generator || 'graphgram') + ' from Story IR.')
  buf.blank()
  buf.push(0, '[b]' + oneLine(escapeProse(meta.title || 'Status', opts)) + '[/b]')
  buf.blank()

  // Every numeric stat is a `text` row. `percent` draws a bar on a 0..100
  // scale, and nothing in the IR bounds a number, so a hit-point total that
  // goes negative would render as a bar of nonsense.
  const rows = (ir.vars || []).filter(v => v.kind === 'number' || v.kind === 'counter')
  if (rows.length) {
    buf.push(0, '*stat_chart')
    rows.forEach(v => buf.push(1, 'text ' + v.name + ' ' + titleize(v.name)))
    buf.blank()
  }

  const items = (ir.items || []).filter(it => it.var && vars.has(it.var))
  if (items.length) {
    buf.push(0, '[b]Carried[/b]')
    items.forEach(it => {
      buf.push(0, '*if ' + it.var)
      const carry = normalizeText(it.carryText)
      const line = (carry && carry.brief) || it.name || it.id
      emitProse(buf, 1, line, { opts })
    })
    // "You are carrying nothing" needs the conjunction of every item being
    // absent, which is also why conditions are folded rather than joined by
    // hand.
    const empty = foldOperands(items.map(it => 'not(' + it.var + ')'), 'and')
    buf.push(0, '*if ' + empty)
    buf.push(1, 'You are carrying nothing.')
  }

  return buf.text()
}

module.exports = {
  exportChoiceScript,
  // Exported for the exporter's own tests and for anyone building a variant
  // emitter; not part of the CLI-facing surface.
  compileCondition,
  escapeProse,
  assertVariableName
}
