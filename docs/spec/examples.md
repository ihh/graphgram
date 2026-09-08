# Worked examples — the catalogue contract

Five named examples span the design space the library is meant to cover.
Each is a grammar module under `examples/`, each exports the same
interface, and each is reproducible from the command line at a pinned
seed.

## The axes

|  | puzzle-free | puzzle-inclusive |
|---|---|---|
| **DAG hypertext** | `dag-plain` | `dag-locked` |
| **bidirectional hypertext** | `maze-plain` | `maze-locked` |

Plus `mystery-daily`: the murder-mystery track, bidirectional and
puzzle-inclusive, whose locks are social rather than physical.

## The catalogue

| id | topology | puzzles | what it demonstrates |
|---|---|---|---|
| `dag-plain` | dag | no | Pure branching narrative. Fork/join structure, no state, no backtracking. The "hello world" of the export pipeline. |
| `dag-locked` | dag | yes | Key-lock inside an acyclic graph: the key sits on one arm of a fork, both arms rejoin, and the join's forward edge is locked. Choosing the keyless arm is a real (and recoverable-by-replay) failure. |
| `maze-plain` | bidirectional | no | Two-way midpoint rooms, dead ends, parallel paths, cycle-closing returns. Every passage revisitable, so `text.repeat` earns its keep. |
| `maze-locked` | bidirectional | yes | The full dungeon: key/door side-branches, nested locks, monster and puzzle minigames, health potions, gated returns. |
| `mystery-daily` | bidirectional | yes | Suspects, secrets, and social locks. Nested key-lock structure wearing the clothes of a logic puzzle. Seed derives from the date. |

## Module interface

```js
// examples/<id>.js
module.exports = {
  id: 'maze-locked',
  title: 'The Cindermoor Vault',
  topology: 'bidirectional',      // matches meta.topology
  puzzles: true,
  defaultSeeds: [42, 1729, 8675309],
  budget: { rooms: 12, keys: 3, nestingDepth: 2, npcs: 0, minigames: 2 },

  // Build the grammar JSON. `opts` carries { theme, budget, debug }.
  grammar (opts) { return { name: ..., start: 'START', stages: [ ... ] } }
}
```

`defaultSeeds[0]` is the canonical seed: it is the one the docs site
ships as playable, the one golden-file tests pin, and the one
`make examples` builds by default.

## Command line

```
bin/story.js --example maze-locked --seed 42 --format twine  --out out/maze-locked.42.twee
bin/story.js --example maze-locked --seed 42 --format choicescript --out out/maze-locked.42/
bin/story.js --example maze-locked --seed 42 --format inform7 --out out/maze-locked.42.ni
bin/story.js --example maze-locked --seed 42 --format ir     --out out/maze-locked.42.ir.json
bin/story.js --example maze-locked --seed 42 --format play   --out docs/play/stories/maze-locked.42.js
bin/story.js --list
```

`--format` values: `ir`, `twine`, `choicescript`, `inform7`, `play`, `dot`.
`choicescript` writes a *directory* (a ChoiceScript project needs several
files); every other format writes a single file. `--out -` writes to
stdout for the single-file formats.

Other flags mirror `bin/transform.js` where they overlap: `--theme`,
`--placeholder`, `--no-llm`, `--sonnet`, `--quiet`, `--verbose`.

## Reproducibility contract

For a fixed library version:

> `--example E --seed S` produces byte-identical output on every machine,
> in every format, for as long as the grammar for `E` is unchanged.

This holds because the only entropy source is the seeded Mersenne
Twister, the theme is derived from the seed, `meta` carries no timestamp,
and IR ordering is defined (see [`story-ir.md`](story-ir.md) §1). The
`--sonnet` path is exempt — it calls a model — but it is cached on disk
by prompt hash, so a warm cache reproduces too.
