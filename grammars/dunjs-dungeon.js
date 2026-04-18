// A graphgram port of the dunjs dungeon grammar, wiring the reusable
// dungeon primitives (midpoint room, dead-end, parallel path, key/door
// with shared pairId, and path refinements into passage/monster/puzzle)
// into a three-stage grammar:
//
//   1. init     — spawn start --path--> goal from the START seed
//   2. expand   — grow structure (midpoint rooms, dead-ends, parallels, key/door)
//   3. refine   — flavor remaining `path` edges as passage / monster / puzzle
//
// Debug flags consulted via ../debug-opts (populated by bin/transform.js):
//   passageOnly  — refine only produces passage edges; no monster/puzzle edges
//                  get created in the first place, so the flavor stage has
//                  nothing to expand (also skipped).
//   skipFlavor   — monster/puzzle edges are still created by refine, but the
//                  flavor stage that expands them into mini-games is skipped.
//
// keyDoor is run with narrate:true so that $kdBundle / $macro supply the
// narrative slots. Those resolve to themed placeholders in --placeholder
// mode and to LLM output in --sonnet / --llm mode.

(function () {
  var dp = require('../dungeon-primitives')
  var debug = require('../debug-opts').get()

  var refineTargets = debug.passageOnly
    ? [dp.EDGE_PASSAGE]
    : [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE]

  var stages = [
    dp.initStartGoalStage(),

    { name: 'expand',
      limit: 25,
      rules: [
        // Two-way midpoint: bidirectionally traversable, the default CYOA
        // choice. One-way midpoint: only fires inside existing cycles
        // (where a direct back-edge already exists), so the player is
        // never stranded on a one-way passage.
        dp.midpointRoom({ weight: 2 }),
        dp.midpointRoom({ oneWay: true, weight: 1 }),
        dp.deadEnd({ weight: 1 }),
        dp.parallelPath({ weight: 1 }),
        dp.keyDoor({ weight: 1, narrate: true, limit: 3 }),
        dp.healthPotion({ weight: 1, limit: 3 })
      ]
    },

    // After structural expansion, before the path edges get refined into
    // passage/monster/puzzle, close a few cycles: wherever there's an
    // a->m->b chain and a key at a (with a NOT the start node), add a
    // b->a `return` edge gated on prereq.visited=a.nodeId. Tree becomes
    // Metroidvania.
    { name: 'close-cycles',
      limit: 3,
      rules: [ dp.cycleCloseShortcut({ weight: 1 }) ]
    },

    { name: 'refine',
      rules: dp.refineEdges(dp.EDGE_PATH, refineTargets, { weight: 1 })
    }
  ]

  // Expand every flavored-corridor edge into a mini-game: monster edges
  // become Markov battles (choice / random / consequence), puzzle edges
  // become multiple-choice quizzes. Runs until every monster and puzzle
  // edge has been consumed.
  if (!debug.skipFlavor && !debug.passageOnly) {
    stages.push({ name: 'flavor',
      rules: [
        dp.monsterBattle({ weight: 1 }),
        dp.puzzleChoice({ weight: 1 })
      ]
    })
  }

  stages.push(dp.dotDecorationStage())

  return {
    name: 'dunjs-dungeon',
    start: 'START',
    stages: stages
  }
})()
