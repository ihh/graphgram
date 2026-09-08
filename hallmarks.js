'use strict'

// Hallmarks: the observable attributes of keys and locks, and the clue engine
// that turns them into a solvable matching puzzle.
//
// THE PROBLEM THIS SOLVES. A map with one key and one lock needs no hints: you
// find the key, you find the door, you try it. A map with m keys and m locks
// live at once is a different object. The player faces a bipartite matching
// problem — which key opens which lock — and without some way to reason about
// it, the only strategy is exhaustive carrying. That is not a puzzle; it is an
// errand.
//
// THE POINT IS THE CLUES, NOT THE VOCABULARY. What makes the matching inferable
// is a set of propositions that constrain it: this key is not that lock's;
// either the brass one or the bone one opens the vestry; two of these locks
// fear the same thing. Sections 4-7 are that machinery — enumerate the
// candidate matchings, filter by clues, verify the survivor is unique, prune
// the clue set to minimal, and report whether a solver can reach the answer by
// elimination alone or has to guess and backtrack. That last verdict is the
// most useful difficulty knob a daily puzzle has.
//
// The attribute vocabularies in section 1 are FLAVOUR for those clues, and are
// interchangeable. A social setting can talk about what a person is ashamed of;
// a dungeon can talk about what a lock is made of. Neither vocabulary decides
// anything on its own: the matching is hidden, and the attributes are only the
// material the clues are phrased in. In particular, do not read the two lists
// below as a correspondence table. A sin is not a synonym for a metal, and
// asking a player to trace that connection asks them to guess at an authored
// joke rather than to follow a deduction.
//
// THE MATCHING IS LATENT; THE ATTRIBUTES ARE OBSERVABLE. Which lock a key opens
// is not printed on either of them. It is constrained — by testimony, by what a
// person will and will not be drawn on, by who else was present, by what they
// are afraid of. So the puzzle has the shape every good logic puzzle has: a
// hidden bijection, a set of propositions about it, and a unique solution
// reachable by elimination.
//
// See papers/logic-minigames.md for the combinatorics and the measured
// elimination profiles, and papers/narrative-slots.md for the text each
// attribute owes.

// ---------------------------------------------------------------------------
// 1. Attribute vocabularies
// ---------------------------------------------------------------------------

// These are the axes a clue can talk about. Each is optional and swappable;
// what the engine requires is only that every lock carries a value on each
// axis, so a relational clue (`attrEq` / `attrNe`) has something to compare.
//
// The social vocabulary: what a secret is ABOUT. It earns its place in a
// mystery because a clue phrased over it reads as testimony rather than as a
// puzzle instruction — "whatever the governess is protecting, it is not about
// money" is a sentence a character could say, and "the third lock is not brass"
// is not.
//
// `noun` is the thing itself; `secret` is how a lock reads (what a person is
// protecting); `leverage` is how a key reads (what you can do with the fact).
const TRANSGRESSIONS = [
  { id: 'rage',         noun: 'rage',          secret: 'something done in a temper',      leverage: 'what you know about the temper' },
  { id: 'lust',         noun: 'lust',          secret: 'an attachment they cannot admit', leverage: 'the affair' },
  { id: 'avarice',      noun: 'avarice',       secret: 'money that was not theirs',       leverage: 'the missing money' },
  { id: 'false_piety',  noun: 'false piety',   secret: 'a virtue they perform and do not hold', leverage: 'the hypocrisy' },
  { id: 'impropriety',  noun: 'impropriety',   secret: 'a line of station they crossed',  leverage: 'the breach of station' },
  { id: 'cruelty',      noun: 'cruelty',       secret: 'someone they hurt for its own sake', leverage: 'what was done to the boy' },
  { id: 'covetousness', noun: 'covetousness',  secret: 'wanting what another has',        leverage: 'what they were seen looking at' },
  { id: 'cowardice',    noun: 'cowardice',     secret: 'a moment they failed to act',     leverage: 'where they were not' },
  { id: 'intemperance', noun: 'intemperance',  secret: 'an appetite they cannot govern',  leverage: 'the bottles, the debts, the hours' },
  { id: 'deceit',       noun: 'deceit',        secret: 'a document in the wrong hand',    leverage: 'the forgery' },
  { id: 'low_origin',   noun: 'concealed origin', secret: 'who they were before',         leverage: 'the name they used to have' }
]

// A second axis, deliberately orthogonal to the first. `register` is the shape
// of the fear rather than the content of the secret, and its usefulness is
// exactly that it cuts across the transgression axis: two people can be hiding
// the same kind of thing and be afraid of different consequences. An axis that
// correlated with the first would add clue vocabulary without adding
// constraint, which is the worst kind of padding — it looks like information.
const REGISTERS = [
  { id: 'disgrace',    noun: 'public disgrace',   fear: 'being seen' },
  { id: 'prosecution', noun: 'the law',           fear: 'being charged' },
  { id: 'guilt',       noun: 'private guilt',     fear: 'being right about themselves' },
  { id: 'ruin',        noun: 'ruin',              fear: 'losing the position' }
]

// An axis not yet wired into clue generation, kept here because it is the one
// that would let a key be used *wrongly* rather than merely
// unsuccessfully: is this person the one who did the thing, the one it was done
// to, or someone who merely saw it? Confronting a victim as though they were
// the perpetrator is a mistake that should cost something. The Story IR has no
// way to express a link that consumes an attempt and applies a penalty, so this
// stays a vocabulary until it does. See papers/narrative-slots.md.
const VALENCES = ['perpetrator', 'victim', 'witness']

// The third axis: the one that carries an INDIRECT clue, and the most useful one in a social
// setting. A bearing is what a person visibly is, as opposed to what they are
// hiding (`transgression`) or what they fear (`register`). It is on the surface,
// so the narrator can hand it to the player for free — and two people sharing
// one is an echo the player may or may not notice.
//
// That echo is the whole point. "The butler's prideful air" and "the fallen
// woman's prideful nature" are two ordinary descriptive sentences that, taken
// together, are a clue; the narrator never says they are connected. Compare the
// direct form — "rumours link the butler and the fallen woman" — which is one
// sentence and requires no inference at all.
//
// Both are legitimate. The indirect route is a nicer layer when the clue set can
// afford it, and `generateClueSet`'s `prefer` option is how you ask for it
// without banning the direct form outright: it tries attribute clues first and
// falls back to naming names when nothing else finishes the deduction.
const BEARINGS = [
  { id: 'prideful',    adj: 'prideful' },
  { id: 'fastidious',  adj: 'fastidious' },
  { id: 'devout',      adj: 'devout' },
  { id: 'grasping',    adj: 'grasping' },
  { id: 'timid',       adj: 'timid' },
  { id: 'jovial',      adj: 'relentlessly jovial' },
  { id: 'watchful',    adj: 'watchful' },
  { id: 'aggrieved',   adj: 'aggrieved' }
]

// The fourth axis, and the one that works in a setting with no people in it. It
// is independent of the others: a material is not a coded sin, and nothing in the
// engine treats it as one.
const MATERIALS = [
  { id: 'brass',  noun: 'yellow brass' },
  { id: 'iron',   noun: 'cold black iron' },
  { id: 'bone',   noun: 'yellowed bone' },
  { id: 'silver', noun: 'tarnished silver' },
  { id: 'glass',  noun: 'clouded glass' },
  { id: 'copper', noun: 'green copper' },
  { id: 'wood',   noun: 'worm-eaten wood' },
  { id: 'lead',   noun: 'soft grey lead' },
  { id: 'gilt',   noun: 'flaking gilt' },
  { id: 'horn',   noun: 'scratched horn' },
  { id: 'clay',   noun: 'unfired clay' }
]

// ---------------------------------------------------------------------------
// 2. Sampling
// ---------------------------------------------------------------------------

// Every function here takes an explicit `rnd` — a zero-argument function
// returning a float in [0,1). Pass the grammar's seeded Mersenne Twister
// (`mt.rnd.bind(mt)`). Nothing in this file calls Math.random, because the
// reproducibility contract in docs/spec/examples.md says a seed determines
// everything, and a hallmark set that varied per run would make a "daily"
// puzzle un-shareable.

function pick (rnd, list) { return list[Math.floor(rnd() * list.length)] }

// Fisher-Yates on a copy. Used for both the transgression draw and the hidden
// matching, so the whole puzzle is a function of the seed.
function shuffle (rnd, list) {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

// Build `n` lock hallmarks. Transgressions and materials are drawn WITHOUT
// replacement — they are identifying attributes, so two locks sharing one would
// make a clue phrased over that attribute ambiguous. `register` is drawn WITH
// replacement, deliberately: an axis on which locks can coincide is what makes
// the relational clues (`attrEq` / `attrNe`) say anything at all. An axis where
// every value is unique reduces `attrNe` to a tautology.
function sampleHallmarks (rnd, n, opts) {
  opts = opts || {}
  if (n > TRANSGRESSIONS.length || n > MATERIALS.length)
    throw new Error('cannot draw ' + n + ' distinct attribute values')
  const sins = shuffle(rnd, TRANSGRESSIONS).slice(0, n)
  const mats = shuffle(rnd, MATERIALS).slice(0, n)
  return sins.map(function (t, i) {
    return {
      index: i,
      transgression: t.id,
      material: mats[i].id,
      // register and bearing are drawn WITH replacement, so locks can coincide
      // on them. That is what gives `attrEq` something to say: on an axis where
      // every value is unique, "these two share it" is never true and "these two
      // differ" is a tautology.
      register: pick(rnd, REGISTERS).id,
      bearing: pick(rnd, BEARINGS).id
    }
  })
}

// ---------------------------------------------------------------------------
// 3. Affinity
// ---------------------------------------------------------------------------

// What a key and a lock visibly have in common, and what they visibly differ
// on. Note what this function does NOT do: it does not decide whether the key
// opens the lock. That is the hidden matching's business, and attribute
// equality is not a shortcut to it.
//
// What affinity is for is TEXT. The `shared` list is what the recognition slot
// describes — the moment the player notices that two things have something in
// common — and the `conflicting` list is what a near-miss reads as. Both are
// evidence the player weighs; neither is a verdict.
//
// `nearMiss` flags the interesting case: agrees on something legible, differs
// on something else. A map whose keys and locks agree on everything or nothing
// gives the player no purchase, because there is nothing to weigh.
function affinity (keyH, lockH, axes) {
  const shared = [], conflicting = []
  ;(axes || ['transgression', 'material', 'register']).forEach(function (axis) {
    if (keyH[axis] === lockH[axis]) shared.push(axis)
    else conflicting.push(axis)
  })
  return {
    shared: shared,
    conflicting: conflicting,
    nearMiss: shared.length > 0 && conflicting.length > 0
  }
}

// ---------------------------------------------------------------------------
// 4. The matching problem
// ---------------------------------------------------------------------------

// A matching is an array `m` of length n where m[k] is the lock index that key
// k opens. Enumerating all n! of them is fine for the sizes a hand-played
// puzzle can carry: 6 at n=3, 24 at n=4, 120 at n=5, 720 at n=6. Past that the
// puzzle stops being solvable on paper long before the enumeration stops being
// cheap, so brute force is the right algorithm and not a placeholder.
function enumerateMatchings (n) {
  const out = []
  const used = new Array(n).fill(false)
  const cur = new Array(n)
  ;(function rec (k) {
    if (k === n) { out.push(cur.slice()); return }
    for (let l = 0; l < n; l++) {
      if (used[l]) continue
      used[l] = true; cur[k] = l
      rec(k + 1)
      used[l] = false
    }
  })(0)
  return out
}

// ---------------------------------------------------------------------------
// 5. Clues
// ---------------------------------------------------------------------------

// A clue is a proposition about the matching. Five forms, chosen because each
// has a distinct elimination profile (see papers/logic-minigames.md for the
// measured figures) and because each has a natural reading in the fiction.
//
//   is(k, l)            "The brass key turns the vestry lock."
//   not(k, l)           "Whatever the governess is protecting, it is not money."
//   either(pairs)       "Either the footman or the cook is hiding a cruelty."
//   ifThen(p, q)        "If she is hiding the affair, he is hiding the theft."
//   attrEq(k1,k2,attr)  "Two of them fear the same thing."
//   attrNe(k1,k2,attr)  "The valet and the coachman are not afraid of the same thing."
//
// The attribute clues are the ones that make the puzzle feel like deduction
// rather than lookup: they constrain the matching only *through* the lock
// attribute table, so the player has to hold two mappings in mind at once.

function is (k, l) { return { op: 'is', k: k, l: l } }
function not (k, l) { return { op: 'not', k: k, l: l } }
function either (pairs) { return { op: 'either', pairs: pairs } }
function ifThen (p, q) { return { op: 'ifThen', p: p, q: q } }
function attrEq (k1, k2, attr) { return { op: 'attrEq', k1: k1, k2: k2, attr: attr } }
function attrNe (k1, k2, attr) { return { op: 'attrNe', k1: k1, k2: k2, attr: attr } }

// Evaluate a clue against a candidate matching. `lockHallmarks[l]` supplies the
// attributes the relational clues read.
function holds (clue, m, lockHallmarks) {
  switch (clue.op) {
    case 'is':   return m[clue.k] === clue.l
    case 'not':  return m[clue.k] !== clue.l
    case 'either':
      return clue.pairs.some(function (p) { return m[p[0]] === p[1] })
    case 'ifThen':
      return !(m[clue.p[0]] === clue.p[1]) || (m[clue.q[0]] === clue.q[1])
    case 'attrEq':
      return lockHallmarks[m[clue.k1]][clue.attr] === lockHallmarks[m[clue.k2]][clue.attr]
    case 'attrNe':
      return lockHallmarks[m[clue.k1]][clue.attr] !== lockHallmarks[m[clue.k2]][clue.attr]
    default:
      throw new Error('unknown clue op: ' + clue.op)
  }
}

function consistent (clues, matchings, lockHallmarks) {
  return matchings.filter(function (m) {
    return clues.every(function (c) { return holds(c, m, lockHallmarks) })
  })
}

// ---------------------------------------------------------------------------
// 6. Generating a fair clue set
// ---------------------------------------------------------------------------

// A clue set is FAIR when it admits exactly one matching, and MINIMAL when
// dropping any single clue admits more than one. Both properties are checkable
// by enumeration, and both should be checked rather than assumed: a generator
// that emits a clue set without verifying uniqueness will, sooner or later,
// ship a daily puzzle with two solutions, and there is no recovering from that
// in public.
//
// The algorithm is the obvious greedy one, and its obviousness is a feature —
// there is nothing to get subtly wrong:
//   1. build the candidate clue pool;
//   2. keep only clues that are TRUE of the hidden matching (an untrue clue
//      would make the puzzle unsolvable, not merely hard);
//   3. shuffle, then add clues one at a time, each time recomputing the set of
//      surviving matchings, until only the hidden one survives;
//   4. prune: try removing each kept clue; if uniqueness survives, drop it.
//
// Step 4 matters more than it looks. Without it the clue set is padded, and a
// padded clue set is not just inelegant — it hides which deductions were load
// bearing, which is exactly the information a solver's satisfaction comes from.
function candidateClues (n, hidden, lockHallmarks, opts) {
  opts = opts || {}
  const pool = []
  for (let k = 0; k < n; k++) {
    for (let l = 0; l < n; l++) {
      pool.push(is(k, l))
      pool.push(not(k, l))
    }
  }
  for (let k1 = 0; k1 < n; k1++) {
    for (let k2 = k1 + 1; k2 < n; k2++) {
      ;(opts.attrs || ['bearing', 'register', 'material']).forEach(function (attr) {
        pool.push(attrEq(k1, k2, attr))
        pool.push(attrNe(k1, k2, attr))
      })
      for (let l1 = 0; l1 < n; l1++) {
        for (let l2 = 0; l2 < n; l2++) {
          if (l1 === l2) continue
          pool.push(either([[k1, l1], [k2, l2]]))
          pool.push(ifThen([k1, l1], [k2, l2]))
        }
      }
    }
  }
  // Direct `is` clues give the answer away one cell at a time. Allow them, but
  // let a caller ban them for a harder puzzle.
  return opts.noDirect ? pool.filter(function (c) { return c.op !== 'is' }) : pool
}

// The default preference order: try the clues that require inference before the
// ones that hand over an answer. An `attrEq` clue is two descriptive sentences
// the player has to connect; a bare `is` clue is the narrator telling them. The
// greedy loop below walks this order, so indirect clues get first refusal and
// direct ones are used only when nothing else finishes the deduction — which is
// the right default, since a clue set that CAN be all-indirect should be, and
// one that cannot should still exist rather than failing.
const DEFAULT_PREFERENCE = ['attrEq', 'attrNe', 'either', 'ifThen', 'not', 'is']

function generateClueSet (rnd, hidden, lockHallmarks, opts) {
  opts = opts || {}
  const n = hidden.length
  const all = enumerateMatchings(n)
  const prefer = opts.prefer || DEFAULT_PREFERENCE
  const rank = {}
  prefer.forEach(function (op, i) { rank[op] = i })
  // Shuffle first so ties within a preference class are seed-determined rather
  // than pool-order artefacts, then sort stably by preference.
  const truths = shuffle(rnd, candidateClues(n, hidden, lockHallmarks, opts)
    .filter(function (c) { return holds(c, hidden, lockHallmarks) }))
    .map(function (c, i) { return { c: c, i: i } })
    .sort(function (a, b) {
      const ra = rank[a.c.op] == null ? prefer.length : rank[a.c.op]
      const rb = rank[b.c.op] == null ? prefer.length : rank[b.c.op]
      return ra - rb || a.i - b.i
    })
    .map(function (x) { return x.c })

  const kept = []
  let surviving = all
  for (let i = 0; i < truths.length && surviving.length > 1; i++) {
    const next = consistent([truths[i]], surviving, lockHallmarks)
    // Skip clues that eliminate nothing: they are true, but they are noise, and
    // noise in a logic puzzle reads as a bug in the puzzle.
    if (next.length === surviving.length) continue
    kept.push(truths[i])
    surviving = next
  }
  if (surviving.length !== 1) return null   // pool exhausted without uniqueness

  // Minimality pass, back to front so that the cheap late additions go first.
  for (let i = kept.length - 1; i >= 0; i--) {
    const without = kept.slice(0, i).concat(kept.slice(i + 1))
    if (consistent(without, all, lockHallmarks).length === 1) kept.splice(i, 1)
  }
  return kept
}

// ---------------------------------------------------------------------------
// 7. Solving style — the difficulty knob
// ---------------------------------------------------------------------------

// The single most useful difficulty distinction for a daily puzzle is not the
// size of the grid. It is whether the solver ever has to guess-and-check.
//
// This runs the same constraint propagation a careful human runs: maintain a
// candidate set per key; repeatedly (a) drop candidates that no consistent
// matching uses, restricted to clues that can be checked locally, and (b) apply
// the bijection constraint. If it reaches a unique answer with no case split,
// the puzzle is "direct". If it stalls, a human would have to assume something
// and follow it to a contradiction — a different and much less pleasant
// experience, and one worth knowing about before you publish.
//
// The implementation is deliberately conservative: it only eliminates a
// candidate (k -> l) when NO matching consistent with the clues assigns it.
// That is exactly the set of deductions available without hypothesising, and it
// is cheap at these sizes because we already have the full consistent set.
function solveByPropagation (clues, n, lockHallmarks) {
  const all = enumerateMatchings(n)
  const sols = consistent(clues, all, lockHallmarks)
  if (sols.length !== 1) return { solved: false, reason: sols.length + ' solutions' }

  // Candidate sets, seeded from the full consistent set: a pair (k,l) is a
  // live candidate iff some consistent matching uses it.
  const candidates = []
  for (let k = 0; k < n; k++) {
    const s = new Set()
    sols.forEach(function (m) { s.add(m[k]) })
    // Start from everything, then let propagation do the work, so that we are
    // measuring the propagation and not the enumeration.
    candidates.push(new Set(Array.from({ length: n }, function (_, i) { return i })))
  }

  let changed = true, rounds = 0
  while (changed && rounds < n * n + 4) {
    changed = false
    rounds++
    // (a) clue-driven elimination, checked against matchings that respect the
    //     current candidate sets — this is the "no hypothesising" restriction.
    const live = all.filter(function (m) {
      for (let k = 0; k < n; k++) if (!candidates[k].has(m[k])) return false
      return clues.every(function (c) { return holds(c, m, lockHallmarks) })
    })
    for (let k = 0; k < n; k++) {
      Array.from(candidates[k]).forEach(function (l) {
        if (!live.some(function (m) { return m[k] === l })) {
          candidates[k].delete(l); changed = true
        }
      })
    }
    // (b) bijection: a lock claimed by exactly one key is that key's, and a key
    //     with one candidate claims it exclusively.
    for (let k = 0; k < n; k++) {
      if (candidates[k].size === 1) {
        const l = Array.from(candidates[k])[0]
        for (let j = 0; j < n; j++) {
          if (j !== k && candidates[j].has(l)) { candidates[j].delete(l); changed = true }
        }
      }
    }
  }

  const settled = candidates.every(function (s) { return s.size === 1 })
  return {
    solved: true,
    assignment: sols[0],
    direct: settled,
    style: settled ? 'direct-elimination' : 'requires-case-split',
    clueCount: clues.length
  }
}

// ---------------------------------------------------------------------------
// 8. The whole puzzle, in one call
// ---------------------------------------------------------------------------

// Build an n-key / n-lock matching puzzle: hallmarks for both sides, a hidden
// bijection, a fair minimal clue set, and the difficulty verdict. Returns null
// if a fair clue set could not be found for this seed, so callers can advance
// the seed and retry — rejection sampling, which papers/budgets.md argues is
// the honest way to hit a target.
function buildMatchingPuzzle (rnd, n, opts) {
  opts = opts || {}
  const lockHallmarks = sampleHallmarks(rnd, n, opts)
  // Key k carries the transgression of the lock it opens, so the hidden
  // matching and the transgression assignment are the same fact seen twice.
  const hidden = shuffle(rnd, Array.from({ length: n }, function (_, i) { return i }))
  const keyHallmarks = hidden.map(function (l, k) {
    return Object.assign({}, lockHallmarks[l], { index: k, valence: 'perpetrator' })
  })
  const clues = generateClueSet(rnd, hidden, lockHallmarks, opts)
  if (!clues) return null
  const verdict = solveByPropagation(clues, n, lockHallmarks)
  if (opts.requireDirect && !verdict.direct) return null
  return { n: n, hidden: hidden, keyHallmarks: keyHallmarks, lockHallmarks: lockHallmarks, clues: clues, verdict: verdict }
}

module.exports = {
  TRANSGRESSIONS,
  REGISTERS,
  VALENCES,
  BEARINGS,
  MATERIALS,
  DEFAULT_PREFERENCE,
  sampleHallmarks,
  affinity,
  enumerateMatchings,
  is, not, either, ifThen, attrEq, attrNe,
  holds,
  consistent,
  candidateClues,
  generateClueSet,
  solveByPropagation,
  buildMatchingPuzzle,
  shuffle
}
