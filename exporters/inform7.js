// Story IR -> Inform 7 source text.
//
// THE IMPEDANCE MISMATCH, AND WHAT WE DO ABOUT IT
//
// Twine and ChoiceScript are link machines: the IR maps onto them almost
// one-to-one. Inform 7 is not. It simulates a world -- rooms joined by
// compass directions, things with locations, a parser -- and the map
// relation it offers ('north of', 'east of') is symmetric unless you fight
// it. The IR, meanwhile, is full of genuinely one-way edges: the forward
// side of a locked door, a consequence edge out of a random roll, a
// monster's retreat. Laying those out as map connections would either
// invent back-edges the author never wrote, or burn one of the twelve
// directions per link and fall over on a room with thirteen exits.
//
// So we do not use the map at all. The emitted story has zero map
// connections, and 'going north' is intercepted and redirected. Instead:
//
//   passage -> a ROOM.
//   link    -> a PORTAL: a scenery thing that lives in the source room and
//              carries the destination in its 'far side' property. Crossing
//              one is a custom TRAVERSING action; the numbered EXITS listing
//              and the CHOOSE command are sugar over it.
//   item    -> a THING. Acquiring it is 'now the player carries the key',
//              which is a fact about the world and not a boolean. This is
//              the whole reason Inform 7 is in the lineup.
//   var     -> a 'truth state that varies' or a 'number that varies', except
//              vars of kind 'item' that back an entry in ir.items: those are
//              not declared at all, because the world model already knows
//              whether the player is carrying the thing. One source of
//              truth, so the flag can never disagree with the inventory.
//
// A portal is a thing rather than a real Inform door because a door must be
// somewhere on the map, and we have no map. We keep Inform's own lock
// machinery anyway: the portal kind is declared lockable, locked/unlocked,
// and with a matching key, exactly as the Standard Rules do for doors and
// again for containers. A locked link whose condition is 'player has item X'
// therefore emits a real lock with X as its matching key, and crossing it
// turns the lock rather than flipping a flag.
//
// first/repeat text. Inform's own 'visited' flag is set inside the looking
// action and its timing relative to the description is a version detail, so
// we do not rely on it: every room carries its own 'visit tally', bumped in
// an 'After looking' rule -- i.e. after the description has printed -- and
// each room's prose is a generated 'To say' phrase that branches on the
// tally (0 -> first, 1 -> repeat, 2+ -> round-robin over variants).
//
// Conditions. Inform 7 has no parenthesised boolean expressions, so a nested
// all/any cannot be compiled to one expression. Every link's condition is
// therefore evaluated in one 'refresh the ways' phrase, which sets a plain
// either/or property (passable / barred) on each portal; a nested condition
// spends one local truth state per subterm on the way there. 'not' never
// reaches that code: it is pushed down to the leaves first (De Morgan plus
// operator flipping), because a leaf negation is always expressible and a
// general one is not. Having passability be a property rather than a phrase
// also side-steps Inform typing 'the noun' as a thing inside an action rule,
// where reading a portal property off it would not compile.
//
// WHAT WE CANNOT CHECK HERE. There is no Inform 7 compiler in this repo, so
// nothing below is proved to compile; the test suite checks structure
// (declare-before-use, name uniqueness, bracket and quote escaping) and the
// syntax itself was written against the Inform 7 documentation rather than
// from memory. Treat a compile error as a bug in this file, not in the IR.

const NL = '\n'
const TAB = '\t'

// Words that Inform 7 either owns outright or will misparse in a name:
// kind names, the twelve directions, action and rule keywords, and the
// player's own vocabulary. A generated name equal to any of these is
// pushed aside by the namer. This list is deliberately over-broad -- a
// slightly uglier room name costs nothing, a name collision with a kind
// costs a compile error the author cannot easily read.
const RESERVED_WORDS = [
  'a', 'an', 'the', 'and', 'or', 'not', 'all', 'any', 'some', 'every', 'each', 'both',
  'it', 'its', 'him', 'her', 'them', 'me', 'myself', 'self', 'yourself', 'player',
  'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down', 'inside', 'outside', 'in', 'on', 'at', 'to', 'from', 'of', 'with',
  'into', 'onto', 'under', 'over', 'behind', 'through', 'across',
  'room', 'rooms', 'thing', 'things', 'door', 'doors', 'container', 'supporter',
  'person', 'people', 'man', 'woman', 'animal', 'device', 'vehicle', 'backdrop',
  'scenery', 'direction', 'region', 'portal', 'portals', 'kind', 'value', 'object',
  'nothing', 'nowhere', 'everywhere', 'something', 'somewhere', 'anything', 'everything',
  'time', 'turn', 'turns', 'score', 'story', 'table', 'rule', 'rulebook', 'action',
  'activity', 'text', 'number', 'list', 'relation', 'property', 'figure', 'sound',
  'light', 'darkness', 'location', 'here', 'there', 'this', 'that', 'those',
  'when', 'if', 'otherwise', 'unless', 'while', 'repeat', 'say', 'now', 'let',
  'decide', 'end', 'begin', 'carry', 'check', 'instead', 'before', 'after', 'report',
  'understand', 'yes', 'no', 'true', 'false', 'is', 'are', 'was', 'has', 'have',
  'can', 'does', 'do', 'go', 'going', 'look', 'wait', 'again', 'undo', 'quit',
  'save', 'restore', 'script', 'notify', 'pronouns', 'exits', 'verbose', 'brief',
  'superbrief', 'take', 'drop', 'open', 'close', 'lock', 'unlock', 'push', 'pull',
  'examine', 'inventory', 'choose', 'traverse', 'cross'
]
const RESERVED = new Set(RESERVED_WORDS)

// Words that would derail an Inform assertion if they turned up inside a
// name: 'The Rack and Ruin is a room.' reads as two objects being defined.
const SPLIT_WORDS = new Set(['and', 'or'])

// Inform 7 reads a bare numeral in a phrase name or a local variable name as
// a number rather than as part of the name, so every generated identifier
// that lands inside a phrase body is suffixed with letters instead of digits.
function letterSuffix (i) {
  let n = i
  let s = ''
  do {
    s = String.fromCharCode(97 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

// --- text ---

// The IR permits a bare string wherever a text object is expected (spec §7),
// so every read goes through here rather than touching `.first` directly.
// Kept local rather than imported from story-ir.js: an exporter that cannot
// be loaded because a sibling module is mid-write is worse than eight lines
// of duplication.
function normalizeText (t) {
  if (t == null) return { first: '', repeat: null, brief: null, variants: [] }
  if (typeof t === 'string') return { first: t, repeat: null, brief: null, variants: [] }
  return {
    first: t.first == null ? '' : String(t.first),
    repeat: t.repeat == null ? null : String(t.repeat),
    brief: t.brief == null ? null : String(t.brief),
    variants: Array.isArray(t.variants) ? t.variants.map(String) : []
  }
}

// Escape IR prose for the inside of an Inform 7 double-quoted text.
//
// Everything here is a real hazard, not a corner case. IR text arrives from
// a narrator that emits `[theme:macro#ctx]` placeholders in debug mode, and
// an unescaped '[' turns the rest of the paragraph into a text substitution
// Inform cannot resolve. A literal '"' cannot appear inside quoted text at
// all -- not even inside a substitution -- so it must become
// [quotation mark]. Single quotes at the edges of words are printed as
// double quotes by Inform, so those become [apostrophe] while word-internal
// ones (sexton's) are left alone.
//
// The punctuation pass is a SINGLE regex over the original string: escaping
// in three sequential passes would find the '[' of a '[bracket]' it had just
// inserted and escape it again. The newline pass runs afterwards, and its
// brackets are meant to survive.
function escapeInformText (s) {
  if (s == null) return ''
  const raw = String(s).replace(/\r\n?/g, '\n')
  const punctuated = raw.replace(/["'[\]]/g, function (c, offset) {
    if (c === '[') return '[bracket]'
    if (c === ']') return '[close bracket]'
    if (c === '"') return '[quotation mark]'
    const before = raw.charAt(offset - 1)
    const after = raw.charAt(offset + 1)
    const inWord = /[A-Za-z0-9]/.test(before) && /[A-Za-z0-9]/.test(after)
    return inWord ? "'" : '[apostrophe]'
  })
  return punctuated
    .replace(/\t/g, ' ')
    .replace(/\n{2,}/g, '[paragraph break]')
    .replace(/\n/g, '[line break]')
    .replace(/ +$/gm, '')
}

// --- names ---

// Inform 7 has one flat namespace for rooms, things, kinds and global
// variables, and a name is the primary key of the object it names. The IR
// hands us `P_room_3` ids and free-text titles, so:
//
//   1. strip everything that is not a letter, digit, space or hyphen --
//      commas and periods end assertions, apostrophes split dictionary words;
//   2. drop 'and'/'or', which would split one assertion into two;
//   3. drop a leading article, because Inform strips it anyway and 'The Nave'
//      and 'Nave' would otherwise be the same object under two names;
//   4. push a leading digit behind a word, since a name may not start with one.
function sanitizeName (raw) {
  let s = String(raw == null ? '' : raw)
  s = s.replace(/[‘’“”]/g, '').replace(/'/g, '')
  s = s.replace(/[^A-Za-z0-9 -]+/g, ' ')
  let words = s.split(/\s+/).filter(function (w) { return w.length > 0 && !SPLIT_WORDS.has(w.toLowerCase()) })
  while (words.length && /^(the|a|an)$/i.test(words[0])) words.shift()
  s = words.join(' ').replace(/-+/g, '-').trim()
  if (/^[0-9]/.test(s)) s = 'Area ' + s
  return s
}

// Collision policy, stated once so the tests can assert it: names are
// claimed in emission order (passages, then items, then portals, then
// variables), compared case-insensitively, and a claimant that finds its
// name taken -- or finds it in the reserved list -- gets an ascending
// numeric suffix. Deterministic, and stable under re-export because the IR's
// own ordering is stable (spec §1).
function makeNamer () {
  const taken = new Set()
  return function claim (preferred, fallback) {
    let base = sanitizeName(preferred)
    if (!base) base = sanitizeName(fallback)
    if (!base) base = 'Place'
    if (RESERVED.has(base.toLowerCase())) base = base + ' 1'
    let name = base
    let n = 1
    while (taken.has(name.toLowerCase())) {
      n += 1
      name = base + ' ' + n
    }
    taken.add(name.toLowerCase())
    return name
  }
}

// Say-phrase names live in the same flat namespace as everything else but
// additionally may not carry digits (see letterSuffix), so they get their own
// namer: the object name with its digits stripped, disambiguated by letter.
function makePhraseNamer () {
  const taken = new Set()
  return function claim (base) {
    const stem = String(base).replace(/[0-9]+/g, '').replace(/\s+/g, ' ').trim() || 'thing'
    let name = stem
    let n = 0
    while (taken.has(name.toLowerCase())) {
      name = stem + ' ' + letterSuffix(n)
      n += 1
    }
    taken.add(name.toLowerCase())
    return name
  }
}

// --- statement blocks ---
//
// Inform 7 punctuation inside a rule or phrase body is positional: every
// statement is separated by a semicolon and the last one in the body ends
// with a period, while a line that opens a block ends with a colon and takes
// no separator at all. Getting that wrong is the single easiest way to emit
// a file that will not compile, so bodies are built as structured lines and
// punctuated once, at render time, instead of by hand at each call site.

function line (indent, text) { return { indent: indent, text: text, block: false } }
function block (indent, text) { return { indent: indent, text: text, block: true } }

function renderBody (lines) {
  let lastStatement = -1
  lines.forEach(function (l, i) { if (!l.block) lastStatement = i })
  return lines.map(function (l, i) {
    const pad = new Array(l.indent + 1).join(TAB)
    if (l.block) return pad + l.text + ':'
    return pad + l.text + (i === lastStatement ? '.' : ';')
  }).join(NL)
}

// A body whose final line opens a block, or which is empty, is a compile
// error. `do nothing` is Inform's own no-op and costs a single opcode.
function safeBody (lines) {
  const out = lines.slice()
  if (!out.length || out[out.length - 1].block) out.push(line(1, 'do nothing'))
  return renderBody(out)
}

// --- conditions ---

// Push negation down to the leaves. Inform has no boolean NOT over a
// compound condition, but every leaf we emit has an expressible opposite
// (`is true` / `is false`, `at least` / `less than`), so an NNF pass makes
// the general case go away before code generation sees it.
function pushDownNot (cond, negate) {
  if (!cond) return null
  if (cond.not) return pushDownNot(cond.not, !negate)
  if (cond.all) {
    const kids = cond.all.map(function (c) { return pushDownNot(c, negate) })
    return negate ? { any: kids } : { all: kids }
  }
  if (cond.any) {
    const kids = cond.any.map(function (c) { return pushDownNot(c, negate) })
    return negate ? { all: kids } : { any: kids }
  }
  if (!negate) return cond
  const flip = { gt: 'lte', gte: 'lt', lt: 'gte', lte: 'gt', eq: 'ne', ne: 'eq' }
  if (typeof cond.is !== 'undefined') return { var: cond.var, is: !cond.is }
  const op = Object.keys(flip).find(function (k) { return typeof cond[k] !== 'undefined' })
  if (op) {
    const out = { var: cond.var }
    out[flip[op]] = cond[op]
    return out
  }
  return cond
}

// An all/any of one is just its child. Unwrapping is not cosmetic: it is what
// lets the common `{ all: [ one leaf ] }` shape the generator emits compile to
// a single Inform condition instead of a scratch truth state.
function simplify (cond) {
  if (!cond) return cond
  const kids = cond.all || cond.any
  if (kids && kids.length === 1) return simplify(kids[0])
  if (cond.all) return { all: cond.all.map(simplify) }
  if (cond.any) return { any: cond.any.map(simplify) }
  return cond
}

// --- the exporter ---

function exportInform7 (ir, opts) {
  const options = opts || {}
  if (!ir || typeof ir !== 'object') throw new Error('exportInform7: no IR given')

  // Spec §10 makes validation the exporter's job. `story-ir.js` is written
  // by a sibling module; when it is not on disk yet we degrade to emitting
  // rather than crashing, because a missing validator is not a broken story.
  if (options.validate !== false) {
    let validate = null
    try { validate = require('../story-ir').validateStoryIR } catch (e) { validate = null }
    if (typeof validate === 'function') {
      const problems = validate(ir)
      if (problems && problems.length) {
        throw new Error('exportInform7: invalid Story IR:' + NL + problems.join(NL))
      }
    }
  }

  const meta = ir.meta || {}
  const passages = ir.passages || []
  const links = ir.links || []
  const items = ir.items || []
  const vars = ir.vars || []

  const passageById = {}
  passages.forEach(function (p) { passageById[p.id] = p })
  const linkById = {}
  links.forEach(function (l) { linkById[l.id] = l })
  const itemById = {}
  items.forEach(function (i) { itemById[i.id] = i })

  // A var of kind 'item' that backs a real item is not a variable at all
  // here: it is 'the player carries the key'. Keeping both would let the
  // flag and the inventory disagree, which is precisely the bug the world
  // model exists to prevent.
  const itemVar = {}
  items.forEach(function (i) { if (i.var) itemVar[i.var] = i })

  const claim = makeNamer()
  const claimPhrase = makePhraseNamer()

  const roomName = {}
  const bodyName = {}
  passages.forEach(function (p) {
    roomName[p.id] = claim(p.title, p.id)
    bodyName[p.id] = claimPhrase(roomName[p.id])
  })

  const thingName = {}
  items.forEach(function (i) {
    thingName[i.id] = claim(normalizeText(i.name).first || i.name, i.id)
    bodyName[i.id] = claimPhrase(thingName[i.id])
  })

  // Portals are claimed in IR link order, which is grouped by source passage
  // (spec §1), so the exit numbers below come out in presentation order.
  const portalName = {}
  const exitNumber = {}
  const perRoomCount = {}
  links.forEach(function (l) {
    const dest = roomName[l.to] || 'Elsewhere'
    portalName[l.id] = claim('Way to ' + dest, 'Way ' + l.id)
    perRoomCount[l.from] = (perRoomCount[l.from] || 0) + 1
    exitNumber[l.id] = perRoomCount[l.from]
  })
  let maxExit = 1
  Object.keys(perRoomCount).forEach(function (k) { maxExit = Math.max(maxExit, perRoomCount[k]) })

  const varName = {}
  const declaredVars = []
  vars.forEach(function (v) {
    if (itemVar[v.name]) return
    varName[v.name] = claim(v.name.replace(/_/g, ' '), 'state')
    declaredVars.push(v)
  })

  const chosenWay = links.length ? claim('chosen way', 'chosen way') : null

  // --- condition and effect compilation -------------------------------

  function varRef (name) {
    if (varName[name]) return varName[name]
    // A var referenced but never declared is an IR bug; validateStoryIR
    // catches it (§10.6). Emit something legible rather than `undefined`.
    return sanitizeName(String(name).replace(/_/g, ' ')) || 'unknown state'
  }

  // Render a leaf as a positive Inform condition plus the sense in which it
  // should be read. Only the item leaves ever come back negative: Inform can
  // say `X is false` directly but 'the player does not carry Y' is a
  // different grammatical construction, and asking for it is how you find
  // out that your Inform version disagrees with you.
  function renderLeaf (leaf) {
    const item = itemVar[leaf.var]
    if (item) {
      const expr = 'the player carries ' + thingName[item.id]
      if (typeof leaf.is !== 'undefined') return { expr: expr, positive: !!leaf.is }
      if (typeof leaf.eq !== 'undefined') return { expr: expr, positive: !!leaf.eq }
      if (typeof leaf.ne !== 'undefined') return { expr: expr, positive: !leaf.ne }
      return { expr: expr, positive: true }
    }
    const name = varRef(leaf.var)
    if (typeof leaf.is !== 'undefined') return { expr: name + ' is ' + (leaf.is ? 'true' : 'false'), positive: true }
    if (typeof leaf.gt !== 'undefined') return { expr: name + ' is greater than ' + leaf.gt, positive: true }
    if (typeof leaf.gte !== 'undefined') return { expr: name + ' is at least ' + leaf.gte, positive: true }
    if (typeof leaf.lt !== 'undefined') return { expr: name + ' is less than ' + leaf.lt, positive: true }
    if (typeof leaf.lte !== 'undefined') return { expr: name + ' is at most ' + leaf.lte, positive: true }
    if (typeof leaf.eq !== 'undefined') return { expr: name + ' is ' + informValue(leaf.eq), positive: true }
    if (typeof leaf.ne !== 'undefined') return { expr: name + ' is not ' + informValue(leaf.ne), positive: true }
    return { expr: name + ' is true', positive: true }
  }

  function informValue (v) {
    if (v === true) return 'true'
    if (v === false) return 'false'
    return String(v)
  }

  // Compile a condition into statements that leave `flag` holding its truth
  // value. Each all/any subterm gets its own local, which is why the locals
  // are named after their path: Inform scopes `let` to the whole phrase, so
  // two subterms sharing a name is a redefinition error.
  function emitCondition (cond, flag, out, indent) {
    if (cond.all || cond.any) {
      const kids = cond.all || cond.any
      const isAll = !!cond.all
      if (kids.length === 1) return emitCondition(kids[0], flag, out, indent)
      out.push(line(indent, 'now ' + flag + ' is ' + (isAll ? 'true' : 'false')))
      kids.forEach(function (kid, i) {
        const sub = flag + ' part ' + letterSuffix(i)
        out.push(line(indent, 'let ' + sub + ' be true'))
        emitCondition(kid, sub, out, indent)
        out.push(line(indent, 'if ' + sub + ' is ' + (isAll ? 'false' : 'true') +
          ', now ' + flag + ' is ' + (isAll ? 'false' : 'true')))
      })
      return
    }
    const leaf = renderLeaf(cond)
    out.push(line(indent, 'now ' + flag + ' is ' + (leaf.positive ? 'false' : 'true')))
    out.push(line(indent, 'if ' + leaf.expr + ', now ' + flag + ' is ' + (leaf.positive ? 'true' : 'false')))
  }

  function emitEffects (effects, out, indent) {
    const list = effects || []
    list.forEach(function (e) {
      if (e.op === 'acquire') {
        const item = itemById[e.item]
        if (!item) return
        const take = normalizeText(item.takeText)
        out.push(block(indent, 'unless the player carries ' + thingName[item.id]))
        if (take.first) out.push(line(indent + 1, 'say "' + escapeInformText(take.first) + '[paragraph break]"'))
        out.push(line(indent + 1, 'now the player carries ' + thingName[item.id]))
        return
      }
      if (e.op === 'set') {
        const item = itemVar[e.var]
        if (item) {
          if (e.value) out.push(line(indent, 'now the player carries ' + thingName[item.id]))
          else out.push(line(indent, 'remove ' + thingName[item.id] + ' from play'))
          return
        }
        out.push(line(indent, 'now ' + varRef(e.var) + ' is ' + informValue(e.value)))
        return
      }
      if (e.op === 'add') {
        const n = Number(e.value) || 0
        if (n < 0) out.push(line(indent, 'decrease ' + varRef(e.var) + ' by ' + Math.abs(n)))
        else out.push(line(indent, 'increase ' + varRef(e.var) + ' by ' + n))
      }
    })
  }

  // --- assembly -------------------------------------------------------

  const out = []
  function push (s) { out.push(s) }
  function section (n, title) { push(''); push('Section ' + n + ' - ' + title); push('') }

  const title = String(meta.title || 'A graphgram story')
  const author = String(options.author || 'graphgram')
  // The bibliographic sentence is the one place Inform does not want a
  // closing period; every example in the manual is written without one.
  push('"' + escapeInformText(title) + '" by "' + escapeInformText(author) + '"')
  push('')
  push('[ Generated by ' + escapeInformText(String(meta.generator || 'graphgram')) +
    ' from Story IR version ' + (ir.irVersion == null ? '1' : ir.irVersion) + '.')
  push('  Example ' + escapeInformText(String(meta.id || 'unknown')) +
    ', seed ' + escapeInformText(String(meta.seed)) +
    ', theme ' + escapeInformText(String(meta.theme || 'none')) +
    ', topology ' + escapeInformText(String(meta.topology || 'unknown')) + '.')
  push('  Movement is by numbered ways out, not by compass directions: this story')
  push('  has no map connections at all. Type EXITS to list the ways on, then')
  push('  CHOOSE with a number, or TRAVERSE a way by name. ]')

  // --- kinds and state ---

  section(1, 'The world model')
  push('The story headline is "' + escapeInformText(String(meta.id || 'a generated story')) + '".')
  push('')
  push('A portal is a kind of thing.')
  push('A portal is always scenery.')
  push('A portal has a room called the far side.')
  push('A portal has a number called the exit number.')
  push('A portal has some text called the first caption.')
  push('A portal has some text called the later caption.')
  push('A portal has some text called the first crossing.')
  push('A portal has some text called the later crossing.')
  push('A portal has some text called the refusal.')
  push('A portal can be tried or untried. A portal is usually untried.')
  push('A portal can be passable or barred. A portal is usually barred.')
  push('A portal can be shown when barred or hidden when barred. A portal is usually shown when barred.')
  push('')
  push('[ The Standard Rules declare lockable, locked and matching key twice over --')
  push('  once for doors, once for containers -- so declaring them a third time for')
  push('  our own kind is the documented way to opt a kind into the lock machinery. ]')
  push('A portal can be lockable. A portal is usually not lockable.')
  push('A portal can be locked or unlocked. A portal is usually unlocked.')
  push('A portal has an object called a matching key.')
  push('')
  push('A room has a number called the visit tally.')
  push('A room can be automatic or manual. A room is usually manual.')
  push('A room can be final or ongoing. A room is usually ongoing.')
  if (chosenWay) push('The ' + chosenWay + ' is a portal that varies.')

  if (declaredVars.length) {
    push('')
    declaredVars.forEach(function (v) {
      const kind = (typeof v.init === 'boolean') ? 'truth state' : 'number'
      push(varName[v.name] + ' is a ' + kind + ' that varies.')
    })
  }

  // --- rooms ---

  section(2, 'Rooms')
  passages.forEach(function (p) {
    const name = roomName[p.id]
    push(name + ' is a room.')
    push('The printed name of ' + name + ' is "' + escapeInformText(p.title || p.id) + '".')
    push('The description of ' + name + ' is "[body of ' + bodyName[p.id] + ']".')
    if (p.role === 'random') push(name + ' is automatic.')
    if (p.role === 'ending' || p.role === 'death') push(name + ' is final.')
    push('')
  })
  if (ir.start && roomName[ir.start]) push('The player is in ' + roomName[ir.start] + '.')

  // --- items ---

  section(3, 'Things')
  if (!items.length) {
    push('[ This story has no carryable items. ]')
  } else {
    items.forEach(function (i) {
      const name = thingName[i.id]
      const printed = normalizeText(i.name).first || i.name || i.id
      push(name + ' is a thing.')
      push('The printed name of ' + name + ' is "' +
        escapeInformText(String(printed).replace(/^(the|a|an) /i, '')) + '".')
      push('The description of ' + name + ' is "[body of ' + bodyName[i.id] + ']".')
      push('')
    })
    push('[ Items start out of play; an acquire effect moves them into the')
    push('  player[apostrophe]s hands. ]')
  }

  // --- portals ---

  section(4, 'The ways out')
  if (!links.length) {
    push('[ This story has no links. ]')
  } else {
    links.forEach(function (l) {
      const name = portalName[l.id]
      const from = roomName[l.from]
      const to = roomName[l.to]
      const cap = normalizeText(l.linkText)
      const cross = normalizeText(l.text)
      const closed = normalizeText(l.closedText)
      const capFirst = cap.first || ('Go to ' + (passageById[l.to] ? passageById[l.to].title : to))
      const capLater = cap.repeat || capFirst
      push(name + ' is a portal.')
      push(name + ' is in ' + from + '.')
      push('The printed name of ' + name + ' is "way to ' +
        escapeInformText(passageById[l.to] ? passageById[l.to].title : to) + '".')
      push('The far side of ' + name + ' is ' + to + '.')
      push('The exit number of ' + name + ' is ' + exitNumber[l.id] + '.')
      push('The first caption of ' + name + ' is "' + escapeInformText(capFirst) + '".')
      push('The later caption of ' + name + ' is "' + escapeInformText(capLater) + '".')
      push('The first crossing of ' + name + ' is "' + escapeInformText(cross.first) + '".')
      push('The later crossing of ' + name + ' is "' + escapeInformText(cross.repeat || cross.first) + '".')
      push('The refusal of ' + name + ' is "' +
        escapeInformText(closed.first || 'That way will not open to you yet.') + '".')
      if (l.whenBlocked === 'hide') push(name + ' is hidden when barred.')
      const lockItem = lockingItemFor(l)
      if (lockItem) {
        push(name + ' is lockable and locked.')
        push('The matching key of ' + name + ' is ' + thingName[lockItem.id] + '.')
      }
      push('')
    })
  }

  // A link is a lock when its condition is, or contains at the top level, a
  // demand that the player be holding a specific item. That is exactly the
  // key/door pair the dungeon grammar builds, and it is the one case where
  // Inform's own machinery says what we mean.
  function lockingItemFor (l) {
    const cond = l.condition
    if (!cond) return null
    const leaves = (cond.all || cond.any || [cond])
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i]
      if (!leaf || !leaf.var) continue
      const item = itemVar[leaf.var]
      if (item && (leaf.is === true || leaf.eq === true)) return item
    }
    return null
  }

  // --- prose ---

  section(5, 'Prose')

  passages.forEach(function (p) {
    const name = roomName[p.id]
    const t = normalizeText(p.text)
    const body = []
    if (t.variants.length) {
      body.push(block(1, 'if the visit tally of ' + name + ' is 0'))
      body.push(line(2, 'say "' + escapeInformText(t.first) + '"'))
      body.push(block(1, 'otherwise if the visit tally of ' + name + ' is 1'))
      body.push(line(2, 'say "' + escapeInformText(t.repeat || t.first) + '"'))
      body.push(block(1, 'otherwise'))
      body.push(line(2, 'let pick be the remainder after dividing the visit tally of ' +
        name + ' by ' + t.variants.length))
      t.variants.forEach(function (v, i) {
        body.push(block(2, (i === 0 ? 'if' : 'otherwise if') + ' pick is ' + i))
        body.push(line(3, 'say "' + escapeInformText(v) + '"'))
      })
      body.push(block(2, 'otherwise'))
      body.push(line(3, 'say "' + escapeInformText(t.repeat || t.first) + '"'))
    } else if (t.repeat) {
      body.push(block(1, 'if the visit tally of ' + name + ' is 0'))
      body.push(line(2, 'say "' + escapeInformText(t.first) + '"'))
      body.push(block(1, 'otherwise'))
      body.push(line(2, 'say "' + escapeInformText(t.repeat) + '"'))
    } else {
      body.push(line(1, 'say "' + escapeInformText(t.first) + '"'))
    }
    push('To say body of ' + bodyName[p.id] + ':')
    push(safeBody(body))
    push('')
  })

  items.forEach(function (i) {
    const name = thingName[i.id]
    const d = normalizeText(i.description)
    const carry = normalizeText(i.carryText)
    const body = []
    body.push(line(1, 'say "' + escapeInformText(d.first) + '"'))
    if (carry.first) {
      body.push(block(1, 'if the player carries ' + name))
      body.push(line(2, 'say "[paragraph break]' + escapeInformText(carry.first) + '"'))
    }
    push('To say body of ' + bodyName[i.id] + ':')
    push(safeBody(body))
    push('')
  })

  push('To say caption of (P - a portal):')
  push(safeBody([
    block(1, 'if P is tried'),
    line(2, 'say "[later caption of P]"'),
    block(1, 'otherwise'),
    line(2, 'say "[first caption of P]"')
  ]))

  // --- state machinery ---

  section(6, 'State')

  // Every link's condition is evaluated in one phrase, called before any
  // listing or crossing. Doing it here rather than in a phrase per link keeps
  // all the generated identifiers in a single scope, so they can be named by
  // position and never need a digit in them; and it means passability is a
  // plain either/or property everywhere else, which side-steps the fact that
  // `the noun` is typed as a thing inside an action rule.
  if (links.length) {
    const refresh = [block(1, 'repeat with P running through portals'), line(2, 'now P is barred')]
    let flagIndex = 0
    links.forEach(function (l) {
      const name = portalName[l.id]
      if (!l.condition) {
        refresh.push(line(1, 'now ' + name + ' is passable'))
        return
      }
      const cond = simplify(pushDownNot(l.condition, false))
      if (!cond.all && !cond.any) {
        const leaf = renderLeaf(cond)
        if (leaf.positive) {
          refresh.push(line(1, 'if ' + leaf.expr + ', now ' + name + ' is passable'))
          return
        }
      }
      const flag = 'ok ' + letterSuffix(flagIndex)
      flagIndex += 1
      refresh.push(line(1, 'let ' + flag + ' be true'))
      emitCondition(cond, flag, refresh, 1)
      refresh.push(line(1, 'if ' + flag + ' is true, now ' + name + ' is passable'))
    })
    push('To refresh the ways:')
    push(safeBody(refresh))
    push('')

    push('To decide whether (P - a portal) is offered:')
    push(safeBody([
      line(1, 'if P is passable, decide yes'),
      line(1, 'if P is shown when barred, decide yes'),
      line(1, 'decide no')
    ]))
    push('')
  }

  const entry = []
  passages.forEach(function (p) {
    if (!p.onEnter || !p.onEnter.length) return
    entry.push(block(1, 'if R is ' + roomName[p.id]))
    emitEffects(p.onEnter, entry, 2)
  })
  push('To apply the entry effects of (R - a room):')
  push(safeBody(entry))
  push('')

  if (links.length) {
    const traversal = []
    links.forEach(function (l) {
      if (!l.onTraverse || !l.onTraverse.length) return
      traversal.push(block(1, 'if P is ' + portalName[l.id]))
      emitEffects(l.onTraverse, traversal, 2)
    })
    push('To apply the traversal effects of (P - a portal):')
    push(safeBody(traversal))
    push('')
  }

  const status = []
  passages.forEach(function (p) {
    if (!p.status) return
    status.push(block(1, 'if the location is ' + roomName[p.id]))
    status.push(line(2, 'now the right hand status line is "' + escapeInformText(p.status) + '"'))
  })
  status.push(line(1, 'do nothing'))
  push('To refresh the status chip:')
  push(safeBody([line(1, 'now the right hand status line is ""')].concat(status)))
  push('')

  // Arrival: endings stop the story, and a random passage rolls its own
  // outgoing edge rather than offering it. The cumulative-weight chain is
  // scaled to whole numbers first, because Inform's random number phrase
  // deals in integers and the IR's weights need not.
  const arrival = []
  const randomPassages = passages.filter(function (p) { return p.role === 'random' })
  if (randomPassages.length) arrival.push(line(1, 'let roll be 0'))
  passages.forEach(function (p) {
    const t = normalizeText(p.text)
    if (p.role === 'ending' || p.role === 'death') {
      const closing = t.brief || p.title || 'The end'
      arrival.push(block(1, 'if R is ' + roomName[p.id]))
      arrival.push(line(2, 'end the story ' + (p.role === 'ending' ? 'finally ' : '') +
        'saying "' + escapeInformText(closing) + '"'))
      return
    }
    if (p.role !== 'random') return
    const outgoing = (p.links || []).map(function (id) { return linkById[id] }).filter(Boolean)
    if (!outgoing.length) return
    const scale = outgoing.every(function (l) { return Number.isInteger(Number(l.weight)) }) ? 1 : 1000
    const weights = outgoing.map(function (l) { return Math.max(1, Math.round((Number(l.weight) || 1) * scale)) })
    const total = weights.reduce(function (a, b) { return a + b }, 0)
    arrival.push(block(1, 'if R is ' + roomName[p.id]))
    arrival.push(line(2, 'now roll is a random number between 1 and ' + total))
    let cumulative = 0
    outgoing.forEach(function (l, i) {
      cumulative += weights[i]
      const last = i === outgoing.length - 1
      if (last) arrival.push(block(2, 'otherwise'))
      else arrival.push(block(2, (i === 0 ? 'if' : 'otherwise if') + ' roll is at most ' + cumulative))
      arrival.push(line(3, 'now the ' + chosenWay + ' is ' + portalName[l.id]))
    })
    arrival.push(line(2, 'try traversing the ' + chosenWay))
  })
  push('To settle the arrival at (R - a room):')
  push(safeBody(arrival))
  push('')

  push('To send the player to (R - a room):')
  push(safeBody([
    line(1, 'move the player to R, without printing a room description'),
    line(1, 'apply the entry effects of R'),
    line(1, 'refresh the status chip'),
    line(1, 'try looking'),
    line(1, 'settle the arrival at R')
  ]))
  push('')

  // The listing walks exit numbers in an outer loop rather than trusting the
  // order Inform iterates objects in: the numbering the player types has to
  // match the numbering they were shown, and object order is an
  // implementation detail we would rather not depend on.
  if (links.length) {
    push('To list the ways out:')
    push(safeBody([
      block(1, 'unless the location is automatic'),
      line(2, 'refresh the ways'),
      line(2, 'let n be 0'),
      block(2, 'repeat with N running from 1 to ' + maxExit),
      block(3, 'repeat with P running through portals in the location'),
      block(4, 'if the exit number of P is N and P is offered'),
      line(5, 'increase n by 1'),
      line(5, 'if n is 1, say "[paragraph break]"'),
      line(5, 'say "  [n]. [caption of P]"'),
      block(5, 'unless P is passable'),
      line(6, 'say " (barred)"'),
      line(5, 'say "[line break]"'),
      block(2, 'if n is 0 and the location is ongoing'),
      line(3, 'say "[paragraph break]There is no way on from here."')
    ]))
    push('')
  }

  // --- actions ---

  section(7, 'Getting about')

  push('Traversing is an action applying to one visible thing.')
  push('Understand "traverse [something]" as traversing.')
  push('Understand "cross [something]" as traversing.')
  push('')

  push('Check traversing something (this is the ways out only rule):')
  push(safeBody([
    block(1, 'unless the noun is a portal'),
    line(2, 'say "That is not a way on from here."'),
    line(2, 'stop the action')
  ]))
  push('')

  if (links.length) {
    // `the noun` is typed as a thing by the action definition, so reading a
    // portal property off it will not compile. Walking the portals and
    // matching by identity gets us a portal-typed local, which will.
    push('Check traversing something (this is the barred way rule):')
    push(safeBody([
      line(1, 'refresh the ways'),
      block(1, 'repeat with P running through portals'),
      block(2, 'if P is the noun and P is barred'),
      line(3, 'say "[refusal of P][paragraph break]"'),
      line(3, 'stop the action')
    ]))
    push('')

    push('Carry out traversing something (this is the cross the way rule):')
    push(safeBody([
      block(1, 'repeat with P running through portals'),
      block(2, 'if P is the noun'),
      line(3, 'cross P')
    ]))
    push('')

    push('To cross (P - a portal):')
    push(safeBody([
      block(1, 'if P is lockable and P is locked'),
      line(2, 'now P is unlocked'),
      block(1, 'if P is tried'),
      line(2, 'say "[later crossing of P][paragraph break]"'),
      block(1, 'otherwise'),
      line(2, 'say "[first crossing of P][paragraph break]"'),
      line(1, 'apply the traversal effects of P'),
      line(1, 'now P is tried'),
      line(1, 'send the player to the far side of P')
    ]))
    push('')

    push('Choosing is an action applying to one number.')
    push('Understand "choose [number]" as choosing.')
    push('Understand "go [number]" as choosing.')
    push('')

    push('Carry out choosing (this is the choose a way rule):')
    push(safeBody([
      line(1, 'refresh the ways'),
      line(1, 'let target be the number understood'),
      line(1, 'let n be 0'),
      line(1, 'let found be false'),
      block(1, 'repeat with N running from 1 to ' + maxExit),
      block(2, 'repeat with P running through portals in the location'),
      block(3, 'if the exit number of P is N and P is offered'),
      line(4, 'increase n by 1'),
      block(4, 'if n is target and found is false'),
      line(5, 'now found is true'),
      line(5, 'now the ' + chosenWay + ' is P'),
      block(1, 'if found is true'),
      line(2, 'try traversing the ' + chosenWay),
      block(1, 'otherwise'),
      line(2, 'say "There is no way out numbered [target] here."')
    ]))
    push('')

    push('Surveying is an action applying to nothing.')
    push('Understand "exits" as surveying.')
    push('Understand "ways" as surveying.')
    push('')
    push('Carry out surveying (this is the survey the ways rule):')
    push(safeBody([line(1, 'list the ways out')]))
    push('')

    push('Instead of entering a portal:')
    push(safeBody([line(1, 'try traversing the noun')]))
    push('')
    push('Instead of opening a portal:')
    push(safeBody([line(1, 'try traversing the noun')]))
    push('')
    push('Instead of unlocking a portal with something:')
    push(safeBody([
      line(1, 'say "The way turns its own lock, if you are carrying what it wants. Cross it and see."')
    ]))
    push('')
  }

  // Every direction leads nowhere by construction, so this rule catches all
  // compass movement and points the player back at the numbered ways.
  push('Instead of going nowhere:')
  push(safeBody([
    line(1, 'say "There is no way that way. Type EXITS to see the ways on, then CHOOSE a number."')
  ]))
  push('')

  push('After looking (this is the ways out listing rule):')
  push(safeBody([
    line(1, 'increase the visit tally of the location by 1')
  ].concat(links.length ? [line(1, 'list the ways out')] : [])))

  // --- opening ---

  section(8, 'Beginning')
  const opening = []
  declaredVars.forEach(function (v) {
    opening.push(line(1, 'now ' + varName[v.name] + ' is ' + informValue(v.init)))
  })
  const startPassage = passageById[ir.start]
  if (startPassage) {
    opening.push(line(1, 'apply the entry effects of ' + roomName[ir.start]))
    opening.push(line(1, 'refresh the status chip'))
  }
  push('When play begins (this is the story setup rule):')
  push(safeBody(opening))
  push('')
  push('[ The startup rulebook prints the first room description after the')
  push('  when play begins rules have run, so the opening effects above land')
  push('  before the player reads anything. ]')
  push('')

  return out.join(NL).replace(/\n{3,}/g, NL + NL).replace(/\s+$/, '') + NL
}

// escapeInformText is exported for the test suite: the escaping rules are the
// part of this file most likely to be wrong and most worth testing directly.
module.exports = { exportInform7, escapeInformText }
