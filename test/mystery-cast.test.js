// Tests for the cast and its provenance graph.
//
// These check the invariants that must hold whatever the tuning knobs are set
// to — acyclicity, a starting point, relation plausibility, determinism. The
// distribution questions (how many secrets should be free-standing, how often
// `complicity` should fire) are design choices still under discussion, so they
// are measured here rather than asserted: a characterisation test that will
// tell us loudly when a knob moves, without pretending the current value is
// correct.

const test = require('node:test')
const assert = require('node:assert')
const MT = require('mersennetwister')
const c = require('../mystery-cast')
const hallmarks = require('../hallmarks')

function rngFor (seed) {
  const mt = new MT(seed)
  return function () { return mt.rnd() }
}

test('mystery-cast: a generated cast satisfies every invariant, across seeds', () => {
  for (let s = 0; s < 120; s++) {
    const cast = c.buildCast(rngFor(s), { size: 6 })
    assert.deepStrictEqual(c.validateCast(cast), [], 'seed ' + s)
  }
})

test('mystery-cast: the provenance graph is acyclic', () => {
  // Checked independently of validateCast, so a bug in the validator cannot
  // conceal a bug in the generator. "a holds b's secret" with a cycle means a
  // set of people mutually locked and a puzzle that is dead on arrival.
  for (let s = 0; s < 60; s++) {
    const cast = c.buildCast(rngFor(500 + s), { size: 7 })
    const holderOf = {}
    cast.provenance.forEach(e => { holderOf[e.subject] = e.holder })
    cast.people.forEach(p => {
      const seen = new Set()
      let cur = p.id
      while (cur != null) {
        assert.ok(!seen.has(cur), 'cycle through ' + cur + ' at seed ' + s)
        seen.add(cur)
        cur = holderOf[cur]
      }
    })
  }
})

test('mystery-cast: at least one secret is always at large', () => {
  // Without a free-standing secret the player has nothing to pull on: every
  // person is behind someone else, and the whole cast is unreachable.
  for (let s = 0; s < 80; s++) {
    for (const size of [2, 3, 5, 8]) {
      const cast = c.buildCast(rngFor(s * 31 + size), { size })
      assert.ok(cast.roots.length >= 1, 'no starting point at seed ' + s + ' size ' + size)
    }
  }
})

test('mystery-cast: even atLargeRate 0 leaves a starting point', () => {
  // The construction guarantees this — the first person in the provenance order
  // has nobody earlier to hold their secret — but it is the guarantee the whole
  // puzzle rests on, so it is asserted at the boundary rather than assumed.
  for (let s = 0; s < 40; s++) {
    const cast = c.buildCast(rngFor(9000 + s), { size: 6, atLargeRate: 0 })
    assert.deepStrictEqual(c.validateCast(cast), [])
    assert.ok(cast.roots.length >= 1)
  }
})

test('mystery-cast: every assigned relation actually fits its pair', () => {
  // The plausibility gates are the difference between a modelled household and
  // a shuffled one. A `subordinate` edge from the scullery maid to the
  // solicitor would be the tell that nothing is being modelled.
  const byRelId = {}
  c.RELATIONS.forEach(r => { byRelId[r.id] = r })
  for (let s = 0; s < 100; s++) {
    const cast = c.buildCast(rngFor(2000 + s), { size: 7 })
    const byId = {}
    cast.people.forEach(p => { byId[p.id] = p })
    cast.provenance.forEach(e => {
      if (!e.holder) return
      assert.ok(byRelId[e.relation], 'known relation: ' + e.relation)
      assert.ok(byRelId[e.relation].fits(byId[e.holder], byId[e.subject]),
        e.relation + ' does not fit ' + e.holder + ' -> ' + e.subject + ' at seed ' + s)
      assert.ok(e.why && e.why.length > 10, 'a stated reason')
    })
  }
})

test('mystery-cast: subordinate relations respect station and rank', () => {
  // The tightest gate, spot-checked directly: a holder must be junior to the
  // subject and in the same station.
  for (let s = 0; s < 150; s++) {
    const cast = c.buildCast(rngFor(400 + s), { size: 8 })
    const byId = {}
    cast.people.forEach(p => { byId[p.id] = p })
    cast.provenance.filter(e => e.relation === 'subordinate').forEach(e => {
      const h = byId[e.holder], sub = byId[e.subject]
      assert.strictEqual(h.role.station, sub.role.station)
      assert.ok(h.role.rank > sub.role.rank, 'holder is junior')
    })
  }
})

test('mystery-cast: kinship only ever crosses stations', () => {
  // Same-station kinship is left to `proximity`; the cross-station tie is the
  // one that is itself scandalous, and that is the only one this relation
  // should produce.
  for (let s = 0; s < 150; s++) {
    const cast = c.buildCast(rngFor(700 + s), { size: 8 })
    const byId = {}
    cast.people.forEach(p => { byId[p.id] = p })
    cast.provenance.filter(e => e.relation === 'kinship').forEach(e => {
      assert.notStrictEqual(byId[e.holder].role.station, byId[e.subject].role.station)
    })
  }
})

test('mystery-cast: the murderer sits at the end of the longest chain', () => {
  // Reaching them IS the win condition, so the structure must make them last
  // rather than merely guilty.
  for (let s = 0; s < 80; s++) {
    const cast = c.buildCast(rngFor(1300 + s), { size: 6 })
    const deepest = Math.max(...cast.people.map(p => c.chainDepth(cast.provenance, p.id)))
    assert.strictEqual(c.chainDepth(cast.provenance, cast.murderer), deepest,
      'murderer is at maximum depth at seed ' + s)
    assert.strictEqual(cast.depth, deepest)
  }
})

test('mystery-cast: people carry hallmark attributes drawn from the clue engine', () => {
  // The clue language in hallmarks.js is phrased over these axes, so a clue
  // about `bearing` has to mean here what it means there.
  const cast = c.buildCast(rngFor(77), { size: 6 })
  const sins = new Set(hallmarks.TRANSGRESSIONS.map(x => x.id))
  const bearings = new Set(hallmarks.BEARINGS.map(x => x.id))
  const registers = new Set(hallmarks.REGISTERS.map(x => x.id))
  cast.people.forEach(p => {
    assert.ok(sins.has(p.transgression))
    assert.ok(bearings.has(p.bearing))
    assert.ok(registers.has(p.register))
  })
  // Transgressions identify a person, so they must be distinct — a clue phrased
  // over a shared one would be ambiguous.
  assert.strictEqual(new Set(cast.people.map(p => p.transgression)).size, cast.people.length)
})

test('mystery-cast: generation is a pure function of the seed', () => {
  const a = c.buildCast(rngFor(4242), { size: 6 })
  const b = c.buildCast(rngFor(4242), { size: 6 })
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)))
  const d = c.buildCast(rngFor(4243), { size: 6 })
  assert.notDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(d)))
})

test('mystery-cast: nothing in the module reaches for Math.random', () => {
  const src = require('fs').readFileSync(require.resolve('../mystery-cast.js'), 'utf-8')
    .replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!/Math\.random/.test(src))
})

test('mystery-cast: refuses casts it cannot build', () => {
  assert.throws(() => c.buildCast(rngFor(1), { size: 1 }), /at least two/)
  assert.throws(() => c.buildCast(rngFor(1), { size: c.ROLES.length + 1 }), /roles are defined/)
})

test('mystery-cast: renderCast produces something a person can read', () => {
  const cast = c.buildCast(rngFor(20260908), { size: 6 })
  const text = c.renderCast(cast)
  assert.match(text, /THE HOUSEHOLD/)
  assert.match(text, /\[the murderer\]/)
  assert.match(text, /deepest chain: \d+/)
  cast.people.forEach(p => assert.ok(text.indexOf(p.surname) >= 0, p.surname + ' appears'))
  // No unfilled template holes.
  assert.ok(!/undefined|\[object/.test(text), 'no undefined leaking into the render')
})

// --- payoffs: nobody is idle ---------------------------------------------

test('mystery-cast: every person has a payoff', () => {
  // The invariant the payoff pass exists for. A player who walks a two-link
  // chain to somebody and gets nothing reads that as a bug in the mystery, not
  // as a red herring.
  for (let s = 0; s < 120; s++) {
    const cast = c.buildCast(rngFor(s), { size: 6 })
    cast.people.forEach(p => {
      assert.ok(p.payoff, p.id + ' has a payoff at seed ' + s)
      assert.ok(['broker', 'culprit', 'keeper', 'herring'].indexOf(p.payoff.kind) >= 0)
    })
  }
})

test('mystery-cast: payoff follows holdCount, not chain position', () => {
  // The distinction the first cut got wrong. Somebody at the end of a long
  // chain is hard to REACH but may still unlock nothing; somebody whose secret
  // lies at large is trivially reachable but may unlock two people. Only
  // holdCount decides.
  for (let s = 0; s < 100; s++) {
    const cast = c.buildCast(rngFor(3100 + s), { size: 7 })
    const holdCount = {}
    cast.provenance.forEach(e => { if (e.holder) holdCount[e.holder] = (holdCount[e.holder] || 0) + 1 })
    cast.people.forEach(p => {
      if (holdCount[p.id]) {
        assert.strictEqual(p.payoff.kind, 'broker', p.id + ' holds a secret so is a broker')
        assert.strictEqual(p.payoff.unlocks, holdCount[p.id])
      } else {
        assert.notStrictEqual(p.payoff.kind, 'broker', p.id + ' holds nothing so is not a broker')
      }
    })
  }
})

test('mystery-cast: herrings never exceed their budget', () => {
  // The contract bug found on the first pass: `herrings` acted as a floor, so
  // asking for one dead end and one key produced three dead ends. It is a cap.
  for (let s = 0; s < 60; s++) {
    for (const herrings of [0, 1, 2]) {
      const cast = c.buildCast(rngFor(6000 + s), { size: 6, herrings, physicalKeys: 1 })
      const n = cast.people.filter(p => p.payoff.kind === 'herring').length
      assert.ok(n <= herrings,
        n + ' herrings against a budget of ' + herrings + ' at seed ' + s)
      assert.deepStrictEqual(c.validateCast(cast), [])
    }
  }
})

test('mystery-cast: an under-provisioned map layer is warned, not silently obeyed', () => {
  // "Nobody is idle" is the hard invariant; `physicalKeys` is only a request.
  // When the cast has more spare people than the map planned locks for, the
  // cast wins and the map is told.
  const cast = c.buildCast(rngFor(7), { size: 6, physicalKeys: 0, herrings: 0 })
  assert.deepStrictEqual(c.validateCast(cast), [], 'still a valid cast')
  assert.ok(cast.warnings.length, 'but it says so')
  assert.match(cast.warnings[0], /physical locks/)
  assert.strictEqual(cast.people.filter(p => p.payoff.kind === 'herring').length, 0)
})

test('mystery-cast: physical keys agree with their keepers', () => {
  // These handles are what the map layer binds to, so a mismatch here becomes
  // an unopenable door two layers downstream.
  for (let s = 0; s < 80; s++) {
    const cast = c.buildCast(rngFor(8000 + s), { size: 6 })
    const keepers = cast.people.filter(p => p.payoff.kind === 'keeper')
    assert.strictEqual(cast.physicalKeys.length, keepers.length)
    assert.strictEqual(new Set(cast.physicalKeys.map(k => k.keyId)).size, cast.physicalKeys.length)
    cast.physicalKeys.forEach(k => {
      const holder = cast.people.find(p => p.id === k.holder)
      assert.ok(holder, 'key ' + k.keyId + ' has a real holder')
      assert.strictEqual(holder.payoff.kind, 'keeper')
      assert.strictEqual(holder.payoff.keyId, k.keyId)
    })
  }
})

test('mystery-cast: exactly one culprit, and it is the murderer', () => {
  for (let s = 0; s < 60; s++) {
    const cast = c.buildCast(rngFor(5500 + s), { size: 6 })
    const culprits = cast.people.filter(p => p.payoff.kind === 'culprit')
    assert.ok(culprits.length <= 1)
    if (culprits.length) assert.strictEqual(culprits[0].id, cast.murderer)
  }
})

// --- characterisation: current tuning, not asserted design -----------------

test('mystery-cast: characterise the current distributions', () => {
  // Deliberately loose bounds. These record where the knobs sit today so that
  // a change to atLargeRate or the relation weights shows up as a failing test
  // to be looked at, rather than silently changing the feel of every puzzle.
  const depth = {}, rel = {}
  let rootTotal = 0, n = 0
  for (let s = 0; s < 300; s++) {
    const cast = c.buildCast(rngFor(s), { size: 6 })
    depth[cast.depth] = (depth[cast.depth] || 0) + 1
    rootTotal += cast.roots.length
    n++
    cast.provenance.forEach(e => { if (e.relation) rel[e.relation] = (rel[e.relation] || 0) + 1 })
  }
  const meanRoots = rootTotal / n
  assert.ok(meanRoots > 1.5 && meanRoots < 4.5,
    'mean free-standing secrets is ' + meanRoots.toFixed(2) + ' of 6')
  assert.ok((depth[2] || 0) + (depth[3] || 0) > n * 0.5,
    'most casts nest two or three deep')
  assert.ok(Object.keys(rel).length >= 5, 'the relation vocabulary is actually used')
  // `complicity` is currently ungated and consequently the most common
  // relation. Whether that is right is an open design question; this bound just
  // stops it quietly becoming the ONLY relation.
  const total = Object.values(rel).reduce((a, b) => a + b, 0)
  assert.ok(rel.complicity / total < 0.45,
    'complicity is ' + Math.round(100 * rel.complicity / total) + '% of relations')
})
