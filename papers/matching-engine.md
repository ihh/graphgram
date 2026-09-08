# Subgraph Isomorphism and the Triage Hooks

*Every rule application begins by enumerating every occurrence of a pattern
graph inside the host graph: subgraph isomorphism, NP-complete, and the only
computationally interesting thing graphgram does. This paper describes the
implementation actually in `subgraph.js` — a 1976 Ullmann search with a label
pre-filter and an arc-consistency refinement, plus triage hooks in `index.js` —
then measures each hook by source-patching it off. Two are worth what they cost:
refinement (1.8x on the bench workload, up to 11x on a five-node pattern) and the
node-label pre-filter (7-17x, but only on patterns carrying node labels, which
most of this repo's own primitives do not). Two are not, at the sizes measured:
the specialised clone and the `limit`/`delay` triage both fall inside run-to-run
noise. It ends with a cost model rule authors can act on, and a list of what is
not implemented.*

## 1. The problem

The host is a `graphlib.Graph`, directed, with arbitrary JSON labels. A rule's
left-hand side is compiled once at `Grammar#init` into a second graph
(`rule.lhsGraph`, `index.js:508`) whose labels are *queries* rather than values:
the `Matcher` language of `$and`, `$or`, `$not`, `$test`, `$find`, `$contains`,
and bare strings read as anchored regular expressions (`index.js:874`).

Write `G = (V_G, E_G, λ_G)` for the host, `P = (V_P, E_P, λ_P)` for the pattern,
and `λ_G(x) ⊨ λ_P(i)` for "the host label at `x` satisfies the pattern query at
`i`" — that is, `Matcher#labelMatch` returning a truthy match record rather than
`false`. The search enumerates all `φ` with:

```
φ : V_P ↪ V_G
(M1)  φ is injective
(M2)  ∀ i ∈ V_P.        λ_G(φ i) ⊨ λ_P(i)
(M3)  ∀ (i,k) ∈ E_P.    (φ i, φ k) ∈ E_G  and  λ_G(φ i, φ k) ⊨ λ_P(i,k)
```

In English: an injection from pattern nodes to host nodes under which every
pattern node's query is satisfied by its image, and every pattern edge maps to a
host edge whose query is also satisfied.

Nothing constrains host edges *between* images that the pattern does not
mention, so this is a **monomorphism** search, not an induced-subgraph or graph
isomorphism search: `a --path--> b` matches a pair of rooms also joined by three
other edges. That permissiveness is the default because dungeon graphs are dense
with backtrack edges, and an induced reading would make almost every primitive
unfireable after a few rewrites. §3(f) covers the post-filters that narrow it.

The search returns **all** matches, not the first, and this is forced by the
sampler. `Context#sampleRuleSite` (`index.js:576`) collects one *site* per
(rule, isomorphism) pair, evaluates a weight per site, and samples one
proportional to weight:

```js
var totalWeight = sites.reduce (function (total, s) { return total + s.weight }, 0)
var w = this.rnd.rnd() * totalWeight, m = -1
while (w > 0 && ++m < sites.length - 1)
  w -= sites[m].weight
```

A first-match search would replace this distribution with whatever the search
order happens to be, and truncating enumeration would bias it *silently*: the
generator would still emit valid graphs, no test would fail, and the rule
weights of [budgets](budgets.md) would quietly stop meaning what they say.
Enumeration is a correctness requirement, not a convenience.

## 2. The algorithm

`SubgraphSearch` (`subgraph.js:21`) is Ullmann (1976): a table of candidate
sets, an arc-consistency refinement of it, and a backtracking search that
alternates the two.

The table `D` is `possibleAssignments`, shaped `{ subnodeId: { hostNodeId: true } }`.
`mapping` is the partial map, carrying three parallel objects: `assign` (pattern
id → host id), `label` (pattern id → host label), and `match` (pattern id → the
record `labelMatch` returned, whose `.match` field holds regex capture groups).
Only `assign` drives the search; `label` and `match` are threaded through so that
RHS expressions like `'${a.match.nodeId[1]}'` (`dungeon-primitives.js:513`) can
read capture groups out of the LHS match.

**Refinement** (`subgraph.js:67`) is the interesting half:

```
repeat until no D changes:
  for each i ∈ V_P, for each j ∈ D(i):
    if ∃ k. (i,k) ∈ E_P  and  ∄ y ∈ D(k). (j,y) ∈ E_G ∧ λ_G(j,y) ⊨ λ_P(i,k)
       then D(i) ← D(i) \ {j}
    if ∃ k. (k,i) ∈ E_P  and  ∄ y ∈ D(k). (y,j) ∈ E_G ∧ λ_G(y,j) ⊨ λ_P(k,i)
       then D(i) ← D(i) \ {j}
```

In English: host node `j` survives as a candidate for pattern node `i` only if
every pattern-neighbour `x` of `i` — successor and predecessor alike — still has
at least one candidate `y` that `j` could be joined to by a host edge with a
matching label, in the right direction. A deletion can invalidate another node's
support, so the sweep repeats to fixpoint. This is arc consistency over `E_P`,
the only place structural information prunes before assignment.

**Search** (`subgraph.js:102`) is then:

```
search(D):
  refine D to fixpoint
  n ← |mapping.assign|
  if n > 0 and some fully-assigned pattern edge has no matching host edge:
      return []                                   # (M3), checked incrementally
  if n = |V_P|: return [snapshot of mapping]      # accept
  i ← subnodes[n]                                 # next pattern node, in LHS order
  for each j ∈ D(i):
      if j already used by mapping.assign: continue            # (M1)
      m ← labelMatch(λ_G(j), λ_P(i))                           # (M2)
      if m:
          mapping.assign[i] ← j; mapping.label[i] ← λ_G(j); mapping.match[i] ← m
          D' ← clone(D); D'(i) ← {j}
          results ← results ++ search(D')
          undo the three mapping writes
          D(i) ← D(i) \ {j}                       # branch exhausted, so
          refine D to fixpoint                    # refine again before the next j
  return results
```

Three details matter. The next pattern node is `subnodes[n]` — LHS declaration
order, with no dynamic reordering (§6). `mapping` is one mutable object on the
search instance, written before recursing and restored after, so the accept
point must snapshot it. And each branch clones `D`, which is why cloning is on
the hot path at all.

## 3. The triage hooks

| # | Hook | Where | Before search? | Measured (§4) |
|---|---|---|---|---|
| a | node-label pre-filter | `subgraph.js:32-49` | yes | 7-17x on labelled patterns; nothing on unlabelled |
| b | `clonePA` | `subgraph.js:9` | no | 1.9x per call, within noise end-to-end |
| c | shallow snapshot at accept | `subgraph.js:126` | no | not isolated |
| d | compiled-predicate caches | `index.js:765-816` | no | not isolated |
| e | `limit` / `delay` triage | `index.js:582-585` | skips it entirely | within noise here |
| f | `strict` / `induced` | `index.js:590-598` | no — post-filters | reject after the cost is paid |

**(a) The label pre-filter.** The constructor seeds `D` by running each pattern
node's query over every host node, rather than starting every pattern node with
all of `V_G`:

```js
this.subnodes.forEach (function (sid) {
  var pa = {}
  var sLabel = subgraph.node(sid)
  hostNodes.forEach (function (gid) {
    if (typeof(sLabel) === 'undefined' || search.nodeLabelMatch(graph.node(gid), sLabel))
      pa[gid] = true
  })
  possibleAssignments[sid] = pa
})
```

That is `|V_P| · |V_G|` label evaluations up front, buying a branching factor of
type-compatible host nodes rather than `|V_G|`. Note what it does not cover:
**edge** labels are never pre-filtered. `nodeLabelMatch` and `edgeLabelMatch`
both default to the `labelMatch` that `sampleRuleSite` passes in
(`subgraph.js:28-30`, `index.js:587`), but only the node one runs here, so a
pattern constrained solely by its edge label — most of `dungeon-primitives.js` —
starts with full candidate sets and gets all its pruning from refinement.

**(b) `clonePA`.** `D` is `{id: {id: true}}` and nothing else, so a two-level
`for...in` copy is correct and lodash's generic `cloneDeep` is unnecessary.
Isolated, it is 1.85-1.96x faster per call (§4.4).

**(c) The shallow snapshot.** The accept point returns `extend({}, mapping.assign)`
and likewise for `label` and `match`. Safe, because those three outer objects are
the only things the search mutates — it adds and deletes keys, never edits a
value in place — and the values are host label objects (owned by the graph, about
to be read by RHS expressions) and freshly-returned match records, both read-only
downstream. A deep copy would duplicate every host label once per match: 30,983
times on the bench workload.

**(d) Compiled-predicate caches.** Four `Map`s on the `Matcher`, keyed by source
string (`index.js:765-768`): `regexCache` (`'room'` → `/^room$/`),
`testFuncCache` (a `$test` source → the function it evaluates to),
`evalFuncCache` (a `condition`, `weight` or `$eval` source → a
`new Function('$ctx', 'with ($ctx) { return (' + src + ') }')`), and
`templatePathCache` (a `${a.match[1]}` path → an accessor). Regexes and `$test`
functions run once per candidate, so this is the difference between compiling a
regex 2.5 million times and compiling it once; `$eval` was previously a
`JSON.stringify` of the context plus an `eval` per call. Keying by source, with
one `Matcher` shared across every stage (`index.js:367`), means two rules that
spell a predicate alike share its compiled form.

**(e) Rule-level triage.** Before any search is constructed:

```js
if (rule.limit && context.ruleCount[rule.countType] >= rule.limit)
  return
if (rule.delay && context.iter < rule.delay)
  return
```

An exhausted or ineligible rule costs two comparisons instead of a full
enumeration. `countType` is `rule.type || String(n)`, so rules sharing a `type`
share one budget — the mechanism [budgets](budgets.md) builds on.

**(f) `strict` and `induced` are post-filters, and that asymmetry matters.**
Both run in `sampleRuleSite` over isomorphisms already found. `strict` requires a
pattern node's image to have the same degree in `G` as the node has in `P`; the
array-of-strings LHS sugar sets it on the first and last node of the chain
(`index.js:390`). `induced` forbids a host edge between two images unless the
pattern has that edge, converting §1's monomorphism search into an induced one.
Neither prunes anything: they reject after the full cost of finding the match is
paid, saving only the rewrite. If a rule's real constraint is expressible as a
label query, saying it that way is strictly cheaper.

`induced` additionally does not work today: `index.js:598` reads
`!subgraph.hasEdge(si,sj)` with no `subgraph` in scope, so any grammar setting
it throws `ReferenceError: subgraph is not defined` as soon as a matched pair
has a host edge between them. No test covers it.

**The refinement bug.** The comment at `subgraph.js:62-66` records that an
earlier version called `subgraph.predecessors(j)` — a *host* id — where it meant
`subgraph.predecessors(i)`. Pattern ids here are `a`, `b`, `m`, `k`; host ids are
decimal strings minted by `Context#addNode`. They never collide, so `graphlib`
returned `undefined`, the `if (pred)` guard skipped the body, and refinement
pruned nothing. It was invisible in correctness terms because refinement is
*only* an optimisation: the accept path re-verifies (M3) against `mapping.assign`
independently, so a refinement that prunes nothing yields the same matches in the
same order, and every test still passed. §4.1 measures what it cost.

## 4. Measurement

Darwin arm64 (Apple silicon laptop), Node 22.14.0, no other load. Variants were
produced by source-patching `subgraph.js` or `index.js` in memory and
pre-seeding `require.cache`; the repo files were not modified. Every variant
reproduces byte-identical output graphs for all seeds (SHA-1 of the serialised
graphs, `82c7e4c1b598` at bench settings) — the check that these are performance
hooks and nothing else. Repeated baseline runs vary by about ±5%, so
differences under ~10% are not claims.

**`test/bench.js` as shipped** — four expansion rules under a stage limit of 20,
then edge refinement and dot decoration; 10 seeds, 2 warmups; outputs average
22.8 nodes and 45.7 edges:

```
dungeon (10 seeds): median=110.6ms min=69.2ms max=171.2ms avgNodes=22.8 avgEdges=45.7
dungeon (10 seeds): median=112.4ms min=69.0ms max=171.9ms avgNodes=22.8 avgEdges=45.7
dungeon (10 seeds): median=111.0ms min=68.0ms max=171.9ms avgNodes=22.8 avgEdges=45.7
```

That is 268 complete subgraph searches and 3,098 matches per seed.

### 4.1 One hook at a time, on the bench workload

Totals sum the 10 timed seeds. Counts come from a separate instrumented run of
the same deterministic workload, so they are exact rather than sampled.

| variant | total ms | median ms | search nodes | `testEdgeMatch` | `clonePA` |
|---|---|---|---|---|---|
| baseline | 1164.3 | 115.0 | 45,937 | 2,471,337 | 43,257 |
| pre-filter off | 1149.5 | 114.5 | 46,435 | 2,496,647 | 43,755 |
| refinement off | 2147.7 | 211.5 | 861,094 | 812,418 | 858,414 |
| historical `predecessors(j)` bug | 3163.4 | 309.3 | 861,094 | 812,418 | 858,414 |
| `_.cloneDeep` for `clonePA` | 1165.7 | 115.5 | 45,937 | 2,471,337 | 43,257 |

Refinement is worth **1.8x**, and the counts show the trade: 3.0x more edge tests
buy 18.7x fewer recursion nodes and 19.8x fewer clones. The historical bug is
worse than no refinement at all — **2.7x** slower than baseline, 1.5x slower than
disabling refinement outright — because it paid the whole loop overhead (an
`Object.keys` allocation per pattern node per candidate, two `graphlib` neighbour
lookups) and pruned nothing for it; identical counts to the refinement-off row
confirm it was an exact no-op.

**Two null results.** Turning the pre-filter off changes nothing measurable
(+1% search nodes, −1% wall clock), and neither does `_.cloneDeep`. §4.2 and §4.4
explain why. At five times the size (expansion limit 100, 3 seeds, ~105 nodes /
223 edges) the picture holds: baseline median 14,392ms, pre-filter off 14,127ms,
`_.cloneDeep` 14,112ms — 2% spread, identical digests.

### 4.2 What the pre-filter is worth when the pattern uses labels

The bench workload cannot see the pre-filter, because the dungeon primitives
barely use node labels: `deadEnd`, `parallelPath` and every `refineEdge` rule
declare LHS nodes as bare `{ id: 'a' }, { id: 'b' }` (`dungeon-primitives.js:206,
242, 473`) and put the whole constraint on the edge label, which the pre-filter
never sees. The second experiment therefore calls `SubgraphSearch` directly on a
fixed host (66 nodes, 138 edges, from an expansion-limit-60 dungeon at seed 7: 30
dead ends, 26 rooms, 4 doors, 4 keys, 86 `path` and 52 `backtrack` edges) with
hand-built patterns: chains of `n` nodes joined by `{type: 'path'}` edges, nodes
either labelled `{type: 'room'}`, unlabelled, or carrying an equivalent `$test`.
Milliseconds per search, mean of 20 reps:

| pattern | matches | baseline | pre-filter off | refinement off |
|---|---|---|---|---|
| 2 nodes, labelled | 23 | **1.25** | 8.89 | 1.81 |
| 2 nodes, `$test` | 23 | **1.13** | 8.90 | 1.82 |
| 2 nodes, unlabelled | 86 | 9.14 | 9.25 | 12.48 |
| 3 nodes, labelled | 10 | **1.11** | 11.16 | 4.92 |
| 3 nodes, unlabelled | 111 | 13.31 | 13.50 | 44.27 |
| 4 nodes, labelled | 2 | **0.55** | 9.22 | 7.49 |
| 4 nodes, unlabelled | 116 | 14.50 | 14.51 | 96.73 |
| 5 nodes, unlabelled | 115 | 15.97 | 15.82 | 168.91 |

Three readings. On labelled patterns the pre-filter is worth **7.1x** (2 nodes),
**10.1x** (3) and **16.8x** (4): its value grows with pattern size, because it
removes a factor of candidates-per-node from every level of the recursion.
Labelled patterns get *cheaper* as they grow (1.25 → 1.11 → 0.55 ms) while
unlabelled ones get dearer (9.1 → 13.3 → 14.5 → 16.0 ms) — added constraints on a
labelled pattern prune more than they cost. And with refinement off the
unlabelled column runs 12.5 → 44.3 → 96.7 → 168.9 ms: the exponential refinement
exists to flatten, visible directly.

The `$test` row is a **negative result against the hypothesis the experiment was
built to test**. `$test` was expected to be opaque to the pre-filter and so to
cost per candidate. It is not: the pre-filter calls `nodeLabelMatch` on whatever
query the node carries, `$test` included, with the compiled function coming from
`testFuncCache`. A `$test` prunes exactly as well as a literal type, and here is
marginally faster than a regex.

### 4.3 Rule-level triage

At shipped bench settings the `limit`/`delay` guards skip **3** searches of
2,683 — the stage limit of 20 iterations arrives before `keyDoor` exhausts its
limit of 3. Under settings that make exhaustion common (stage limit 40, `keyDoor`
limit 1) they skip **217** of 5,335. Replacing the early return with a variant
that runs the search and discards it — same output graph, verified by digest —
costs 7,414ms against 7,375ms: noise. Two comparisons are obviously worth
keeping, but the saving is not measurable here; it would matter for a grammar
with many tightly-limited rules and a long tail of iterations after they are
spent.

### 4.4 Why the specialised clone does not show up

Cloning a table of `s` pattern nodes × `h` candidates, at the 43,257 calls the
bench workload makes:

```
2x23:  clonePA=104.1ms  cloneDeep=196.5ms  ratio=1.89x
4x23:  clonePA=199.2ms  cloneDeep=389.6ms  ratio=1.96x
4x66:  clonePA=467.2ms  cloneDeep=882.6ms  ratio=1.89x
5x127: clonePA=1149.7ms cloneDeep=2125.8ms ratio=1.85x
```

`clonePA` is consistently about twice as fast, and does not show up end-to-end
because the tables actually cloned are tiny: 309,413 cells over 43,257 clones, a
**mean of 7.2 candidate entries per clone** (24.6 at expansion limit 100).
Refinement has already collapsed most candidate sets to a singleton or to nothing
before the recursion clones them. The hook is cheap and correct and should stay;
it is not where the time is.

Where the time is, is `testEdgeMatch`. On the 66-node host one call —
`graph.hasEdge(v,w)` plus a `labelMatch` against `{type:'path'}` — costs about
110ns. At expansion limit 100 the workload makes 205,799,284 of them in a run
totalling 49.6s: roughly 22.6s, at least **46% of runtime**, inside the
refinement loop. Optimisation should start there. One tempting target is not one:
refinement's inner scan looks like it lacks an early exit, but
`foundMatch = foundMatch || search.testEdgeMatch(...)` already short-circuits the
*call* once a support is found. Replacing the `forEach` with `some` saves only
loop iterations — 1099ms against 1140ms, inside noise, with identical edge-test
counts.

## 5. What costs what, for rule authors

| LHS feature | Cost | Why |
|---|---|---|
| literal `type` label on every node | cheapest | pre-filter seeds tiny candidate sets (§4.2: 7-17x) |
| `$test` on a node | same as literal | pre-filter runs it too; compiled once by `testFuncCache` |
| `$not` / `$and` on a node | cheap | also a node query, also pre-filtered |
| unlabelled node | expensive | every host node is a candidate at every level |
| constraint carried only by the edge label | expensive | edge labels are never pre-filtered; refinement alone must find it |
| each extra unlabelled node | multiplies | 9.1 → 16.0 ms for 2→5 nodes with refinement; 12.5 → 168.9 ms without |
| `condition` expression | cheap | once per complete match: 3,098 per bench seed against 247,000 edge tests, 80:1 |
| `weight` expression | cheap | same, once per surviving match |
| `strict` | costs, saves nothing | post-filter; the search is already paid for (§3f) |
| `induced` | do not use | post-filter, and throws today (§3f) |

Concretely:

* **Label the endpoints, not just the edge.** `midpointRoom` labels its `b` node
  `{ $not: { type: winType } }` (`dungeon-primitives.js:134`) but leaves `a`
  bare; a positive `type` query on both would move it from §4.2's unlabelled
  column to the labelled one.
* **Prefer a node-label query to a `condition`** where the two are equivalent. A
  `condition` is cheap per site but runs after the match is found, so it never
  prevents work; a node label prevents the branch.
* **Use `condition` for what labels cannot say** — `cycleCloseShortcut`'s
  `'!$$graph.hasEdge($b.id, $a.id)'` (`dungeon-primitives.js:501`) is a claim
  about a host edge between two matched nodes, exactly what §1's semantics leave
  unconstrained.
* **Do not grow the LHS to say what a label could say.** A four-node unlabelled
  chain costs 14.5ms per search on a 66-node graph; a labelled one, 0.55ms.
* **Reach for `$test` freely** — no slower than a regex here, and the only way to
  state a predicate over a computed property of a label.

## 6. What is not implemented

* **No VF2 or VF3.** VF2 generates candidate pairs from the frontier of the
  partial match and never materialises or clones a candidate table. What is here
  is the older, simpler idea.
* **No candidate ordering.** `subnodes[nAssigned]` takes pattern nodes in
  declaration order. Most-constrained-variable ordering — assign the node with
  the smallest `D(i)` next — is a few lines, is the standard first improvement to
  Ullmann, and would matter most for the mixed patterns §4.2 shows are dear: one
  heavily-constrained node and three bare ones. Untried.
* **No degree pre-filter.** A host node with fewer neighbours than its pattern
  node can never match — an `O(|V_G|)` test that would strengthen §3(a) for
  exactly the unlabelled patterns where it does nothing today.
* **No incremental matching**, the largest omission. `sampleRuleSite` re-runs
  every rule's search from scratch every iteration, on a graph that changed in
  one bounded place — 1,260 full searches per run over a ~105-node graph at
  expansion limit 100. An incremental scheme would keep per-rule site lists
  between iterations and, after a rewrite touching node set `Δ`, invalidate only
  sites whose image meets `Δ` and re-search within the pattern's radius of `Δ`.
  The cost of building it is not the diffing: `Context#addNode` mints a fresh id
  for every RHS node, so a rewrite changes the identity of the nodes it touches
  even when their labels do not change, and a stored site cannot be repaired,
  only discarded. It would also have to preserve the enumeration order the
  sampler depends on (§1), or accept that seeds stop reproducing across it.
* **No parallelism, no early termination** — both precluded by the all-matches
  requirement and by `mapping` being shared mutable state on the search.

## Open problems

1. **Fix `induced`.** `index.js:598` should read `rule.lhsGraph.hasEdge(si,sj)`.
   Then test it: two pattern nodes, one pattern edge, a host pair joined by two
   edges; assert rejection under `induced` and acceptance without. Nothing
   exercises the flag today.
2. **Pre-filter on edge labels.** Seed `D` by also requiring, for each pattern
   edge `(i,k)`, that `j ∈ D(i)` have an outgoing host edge satisfying
   `λ_P(i,k)` — the first refinement sweep hoisted into the constructor, and the
   missing half of §3(a) for primitives that constrain edges and not nodes.
   Measure against §4.2's unlabelled rows.
3. **Add most-constrained-variable ordering** and re-run §4.2. Conjecture,
   untested: little on uniformly labelled or unlabelled patterns, a large factor
   on mixed ones.
4. **Memoise the label match, not just the compiled predicate.** `labelMatch`
   runs on the same (host label, pattern label) pair many times per search — in
   the pre-filter, then at each assignment — and host labels do not change during
   one. A memo keyed by (host id, pattern id) is small and would cut into §4.4's
   46%.
5. **Give `test/bench.js` a labelled-pattern workload.** Every number in §4.1 is
   blind to the pre-filter because the bench grammar uses no node labels; a
   regression in §3(a) would not be visible today.
6. **Measure the caches of §3(d) by patching them off**, as §4.1 does the others.
   They are the one hook in the table with no number beside it.
7. **Decide whether `strict` belongs inside the search.** A degree constraint is
   checkable at assignment time — (M2) plus a degree test — rather than after,
   turning a post-filter into a pruning one. Whether it pays depends on how often
   `strict` rejects, which no one has counted.

## See also

* [budgets](budgets.md) — `limit`, `delay` and `countType`, the fields §3(e)
  triages on, and what they mean for generation.
* [key-lock-transformations](key-lock-transformations.md) — the rewrite rules
  whose LHS shapes §5 costs out.
* [narrative-slots](narrative-slots.md) — what the `match` records threaded
  through §2 are eventually read for.
* [murder-mystery](murder-mystery.md), [logic-minigames](logic-minigames.md) —
  two rule sets with larger patterns than the dungeon primitives', and so more
  exposed to §5.
* Source: [`subgraph.js`](../subgraph.js) (all 165 lines),
  [`index.js`](../index.js) — `Context#sampleRuleSite` (576-624) and `Matcher`
  (739-1040), [`dungeon-primitives.js`](../dungeon-primitives.js) for the LHS
  shapes, [`test/subgraph.test.js`](../test/subgraph.test.js),
  [`test/matcher.test.js`](../test/matcher.test.js),
  [`test/bench.js`](../test/bench.js).
