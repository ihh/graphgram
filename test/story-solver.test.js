// Tests for the winnability analysis.
//
// The point of this module is to catch a class of bug that every other check
// misses, so the tests are mostly hand-built broken stories: a valid IR that
// describes an unplayable map. If the solver cannot tell those from the working
// version, it is not earning its place.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const { analyzeStory, shortestSolution, evalCondition } = require('../story-solver')
const { validateStoryIR } = require('../story-ir')

const FIXTURE = path.join(__dirname, 'fixtures', 'story-ir.sample.json')
function fixture () { return JSON.parse(fs.readFileSync(FIXTURE, 'utf-8')) }

// A minimal three-passage story: start -> middle -> end, with the middle
// granting a key that the last link requires. Deliberately tiny so that each
// mutation below isolates one failure mode.
function tinyStory (mutate) {
  const ir = {
    irVersion: 1,
    meta: { title: 'Tiny', id: 'tiny', seed: 1, theme: 't', grammar: 'x',
            generator: 'test', topology: 'dag', puzzles: true, budget: {} },
    vars: [
      { name: 'has_k', kind: 'item', ref: 'k', init: false },
      { name: 'hp', kind: 'number', ref: null, init: 100 }
    ],
    items: [{ id: 'k', var: 'has_k', name: 'the key', description: { first: 'a key' } }],
    passages: [
      { id: 'P_start', hostId: '1', nodeId: 'start', type: 'start', role: 'start',
        title: 'Start', text: { first: 'here' }, status: null, onEnter: [],
        links: ['L_a'], tags: [] },
      { id: 'P_mid', hostId: '2', nodeId: 'mid', type: 'key', role: 'item',
        title: 'Middle', text: { first: 'a key lies here' }, status: null,
        onEnter: [{ op: 'acquire', item: 'k' }], links: ['L_b'], tags: [] },
      { id: 'P_end', hostId: '3', nodeId: 'win', type: 'win', role: 'ending',
        title: 'End', text: { first: 'done' }, status: null, onEnter: [],
        links: [], tags: [] }
    ],
    links: [
      { id: 'L_a', edgeId: 'ea', from: 'P_start', to: 'P_mid', type: 'path',
        kind: 'choice', weight: 1, linkText: { first: 'on' }, text: { first: '' },
        closedText: null, condition: null, whenBlocked: 'show', onTraverse: [] },
      { id: 'L_b', edgeId: 'eb', from: 'P_mid', to: 'P_end', type: 'path',
        kind: 'choice', weight: 1, linkText: { first: 'unlock' }, text: { first: '' },
        closedText: null, condition: { all: [{ var: 'has_k', is: true }] },
        whenBlocked: 'show', onTraverse: [] }
    ],
    start: 'P_start',
    endings: ['P_end']
  }
  if (mutate) mutate(ir)
  return ir
}

test('story-solver: a working story is winnable and fully reachable', () => {
  const ir = tinyStory()
  assert.deepStrictEqual(validateStoryIR(ir), [], 'the fixture itself is valid IR')
  const r = analyzeStory(ir)
  assert.strictEqual(r.winnable, true)
  assert.deepStrictEqual(r.endingsReached, ['P_end'])
  assert.strictEqual(r.reachedCount, 3)
  assert.deepStrictEqual(r.deadLinks, [])
  assert.deepStrictEqual(r.unreachablePassages, [])
})

test('story-solver: a lock guarding its own key is caught', () => {
  // Move the key BEHIND the door it opens. This is the canonical generator bug
  // and the reason the module exists: the IR stays perfectly valid, because
  // every link points somewhere and every variable is declared. Only the
  // composition is broken.
  const ir = tinyStory(function (ir) {
    ir.passages[1].onEnter = []                      // middle no longer grants it
    ir.passages[2].onEnter = [{ op: 'acquire', item: 'k' }]  // the end does
  })
  assert.deepStrictEqual(validateStoryIR(ir), [], 'still structurally valid — that is the point')
  const r = analyzeStory(ir)
  assert.strictEqual(r.winnable, false)
  assert.deepStrictEqual(r.deadLinks.map(d => d.id), ['L_b'])
  assert.deepStrictEqual(r.unreachablePassages, ['P_end'])
})

test('story-solver: a condition on a variable nothing can set is reported', () => {
  // A prereq naming an edgeId that some other rule split away. The gate is not
  // merely closed; it is unopenable, and that is a different diagnosis worth
  // printing differently.
  const ir = tinyStory(function (ir) {
    ir.vars.push({ name: 'took_ghost', kind: 'traversed', ref: 'ghost', init: false })
    ir.links[1].condition = { all: [{ var: 'took_ghost', is: true }] }
  })
  const r = analyzeStory(ir)
  assert.strictEqual(r.winnable, false)
  assert.deepStrictEqual(r.danglingRefs, [{ link: 'L_b', variable: 'took_ghost' }])
})

test('story-solver: a reachable death ending does not count as winning', () => {
  // dagKeyLock's consolation sink is `role: death`. Counting it as a win would
  // report an unwinnable map as fine — which is exactly what happened before
  // story-ir mapped the `loss` node type onto the death role.
  const ir = tinyStory(function (ir) {
    ir.passages[2].role = 'death'
    ir.passages[2].type = 'death'
  })
  const r = analyzeStory(ir)
  assert.strictEqual(r.winnable, false, 'no non-death ending exists')
  // It is reachable — the player can walk right into it. That is precisely why
  // reachability alone is the wrong verdict, and why the two lists are separate.
  assert.deepStrictEqual(r.deathsReached, ['P_end'])
  assert.deepStrictEqual(r.endingsReached, [])
})

test('story-solver: shortest solution counts link traversals', () => {
  const s = shortestSolution(tinyStory())
  assert.strictEqual(s.found, true)
  assert.strictEqual(s.length, 2)
  assert.deepStrictEqual(s.path, ['L_a', 'L_b'])
})

test('story-solver: shortest solution says so when there is no route', () => {
  const s = shortestSolution(tinyStory(function (ir) {
    ir.passages[1].onEnter = []
  }))
  assert.strictEqual(s.found, false)
  assert.match(s.reason, /no winning route/)
})

test('story-solver: the shortest route detours for a key rather than ignoring it', () => {
  // start -> hall -> end (locked), and hall -> vault -> hall for the key. The
  // naive shortest path is 2 moves; the real one is 4, because the gate forces
  // the detour. Getting this wrong would make every difficulty metric built on
  // the number meaningless.
  const ir = tinyStory(function (ir) {
    ir.passages[1].onEnter = []
    ir.passages.push({
      id: 'P_vault', hostId: '4', nodeId: 'vault', type: 'key', role: 'item',
      title: 'Vault', text: { first: 'the key' }, status: null,
      onEnter: [{ op: 'acquire', item: 'k' }], links: ['L_back'], tags: []
    })
    ir.passages[1].links = ['L_b', 'L_down']
    ir.links.push(
      { id: 'L_down', edgeId: 'ed', from: 'P_mid', to: 'P_vault', type: 'path',
        kind: 'choice', weight: 1, linkText: { first: 'down' }, text: { first: '' },
        closedText: null, condition: null, whenBlocked: 'show', onTraverse: [] },
      { id: 'L_back', edgeId: 'eu', from: 'P_vault', to: 'P_mid', type: 'backtrack',
        kind: 'choice', weight: 1, linkText: { first: 'up' }, text: { first: '' },
        closedText: null, condition: null, whenBlocked: 'show', onTraverse: [] })
    ir.meta.topology = 'bidirectional'
  })
  assert.deepStrictEqual(validateStoryIR(ir), [])
  const s = shortestSolution(ir)
  assert.strictEqual(s.found, true)
  assert.strictEqual(s.length, 4, 'start, down, back, unlock')
  assert.deepStrictEqual(s.path, ['L_a', 'L_down', 'L_back', 'L_b'])
})

test('story-solver: the golden fixture is winnable', () => {
  const ir = fixture()
  const r = analyzeStory(ir)
  assert.strictEqual(r.winnable, true)
  assert.ok(r.endingsReached.indexOf('P_vault') >= 0)
  const s = shortestSolution(ir)
  assert.strictEqual(s.found, true)
  // start -> nave -> crypt(key) -> nave -> door -> vault
  assert.strictEqual(s.length, 5)
})

// --- the condition language ---------------------------------------------

test('story-solver: condition evaluation is exact on booleans', () => {
  const F = new Set(['a'])
  const N = new Set()
  const v = c => evalCondition(c, F, N)
  assert.strictEqual(v(null).value, true)
  assert.strictEqual(v({ var: 'a', is: true }).value, true)
  assert.strictEqual(v({ var: 'b', is: true }).value, false)
  assert.strictEqual(v({ var: 'b', is: false }).value, true)
  assert.strictEqual(v({ all: [{ var: 'a', is: true }, { var: 'b', is: true }] }).value, false)
  assert.strictEqual(v({ any: [{ var: 'a', is: true }, { var: 'b', is: true }] }).value, true)
  assert.ok(!v({ var: 'a', is: true }).assumed, 'boolean answers are not assumptions')
})

test('story-solver: numeric and negated conditions are flagged as assumptions', () => {
  // The honest half of the module. `hp > 0` cannot be decided without searching
  // the numeric state space, so it is answered optimistically and recorded. A
  // caller reading "winnable: yes" needs to know which gates that rested on.
  const N = new Set(['hp'])
  const r1 = evalCondition({ var: 'hp', gt: 0 }, new Set(), N)
  assert.strictEqual(r1.value, true)
  assert.strictEqual(r1.assumed, true)

  const r2 = evalCondition({ not: { var: 'a', is: true } }, new Set(), N)
  assert.strictEqual(r2.value, true)
  assert.strictEqual(r2.assumed, true, 'negation breaks the monotonicity the fixpoint relies on')
})

test('story-solver: assumptions made during analysis are surfaced', () => {
  const ir = tinyStory(function (ir) {
    ir.links[1].condition = { all: [{ var: 'hp', gt: 50 }] }
  })
  const r = analyzeStory(ir)
  assert.strictEqual(r.winnable, true, 'optimistic on the numeric gate')
  assert.ok(r.assumptions.length > 0, 'and says so')
  assert.strictEqual(r.assumptions[0].link, 'L_b')
})
