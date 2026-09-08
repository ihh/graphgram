'use strict'

// Murder-mystery grammar primitives — the social counterpart of
// dungeon-primitives.js, and the destination the rest of the library is
// scaffolding towards.
//
// THE CORE IDEA
//
//   A murder mystery presented as a logic puzzle is, mechanically, a nest
//   of key-and-lock puzzles on a generated graph. The keys are not brass;
//   they are facts. 'Confront the butler about his affair' is a key.
//   'Reassure the footman you will keep his secret' is a key. The lock is
//   not a door; it is a person's unwillingness to talk. The player
//   experiences deduction; the engine executes a reachability problem.
//
//   And the elaboration rules have a diegetic reading. Each application of
//   a rule that adds a lock and its key corresponds to an anonymous
//   directive — a blackmail note — sent by the murderer to an unwitting
//   accomplice. The murderer is, literally, the author of the grammar
//   derivation. Every lock in the finished map is a thing someone was told
//   to do. That reading is not decoration: it is what makes an arbitrary
//   generated puzzle feel authored, and it is why `directive()` stamps the
//   note onto the lock rather than leaving it implicit — so the endgame
//   evidence node can surface the notes and let the player reconstruct the
//   derivation as a stack of blackmail letters.
//
// The structural analogue is exact:
//
//   dungeonPrimitives.keyDoor          mysteryPrimitives.socialLock
//   ---------------------------------  ---------------------------------
//   key node (pairId)                  secret node (pairId)
//   door node                          suspect node
//   locked `path` edge (prereq.pairId) `interview` edge (prereq.pairId)
//   backtrack out of the door          backtrack out of the interview
//   "unlock the door with the key"     "confront them with what you know"
//
// NESTING. keyDoor cannot nest on its own output (it refuses edges that
// already carry an edgeId), so nested locks in a dungeon are an accident of
// where the sampler happened to fire. A mystery cannot afford that: the
// whole genre is the chain "the secret that unlocks A is held by B, whose
// own secret is held by C". So socialLock leaves the trail to its secret as
// a bare `leverage` edge with no edgeId, and `socialLock({nest: true})`
// matches exactly that edge — interposing a new suspect in front of the
// secret you were about to collect. Applying it k times yields a chain of
// depth k+1, and `nestingDepth()` below measures the result by simulation
// rather than by trusting the grammar.
//
// Only one secret at a time carries `frontier: true` (the base rule stamps
// it when given a `chain` name; the nest rule moves it forward), so the
// chain is guaranteed linear rather than a bush of depth-2 stubs.
//
// DETERMINISM. Nothing here calls Math.random. Every choice a rule makes —
// which role a suspect has, what they are hiding, what the note told them
// to do — is indexed off `$$iter`, the grammar's own iteration counter, the
// same way dungeon-primitives derives its pairIds and nodeIds. `$$iter`
// advances once per rule application and the sequence of rule applications
// is a pure function of the seed (graphgram samples sites from a seeded
// Mersenne Twister), so cast, secrets, secret-assignment and murderer are
// all functions of the seed alone. Which suspect is the murderer is settled
// structurally rather than by a coin toss: see `unmaskMurderer`.

const dp = require('./dungeon-primitives')

// --- type constants -----------------------------------------------------

// Nodes. `scene` is the mystery's word for dungeonPrimitives' `room`; it is
// a distinct constant so a renderer can style a drawing-room differently
// from a crypt, and so the dungeon primitives can be reused verbatim via
// their `roomType` option.
const NODE_SCENE = 'scene'
const NODE_SUSPECT = 'suspect'
const NODE_SECRET = 'secret'
const NODE_EVIDENCE = 'evidence'
const NODE_ACCUSATION = 'accusation'
// Terminal node reached by naming the wrong person. Distinct from `win`
// (which the correct accusation leads to) so an exporter can give it
// role: "ending" without treating it as a victory.
const NODE_VERDICT = 'verdict'

// Edges.
//   interview — the LOCKED edge: what a suspect will only tell you once
//               you have leverage. Carries prereq.pairId.
//   leverage  — the trail to a secret. Deliberately left without an
//               edgeId so that socialLock({nest:true}) can match it and
//               push another lock in front of it.
//   testimony — what a suspect with nothing to hide says on your way out.
//               Ungated apart from the usual traversal pairing.
//   directive — a dossier entry: the evidence node pointing back at the
//               person an anonymous note was sent to.
//   accuse    — an outgoing edge of the accusation node, one per suspect.
const EDGE_INTERVIEW = 'interview'
const EDGE_LEVERAGE = 'leverage'
const EDGE_TESTIMONY = 'testimony'
const EDGE_DIRECTIVE = 'directive'
const EDGE_ACCUSE = 'accuse'

// --- the cast, the secrets, the notes -----------------------------------

// Three parallel tables, walked at mutually coprime strides (see
// roleExpr / factExpr / actExpr). Coprime strides matter twice over: they
// keep each table from repeating until it has been exhausted, and they keep
// the three from marching in step — with stride 1 everywhere the butler
// would always be hiding the same thing and always have been told the same
// thing, and the "cast" would be one character wearing twelve hats.
const ROLES = [
  'butler', 'footman', 'governess', 'housekeeper',
  'valet', 'gardener', 'cook', 'chauffeur',
  'secretary', 'physician', 'stableman', 'companion'
]

const SECRETS = [
  'an affair with the mistress of the house',
  'a forged reference from a house that never employed them',
  'a debt to a bookmaker in the next town',
  'a night spent in the cells under another name',
  'a child nobody in the house knows about',
  'a letter they were paid not to post',
  'a bottle kept behind the flour in the pantry',
  'a second family across the water',
  'a signature they have learned to copy',
  'a key cut at the ironmonger without asking',
  'a page torn from the day-book and burnt',
  'a brother who is not dead after all'
]

const DIRECTIVE_ACTS = [
  'say nothing about the west stair',
  'lose the page for the ninth',
  'be seen in the pantry at nine',
  'burn what is left in the grate',
  'leave the garden door unlocked',
  'swear the car never left the yard',
  'forget the sound on the landing',
  'put the day-book back where it was',
  'say the bell rang twice',
  'let the dogs out at half past',
  'mislay the second key',
  'do not mention the letter'
]

// FNV-1a, the same four lines themes.pickTheme uses. Here it turns a table's
// name into a fixed offset, so the three tables are read at three unrelated
// places rather than marching in step.
function fnv1a (s) {
  let h = 2166136261
  const str = String(s)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Where a suspect's role, their secret and their instructions come from.
//
// The index is (number of suspects already in the graph) + (a per-run salt
// stamped on the start node by `stampCastSalt`). Two properties fall out of
// that sum, and both are needed:
//
//   distinctness — the suspect count rises by exactly one per suspect, so
//     with a stride coprime to the table length the first `table.length`
//     members of the cast are all different. No two housekeepers; nobody
//     hiding the same letter as somebody else.
//
//   seed-dependence — the salt is the graph's edge count at the moment the
//     house is finished being built, which is a function of which structural
//     rules the seeded sampler chose. Without it the cast would be PINNED:
//     $$iter is bounded by the stage limits, so a grammar that always fires
//     three locks always fires them at iterations 0, 1 and 2, and an
//     iter-indexed cast would deal the same three servants every day of the
//     year with only their positions in the house changing. (Which is the
//     bug this comment exists to stop anyone reintroducing.)
//
// If `stampCastSalt` is never run the sum degrades to the bare suspect
// count: still deterministic, still distinct, just the same cast every seed.
//
// The lookup has to be inlined into the $eval source in full, because the
// eval context exposes only $$iter and $$graph (see Context.updateIteration)
// — there is no way to reach a module-level array or helper from inside it.
// Distinct suspectIds, not suspect NODES: a rule application adds its
// replacement nodes before it removes the ones it matched, so for the
// duration of one label evaluation a suspect that happened to be an
// endpoint of the matched edge exists twice over. Counting nodes would see
// the extra copy, skip an index, and hand two servants the same name.
const CAST_INDEX_SRC =
  '(function () {' +
  ' var ids = [], salt = 0;' +
  ' $$graph.nodes().forEach(function (n) {' +
  '   var l = $$graph.node(n);' +
  '   if (!l) return;' +
  '   if (l.suspectId && ids.indexOf(l.suspectId) < 0) ids.push(l.suspectId);' +
  '   if (typeof l.castSalt === "number") salt = l.castSalt' +
  ' });' +
  ' return ids.length + salt' +
  '})()'

function tableExpr (table, stride, name) {
  const offset = fnv1a(name) % table.length
  return { $eval: JSON.stringify(table) +
    '[((' + CAST_INDEX_SRC + ') * ' + stride + ' + ' + offset + ') % ' + table.length + ']' }
}
function roleExpr () { return tableExpr(ROLES, 1, 'role') }
function factExpr () { return tableExpr(SECRETS, 5, 'secret') }
function actExpr () { return tableExpr(DIRECTIVE_ACTS, 7, 'act') }

// Stamp a seed-derived salt onto the start node. Runs once, after the house
// has been laid out and before anybody is put in it; see CAST_INDEX_SRC for
// why the cast is dull without it.
function stampCastSalt (opts) {
  opts = opts || {}
  const startType = opts.startType || dp.NODE_START
  return withOpts({
    name: 'stamp-cast-salt',
    limit: 1,
    lhs: { node: [{ id: 's', label: { type: startType } }] },
    rhs: { node: [{ id: 's', update: { castSalt: { $eval: '$$graph.edgeCount()' } } }] }
  }, opts)
}

// --- narrator macros ----------------------------------------------------

// Every narrative slot this module stamps, as macro name -> description, in
// the shape of themes.js's MACROS table. themes.js is owned by another
// concern, so these are exported for the orchestrator to merge in rather
// than written there directly. Until that merge lands, themes.macroPrompt
// falls back to 'Narrative slot "<name>".' — the slots still render, they
// just prompt less well.
//
// Names beginning `button_` are short click affordances rather than prose:
// themes.macroPrompt keys off that prefix to ask for 2-6 imperative words.
const MYSTERY_MACROS = {
  mystery_scene:              'A room in the house during the investigation; who has been in it, and what has been moved.',
  mystery_suspect_intro:      'Introducing a suspect: who they are, and what you catch them doing.',
  mystery_evasion:            'A suspect refusing the one question that matters: how they deflect it without quite lying.',
  mystery_locked_question:    'The question you cannot ask yet, stated as the shape of the gap in what you know.',
  mystery_secret_site:        'Where a secret is found: the drawer, the ledger, the remark overheard through a door.',
  mystery_secret:             'The secret itself, stated plainly, as a fact you now hold.',
  mystery_learn_secret:       'The act of learning the secret: reading the letter, hearing the admission.',
  mystery_know_secret:        'Carrying a secret into the next room: the weight of knowing it and saying nothing.',
  mystery_recognise_leverage: 'The moment the secret and the silent suspect connect: this is leverage over that person.',
  mystery_confront:           'Player command: confront a suspect with what you have learned about them.',
  mystery_changed_manner:     'A suspect after the confrontation: the change in their manner now they will talk.',
  mystery_ask_now:            'The preface to the question you can finally put to them.',
  mystery_directive_note:     'The text of an anonymous note instructing its recipient to do one specific thing. Unsigned, and in a hand nobody recognises.',
  mystery_testimony:          'What a suspect with nothing to hide tells you, freely, on your way out.',
  mystery_dossier:            'The anonymous notes collected and laid out side by side; the same hand throughout.',
  mystery_accusation:         'The room where the accusation will be made, with everyone present.',
  mystery_verdict_right:      'The correct accusation: the case closes.',
  mystery_verdict_wrong:      'A wrong accusation: the case collapses and the house closes around itself.',
  button_confront:            'Button label: confront a suspect with what you know about them.',
  button_interview:           'Button label: go and speak to someone.',
  button_accuse:              'Button label: name one person as the murderer.',
  button_read_note:           'Button label: re-read one of the anonymous notes.'
}

// The FULL key-door narrative slot list, in social clothing. This is the
// list the project is committed to (papers/narrative-slots.md does not
// exist yet); every one of these has its own named field on a label and its
// own macro, so nothing has to be reconstructed by an exporter from a
// generic `text`.
//
//   #  what it is                                field          lands on
//   1  the locked edge itself                    lockedText     interview edge
//   2  the closed door (the suspect's evasion)   evasionText    suspect node
//   3  where the key is found                    secretSiteText secret node
//   4  what the key is                           secretText     secret node
//   5  picking it up (learning the secret)       learnText      secret node
//   6  carrying it (knowing it)                  knowText       secret node
//   7  key meets lock (this is leverage on them) leverageText   interview edge
//   8  the act of unlocking (the confrontation)  confrontText   interview edge
//   9  the now-open door (their changed manner)  openText       suspect node
//  10  preface to taking the unlocked edge       prefaceText    interview edge
//
// Exported so tests and the Story IR builder can walk the slots rather than
// hard-coding the field names in two places.
const SOCIAL_LOCK_SLOTS = [
  { slot: 'lockedEdge',  field: 'lockedText',     on: 'interview', macro: 'mystery_locked_question' },
  { slot: 'closedDoor',  field: 'evasionText',    on: 'suspect',   macro: 'mystery_evasion' },
  { slot: 'keySite',     field: 'secretSiteText', on: 'secret',    macro: 'mystery_secret_site' },
  { slot: 'key',         field: 'secretText',     on: 'secret',    macro: 'mystery_secret' },
  { slot: 'takeKey',     field: 'learnText',      on: 'secret',    macro: 'mystery_learn_secret' },
  { slot: 'carryKey',    field: 'knowText',       on: 'secret',    macro: 'mystery_know_secret' },
  { slot: 'recognition', field: 'leverageText',   on: 'interview', macro: 'mystery_recognise_leverage' },
  { slot: 'unlock',      field: 'confrontText',   on: 'interview', macro: 'mystery_confront' },
  { slot: 'openDoor',    field: 'openText',       on: 'suspect',   macro: 'mystery_changed_manner' },
  { slot: 'preface',     field: 'prefaceText',    on: 'interview', macro: 'mystery_ask_now' }
]

// The eleventh slot, which key-and-lock does not have because a door was
// never told to be a door.
const DIRECTIVE_SLOT =
  { slot: 'note', field: 'noteText', on: 'interview', macro: 'mystery_directive_note' }

// --- small helpers ------------------------------------------------------

function macro (name, ctx) { return { $macro: [name, ctx] } }

// Copy rule-level options onto a rule without clobbering what the factory
// already set. Same contract as dungeon-primitives' private `withOpts`.
function withOpts (rule, opts) {
  const keys = ['name', 'weight', 'limit', 'type', 'delay', 'condition', 'induced']
  keys.forEach(function (k) {
    if (opts && typeof opts[k] !== 'undefined' && typeof rule[k] === 'undefined') rule[k] = opts[k]
  })
  return rule
}

// `$$iter` resets at every stage boundary, so ids are qualified by an
// `idRole` string as well. Two rules in the SAME stage may share an idRole
// safely (iter advances on every application, whichever rule fired); two
// rules in DIFFERENT stages must not.
function idExpr (kind, idRole) {
  return { $eval: '"' + kind + '_' + idRole + '_" + ($$iter + 1)' }
}

// The id of the edge the player walks to reach a suspect. Inherited from
// the matched edge when it had one, so any paired backtrack elsewhere in
// the graph that was keyed on it keeps working (same convention as
// setpiece-primitives' inheritedEdgeIdExpr); otherwise freshly minted.
function askEdgeIdExpr (idRole) {
  return { $eval: '$e.label.edgeId || ("e_ask_' + idRole + '_" + ($$iter + 1))' }
}

// --- directive ----------------------------------------------------------

// The blackmail-note framing, as a label fragment.
//
// Every lock in the finished map is a thing someone was told to do, so the
// record of the instruction belongs ON the lock: `{ to, act, note }`, where
// `to` is the role that received it, `act` is what it told them to do, and
// `note` is the narrative slot holding the note's actual words. The endgame
// dossier (see `dossierEntry`) reads these straight off the interview edges,
// which is how the player ends up reading the grammar's own derivation
// history as a stack of letters.
//
// Returns a plain label fragment, not a rule; socialLock embeds it.
function directive (opts) {
  opts = opts || {}
  return {
    to: opts.to || roleExpr(),
    act: opts.act || actExpr(),
    note: opts.note || macro(DIRECTIVE_SLOT.macro, opts.ctx)
  }
}

// --- suspect ------------------------------------------------------------

// The label for a person. Shared by `suspect` (a witness who will simply
// talk) and `socialLock` (a witness who will not), so that the two kinds of
// NPC are indistinguishable to the player until they try to ask.
//
// `castRole` rather than `role`: the Story IR reserves `role` on a passage
// for its structural role ("start", "ending", "item", ...), and a butler is
// not a structural role.
function suspectLabel (opts) {
  const idRole = opts.idRole
  const nid = idExpr('sus', idRole)
  const label = {
    type: NODE_SUSPECT,
    nodeId: nid,
    suspectId: nid,
    castRole: roleExpr(),
    hiding: factExpr(),
    text: macro('mystery_suspect_intro', nid),
    dot: { label: 'suspect', shape: 'box', color: 'purple' }
  }
  return label
}

// Introduce an NPC into a scene: a side-branch off a `path` edge's source,
// with an explicit way back, exactly like dungeonPrimitives.deadEnd. The
// original edge is preserved (via the LHS id='e' trick) so that attaching a
// witness never rewrites the corridor they are standing next to.
//
//   a --path--> b   =>   a --path--> b
//                        a --path{edgeId}--> suspect
//                        suspect --testimony{prereq.traversed}--> a
//
// The way out is typed `testimony` rather than `backtrack` because it is
// not merely a retreat: this is a suspect with nothing to hide, and what
// they say on your way out is the point of visiting them. Locked suspects
// (socialLock) get a plain `backtrack` instead — you leave no wiser.
function suspect (opts) {
  opts = opts || {}
  const idRole = opts.idRole || 'npc'
  const pathType = opts.pathType || dp.EDGE_PATH
  const sceneType = opts.sceneType || NODE_SCENE
  const idAsk = idExpr('e_ask', idRole)
  const label = suspectLabel({ idRole: idRole })
  label.testimonyText = macro('mystery_testimony', label.nodeId)
  return withOpts({
    name: 'suspect-' + idRole,
    lhs: {
      node: [
        // Anchored on a scene, not on any node: a witness standing in a
        // key-cupboard or on a `win` node reads as a bug, and `a` needs a
        // nodeId anyway for anything downstream to reference the room.
        { id: 'a', label: { $and: [{ type: sceneType }, { nodeId: '(.+)' }] } },
        { id: 'b' }
      ],
      edge: [{ v: 'a', w: 'b', label: { type: pathType }, id: 'e' }]
    },
    rhs: {
      node: [
        { id: 'a' },
        { id: 'b' },
        { id: 's', label: label }
      ],
      edge: [
        'e',
        { v: 'a', w: 's', label: {
            type: pathType,
            edgeId: idAsk,
            link: macro('button_interview', label.nodeId)
        } },
        { v: 's', w: 'a', label: {
            type: EDGE_TESTIMONY,
            prereq: { traversed: idAsk },
            text: macro('mystery_testimony', label.nodeId),
            dot: { label: EDGE_TESTIMONY, style: 'dashed', color: 'gray' }
        } }
      ]
    }
  }, opts)
}

// --- socialLock ---------------------------------------------------------

// The key-and-lock primitive in social clothing, and the direct analogue of
// dungeonPrimitives.keyDoor. A suspect will not tell you X until you have
// learned Y about them.
//
//   a --path--> b   =>
//     a --path{edgeId}--> suspect            (go and ask them)
//     suspect --backtrack--> a               (they give you nothing; leave)
//     suspect --interview{prereq.pairId}--> b   (the confrontation: LOCKED)
//     b --backtrack--> suspect               (back out through them)
//     a --leverage--> secret                 (the trail to what they are hiding)
//     secret --return{prereq.visited}--> a   (back to where you started)
//
// The a->secret edge is the nesting point: type `leverage`, and crucially
// NO edgeId. Two consequences. First, the refine stage (which rewrites
// `path`) leaves it alone, so a corridor of testimony never turns into a
// monster. Second, `socialLock({nest: true})` matches exactly that shape,
// so the secret can itself be put behind a person. The secret's way back is
// a `return` gated on having visited `a` (rather than a `backtrack` gated on
// a forward edgeId) precisely BECAUSE the forward edge has no id — and the
// gate is trivially satisfied for anyone standing on the secret, since they
// came through `a` to get there.
//
// opts:
//   idRole   — id qualifier; must differ between stages (see idExpr)
//   chain    — name a deduction chain, and stamp `frontier: true` on the
//              secret so the nest rule can find it. Omit for a decorative
//              one-off lock that must NOT be deepened.
//   nest     — match a frontier `leverage` edge instead of a `path` edge:
//              interpose a suspect in front of a secret you were about to
//              collect. This is what makes nestingDepth > 1 reachable by
//              construction rather than by luck.
function socialLock (opts) {
  opts = opts || {}
  const idRole = opts.idRole || 'lock'
  const pathType = opts.pathType || dp.EDGE_PATH
  const backtrackType = opts.backtrackType || dp.EDGE_BACKTRACK
  const returnType = opts.returnType || dp.EDGE_RETURN
  const winType = opts.winType || dp.NODE_WIN
  const secretType = opts.secretType || NODE_SECRET
  const nest = !!opts.nest
  const chain = opts.chain || null

  // One shared id for the lock and its key, derived from the iteration
  // counter exactly as keyDoor derives `pair_<n>`. Shifted by 1 so that
  // iteration 0 does not produce an empty-looking suffix.
  const pairId = { $eval: '"secret_' + idRole + '_" + ($$iter + 1)' }
  const suspectNid = idExpr('sus', idRole)
  const secretNid = idExpr('sec', idRole)
  const idAsk = askEdgeIdExpr(idRole)
  const idTell = idExpr('e_tell', idRole)
  const castRole = roleExpr()
  const fact = factExpr()

  // Slots 2, 9 (the closed door and the open one) live on the person.
  const suspectLbl = suspectLabel({ idRole: idRole })
  suspectLbl.pairId = pairId
  suspectLbl.castRole = castRole
  suspectLbl.hiding = fact
  suspectLbl.evasionText = macro('mystery_evasion', pairId)
  suspectLbl.openText = macro('mystery_changed_manner', pairId)
  suspectLbl.dot = { label: { $eval: '"suspect (" + "secret_' + idRole + '_" + ($$iter + 1) + ")"' },
                     shape: 'box', color: 'purple' }

  // Slots 3-6 live on the secret. They line up one-for-one with the Story
  // IR's `items` entries (description / takeText / carryText), because a
  // fact you are carrying around unspoken is, to an exporter, an item.
  const secretLbl = {
    type: secretType,
    nodeId: secretNid,
    pairId: pairId,
    // Counted by the accusation's evidence gate, and by lockAnalysis.
    evidence: 1,
    // What the fact IS, as short deterministic text — distinct from
    // `secretText`, which is the narrator's rendering of the same fact.
    fact: fact,
    about: castRole,
    // Same macro expression as secretSiteText: the node's primary
    // description IS where the secret was found. Identical prompt, so the
    // runner's prompt-hash cache serves the second call for free.
    text: macro('mystery_secret_site', pairId),
    secretSiteText: macro('mystery_secret_site', pairId),
    secretText: macro('mystery_secret', pairId),
    learnText: macro('mystery_learn_secret', pairId),
    knowText: macro('mystery_know_secret', pairId),
    dot: { label: { $eval: '"secret (" + "secret_' + idRole + '_" + ($$iter + 1) + ")"' },
           shape: 'diamond', color: 'darkgreen' }
  }
  // The nest variant inherits the chain name off the secret it displaces,
  // so a caller only has to name the chain once, when seeding it.
  if (chain || nest) {
    const chainName = nest ? '${b.match.chain[1]}' : chain
    secretLbl.chain = chainName
    suspectLbl.chain = chainName
    // Depth 1 for a chain the base rule seeds; the nest rule reads this off
    // the secret it is displacing and adds one.
    secretLbl.chainDepth = nest ? { $eval: '($b.label.chainDepth || 1) + 1' } : 1
    suspectLbl.chainDepth = secretLbl.chainDepth
    // Exactly one secret carries the frontier at a time, which is what keeps
    // the deduction chain linear instead of bushy.
    secretLbl.frontier = true
  }

  // Slots 1, 7, 8, 10 plus the directive live on the locked edge itself.
  // `link` duplicates confrontText because label.link IS the button text in
  // the play engine's phrasebook (same reasoning, and the same duplication,
  // as keyDoor's `unlock`).
  const confront = macro('mystery_confront', pairId)
  const preface = macro('mystery_ask_now', pairId)
  const interviewLbl = {
    type: EDGE_INTERVIEW,
    edgeId: idTell,
    pairId: pairId,
    lockedText: macro('mystery_locked_question', pairId),
    leverageText: macro('mystery_recognise_leverage', pairId),
    confrontText: confront,
    prefaceText: preface,
    noteText: macro(DIRECTIVE_SLOT.macro, pairId),
    // The blackmail note that created this lock. See directive() above.
    directive: directive({ to: castRole, ctx: pairId }),
    link: confront,
    prereq: {
      pairId: pairId,
      // The play engine prints prereq.link as the unlock affordance and
      // prereq.after as the narration once it is taken; keeping the same
      // expressions here means the engine needs no mystery-specific code.
      link: confront,
      recognition: macro('mystery_recognise_leverage', pairId),
      after: preface
    },
    dot: { label: { $eval: '"interview (" + "secret_' + idRole + '_" + ($$iter + 1) + ")"' },
           style: 'bold', color: 'red' }
  }

  // The nest variant matches the bare `leverage` trail into a frontier
  // secret; the base variant matches any `path` edge that does not end at
  // the goal. Both capture the matched edge as `e` so the approach edge can
  // inherit its edgeId and prereq — never dropping a gate, never orphaning
  // a paired backtrack.
  const lhsB = nest
    ? { id: 'b', label: { $and: [
        { type: secretType },
        { frontier: true },
        { chain: '(.+)' }
      ] } }
    : { id: 'b', label: { $not: { type: winType } } }
  const lhsEdgeType = nest ? EDGE_LEVERAGE : pathType

  const rhsB = nest
    // Taking the frontier off the displaced secret is what stops the chain
    // from forking: after this fires, the only nestable secret in the graph
    // is the new one.
    ? { id: 'b', update: { frontier: false } }
    : { id: 'b' }

  return withOpts({
    name: nest ? ('social-lock-nest-' + idRole) : ('social-lock-' + idRole),
    lhs: {
      node: [
        // `a` needs a nodeId so the secret's return edge can be gated on
        // having visited it, and must not be the goal (which takes no
        // outgoing edges).
        { id: 'a', label: { $and: [{ nodeId: '(.+)' }, { $not: { type: winType } }] } },
        lhsB
      ],
      edge: [{ v: 'a', w: 'b', label: { type: lhsEdgeType }, id: 'e' }]
    },
    rhs: {
      node: [
        { id: 'a' },
        rhsB,
        { id: 's', label: suspectLbl },
        { id: 'k', label: secretLbl }
      ],
      edge: [
        // Approach. $extend drops `prereq` when the matched edge had none.
        { v: 'a', w: 's', label: {
            $extend: [
              { type: pathType,
                edgeId: idAsk,
                link: macro('button_interview', suspectNid) },
              { prereq: { $eval: '$e.label.prereq' } }
            ]
        } },
        { v: 's', w: 'a', label: {
            type: backtrackType,
            prereq: { traversed: idAsk },
            dot: { label: backtrackType, style: 'dashed', color: 'gray' }
        } },
        // The lock.
        { v: 's', w: 'b', label: interviewLbl },
        // Back out through the suspect once they have talked. Gated on the
        // interview rather than double-gated on the secret: having traversed
        // the interview already implies you had the leverage.
        { v: 'b', w: 's', label: {
            type: backtrackType,
            prereq: { traversed: idTell },
            dot: { label: backtrackType, style: 'dashed', color: 'gray' }
        } },
        // The key, and the nesting point. No edgeId, by design.
        { v: 'a', w: 'k', label: {
            type: EDGE_LEVERAGE,
            link: macro('button_passage', secretNid),
            dot: { label: EDGE_LEVERAGE, style: 'dotted', color: 'darkgreen' }
        } },
        { v: 'k', w: 'a', label: {
            type: returnType,
            prereq: { visited: '${a.match.nodeId[1]}' },
            dot: { label: returnType, style: 'dashed', color: 'gray' }
        } }
      ]
    }
  }, opts)
}

// --- accusation ---------------------------------------------------------

// The murderer is not chosen by a coin toss; they are chosen structurally,
// as the suspect at the bottom of the deduction chain — the one whose
// interview is gated by the deepest secret, and therefore the last person
// in the house you can make talk. That is the genre's own convention, it
// needs no extra entropy, and it makes the chain mean something: every note
// in the dossier was sent to protect this one person.
//
// `chainDepth: 1` is the seed of the chain (the nest rule counts upward
// from it), and there is exactly one such suspect per chain.
function unmaskMurderer (opts) {
  opts = opts || {}
  const suspectType = opts.suspectType || NODE_SUSPECT
  const pattern = opts.anySuspect
    // Escape hatch: mark any un-marked suspect instead, letting the seeded
    // sampler pick. Still a pure function of the seed, just not a
    // structural one.
    ? { $and: [{ type: suspectType }, { $not: { murderer: true } }] }
    : { $and: [{ type: suspectType }, { chain: '(.+)' }, { chainDepth: 1 }] }
  return withOpts({
    name: 'unmask-murderer',
    limit: 1,
    lhs: { node: [{ id: 's', label: pattern }] },
    rhs: { node: [{ id: 's', update: { murderer: true } }] }
  }, opts)
}

// Insert the accusation node (and the dossier beside it) in front of the
// goal. Fires once; `funnelToAccusation` then redirects every other route
// to the goal through it, so that naming someone is the ONLY way the story
// ends. Without the funnel, a parallel path to `win` would let the player
// finish without ever making an accusation.
function accusationHub (opts) {
  opts = opts || {}
  const idRole = opts.idRole || 'den'
  const pathType = opts.pathType || dp.EDGE_PATH
  const backtrackType = opts.backtrackType || dp.EDGE_BACKTRACK
  const winType = opts.winType || dp.NODE_WIN
  const minEvidence = typeof opts.minEvidence === 'number' ? opts.minEvidence : 3
  const idAcc = idExpr('e_acc', idRole)
  const idEv = idExpr('e_ev', idRole)
  return withOpts({
    name: 'accusation-hub',
    limit: 1,
    lhs: {
      node: [
        { id: 'a', label: { $not: { type: winType } } },
        { id: 'w', label: { type: winType } }
      ],
      edge: [{ v: 'a', w: 'w', label: { type: pathType }, id: 'e' }]
    },
    rhs: {
      node: [
        { id: 'a' },
        // `w` must be listed even though nothing on the RHS points at it:
        // an LHS node absent from the RHS is deleted outright, and the goal
        // still needs to exist for the guilty verdict to point at.
        { id: 'w' },
        { id: 'acc', label: {
            type: NODE_ACCUSATION,
            // Hardcoded singleton ids, in the spirit of initStartGoalStage's
            // 'start' / 'win': other rules and exporters reference these.
            nodeId: 'accusation',
            minEvidence: minEvidence,
            text: macro('mystery_accusation', 'accusation'),
            dot: { label: 'accusation', shape: 'doubleoctagon', color: 'red' }
        } },
        { id: 'ev', label: {
            type: NODE_EVIDENCE,
            nodeId: 'dossier',
            text: macro('mystery_dossier', 'dossier'),
            dot: { label: 'dossier', shape: 'note', color: 'blue' }
        } }
      ],
      edge: [
        { v: 'a', w: 'acc', label: {
            type: pathType, edgeId: idAcc,
            link: macro('button_passage', 'accusation')
        } },
        { v: 'acc', w: 'a', label: {
            type: backtrackType,
            prereq: { traversed: idAcc },
            dot: { label: backtrackType, style: 'dashed', color: 'gray' }
        } },
        { v: 'acc', w: 'ev', label: {
            type: pathType, edgeId: idEv,
            link: macro('button_read_note', 'dossier')
        } },
        { v: 'ev', w: 'acc', label: {
            type: backtrackType,
            prereq: { traversed: idEv },
            dot: { label: backtrackType, style: 'dashed', color: 'gray' }
        } }
      ]
    }
  }, opts)
}

// Redirect any remaining `path` edge into the goal so that it lands on the
// accusation node instead. Runs to exhaustion after accusationHub; each
// application consumes one such edge, so it terminates.
//
// The condition refuses a source that already reaches the accusation node,
// because graphlib holds one edge per ordered pair: firing there would
// overwrite the hub's own approach edge and strand the backtrack that is
// keyed on its edgeId.
function funnelToAccusation (opts) {
  opts = opts || {}
  const idRole = opts.idRole || 'den'
  const pathType = opts.pathType || dp.EDGE_PATH
  const backtrackType = opts.backtrackType || dp.EDGE_BACKTRACK
  const winType = opts.winType || dp.NODE_WIN
  const idFun = idExpr('e_fun', idRole)
  return withOpts({
    name: 'funnel-to-accusation',
    condition: '$a.id !== $acc.id && !$$graph.hasEdge($a.id, $acc.id)',
    lhs: {
      node: [
        { id: 'a', label: { $not: { type: winType } } },
        { id: 'w', label: { type: winType } },
        { id: 'acc', label: { type: NODE_ACCUSATION } }
      ],
      edge: [{ v: 'a', w: 'w', label: { type: pathType }, id: 'e' }]
    },
    rhs: {
      node: [{ id: 'a' }, { id: 'w' }, { id: 'acc' }],
      edge: [
        { v: 'a', w: 'acc', label: {
            type: pathType, edgeId: idFun,
            link: macro('button_passage', 'accusation')
        } },
        { v: 'acc', w: 'a', label: {
            type: backtrackType,
            prereq: { traversed: idFun },
            dot: { label: backtrackType, style: 'dashed', color: 'gray' }
        } }
      ]
    }
  }, opts)
}

// One outgoing `accuse` edge per suspect, exactly one of which is correct.
//
// Two rules rather than one, because the correct and the incorrect edge
// differ in more than a flag: the correct one leads to the goal and is
// gated on having accumulated `minEvidence` secrets, the incorrect ones
// lead to their own verdict endings and are ungated. So an uninformed guess
// is always available — you may name anyone — but naming the murderer
// without the evidence to support it is not a thing the story lets you
// stumble into, which is what makes a solved case distinguishable from a
// lucky one.
//
// `accused` is stamped on each suspect as it is wired up, so the rule
// cannot fire twice on the same person.
function accuseSuspect (opts) {
  opts = opts || {}
  const idRole = opts.idRole || 'verdict'
  const guilty = !!opts.guilty
  const suspectType = opts.suspectType || NODE_SUSPECT
  const winType = opts.winType || dp.NODE_WIN
  const minEvidence = typeof opts.minEvidence === 'number' ? opts.minEvidence : 3

  const suspectPattern = { $and: [
    { type: suspectType },
    guilty ? { murderer: true } : { $not: { murderer: true } },
    { $not: { accused: true } },
    { castRole: '(.+)' },
    { suspectId: '(.+)' }
  ] }
  const accuseLink = macro('button_accuse', { $eval: '$s.label.suspectId' })

  if (guilty) {
    return withOpts({
      name: 'accuse-murderer',
      limit: 1,
      lhs: {
        node: [
          { id: 'acc', label: { type: NODE_ACCUSATION } },
          { id: 's', label: suspectPattern },
          { id: 'w', label: { type: winType } }
        ]
      },
      rhs: {
        node: [
          { id: 'acc' },
          { id: 's', update: { accused: true } },
          { id: 'w' }
        ],
        edge: [{ v: 'acc', w: 'w', label: {
            type: EDGE_ACCUSE,
            correct: true,
            accuses: '${s.match.suspectId[1]}',
            castRole: '${s.match.castRole[1]}',
            link: accuseLink,
            text: macro('mystery_verdict_right', '${s.match.suspectId[1]}'),
            // A new prereq flavor alongside pairId / traversed / visited:
            // "the player has visited at least N nodes carrying evidence".
            // The accusation node advertises the same number as
            // `minEvidence` so an exporter can render the threshold.
            prereq: { evidence: minEvidence },
            dot: { label: 'accuse (correct)', style: 'bold', color: 'darkgreen' }
        } }]
      }
    }, opts)
  }

  return withOpts({
    name: 'accuse-innocent',
    lhs: {
      node: [
        { id: 'acc', label: { type: NODE_ACCUSATION } },
        { id: 's', label: suspectPattern }
      ]
    },
    rhs: {
      node: [
        { id: 'acc' },
        { id: 's', update: { accused: true } },
        { id: 'v', label: {
            type: NODE_VERDICT,
            nodeId: idExpr('verdict', idRole),
            correct: false,
            accuses: '${s.match.suspectId[1]}',
            castRole: '${s.match.castRole[1]}',
            text: macro('mystery_verdict_wrong', '${s.match.suspectId[1]}'),
            dot: { label: 'wrong', shape: 'doublecircle', color: 'gray' }
        } }
      ],
      edge: [{ v: 'acc', w: 'v', label: {
          type: EDGE_ACCUSE,
          correct: false,
          accuses: '${s.match.suspectId[1]}',
          castRole: '${s.match.castRole[1]}',
          link: accuseLink,
          dot: { label: 'accuse', color: 'gray' }
      } }]
    }
  }, opts)
}

// File one blackmail note in the dossier: an edge from the evidence node to
// the person the note was sent to, carrying the directive copied off the
// lock that the note created.
//
// This is the payoff of the conceit. Each entry is gated on the pairId of
// the lock it describes, so the dossier fills in as the player solves —
// which also means it can never be read as a shortcut, since you only ever
// see the note for a lock you have already opened. Reaching a suspect was
// never the puzzle anyway; the puzzle is the interview edge OUT of them,
// and that stays gated.
function dossierEntry (opts) {
  opts = opts || {}
  const suspectType = opts.suspectType || NODE_SUSPECT
  return withOpts({
    name: 'dossier-entry',
    condition: '!$$graph.hasEdge($ev.id, $s.id)',
    lhs: {
      node: [
        { id: 'ev', label: { type: NODE_EVIDENCE } },
        { id: 's', label: { $and: [
          { type: suspectType },
          { pairId: '(.+)' },
          { $not: { filed: true } }
        ] } },
        { id: 't' }
      ],
      // Read the directive off the lock rather than off the person: the note
      // is a property of the instruction, and the instruction is the edge.
      edge: [{ v: 's', w: 't', label: { type: EDGE_INTERVIEW }, id: 'i' }]
    },
    rhs: {
      node: [
        { id: 'ev' },
        { id: 's', update: { filed: true } },
        { id: 't' }
      ],
      edge: [
        'i',
        { v: 'ev', w: 's', label: {
            type: EDGE_DIRECTIVE,
            directive: { $eval: '$i.label.directive' },
            noteText: { $eval: '$i.label.noteText' },
            link: macro('button_read_note', '${s.match.pairId[1]}'),
            prereq: { pairId: '${s.match.pairId[1]}' },
            dot: { label: 'note', style: 'dotted', color: 'blue' }
        } }
      ]
    }
  }, opts)
}

// The terminal structure, as an ordered ARRAY OF STAGES rather than a
// single rule — it needs four passes that must not interleave:
//
//   1. denouement — plant the accusation node, then funnel every route to
//                   the goal through it.
//   2. unmask     — settle who did it. Must complete before any verdict is
//                   wired, or `accuse-innocent` could claim the murderer
//                   before they are marked and leave no correct edge at all.
//   3. verdicts   — one accuse edge per suspect.
//   4. dossier    — file the notes.
//
// Splice into a grammar with `stages.concat(accusation({...}))`.
function accusation (opts) {
  opts = opts || {}
  const minEvidence = typeof opts.minEvidence === 'number' ? opts.minEvidence : 3
  return [
    { name: 'denouement',
      rules: [
        accusationHub({ idRole: 'den', minEvidence: minEvidence, weight: 1 }),
        funnelToAccusation({ idRole: 'den', weight: 1 })
      ] },
    { name: 'unmask',
      rules: [unmaskMurderer({ anySuspect: opts.anySuspect, weight: 1 })] },
    { name: 'verdicts',
      rules: [
        accuseSuspect({ idRole: 'verdict', guilty: true, minEvidence: minEvidence, weight: 1 }),
        accuseSuspect({ idRole: 'verdict', guilty: false, weight: 1 })
      ] },
    { name: 'dossier',
      rules: [dossierEntry({ weight: 1 })] }
  ]
}

// --- analysis -----------------------------------------------------------

// Is this edge walkable in the given state? The four prereq flavors are
// the three the README documents (pairId / traversed / visited) plus
// `evidence`, introduced by the accusation's correct edge.
function prereqSatisfied (prereq, state) {
  if (!prereq) return true
  if (prereq.pairId && !state.keys.has(prereq.pairId)) return false
  if (prereq.visited && !state.visited.has(prereq.visited)) return false
  if (prereq.traversed && !state.traversed.has(prereq.traversed)) return false
  if (typeof prereq.evidence === 'number' && state.evidence < prereq.evidence) return false
  return true
}

// Everything the player can reach holding exactly `keys`, as a monotone
// closure. Traversal and visit gates are simulated honestly rather than
// waved through: a `return` edge whose destination has not been visited is
// shut, so a cycle-closing shortcut cannot be mistaken for a way INTO a
// region the player has never been. Getting that wrong would silently
// under-report nesting depth.
function reachableWith (graph, keys, opts) {
  opts = opts || {}
  const startType = opts.startType || dp.NODE_START
  const start = graph.nodes().find(function (n) {
    return (graph.node(n) || {}).type === startType
  })
  const state = { keys: new Set(keys), visited: new Set(), traversed: new Set(), evidence: 0 }
  const reached = new Set()
  function arrive (n) {
    if (reached.has(n)) return false
    reached.add(n)
    const l = graph.node(n) || {}
    if (l.nodeId) state.visited.add(l.nodeId)
    if (typeof l.evidence === 'number') state.evidence += l.evidence
    return true
  }
  if (typeof start === 'undefined') return { reached, state }
  arrive(start)
  let changed = true
  while (changed) {
    changed = false
    graph.edges().forEach(function (e) {
      if (!reached.has(e.v)) return
      const l = graph.edge(e) || {}
      if (!prereqSatisfied(l.prereq, state)) return
      if (l.edgeId && !state.traversed.has(l.edgeId)) {
        state.traversed.add(l.edgeId)
        changed = true
      }
      if (arrive(e.w)) changed = true
    })
  }
  return { reached, state }
}

// How deeply nested are this graph's locks? Answered by simulation, not by
// counting rule applications — which is the point, since the question a
// test wants answered is whether the PLAYER has to solve one lock to get at
// the key for the next.
//
// Each round: work out everything reachable with the keys held so far, then
// collect every secret standing in that region. The number of rounds that
// yield at least one new key is the depth of the deepest dependency chain.
// A flat mystery whose secrets all lie in the open finishes in one round.
//
// Returns { rounds, chain, keys, reached }, where `chain` lists the pairIds
// acquired in each round, in order — so a failing test can print the actual
// shape of the deduction rather than just a number.
function lockAnalysis (graph, opts) {
  opts = opts || {}
  const secretType = opts.secretType || NODE_SECRET
  const keys = new Set()
  const chain = []
  let last = reachableWith(graph, keys, opts)
  for (;;) {
    const fresh = []
    last.reached.forEach(function (n) {
      const l = graph.node(n) || {}
      if (l.type === secretType && l.pairId && !keys.has(l.pairId)) fresh.push(l.pairId)
    })
    if (!fresh.length) break
    fresh.sort()
    chain.push(fresh)
    fresh.forEach(function (p) { keys.add(p) })
    last = reachableWith(graph, keys, opts)
  }
  return { rounds: chain.length, chain: chain, keys: keys, reached: last.reached }
}

// Convenience: just the number. `budget.nestingDepth` is the contract this
// is measured against.
function nestingDepth (graph, opts) {
  return lockAnalysis(graph, opts).rounds
}

module.exports = {
  // rule factories
  stampCastSalt,
  suspect,
  socialLock,
  directive,
  accusation,
  accusationHub,
  funnelToAccusation,
  unmaskMurderer,
  accuseSuspect,
  dossierEntry,
  // analysis
  lockAnalysis,
  nestingDepth,
  reachableWith,
  prereqSatisfied,
  // vocabulary
  ROLES,
  SECRETS,
  DIRECTIVE_ACTS,
  MYSTERY_MACROS,
  SOCIAL_LOCK_SLOTS,
  DIRECTIVE_SLOT,
  // type constants
  NODE_SCENE,
  NODE_SUSPECT,
  NODE_SECRET,
  NODE_EVIDENCE,
  NODE_ACCUSATION,
  NODE_VERDICT,
  EDGE_INTERVIEW,
  EDGE_LEVERAGE,
  EDGE_TESTIMONY,
  EDGE_DIRECTIVE,
  EDGE_ACCUSE
}
