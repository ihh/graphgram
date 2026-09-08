'use strict'

// dag-locked — a key-lock puzzle inside an acyclic graph.
//
// The key sits on one arm of a fork, both arms rejoin, and the join's
// forward edge is locked. Because nothing in this topology can be walked
// backwards, the player who takes the keyless arm cannot go and fetch the
// key: they reach the join, find it shut, and take the consolation ending.
// The failure is recoverable only by replaying, which is exactly the shape
// a daily puzzle wants — the run is short, the mistake is legible in
// hindsight, and the second attempt is played with knowledge rather than
// with a saved game. See dag-primitives.js's dagKeyLock comment, and
// papers/key-lock-transformations.md, for the argument in full.
//
// Module interface: docs/spec/examples.md. `grammar(opts)` returns grammar
// JSON, never a constructed Grammar.

const dag = require('../dag-primitives')

const BUDGET = { rooms: 14, keys: 2, nestingDepth: 2, npcs: 0, minigames: 0 }

// Worst-case rooms added per expand-stage firing: forkJoin contributes two,
// dagMidpoint one, dagKeyLock one (its skip arm; the key, join and loss
// nodes are typed key/door/loss and are not rooms). Sizing by the worst
// case keeps the room budget a guarantee.
const ROOMS_PER_FIRING = 2

function grammar (opts) {
  opts = opts || {}
  const budget = Object.assign({}, BUDGET, opts.budget)
  return {
    name: 'dag-locked',
    start: 'START',
    stages: [
      dag.dagInitStage(),
      {
        name: 'expand',
        limit: Math.max(1, Math.floor(budget.rooms / ROOMS_PER_FIRING)),
        rules: [
          dag.dagMidpoint({ weight: 2 }),
          dag.forkJoin({ weight: 1 }),
          // The rule limit IS budget.keys: one lock is one key, so the two
          // numbers are the same number and are written once. Weighted
          // level with dagMidpoint because a stage limit this small will
          // otherwise exhaust itself on corridors and ship zero puzzles.
          //
          // budget.nestingDepth of 2 is reachable rather than aspirational:
          // dagKeyLock's four arm edges are plain unlocked `path` edges, so
          // a second firing can land inside an arm of the first and produce
          // a lock behind a lock. Verified at the default seeds in
          // test/dag-primitives.test.js.
          dag.dagKeyLock({ weight: 2, limit: budget.keys })
        ]
      },
      dag.dotDecorationStage()
    ]
  }
}

module.exports = {
  id: 'dag-locked',
  title: 'The Sealed Gate',
  topology: 'dag',
  puzzles: true,
  defaultSeeds: [42, 1729, 8675309],
  budget: BUDGET,
  grammar: grammar
}
