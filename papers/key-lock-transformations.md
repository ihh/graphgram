# Key and Lock as Graph Transformation

*"Key-and-lock puzzle" names a semantic relation — an edge whose
traversability is conditioned on the player's history, and a node whose
visitation discharges that condition — not a shape. This repository realises
that one relation with five different rewrites, and they are not
interchangeable: they differ in whether a wrong choice is recoverable, in
whether they preserve acyclicity, in whether they nest inside their own
output, and in what they cost in nodes, edges and diameter. This paper
defines the relation, catalogues the realisations with measurements, states
the solvability invariant a generator must maintain, shows which
construction maintains it by construction and which deliberately does not,
and says what `bin/qc-graph.js` does and does not verify.*

## 1. The semantic core

Let `G = (V, E)` be the host graph. A *trajectory* `τ` is a walk from the
start node; write `visited(τ) ⊆ V` for the nodes it has entered and
`traversed(τ) ⊆ E` for the edges it has taken. A **gate** is a predicate
`p(τ)` attached to an edge, and an edge carrying a gate is walkable from its
source only in states where `p` holds. This repo writes gates as a `prereq`
object on the edge label, and the play engine evaluates them
(`play/game.js`, `edgeAccessible`):

```js
if (prereq.pairId) { /* … true iff a `key` node with this pairId is in visited(τ) … */ }
if (prereq.traversed) return state.traversed.has(prereq.traversed)
if (prereq.visited)   return state.visited.has(prereq.visited)
```

A **key-lock** is then a pair `(e, k)` where `e` is a gated edge and `k` a
node such that entering `k` makes `e`'s gate true and no other node does.
Everything else — where `k` sits, whether you can walk back to it, what the
door is made of, whether the key is an object or a fact — is variation.

The repo already ships three gate flavors, which is the first evidence for
the thesis. They differ in what counts as the key:

| `prereq` shape | key is | monotone in | used by |
|---|---|---|---|
| `{ pairId: X }` | a `key`-typed node with `pairId: X` | `visited(τ)` | locked door edges |
| `{ traversed: X }` | the forward edge with `edgeId: X` | `traversed(τ)` | backtracks |
| `{ visited: X }` | any node with `nodeId: X` | `visited(τ)` | `return` edges |

All three are monotone: once true, true forever. That is what makes the
analysis in §4 a fixpoint rather than a search over states, and it is a
constraint rather than an accident — the Story IR's condition language
(`docs/spec/story-ir.md` §8) sets boolean variables and never clears them,
so a non-monotone gate would not survive export.

The three flavors are in practice a disjoint union, not a conjunction:
`story-ir.js` (line 545 onward) and `play/game.js` both read `prereq` with
an if / else-if chain and honour only the first flavor present, while
`prereqSatisfied` in `mystery-primitives.js` conjoins all of them. No
factory emits a two-flavor gate today, so the divergence is latent.

## 2. A catalogue of realisations

Notation: `LHS => RHS` in the arrow form the primitives files themselves
use, with edge labels in braces. Every rewrite below consumes its matched
edge unless the rule preserves it by LHS id (the `id: 'e'` trick, which
`deadEnd` and `parallelPath` use to keep a matched edge's label intact).

Measurements are on one machine (Apple M1 Max, Node v22.14.0). Size and
diameter figures come from applying each factory once, at eight seeds, to a
bare directed chain of seven nodes (`start → r1 → … → win`, six anonymous
`path` edges, undirected diameter 6). Diameter is undirected throughout:
how far apart two rooms are on the map is not a question about arrow
direction.

### (a) The side-branch lock — `keyDoor` (`dungeon-primitives.js`)

```
a --path--> b   =>
  a --path{edgeId:AK}--> k                        k --backtrack{traversed:AK}--> a
  a --path{edgeId:AD}--> d                        d --backtrack{traversed:AD}--> a
  d --path{edgeId:DB, prereq:{pairId:P}}--> b     b --backtrack{traversed:DB}--> d
```

```
        k (key, pairId=P)
       ↑ ↓
  a ───┴──→ d ══lock(P)══→ b
       ↑ ↓        ↑ ↓
      (backtracks everywhere)
```

The key hangs off the same node the door does. Every forward edge is paired
with a backtrack gated on `prereq.traversed` of its partner, so a player who
reaches the door without the key walks back and fetches it: the lock costs
moves and nothing else, and the dominant strategy is to sweep the map before
committing. Measured: +2 nodes, +5 edges, diameter +1 at all eight seeds.

### (b) The fork-join lock — `dagKeyLock` (`dag-primitives.js`)

```
a --path--> b   =>
  a --path--> k    k --path--> j
  a --path--> s    s --path--> j
  j --path{prereq:{pairId:P}}--> b
  j --consolation--> f          (a `loss` terminal)
```

```
        ┌→ k (key) ─┐
   a ───┤           ├→ j ══lock(P)══→ b
        └→ s (room) ┘    └─consolation→ f
```

No edge points backwards, so the choice at `a` is made before its
consequence at `j` is visible and cannot be revisited. The skip arm `s` is a
real room with its own description; nothing marks it wrong until `j`.
Measured: +4 nodes, +5 edges, diameter +2 at all eight seeds — the most
expensive realisation here on every axis, buying the one thing (a) cannot
offer: a commitment.

### (c) The remote-key lock

Not a factory. The `prereq.pairId` gate is global, so nothing in the
mechanism requires proximity; any construction that places `k` far from the
gated edge realises the same relation. What proximity buys is findability.
At distance *d* the player must carry the door in memory for *d* moves and
the map must keep the connection legible — a demand on the narrative layer
(see [narrative-slots](narrative-slots.md)), not the graph layer. The repo
generates only distance-2 pairs: over 40 seeds of
`grammars/dunjs-dungeon.js` the undirected key→door distance was exactly 2
in all 43 key-door pairs produced, with no other value in the histogram.

### (d) The cycle-closing lock — `cycleCloseShortcut` (`dungeon-primitives.js`)

```
a --path--> m --path--> b,  a --path--> k{type:key}   =>
  (all three preserved)  +  b --return{prereq:{visited: nodeId(a)}}--> a
```

Here the "key" is having been somewhere: the gate is `prereq.visited` on
`a`'s own `nodeId`, and the effect is to turn a tree into a graph. This is
the Dormans cyclic-generation move the README cites (Rock Paper Shotgun,
[How *Unexplored* generates great roguelike
dungeons](https://www.rockpapershotgun.com/how-unexplored-generates-great-roguelike-dungeons)):
not unwinding a corridor you came down, discovering a loop. It is the only
realisation that adds no nodes and the only one that *reduces* diameter —
measured on a 6-node seed graph with one key, +0 nodes, +1 edge, undirected
diameter 4 → 3. It requires a key at `a` structurally, for motivation, even
though the gate does not reference it, and `a` must not be the start node or
the gate is true from move zero.

### (e) The social lock — `socialLock` (`mystery-primitives.js`)

```
a --path--> b   =>
  a --path{edgeId:ASK}--> s{type:suspect}    s --backtrack{traversed:ASK}--> a
  s --interview{prereq:{pairId:P}}--> b      b --backtrack{traversed:TELL}--> s
  a --leverage--> k{type:secret}             k --return{prereq:{visited:nodeId(a)}}--> a
```

Structurally this is (a) with the door and the key relabelled: the person is
the door, the secret is the key, the gated edge is the interview where they
finally talk. The differences are ontological and matter downstream — a
secret becomes an `items` entry in the Story IR, because a fact carried
unspoken is, to an exporter, an item — but the graph relation is identical.
One structural departure is deliberate: the `a → secret` edge carries **no**
`edgeId`, which is what makes the nesting variant of §3 possible. Measured:
+2 nodes, +5 edges — the same cost as (a) — and diameter +1 or +2 across
eight seeds, depending on whether the secret lands on the chain's end.

### Summary

| realisation | recoverable? | acyclic? | self-nests? | Δnodes | Δedges | Δdiameter |
|---|---|---|---|---|---|---|
| (a) `keyDoor` | yes | no (adds backtracks) | no — see §3 | +2 | +5 | +1 |
| (b) `dagKeyLock` | no, by design | yes | yes | +4 | +5 | +2 |
| (c) remote key | depends on host | either | n/a | as host | as host | ≥ that of (a) |
| (d) `cycleCloseShortcut` | yes (it *is* the recovery) | no | no (guarded) | 0 | +1 | −1 |
| (e) `socialLock` | yes | no | yes, via `{nest:true}` | +2 | +5 | +1 or +2 |

"Recoverable" means: from every state reachable after any choice, a winning
state is still reachable. (a), (d) and (e) are, because every forward edge
they create is paired with a backtrack. (b) is not, and that is its content.

## 3. Composition and nesting

A lock rule is **self-nestable** if a later application can fire on
structure created by an earlier one, producing a lock behind a lock. Whether
it can is decided entirely by the LHS guard, and the repo's two guards are
worth reading against each other. `keyDoor`'s LHS matches:

```js
edge: [{ v: 'a', w: 'b',
         label: { $and: [{ type: pathType }, { $not: { edgeId: '(.+)' } }] } }]
```

The `$not: { edgeId: "(.+)" }` clause refuses any edge that already carries
an `edgeId`. The reason given in the source is not about nesting: keyDoor
replaces `a→b` with the chain `a→d→b`, so splitting a paired edge would
leave some backtrack's `prereq.traversed` pointing at a forward edge that no
longer exists — a dangling gate and a stranded player. The second
consequence follows from the same fact: every `path` edge keyDoor *creates*
carries an `edgeId` (`AK`, `AD`, `DB`), so keyDoor produces no substrate for
itself and is not self-nestable at all.

This is measurable rather than argued. Running `keyDoor` alone with
`limit: 20` on the seven-node chain, which contains exactly four
keyDoor-eligible anonymous `path` edges (`a` not `start`, `b` not `win`),
fires it exactly four times and stops, at every seed tried — 15 nodes out,
7 + 4×2. Running `dagKeyLock` alone under the same limit fires 20 times and
produces 87 nodes: `7 + 20×4`, limit-bound, not substrate-bound.

`dagKeyLock`'s guard is the difference. It refuses only edges that already
carry a gate:

```js
{ $and: [ { type: pathType }, { $not: { $test: '(l)=>l&&l.prereq' } } ] }
```

Its four arm edges (`a→k`, `a→s`, `k→j`, `s→j`) are ordinary unlocked `path`
edges, so a later firing lands inside an arm of an earlier one. Measured
route nesting depth — the largest number of locked edges on any single route,
computed as a longest-path DP over the topological order — grows with the
firing count: limit 1, 2, 4, 8, 20 gives depth 1, 2, 4, 7, 15.

`socialLock` gets there a third way: its key edge `a → secret` deliberately
carries no `edgeId` and a distinct type (`leverage`), and `{ nest: true }`
matches exactly that edge, interposing a suspect in front of a secret you
were about to collect — clearing a `frontier` flag on the displaced secret
so the chain stays linear rather than bushy.

The general condition, then:

> A lock rule R is self-nestable iff R's RHS contains at least one edge that
> R's own LHS would match. Everything else — depth limits, budgets, frontier
> flags — is policy layered on top of that structural fact.

In the bidirectional dungeon, nesting is possible but rare, because it needs
an intermediary that manufactures anonymous substrate behind a lock:
`parallelPath` inherits the matched edge's `edgeId` *and* `prereq` onto its
first new edge and leaves its second anonymous, so a parallel route around a
locked door leaves an unpaired path edge behind that door. Measured over
seeds 1–40 of `grammars/dunjs-dungeon.js`: 28 seeds produced at least one
key, 43 keys in all, and exactly one seed (29) produced a key reachable only
by first opening another lock. Rarity is a budgeting problem, not a
structural one; see [budgets](budgets.md).

## 4. Solvability

The invariant a generator must maintain is:

> For every gated edge `e` with key `k`, there is a path from the start to
> `k` that does not traverse `e`.

**The side-branch construction maintains it by construction.** Induct on
rule applications. The rewrite fires on `a→b` where `a` is reachable without
`e`, since `e` does not yet exist. The RHS places `k` at the end of the
fresh ungated edge `a→k`, so `k` is reachable from `a` without touching
`d→b`. No later rule may split `a→k`: it carries an `edgeId`, and every
splitting rule in `dungeon-primitives.js` refuses those. The only rule that
touches it is `refineEdges`, which rewrites `type` and preserves the rest
via `$assign`. The witnessing path survives. ∎

**The fork-join construction does not maintain it, on purpose.** The
invariant quantifies over paths, and in a DAG a path is a commitment: the
player who takes the skip arm `s` is in a state from which `k` is not
reachable at all. The graph-level statement ("a path exists") stays true;
the trajectory-level one ("this player can still get the key") does not.
`dag-primitives.js` and `examples/dag-locked.js` both say this is the point:
the run is short, the failure is legible in hindsight, and the consolation
edge into a named `loss` node makes it an ending rather than a dead link.

**How to check it.** The check is a monotone fixpoint and it is already
written. `lockAnalysis(graph, opts)` in `mystery-primitives.js` computes
what is reachable holding the keys acquired so far, collects the keys in
that region, and repeats; the round count is the dependency depth, and a key
never collected is a key behind its own lock. It is keyed on `secretType`,
so it runs on a physical dungeon as:

```js
const mp = require('./mystery-primitives')
mp.lockAnalysis(graph, { secretType: 'key' })
// dunjs-dungeon seed 3  → { rounds: 1, chain: [['pair_3','pair_8']] }
// dunjs-dungeon seed 29 → { rounds: 2, chain: [['pair_13'], ['pair_19']] }
// dag-locked   seed 1729 → { rounds: 2, chain: [['pair_3'], ['pair_1']] }
```

Note what the last line means and does not mean. In a DAG, "rounds: 2" says
a route exists on which both keys are collected in order; it says nothing
about the routes on which they are not. Monotone closure answers *does some
play-through succeed*, never *do all play-throughs survive*.

`bin/qc-graph.js` runs the same closure to answer a different question. It
accumulates `visited` / `traversed` to fixpoint from the start node, then
scans for **stranding**: a reachable, non-terminal node with no accessible
outgoing edge. It does *not* check that every key is reachable (an
unopenable lock strands nobody — the player simply never gets in), that
`meta.topology` matches the graph, that gates are satisfiable on any single
trajectory rather than in the optimistic union, or anything about nesting
depth. It also has a false positive on the DAG example, whose terminal set
`['win','death','random']` predates `dag-primitives.js`'s fourth terminal
type, `loss`:

```
$ node bin/qc-graph.js <a dag-locked graph, seed 42>
STRANDED nodes (2):
  host=9  nodeId=dag_loss_1 type=loss outCount=0
  host=15 nodeId=dag_loss_2 type=loss outCount=0
```

Both nodes are correct: a `loss` node is an ending and is supposed to have
no way out.

## 5. What the matcher makes cheap or expensive

Details belong to [matching-engine](matching-engine.md). The fact that
matters here: `subgraph.js` is Ullmann with a label pre-filter that seeds
each pattern node's candidate set before search begins, so a rule's cost
tracks the *selectivity of its node labels* and the *number of match sites
it enumerates* (all sites are enumerated, because the sampler weights over
them) — not the node count of its LHS.

Measured on a 52-node, 105-edge bidirectional host containing 3 keys and 19
anonymous `path` edges, timing grammar construction plus one host copy plus
one rule application, 30 repetitions, against a 0.54 ms baseline that does
the construction and copy and matches nothing:

| rule | LHS nodes | match sites | ms |
|---|---|---|---|
| `cycleCloseShortcut` | 4 | 10 | 2.4 |
| `midpointRoom` | 2 | 15 | 3.0 |
| `keyDoor` | 2 | 15 | 3.3 |
| `deadEnd` | 2 | 67 | 8.9 |

The four-node LHS is the cheapest rule here and a two-node LHS the dearest:
`cycleCloseShortcut` demands a `key`-typed node and a `nodeId`-bearing
non-start node, which the pre-filter turns into two tiny candidate sets,
while `deadEnd` matches *any* `path` edge and pays for all 67. The practical
rule for a lock LHS is therefore: constrain a node by `type`, not an edge by
absence. `$not: { edgeId: '(.+)' }` and `$not: { $test: ... }` are
correctness guards that happen to prune; they still visit every candidate
edge.

The shape that fights the formalism is the remote-key lock (c). "Place the
key at distance ≥ 3 from the door" is not a subgraph isomorphism at all: it
constrains a path of unbounded length, and the LHS language has no
transitive closure. It needs either a two-stage grammar — mint an unplaced
key, then bind it to a door under a `condition` string that walks the graph
— or a post-pass outside the grammar.

## Open problems

1. **Teach `bin/qc-graph.js` the fourth terminal type.** Its
   `terminalTypes` set is `['win','death','random']`, missing
   `dag-primitives.js`'s `loss`, so the tool exits 1 on a correct
   `dag-locked` graph. The wider fix is to source the terminal set from the
   primitives modules rather than restating it.
2. **Add a key-reachability check to `bin/qc-graph.js`.** Stranding and
   unopenability are different failures and it detects only the first. The
   fixpoint is already in the file; missing is a final pass over
   `keyByPairId` asserting every pair was opened.
3. **Decide whether `prereq` conjoins.** `story-ir.js` and `play/game.js`
   take the first flavor present; `prereqSatisfied` in
   `mystery-primitives.js` conjoins all. Pick one and make the other
   conform, before some factory emits a two-flavor gate and the analysis and
   the runtime disagree.
4. **A trajectory-level solvability checker for DAGs.** Monotone closure
   cannot distinguish "the player can win" from "the player can win if they
   guess right at every fork". For an acyclic graph the honest question —
   what fraction of maximal routes reach `win` — is a linear-time DP over
   the topological order, and would give `dag-locked` a difficulty number
   instead of an assertion.
5. **A remote-key primitive.** Two-stage: `unplacedKey` mints a key with a
   `pairId` and no home; `placeKey` binds it to a door under a `condition`
   requiring a minimum graph distance. Needs a distance oracle in the
   condition-evaluation context, which does not exist.
6. **Measure whether nesting is worth budgeting for.** Nested locks appeared
   in 1 of 40 dungeon seeds. Either raise the rate deliberately — a
   `keyDoor({ nest: true })` matching `parallelPath`'s anonymous second
   edge, as `socialLock` does — or drop `nestingDepth` from the
   bidirectional budgets as aspirational.

## See also

Sibling papers: [narrative-slots](narrative-slots.md) for the text fields
these rewrites stamp on their nodes and edges; [budgets](budgets.md) for how
`nestingDepth` becomes rule `limit`s; [matching-engine](matching-engine.md)
for the Ullmann search and its triage hooks; [murder-mystery](murder-mystery.md)
for the deduction chain that `socialLock({nest:true})` builds;
[logic-minigames](logic-minigames.md) for locks whose opening is a puzzle
rather than a fetch.

Source: [`dungeon-primitives.js`](../dungeon-primitives.js) (`keyDoor`,
`cycleCloseShortcut`, `parallelPath`),
[`dag-primitives.js`](../dag-primitives.js) (`dagKeyLock`,
`unlockedPathPattern`), [`mystery-primitives.js`](../mystery-primitives.js)
(`socialLock`, `lockAnalysis`, `prereqSatisfied`),
[`subgraph.js`](../subgraph.js), [`story-ir.js`](../story-ir.js),
[`play/game.js`](../play/game.js), [`bin/qc-graph.js`](../bin/qc-graph.js),
[`examples/dag-locked.js`](../examples/dag-locked.js).
