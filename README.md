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

## Building a dungeon

The `grammars/dunjs-dungeon.js` grammar builds a dungeon in six stages,
each one a named sub-grammar operating on the output of the previous.
This is the recommended template for CYOA-style dungeons; copy and
tweak:

~~~~
const { Grammar, Matcher, dungeonPrimitives: dp, registerNarrator }
  = require('graphgram')

const matcher = new Matcher()
registerNarrator(matcher, { disabled: true })   // or { llm: 'llm' }

const g = new Grammar({
  start: 'START',
  stages: [

    // 1. Init — spawn a single start→win edge.
    dp.initStartGoalStage(),

    // 2. Expand — grow structure. Weights bias the sampler; limits cap
    //    how many times a rule can fire across the whole stage.
    { name: 'expand', limit: 25, rules: [
      dp.midpointRoom({ weight: 2 }),                 // two-way a<->m<->b
      dp.midpointRoom({ oneWay: true, weight: 1 }),   // only fires inside cycles
      dp.deadEnd({ weight: 1 }),                      // side branch with explicit return
      dp.parallelPath({ weight: 1 }),                 // adds a second route a→m→b
      dp.keyDoor({ weight: 1, limit: 3 }),            // lock + shared-pairId key
      dp.healthPotion({ weight: 1, limit: 3 })        // pick-up that restores HP
    ]},

    // 3. Close cycles — add gated b→a `return` edges where a key already
    //    sits at a (interior) node a. Turns the tree into a small
    //    Metroidvania graph. Run AFTER keys exist but BEFORE path edges
    //    are refined away.
    { name: 'close-cycles', limit: 3, rules: [dp.cycleCloseShortcut()] },

    // 4. Refine — flavor the remaining `path` edges into passage /
    //    monster / puzzle. Other label fields (edgeId, prereq) survive
    //    via $assign.
    { name: 'refine', rules: dp.refineEdges(
      dp.EDGE_PATH,
      [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE]
    )},

    // 5. Flavor — expand monster / puzzle edges into mini-games.
    //    Monster edges become Markov battles (choice↔random alternation
    //    with weighted consequences carrying player/monster damage);
    //    puzzle edges become multiple-choice quizzes with distractors
    //    that route back to the puzzle's source.
    { name: 'flavor', rules: [
      dp.monsterBattle({ weight: 1 }),
      dp.puzzleChoice({ weight: 1, numDistractors: 3 })
    ]},

    // 6. Decorate — populate label.dot.label on any node/edge that
    //    doesn't already have one, so rendered DOT files have readable
    //    captions.
    dp.dotDecorationStage()
  ]
}, { matcher })

const graph = g.evolve({ seed: 42 }).graph
~~~~

Every factory accepts the usual `{ name, weight, limit, type, delay,
condition }` rule options. `keyDoor({ narrate: true })` draws its `text`,
`before`, `link`, `after` fields from the `$kdBundle` narrator helper —
register narrator functions first (see `narrator.js`).

### Primitive cheat sheet

| Factory | What it does |
|---------|-------------|
| `initStartGoalStage()` | Spawns `start` and `win` nodes plus the initial `start→win` path edge. |
| `midpointRoom(opts)` | Inserts a room between a path's endpoints. Default two-way (adds backtrack returns); `{ oneWay: true }` only fires inside existing cycles. |
| `deadEnd(opts)` | Side-branch off a path source, with an explicit backtrack return. |
| `parallelPath(opts)` | Adds a parallel route a→m→b alongside the existing a→b. Creates edgeId-free path edges that midpoint/keyDoor can subsequently split. |
| `keyDoor(opts)` | Key+door pair with shared `pairId`; locked door edge carries `prereq.pairId`. Door has retreat + once-open return. |
| `cycleCloseShortcut(opts)` | Adds a gated `return` edge b→a sharing an existing key, turning tree shapes into cycles. |
| `healthPotion(opts)` | Side-branch potion with `healValue`; the play engine heals on visit. |
| `monsterBattle(opts)` | Expands a `monster` edge into a Markov battle: choice nodes (normal/advantage) ↔ random nodes (attack/defend) with weighted consequences, a death sink, and retreats. |
| `puzzleChoice(opts)` | Expands a `puzzle` edge into an intro node + one `correct` choice plus N distractor nodes that route back. |
| `refineEdges(from, [...to])` | Rewrites one edge type into a random pick from several targets, preserving all other label fields. |
| `dotDecorationStage()` | Fills in `label.dot.label` where missing, for nice DOT rendering. |

### CYOA gating model

Every grammar-generated node carries a `label.nodeId` and every
forward edge paired with a backtrack carries a `label.edgeId`. Edges
can be gated via three prereq flavors that the play engine checks
against the player's traversal / visit log:

| `prereq` shape | Unlock condition | Used by |
|----------------|------------------|---------|
| `{ pairId: X }` | player has visited a key node with `pairId: X` | locked door edges |
| `{ traversed: X }` | player has traversed the forward edge with `edgeId: X` | backtrack edges (pair with their forward) |
| `{ visited: X }` | player has visited a node with `nodeId: X` | `return` edges (cycle shortcuts) |

The `win` node has no outgoing edges; the engine treats it as a sink
that records the final move count as a score. Choice nodes (monster
battles) also expose a `retreat` edge back to the source of the
original monster edge, always accessible regardless of HP.

## Playing a dungeon in the browser

The `play/` directory ships a single-page HTML app that reads a
generated dungeon and lets you traverse it click-by-click. Three
panes: status bar (HP / moves / inventory / dump-trace link), text
(cumulative narrative with link affordances for each accessible
outgoing edge), and a dagre-laid-out graph zoomed to a radius-N
neighborhood around the current node.

~~~~
make play/graph.js SEED=42     # generate the dungeon
open play/index.html           # play it (works over file://)
~~~~

Files:
- `play/graph.js` — the dungeon (generated)
- `play/phrasebook.js` — default text, keyed by `nodeId`/`edgeId`/`type`
- `play/text.example.js` — copy to `play/text.js` to override any
  entry; merged over the defaults at load time
- `play/game.js` — the engine (~400 lines; state, transitions, render)
- `play/index.html` — layout, styles, script loader

The status bar includes a **dump trace** link that prints the full
node/edge history to the text pane and downloads a JSON file with
the state, outgoing-edge audit (including which prereq is blocking
each inaccessible edge), and per-step HP snapshots.

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
