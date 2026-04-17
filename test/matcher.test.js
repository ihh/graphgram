// Tests for the Matcher label mini-language (labelMatch / evalMatchExpr / newLabel).

const test = require('node:test')
const assert = require('node:assert')
const { Matcher } = require('../index')

function m () { return new Matcher() }

// --- labelMatch: LHS label queries ---------------------------------------

test('labelMatch: undefined sLabel matches anything', () => {
  const r = m().labelMatch('anything', undefined)
  assert.deepStrictEqual(r, { match: 'anything' })
})

test('labelMatch: string literal matches equal string', () => {
  assert.ok(m().labelMatch('hello', 'hello'))
  assert.ok(!m().labelMatch('hello', 'world'))
})

test('labelMatch: string is a regex anchored ^...$', () => {
  // Raw string LHS is treated as a regex.
  assert.ok(m().labelMatch('foo123', 'foo\\d+'))
  // Anchored: partial match should fail.
  assert.ok(!m().labelMatch('xfoobar', 'foo'))
})

test('labelMatch: regex capture groups appear in match array', () => {
  const r = m().labelMatch('pair_42', '(pair_.*)')
  assert.ok(r)
  assert.strictEqual(r.match[0], 'pair_42')
  assert.strictEqual(r.match[1], 'pair_42')
})

test('labelMatch: type mismatch fails', () => {
  assert.ok(!m().labelMatch(42, '42'))
  assert.ok(!m().labelMatch({ a: 1 }, 'a'))
})

test('labelMatch: object partial-match (containment by default)', () => {
  const r = m().labelMatch({ type: 'room', extra: 1 }, { type: 'room' })
  assert.ok(r)
  // `match.type` carries the regex exec result for the matched primitive.
  assert.deepStrictEqual(r.match.type, ['room'])
})

test('labelMatch: $equals is exact (rejects extra properties)', () => {
  assert.ok(!m().labelMatch({ type: 'room', extra: 1 }, { $equals: { type: 'room' } }))
  assert.ok(m().labelMatch({ type: 'room' }, { $equals: { type: 'room' } }))
})

test('labelMatch: $contains allows extra properties', () => {
  assert.ok(m().labelMatch({ type: 'room', extra: 1 }, { $contains: { type: 'room' } }))
})

test('labelMatch: $not negates', () => {
  assert.ok(!m().labelMatch('key', { $not: 'key' }))
  assert.ok(m().labelMatch('key', { $not: 'door' }))
})

test('labelMatch: $and requires all', () => {
  const sLabel = { $and: [{ type: 'key' }, { pairId: 'pair_1' }] }
  assert.ok(m().labelMatch({ type: 'key', pairId: 'pair_1' }, sLabel))
  assert.ok(!m().labelMatch({ type: 'key', pairId: 'pair_2' }, sLabel))
})

test('labelMatch: $or requires one', () => {
  const sLabel = { $or: ['key', 'door'] }
  assert.ok(m().labelMatch('key', sLabel))
  assert.ok(m().labelMatch('door', sLabel))
  assert.ok(!m().labelMatch('room', sLabel))
})

test('labelMatch: $test runs a user predicate', () => {
  const sLabel = { $test: '(l) => l && l.flag === true' }
  assert.ok(m().labelMatch({ flag: true }, sLabel))
  assert.ok(!m().labelMatch({ flag: false }, sLabel))
})

test('labelMatch: nested $not on object property', () => {
  const sLabel = { type: 'key', pairId: { $not: 'pair_2' } }
  assert.ok(m().labelMatch({ type: 'key', pairId: 'pair_1' }, sLabel))
  assert.ok(!m().labelMatch({ type: 'key', pairId: 'pair_2' }, sLabel))
})

test('labelMatch: arrays require length & element match', () => {
  assert.ok(m().labelMatch(['a', 'b'], ['a', 'b']))
  assert.ok(!m().labelMatch(['a', 'b', 'c'], ['a', 'b']))
})

test('labelMatch: $find does recursive descent', () => {
  const sLabel = { $find: { deep: 'value' } }
  assert.ok(m().labelMatch({ a: { b: { deep: 'value' } } }, sLabel))
})

test('labelMatch: regex capture on object property is retrievable from match', () => {
  // This is the pattern cycleCloseShortcut needs: capture a pairId from an existing key.
  const r = m().labelMatch({ type: 'key', pairId: 'pair_7' }, { pairId: '(pair_.*)' })
  assert.ok(r)
  // match is keyed by LHS property name; the captured group lives inside.
  assert.ok(r.match.pairId)
  assert.strictEqual(r.match.pairId[1], 'pair_7')
})

// --- evalMatchExpr: $eval & context -------------------------------------

test('evalMatchExpr: string is JS eval with $id and $$iter context', () => {
  // Note: baseContext keys already carry a leading $ (Context.updateIteration writes
  // '$iter'), and evalMatchExpr prepends another $ when declaring locals. So grammar
  // text uses $$iter to reference the iteration counter.
  const mm = m()
  mm.setBaseContext({ $iter: 3 })
  const isomorph = { assign: { a: 'h1' }, label: { a: 'room' }, match: { a: { match: ['room'] } } }
  assert.strictEqual(mm.evalMatchExpr(isomorph, '$$iter + 1'), 4)
  assert.strictEqual(mm.evalMatchExpr(isomorph, '$a.label'), 'room')
})

test('evalMatchExpr: pair_${iter+1} idiom used by keyDoor', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 0 })
  const isomorph = { assign: {}, label: {}, match: {} }
  assert.strictEqual(mm.evalMatchExpr(isomorph, '"pair_" + ($$iter + 1)'), 'pair_1')
})

test('evalMatchExpr: object is mapped recursively, strings are eval-ed', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 2 })
  const isomorph = { assign: { a: 'h1' }, label: { a: 'x' }, match: { a: { match: ['x'] } } }
  const r = mm.evalMatchExpr(isomorph, { type: { $eval: '"t" + $$iter' } })
  // evalMatchExpr doesn't specially recognize $eval (newLabel does). Every string value
  // inside the object is itself JS-evaled; the $eval *key* survives but its value is evaluated.
  assert.deepStrictEqual(r, { type: { $eval: 't2' } })
})

// --- newLabel: RHS label construction -----------------------------------

test('newLabel: template ${id.label} interpolation', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 0 })
  const isomorph = { assign: { a: 'h1' }, label: { a: 'room' }, match: { a: { match: ['room'] } } }
  assert.strictEqual(mm.newLabel(isomorph, 'prefix-${a.label}-suffix'), 'prefix-room-suffix')
})

test('newLabel: $eval evaluates inside an object label', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 4 })
  const isomorph = { assign: {}, label: {}, match: {} }
  const label = { $eval: '"pair_" + ($$iter + 1)' }
  assert.strictEqual(mm.newLabel(isomorph, label), 'pair_5')
})

test('newLabel: $assign merges objects without skipping undefined', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 0 })
  const isomorph = { assign: {}, label: {}, match: {} }
  const label = { $assign: [{ a: 1, b: 2 }, { b: 3, c: undefined }] }
  const out = mm.newLabel(isomorph, label)
  assert.strictEqual(out.a, 1)
  assert.strictEqual(out.b, 3)
  assert.ok('c' in out)
})

test('newLabel: $merge is recursive', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 0 })
  const isomorph = { assign: {}, label: {}, match: {} }
  const label = { $merge: [{ dot: { shape: 'diamond' } }, { dot: { color: 'red' } }] }
  const out = mm.newLabel(isomorph, label)
  assert.deepStrictEqual(out.dot, { shape: 'diamond', color: 'red' })
})

test('newLabel: nested $eval inside regular object gets expanded', () => {
  const mm = m()
  mm.setBaseContext({ $iter: 2 })
  const isomorph = { assign: {}, label: {}, match: {} }
  const label = { type: 'key', pairId: { $eval: '"pair_" + ($$iter + 1)' } }
  const out = mm.newLabel(isomorph, label)
  assert.deepStrictEqual(out, { type: 'key', pairId: 'pair_3' })
})

test('newLabel: template references an LHS regex capture', () => {
  // This is the mechanism cycleCloseShortcut relies on: regex-capture a pairId on LHS,
  // template it onto a new RHS edge.
  const mm = m()
  mm.setBaseContext({ $iter: 0 })
  const isomorph = {
    assign: { k: 'h3' },
    label: { k: { type: 'key', pairId: 'pair_7' } },
    // how labelMatch stores the captured property: k.match is the top-level match object,
    // keyed by object property name, containing the regex group array.
    match: { k: { match: { pairId: ['pair_7', 'pair_7'] } } }
  }
  assert.strictEqual(mm.newLabel(isomorph, '${k.match.pairId[1]}'), 'pair_7')
})

test('makeLabelEval / makeLabelUpdate produce the idiomatic $eval/$assign shapes', () => {
  const mm = m()
  assert.deepStrictEqual(mm.makeLabelEval('a'), { $eval: '$a.label' })
  assert.deepStrictEqual(mm.makeLabelUpdate('a', { flag: true }), {
    $assign: [{ $eval: '$a.label' }, { flag: true }]
  })
})

// --- integration: Grammar.validate is not part of this file; see grammar.test.js ---
