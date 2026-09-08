'use strict'

// dag-plain — the "hello world" of the export pipeline.
//
// Pure branching narrative: forward links only, no keys, no state, no
// backtracking. Its job in the catalogue is to be the example against which
// an exporter bug is unambiguous, so it deliberately exercises the smallest
// interesting structure and nothing else — if a Twee/ChoiceScript/Inform
// build is wrong here, the bug is in the exporter, not in a puzzle.
//
// Module interface: docs/spec/examples.md. `grammar(opts)` returns grammar
// JSON, never a constructed Grammar — the caller owns construction because
// it also owns narrator registration, and the `$macro` RHS functions must
// be on the Matcher before the JSON is validated against the generated
// schema.

const dag = require('../dag-primitives')

const BUDGET = { rooms: 10, keys: 0, nestingDepth: 0, npcs: 0, minigames: 0 }

// Rooms produced per expand-stage firing, worst case: forkJoin makes two,
// dagMidpoint makes one. Sizing the stage limit by the worst case means the
// room budget is a guarantee rather than an average — a caller who lowers
// budget.rooms gets a smaller story, never an over-budget one.
const ROOMS_PER_FIRING = 2

function grammar (opts) {
  opts = opts || {}
  const budget = Object.assign({}, BUDGET, opts.budget)
  return {
    name: 'dag-plain',
    start: 'START',
    stages: [
      dag.dagInitStage(),
      {
        name: 'expand',
        limit: Math.max(1, Math.floor(budget.rooms / ROOMS_PER_FIRING)),
        rules: [
          // Midpoints outnumber forks so the story has corridor between its
          // choices. An all-fork graph is a lattice, and a lattice reads as
          // a menu rather than as a narrative.
          dag.dagMidpoint({ weight: 2 }),
          dag.forkJoin({ weight: 1 })
        ]
      },
      dag.dotDecorationStage()
    ]
  }
}

module.exports = {
  id: 'dag-plain',
  title: 'The One-Way Wood',
  topology: 'dag',
  puzzles: false,
  defaultSeeds: [42, 1729, 8675309],
  budget: BUDGET,
  grammar: grammar
}
