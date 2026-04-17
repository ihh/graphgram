var _ = require('lodash'),
    extend = require('extend'),
    graphlib = require('graphlib')

// Fast clone for the `possibleAssignments` table. It's always a plain object
// of the shape { subnodeId: { hostNodeId: true, ... }, ... }, so we can skip
// lodash's fully generic cloneDeep (which is noticeably expensive when the
// search recurses many times).
function clonePA (pa) {
  var out = {}
  for (var k in pa) {
    var inner = pa[k], innerCopy = {}
    for (var j in inner) innerCopy[j] = true
    out[k] = innerCopy
  }
  return out
}

// Implementation of Ullmann (1976)
// via http://stackoverflow.com/questions/13537716/how-to-partially-compare-two-graphs/13537776#13537776
function SubgraphSearch (graph, subgraph, opts) {
  opts = opts || {}
  extend (this, { graph, subgraph })
  this.mapping = { assign: {}, label: {}, match: {} }
  this.subnodes = subgraph.nodes()
  this.subedges = subgraph.edges()

  this.labelMatch = opts.labelMatch || function(gLabel,sLabel) { return gLabel === sLabel }
  this.nodeLabelMatch = opts.nodeLabelMatch || this.labelMatch
  this.edgeLabelMatch = opts.edgeLabelMatch || this.labelMatch
  
  // Seed `possibleAssignments` by pre-filtering host nodes through the LHS
  // node-label predicate. Before this pre-filter, every subnode's candidate
  // set was initialized to the entire host graph, so all rejection happened
  // at assignment time deep in the search. Pre-filtering collapses the
  // initial search space dramatically for rules whose LHS nodes specify
  // literal labels (which is most of them).
  var possibleAssignments = {}
  var hostNodes = graph.nodes()
  var search = this
  this.subnodes.forEach (function (sid) {
    var pa = {}
    var sLabel = subgraph.node(sid)
    hostNodes.forEach (function (gid) {
      if (typeof(sLabel) === 'undefined' || search.nodeLabelMatch(graph.node(gid), sLabel))
        pa[gid] = true
    })
    possibleAssignments[sid] = pa
  })

  this.isomorphisms = this.search (possibleAssignments)
}

SubgraphSearch.prototype.testEdgeMatch = function (v, w, label) {
  return this.graph.hasEdge(v,w) && this.edgeLabelMatch (this.graph.edge(v,w), label)
}

// Ullmann refinement: for each subnode i with candidate j in the host, ensure
// that every neighbor x of i in the subgraph has at least one candidate y in
// the host such that the edge (j,y) or (y,j) matches the subgraph edge. If
// not, j cannot be i and is removed. Iterates to fixpoint.
//
// (The previous implementation called subgraph.predecessors(j) with a host ID
// instead of subgraph.predecessors(i), which made refinement a near-no-op in
// most cases — subnode IDs rarely collide with host node IDs. Fixing it lets
// the structural constraints prune candidates early.)
SubgraphSearch.prototype.updatePossibleAssignments = function (possibleAssignments) {
  var search = this, subgraph = this.subgraph
  var changed
  do {
    changed = false
    this.subnodes.forEach (function (i) {
      var pred = subgraph.predecessors(i), succ = subgraph.successors(i)
      Object.keys(possibleAssignments[i]).forEach (function (j) {
        if (succ)
          succ.forEach (function (x) {
            var foundMatch = false, label = subgraph.edge(i,x)
            Object.keys(possibleAssignments[x]).forEach (function (y) {
              foundMatch = foundMatch || search.testEdgeMatch (j, y, label)
            })
            if (!foundMatch) {
              delete possibleAssignments[i][j]
              changed = true
            }
          })
        if (pred)
          pred.forEach (function (x) {
            var foundMatch = false, label = subgraph.edge(x,i)
            Object.keys(possibleAssignments[x]).forEach (function (y) {
              foundMatch = foundMatch || search.testEdgeMatch (y, j, label)
            })
            if (!foundMatch) {
              delete possibleAssignments[i][j]
              changed = true
            }
          })
      })
    })
  } while (changed)
}

SubgraphSearch.prototype.search = function (possibleAssignments) {
  var ss = this, mapping = this.mapping, graph = this.graph, subgraph = this.subgraph, subnodes = this.subnodes, subedges = this.subedges
  this.updatePossibleAssignments (possibleAssignments)
  var nAssigned = Object.keys(mapping.assign).length
  var edgeMatch
  if (nAssigned) {
    var edgeNotFound = false
    edgeMatch = subedges.map (function (edge) {
      var match
      if (!edgeNotFound && mapping.assign[edge.v] && mapping.assign[edge.w]) {
        match = ss.testEdgeMatch (mapping.assign[edge.v], mapping.assign[edge.w], subgraph.edge(edge))
        if (!match)
          edgeNotFound = edge || true
      }
      return match
    })
    if (edgeNotFound)
      return []
  }
  if (nAssigned == subnodes.length) {
    // Shallow clone is sufficient — mapping.assign/label/match are rebuilt at
    // every recursion level, but the inner objects referenced by mapping.match
    // (regex match arrays, label objects) are read-only downstream and can be
    // shared safely.
    var result = {
      assign: extend({}, mapping.assign),
      label: extend({}, mapping.label),
      match: extend({}, mapping.match),
      edgeMatch: edgeMatch
    }
    return [result]
  }
  var nextToAssign = subnodes[nAssigned]
  var sLabel = subgraph.node(nextToAssign)
  var results = []
  Object.keys(possibleAssignments[nextToAssign]).forEach (function (j) {
    var jUsed = false
    Object.keys(mapping.assign).forEach (function (i) {
      if (mapping.assign[i] === j)
        jUsed = true
    })
    if (!jUsed) {
      var gLabel = graph.node(j)
      var match = ss.nodeLabelMatch (gLabel, sLabel)
      if (match) {
        mapping.label[nextToAssign] = gLabel
        mapping.match[nextToAssign] = match
        mapping.assign[nextToAssign] = j
        var newPossibleAssignments = clonePA (possibleAssignments)
        newPossibleAssignments[nextToAssign] = {}
        newPossibleAssignments[nextToAssign][j] = true
        results = results.concat (ss.search (newPossibleAssignments))
        delete mapping.assign[nextToAssign]
        delete mapping.match[nextToAssign]
        delete mapping.label[nextToAssign]
        delete possibleAssignments[nextToAssign][j]
        ss.updatePossibleAssignments (possibleAssignments)
      }
    }
  })
  return results
}

module.exports = { SubgraphSearch }
