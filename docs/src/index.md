# graphgram

*A graph grammar library, and a pipeline that turns the graphs it grows into playable stories — Twine, ChoiceScript, Inform 7, or a browser.*

`graphgram` rewrites [graphlib](https://github.com/dagrejs/graphlib) graphs
according to a JSON-described grammar. You give it rules of the form *"wherever
you find this pattern, replace it with that one"*, a weight and a limit for
each, and it grows a graph. Rooms, corridors, locks, keys, suspects, secrets.

The one genuinely heavyweight thing it does is **find the patterns**: applying a
rewrite rule means locating every occurrence of its left-hand side in the host
graph, which is subgraph isomorphism, which is NP-complete. The implementation
is Ullmann's 1976 algorithm with several deliberate triage hooks bolted on so
that the common case — a rule whose pattern nodes carry literal type labels —
never enters the expensive part of the search at all.

```bash
npm install graphgram
```

```bash
# grow a dungeon and play it in a browser
bin/story.js --example maze-locked --seed 42 --format play --out play/graph.js
open play/index.html

# the same dungeon, as a Twine story
bin/story.js --example maze-locked --seed 42 --format twine --out maze.twee
```

## Start here

<ul class="cards">
<li class="card">
<h3><a href="guide.html">Guide</a></h3>
<p>Rules, labels, stages, and the sampler. Everything you need to write your first grammar and grow a graph from it.</p>
<span class="meta">basic usage</span>
</li>
<li class="card">
<h3><a href="advanced.html">Advanced</a></h3>
<p>The matching engine and its performance hooks, reusable primitives, narrative slots, and how to add an export target.</p>
<span class="meta">the machinery</span>
</li>
<li class="card">
<h3><a href="examples.html">Worked examples</a></h3>
<p>Five reproducible stories spanning DAG and bidirectional hypertexts, with and without puzzles. Every one playable at a pinned seed.</p>
<span class="meta">seeds you can run</span>
</li>
<li class="card">
<h3><a href="papers/index.html">Papers</a></h3>
<p>A small internal literature: the narrative slot taxonomy, key-lock transformations, budgets, the matcher, and the daily murder mystery.</p>
<span class="meta">design rationale</span>
</li>
</ul>

## What it is for

The library came out of level generation for roguelikes and choose-your-own
adventures — see [Joris Dormans' *Unexplored*](https://www.rockpapershotgun.com/how-unexplored-generates-great-roguelike-dungeons),
which uses graph grammars to build cyclic levels, and
[Matilde Marcolli's slides](http://www.its.caltech.edu/~matilde/GraphGrammarsLing.pdf)
for the formal background. It is not limited to games: a graph grammar is a
reasonable way to grow any structured artefact whose parts have a small number
of recurring local shapes.

What this repo adds on top of the bare grammar engine is a full path from
grammar to playable artefact:

1. **Primitives** — [`dungeon-primitives.js`](https://github.com/ihh/graphgram/blob/master/dungeon-primitives.js)
   and its siblings package the recurring rewrites (midpoint rooms, dead ends,
   parallel paths, key/door pairs, cycle-closing shortcuts, monster battles,
   multiple-choice puzzles) as parameterised rule factories.
2. **Narrative slots** — every node and edge a rule creates carries named text
   fields, filled from a themed macro table offline or by a language model
   online. See [the slot taxonomy](papers/narrative-slots.html).
3. **Story IR** — a target-agnostic intermediate representation
   ([spec](spec/story-ir.html)) that normalises a generated graph into
   passages, links, conditions and effects.
4. **Exporters** — Twine (Twee 3 / Harlowe), ChoiceScript, Inform 7, and a
   browser play engine, each a pure function of the IR.

## The destination

Everything above is scaffolding towards one thing: a generatively-constructed,
optionally human-curated **daily murder mystery** that presents as a logic
puzzle and is, underneath, a nest of key-and-lock puzzles on a generated map.

The keys are facts rather than brass, and the mapping is exact. The butler's
silence is the **door** — it is what stands between you and the pantry, and it
speaks: *the butler says there is no reason to look in the pantry.* Knowing
about the butler's affair is the **key**, and you find it somewhere else
entirely, from someone linked to him by employment or by rumour, after solving
their puzzle. *Confront the butler about his affair* is the act of **using** the
key. The butler conceding that the pantry is worth a look is the **door
opening**.

And the pantry need not be a room. What lies behind a door can as easily be
another secret — the butler, once broken, coughing up what he knows about his
employer. Each application of an elaboration rule
that creates a lock has a diegetic reading — an anonymous directive from the
murderer to an unwitting accomplice — so that the grammar's derivation history
*is* the murderer's plan, and a player who reconstructs it has solved the case.

[The daily murder mystery](papers/murder-mystery.html) is the design paper.
