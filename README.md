# graphgram
More complete documentation is available at the following links:
- [Getting started guide](https://ihh.github.io/graphgram/jsdoc/tutorial-getting-started.html)
- [API documentation](https://ihh.github.io/graphgram/jsdoc/Grammar.html)
- [JSON schema documentation](https://ihh.github.io/graphgram/schema_doc.html)

`graphgram` is a graph grammar library.
It transforms [graphlib](https://github.com/dagrejs/graphlib) graphs
using a configurable, JSON-described graph grammar
(see e.g. [these slides by Matilde Marcolli](http://www.its.caltech.edu/~matilde/GraphGrammarsLing.pdf),
 or [this RPS article](https://www.rockpapershotgun.com/2017/03/10/how-unexplored-generates-great-roguelike-dungeons/) about Joris Dormans' _Unexplored_ (which uses the technique to generate "cyclic" levels),
 or [this Wikipedia page](https://en.wikipedia.org/wiki/Graph_rewriting)).

It can be used for game levels, procedural content, simulations, etc.

## Quick start: generate a dungeon PDF

The `grammars/dunjs-dungeon.js` example ships a full dungeon builder ported
from [dunjs](https://github.com/ihh/dunjs) — midpoint rooms, dead-ends,
parallel paths, key/door pairs (with shared `pairId`), cycle-closing
shortcuts that turn the tree into a small Metroidvania-style graph, and path
refinements into passage / monster / puzzle edges. Key and door nodes render
as diamond/house shapes, the locked edge shows bold red with its pair ID,
and the cycle-closing shortcut shows bold blue with the reused pair ID.

One-liners (requires [graphviz](https://graphviz.org/)'s `dot`):

~~~~
# shortest form: pipe DOT through dot(1) into a PDF
bin/transform.js -g grammars/dunjs-dungeon.js --no-llm -q -d /dev/stdout \
  | dot -Tpdf -o /tmp/d.pdf && open /tmp/d.pdf

# reproducible seed
bin/transform.js -g grammars/dunjs-dungeon.js --no-llm -q -s 42 -d /tmp/d.dot \
  && dot -Tpdf /tmp/d.dot -o /tmp/d.pdf && open /tmp/d.pdf

# with LLM-generated narrative (requires `llm` CLI with a key configured)
bin/transform.js -g grammars/dunjs-dungeon.js -q -d /tmp/d.dot \
  && dot -Tpdf /tmp/d.dot -o /tmp/d.pdf && open /tmp/d.pdf
~~~~

Or use the `Makefile` shortcuts for any `grammars/<name>.js`:

~~~~
make pdf/dunjs-dungeon.pdf                # random seed
make pdf/dunjs-dungeon.42.pdf SEED=42     # reproducible
make pdf/level.pdf                        # works for any grammar file
~~~~

## Reusable dungeon primitives

The dungeon rule factories are exposed as a library, so you can compose
your own grammars:

~~~~
const { Grammar, Matcher, dungeonPrimitives: dp, registerNarrator }
  = require('graphgram')

const matcher = new Matcher()
registerNarrator(matcher, { disabled: true })   // or { llm: 'llm' }

const g = new Grammar({
  start: 'START',
  stages: [
    dp.initStartGoalStage(),
    { name: 'expand', limit: 20, rules: [
      dp.midpointRoom({ weight: 2 }),
      dp.deadEnd(),
      dp.parallelPath(),
      dp.keyDoor({ narrate: true, limit: 3 })
    ]},
    { name: 'close-cycles', limit: 2, rules: [dp.cycleCloseShortcut()] },
    { name: 'refine', rules: dp.refineEdges(
      dp.EDGE_PATH,
      [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE]
    )},
    dp.dotDecorationStage()
  ]
}, { matcher })

const graph = g.evolve({ seed: 42 }).graph
~~~~

Every factory accepts the usual `{ name, weight, limit, type, delay,
condition }` rule options. `keyDoor({ narrate: true })` draws its `text`,
`before`, `link`, `after` fields from the `$kdBundle` narrator helper —
register narrator functions first (see `narrator.js`).

## Tests and benchmarks

~~~~
npm test          # run the test suite (node:test, zero deps)
npm run bench     # wall-clock benchmark on a representative dungeon workload
~~~~

## Scripts

- [bin/transform.js](https://github.com/ihh/graphgram/blob/master/bin/transform.js): transform a graph using a graph grammar
- [bin/lattice.js](https://github.com/ihh/graphgram/blob/master/bin/lattice.js): create an N*N square lattice
- [bin/graph2dot.js](https://github.com/ihh/graphgram/blob/master/bin/graph2dot.js): the `transform.js` graphlib-to-Graphviz feature, as a separate script

## Example grammars

- [grammars/dungeon.js](https://github.com/ihh/graphgram/blob/master/grammars/dungeon.js): choose-your-own dungeon
- [grammars/dunjs-dungeon.js](https://github.com/ihh/graphgram/blob/master/grammars/dunjs-dungeon.js): dunjs-style dungeon built from the reusable primitives
- [grammars/level.js](https://github.com/ihh/graphgram/blob/master/grammars/level.js): a roguelike level (should be initialized with a [square lattice](https://github.com/ihh/graphgram/blob/master/bin/lattice.js))
- [grammars/test.js](https://github.com/ihh/graphgram/blob/master/grammars/test.js): a test grammar

## API usage

~~~~
var graphlib = require('graphlib'),
    Grammar = require('../graphgram').Grammar,
    fs = require('fs')

var grammarFile = 'grammars/dungeon.json'
var grammarJson = JSON.parse (fs.readFileSync (grammarFile).toString())

var grammar = new Grammar (grammarJson)
var graph = grammar.evolve().graph
~~~~

The resulting `graph` is a [graphlib](https://github.com/dagrejs/graphlib) object.

## Command-line usage

<pre><code>
Usage: node transform.js

  -g, --grammar=PATH   read grammar file (default "grammars/dungeon.js")
  -c, --canonical      use canonical schema (no syntactic sugar)
  -j, --schema=PATH    save JSON schema to file
  -C, --canonize=PATH  save canonical grammar to file
  -i, --input=PATH     read graphlib JSON file
  -o, --output=PATH    write graphlib JSON file
  -d, --dot=PATH       write graphviz DOT file
  -L, --limit=N        limit number of rule applications
  -S, --stage=N        only run one stage
  -s, --seed=N         seed random number generator
  -q, --quiet          do not print pretty log messages
  -v, --verbose        print MORE pretty log messages
  -h, --help           display this help message

</code></pre>
