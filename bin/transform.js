#!/usr/bin/env node

// Load .env before anything reads process.env.ANTHROPIC_API_KEY.
require('dotenv').config({ quiet: true })

var fs = require('fs'),
    extend = require('extend'),
    path = require('path'),
    getopt = require('node-getopt'),
    graphlib = require('graphlib'),
    jsonschema = require('jsonschema'),
    colors = require('colors'),
    gg = require('../index'),
    Grammar = gg.Grammar,
    Matcher = gg.Matcher,
    narrator = require('../narrator'),
    sonnetRunner = require('../sonnet-runner'),
    themes = require('../themes'),
    debugOpts = require('../debug-opts')

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
  [''  , 'no-llm'          , 'disable LLM calls; narrator helpers return placeholder text'],
  [''  , 'sonnet'          , 'use Anthropic Sonnet via SDK (instead of --llm CLI) for narrator helpers'],
  [''  , 'model=NAME'      , 'model to use with --sonnet (default "' + sonnetRunner.DEFAULT_MODEL + '")'],
  [''  , 'preamble=PATH'   , 'read system preamble text from file (for --sonnet)'],
  [''  , 'cache-dir=PATH'  , 'local prompt cache dir (default "' + sonnetRunner.DEFAULT_CACHE_DIR + '")'],
  [''  , 'no-cache'        , 'disable local prompt cache'],
  [''  , 'cache-read-only' , 'fail on cache miss instead of calling API (for replay/debug)'],
  [''  , 'placeholder'     , 'do not call any LLM; narrator slots emit [theme:macro#ctx] placeholders'],
  [''  , 'theme=NAME'      , 'pin the theme (default: deterministic from seed). See --list-themes.'],
  [''  , 'list-themes'     , 'print available themes and exit'],
  [''  , 'list-macros'     , 'print available narrator macros and exit'],
  [''  , 'no-flavor'       , 'skip the flavor stage (no monster/puzzle expansion into mini-games)'],
  [''  , 'passage-only'    , 'refine path edges as passage only (no monster/puzzle edges, implies --no-flavor)'],
  ['s' , 'seed=N'          , 'seed random number generator'],
  ['q' , 'quiet'           , 'do not print pretty log messages'],
  ['v' , 'verbose'         , 'print MORE pretty log messages'],
  ['h' , 'help'            , 'display this help message']
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem() // parse command line

// Introspection flags exit early — no grammar load required.
if (opt.options['list-themes']) {
  console.log(themes.listThemes().join('\n'))
  process.exit(0)
}
if (opt.options['list-macros']) {
  themes.listMacros().forEach(function (m) {
    console.log(m + '  —  ' + themes.MACROS[m])
  })
  process.exit(0)
}

var verbosity = opt.options.quiet ? 0 : (opt.options.verbose ? 2 : 1)
var llmCmd = opt.options.llm || defaultLLM
var llmDisabled = !!opt.options['no-llm']
var useSonnet = !!opt.options.sonnet
var usePlaceholder = !!opt.options.placeholder
var grammarOpts = { canonical: opt.options.canonical, llm: llmCmd, verbose: verbosity }

// Seed resolution needs to happen before theme selection, because the default
// theme is derived from the seed. (Previously resolved after grammar load;
// moved up so narrator registration can see the theme.)
var seed = opt.options.seed
if (typeof(seed) === 'undefined') {
  seed = new Date().getTime()
  if (verbosity) console.warn ("Random number seed: " + seed)
}

// Theme: CLI override wins; otherwise deterministic from seed.
var chosenTheme
if (opt.options.theme) {
  chosenTheme = opt.options.theme
  if (themes.listThemes().indexOf(chosenTheme) < 0 && verbosity)
    console.warn(colors.yellow('Warning: theme "' + chosenTheme + '" is not in the built-in list. Pass --list-themes to see available options.'))
} else {
  chosenTheme = themes.pickTheme(seed)
}
if (verbosity) console.warn(colors.cyan('Theme: ' + chosenTheme))

// Populate debug-opts before the grammar file is loaded and evaluated —
// grammar files read this at load time to decide which stages to emit.
debugOpts.set({
  skipFlavor: !!opt.options['no-flavor'] || !!opt.options['passage-only'],
  passageOnly: !!opt.options['passage-only'],
  placeholder: usePlaceholder,
  theme: chosenTheme
})

// Build a shared Sonnet runner if --sonnet; otherwise null.
var sharedRunner = null
if (useSonnet && !usePlaceholder) {
  var preamble
  if (opt.options.preamble)
    preamble = fs.readFileSync(opt.options.preamble, 'utf-8')
  sharedRunner = sonnetRunner.makeSonnetRunner({
    model: opt.options.model,
    systemPreamble: preamble,
    cache: !opt.options['no-cache'],
    cacheDir: opt.options['cache-dir'],
    cacheReadOnly: !!opt.options['cache-read-only'],
    disabled: llmDisabled,
    warn: function (msg) { if (verbosity) console.warn(colors.yellow(msg)) }
  })
}

function makeGrammar (json) {
  // Pre-register narrator helpers on the Matcher so that grammar JSON that
  // references `$kdBundle`, `$themedVersion`, etc. passes validation.
  let matcher = new Matcher()
  narrator.registerNarrator (matcher, { llm: llmCmd, disabled: llmDisabled,
    runner: sharedRunner,
    theme: chosenTheme,
    placeholder: usePlaceholder,
    warn: function (msg) { if (verbosity) console.warn (colors.yellow (msg)) } })
  let g = new Grammar (json, extend ({}, grammarOpts, { matcher: matcher }))
  g.registerRhsLabelExecFunction ('llm', llmCmd, "Generate text using command-line LLM interface. This option is only enabled in the command-line tool. The default LLM toolname is llm, which must be separately installed: https://github.com/simonw/llm", true)
  return g
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

if (sharedRunner && verbosity) {
  var s = sharedRunner.summary()
  console.warn(colors.cyan(
    'sonnet: ' + s.calls + ' calls (' + s.cacheHits + ' cache, ' + s.cacheMisses + ' api'
    + (s.apiErrors ? ', ' + s.apiErrors + ' errors' : '') + '); '
    + 'tokens in=' + s.inputTokens + ' out=' + s.outputTokens
    + ' cacheR=' + s.cacheReadTokens + ' cacheW=' + s.cacheWriteTokens
    + (s.estCostUSD === null ? '' : '; est $' + s.estCostUSD)
  ))
}
