# Worked examples

*Five reproducible stories spanning the design space: DAG and bidirectional hypertexts, with and without puzzles, plus the murder mystery. Every one buildable from the command line at a pinned seed, and playable here.*

## The axes

A hypertext can be **acyclic** — every link moves you strictly forward, you
never revisit a passage, the whole story is a partial order — or
**bidirectional**, where corridors run both ways, loops close, and the player
can and will come back to somewhere they have been. The two want different
primitives, different text, and different things from an exporter. An acyclic
story never needs `text.repeat`; a bidirectional one is unreadable without it.

Orthogonally, a map can be **puzzle-free** — the shape of the graph is the
whole of the content — or **puzzle-inclusive**, where some links are gated on
state the player has to go and acquire. Adding a lock to an acyclic graph is
harder than it sounds, and `dag-locked` exists to show one way to do it.

|  | puzzle-free | puzzle-inclusive |
|---|---|---|
| **DAG hypertext** | `dag-plain` | `dag-locked` |
| **bidirectional hypertext** | `maze-plain` | `maze-locked` |

<!--EXAMPLE-CARDS-->

## Building them yourself

Every example is a module under `examples/` matching one small interface
(see [the catalogue spec](spec/examples.html)), and every artefact on this page
came from `bin/story.js`:

```bash
bin/story.js --list                      # the catalogue, with budgets

bin/story.js --example maze-locked --seed 42 --format ir           --out story.json
bin/story.js --example maze-locked --seed 42 --format twine        --out story.twee
bin/story.js --example maze-locked --seed 42 --format choicescript --out story-cs/
bin/story.js --example maze-locked --seed 42 --format inform7      --out story.ni
bin/story.js --example maze-locked --seed 42 --format play         --out play/graph.js
bin/story.js --example maze-locked --seed 42 --format dot          --out story.dot

make examples                            # all of the above, for all five
```

### Reproducibility

For a fixed library version, `--example E --seed S` produces **byte-identical**
output on every machine, in every format. Four things hold that up: a single
seeded Mersenne Twister as the only entropy source; a theme derived from the
seed rather than sampled; no wall-clock timestamp anywhere in the output (the
Twine IFID is a hash of `id + seed`, not a fresh UUID); and a defined ordering
for IR passages and links.

That is what makes a "seed you can share" meaningful, and it is why
[the daily mystery](papers/murder-mystery.html) can key off a date.

## What each one demonstrates

### `dag-plain` — the shape of a branching story

Fork and join, nothing else. Two arms diverge from a passage and rejoin at the
next, so a choice is real without fragmenting the story into two disjoint
futures that both have to be written. There is no state at all: no variables, no
conditions, no locks. If an exporter can round-trip this one, its passage and
link machinery is correct, and everything after this is about state.

### `dag-locked` — a lock the player cannot walk back to

The interesting acyclic problem. In a bidirectional map a key-lock is easy: you
hang the key off a side branch, and if you reach the door without it you walk
back. With no way back, that construction is unavailable.

`dagKeyLock` solves it with a fork whose two arms rejoin before the lock:

```
        ┌── key room ──┐
   a ───┤              ├─── join ──[locked]──▶ b
        └── skip room ─┘             │
                                     └──▶ (a losing ending)
```

The choice at `a` is a genuine commitment made *before* its consequence is
visible, and the failure is legible in hindsight. That is a real trade: you give
up recoverability, and what you buy is a puzzle solvable by reasoning rather
than by exhaustive walking — which is exactly what a daily puzzle wants.
[Key and lock as graph transformation](papers/key-lock-transformations.html)
catalogues the alternatives.

### `maze-plain` — why `text.repeat` exists

Two-way midpoint rooms, dead ends with explicit backtracks, parallel routes,
and cycle-closing returns. No locks anywhere. The point is that a map with no
puzzles in it at all is still worth walking, provided the writing knows you have
been here before. Every room and every passage in this example carries its own
narrative slot; a generated map where they do not is the specific failure this
example exists to catch.

### `maze-locked` — the full apparatus

Key/door side-branches with shared `pairId`s, nested locks, gated returns that
turn the tree into a Metroidvania graph, health potions, Markov monster battles,
and multiple-choice puzzle gates. This is the file to copy when starting
something new; its header comment walks through all six stages.

### `mystery-daily` — the destination

Suspects, secrets, and social locks. The keys are facts rather than brass, and
the correspondence is exact: the butler's silence is the door, knowing about his
affair is the key, confronting him with it is the act of unlocking, and his
conceding that the pantry is worth a look is the door swinging open. What lies
beyond need not be a room at all — it can be another secret, which is how a set
of suspects becomes a conspiracy with a shape.

The seed derives from the date, so everyone gets the same puzzle on the same
day. [The design paper](papers/murder-mystery.html) is the long version.

## Playing them

The [play page](play/index.html) runs any of these in the browser: a text pane
with the narrative and its link affordances, a live map of the neighbourhood
you are standing in, and a status bar with HP, inventory and a trace dump. Pick
a story from the menu, or link straight to one:

```
play/index.html?story=maze-locked.42
```

The text you will see is *placeholder prose* — `[gothic_horror:describe_room#room_4]`
— unless the story was built with `--sonnet`. That is the debug mode working as
designed: it shows exactly which narrative slot each piece of text will occupy,
which is far more useful when developing a grammar than plausible-sounding
filler would be. See [the narrative slot taxonomy](papers/narrative-slots.html)
for what the slot names mean.
