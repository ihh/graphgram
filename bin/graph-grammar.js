#!/usr/bin/env node

var fs = require('fs'),
    extend = require('extend'),
    path = require('path'),
    getopt = require('node-getopt'),
    graphlib = require('graphlib'),
    jsonschema = require('jsonschema'),
    colors = require('colors'),
    Grammar = require('../graphgram').Grammar

var defaultGrammarFilename = 'grammars/dungeon.json'

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
  ['s' , 'seed=N'          , 'seed random number generator'],
  ['q' , 'quiet'           , 'do not print pretty log messages'],
  ['h' , 'help'            , 'display this help message']
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem() // parse command line

var grammarOpts = { canonical: opt.options.canonical }
if (opt.options.schema)
  fs.writeFileSync (opt.options.schema, JSON.stringify (new Grammar(null,grammarOpts).makeSchema(), null, 2))

var grammar = Grammar.fromFile (opt.options.grammar || defaultGrammarFilename, grammarOpts)
if (opt.options.canonize)
  fs.writeFileSync (opt.options.canonize, JSON.stringify (grammar.canonicalJson(), null, 2))

var graph
if (opt.options.input)
  graph = graphlib.json.read (JSON.parse (fs.readFileSync (opt.options.input)))

var info = grammar.evolve ({ graph: graph,
			     verbose: !opt.options.quiet,
			     limit: opt.options.limit,
			     stage: opt.options.stage,
			     seed: opt.options.seed })
graph = info.graph

var dotFilename = opt.options.dot
if (dotFilename)
  fs.writeFileSync (dotFilename, grammar.toDot(graph))

var output = JSON.stringify (graphlib.json.write (graph), null, 2)
if (opt.options.output)
  fs.writeFileSync (opt.options.output, output)
else if (!dotFilename)
  console.log (output)
