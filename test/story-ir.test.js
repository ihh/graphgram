// Story IR tests: the golden fixture must validate, each of the spec's ten
// failure classes must be caught, and a real generated dungeon must survive
// the round trip from graphlib to IR to JSON and back.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const { Grammar } = require('./helpers')
const dp = require('../dungeon-primitives')
const { buildStoryIR, validateStoryIR, normalizeText, IR_VERSION } = require('../story-ir')

const FIXTURE_PATH = path.join(__dirname, 'fixtures', 'story-ir.sample.json')
const FIXTURE = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'))

// Every broken-clone test mutates a deep copy, so one test cannot poison
// the next through a shared subobject.
function clone () {
  return JSON.parse(JSON.stringify(FIXTURE))
}

// Assert that `errs` contains at least one message for the given failure
// class, and report the whole list when it does not — a validator that
// caught nothing and a validator that caught the wrong thing are very
// different bugs.
function assertCaught (errs, re, what) {
  assert.ok(
    errs.some(function (e) { return re.test(e) }),
    what + ': expected an error matching ' + re + ', got ' + JSON.stringify(errs)
  )
}

// --- the golden fixture -------------------------------------------------

test('story-ir: the golden fixture validates with zero errors', () => {
  assert.deepStrictEqual(validateStoryIR(FIXTURE), [])
})

test('story-ir: the golden fixture is at the current IR version', () => {
  assert.strictEqual(FIXTURE.irVersion, IR_VERSION)
})

// --- spec section 10, one test per failure class ------------------------

test('validateStoryIR: (1) a passage listing a link that does not exist', () => {
  const ir = clone()
  ir.passages[0].links = ['L_does_not_exist']
  assertCaught(validateStoryIR(ir), /^links: .*unknown link/, 'class 1')
})

test('validateStoryIR: (2) a link whose from/to is not a passage', () => {
  const ir = clone()
  ir.links[0].to = 'P_nowhere'
  assertCaught(validateStoryIR(ir), /^endpoint: .*is not a passage/, 'class 2')
})

test('validateStoryIR: (3) start and endings must name real passages', () => {
  const bad = clone()
  bad.start = 'P_nowhere'
  assertCaught(validateStoryIR(bad), /^start: .*is not a passage/, 'class 3 start')

  const badEnd = clone()
  badEnd.endings.push('P_nowhere')
  assertCaught(validateStoryIR(badEnd), /^endings: .*is not a passage/, 'class 3 endings')
})

test('validateStoryIR: (4) a passage unreachable from start', () => {
  const ir = clone()
  // A well-formed orphan: nothing links to it, but it is otherwise legal,
  // so reachability is the only class this clone can trip.
  ir.passages.push({
    id: 'P_orphan',
    hostId: '99',
    nodeId: 'orphan',
    type: 'room',
    role: 'ending',
    title: 'Nowhere',
    text: { first: 'A room no corridor reaches.' },
    status: null,
    onEnter: [],
    links: [],
    tags: ['room']
  })
  assertCaught(validateStoryIR(ir), /^reachability: passage P_orphan/, 'class 4')
})

test('validateStoryIR: (5) a sink that is neither an ending nor a death', () => {
  const ir = clone()
  ir.passages.find(function (p) { return p.id === 'P_vault' }).role = 'normal'
  assertCaught(validateStoryIR(ir), /^sink: passage P_vault/, 'class 5')
})

test('validateStoryIR: (6) an effect or condition on an undeclared var', () => {
  const fromEffect = clone()
  fromEffect.passages.find(function (p) { return p.id === 'P_hall' }).onEnter[0].var = 'seen_nowhere'
  assertCaught(validateStoryIR(fromEffect), /^var: undeclared variable "seen_nowhere"/, 'class 6 effect')

  const fromCondition = clone()
  fromCondition.links.find(function (l) { return l.id === 'L_door_vault' })
    .condition = { all: [{ var: 'has_nothing', is: true }] }
  assertCaught(validateStoryIR(fromCondition), /^var: undeclared variable "has_nothing"/, 'class 6 condition')
})

test('validateStoryIR: (7) an item whose var is not declared', () => {
  const ir = clone()
  ir.items[0].var = 'has_nothing'
  assertCaught(validateStoryIR(ir), /^item: item "pair_1" var .*is not declared/, 'class 7')
})

test('validateStoryIR: (8) ids must be unique and inside the safe charset', () => {
  const dup = clone()
  dup.passages[2].id = dup.passages[1].id
  assertCaught(validateStoryIR(dup), /^id: duplicate passage id/, 'class 8 duplicate')

  const badChars = clone()
  badChars.links[0].id = '9 bad-id'
  assertCaught(validateStoryIR(badChars), /^id: link\[0\] id .*is not/, 'class 8 charset')

  const badVar = clone()
  badVar.vars[0].name = 'HP'
  assertCaught(validateStoryIR(badVar), /^id: vars\[0\] name "HP" is not/, 'class 8 var charset')

  const reserved = clone()
  reserved.vars.push({ name: 'goto', kind: 'number', ref: null, init: 0 })
  assertCaught(validateStoryIR(reserved), /^id: var name "goto" is a reserved word/, 'class 8 reserved')
})

test('validateStoryIR: (9) a "dag" promise over a cyclic link graph', () => {
  const ir = clone()
  // The fixture is bidirectional on purpose (P_hall and P_key link both
  // ways), so relabelling it is enough to make the promise false.
  ir.meta.topology = 'dag'
  assertCaught(validateStoryIR(ir), /^topology: .*has a cycle/, 'class 9')
})

test('validateStoryIR: (10) a random passage with a non-random or zero-weight exit', () => {
  const wrongKind = clone()
  wrongKind.links.find(function (l) { return l.id === 'L_roll_hall' }).kind = 'choice'
  assertCaught(validateStoryIR(wrongKind), /^random: passage P_roll .*has kind "choice"/, 'class 10 kind')

  const wrongWeight = clone()
  wrongWeight.links.find(function (l) { return l.id === 'L_roll_death' }).weight = 0
  assertCaught(validateStoryIR(wrongWeight), /^random: passage P_roll .*positive weight/, 'class 10 weight')
})

test('validateStoryIR: rejects a non-object and a wrong irVersion', () => {
  assert.deepStrictEqual(validateStoryIR(null), ['ir: expected an object'])
  const ir = clone()
  ir.irVersion = 99
  assertCaught(validateStoryIR(ir), /^irVersion:/, 'version')
})

// --- normalizeText ------------------------------------------------------

test('normalizeText: string, object and null', () => {
  assert.deepStrictEqual(normalizeText('a door'), { first: 'a door' })
  assert.deepStrictEqual(normalizeText(''), { first: '' })
  assert.deepStrictEqual(
    normalizeText({ first: 'one', repeat: 'again', brief: 'br' }),
    { first: 'one', repeat: 'again', brief: 'br' }
  )
  assert.strictEqual(normalizeText(null), null)
  assert.strictEqual(normalizeText(undefined), null)
  // `first` is the one required field, so an object without it still gets
  // one rather than making every exporter null-check.
  assert.strictEqual(normalizeText({ brief: 'br' }).first, '')
  // Unknown keys survive, so the spec's future `conditions` array can land
  // without a change here.
  assert.strictEqual(normalizeText({ first: 'x', conditions: [1] }).conditions[0], 1)
})

// --- buildStoryIR over a real generated dungeon -------------------------

// A grammar chosen to exercise every branch of the mapping: rooms and dead
// ends (normal), a key/door pair (item + a pairId-locked link), a potion
// (an hp effect on entry), backtracks (traversed gates), and a monster
// battle (choice and random roles, consequence links, a death sink).
function dungeonGrammar () {
  return new Grammar({
    name: 'story-ir-test-dungeon',
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      {
        name: 'expand',
        limit: 8,
        rules: [
          dp.midpointRoom({ weight: 3 }),
          dp.deadEnd({ weight: 1 }),
          dp.parallelPath({ weight: 2 }),
          dp.keyDoor({ weight: 3, limit: 1 }),
          dp.healthPotion({ weight: 1, limit: 1 })
        ]
      },
      { name: 'refine', rules: dp.refineEdges(dp.EDGE_PATH, [dp.EDGE_PASSAGE, dp.EDGE_MONSTER]) },
      { name: 'flavor', rules: [dp.monsterBattle({ weight: 1 })] },
      dp.dotDecorationStage()
    ]
  })
}

const BUILD_OPTS = { id: 'story-ir-test', seed: 1, theme: 'high_fantasy', grammar: 'test/story-ir.test.js' }

function buildAtSeed (seed) {
  const graph = dungeonGrammar().evolve({ seed: seed }).graph
  return buildStoryIR(graph, Object.assign({}, BUILD_OPTS, { seed: seed }))
}

test('buildStoryIR: a generated dungeon produces a valid IR', () => {
  const ir = buildAtSeed(1)
  assert.deepStrictEqual(validateStoryIR(ir), [])
  assert.strictEqual(ir.irVersion, IR_VERSION)
  assert.ok(ir.passages.length > 5, 'a non-trivial dungeon')
  assert.ok(ir.links.length > ir.passages.length, 'more links than passages')
  // The grammar above always plants exactly one keyDoor.
  assert.strictEqual(ir.items.length, 1)
  assert.ok(/^has_/.test(ir.items[0].var))
})

test('buildStoryIR: exactly one start passage, and it is meta.start', () => {
  const ir = buildAtSeed(1)
  const starts = ir.passages.filter(function (p) { return p.role === 'start' })
  assert.strictEqual(starts.length, 1)
  assert.strictEqual(ir.start, starts[0].id)
  assert.strictEqual(ir.passages[0].id, ir.start, 'BFS order puts start first')
})

test('buildStoryIR: every passage is reachable from start', () => {
  const ir = buildAtSeed(1)
  const succ = {}
  ir.links.forEach(function (l) { (succ[l.from] = succ[l.from] || []).push(l.to) })
  const seen = { [ir.start]: true }
  const queue = [ir.start]
  while (queue.length) {
    const v = queue.shift()
    ;(succ[v] || []).forEach(function (w) {
      if (!seen[w]) { seen[w] = true; queue.push(w) }
    })
  }
  assert.strictEqual(Object.keys(seen).length, ir.passages.length)
})

test('buildStoryIR: the IR round-trips through JSON.stringify unchanged', () => {
  const ir = buildAtSeed(1)
  const json = JSON.stringify(ir)
  assert.strictEqual(JSON.stringify(JSON.parse(json)), json)
})

test('buildStoryIR: two builds at the same seed are byte-identical', () => {
  assert.strictEqual(JSON.stringify(buildAtSeed(1)), JSON.stringify(buildAtSeed(1)))
  assert.strictEqual(JSON.stringify(buildAtSeed(7)), JSON.stringify(buildAtSeed(7)))
  assert.notStrictEqual(JSON.stringify(buildAtSeed(1)), JSON.stringify(buildAtSeed(7)))
})

test('buildStoryIR: derived meta when opts is silent', () => {
  const graph = dungeonGrammar().evolve({ seed: 1 }).graph
  const ir = buildStoryIR(graph, { seed: 1 })
  // Theme from the seed, title from the theme plus a seed-derived word,
  // id slugged from the title.
  assert.strictEqual(ir.meta.theme, require('../themes').pickTheme(1))
  assert.ok(/^The \w+ \w+$/.test(ir.meta.title), 'derived title, got ' + ir.meta.title)
  assert.strictEqual(ir.meta.id, ir.meta.title.toLowerCase().replace(/\s+/g, '-'))
  // Measured, not asserted: this dungeon has backtracks, so it has cycles,
  // and it has a locked door, so it has puzzles.
  assert.strictEqual(ir.meta.topology, 'bidirectional')
  assert.strictEqual(ir.meta.puzzles, true)
  assert.match(ir.meta.generator, /^graphgram \d/)
  assert.strictEqual(ir.meta.budget, null)
  // Reproducibility contract: no wall-clock anything in meta.
  assert.ok(!('timestamp' in ir.meta) && !('date' in ir.meta))
})

// --- the mapping itself, on a hand-built keyDoor fragment ---------------

// The graph the docs/spec/graph-to-ir.md worked example is drawn from:
// one keyDoor application in isolation, with every label field the mapping
// table reads actually present.
function keyDoorFragment () {
  const graphlib = require('graphlib')
  const g = new graphlib.Graph()
  g.setNode('1', { type: 'start', nodeId: 'start', text: 'Rain, and a chapel door ajar.' })
  g.setNode('3', { type: 'key', nodeId: 'key_1', pairId: 'pair_1', text: 'A key, still warm.' })
  g.setNode('5', { type: 'door', nodeId: 'door_1', pairId: 'pair_1', text: 'A door of blackened oak, banded in iron.' })
  g.setNode('7', { type: 'win', nodeId: 'win', text: 'Ledgers, in one hand throughout.' })
  g.setEdge('1', '3', { type: 'passage', edgeId: 'e_ak_1', before: 'A stair falls away.', link: 'Take the stair down' })
  g.setEdge('3', '1', { type: 'backtrack', prereq: { traversed: 'e_ak_1' } })
  g.setEdge('1', '5', { type: 'passage', edgeId: 'e_ad_1', link: 'Walk to the oak door' })
  g.setEdge('5', '1', { type: 'backtrack', prereq: { traversed: 'e_ad_1' } })
  g.setEdge('5', '7', {
    type: 'passage',
    edgeId: 'e_db_1',
    link: 'Turn the key in the lock',
    prereq: { pairId: 'pair_1', link: 'Turn the key in the lock', after: 'The wards line up.' }
  })
  return g
}

test('buildStoryIR: keyDoor fragment maps to the documented IR', () => {
  const ir = buildStoryIR(keyDoorFragment(), { id: 'keydoor', seed: 42, theme: 'gothic_horror' })
  assert.deepStrictEqual(validateStoryIR(ir), [])

  const byId = {}
  ir.passages.forEach(function (p) { byId[p.id] = p })
  const links = {}
  ir.links.forEach(function (l) { links[l.id] = l })

  // Roles: key becomes an item, win becomes an ending, door stays normal.
  assert.strictEqual(byId.P_start.role, 'start')
  assert.strictEqual(byId.P_key_1.role, 'item')
  assert.strictEqual(byId.P_door_1.role, 'normal')
  assert.strictEqual(byId.P_win.role, 'ending')
  assert.deepStrictEqual(ir.endings, ['P_win'])

  // onEnter: seen flag always, plus the acquire on the key node.
  assert.deepStrictEqual(byId.P_door_1.onEnter, [{ op: 'set', var: 'seen_door_1', value: true }])
  assert.deepStrictEqual(byId.P_key_1.onEnter, [
    { op: 'set', var: 'seen_key_1', value: true },
    { op: 'acquire', item: 'pair_1' }
  ])
  assert.strictEqual(byId.P_key_1.status, 'Key (pair_1)')

  // The locked crossing: condition on the item var, closedText taken from
  // the door node itself, and the lock advertised rather than hidden.
  const locked = links.L_e_db_1
  assert.deepStrictEqual(locked.condition, { all: [{ var: 'has_pair_1', is: true }] })
  assert.strictEqual(locked.closedText.first, 'A door of blackened oak, banded in iron.')
  assert.strictEqual(locked.whenBlocked, 'show')
  assert.strictEqual(locked.linkText.first, 'Turn the key in the lock')
  assert.strictEqual(locked.text.first, 'The wards line up.')
  assert.deepStrictEqual(locked.onTraverse, [
    { op: 'set', var: 'took_e_db_1', value: true },
    { op: 'add', var: 'moves', value: 1 }
  ])

  // A backtrack gate is hidden, not greyed out.
  const back = ir.links.find(function (l) { return l.from === 'P_key_1' && l.to === 'P_start' })
  assert.deepStrictEqual(back.condition, { all: [{ var: 'took_e_ak_1', is: true }] })
  assert.strictEqual(back.whenBlocked, 'hide')
  assert.strictEqual(back.closedText, null)
  assert.strictEqual(back.id, 'L_3_1', 'edgeId-free links fall back to host ids')
  assert.strictEqual(back.linkText.first, 'Go back', 'a choice link is never captionless')

  // before + prereq.after concatenate into the traversal narration.
  assert.strictEqual(links.L_e_ak_1.text.first, 'A stair falls away.')

  // Items carry a noun phrase with its article, for Inform 7.
  assert.strictEqual(ir.items.length, 1)
  assert.match(ir.items[0].name, /^the .+ key$/)
  assert.strictEqual(ir.items[0].description.first, 'A key, still warm.')
})

test('buildStoryIR: a two-node graph with no cycles is a dag', () => {
  const graphlib = require('graphlib')
  const g = new graphlib.Graph()
  g.setNode('1', { type: 'start', nodeId: 'start', text: 'Begin.' })
  g.setNode('2', { type: 'win', nodeId: 'win', text: 'End.' })
  g.setEdge('1', '2', { type: 'passage', edgeId: 'e_1' })
  const ir = buildStoryIR(g, { seed: 0 })
  assert.strictEqual(ir.meta.topology, 'dag')
  assert.strictEqual(ir.meta.puzzles, false)
  assert.deepStrictEqual(validateStoryIR(ir), [])
})

// --- presentation order -------------------------------------------------

test('buildStoryIR: forward links first, locked next, go-backs last', () => {
  const graphlib = require('graphlib')
  const g = new graphlib.Graph()
  g.setNode('1', { type: 'start', nodeId: 'start', text: 'Begin.' })
  g.setNode('2', { type: 'room', nodeId: 'hub', text: 'A hub.' })
  g.setNode('3', { type: 'room', nodeId: 'onward', text: 'Onward.' })
  g.setNode('4', { type: 'door', nodeId: 'gate', pairId: 'pair_1', text: 'A gate.' })
  g.setNode('5', { type: 'win', nodeId: 'win', text: 'End.' })
  g.setEdge('1', '2', { type: 'passage', edgeId: 'e_in' })
  // Deliberately inserted go-back-first, so a passing test means the sort
  // ran rather than that insertion order happened to be right.
  g.setEdge('2', '1', { type: 'backtrack', prereq: { traversed: 'e_in' } })
  g.setEdge('2', '4', { type: 'passage', edgeId: 'e_gate', prereq: { pairId: 'pair_1' } })
  g.setEdge('2', '3', { type: 'passage', edgeId: 'e_on' })
  g.setEdge('3', '5', { type: 'passage', edgeId: 'e_win' })
  g.setEdge('4', '5', { type: 'passage', edgeId: 'e_gate_win' })
  const ir = buildStoryIR(g, { seed: 0 })
  const hub = ir.passages.find(function (p) { return p.id === 'P_hub' })
  assert.deepStrictEqual(hub.links, ['L_e_on', 'L_e_gate', 'L_2_1'])
})

// --- name safety --------------------------------------------------------

test('buildStoryIR: sanitizes hostile ids and disambiguates collisions', () => {
  const graphlib = require('graphlib')
  const g = new graphlib.Graph()
  g.setNode('1', { type: 'start', nodeId: 'Room One!', text: 'Begin.' })
  // Sanitizes to the same string as 'Room One!' — the two must not share a
  // passage id or a `seen_` flag, or entering one would mark both.
  g.setNode('2', { type: 'room', nodeId: 'room-one', text: 'A twin.' })
  // A ChoiceScript command as a nodeId. The `seen_` prefix already makes it
  // safe, so this mostly proves the sanitizer does not mangle a good name.
  g.setNode('3', { type: 'win', nodeId: 'goto', text: 'End.' })
  g.setEdge('1', '2', { type: 'passage', edgeId: 'e 1' })
  g.setEdge('2', '3', { type: 'passage', edgeId: 'e 1' })
  const ir = buildStoryIR(g, { seed: 0 })
  assert.deepStrictEqual(validateStoryIR(ir), [])

  const ids = ir.passages.map(function (p) { return p.id })
  assert.deepStrictEqual(ids, ['P_room_one', 'P_room_one_2', 'P_goto'])
  const names = ir.vars.map(function (v) { return v.name })
  assert.deepStrictEqual(names.filter(function (n) { return /^seen_/.test(n) }),
    ['seen_room_one', 'seen_room_one_2', 'seen_goto'])
  // One shared edgeId means one shared `took_` flag but two distinct link
  // ids, because a link id addresses an edge and a flag addresses a gate.
  assert.deepStrictEqual(ir.links.map(function (l) { return l.id }), ['L_e_1', 'L_e_1_2'])
  assert.strictEqual(names.filter(function (n) { return /^took_/.test(n) }).length, 1)
})

test('buildStoryIR: rejects anything that is not a graphlib Graph', () => {
  assert.throws(function () { buildStoryIR(null) }, /expected a graphlib Graph/)
  assert.throws(function () { buildStoryIR({}) }, /expected a graphlib Graph/)
})
