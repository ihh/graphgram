'use strict'

// Acyclic hypertext primitives — the other half of the design space from
// dungeon-primitives.js.
//
// Every factory in dungeon-primitives.js assumes the player can go back:
// midpoint rooms are two-way by default, dead ends ship an explicit
// `backtrack`, keyDoor hangs the key on a side branch you walk out of and
// back from, and cycleCloseShortcut exists purely to turn trees into loops.
// That whole vocabulary is unavailable here. The contract of THIS file is:
//
//   no factory ever emits an edge that points backwards along the partial
//   order, so a graph grown entirely from these rules is a DAG.
//
// The invariant is what earns `meta.topology: "dag"` in the Story IR
// (docs/spec/story-ir.md §9), which exporters are allowed to lean on:
// Inform 7 lays the story out with one-way doors, Twine emits no "go back"
// affordances, ChoiceScript is free to `*finish` between scenes. Break the
// invariant here and every one of those downstream decisions silently
// becomes wrong, which is why test/dag-primitives.test.js checks it by
// direct DFS colouring rather than by trusting the rule shapes.
//
// The structural consequence worth internalising: with no way back, every
// edge out of a node is a *commitment*. That is a narrative asset, not just
// a restriction — it is the whole reason dagKeyLock below is interesting.

const dp = require('./dungeon-primitives')

// Type constants are shared with the dungeon primitives rather than
// re-declared, so that a single IR builder, phrasebook and DOT renderer
// serve both topologies. Re-exported at the bottom so a grammar module can
// `require('./dag-primitives')` alone and still name the types it matches.
const EDGE_PATH = dp.EDGE_PATH
const NODE_START = dp.NODE_START
const NODE_WIN = dp.NODE_WIN
const NODE_ROOM = dp.NODE_ROOM
const NODE_KEY = dp.NODE_KEY
const NODE_DOOR = dp.NODE_DOOR

// A losing terminal. Distinct from dungeon-primitives' NODE_DEATH, which
// means "the monster killed you mid-battle": a `loss` is reached by walking
// a link on purpose, having already lost the game some moves earlier. The
// IR builder keys `role: "ending"` off this type, and an exporter must
// terminate the story there.
const NODE_DEAD_LOSS = 'loss'

// The edge into a `loss` node. Typed separately from `path` so that (a) any
// refine stage that rewrites `path` edges leaves it alone, and (b) an
// exporter can style "this is the way you concede" differently from "this
// is the way on". Cf. EDGE_RETREAT in dungeon-primitives.
const EDGE_CONSOLATION = 'consolation'

// --- id generation -----------------------------------------------------

// $$iter is the enclosing stage's iteration counter; it resets at each
// stage boundary and advances once per rule application, so `<role>_<iter>`
// is unique within the stage that owns the ID-generating rules. The `dag_`
// / `e_dag_` prefixes keep these ids disjoint from the dungeon primitives'
// even when both files' rules are mixed into one stage — otherwise a
// `prereq.visited` written by one file could resolve against a node minted
// by the other.
function nodeIdExpr (role) {
  return { $eval: '"dag_' + role + '_" + ($$iter + 1)' }
}
function edgeIdExpr (role) {
  return { $eval: '"e_dag_' + role + '_" + ($$iter + 1)' }
}

// Deliberately duplicated from dungeon-primitives.js rather than imported:
// `withOpts` is private there and is not part of that module's exported
// surface, so importing it would mean either reaching into internals or
// widening a public API that has no business growing to accommodate us.
// It is six lines, and a copy that drifts is cheaper than a coupling that
// makes dungeon-primitives.js unable to change its option handling.
function withOpts (rule, opts) {
  const keys = ['name', 'weight', 'limit', 'type', 'delay', 'condition', 'induced']
  keys.forEach(function (k) {
    if (opts && typeof opts[k] !== 'undefined' && typeof rule[k] === 'undefined') rule[k] = opts[k]
  })
  return rule
}

// The substrate every factory below expands: a `path` edge that carries no
// `prereq`. The prereq guard is the acyclic analogue of the dungeon
// primitives' `$not: { edgeId }` guard, and it exists for the same class of
// reason — splitting the wrong edge silently destroys a gating invariant.
// Here the hazard is specific: dagKeyLock's locked edge j->b is a `path`
// edge, so without this guard a later dagMidpoint would match it, rebuild
// it without the `prereq`, and hand the player a lock that opens for free.
// Matching on `$test` rather than a `'(.+)'` regex because `prereq` is an
// object; the regex matcher is for string-valued label fields.
function unlockedPathPattern (pathType) {
  return {
    $and: [
      { type: pathType },
      { $not: { $test: '(l)=>l&&l.prereq' } }
    ]
  }
}

// --- factories ---------------------------------------------------------

// Insert a room between the endpoints of a `path` edge, one way only.
//
//   a --path--> b    =>    a --path--> m --path--> b
//
// This is the plain acyclic room-insertion rule, and it is unconditional.
// That is the difference from `dungeonPrimitives.midpointRoom({oneWay:true})`,
// which looks like the same rewrite but ships a `condition` requiring
// $$graph.hasEdge(b, a): in a bidirectional dungeon a one-way midpoint is
// only safe *inside an existing cycle*, because otherwise it strands the
// player at b with no route home. Here there is no route home anywhere by
// construction, so the guard has nothing to protect and its absence is the
// point — an unconditional rule fires from the very first start->win edge,
// where the dungeon's gated variant can never fire at all.
function dagMidpoint (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const roomType = opts.roomType || NODE_ROOM
  const idAM = edgeIdExpr('am')
  const idMB = edgeIdExpr('mb')
  const roomNid = nodeIdExpr('room')
  return withOpts({
    name: 'dag-midpoint',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: unlockedPathPattern(pathType) }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'm', label: {
            type: roomType,
            nodeId: roomNid,
            text: { $macro: ['describe_room', roomNid] }
        } }
      ],
      // Each forward edge gets its own edgeId and its own `button_passage`
      // macro keyed on that id, so the two halves of the split read as two
      // different moves rather than two buttons both saying "Continue".
      edge: [
        { v: 'a', w: 'm', label: {
            type: pathType, edgeId: idAM,
            link: { $macro: ['button_passage', idAM] }
        } },
        { v: 'm', w: 'b', label: {
            type: pathType, edgeId: idMB,
            link: { $macro: ['button_passage', idMB] }
        } }
      ]
    }
  }, opts)
}

// Branch and merge: replace one edge with two parallel one-room routes.
//
//   a --path--> b    =>    a --> m1 --> b   and   a --> m2 --> b
//
// This is the rule that gives a DAG hypertext its characteristic shape. A
// fork with no join fragments the story into disjoint futures, and the
// author then owes every branch its own ending — cost grows exponentially
// in the number of choices, which is why unstructured branching narrative
// is unaffordable. Rejoining at `b` buys a real choice (the two rooms are
// distinct, and the player sees only one of them per run) at additive
// rather than multiplicative cost: everything downstream of `b` is written
// once and serves both branches.
//
// The two midpoints get distinct nodeIds and therefore distinct
// `describe_room` contexts, so the arms are actually different places. A
// fork whose arms narrate identically is not a choice, it is a coin flip
// with extra steps.
function forkJoin (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const roomType = opts.roomType || NODE_ROOM
  const nid1 = nodeIdExpr('fork1')
  const nid2 = nodeIdExpr('fork2')
  const idA1 = edgeIdExpr('a1')
  const id1B = edgeIdExpr('1b')
  const idA2 = edgeIdExpr('a2')
  const id2B = edgeIdExpr('2b')
  function arm (nid) {
    return { type: roomType, nodeId: nid, text: { $macro: ['describe_room', nid] } }
  }
  function step (id) {
    return { type: pathType, edgeId: id, link: { $macro: ['button_passage', id] } }
  }
  return withOpts({
    name: 'dag-fork-join',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: unlockedPathPattern(pathType) }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'm1', label: arm(nid1) },
        { id: 'm2', label: arm(nid2) }
      ],
      // The matched a->b edge is dropped rather than preserved. Keeping it
      // would leave a third, zero-content route past the choice, and a
      // choice you can decline to make is not one.
      edge: [
        { v: 'a', w: 'm1', label: step(idA1) },
        { v: 'm1', w: 'b', label: step(id1B) },
        { v: 'a', w: 'm2', label: step(idA2) },
        { v: 'm2', w: 'b', label: step(id2B) }
      ]
    }
  }, opts)
}

// A key-lock puzzle inside a strictly acyclic graph. This factory is the
// reason the file exists.
//
//   a --path--> b   =>
//       a --> k                              (key arm: the key is here)
//       a --> s                              (skip arm: it is not)
//       k --> j,  s --> j                    (both arms rejoin at j)
//       j --{path, prereq.pairId}--> b       (the way on)
//       j --{consolation}--> f               (a losing ending)
//
// THE DESIGN TENSION, stated plainly: a strictly-acyclic key-lock trades
// recoverability for the ability to be solved by reasoning rather than by
// exhaustive walking. In dungeonPrimitives.keyDoor the player who arrives
// at a locked door without the key simply walks back and fetches it, so the
// lock costs moves and nothing else — it is a routing problem, and the
// dominant strategy is to sweep the map before committing to anything. Here
// the choice at `a` is made *before* its consequence is visible and cannot
// be revisited, so sweeping is not available and the player must instead
// reason about which arm is likely to matter. The price is that a wrong
// guess is unrecoverable within the run.
//
// That price is only payable under two conditions, and both hold for the
// daily-puzzle shape this is built for: the run must be short enough that
// replay is cheap, and the failure must be legible in hindsight — reaching
// `f` has to make the player think "I should have taken the other arm",
// not "the game cheated". Hence the losing ending is a named node with its
// own text rather than a dead link, and hence the skip arm `s` is a real
// room with its own description rather than an obviously-empty corridor:
// the choice has to look symmetric going in and asymmetric coming out.
//
// See papers/key-lock-transformations.md for the general treatment,
// including why this transformation and dungeonPrimitives.keyDoor are the
// acyclic and cyclic images of the same rewrite.
//
// Nesting: the four arm edges (a->k, a->s, k->j, s->j) are ordinary
// unlocked `path` edges, so a later dagKeyLock can fire on any of them and
// produce a lock inside an arm of this one. Only the locked j->b edge is
// excluded, by the `prereq` guard in unlockedPathPattern. This is a
// deliberate departure from keyDoor, whose `$not: { edgeId }` guard would
// have blocked nesting outright; that guard is there to protect paired
// backtracks, and a DAG has none to protect.
function dagKeyLock (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const consolationType = opts.consolationType || EDGE_CONSOLATION
  const keyType = opts.keyType || NODE_KEY
  const doorType = opts.doorType || NODE_DOOR
  const roomType = opts.roomType || NODE_ROOM
  const lossType = opts.lossType || NODE_DEAD_LOSS

  // Same pairId scheme as dungeonPrimitives.keyDoor ("pair_<iter+1>"), so
  // the play engine's `prereq.pairId` -> "has the player visited a `key`
  // node with this pairId" lookup works unchanged across both topologies.
  // Shifted by 1 because iter=0 would stringify to an empty suffix.
  const pairId = { $eval: '"pair_" + ($$iter + 1)' }
  const pairLabel = function (kind) {
    return { $eval: '"' + kind + ' (pair_" + ($$iter + 1) + ")"' }
  }

  const keyNid = nodeIdExpr('key')
  const skipNid = nodeIdExpr('skip')
  const joinNid = nodeIdExpr('join')
  const lossNid = nodeIdExpr('loss')
  const idAK = edgeIdExpr('ak')
  const idAS = edgeIdExpr('as')
  const idKJ = edgeIdExpr('kj')
  const idSJ = edgeIdExpr('sj')
  const idJB = edgeIdExpr('jb')
  const idJF = edgeIdExpr('jf')

  function step (id) {
    return { type: pathType, edgeId: id, link: { $macro: ['button_passage', id] } }
  }

  return withOpts({
    name: 'dag-key-lock',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: unlockedPathPattern(pathType) }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'k', label: {
            type: keyType,
            pairId: pairId,
            nodeId: keyNid,
            text: { $macro: ['describe_key', keyNid] },
            dot: { label: pairLabel(keyType), shape: 'diamond' }
        } },
        // The skip arm is a room, not a marked "wrong" node: nothing in its
        // label distinguishes it until the player reaches j.
        { id: 's', label: {
            type: roomType,
            nodeId: skipNid,
            text: { $macro: ['describe_room', skipNid] },
            dot: { label: roomType, shape: 'box' }
        } },
        { id: 'j', label: {
            type: doorType,
            pairId: pairId,
            nodeId: joinNid,
            text: { $macro: ['describe_door', joinNid] },
            dot: { label: pairLabel(doorType), shape: 'house' }
        } },
        { id: 'f', label: {
            type: lossType,
            nodeId: lossNid,
            // `describe_loss` has no entry in themes.MACROS, so runner mode
            // falls back to macroPrompt's generic slot description. It is a
            // distinct slot from `describe_death` on purpose: the player is
            // not dead, they are shut out, and the two want different prose.
            text: { $macro: ['describe_loss', lossNid] },
            dot: { label: lossType, shape: 'octagon', color: 'red' }
        } }
      ],
      edge: [
        { v: 'a', w: 'k', label: step(idAK) },
        { v: 'a', w: 's', label: step(idAS) },
        { v: 'k', w: 'j', label: step(idKJ) },
        { v: 's', w: 'j', label: step(idSJ) },
        // The way on. `link` doubles as the button label (the phrasebook
        // template for an edge is `{link}`), and the same text is repeated
        // inside `prereq` because the play engine reads the unlock/after
        // prose from there — matching keyDoor's layout so one phrasebook
        // entry serves both. `closedText` is the IR field name
        // (story-ir.md §6) for what to say when the condition is false.
        { v: 'j', w: 'b', label: {
            type: pathType,
            edgeId: idJB,
            link: { $macro: ['describe_unlock', joinNid] },
            closedText: { $macro: ['describe_door', joinNid] },
            prereq: {
              pairId: pairId,
              link: { $macro: ['describe_unlock', joinNid] },
              after: { $macro: ['describe_after_unlock', joinNid] }
            },
            dot: { label: pairLabel('locked'), style: 'bold', color: 'red' }
        } },
        // The concession. Left ungated on purpose: the prereq language has
        // no negation, and gating this on "you lack the key" would in any
        // case be the wrong reading — a keyed player who takes it has
        // chosen to give up, which is a legitimate (if unlikely) ending.
        // A `win`-bearing exporter renders it as the second ending.
        { v: 'j', w: 'f', label: {
            type: consolationType,
            edgeId: idJF,
            link: { $macro: ['button_retreat', idJF] },
            dot: { label: consolationType, style: 'dashed', color: 'firebrick' }
        } }
      ]
    }
  }, opts)
}

// --- stages ------------------------------------------------------------

// The canonical initial subgraph: a START node expanding once into
// start --path--> win, with no edge back.
//
// This is currently structurally identical to
// dungeonPrimitives.initStartGoalStage(), and is nonetheless written out
// rather than re-exported. The reason is the invariant, not the bytes: this
// file promises that nothing it hands you can emit a backward edge, and
// re-exporting a factory from the module whose entire purpose is
// two-way traversal would make that promise hostage to a change over there.
// A `return` edge added to the dungeon's init stage is a reasonable change
// for the dungeon; silently inheriting it here would produce a graph
// labelled `topology: "dag"` that is not one.
function dagInitStage (opts) {
  opts = opts || {}
  const startType = opts.startType || NODE_START
  const winType = opts.winType || NODE_WIN
  const pathType = opts.pathType || EDGE_PATH
  const startLabel = opts.startLabel || 'START'
  return {
    name: opts.name || 'init',
    limit: 1,
    rules: [{
      name: 'dag-spawn-start-goal',
      lhs: startLabel,
      rhs: {
        // nodeIds hardcoded for the two singletons, as in the dungeon init
        // stage, so downstream rules and the IR builder can name them
        // without depending on an iteration counter.
        node: [
          { id: 's', label: {
              type: startType, nodeId: 'start',
              text: { $macro: ['theme_intro', 'start'] }
          } },
          { id: 'g', label: {
              type: winType, nodeId: 'win',
              text: { $macro: ['describe_win', 'win'] }
          } }
        ],
        edge: [{ v: 's', w: 'g', label: { type: pathType } }]
      }
    }]
  }
}

// dungeonPrimitives.dotDecorationStage() is topology-agnostic — it only
// fills in `label.dot.label` from `label.type` where one is missing, and
// adds no edges at all — so it is re-exported verbatim rather than cloned.
// The invariant argument above does not apply: a decoration rule that
// started adding edges would be a bug in that file, not a change to it.
const dotDecorationStage = dp.dotDecorationStage

module.exports = {
  dagMidpoint,
  forkJoin,
  dagKeyLock,
  dagInitStage,
  dotDecorationStage,
  // type constants: the DAG-only ones, plus the shared ones re-exported so
  // a grammar module needs only this require to name what it matches.
  NODE_DEAD_LOSS,
  EDGE_CONSOLATION,
  EDGE_PATH,
  NODE_START,
  NODE_WIN,
  NODE_ROOM,
  NODE_KEY,
  NODE_DOOR
}
