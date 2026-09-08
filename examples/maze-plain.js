// maze-plain — a bidirectional maze with no locks at all.
//
// The quadrant of the catalogue (docs/spec/examples.md) that is easiest to
// get wrong by accident: a map the player can walk in both directions, with
// no key, no door, no minigame and no state whatsoever. Everything that
// makes it interesting has to come from shape and from prose, because there
// is nothing else. That is the point. If a bidirectional map is only fun
// once you bolt locks onto it, the locks are carrying the design.
//
// Because every corridor is two-way, the player will re-enter passages they
// have already read. `text.repeat` (story-ir.md §7) is therefore not a nicety
// here, it is the difference between a maze and the same paragraph printed
// nine times. The narrative slots this grammar stamps are what the IR builder
// turns into those text objects, so a corridor with no slot is a corridor
// that will print its `first` text forever. See `narrateBarePassages` below.

const dp = require('../dungeon-primitives')

// Budget. Every field here binds something in `grammar()` below; none of it
// is decoration. See the arithmetic comment in `grammar()`.
//
//   rooms        — place nodes, i.e. start + win + every node the expand
//                  stage creates. Bounds the expand stage's limit.
//   keys         — 0, and enforced by the absence of `keyDoor` from the rule
//                  list: there is no other primitive that can mint a key.
//   nestingDepth — 0 falls out of keys: 0. With no locks there is no lock to
//                  nest behind another one.
//   npcs         — 0. No primitive in dungeon-primitives.js creates an NPC,
//                  so this is enforced by the library, not by this file.
//   minigames    — 0, enforced by refining `path` into `passage` only and by
//                  omitting the flavor stage, so `monster`/`puzzle` edges are
//                  never created in the first place and nothing can expand
//                  them later.
const BUDGET = { rooms: 12, keys: 0, nestingDepth: 0, npcs: 0, minigames: 0 }

// Stamp a `link` (the button text the player actually clicks) onto any path
// edge that does not already have one.
//
// This exists because the structural primitives only narrate the edges they
// *create*: midpointRoom labels its a->m and m->b, deadEnd labels its a->d,
// parallelPath labels both legs of its new route. What none of them narrate
// is the edge they *preserve* — deadEnd and parallelPath carry the matched
// a->b edge through unchanged via the LHS-id trick, and the initial
// start->win edge from initStartGoalStage is never narrated at all. So a run
// can easily finish with two or three corridors that have no affordance text,
// which in a bidirectional map means a link reading "path" that the player
// walks over and over. That is the exact failure this example exists to rule
// out, so we close it with a sweep rather than hope the sampler splits every
// bare edge.
//
// The ctxId prefers the edge's own `edgeId` so the button text is stable per
// corridor and matches whatever the paired backtrack refers to; edges with no
// edgeId (the start->win spine) fall back to an iteration-derived id, which is
// deterministic because $$iter is.
//
// Terminates: the rule's LHS requires the absence of `link` and its RHS adds
// one, so no edge can match twice.
function narrateBarePassages (opts) {
  opts = opts || {}
  const pathType = opts.pathType || dp.EDGE_PATH
  return {
    name: opts.name || 'narrate',
    rules: [{
      name: 'narrate-bare-passage',
      lhs: {
        node: [{ id: 'a' }, { id: 'b' }],
        edge: [{
          v: 'a',
          w: 'b',
          label: { $and: [{ type: pathType }, { $not: { $test: '(l)=>l&&l.link' } }] },
          id: 'e'
        }]
      },
      rhs: {
        node: [{ id: 'a' }, { id: 'b' }],
        edge: [{
          v: 'a',
          w: 'b',
          // $assign over the matched label, not a fresh object: the edge may
          // already carry an edgeId or a prereq, and clobbering either would
          // strand a backtrack that points at it.
          label: {
            $assign: [
              { $eval: '$e.label' },
              { link: { $macro: ['button_passage', { $eval: '$e.label.edgeId || ("e_bare_" + ($$iter + 1))' }] } }
            ]
          }
        }]
      }
    }]
  }
}

// Build the grammar JSON. `opts` carries { theme, budget, debug }; `theme` is
// a narrator concern (it is pinned when the caller registers the narrator on
// the Matcher, not here), and `debug` has nothing to switch off in a grammar
// that already produces neither monsters nor puzzles.
function grammar (opts) {
  opts = opts || {}
  const budget = Object.assign({}, BUDGET, opts.budget)

  // Room arithmetic, stated once so it can be checked.
  //
  // initStartGoalStage contributes exactly 2 place nodes (start, win). Every
  // rule in the expand stage below contributes exactly 1 more per firing:
  // midpointRoom a room, midpointRoom({oneWay}) a room, deadEnd a dead_end,
  // parallelPath a room. The stage never stalls before its limit — deadEnd
  // and parallelPath match *any* path edge, and a path edge always exists —
  // so the stage fires exactly `expandLimit` times and the final place count
  // is 2 + expandLimit. Hence:
  const expandLimit = budget.rooms - 2

  return {
    name: 'maze-plain',
    start: 'START',
    stages: [

      // 1. Init — the start->win spine that everything else is carved out of.
      dp.initStartGoalStage(),

      // 2. Expand — grow the map. midpointRoom is the workhorse and carries
      //    the heaviest weight because it is the only rule that lengthens the
      //    critical path *and* leaves it two-way; the others decorate it.
      //    midpointRoom({oneWay}) is gated on the endpoints already being
      //    connected by a back-edge, so it can only ever deepen an existing
      //    cycle and can never strand the player on a one-way corridor.
      { name: 'expand',
        limit: expandLimit,
        rules: [
          dp.midpointRoom({ weight: 3 }),
          dp.midpointRoom({ oneWay: true, weight: 1 }),
          dp.deadEnd({ weight: 1 }),
          dp.parallelPath({ weight: 1 })
        ] },

      // 3. Narrate — close the prose gap left by the preserved edges. Has to
      //    run before refine, because it matches on `path` and refine is what
      //    rewrites `path` away.
      narrateBarePassages(),

      // 4. Refine — flavor every remaining path edge as a plain passage. The
      //    single-target rule list is what enforces minigames: 0; adding
      //    EDGE_MONSTER or EDGE_PUZZLE here would silently break the budget,
      //    since nothing downstream re-checks it.
      { name: 'refine',
        rules: dp.refineEdges(dp.EDGE_PATH, [dp.EDGE_PASSAGE], { weight: 1 }) }
    ]
  }
}

module.exports = {
  id: 'maze-plain',
  title: 'The Warren',
  topology: 'bidirectional',
  puzzles: false,
  defaultSeeds: [42, 1729, 8675309],
  budget: BUDGET,
  grammar
}
