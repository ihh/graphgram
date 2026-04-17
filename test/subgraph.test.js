// Tests for the SubgraphSearch (Ullmann 1976) engine in subgraph.js.
// These are baseline tests — they must pass against the current implementation
// before any Tier 1 optimization lands.

const test = require('node:test')
const assert = require('node:assert')
const graphlib = require('graphlib')
const { SubgraphSearch } = require('../subgraph')

function makeGraph (nodes, edges) {
  const g = new graphlib.Graph()
  for (const n of nodes) {
    if (Array.isArray(n)) g.setNode(n[0], n[1])
    else g.setNode(n)
  }
  for (const e of (edges || [])) {
    if (e.length === 3) g.setEdge(e[0], e[1], e[2])
    else g.setEdge(e[0], e[1])
  }
  return g
}

// Default labelMatch: strict equality, wrapped to the `{match}` protocol used by the real Matcher.
function simpleLabelMatch (gLabel, sLabel) {
  if (typeof(sLabel) === 'undefined') return { match: gLabel }
  return gLabel === sLabel ? { match: gLabel } : false
}

test('SubgraphSearch: empty subgraph yields one trivial isomorphism', () => {
  const host = makeGraph(['a', 'b'])
  const sub = new graphlib.Graph()
  const ss = new SubgraphSearch(host, sub)
  assert.strictEqual(ss.isomorphisms.length, 1)
  assert.deepStrictEqual(ss.isomorphisms[0].assign, {})
})

test('SubgraphSearch: single-node pattern matches every host node', () => {
  const host = makeGraph(['a', 'b', 'c'])
  const sub = makeGraph(['x'])
  const ss = new SubgraphSearch(host, sub)
  assert.strictEqual(ss.isomorphisms.length, 3)
  const assigned = ss.isomorphisms.map(i => i.assign.x).sort()
  assert.deepStrictEqual(assigned, ['a', 'b', 'c'])
})

test('SubgraphSearch: two-node pattern with an edge requires an edge in host', () => {
  const host = makeGraph(['a', 'b', 'c'], [['a', 'b']])
  const sub = makeGraph(['x', 'y'], [['x', 'y']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  // Only a->b is a valid mapping for x->y.
  const found = ss.isomorphisms.map(i => [i.assign.x, i.assign.y])
  assert.strictEqual(found.length, 1)
  assert.deepStrictEqual(found[0], ['a', 'b'])
})

test('SubgraphSearch: two-node pattern with no edge treats host as permissive', () => {
  const host = makeGraph(['a', 'b', 'c'], [['a', 'b']])
  const sub = makeGraph(['x', 'y'])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  // Without any edge constraint, every ordered pair of distinct host nodes matches.
  assert.strictEqual(ss.isomorphisms.length, 6)
})

test('SubgraphSearch: directionality is respected', () => {
  const host = makeGraph(['a', 'b'], [['a', 'b']])
  const sub = makeGraph(['x', 'y'], [['y', 'x']])  // reversed
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  // Host has a->b only; pattern needs y->x.  Only mapping: y=a, x=b.
  const found = ss.isomorphisms.map(i => [i.assign.x, i.assign.y])
  assert.deepStrictEqual(found, [['b', 'a']])
})

test('SubgraphSearch: triangle pattern finds all rotations', () => {
  const host = makeGraph(['a', 'b', 'c'], [['a', 'b'], ['b', 'c'], ['c', 'a']])
  const sub = makeGraph(['x', 'y', 'z'], [['x', 'y'], ['y', 'z'], ['z', 'x']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  // 3 rotations of the triangle.
  assert.strictEqual(ss.isomorphisms.length, 3)
})

test('SubgraphSearch: no match when pattern edge absent', () => {
  const host = makeGraph(['a', 'b'])  // no edges
  const sub = makeGraph(['x', 'y'], [['x', 'y']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 0)
})

test('SubgraphSearch: node labels filter matches', () => {
  const host = makeGraph([['a', 'room'], ['b', 'key'], ['c', 'room']], [])
  const sub = makeGraph([['x', 'key']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 1)
  assert.strictEqual(ss.isomorphisms[0].assign.x, 'b')
})

test('SubgraphSearch: edge labels filter matches', () => {
  const host = makeGraph(['a', 'b', 'c'], [['a', 'b', 'path'], ['b', 'c', 'door']])
  const sub = makeGraph(['x', 'y'], [['x', 'y', 'door']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  // Only b-door->c matches.
  const found = ss.isomorphisms.map(i => [i.assign.x, i.assign.y])
  assert.deepStrictEqual(found, [['b', 'c']])
})

test('SubgraphSearch: distinct pattern nodes map to distinct host nodes', () => {
  // Two-node pattern with no edge; host has one node with self-loop.
  // x and y must map to DIFFERENT host nodes; can't both land on the single node.
  const host = makeGraph(['a'])
  const sub = makeGraph(['x', 'y'])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 0)
})

test('SubgraphSearch: symmetric two-node pattern produces two matches on an edge', () => {
  // Pattern has no edge; host has one edge. Pattern can map either way.
  const host = makeGraph(['a', 'b'], [['a', 'b']])
  const sub = makeGraph(['x', 'y'])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 2)
})

test('SubgraphSearch: a->b->c pattern finds all length-2 paths in host', () => {
  const host = makeGraph(['a', 'b', 'c', 'd'], [
    ['a', 'b'], ['b', 'c'], ['c', 'd'], ['a', 'd']
  ])
  const sub = makeGraph(['x', 'y', 'z'], [['x', 'y'], ['y', 'z']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  const paths = ss.isomorphisms
    .map(i => [i.assign.x, i.assign.y, i.assign.z])
    .sort((p, q) => p.join() < q.join() ? -1 : 1)
  // a-b-c and b-c-d are the 2-edge chains.
  assert.deepStrictEqual(paths, [['a', 'b', 'c'], ['b', 'c', 'd']])
})

test('SubgraphSearch: match object exposes assign, label, match, edgeMatch', () => {
  const host = makeGraph([['a', 'room'], ['b', 'key']], [['a', 'b', 'path']])
  const sub = makeGraph([['x', 'room'], ['y', 'key']], [['x', 'y', 'path']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 1)
  const m = ss.isomorphisms[0]
  assert.deepStrictEqual(m.assign, { x: 'a', y: 'b' })
  assert.strictEqual(m.label.x, 'room')
  assert.strictEqual(m.label.y, 'key')
  assert.ok(m.match.x)
  assert.ok(m.match.y)
  assert.ok(Array.isArray(m.edgeMatch))
  assert.strictEqual(m.edgeMatch.length, 1)
})

test('SubgraphSearch: separate nodeLabelMatch and edgeLabelMatch callbacks are used', () => {
  const calls = { node: 0, edge: 0 }
  const nodeLabelMatch = (g, s) => { calls.node++; return simpleLabelMatch(g, s) }
  const edgeLabelMatch = (g, s) => { calls.edge++; return simpleLabelMatch(g, s) }
  const host = makeGraph([['a', 'x'], ['b', 'y']], [['a', 'b', 'e']])
  const sub = makeGraph([['u', 'x'], ['v', 'y']], [['u', 'v', 'e']])
  const ss = new SubgraphSearch(host, sub, { nodeLabelMatch, edgeLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 1)
  assert.ok(calls.node > 0, 'node label callback used')
  assert.ok(calls.edge > 0, 'edge label callback used')
})

test('SubgraphSearch: repeated search is deterministic', () => {
  const host = makeGraph(['a', 'b', 'c', 'd'], [['a', 'b'], ['b', 'c'], ['c', 'd']])
  const sub = makeGraph(['x', 'y'], [['x', 'y']])
  const r1 = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch }).isomorphisms
  const r2 = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch }).isomorphisms
  const norm = r => r.map(i => [i.assign.x, i.assign.y]).sort()
  assert.deepStrictEqual(norm(r1), norm(r2))
  assert.strictEqual(r1.length, 3)
})

test('SubgraphSearch: four-node square pattern', () => {
  // Host is a 2x2 grid with both diagonals; pattern is a directed 4-cycle.
  const host = makeGraph(['a', 'b', 'c', 'd'],
    [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a']])
  const sub = makeGraph(['w', 'x', 'y', 'z'],
    [['w', 'x'], ['x', 'y'], ['y', 'z'], ['z', 'w']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 4)  // four rotations of the cycle
})

test('SubgraphSearch: disconnected pattern on disconnected host', () => {
  const host = makeGraph(['a', 'b', 'c', 'd'], [['a', 'b'], ['c', 'd']])
  const sub = makeGraph(['p', 'q', 'r', 's'], [['p', 'q'], ['r', 's']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  // Two components, each a two-node path; can match in two ways
  // (component p-q -> a-b, r-s -> c-d) or (p-q -> c-d, r-s -> a-b).
  assert.strictEqual(ss.isomorphisms.length, 2)
})

test('SubgraphSearch: self-loop in pattern requires self-loop in host', () => {
  const host = makeGraph(['a', 'b'], [['a', 'a'], ['a', 'b']])
  const sub = makeGraph(['x'], [['x', 'x']])
  const ss = new SubgraphSearch(host, sub, { labelMatch: simpleLabelMatch })
  assert.strictEqual(ss.isomorphisms.length, 1)
  assert.strictEqual(ss.isomorphisms[0].assign.x, 'a')
})
