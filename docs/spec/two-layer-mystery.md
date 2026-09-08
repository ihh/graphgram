# The two-layer mystery: geography × approval

*The architecture of the murder-mystery track. Two grammars, generated
independently over different aspects of the same world, composed by an
embedding. The player must navigate both at once, and the puzzle is the
product.*

## 1. Why two layers

The obvious way to build a social mystery on a graph grammar is to write one
grammar whose rules emit rooms and suspects and secrets together, interleaved.
That is what the first pass did, and it is wrong in a specific way: it conflates
two structures that want independent budgets, independent shapes, and
independent solvability checks.

Split them:

**The geographic layer.** A navigable map. Rooms, passages, dead ends,
backtracks. Possibly a physical key-and-door or two, kept as a garnish rather
than the main course. NPCs stand at some of the nodes. This layer answers *where
can I walk, and who is there*.

**The approval layer.** A chain, tree, or DAG over the NPCs, in which an edge
`A → B` means *B will not receive you until A has vouched for you*. It has one
or more roots — people who will talk to a stranger — and a sink: the boss at the
top, whose cooperation yields the truth of the conspiracy. This layer answers
*who will talk to me, given who already has*.

Neither layer is a puzzle on its own. The geographic layer without the approval
layer is a maze; the approval layer without the geographic layer is a to-do
list. The puzzle is their product.

## 2. What a lock is here

The key-and-lock structure was never really about keys and doors. It is:

> an uncooperative NPC, holding a secret, where the secret is learnable
> somewhere else on the map, and revealing it to them makes them cooperative.

What cooperation *yields* is where the two cases separate, and the second is the
one that gives the mystery its shape:

**(a) passage.** The NPC lets you through. A door with a person in front of it.
This is the ordinary case, and it is just the physical lock with better prose.

**(b) approval.** The NPC's cooperation is what gives you access to the *next
person*. The thing unlocked is not a room; it is somebody's willingness to
receive you at all. This is what makes the suspects a conspiracy rather than a
cast list, because it imposes an order on them.

Case (b) is why the approval layer is a graph and not a set. To reach the boss
you need the boss's approval; the boss receives no one who has not been vouched
for by their lieutenant; the lieutenant is uncooperative until confronted with
their secret; that secret is in a locked study, or held by a third person who
has their own precondition. The nesting is social, and it goes all the way down
to somebody who will simply talk to you.

## 3. The formal object

```
Geographic layer   G_s = (R, P)        rooms R, passages P ⊆ R × R
                   physical locks      lock: P ⇀ K,  keys placed in rooms
Approval layer     G_n = (N, A)        NPCs N, approvals A ⊆ N × N   (a DAG)
                   boss               the unique sink of G_n
Embedding          φ : N → R           which room each NPC stands in
Secrets            σ : N → N ⊎ R       where each NPC's secret is found:
                                       held by another NPC, or lying in a room
```

Player state is a pair `(r, C)` — the room they are in, and the set of NPCs made
cooperative so far (plus any physical keys held, which behave identically and
are folded into `C`).

Two move types:

```
WALK      (r, C) → (r', C)     if (r,r') ∈ P and any lock on it is in C
CONFRONT  (r, C) → (r, C ∪ {n})  if φ(n) = r
                                 and every predecessor of n in G_n is in C
                                 and σ(n) is satisfied:
                                     σ(n) ∈ N  ⇒  σ(n) ∈ C
                                     σ(n) ∈ R  ⇒  the player has visited σ(n)
```

The story is solvable iff `boss ∈ C` is reachable from `(start, ∅)`. That is a
reachability problem in the product of the two layers, and it is *not* implied
by either layer being fine on its own.

## 4. The deadlock this architecture makes possible

This is the engineering point, and the reason the check has to run on the
product.

Consider: NPC **B**'s secret is a document in the **study**. The study is behind
a physical door. The key to that door is carried by NPC **A**. And A is
uncooperative until vouched for by — B.

Every individual piece is well-formed. `G_n` is a legitimate DAG. `G_s` is a
connected map with a solvable physical lock. `σ` assigns each secret a real
location. And the puzzle is dead: B needs the study, the study needs A, A needs
B.

Nothing local catches this. A rule that places a secret cannot see the approval
graph; a rule that adds an approval edge cannot see where secrets ended up. The
cycle exists only in the composition, so the composition is where it must be
checked:

> **Solvability invariant.** Compute the fixpoint of reachable `(r, C)` from
> `(start, ∅)` under WALK and CONFRONT. The story is fair iff the fixpoint
> contains a state with `boss ∈ C`.

The fixpoint is cheap — the state space is `|R| × 2^|N|`, and `|N|` is five or
six by budget — so this is a check to run on *every* generated story, not a
sampling audit. When it fails, reject the seed and advance; see
[budgets](budgets.md) on rejection sampling.

A stronger property is worth computing at the same time, because it is what
makes the mystery feel authored rather than merely possible:

> **Criticality.** Every NPC in `G_n` should lie on some path to the boss, and
> every secret placement should be load bearing. An NPC nobody needs is a red
> herring, which is legitimate — but it should be a *deliberate* red herring
> with a budget, not an accident of generation.

## 5. Generation order

```
1. approval layer   grow G_n to the npc budget, at the target nesting depth.
                    Shape is a knob (§6). Pure structure; no rooms yet.
2. geographic layer grow G_s to the room budget, using the ordinary
                    dungeon primitives. Add 0-2 physical locks.
3. embedding        choose φ and σ. This is the step with all the freedom
                    and all the danger.
4. verification     run the §4 fixpoint. On failure, redo step 3 with the
                    next seed; on repeated failure, redo step 2.
5. narration        fill the slots.
```

Step 3 is the interesting one. Placement is not free: `σ(n)` must be reachable
without `n`'s own cooperation, or the lock guards its own key. The cheap
constructive rule that avoids most deadlocks is to **place along the approval
order**: process NPCs in a topological order of `G_n`, and place each one's
secret only in rooms or NPCs already reachable given the cooperations available
at that point in the order. That does not make the §4 check redundant — physical
locks can still interpose — but it turns the check from a filter into a
formality.

## 6. The shape of the approval layer is the difficulty knob

`G_n` is a DAG, and which DAG matters more to the play experience than any
other single parameter.

| shape | what the player experiences |
|---|---|
| **chain** `n₁ → n₂ → … → boss` | forced order, no agency about sequence. Reads as linear, but the *deduction* of the order can still be the puzzle. |
| **tree** (branching toward the boss) | several independent lines of enquiry converging. The player chooses which to pursue first; all must be finished. |
| **general DAG with joins** | the boss requires several chains completed, and some NPCs serve more than one chain — so cooperating with one person pays off twice. This is the shape that rewards planning. |

Depth sets how much is nested; width sets how much can be done in parallel; join
count sets how much of the structure the player can discover early and exploit.
A budget of `{ npcs: 5, nestingDepth: 3 }` describes a DAG with those two
parameters, and the remaining freedom is the width profile.

## 7. What the player is doing

Worth stating plainly, because it is the justification for the whole
construction. At any moment the player holds a set of cooperations and stands
somewhere. Their problem is to choose the next thing to do, and doing that well
requires holding two maps in mind at once: the physical one, which they can see,
and the social one, which they must infer from what people say about each other.

That is a genuinely different cognitive task from either maze-walking or logic-
puzzling, and it is the thing this architecture exists to produce. When the two
layers are aligned — the person you need next is in the next room — it collapses
into a corridor. When they are orthogonal — the person you need next is back
where you started, and you did not know you would need them — it becomes a
route-planning problem over information you acquired in the wrong order. Aim for
the second.

## 8. The murderer as author

The approval DAG has a diegetic reading, and it is the reason the whole thing
holds together as fiction. Each approval edge `A → B` exists because somebody
arranged for it: an anonymous directive telling A to vouch for whoever comes
asking, on pain of their own secret. The murderer knows everybody's sin, and the
DAG is the shape of what they built out of that knowledge.

So the derivation history of the approval grammar *is* the murderer's plan, and
a player who reconstructs the DAG has reconstructed the conspiracy. The endgame
that shows the derivation as a sheaf of blackmail notes is therefore a fair and
complete solution presentation, not a gimmick — it is the same object the player
has been inferring, finally shown directly.

This has a consequence for the generator: the derivation must be **recorded**,
not merely applied. See [murder-mystery](murder-mystery.md).

## See also

- [murder-mystery](murder-mystery.md) — the design paper
- [key-lock-transformations](key-lock-transformations.md) — the catalogue of lock realisations, of which the social lock is one
- [logic-minigames](logic-minigames.md) — the matching problem, when several secrets are live at once
- [budgets](budgets.md) — rejection sampling, and what each budget field binds
- [`mystery-primitives.js`](../../mystery-primitives.js), [`examples/mystery-daily.js`](../../examples/mystery-daily.js)
