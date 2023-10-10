var _ = require('lodash'),
    extend = require('extend'),  // NB: skips undefined values, unlike lodash extend (or lodash assign)
    graphlib = require('graphlib'),
    jsonschema = require('jsonschema'),
    colors = require('colors'),
    MersenneTwister = require('mersennetwister'),
    SubgraphSearch = require('./subgraph').SubgraphSearch

function isArray (obj) {
  return Object.prototype.toString.call(obj) === '[object Array]'
}

/**
 * Represents a graph grammar.
 * @constructor
 * @param {Object} json A description of the graph grammar, matching the JSON schema.
 * @param {Object} [opts] Options that will be passed to [evolve]{@link Grammar#evolve}.
 * 
 */
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

/**
 * @typedef {Object} EvolveReturnValue
 * @property {Integer} iterations The number of times a transformation rule was applied
 * @property {Graph} graph The transformed [graphlib]{@link https://www.npmjs.com/package/graphlib} graph
 */

/**
 * @function{Grammar#evolve}
 * @description Evolve a graph using a graph grammar.
 * @param {Object} [opts] Options influencing the way the grammar is applied.
 * @param {Object} [opts.rnd] Random number generator. Default is [MersenneTwister]{@link https://www.npmjs.com/package/mersennetwister}
 * @param {Integer} [opts.seed] Seed for random number generator.
 * @param {Graph} [opts.graph] Initial [graphlib]{@link https://www.npmjs.com/package/graphlib} graph. Default is a graph containing a single node whose ID is given by `opts.start`
 * @param {String} [opts.start] Default label for the starting node of the initial graph. Default is to use the `start` property of the grammar.
 * @param {Integer} [opts.limit] Maximum number of transformation rules to apply. Default is to use the limits specified by the grammar or subgrammars, if any
 * @param {Integer} [opts.stage] Apply a specific stage of the grammar. GraphGram's grammars can consist of multiple subgrammars. Default is to apply all of them, one after the other.
 * @param {Integer} [opts.verbose] Verbosity level. 0 is quiet (the default), 1 is the default for the CLI, 2+ is loud.
 * @returns {EvolveReturnValue} An object containing the results of the grammar application.
 */
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

/**
 * @function{Grammar#toDot}
 * @description Generate a GraphViz dot-format description of a graph.
 * @param {Object} graph A graphlib graph.
 * @returns {string} The graph in GraphViz dot format.
 */
// Convert graphlib graph to graphviz dot format
Grammar.prototype.toDot = function (graph) {
  return [(graph.isDirected() ? "digraph" : "graph") + " G {"]
    .concat (graph.nodes().map (function (id) {
      return '  ' + id + Grammar.prototype.dotAttrs(graph.node(id)) + ';'
    })).concat (graph.edges().map (function (edge) {
      return '  ' + edge.v + (graph.isDirected() ? ' -> ' : ' -- ') + edge.w + Grammar.prototype.dotAttrs(graph.edge(edge)) + ';'
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
  var labelSchema = lhs
     ? { description: 'A query expression for matching a label on the left-hand side of a subgraph transformation rule.', '$ref': '#/definitions/lhs_label' }
     : { description: 'A recipe for generating a label on the right-hand side of a subgraph transformation rule.', '$ref': '#/definitions/rhs_label' }
  var headTailSchema = function(desc) { return { '$ref': (canonical ? '#/definitions/identifier_list' : '#/definitions/identifier_or_list') } }
  return {
    description: lhs
    ? 'This block specifies a pattern with which to match the subgraph on the left-hand side of the transformation rule.'
    : 'This block specifies the subgraph generated on the right-hand side of the transformation rule, replacing the matched subgraph on the left-hand side.',
    oneOf: (canonical
      ? []
            : [{ description: 'An array of node labels. The ' + (lhs ? 'matched' : 'replacement') + ' subgraph is a chain of nodes.' + (lhs ? '' : ' The `head` and `tail` properties will be automatically set to (respectively) the first and last nodes on the left-hand side of the rule.'), type: 'array', items: { description: 'A node label.', type: 'string' } },
               { description: 'A single node label. The ' + (lhs ? 'matched' : 'replacement') + ' subgraph contains exactly one node.' + (lhs ? '' : ' The `head` and `tail` properties will automatically be set to (respectively) the first and last nodes on the left-hand side of the rule.'), type: 'string' }])
      .concat ([
        { type: 'object',
          description: 'A full description, including nodes and edges, of the subgraph to be ' + (lhs ? 'matched.' : 'used for replacement. If the `node` block is absent, it will be copied from the left-hand side.'),
          required: (canonical || lhs) ? ['node'] : [],
          additionalProperties: false,
          properties: {
            node: {
              description: 'The set of nodes in the ' + (lhs ? 'matching' : 'replacement') + ' subgraph.',
              type: 'array',
              minItems: 1,
              items: {
                oneOf: (canonical
                        ? []
                        : [{ description: 'A node label.' + (lhs ? 'This pattern will match any node that has the corresponding string label.' : ''), type: 'string' },
                           { description: 'A (node ID, node label) pair; both are strings. ' + (lhs ? 'The ID can be used to reference the node elsewhere in the rule.' : 'The ID either refers to a node that was matched on the left-hand side of the rule, or is completely new.'), type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } }]
			.concat (lhs ? [] : [
			  { type: 'object',
          description: 'An incremental update to a node in the matched subgraph.',
			    additionalProperties: false,
			    required: ['id','update'],
			    properties:
			    { id: { description: 'A node identifier that refers to a node that was matched on the left-hand side of the rule.', '$ref': '#/definitions/identifier' },
                              update: extend ({}, labelSchema, {description:'An update to the existing node label, whose properties will be copied over to the existing node label using Lodash `assign` semantics. It follows that this update will typically be an object rather than another type of value (though the schema also allows string-valued, array-valued, or numeric values here).'}),
                              head: headTailSchema('The identifier(s) of the node, or nodes, whose incoming edges will be replaced by incoming edges to this node. (The identifiers are as defined in the `node` block.)'),
                              tail: headTailSchema('The identifier(s) of the node, or nodes, whose outgoing edges will be replaced by outgoing edges from this node.  (The identifiers are as defined in the `node` block.)') } } ]))
		  .concat ([
                    { type: 'object',
                      description: lhs ? 'A pattern for matching a node in a subgraph.' : 'A description of a node in the replacement subgraph.',
                      additionalProperties: false,
                      properties: extend ({
                        id: { description: lhs ? 'A node identifier that can be used to reference the node elsewhere in the rule.' : 'A node identifier that either refers to a node that was matched on the left-hand side of the rule, or is completely new.', '$ref': '#/definitions/identifier' },
                        label: labelSchema,
                      }, lhs ? {
                        strict: { description: 'If true, then any graph node that matches this pattern rule cannot have any neighbors that are not also in the subgraph defined by the pattern rule', type: 'boolean' }
                      } : {
                        head: headTailSchema('The identifier(s) of the node, or nodes, whose incoming edges will be replaced by incoming edges to this node. (The identifiers are as defined in the `node` block.)'),  // if an lhs node is specified here, incoming edges to that lhs node will be attached
                        tail: headTailSchema('The identifier(s) of the node, or nodes, whose outgoing edges will be replaced by outgoing edges from this node. (The identifiers are as defined in the `node` block.)')   // if an lhs node is specified here, outgoing edges from that lhs node will be attached
                      })
                    }
                  ])
              }
            },
            edge: {
              description: 'The set of edges in the ' + (lhs ? 'matching subgraph. Note that, unless the `induce` property is set (within this rule or at a higher level in the grammar), this match is permissive rather than strict: the subgraph is allowed to contain more edges than specified here. In contrast, if `induce` is set, then ONLY the edges in this subgraph are allowed for a match.' : 'replacement subgraph. (Note that under some circumstances, edges will be automatically added even if not specified here. Specifically, if the `node` property is array-valued, then a chain of edges will be added automatically between consecutive nodes in the list.)'),
              type: 'array',
              items: {
                description: 'An edge being ' + (lhs ? 'matched on the left' : 'added on the right') + '-hand side of a transformation rule. '
                + (lhs
                  ? 'Note that the edge may be specified as an array of the form `[v,w,label,id]` or as an object with those properties; the two are functionally equivalent. `v` and `w` represent source and target node IDs, respectively; `label` is a query expression to match edge labels; and `id` is a temporary identifier for the edge. `label` and `id` are optional.'
                  : 'The edge may be specified in a variety of ways, but the basic idea is to either specify a source and target (`v,w`) or an identifier referencing an existing edge (`id`), and then to replace the label completely (`label`) or update it incrementally (`update`). Specifically the edge can be a `[v,w,label]` tuple (where `v` and `w` are the source and target of the new edge), as an `{id,label}` object (where `id` is the ID of an edge introduced on the left-hand side of the transformation rule; in this and the `[v,w,label]` tuple the label is optional, and will be copied from an existing edge if one exists), as an `{id,update}` object (where `update` represents an incremental update to the existing edge label), as a `{v,w,update}` object, as a string (which will be interpreted as the ID of an existing edge), or as a `{v,w,label}` object.'),
                anyOf: (canonical
                        ? []
                        : [{ type: 'array',
                              description: 'A tuple describing an edge being ' + (lhs ? 'matched on the left' : 'added on the right') + '-hand side of a transformation rule.',
                              minItems: 2,
                              maxItems: lhs ? 4 : 3,
                              items: [ { description: 'The source node of the edge, using the node numbering or naming scheme defined in the `node` block.', type: ['string','number'] },  // v
                                        { description: 'The target node of the edge, using the node numbering or naming scheme defined in the `node` block.', type: ['string','number'] },  // w
                                          extend ({}, labelSchema, { description: lhs ? 'A query expression for matching the edge label.' : 'An expression for the replacement edge label.' }) ]  // label
                                  .concat (lhs ? [{description: 'A temporary identifier for the edge being matched. This is temporary in the sense that it is defined only while the transformation rule is being applied.', type:'string'}] : []) }]  // id
                          .concat (lhs ? [] : [
                            { type: 'object',
                              description: 'An object describing an edge being added on the right-hand side of a transformation rule.',
                              additionalProperties: false,
                              required: ['id'],
                              properties: { id: { description: 'An edge identifer from the subgraph matched on the left-hand side of the transformation rule.', '$ref': '#/definitions/identifier' },
                                            label: labelSchema }
                            },
                            { type: 'object',
                              description: 'An object describing an incremental update to an edge on the right-hand side of a transformation rule.',
                              additionalProperties: false,
                              required: ['id','update'],
                              properties: { id: { '$ref': '#/definitions/identifier' },
                                            update: extend ({}, labelSchema, {description:'A incremental update to the existing edge label.'}) }
                            },
			  { type: 'object',
          description: 'An object describing an incremental update to an edge on the right-hand side of a transformation rule.',
          additionalProperties: false,
			    required: ['v','w','update'],
			    properties: { v: { description: 'The source node of the edge, using the node identifiers defined in the `node` block.', '$ref': '#/definitions/identifier' },
					  w: { description: 'The target node of the edge, using the node identifiers defined in the `node` block.', '$ref': '#/definitions/identifier' },
					  update: extend ({}, labelSchema, {description:'A incremental update to the existing edge label.'}) }
			  },
			  { description: 'An edge identifer from the subgraph matched on the left-hand side of the transformation rule. The edge will be copied unmodified.', type: 'string' }]))
                  .concat ([
                    { type: 'object',
                      description: 'An object describing an edge being ' + (lhs ? 'matched on the left' : 'added on the right') + '-hand side of a transformation rule.',
                      additionalProperties: false,
                      required: ['v','w'],
                      properties: extend ({
                        v: { description: 'The source node of the edge, using the node naming scheme defined in the `node` block.', '$ref': '#/definitions/identifier' },
                        w: { description: 'The target node of the edge, using the node naming scheme defined in the `node` block.', '$ref': '#/definitions/identifier' },
                        label: extend ({}, labelSchema, { description: lhs ? 'A query expression for matching the edge label.' : 'The new edge label.' })
                      }, lhs ? { id: { description: 'A temporary identifier for the edge being matched. This is temporary in the sense that it is defined only while the transformation rule is being applied.', '$ref': '#/definitions/identifier' } } : {})
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
    description: (topLevel ? (staged ? 'A top-level grammar, consisting of one or more stages.' : 'A top-level grammar, consisting of just one stage.') : 'A subgrammar, corresponding to an individual stage of graph transformation.'),
    type: 'object',
    required: (staged ? ['stages'] : ['rules']),
    additionalProperties: false,
    properties: extend
    (staged
     ? { stages: { description: 'The successive stages to be applied. Each stage is a separate subgrammar of transformations.', type: 'array', minItems: 1, items: { '$ref': '#/definitions/subgrammar' } } }
     : { rules: { '$ref': '#/definitions/rules' } },
     { name: { description: 'The name of this ' + (topLevel ? 'grammar.' : 'subgrammar.'), type: 'string' },
       limit: { description: 'The maximum number of rule applications.', type: 'number' },
       induced: { description: 'Default value of the `induced` parameter, which governs the specificty of subgraph-matching. Can be overridden by the `induced` parameter for stages and rules.', type: 'boolean' } },
     topLevel ? {start:{ description: 'The start node label for the default initial graph.' }} : {})
  })
}

Grammar.prototype.makeSchema = function() {
  return {
    description: "Specification of a `graphgram` stochastic grammar for graph transformation.",
    oneOf: [ this.makeGrammarSchema(true,false),
	           this.makeGrammarSchema(true,true) ],
    definitions: {
      identifier: {
        description: 'An identifier',
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
        description: 'The list of subgraph transformation rules in this grammar.',
        type: 'array',
        items: {
          description: 'An individual subgraph transformation rule. Each rule proceeds by matching a subgraph whose pattern is specified on the left-hand side (the `lhs`), and replacing it with a subgraph specified on the right-hand side (`rhs`). There are various different syntactical forms depending on the complexity and topology of the matching and replacement subgraphs, and whether properties (like edges and labels) are to be changed or copied over unmodified.',
          type: 'object',
          required: ['lhs','rhs'],
          additionalProperties: false,
          properties: {
	    name: { description: 'The name of this rule.', type: 'string' },
            lhs: this.makeGraphSchema(true),
            rhs: this.makeGraphSchema(false),
            induced: { description: 'If true, then the subgraph induced by the nodes on the left-hand side of the rule must exactly match the subgraph as specified in the rule: no additional nodes within the subgraph are allowed.', type: 'boolean' },  // if true, match lhs using induced subgraph search
            condition: { description: 'A string that will be passed to JavaScript\'s `eval` for evaluation, to test whether the match should proceed. Use $id.label for labels, $id.match[n] for n\'th matching group, $$iter for iteration#, $$graph for graph.', type: 'string' },  // eval'd string. Use $id.label for labels, $id.match[n] for n'th matching group, $$iter for iteration#, $$graph for graph
            weight: { description: 'A probabilistic weight that is used to determine which rules should be randomly applied, in the event that multiple patterns match.', type: ['string','number'] },  // string is eval'd using same expansions as 'condition'
            limit: { description: 'The maximum number of times this rule can be used to transform the graph.', type: 'number' },
            type: { description: 'If a `type` is specified, then any `limit` specified for this rule is interpreted as the maximum number of times any rule with the same `type` can be used.', type: 'string' },
            delay: { description: 'The minimum number of times another transformation rule must be applied to the graph before this rule can be used.', type: 'number' },
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
	    // or, if it has an '{update:X}', create the corresponding label expression '{$assign:[{$eval:"$id.label"},X]}'
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
    if (rule.delay && context.iter < rule.delay)
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
  let descRef = function (desc) { return extend ({}, ref, { description: desc }) }
  return {
    description: 'A query for matching a label in a graph entity (i.e. a node or edge).',
    oneOf: [{ description: 'This query will match any label that has exactly the specified type and value.', type: ['string','number','boolean','array'] },
            { type: 'object',
              description: 'A compound query expression that is formed by combining, or modifying, one or more constituent query expressions.',
              maxProperties: 1,
              additionalProperties: false,
              properties: {
                '$equals': descRef('The label object must exactly match the given query expression, with no additional properties.'),
                '$contains': descRef('The label object must match the given query expression, but is allowed to contain additional properties.'),
                '$find': descRef('A recursive descent search of the label object must find an element that matches the given query expression.'),
                '$not': descRef('The label must NOT match the given query expression.'),
                '$and': { description: 'The label must match all of the query expressions given in the list.', type: 'array', minItems: 1, items: ref },
                '$or': { description: 'The label must match one of the query expressions given in the list.', type: 'array', minItems: 1, items: ref },
                '$test': { description: 'A flexible user-defined query. The text value of this query expression, when `eval`\'d, defines a JavaScript function which, when called with the label as its sole argument, must return a truthy value.', type: 'string' }
              }
            },
            { type: 'object',
              description: 'The label must be a JSON object, it must have a key that matches the given key (which can be any string - hence the "pattern property" in the schema which is just a wildcard), and the value must match the query expression associated with that key.',
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
    oneOf: [{ description: 'Generates a label with exactly the specified type and value. For string-valued labels, or arrays that include strings, the string may include substrings of the form `${id.label}` where `id` is an identifier that has been assigned, during this transformation rule, to a previously referenced node or edge.', type: ['string','number','boolean','array'] },
            { type: 'object',
              description: 'Generates a label using a functional expression that typically involves evaluating a string as JavaScript. The JavaScript may refer to the labels of nodes or edges that have previously been assigned IDs, using the syntax `$id.label`.',
              maxProperties: 1,
              additionalProperties: false,
              properties: {
                '$eval': { description: 'Generates a label by evaluating a JavaScript string.', type: ['string','array','object'] },
                '$extend': { description: 'Generates a label by applying `extend` to its arguments, where the semantics of `extend` skip undefined values.', type: 'array', minItems: 2, items: ref },
                '$assign': { description: 'Generates a label by applying the Lodash `assign` function to its arguments, where the semantics of `assign` do *not* skip undefined values.', type: 'array', minItems: 2, items: ref },
                '$merge': { description: 'Generates a label by applying the Lodash `merge` function to its arguments, i.e. performing a recursive traversal and attempting to merge at each level.', type: 'array', minItems: 2, items: ref }
              }
            },
            { type: 'object',
              description: 'Generates a JSON object with the given key(s), mapping to value(s) which are themselves label expressions.',
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
