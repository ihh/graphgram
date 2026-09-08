// Tests for the clue engine.
//
// The properties that matter here are not "does it run" but "is the puzzle it
// emits actually fair": exactly one solution, no redundant clue, and — when
// asked for — reachable without guessing. Each of those is checkable by brute
// force at these sizes, and each is checked independently of the generator, so
// a bug in the generator cannot hide behind a bug in its own bookkeeping.

const test = require('node:test')
const assert = require('node:assert')
const MT = require('mersennetwister')
const h = require('../hallmarks')

function rngFor (seed) {
  const mt = new MT(seed)
  return function () { return mt.rnd() }
}

test('hallmarks: enumerateMatchings produces n! distinct permutations', () => {
  const fact = [1, 1, 2, 6, 24, 120]
  for (let n = 1; n <= 5; n++) {
    const ms = h.enumerateMatchings(n)
    assert.strictEqual(ms.length, fact[n], 'n=' + n)
    const keys = new Set(ms.map(m => m.join(',')))
    assert.strictEqual(keys.size, fact[n], 'all distinct at n=' + n)
    ms.forEach(m => assert.strictEqual(new Set(m).size, n, 'a permutation'))
  }
})

test('hallmarks: sampleHallmarks draws identifying axes without replacement', () => {
  const hs = h.sampleHallmarks(rngFor(11), 5)
  assert.strictEqual(hs.length, 5)
  // transgression and material identify a lock, so duplicates would make any
  // clue phrased over them ambiguous.
  assert.strictEqual(new Set(hs.map(x => x.transgression)).size, 5)
  assert.strictEqual(new Set(hs.map(x => x.material)).size, 5)
  // register is drawn WITH replacement on purpose: an axis on which locks can
  // coincide is what gives the relational clues anything to say.
  hs.forEach(x => assert.ok(h.REGISTERS.some(r => r.id === x.register)))
})

test('hallmarks: sampleHallmarks refuses to draw more values than exist', () => {
  assert.throws(() => h.sampleHallmarks(rngFor(1), h.TRANSGRESSIONS.length + 1))
})

test('hallmarks: sampling is a pure function of the seed', () => {
  const a = h.sampleHallmarks(rngFor(7), 4)
  const b = h.sampleHallmarks(rngFor(7), 4)
  assert.deepStrictEqual(a, b)
  const c = h.sampleHallmarks(rngFor(8), 4)
  assert.notDeepStrictEqual(a, c)
})

test('hallmarks: clue evaluation matches its stated semantics', () => {
  const locks = [
    { register: 'disgrace', material: 'brass' },
    { register: 'disgrace', material: 'iron' },
    { register: 'ruin', material: 'bone' }
  ]
  const m = [2, 0, 1]   // key 0 -> lock 2, key 1 -> lock 0, key 2 -> lock 1

  assert.ok(h.holds(h.is(0, 2), m, locks))
  assert.ok(!h.holds(h.is(0, 1), m, locks))
  assert.ok(h.holds(h.not(0, 1), m, locks))

  assert.ok(h.holds(h.either([[0, 1], [1, 0]]), m, locks), 'second disjunct true')
  assert.ok(!h.holds(h.either([[0, 1], [1, 2]]), m, locks), 'neither true')

  // A conditional with a false antecedent is vacuously true — the usual
  // material implication, and the usual trap for anyone writing these by hand.
  assert.ok(h.holds(h.ifThen([0, 1], [1, 2]), m, locks), 'false antecedent')
  assert.ok(!h.holds(h.ifThen([0, 2], [1, 2]), m, locks), 'true antecedent, false consequent')

  // keys 1 and 2 land on locks 0 and 1, which share a register.
  assert.ok(h.holds(h.attrEq(1, 2, 'register'), m, locks))
  assert.ok(!h.holds(h.attrEq(1, 2, 'material'), m, locks))
  assert.ok(h.holds(h.attrNe(1, 2, 'material'), m, locks))
})

test('hallmarks: holds() rejects an unknown clue op rather than silently passing', () => {
  assert.throws(() => h.holds({ op: 'nonsense' }, [0], [{}]), /unknown clue op/)
})

// --- the properties that make a puzzle fair ------------------------------

// Run every generated puzzle through an independent check rather than trusting
// the generator's own accounting.
function auditPuzzle (p, n) {
  const all = h.enumerateMatchings(n)

  const surviving = h.consistent(p.clues, all, p.lockHallmarks)
  assert.strictEqual(surviving.length, 1, 'exactly one matching survives the clues')
  assert.deepStrictEqual(surviving[0], p.hidden, 'the survivor is the hidden matching')

  // Minimal: drop any one clue and uniqueness must break. A clue that can be
  // dropped is a clue that tells the solver nothing they did not already have,
  // and padding is worse than absence — it hides which deductions were load
  // bearing.
  p.clues.forEach(function (_, i) {
    const without = p.clues.filter(function (_, j) { return j !== i })
    const k = h.consistent(without, all, p.lockHallmarks).length
    assert.ok(k > 1, 'clue ' + i + ' is load bearing (without it ' + k + ' survive)')
  })

  // Every clue must be TRUE of the hidden matching. A false clue makes the
  // puzzle unsolvable rather than hard, and that failure is invisible until a
  // player hits it.
  p.clues.forEach(function (c, i) {
    assert.ok(h.holds(c, p.hidden, p.lockHallmarks), 'clue ' + i + ' is true of the answer')
  })
}

test('hallmarks: generated puzzles are unique, minimal and truthful', () => {
  for (const n of [3, 4, 5]) {
    let built = 0
    for (let s = 0; s < 25; s++) {
      const p = h.buildMatchingPuzzle(rngFor(9000 + s * 17 + n), n)
      if (!p) continue
      built++
      auditPuzzle(p, n)
    }
    assert.ok(built >= 20, 'most seeds yield a puzzle at n=' + n + ' (got ' + built + '/25)')
  }
})

test('hallmarks: requireDirect only returns puzzles solvable without guessing', () => {
  for (let s = 0; s < 20; s++) {
    const p = h.buildMatchingPuzzle(rngFor(4000 + s), 4, { requireDirect: true, noDirect: true })
    if (!p) continue
    assert.strictEqual(p.verdict.direct, true)
    assert.strictEqual(p.verdict.style, 'direct-elimination')
    auditPuzzle(p, 4)
  }
})

test('hallmarks: noDirect bans the clues that give a cell away outright', () => {
  for (let s = 0; s < 15; s++) {
    const p = h.buildMatchingPuzzle(rngFor(500 + s), 4, { noDirect: true })
    if (!p) continue
    p.clues.forEach(c => assert.notStrictEqual(c.op, 'is', 'no bare "key k opens lock l" clue'))
  }
})

test('hallmarks: solveByPropagation reports non-unique clue sets rather than guessing', () => {
  const locks = h.sampleHallmarks(rngFor(3), 4)
  // A single weak clue leaves many matchings alive.
  const verdict = h.solveByPropagation([h.not(0, 0)], 4, locks)
  assert.strictEqual(verdict.solved, false)
  assert.match(verdict.reason, /solutions/)
})

test('hallmarks: puzzle generation is a pure function of the seed', () => {
  const a = h.buildMatchingPuzzle(rngFor(1234), 4)
  const b = h.buildMatchingPuzzle(rngFor(1234), 4)
  assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)))
})

test('hallmarks: affinity reports shared and conflicting axes without deciding the match', () => {
  const k = { transgression: 'lust', material: 'brass', register: 'ruin' }
  const l = { transgression: 'lust', material: 'iron', register: 'ruin' }
  const a = h.affinity(k, l)
  assert.deepStrictEqual(a.shared.sort(), ['register', 'transgression'])
  assert.deepStrictEqual(a.conflicting, ['material'])
  assert.strictEqual(a.nearMiss, true)
  // Crucially: no `opens` field. Attribute equality is evidence, not a verdict —
  // whether a key opens a lock is the hidden matching's business.
  assert.strictEqual(a.opens, undefined)
})

test('hallmarks: nothing in the module reaches for Math.random', () => {
  // Strip comments first: the header prose says the words "Math.random" while
  // explaining why the code must not, and a check that cannot tell those apart
  // would punish documenting the invariant.
  const src = require('fs').readFileSync(require.resolve('../hallmarks.js'), 'utf-8')
    .replace(/^\s*\/\/.*$/gm, '')
  assert.ok(!/Math\.random/.test(src),
    'the seed must determine everything, or a "daily" puzzle is not shareable')
})
