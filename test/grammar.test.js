// End-to-end tests: build grammars from the dungeon primitives, run them at
// fixed seeds, and assert structural invariants on the output graph.

const test = require('node:test')
const assert = require('node:assert')
const { Grammar } = require('../index')
const dp = require('../dungeon-primitives')

function runDungeon (seed, expandLimit) {
  const g = new Grammar({
    name: 'test-dungeon',
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      {
        name: 'expand',
        limit: expandLimit == null ? 10 : expandLimit,
        rules: [
          dp.midpointRoom({ weight: 2 }),
          dp.deadEnd({ weight: 1 }),
          dp.parallelPath({ weight: 1 }),
          dp.keyDoor({ weight: 1, limit: 3 })
        ]
      },
      {
        name: 'refine',
        rules: dp.refineEdges(dp.EDGE_PATH,
          [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE],
          { weight: 1 })
      }
    ]
  })
  return g.evolve({ seed }).graph
}

test('grammar: init-only produces start-->win', () => {
  const g = new Grammar({
    start: 'START',
    stages: [dp.initStartGoalStage()]
  })
  const graph = g.evolve({ seed: 1 }).graph
  assert.strictEqual(graph.nodes().length, 2)
  const types = graph.nodes().map(n => graph.node(n).type).sort()
  assert.deepStrictEqual(types, [dp.NODE_START, dp.NODE_WIN])
  assert.strictEqual(graph.edges().length, 1)
})

test('grammar: two-way midpoint is bidirectionally traversable and refuses to make win a source', () => {
  const graphlib = require('graphlib')
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: 'room' })
  seeded.setNode('B', { type: 'room' })
  seeded.setEdge('A', 'B', { type: 'path' })
  const g = new Grammar({
    start: 'START',
    rules: [dp.midpointRoom()],
    limit: 1
  })
  const out = g.evolve({ seed: 1, graph: seeded }).graph
  // A -> m -> B PLUS B -> m -> A. 3 nodes, 4 edges.
  assert.strictEqual(out.nodes().length, 3)
  assert.strictEqual(out.edges().length, 4)
  // Each edge is either type=path (forward) or type=backtrack (return). Count
  // them — we expect exactly 2 of each. Return edges stay type=backtrack so
  // the refine stage doesn't turn them into monster / puzzle / passage.
  const byType = { path: 0, backtrack: 0 }
  out.edges().forEach(e => { byType[out.edge(e).type] = (byType[out.edge(e).type] || 0) + 1 })
  assert.strictEqual(byType.path, 2, 'two forward path edges')
  assert.strictEqual(byType.backtrack, 2, 'two return backtrack edges')
})

test('grammar: two-way midpoint will not fire on an edge targeting win', () => {
  // With only a start->win edge to match, the $not:{type:win} guard blocks
  // the rule entirely — b would have to be win.
  const g = new Grammar({
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      { name: 'expand', limit: 5, rules: [dp.midpointRoom()] }
    ]
  })
  const graph = g.evolve({ seed: 1 }).graph
  assert.strictEqual(graph.nodes().length, 2, 'rule did not fire')
  assert.strictEqual(graph.edges().length, 1)
})

test('grammar: one-way midpoint only fires when b already has a direct back-edge to a', () => {
  const graphlib = require('graphlib')
  // Seed a graph with a cycle — a -> b AND b -> a — so the one-way rule's
  // condition is satisfied.
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: 'room' })
  seeded.setNode('B', { type: 'room' })
  seeded.setEdge('A', 'B', { type: 'path' })
  seeded.setEdge('B', 'A', { type: 'path' })
  const g = new Grammar({
    start: 'START',
    rules: [dp.midpointRoom({ oneWay: true })],
    limit: 1
  })
  const out = g.evolve({ seed: 1, graph: seeded }).graph
  // Midpoint fires; one-way so only 2 new edges replace the A->B edge.
  // Expected: 3 nodes, edges = {B->A, A->m, m->B} = 3.
  assert.strictEqual(out.nodes().length, 3)
  assert.strictEqual(out.edges().length, 3)
})

test('grammar: one-way midpoint refuses an edge with no back-edge', () => {
  const graphlib = require('graphlib')
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: 'room' })
  seeded.setNode('B', { type: 'room' })
  seeded.setEdge('A', 'B', { type: 'path' })  // no B->A
  const g = new Grammar({
    start: 'START',
    rules: [dp.midpointRoom({ oneWay: true })],
    limit: 5
  })
  const out = g.evolve({ seed: 1, graph: seeded }).graph
  // Rule never fires — condition fails. Graph is unchanged.
  assert.strictEqual(out.nodes().length, 2)
  assert.strictEqual(out.edges().length, 1)
})

test('grammar: dead-end leaves original edge intact and adds a backtrack', () => {
  const g = new Grammar({
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      { name: 'expand', limit: 1, rules: [dp.deadEnd()] }
    ]
  })
  const graph = g.evolve({ seed: 1 }).graph
  // Init yields start->win. deadEnd adds a dead_end node, a forward edge
  // from start, and an explicit backtrack edge from the dead_end back.
  assert.strictEqual(graph.nodes().length, 3)
  assert.strictEqual(graph.edges().length, 3)
  const types = graph.nodes().map(n => graph.node(n).type).sort()
  assert.deepStrictEqual(types, [dp.NODE_DEAD_END, dp.NODE_START, dp.NODE_WIN])

  // Find the dead_end node and verify it has an outgoing backtrack edge.
  const dead = graph.nodes().find(n => (graph.node(n) || {}).type === dp.NODE_DEAD_END)
  const outgoing = (graph.successors(dead) || []).map(s => ({
    to: s, label: graph.edge(dead, s)
  }))
  const back = outgoing.find(o => o.label && o.label.type === dp.EDGE_BACKTRACK)
  assert.ok(back, 'dead-end has a backtrack edge')
  assert.strictEqual((graph.node(back.to) || {}).type, dp.NODE_START, 'backtracks to parent')
})

test('grammar: dead-end with noBacktrack keeps the one-way behavior', () => {
  const g = new Grammar({
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      { name: 'expand', limit: 1, rules: [dp.deadEnd({ noBacktrack: true })] }
    ]
  })
  const graph = g.evolve({ seed: 1 }).graph
  assert.strictEqual(graph.edges().length, 2)
})

test('grammar: keyDoor produces key/door with matching pairId, locked edge, and both door backtracks', () => {
  // Seed a non-win target so the $not:{type:win} guard doesn't block.
  const graphlib = require('graphlib')
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: 'room' })
  seeded.setNode('B', { type: 'room' })
  seeded.setEdge('A', 'B', { type: 'path' })
  const g = new Grammar({
    start: 'START',
    rules: [dp.keyDoor({ limit: 1 })],
    limit: 1
  })
  const graph = g.evolve({ seed: 1, graph: seeded }).graph

  const keyNodes = graph.nodes().filter(n => (graph.node(n) || {}).type === dp.NODE_KEY)
  const doorNodes = graph.nodes().filter(n => (graph.node(n) || {}).type === dp.NODE_DOOR)
  assert.strictEqual(keyNodes.length, 1, 'one key')
  assert.strictEqual(doorNodes.length, 1, 'one door')

  const key = graph.node(keyNodes[0])
  const door = graph.node(doorNodes[0])
  assert.ok(key.pairId, 'key has a pairId')
  assert.strictEqual(key.pairId, door.pairId, 'key and door share pairId')

  // Exactly one locked edge (prereq.pairId === key.pairId).
  const locked = graph.edges()
    .map(e => ({ e, label: graph.edge(e) }))
    .filter(x => x.label && x.label.prereq && x.label.prereq.pairId === key.pairId)
  assert.strictEqual(locked.length, 1, 'exactly one locked edge sharing pairId')

  // The door node should have a backtrack edge to its parent (d -> a), and
  // the post-door node should have a backtrack to the door (b -> d). Both
  // make the door navigable in CYOA mode once the player has the key.
  const d = doorNodes[0]
  const dOut = (graph.successors(d) || []).map(s => graph.edge(d, s))
  const dBacktracks = dOut.filter(l => l && l.type === dp.EDGE_BACKTRACK)
  assert.strictEqual(dBacktracks.length, 1, 'd -> a backtrack exists')

  const dIn = (graph.predecessors(d) || []).map(p => graph.edge(p, d))
  const dIncomingBack = dIn.filter(l => l && l.type === dp.EDGE_BACKTRACK)
  assert.strictEqual(dIncomingBack.length, 1, 'b -> d backtrack exists')
})

test('grammar: repeated keyDoor apps issue distinct pairIds', () => {
  // midpointRoom runs first (two-way, so it will NOT fire on the start->win
  // init edge because win is target); we pre-seed with a chain that has
  // non-win targets so keyDoor can fire multiple times.
  const graphlib = require('graphlib')
  const seeded = new graphlib.Graph()
  for (const id of ['A', 'B', 'C', 'D']) seeded.setNode(id, { type: 'room' })
  seeded.setEdge('A', 'B', { type: 'path' })
  seeded.setEdge('B', 'C', { type: 'path' })
  seeded.setEdge('C', 'D', { type: 'path' })
  const g = new Grammar({
    start: 'START',
    rules: [dp.keyDoor({ limit: 3 })],
    limit: 3
  })
  const graph = g.evolve({ seed: 2, graph: seeded }).graph
  const keys = graph.nodes()
    .map(n => graph.node(n))
    .filter(l => l && l.type === dp.NODE_KEY)
  const pairIds = new Set(keys.map(k => k.pairId))
  assert.ok(keys.length >= 2, 'at least two keys placed')
  assert.strictEqual(pairIds.size, keys.length, 'every key has a unique pairId')
})

test('grammar: refineEdges eventually replaces path edges with flavored types', () => {
  const graph = runDungeon(42, 10)
  const pathEdges = graph.edges()
    .map(e => graph.edge(e))
    .filter(l => l && l.type === dp.EDGE_PATH)
  // After the refine stage every forward path edge should have been
  // promoted to passage/monster/puzzle (backtrack edges remain).
  assert.strictEqual(pathEdges.length, 0, 'no raw path edges remain after refine')
})

test('grammar: refineEdges preserves prereq on locked edges', () => {
  const graph = runDungeon(42, 10)
  const locked = graph.edges()
    .map(e => ({ e, label: graph.edge(e) }))
    .filter(x => x.label && x.label.prereq && x.label.prereq.pairId)
  if (locked.length) {
    locked.forEach(x => {
      // Type got refined but prereq.pairId survived via $assign.
      assert.ok(x.label.type, 'refined type present')
      assert.notStrictEqual(x.label.type, dp.EDGE_PATH)
      assert.ok(x.label.prereq.pairId, 'prereq.pairId survived refine')
    })
  }
})

test('grammar: fixed seed is reproducible', () => {
  const g1 = runDungeon(123, 8)
  const g2 = runDungeon(123, 8)
  assert.strictEqual(g1.nodes().length, g2.nodes().length)
  assert.strictEqual(g1.edges().length, g2.edges().length)
})

test('grammar: different seeds produce different graphs', () => {
  const g1 = runDungeon(100, 20)
  const g2 = runDungeon(200, 20)
  // Not a strict invariant, but at these limits they should differ in
  // either node count or edge shape. If this flakes, swap to structural.
  const sig = g => `${g.nodes().length}/${g.edges().length}`
  assert.notStrictEqual(sig(g1), sig(g2))
})

test('grammar: cycleCloseShortcut refuses to make win a source', () => {
  // Seed an a->m->win chain plus a key at a; rule would fire if b could be
  // any node, but the $not:{type:win} guard blocks b=win.
  const graphlib = require('graphlib')
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: 'room' })
  seeded.setNode('M', { type: 'room' })
  seeded.setNode('W', { type: 'win' })
  seeded.setNode('K', { type: 'key', pairId: 'pair_5' })
  seeded.setEdge('A', 'M', { type: 'path' })
  seeded.setEdge('M', 'W', { type: 'path' })
  seeded.setEdge('A', 'K', { type: 'path' })
  const g = new Grammar({
    start: 'START',
    rules: [dp.cycleCloseShortcut({ weight: 1 })],
    limit: 5
  })
  const out = g.evolve({ seed: 1, graph: seeded }).graph
  const winNode = out.nodes().find(n => (out.node(n) || {}).type === 'win')
  assert.deepStrictEqual(out.successors(winNode) || [], [],
    'win node has no outgoing edges')
})

test('grammar: cycleCloseShortcut rewrites a pre-built a->m->b + a->k seed into a cycle', () => {
  // Build the exact topology cycleCloseShortcut expects: a -> m -> b plus a
  // key k hanging off a. Apply only the cycle-close rule and assert that the
  // shortcut back-edge (b -> a, sharing the key's pairId) is added.
  const graphlib = require('graphlib')
  const seed = new graphlib.Graph()
  seed.setNode('A', { type: 'room' })
  seed.setNode('M', { type: 'room' })
  seed.setNode('B', { type: 'room' })
  seed.setNode('K', { type: 'key', pairId: 'pair_9' })
  seed.setEdge('A', 'M', { type: 'path' })
  seed.setEdge('M', 'B', { type: 'path' })
  seed.setEdge('A', 'K', { type: 'path' })

  const g = new Grammar({
    start: 'START',
    rules: [dp.cycleCloseShortcut({ weight: 1 })],
    limit: 1
  })
  const out = g.evolve({ seed: 1, graph: seed }).graph

  // The cycle-close rule re-creates the four LHS nodes with fresh IDs (rhs
  // nodes that reference lhs IDs get auto-copied labels), so we find them
  // again by label.
  const nodeByType = (t) => out.nodes().filter(n => (out.node(n) || {}).type === t)
  const keys = nodeByType('key')
  assert.strictEqual(keys.length, 1, 'the single key survives')
  assert.strictEqual(out.node(keys[0]).pairId, 'pair_9')

  // A single forward b -> a back-edge should have been added.
  const shortcuts = out.edges()
    .map(e => ({ e, label: out.edge(e) }))
    .filter(x => x.label && x.label.prereq
                 && x.label.prereq.pairId === 'pair_9'
                 && x.label.dot && x.label.dot.color === 'blue')
  assert.strictEqual(shortcuts.length, 1, 'exactly one blue shortcut')

  // And that shortcut should close the cycle: its source is B, destination A.
  const { e } = shortcuts[0]
  assert.strictEqual((out.node(e.v) || {}).type, 'room', 'shortcut source is a room')
  assert.strictEqual((out.node(e.w) || {}).type, 'room', 'shortcut target is a room')
  // Target should have an outgoing path edge (it's A, the start of the original
  // chain, which keeps its out-edge to M and to K).
  assert.ok((out.successors(e.w) || []).length >= 2, 'cycle target keeps both outgoing edges')
})

test('grammar: dotDecorationStage populates label.dot.label on every node and edge', () => {
  const g = new Grammar({
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      { name: 'expand', limit: 5, rules: [dp.midpointRoom(), dp.deadEnd()] },
      {
        name: 'refine',
        rules: dp.refineEdges(dp.EDGE_PATH,
          [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE],
          { weight: 1 })
      },
      dp.dotDecorationStage()
    ]
  })
  const graph = g.evolve({ seed: 7 }).graph
  graph.nodes().forEach(n => {
    const lab = graph.node(n)
    assert.ok(lab && lab.dot && lab.dot.label, 'node ' + n + ' has dot.label')
  })
  graph.edges().forEach(e => {
    const lab = graph.edge(e)
    assert.ok(lab && lab.dot && lab.dot.label, 'edge ' + e.v + '->' + e.w + ' has dot.label')
  })
})
