// Tests for the acyclic hypertext primitives and the two DAG examples.
//
// The load-bearing assertion in this file is acyclicity. Everything else
// here is structural bookkeeping; the DAG invariant is the one that, if it
// breaks, silently corrupts every downstream exporter, because
// `meta.topology: "dag"` is a promise those exporters are allowed to lean
// on (docs/spec/story-ir.md §9). So it is checked by direct graph search at
// several seeds rather than inferred from the shape of the rules.

const test = require('node:test')
const assert = require('node:assert')
const graphlib = require('graphlib')
const { Grammar } = require('./helpers')
const dag = require('../dag-primitives')
const dagPlain = require('../examples/dag-plain')
const dagLocked = require('../examples/dag-locked')

const SEEDS = [42, 1729, 8675309, 7, 99]

// --- helpers -----------------------------------------------------------

// Three-colour DFS: white = unvisited, grey = on the current stack, black =
// finished. A grey hit is a back edge, i.e. a directed cycle. Written out
// rather than pulled from a library both because the repo takes no new
// dependencies and because a hand-rolled check returns the offending edge,
// which is what you want when a rule regresses.
function findCycle (graph) {
  const colour = {}
  const stack = []
  let found = null
  function visit (n) {
    if (found) return
    colour[n] = 'grey'
    stack.push(n)
    const succs = graph.successors(n) || []
    for (let i = 0; i < succs.length && !found; i++) {
      const s = succs[i]
      if (colour[s] === 'grey') {
        found = stack.slice(stack.indexOf(s)).concat([s])
      } else if (!colour[s]) {
        visit(s)
      }
    }
    stack.pop()
    colour[n] = 'black'
  }
  graph.nodes().forEach(function (n) { if (!colour[n]) visit(n) })
  return found
}

function assertAcyclic (graph, what) {
  const cycle = findCycle(graph)
  assert.strictEqual(cycle, null,
    what + ': expected a DAG, found cycle ' + JSON.stringify(cycle))
}

function typeCounts (graph) {
  const counts = {}
  graph.nodes().forEach(function (n) {
    const t = (graph.node(n) || {}).type
    counts[t] = (counts[t] || 0) + 1
  })
  return counts
}

function lockedEdges (graph) {
  return graph.edges().filter(function (e) {
    const l = graph.edge(e) || {}
    return l.prereq && l.prereq.pairId
  })
}

// Nesting depth as budgets.md measures it: the largest number of locked
// edges the player can be made to pass through on a single route. In a DAG
// this is a one-pass longest-path DP over the topological order, with a
// locked edge weighing 1 and every other edge 0.
function nestingDepth (graph) {
  const order = graphlib.alg.topsort(graph)
  const best = {}
  let max = 0
  order.forEach(function (n) {
    if (best[n] == null) best[n] = 0
    const succs = graph.successors(n) || []
    succs.forEach(function (s) {
      const l = graph.edge(n, s) || {}
      const w = (l.prereq && l.prereq.pairId) ? 1 : 0
      const cand = best[n] + w
      if (best[s] == null || cand > best[s]) best[s] = cand
      if (cand > max) max = cand
    })
  })
  return max
}

// Build and evolve one of the catalogue examples the way bin/story.js does:
// the module hands back grammar JSON, the caller constructs the Grammar
// with a narrator-equipped Matcher (test/helpers.js supplies one in
// placeholder mode).
function runExample (example, seed, opts) {
  return new Grammar(example.grammar(opts || {})).evolve({ seed: seed }).graph
}

// A two-node seed graph with a single bare `path` edge, for exercising one
// factory in isolation. The endpoints are typed start/win rather than
// room/room so that a type census of the result counts only the nodes the
// rule under test created. Host ids are reassigned as rules fire, so
// everything downstream addresses these two by `nodeId` via `byNodeId`.
function seededPair () {
  const g = new graphlib.Graph()
  g.setNode('A', { type: dag.NODE_START, nodeId: 'start' })
  g.setNode('B', { type: dag.NODE_WIN, nodeId: 'win' })
  g.setEdge('A', 'B', { type: dag.EDGE_PATH })
  return g
}

function byNodeId (graph, nodeId) {
  const n = graph.nodes().find(function (x) { return (graph.node(x) || {}).nodeId === nodeId })
  assert.ok(n != null, 'no node with nodeId ' + nodeId)
  return n
}

function byType (graph, type) {
  return graph.nodes().filter(function (n) { return (graph.node(n) || {}).type === type })
}

function runRules (rules, seed, limit, seedGraph) {
  const g = new Grammar({ start: 'START', rules: rules, limit: limit })
  return g.evolve({ seed: seed, graph: seedGraph || seededPair() }).graph
}

// --- the acyclicity invariant ------------------------------------------

test('dag: dagMidpoint preserves acyclicity at several seeds', () => {
  SEEDS.forEach(function (seed) {
    const out = runRules([dag.dagMidpoint()], seed, 6)
    assertAcyclic(out, 'dagMidpoint seed ' + seed)
  })
})

test('dag: forkJoin preserves acyclicity at several seeds', () => {
  SEEDS.forEach(function (seed) {
    const out = runRules([dag.forkJoin()], seed, 5)
    assertAcyclic(out, 'forkJoin seed ' + seed)
  })
})

test('dag: dagKeyLock preserves acyclicity at several seeds', () => {
  SEEDS.forEach(function (seed) {
    const out = runRules([dag.dagKeyLock()], seed, 4)
    assertAcyclic(out, 'dagKeyLock seed ' + seed)
  })
})

test('dag: all three factories mixed preserve acyclicity at several seeds', () => {
  SEEDS.forEach(function (seed) {
    const out = runRules(
      [dag.dagMidpoint({ weight: 2 }), dag.forkJoin(), dag.dagKeyLock()],
      seed, 10)
    assertAcyclic(out, 'mixed seed ' + seed)
  })
})

// The negative control. If findCycle can be fooled, every assertion above
// is worthless, so give it a graph that definitely has a cycle.
test('dag: findCycle actually detects a cycle', () => {
  const g = new graphlib.Graph()
  g.setEdge('A', 'B', {})
  g.setEdge('B', 'C', {})
  g.setEdge('C', 'A', {})
  assert.notStrictEqual(findCycle(g), null)
})

// --- dagMidpoint -------------------------------------------------------

test('dag: dagMidpoint inserts a one-way room and drops the original edge', () => {
  const out = runRules([dag.dagMidpoint()], 1, 1)
  const a = byNodeId(out, 'start')
  const b = byNodeId(out, 'win')
  assert.strictEqual(out.hasEdge(a, b), false, 'original edge is consumed')
  const rooms = byType(out, dag.NODE_ROOM)
  assert.strictEqual(rooms.length, 1, 'exactly one midpoint')
  const m = rooms[0]
  assert.ok(out.hasEdge(a, m) && out.hasEdge(m, b), 'a -> m -> b')
  assert.strictEqual(out.hasEdge(m, a), false, 'no backtrack m -> a')
  assert.strictEqual(out.hasEdge(b, m), false, 'no backtrack b -> m')
  assert.ok((out.node(m) || {}).nodeId, 'midpoint carries a nodeId')
})

test('dag: dagMidpoint is unconditional, unlike the dungeon one-way midpoint', () => {
  // dungeonPrimitives.midpointRoom({oneWay:true}) requires an existing
  // b -> a edge, so on a bare a -> b pair it cannot fire at all. The
  // acyclic sibling must fire on exactly that input, since it is the shape
  // the init stage produces.
  const dp = require('../dungeon-primitives')
  const bare = runRules([dp.midpointRoom({ oneWay: true })], 3, 1)
  assert.strictEqual(bare.nodes().length, 2, 'gated dungeon rule cannot fire')
  const ours = runRules([dag.dagMidpoint()], 3, 1)
  assert.strictEqual(ours.nodes().length, 3, 'dagMidpoint fires unconditionally')
})

// --- forkJoin ----------------------------------------------------------

test('dag: forkJoin makes two distinct arms that rejoin', () => {
  const out = runRules([dag.forkJoin()], 1, 1)
  const a = byNodeId(out, 'start')
  const b = byNodeId(out, 'win')
  assert.strictEqual(out.hasEdge(a, b), false, 'the bare route is consumed')
  const arms = (out.successors(a) || [])
  assert.strictEqual(arms.length, 2, 'two arms out of a')
  arms.forEach(function (m) {
    assert.deepStrictEqual(out.successors(m), [b], 'arm rejoins at b')
  })
  const nids = arms.map(function (m) { return (out.node(m) || {}).nodeId })
  assert.ok(nids[0] && nids[1], 'both arms carry a nodeId')
  assert.notStrictEqual(nids[0], nids[1], 'arm nodeIds are distinct')
  // Distinct nodeIds are what give the two arms distinct describe_room
  // contexts; if the texts collide the "choice" is cosmetic.
  const texts = arms.map(function (m) { return (out.node(m) || {}).text })
  assert.notStrictEqual(texts[0], texts[1], 'arm texts are distinct')
})

// --- dagKeyLock --------------------------------------------------------

test('dag: dagKeyLock builds key arm, skip arm, join, locked edge and loss', () => {
  const out = runRules([dag.dagKeyLock()], 1, 1)
  const counts = typeCounts(out)
  assert.strictEqual(counts[dag.NODE_KEY], 1, 'one key')
  assert.strictEqual(counts[dag.NODE_DOOR], 1, 'one join/door')
  assert.strictEqual(counts[dag.NODE_DEAD_LOSS], 1, 'one loss ending')
  // The skip arm is an ordinary room: nothing about its label betrays that
  // it is the arm without the key.
  assert.strictEqual(counts[dag.NODE_ROOM], 1, 'one skip-arm room')

  const a = byNodeId(out, 'start')
  const b = byNodeId(out, 'win')
  const key = byType(out, dag.NODE_KEY)[0]
  const join = byType(out, dag.NODE_DOOR)[0]
  const loss = byType(out, dag.NODE_DEAD_LOSS)[0]

  const keyLabel = out.node(key)
  assert.ok(keyLabel.pairId, 'key carries a pairId')
  assert.ok(keyLabel.nodeId, 'key carries a nodeId')
  assert.ok(keyLabel.text, 'key carries describe_key text')

  // Both arms out of a, both rejoining at the join node.
  const arms = out.successors(a) || []
  assert.strictEqual(arms.length, 2, 'key arm and skip arm')
  assert.ok(arms.indexOf(key) >= 0, 'the key is on one arm')
  arms.forEach(function (m) {
    assert.deepStrictEqual(out.successors(m), [join], 'arm rejoins at the join')
  })

  const locked = out.edge(join, b)
  assert.ok(locked, 'the way on exists')
  assert.strictEqual(locked.prereq.pairId, keyLabel.pairId,
    'locked edge prereq.pairId matches the key')
  assert.ok(locked.closedText, 'locked edge carries closed text')

  const consolation = out.edge(join, loss)
  assert.ok(consolation, 'the consolation edge exists')
  assert.strictEqual(consolation.type, dag.EDGE_CONSOLATION)
  assert.strictEqual(consolation.prereq, undefined, 'the concession is never gated')
})

test('dag: the loss node is a sink', () => {
  SEEDS.forEach(function (seed) {
    const out = runExample(dagLocked, seed)
    out.nodes().forEach(function (n) {
      if ((out.node(n) || {}).type !== dag.NODE_DEAD_LOSS) return
      assert.deepStrictEqual(out.successors(n), [],
        'loss node ' + n + ' has outgoing edges at seed ' + seed)
    })
  })
})

test('dag: the win node is a sink too', () => {
  SEEDS.forEach(function (seed) {
    const out = runExample(dagLocked, seed)
    out.nodes().forEach(function (n) {
      if ((out.node(n) || {}).type !== dag.NODE_WIN) return
      assert.deepStrictEqual(out.successors(n), [],
        'win node ' + n + ' has outgoing edges at seed ' + seed)
    })
  })
})

test('dag: dagKeyLock nests — a lock can sit inside an arm of an earlier lock', () => {
  // Two firings on a bare pair. The first lock's arm edges are plain
  // unlocked `path` edges, so wherever the second lands it is downstream of
  // (or upstream of) the first on the same route: nesting depth 2. If a
  // future LHS guard blocks this, the depth-2 line in dag-locked's budget
  // is a lie and this test is where you find out.
  const out = runRules([dag.dagKeyLock()], 1, 2)
  assertAcyclic(out, 'nested dagKeyLock')
  assert.strictEqual(lockedEdges(out).length, 2, 'two locked edges')
  assert.strictEqual(nestingDepth(out), 2, 'both locks lie on one route')
})

test('dag: no dag rule ever rebuilds a locked edge without its prereq', () => {
  // The unlockedPathPattern guard. Run a keylock first, then let the other
  // two factories loose on the result; the locked edge must survive with
  // its prereq intact.
  const first = runRules([dag.dagKeyLock()], 5, 1)
  const before = lockedEdges(first)
  assert.strictEqual(before.length, 1)
  const pairId = first.edge(before[0]).prereq.pairId
  const after = runRules(
    [dag.dagMidpoint(), dag.forkJoin()], 5, 8, first)
  const still = lockedEdges(after)
  assert.strictEqual(still.length, 1, 'the lock is still locked')
  assert.strictEqual(after.edge(still[0]).prereq.pairId, pairId, 'same pairId')
})

// --- examples: interface -----------------------------------------------

test('dag: both examples match the module interface in docs/spec/examples.md', () => {
  [dagPlain, dagLocked].forEach(function (ex) {
    assert.strictEqual(typeof ex.id, 'string')
    assert.strictEqual(typeof ex.title, 'string')
    assert.strictEqual(ex.topology, 'dag')
    assert.strictEqual(typeof ex.puzzles, 'boolean')
    assert.ok(Array.isArray(ex.defaultSeeds) && ex.defaultSeeds.length > 0)
    assert.deepStrictEqual(ex.defaultSeeds, [42, 1729, 8675309])
    assert.deepStrictEqual(Object.keys(ex.budget).sort(),
      ['criticalPath', 'keys', 'minigames', 'nestingDepth', 'npcs', 'rooms'])
    assert.strictEqual(typeof ex.grammar, 'function')
    // grammar() returns JSON, not a constructed Grammar: the caller owns
    // construction because it owns narrator registration.
    const json = ex.grammar({})
    assert.strictEqual(json.constructor, Object)
    assert.strictEqual(json.start, 'START')
    assert.ok(Array.isArray(json.stages) && json.stages.length === 4)
    // `approach` sits between init and expand: it spends the criticalPath
    // budget building the spine before anything can hang side structure off
    // it, so that the locks in `expand` land on the route the player must
    // actually walk. Named lookup, not indexed, so inserting a stage does not
    // silently repoint the assertions below at a different one.
    assert.deepStrictEqual(json.stages.map(function (s) { return s.name }),
      ['init', 'approach', 'expand', 'decorate'])
  })
  assert.strictEqual(dagPlain.id, 'dag-plain')
  assert.strictEqual(dagPlain.puzzles, false)
  assert.strictEqual(dagLocked.id, 'dag-locked')
  assert.strictEqual(dagLocked.puzzles, true)
})

test('dag: dag-locked wires its keylock limit to budget.keys', () => {
  const json = dagLocked.grammar({ budget: { keys: 1 } })
  // Find the stage by name rather than index: stages get inserted over time,
  // and an index-based lookup silently starts testing a different stage.
  const expand = json.stages.find(function (st) { return st.name === 'expand' })
  const kl = expand.rules.find(function (r) { return r.name === 'dag-key-lock' })
  assert.strictEqual(kl.limit, 1, 'the rule limit tracks the budget')
})

// --- examples: behaviour -----------------------------------------------

test('dag: dag-plain is acyclic, puzzle-free and within budget at 5 seeds', () => {
  SEEDS.forEach(function (seed) {
    const out = runExample(dagPlain, seed)
    assertAcyclic(out, 'dag-plain seed ' + seed)
    const counts = typeCounts(out)
    assert.ok((counts[dag.NODE_ROOM] || 0) <= dagPlain.budget.rooms,
      'rooms ' + counts[dag.NODE_ROOM] + ' over budget at seed ' + seed)
    assert.strictEqual(counts[dag.NODE_KEY], undefined, 'no keys')
    assert.strictEqual(counts[dag.NODE_DEAD_LOSS], undefined, 'no losing endings')
    assert.strictEqual(lockedEdges(out).length, 0, 'no locked edges')
    assert.strictEqual(counts[dag.NODE_START], 1)
    assert.strictEqual(counts[dag.NODE_WIN], 1)
  })
})

test('dag: dag-locked is acyclic and within budget at 5 seeds', () => {
  SEEDS.forEach(function (seed) {
    const out = runExample(dagLocked, seed)
    assertAcyclic(out, 'dag-locked seed ' + seed)
    const counts = typeCounts(out)
    assert.ok((counts[dag.NODE_ROOM] || 0) <= dagLocked.budget.rooms,
      'rooms ' + counts[dag.NODE_ROOM] + ' over budget at seed ' + seed)
    assert.ok((counts[dag.NODE_KEY] || 0) <= dagLocked.budget.keys,
      'keys over budget at seed ' + seed)
    assert.ok(nestingDepth(out) <= dagLocked.budget.nestingDepth,
      'nesting depth over budget at seed ' + seed)
  })
})

test('dag: dag-locked produces keys whose pairIds match their locked edges', () => {
  SEEDS.forEach(function (seed) {
    const out = runExample(dagLocked, seed)
    const keys = out.nodes().filter(function (n) {
      return (out.node(n) || {}).type === dag.NODE_KEY
    })
    assert.ok(keys.length > 0, 'at least one key at seed ' + seed)
    const keyPairs = keys.map(function (n) { return out.node(n).pairId })
    const locks = lockedEdges(out)
    assert.strictEqual(locks.length, keys.length, 'one lock per key')
    locks.forEach(function (e) {
      assert.ok(keyPairs.indexOf(out.edge(e).prereq.pairId) >= 0,
        'locked edge references a real key at seed ' + seed)
    })
  })
})

test('dag: dag-locked reaches nesting depth 2 at its canonical seed', () => {
  // budget.nestingDepth is 2, and the catalogue entry claims it. Assert the
  // canonical seed actually delivers rather than only permitting it.
  const out = runExample(dagLocked, dagLocked.defaultSeeds[0])
  assert.strictEqual(nestingDepth(out), 2)
})

test('dag: every node in both examples is reachable from start', () => {
  // A DAG grown by edge-replacement rules should have no orphans; an orphan
  // would mean a rule dropped an edge it meant to keep, and would fail
  // validateStoryIR's reachability check downstream.
  [dagPlain, dagLocked].forEach(function (ex) {
    SEEDS.forEach(function (seed) {
      const out = runExample(ex, seed)
      const start = out.nodes().find(function (n) {
        return (out.node(n) || {}).type === dag.NODE_START
      })
      const seen = new Set([start])
      const stack = [start]
      while (stack.length) {
        const n = stack.pop()
        ;(out.successors(n) || []).forEach(function (s) {
          if (!seen.has(s)) { seen.add(s); stack.push(s) }
        })
      }
      assert.strictEqual(seen.size, out.nodes().length,
        ex.id + ' seed ' + seed + ': unreachable nodes')
    })
  })
})

// --- determinism -------------------------------------------------------

test('dag: both examples are deterministic at a fixed seed', () => {
  [dagPlain, dagLocked].forEach(function (ex) {
    const seed = ex.defaultSeeds[0]
    const a = graphlib.json.write(runExample(ex, seed))
    const b = graphlib.json.write(runExample(ex, seed))
    assert.deepStrictEqual(a, b, ex.id + ' is not reproducible at seed ' + seed)
  })
})

test('dag: different seeds give different graphs', () => {
  // Determinism is only interesting if the seed is actually doing work.
  const a = JSON.stringify(graphlib.json.write(runExample(dagLocked, 42)))
  const b = JSON.stringify(graphlib.json.write(runExample(dagLocked, 1729)))
  assert.notStrictEqual(a, b)
})
