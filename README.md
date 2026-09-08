# graphgram

A graph grammar library, and a pipeline that turns the graphs it grows into
playable stories — Twine, ChoiceScript, Inform 7, or a browser.

**[Documentation site](https://ihh.github.io/graphgram/)** ·
[Guide](https://ihh.github.io/graphgram/guide.html) ·
[Advanced](https://ihh.github.io/graphgram/advanced.html) ·
[Worked examples](https://ihh.github.io/graphgram/examples.html) ·
[Play in your browser](https://ihh.github.io/graphgram/play/) ·
[Papers](https://ihh.github.io/graphgram/papers/) ·
[API](https://ihh.github.io/graphgram/jsdoc/Grammar.html) ·
[JSON schema](https://ihh.github.io/graphgram/schema_doc.html)

`graphgram` rewrites [graphlib](https://github.com/dagrejs/graphlib) graphs
according to a JSON-described grammar. You give it rules of the form *"wherever
you find this pattern, replace it with that one"*, a weight and a limit for
each, and it grows a graph: rooms, corridors, locks, keys, suspects, secrets.

For background see
[these slides by Matilde Marcolli](http://www.its.caltech.edu/~matilde/GraphGrammarsLing.pdf),
[this RPS article](https://www.rockpapershotgun.com/how-unexplored-generates-great-roguelike-dungeons)
on Joris Dormans' *Unexplored* (which uses the technique to generate cyclic
levels), or [Wikipedia on graph rewriting](https://en.wikipedia.org/wiki/Graph_rewriting).

## The one hard thing

Applying a rewrite rule means finding every occurrence of its left-hand side in
the host graph. That is subgraph isomorphism, which is NP-complete, and it is
the only computationally interesting thing in the library.

[`subgraph.js`](subgraph.js) is Ullmann (1976): a candidate-assignment table,
an arc-consistency refinement iterated to a fixpoint, and a recursive search.
Around it sit several deliberate triage hooks, so that the common case — a rule
whose pattern nodes carry literal type labels — never enters the expensive part
of the search:

- **label pre-filtering** seeds each pattern node's candidate set by running its
  label predicate over the host graph *before* the search starts, rather than
  starting with every host node and rejecting deep in the recursion;
- **compiled predicate caches** on the `Matcher` (`regexCache`, `testFuncCache`,
  `evalFuncCache`, `templatePathCache`) compile each `$test`, `$eval` and
  `${...}` path once via `new Function` and reuse it across every candidate,
  match, iteration and rule;
- **rule-level triage** checks `limit` and `delay` *before* constructing a
  search at all, so an exhausted rule costs nothing;
- **specialised cloning** avoids `_.cloneDeep` on the candidate table, which is
  copied at every level of the recursion.

All matches are enumerated, not just the first, because the sampler weights over
match sites — a partial enumeration would silently bias which rules fire.

The full treatment, with measurements and a list of what is *not* implemented,
is in [papers/matching-engine.md](papers/matching-engine.md).

## Quick start

```bash
npm install graphgram
```

```js
const { Grammar } = require('graphgram')

const grammar = new Grammar({
  start: 'A',
  limit: 6,
  rules: [
    { lhs: 'A', rhs: ['A', 'B'] },
    { lhs: 'B', rhs: 'C' }
  ]
})

const { graph } = grammar.evolve({ seed: 42 })   // a graphlib Graph
```

From the repo, generate and play a dungeon:

```bash
bin/story.js --example maze-locked --seed 42 --format play --out play/graph.js
open play/index.html
```

Or export the same dungeon to a target:

```bash
bin/story.js --example maze-locked --seed 42 --format twine        --out story.twee
bin/story.js --example maze-locked --seed 42 --format choicescript --out story-cs/
bin/story.js --example maze-locked --seed 42 --format inform7      --out story.ni
bin/story.js --example maze-locked --seed 42 --format ir           --out story.json
```

Render any grammar as a PDF (needs [graphviz](https://graphviz.org/)):

```bash
make pdf/dunjs-dungeon.42.pdf SEED=42
```

## The pipeline

```
grammar ──evolve──▶ graphlib graph ──buildStoryIR──▶ Story IR ──┬─▶ Twee / Harlowe
                                                                ├─▶ ChoiceScript
                                                                ├─▶ Inform 7
                                                                └─▶ browser play engine
```

Everything downstream of the [Story IR](docs/spec/story-ir.md) is a pure
function of it. An exporter never reads a graphlib graph, never learns what a
`prereq.pairId` is, and does not need updating when a new primitive lands —
only `buildStoryIR` does.

| layer | file | what it is |
|---|---|---|
| engine | [`index.js`](index.js), [`subgraph.js`](subgraph.js) | `Grammar`, `Matcher`, the Ullmann search |
| primitives | [`dungeon-primitives.js`](dungeon-primitives.js) | bidirectional rewrites: midpoint rooms, dead ends, parallel paths, key/door pairs, cycle-closing returns, monster battles, puzzle gates |
| | [`dag-primitives.js`](dag-primitives.js) | the acyclic siblings: `dagMidpoint`, `forkJoin`, `dagKeyLock` |
| | [`mystery-primitives.js`](mystery-primitives.js) | social locks: suspects, secrets, leverage, accusation |
| | [`hallmarks.js`](hallmarks.js) | the clue engine for multi-key matching puzzles |
| narrative | [`themes.js`](themes.js), [`narrator.js`](narrator.js) | the macro vocabulary, and the three ways to fill it |
| IR | [`story-ir.js`](story-ir.js) | graph → passages, links, conditions, effects |
| exporters | [`exporters/`](exporters/) | Twine, ChoiceScript, Inform 7 |
| catalogue | [`examples/`](examples/) | five reproducible worked examples |
| play | [`play/`](play/) | the browser engine |

## Worked examples

Five stories spanning the design space, each reproducible from the command line
at a pinned seed and playable
[on the site](https://ihh.github.io/graphgram/play/).

|  | puzzle-free | puzzle-inclusive |
|---|---|---|
| **DAG hypertext** | `dag-plain` | `dag-locked` |
| **bidirectional hypertext** | `maze-plain` | `maze-locked` |

plus `mystery-daily`, the murder mystery, whose seed derives from the date.

```bash
bin/story.js --list      # the catalogue, with budgets
make examples            # every example, every format, into out/examples/
```

**Reproducibility.** For a fixed library version, `--example E --seed S`
produces byte-identical output on every machine, in every format. One seeded
Mersenne Twister is the only entropy source; the theme is derived from the seed;
nothing stamps a timestamp (the Twine IFID is a hash of `id + seed`); IR
ordering is defined. That is what makes a shared seed mean something.

## Building a dungeon

A staged grammar, which is how every non-trivial grammar here is organised —
finish growing the skeleton before decorating it:

```js
const { Grammar, Matcher, dungeonPrimitives: dp, registerNarrator } = require('graphgram')

const matcher = new Matcher()
registerNarrator(matcher, { placeholder: true })   // BEFORE constructing the Grammar

const g = new Grammar({
  start: 'START',
  stages: [
    dp.initStartGoalStage(),                              // 1. start --path--> win

    { name: 'expand', limit: 25, rules: [                 // 2. grow structure
      dp.midpointRoom({ weight: 2 }),                     //    a <-> m <-> b
      dp.midpointRoom({ oneWay: true, weight: 1 }),       //    only inside cycles
      dp.deadEnd({ weight: 1 }),
      dp.parallelPath({ weight: 1 }),
      dp.keyDoor({ weight: 1, limit: 3 }),
      dp.healthPotion({ weight: 1, limit: 3 })
    ]},

    { name: 'close-cycles', limit: 3,                     // 3. tree -> Metroidvania
      rules: [dp.cycleCloseShortcut()] },

    { name: 'refine', rules: dp.refineEdges(              // 4. flavour the corridors
      dp.EDGE_PATH, [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE]) },

    { name: 'flavor', rules: [                            // 5. expand into mini-games
      dp.monsterBattle(), dp.puzzleChoice({ numDistractors: 3 })
    ]},

    dp.dotDecorationStage()                               // 6. readable DOT labels
  ]
}, { matcher })

const graph = g.evolve({ seed: 42 }).graph
```

`registerNarrator` must run **before** the `Grammar` is constructed: `Grammar`
builds its JSON schema from the matcher's plugin table, so an unregistered
`$macro` is a schema validation error rather than a runtime one.

[`examples/maze-locked.js`](examples/maze-locked.js) is the budgeted version of
this and the file to copy when starting something new.

## Gating

Generated nodes carry a `label.nodeId`; forward edges paired with a backtrack
carry a `label.edgeId`. An edge is gated by a `prereq` in one of three flavours:

| `prereq` | unlocks when | used by |
|---|---|---|
| `{ pairId: X }` | the player has visited a `key` node with `pairId: X` | locked doors |
| `{ traversed: X }` | the player has traversed the forward edge with `edgeId: X` | backtracks |
| `{ visited: X }` | the player has visited a node with `nodeId: X` | cycle-closing returns |

A *backtrack* is gated on having walked a specific corridor, so it unwinds a
route you took. A *return* is gated on having been somewhere, so it is a loop
you have discovered. That distinction is the Dormans cyclic-generation move.

## Papers

A small internal literature establishing the vocabulary and the standard of
rigor this project works to. Each is short, cites the source, and ends with open
problems.

| paper | subject |
|---|---|
| [narrative-slots](papers/narrative-slots.md) | A key and a door are one graph transformation and at least ten pieces of text. The taxonomy, the version axes, and the criterion that admits an eleventh. |
| [key-lock-transformations](papers/key-lock-transformations.md) | "Key-and-lock" names a semantic relation, not a shape. A catalogue of the graph rewrites that realise it, and what each costs. |
| [budgets](papers/budgets.md) | Aiming a stochastic generator: why a weight is not a probability, what nesting depth is, and why rejection sampling is the honest answer. |
| [matching-engine](papers/matching-engine.md) | Ullmann subgraph isomorphism as implemented here, the triage hooks, measurements, and what is not implemented. |
| [murder-mystery](papers/murder-mystery.md) | The daily puzzle: social locks, the murderer as author of the grammar derivation, fairness, and difficulty. |
| [logic-minigames](papers/logic-minigames.md) | Bipartite matching from propositional clues — which is not a skin bolted onto the map, but the map's own key-lock assignment problem surfaced. |

## Tests and benchmarks

```bash
npm test          # node:test, zero deps
npm run bench     # wall-clock benchmark on a representative dungeon workload
```

## Scripts

- [`bin/story.js`](bin/story.js) — generate a catalogued example and export it
- [`bin/transform.js`](bin/transform.js) — run an arbitrary grammar file, stop at the graph
- [`bin/qc-graph.js`](bin/qc-graph.js) — quality-check a generated graph
- [`bin/lattice.js`](bin/lattice.js) — create an N×N square lattice as a seed graph
- [`bin/graph2dot.js`](bin/graph2dot.js) — graphlib → Graphviz
- [`bin/build-docs.js`](bin/build-docs.js), [`bin/build-play.js`](bin/build-play.js) — the site

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
  -m, --llm=COMMAND    command-line interface to LLM (default "llm")
      --no-llm         disable LLM calls; narrator helpers return placeholder text
      --sonnet         use Anthropic Sonnet via SDK for narrator helpers
      --model=NAME     model to use with --sonnet
      --placeholder    narrator slots emit [theme:macro#ctx] placeholders
      --theme=NAME     pin the theme (default: deterministic from seed)
      --list-themes    print available themes and exit
      --list-macros    print available narrator macros and exit
      --no-flavor      skip the flavor stage
      --passage-only   refine path edges as passage only
  -s, --seed=N         seed random number generator
  -q, --quiet          do not print pretty log messages
  -v, --verbose        print MORE pretty log messages
  -h, --help           display this help message

</code></pre>
