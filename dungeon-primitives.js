// Reusable dungeon-grammar building blocks, ported from dunjs.
//
// Each factory returns a fresh graphgram rule object; compose them into
// the `rules` list of a grammar (or a stage) along with any other rules
// you want. All factories accept the usual graphgram rule options:
//   { name, weight, limit, type, delay, condition }
//
// Rules expect `path` edges as the substrate for expansion. When a node
// is created, its label gets a `type` field (customizable via opts).
//
// The keyDoor primitive additionally accepts `{ narrate: true }` to draw
// its `text`, `before`, `link`, `after` fields from the `$kdBundle`
// narrator helper (register that with `narrator.registerNarrator()` first).

const EDGE_PATH = 'path'
// Two distinct ways an edge can be unlocked retroactively:
//   backtrack — unlocked by having traversed a specific forward edge
//               (referenced via prereq.traversed = <edgeId>)
//   return   — unlocked by having visited the destination node
//               (referenced via prereq.visited = <nodeId>)
const EDGE_BACKTRACK = 'backtrack'
const EDGE_RETURN = 'return'
const EDGE_PASSAGE = 'passage'
const EDGE_MONSTER = 'monster'
const EDGE_PUZZLE = 'puzzle'

const NODE_START = 'start'
const NODE_WIN = 'win'
const NODE_ROOM = 'room'
const NODE_DEAD_END = 'dead_end'
const NODE_KEY = 'key'
const NODE_DOOR = 'door'

// Identifier generators for CYOA-style gating. Every grammar-generated node
// carries a `nodeId` in its label so that `prereq.visited: <nodeId>` on any
// edge references a stable, player-trackable identity. Every forward /
// backtrack edge pair carries a shared `edgeId` so that a `prereq.traversed`
// on the backtrack references exactly the corresponding forward edge.
//
// $$iter is the current iteration counter of the enclosing stage. It resets
// at each stage boundary, so we qualify IDs with a stage-role string to
// avoid collisions with init-stage hardcoded IDs. Within the expand stage
// (which owns almost all ID-generating rules) every rule application
// advances $$iter, so `<role>_<iter>` pairs are unique.
function nodeIdExpr (role) {
  return { $eval: '"' + role + '_" + ($$iter + 1)' }
}
function edgeIdExpr (role) {
  return { $eval: '"e_' + role + '_" + ($$iter + 1)' }
}

// Copy common rule-level options onto a rule object without clobbering
// fields that the factory itself populated.
function withOpts (rule, opts) {
  const keys = ['name', 'weight', 'limit', 'type', 'delay', 'condition', 'induced']
  keys.forEach(function (k) {
    if (opts && typeof opts[k] !== 'undefined' && typeof rule[k] === 'undefined') rule[k] = opts[k]
  })
  return rule
}

// Insert a midpoint room between the endpoints of a `path` edge. By default
// the resulting room is two-way — the player can return b -> m -> a as well
// as go forward a -> m -> b — so that edges correspond cleanly to CYOA
// links. Pass `{ oneWay: true }` to get the older one-way variant; that
// variant is gated with a `condition` that requires the edge's endpoints to
// already be connected by a direct back-edge (typically from a prior
// cycleCloseShortcut), so one-way midpoints only deepen existing cycles
// rather than stranding the player at b.
//
//   two-way (default):  a <-path-> m <-path-> b
//   one-way:            a --path-> m --path-> b   (fires only when $$graph.hasEdge(b,a))
function midpointRoom (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const backtrackType = opts.backtrackType || EDGE_BACKTRACK
  const roomType = opts.roomType || NODE_ROOM
  const winType = opts.winType || NODE_WIN
  const oneWay = !!opts.oneWay
  const idAM = edgeIdExpr('am')
  const idMB = edgeIdExpr('mb')
  function backtrackLabel (traversedId) {
    return {
      type: backtrackType,
      prereq: { traversed: traversedId },
      dot: { label: backtrackType, style: 'dashed', color: 'gray' }
    }
  }
  // Forward edges carry an `edgeId`; return edges carry the corresponding
  // `prereq.traversed` so the player can only walk them after having taken
  // the paired forward edge.
  const edges = [
    { v: 'a', w: 'm', label: { type: pathType, edgeId: idAM } },
    { v: 'm', w: 'b', label: { type: pathType, edgeId: idMB } }
  ]
  // LHS guard: only guard b against being `win` in the two-way case, since
  // only the two-way variant adds an edge sourced at b.
  const lhsNodes = [{ id: 'a' }, { id: 'b' }]
  if (!oneWay) {
    edges.push({ v: 'b', w: 'm', label: backtrackLabel(idMB) })
    edges.push({ v: 'm', w: 'a', label: backtrackLabel(idAM) })
    lhsNodes[1] = { id: 'b', label: { $not: { type: winType } } }
  }
  // Refuse to split any edge that already has an edgeId — those are paired
  // with a backtrack elsewhere, and splitting would leave the backtrack's
  // `prereq.traversed` referencing a forward edge that no longer exists.
  // (Anonymous path edges, including the initial start->win and the
  // preserved a->b in parallelPath / deadEnd, are still fair game.)
  const edgePattern = {
    $and: [{ type: pathType }, { $not: { edgeId: '(.+)' } }]
  }
  const rule = {
    name: oneWay ? 'midpoint-room-oneway' : 'midpoint-room',
    lhs: {
      node: lhsNodes,
      edge: [{ v: 'a', w: 'b', label: edgePattern }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'm', label: { type: roomType, nodeId: nodeIdExpr('room') } }
      ],
      edge: edges
    }
  }
  if (oneWay) rule.condition = '$$graph.hasEdge($b.id, $a.id)'
  return withOpts(rule, opts)
}

// Hang a dead-end branch off the source of a `path` edge. The original edge
// is preserved, and a `backtrack` edge is added from the dead-end back to
// the source so the dead-end is traversable in both directions — important
// when edges represent explicit CYOA links that the player follows. Pass
// `{ noBacktrack: true }` for the old one-way behavior (or override
// `backtrackType`).
//
//   a --path--> b  =>  a --path--> b & a --path--> dead_end & dead_end --backtrack--> a
function deadEnd (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const backtrackType = opts.backtrackType || EDGE_BACKTRACK
  const deadEndType = opts.deadEndType || NODE_DEAD_END
  const withBacktrack = !opts.noBacktrack
  const idAD = edgeIdExpr('ad')
  const edges = [
    { v: 'a', w: 'b', label: { type: pathType } },
    { v: 'a', w: 'd', label: { type: pathType, edgeId: idAD } }
  ]
  if (withBacktrack) {
    edges.push({
      v: 'd', w: 'a',
      label: {
        type: backtrackType,
        prereq: { traversed: idAD },
        dot: { label: backtrackType, style: 'dashed', color: 'gray' }
      }
    })
  }
  // Preserve the a->b edge's label (in particular its edgeId, if any) by
  // giving it an LHS id and referencing it unchanged on the RHS. Without
  // this, the RHS would clobber the label — and any backtrack elsewhere in
  // the graph pointing at the old edgeId would go dangling.
  return withOpts({
    name: 'dead-end',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: pathType }, id: 'e' }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'd', label: { type: deadEndType, nodeId: nodeIdExpr('deadend') } }
      ],
      edge: ['e'].concat(edges.slice(1))
    }
  }, opts)
}

// Parallel path between the endpoints, routed through a midpoint room so
// the single-graph edge invariant holds.
//   a --path--> b    =>    a --path--> b   &   a --path--> room --path--> b
function parallelPath (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const roomType = opts.roomType || NODE_ROOM
  // Preserve a->b's label (including any edgeId) via the LHS id='e' trick.
  return withOpts({
    name: 'parallel-path',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: pathType }, id: 'e' }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'm', label: { type: roomType, nodeId: nodeIdExpr('room') } }
      ],
      edge: [
        'e',
        { v: 'a', w: 'm', label: { type: pathType } },
        { v: 'm', w: 'b', label: { type: pathType } }
      ]
    }
  }, opts)
}

// Key/door side-branch. The key and door share a `pairId` (derived from
// the iteration number so it's unique per rule application), and the
// locked edge carries a `prereq.pairId` pointing back to the key.
//
//   a --path--> b   =>
//     a --path--> key
//     key --backtrack--> a
//     a --path--> door
//     door --path{prereq:{pairId,...}}--> b
//
// With `opts.narrate = true`, text fields (on nodes and the prereq) are
// filled from the `$kdBundle` narrator helper. Otherwise plain templates
// are used. Register narrator functions (see narrator.js) before evolving
// if `narrate` is true.
function keyDoor (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const backtrackType = opts.backtrackType || EDGE_BACKTRACK
  const keyType = opts.keyType || NODE_KEY
  const doorType = opts.doorType || NODE_DOOR
  const winType = opts.winType || NODE_WIN
  const narrate = !!opts.narrate

  // $iter is exposed in the graphgram label-eval context (as `$$iter`
  // inside $eval strings). We use it both as the shared pairId for the
  // key/door and as the cache key for $kdBundle, so every label in a
  // single rule application sees the same narrative bundle. We shift
  // iter by 1 because iter=0 would otherwise stringify to an empty
  // pairId under the ${...} template fallback.
  const pairId = { $eval: '"pair_" + ($$iter + 1)' }
  const iterArg = { $eval: '$$iter' }

  function bundled (field, fallback) {
    if (!narrate) return fallback
    return { $kdBundle: [iterArg, field] }
  }

  // `dot` styling baked in so rendered PDFs show the key/door pairing
  // and visually distinguish the locked edge and the backtrack edge.
  const pairLabel = function (type) {
    return { $eval: '"' + type + ' (pair_" + ($$iter + 1) + ")"' }
  }

  const keyLabel = {
    type: keyType,
    pairId: pairId,
    nodeId: nodeIdExpr('key'),
    text: bundled('keyText', 'There is a key here. You pick it up.'),
    dot: { label: pairLabel(keyType), shape: 'diamond' }
  }
  const doorLabel = {
    type: doorType,
    pairId: pairId,
    nodeId: nodeIdExpr('door'),
    text: bundled('shutText', 'There is a door here. It is closed and locked.'),
    dot: { label: pairLabel(doorType), shape: 'house' }
  }
  if (narrate) doorLabel.theme = { $kdBundle: [iterArg, 'theme'] }

  // Edge IDs for the three forward-edge-to-backtrack pairs:
  //   a->k / k->a  (branch out to the key and back)
  //   a->d / d->a  (approach the door and retreat)
  //   d->b / b->d  (unlock the door forward, and come back through once open)
  const idAK = edgeIdExpr('ak')
  const idAD = edgeIdExpr('ad')
  const idDB = edgeIdExpr('db')
  const branchEdgeLabel = {
    type: pathType,
    edgeId: idAK,
    before: bundled('before', 'You see a passage.'),
    link: bundled('link', 'Take the passage.'),
    // dot.label is deliberately omitted so the decorate stage can fill
    // in whatever type the edge is refined to (passage / monster /
    // puzzle). The dotted style still visually flags this as the
    // key-branch edge.
    dot: { style: 'dotted' }
  }
  const lockedEdgeLabel = {
    type: pathType,
    edgeId: idDB,
    prereq: {
      pairId: pairId,
      link: bundled('unlock', 'Unlock the door with the key.'),
      after: bundled('after', 'The key unlocks the door. You go through.')
    },
    dot: { label: pairLabel('locked'), style: 'bold', color: 'red' }
  }
  // k -> a  (backtrack, requires having taken the a->k forward edge)
  const backtrackEdgeLabel = {
    type: backtrackType,
    prereq: { traversed: idAK },
    dot: { label: backtrackType, style: 'dashed', color: 'gray' }
  }
  // Door backtracks:  d -> a   (retreat from the door before unlocking it;
  //                             requires having walked a->d forward)
  //                   b -> d   (once unlocked, the door stays open — gated
  //                             on having traversed d->b, which itself
  //                             required the key. No double-gating: traversed
  //                             d->b implies the player had the key.)
  const doorFrontBacktrack = {
    type: backtrackType,
    prereq: { traversed: idAD },
    dot: { label: backtrackType, style: 'dashed', color: 'gray' }
  }
  const doorBackBacktrack = {
    type: backtrackType,
    prereq: { traversed: idDB },
    dot: { label: backtrackType, style: 'dashed', color: 'gray' }
  }

  return withOpts({
    name: 'key-door',
    lhs: {
      node: [
        { id: 'a' },
        // Don't make the goal node a source: the b -> d backtrack would
        // otherwise give `win` an outgoing edge.
        { id: 'b', label: { $not: { type: winType } } }
      ],
      // Refuse edges that already carry an edgeId — keyDoor replaces the
      // a->b edge with a longer a->d->b chain, so splitting a paired edge
      // would leave its backtrack's prereq.traversed dangling.
      edge: [{ v: 'a', w: 'b',
               label: { $and: [{ type: pathType }, { $not: { edgeId: '(.+)' } }] } }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'k', label: keyLabel },
        { id: 'd', label: doorLabel }
      ],
      edge: [
        { v: 'a', w: 'k', label: branchEdgeLabel },
        { v: 'k', w: 'a', label: backtrackEdgeLabel },
        { v: 'a', w: 'd', label: { type: pathType, edgeId: idAD } },
        { v: 'd', w: 'a', label: doorFrontBacktrack },
        { v: 'd', w: 'b', label: lockedEdgeLabel },
        { v: 'b', w: 'd', label: doorBackBacktrack }
      ]
    }
  }, opts)
}

// Cycle-closing return edge: match a two-edge path a --path--> m --path--> b
// where a already has a key hanging off it (from a prior keyDoor
// application), and add a `return` edge b --> a. This turns tree-shaped
// dungeons into cyclic ones — the player walks the long way round, and the
// return becomes available after they've reached a.
//
// Unlike a `backtrack` (gated on traversing its paired forward edge), a
// `return` is gated on having *visited the destination node* — i.e. the
// player must have been at `a` at some point before they can take the
// return from `b`. This matches the Dormans cyclic-generation intent:
// you're not unwinding a specific corridor you came down, you're discovering
// a loop.
//
// The edge gets `type: return` (not `path` or `backtrack`), so the refine
// stage — which rewrites `path` edges into passage/monster/puzzle — leaves
// it alone. Add a refine rule for EDGE_RETURN if you want returns to be
// flavored as full corridors.
//
// Structurally requires an existing key at `a` so that the return has
// narrative motivation, even though the gating is destination-visit rather
// than key-pickup. `a` is also constrained to be a non-start room: if `a`
// were the start node, `prereq.visited: start` would be trivially true the
// whole game, which defeats the "you discovered a loop" purpose.
//
// Guarded by `condition` against re-closing an already-closed cycle.
// Intended to run AFTER keyDoor has populated keys and BEFORE refineEdges
// rewrites path edges.
function cycleCloseShortcut (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const returnType = opts.returnType || EDGE_RETURN
  const keyType = opts.keyType || NODE_KEY
  const startType = opts.startType || NODE_START
  const winType = opts.winType || NODE_WIN
  return withOpts({
    name: 'cycle-close-return',
    lhs: {
      node: [
        // Capture a's `nodeId` so the return's prereq can reference it,
        // AND require a not to be the start node — otherwise the return is
        // trivially always unlocked since the player starts on `a`.
        { id: 'a', label: { $and: [
          { nodeId: '(.+)' },
          { $not: { type: startType } }
        ] } },
        { id: 'm' },
        // Do not make `win` a source of a return — the goal node must not
        // have any outgoing edges. This $not guard also tolerates nodes
        // without object labels (e.g. the transient raw START node).
        { id: 'b', label: { $not: { type: winType } } },
        { id: 'k', label: { $and: [{ type: keyType }, { pairId: '(pair_.*)' }] } }
      ],
      // LHS edges get ids so RHS can preserve their labels (edgeIds etc.)
      // unchanged — the shortcut only ADDS a b->a edge, it doesn't modify
      // the existing structure.
      edge: [
        { v: 'a', w: 'm', label: { type: pathType }, id: 'eam' },
        { v: 'm', w: 'b', label: { type: pathType }, id: 'emb' },
        { v: 'a', w: 'k', label: { type: pathType }, id: 'eak' }
      ]
    },
    // Do not fire if a direct b->a edge already exists (either as a shortcut
    // we added previously, or as part of some other cycle). Without this, the
    // rule would try to re-match on its own output and duplicate edges.
    condition: '!$$graph.hasEdge($b.id, $a.id)',
    rhs: {
      node: [{ id: 'a' }, { id: 'm' }, { id: 'b' }, { id: 'k' }],
      edge: [
        'eam',
        'emb',
        'eak',
        // New return edge: type=return, gated on having visited a.
        // The dot label still advertises the paired key so the cyclic
        // structure reads visually in rendered graphs.
        { v: 'b', w: 'a', label: {
            type: returnType,
            prereq: { visited: '${a.match.nodeId[1]}' },
            dot: {
              label: { $eval: '"return (" + $k.label.pairId + ")"' },
              style: 'bold',
              color: 'blue'
            }
        } }
      ]
    }
  }, opts)
}

// Rewrite the label of any `fromType` edge to be of `toType` (e.g.
// path -> passage / monster / puzzle). Useful for turning the neutral
// `path` substrate into flavored dungeon encounters. Other label fields
// (e.g. `prereq` on a locked door edge) are preserved via $assign.
function refineEdge (fromType, toType, opts) {
  opts = opts || {}
  return withOpts({
    name: 'refine-' + fromType + '-to-' + toType,
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: fromType }, id: 'e' }]
    },
    rhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{
        v: 'a',
        w: 'b',
        label: { $assign: [{ $eval: '$e.label' }, { type: toType }] }
      }]
    }
  }, opts)
}

// Convenience: refine `fromType` edges into any of the supplied target
// types, one rule per target. Call as refineEdges('path', ['passage',
// 'monster', 'puzzle'], { weight: 1 }).
function refineEdges (fromType, toTypes, opts) {
  return toTypes.map(function (t) { return refineEdge(fromType, t, opts) })
}

// Everything-and-the-kitchen-sink default: returns the full list of
// dungeon primitives ready to drop into a grammar stage. Accepts
// per-factory overrides via opts.{midpointRoom,deadEnd,parallelPath,keyDoor,refinements}.
function defaultRules (opts) {
  opts = opts || {}
  const refineTargets = opts.refineTargets || [EDGE_PASSAGE, EDGE_MONSTER, EDGE_PUZZLE]
  return [
    midpointRoom(opts.midpointRoom || { weight: 1 }),
    deadEnd(opts.deadEnd || { weight: 1 }),
    parallelPath(opts.parallelPath || { weight: 1 }),
    keyDoor(opts.keyDoor || { weight: 1 })
  ].concat(refineEdges(EDGE_PATH, refineTargets, opts.refinement || { weight: 1 }))
}

// A final stage of decoration rules that populate `label.dot.label` on
// every node and edge, from the `type` field. Drop this into a grammar's
// stage list (typically last) so `bin/transform.js -d` produces a DOT
// file whose nodes and edges actually render with readable captions.
function dotDecorationStage (opts) {
  opts = opts || {}
  return {
    name: opts.name || 'decorate',
    rules: [
      { name: 'decorate-node',
        lhs: { node: [{ id: 'a', label: { $and: [{ type: '(.*)' }, { $not: { $test: '(l)=>l&&l.dot&&l.dot.label' } }] } }] },
        rhs: { node: [{ id: 'a', update: { dot: { label: '${a.match.type[1]}' } } }] }
      },
      { name: 'decorate-edge',
        lhs: {
          node: [{ id: 'a' }, { id: 'b' }],
          edge: [{ v: 'a', w: 'b', label: { $and: [{ type: '(.*)' }, { $not: { $test: '(l)=>l&&l.dot&&l.dot.label' } }] }, id: 'e' }]
        },
        rhs: {
          node: [{ id: 'a' }, { id: 'b' }],
          edge: [{
            v: 'a', w: 'b',
            label: { $assign: [{ $eval: '$e.label' }, { dot: { label: '${e.match.type[1]}' } }] }
          }]
        }
      }
    ]
  }
}

// The canonical initial subgraph for a dunjs-style dungeon: a START
// node that expands once into start --path--> win. Use this as the
// `init` stage (with `limit: 1`) of a grammar whose later stages apply
// the primitives above.
function initStartGoalStage (opts) {
  opts = opts || {}
  const startType = opts.startType || NODE_START
  const winType = opts.winType || NODE_WIN
  const pathType = opts.pathType || EDGE_PATH
  const startLabel = opts.startLabel || 'START'
  return {
    name: opts.name || 'init',
    limit: 1,
    rules: [{
      name: 'spawn-start-goal',
      lhs: startLabel,
      rhs: {
        // `nodeId` is hardcoded for the two singleton init nodes so that
        // downstream rules can reference them via `prereq.visited: 'start'`
        // or similar without worrying about iter-derived collisions.
        node: [
          { id: 's', label: { type: startType, nodeId: 'start' } },
          { id: 'g', label: { type: winType, nodeId: 'win' } }
        ],
        edge: [{ v: 's', w: 'g', label: { type: pathType } }]
      }
    }]
  }
}

module.exports = {
  midpointRoom,
  deadEnd,
  parallelPath,
  keyDoor,
  cycleCloseShortcut,
  refineEdge,
  refineEdges,
  defaultRules,
  initStartGoalStage,
  dotDecorationStage,
  // type constants
  EDGE_PATH,
  EDGE_BACKTRACK,
  EDGE_RETURN,
  EDGE_PASSAGE,
  EDGE_MONSTER,
  EDGE_PUZZLE,
  NODE_START,
  NODE_WIN,
  NODE_ROOM,
  NODE_DEAD_END,
  NODE_KEY,
  NODE_DOOR
}
