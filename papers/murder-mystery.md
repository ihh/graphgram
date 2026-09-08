# The Daily Murder Mystery

*A murder mystery presented as a logic puzzle can be built as a nest of
key-and-lock puzzles on a generated graph, because the locks are
informational: the key is a proposition and the gate is "the player holds
it". This paper states that three-layer stack — deduction on top,
reachability underneath, a grammar derivation underneath that — and argues
the disguise is not a cheat. It develops the reading in which every
elaboration rule that creates a lock is an anonymous directive from the
murderer to an accomplice, so that the derivation history* is *the plan, and
says what the generator must record for that to be literally true. It gives
operational fairness criteria with checking procedures, proposes a
difficulty metric and reports that the generator produces too little
variance to validate it, and ends with the measured gaps between the mystery
track and a shippable daily puzzle.*

Measurements were taken against the working tree of 2026-09-08 on an Apple
M1 Max, Node v22.14.0, unless marked a conjecture. `mystery-primitives.js`
was under concurrent edit while this was written, so every number is given
with the check that produced it.

## 1. The conceit

| Layer | What it is | Where it lives |
|---|---|---|
| Surface | Deduction and social manoeuvring: find a fact, work out whom it embarrasses, use it | narrative slots, `MYSTERY_MACROS` |
| Mechanism | Key–lock reachability on a directed multigraph with monotone gates | `prereq.pairId`, `reachableWith` |
| Authoring | A grammar derivation: a sampled sequence of rule applications | `socialLock`, `Grammar#evolve` |

The structural analogue to the dungeon is exact, and the header of
`mystery-primitives.js` tabulates it: key becomes secret, door becomes
suspect, the locked `path` edge becomes an `interview` edge, and "unlock the
door with the key" becomes "confront them with what you know". One
`socialLock` application rewrites one edge into six, of which one is gated:

```js
{ v: 's', w: 'b', label: {
    type: 'interview',
    edgeId: idTell,
    pairId: pairId,
    prereq: { pairId: pairId, link: confront, after: preface, ... }
} }
```

The disguise is not a cheat because of what the gate quantifies over. In a
dungeon the key is a token whose only property is identity; carrying it is
not knowing anything, and the player's work is navigation. Here the key is a
proposition — `secretLbl.fact` comes from the `SECRETS` table,
`secretLbl.about` names whom it concerns — and the gate is a claim about the
player's knowledge. The engine can tell you *that* you hold
`secret_spine_2`; it cannot tell you *whose silence it buys*. That mapping
is not in the reachability problem at all. It is the inference, and the
player performs it.

The limit is worth stating. The inference is real only while enumerating
the mapping costs more than reasoning about it, and the canonical budget
gives four secrets and five suspects — twenty pairs, every one attemptable
for free, because a wrong confrontation is simply a link that is not
offered. At that size a player brute-forces. Making that unattractive is a
cost problem (§2), not a size problem.

## 2. Social keys

Two properties are usually cited as separating a social key from a brass
one. Only one is a real difference here.

**A social key is not consumed.** True, and already the model. The gate
`{ pairId: X }` is read by `play/game.js:101` as "has visited a node with
this `pairId`" and by `prereqSatisfied` as `state.keys.has(prereq.pairId)`;
state only ever grows. Nothing in graphgram ever consumed a key — the
*dungeon* was the anomaly, modelling an object that stays in your pocket
forever. The social reading needs no change to the engine.

**A social key can be used wrongly.** This is the genuine gap. Wrong use has
four parts, and the current model expresses two of them:

| Part | Expressible today? |
|---|---|
| The wrong action is *offered* (you may confront anyone) | No. An `interview` edge exists only where `socialLock` put one; there is no edge for confronting the wrong person. |
| It has a *cost* | Yes, in the IR: `{ "op": "add", "var": "hp", "value": -20 }` is a legal effect (story-ir.md §8), and the play engine already runs an HP economy. No grammar primitive emits one. |
| It *closes* something | Yes in the IR (`{ "op": "set", "var": "...", "value": false }` is legal), no in the analysis. |
| It is *ordered* — right person, too early | No. |

The last two are one problem seen twice. `reachableWith` computes a least
fixed point assuming `state.keys`, `state.visited` and `state.traversed` are
monotone. A gate that can be *retracted* makes reachability depend on the
walk rather than the state, so the closure stops being a sound summary — and
`lockAnalysis` and `nestingDepth`, built on it, stop being sound too. The IR
is expressive enough for a non-monotone story; the analysis is not. A
`penalty` option on `socialLock` emitting a costed wrong-confrontation edge
would disturb nothing; retraction would convert every static check in §4
from a fixed point into a search over walks.

## 3. The murderer as author

Each application of a rule that creates a lock corresponds to an anonymous
directive from the murderer to an unwitting accomplice. `directive()`
returns a label fragment, not a rule, and `socialLock` embeds it on the
locked edge itself:

```js
function directive (opts) {
  opts = opts || {}
  return {
    to: opts.to || roleExpr(),
    act: opts.act || actExpr(),
    note: opts.note || macro(DIRECTIVE_SLOT.macro, opts.ctx)
  }
}
```

Every lock is therefore a thing someone was told to do, and `dossierEntry`
files each as a `directive` edge from the evidence node to its recipient,
gated on the `pairId` of the lock it describes — so a note is legible only
once its lock is open, and the dossier is never a shortcut.

**The plan is a partial order.** `Grammar#evolve` produces a *sequence* of
applications `r1 … rn`, sampled one per iteration from a seeded Mersenne
Twister. The sequence is total; the plan is not. Write `created(ri)` for the
host elements application `i` adds and `matched(rj)` for the host elements
`j`'s isomorphism binds. Define

```
i ≺ j   iff   created(ri) ∩ matched(rj) ≠ ∅
```

and let `⊑` be the transitive closure of `≺`. Read back: application `j`
depends on `i` exactly when `j` matched something `i` made. Any linear
extension of `⊑` yields the same graph, so `⊑`, not the sampled sequence, is
the plan: the murderer acted in *an* order consistent with `⊑`.

Three consequences, and they are why the framing earns its bookkeeping.

1. A player who reconstructs `⊑` has solved the case. Not "has a theory" —
   has the object the generator built.
2. An endgame that shows the derivation as a sheaf of notes is therefore a
   *fair and complete* solution presentation: not a summary of the answer,
   but the answer, in the representation the generator used.
3. Constraints on the grammar become constraints on the plot. A murderer
   cannot direct an accomplice before the accomplice has a reason to comply,
   and "has a reason to comply" is exactly a prereq: the rule that files the
   note cannot match until the leverage exists. `dossierEntry` enforces this
   structurally rather than by convention.

**This demands that the generator record the derivation.** It does not.
`Context.prototype.applyRuleAtSite` (`index.js:629`) increments
`this.ruleCount[rule.countType]` and rewrites the graph; nothing else is
retained, and `Grammar#evolve` returns `{ iterations, graph }` — a count and
a result. The mystery track works around this by leaving *residue* on
labels: the nest rule carries `chainDepth` forward, `socialLock` stamps
`directive` on the lock, `dossierEntry` reads it back. That recovers what
each application produced, not what it consumed, so `≺` — and hence `⊑` — is
not reconstructible from the finished graph.

Closing the gap is cheap and additive: `applyRuleAtSite` already holds
`site.rule`, `isomorph.assign` (matched host ids) and its local `newId`
(created host ids). One record per application, returned alongside
`iterations`, makes `⊑` computable and changes no graph. Proposed, not an
API:

```js
// proposed, does not exist
{ iter, rule: rule.name, matched: { a: '7', b: '11' }, created: { s: '31', k: '32' } }
```

## 4. Fairness

A daily puzzle must be solvable by reasoning and be *seen* to be. Four
criteria, each with a procedure, each checked over 28 consecutive dates
(2026-02-01 … 2026-02-28) at the canonical budget. See
[key-lock-transformations](key-lock-transformations.md) §4 for the general
form of the first two.

**F1 — every lock's key is reachable without the lock.** Procedure: for
each `interview` edge with `prereq.pairId = p`, delete it, call
`reachableWith(graph, new Set())`, and assert the `secret` node carrying
`pairId: p` is in the reached set. `test/mystery.test.js` checks the weaker
property that every `prereq.pairId` resolves to some secret; F1 itself is
not a test.

**F2 — every clue the solution depends on is discoverable.** Procedure:
`lockAnalysis(graph)` iterates "reach with what you hold, collect every
secret in the open, repeat"; assert its final `reached` set contains every
secret and the goal. Measured: holds on 28/28, with `rounds` of 3 on 27 days
and 4 on one — the budget asks for `nestingDepth: 3`, and the extra round is
an accident of where the spare off-spine lock landed, not a bug.

**F3 — a uniquely determined culprit.** Procedure: assert exactly one node
with `murderer: true` and one `accuse` edge with `correct: true`. Measured:
holds on 28/28, but the criterion is too weak. `unmaskMurderer` selects the
suspect with `chainDepth: 1` — the seed of the deduction chain, and
therefore the last person you can make talk. That is the genre's convention
and also a meta-rule that solves every daily puzzle without reading a note.
Uniqueness needs a companion: the culprit must not be fixed by a property of
the *generator* that survives across days.

**F4 — no required guess.** Procedure: assert the correct accusation is
gated on evidence the player can hold, and that the evidence *identifies*.
It fails twice. `prereq: { evidence: N }` is quantitative — it counts
secrets — so holding enough never picks out a person; and the dossier does
not either, because the murderer is a `socialLock` suspect like any other
and so receives a note. Measured: the murderer is filed as a note recipient
on 28/28 days, which makes "the one who got no note" — the obvious
identifying inference — false.

## 5. Difficulty

What plausibly makes one of these hard: nesting depth `d`; suspect count
`s`; accusation branching factor `b`; red herrings `h` — locks whose keys
open nothing on the murderer's chain; and the shortest solving walk `L`
against map size `|V|`. The figures below are measured on the *graph*, not
the IR, so they are independent of the export bugs in §7, and over the same
28 days at the canonical
budget `{ rooms: 8, keys: 4, nestingDepth: 3, npcs: 5, minigames: 1 }`; `L`
is an upper bound from a greedy solver (walk the shortest currently-open
path to the nearest unheld secret, repeat, then go to the goal), not an
optimum.

| quantity | min | median | max |
|---|---|---|---|
| nodes (`V`) | 28 | 28 | 28 |
| edges | 56 | 60 | 61 |
| suspects `s` | 5 | 5 | 5 |
| locks | 4 | 4 | 4 |
| red herrings `h` | 1 | 1 | 1 |
| accusation branching `b` | 5 | 5 | 5 |
| nesting depth `d` | 3 | 3 | 4 |
| greedy walk `L` | 12 | 15 | 26 |

A metric computable from the generated graph:

```
D = log2(b) + Σ_{k=1..m} log2(a_k) + d + L/|V|
```

where `m` is the number of secrets and `a_k` the number of suspects whose
lock is still shut when secret `k` first becomes reachable. Read back: the
first term is the bits to name the culprit; the sum is the bits to place
each secret against a still-silent suspect, which is the deduction the
surface asks for; `d` charges for serial dependency, each level forcing a
return trip; `L/|V|` charges for how much of the map the solution uses. Red
herrings need no term of their own: a herring lock keeps one more suspect
silent, and so raises `a_k` for every secret found while it stands.

Confidence: low, and untested. The terms are not commensurable — two are
bits, one a count, one a ratio — and the additive weighting is a guess.
Worse, the metric cannot be validated on this generator: four of its five
inputs are constant across a month, only `d` and `L` move, and `D` travels
about one and a half bits over 28 days. A metric that does not vary over the
sample it was fitted to has not been tested. I would defend the ranking by
`d`; the rest is a conjecture needing budget variance (§7) first.

## 6. The daily loop

Seed from the date. `seedForDate` in `examples/mystery-daily.js` is FNV-1a
over the raw `'YYYY-MM-DD'` string with a final `>>> 1`; it reads no clock
and does no date arithmetic, so the same date names the same mystery
everywhere. The theme derives from the seed by the same hash, so a day has
one look as well as one plot.

Generate a batch; measure; a human curates. Measured: 28 puzzles at the
canonical budget in 1.69 s, a mean of 60 ms each, with the placeholder
narrator and no model calls — a year's batch takes seconds, putting the
whole cost of the loop in the curation and in the prose. See
[budgets](budgets.md) §6 for the batch-and-measure loop generally.

The player-facing artefact is one puzzle, the same for everyone, on a date.
The shareable result should be the *shape* of the solve, not the answer:
confrontations attempted, wrong accusations, whether the dossier was opened,
moves against that day's `L`. All of it is already in the play engine's
dump-trace payload (README, "Playing a dungeon in the browser"), and none of
it names a suspect, so the share string is spoiler-free by construction.

The archive is free — yesterday's puzzle is `seedForDate('2026-09-07')`, so
it needs no storage. The catch is the version: `docs/spec/examples.md`
promises byte-identical output only *for a fixed library version*, so the
archive is a function of (date, version) and must pin the version per date.
Otherwise one change to `socialLock` rewrites every puzzle anyone played.

## 7. What it would take to ship

Present today: the primitives (`socialLock`, `suspect`, `directive`,
`accusation` and its four stages, `dossierEntry`), the staged grammar with
date seeding, the analysis functions, and an end-to-end path to Story IR —
`bin/story.js --example mystery-daily --format ir` produces an IR that
`validateStoryIR` accepts with zero problems. The gaps, in the order they
block:

1. **Secrets are not keys to either consumer.** `story-ir.js` emits an
   `acquire` effect only for nodes whose `label.type` is `'key'`, and
   `play/game.js:105` satisfies a `pairId` gate only from such a node.
   Mystery secrets are `type: 'secret'`. Measured: the exported mystery IR
   contains **0** `acquire` effects against 2 for `maze-locked` at the same
   seed, so every `interview` condition is permanently false.
   `validateStoryIR` passes it, because its rule 6 checks that a condition's
   var is *declared*, not that it is *set*. `story-solver.js`'s
   `analyzeStory` catches it: on the seed-42 mystery IR it reports 4 dead
   `interview` links, 4 dead `directive` links and 2 unreachable secret
   passages, against 0 dead links for `maze-locked`.
2. **The evidence gate does not survive export.** `story-ir.js` contains no
   handling of `prereq.evidence`; the correct accusation link exports with
   `condition: null`. Measured on seed 42.
3. **The disguise leaks at the inventory.** Secrets become IR items named by
   `keyName`, so the exported story offers "the glass key", "the iron key",
   "the bone key" for what are facts about people; the passages also land
   with `role: "normal"` rather than `"item"`.
4. **The derivation is not recorded** (§3), so the endgame can show the
   notes but not the plan.
5. **Fairness is only partly checked** (§4). `test/mystery.test.js` covers
   the structural invariants — lock/secret pairing, one correct accusation,
   budgeted nesting depth, no route to the goal around the accusation — but
   F1 and F4 are not among them.
6. **Cast coherence.** The cast index counts suspects already in the graph,
   and `applyRuleAtSite` adds each RHS node before evaluating the next
   label, so `secretLbl.about` is one step ahead. Measured: `secret.about`
   disagrees with the `castRole` of the suspect its `pairId` unlocks in 4 of
   4 locks on 28/28 days. `directive.to` had the same fault and was fixed
   while this was being written, by reading the role off the node already
   carrying the `pairId`; `about` needs the same fix.
7. **No variety.** Every day is 28 nodes, 5 suspects, 4 secrets, 1 red
   herring (§5). Until the budget jitters per date, "today's mystery" is one
   mystery with the names permuted.
8. **Curation and archive pinning** (§6) — product work, blocked only by the
   fairness checks.

## Open problems

1. Implement derivation recording in `applyRuleAtSite`, compute `⊑`, and
   measure the width of the partial order on real mysteries. A plan of width
   1 is a chain of errands, not a conspiracy.
2. Make the culprit unidentifiable by structure alone. The cheapest fix
   that preserves the conceit: give the murderer no `interview` lock of
   their own — make them the one suspect who received no note — and gate the
   correct accusation on holding the notes that exclude everyone else.
3. Give `socialLock` a `penalty` option emitting a costed
   wrong-confrontation edge, and measure whether it deters brute force at
   cast sizes of 5, 8 and 12.
4. Decide whether retractable gates are worth abandoning the monotone
   closure for (§2); if so, replace `reachableWith` with a walk search and
   quantify the cost on a 28-node graph.
5. Teach `story-ir.js` and `play/game.js` a key-bearing node *predicate*
   (any node with a `pairId` that is not the lock side) instead of a type
   equality test, and add a `validateStoryIR` rule: every var in a condition
   must be set by at least one reachable effect.
6. Validate the §5 metric. It needs per-date budget jitter and a small
   panel of human solve times; without both, `D` is arithmetic on constants.
7. Name secrets as facts, not keys, in the IR item layer — `secretLbl`
   already carries `fact` and `about`, which is all a noun phrase needs.

## See also

* [key-lock-transformations](key-lock-transformations.md) — the graph
  transformation the social lock re-skins; §4 for reachability invariants.
* [budgets](budgets.md) — how a budget becomes rule `limit`s; §6 for the
  batch-and-curate loop.
* [narrative-slots](narrative-slots.md) — the ten slots `SOCIAL_LOCK_SLOTS`
  mirrors, and the criterion that admits the eleventh (`noteText`).
* [matching-engine](matching-engine.md) — how `socialLock({nest: true})`
  finds a frontier secret, and what the triage hooks cost.
* [logic-minigames](logic-minigames.md) — the cipher stage of
  `mystery-daily`, and locks skinned as puzzles rather than people.
* Source: [`mystery-primitives.js`](../mystery-primitives.js),
  [`examples/mystery-daily.js`](../examples/mystery-daily.js),
  [`dungeon-primitives.js`](../dungeon-primitives.js),
  [`index.js`](../index.js) (`Context#applyRuleAtSite`),
  [`story-ir.js`](../story-ir.js),
  [`docs/spec/story-ir.md`](../docs/spec/story-ir.md).
