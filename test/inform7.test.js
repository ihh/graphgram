// Structural tests for the Inform 7 exporter.
//
// THE LIMIT OF THESE TESTS, STATED UP FRONT. There is no Inform 7 compiler
// in this repo and no way to invoke one here, so nothing below proves the
// emitted source compiles. What it proves is the class of failure a
// generator actually makes: a name used but never declared, two objects
// claiming the same name, a name colliding with Inform's own vocabulary, an
// unescaped square bracket turning narrative prose into a broken text
// substitution, an unbalanced quote. Syntax correctness was established
// against the Inform 7 documentation when the emitter was written; if the
// compiler rejects this output, the bug is in exporters/inform7.js and a
// regression test for it belongs here.

const test = require('node:test')
const assert = require('node:assert')
const { exportInform7, escapeInformText } = require('../exporters/inform7')
const ir = require('./fixtures/story-ir.sample.json')

const source = exportInform7(ir)

// --- helpers -----------------------------------------------------------

// Inform 7 comments are square-bracket delimited and are not prose: the
// bracket and quote audits below must not see them.
function codeLines (text) {
  const out = []
  let inComment = false
  text.split('\n').forEach(function (raw) {
    const l = raw.trimEnd()
    if (inComment) {
      if (/\]\s*$/.test(l)) inComment = false
      return
    }
    if (/^\s*\[/.test(l)) {
      if (!/\]\s*$/.test(l)) inComment = true
      return
    }
    out.push(l)
  })
  return out
}

const CODE = codeLines(source)

function declared (pattern) {
  const names = []
  CODE.forEach(function (l) {
    const m = l.match(pattern)
    if (m) names.push(m[1].trim())
  })
  return names
}

// Every double-quoted run of PROSE in the emitted code. Understand lines are
// excluded: their quoted text is parser grammar, where [something] and
// [number] are tokens rather than text substitutions. Each quoted string is
// emitted on a single line by construction, which is what makes this scan
// sound.
function quotedStrings () {
  const out = []
  CODE.forEach(function (l) {
    if (/^Understand /.test(l)) return
    const re = /"([^"]*)"/g
    let m
    while ((m = re.exec(l))) out.push(m[1])
  })
  return out
}

// Inform's own vocabulary, embedded here rather than imported so that the
// test is an independent statement of the requirement and not a restatement
// of whatever the exporter happens to believe today.
const INFORM_RESERVED = [
  'a', 'an', 'the', 'and', 'or', 'not', 'all', 'any', 'every', 'it', 'me',
  'self', 'yourself', 'player', 'north', 'south', 'east', 'west', 'northeast',
  'northwest', 'southeast', 'southwest', 'up', 'down', 'inside', 'outside',
  'in', 'on', 'at', 'to', 'from', 'of', 'with', 'room', 'thing', 'things',
  'door', 'container', 'supporter', 'person', 'animal', 'device', 'vehicle',
  'backdrop', 'scenery', 'direction', 'region', 'portal', 'kind', 'value',
  'object', 'nothing', 'nowhere', 'everywhere', 'something', 'time', 'turn',
  'score', 'story', 'table', 'rule', 'rulebook', 'action', 'activity', 'text',
  'number', 'list', 'relation', 'property', 'light', 'darkness', 'location',
  'here', 'this', 'that', 'when', 'if', 'otherwise', 'unless', 'while',
  'repeat', 'say', 'now', 'let', 'decide', 'end', 'begin', 'carry', 'check',
  'instead', 'before', 'after', 'report', 'understand', 'yes', 'no', 'true',
  'false', 'is', 'are', 'has', 'can', 'do', 'go', 'look', 'wait', 'again',
  'undo', 'quit', 'save', 'restore', 'exits', 'verbose', 'brief', 'take',
  'drop', 'open', 'close', 'lock', 'unlock', 'examine', 'inventory', 'choose'
]

// Everything the exporter is allowed to leave unescaped inside quoted text.
const SUBSTITUTIONS = [
  /^bracket$/,
  /^close bracket$/,
  /^quotation mark$/,
  /^apostrophe$/,
  /^line break$/,
  /^paragraph break$/,
  /^body of [A-Za-z][A-Za-z ]*$/,
  /^caption of P$/,
  /^(first|later) (caption|crossing) of P$/,
  /^refusal of P$/,
  /^n$/,
  /^target$/
]

const UNESCAPES = {
  '[bracket]': '[',
  '[close bracket]': ']',
  '[quotation mark]': '"',
  '[apostrophe]': "'",
  '[line break]': '\n',
  '[paragraph break]': '\n\n'
}

function unescapeInformText (s) {
  return s.replace(/\[(?:bracket|close bracket|quotation mark|apostrophe|line break|paragraph break)\]/g,
    function (m) { return UNESCAPES[m] })
}

// --- the shape of the file ---------------------------------------------

test('inform7: emits a bibliographic sentence and ordered sections', () => {
  const lines = source.split('\n')
  assert.strictEqual(lines[0], '"The Cindermoor Vault" by "graphgram"',
    'the title sentence is first and, per the manual, carries no closing period')
  const sections = source.split('\n').filter(l => /^Section \d+ - /.test(l))
  assert.ok(sections.length >= 6, 'at least six sections, got ' + sections.length)
  const numbers = sections.map(s => Number(s.match(/^Section (\d+)/)[1]))
  assert.deepStrictEqual(numbers, numbers.slice().sort((a, b) => a - b), 'sections are numbered in order')
  sections.forEach(function (s) {
    const i = source.split('\n').indexOf(s)
    assert.strictEqual(source.split('\n')[i - 1], '', 'a blank line precedes ' + s)
  })
})

test('inform7: every passage becomes exactly one room, every link exactly one portal', () => {
  const rooms = declared(/^(.+?) is a room\.$/)
  assert.strictEqual(rooms.length, ir.passages.length,
    'one room per passage: ' + rooms.length + ' vs ' + ir.passages.length)
  const portals = declared(/^(.+?) is a portal\.$/)
  assert.strictEqual(portals.length, ir.links.length,
    'one portal per link: ' + portals.length + ' vs ' + ir.links.length)
})

test('inform7: every room named in a connection is declared exactly once', () => {
  const rooms = declared(/^(.+?) is a room\.$/)
  const counts = {}
  rooms.forEach(function (r) { counts[r] = (counts[r] || 0) + 1 })
  Object.keys(counts).forEach(function (r) {
    assert.strictEqual(counts[r], 1, r + ' is declared ' + counts[r] + ' times')
  })
  const known = new Set(rooms)

  // Every reference to a room: portal destinations, portal placements, the
  // player's start, and every branch of the entry-effect and arrival chains.
  const references = []
  CODE.forEach(function (l) {
    let m
    if ((m = l.match(/^The far side of .+ is (.+)\.$/))) references.push(m[1])
    if ((m = l.match(/^.+ is in (.+)\.$/))) references.push(m[1])
    if ((m = l.match(/^The player is in (.+)\.$/))) references.push(m[1])
    if ((m = l.match(/^\t*if R is (.+):$/))) references.push(m[1])
    if ((m = l.match(/^\t*if the location is (.+):$/))) references.push(m[1])
    if ((m = l.match(/^\t*apply the entry effects of (.+)$/))) references.push(m[1].replace(/[.;]$/, ''))
    if ((m = l.match(/^\t*move the player to (.+), without/))) references.push(m[1])
    if ((m = l.match(/^(.+) is (final|automatic)\.$/))) references.push(m[1])
  })
  assert.ok(references.length > 0, 'the scan found some room references at all')
  references.forEach(function (r) {
    // A single capital is a phrase parameter (R in `apply the entry effects
    // of R`), not a room name.
    if (/^[A-Z]$/.test(r)) return
    assert.ok(known.has(r), 'room referenced but never declared: ' + JSON.stringify(r))
  })

  // Both endings and the one random passage must have been reached by the scan.
  assert.ok(source.includes('Vestry is final.'))
  assert.ok(source.includes('Exchange is automatic.'))
})

test('inform7: every declared name is unique and outside Inform vocabulary', () => {
  const names = []
    .concat(declared(/^(.+?) is a room\.$/))
    .concat(declared(/^(.+?) is a thing\.$/))
    .concat(declared(/^(.+?) is a portal\.$/))
    .concat(declared(/^(.+?) is a truth state that varies\.$/))
    .concat(declared(/^(.+?) is a number that varies\.$/))
    .concat(declared(/^The (.+?) is a portal that varies\.$/))
  assert.ok(names.length >= ir.passages.length + ir.links.length + ir.items.length)
  const seen = new Set()
  names.forEach(function (n) {
    const key = n.toLowerCase()
    assert.ok(!seen.has(key), 'duplicate declared name: ' + n)
    seen.add(key)
    assert.ok(INFORM_RESERVED.indexOf(key) === -1, 'name collides with Inform vocabulary: ' + n)
    assert.ok(!/^[0-9]/.test(n), 'name starts with a digit: ' + n)
    assert.ok(!/[,.:;"'()[\]]/.test(n), 'name carries punctuation Inform will choke on: ' + n)
    assert.ok(!/\b(and|or)\b/i.test(n), 'name carries a word that would split the assertion: ' + n)
  })
})

test('inform7: portals point at declared rooms and carry a caption, a crossing and a refusal', () => {
  const portals = declared(/^(.+?) is a portal\.$/)
  portals.forEach(function (p) {
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const props = ['The far side of', 'The exit number of', 'The first caption of',
      'The later caption of', 'The first crossing of', 'The refusal of']
    props.forEach(function (prop) {
      assert.ok(new RegExp('^' + prop + ' ' + esc + ' is ', 'm').test(source),
        p + ' is missing ' + prop)
    })
  })
})

// --- escaping ----------------------------------------------------------

test('inform7: every quoted string is balanced, one per line', () => {
  CODE.forEach(function (l, i) {
    const quotes = (l.match(/"/g) || []).length
    assert.strictEqual(quotes % 2, 0,
      'unbalanced quote on code line ' + (i + 1) + ': ' + l)
  })
})

test('inform7: every bracket in emitted prose is a known substitution', () => {
  const strings = quotedStrings()
  assert.ok(strings.length > 20, 'the scan found prose to check')
  strings.forEach(function (s) {
    const re = /\[([^\]]*)\]?/g
    let m
    while ((m = re.exec(s))) {
      const inner = m[1]
      assert.ok(s.indexOf('[' + inner + ']') !== -1,
        'unterminated substitution in: ' + JSON.stringify(s))
      assert.ok(SUBSTITUTIONS.some(function (r) { return r.test(inner) }),
        'unknown or unescaped substitution [' + inner + '] in: ' + JSON.stringify(s))
    }
    assert.ok(s.indexOf('"') === -1, 'raw double quote inside prose: ' + JSON.stringify(s))
  })
})

test('inform7: a narrator placeholder and a double quote survive the escaper', () => {
  const original = 'She said "[theme:macro#ctx]" and the sexton\'s hand, \'unclenched\', let go.'
  const escaped = escapeInformText(original)
  assert.ok(escaped.indexOf('[bracket]theme:macro#ctx[close bracket]') !== -1,
    'placeholder brackets are escaped: ' + escaped)
  assert.ok(escaped.indexOf('[quotation mark]') !== -1, 'double quotes are escaped')
  assert.ok(escaped.indexOf('"') === -1, 'no raw double quote survives')
  assert.ok(escaped.indexOf("sexton's") !== -1, 'a word-internal apostrophe is left alone')
  assert.ok(escaped.indexOf('[apostrophe]unclenched[apostrophe]') !== -1,
    'word-edge single quotes become [apostrophe], which Inform would otherwise print as double: ' + escaped)
  assert.strictEqual(unescapeInformText(escaped), original, 'round trip is exact')
})

test('inform7: line breaks become substitutions, not raw newlines', () => {
  const escaped = escapeInformText('one\ntwo\n\nthree')
  assert.strictEqual(escaped, 'one[line break]two[paragraph break]three')
  assert.strictEqual(escaped.indexOf('\n'), -1)
  assert.strictEqual(unescapeInformText(escaped), 'one\ntwo\n\nthree')
})

test('inform7: placeholder text in a passage reaches the source escaped', () => {
  const clone = JSON.parse(JSON.stringify(ir))
  clone.passages[1].text = { first: 'A [gothic_horror:room#hall_1] with a "sign" on it.' }
  const out = exportInform7(clone, { validate: false })
  assert.ok(out.indexOf('A [bracket]gothic_horror:room#hall_1[close bracket] with a [quotation mark]sign[quotation mark] on it.') !== -1,
    'passage prose is escaped in place')
  codeLines(out).forEach(function (l) {
    assert.strictEqual((l.match(/"/g) || []).length % 2, 0, 'still balanced: ' + l)
  })
})

// --- the world model ---------------------------------------------------

test('inform7: items become things the player can carry, not flags', () => {
  ir.items.forEach(function (item) {
    assert.ok(/^(.+) is a thing\.$/m.test(source), 'a thing is declared')
    const acquired = new RegExp('^\\t*now the player carries .+$', 'm')
    assert.ok(acquired.test(source), 'acquisition is a world-model fact')
    // The var backing an item must NOT also be declared as a variable: one
    // source of truth, so inventory and flag can never disagree.
    const varWords = item.var.replace(/_/g, ' ')
    assert.ok(source.indexOf(varWords + ' is a truth state that varies.') === -1,
      item.var + ' should not be declared as a variable as well as an item')
  })
  assert.ok(source.indexOf('sextons brass key is a thing.') !== -1)
  assert.ok(source.indexOf("The printed name of sextons brass key is \"sexton's brass key\".") !== -1)
})

test('inform7: the locked link becomes a lock with a matching key', () => {
  const locked = ir.links.find(l => l.id === 'L_door_vault')
  assert.ok(locked.condition, 'the fixture link is gated on the key')
  assert.ok(/^(.+) is lockable and locked\.$/m.test(source), 'a lock is declared')
  const m = source.match(/^The matching key of (.+) is (.+)\.$/m)
  assert.ok(m, 'the lock names its matching key')
  assert.strictEqual(m[2], 'sextons brass key')
  assert.ok(source.indexOf('if the player carries sextons brass key, now ' + m[1] + ' is passable') !== -1,
    'and the same condition still gates passability')
  assert.ok(source.indexOf('\tif P is lockable and P is locked:') !== -1,
    'crossing turns the lock')
})

test('inform7: non-item vars are declared once with their init applied at startup', () => {
  const nonItem = ir.vars.filter(v => !ir.items.some(i => i.var === v.name))
  nonItem.forEach(function (v) {
    const name = v.name.replace(/_/g, ' ')
    const kind = typeof v.init === 'boolean' ? 'truth state' : 'number'
    assert.ok(source.indexOf(name + ' is a ' + kind + ' that varies.') !== -1,
      v.name + ' is declared as a ' + kind)
    assert.ok(source.indexOf('now ' + name + ' is ' + String(v.init)) !== -1,
      v.name + ' is initialised to ' + v.init)
  })
})

test('inform7: endings end the story, deaths end it without the final flourish', () => {
  assert.ok(source.indexOf('end the story finally saying "The vestry."') !== -1,
    'the win is a "finally" ending')
  assert.ok(source.indexOf('end the story saying "You died."') !== -1, 'the death is not')
  assert.ok(source.indexOf('end the story finally saying "You died."') === -1)
})

test('inform7: a random passage resolves itself on a cumulative weight chain', () => {
  const rolls = ir.links.filter(l => l.from === 'P_roll')
  const total = rolls.reduce((a, l) => a + l.weight, 0)
  assert.ok(source.indexOf('now roll is a random number between 1 and ' + total) !== -1,
    'the roll spans the summed weights')
  assert.ok(source.indexOf('if roll is at most 3:') !== -1, 'the first outcome takes its share')
  assert.ok(source.indexOf('try traversing the chosen way') !== -1, 'and the engine takes the link')
})

test('inform7: hidden-when-blocked links say so, shown ones do not', () => {
  ir.links.forEach(function (l) {
    if (l.whenBlocked !== 'hide') return
    const from = l.from
    assert.ok(/ is hidden when barred\.$/m.test(source), 'hidden links are marked')
  })
  const hidden = (source.match(/ is hidden when barred\.$/gm) || []).length
  const expected = ir.links.filter(l => l.whenBlocked === 'hide').length
  assert.strictEqual(hidden, expected, 'exactly the hidden links are marked')
})

// --- punctuation -------------------------------------------------------

test('inform7: every statement line is terminated, block openers with a colon', () => {
  CODE.forEach(function (l, i) {
    if (!l.trim()) return
    if (/^Section \d+ - /.test(l)) return
    if (i === 0) return
    if (/^"[^"]*" by /.test(l)) return
    assert.ok(/[.;:]$/.test(l), 'unterminated line ' + (i + 1) + ': ' + JSON.stringify(l))
  })
})

test('inform7: no phrase body ends on a block opener or a semicolon', () => {
  const lines = CODE
  lines.forEach(function (l, i) {
    const next = lines[i + 1]
    const endsBody = !next || !next.startsWith('\t')
    if (!l.startsWith('\t')) return
    if (!endsBody) return
    assert.ok(/\.$/.test(l), 'a phrase body ends without a period at line ' + (i + 1) + ': ' + JSON.stringify(l))
  })
})

// --- names under pressure ----------------------------------------------

test('inform7: reserved and colliding titles are pushed aside deterministically', () => {
  const hostile = {
    irVersion: 1,
    meta: { title: 'Hostile', id: 'hostile', seed: 1, theme: 'none', topology: 'dag' },
    vars: [],
    items: [],
    passages: [
      { id: 'P_a', title: 'North', role: 'start', text: { first: 'a' }, onEnter: [], links: ['L_1'], tags: [] },
      { id: 'P_b', title: 'north', role: 'normal', text: { first: 'b' }, onEnter: [], links: ['L_2'], tags: [] },
      { id: 'P_c', title: '3 Doors & Co.', role: 'normal', text: { first: 'c' }, onEnter: [], links: ['L_3'], tags: [] },
      { id: 'P_d', title: 'Rack and Ruin', role: 'ending', text: { first: 'd', brief: 'done' }, onEnter: [], links: [], tags: [] }
    ],
    links: [
      { id: 'L_1', from: 'P_a', to: 'P_b', kind: 'choice', weight: 1, linkText: { first: 'on' }, text: { first: '' }, condition: null, whenBlocked: 'show', onTraverse: [] },
      { id: 'L_2', from: 'P_b', to: 'P_c', kind: 'choice', weight: 1, linkText: { first: 'on' }, text: { first: '' }, condition: null, whenBlocked: 'show', onTraverse: [] },
      { id: 'L_3', from: 'P_c', to: 'P_d', kind: 'choice', weight: 1, linkText: { first: 'on' }, text: { first: '' }, condition: null, whenBlocked: 'show', onTraverse: [] }
    ],
    start: 'P_a',
    endings: ['P_d']
  }
  const out = exportInform7(hostile, { validate: false })
  const rooms = codeLines(out).map(function (l) {
    const m = l.match(/^(.+?) is a room\.$/)
    return m && m[1]
  }).filter(Boolean)
  assert.strictEqual(rooms.length, 4)
  const keys = rooms.map(r => r.toLowerCase())
  assert.strictEqual(new Set(keys).size, 4, 'collisions are resolved: ' + rooms.join(' / '))
  keys.forEach(function (k) {
    assert.ok(INFORM_RESERVED.indexOf(k) === -1, 'reserved name survived: ' + k)
  })
  assert.ok(rooms.some(r => /^Area 3 Doors/.test(r)), 'a leading digit is pushed behind a word: ' + rooms.join(' / '))
  assert.ok(rooms.every(r => !/\b(and|or)\b/i.test(r)), 'no name splits its own assertion: ' + rooms.join(' / '))
  // Same input, same output: exporters are pure functions of the IR.
  assert.strictEqual(exportInform7(hostile, { validate: false }), out)
})

test('inform7: a story with no items and no locks still emits', () => {
  const bare = {
    irVersion: 1,
    meta: { title: 'Bare', id: 'bare', seed: 1, theme: 'none', topology: 'dag' },
    vars: [],
    items: [],
    passages: [
      { id: 'P_1', title: 'Start', role: 'start', text: 'go', onEnter: [], links: ['L_1'], tags: [] },
      { id: 'P_2', title: 'Stop', role: 'ending', text: 'done', onEnter: [], links: [], tags: [] }
    ],
    links: [
      { id: 'L_1', from: 'P_1', to: 'P_2', kind: 'choice', weight: 1, linkText: 'onward', text: 'you go', condition: null, whenBlocked: 'show', onTraverse: [] }
    ],
    start: 'P_1',
    endings: ['P_2']
  }
  const out = exportInform7(bare, { validate: false })
  assert.ok(out.indexOf('Start is a room.') !== -1)
  assert.ok(out.indexOf('This story has no carryable items.') !== -1)
  assert.ok(out.indexOf('end the story finally saying') !== -1)
  codeLines(out).forEach(function (l) {
    assert.strictEqual((l.match(/"/g) || []).length % 2, 0, 'balanced: ' + l)
  })
})
