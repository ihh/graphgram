# Graph to Story IR — the mapping

`buildStoryIR(graph, opts)` in [`story-ir.js`](../../story-ir.js) is the
only place in the library that reads both the graphlib label conventions of
[`dungeon-primitives.js`](../../dungeon-primitives.js) and the export
contract of [`story-ir.md`](story-ir.md). This page is the reference for
what it does. The contract itself is `story-ir.md`; where the two disagree,
`story-ir.md` — and above it `test/fixtures/story-ir.sample.json` — wins.

```js
const { buildStoryIR, validateStoryIR } = require('graphgram/story-ir')

const graph = grammar.evolve({ seed: 42 }).graph
const ir = buildStoryIR(graph, { id: 'maze-locked', seed: 42, theme: 'gothic_horror' })
const errors = validateStoryIR(ir)      // [] when exportable
```

## 1. Nodes to passages

| graph node label | IR passage field | rule |
|---|---|---|
| — | `id` | `P_` + sanitized `nodeId`, or the host id when there is no `nodeId` |
| the graphlib key | `hostId` | verbatim, as a string. Debug provenance only |
| `nodeId` | `nodeId` | verbatim, or `null` |
| `type` | `type` | verbatim, or `null` |
| `type` | `role` | `start`→`start`, `win`→`ending`, `death`→`death`, `random`→`random`, `choice`→`choice`, `key`/`potion`→`item`, anything else→`normal`. A `normal` node with no outgoing edges is promoted to `ending`, because the spec forbids a role-less sink |
| `nodeId` | `title` | title-cased (`battle_normal_3` → `Battle Normal 3`) |
| `text` | `text` | normalized to a text object. Falls back to `dot.label`, then to `title` |
| `pairId`, `healValue` | `status` | `Key (pair_1)`, `Door (pair_1)`, `Potion (+30)`, else `null` |
| `pairId`, `healValue` | `onEnter` | always `set seen_<nodeId>`; a `key` node also `acquire`s its `pairId`; a `potion` node also `add`s `healValue × 100` to `hp` |
| — | `links` | ids of the outgoing links, in presentation order (§4) |
| `type`, `beat`, `role` | `tags` | the node type, plus `ending`/`death`/`item` from the role, plus a set-piece's `beat_<n>` and its `decline`/`bypass` role |

Placeholder strings of the form `[theme:macro#ctx]` — what
[`narrator.js`](../../narrator.js) emits in placeholder mode — pass through
**verbatim**. That is debug mode working as designed; stripping them would
turn a visibly unfilled slot into an invisibly empty one.

## 2. Edges to links

| graph edge label | IR link field | rule |
|---|---|---|
| `edgeId` | `id` | `L_` + sanitized `edgeId`; `L_<fromHostId>_<toHostId>` when the edge has none |
| `edgeId` | `edgeId` | verbatim, or `null` |
| — | `from`, `to` | the endpoints' passage ids |
| `type` | `type` | verbatim, or `null` |
| `type`, source node `type` | `kind` | `random` when the edge type is `consequence` or the source node is a `random` node; otherwise `choice` |
| `weight` | `weight` | `label.weight` when it is a positive finite number, else `1` |
| `link`, `dot.label`, `type` | `linkText` | the first of those that is non-empty; the type falls back through a phrase table (`backtrack` → "Go back"). Never empty — a blank button is unusable |
| `before`, `prereq.after` | `text` | the two joined with a space, in that order; `null` when neither is present |
| `prereq` | `condition` | see §3 |
| source node `text` | `closedText` | the **door node's own** text for a `pairId` lock — that is the "description of closed door" the player is standing in front of. `null` otherwise |
| `prereq` | `whenBlocked` | `show` for a `pairId` lock; `hide` for `traversed` and `visited` gates |
| `edgeId`, `playerDamage` | `onTraverse` | `set took_<edgeId>` when there is an `edgeId`; then `add 1` to `moves`; then, on a `consequence` edge, `add -(playerDamage × 100)` to `hp` |

`whenBlocked` splits the way it does because the two gates mean different
things to the player. A locked door is a *puzzle*: the player has to see it
to know a key is worth finding, so it renders with its `closedText`. A
`traversed` or `visited` gate is a route the player has not earned yet;
advertising a "Go back" that does nothing is noise, so it is omitted
entirely until it opens.

## 3. Prereqs to conditions

Every prereq the CYOA gating model defines (see the README's gating table)
carries exactly one of three keys, and each becomes one boolean test:

| `prereq` | `condition` | `whenBlocked` |
|---|---|---|
| `{ pairId: 'pair_1' }` | `{ all: [ { var: 'has_pair_1', is: true } ] }` | `show` |
| `{ traversed: 'e_ak_2' }` | `{ all: [ { var: 'took_e_ak_2', is: true } ] }` | `hide` |
| `{ visited: 'room_3' }` | `{ all: [ { var: 'seen_room_3', is: true } ] }` | `hide` |
| absent | `null` | `show` |

A locked door's prereq also carries narrative `link` and `after` fields;
`after` lands in the link's `text` (§2) and `link` is redundant with the
edge's own `link`, which is where `linkText` reads it from.

## 4. Ordering

* **Passages** are breadth-first from `start`, each level sorted by
  ascending numeric host id, with anything the start cannot reach appended
  afterwards in host order. Unreachable nodes are emitted rather than
  dropped, so `validateStoryIR` can report them instead of the story
  silently getting smaller.
* **Links** are grouped by source passage in that passage's order, and
  within a passage sorted by *presentation bucket* first: forward and
  choice links, then locked links, then backtracks, returns and retreats.
  A player offered "Go back" as their first option will take it.
* Ties inside a bucket break on target host id, then edge type, then
  `edgeId` — a total order, so two runs at one seed emit the same sequence
  regardless of what graphlib promises about `outEdges`.

## 5. Names

`nodeId`s and `edgeId`s come from grammar templates, so nothing about them
is safe by construction. Every id that reaches the IR is lowercased,
non-alphanumerics collapse to `_`, and the result is checked against the
union of ChoiceScript's reserved words (the strictest of the three
targets). Two *distinct* raw ids that sanitize to the same string get
`_2`, `_3` suffixes in emission order — deterministic, never random.

One raw id asked for twice gets the *same* variable, which matters: a
`monsterBattle` stamps one inherited `edgeId` onto three different edges,
and the backtrack gated on that `edgeId` has to be satisfied by whichever
of them the player walks. Link ids are the opposite case — they address an
edge, not a gate, so those three edges get `L_e_x`, `L_e_x_2`, `L_e_x_3`.

## 6. `meta`, and what is derived

Anything `opts` does not supply is derived:

| field | derivation when `opts` is silent |
|---|---|
| `seed` | `0` |
| `theme` | `themes.pickTheme(seed)` |
| `title` | `"The " + word(seed) + " " + noun(theme)` — e.g. `The Lowbarrow Vault` |
| `id` | the title, slugged |
| `topology` | measured: `dag` when the link graph is acyclic, else `bidirectional` |
| `puzzles` | measured: true when any link has a condition |
| `generator` | `graphgram <package version>` |
| `grammar`, `budget` | `null` |

`topology` and `puzzles` are *measured*, not assumed, so a caller who
passes `topology: 'dag'` for a cyclic graph gets their claim recorded and
then rejected by `validateStoryIR` — which is where you want to find out.
`budget` is a property of the generator *run*, not of the graph: caps that
never bound anything leave no trace to recover, so it stays `null` unless
the caller says. `meta` carries no timestamp, by contract.

Note that the theme in `meta` is *not* read back out of the graph — the
narrator picked its theme before evolution, so a caller that ran the
narrator on a non-default theme should pass the same `theme` here.

## 7. Worked example: one `keyDoor`

Four nodes — the branch point, the key, the door, and what is behind it —
with the two backtracks the primitive pairs them with. Abridged:

```jsonc
// nodes
"3": { "type": "key",  "nodeId": "key_1",  "pairId": "pair_1", "text": "A key, still warm." },
"5": { "type": "door", "nodeId": "door_1", "pairId": "pair_1", "text": "A door of blackened oak, banded in iron." },
"7": { "type": "win",  "nodeId": "win",    "text": "Ledgers, in one hand throughout." },

// edges
"1" -> "3": { "type": "passage", "edgeId": "e_ak_1", "before": "A stair falls away.", "link": "Take the stair down" },
"3" -> "1": { "type": "backtrack", "prereq": { "traversed": "e_ak_1" } },
"5" -> "7": { "type": "passage", "edgeId": "e_db_1", "link": "Turn the key in the lock",
              "prereq": { "pairId": "pair_1", "link": "Turn the key in the lock",
                          "after": "The wards line up." } }
```

becomes, at `{ id: 'keydoor', seed: 42, theme: 'gothic_horror' }`:

```jsonc
"items": [ { "id": "pair_1", "var": "has_pair_1", "name": "the tarnished key",
             "description": { "first": "A key, still warm." },
             "takeText": { "first": "A key, still warm." }, "carryText": null } ]

{ "id": "P_key_1", "hostId": "3", "nodeId": "key_1", "type": "key", "role": "item",
  "title": "Key 1", "text": { "first": "A key, still warm." },
  "status": "Key (pair_1)",
  "onEnter": [ { "op": "set", "var": "seen_key_1", "value": true },
               { "op": "acquire", "item": "pair_1" } ],
  "links": ["L_3_1"], "tags": ["key", "item"] }

{ "id": "L_e_db_1", "edgeId": "e_db_1", "from": "P_door_1", "to": "P_win",
  "type": "passage", "kind": "choice", "weight": 1,
  "linkText":   { "first": "Turn the key in the lock" },
  "text":       { "first": "The wards line up." },
  "closedText": { "first": "A door of blackened oak, banded in iron." },
  "condition":  { "all": [ { "var": "has_pair_1", "is": true } ] },
  "whenBlocked": "show",
  "onTraverse": [ { "op": "set", "var": "took_e_db_1", "value": true },
                  { "op": "add", "var": "moves", "value": 1 } ] }

{ "id": "L_3_1", "edgeId": null, "from": "P_key_1", "to": "P_start",
  "type": "backtrack", "kind": "choice", "weight": 1,
  "linkText": { "first": "Go back" }, "text": null, "closedText": null,
  "condition": { "all": [ { "var": "took_e_ak_1", "is": true } ] },
  "whenBlocked": "hide",
  "onTraverse": [ { "op": "add", "var": "moves", "value": 1 } ] }
```

Passage order is `P_start`, `P_key_1`, `P_door_1`, `P_win`; `start` is
`P_start` and `endings` is `["P_win"]`. The door's own links come out as
`["L_e_db_1", "L_5_1"]` — the locked way forward before the way back.

The same fragment is asserted field by field in
[`test/story-ir.test.js`](../../test/story-ir.test.js), so this example
cannot drift away from the code without a test failing.
