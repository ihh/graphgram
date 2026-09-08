# The Narrative Slot Taxonomy

*A key and a door are one graph transformation and at least ten pieces of
text. This paper enumerates those pieces and gives the criterion that
admits an eleventh. It does the same for rooms and passages, where an
advertisement naively depends on three booleans and so on eight states —
five reachable, two surviving graphgram's gating. It separates* which slot
*a string fills from* which version *of it is wanted, gives the general
type (trajectory to string), shows that edge-traversal counts are
a sufficient statistic for it except for recency, and explains why Story
IR v1 ships only the boolean projection of that vector. It ends with an
audit of how slots are filled here today, and where code and taxonomy have
come apart.*

## 1. Notation

The generator emits a directed multigraph `G = (V, E)` whose nodes and
edges carry `label` objects; call a node or edge an **element**. A **slot**
is a named position in an element's text — not a string, a hole where one
goes. A **moment** is a pair (element, player state) at which the engine
must emit text; slots are individuated by moments (§2.2). A **trajectory**
is the walk `v0 -e1-> v1 -...-> vn` from the start. For `e = (u→v)`, `ē`
is the reverse edge `(v→u)` when one exists — here a separate edge with
its own label, usually `type: "backtrack"`, never a direction flag. `T(e)`
and `V(x)` are traversal and visit counts; `c ∈ ℕ^E` is the vector of all
`T(e)`. Two registers recur, named in `narrator.js`: **narrator** text
(`asNarrator`) and **player-command** text (`asPlayer`, the words on the
affordance).

## 2. The slot inventory for a key–lock

### 2.1 The ten

One `keyDoor` application (`dungeon-primitives.js:289`) rewrites one path
edge into a key branch, a door node, and a gated forward edge. That single
transformation opens ten moments.

| # | Slot | Fires when | Register | Optional | What breaks without it |
|---|---|---|---|---|---|
| 1 | `lock.closed` | the gated edge is offered and its condition is false | narrator | no | the refusal has no stated reason and reads as a bug, not a puzzle |
| 2 | `key.location` | entering the node holding the key, before pickup | narrator | no | the key materialises from nowhere; its room has no reason to exist |
| 3 | `key.description` | the key as an object, wherever it is named | narrator | no | the unlock line can only say "the key"; key and lock cannot be matched by description |
| 4 | `key.take` | the moment of acquisition | player-command | yes | acquisition is silent; the player does not learn they hold it |
| 5 | `key.carry` | the standing state, in inventory or status chip | narrator (terse) | yes | the status bar shows an internal id (`Key pair_3`) |
| 6 | `lock.recognition` | key and lock first co-present | narrator | yes | the solution is invisible: a greyed affordance silently turns live |
| 7 | `lock.unlock` | the traversal that first opens the gate | player-command | no | there is no moment of solving; the lock is a speed bump |
| 8 | `lock.open` | the door as a standing object, on any later encounter | narrator | no | the door is described as shut forever, including from behind (§7, D5) |
| 9 | `edge.preface` | the affordance for taking the now-open edge | player-command | no | the button reads `path`, the engine's last-resort fallback (`play/game.js:455`) |
| 10 | `edge.traverse` | narration printed on going through, once open | narrator | yes | the move between rooms is abrupt |

Slots 7 and 9 get confused because both are player-command text on the
same edge. They are different moments: 7 fires once, on the traversal that
flips the gate; 9 on every traversal after. The IR fixture encodes them as
one field's two *versions*, which §4 argues is a category error.

### 2.2 The admission criterion

The list is deliberately open. The rule for admitting an eleventh slot:

```
A slot exists iff there is a player-visible moment at which the
text must differ from every other slot's text.
```

Two corollaries do the work. *A distinction the player cannot observe is
not a slot*: if the engine knows the door slides but never renders that,
there is no `door.mechanism`. *Two positions that always co-fire and never
need to differ are one slot*: slots 2 and 3 are separate only because a
key can be named away from where it lies.

Three slots the list lacks and plausibly needs:

1. **`lock.wrong_key`.** The gate is `prereq.pairId`, so the only failure
   is "no key with this id", which reads as "no key at all". Once a budget
   permits two keys held at once (see [budgets](budgets.md)), "that key
   does not fit" is a visibly different moment from "you have nothing to
   try".
2. **`lock.far_side`.** Arriving at a door from behind, never having
   unlocked it. `keyDoor` makes this unreachable — the `b→d` backtrack is
   gated on the locked edge's `traversed` — but `cycleCloseShortcut`
   exists to route players around, and the first cycle that lands someone
   behind a locked door needs text other than "a locked door blocks the
   way".
3. **`lock.refused_again`.** A player who pushes a door five times gets
   one sentence five times. It is a version rather than a slot only if
   `first`/`repeat` is granted to the rejected-offer moment; nothing gives
   `closedText` a `repeat` today, though the grammar allows one.

## 3. Rooms and passages

**Rooms** need a first and a subsequent description, plus a third moment
that is easy to misfile: the *look* affordance (`play/game.js:411-427`)
reprints the long description on demand. That is a slot, not a version,
because it fires on a player action — arrival prose ("You push through
into the nave") is wrong in answer to a deliberate re-examination.

**Passage advertisements** are the text on the affordance for `e = (u→v)`
rendered while the player stands at `u`. Naively it depends on three
booleans: `T` (has `e` been traversed?), `R` (has `ē`?), `V` (has `v` been
visited?). Eight combinations; three are structurally unreachable:

```
T(e) ≥ 1  ⇒  V(v) ≥ 1
T(ē) ≥ 1  ⇒  V(v) ≥ 1
```

In English: you cannot have walked the passage without arriving at its far
end, and cannot have walked *back* along it without having been at that
end to start from. `V = 0` therefore forces `T = R = 0`, killing
`(1,0,0)`, `(0,1,0)` and `(1,1,0)`. Five remain:

| State | Name | What it must convey |
|---|---|---|
| `(0,0,0)` | invitation | an unexplored way out, target unknown |
| `(0,0,1)` | connection | an unwalked passage toward somewhere known — the shortcut |
| `(0,1,1)` | return | the way you came in, going back |
| `(1,0,1)` | again | a route walked in this direction before |
| `(1,1,1)` | familiar | a corridor you have worn a groove in |

A 300-walk uniform-random simulation over the seed-42 dungeon
(`bin/transform.js -g grammars/dunjs-dungeon.js -s 42 --placeholder`;
28,849 player-facing offers, engine-rolled `random` nodes excluded)
reaches all five and none of the other three: `(0,0,0)` 47.7%, `(1,0,1)`
23.4%, `(1,1,1)` 18.6%, `(0,1,1)` 5.9%, `(0,0,1)` 4.3%. A uniform walker
is not a player and ignores HP, so read those as an existence proof for
the five states, not a frequency model.

Three further collapses are cheap wins.

**Epistemic.** `(0,0,1)` differs from `(0,0,0)` only if the player can know
the unwalked passage leads somewhere they have been. In mapless prose they
cannot, and the two must render alike — otherwise the narrator is reading
the player's map aloud. The play app *does* draw a map, so there the
states are distinguishable and `(0,0,1)` earns its own text. Prose
exporters should collapse it.

**Gating.** A `backtrack` edge carries `prereq: { traversed: <edgeId of
e> }`, so it is offered only when `T(e) = 1`: exactly two reachable states,
`(0,1,1)` and `(1,1,1)`, and exactly two strings needed. That is why one
constant (`backtrack: { link: 'Go back' }`) covers 18 of seed 42's 313
edges without anyone noticing.

**Topology.** In a DAG the player never returns to `u`, so an edge is
offered at most once: `T = R = 0` always, and `(0,0,1)` would need a
second route back to the fork, which a DAG has not got. Every
advertisement in a `meta.topology: "dag"` story is in state `(0,0,0)` and
link-level `repeat` is dead storage — the advertisement taxonomy is
entirely a `"bidirectional"` concern. It also covers fewer edges than the
edge count suggests: at seed 42, 120 of 313 edges are `consequence` edges
out of `random` nodes, which the engine rolls and never advertises.

## 4. The version axes

Orthogonal to *which slot* is *which version*: first vs subsequent, long
vs terse, and a rotation among equivalent phrasings. Story IR §7 names
these `first`, `repeat`, `brief`, `variants`.

| Slot | `first` | `repeat` | `brief` | `variants` |
|---|---|---|---|---|
| room description | ✓ | ✓ | ✓ (map legend) | ✓ |
| passage advertisement | ✓ | ✓ | ✓ (button vs sentence) | ✓ |
| `lock.closed` | ✓ | ✓ (unrealised) | ✓ | ✓ |
| `key.carry` | — | — | ✓ (it *is* the terse register) | — |
| `lock.unlock` | ✓ | n/a (fires once) | — | n/a |
| ending / `describe_win` | ✓ | n/a | ✓ | n/a |

Any version can be wanted for most slots independently of the others.
Orthogonality fails in three places.

**Multiplicity-1 slots.** `theme_intro`, `describe_win`, `describe_death`
and `lock.unlock` fire once per playthrough by construction, so `repeat`
and `variants` are unreachable and a model call spent filling them is
spent on text nobody sees.

**`brief` is sometimes an identity, not a version.** For a room it
shortens the same content. For `key.carry` — a status chip — terseness
*is* the slot. Slots already terse by register (everything named
`button_*` in `themes.js`) have no long/short axis; the "long version of
the button" is a different slot, `edge.traverse`.

**The lock conflates the axes outright.** From
`test/fixtures/story-ir.sample.json`:

```json
"linkText": {
  "first":  "Turn the brass key in the wing-shaped lock",
  "repeat": "Go through the open door"
}
```

These are slots 7 and 9 riding on one field pair, because the IR gives
exactly two versions and the lock has exactly two moments. It works and
will keep working, but an exporter shortening `first` for a narrow layout
would be shortening a once-per-game dramatic beat as if it were a corridor
label.

## 5. The general form

The general answer is a function from the trajectory to a string:

```
render : Slot × Trajectory → String
Trajectory = walk(G) rooted at start = v0 -e1-> v1 -...-> vn
```

Almost nobody wants the whole trajectory. The count vector `c` is a
sufficient statistic for nearly every decision an author makes, and it
carries more than it looks like. Node visit counts follow from `c`
(arrivals at `v` = the sum of `c_e` over edges into `v`, plus one if `v`
is the start). So does the player's position: the excess `out(x) − in(x)`
computed from `c` is `+1` at `v0`, `−1` at `vn` and `0` elsewhere, and is
zero everywhere exactly when the walk has returned to `v0`. Every `prereq`
in `dungeon-primitives.js` is a function of `c` — `traversed` reads one
component, `visited` a sum, `pairId` a sum over the key nodes with that
id.

What `c` loses is order, and that costs less than it looks, because text
fires *at a moment* and the counts at that moment already encode
precedence: "you accuse the butler before finding the letter" needs no
ordering, since when the accusation fires the letter's count is 0 or 1 and
that settles it. What `c` cannot express is **recency** — which of several
things that have all happened, happened last.

The minimal example is a crossroads with two loops: `L, L'` the left
passage and its return, `R, R'` the right.

```
history A:  L  L'  R  R'
history B:  R  R'  L  L'
```

Same current node, same count vector, and the correct advertisement
differs: "last time you went right, so try left" is right in A and wrong
in B. Any text that says *last time* rather than *ever* needs the ordered
path, or a variable standing in for it (§6).

## 6. The projection we actually ship

Story IR v1 (`docs/spec/story-ir.md` §7) ships the boolean projection of
`c`: per element, `c == 0` (`first`) versus `c > 0` (`repeat`), plus
`brief` and an unconsumed `variants` rotation — nothing in the repository
reads `variants`, `exporters/` being empty and `play/game.js` never
mentioning the field.

The justification is target uniformity, not expressive poverty. All three
targets carry one bit per element without an interpreter, and two do it
with no declaration at all (Harlowe's `visits`, Inform 7's "for the first
time"); ChoiceScript needs one created flag per element, which is why the
IR declares them in `vars` as `kind: "visited"` and `kind: "traversed"`.
Counting is expressible in all three too, but it costs a variable and an
increment per element and is not uniform across targets. What the IR must
not ship is a `render` function: none of the three can evaluate
JavaScript, and a closure does not serialise.

The migration path is additive:

```jsonc
{
  "first":  "The door will not budge.",
  "repeat": "Still shut.",
  "conditions": [
    { "when": { "var": "n_e_db_2", "gte": 3 },
      "text": "You have tried this door three times. It is still a door." }
  ]
}
```

An implementer owes four things. (1) `buildStoryIR` emits a
`kind: "counter"` var per *counted* element — demand-driven, only where a
text object conditions on it, or the var table grows with the graph.
(2) The matching `onTraverse` / `onEnter` gains
`{ "op": "add", "var": "n_e_db_2", "value": 1 }`. (3) Evaluation is
top-down, first match wins, falling through to `repeat` then `first`, so
both must stay populated even when `conditions` is present; an exporter
ignoring the field still emits a playable story. (4) `validateStoryIR`
extends its §10.6 check to vars named inside text conditions.

Recency needs one further thing only: a single
`{ "name": "last_edge", "kind": "string" }` var, set by an `onTraverse`
effect on each edge anyone conditions on. That requires `set` and `eq` to
admit string values, which the fixture exercises only for booleans and
numbers today. One variable buys the recency axis, per-element counters
buy the frequency axis, and neither needs an interpreter.

## 7. How slots are filled today

**`themes.js` `MACROS` is the slot registry** — 43 entries, each a slot
name mapped to a one-line description that `macroPrompt` splices verbatim
into the prompt. Names beginning `button_` render as 2–6 word imperatives,
the rest as 1–2 sentences. The registry is advisory: `macroPrompt` falls
back to `'Narrative slot "X".'` for unknown names, so nothing catches a
typo. 16 of the 43 are referenced nowhere in the repository
(`describe_fork`, `describe_chest*`, `describe_trap`, `button_approach`,
…) — the registry runs ahead of the primitives, which is the right
direction for it to run.

**`narrator.js` `kdBundle` is the bundling mechanism.** It caches one
bundle per `$$iter` — per rule application — with fields `theme, pairId,
shutText, keyText, before, link, unlock, after`. Bundling buys coherence:
`doorContext` concatenates the key text and the door text before asking
for the unlock line, so the wing-shaped ward in the key description is the
wing-shaped keyhole in the door. It also saves a call: `unlock` is
requested once and stamped into both `link` and `prereq.link`.

**`play/phrasebook.js` is the fallback layer** — lookup by `nodeId`, then
`type`, then `_default`, with `{field}` interpolation over the label
(`play/game.js:119-149`) — so an unfilled slot renders as something rather
than nothing. Where code and taxonomy have diverged:

* **D1 — three slots welded into one.** `keyText` is `"There is a key
  here. You pick it up."`: slots 2, 3 and 4 in one string, which is why
  nothing can name the key in the unlock sentence without restating where
  it lay. Slots 5 and 6 have no field at all.
* **D2 — `prereq.link` is written and never read.** `keyDoor` stamps it
  (`dungeon-primitives.js:363`), but the `path`/`passage` templates read
  `{link}` and `{prereq.after}` only, and `story-ir.js`'s
  `linkAffordance` reads `label.link`, then `dot.label`, then the type. No
  consumer has ever looked at it.
* **D3 — `pairId` is off by one against its own text.** `pairId` is
  `"pair_" + ($$iter + 1)` while `kdBundle`'s cache key is `$$iter`. At
  seed 3 a key node with `pairId: "pair_8"` carries
  `text: "[high_fantasy:describe_key#pair_7]"`. Cosmetic in placeholder
  mode, but the ctxId is also the model's variation anchor and cache key,
  so pair *N*'s prose is anchored on pair *N−1*'s context id.
* **D4 — inheritance duplicates a lock.** `parallelPath` and
  `puzzleChoice` propagate `edgeId` *and* `prereq` onto the first edge of
  their expansion, correctly, so a new route cannot bypass a gate. The
  narrative consequence is one door becoming two gated affordances: at
  seed 3, node `569` (`door_3`) has two outgoing edges both carrying
  `prereq.pairId: "pair_3"` and `edgeId: "e_db_3"`, and on both the unlock
  affordance has been overwritten by a later stage with a generic
  `button_passage` label. Structural identity is inherited; narrative
  identity is not.
* **D5 — `lock.open` does not exist, so the door opens forever.** The
  `path`/`passage` entries define `initial` and no `repeat`, and
  `lookupText` falls back from `repeat` to `initial`, so `{prereq.after}`
  — "the key unlocks the door, you go through" — prints on *every*
  traversal of the open door.
* **D6 — `repeat` is unreachable for most edges anyway.** The engine's
  first-vs-repeat test keys on `label.edgeId`; at seed 42 only 56 of 313
  edges carry one, so 82% of edges are permanently first-traversal.
* **D7 — `brief` means opposite things in the two systems.** In
  `play/phrasebook.js` it is the subsequent-visit description; in IR §7 it
  is the terse register and `repeat` is the subsequent-visit text.
  `buildStoryIR` must map phrasebook `verbose → first` and
  `brief → repeat`, and synthesise IR `brief` separately; `brief → brief`
  silently swaps two axes.
* **D8 — an engine slot with no registry entry.** The look affordance
  consults `lookupText('node', label, 'verboseRepeat')`, but no phrasebook
  entry, macro or primitive defines `verboseRepeat`, so looking always
  reprints the arrival text.
* **D9 — nine dungeons in twenty-four contain no lock.** Across seeds
  1–24 with the shipped grammar, 15 of 24 produced at least one key–door
  pair, 18 pairs in total against a per-run limit of 3. Measure key–lock
  text on chosen seeds, not sampled ones.

## Open problems

1. **Make the registry checkable.** Assert at build time that every name
   passed to `$macro` appears in `MACROS`, and report entries no primitive
   references. Both checks are static.
2. **Split `keyText` into slots 2–5.** Give `kdBundle` `keyLocation`,
   `keyDescription`, `keyTake` and `keyCarry` in one bundle so coherence
   survives, and let the `key` phrasebook entry compose them.
3. **Add `lock.open` and fix D5:** a `repeat` on the `path`/`passage`
   entries plus an `after`/`afterRepeat` split in the bundle. Regression
   test: traverse a locked edge twice, assert the unlock sentence appears
   once.
4. **Carry narrative identity through inheritance (D4)** with a `lockId`
   distinct from `edgeId`, so a split or parallelised locked edge is one
   door and only the first gated affordance taken fires `lock.unlock`.
5. **Implement the `conditions` extension of §6** — counters, demand-driven
   var emission, top-down evaluation, the validator rule — then use it to
   give `closedText` a second refusal.
6. **Decide the epistemic policy per exporter.** Either the IR marks which
   advertisement states an exporter may distinguish, or `buildStoryIR`
   collapses `(0,0,1)` into `(0,0,0)` and the play engine loses a
   distinction it can make.
7. **Replace the uniform-random walker of §3 with a policy that backtracks
   like a person** and re-measure. The current numbers establish which
   states are reachable, not how often a player meets them.

## See also

* [key-lock-transformations](key-lock-transformations.md) — the rewrite
  whose slots this paper enumerates.
* [budgets](budgets.md) — why only some runs contain a lock (D9).
* [matching-engine](matching-engine.md) — how the patterns are found.
* [murder-mystery](murder-mystery.md) — social locks, where `lock.closed`
  is an NPC's unwillingness.
* [logic-minigames](logic-minigames.md) — lock skins, which multiply the
  `lock.*` slots without changing the transformation.
* Source: [`themes.js`](../themes.js),
  [`narrator.js`](../narrator.js),
  [`dungeon-primitives.js`](../dungeon-primitives.js),
  [`play/phrasebook.js`](../play/phrasebook.js),
  [`play/game.js`](../play/game.js),
  [`docs/spec/story-ir.md`](../docs/spec/story-ir.md) §7,
  [`test/fixtures/story-ir.sample.json`](../test/fixtures/story-ir.sample.json).
