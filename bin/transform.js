#!/usr/bin/env node

var fs = require('fs'),
    extend = require('extend'),
    path = require('path'),
    getopt = require('node-getopt'),
    graphlib = require('graphlib'),
    jsonschema = require('jsonschema'),
    colors = require('colors'),
    Grammar = require('../index').Grammar

var defaultGrammarFilename = 'grammars/dungeon.js'
var defaultLLM = 'llm'

var opt = getopt.create([
  ['g' , 'grammar=PATH'    , 'read grammar file (default "' + defaultGrammarFilename + '")'],
  ['c' , 'canonical'       , 'use canonical schema (no syntactic sugar)'],
  ['j' , 'schema=PATH'     , 'save JSON schema to file'],
  ['C' , 'canonize=PATH'   , 'save canonical grammar to file'],
  ['i' , 'input=PATH'      , 'read graphlib JSON file'],
  ['o' , 'output=PATH'     , 'write graphlib JSON file'],
  ['d' , 'dot=PATH'        , 'write graphviz DOT file'],
  ['L' , 'limit=N'         , 'limit number of rule applications'],
  ['S' , 'stage=N'         , 'only run one stage'],
  ['m' , 'llm=COMMAND'     , 'command-line interface to LLM (default "' + defaultLLM + '")'],
  ['s' , 'seed=N'          , 'seed random number generator'],
  ['q' , 'quiet'           , 'do not print pretty log messages'],
  ['v' , 'verbose'         , 'print MORE pretty log messages'],
  ['h' , 'help'            , 'display this help message']
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem() // parse command line

var verbosity = opt.options.quiet ? 0 : (opt.options.verbose ? 2 : 1)
var grammarOpts = { canonical: opt.options.canonical, llm: opt.options.llm || defaultLLM, verbose: verbosity }
function makeGrammar (json) {
  return new Grammar (json, grammarOpts)
}

if (opt.options.schema) {
  fs.writeFileSync (opt.options.schema, JSON.stringify (makeGrammar(null).makeSchema(), null, 2))
  process.exit()
}

var grammarFilename = opt.options.grammar || defaultGrammarFilename
var grammarText = fs.readFileSync(grammarFilename).toString()
var grammarJson = eval ('(' + grammarText + ')')
var grammar = makeGrammar (grammarJson)

if (opt.options.canonize)
  fs.writeFileSync (opt.options.canonize, JSON.stringify (grammar.canonicalJson(), null, 2))

var graph
if (opt.options.input)
  graph = graphlib.json.read (JSON.parse (fs.readFileSync (opt.options.input)))

var seed = opt.options.seed
if (typeof(seed) === 'undefined') {
  seed = new Date().getTime()
  console.warn ("Random number seed: " + seed)
}

var info = grammar.evolve ({ graph: graph,
			     verbose: verbosity,
			     limit: opt.options.limit,
			     stage: opt.options.stage,
			     seed: seed })
graph = info.graph

var dotFilename = opt.options.dot
if (dotFilename)
  fs.writeFileSync (dotFilename, grammar.toDot(graph))

var output = JSON.stringify (graphlib.json.write (graph), null, 2)
if (opt.options.output)
  fs.writeFileSync (opt.options.output, output)
else if (!dotFilename)
  console.log (output)

