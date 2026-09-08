# Story IR v1 — the export contract

`graphgram` generates *graphs*. Twine, ChoiceScript and Inform 7 want
*stories*. The Story IR is the narrow waist between them: one
target-agnostic JSON document that every exporter consumes and every
generator produces.

```
grammar ──evolve──▶ graphlib graph ──buildStoryIR──▶ Story IR ──┬─▶ Twee / Harlowe
                                                                ├─▶ ChoiceScript
                                                                ├─▶ Inform 7
                                                                └─▶ play/ engine
```

Everything downstream of the IR is a pure function of the IR. That is the
whole point: an exporter never reads a graphlib graph, never knows what a
`prereq.pairId` is, and never has to be updated when a new dungeon
primitive is added — only `buildStoryIR` does.

The normative example lives at
[`test/fixtures/story-ir.sample.json`](../../test/fixtures/story-ir.sample.json).
It is hand-authored, exercises every field in this document, and is the
fixture that all three exporter test suites run against. If this spec and
that fixture ever disagree, the fixture wins and the spec is the bug.

---

## 1. Top level

```jsonc
{
  "irVersion": 1,
  "meta":     { ... },   // §2
  "vars":     [ ... ],   // §3
  "items":    [ ... ],   // §4
  "passages": [ ... ],   // §5
  "links":    [ ... ],   // §6
  "start":    "P_start", // passage id
  "endings":  ["P_win", "P_death"]
}
```

`start` must name a passage in `passages`. Every id in `endings` must too.
Ordering of `passages` and `links` is stable and deterministic: passages in
breadth-first order from `start`, ties broken by ascending host id; links
grouped by source passage in the order they appear on that passage's
`links` array. Exporters may rely on this — golden-file tests do.

## 2. `meta`

| field | type | notes |
|---|---|---|
| `title` | string | human title, e.g. `"The Cindermoor Vault"` |
| `id` | string | slug of the example, e.g. `"maze-locked"` |
| `seed` | integer | the RNG seed. Reproducibility contract: same `id` + `seed` + library version ⇒ byte-identical IR |
| `theme` | string | one of `themes.js`'s themes |
| `grammar` | string | repo-relative path of the grammar that produced this |
| `generator` | string | `"graphgram <version>"` |
| `topology` | `"dag"` \| `"bidirectional"` | see §8 |
| `puzzles` | boolean | whether any locked link or minigame is present |
| `budget` | object | the budget the generator was run under (§9) |

`meta` carries **no wall-clock timestamp**. A build that embedded `Date.now()`
would defeat the reproducibility contract and make golden files churn.

## 3. `vars` — the state vector

Every piece of mutable state an exporter must declare up front. Exporters
that need declarations (ChoiceScript `*create`, Inform 7 "a number that
varies") emit one per entry; exporters with implicit state (Harlowe `$x`)
may skip declaration but must still honour `init`.

```jsonc
{ "name": "has_pair_1", "kind": "item",      "ref": "pair_1",  "init": false }
{ "name": "seen_room_3", "kind": "visited",  "ref": "room_3",  "init": false }
{ "name": "took_e_ak_2", "kind": "traversed","ref": "e_ak_2",  "init": false }
{ "name": "hp",          "kind": "number",   "ref": null,      "init": 100 }
{ "name": "moves",       "kind": "counter",  "ref": null,      "init": 0 }
```

`name` is `[a-z][a-z0-9_]*`, unique, and already safe for all three
targets (ChoiceScript is the strictest: lowercase, no leading digit, and
it reserves a handful of words — `buildStoryIR` is responsible for
avoiding them, not the exporters).

`kind` is advisory — it lets an exporter render item state as an Inform 7
*thing carried by the player* rather than a flag — but the semantics are
always "a variable with this `init` value".

## 4. `items`

Concrete objects the player can hold. Present so that Inform 7 can build a
real world model instead of a pile of flags, and so ChoiceScript can print
an inventory.

```jsonc
{
  "id": "pair_1",
  "var": "has_pair_1",          // the vars entry set when acquired
  "name": "the tarnished brass key",
  "description": "...",          // §7 text object
  "takeText":  { ... },          // the act of picking it up
  "carryText": { ... }           // the state of carrying it
}
```

`name` should be a noun phrase with its article, because Inform 7 will
write `The player carries the tarnished brass key.`

## 5. `passages`

```jsonc
{
  "id": "P_room_3",
  "hostId": "7",
  "nodeId": "room_3",
  "type": "room",
  "role": "normal",
  "title": "The Long Gallery",
  "text": { "first": "...", "repeat": "...", "brief": "..." },
  "status": "Key (pair_1)",
  "onEnter": [ { "op": "set", "var": "seen_room_3", "value": true } ],
  "links": ["L_3_5", "L_3_9"],
  "tags": ["room"]
}
```

| field | notes |
|---|---|
| `id` | unique, `[A-Za-z_][A-Za-z0-9_]*`. Doubles as a Twee passage name, a ChoiceScript `*label`, and an Inform 7 room name stem |
| `hostId` | the graphlib node id it came from. Debug provenance only |
| `nodeId` | the grammar's `label.nodeId`, or `null` |
| `type` | the grammar's `label.type` (`room`, `key`, `door`, `win`, …) |
| `role` | `"start"`, `"normal"`, `"ending"`, `"death"`, `"item"`, `"choice"`, `"random"`. Drives structural decisions: an exporter must terminate the story at `ending`/`death`, and must auto-resolve links out of a `random` passage |
| `title` | short display name. Never empty |
| `text` | §7 |
| `status` | optional one-line status-bar chip, or `null` |
| `onEnter` | §8 effects, applied on arrival, in order, before links are offered |
| `links` | ids of outgoing links, in presentation order |
| `tags` | free-form; Twee writes them as passage tags |

A passage with `role: "random"` must have every outgoing link carrying
`kind: "random"` and a numeric `weight`. A passage with an empty `links`
array must have `role` of `"ending"` or `"death"`.

## 6. `links`

```jsonc
{
  "id": "L_9_11",
  "edgeId": "e_db_2",
  "from": "P_door_2",
  "to": "P_room_5",
  "type": "path",
  "kind": "choice",
  "weight": 1,
  "linkText":   { "first": "Unlock the door with the brass key", "repeat": "Go through the open door" },
  "text":       { "first": "The lock turns...", "repeat": "You pass through again." },
  "closedText": { "first": "The door will not budge." },
  "condition":  { "all": [ { "var": "has_pair_1", "is": true } ] },
  "whenBlocked": "show",
  "onTraverse": [ { "op": "set", "var": "took_e_db_2", "value": true } ]
}
```

| field | notes |
|---|---|
| `id` | unique, same charset as passage ids |
| `edgeId` | the grammar's `label.edgeId`, or `null` |
| `from`, `to` | passage ids |
| `type` | the grammar's edge `label.type` |
| `kind` | `"choice"` — the player picks it; or `"random"` — the engine rolls it by `weight` |
| `weight` | positive number; only meaningful when `kind` is `"random"` |
| `linkText` | the affordance itself: the words on the link/button |
| `text` | narration printed *on* traversal, after the choice is made |
| `closedText` | narration shown when `condition` is false. `null` means say nothing |
| `condition` | §8 condition, or `null` for always-open |
| `whenBlocked` | `"show"` — render the link greyed/with `closedText`; `"hide"` — omit it entirely |
| `onTraverse` | §8 effects, applied when the link is taken |

## 7. Text objects — the flavor axes

Every narrative slot in the IR is a **text object**, never a bare string:

```jsonc
{
  "first":  "A door of blackened oak, banded in iron, stands shut.",
  "repeat": "The oak door again.",
  "brief":  "An oak door.",
  "variants": [ "The oak door, still shut.", "That same banded door." ]
}
```

* `first` — required. Shown the first time this element is encountered.
* `repeat` — optional. Shown on every subsequent encounter. Falls back to
  `first` when absent.
* `brief` — optional. A terse form for map legends, status chips, and
  Inform 7's `printed name`.
* `variants` — optional. Sampled (round-robin, not randomly — determinism)
  after `repeat` has been used once.

`buildStoryIR` may emit a plain string wherever a text object is expected;
consumers must accept that and treat `"foo"` as `{ "first": "foo" }`. A
tiny `normalizeText` helper is exported from `story-ir.js` for exactly
this. Producing normalized objects is preferred.

### Why an object and not a function

The fully general form of history-dependent text is a function
`f(trajectory) → string`, where a trajectory is the player's path through
the graph and a sufficient summary of it is the vector of edge traversal
counts. The IR deliberately does **not** ship functions: they don't
serialize, and none of the three export targets can evaluate JavaScript.

What the IR ships instead is the *first-order projection* of that
function — the distinction between "count is zero" (`first`) and "count is
positive" (`repeat`) — which is the part every target can express with a
single boolean. Richer projections (count thresholds, "you have been here
three times", conditional on some *other* edge's count) are future work
and are discussed in
[`papers/narrative-slots.md`](../../papers/narrative-slots.md). When they
land they will be additive: a `"conditions"` array on the text object,
each entry pairing a §8 condition with a string, evaluated top-down with
`first`/`repeat` as the fallback. Exporters that ignore the new field keep
working.

## 8. Conditions and effects

A deliberately tiny language, chosen so that it compiles to all three
targets without an interpreter.

**Conditions**

```jsonc
{ "var": "has_pair_1", "is": true }        // boolean equality
{ "var": "hp", "gt": 0 }                   // also: gte, lt, lte, eq, ne
{ "all": [ cond, cond, ... ] }
{ "any": [ cond, cond, ... ] }
{ "not": cond }
```

**Effects**

```jsonc
{ "op": "set",     "var": "seen_room_3", "value": true }
{ "op": "add",     "var": "hp",          "value": -20 }
{ "op": "acquire", "item": "pair_1" }      // sets the item's var
```

Every effect is idempotent under `set`/`acquire` and monotone-safe under
`add`. Exporters apply them in array order.

## 9. Topology and budgets

`meta.topology` is a *promise about the graph*, and exporters may lean on it:

* `"dag"` — the link graph is acyclic. No link's `to` reaches its `from`.
  Inform 7 can lay this out with one-way doors; Twine needs no
  "go back" affordances; ChoiceScript can use `*finish` between scenes.
* `"bidirectional"` — cycles exist. Backtracks and returns are present,
  the player can revisit passages, and every exporter must handle
  re-entry (hence `text.repeat` mattering).

`meta.budget` records the caps the generator ran under. It is descriptive,
not prescriptive — the IR is already generated — but it travels with the
story so the docs site can show it and so regression tests can assert the
generator respected it.

```jsonc
{ "rooms": 12, "keys": 3, "nestingDepth": 2, "npcs": 0, "minigames": 2 }
```

See [`papers/budgets.md`](../../papers/budgets.md) for how the budget is
turned into rule `limit`s and how nesting depth is measured.

## 10. Validation

`story-ir.js` exports `validateStoryIR(ir) → string[]` returning a list of
human-readable problems (empty when valid). It checks, at minimum:

1. every `links` id on a passage exists in `links`
2. every link's `from`/`to` names a real passage
3. `start` and each of `endings` name real passages
4. every passage is reachable from `start`
5. every passage with no outgoing links has `role` `"ending"` or `"death"`
6. every var referenced by a condition or effect is declared in `vars`
7. every item's `var` is declared in `vars`
8. ids are unique and match the exporter-safe charset
9. `meta.topology === "dag"` ⇒ the link graph really is acyclic
10. `role: "random"` passages have only `kind: "random"` outgoing links,
    each with a positive `weight`

Exporters call `validateStoryIR` and throw on a non-empty result rather
than emitting a broken story.
