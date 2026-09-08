# Logic Minigames as Lock Skins

*A lock needs a gate, and the cheapest gate is "do you hold the key". This
paper is about the next cheapest: a small self-contained puzzle whose exit
edge is the locked edge. It audits the two skins the repo ships —
`monsterBattle` and `puzzleChoice` — and measures why a stochastic gate is
the wrong shape for a daily puzzle (best play still dies 19.9% of the
time). It then develops the bipartite-matching family: the combinatorics of
3-to-3, a five-form clue language with computed elimination figures, the
observation that generating a minimal clue set is exactly minimum set
cover, and a difficulty classifier that turns out to be propagator-relative
— 24.3% of generated puzzles fall to unit propagation, 93.2% to arc
consistency. It ends with a verified graphgram rule wiring a matching
puzzle onto a `puzzle` edge, and with the reason the encoding stops at
n = 3.*

## 1. The frame

A **lock** is a graph fact: an edge the engine refuses to offer until a
predicate over the player's history holds. Here that predicate is
`label.prereq`, checked by `edgeAccessible` (`play/game.js:92`), with
exactly three forms — `{pairId}`, `{traversed}`, `{visited}`. A **skin** is
something else: a subgraph, produced by one rule application, interposed on
the locked edge, whose interior the player must navigate correctly to reach
the exit. A rule rewriting `a --t--> b` is a skin when its RHS has a
distinguished exit edge into `b` whose tail is reachable from `a` only
through nodes the rule created.

Two skins exist today, both matching an edge type produced by
`refineEdges`, both following the same inheritance discipline: the first
edge of the expansion takes the matched edge's `edgeId` and `prereq`, so a
gate on the corridor is not bypassed by dressing the corridor up.

| | `monsterBattle` (`dungeon-primitives.js:577`) | `puzzleChoice` (`dungeon-primitives.js:700`) |
|---|---|---|
| matches | `a --monster--> b` | `a --puzzle--> b` |
| interior | 2 choice nodes, 2 random nodes, 1 death sink | 1 intro node, N distractor nodes |
| exit | either `victory` consequence edge | the single `correct: true` choice edge |
| failure routes to | `death` (terminal) or back to a choice node | back to `a`, costing moves |
| stochastic | yes — `rollAtRandom` (`play/game.js:527`) | no |
| escape | `retreat` edge to `a`, always accessible | none; a distractor is the escape |

The stochastic row is the whole design question: a skin gates a correct
solver, and a stochastic gate can refuse one. Simulating `monsterBattle`
under the engine's own semantics — HP starts at 1, `applyEdgeDamage`
(`play/game.js:545`) subtracts, `playerHP <= 0` routes to death,
`monsterHP <= 0` forces the victory route — over 200 000 trials for each of
the four deterministic policies (two states, two actions):

| policy | P(win) | P(death) | mean rolls |
|---|---|---|---|
| always attack | 0.801 | 0.199 | 1.98 |
| attack at normal, defend at advantage | 0.772 | 0.228 | 2.29 |
| defend at normal, attack at advantage | 0.630 | 0.370 | 3.68 |
| always defend | 0.502 | 0.498 | 5.00 |

Optimal play dies one time in five, and `retreat` does not help: leaving the
battle group resets `monsterHP` to 1 on re-entry (`play/game.js:373`) while
the player's HP carries over, so retreating restarts the same chain in a
strictly worse state. That is acceptable for a dungeon crawl scored on
moves, and not acceptable for a daily puzzle, where every player gets the
same instance and the only question is whether they solved it. A daily gate must be deterministic in
the solver's favour: correct reasoning always opens it, and nothing else
does.

## 2. Bipartite matching at n = 3

Let `S` and `T` be disjoint with `|S| = |T| = n`, and `W` the set of
bijections `M: S → T`. The player sees `S`, `T` and some clues, and must
name the hidden `M`. `|W| = n!`; at `n = 3`, `|W| = 6`. Write `p(s,t)` for
the atom `M(s) = t`. A **clue** is a proposition over `W`; its **model
set** is `true(c) = {w ∈ W : c(w)}`, its **false set** the complement. A
clue set `C` **isolates** `M` iff

```
⋂_{c ∈ C} true(c) = {M}
```

Read the other way round: every one of the `n!−1` wrong matchings is
falsified by at least one clue in `C`. **Isolating a matching is a
set-cover problem** over the ground set `W \ {M}`, one covering set per
clue. Everything in §4 follows from that.

The immediate consequence is the right lower bound. If the largest false
set among clues true of `M` has size `f`,

```
|C| ≥ ⌈ (n! − 1) / f ⌉
```

At `n = 3` with positives available `f = 4`, so `|C| ≥ 2`, achieved by two
positives (they fix two rows; the third follows). The information-theoretic
version agrees — prior entropy `log₂ 6 = 2.585` bits, no clue below worth
more than `log₂(6/2) = 1.585` — but only by coincidence. The naive "sum of
per-clue self-information ≥ 2.585 bits" argument gives 5 for negatives
where the true minimum is 3: clues are not independent, and a negative
conditioned on earlier negatives can carry a full bit. Use the covering
bound, and note it is necessary, not sufficient: at `n = 4` it says 2 and
the exhaustive answer is 3.

## 3. A clue language

Five forms, each with a fixed propositional shape. `κ: T → K` is a
**kind** map, not injective; at `n = 3` take `κ(t₀) = κ(t₁) ≠ κ(t₂)`.

| form | proposition | reading |
|---|---|---|
| POS | `p(s,t)` | A is matched to X |
| NEG | `¬p(s,t)` | B is not matched to Y |
| OR | `p(s,t) ∨ p(s',t')` | either A-X or B-Y |
| IF | `p(s,t) → p(s',t')` | if A-X then C-Z |
| REL | `κ(M(s)) ≠ κ(M(s'))`, or `=` | A and B are not (are) matched to the same kind |

The truth table over the six matchings, written `M(A)M(B)M(C)` with
`T = {x,y,z}` and `κ(x) = κ(y) ≠ κ(z)`:

| clue | xyz | xzy | yxz | yzx | zxy | zyx | \|true\| |
|---|---|---|---|---|---|---|---|
| `p(A,x)` | T | T | F | F | F | F | 2 |
| `¬p(B,y)` | F | T | T | T | T | F | 4 |
| `p(A,x) ∨ p(B,z)` | T | T | F | T | F | F | 3 |
| `p(A,x) → p(C,y)` | F | T | T | T | T | T | 5 |
| `κ(M(A)) ≠ κ(M(B))` | F | T | F | T | T | T | 4 |

All five hold only at `xzy` — but they are not a minimal set: deleting
`¬p(B,y)` still leaves `xzy` alone, because the surviving four already
falsify all five rivals. That is what §4's second pass is for.

Enumerating every instance of every form at `n = 3` (132 clues) and
counting:

| form | instances | \|true\| distribution | mean worlds eliminated | mean given true of `M` | min isolating set, this form alone |
|---|---|---|---|---|---|
| POS | 9 | 2 (all) | 4.000 | 4.000 | 2 |
| NEG | 9 | 4 (all) | 2.000 | 2.000 | 3 |
| OR | 36 | 3 (×18), 4 (×18) | 2.500 | 2.429 | 2 |
| IF | 72 | 4 (×36), 5 (×36) | 1.500 | 1.444 | 3 |
| REL (≠) | 3 | 4 (all) | 2.000 | 2.000 | never |
| REL (=) | 3 | 2 (all) | 4.000 | 4.000 | never |

Three readings. A disjunction of two *disjoint* atoms eliminates 3, one
sharing a row or column eliminates 2 — `p(A,x) ∨ p(A,z)` is just "A was
indoors". A conditional is the weakest form, weakest of all when its atoms
are disjoint (`|true| = 5`), which is why §4 keeps producing three- and
four-clue sets built mostly from `IF`. And relational clues **cannot
isolate at any count**: every relational clue true of `M` — one polarity
per pair, so three of them at `n = 3` — leaves two worlds standing, `M` and
the swap of the two same-kind targets, because `κ` is not injective and a
language of `κ`-facts cannot separate what `κ` identifies. A skin built
only from "indoors or outdoors" clues is unsolvable by construction.

The two mean-elimination columns differ because conditioning on "true of
`M`" size-biases the sample toward clues with larger model sets. At `n = 3`
the bias is small (2.500 → 2.429 for OR); it grows with `n`.

## 4. Generating a puzzle

The generator must produce a clue set that (a) isolates and (b) is
irredundant: dropping any clue admits more than one matching. Given §2,
this is greedy set cover followed by a redundancy sweep.

```
1. M      ← W[⌊rng() · n!⌋]                     hidden matching, from the seed
2. P      ← { c ∈ pool : c(M) }                 keep only clues that are TRUE of M
3. shuffle P with the same seeded stream
4. surviving ← W;  C ← ∅
   for c in P while |surviving| > 1:
       if |surviving ∩ true(c)| < |surviving|:  C ← C ∪ {c};  surviving ← surviving ∩ true(c)
5. if |surviving| ≠ 1: fail
6. for c in reverse(C):                         irredundance sweep
       if ⋂_{c' ∈ C \ {c}} true(c') is a singleton: C ← C \ {c}
```

Step 2 makes the puzzle *fair*: every clue is a true statement about the
world, so no correct chain of reasoning is ever contradicted. Step 4 is
greedy cover with an any-gain rather than max-gain test; step 6 is the
post-pass greedy needs.

The result is minimal, not minimum. At `n = 3` over the full language the
minimum is always 2, but greedy over a shuffled pool gave a mean of 2.72
clues across 2000 seeds (2 clues: 739, 3: 1083, 4: 176, 5: 2). That is a
feature: a puzzle that is always "A is in the cellar; B is in the
boathouse" is not a puzzle, and optimising cardinality optimises the wrong
thing.

Two worked examples, cast as suspects and alibis:

```
seed 20260908                                    surviving matchings
  1. If Mrs Ardley was in the cellar, then        6 → 5
     the boy Finch was in the boathouse.  [IF]
  2. Mrs Ardley was in the cellar.        [POS]   5 → 1
  solution: Ardley→cellar, Coyne→conservatory, Finch→boathouse
  drop 1 → 2 matchings;  drop 2 → 5 matchings     (both load bearing)

seed 11
  1. If the boy Finch was in the conservatory,    6 → 5
     then Mrs Ardley was in the boathouse.  [IF]
  2. If the boy Finch was in the boathouse,       5 → 3
     then Dr Coyne was in the boathouse.    [IF]
  3. Either Mrs Ardley was in the cellar, or      3 → 1
     Dr Coyne was in the cellar.            [OR]
  solution: Ardley→boathouse, Coyne→cellar, Finch→conservatory
  drop 1 → 2;  drop 2 → 3;  drop 3 → 3            (all load bearing)
```

**Complexity.** Steps 2–6 cost `O(|pool| · n!)`; the pool grows as `Θ(n⁴)`
(the `IF` family alone is `n²(n²−1)`) and `n!` does what it does. Measured
over 200 puzzles per `n`, all families:

| n | matchings | clue pool | ms/puzzle |
|---|---|---|---|
| 3 | 6 | 132 | 0.03 |
| 4 | 24 | 404 | 0.07 |
| 5 | 120 | 970 | 0.17 |
| 6 | 720 | 1 992 | 0.91 |
| 7 | 5 040 | 3 668 | 7.35 |
| 8 | 40 320 | 6 232 | 108 |

Brute force is fine through `n = 7` and hurts at `n = 8`; `n = 9` would be
around 2 s per puzzle (conjecture by extrapolation, not measured). Beyond
that the explicit world set has to go, survivor counting becomes a
constraint solve, step 6's test becomes "does a second solution exist", and
set cover's NP-hardness stops being a footnote. None of it matters here:
§6 shows the graph encoding caps `n` at 3 long before the generator does.

## 5. Difficulty

Two puzzles with the same clue count can be very different to solve. The
useful distinction is whether a solver that never guesses can finish. Model
the player as a candidate grid `C[s][t]` with two propagators:

* **Unit propagation.** A clue fires only when it is already decided:
  `POS` assigns, `NEG` strikes, `OR` asserts the other disjunct once one is
  impossible, `IF` contraposes once the consequent is impossible. Plus the
  all-different singles — a row with one candidate, a column with one
  candidate.
* **Arc consistency.** For each clue over rows `s, s'`, strike `t` from row
  `s` whenever no `t' ≠ t` in row `s'` makes the clue true. Plus the same
  all-different singles.

A puzzle is **direct** if the propagator reaches the full solution and
**case-split** otherwise. The classification is not a property of the
puzzle alone — it is a property of the puzzle *and the declared
propagator*, and the gap is large:

| corpus | unit propagation solves | arc consistency solves |
|---|---|---|
| n=3, all families | 24.3% | 93.2% |
| n=3, no positives (NEG+OR+IF) | 8.8% | 92.3% |
| n=4, all families | 11.6% | 72.3% |
| n=5, all families | 12.4% | 65.8% |

(2000 puzzles each, 500 at `n = 5`.) The seed-11 puzzle above is
case-split under unit propagation and direct under arc consistency. The
knob is real but must be published: a daily puzzle claiming "solvable by
elimination" has to name the rules it means, or the claim is
unfalsifiable. Arc consistency plus all-different singles models a person
with a pencil and a grid; unit propagation models one who has not noticed
the grid. Pick one, declare it, generate to it by rejection — affordable at
0.03 ms per candidate even at 5% acceptance.

## 6. Wiring it to the graph

A matching skin is a drop-in alternative to `puzzleChoice` on the same
`puzzle` edge. The LHS matches `a --puzzle--> b`, binding the edge as `e`.
The RHS creates a board node, one clue node per clue hanging off it with a
paired backtrack (the `deadEnd` idiom), one `correct: true` choice edge to
`b`, and `n! − 1` wrong-answer nodes routing back to `a`. The `correct`
edge inherits the matched edge's `edgeId`, so an external backtrack gated
on `prereq.traversed` stays reachable; `a → board` inherits `edgeId` *and*
`prereq`, so a `pairId` lock refined into this puzzle is not bypassed. Both
use `$extend`, which drops undefined values, so an anonymous ungated
`puzzle` edge keeps the local `e_mb_<iter>` id.

One constraint dictates the shape. The `$eval` context holds only `$$iter`,
`$$graph` and the matched elements (`Context.updateIteration`,
`index.js:567`; `Matcher.getEvalFunc`, `index.js:798`): a label expression
cannot reach a module-level helper. So the puzzle cannot be generated
during `evolve`. It is generated at factory-call time from the daily seed,
baked into the RHS as literals, and the rule takes `limit: 1`.
(`mystery-primitives.js:185` evades the same restriction by inlining a
whole lookup into the `$eval` source; a matching generator is too big for
that trick.)

```js
// Expand a `puzzle` edge into a bipartite-matching board. Unlike
// puzzleChoice, whose distractors are unlabelled wrong turns, every wrong
// answer here is a specific claim about the world, and the clue nodes are
// the evidence for rejecting it. The puzzle itself is *not* generated
// here: the eval context cannot reach a module-level helper, so the caller
// passes a solved instance and this factory bakes it in. One instance per
// rule, hence limit: 1.
function matchingLock (opts) {
  opts = opts || {}
  const puzzleType = opts.puzzleType || dp.EDGE_PUZZLE
  const pathType = opts.pathType || dp.EDGE_PATH
  const choiceType = opts.choiceType || dp.EDGE_CHOICE
  const backtrackType = opts.backtrackType || dp.EDGE_BACKTRACK
  const boardType = opts.boardType || 'matching_board'
  const clueType = opts.clueType || 'clue'
  const wrongType = opts.wrongType || dp.NODE_DISTRACTOR
  const puzzle = opts.puzzle          // { left, right, solution, clues }
  const key = puzzle.solution.join(',')
  const boardNid = { $eval: '"board_" + ($$iter + 1)' }

  const nodes = [
    { id: 'a' }, { id: 'b' },
    { id: 'board', label: {
        type: boardType, nodeId: boardNid,
        left: puzzle.left, right: puzzle.right, solution: puzzle.solution,
        text: { $macro: ['describe_matching_board', boardNid] },
        dot: { label: 'matching board', shape: 'diamond', color: 'gold' } } }
  ]
  const edges = [
    // Inherit edgeId and prereq from the matched edge, exactly as
    // puzzleChoice and monsterBattle do: a gate on the corridor must not be
    // bypassable by having dressed the corridor as a puzzle. $extend drops
    // missing fields, so an anonymous puzzle edge keeps the local id.
    { v: 'a', w: 'board', label: {
        $extend: [
          { type: pathType, edgeId: { $eval: '"e_mb_" + ($$iter + 1)' },
            link: { $macro: ['button_passage', boardNid] } },
          { edgeId: { $eval: '$e.label.edgeId' },
            prereq: { $eval: '$e.label.prereq' } }
        ] } }
  ]
  // Clues as side-branch nodes with paired backtracks, so that reading a
  // clue is a move and can carry its own narrative slot. `text` is a literal
  // string, NOT a $macro: a paraphrased clue is a different proposition, and
  // the narrator is not allowed to change the puzzle.
  puzzle.clues.forEach(function (clue, i) {
    const cid = 'c' + i
    const clueNid = { $eval: '"clue' + i + '_" + ($$iter + 1)' }
    const idIn = { $eval: '"e_clue' + i + '_" + ($$iter + 1)' }
    nodes.push({ id: cid, label: {
      type: clueType, nodeId: clueNid, proposition: clue.form, text: clue.text,
      dot: { label: 'clue ' + (i + 1), shape: 'note' } } })
    edges.push({ v: 'board', w: cid, label: {
      type: pathType, edgeId: idIn,
      link: { $macro: ['button_passage', clueNid] } } })
    edges.push({ v: cid, w: 'board', label: {
      type: backtrackType, prereq: { traversed: idIn },
      dot: { label: 'backtrack', style: 'dashed', color: 'gray' } } })
  })
  // One answer edge per candidate matching. The correct one IS the locked
  // edge; the rest route back to `a`, which costs two moves and a re-read.
  permutations(puzzle.left.length).forEach(function (p, k) {
    if (p.join(',') === key) {
      edges.push({ v: 'board', w: 'b', label: {
        type: choiceType, correct: true, answer: p,
        edgeId: { $eval: '$e.label.edgeId' },
        dot: { label: 'correct', color: 'darkgreen' } } })
      return
    }
    const wid = 'w' + k
    nodes.push({ id: wid, label: {
      type: wrongType, nodeId: { $eval: '"wrong' + k + '_" + ($$iter + 1)' },
      answer: p, dot: { label: 'wrong', shape: 'octagon', color: 'gray' } } })
    edges.push({ v: 'board', w: wid, label: {
      type: choiceType, correct: false, answer: p,
      dot: { label: 'wrong answer', color: 'gray' } } })
    edges.push({ v: wid, w: 'a', label: {
      type: pathType,
      dot: { label: 'back to the board', style: 'dotted', color: 'gray' } } })
  })
  return withOpts({
    name: 'matching-lock',
    limit: 1,
    lhs: { node: [{ id: 'a' }, { id: 'b' }],
           edge: [{ v: 'a', w: 'b', label: { type: puzzleType }, id: 'e' }] },
    rhs: { node: nodes, edge: edges }
  }, opts)
}
```

Run against a two-node seed graph whose edge is
`{ type: 'puzzle', edgeId: 'e_ab_1', prereq: { pairId: 'pair_1' } }`, this
emits 10 nodes and 16 edges: `a → board` carries
`{type:"path", edgeId:"e_ab_1", prereq:{"pairId":"pair_1"}}`, the correct
answer carries `{type:"choice", edgeId:"e_ab_1", correct:true}`, and the
five wrong answers carry `correct: false`. Strip `edgeId` and `prereq` from
the matched edge and the same rule emits `edgeId: "e_mb_1"` and no
`prereq`, confirming `$extend`'s drop semantics.

Slots the skin needs, in the vocabulary of
[narrative-slots](narrative-slots.md): a board description, one text per
clue, one affordance per answer edge, a "that is not right" line on the
wrong route, and the existing `lock.unlock` on the correct edge. Clue text
is why the sample passes literals rather than `{$macro: [...]}`: a
paraphrase can change truth conditions — "either A or B" is not "A, or
possibly B" — and the narrator cannot know that. It is the one slot here
that must be rendered from the logical form by a human-checked template,
never generated. (`describe_matching_board` is absent from `themes.js`'s
`MACROS`, so `macroPrompt` falls back to a generic description: survivable
for the board, not for the clues.)

**Why n = 3.** The answer set is enumerated as edges, one per candidate
matching, because a graphgram edge is stateless: there is no way to encode
a partially-filled grid in a graph whose only state is which nodes have
been visited. The skin therefore costs `n! − 1` wrong-answer nodes and
`2(n! − 1) + 1` answer edges — 5 nodes and 11 edges at `n = 3`, 23 and 47
at `n = 4`, 119 and 239 at `n = 5`. Twenty-four links on one screen is not
a puzzle, it is a list. `n = 3` is not a tuning choice, it is where this
encoding runs out.

## 7. When a skin is load bearing

A skin is a gate on an edge, and solving it proves nothing about the map.
The consequence is sharp: a skin is load bearing exactly when the edge it
dresses is one the player could not otherwise take. `puzzleChoice` on a
plain `passage` edge is decoration — the player picks answers until one
works. `matchingLock` on an edge that already carries `prereq.pairId` is
double-gated, and the puzzle is the second, weaker gate. `matchingLock` on
an edge whose only gate is the puzzle is load bearing, and then brute force
matters: six answers, wrong ones costing two moves, so a player who refuses
to reason pays at most ten moves. If the score is moves that is a real
penalty; if the score is binary the skin is not a gate at all.
(`edgeAccessible` honours `oneTime` on an edge with an `edgeId`, burning a
wrong answer permanently — but with `n! − 1` wrong answers that
*guarantees* brute force succeeds within `n!` tries, which is worse.)

The failure mode this section exists to prevent is skinning everything.
The README's six-stage dungeon, at its three canonical seeds:

| seed | nodes | minigame nodes | edges | minigame edges | key/door pairs |
|---|---|---|---|---|---|
| 42 | 131 | 104 (79.4%) | 323 | 248 (76.8%) | 0 |
| 1729 | 139 | 112 (80.6%) | 335 | 256 (76.4%) | 0 |
| 8675309 | 118 | 90 (76.3%) | 246 | 144 (58.5%) | 1 |

Four fifths of the graph is minigame interior. At two of the three
canonical seeds the dungeon holds **no key–door pair at all**: every
`puzzle` and `monster` edge was refined from an ordinary corridor, so
nothing is actually locked and every gate sits on a corridor the player was
going to walk anyway. The artifact is a sequence of quizzes with a
map-shaped index, and the structural work — nesting depth, key placement,
the reason one room is behind another — has been pushed under 20% of the
graph.

The remedy is a budget, not a prohibition: skin locked edges first, cap
minigames well below the corridor count, and refuse to skin an edge that
some other route already bypasses. See [budgets](budgets.md) for the
machinery and [key-lock-transformations](key-lock-transformations.md) for
what "actually locked" means as a graph property. A minigame is a good
answer to "how do I make this lock feel like something" and a bad answer to
"how do I make this level interesting" — and it is easy to reach for the
second time having written it for the first.

## Open problems

1. **Conjunctive prereqs.** `edgeAccessible` (`play/game.js:92`) tests one
   clause and returns on the first key present, so "you have read all three
   clues" is inexpressible; chaining the clue nodes in series is the only
   workaround. Extend `prereq` to `{all:[...]}` / `{any:[...]}` and make the
   Story IR condition compiler (§8 of the spec already has `all`/`any`)
   round-trip it.
2. **A stateful board.** Find an encoding of a partly-filled `n × n` grid
   that a graphgram graph can express, or prove none smaller than `Θ(n!)`
   exists under "state = set of visited nodes". Either result decides
   whether `n = 4` is reachable.
3. **Declare the propagator.** Fix arc consistency plus all-different
   singles as the reference solver, implement it as a testable function,
   and generate by rejection against it, so `difficulty: 'direct'` is a
   checkable property of a shipped instance rather than a claim.
4. **Measure the greedy gap.** How often does step 6 actually remove a
   clue, and does max-gain greedy produce better puzzles or merely shorter
   ones?
5. **Clue-text templates.** One human-checked rendering template per clue
   form per theme, plus a test that the rendered string's logical form
   round-trips back to `label.proposition`.
6. **A skin budget.** Implement the §7 rule and re-measure the §7 table to
   show the fraction actually moved.
7. **Fair `monsterBattle`.** Retune the consequence weights so some policy
   wins with probability 1, or add a deterministic escape that keeps the
   battle's texture, so a battle can gate a daily puzzle without the 19.9%
   refusal measured in §1.

## See also

* [murder-mystery](murder-mystery.md) — the daily puzzle this skin is for,
  and where suspects, alibis and clue text come from.
* [key-lock-transformations](key-lock-transformations.md) — what a lock is
  as a graph transformation, and what a skin is not.
* [narrative-slots](narrative-slots.md) — the slot inventory the skin
  extends, and why clue text is the slot that must not be generated.
* [budgets](budgets.md) — the caps §7 asks for.
* [matching-engine](matching-engine.md) — the subgraph isomorphism that
  fires the rule in §6. Note the name collision: that paper's "matching" is
  graph matching, this one's is bipartite matching.
* `dungeon-primitives.js:577` (`monsterBattle`), `:700` (`puzzleChoice`),
  `:289` (`keyDoor`).
* `play/game.js:92` (`edgeAccessible`), `:527` (`rollAtRandom`), `:545`
  (`applyEdgeDamage`).
* `index.js:567` (`Context.updateIteration`), `:798`
  (`Matcher.getEvalFunc`) — the two lines that bound what a label
  expression can see.
