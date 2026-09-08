# Papers

*A small internal literature. Six short technical papers that establish, for this project, a shared vocabulary and a standard of rigor — and one architecture spec that came out of a conversation and belongs with them.*

These are not documentation. The [Guide](../guide.html) and
[Advanced](../advanced.html) pages tell you how to use the library; these argue
about how it should work, measure whether it does, and say plainly where it
does not. Each one defines its notation, cites the source file and line, ends
with numbered open problems, and — where it makes an empirical claim — either
measured it or marked it a conjecture.

A few of the results are unflattering, which is the point. The matching engine's
label pre-filter is worth 7–17x on patterns that use node labels, and most of
this repository's own primitives do not use node labels. Two of the five triage
hooks are unmeasurable. A monster battle, played optimally, still kills the
player 19.9% of the time, which makes it the wrong shape for a daily puzzle. A
"difficulty" classification for logic minigames turns out to be
propagator-relative rather than a property of the puzzle. Better to have that
written down than to keep rediscovering it.

## The six

### [The Narrative Slot Taxonomy](narrative-slots.html)

A key and a door are one graph transformation and at least ten pieces of text.
This enumerates them, gives the criterion that admits an eleventh, and does the
same for rooms and passages — where a passage advertisement naively depends on
three booleans and so on eight states, of which five are reachable and two
survive graphgram's gating. It separates *which slot* a string fills from *which
version* of it is wanted, gives the general type (trajectory → string), and
explains why Story IR v1 ships only the boolean projection of that vector.

The foundational paper of the six: everything else borrows its vocabulary.

### [Key and Lock as Graph Transformation](key-lock-transformations.html)

"Key-and-lock puzzle" names a semantic relation — an edge whose traversability
is conditioned on the player's history, and a node whose visitation discharges
that condition — not a shape. The repository realises that one relation with
five different rewrites, and they are not interchangeable: they differ in
recoverability, in whether they preserve acyclicity, in whether they nest inside
their own output, and in what they cost in nodes, edges and diameter.

Includes the solvability invariant a generator must maintain, and which
construction maintains it by construction versus which deliberately does not.

### [Budgets, Nesting Depth, and Generative Control](budgets.html)

You want "about twelve rooms, three keys, at most two levels of nesting". What
the engine offers is "apply 25 rules sampled by weight". This paper is about
that gap.

The central fact, measured: **a weight is not a probability.** A rule's realised
firing rate is its weight times its number of match sites, and the number of
match sites grows as the graph grows. It ends by arguing that rejection sampling
— generate, measure, re-roll — is the honest way to hit a target shape, and
notes that a human curating a daily puzzle is rejection sampling with a person
as the acceptance test.

### [Subgraph Isomorphism and the Triage Hooks](matching-engine.html)

The one genuinely heavyweight thing the library does, described as it is
actually implemented in `subgraph.js` rather than as Ullmann described it in
1976. Each hook was measured by patching it off and confirming every variant
still produced byte-identical graphs.

Two hooks earn their place; two do not, at the sizes anyone runs. And there is a
good story in the history: the arc-consistency refinement was for a while an
exact no-op — it called `predecessors` with a host id instead of a pattern id —
which left correctness untouched and made the code 2.7x slower than baseline,
*and 1.5x slower than having no refinement at all*, because it still paid the
loop overhead.

### [The Daily Murder Mystery](murder-mystery.html)

The design paper for the project's destination. A murder mystery presented as a
logic puzzle, built as a nest of key-and-lock puzzles on a generated graph,
because the locks are informational: the key is a proposition and the gate is
"the player holds it".

Its best idea is the diegetic reading of the grammar itself. Every elaboration
rule that creates a lock is an anonymous directive from the murderer to an
unwitting accomplice, so the derivation history *is* the plan — and a player who
reconstructs it has solved the case. Which means the generator must *record* the
derivation, not merely apply it.

### [Logic Minigames as Lock Skins](logic-minigames.html)

The narrow technical companion. A lock needs a gate; the cheapest is "do you
hold the key" and the next cheapest is a small self-contained puzzle whose exit
edge is the locked edge.

It audits the two skins the repo ships and shows why a *stochastic* gate is the
wrong shape for a daily puzzle — optimal play still dies one time in five, and a
gate that can block a correct solver is not a puzzle. Then it develops the
bipartite-matching family: the combinatorics, a five-form clue language with
computed elimination figures, the observation that generating a minimal clue set
is exactly minimum set cover, and a difficulty classifier that turns out to
depend on which propagator you ask.

## Also

### [The two-layer mystery: geography × approval](../spec/two-layer-mystery.html)

Not one of the six — it is an architecture spec rather than a paper — but it is
where the mystery track's shape is actually settled, and the other papers defer
to it.

Two grammars over different aspects of the same world: a navigable map with NPCs
standing at some of its nodes, and an approval DAG over those NPCs with the boss
as its sink. The player navigates both at once and the puzzle is their product.

Its centre is a deadlock that only the composition can see. B's secret is in the
study; the study is locked; the key is carried by A; and A will not talk until B
vouches for them. Every layer is individually well-formed. The cycle exists only
in the product — which is why the solvability check is a fixpoint over
(room, set of cooperations) rather than anything either grammar could verify
alone.

## House style

For anyone adding a seventh. Markdown; an H1, an italic one-paragraph abstract,
numbered H2 sections. Twelve hundred to twenty-five hundred words, and denser is
better than longer. Define notation before using it; give formal rules a
displayed form and then read them back in English. Tables for taxonomies, fenced
blocks for code that actually exists in this repository — a paper citing an API
that does not exist is worse than no paper. Every paper ends with **Open
problems** (numbered, specific, each one a thing somebody could go and do) and
**See also**.

Where you make an empirical claim, measure it or mark it a conjecture. Report
null results. Say what does not work.
