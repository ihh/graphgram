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

const dp = require('../dungeon-primitives')
const BUDGET = { rooms: 18, keys: 2, nestingDepth: 2, npcs: 0, minigames: 0,
  criticalPath: 2
}

// Worst-case rooms added per expand-stage firing: forkJoin contributes two,
// dagMidpoint one, dagKeyLock one (its skip arm; the key, join and loss
// nodes are typed key/door/loss and are not rooms). Sizing by the worst
// case keeps the room budget a guarantee.
const ROOMS_PER_FIRING = 2

function grammar (opts) {
  opts = opts || {}
  const budget = Object.assign({}, BUDGET, opts.budget)
  // How many rooms sit on the route the player must actually walk. This is the
  // one budget field bound by a single rule rather than emerging statistically:
  // approachStage fires exactly this many times, each inserting one room
  // immediately before the goal, so the shortest solution is exactly
  // criticalPath + 1 moves. Everything else the grammar builds is optional
  // structure hanging off that spine.
  // Clamp against the room budget. A caller who overrides `rooms` downward
  // without also lowering `criticalPath` would otherwise get a spine longer
  // than the whole map: approachStage would spend the entire allowance and
  // expansion would still be handed a floor of one firing, putting the result
  // over budget. The room budget is the harder promise, so it wins.
  const criticalPath = Math.max(1, Math.min(
    budget.criticalPath == null ? 2 : budget.criticalPath,
    budget.rooms - 3))
  return {
    name: 'dag-locked',
    start: 'START',
    stages: [
      dag.dagInitStage(),

      // Lengthen the critical path before anything hangs structure off it.
      // `noBacktrack` because any back-edge at all would break the acyclicity
      // this example exists to demonstrate.
      dp.approachStage({ limit: criticalPath, noBacktrack: true }),
      {
        name: 'expand',
        limit: Math.max(1, Math.floor((budget.rooms - criticalPath) / ROOMS_PER_FIRING)),
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
