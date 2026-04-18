'use strict'

// Generic set-piece factory. A "set-piece" is a curated, theme-specific
// showpiece that inlines a short linear narrative beat-chain into the
// dungeon. Unlike keyDoor (Metroidvania gating) or monsterBattle (random
// engagement), set-pieces are one-shot story moments — the entry edge
// is consumed on use, and on loop-back the player sees a post-visit
// bypass instead.
//
// Structure produced (fan-out from the matched edge's source `a`):
//
//    a ──entry (oneTime)──► setup ─► stealth ─► escape ─┐
//    a ──decline (oneTime)─► decline_node ──────────────┼──► b
//    a ──bypass (prereq.visited=b)─► bypass_node ───────┘
//
// The intermediate decline_node / bypass_node exist purely to work
// around graphlib's single-edge-per-pair limitation — they carry a
// one-line narrative beat of their own so they're not dead weight.

const NODE_STEP   = 'setpiece_step'
const NODE_EXIT   = 'setpiece_exit'
const EDGE_ENTRY  = 'setpiece_entry'
const EDGE_DECL   = 'setpiece_decline'
const EDGE_BYP    = 'setpiece_bypass'
const EDGE_INNER  = 'setpiece'

function macro (name, ctx) { return { $macro: [name, ctx] } }

function nodeIdExpr (role, beat) {
  return { $eval: '"sp_' + role + '_' + beat + '_" + ($$iter + 1)' }
}

// The set-piece's three "first-edges" out of `a` (entry, decline, bypass)
// all inherit the matched edge's edgeId when it has one. This preserves
// any paired backtracks elsewhere in the graph that were keyed on that
// edgeId — traversing the set-piece satisfies them the same way the
// original a→b would have. Falls back to a generated id if the matched
// edge was unpaired.
function inheritedEdgeIdExpr (role) {
  const fallback = '"e_sp_' + role + '_" + ($$iter + 1)'
  return { $eval: '$e.label.edgeId || (' + fallback + ')' }
}

function setpieceIdExpr (role) {
  return { $eval: '"sp_' + role + '_" + ($$iter + 1)' }
}

// spec = {
//   name:         string   — rule name (e.g. 'setpiece-space-opera-rescue')
//   role:         string   — short role prefix for node/edge ids (e.g. 'rescue')
//   beatMacros:   string[3]  — macro names for the 3 linear beats
//   entryMacro:   string   — macro name for entry affordance/narrative
//   declineMacro: string   — macro name for decline node/edge
//   bypassMacro:  string   — macro name for bypass node/edge
//   displayLabel: string   — short graphviz label for the set-piece (optional)
// }
// opts = standard rule opts: { weight, limit, delay }
function makeSetpiece (spec, opts) {
  opts = opts || {}
  const role = spec.role
  const spId = setpieceIdExpr(role)
  // Shared across entry / decline / bypass first-edges: whichever one the
  // player takes, the matched edge's paired backtrack (if any) is satisfied,
  // and the oneTime gates close together so mission-engagement is a single
  // commit-point. See inheritedEdgeIdExpr comments above.
  const sharedEdgeId = inheritedEdgeIdExpr(role)
  const ctx = spId

  const beatId = function (beat) { return nodeIdExpr(role, 'b' + beat) }
  const declineNodeId = nodeIdExpr(role, 'decline')
  const bypassNodeId = nodeIdExpr(role, 'bypass')

  const stepLabel = function (beat, macroName) {
    return {
      type: NODE_STEP,
      setpieceId: spId,
      beat: beat,
      nodeId: beatId(beat),
      text: macro(macroName, spId),
      dot: { label: role + ' ' + beat, shape: 'octagon' }
    }
  }

  const declineLabel = {
    type: NODE_EXIT,
    setpieceId: spId,
    role: 'decline',
    nodeId: declineNodeId,
    text: macro(spec.declineMacro, spId),
    dot: { label: role + ' (decline)', shape: 'trapezium', style: 'dashed' }
  }

  const bypassLabel = {
    type: NODE_EXIT,
    setpieceId: spId,
    role: 'bypass',
    nodeId: bypassNodeId,
    text: macro(spec.bypassMacro, spId),
    dot: { label: role + ' (bypass)', shape: 'trapezium', style: 'dotted' }
  }

  return {
    name: spec.name,
    weight: opts.weight,
    limit: opts.limit,
    delay: opts.delay,
    lhs: {
      node: [
        // Both endpoints must be plain rooms. This excludes leaves
        // (potion, key, door, dead_end) where the player would be
        // stranded after traversing the set-piece — those nodes have
        // only gated backtracks out, and the set-piece route doesn't
        // satisfy any of those gates. Also excludes start / win since
        // rooms aren't either of those.
        { id: 'a', label: { type: 'room' } },
        // Capture b's nodeId so the bypass edge can prereq.visited on it.
        { id: 'b', label: { $and: [{ type: 'room' }, { nodeId: '(.+)' }] } }
      ],
      // Capture the matched edge as `e` so the RHS can inherit its
      // edgeId onto the set-piece's first-edges. No $not:edgeId guard —
      // we now handle paired edges by inheritance instead of refusal.
      edge: [{ v: 'a', w: 'b', label: { type: 'path' }, id: 'e' }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 'setup',   label: stepLabel(1, spec.beatMacros[0]) },
        { id: 'stealth', label: stepLabel(2, spec.beatMacros[1]) },
        { id: 'escape',  label: stepLabel(3, spec.beatMacros[2]) },
        { id: 'dec',     label: declineLabel },
        { id: 'byp',     label: bypassLabel }
      ],
      edge: [
        // Entry: oneTime, carries the entry affordance macro. edgeId is
        // inherited from the matched edge so paired backtracks keep
        // working.
        { v: 'a', w: 'setup', label: {
            type: EDGE_ENTRY,
            setpieceId: spId,
            edgeId: sharedEdgeId,
            oneTime: true,
            link: macro(spec.entryMacro, spId),
            dot: { label: role + ' enter', style: 'bold', color: '#6a3' }
        } },
        // Linear inner path; distinct type so refine-stage ignores it.
        { v: 'setup',   w: 'stealth', label: { type: EDGE_INNER, setpieceId: spId } },
        { v: 'stealth', w: 'escape',  label: { type: EDGE_INNER, setpieceId: spId } },
        { v: 'escape',  w: 'b',       label: { type: EDGE_INNER, setpieceId: spId } },
        // Decline: oneTime, routed via an intermediate node to avoid a
        // parallel a→b edge. Shares edgeId with entry, so taking either
        // commits the player (both become unavailable on revisit).
        { v: 'a', w: 'dec', label: {
            type: EDGE_DECL,
            setpieceId: spId,
            edgeId: sharedEdgeId,
            oneTime: true,
            dot: { label: role + ' decline', style: 'dashed', color: '#b85' }
        } },
        { v: 'dec', w: 'b', label: { type: EDGE_INNER, setpieceId: spId } },
        // Bypass: appears only once b has been visited (via entry or
        // decline). Routed via intermediate node for the same parallel-edge
        // reason. Not oneTime — available on every revisit. Shares the
        // inherited edgeId so taking bypass also satisfies any paired
        // backtrack keyed on the original edge.
        { v: 'a', w: 'byp', label: {
            type: EDGE_BYP,
            setpieceId: spId,
            edgeId: sharedEdgeId,
            prereq: { visited: '${b.match.nodeId[1]}' },
            dot: { label: role + ' bypass', style: 'dotted', color: '#58b' }
        } },
        { v: 'byp', w: 'b', label: { type: EDGE_INNER, setpieceId: spId } }
      ]
    }
  }
}

module.exports = {
  makeSetpiece,
  NODE_STEP,
  NODE_EXIT,
  EDGE_ENTRY,
  EDGE_DECL,
  EDGE_BYP,
  EDGE_INNER
}
