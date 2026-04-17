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

// --- CYOA gating invariants: nodeIds, edge pairing, prereqs --------------

// A richer expand stage for invariant tests — parallelPath is essential
// because it creates edgeId-free, non-win-target path edges that
// midpointRoom and keyDoor can then grow from (both of them now guard
// their LHS against both win-targets and already-paired edgeId-bearing
// edges).
function richExpandGrammar () {
  return new Grammar({
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      { name: 'expand', limit: 25, rules: [
        dp.parallelPath({ weight: 1 }),
        dp.deadEnd({ weight: 1 }),
        dp.midpointRoom({ weight: 2 }),
        dp.keyDoor({ weight: 2, limit: 3 })
      ] }
    ]
  })
}

test('grammar: every grammar-generated node carries a nodeId', () => {
  const graph = richExpandGrammar().evolve({ seed: 3 }).graph
  const missing = graph.nodes().filter(n => !(graph.node(n) || {}).nodeId)
  assert.deepStrictEqual(missing, [], 'nodes missing nodeId: ' + missing.join(','))
  const ids = graph.nodes().map(n => graph.node(n).nodeId)
  assert.strictEqual(new Set(ids).size, ids.length, 'nodeIds are unique')
})

test('grammar: every backtrack edge has a prereq.traversed pointing to a real edgeId', () => {
  const graph = richExpandGrammar().evolve({ seed: 3 }).graph

  // Collect every edgeId present in the graph.
  const edgeIds = new Set()
  graph.edges().forEach(e => {
    const l = graph.edge(e)
    if (l && l.edgeId) edgeIds.add(l.edgeId)
  })

  // Every backtrack edge must reference an existing edgeId via prereq.traversed.
  const backs = graph.edges()
    .map(e => ({ e, label: graph.edge(e) }))
    .filter(x => x.label && x.label.type === dp.EDGE_BACKTRACK)
  assert.ok(backs.length > 0, 'at least some backtracks exist')
  backs.forEach(x => {
    assert.ok(x.label.prereq, 'backtrack ' + x.e.v + '->' + x.e.w + ' has prereq')
    assert.ok(x.label.prereq.traversed,
      'backtrack ' + x.e.v + '->' + x.e.w + ' prereq.traversed present')
    assert.ok(edgeIds.has(x.label.prereq.traversed),
      'prereq.traversed "' + x.label.prereq.traversed + '" names a real edgeId')
  })
})

test('grammar: every shortcut edge has prereq.visited pointing to an existing nodeId', () => {
  // Needs parallelPath in the expand stage for the dungeon to grow past the
  // initial start->win edge (see richExpandGrammar comment above).
  let graph = null
  for (const s of [1, 2, 3, 4, 5, 7, 42, 100]) {
    const candidate = new Grammar({
      start: 'START',
      stages: [
        dp.initStartGoalStage(),
        { name: 'expand', limit: 30, rules: [
          dp.parallelPath({ weight: 1 }),
          dp.deadEnd({ weight: 1 }),
          dp.midpointRoom({ weight: 2 }),
          dp.keyDoor({ weight: 5, limit: 3 })
        ] },
        { name: 'close-cycles', limit: 5, rules: [dp.cycleCloseShortcut()] }
      ]
    }).evolve({ seed: s }).graph
    const hasShortcut = candidate.edges().some(e =>
      (candidate.edge(e) || {}).type === dp.EDGE_SHORTCUT)
    if (hasShortcut) { graph = candidate; break }
  }
  assert.ok(graph, 'found a seed that produces at least one shortcut')

  const nodeIds = new Set(graph.nodes().map(n => (graph.node(n) || {}).nodeId))
  const shortcuts = graph.edges()
    .map(e => ({ e, label: graph.edge(e) }))
    .filter(x => x.label && x.label.type === dp.EDGE_SHORTCUT)
  shortcuts.forEach(x => {
    assert.ok(x.label.prereq && x.label.prereq.visited,
      'shortcut has prereq.visited')
    assert.ok(nodeIds.has(x.label.prereq.visited),
      'prereq.visited "' + x.label.prereq.visited + '" names a real nodeId')
    // The referenced nodeId is specifically the destination of the shortcut.
    const destNodeId = (graph.node(x.e.w) || {}).nodeId
    assert.strictEqual(x.label.prereq.visited, destNodeId,
      'prereq.visited references the destination node')
  })
})

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

test('grammar: cycleCloseShortcut adds a type=shortcut edge gated on visiting the destination', () => {
  // Build the exact topology cycleCloseShortcut expects: a -> m -> b plus a
  // key k hanging off a. `a` carries a nodeId, which the rule captures via a
  // regex and templates onto the shortcut's prereq.visited.
  const graphlib = require('graphlib')
  const seed = new graphlib.Graph()
  seed.setNode('A', { type: 'room', nodeId: 'room_hub' })
  seed.setNode('M', { type: 'room', nodeId: 'room_mid' })
  seed.setNode('B', { type: 'room', nodeId: 'room_far' })
  seed.setNode('K', { type: 'key', pairId: 'pair_9', nodeId: 'key_9' })
  seed.setEdge('A', 'M', { type: 'path' })
  seed.setEdge('M', 'B', { type: 'path' })
  seed.setEdge('A', 'K', { type: 'path' })

  const g = new Grammar({
    start: 'START',
    rules: [dp.cycleCloseShortcut({ weight: 1 })],
    limit: 1
  })
  const out = g.evolve({ seed: 1, graph: seed }).graph

  const shortcuts = out.edges()
    .map(e => ({ e, label: out.edge(e) }))
    .filter(x => x.label && x.label.type === dp.EDGE_SHORTCUT)
  assert.strictEqual(shortcuts.length, 1, 'exactly one shortcut edge')
  const s = shortcuts[0]

  // prereq: visited <destination nodeId>. Destination is `a` (room_hub).
  assert.ok(s.label.prereq, 'shortcut has prereq')
  assert.strictEqual(s.label.prereq.visited, 'room_hub',
    'prereq.visited references the destination nodeId')
  // No pairId prereq anymore — the key-gate was replaced with a visit-gate.
  assert.strictEqual(s.label.prereq.pairId, undefined, 'no key prereq on shortcut')

  // Source is B (room_far), destination is A (room_hub).
  assert.strictEqual((out.node(s.e.v) || {}).nodeId, 'room_far')
  assert.strictEqual((out.node(s.e.w) || {}).nodeId, 'room_hub')

  // Visual styling intact.
  assert.strictEqual(s.label.dot.color, 'blue')
  assert.strictEqual(s.label.dot.style, 'bold')
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
