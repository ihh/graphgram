// Twee 3 / Harlowe 3 exporter tests.
//
// The exporter's output is a text format with no parser in the repo, so the
// suite carries a deliberately naive one: split on the ':: ' headers, keep
// names, tags and bodies, and assert on those. Anything the naive parser
// cannot read is something Twine would also read wrongly, so the parser
// being naive is the point rather than a shortcut.

const test = require('node:test')
const assert = require('node:assert')
const twine = require('../exporters/twine')
const ir = require('./fixtures/story-ir.sample.json')

// --- a minimal Twee 3 reader --------------------------------------------

// Twee 3: a passage starts at a line beginning ':: ', its name runs to an
// optional ' [tags]' suffix, and everything up to the next header is body.
// Body lines that would otherwise start a header are backslash-escaped by
// the exporter, so this split is exact.
function parseTwee (text) {
  const chunks = text.split(/^:: /m)
  assert.strictEqual(chunks[0], '', 'document starts with a passage header, no preamble')
  const passages = chunks.slice(1).map(chunk => {
    const nl = chunk.indexOf('\n')
    const head = nl < 0 ? chunk : chunk.slice(0, nl)
    const body = nl < 0 ? '' : chunk.slice(nl + 1)
    const m = /^(.*?)(?:\s+\[([^\]]*)\])?$/.exec(head)
    return {
      name: m[1],
      tags: m[2] ? m[2].split(/\s+/).filter(Boolean) : [],
      body: body.replace(/\n+$/, '')
    }
  })
  const byName = {}
  passages.forEach(p => {
    assert.ok(!byName[p.name], 'passage name "' + p.name + '" declared twice')
    byName[p.name] = p
  })
  return { passages, byName }
}

// Every [[display->Target]] in a body, as { display, target }.
function linksIn (body) {
  const out = []
  const re = /\[\[([^\[\]]*?)->([^\[\]]*?)\]\]/g
  let m
  while ((m = re.exec(body))) out.push({ display: m[1], target: m[2] })
  return out
}

const doc = twine.exportTwine(ir)
const story = parseTwee(doc)

// --- document structure --------------------------------------------------

test('twine: emits the two required Twee 3 special passages', () => {
  assert.ok(story.byName.StoryTitle, 'StoryTitle present')
  assert.strictEqual(story.byName.StoryTitle.body, ir.meta.title)
  assert.ok(story.byName.StoryData, 'StoryData present')
})

test('twine: StoryData is JSON naming Harlowe, its version, and the start passage', () => {
  const data = JSON.parse(story.byName.StoryData.body)
  assert.strictEqual(data.format, twine.TWINE_FORMAT.name)
  assert.strictEqual(data['format-version'], twine.TWINE_FORMAT.version)
  assert.strictEqual(data.start, ir.start)
  assert.ok(story.byName[data.start], 'start names a declared passage')
  assert.strictEqual(twine.TWINE_FORMAT.name, 'Harlowe')
  assert.strictEqual(twine.TWINE_FORMAT.version, '3.3.9')
})

test('twine: every IR passage and every IR link becomes a declared passage', () => {
  ir.passages.forEach(p => assert.ok(story.byName[p.id], 'passage ' + p.id + ' declared'))
  ir.links.forEach(l => assert.ok(story.byName[l.id], 'transition passage ' + l.id + ' declared'))
})

test('twine: every [[..->X]] target resolves to a declared passage', () => {
  let total = 0
  story.passages.forEach(p => {
    linksIn(p.body).forEach(l => {
      total++
      assert.ok(story.byName[l.target],
        'link in ' + p.name + ' points at undeclared passage "' + l.target + '"')
    })
  })
  // Every link contributes a Continue out of its transition passage; every
  // *choice* link additionally contributes the link into it. Random links do
  // not: a random passage dispatches with (go-to:), not markup.
  const choices = ir.links.filter(l => l.kind !== 'random').length
  assert.strictEqual(total, ir.links.length + choices)
})

test('twine: IR passage tags survive into the Twee header', () => {
  assert.deepStrictEqual(story.byName.P_hall.tags, ['room'])
  assert.deepStrictEqual(story.byName.P_vault.tags, ['ending', 'win'])
  assert.deepStrictEqual(story.byName.P_key.tags, ['key', 'item'])
})

test('twine: no passage body has an unbalanced [ or ]', () => {
  story.passages.forEach(p => {
    let depth = 0
    for (const ch of p.body) {
      if (ch === '[') depth++
      else if (ch === ']') depth--
      assert.ok(depth >= 0, p.name + ' closes a bracket it never opened')
    }
    assert.strictEqual(depth, 0, p.name + ' leaves ' + depth + ' bracket(s) open')
  })
})

// --- IFID ----------------------------------------------------------------

test('twine: the IFID is a well-formed uppercase v4-shaped UUID', () => {
  const ifid = JSON.parse(story.byName.StoryData.body).ifid
  assert.match(ifid, /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/)
})

test('twine: the IFID is stable across calls and derived only from meta.id + meta.seed', () => {
  const a = JSON.parse(parseTwee(twine.exportTwine(ir)).byName.StoryData.body).ifid
  const b = JSON.parse(parseTwee(twine.exportTwine(ir)).byName.StoryData.body).ifid
  assert.strictEqual(a, b, 'two exports of the same IR share an IFID')
  assert.strictEqual(a, twine.deriveIfid(ir.meta))
  assert.notStrictEqual(twine.deriveIfid({ id: ir.meta.id, seed: 43 }), a, 'a new seed is a new story')
  assert.notStrictEqual(twine.deriveIfid({ id: 'other', seed: ir.meta.seed }), a, 'a new example is a new story')
  // Theme, generator version and the rest of meta must not move the IFID.
  assert.strictEqual(twine.deriveIfid({ id: ir.meta.id, seed: ir.meta.seed, theme: 'noir' }), a)
})

test('twine: opts.ifid overrides the derived value', () => {
  const pinned = '11111111-2222-4333-8444-555555555555'
  const data = JSON.parse(parseTwee(twine.exportTwine(ir, { ifid: pinned })).byName.StoryData.body)
  assert.strictEqual(data.ifid, pinned)
})

test('twine: the whole document is byte-identical across calls', () => {
  assert.strictEqual(twine.exportTwine(ir), twine.exportTwine(ir))
})

// --- state ---------------------------------------------------------------

test('twine: every ir.vars entry is initialised in the startup passage', () => {
  const init = story.byName.StoryInit
  assert.ok(init, 'a startup passage exists')
  assert.deepStrictEqual(init.tags, ['startup'])
  ir.vars.forEach(v => {
    const literal = typeof v.init === 'boolean' ? String(v.init) : String(v.init)
    assert.ok(init.body.includes('(set: $' + v.name + ' to ' + literal + ')'),
      'var ' + v.name + ' initialised to ' + literal)
  })
  assert.ok(init.body.includes('(set: $hp to 100)'))
  assert.ok(init.body.includes('(set: $has_pair_1 to false)'))
})

test('twine: the exporter initialises its own seen/taken flags too', () => {
  // Harlowe errors on `not $x` for a variable that was never set, so an
  // uninitialised flag is a crash on the player's first visit, not a silent
  // fallback.
  const init = story.byName.StoryInit
  ir.passages.forEach(p => assert.ok(init.body.includes('(set: $seen_' + p.id + ' to false)'), p.id))
  ir.links.forEach(l => assert.ok(init.body.includes('(set: $taken_' + l.id + ' to false)'), l.id))
  assert.ok(init.body.includes('(set: $cycle_P_hall to 0)'), 'the variant cycle counter for P_hall')
})

test('twine: onEnter effects compile to Harlowe (set:)s in IR order', () => {
  const body = story.byName.P_hall.body
  assert.ok(body.includes('(set: $seen_hall to true)(set: $moves to it + 1)'))
})

test('twine: a negative add becomes a subtraction rather than "it + -n"', () => {
  assert.ok(story.byName.L_roll_hall.body.includes('(set: $hp to it - 20)'))
})

test('twine: acquire sets the item var, and prints takeText before doing so', () => {
  const body = story.byName.P_key.body
  const take = body.indexOf('You prise the key')
  const set = body.indexOf('(set: $has_pair_1 to true)')
  assert.ok(take > -1, 'takeText.first is printed')
  assert.ok(body.includes('You take up the key again.'), 'takeText.repeat is printed')
  assert.ok(set > take, 'the item var is set after the branch that reads it')
  assert.ok(body.indexOf('(if: not $has_pair_1)[') < take)
})

// --- first vs repeat -----------------------------------------------------

test('twine: a passage branches on its own $seen flag, and sets it after reading it', () => {
  const body = story.byName.P_door.body
  const test0 = body.indexOf('(if: not $seen_P_door)[')
  const set = body.indexOf('(set: $seen_P_door to true)')
  assert.ok(test0 > -1, 'the first/repeat branch is present')
  assert.ok(body.includes('A door of blackened oak'), 'text.first on the first arm')
  assert.ok(body.includes('](else:)['), 'an else arm')
  assert.ok(body.includes('The oak door again.'), 'text.repeat on the else arm')
  assert.ok(set > test0, 'the seen flag is set only after the branch has read it')
})

test('twine: a passage with variants round-robins them after the repeat text', () => {
  const body = story.byName.P_hall.body
  assert.ok(body.includes('(if: not $seen_P_hall)['))
  assert.ok(body.includes('(set: $cycle_P_hall to it + 1)'))
  // period = 1 repeat + 2 variants; residue 1 is the repeat, 2 the first
  // variant, 0 (the else) the second.
  assert.ok(body.includes('(if: $cycle_P_hall mod 3 is 1)['))
  assert.ok(body.includes('(else-if: $cycle_P_hall mod 3 is 2)['))
  const order = ['The same three leaks', 'The rain has not let up', 'Something has moved']
  let at = -1
  order.forEach(frag => {
    const i = body.indexOf(frag)
    assert.ok(i > at, 'variant "' + frag + '" appears in cycle order')
    at = i
  })
})

test('twine: a link branches on its own $taken flag for traversal narration', () => {
  const body = story.byName.L_door_vault.body
  assert.ok(body.includes('(if: not $taken_L_door_vault)['))
  assert.ok(body.includes('The wards line up.'), 'text.first')
  assert.ok(body.includes('Through the door, which stays open now.'), 'text.repeat')
  assert.ok(body.indexOf('(set: $taken_L_door_vault to true)') >
    body.indexOf('Through the door, which stays open now.'))
})

// --- gating --------------------------------------------------------------

test('twine: the locked link shows linkText when open and closedText when blocked', () => {
  const body = story.byName.P_door.body
  const open = '[[Turn the brass key in the wing-shaped lock->L_door_vault]]'
  const closed = 'The door will not move'
  assert.ok(body.includes('(if: $has_pair_1 is true)['), 'gated on the item var')
  assert.ok(body.includes(open), 'linkText renders on the open branch')
  assert.ok(body.includes(closed), 'closedText renders on the blocked branch')
  // The link must sit inside the (if:) hook and the closedText inside the
  // (else:) hook — swapping them would hand the player a free win.
  const ifAt = body.indexOf('(if: $has_pair_1 is true)[')
  const elseAt = body.indexOf('](else:)[', ifAt)
  assert.ok(ifAt < body.indexOf(open))
  assert.ok(body.indexOf(open) < elseAt, 'the link is on the open arm')
  assert.ok(elseAt < body.indexOf(closed), 'the closedText is on the blocked arm')
})

test('twine: whenBlocked "hide" emits no else arm at all', () => {
  // L_door_hall is hide + null closedText: the player must not learn the way
  // back exists before they have come that way.
  const body = story.byName.P_door.body
  const at = body.indexOf('(if: $took_e_hall_door is true)[')
  assert.ok(at > -1)
  const rest = body.slice(at)
  assert.ok(rest.includes('[[Go back up to the nave->L_door_hall]]'))
  assert.ok(!rest.includes('](else:)['), 'a hidden link has no else branch')
})

test('twine: whenBlocked "show" with no closedText greys the affordance instead', () => {
  // 'show' has to stay visibly different from 'hide': printing nothing here
  // would make the two settings indistinguishable in play.
  const one = tinyIr('P_a', 'P_b', 'Open the gate')
  one.vars = [{ name: 'has_key', kind: 'item', ref: null, init: false }]
  one.links[0].condition = { var: 'has_key', is: true }
  one.links[0].whenBlocked = 'show'
  const body = parseTwee(twine.exportTwine(one)).byName.P_a.body
  assert.ok(body.includes('(if: $has_key is true)['))
  assert.ok(body.includes('](else:)[\n(text-colour: gray)[Open the gate]'))
})

test('twine: a status chip renders as an italic line', () => {
  assert.ok(story.byName.P_key.body.includes('//Key (pair_1)//'))
})

test('twine: an unconditional link is plain markup with no (if:) around it', () => {
  const markup = '[[Go in through the chapel door->L_start_hall]]'
  const lines = story.byName.P_start.body.split('\n')
  // The link is a whole line to itself: anything else on it would be a gate.
  assert.ok(lines.includes(markup), 'the link stands alone on its line')
  assert.ok(!story.byName.P_start.body.includes('](else:)[\n' + markup))
})

// --- random --------------------------------------------------------------

test('twine: a random passage rolls a weighted table and go-tos the winner', () => {
  const body = story.byName.P_roll.body
  // Weights are 3 and 1, so the roll is over 1..4 and outcome one takes
  // 1..3 — three of the four integers.
  assert.ok(body.includes('(set: _r to (random: 1, 4))'), 'roll over the weight total')
  assert.ok(body.includes('(if: _r <= 3)[(go-to: "L_roll_hall")]'), 'weight 3 of 4')
  assert.ok(body.includes('(else:)[(go-to: "L_roll_death")]'), 'the last outcome is the else')
  assert.strictEqual(linksIn(body).length, 0, 'a random passage offers the player no choice')
})

test('twine: the random passage narration moves into its outcome passages', () => {
  // (go-to:) discards whatever the dispatcher printed, so P_roll's own text
  // has to be re-homed or it is never seen.
  assert.ok(!story.byName.P_roll.body.includes('You swing.'))
  assert.ok(story.byName.L_roll_hall.body.includes('You swing.'))
  assert.ok(story.byName.L_roll_death.body.includes('You swing.'))
  assert.ok(story.byName.L_roll_hall.body.includes('(if: not $seen_P_roll)['),
    'and the first/repeat branch comes with it')
})

test('twine: integerWeights scales fractional weights and reduces by the gcd', () => {
  assert.deepStrictEqual(twine.integerWeights([3, 1]), [3, 1])
  assert.deepStrictEqual(twine.integerWeights([2, 4, 6]), [1, 2, 3])
  assert.deepStrictEqual(twine.integerWeights([0.25, 0.25, 0.5]), [1, 1, 2])
  assert.deepStrictEqual(twine.integerWeights([0.1, 0.9]), [1, 9])
  // A weight too small to survive the scale is clamped to 1 rather than
  // dropped: the IR said the outcome was possible.
  assert.deepStrictEqual(twine.integerWeights([1e-9, 1]), [1, 1])
})

// --- endings -------------------------------------------------------------

test('twine: ending and death passages offer no links and close the story', () => {
  const win = story.byName.P_vault
  const death = story.byName.P_death
  assert.strictEqual(linksIn(win.body).length, 0)
  assert.strictEqual(linksIn(death.body).length, 0)
  assert.ok(win.body.includes("''THE END''"))
  assert.ok(death.body.includes("''YOU HAVE DIED''"))
  ir.endings.forEach(id => assert.ok(story.byName[id], 'ending ' + id + ' exists'))
})

// --- condition compiler --------------------------------------------------

test('twine: harloweCondition compiles the whole spec-8 condition language', () => {
  const c = twine.harloweCondition
  assert.strictEqual(c(null), null)
  assert.strictEqual(c({ var: 'has_key', is: true }), '$has_key is true')
  assert.strictEqual(c({ var: 'has_key', is: false }), '$has_key is false')
  assert.strictEqual(c({ var: 'hp', gt: 0 }), '$hp > 0')
  assert.strictEqual(c({ var: 'hp', gte: 1 }), '$hp >= 1')
  assert.strictEqual(c({ var: 'hp', lt: 10 }), '$hp < 10')
  assert.strictEqual(c({ var: 'hp', lte: 10 }), '$hp <= 10')
  assert.strictEqual(c({ var: 'moves', eq: 3 }), '$moves is 3')
  assert.strictEqual(c({ var: 'moves', ne: 3 }), '$moves is not 3')
  assert.strictEqual(c({ var: 'who', eq: 'sexton' }), '$who is "sexton"')
})

test('twine: harloweCondition nests all/any/not with explicit grouping', () => {
  const c = twine.harloweCondition
  assert.strictEqual(c({ all: [{ var: 'a', is: true }] }), '$a is true')
  assert.strictEqual(
    c({ all: [{ var: 'a', is: true }, { var: 'hp', gt: 0 }] }),
    '($a is true) and ($hp > 0)')
  assert.strictEqual(
    c({ any: [{ var: 'a', is: true }, { var: 'b', is: true }] }),
    '($a is true) or ($b is true)')
  assert.strictEqual(c({ not: { var: 'a', is: true } }), 'not ($a is true)')
  assert.strictEqual(
    c({ all: [{ not: { var: 'a', is: true } }, { any: [{ var: 'b', is: true }, { var: 'c', is: true }] }] }),
    '(not ($a is true)) and (($b is true) or ($c is true))')
  // Degenerate combinators: "all of nothing" holds, "one of nothing" cannot.
  assert.strictEqual(c({ all: [] }), 'true')
  assert.strictEqual(c({ any: [] }), 'false')
})

test('twine: harloweCondition rejects a leaf with no comparator', () => {
  assert.throws(() => twine.harloweCondition({ var: 'hp' }), /no comparator/)
  assert.throws(() => twine.harloweCondition({ nope: 1 }), /unrecognised condition/)
})

// --- effect compiler -----------------------------------------------------

test('twine: harloweEffect compiles set / add / acquire', () => {
  const e = twine.harloweEffect
  assert.strictEqual(e({ op: 'set', var: 'seen_x', value: true }), '(set: $seen_x to true)')
  assert.strictEqual(e({ op: 'set', var: 'who', value: 'sexton' }), '(set: $who to "sexton")')
  assert.strictEqual(e({ op: 'add', var: 'moves', value: 1 }), '(set: $moves to it + 1)')
  assert.strictEqual(e({ op: 'add', var: 'hp', value: -20 }), '(set: $hp to it - 20)')
  assert.strictEqual(e({ op: 'acquire', item: 'pair_1' }, { pair_1: 'has_pair_1' }),
    '(set: $has_pair_1 to true)')
  assert.throws(() => e({ op: 'teleport', var: 'x' }), /unsupported effect op/)
  assert.throws(() => e({ op: 'acquire', item: 'ghost' }, {}), /unknown item/)
})

// --- escaping ------------------------------------------------------------

test('twine: display text loses exactly the characters that would break a link', () => {
  const s = twine.sanitizeDisplayText
  // ']' would close the link early; '[' would open a hook; '|' would
  // retarget it; '<' and '>' would form the other arrow.
  assert.strictEqual(s('Open the [strange] door'), 'Open the strange door')
  assert.strictEqual(s('Go north|P_cheat'), 'Go northP_cheat')
  assert.strictEqual(s('Push it -> hard'), 'Push it - hard')
  assert.strictEqual(s('Read <b>the sign</b>'), 'Read bthe sign/b')
  // A lone hyphen survives, because no arrow can be formed without the
  // angle bracket that was just removed.
  assert.strictEqual(s('The wing-shaped lock'), 'The wing-shaped lock')
  assert.strictEqual(s('  ragged\n  text  '), 'ragged text')
})

// The smallest IR that validateStoryIR accepts: one start, one ending, one
// link between them. Ids are parameterised so a test can force a name clash.
function tinyIr (aId, bId, linkText, vars) {
  return {
    irVersion: 1,
    meta: { title: 'T', id: 'x', seed: 1 },
    vars: vars || [],
    items: [],
    start: aId,
    endings: [bId],
    passages: [
      { id: aId, hostId: '1', nodeId: null, type: 'start', role: 'start', title: 'A', text: { first: 'a' }, status: null, onEnter: [], links: ['L_a'], tags: [] },
      { id: bId, hostId: '2', nodeId: null, type: 'win', role: 'ending', title: 'B', text: { first: 'b' }, status: null, onEnter: [], links: [], tags: [] }
    ],
    links: [{ id: 'L_a', edgeId: null, from: aId, to: bId, type: 'path', kind: 'choice', weight: 1, linkText: { first: linkText }, text: { first: 'go' }, closedText: null, condition: null, whenBlocked: 'show', onTraverse: [] }]
  }
}

test('twine: a link whose display text sanitizes to nothing still gets a label', () => {
  const parsed = parseTwee(twine.exportTwine(tinyIr('P_a', 'P_b', '[]')))
  assert.ok(parsed.byName.P_a.body.includes('[[Continue->L_a]]'))
})

test('twine: prose escaping defuses Twee headers, HTML and variable sigils', () => {
  const e = twine.escapeProse
  assert.strictEqual(e(':: not a passage'), '\\:: not a passage')
  assert.strictEqual(e('a\n:: nor this'), 'a\n\\:: nor this')
  assert.strictEqual(e('costs $gold today'), 'costs &#36;gold today')
  assert.strictEqual(e('costs $5 today'), 'costs $5 today', 'a bare $ before a digit is harmless')
  assert.strictEqual(e('a <b> c'), 'a &lt;b> c')
  assert.strictEqual(e('Salt & Ash'), 'Salt &amp; Ash')
  assert.strictEqual(e('a [hook] here'), 'a (hook) here')
})

// --- guards --------------------------------------------------------------

test('twine: a story variable that would shadow an exporter flag is a build error', () => {
  // Passage ids may be lowercase (spec 5), so `hall` plus a var named
  // `seen_hall` collides with the exporter's own $seen_hall flag. Silently
  // aliasing them would destroy the first/repeat distinction for that
  // passage, so it has to fail the build instead.
  const clash = tinyIr('hall', 'P_b', 'go', [{ name: 'seen_hall', kind: 'visited', ref: 'hall', init: false }])
  assert.throws(() => twine.exportTwine(clash), /variable name collision/)
})

test('twine: an IR that claims the startup passage name is a build error', () => {
  const clash = JSON.parse(JSON.stringify(ir))
  clash.passages[0].id = 'StoryInit'
  assert.throws(() => twine.exportTwine(clash), /StoryInit/)
})

test('twine: exporting a non-IR throws rather than emitting a broken story', () => {
  assert.throws(() => twine.exportTwine(null), /not a Story IR/)
  assert.throws(() => twine.exportTwine({ meta: {} }), /not a Story IR/)
})
