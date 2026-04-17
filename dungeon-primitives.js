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
const EDGE_BACKTRACK = 'backtrack'
const EDGE_PASSAGE = 'passage'
const EDGE_MONSTER = 'monster'
const EDGE_PUZZLE = 'puzzle'

const NODE_START = 'start'
const NODE_WIN = 'win'
const NODE_ROOM = 'room'
const NODE_DEAD_END = 'dead_end'
const NODE_KEY = 'key'
const NODE_DOOR = 'door'

// Copy common rule-level options onto a rule object without clobbering
// fields that the factory itself populated.
function withOpts (rule, opts) {
  const keys = ['name', 'weight', 'limit', 'type', 'delay', 'condition', 'induced']
  keys.forEach(function (k) {
    if (opts && typeof opts[k] !== 'undefined' && typeof rule[k] === 'undefined') rule[k] = opts[k]
  })
  return rule
}

// Insert a midpoint room between the endpoints of a `path` edge.
//   a --path--> b    =>    a --path--> room --path--> b
function midpointRoom (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const roomType = opts.roomType || NODE_ROOM
  return withOpts({
    name: 'midpoint-room',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: pathType } }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'm', label: { type: roomType } }
      ],
      edge: [
        { v: 'a', w: 'm', label: { type: pathType } },
        { v: 'm', w: 'b', label: { type: pathType } }
      ]
    }
  }, opts)
}

// Hang a dead-end branch off the source of a `path` edge; the original
// edge is preserved.
//   a --path--> b    =>    a --path--> b   &   a --path--> dead_end
function deadEnd (opts) {
  opts = opts || {}
  const pathType = opts.pathType || EDGE_PATH
  const deadEndType = opts.deadEndType || NODE_DEAD_END
  return withOpts({
    name: 'dead-end',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: pathType } }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'd', label: { type: deadEndType } }
      ],
      edge: [
        { v: 'a', w: 'b', label: { type: pathType } },
        { v: 'a', w: 'd', label: { type: pathType } }
      ]
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
  return withOpts({
    name: 'parallel-path',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: pathType } }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'm', label: { type: roomType } }
      ],
      edge: [
        { v: 'a', w: 'b', label: { type: pathType } },
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
    text: bundled('keyText', 'There is a key here. You pick it up.'),
    dot: { label: pairLabel(keyType), shape: 'diamond' }
  }
  const doorLabel = {
    type: doorType,
    pairId: pairId,
    text: bundled('shutText', 'There is a door here. It is closed and locked.'),
    dot: { label: pairLabel(doorType), shape: 'house' }
  }
  if (narrate) doorLabel.theme = { $kdBundle: [iterArg, 'theme'] }

  const branchEdgeLabel = {
    type: pathType,
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
    prereq: {
      pairId: pairId,
      link: bundled('unlock', 'Unlock the door with the key.'),
      after: bundled('after', 'The key unlocks the door. You go through.')
    },
    dot: { label: pairLabel('locked'), style: 'bold', color: 'red' }
  }
  const backtrackEdgeLabel = {
    type: backtrackType,
    dot: { label: backtrackType, style: 'dashed', color: 'gray' }
  }

  return withOpts({
    name: 'key-door',
    lhs: {
      node: [{ id: 'a' }, { id: 'b' }],
      edge: [{ v: 'a', w: 'b', label: { type: pathType } }]
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
        { v: 'a', w: 'd', label: { type: pathType } },
        { v: 'd', w: 'b', label: lockedEdgeLabel }
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
        node: [
          { id: 's', label: { type: startType } },
          { id: 'g', label: { type: winType } }
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
  refineEdge,
  refineEdges,
  defaultRules,
  initStartGoalStage,
  dotDecorationStage,
  // type constants
  EDGE_PATH,
  EDGE_BACKTRACK,
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
