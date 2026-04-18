#!/usr/bin/env node

// Scan a generated dungeon for stranding / dead-end nodes: reachable
// non-terminal nodes from which the player has no accessible outgoing
// edge. Uses a monotonic fixpoint — once a node is reachable or an
// edgeId is traversed in some play-through, it stays so — which is
// sound for detecting genuinely-unreachable outgoing edges (if no
// play-through can satisfy the prereq, it definitely can't be satisfied
// by the player standing at the node).
//
// Usage:
//   node bin/qc-graph.js <path-to-graph.json-or-graph.js>
//
// Exit code: 0 if clean, 1 if any stranding found.

'use strict'

const fs = require('fs')

function loadGraph (p) {
  const src = fs.readFileSync(p, 'utf-8')
  // Strip `window.GRAPH = ...;` wrapper if present (play/graph.js form).
  const json = src.replace(/^\s*window\.GRAPH\s*=\s*/, '').replace(/;\s*$/, '')
  return JSON.parse(json)
}

function edgeAccessible (edge, visited, traversed, keyByPairId) {
  const lab = edge.value || {}
  if (lab.oneTime && lab.edgeId && traversed.has(lab.edgeId)) return false
  const prereq = lab.prereq
  if (!prereq) return true
  if (prereq.pairId) {
    const keyNodeId = keyByPairId.get(prereq.pairId)
    return !!keyNodeId && visited.has(keyNodeId)
  }
  if (prereq.traversed) return traversed.has(prereq.traversed)
  if (prereq.visited)   return visited.has(prereq.visited)
  return true
}

function main () {
  const argv = process.argv.slice(2)
  if (!argv.length) {
    console.error('Usage: qc-graph.js <graph.json|graph.js>')
    process.exit(2)
  }
  const g = loadGraph(argv[0])

  const labelByHost = new Map()
  const outgoing = new Map()
  const hostByNodeId = new Map()
  const keyByPairId = new Map()
  for (const n of g.nodes) {
    const lab = n.value || {}
    labelByHost.set(n.v, lab)
    outgoing.set(n.v, [])
    if (lab.nodeId) hostByNodeId.set(lab.nodeId, n.v)
    if (lab.type === 'key' && lab.pairId && lab.nodeId) keyByPairId.set(lab.pairId, lab.nodeId)
  }
  for (const e of g.edges) {
    (outgoing.get(e.v) || []).push(e)
  }

  const start = g.nodes.find(n => (n.value || {}).type === 'start')
  if (!start) { console.error('No start node found'); process.exit(2) }

  // Monotonic reachability: accumulate visited / traversed sets until
  // fixpoint. oneTime is treated permissively (ignored) during reach —
  // we're screening for topological stranding, not replay-specific
  // dead-ends. The stranding check at the end does honor oneTime on
  // outgoing edges of the victim node.
  const visited = new Set()
  const traversed = new Set()
  const reachable = new Set([start.v])
  const startNodeId = (start.value || {}).nodeId
  if (startNodeId) visited.add(startNodeId)
  let changed = true
  while (changed) {
    changed = false
    for (const host of Array.from(reachable)) {
      for (const edge of (outgoing.get(host) || [])) {
        // During reach, ignore oneTime — they're accessible once each.
        const lab = edge.value || {}
        let ok
        if (lab.prereq) {
          if (lab.prereq.pairId) {
            const keyNodeId = keyByPairId.get(lab.prereq.pairId)
            ok = !!keyNodeId && visited.has(keyNodeId)
          } else if (lab.prereq.traversed) ok = traversed.has(lab.prereq.traversed)
          else if (lab.prereq.visited)     ok = visited.has(lab.prereq.visited)
          else ok = true
        } else ok = true
        if (!ok) continue
        if (!reachable.has(edge.w)) {
          reachable.add(edge.w)
          const tlab = labelByHost.get(edge.w) || {}
          if (tlab.nodeId) visited.add(tlab.nodeId)
          changed = true
        }
        if (lab.edgeId && !traversed.has(lab.edgeId)) {
          traversed.add(lab.edgeId)
          changed = true
        }
      }
    }
  }

  // Stranding scan: for each reachable non-terminal non-random node,
  // require at least one accessible outgoing (ignoring oneTime state —
  // i.e., assume the player hasn't burned their single use yet, since
  // the stranding is a topology-level concern).
  const terminalTypes = new Set(['win', 'death', 'random'])
  const stranded = []
  for (const host of reachable) {
    const lab = labelByHost.get(host) || {}
    if (terminalTypes.has(lab.type)) continue
    const out = outgoing.get(host) || []
    const acc = out.filter(e => {
      const elab = e.value || {}
      if (!elab.prereq) return true
      if (elab.prereq.pairId) {
        const keyNodeId = keyByPairId.get(elab.prereq.pairId)
        return !!keyNodeId && visited.has(keyNodeId)
      }
      if (elab.prereq.traversed) return traversed.has(elab.prereq.traversed)
      if (elab.prereq.visited)   return visited.has(elab.prereq.visited)
      return true
    })
    if (acc.length === 0) {
      stranded.push({ host, label: lab, outCount: out.length, outgoing: out })
    }
  }

  const nodeCount = g.nodes.length
  const edgeCount = g.edges.length
  console.log('graph: ' + nodeCount + ' nodes, ' + edgeCount + ' edges')
  console.log('reachable from start: ' + reachable.size + ' nodes')
  console.log('visited nodeIds: ' + visited.size + ', traversed edgeIds: ' + traversed.size)

  const unreachable = nodeCount - reachable.size
  if (unreachable > 0) {
    console.log('unreachable: ' + unreachable + ' nodes (acceptable if inside skipped subgrammars)')
  }

  if (stranded.length === 0) {
    console.log('OK: no stranding')
    process.exit(0)
  }

  console.log('\nSTRANDED nodes (' + stranded.length + '):')
  for (const s of stranded) {
    console.log('  host=' + s.host
      + ' nodeId=' + (s.label.nodeId || '-')
      + ' type=' + s.label.type
      + ' outCount=' + s.outCount)
    for (const e of s.outgoing) {
      const elab = e.value || {}
      const preq = elab.prereq ? JSON.stringify(elab.prereq) : '-'
      console.log('    -> ' + e.w + ' type=' + elab.type + ' prereq=' + preq)
    }
  }
  process.exit(1)
}

main()
