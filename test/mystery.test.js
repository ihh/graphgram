// End-to-end and unit tests for the murder-mystery track.
//
// The load-bearing assertion in this file is the nesting one. Everything
// else here checks that a mystery is well-formed; `nestingDepth` checks
// that it is a mystery at all — that the player really does have to make
// one person talk in order to get the leverage that makes the next person
// talk. A generator that produced five independent one-step locks would
// pass every other test in this file and be a quiz, not a case.

const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const path = require('path')
const graphlib = require('graphlib')
const { Grammar } = require('./helpers')
const mp = require('../mystery-primitives')
const themes = require('../themes')
const example = require('../examples/mystery-daily')

const CANONICAL_SEED = example.defaultSeeds[0]

function build (seed, opts) {
  return new Grammar(example.grammar(opts || {})).evolve({ seed }).graph
}

function nodesOfType (graph, type) {
  return graph.nodes()
    .map(n => ({ id: n, label: graph.node(n) || {} }))
    .filter(x => x.label.type === type)
}

function edgesOfType (graph, type) {
  return graph.edges()
    .map(e => ({ e, label: graph.edge(e) || {} }))
    .filter(x => x.label.type === type)
}

// --- determinism --------------------------------------------------------

test('mystery: the cast is a deterministic function of the seed', () => {
  const cast = seed => nodesOfType(build(seed), mp.NODE_SUSPECT)
    .map(x => [x.label.suspectId, x.label.castRole, x.label.hiding, !!x.label.murderer])
    .sort((a, b) => a[0] < b[0] ? -1 : 1)

  assert.deepStrictEqual(cast(CANONICAL_SEED), cast(CANONICAL_SEED),
    'same seed, same cast')

  const roster = cast(CANONICAL_SEED)
  assert.strictEqual(roster.length, example.budget.npcs,
    'cast size matches budget.npcs')
  roster.forEach(([id, role, hiding]) => {
    assert.ok(mp.ROLES.includes(role), 'role "' + role + '" comes from the ROLES table')
    assert.ok(mp.SECRETS.includes(hiding), 'secret comes from the SECRETS table')
    assert.ok(id, 'suspect has a suspectId')
  })
})

test('mystery: no two suspects share a role or a secret', () => {
  // Regression: the cast index used to be derived from $$iter alone, which
  // resets at every stage boundary, so the first lock of one stage and the
  // first lock of the next dealt the same servant twice.
  for (const seed of [CANONICAL_SEED, 42, 1729, 7]) {
    const cast = nodesOfType(build(seed), mp.NODE_SUSPECT).map(x => x.label)
    const roles = cast.map(l => l.castRole)
    const secrets = cast.map(l => l.hiding)
    assert.strictEqual(new Set(roles).size, roles.length,
      'seed ' + seed + ': distinct roles, got ' + roles.join(','))
    assert.strictEqual(new Set(secrets).size, secrets.length,
      'seed ' + seed + ': distinct secrets')
  }
})

test('mystery: different seeds cast different people', () => {
  // Regression, and the reason stampCastSalt exists: because the stage
  // limits pin how many times each rule fires, an iteration-indexed cast is
  // the SAME cast at every seed, and only the floor plan changes.
  const roles = seed => nodesOfType(build(seed), mp.NODE_SUSPECT)
    .map(x => x.label.castRole).sort().join(',')
  const seen = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(roles))
  assert.ok(seen.size > 1, 'the cast varies with the seed, got only: ' + [...seen])
})

test('mystery: no Math.random anywhere in the mystery sources', () => {
  const files = [
    path.join(__dirname, '..', 'mystery-primitives.js'),
    path.join(__dirname, '..', 'examples', 'mystery-daily.js')
  ]
  files.forEach(f => {
    // Strip line comments first: this very file, and the module header,
    // talk ABOUT Math.random.
    const src = fs.readFileSync(f, 'utf-8').replace(/\/\/.*$/gm, '')
    assert.ok(!/Math\s*\.\s*random/.test(src),
      f + ' must draw all its entropy from the seeded sampler, never Math.random')
    assert.ok(!/Date\s*\.\s*now/.test(src),
      f + ' must not read a clock — it would break the reproducibility contract')
  })
})

// --- seedForDate --------------------------------------------------------

test('mystery: seedForDate is stable, distinct across adjacent dates, and pure', () => {
  const f = example.seedForDate
  assert.strictEqual(f('2026-01-01'), f('2026-01-01'), 'stable')
  assert.strictEqual(typeof f('2026-01-01'), 'number')
  assert.ok(Number.isInteger(f('2026-01-01')) && f('2026-01-01') >= 0,
    'non-negative integer')
  assert.ok(f('2026-01-01') <= 0x7fffffff, 'fits in 31 bits')

  const january = []
  for (let d = 1; d <= 31; d++) {
    january.push(f('2026-01-' + String(d).padStart(2, '0')))
  }
  for (let i = 1; i < january.length; i++) {
    assert.notStrictEqual(january[i], january[i - 1],
      'adjacent dates get different seeds')
  }
  assert.strictEqual(new Set(january).size, january.length,
    'a month of dates gives a month of distinct seeds')

  assert.notStrictEqual(f('2026-01-01'), f('2027-01-01'), 'year matters')
  assert.throws(() => f('1 Jan 2026'), /YYYY-MM-DD/, 'rejects a non-ISO date')
  assert.throws(() => f(undefined), /YYYY-MM-DD/, 'rejects nothing at all')
})

test('mystery: the canonical seed is the worked date', () => {
  assert.strictEqual(example.defaultSeeds[0], example.seedForDate('2026-01-01'))
  assert.strictEqual(example.id, 'mystery-daily')
  assert.strictEqual(example.topology, 'bidirectional')
  assert.strictEqual(example.puzzles, true)
  assert.deepStrictEqual(example.budget,
    { rooms: 8, keys: 4, nestingDepth: 3, npcs: 5, minigames: 1 })
})

// --- the lock/key invariant --------------------------------------------

test('mystery: every prereq.pairId resolves to a secret node holding that pairId', () => {
  const graph = build(CANONICAL_SEED)
  const secrets = {}
  nodesOfType(graph, mp.NODE_SECRET).forEach(x => { secrets[x.label.pairId] = x.label })

  const gated = graph.edges()
    .map(e => ({ e, label: graph.edge(e) || {} }))
    .filter(x => x.label.prereq && x.label.prereq.pairId)
  assert.ok(gated.length >= example.budget.keys,
    'at least one gated edge per key, got ' + gated.length)
  gated.forEach(x => {
    assert.ok(secrets[x.label.prereq.pairId],
      'prereq.pairId "' + x.label.prereq.pairId + '" on ' + x.e.v + '->' + x.e.w +
      ' names a real secret node')
  })

  // And the other way round: no secret is a key to nothing.
  Object.keys(secrets).forEach(pairId => {
    assert.ok(gated.some(x => x.label.prereq.pairId === pairId),
      'secret ' + pairId + ' unlocks something')
  })
})

test('mystery: every interview edge is locked, and locked by its own suspect', () => {
  const graph = build(CANONICAL_SEED)
  const interviews = edgesOfType(graph, mp.EDGE_INTERVIEW)
  assert.ok(interviews.length >= example.budget.nestingDepth, 'locks exist')
  interviews.forEach(x => {
    assert.ok(x.label.prereq && x.label.prereq.pairId, 'interview is gated')
    const suspect = graph.node(x.e.v) || {}
    assert.strictEqual(suspect.type, mp.NODE_SUSPECT, 'sourced at a suspect')
    assert.strictEqual(suspect.pairId, x.label.prereq.pairId,
      'the lock and the person it belongs to share a pairId')
  })
})

// --- narrative slots ----------------------------------------------------

test('mystery: socialLock fills the full key-door slot list', () => {
  const graph = build(CANONICAL_SEED)
  const interview = edgesOfType(graph, mp.EDGE_INTERVIEW)[0]
  const suspect = graph.node(interview.e.v)
  const pairId = suspect.pairId
  const secret = nodesOfType(graph, mp.NODE_SECRET).find(x => x.label.pairId === pairId)
  assert.ok(secret, 'the lock has a key')

  const carrier = { interview: interview.label, suspect: suspect, secret: secret.label }
  assert.strictEqual(mp.SOCIAL_LOCK_SLOTS.length, 10, 'ten slots, not a subset')
  mp.SOCIAL_LOCK_SLOTS.concat([mp.DIRECTIVE_SLOT]).forEach(slot => {
    const label = carrier[slot.on]
    assert.ok(label, 'slot ' + slot.slot + ' names a real carrier')
    const text = label[slot.field]
    assert.strictEqual(typeof text, 'string',
      'slot ' + slot.slot + ' fills label.' + slot.field + ' on the ' + slot.on)
    // Placeholder mode renders every macro as [theme:name#ctx].
    assert.ok(text.indexOf(slot.macro) >= 0,
      'label.' + slot.field + ' came from macro ' + slot.macro + ', got ' + text)
  })

  // The button text the play engine actually renders.
  assert.strictEqual(interview.label.link, interview.label.confrontText)
  assert.strictEqual(interview.label.prereq.link, interview.label.confrontText)
})

test('mystery: every macro this module reaches for is declared somewhere', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'mystery-primitives.js'), 'utf-8')
  const used = new Set()
  const re = /\$macro:\s*\[\s*'([a-z0-9_]+)'/g
  let m
  while ((m = re.exec(src))) used.add(m[1])
  // macro() calls, which is most of them.
  const re2 = /macro\('([a-z0-9_]+)'/g
  while ((m = re2.exec(src))) used.add(m[1])
  assert.ok(used.size > 10, 'found the macro call sites, got ' + used.size)

  used.forEach(name => {
    assert.ok(mp.MYSTERY_MACROS[name] || themes.MACROS[name],
      'macro "' + name + '" must be declared in MYSTERY_MACROS or themes.MACROS')
  })
  // MYSTERY_MACROS is what the orchestrator merges into themes.js; until it
  // does, this is the only place these slots are described.
  Object.keys(mp.MYSTERY_MACROS).forEach(name => {
    assert.strictEqual(typeof mp.MYSTERY_MACROS[name], 'string')
    assert.ok(mp.MYSTERY_MACROS[name].length > 20,
      'macro "' + name + '" has a usable prompt description')
  })
})

// --- the directive conceit ---------------------------------------------

test('mystery: every lock records the directive that created it', () => {
  const graph = build(CANONICAL_SEED)
  const interviews = edgesOfType(graph, mp.EDGE_INTERVIEW)
  interviews.forEach(x => {
    const d = x.label.directive
    assert.ok(d, 'lock carries a directive')
    assert.ok(mp.ROLES.includes(d.to), 'the note was sent to somebody in the cast')
    assert.ok(mp.DIRECTIVE_ACTS.includes(d.act), 'it told them to do something')
    assert.strictEqual(typeof d.note, 'string', 'and it has words of its own')
    const suspect = graph.node(x.e.v) || {}
    assert.strictEqual(d.to, suspect.castRole,
      'the recipient is the person standing in front of the lock')
  })
})

test('mystery: the dossier files one note per lock, each gated on solving it', () => {
  const graph = build(CANONICAL_SEED)
  const dossier = nodesOfType(graph, mp.NODE_EVIDENCE)
  assert.strictEqual(dossier.length, 1, 'exactly one evidence node')

  const entries = edgesOfType(graph, mp.EDGE_DIRECTIVE)
  const locks = edgesOfType(graph, mp.EDGE_INTERVIEW)
  assert.strictEqual(entries.length, locks.length,
    'one dossier entry per lock — the derivation, in full')
  entries.forEach(x => {
    assert.strictEqual(x.e.v, dossier[0].id, 'entry hangs off the evidence node')
    assert.ok(x.label.directive && x.label.directive.act, 'entry carries the directive')
    assert.ok(x.label.prereq && x.label.prereq.pairId,
      'entry is gated: you only read the note for a lock you opened')
    const suspect = graph.node(x.e.w) || {}
    assert.strictEqual(suspect.pairId, x.label.prereq.pairId,
      'gated on the pairId of the lock it describes')
  })
})

// --- the terminal structure --------------------------------------------

test('mystery: the accusation node has one edge per suspect, exactly one correct', () => {
  const graph = build(CANONICAL_SEED)
  const acc = nodesOfType(graph, mp.NODE_ACCUSATION)
  assert.strictEqual(acc.length, 1, 'exactly one accusation node')

  const accuses = edgesOfType(graph, mp.EDGE_ACCUSE)
  const suspects = nodesOfType(graph, mp.NODE_SUSPECT)
  assert.strictEqual(accuses.length, suspects.length,
    'one accusation edge per suspect')
  accuses.forEach(x => {
    assert.strictEqual(x.e.v, acc[0].id, 'sourced at the accusation node')
    assert.ok(x.label.accuses, 'names the suspect it accuses')
  })
  assert.strictEqual(new Set(accuses.map(x => x.label.accuses)).size, suspects.length,
    'each suspect is accusable exactly once')

  const correct = accuses.filter(x => x.label.correct === true)
  assert.strictEqual(correct.length, 1, 'exactly one correct accusation')
  assert.strictEqual((graph.node(correct[0].e.w) || {}).type, 'win',
    'the correct accusation closes the case')
  assert.strictEqual(typeof correct[0].label.prereq.evidence, 'number',
    'and it is gated on evidence, so a lucky guess is not a solved case')
  assert.strictEqual(correct[0].label.prereq.evidence, acc[0].label.minEvidence,
    'the accusation node advertises the same threshold the edge enforces')

  // The wrong accusations are available with no evidence at all: an
  // uninformed guess must be possible, just distinguishable.
  accuses.filter(x => !x.label.correct).forEach(x => {
    assert.ok(!x.label.prereq, 'a wrong accusation is never gated')
    assert.strictEqual((graph.node(x.e.w) || {}).type, mp.NODE_VERDICT)
    assert.deepStrictEqual(graph.successors(x.e.w), [], 'wrong verdicts are endings')
  })

  // The murderer is one specific member of the cast, and only one.
  const murderers = suspects.filter(x => x.label.murderer === true)
  assert.strictEqual(murderers.length, 1, 'exactly one murderer')
  assert.strictEqual(correct[0].label.accuses, murderers[0].label.suspectId,
    'the correct edge names them')
})

test('mystery: the only way to the goal is through the accusation', () => {
  const graph = build(CANONICAL_SEED)
  const win = graph.nodes().find(n => (graph.node(n) || {}).type === 'win')
  const acc = nodesOfType(graph, mp.NODE_ACCUSATION)[0]
  const into = graph.predecessors(win) || []
  assert.deepStrictEqual(into, [acc.id],
    'every route to the goal was funnelled through the accusation node')
})

// --- nesting: the thing that makes it a mystery -------------------------

test('mystery: the generated graph achieves the budgeted nesting depth', () => {
  for (const seed of [CANONICAL_SEED, 42, 1729, 7, 99]) {
    const graph = build(seed)
    const analysis = mp.lockAnalysis(graph)
    assert.ok(analysis.rounds >= example.budget.nestingDepth,
      'seed ' + seed + ': nesting depth ' + analysis.rounds + ' < budget ' +
      example.budget.nestingDepth + '; chain was ' + JSON.stringify(analysis.chain))
    // Each round must actually depend on the last: a round that acquired no
    // key would have ended the analysis, so a chain of length N is N genuine
    // rounds of "make this person talk to get at the next one".
    assert.strictEqual(analysis.chain.length, analysis.rounds)
    analysis.chain.forEach(round => assert.ok(round.length > 0))

    // And the whole case is solvable at the end of it.
    const win = graph.nodes().find(n => (graph.node(n) || {}).type === 'win')
    assert.ok(analysis.reached.has(win),
      'seed ' + seed + ': the case can actually be closed')
  }
})

test('mystery: nestingDepth reports 1 for a flat mystery', () => {
  // Two independent one-step locks are NOT nesting, and the measure must
  // say so — otherwise the test above would pass on a quiz.
  const flat = new graphlib.Graph()
  flat.setNode('S', { type: 'start', nodeId: 'start' })
  flat.setNode('K1', { type: mp.NODE_SECRET, nodeId: 'k1', pairId: 'p1', evidence: 1 })
  flat.setNode('K2', { type: mp.NODE_SECRET, nodeId: 'k2', pairId: 'p2', evidence: 1 })
  flat.setNode('A', { type: mp.NODE_SUSPECT, nodeId: 'a' })
  flat.setNode('B', { type: mp.NODE_SUSPECT, nodeId: 'b' })
  flat.setNode('W', { type: 'win', nodeId: 'win' })
  flat.setEdge('S', 'K1', { type: mp.EDGE_LEVERAGE })
  flat.setEdge('S', 'K2', { type: mp.EDGE_LEVERAGE })
  flat.setEdge('S', 'A', { type: 'path' })
  flat.setEdge('S', 'B', { type: 'path' })
  flat.setEdge('A', 'W', { type: mp.EDGE_INTERVIEW, prereq: { pairId: 'p1' } })
  flat.setEdge('B', 'W', { type: mp.EDGE_INTERVIEW, prereq: { pairId: 'p2' } })
  assert.strictEqual(mp.nestingDepth(flat), 1, 'both keys lie in the open')

  // Move K2 behind A's lock and the same measure reports 2.
  flat.removeEdge('S', 'K2')
  flat.removeEdge('A', 'W')
  flat.setEdge('A', 'K2', { type: mp.EDGE_INTERVIEW, prereq: { pairId: 'p1' } })
  assert.strictEqual(mp.nestingDepth(flat), 2, 'one key is now behind a person')
})

test('mystery: lockAnalysis honours visit gates rather than waving them through', () => {
  // A `return` edge into a region the player has never been must stay shut,
  // or a cycle-closing shortcut would look like a free route to a secret and
  // silently under-report the depth.
  const g = new graphlib.Graph()
  g.setNode('S', { type: 'start', nodeId: 'start' })
  g.setNode('FAR', { type: mp.NODE_SCENE, nodeId: 'far' })
  g.setNode('K', { type: mp.NODE_SECRET, nodeId: 'k', pairId: 'p', evidence: 1 })
  g.setEdge('S', 'FAR', { type: 'return', prereq: { visited: 'never' } })
  g.setEdge('FAR', 'K', { type: mp.EDGE_LEVERAGE })
  assert.strictEqual(mp.nestingDepth(g), 0, 'nothing is reachable, so no keys')
  assert.ok(!mp.reachableWith(g, []).reached.has('FAR'))
})

// --- primitives in isolation -------------------------------------------

test('mystery: socialLock rewrites a path edge into a person and their secret', () => {
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: mp.NODE_SCENE, nodeId: 'scene_a' })
  seeded.setNode('B', { type: mp.NODE_SCENE, nodeId: 'scene_b' })
  seeded.setEdge('A', 'B', { type: 'path' })
  const out = new Grammar({
    start: 'START',
    rules: [mp.socialLock({ idRole: 't' })],
    limit: 1
  }).evolve({ seed: 1, graph: seeded }).graph

  const suspects = nodesOfType(out, mp.NODE_SUSPECT)
  const secrets = nodesOfType(out, mp.NODE_SECRET)
  assert.strictEqual(suspects.length, 1)
  assert.strictEqual(secrets.length, 1)
  assert.strictEqual(suspects[0].label.pairId, secrets[0].label.pairId,
    'the person and their secret share a pairId')

  const interviews = edgesOfType(out, mp.EDGE_INTERVIEW)
  assert.strictEqual(interviews.length, 1)
  assert.strictEqual(interviews[0].e.v, suspects[0].id)
  assert.strictEqual(interviews[0].label.prereq.pairId, secrets[0].label.pairId)

  // The trail to the secret is bare on purpose: no edgeId, so the nest rule
  // can match it. That is the whole nesting mechanism.
  const leverage = edgesOfType(out, mp.EDGE_LEVERAGE)
  assert.strictEqual(leverage.length, 1)
  assert.strictEqual(leverage[0].label.edgeId, undefined,
    'the leverage trail carries no edgeId, so it stays nestable')
  assert.strictEqual(leverage[0].e.w, secrets[0].id)
})

test('mystery: socialLock({nest:true}) puts a second person in front of the secret', () => {
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: mp.NODE_SCENE, nodeId: 'scene_a' })
  seeded.setNode('B', { type: mp.NODE_SCENE, nodeId: 'scene_b' })
  seeded.setEdge('A', 'B', { type: 'path' })
  const out = new Grammar({
    start: 'START',
    stages: [
      { name: 'seed', limit: 1,
        rules: [mp.socialLock({ idRole: 'c', chain: 'c' })] },
      { name: 'nest', limit: 2,
        rules: [mp.socialLock({ idRole: 'c', nest: true })] }
    ]
  }).evolve({ seed: 1, graph: seeded }).graph

  assert.strictEqual(nodesOfType(out, mp.NODE_SUSPECT).length, 3, 'three people')
  assert.strictEqual(edgesOfType(out, mp.EDGE_INTERVIEW).length, 3, 'three locks')

  // Exactly one frontier survives, which is what keeps the chain linear.
  const frontier = nodesOfType(out, mp.NODE_SECRET).filter(x => x.label.frontier === true)
  assert.strictEqual(frontier.length, 1, 'one open thread to pull')
  assert.strictEqual(frontier[0].label.chainDepth, 3, 'and it is three deep')
  assert.strictEqual(frontier[0].label.chain, 'c', 'the chain name is inherited')
})

test('mystery: suspect() attaches a witness without disturbing the corridor', () => {
  const seeded = new graphlib.Graph()
  seeded.setNode('A', { type: mp.NODE_SCENE, nodeId: 'scene_a' })
  seeded.setNode('B', { type: mp.NODE_SCENE, nodeId: 'scene_b' })
  seeded.setEdge('A', 'B', { type: 'path', edgeId: 'e_keep_me' })
  const out = new Grammar({
    start: 'START',
    rules: [mp.suspect({ idRole: 't' })],
    limit: 1
  }).evolve({ seed: 1, graph: seeded }).graph

  const kept = out.edges().map(e => out.edge(e)).find(l => l && l.edgeId === 'e_keep_me')
  assert.ok(kept, 'the original corridor (and its edgeId) survives')

  const witness = nodesOfType(out, mp.NODE_SUSPECT)
  assert.strictEqual(witness.length, 1)
  assert.strictEqual(witness[0].label.pairId, undefined,
    'a witness with nothing to hide holds no lock')

  const testimony = edgesOfType(out, mp.EDGE_TESTIMONY)
  assert.strictEqual(testimony.length, 1, 'they talk on your way out')
  assert.strictEqual(testimony[0].e.v, witness[0].id)
  assert.ok(testimony[0].label.prereq.traversed, 'paired with the approach edge')
})

test('mystery: directive() is a label fragment with a recipient, an act and a note', () => {
  const d = mp.directive({ to: 'butler', act: 'burn the letters', note: 'x' })
  assert.deepStrictEqual(d, { to: 'butler', act: 'burn the letters', note: 'x' })
  const generated = mp.directive({ ctx: 'pair_1' })
  assert.ok(generated.to.$eval, 'the recipient is a deterministic table lookup')
  assert.ok(generated.act.$eval, 'so is the instruction')
  assert.deepStrictEqual(generated.note,
    { $macro: [mp.DIRECTIVE_SLOT.macro, 'pair_1'] })
})

// --- structural sanity --------------------------------------------------

test('mystery: every node carries a nodeId and every nodeId is unique', () => {
  const graph = build(CANONICAL_SEED)
  const missing = graph.nodes().filter(n => !(graph.node(n) || {}).nodeId)
  assert.deepStrictEqual(missing.map(n => JSON.stringify(graph.node(n))), [],
    'nodes missing a nodeId')
  const ids = graph.nodes().map(n => graph.node(n).nodeId)
  assert.strictEqual(new Set(ids).size, ids.length, 'nodeIds are unique')
})

test('mystery: the graph respects its budget', () => {
  const graph = build(CANONICAL_SEED)
  const b = example.budget
  assert.strictEqual(nodesOfType(graph, mp.NODE_SECRET).length, b.keys)
  assert.strictEqual(nodesOfType(graph, mp.NODE_SUSPECT).length, b.npcs)
  assert.ok(nodesOfType(graph, mp.NODE_SCENE).length <= b.rooms,
    'scene count within budget.rooms')
  assert.strictEqual(nodesOfType(graph, 'puzzle_intro').length, b.minigames,
    'one minigame, as budgeted')
})

test('mystery: the house is bidirectional', () => {
  const graph = build(CANONICAL_SEED)
  const twoWay = graph.edges().filter(e => graph.hasEdge(e.w, e.v))
  assert.ok(twoWay.length > 0,
    'topology "bidirectional" promises cycles; found none')
})
