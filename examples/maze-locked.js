// maze-locked — the full dungeon, and the file to copy.
//
// This is `maze-plain` with the whole apparatus switched on: keys and doors,
// gated returns that turn the tree into a small Metroidvania, corridors that
// are monster fights or riddles instead of corridors, and potions to make
// the fights survivable. It is the bidirectional / puzzle-inclusive corner of
// the catalogue in docs/spec/examples.md, and it is deliberately written as a
// tutorial: if you are starting a dungeon of your own, start from this file
// and delete what you do not want.
//
// ---------------------------------------------------------------------
// The six stages, and what each one buys you
// ---------------------------------------------------------------------
//
// A graphgram grammar with `stages` runs each stage to exhaustion (or to its
// `limit`) before the next one starts. That sequencing is the whole design:
// it lets a later stage assume the graph has properties an earlier stage
// established, which is much easier to reason about than one flat rule set
// where anything can fire at any time.
//
// 1. INIT — `initStartGoalStage()`
//    Turns the bare START seed into `start --path--> win`. Two place nodes and
//    one anonymous corridor. Everything below is carved out of that corridor.
//    What it buys you: a `win` node that is guaranteed to exist and to be a
//    sink, and a substrate edge for stage 2 to attack.
//
// 2. EXPAND — structure
//    The stage that decides what the map *is*. Five primitives compete, each
//    replacing one edge with a small subgraph:
//      midpointRoom            a <-> m <-> b, the two-way corridor
//      midpointRoom(oneWay)    a -> m -> b, but only inside an existing cycle
//      deadEnd                 a side branch with an explicit way back
//      parallelPath            a second, longer route from a to b
//      keyDoor                 a key on one branch, a locked door on another
//      healthPotion            a pickup alcove
//    What it buys you: connectivity, and the locks. Nothing after this stage
//    changes the topology of the map (the flavor stage adds nodes, but only
//    *inside* an edge that already existed).
//
// 3. CLOSE-CYCLES — `cycleCloseShortcut()`
//    Finds an a -> m -> b chain with a key hanging off `a`, and adds a b -> a
//    `return` edge gated on having visited `a`. The player walks the long way
//    round and discovers a shortcut home.
//    Why it is its own stage, between expand and refine: it needs keys to
//    already exist (so it must follow expand) and it matches on `path` edges
//    (so it must precede refine, which rewrites `path` away). Fold it into
//    either neighbour and it silently stops firing.
//    What it buys you: cycles that are *discovered* rather than retraced —
//    `prereq.visited` rather than `prereq.traversed`.
//
// 4. REFINE — flavor the corridors
//    Rewrites each remaining `path` edge to `passage`, `monster` or `puzzle`,
//    preserving every other label field (edgeId, prereq, link) via $assign.
//    This is where the minigame budget is spent: see `grammar()` below.
//    What it buys you: a declaration of intent. No minigame has been built
//    yet — an edge is merely marked as one.
//
// 5. FLAVOR — expand the minigames
//    `monsterBattle` turns a `monster` edge into a Markov battle: choice nodes
//    where the player picks, random nodes where the engine rolls, consequence
//    edges carrying player/monster damage, a death sink, and a retreat back to
//    the room you came from. `puzzleChoice` turns a `puzzle` edge into a quiz:
//    one correct choice through to `b`, N distractors that dump you back at
//    `a` having spent a move.
//    Both inherit the matched edge's `edgeId` onto the way *out* of the
//    minigame, so a backtrack keyed on that edgeId still becomes reachable
//    once the player wins. That inheritance is the subtle part; if you write
//    your own expansion primitive, copy it.
//    What it buys you: the only stage that introduces player *state* — HP.
//
// 6. DECORATE — `dotDecorationStage()`
//    Fills in `label.dot.label` on anything that does not have one, from the
//    node/edge `type`. Purely cosmetic, purely last, and worth keeping: a DOT
//    render of the finished graph is the fastest way to see that a grammar
//    change did what you meant.
//
// ---------------------------------------------------------------------

const dp = require('../dungeon-primitives')

// Budget. Every field binds something in `grammar()` below except
// `nestingDepth`, which currently cannot be enforced — see the comment on it.
//
//   rooms        — place nodes: start + win + every room / dead_end / potion
//                  the expand stage creates. Keys and doors are lock
//                  furniture and are budgeted by `keys` instead; the nodes
//                  inside a minigame are budgeted by `minigames`. Bounds the
//                  expand stage's limit.
//   keys         — the keyDoor rule's `limit`, and also the close-cycles
//                  stage's limit, since cycleCloseShortcut structurally
//                  requires a key at the loop's anchor: at most one
//                  discovered loop per key.
//   nestingDepth — NOT ENFORCED. Nesting happens when keyDoor fires on an
//                  edge that is already behind another door, and no primitive
//                  in dungeon-primitives.js exposes a depth guard: keyDoor's
//                  LHS looks at the matched edge, not at the path from start
//                  to it. With keys: 3 the depth is bounded by 3 and nothing
//                  tighter is claimed. Enforcing this properly needs either a
//                  `condition` with a reachability test over $$graph or a
//                  depth annotation propagated onto nodes as they are made.
//   npcs         — 0. No primitive creates an NPC, so the library enforces
//                  this and this file does not have to.
//   minigames    — the *shared* limit on the two refine rules that can mint a
//                  monster or a puzzle edge (see `MINIGAME_RULE_TYPE`), and
//                  also the potion limit: one potion per fight you might pick.
const BUDGET = { rooms: 16, keys: 3, nestingDepth: 2, npcs: 0, minigames: 2,
  criticalPath: 4
}

// graphgram counts rule applications per `rule.type` when a type is set, and
// per rule otherwise. Giving the path->monster and path->puzzle refinements a
// shared type makes `limit` a cap on their *sum*, which is what a minigame
// budget actually means. Two rules with `limit: 2` each and no shared type
// would let four minigames through.
const MINIGAME_RULE_TYPE = 'minigame'

// Build the grammar JSON. `opts` carries { theme, budget, debug }.
//
// `theme` is not read here: the theme is pinned on the Matcher when the
// caller registers the narrator, so that every `$macro` and `$kdBundle` in a
// run sees one consistent world. `debug` mirrors the flags bin/transform.js
// sets on grammars/dunjs-dungeon.js, so the same two escape hatches work:
//   passageOnly — refine only ever produces passages, so no minigame edges
//                 exist and the flavor stage has nothing to do
//   skipFlavor  — minigame edges are still created, but left unexpanded
function grammar (opts) {
  opts = opts || {}
  const budget = Object.assign({}, BUDGET, opts.budget)
  const debug = opts.debug || {}

  // Room arithmetic.
  //
  // Init contributes 2 place nodes. Each expand firing contributes at most 1
  // more: midpointRoom (either variant) a room, deadEnd a dead_end,
  // parallelPath a room, healthPotion a potion — and keyDoor contributes 0,
  // because a key and a door are lock furniture, not rooms. The expand stage
  // never stalls early (deadEnd and parallelPath match *any* path edge, and a
  // path edge always exists), so it fires exactly `expandLimit` times and
  //
  //   places = 2 + expandLimit - (keyDoor firings)
  //
  // which gives the two-sided bound the test asserts:
  //
  //   budget.rooms - budget.keys  <=  places  <=  budget.rooms
  //
  // The upper bound is the contract; the slack below it is exactly the number
  // of iterations that went on locks instead of floor space.
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
    budget.criticalPath == null ? 4 : budget.criticalPath,
    budget.rooms - 3))

  // The approach stage spends `criticalPath` of the room budget building the
  // spine, so expansion gets what is left. Without this subtraction the two
  // stages would each spend the full budget and the map would come in at
  // roughly rooms + criticalPath — which is how the budget stopped binding the
  // first time approachStage was added.
  const expandLimit = Math.max(1, budget.rooms - 2 - criticalPath)

  // goalLockStage spends one of the key budget on the door across the final
  // approach, so keyDoor gets the rest. Writing this as an explicit subtraction
  // rather than leaving both rules at `budget.keys` is the difference between a
  // budget and a suggestion: with both at the full figure a three-key map ships
  // four keys, which the test suite catches and a player would simply
  // experience as the generator ignoring its own constraints.
  const sideLocks = Math.max(0, budget.keys - 1)
  const refineRules = [dp.refineEdge(dp.EDGE_PATH, dp.EDGE_PASSAGE, { weight: 3 })]
  if (!debug.passageOnly) {
    refineRules.push(dp.refineEdge(dp.EDGE_PATH, dp.EDGE_MONSTER,
      { weight: 1, type: MINIGAME_RULE_TYPE, limit: budget.minigames }))
    refineRules.push(dp.refineEdge(dp.EDGE_PATH, dp.EDGE_PUZZLE,
      { weight: 1, type: MINIGAME_RULE_TYPE, limit: budget.minigames }))
  }

  const stages = [

    // 1. Init.
    dp.initStartGoalStage(),

    // 1b. Approach. Lengthen the critical path to budget before anything else
    //     runs, so that the locks placed in stage 2 land on the route the
    //     player must walk rather than on optional side structure. A generated
    //     map with three locked doors and a two-move win is not a locked map;
    //     it is an unlocked map with decorations. story-solver.js reports the
    //     shortest solution, and test/maze-examples.test.js asserts it.
    dp.approachStage({ limit: criticalPath }),

    // 2. Expand.
    //
    // The weights are not arbitrary and are not a preference ranking: they
    // compensate for how rare each rule's match sites are.
    //
    // keyDoor is the extreme case. Its LHS needs an *anonymous* path edge
    // (one with no edgeId, since replacing a paired edge would leave its
    // backtrack's prereq.traversed dangling) whose source is not `start` and
    // whose target is not `win`. Only parallelPath produces such edges, and
    // only on its second and later firings. So keyDoor typically has one or
    // two sites where midpointRoom has a dozen, and at equal weight it simply
    // never fires — you get a "locked" maze with no locks in it. Weighting it
    // an order of magnitude up spends the key budget instead of leaving it on
    // the table.
    //
    // midpointRoom is weighted *down* here relative to maze-plain for the
    // same reason, in the other direction: it consumes an anonymous edge and
    // replaces it with two edgeId-carrying ones, destroying exactly the
    // substrate keyDoor needs. In a maze with no keys it is the workhorse; in
    // this one it is competition.
    { name: 'expand',
      limit: expandLimit,
      rules: [
        dp.midpointRoom({ weight: 1 }),
        dp.midpointRoom({ oneWay: true, weight: 1 }),
        dp.deadEnd({ weight: 1 }),
        dp.parallelPath({ weight: 3 }),
        // narrate: true draws the key/door/lock prose from $kdBundle, so a
        // single cache entry per pair supplies the key text, the shut-door
        // text, the "unlock it" button and the after-you-unlock narration.
        dp.keyDoor({ weight: 12, narrate: true, limit: sideLocks }),
        dp.healthPotion({ weight: 1, limit: budget.minigames })
      ] },

    // 3. Close cycles.
    { name: 'close-cycles',
      limit: budget.keys,
      rules: [dp.cycleCloseShortcut({ weight: 1 })] },

    // 3b. Seal the spine. `parallelPath` and `deadEnd` deliberately keep the
    //     edge they match, which is right everywhere except on the original
    //     start->win edge: left alone it survives every expansion and the
    //     finished map is completable in one move. Prune it once an alternative
    //     route exists — pruneShortcut's BFS guard verifies that, so the goal
    //     can never be cut off.
    dp.pruneShortcutStage(),

    // 3c. Goal lock. Put one key-and-door across the final step into the goal,
    //     so that at least one lock is on the critical path by construction
    //     rather than by luck. keyDoor cannot do this — its LHS refuses both
    //     paired edges and `win` as a target — and without it the shortest
    //     solution walks the approach spine and never meets a door. See
    //     dungeon-primitives.js:goalLock for why both guards can be lifted
    //     safely at the goal specifically.
    // 3b-ii. Funnel the goal. midpointRoom's one-way variant and parallelPath
    //        can both add further edges into `win`, and a goal with four ways
    //        in cannot be locked by one door. Run pruneShortcut with no source
    //        constraint to collapse the fan-in to a single edge; its BFS guard
    //        only drops an edge when another route already exists, so this can
    //        never orphan the goal.
    dp.pruneShortcutStage({ name: 'funnel-goal', fromType: null, limit: 8 }),

    dp.goalLockStage({ narrate: true }),

    // 4. Refine.
    { name: 'refine', rules: refineRules }
  ]

  // 5. Flavor.
  if (!debug.skipFlavor && !debug.passageOnly) {
    stages.push({
      name: 'flavor',
      rules: [
        dp.monsterBattle({ weight: 1 }),
        dp.puzzleChoice({ weight: 1, numDistractors: 3 })
      ]
    })
  }

  // 6. Decorate.
  stages.push(dp.dotDecorationStage())

  return {
    name: 'maze-locked',
    start: 'START',
    stages: stages
  }
}

module.exports = {
  id: 'maze-locked',
  title: 'The Cindermoor Vault',
  topology: 'bidirectional',
  puzzles: true,
  defaultSeeds: [42, 1729, 8675309],
  budget: BUDGET,
  grammar
}
