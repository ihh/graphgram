# Guide

*Rules, labels, stages and the sampler: everything needed to write a grammar and grow a graph from it. For the machinery underneath — the matcher, the performance hooks, how to add primitives or export targets — see [Advanced](advanced.html).*

## 1. Install and run

```bash
npm install graphgram          # as a library
git clone https://github.com/ihh/graphgram && cd graphgram && npm install
```

The smallest useful program:

```js
const { Grammar } = require('graphgram')

const grammar = new Grammar({
  start: 'A',
  limit: 6,
  rules: [
    { lhs: 'A', rhs: ['A', 'B'] },   // an 'A' node becomes an A→B chain
    { lhs: 'B', rhs: 'C' }           // a 'B' node becomes a 'C' node
  ]
})

const { graph, iterations } = grammar.evolve({ seed: 42 })
console.log(graph.nodes().length, 'nodes after', iterations, 'rules')
```

`graph` is a plain graphlib `Graph`. `evolve` is the only API method you need
for most work; `seed` makes the run reproducible.

## 2. A rule

A rule is a pattern to find and a replacement to substitute:

```js
{
  name: 'insert-room',                 // for logs; optional
  lhs: {                               // the pattern to find
    node: [{ id: 'a' }, { id: 'b' }],
    edge: [{ v: 'a', w: 'b', label: { type: 'path' } }]
  },
  rhs: {                               // what to put in its place
    node: [{ id: 'a' }, { id: 'b' }, { id: 'm', label: { type: 'room' } }],
    edge: [{ v: 'a', w: 'm', label: { type: 'path' } },
           { v: 'm', w: 'b', label: { type: 'path' } }]
  },
  weight: 2,                           // sampling weight
  limit: 5                             // fire at most 5 times
}
```

Read it as: *find any two nodes joined by a `path` edge; replace that edge with
a new `room` node in the middle.*

Node ids (`a`, `b`, `m`) are **local to the rule**. An id that appears on both
sides means "this node survives"; an id that appears only on the LHS means "this
node is deleted"; an id that appears only on the RHS means "this node is
created". The two `path` edges on the RHS reference the surviving `a` and `b`.

### Syntactic sugar

Most rules are shorter than that. The grammar loader expands several
abbreviations before validation:

| you write | it means |
|---|---|
| `lhs: 'A'` | a single node whose label matches `'A'` |
| `rhs: ['A','B','C']` | a chain of three new nodes, auto-linked head-to-tail into the surrounding graph |
| `node: 'room'` | `{ id: <auto>, label: 'room' }` |
| `node: ['m','room']` | `{ id: 'm', label: 'room' }` |
| `edge: ['a','b']` | `{ v: 'a', w: 'b' }` |
| `edge: ['a','b',{type:'path'}]` | with a label |
| `edge: ['a','b',lbl,'e']` | …and an id, so the RHS can refer back to it |
| `{ id: 'a' }` on the RHS, no label | copy `a`'s matched label through unchanged |
| `{ id: 'a', update: {hot:true} }` | copy it through, with `hot` set |

Pass `{ canonical: true }` to the `Grammar` constructor to switch all of this
off and require fully explicit rules — useful when generating grammars
programmatically.

## 3. Labels and label queries

A label is any JSON value. Strings and numbers work; objects are what you
actually want, because they let you attach several independent facts to one
node.

On the **left-hand side**, a label is a *query*. On the **right-hand side**, it
is an *expression* that builds a new label.

### Queries (LHS)

```js
{ type: 'path' }                       // object must have type == 'path'
{ type: 'ro+m' }                       // strings are anchored regexes: ^ro+m$
{ $not: { type: 'win' } }              // negation
{ $and: [{ type: 'path' }, { $not: { edgeId: '(.+)' } }] }
{ $or:  [{ type: 'key' }, { type: 'door' }] }
{ $equals: { type: 'room' } }          // exact: no other properties allowed
{ $contains: { type: 'room' } }        // the default: extra properties fine
{ $find: { pairId: 'pair_3' } }        // recursive descent anywhere in the label
{ $test: 'function (l) { return l.hp > 3 }' }
```

Omitting `label` entirely matches any node. Regex capture groups are available
downstream as `${a.match[1]}`.

`$and` is the workhorse. The idiom

```js
{ $and: [ { type: 'path' }, { $not: { edgeId: '(.+)' } } ] }
```

reads *a `path` edge that does not already carry an `edgeId`*, and appears
throughout [`dungeon-primitives.js`](https://github.com/ihh/graphgram/blob/master/dungeon-primitives.js)
to stop a rule from splitting an edge that some other rule has already paired
with a backtrack.

### Expressions (RHS)

```js
'room ${a.label.name}'                 // ${...} template interpolation
{ $eval: '$a.label.depth + 1' }        // JavaScript, with $id.label in scope
{ $extend: [ {type:'path'}, {edgeId: {$eval:'$e.label.edgeId'}} ] }   // skips undefined
{ $assign: [ {$eval:'$a.label'}, {seen: true} ] }                     // keeps undefined
{ $merge:  [ {$eval:'$a.label'}, {dot: {color: 'red'}} ] }            // recursive
```

The distinction between `$extend` and `$assign` matters more than it looks.
`$extend` **drops** keys whose value is `undefined`; `$assign` keeps them,
writing an explicit `undefined`. So

```js
{ $extend: [ { type: 'path' },
             { edgeId: { $eval: '$e.label.edgeId' },
               prereq: { $eval: '$e.label.prereq' } } ] }
```

copies `edgeId` and `prereq` from the matched edge *if it had them*, and leaves
the new label clean if it did not. With `$assign` you would get
`{ type: 'path', edgeId: undefined, prereq: undefined }`, and every downstream
`if (label.prereq)` would still be false but every `'prereq' in label` would be
true — a difference that shows up much later, in the exporter, as a mysterious
locked door with no lock.

In every expression, `$$iter` is the current iteration counter of the enclosing
stage and `$$graph` is the graph itself. Both are heavily used:

```js
nodeId:    { $eval: '"room_" + ($$iter + 1)' }        // a unique, stable id
condition: '$$graph.hasEdge($b.id, $a.id)'            // fire only inside a cycle
```

## 4. Conditions and weights

Two per-rule expressions, evaluated once per candidate match:

```js
condition: '$$graph.hasEdge($b.id, $a.id)',   // veto this match site
weight:    '$a.label.depth < 3 ? 5 : 1'       // bias the sampler at this site
```

`condition` runs *after* the pattern has been found, so it is a filter of last
resort — cheap per match, but it does not save you any search. Put everything
you can into the LHS labels instead; see [Advanced](advanced.html#what-costs-what).

## 5. The sampler — how a rule gets chosen

This is the part people most often get wrong, so it is worth stating plainly.
On each iteration the engine:

1. skips any rule that has hit its `limit` or has not reached its `delay`;
2. for every remaining rule, finds **all** match sites in the graph;
3. evaluates `condition` at each site, discarding the failures;
4. evaluates `weight` at each surviving site;
5. samples one site with probability proportional to its weight;
6. applies that rule there.

> **A weight is not a probability.** A rule's realised firing rate is its weight
> *times its number of match sites*, and the number of match sites grows as the
> graph grows. A `weight: 1` rule that matches every `path` edge will out-fire a
> `weight: 5` rule that matches only the start node, and increasingly so as the
> graph gets bigger.

That is why the practical control knob is `limit`, not `weight`. Weights set the
*mix*; limits set the *count*. [Budgets](papers/budgets.html) works this out
quantitatively, with measured distributions.

## 6. Stages

A staged grammar is a list of sub-grammars run in order, each on the output of
the last. This is how every non-trivial grammar in the repo is organised,
because it lets you say *finish growing the skeleton before you start
decorating it*:

```js
const g = new Grammar({
  start: 'START',
  stages: [
    { name: 'init',   rules: [...] },
    { name: 'expand', limit: 25, rules: [...] },   // grow structure
    { name: 'refine', rules: [...] },              // flavour the edges
    { name: 'decorate', rules: [...] }             // fill in display labels
  ]
})
```

Each stage has its own `limit`, and `$$iter` **resets at each stage boundary** —
which is why id-generating expressions in the primitives qualify themselves with
a role string (`"room_" + ($$iter+1)`, `"e_ak_" + ($$iter+1)`) rather than using
the bare counter.

Run one stage in isolation with `evolve({ stage: 2 })`, or from the CLI with
`bin/transform.js -S 2`. That is the single most useful debugging move available
when a grammar produces something unexpected.

## 7. Using the primitives

You rarely write the rules above by hand. `dungeonPrimitives` packages them as
factories, each returning a fresh rule object and each accepting the usual
`{ name, weight, limit, type, delay, condition }`:

```js
const { Grammar, Matcher, dungeonPrimitives: dp, registerNarrator } = require('graphgram')

const matcher = new Matcher()
registerNarrator(matcher, { placeholder: true })   // see §8

const g = new Grammar({
  start: 'START',
  stages: [
    dp.initStartGoalStage(),

    { name: 'expand', limit: 25, rules: [
      dp.midpointRoom({ weight: 2 }),                 // a <-> m <-> b
      dp.midpointRoom({ oneWay: true, weight: 1 }),   // only inside cycles
      dp.deadEnd({ weight: 1 }),                      // side branch + return
      dp.parallelPath({ weight: 1 }),                 // a second route a→m→b
      dp.keyDoor({ weight: 1, limit: 3 }),            // lock + shared pairId
      dp.healthPotion({ weight: 1, limit: 3 })
    ]},

    { name: 'close-cycles', limit: 3, rules: [dp.cycleCloseShortcut()] },

    { name: 'refine', rules: dp.refineEdges(
        dp.EDGE_PATH, [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE]) },

    { name: 'flavor', rules: [dp.monsterBattle(), dp.puzzleChoice()] },

    dp.dotDecorationStage()
  ]
}, { matcher })

const graph = g.evolve({ seed: 42 }).graph
```

| factory | what it does |
|---|---|
| `initStartGoalStage()` | spawns `start` and `win` plus the initial `start→win` path |
| `midpointRoom(o)` | inserts a room mid-edge; two-way by default, `{oneWay:true}` fires only inside existing cycles |
| `deadEnd(o)` | side branch off a path source, with an explicit backtrack |
| `parallelPath(o)` | a second route a→m→b alongside a→b, inheriting the original's `edgeId` and `prereq` |
| `keyDoor(o)` | key + door sharing a `pairId`; the locked edge carries `prereq.pairId` |
| `cycleCloseShortcut(o)` | a gated `return` edge b→a reusing an existing key: turns trees into Metroidvania graphs |
| `healthPotion(o)` | side-branch pickup with a `healValue` |
| `monsterBattle(o)` | expands a `monster` edge into a Markov battle |
| `puzzleChoice(o)` | expands a `puzzle` edge into an intro plus one correct answer and N distractors |
| `refineEdges(from, [to…])` | rewrites one edge type into a random pick from several, preserving other label fields |
| `dotDecorationStage()` | fills in `label.dot.label` wherever missing, for readable DOT output |

The acyclic siblings live in `dag-primitives.js` (`dagMidpoint`, `forkJoin`,
`dagKeyLock`) and the social ones in `mystery-primitives.js` (`suspect`,
`socialLock`, `directive`, `accusation`).

## 8. Narrative slots and the narrator

Every node and edge a primitive creates carries named text fields — `text` on a
room, `link` on a passage, and a full bundle on a key/door pair. Those fields
are filled by *narrator macros*, which are plugin RHS-label functions:

```js
{ id: 'm', label: { type: 'room',
                    nodeId: roomNid,
                    text: { $macro: ['describe_room', roomNid] } } }
```

`$macro` and friends are installed on the `Matcher` by `registerNarrator`, and
they must be installed **before** the `Grammar` is constructed — `Grammar`
builds its JSON schema from the matcher's plugin table, so an unregistered
`$macro` is a schema validation error, not a runtime one. This trips everyone
up once:

```js
const matcher = new Matcher()
registerNarrator(matcher, { placeholder: true })
const g = new Grammar(json, { matcher })          // ← this order, always
```

Three modes:

| mode | what a slot returns |
|---|---|
| `{ placeholder: true }` | `[gothic_horror:describe_room#room_4]` — legible, offline, deterministic |
| `{ llm: 'llm' }` | shells out to the [`llm` CLI](https://github.com/simonw/llm) |
| `{ runner: sonnetRunner }` | calls the Anthropic API, with an on-disk prompt cache |

The macro names are a fixed vocabulary in
[`themes.js`](https://github.com/ihh/graphgram/blob/master/themes.js); list them
with `bin/transform.js --list-macros`. The taxonomy behind them — which slots
exist, why, and which ones are still missing — is
[the narrative slot paper](papers/narrative-slots.html).

## 9. Gating: how a lock is expressed

Generated nodes carry a `label.nodeId`; forward edges paired with a backtrack
carry a `label.edgeId`. An edge is gated by a `prereq` in one of three flavours:

| `prereq` | unlocks when | used by |
|---|---|---|
| `{ pairId: X }` | the player has visited a `key` node with `pairId: X` | locked doors |
| `{ traversed: X }` | the player has traversed the forward edge with `edgeId: X` | backtracks |
| `{ visited: X }` | the player has visited a node with `nodeId: X` | cycle-closing returns |

The distinction between the last two is the interesting one. A *backtrack* is
gated on having walked a specific corridor, so it unwinds a route you actually
took. A *return* is gated on having been somewhere, so it is a loop you have
discovered rather than a corridor you are retracing.

## 10. From graph to story

```bash
bin/story.js --list                                        # the catalogue
bin/story.js --example maze-locked --seed 42 --format ir   # the Story IR
bin/story.js --example maze-locked --seed 42 --format twine        --out story.twee
bin/story.js --example maze-locked --seed 42 --format choicescript --out cs/
bin/story.js --example maze-locked --seed 42 --format inform7      --out story.ni
bin/story.js --example maze-locked --seed 42 --format play  --out play/graph.js
bin/story.js --example maze-locked --seed 42 --format dot   --out d.dot
```

Everything downstream of `--format ir` is a pure function of the
[Story IR](spec/story-ir.html): passages, links, a small condition/effect
language, and text objects with first/repeat/brief variants. An exporter never
sees a graphlib graph.

For a fixed library version, `--example E --seed S` produces byte-identical
output on every machine, in every format. The only entropy source is the seeded
Mersenne Twister; the theme is derived from the seed; nothing stamps a
timestamp.

## 11. Rendering and debugging

```bash
# a PDF of any grammar, via graphviz
make pdf/dunjs-dungeon.42.pdf SEED=42

# quality-check a generated graph
bin/qc-graph.js -i graph.json

# run one stage only, loudly
bin/transform.js -g grammars/dunjs-dungeon.js -S 2 -v
```

`-v` prints every match site found, its weight, and the sampled rule — which is
usually enough to see why a rule you expected to fire did not. The most common
answers are: the LHS did not match (check your label queries against an actual
generated label), the rule hit its `limit`, or another rule with far more match
sites out-competed it.

## Next

- [Advanced](advanced.html) — the matcher, its triage hooks, writing your own primitives and exporters
- [Worked examples](examples.html) — five reproducible stories with pinned seeds
- [Papers](papers/index.html) — the design literature
