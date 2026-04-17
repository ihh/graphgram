// A graphgram port of the dunjs dungeon grammar, wiring the reusable
// dungeon primitives (midpoint room, dead-end, parallel path, key/door
// with shared pairId, and path refinements into passage/monster/puzzle)
// into a three-stage grammar:
//
//   1. init     — spawn start --path--> goal from the START seed
//   2. expand   — grow structure (midpoint rooms, dead-ends, parallels, key/door)
//   3. refine   — flavor remaining `path` edges as passage / monster / puzzle
//
// To enable LLM-generated narrative for the keyDoor primitive, set
// `narrate: true` below AND run via bin/transform.js (which registers
// narrator functions). Without narrative, plain template strings are
// used; you can still run it offline with `--no-llm`.

(function () {
  var dp = require('../dungeon-primitives')
  return {
    name: 'dunjs-dungeon',
    start: 'START',
    stages: [
      dp.initStartGoalStage(),

      { name: 'expand',
        limit: 20,
        rules: [
          // Two-way midpoint: bidirectionally traversable, the default CYOA
          // choice. One-way midpoint: only fires inside existing cycles
          // (where a direct back-edge already exists), so the player is
          // never stranded on a one-way passage.
          dp.midpointRoom({ weight: 2 }),
          dp.midpointRoom({ oneWay: true, weight: 1 }),
          dp.deadEnd({ weight: 1 }),
          dp.parallelPath({ weight: 1 }),
          dp.keyDoor({ weight: 1, narrate: false, limit: 3 })
        ]
      },

      // After structural expansion, before the path edges get refined into
      // passage/monster/puzzle, close a couple of cycles: wherever there's an
      // a->m->b chain and a key at a, add a locked b->a shortcut sharing the
      // key's pairId. Tree becomes Metroidvania.
      { name: 'close-cycles',
        limit: 2,
        rules: [ dp.cycleCloseShortcut({ weight: 1 }) ]
      },

      { name: 'refine',
        rules: dp.refineEdges(dp.EDGE_PATH,
          [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE],
          { weight: 1 })
      },

      dp.dotDecorationStage()
    ]
  }
})()
