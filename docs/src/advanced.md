# Advanced

*The machinery: what the matcher actually does, which of its hooks you can reach, how to write a primitive that composes with the existing ones, and how to add an export target. Assumes [the Guide](guide.html).*

## 1. The one hard thing

Applying a rewrite rule requires finding every occurrence of its left-hand side
in the host graph. That is subgraph isomorphism, and it is NP-complete. It is
also the only computationally interesting thing in this library; everything else
is bookkeeping.

Two consequences shape the whole design.

**All matches, not one.** The sampler in §5 of the Guide weights over match
sites, so a partial enumeration would silently bias the distribution — a rule
would fire at the first place it matched rather than at a place chosen in
proportion to weight. `SubgraphSearch` therefore enumerates every isomorphism,
every iteration, for every eligible rule.

**From scratch, every time.** The search is re-run after each rewrite, on a
graph that changed in exactly one place. Nothing is cached across iterations.
That is a real cost and a real opportunity; see
[the matching engine paper](papers/matching-engine.html) for what an incremental
scheme would look like.

## 2. The algorithm

[`subgraph.js`](https://github.com/ihh/graphgram/blob/master/subgraph.js) is
Ullmann (1976), about 150 lines. Two data structures matter.

**`possibleAssignments`** maps each pattern node to the set of host nodes it
could still be. It starts small (§3) and shrinks as the search descends.

**`updatePossibleAssignments`** is an arc-consistency refinement, iterated to
a fixpoint. For each pattern node *i* with candidate *j*, it requires that every
neighbour *x* of *i* in the pattern has **some** candidate *y* with a matching
edge *(j,y)* or *(y,j)*. If not, *j* cannot be *i*, and is struck out. Striking
one candidate can invalidate another, hence the loop.

```
search(possibleAssignments):
    refine to fixpoint
    if any already-assigned pattern edge fails to match in the host: return []
    if every pattern node is assigned: return [this mapping]
    i := next unassigned pattern node
    for each candidate j of i not already used:
        if labels match:
            assign i := j, narrow j's candidate set to {j}
            recurse
            unassign; strike j; re-refine
    return collected results
```

The refinement is what makes this tractable in practice. It was, for a while,
silently broken: `updatePossibleAssignments` called `subgraph.predecessors(j)`
with a *host* id instead of `subgraph.predecessors(i)` with a *pattern* id.
Since pattern ids (`a`, `b`, `m`) essentially never collide with host ids
(`1`, `2`, `3`), the call returned undefined, the loop body never ran, and
refinement became a no-op. Correctness was unaffected — the recursive search
still rejected bad assignments, just much later and much more often — so the
bug was invisible except as slowness.

## 3. The triage hooks

Five deliberate optimisations. Two of them are measured wins, two do not show up
at all at the sizes anyone runs, and the numbers below are from
[the matching engine paper](papers/matching-engine.html) §4, which patched each
hook off in turn and checked that every variant still produced byte-identical
graphs. Take the ordering as measured, not as folklore.

### 3.1 Label pre-filtering — 7-17x, but only if your pattern has node labels

`possibleAssignments` is seeded by running the LHS node-label predicate over
every host node *before the search starts*:

```js
this.subnodes.forEach(function (sid) {
  var pa = {}, sLabel = subgraph.node(sid)
  hostNodes.forEach(function (gid) {
    if (typeof sLabel === 'undefined' || search.nodeLabelMatch(graph.node(gid), sLabel))
      pa[gid] = true
  })
  possibleAssignments[sid] = pa
})
```

Before this, every pattern node's candidate set began as the entire host graph
and all rejection happened deep in the recursion.

Measured on a fixed 66-node host: a two-node pattern with `{type: 'room'}` on
its nodes takes 1.25ms with the pre-filter and 8.89ms without; a four-node
labelled chain, 0.55ms against 9.22ms. On the *unlabelled* versions of the same
patterns the difference vanishes, because there is nothing to pre-filter on.

That is the whole story, and it has a sting in it: `test/bench.js` shows **no**
benefit from this hook, because the dungeon primitives barely use node labels.
`deadEnd`, `parallelPath` and every `refineEdge` rule declare their LHS nodes as
bare `{ id: 'a' }, { id: 'b' }` and put the entire constraint on the edge label,
which the pre-filter never sees. The optimisation is real and large; this
repository's own rules mostly decline it. Hence the first line of §5.

### 3.2 Arc-consistency refinement — 1.8x, and the bug that made it 2.7x worse

`updatePossibleAssignments` (§2) is the other measured win: 1.8x on the bench
workload, 11x on a five-node pattern. The counts show what it trades — 3.0x more
edge tests buy 18.7x fewer recursion nodes.

The historical `predecessors(j)` bug is instructive precisely because it was
invisible: it made the routine an exact no-op (the instrumented counts are
identical to disabling refinement outright) while still paying its overhead, so
the code was **2.7x slower than baseline and 1.5x slower than having no
refinement at all**. Correctness was unaffected throughout. A performance hook
that silently stops working is worse than one that was never written.

### 3.3 Compiled predicate caches

`Matcher` keeps four `Map`s keyed by source string: `regexCache`,
`testFuncCache`, `evalFuncCache`, `templatePathCache`. A `$test` predicate or a
`condition` expression is compiled once — via `new Function`, not repeated
`eval` — and reused across every candidate, every match, every iteration, and
across rules that happen to share the same source text.

### 3.4 Rule-level triage before any search

In `Context#sampleRuleSite`, the `limit`/`countType` check and the `delay` check
run *before* `new SubgraphSearch(...)`. A rule that has exhausted its limit costs
nothing at all. This is why a `limit` on an expensive rule is cheap insurance,
and why `delay` is a legitimate performance tool and not just a design one.

### 3.5 Specialised cloning — a null result

`clonePA` hand-rolls the clone of the `possibleAssignments` table — a plain
object of `{ patternId: { hostId: true } }` — instead of `_.cloneDeep`. The
table is cloned at every level of the recursion, so the reasoning was that a
generic deep clone would show up prominently in a profile.

It does not. Swapping `_.cloneDeep` back in changes the bench by 0.1%, and at
five times the size by 2% — both inside noise. Refinement keeps the recursion
shallow enough that only ~43,000 clones happen per run, and lodash is fast
enough on a two-level object of booleans that 43,000 of them do not register.
Keep the specialised version, since it costs nothing to keep, but do not believe
it is load bearing. Same for the rule-level `limit`/`delay` triage in §3.4:
correct, obviously cheap, and unmeasurable.

The mapping is also *shallow*-cloned at the accept point, which is safe because
the objects it references (regex match arrays, label objects) are read-only
downstream.

### 3.6 Post-filters that do not save search

`strict` (a pattern node must have exactly the same degree as its host match)
and `induced` (no host edge between matched nodes unless the pattern has it) are
applied *after* the search returns. They reject matches, so they save rewrite
work — but they do not prune the search tree. Do not reach for them expecting a
speedup.

## 4. Extending the query language

`Matcher` is a swappable component. If you construct a `Grammar` with your own
matcher, you control both the LHS query language and the RHS expression
language, including the JSON schema the grammar is validated against.

The supported extension point is registering RHS functions:

```js
grammar.registerRhsLabelFunction('rollDie', function (sides) {
  return 1 + Math.floor(rng() * sides)      // use a seeded rng, not Math.random
}, { description: 'A die roll.', oneOf: [{ type: 'number' }] })
```

which makes `{ $rollDie: 6 }` legal in any RHS label. The schema fragment is not
optional decoration: `Grammar#makeSchema` builds the grammar's JSON schema from
the registered function table, and a grammar using an unregistered `$func` fails
validation before it ever runs. `registerNarrator` is exactly this mechanism,
applied ten times.

There is also `registerRhsLabelExecFunction(name, command, description, quote)`,
which wraps a shell command. `bin/transform.js` uses it to expose the `llm` CLI
as `{ $llm: "..." }`. It is command-line only, for the obvious reason.

## 5. What costs what {#what-costs-what}

Practical rules for anyone writing a new primitive, each following from §2–3.

| do | not | why |
|---|---|---|
| put a literal `type` on every LHS node | leave LHS nodes unlabelled | measured 7-17x. The pre-filter can only shrink candidate sets it can evaluate; an unlabelled node starts as the whole graph. Most of this repo's own primitives get this wrong |
| keep LHS patterns to 2–3 nodes | write 5-node patterns | the search is exponential in pattern size |
| use `$and`/`$not` in the LHS | use `condition` for the same test | LHS labels prune during the search; `condition` runs once per *complete* match |
| use `condition` for facts about the *graph* | try to express them as labels | `'$$graph.hasEdge($b.id, $a.id)'` is not a label property; this is what `condition` is for |
| use `limit` to control counts | tune `weight` to control counts | realised rate = weight × match-site count, and the second factor grows |
| use `$test` sparingly | put `$test` on a node that also has no `type` | `$test` is opaque to the pre-filter, so it runs per candidate |

## 6. Writing a primitive

A primitive is a function returning a fresh rule object. The conventions in
[`dungeon-primitives.js`](https://github.com/ihh/graphgram/blob/master/dungeon-primitives.js)
exist for reasons worth knowing before you deviate from them.

**Return fresh objects.** A factory called twice must return two independent
rules; rules acquire mutable state (`countType`, `displayName`, `lhsGraph`) at
`Grammar` construction.

**Thread the standard options.** Copy the `withOpts` pattern so every primitive
accepts `{ name, weight, limit, type, delay, condition, induced }` without
clobbering fields the factory itself set.

**Generate stable ids.** Every node gets a `nodeId`; every forward/backtrack
pair shares an `edgeId`. Both are derived from `$$iter`, qualified by a role
string because `$$iter` resets at each stage boundary:

```js
function nodeIdExpr (role) { return { $eval: '"' + role + '_" + ($$iter + 1)' } }
function edgeIdExpr (role) { return { $eval: '"e_' + role + '_" + ($$iter + 1)' } }
```

The `+ 1` is not cosmetic. At `$$iter === 0` the bare counter stringifies to
`"0"`, and the `${...}` template path falls back to `''` on a falsy value, which
produces an empty `pairId` and a lock nothing can open.

**Guard against re-splitting paired edges.** This idiom appears in
`midpointRoom` and `keyDoor`:

```js
{ $and: [ { type: pathType }, { $not: { edgeId: '(.+)' } } ] }
```

An edge carrying an `edgeId` is paired with a backtrack somewhere whose
`prereq.traversed` names it. Splitting that edge in two leaves the backtrack
pointing at an edge that no longer exists — a door that can never be reopened.
The guard is also, incidentally, what limits how deeply a lock rule can nest
inside itself; see
[key-lock transformations](papers/key-lock-transformations.html).

**Preserve labels you do not mean to replace.** Give the LHS edge an id and
reference it unchanged on the RHS:

```js
lhs: { edge: [{ v: 'a', w: 'b', label: { type: 'path' }, id: 'e' }] },
rhs: { edge: ['e', /* new edges */] }
```

Without this the RHS silently rewrites the label, dropping any `edgeId` or
`prereq` it carried. `parallelPath` goes further and *inherits* both onto its
new first edge, so that a gated corridor cannot be bypassed by the new parallel
route.

**Fill every narrative slot you create.** A node with no `text` renders as a
blank room. See [the slot taxonomy](papers/narrative-slots.html) for the
inventory a key-lock owes.

## 7. Writing an exporter

An exporter is a pure function from [Story IR](spec/story-ir.html) to text. It
never touches a graphlib graph, never learns what a `prereq.pairId` is, and does
not need updating when a new primitive lands — only `buildStoryIR` does.

```js
function exportMyFormat (ir, opts) {
  const errs = validateStoryIR(ir)
  if (errs.length) throw new Error('invalid IR:\n' + errs.join('\n'))
  // ...
}
```

Four things every target has needed so far.

**Compile the condition language.** Five node types (`{var,is}`, comparisons,
`all`, `any`, `not`) map onto whatever boolean syntax the target has. Recursion
over five cases; twenty lines.

**Implement first-versus-repeat.** No target gives you this for free in a form
you can rely on, so every exporter emits its own `seen_<passage>` flag, sets it
on entry, and branches at the top of the passage. This is the mechanism the
entire text-variation axis rests on.

**Resolve `whenBlocked`.** `"show"` means render the affordance with its
`closedText` and no way to take it — the player must learn the door exists.
`"hide"` means omit it entirely.

**Handle `role: "random"`.** These passages have no player choice; the engine
rolls over `weight`. Every target needs an explicit cumulative-weight chain,
because none of them has a native weighted pick. Off-by-one here silently skews
every battle in the story, so test it against a known distribution.

Register the new format in `bin/story.js`'s `FORMATS` list and its `switch`, and
add a structural test against `test/fixtures/story-ir.sample.json` — the golden
IR instance, which exercises every field in the spec.

## 8. Determinism

The reproducibility contract in [`docs/spec/examples.md`](spec/examples.html)
says: for a fixed library version, `--example E --seed S` is byte-identical
everywhere, in every format. Four things keep that true, and each is a rule for
contributors.

1. **One entropy source.** A seeded Mersenne Twister, threaded through `evolve`.
   `Math.random()` anywhere in a grammar, primitive, or exporter breaks the
   contract. Where a rule needs an arbitrary-looking choice, derive it from
   `$$iter`.
2. **No wall clock.** `meta` carries no timestamp, deliberately. A build that
   stamped `Date.now()` would churn every golden file on every run.
3. **Defined ordering.** IR passages are in BFS order from the start, ties
   broken by ascending host id; links are grouped by source passage. Exporters
   depend on this.
4. **Derived, not sampled, identifiers.** The Twine IFID is a hash of
   `meta.id + meta.seed`, not a fresh UUID, for the same reason.

The `--sonnet` path is the one exemption — it calls a model — but it is cached
on disk by prompt hash, so a warm cache reproduces too.

## Next

- [Matching engine](papers/matching-engine.html) — the full treatment, with measurements
- [Key and lock as graph transformation](papers/key-lock-transformations.html) — the catalogue of realisations
- [Budgets](papers/budgets.html) — aiming a stochastic generator
- [Story IR spec](spec/story-ir.html) — the export contract
