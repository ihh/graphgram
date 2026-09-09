// Tests for the embedding — where the social map lands on the physical one.
//
// The invariants worth pinning here are the ones the spec states as
// requirements (docs/spec/two-layer-mystery.md §5): the placement order is a
// topological order of provenance, the result never deadlocks, and generation
// is a pure function of the seed. The numbers — how far apart the layers
// actually end up — are a design target rather than a law, so they are
// characterised rather than asserted tight, in the style of mystery-cast's
// distribution tests: a bound loose enough to be true, printed precisely enough
// to notice when it moves.

const test = require('node:test')
const assert = require('node:assert')
const MT = require('mersennetwister')
const { Grammar } = require('./helpers')
const dp = require('../dungeon-primitives')
const mp = require('../mystery-primitives')
const cast = require('../mystery-cast')
const embed = require('../mystery-embed')

function rngFor (seed) {
  const mt = new MT(seed)
  return function () { return mt.rnd() }
}

// The geographic layer alone — spec §5 step 2, the ordinary dungeon primitives
// with nobody in the house yet. Deliberately not mystery-daily's grammar: the
// point of the two-layer architecture is that this stands up without the cast.
function house (seed, rooms) {
  return new Grammar({
    name: 'house',
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      { name: 'scenes',
        limit: Math.max(2, (rooms || 8) - 1),
        rules: [
          dp.midpointRoom({ roomType: mp.NODE_SCENE, weight: 2 }),
          dp.parallelPath({ roomType: mp.NODE_SCENE, weight: 2 }),
          dp.deadEnd({ deadEndType: mp.NODE_SCENE, weight: 1 })
        ] }
    ]
  }).evolve({ seed: seed }).graph
}

function embedFor (seed, opts) {
  opts = opts || {}
  const rnd = rngFor(seed)
  const g = house(seed, opts.rooms)
  const c = cast.buildCast(rnd, { size: opts.size || 5 })
  return { graph: g, cast: c, embedding: embed.embedCast(g, c, rnd, opts) }
}

test('mystery-embed: placement follows a topological order of provenance', () => {
  for (let s = 0; s < 40; s++) {
    const { cast: c, embedding } = embedFor(s)
    const seen = new Set()
    const holderOf = {}
    c.provenance.forEach(function (e) { holderOf[e.subject] = e.holder })
    embedding.order.forEach(function (id) {
      const h = holderOf[id]
      if (h) assert.ok(seen.has(h), 'seed ' + s + ': ' + id + ' placed before holder ' + h)
      seen.add(id)
    })
    assert.strictEqual(embedding.order.length, c.people.length, 'seed ' + s)
  }
})

test('mystery-embed: no lock guards its own key, across seeds', () => {
  // Spec §5 step 4. Placing along the approval order is supposed to make this
  // a formality; that is exactly what makes it worth asserting, since a
  // formality is the kind of check that quietly stops holding.
  for (let s = 0; s < 60; s++) {
    const { graph, cast: c, embedding } = embedFor(s)
    assert.deepStrictEqual(embed.verifyEmbedding(graph, c, embedding), [], 'seed ' + s)
  }
})

test('mystery-embed: a physical lock the player cannot yet open is caught', () => {
  // The formality has teeth as soon as the map layer gates a doorway. Shut
  // every edge behind a key nobody holds and the check must fail rather than
  // wave the layout through — otherwise it is only ever testing that the
  // reachability code runs.
  const { graph, cast: c, embedding } = embedFor(3)
  const problems = embed.verifyEmbedding(graph, c, embedding, {
    lockedEdges: function () { return 'phys_never_held' }
  })
  assert.ok(problems.length > 0, 'a fully locked house should not verify')
  assert.ok(problems.some(function (p) { return /not reachable/.test(p) }), problems.join('; '))
})

test('mystery-embed: root secrets never share a room', () => {
  // The failure this exists to prevent: three at-large secrets in one drawer is
  // one trip that hands the player the whole opening move.
  for (let s = 0; s < 60; s++) {
    const { embedding } = embedFor(s)
    const rooms = Object.keys(embedding.sigma).map(function (k) { return embedding.sigma[k] })
    assert.strictEqual(new Set(rooms).size, rooms.length, 'seed ' + s + ': ' + rooms.join(','))
  }
})

test('mystery-embed: nobody stands where their own secret is found', () => {
  // A separation of zero is the degenerate case in the most literal way: the
  // key is in the lock.
  for (let s = 0; s < 60; s++) {
    const { embedding } = embedFor(s)
    embedding.separations.forEach(function (sep) {
      assert.ok(sep.hops >= 1, 'seed ' + s + ': ' + sep.subject + ' at ' + sep.hops + ' hops')
    })
  }
})

test('mystery-embed: generation is a pure function of the seed', () => {
  for (let s = 0; s < 20; s++) {
    const a = embedFor(s).embedding
    const b = embedFor(s).embedding
    assert.deepStrictEqual(a.phi, b.phi, 'seed ' + s)
    assert.deepStrictEqual(a.sigma, b.sigma, 'seed ' + s)
  }
})

test('mystery-embed: nothing in the module reaches for Math.random', () => {
  const src = require('fs').readFileSync(require.resolve('../mystery-embed.js'), 'utf-8')
  assert.ok(!/Math\.random/.test(src), 'mystery-embed must take its randomness by injection')
})

test('mystery-embed: a cyclic provenance relation is refused, not looped on', () => {
  const cyclic = {
    people: [{ id: 'a' }, { id: 'b' }],
    provenance: [{ subject: 'a', holder: 'b' }, { subject: 'b', holder: 'a' }]
  }
  assert.throws(function () { embed.provenanceOrder(cyclic) }, /cyclic/)
})

test('mystery-embed: a house in two pieces is refused', () => {
  // Separations measured across a gap are not walks, and the search would
  // happily maximise them — so this must be an error rather than a high score.
  const g = house(1)
  g.setNode('ISLAND', { type: mp.NODE_SCENE })
  const rnd = rngFor(1)
  const c = cast.buildCast(rnd, { size: 5 })
  assert.throws(function () { embed.embedCast(g, c, rnd) }, /disconnected/)
})

test('mystery-embed: roomGraph sees only rooms, and sees them undirected', () => {
  const g = house(7)
  const rg = embed.roomGraph(g)
  assert.ok(rg.rooms.length > 0)
  rg.rooms.forEach(function (n) {
    assert.ok(embed.DEFAULT_ROOM_TYPES.indexOf((g.node(n) || {}).type) >= 0)
  })
  rg.rooms.forEach(function (a) {
    rg.adj[a].forEach(function (b) {
      assert.ok(rg.adj[b].has(a), 'adjacency must be symmetric: ' + a + '/' + b)
      assert.strictEqual(rg.dist[a][b], 1)
    })
  })
})

test('mystery-embed: renderEmbedding produces something a person can read', () => {
  const { cast: c, embedding } = embedFor(42)
  const text = embed.renderEmbedding(c, embedding)
  assert.match(text, /separation floor/)
  c.people.forEach(function (p) {
    assert.ok(text.indexOf(p.fullName) >= 0, 'missing ' + p.fullName)
  })
})

test('mystery-embed: characterise the separation the layers actually achieve', () => {
  // The number this whole module exists to move. Before it, socialLock put
  // every key exactly 2 hops from its lock, on every seed, with zero variance.
  // These bounds are loose on purpose — the ceiling is the diameter of the
  // house, which the room budget sets, not this module.
  const hops = []
  const floors = []
  for (let s = 0; s < 60; s++) {
    const { embedding } = embedFor(s)
    embedding.separations.forEach(function (sep) { hops.push(sep.hops) })
    floors.push(embedding.score.floor)
  }
  const mean = hops.reduce(function (a, b) { return a + b }, 0) / hops.length
  const spread = new Set(hops).size

  assert.ok(mean > 2, 'mean separation should beat the old constant 2, got ' + mean.toFixed(2))
  assert.ok(spread >= 2, 'separations should vary, got ' + spread + ' distinct values')
  assert.ok(Math.min.apply(null, floors) >= 1, 'floors: ' + floors.join(','))
})
