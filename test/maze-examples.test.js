// The two bidirectional worked examples, exercised at their default seeds.
//
// These assert the *contract* the example modules advertise — the budget
// numbers, the topology promise, the gating invariants — rather than any
// particular map. A grammar is a sampler, so the tests are written as bounds
// and invariants that hold for every seed, never as a golden map.

const test = require('node:test')
const assert = require('node:assert')
const graphlib = require('graphlib')
const { Grammar } = require('./helpers')

const mazePlain = require('../examples/maze-plain')
const mazeLocked = require('../examples/maze-locked')

// The place nodes a budget's `rooms` field counts: everything the init and
// expand stages create except lock furniture (key, door), which `keys`
// budgets, and except the interior of a minigame (choice, random, death,
// puzzle_intro, distractor), which `minigames` budgets.
const PLACE_TYPES = ['start', 'win', 'room', 'dead_end', 'potion']

function evolve (example, seed) {
  return new Grammar(example.grammar({})).evolve({ seed }).graph
}

function nodesOfType (graph, type) {
  return graph.nodes().filter(n => (graph.node(n) || {}).type === type)
}

function places (graph) {
  return graph.nodes().filter(n => PLACE_TYPES.indexOf((graph.node(n) || {}).type) >= 0)
}

// --- Both examples: they run at all -------------------------------------

;[mazePlain, mazeLocked].forEach(example => {
  test(example.id + ': evolves without throwing at every default seed', () => {
    assert.strictEqual(example.topology, 'bidirectional')
    assert.strictEqual(example.defaultSeeds.length, 3)
    example.defaultSeeds.forEach(seed => {
      const graph = evolve(example, seed)
      assert.ok(graph.nodeCount() > 0, 'seed ' + seed + ' produced nodes')
      assert.ok(graph.edgeCount() > 0, 'seed ' + seed + ' produced edges')
    })
  })

  // Reproducibility contract (docs/spec/examples.md): the only entropy source
  // is the seeded Mersenne Twister, so two runs at one seed must agree
  // byte-for-byte once serialized.
  test(example.id + ': same seed yields identical graphlib JSON', () => {
    example.defaultSeeds.forEach(seed => {
      const a = JSON.stringify(graphlib.json.write(evolve(example, seed)))
      const b = JSON.stringify(graphlib.json.write(evolve(example, seed)))
      assert.strictEqual(a, b, 'seed ' + seed + ' is reproducible')
    })
    // ...and different seeds must actually differ, or the seed is being
    // ignored and the test above is vacuous.
    const first = JSON.stringify(graphlib.json.write(evolve(example, example.defaultSeeds[0])))
    const second = JSON.stringify(graphlib.json.write(evolve(example, example.defaultSeeds[1])))
    assert.notStrictEqual(first, second)
  })
})

// --- maze-plain: no locks, but genuinely bidirectional ------------------

test('maze-plain: no edge carries a prereq.pairId', () => {
  mazePlain.defaultSeeds.forEach(seed => {
    const graph = evolve(mazePlain, seed)
    const locked = graph.edges().filter(e => ((graph.edge(e) || {}).prereq || {}).pairId)
    assert.deepStrictEqual(locked, [], 'seed ' + seed + ' has no locked edges')
    assert.deepStrictEqual(nodesOfType(graph, 'key'), [], 'seed ' + seed + ' has no keys')
    assert.deepStrictEqual(nodesOfType(graph, 'door'), [], 'seed ' + seed + ' has no doors')
  })
})

test('maze-plain: the graph really is cyclic', () => {
  mazePlain.defaultSeeds.forEach(seed => {
    const graph = evolve(mazePlain, seed)
    const cycles = graphlib.alg.findCycles(graph)
    assert.ok(cycles.length >= 1,
      'seed ' + seed + ' must contain a cycle to justify topology: bidirectional')
  })
})

test('maze-plain: minigames: 0 is respected', () => {
  mazePlain.defaultSeeds.forEach(seed => {
    const graph = evolve(mazePlain, seed)
    const flavored = graph.edges().filter(e => {
      const t = (graph.edge(e) || {}).type
      return t === 'monster' || t === 'puzzle'
    })
    assert.deepStrictEqual(flavored, [], 'seed ' + seed + ' has no minigame edges')
  })
})

// The failure this example exists to prevent: a corridor with no prose, which
// in a map the player walks repeatedly reads as a button captioned "path".
test('maze-plain: every place has text and every passage has a link', () => {
  mazePlain.defaultSeeds.forEach(seed => {
    const graph = evolve(mazePlain, seed)
    places(graph).forEach(n => {
      const label = graph.node(n) || {}
      assert.ok(typeof label.text === 'string' && label.text.length > 0,
        'seed ' + seed + ': node ' + n + ' (' + label.type + ') has non-empty text')
    })
    graph.edges().forEach(e => {
      const label = graph.edge(e) || {}
      if (label.type !== 'path' && label.type !== 'passage') return
      assert.ok(typeof label.link === 'string' && label.link.length > 0,
        'seed ' + seed + ': edge ' + e.v + '->' + e.w + ' has non-empty link')
    })
  })
})

// --- maze-locked: the gating invariants ---------------------------------

test('maze-locked: key count is within budget', () => {
  mazeLocked.defaultSeeds.forEach(seed => {
    const graph = evolve(mazeLocked, seed)
    const keys = nodesOfType(graph, 'key')
    assert.ok(keys.length <= mazeLocked.budget.keys,
      'seed ' + seed + ': ' + keys.length + ' keys <= ' + mazeLocked.budget.keys)
  })
})

// Each of the three prereq flavors (README's CYOA gating table) has to name
// something that survived to the end of the run. A dangling prereq is a door
// that can never be opened, and it is the failure mode every edgeId- and
// prereq-inheritance rule in dungeon-primitives.js exists to avoid.
test('maze-locked: every prereq references something that exists', () => {
  mazeLocked.defaultSeeds.forEach(seed => {
    const graph = evolve(mazeLocked, seed)
    const pairIds = new Set(nodesOfType(graph, 'key').map(n => graph.node(n).pairId))
    const nodeIds = new Set(graph.nodes().map(n => (graph.node(n) || {}).nodeId).filter(Boolean))
    const edgeIds = new Set(graph.edges().map(e => (graph.edge(e) || {}).edgeId).filter(Boolean))
    graph.edges().forEach(e => {
      const prereq = (graph.edge(e) || {}).prereq
      if (!prereq) return
      const where = 'seed ' + seed + ': edge ' + e.v + '->' + e.w
      if (prereq.pairId) {
        assert.ok(pairIds.has(prereq.pairId),
          where + ' locked on ' + prereq.pairId + ', which has a key node')
      }
      if (prereq.traversed) {
        assert.ok(edgeIds.has(prereq.traversed),
          where + ' gated on traversing ' + prereq.traversed + ', which exists')
      }
      if (prereq.visited) {
        assert.ok(nodeIds.has(prereq.visited),
          where + ' gated on visiting ' + prereq.visited + ', which exists')
      }
    })
  })
})

test('maze-locked: the win node is a sink', () => {
  mazeLocked.defaultSeeds.forEach(seed => {
    const graph = evolve(mazeLocked, seed)
    const wins = nodesOfType(graph, 'win')
    assert.strictEqual(wins.length, 1, 'seed ' + seed + ' has exactly one win node')
    assert.deepStrictEqual(graph.outEdges(wins[0]), [],
      'seed ' + seed + ': win has no outgoing edges')
  })
})

test('maze-locked: minigame expansions are within budget', () => {
  mazeLocked.defaultSeeds.forEach(seed => {
    const graph = evolve(mazeLocked, seed)
    // One monsterBattle contributes exactly one `death` node; one
    // puzzleChoice contributes exactly one `puzzle_intro`. Counting the
    // expansions is therefore counting those two node types.
    const minigames = nodesOfType(graph, 'death').length +
      nodesOfType(graph, 'puzzle_intro').length
    assert.ok(minigames <= mazeLocked.budget.minigames,
      'seed ' + seed + ': ' + minigames + ' minigames <= ' + mazeLocked.budget.minigames)
  })
})

// --- Budgets bind ---------------------------------------------------------

// Tolerance, and why there is one at all: an exact room count would be
// asserting a particular sample, not a contract. What the arithmetic in each
// example module actually guarantees is
//
//   places = 2 (start, win) + expandLimit - (iterations spent on keyDoor)
//
// with expandLimit = budget.rooms - 2 and keyDoor firing at most budget.keys
// times. So the count is pinned to the window [rooms - keys, rooms]: the upper
// bound is the hard budget contract, and the slack below it is exactly the
// iterations that produced a lock instead of a room. For maze-plain, keys is
// 0 and the window collapses to a single value.
;[mazePlain, mazeLocked].forEach(example => {
  test(example.id + ': room count lands inside the budget window', () => {
    example.defaultSeeds.forEach(seed => {
      const graph = evolve(example, seed)
      const count = places(graph).length
      const lo = example.budget.rooms - example.budget.keys
      const hi = example.budget.rooms
      assert.ok(count >= lo && count <= hi,
        'seed ' + seed + ': ' + count + ' places in [' + lo + ', ' + hi + ']')
    })
  })

  // The budget is a knob, not a constant: halving it has to halve the map, or
  // the numbers in the module are decoration rather than a contract.
  test(example.id + ': a smaller budget really produces a smaller map', () => {
    const small = Object.assign({}, example.budget, { rooms: 6 })
    const graph = new Grammar(example.grammar({ budget: small }))
      .evolve({ seed: example.defaultSeeds[0] }).graph
    assert.ok(places(graph).length <= 6,
      'overridden budget of 6 rooms yields ' + places(graph).length + ' places')
  })
})
