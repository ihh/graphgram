var _ = require('lodash'),
    fs = require('fs'),
    extend = require('extend'),  // NB: skips undefined values, unlike lodash extend (or lodash assign)
    graphlib = require('graphlib'),
    jsonschema = require('jsonschema'),
    colors = require('colors'),
    MersenneTwister = require('mersennetwister'),
    SubgraphSearch = require('./subgraph').SubgraphSearch

function isArray (obj) {
  return Object.prototype.toString.call(obj) === '[object Array]'
}

// main Grammar object
function Grammar (json, opts) {
  if (opts)
    extend (this, opts)
  this.matcher = this.matcher || new Matcher()

  this.rules = []
  if (json) {
    this.validate (json)
    extend (this, json)
  }

  this.init()
}

Grammar.fromFile = function (grammarFilename, grammarOpts) {
  var grammarText = fs.readFileSync(grammarFilename).toString()
  var grammarJson = eval ('(' + grammarText + ')')
  return new Grammar (grammarJson, grammarOpts)
}

// main API method to evolve a graph using the grammar
Grammar.prototype.evolve = function (opts) {
  var grammar = this
  opts = opts || {}

  var mt = opts.rnd || new MersenneTwister (opts.seed)
  var context = new Context ({ grammar: this, rnd: mt }, { verbose: opts.verbose })

  if (opts.graph) {
    context.graph = opts.graph
    context.warn (colors.yellow ("Initial grammar has " + context.graph.nodes().length + " nodes, " + context.graph.edges().length + " edges"))
    context.findNextIds()
  } else {
    context.graph = new graphlib.Graph()
    context.addNode (grammar.start)
    context.warn (colors.yellow ("Initializing grammar with " + grammar.start))
  }
  var graph = context.graph
  var limit = typeof(opts.limit) !== 'undefined' ? parseInt(opts.limit) : this.limit

  var iterations = 0
  if (this.stages) {
    // staged grammar: iterate over subgrammars
    this.stages.forEach (function (subgrammar, stage) {
      var subLimit = limit
      if (typeof(subgrammar.limit) !== 'undefined' && (typeof(subLimit) === 'undefined' || subgrammar.limit < subLimit))
        subLimit = subgrammar.limit

      if (subLimit == 0 || (typeof(opts.stage) !== 'undefined' && stage != parseInt(opts.stage))) {
        context.warn (colors.cyan ("Skipping " + subgrammar.displayName + " of " + grammar.displayName))
        return
      }
      
      context.warn (colors.cyan ("Entering " + subgrammar.displayName + " of " + grammar.displayName))
      var info = subgrammar.evolve ({ graph: graph,
				      verbose: opts.verbose,
				      limit: subLimit,
				      rnd: mt })
      iterations += info.iterations
      if (typeof(limit) === 'number')
	limit -= info.iterations
    })
  } else {
    // not a staged grammar: iterate over rules
    for (iterations = 0; typeof(limit) === 'undefined' || iterations < limit; ++iterations) {
      context.updateIteration (iterations)
      // sample a rule application
      var site = context.sampleRuleSite()
      if (!site)
        break
      // apply the rule
      context.applyRuleAtSite (site)
    }
  }

  return { iterations, graph }
}

// Convert graphlib graph to graphviz dot format
Grammar.prototype.toDot = function (graph) {
  var grammar = this
  return ["digraph G {"]
    .concat (graph.nodes().map (function (id) {
      return '  ' + id + grammar.dotAttrs(graph.node(id)) + ';'
    })).concat (graph.edges().map (function (edge) {
      return '  ' + edge.v + ' -> ' + edge.w + grammar.dotAttrs(graph.edge(edge)) + ';'
    })).concat (['}',''])
    .join("\n")
}

Grammar.prototype.dotAttrs = function (label) {
  var attrText = ''
  if (typeof(label) === 'string') attrText = ' [label="' + label + '"]'
  else if (typeof(label) === 'object' && label.dot)
    attrText = ' [' + Object.keys(label.dot).map((a) => (a + '="' + label.dot[a] + '"')).join(',') + ']'
  return attrText
}

// private validation & setup methods (yes I know they're not really private)
Grammar.prototype.makeGraphSchema = function (lhs) {
  var canonical = this.canonical
  var labelSchema = { '$ref': (lhs ? '#/definitions/lhs_label' : '#/definitions/rhs_label') }
  var headTailSchema = { '$ref': (canonical ? '#/definitions/identifier_list' : '#/definitions/identifier_or_list') }
  return {
    oneOf: (canonical
            ? []
            : [{ type: 'array', items: { type: 'string' } },  // interpreted as a chain of nodes
               { type: 'string' }])  // interpreted as a single node
      .concat ([
        { type: 'object',
          required: (canonical || lhs) ? ['node'] : [],
          additionalProperties: false,
          properties: {
            node: {
              type: 'array',
              minItems: 1,
              items: {
                oneOf: (canonical
                        ? []
                        : [{ type: 'string' },  // interpreted as a label
                           { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } }]  // interpreted as [id,label]
			.concat (lhs ? [] : [
			  { type: 'object',
			    additionalProperties: false,
			    required: ['id','update'],
			    properties:
			    { id: { '$ref': '#/definitions/identifier' },
                              update: labelSchema,
                              head: headTailSchema,
                              tail: headTailSchema } } ]))
		  .concat ([
                    { type: 'object',
                      additionalProperties: false,
                      properties: extend ({
                        id: { '$ref': '#/definitions/identifier' },
                        label: labelSchema,
                      }, lhs ? {
                        strict: { type: 'boolean' }  // if true, then matching graph node cannot have any neighbors that are not in the subgraph
                      } : {
                        head: headTailSchema,  // if an lhs node is specified here, incoming edges to that lhs node will be attached
                        tail: headTailSchema   // if an lhs node is specified here, outgoing edges from that lhs node will be attached
                      })
                    }
                  ])
              }
            },
            edge: {
              type: 'array',
              items: {
                anyOf: (canonical
                        ? []
                        : [{ type: 'array',
			     minItems: 2,
			     maxItems: lhs ? 4 : 3,
			     items: [ { type: ['string','number'] },  // v
				      { type: ['string','number'] },  // w
				      labelSchema ]  // label
                             .concat (lhs ? [{type:'string'}] : []) }]  // id
                        .concat (lhs ? [] : [
                          { type: 'object',
                            additionalProperties: false,
                            required: ['id'],
                            properties: { id: { '$ref': '#/definitions/identifier' },
					  label: labelSchema }
                          },
                          { type: 'object',
                            additionalProperties: false,
                            required: ['id','update'],
                            properties: { id: { '$ref': '#/definitions/identifier' },
					  update: labelSchema }
                          },
			  { type: 'object',
			    additionalProperties: false,
			    required: ['v','w','update'],
			    properties: { v: { '$ref': '#/definitions/identifier' },
					  w: { '$ref': '#/definitions/identifier' },
					  update: labelSchema }
			  },
			  { type: 'string' }]))
                  .concat ([
                    { type: 'object',
                      additionalProperties: false,
                      required: ['v','w'],
                      properties: extend ({
                        v: { '$ref': '#/definitions/identifier' },
                        w: { '$ref': '#/definitions/identifier' },
                        label: labelSchema
                      }, lhs ? { id: { '$ref': '#/definitions/identifier' } } : {})
                    }
                  ])
              }
            }
          }
        }
      ])
  }
}

Grammar.prototype.makeGrammarSchema = function (topLevel, staged) {
  return extend ({
    type: 'object',
    required: (staged ? ['stages'] : ['rules']),
    additionalProperties: false,
    properties: extend
    (staged
     ? { stages: { type: 'array', minItems: 1, items: { '$ref': '#/definitions/subgrammar' } } }
     : { rules: { '$ref': '#/definitions/rules' } },
     { name: { type: 'string' },
       limit: { type: 'number' },  // maximum number of rule applications
       induced: { type: 'boolean' } },  // default 'induced', overridden by 'induced' for individual stages/rules
     topLevel ? {start:{}} : {})
  })
}

Grammar.prototype.makeSchema = function() {
  return {
    oneOf: [ this.makeGrammarSchema(true,false),
	     this.makeGrammarSchema(true,true) ],
    definitions: {
      identifier: {
        type: 'string',
        pattern: '^[a-zA-Z_0-9]+$'
      },
      identifier_list: { type: 'array', items: { '$ref': '#/definitions/identifier' } },
      identifier_or_list: {
        oneOf: [{ type: 'string' }, { '$ref': '#/definitions/identifier_list' }]
      },
      lhs_label: this.matcher.makeLhsLabelSchema ({ '$ref': '#/definitions/lhs_label' }),
      rhs_label: this.matcher.makeRhsLabelSchema ({ '$ref': '#/definitions/rhs_label' }),
      rules: {
        type: 'array',
        items: {
          type: 'object',
          required: ['lhs','rhs'],
          additionalProperties: false,
          properties: {
	    name: { type: 'string' },
            lhs: this.makeGraphSchema(true),
            rhs: this.makeGraphSchema(false),
            induced: { type: 'boolean' },  // if true, match lhs using induced subgraph search
            condition: { type: 'string' },  // eval'd string. Use $id.label for labels, $id.match[n] for n'th matching group, $$iter for iteration#, $$graph for graph
            weight: { type: ['string','number'] },  // string is eval'd using same expansions as 'condition'
            limit: { type: 'number' },  // max number of times this rule can be used
            type: { type: 'string' },  // if set, then 'limit' for this rule applies to all rules of this type
            delay: { type: 'number' },  // minimum number of iterations (rule applications) before this rule can be used
          }
        }
      },
      subgrammar: this.makeGrammarSchema(false,false)
    }
  }
}

Grammar.prototype.validate = function (json) {
  var validator = new jsonschema.Validator()
  var schema = this.makeSchema()
  var result = validator.validate (json, schema, {nestedErrors: true})
  if (result.errors.length) {
    var errs = result.errors.map (function (ve) { return ve.stack }).join("\n")
    throw new Error ("Schema validation error:\n" + errs)
  }
}

Grammar.prototype.warn = function() {
  if (this.verbose)
    console.warn.apply (console, arguments)
}

Grammar.prototype.warnVerbose = function() {
  if (this.verbose > 1)
    console.warn.apply (console, arguments)
}

Grammar.prototype.init = function() {
  var grammar = this
  this.displayName = this.name || this.displayName || 'graph-grammar'

  if (this.stages)
    this.stages = this.stages.map ((subgrammar, n) => new Grammar (extend ( { induced: this.induced },
									    subgrammar),
                                                                   { matcher: this.matcher,
								     displayName: this.displayName + ' stage #' + n }))

  this.rules.forEach (function (rule, n) {
    rule.countType = rule.type || String(n)
    rule.displayName = rule.name || ('rule #' + n)

    var linkHeadTailRhs = false, headOrTail = {}
    function checkGraph (prop, nodeIdFactory, lhsInfo) {
      var isNodeId = {}, isEdgeId = {}
      var name = rule.displayName + ' ' + prop
      
      // do some auto-expansion of syntactic sugar
      if (!grammar.canonical) {
	if (typeof(rule[prop]) === 'string') {
          // a string expands to a single node, and triggers automatic linking of head & tail
          linkHeadTailRhs = true
          rule[prop] = { node: [{ id: 'a', label: rule[prop] }] }
	} else if (isArray(rule[prop])) {
          // an array of strings expands to a chain of nodes, and triggers automatic linking of head & tail
          linkHeadTailRhs = true
          rule[prop] = { node: rule[prop].map (function (label, n) { return { id: nodeIdFactory(n), label: label, strict: prop === 'lhs' ? (n == 0 || n == rule[prop].length - 1) : undefined } }),
			 edge: rule[prop].slice(1).map (function (_label, n) { return [ nodeIdFactory(n), nodeIdFactory(n+1) ] }) }
	}
      }

      // now we have a graph
      var graph = rule[prop]

      // more syntactic sugar
      if (!grammar.canonical) {
	// if node is missing on rhs, copy it from lhs
	if (typeof(graph.node) === 'undefined')
          graph.node = _.cloneDeep (rule.lhs.node)
	graph.node = graph.node.map (function (node, n) {
          // if a node is a string or number, interpret it as a label, and auto-assign it an ID
          // if a node is a 2-tuple, interpret it as an [id,label] pair
	  if (isArray(node))
	    return { id: node[0], label: node[1] }
	  else if (typeof(node) === 'object') {
	    if (typeof(node.id) === 'undefined')
	      node.id = nodeIdFactory(n)
	    // if a node doesn't have a 'label' but has the ID of an LHS node, then copy the label over
	    // or, if it has an '{assign:X}', create the corresponding label expression '{$assign:[{$eval:"$id.label"},X]}'
	    if (typeof(node.label) === 'undefined' && lhsInfo && lhsInfo.isNodeId[node.id])
	      node.label = node.update
	      ? grammar.matcher.makeLabelUpdate (node.id, node.update)
	      : grammar.matcher.makeLabelEval (node.id)
	    delete node.update
	    return node
	  }
	  return { id: nodeIdFactory(n), label: node }
	})
	if (prop === 'rhs' && linkHeadTailRhs
	    && !(rule.lhs.node.length == 1 && graph.node.length == 1 && rule.lhs.node[0].id === graph.node[0].id)) {
          graph.node[0].head = rule.lhs.node[0].id
          graph.node[graph.node.length - 1].tail = rule.lhs.node[rule.lhs.node.length - 1].id
	}
	graph.node.forEach (function (node) {
          // if head/tail is a string, convert it to a single-element array
          if (typeof(node.head) === 'string') node.head = [node.head]
          if (typeof(node.tail) === 'string') node.tail = [node.tail]
	})
	if (graph.edge)
          graph.edge = graph.edge.map (function (edge) {
            // if an edge is a string, interpret it as an id
            // if an edge is a 2-, 3- or 4-tuple, interpret it as [v,w,label,id]
            var e = typeof(edge) === 'string' ? { id: edge } : (isArray(edge) ? { v: edge[0], w: edge[1], label: edge[2], id: edge[3] } : edge)
            e.v = typeof(e.v) !== 'undefined' && String (e.v)
            e.w = typeof(e.w) !== 'undefined' && String (e.w)
            e.id = e.id && String (e.id)
	    // if an edge doesn't have a 'label' but has the ID of an LHS edge, then copy the label over
	    // or, if it has an '{assign:X}', create the corresponding label expression '{$assign:[{$eval:"$id.label"},X]}'
	    if (e.id && lhsInfo) {
	      if (lhsInfo.isEdgeId[e.id]) {
		if (typeof(e.label) === 'undefined')
		  e.label = e.update
		  ? grammar.matcher.makeLabelUpdate (e.id, e.update)
		  : grammar.matcher.makeLabelEval (e.id)
		// if v or w is undefined, copy those over
		if (typeof(e.v) === 'undefined') e.v = lhsInfo.isEdgeId[e.id].v
		if (typeof(e.w) === 'undefined') e.w = lhsInfo.isEdgeId[e.id].w
	      }
	      // remove noncanonical sugary properties from RHS edges
	      delete e.id
	      delete e.update
	    }
            return e
          })
      }

      // all done with syntactic sugar
      // now validate IDs
      var heads = {}, tails = {}
      function checkNodeId (id, desc, isNodeId) {
        if (!isNodeId[id]) throw new Error ("In " + name + ", " + desc + ": " + id + " is not a node ID")
      }
      function countNodeId (id, linkType, count, rhsNodeId) {
        checkNodeId (id, 'node ' + rhsNodeId + ' ' + linkType, lhsInfo.isNodeId)
        if (count[id])
          throw new Error ("In " + name + ": " + id + " appears as " + linkType + " for more than one rhs node")
        count[id] = true
        if (id !== rhsNodeId)
          headOrTail[id] = linkType
      }
      graph.node.forEach (function (node) {
        if (isNodeId[node.id]) throw new Error ("In " + name + ": duplicate node ID " + node.id)
        isNodeId[node.id] = node
        if (lhsInfo) {
          if (node.head)
            node.head.forEach (function (head) { countNodeId (head, 'head', heads, node.id) })
          if (node.tail)
            node.tail.forEach (function (tail) { countNodeId (tail, 'tail', tails, node.id) })
        }
      })
      if (graph.edge)
        graph.edge.forEach (function (edge) {
          checkNodeId (edge.v, 'edge.v', isNodeId)
          checkNodeId (edge.w, 'edge.w', isNodeId)
          if (edge.id) {
            if (isNodeId[edge.id] || isEdgeId[edge.id]) throw new Error ("In " + name + ": duplicate edge ID " + edge.id)
            isEdgeId[edge.id] = edge
          }
        })

      return { isNodeId, isEdgeId }
    }
    var lhsInfo = checkGraph ('lhs', (n) => String.fromCharCode(97+n))
    var rhsInfo = checkGraph ('rhs', (n) => String(n), lhsInfo)
    Object.keys(headOrTail).forEach (function (id) {
      if (rhsInfo.isNodeId[id])
        throw new Error ("In " + rule.displayName + ": lhs node " + id + " is listed as " + headOrTail[id] + " for an rhs node, but is also an rhs node ID")
    })
  })

  this.rules.forEach (function (rule) {
    rule.lhsGraph = grammar.makeGraph (rule.lhs)
  })
}

Grammar.prototype.canonicalGraphJson = function (graph, lhs) {
  return { node: graph.node, edge: graph.edge }
}

Grammar.prototype.canonicalJson = function() {
  var grammar = this
  var grammarProps = ['name','limit','induced','start']
  var ruleProps = ['name','induced','condition','weight','limit','type','delay']
  return extend (_.zipObject (grammarProps, grammarProps.map ((prop) => grammar[prop])),
		 { stages: this.stages && this.stages.map ((subgrammar) => subgrammar.canonicalJson()),
		   rules: this.stages ? undefined : this.rules.map ((rule) => {
		     return extend ({ lhs: grammar.canonicalGraphJson (rule.lhs),
				      rhs: grammar.canonicalGraphJson (rule.rhs) },
				    _.zipObject (ruleProps, ruleProps.map ((prop) => rule[prop]))) }) })
}

Grammar.prototype.makeGraph = function (json) {
  var graph = new graphlib.Graph()
  json.node.forEach (function (node) {
    graph.setNode (node.id, node.label)
  })
  if (json.edge)
    json.edge.forEach (function (edge) {
      graph.setEdge (edge.v, edge.w, edge.label)
    })
  return graph
}

// Context is an object that wraps the current grammar, graph, and iteration & does the actual graph-rewriting
function Context (json, opts) {
  extend (this, json, { nextNodeId: 1 })
  this.matcher = this.grammar.matcher
  this.warnVerbose = this.grammar.warnVerbose
  this.warn = this.grammar.warn
  this.verbose = this.grammar.verbose

  this.ruleCount = {}
  this.grammar.rules.forEach ((rule) => { this.ruleCount[rule.countType] = 0 })

  extend (this, opts)
}

Context.prototype.findNextIds = function() {
  var context = this
  this.graph.nodes().forEach (function (id) {
    var n = parseInt (id)
    if (n) context.nextNodeId = Math.max (context.nextNodeId, n + 1)
  })
}

Context.prototype.updateIteration = function (iter) {
  this.iter = iter
  var keys = ['iter','graph'], base = {}
  keys.forEach ((key) => { base['$'+key] = this[key] })
  this.matcher.setBaseContext (base)
  this.warn (colors.cyan ("Iteration " + (iter+1) + " of " + this.grammar.displayName))
}

// main method for matching a rule
Context.prototype.sampleRuleSite = function() {
  var context = this, grammar = this.grammar, graph = this.graph
  // find all sites at which a rule matches
  var labelMatch = this.matcher.labelMatch.bind (this.matcher)
  var nodes = graph.nodes(), edges = graph.edges(), sites = []
  grammar.rules.forEach (function (rule, n) {
    if (rule.limit && context.ruleCount[rule.countType] >= rule.limit)
      return
    if (rule.delay && this.iter < rule.delay)
      return
    
    var isomorphs = new SubgraphSearch (graph, rule.lhsGraph, { labelMatch }).isomorphisms
    isomorphs.forEach (function (isomorph) {
      var mismatch = false
      rule.lhs.node.forEach (function (node) {
        mismatch = mismatch || (node.strict && rule.lhsGraph.neighbors(node.id).length != graph.neighbors(isomorph.assign[node.id]).length)
      })
      if (rule.induced || (typeof(rule.induced) === 'undefined' && grammar.induced))
        rule.lhs.node.forEach (function (iNode) {
          var si = iNode.id, gi = isomorph.assign[si]
          rule.lhs.node.forEach (function (jNode) {
            var sj = jNode.id, gj = isomorph.assign[sj]
            mismatch = mismatch || (graph.hasEdge(gi,gj) && !subgraph.hasEdge(si,sj))
          })
        })
      if (!mismatch) {
        if (rule.lhs.edge)
          rule.lhs.edge.forEach (function (edge, n) {
            if (edge.id) {
              isomorph.match[edge.id] = isomorph.edgeMatch[n]
	      isomorph.label[edge.id] = graph.edge (isomorph.assign[edge.v], isomorph.assign[edge.w])
	    }
          })
        if (context.evalCond (isomorph, rule)) {
          var weight = context.evalWeight (isomorph, rule)
          context.warnVerbose ('Found match ' + context.nodeList(isomorph.assign,colors.red) + ' to ' + rule.displayName + ' with weight ' + colors.blue(weight))
          sites.push ({ weight, isomorph, rule })
        }
      }
    })
  })

  // sample a rule application site
  var totalWeight = sites.reduce (function (total, s) { return total + s.weight }, 0)
  var w = this.rnd.rnd() * totalWeight, m = -1
  while (w > 0 && ++m < sites.length - 1)
    w -= sites[m].weight

  context.warnVerbose(colors.blue("Total weight is " + totalWeight + "; " + (totalWeight > 0 ? ("sampled " + sites[m].rule.displayName) : "no rules to apply")))
  return totalWeight > 0 ? sites[m] : false
}

// method for rewriting the graph using a matched rule
Context.prototype.applyRuleAtSite = function (site) {
  var context = this, graph = this.graph, isomorph = site.isomorph, rule = site.rule, oldId = isomorph.assign
  ++this.ruleCount[rule.countType]
  var newLabel = {}, newId = {}
  rule.rhs.node.forEach (function (node) {
    newLabel[node.id] = context.newLabel (isomorph, node.label)
    newId[node.id] = context.addNode (newLabel[node.id])
  })
  context.warn ("Replacing nodes " + context.nodeList(oldId,colors.red) + " with " + context.nodeList(newId,colors.green))
  if (rule.lhs.edge)
    rule.lhs.edge.forEach (function (edge) {
      graph.removeEdge (oldId[edge.v], oldId[edge.w])
    })
  rule.lhs.node.forEach (function (node) {
    if (newId[node.id]) {
      context.reattachOutgoing (oldId[node.id], newId[node.id])
      context.reattachIncoming (oldId[node.id], newId[node.id])
    } else {
      var headId, tailId
      rule.rhs.node.forEach (function (rhsNode) {
        if (rhsNode.head && rhsNode.head.indexOf(node.id) >= 0) headId = rhsNode.id
        if (rhsNode.tail && rhsNode.tail.indexOf(node.id) >= 0) tailId = rhsNode.id
      })
      if (headId)
        context.reattachIncoming (oldId[node.id], newId[headId])
      if (tailId)
        context.reattachOutgoing (oldId[node.id], newId[tailId])
    }
    graph.removeNode (oldId[node.id])
  })
  if (rule.rhs.edge)
    rule.rhs.edge.forEach (function (edge) {
      var label = context.newLabel (isomorph, edge.label)
      context.addEdge (newId[edge.v], newId[edge.w], label)
      context.warn ("Adding edge " + context.edgeDesc(newId[edge.v],newId[edge.w],label,colors.green,colors.green))
    })
}

Context.prototype.addNode = function (label) {
  var id = String (this.nextNodeId++)
  this.graph.setNode (id, label)
  return id
}

Context.prototype.addEdge = function (src, dest, label) {
  this.graph.setEdge (src, dest, label)
}

Context.prototype.evalCond = function (isomorph, rule) {
  return this.evalMatchExpr (isomorph, rule.condition, true)
}

Context.prototype.evalWeight = function (isomorph, rule) {
  return this.evalMatchExpr (isomorph, rule.weight, 1)
}

Context.prototype.evalMatchExpr = function (isomorph, expr, defaultVal) {
  if (typeof(expr) === 'undefined')
    return defaultVal
  return this.matcher.evalMatchExpr (isomorph, expr)
}

Context.prototype.newLabel = function (isomorph, expr) {
  return this.matcher.newLabel (isomorph, expr)
}

Context.prototype.reattachIncoming = function (oldId, newId) {
  var context = this, graph = this.graph
  var incoming = graph.predecessors(oldId)
  if (incoming)
    incoming.forEach (function (pred) {
      var label = graph.edge (pred, oldId)
      context.addEdge (pred, newId, label)
      graph.removeEdge (pred, oldId)
      context.warnVerbose ("Replacing incoming edge " + context.edgeDesc(pred,oldId,label,colors.green,colors.red) + " with " + context.edgeDesc(pred,newId,label,colors.green,colors.green))
    })
}

Context.prototype.reattachOutgoing = function (oldId, newId) {
  var context = this, graph = this.graph
  var outgoing = graph.successors(oldId)
  if (outgoing)
    outgoing.forEach (function (succ) {
      var label = graph.edge (oldId, succ)
      context.addEdge (newId, succ, label)
      graph.removeEdge (oldId, succ)
      context.warnVerbose ("Replacing outgoing edge " + context.edgeDesc(oldId,succ,label,colors.red,colors.green) + " with " + context.edgeDesc(newId,succ,label,colors.green,colors.green))
    })
}

Context.prototype.labelString = function (label) {
  return typeof(label) === 'object' ? JSON.stringify(label) : label
}

Context.prototype.nodeList = function (assign, color) {
  var context = this
  return '{' + Object.keys(assign).map((id) => (id+':'+context.nodeDesc(assign[id],color))).join (",") + '}'
}

Context.prototype.nodeDesc = function (id, color, rev) {
  color = color.bind (colors)
  var idText = color(id), labelText = colors.inverse(color(this.labelString(this.graph.node(id))))
  return rev ? (labelText + idText) : (idText + labelText)
}

Context.prototype.edgeDesc = function (src, dest, label, srcColor, destColor) {
  var srcDesc = this.nodeDesc(src,srcColor), destDesc = this.nodeDesc(dest,destColor,true)
  return srcDesc + colors.yellow('-') + (label ? colors.inverse(colors.yellow(this.labelString(label))) : '') + colors.yellow('>') + destDesc
}

// Matcher is an object that encapsulates the JSON query language
// It could, in theory, be overridden to use a different query language
// (you'd also need to provide a JSON schema for that language, or just use a permissive schema)
function Matcher() {
  extend (this, {
    // special terms used in lhs label expressions
    equalsKey:  '$equals',
    containsKey:  '$contains',
    findKey:  '$find',  // recursive descent search
    testKey:  '$test',  // defines a function that is then applied to the label, yielding truthy/falsy
    notKey:  '$not',
    andKey:  '$and',
    orKey:  '$or',

    // special terms used in rhs label expressions
    evalKey:  '$eval',
    extendKey:  '$extend',  // skips undefined values
    assignKey:  '$assign',  // does not skip undefined values
    mergeKey:  '$merge'  // is recursive
  })
}

Matcher.prototype.mapObject = function (obj, f) {
  var result = {}
  Object.keys(obj).forEach (function (k) { result[k] = f(obj[k]) })
  return result
}

Matcher.prototype.setBaseContext = function (baseContext) {
  this.baseContext = baseContext
}

Matcher.prototype.makeExtendedContext = function (isomorph) {
  var extendedContext = extend ({}, this.baseContext)
  Object.keys(isomorph.assign).forEach (function (id) {
    extendedContext[id] = { id: isomorph.assign[id] }
  })
  Object.keys(isomorph.match).forEach (function (id) {
    extendedContext[id] = extend (extendedContext[id] || {},
                                  { label: isomorph.label[id],
                                    match: isomorph.match[id].match })
  })
  return extendedContext
}

// schema for label queries (used in 'label' on the LHS of rules)
Matcher.prototype.makeLhsLabelSchema = function (ref) {
  return {
    oneOf: [{ type: ['string','number','boolean','array'] },
            { type: 'object',
              maxProperties: 1,
              additionalProperties: false,
              properties: {
                '$equals': ref,
                '$contains': ref,
                '$find': ref,
                '$not': ref,
                '$and': { type: 'array', minItems: 1, items: ref },
                '$or': { type: 'array', minItems: 1, items: ref },
                '$test': { type: 'string' }
              }
            },
            { type: 'object',
              additionalProperties: false,
              patternProperties: {
                '^[^$].*$': ref
              }
            }]
  }
}

// queries
Matcher.prototype.labelMatch = function (gLabel, sLabel, opts) {
  var labelMatch = this.labelMatch.bind (this)
  opts = opts || {}
  if (typeof(sLabel) === 'undefined')
    return { match: gLabel }
  var typesMatch = (typeof(sLabel) === typeof(gLabel))
  if (typeof(sLabel) === 'string') {
    var match
    return typesMatch && (match = new RegExp('^'+sLabel+'$').exec (gLabel)) && { match: match.slice(0) }
  } else if (isArray(sLabel)) {
    if (!isArray(gLabel) || sLabel.length !== gLabel.length)
      return false
    var allMatch = true
    var match = sLabel.map (function (s, n) {
      var m
      if (allMatch) {
	m = labelMatch (gLabel[n], s, opts)
	if (!m) allMatch = false
      }
      return m && m.match
    })
    return allMatch && { match }
  } else if (typeof(sLabel) === 'object') {
    var match = {}, clauseMatch
    if (sLabel[this.equalsKey])
      return labelMatch (gLabel, sLabel[this.equalsKey], extend ({}, opts, {exact:true}))
    if (sLabel[this.containsKey])
      return labelMatch (gLabel, sLabel[this.containsKey], extend ({}, opts, {exact:false}))
    if (sLabel[this.notKey])
      return !labelMatch (gLabel, sLabel[this.notKey], opts) && {}
    if (sLabel[this.andKey])
      return sLabel[this.andKey].reduce (function (allTrue, clause) {
        return allTrue && (clauseMatch = labelMatch (gLabel, clause, opts)) && extend (match, clauseMatch.match)
      }, true) && { match }
    if (sLabel[this.orKey])
      return sLabel[this.orKey].reduce (function (anyTrue, clause) {
        return anyTrue || ((clauseMatch = labelMatch (gLabel, clause, opts)) && ((match = clauseMatch.match) || true))
      }, false) && { match }
    if (sLabel[this.findKey]) {
      var findLabel = sLabel[this.findKey]
      function find (g) {
        var result = labelMatch (g, findLabel, opts)
        if (isArray(g))
          result = g.reduce (function (r, c) { return r || find(c) }, result)
        else if (typeof(g) === 'object')
          result = Object.keys(g).reduce (function (r, k) { return r || find(g[k]) }, result)
        return result
      }
      return find (gLabel)
    }
    if (sLabel[this.testKey])
      return (eval(sLabel[this.testKey]) (gLabel)) && {}

    var allMatch = typesMatch && (!opts.exact || Object.keys(gLabel).length == Object.keys(sLabel).length)
    Object.keys(sLabel).forEach (function (k) {
      if (allMatch) {
	var m = labelMatch (gLabel[k], sLabel[k], opts)
	if (m)
	  match[k] = m.match
	else
	  allMatch = false
      }
    })
    return allMatch && { match }
  } else
    return typesMatch && gLabel === sLabel && { match: gLabel }
}

// schema for label evaluations (used in 'condition' & 'weight' on LHS of rules, and 'label' on RHS of rules)
Matcher.prototype.makeRhsLabelSchema = function (ref) {
  return {
    oneOf: [{ type: ['string','number','boolean','array'] },
            { type: 'object',
              maxProperties: 1,
              additionalProperties: false,
              properties: {
                '$eval': { type: ['string','array','object'] },
                '$extend': { type: 'array', minItems: 2, items: ref },
                '$assign': { type: 'array', minItems: 2, items: ref },
                '$merge': { type: 'array', minItems: 2, items: ref }
              }
            },
            { type: 'object',
              additionalProperties: false,
              patternProperties: {
                '^[^$].*$': ref
              }
            }]
  }
}

// direct evaluation syntax e.g. "$id.label + 'some_extra_text'"
Matcher.prototype.evalMatchExpr = function (isomorph, expr) {
  var evalMatchExprForIsomorph = this.evalMatchExpr.bind (this, isomorph)
  if (typeof(expr) === 'undefined')
    return defaultVal
  else if (typeof(expr) === 'string') {
    var extendedContext = this.makeExtendedContext(isomorph)
    var defs = Object.keys(extendedContext).map (function (key) {
      return '$' + key + '=' + JSON.stringify(extendedContext[key]) + ';'
    }).join('')
    return eval(defs + expr)
  } else if (isArray(expr))
    return expr.map (evalMatchExprForIsomorph)
  else if (typeof(expr) === 'object')
    return this.mapObject (expr, evalMatchExprForIsomorph)
  else
    return expr
}

// expansion syntax e.g. "${id.label}some_extra_text"
Matcher.prototype.newLabel = function (isomorph, expr) {
  var newLabelForIsomorph = this.newLabel.bind (this, isomorph)
  if (typeof(expr) === 'string') {
    var extendedContext = this.makeExtendedContext(isomorph)
    return expr.replace (/\${([a-zA-Z_0-9\.\$\[\]]+)}/g, function (_m, v) {
      return eval ('extendedContext.' + v) || ''
    })
  } else if (isArray(expr))
    return expr.map (newLabelForIsomorph)
  else if (typeof(expr) === 'object') {
    if (expr[this.evalKey])
      return this.evalMatchExpr (isomorph, expr[this.evalKey])
    if (expr[this.extendKey])
      return extend.apply (null, expr[this.extendKey].map (newLabelForIsomorph))
    if (expr[this.assignKey])
      return _.assign.apply (null, expr[this.assignKey].map (newLabelForIsomorph))
    if (expr[this.mergeKey])
      return _.merge.apply (null, expr[this.mergeKey].map (newLabelForIsomorph))
    return this.mapObject (expr, newLabelForIsomorph)
  } else
    return expr
}

// method yielding the direct evaluation syntax for a given identifer's label
Matcher.prototype.makeLabelEval = function (id) {
  var result = {}
  result[this.evalKey] = '$' + id + '.label'
  return result
}

// method yielding syntax to update a given identifer's label
Matcher.prototype.makeLabelUpdate = function (id, update) {
  var result = {}
  result[this.assignKey] = [this.makeLabelEval(id), update]
  return result
}

module.exports = { Grammar }
