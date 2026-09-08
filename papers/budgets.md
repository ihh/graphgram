# Budgets, Nesting Depth, and Generative Control

*A graph grammar with weighted rules and an iteration limit is easy to write and
hard to aim. You want "about twelve rooms, three keys, at most two levels of
nesting"; the engine offers "apply 25 rules sampled by weight". This paper
enumerates the control knobs `index.js` implements, shows by measurement why
they do not compose into a predictable yield, defines the budget vocabulary the
examples have settled on and says which fields are hard caps and which are
wishes, gives a computable definition of nesting depth, and argues that
rejection sampling is the honest way to hit a target shape.*

## 1. The knobs that exist today

Every knob is in `index.js`. There are seven, and their scopes differ.

| knob | read in | scope | meaning |
|---|---|---|---|
| grammar `limit` | `Grammar#evolve` | whole run | total rule applications, across all stages |
| stage `limit` | `Grammar#evolve` | one stage | `min(remaining global limit, stage limit)`; `0` skips the stage |
| rule `limit` | `Context#sampleRuleSite` | one stage | max firings of this rule's `countType` |
| rule `type` | `Grammar#init` | one stage | names the counter that `limit` counts |
| rule `weight` | `Context#evalWeight` | one match site | number, or an expression evaluated per site |
| rule `delay` | `Context#sampleRuleSite` | one stage | rule inert until `iter >= delay` |
| rule `condition` | `Context#evalCond` | one match site | expression; a falsy result discards that site |

Four facts about these are load-bearing and none are obvious from the schema.

**Counters are named, not per-rule.** `Grammar#init` sets

```js
rule.countType = rule.type || String(n)
```

so two rules that share a `type` share one budget. `examples/maze-locked.js`
uses this deliberately: the `path→monster` and `path→puzzle` refinements both
carry `type: 'minigame'`, which makes one `limit` a cap on their sum rather
than on each.

**Rule counters reset between stages.** Each stage is its own `Grammar` with
its own `Context`, and `Context` initialises `this.ruleCount` from scratch. The
same rule with `limit: 1` in two stages fires twice. Measured: a two-stage
grammar with the identical `{lhs: 'A', rhs: ['A','B'], limit: 1}` in both
stages runs 2 iterations.

**`limit: 0` does not disable a rule.** The guard is
`if (rule.limit && context.ruleCount[rule.countType] >= rule.limit) return`,
and `0` is falsy. Measured: a grammar with one rule at `limit: 0` and a global
limit of 20 runs 20 iterations. Use `condition: 'false'`, or omit the rule.

**Stage limits are clamped by, and decrement, the global limit.** `evolve` takes
`subLimit = min(limit, subgrammar.limit)`, then subtracts each stage's actual
iteration count from `limit`. A global `limit: 3` over two stages of `limit: 10`
yields 3 iterations, not 20 — verified.

### The sampler

`Context#sampleRuleSite` enumerates every isomorphism of every eligible rule's
LHS into the host graph, evaluates `condition` and `weight` at each, and samples
one site proportionally:

```js
var totalWeight = sites.reduce (function (total, s) { return total + s.weight }, 0)
var w = this.rnd.rnd() * totalWeight, m = -1
while (w > 0 && ++m < sites.length - 1)
  w -= sites[m].weight
```

Write `s_i(t)` for the number of surviving match sites of rule *i* at iteration
*t*, and `w_i` for its weight. Then

```
P(rule i fires at step t)  =  w_i · s_i(t)  /  Σ_j w_j · s_j(t)
```

In English: a rule's chance of firing is its weight *times how many places it
matches*, normalised. A weight is not a probability. It is a per-site
multiplier, and the site count is a property of the graph — which the author is
not looking at when choosing the weight, and which grows as the graph grows.

## 2. Why yield is hard to predict

Take `grammars/dunjs-dungeon.js`, the dungeon in the README. Its expand stage
has `limit: 25` and six rules with weights `2, 1, 1, 1, 1, 1`. Read naively,
`keyDoor` should fire on about one step in seven — roughly 3.6 times in 25 —
and comfortably exhaust its `limit: 3`.

Instrumenting each rule's weight with a counting expression and averaging over
50 seeds gives the site census (means, `n = 50`):

| iter | midpoint | midpoint-1way | dead-end | parallel | key-door | potion | total |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0.00 | 0.00 | 1.00 | 1.00 | 0.00 | 1.00 | 3.00 |
| 4 | 1.24 | 0.00 | 6.42 | 6.42 | 0.68 | 2.78 | 17.54 |
| 8 | 1.96 | 0.00 | 11.80 | 11.80 | 1.46 | 3.14 | 30.16 |
| 12 | 2.62 | 0.00 | 17.32 | 17.32 | 2.14 | 3.04 | 42.44 |
| 16 | 4.00 | 0.00 | 23.06 | 23.06 | 3.30 | 4.00 | 57.42 |
| 20 | 5.20 | 0.00 | 28.90 | 28.90 | 4.44 | 4.18 | 71.62 |
| 24 | 6.82 | 0.00 | 34.94 | 34.94 | 5.88 | 4.38 | 86.96 |

Total sites grow linearly at 3.50 per iteration. They do not grow at the same
rate for each rule, and that is the whole problem. `deadEnd` and `parallelPath`
match *every* `path` edge, so their site counts track the edge count.
`keyDoor` needs an *anonymous* `path` edge (no `edgeId`) whose source is not
`start` and whose target is not `win`; only `parallelPath` mints those, and it
destroys them again. `healthPotion` plateaus near 4. Feeding the census into
the sampling rule above and summing over the 25 steps predicts:

| rule | weight | predicted firings | measured mean |
|---|---:|---:|---:|
| `midpointRoom` + `parallelPath` (both mint a `room`) | 2, 1 | 12.19 | 12.26 |
| `deadEnd` | 1 | 9.15 | 9.42 |
| `healthPotion` | 1 | 2.53 | 2.34 |
| `keyDoor` | 1 | 1.12 | 0.98 |
| `midpointRoom({oneWay: true})` | 1 | 0.00 | 0.00 |

The model is accurate to within 0.27 firings on every rule, so the mechanism is
understood. It is a consistency check rather than a forecast — `s_i(t)` was
measured on the same runs — but that is exactly the point: no closed form for
`s_i(t)` is available from the grammar file, and without it the weights say
nothing about yield. The consequences:

* **`keyDoor` fires 1.12 times, not 3.6.** Its `limit: 3` is reached in 2 runs
  out of 50; **17 of 50 seeds contain no lock at all**. Key counts over seeds
  1–50: `{0: 17, 1: 19, 2: 12, 3: 2}`. At the canonical seed 42 the README's
  showcase dungeon has zero keys.
* **`midpointRoom({oneWay: true})` never fires.** Its
  `condition: '$$graph.hasEdge($b.id, $a.id)'` requires a direct back-edge over
  an anonymous `path` edge, and no rule in this grammar produces that shape. It
  is dead weight in every dungeon the repo ships.
* **The total is controlled; the mix is not.** Place-node counts over 50 seeds:
  mean 26.02, sd 0.87, range 24–27 — tight, because every expand firing but
  `keyDoor` mints exactly one place. But `room` alone ranges 7–18 (sd 2.69) and
  `dead_end` ranges 4–16.

**Cost.** Enumerating every site at every step, over a growing graph, is not
free. Timing `examples/maze-plain.js` at rising expand limits (10 seeds each):
21.2 ms at limit 10, 42.6 at 20, 260.6 at 40, 983.8 at 60, 2659.7 at 80. The
last doubling costs 10.2×, an empirical exponent of 3.35. That it should be near
3 — linear site growth × linear per-site cost × linear iteration count — is a
conjecture; the numbers are not. See [matching-engine](matching-engine.md).

**Protocol.** All figures above: seeds 1..50 (1..10 for the timing run),
narrator in `placeholder` mode with `theme: 'high_fantasy'`, `debug` empty so
`setpieces.rulesFor(undefined)` adds no rules. The census:

```js
const { Grammar, Matcher } = require('./index')
const { registerNarrator } = require('./narrator')
const dp = require('./dungeon-primitives')
const mp = require('./mystery-primitives')

// grammars/*.js are bare expressions, not modules, and their require() paths
// are relative to bin/ — which is how bin/transform.js loads them.
const req = require('module').createRequire(__dirname + '/bin/transform.js')
const src = require('fs').readFileSync('grammars/dunjs-dungeon.js').toString()

const PLACE = { start: 1, win: 1, room: 1, dead_end: 1, potion: 1 }
for (let seed = 1; seed <= 50; ++seed) {
  const matcher = new Matcher()
  registerNarrator(matcher, { placeholder: true, theme: 'high_fantasy' })
  const json = new Function('require', 'return (' + src + ')')(req)
  const g = new Grammar(json, { matcher }).evolve({ seed }).graph
  const type = function (n) { return (g.node(n) || {}).type }
  console.log(seed,
    g.nodes().filter(function (n) { return PLACE[type(n)] }).length,
    g.nodes().filter(function (n) { return type(n) === dp.NODE_KEY }).length,
    mp.nestingDepth(g, { secretType: dp.NODE_KEY }))
}
```

## 3. A budget vocabulary

`meta.budget` in the [Story IR](../docs/spec/story-ir.md) §9 is five fields
(an example module may declare extras for its own use). Each example declares
one and `bin/story.js --list` prints it. What each counts, and how hard it is:

| field | counts | mechanism | hardness |
|---|---|---|---|
| `rooms` | *place* nodes: `start`, `win`, and every `room` / `dead_end` / `potion` | bounds a stage `limit`, given an accounting of how many places each rule mints | **soft**: an upper bound, exact only when every rule in the stage mints exactly one place |
| `keys` | `key` nodes — equivalently lock/key pairs, since `keyDoor` mints them together | the lock rule's `limit` | **hard cap; floor depends on the stage.** Undershot when the rule competes for a scarce substrate (`dunjs-dungeon`: mean 0.98 of 3); exact when it owns a stage whose limit matches (`mystery-daily`: 4 of 4 on 50/50 seeds) |
| `nestingDepth` | rounds of the lock-dependency chain (§4) | none in `dungeon-primitives.js`; a label-carried counter in `mystery-primitives.js` | **soft in both directions** |
| `npcs` | speaking characters — `suspect` nodes in the mystery track | stage limits derived from `npcs` minus the lock count | **exact** in the mystery track (5 of 5 on 50/50 seeds); `0` is hard in the dungeon track only because no dungeon primitive can mint one |
| `minigames` | monster battles plus puzzle gates | one `limit` on a shared `type` across the two refine rules | **hard, and exactly hit** |

`rooms` is the name most likely to mislead: it counts place nodes, not nodes of
`type: 'room'`. In `dunjs-dungeon` those differ by a factor of two.

The room budget is a *sum over stages*, and that is its failure mode. If one
stage mints a place per firing and its limit is written `budget.rooms - 2` to
account for `start` and `win`, adding any other place-minting stage silently
invalidates that arithmetic: the constant is now wrong, and no test of the
stage in isolation catches it. A room budget spread over *k* stages needs one
place-accounting expression, computed once, that all *k* limits derive from.

`minigames` is the field to imitate. It is exact — 2 on 200 of 200 seeds of
`maze-locked` — for three reasons: the refine stage runs to exhaustion rather
than to an iteration budget, so the limit is always reached; the two rules that
can mint a minigame share a `countType`, so the cap is on their sum; and a
minigame is one rule firing, so counter and artefact are in bijection.

Those three properties are the whole test. `mystery-daily`'s `keys` and `npcs`
have them too and are likewise exact. `dunjs-dungeon`'s `keys` fails the first —
`keyDoor` shares a stage with five rules that outgrow it — and falls short on 48
of 50 seeds. Every field with all three is exact; every field missing one is a
target.

## 4. Nesting depth

**Definition.** A *lock* is an edge carrying `prereq.pairId`. Its *key* is the
node bearing that `pairId`. Then

```
depth(lock L)  =  1 + max{ depth(L') : L' must be opened to reach key(L) }
depth(L)       =  1                    when key(L) is reachable with no keys
nestingDepth(G) = max over locks L in G of depth(L)
```

In English: a lock is one deeper than the deepest lock standing between the
player and its own key. A dungeon whose keys all lie in the open has depth 1.

**Algorithm.** Evaluate the recursion as a monotone closure rather than by
recursing on locks, because "must be opened" is a statement about *all* routes.
Round 0: flood from `start` through every unlocked edge, collecting keys. Round
*r*: flood again holding everything collected so far. The number of rounds that
yield at least one new key is the depth. `mystery-primitives.js` exports exactly
this, generic over the node type that carries a key (it counts key-yielding
rounds, so it and the definition above coincide whenever every key has a lock,
which holds for every grammar here):

```js
mp.lockAnalysis(graph, { secretType: dp.NODE_KEY })
//   => { rounds, chain, keys, reached }
mp.nestingDepth(graph, { secretType: dp.NODE_KEY })   // just `rounds`
```

`reachableWith` inside it honours `prereq.visited` and `prereq.traversed` as
well as `prereq.pairId`. That matters: a flood that treats a cycle-closing
`return` edge as always open walks *into* a region the player has never visited.
Ignoring gates can only reach more, so it can only under-report depth. On 200
`maze-locked` graphs a gate-ignoring flood under-reported on 12 and was never
high; the rate is grammar-dependent, the direction is not.

**Worked example.** Take

```
start --> A --> win
A --> K1                          K1 is a key for pair_1
A --> D1 --[needs pair_1]--> B
B --> K2                          K2 is a key for pair_2
B --> D2 --[needs pair_2]--> win
```

Round 0 reaches `start, A, win, K1, D1` and collects `pair_1`. Round 1, holding
`pair_1`, reaches `B, K2, D2` and collects `pair_2`. Round 2 collects nothing:
two key-yielding rounds. The lock on `D1→B` has depth 1 (its key was free); the
lock on `D2→win` has depth 2 (its key was behind `D1`).

`lockAnalysis` returns those rounds as `chain`, more useful than the number. At
`mystery-daily`'s canonical seed:

```
rounds: 3   chain: [ ["secret_cast_2","secret_spine_3"], ["secret_spine_2"], ["secret_spine_1"] ]
```

— you can read the deduction off it.

**Why depth is hard to aim.** The rule that creates a lock does not know how
deep it is. `keyDoor`'s LHS looks at one `path` edge and its two endpoints; it
has no idea whether that edge is already behind two doors. Depth is therefore
an emergent property of *where* the sampler happened to place things, and
`dunjs-dungeon` gets depth `{0: 17, 1: 32, 2: 1}` over 50 seeds — a nested lock
about 2% of the time.

Two mechanisms can fix this, and the repo has one of each.

*(a) A depth counter carried on labels and matched by the LHS.*
`mystery-primitives.js`'s `socialLock({ nest: true })` writes
`chainDepth: {$eval: '($b.label.chainDepth || 1) + 1'}` onto the secret it
creates and matches only the frontier of an existing chain, so the rule that
makes a depth-*k+1* lock is structurally the one that consumes a depth-*k*
frontier. Depth becomes a property the rule can read and the limit can count.

*(b) A staged grammar where stage k creates depth-k locks.* Equivalent in the
limit and easier to read, but it costs one stage and one near-duplicate rule per
level, and it cannot express "depth *at most* k" — a stage either runs or does
not.

**Recommendation: (a).** It is one label field and one `$eval`, it composes with
`limit` (`limit: spineLocks - 1` on the nesting variant caps the chain), and a
grammar that never nests simply never matches the nest rule. The measured
difference is large: over 100 seeds `mystery-daily` (mechanism (a),
`nestingDepth: 3`) hits depth exactly 3 in **86** runs and overshoots to 4 in
**14**, while `dunjs-dungeon` (no mechanism) reaches depth 2 in **1 of 50**.

Note that (a) still overshoots. In `mystery-daily` the spine is built to depth
`budget.nestingDepth`, and then the *leftover* key budget becomes a loose lock
placed anywhere — which lands behind the spine 14% of the time and makes the
chain one longer. Controlling where a lock goes is a different problem from
controlling how deep the chain is, and mechanism (a) only solves the second.

## 5. Rejection sampling is the honest answer

For every budget field that is not exact, the cheapest reliable way to hit a
target is to generate at seed *s*, measure, and on a miss try *s+1*.

The economics are lopsided. Generating a `dunjs-dungeon` costs 2.40 s, dominated
by the flavor stage. Measuring one costs **0.094 ms** for `mp.nestingDepth` and
**0.002 ms** for a node-type census — together under 0.1% of generation. So the
cost of rejection sampling is, to within noise, the generations you throw away
and nothing else: at acceptance rate *p*, you pay 1/*p* generations.

The rates are workable. For `mystery-daily`, accepting only `nestingDepth == 3`
gives *p* = 0.86: 1.16 generations per accepted story. For a dungeon with no
depth mechanism, a strict `keys == 3 && nestingDepth == 2` costs tens of
generations, seconds of work. What makes rates fall is rejecting on a
*conjunction*: the fields are close to independent, so five 80% fields multiply
to 33%.

What it breaks is the seed. `--example E --seed S` is a
[reproducibility contract](../docs/spec/examples.md), and a tool that silently
advances *S* until the budget is met breaks it quietly, which is the worst way.
So: **report the accepted seed** — in `meta.seed` and in whatever the tool
prints — and **make the search explicit**, a `--search` flag rather than a
hidden default. `--seed S` without it must produce the graph at *S*, budget or
no budget.

## 6. Curation

A human-curated daily puzzle is rejection sampling with a person as the
acceptance test. That changes what the generator owes: not one good map, but a
legible batch, with the measurements already attached. A curator who has to open
each candidate to find out what it is will not curate.

A batch report over seeds *s*..*s+n* should carry, per candidate: the seed; each
budget field as *measured* beside the *declared* value, misses marked; the
shortest solution length next to the place count (a two-move win in a
sixteen-room map is a rejection); the `lockAnalysis` chain printed as the chain,
not as its length; a DOT thumbnail; and a provenance stamp of grammar path plus
library version. Sort by distance from the declared budget, so the curator's
first screen is the one worth reading.

Such a report is cheap: the measurements are pure functions of the graph, so
they run after generation without re-running the grammar, and they are the same
functions the tests call. A curator's report and a regression assertion should
never disagree about what "three keys" means.

## Open problems

1. **Place accounting as a first-class computation.** Give each rule factory in
   `dungeon-primitives.js` a declared `places` yield (0 for `keyDoor`, 1 for the
   rest), and derive every stage limit from `budget.rooms` and the sum of those
   yields, so that adding a place-minting stage cannot silently break the room
   budget.
2. **A depth guard for `keyDoor`.** Port `socialLock`'s `chainDepth` to
   `dungeon-primitives.js`: stamp a depth on the door node, have a nesting
   variant match a door and place its key behind it, and let `limit` cap the
   chain. Then measure whether `maze-locked` hits `nestingDepth: 2` at a rate
   comparable to `mystery-daily`'s 86%.
3. **Delete or fix `midpointRoom({oneWay: true})`.** It fires zero times in
   every grammar the repo ships (measured over 50 seeds of `dunjs-dungeon`,
   0 match sites at all 25 expand iterations). Either mint the shape its
   `condition` requires, or drop the rule.
4. **A `--search` mode for `bin/story.js`.** Scan seeds from a given start
   until the declared budget is met, report the accepted seed, and cap the scan.
   The measurement functions already exist; this is plumbing.
5. **Weight autocalibration.** Given a target firing distribution for a stage,
   solve for weights by running the site census once and inverting
   `P_i = w_i s_i / Σ w_j s_j`. Since `s_i(t)` depends on the weights this is a
   fixpoint; whether it converges here is untested.
6. **A batch report command.** `bin/story.js --batch E --seeds 1..50` emitting
   the §6 table as HTML, wired into `make examples`, with a `meta.measured`
   block beside `meta.budget` so each story carries its own audit.

## See also

* [key-lock-transformations](key-lock-transformations.md) — what a lock *is*, as
  a graph rewrite, and why `keyDoor` refuses edges that already carry an
  `edgeId`.
* [matching-engine](matching-engine.md) — where the per-iteration cost goes, and
  why all sites are enumerated rather than the first.
* [murder-mystery](murder-mystery.md) — `socialLock({nest: true})`, the
  `chainDepth` mechanism, and the deduction spine.
* [narrative-slots](narrative-slots.md) — the text side of what a budget buys.
* [logic-minigames](logic-minigames.md) — what the `minigames` budget is
  spending.
* Source: [`index.js`](../index.js) (`Grammar#evolve`, `Context#sampleRuleSite`,
  `Context#evalWeight`), [`dungeon-primitives.js`](../dungeon-primitives.js),
  [`mystery-primitives.js`](../mystery-primitives.js) (`lockAnalysis`,
  `nestingDepth`, `reachableWith`), [`examples/`](../examples/),
  [`docs/spec/story-ir.md`](../docs/spec/story-ir.md) §9.
