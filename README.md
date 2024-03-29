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

## Scripts

- [bin/transform.js](https://github.com/ihh/graphgram/blob/master/bin/transform.js): transform a graph using a graph grammar
- [bin/lattice.js](https://github.com/ihh/graphgram/blob/master/bin/lattice.js): create an N*N square lattice
- [bin/graph2dot.js](https://github.com/ihh/graphgram/blob/master/bin/graph2dot.js): the `transform.js` graphlib-to-Graphviz feature, as a separate script

## Example grammars

- [grammars/dungeon.js](https://github.com/ihh/graphgram/blob/master/grammars/dungeon.js): choose-your-own dungeon
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
