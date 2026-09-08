// The Story IR: the narrow waist between graph generation and story export.
//
// `buildStoryIR` is the ONLY thing in the codebase that knows both the
// graphlib label conventions of `dungeon-primitives.js` and the export
// contract of `docs/spec/story-ir.md`. Every exporter reads the IR and
// nothing else, so a new dungeon primitive costs one change here rather
// than one change per target.
//
// Two invariants drive most of the code below:
//
//   * determinism — the same graph and opts must produce byte-identical
//     JSON. Nothing here reads the clock, hashes an object identity, or
//     iterates a container whose order depends on graphlib internals.
//     Every ordering decision is an explicit sort.
//   * total safety of names — nodeIds and edgeIds come from grammar
//     templates (`{$eval: '"room_" + ($$iter + 1)'}` and friends), so as
//     far as ChoiceScript is concerned they are untrusted input. Every id
//     that reaches the IR goes through an allocator that sanitizes, avoids
//     reserved words, and disambiguates collisions.
//
// See `docs/spec/graph-to-ir.md` for the mapping table in prose.

const IR_VERSION = 1

const PKG_VERSION = (function () {
  try { return require('./package.json').version } catch (e) { return '0.0.0' }
})()

const { pickTheme } = require('./themes')

// --- charsets and reserved words ---------------------------------------

const ID_RE = /^[A-Za-z_][A-Za-z0-9_]*$/
const VAR_RE = /^[a-z][a-z0-9_]*$/

// ChoiceScript is the strictest of the three targets: it is the only one
// with a single namespace shared between commands and variables, so a
// `*create goto` is a parse error rather than a shadowed binding. Twine and
// Inform 7 tolerate every name in this list, so avoiding the union costs
// nothing and keeps one variable table valid for all three exporters.
const RESERVED = (
  'abort achieve achievement advertisement allow_reuse and author auto bug ' +
  'check_achievements check_purchase check_registration choice comment config ' +
  'create create_array delete disable_reuse else elseif elsif ending fake_choice ' +
  'feedback finish gosub gosub_scene goto goto_random_scene goto_scene hide_reuse ' +
  'if ifid image implicit_control_flow input_number input_text label length ' +
  'line_break link log login modulo more_games not or page_break params print ' +
  'purchase rand redirect_scene reset restore_game restore_purchases return round ' +
  'save_game scene_list script selectable_if set setref share_this_game ' +
  'show_password sound stat stat_chart subscribe temp temp_array text_image ' +
  'timestamp title true false'
).split(' ').reduce(function (acc, w) { acc[w] = true; return acc }, Object.create(null))

// `choice_*` is reserved wholesale by ChoiceScript for engine state
// (choice_randomtest, choice_purchased_<sku>, ...), so the prefix test has
// to be a prefix test and not a membership test.
function isReservedName (name) {
  return !!RESERVED[name] || /^choice_/.test(name)
}

// --- text objects ------------------------------------------------------

const TEXT_KEYS = ['first', 'repeat', 'brief', 'variants']

// Spec section 7 lets a producer emit a bare string wherever a text object
// is expected. We normalize on the way *in* rather than making every
// exporter defend itself, and we guarantee `first` is a string so an
// exporter can write `text.first` with no null check — the one field
// section 7 calls required.
function normalizeText (x) {
  if (x == null) return null
  if (typeof x === 'string') return { first: x }
  if (typeof x !== 'object') return { first: String(x) }
  const out = {}
  TEXT_KEYS.forEach(function (k) {
    if (typeof x[k] !== 'undefined' && x[k] !== null) out[k] = x[k]
  })
  // Preserve forward-compatible extras (section 7 promises a future
  // `conditions` array) rather than silently dropping them.
  Object.keys(x).forEach(function (k) {
    if (TEXT_KEYS.indexOf(k) < 0 && typeof x[k] !== 'undefined') out[k] = x[k]
  })
  if (typeof out.first !== 'string') out.first = out.first == null ? '' : String(out.first)
  return out
}

// --- identifier machinery ----------------------------------------------

function sanitizeIdent (raw) {
  const s = String(raw == null ? '' : raw)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return s === '' ? 'x' : s
}

// A memoizing, collision-resolving name allocator.
//
// Two grammar ids can legitimately sanitize to the same string ("room-1"
// and "room_1"), and one id can legitimately be asked for twice: a
// monsterBattle stamps the same inherited edgeId on all three edges that
// can stand in for the original corridor. Callers that want the repeat
// case to collapse to one name (the `took_` flag those three edges share
// must be one flag, or the paired backtrack is gated on a variable only
// one of them ever sets) pass no `memoKey` and get memoization on `raw`.
// Callers that need one name per caller — link ids, which must be unique
// even when their edgeIds are not — pass a `memoKey` that is unique per
// call site. Either way the `_2`, `_3` suffixes fall in call order, so the
// result depends on the emission order we control rather than on object
// key order.
function makeAllocator (opts) {
  opts = opts || {}
  const guard = opts.reserved
  const taken = Object.create(null)
  const memo = Object.create(null)
  return function alloc (raw, prefix, memoKey) {
    prefix = prefix || ''
    const key = prefix + '|' + String(memoKey == null ? raw : memoKey)
    if (key in memo) return memo[key]
    let base = prefix + sanitizeIdent(raw)
    if (guard && guard(base)) base = base + '_v'
    let name = base
    let n = 2
    while (name in taken) {
      name = base + '_' + n
      n++
    }
    taken[name] = true
    memo[key] = name
    return name
  }
}

// --- derived title and item flavor -------------------------------------

// FNV-1a, the same hash `themes.js` uses to pick a theme from a seed. We
// reuse it rather than the Mersenne Twister because IR construction must
// not consume RNG state: the caller may still be drawing from that
// generator, and a build must be reproducible from a graph deserialized
// from JSON with no RNG anywhere in sight.
function fnv1a (s) {
  let h = 2166136261
  const str = String(s == null ? '' : s)
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const TITLE_WORDS = [
  'Cindermoor', 'Ashfell', 'Vellamere', 'Hollowgate', 'Rookswater', 'Thornhaven',
  'Grimsby', 'Marrowdeep', 'Saltrend', 'Winterhollow', 'Blackmarch', 'Duskmoor',
  'Ravenscar', 'Stonewake', 'Fenwick', 'Lowbarrow', 'Cragmouth', 'Emberwild',
  'Nightfen', 'Coldharbour', 'Greyferry', 'Tallowmere', 'Umbermoor', 'Wraithing'
]

// One noun per theme, so a derived title reads as belonging to the world
// the narrator is writing in instead of every theme producing "The X Vault".
const THEME_NOUNS = {
  space_opera: 'Drift',
  gothic_horror: 'Vault',
  high_fantasy: 'Keep',
  steampunk: 'Works',
  post_apocalyptic: 'Waste',
  cosmic_horror: 'Abyss',
  cyberpunk: 'Grid',
  dark_fairy_tale: 'Wood',
  pirate_adventure: 'Reach',
  eldritch_deep_sea: 'Trench'
}

function deriveTitle (theme, seed) {
  const word = TITLE_WORDS[fnv1a('title:' + seed) % TITLE_WORDS.length]
  return 'The ' + word + ' ' + (THEME_NOUNS[theme] || 'Vault')
}

function slugify (s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'story'
}

const KEY_ADJECTIVES = [
  'brass', 'iron', 'bone', 'silver', 'tarnished', 'copper',
  'glass', 'blackened', 'verdigris', 'ivory', 'leaden', 'pitted'
]

function titleize (s) {
  return String(s == null ? '' : s)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[a-z]/g, function (c) { return c.toUpperCase() }) || 'Untitled'
}

// Inform 7 will write "The player carries <name>", so the name has to be a
// noun phrase with its article, and two keys in one story must not share
// one. The adjective is chosen by hash so it is stable across builds, then
// linearly probed so a hash collision degrades to a different adjective
// rather than to two indistinguishable keys.
function keyName (pairId, usedAdjectives) {
  const start = fnv1a('item:' + pairId) % KEY_ADJECTIVES.length
  for (let i = 0; i < KEY_ADJECTIVES.length; i++) {
    const adj = KEY_ADJECTIVES[(start + i) % KEY_ADJECTIVES.length]
    if (!usedAdjectives[adj]) {
      usedAdjectives[adj] = true
      return 'the ' + adj + ' key'
    }
  }
  return 'the ' + sanitizeIdent(pairId).replace(/_/g, ' ') + ' key'
}

// --- graph label vocabulary --------------------------------------------

// Deliberately duplicated from dungeon-primitives rather than imported: the
// IR builder must be able to consume a graph deserialized from JSON, built
// by a grammar that never loaded the primitives module. These are
// wire-format strings, not shared constants.
const T_START = 'start'
const T_DOOR = 'door'
const T_RANDOM = 'random'
const T_KEY = 'key'
const T_POTION = 'potion'

const E_BACKTRACK = 'backtrack'
const E_RETURN = 'return'
const E_RETREAT = 'retreat'
const E_CONSEQUENCE = 'consequence'

const ROLE_BY_TYPE = {
  start: 'start',
  win: 'ending',
  death: 'death',
  // `loss` is dagPrimitives' consolation sink: the player took the arm of the
  // fork that did not have the key, reached the join, and cannot go on. It is
  // terminal and it is not a win, which is exactly the `death` role — the name
  // is about how the story ends, not about the character's pulse. Mapping it to
  // `ending` instead would make story-solver.js report an unwinnable map as
  // winnable, because it counts any reachable non-death ending as a victory.
  loss: 'death',
  random: 'random',
  choice: 'choice',
  key: 'item',
  potion: 'item'
}

// A link with neither `label.link` nor `dot.label` still needs a caption: a
// blank affordance is unclickable in Twine and invisible in ChoiceScript.
// These are verb-first and target-agnostic.
const TYPE_AFFORDANCE = {
  path: 'Continue',
  passage: 'Continue',
  backtrack: 'Go back',
  return: 'Go back the long way',
  retreat: 'Retreat',
  choice: 'Choose this',
  monster: 'Face it',
  puzzle: 'Try the puzzle',
  consequence: 'Continue'
}

function affordanceForType (type) {
  return TYPE_AFFORDANCE[type] || titleize(type || 'continue')
}

// --- ordering helpers ---------------------------------------------------

// Host ids are graphlib's node keys. The primitives mint them as decimal
// counters, so numeric order is authoring order; anything non-numeric sorts
// after, lexically, so a hand-seeded graph with string keys still orders
// deterministically rather than by NaN comparison.
function compareHostIds (a, b) {
  const na = Number(a)
  const nb = Number(b)
  const aNum = a !== '' && isFinite(na)
  const bNum = b !== '' && isFinite(nb)
  if (aNum && bNum) return na - nb
  if (aNum) return -1
  if (bNum) return 1
  return a < b ? -1 : (a > b ? 1 : 0)
}

// Presentation buckets. A player offered "Go back" as their first option
// will take it, so returns sort last; a locked door sorts between the
// forward moves and the returns, because it is a forward move the player
// cannot make yet.
function presentationBucket (label) {
  const t = label.type
  if (t === E_BACKTRACK || t === E_RETURN || t === E_RETREAT) return 2
  if (label.prereq && label.prereq.pairId != null) return 1
  return 0
}

function positiveWeight (w) {
  return (typeof w === 'number' && isFinite(w) && w > 0) ? w : 1
}

// --- passage field derivation -------------------------------------------

function passageText (label, title) {
  const t = normalizeText(label.text)
  if (t) return t
  // dot.label is a debug caption, but "you died" beats an empty passage,
  // and dotDecorationStage guarantees it exists on a fully built graph.
  const d = normalizeText(label.dot && label.dot.label)
  if (d) return d
  return { first: title }
}

function passageStatus (label) {
  if (label.type === T_KEY && label.pairId != null) return 'Key (' + label.pairId + ')'
  if (label.type === T_DOOR && label.pairId != null) return 'Door (' + label.pairId + ')'
  if (label.type === T_POTION && typeof label.healValue === 'number') {
    return 'Potion (+' + Math.round(label.healValue * 100) + ')'
  }
  return null
}

function passageTags (label, role) {
  const tags = []
  function push (t) {
    if (t && tags.indexOf(t) < 0) tags.push(t)
  }
  push(label.type != null ? String(label.type) : null)
  if (role === 'ending') push('ending')
  if (role === 'death') {
    push('ending')
    push('death')
  }
  if (role === 'item') push('item')
  // Set-piece provenance: `beat` numbers a showpiece's steps and `role`
  // marks its decline / bypass exits. Carried as tags so an exporter can
  // style a showpiece without the IR growing a set-piece-shaped field.
  if (typeof label.beat === 'number') push('beat_' + label.beat)
  if (typeof label.role === 'string') push(label.role)
  return tags
}

function linkAffordance (label) {
  const explicit = normalizeText(label.link)
  if (explicit && explicit.first !== '') return explicit
  const dotted = normalizeText(label.dot && label.dot.label)
  if (dotted && dotted.first !== '') return dotted
  return { first: affordanceForType(label.type) }
}

// `before` is the approach ("You see a passage."); `prereq.after` is what
// happens once the lock yields ("The key turns."). Both print on the same
// successful traversal, in that order, so they concatenate — `after` is
// unreachable when the condition fails, which is exactly when `closedText`
// takes over.
function traversalText (label, prereq) {
  const parts = []
  const before = normalizeText(label.before)
  if (before && before.first !== '') parts.push(before.first)
  const after = prereq ? normalizeText(prereq.after) : null
  if (after && after.first !== '') parts.push(after.first)
  if (parts.length === 0) return null
  return { first: parts.join(' ') }
}

// --- the builder --------------------------------------------------------

// graph: a graphlib.Graph, typically `new Grammar(...).evolve(...).graph`.
// opts: { id, title, seed, theme, grammar, topology, puzzles, budget }.
//       Everything is optional; see the derivation notes inline.
function buildStoryIR (graph, opts) {
  opts = opts || {}
  if (!graph || typeof graph.nodes !== 'function') {
    throw new Error('buildStoryIR: expected a graphlib Graph')
  }

  const hosts = graph.nodes().slice().sort(compareHostIds)
  const labelOf = {}
  const outEdgesOf = {}
  hosts.forEach(function (v) {
    const l = graph.node(v)
    labelOf[v] = (l && typeof l === 'object') ? l : {}
    outEdgesOf[v] = (graph.outEdges(v) || []).slice()
  })

  const seed = typeof opts.seed === 'number' ? opts.seed : 0
  const theme = opts.theme || pickTheme(seed)

  // Roles are settled before ids because the sink rule needs out-degree.
  const roleOf = {}
  hosts.forEach(function (v) {
    let role = ROLE_BY_TYPE[labelOf[v].type] || 'normal'
    // The spec forbids a role-less sink: an exporter must know where to
    // stop, and "normal passage with nothing to click" is a soft-lock
    // rather than an ending. Promote it. Stranger sinks (a `random` node
    // with nothing to roll) are left alone for validateStoryIR to report,
    // because silently retyping them would hide a generator bug.
    if (role === 'normal' && outEdgesOf[v].length === 0) role = 'ending'
    roleOf[v] = role
  })

  const startHost = pickStartHost(hosts, labelOf, graph)
  const order = bfsOrder(hosts, startHost, outEdgesOf)

  // Ids are allocated in emission order, so the `_2` disambiguation
  // suffixes land on the later of two colliding ids as read down the file.
  const ids = makeAllocator()
  const passageId = {}
  order.forEach(function (v) {
    const l = labelOf[v]
    // Memoized on the host id, not the nodeId: a grammar that stamps one
    // nodeId onto two nodes must still get two passages, or one of them
    // silently vanishes from the story.
    passageId[v] = ids(l.nodeId != null ? l.nodeId : v, 'P_', v)
  })

  // --- variable table ---------------------------------------------------
  // hp and moves are allocated first so that a nodeId of "hp" cannot steal
  // the name the potion and damage effects are about to reference.
  const vars = makeAllocator({ reserved: isReservedName })
  const varRecords = []
  function declare (name, kind, ref, init, rank) {
    varRecords.push({ name: name, kind: kind, ref: ref, init: init, rank: rank, seq: varRecords.length })
    return name
  }
  const hpVar = declare(vars('hp', ''), 'number', null, 100, 0)
  const movesVar = declare(vars('moves', ''), 'counter', null, 0, 1)

  const seenVarOf = {}
  function seenVar (rawId) {
    if (!(rawId in seenVarOf)) {
      seenVarOf[rawId] = declare(vars(rawId, 'seen_'), 'visited', String(rawId), false, 3)
    }
    return seenVarOf[rawId]
  }
  const tookVarOf = {}
  function tookVar (rawId) {
    if (!(rawId in tookVarOf)) {
      tookVarOf[rawId] = declare(vars(rawId, 'took_'), 'traversed', String(rawId), false, 4)
    }
    return tookVarOf[rawId]
  }

  const items = []
  const itemByPair = {}
  const usedAdjectives = Object.create(null)
  // A door's prereq can name a pairId before the walk reaches the matching
  // key node, so an item is created on first mention from either side and
  // its prose filled in when (if ever) the key node itself turns up.
  function item (pairId, keyLabel) {
    if (!(pairId in itemByPair)) {
      const rec = {
        id: String(pairId),
        var: declare(vars(pairId, 'has_'), 'item', String(pairId), false, 2),
        name: keyName(pairId, usedAdjectives),
        description: null,
        takeText: null,
        carryText: null
      }
      itemByPair[pairId] = rec
      items.push(rec)
    }
    const rec = itemByPair[pairId]
    if (keyLabel && rec.description === null) {
      rec.description = normalizeText(keyLabel.text)
      rec.takeText = normalizeText(keyLabel.text)
    }
    return rec
  }

  // --- passages ---------------------------------------------------------
  const passages = []
  const passageByHost = {}
  order.forEach(function (v) {
    const l = labelOf[v]
    const role = roleOf[v]
    // A node with no nodeId still needs a stable identity for its `seen_`
    // flag; the host id is the only other thing that is unique per node.
    const nodeKey = l.nodeId != null ? l.nodeId : v
    const title = l.nodeId != null ? titleize(l.nodeId) : (titleize(l.type || 'passage') + ' ' + v)

    const onEnter = [{ op: 'set', var: seenVar(nodeKey), value: true }]
    if (l.type === T_KEY && l.pairId != null) {
      onEnter.push({ op: 'acquire', item: item(l.pairId, l).id })
    }
    if (l.type === T_POTION && typeof l.healValue === 'number') {
      // healValue is authored on a 0..1 scale (a fraction of full health)
      // while hp is a 0..100 counter, so the scale factor lives here rather
      // than being rediscovered by each of the three exporters.
      onEnter.push({ op: 'add', var: hpVar, value: Math.round(l.healValue * 100) })
    }

    const p = {
      id: passageId[v],
      hostId: String(v),
      nodeId: l.nodeId != null ? String(l.nodeId) : null,
      type: l.type != null ? String(l.type) : null,
      role: role,
      title: title,
      text: passageText(l, title),
      status: passageStatus(l),
      onEnter: onEnter,
      links: [],
      tags: passageTags(l, role)
    }
    passages.push(p)
    passageByHost[v] = p
  })

  // --- links ------------------------------------------------------------
  const links = []
  order.forEach(function (v) {
    const src = passageByHost[v]
    const srcLabel = labelOf[v]
    const edges = outEdgesOf[v].slice()
    // Presentation order first, then a total order on everything else, so
    // that two runs of the same seed emit the same link sequence even
    // though graphlib makes no promise about outEdges ordering.
    edges.sort(function (a, b) {
      const la = graph.edge(a) || {}
      const lb = graph.edge(b) || {}
      const bucket = presentationBucket(la) - presentationBucket(lb)
      if (bucket !== 0) return bucket
      const host = compareHostIds(a.w, b.w)
      if (host !== 0) return host
      const ta = String(la.type || '')
      const tb = String(lb.type || '')
      if (ta !== tb) return ta < tb ? -1 : 1
      const ea = String(la.edgeId == null ? '' : la.edgeId)
      const eb = String(lb.edgeId == null ? '' : lb.edgeId)
      return ea < eb ? -1 : (ea > eb ? 1 : 0)
    })

    edges.forEach(function (e) {
      const l = graph.edge(e) || {}
      // The graph is not a multigraph, so (v, w) identifies the edge even
      // when several edges share an edgeId.
      const memoKey = String(e.v) + '>' + String(e.w)
      const id = l.edgeId != null
        ? ids(l.edgeId, 'L_', memoKey)
        : ids(memoKey, 'L_', memoKey)
      // A consequence edge is rolled by the engine; so is anything leaving
      // a random node, whatever the grammar called the edge type.
      const kind = (l.type === E_CONSEQUENCE || srcLabel.type === T_RANDOM) ? 'random' : 'choice'

      const prereq = (l.prereq && typeof l.prereq === 'object') ? l.prereq : null
      let condition = null
      let closedText = null
      // A lock the player cannot see is a lock they cannot solve, so a
      // pairId gate always renders; a backtrack or return they have not
      // earned is a route they have not discovered, so it stays hidden.
      let whenBlocked = 'show'
      if (prereq && prereq.pairId != null) {
        condition = { all: [{ var: item(prereq.pairId, null).var, is: true }] }
        // The spec's "description of the closed door" is the door itself:
        // a locked edge is sourced *at* the door node, so the source's own
        // text is what the player is standing in front of and failing to
        // open.
        closedText = normalizeText(srcLabel.text)
      } else if (prereq && prereq.traversed != null) {
        condition = { all: [{ var: tookVar(prereq.traversed), is: true }] }
        whenBlocked = 'hide'
      } else if (prereq && prereq.visited != null) {
        condition = { all: [{ var: seenVar(prereq.visited), is: true }] }
        whenBlocked = 'hide'
      }

      const onTraverse = []
      if (l.edgeId != null) onTraverse.push({ op: 'set', var: tookVar(l.edgeId), value: true })
      onTraverse.push({ op: 'add', var: movesVar, value: 1 })
      if (l.type === E_CONSEQUENCE && typeof l.playerDamage === 'number' && l.playerDamage > 0) {
        // Rounded because 0.7 * 100 is not 70 in binary floating point, and
        // a stray 70.00000000000001 in the JSON would break the
        // byte-identical reproducibility contract on a different platform.
        onTraverse.push({ op: 'add', var: hpVar, value: -Math.round(l.playerDamage * 100) })
      }

      links.push({
        id: id,
        edgeId: l.edgeId != null ? String(l.edgeId) : null,
        from: src.id,
        to: passageByHost[e.w] ? passageByHost[e.w].id : null,
        type: l.type != null ? String(l.type) : null,
        kind: kind,
        weight: positiveWeight(l.weight),
        linkText: linkAffordance(l),
        text: traversalText(l, prereq),
        closedText: closedText,
        condition: condition,
        whenBlocked: whenBlocked,
        onTraverse: onTraverse
      })
      src.links.push(id)
    })
  })

  // --- meta -------------------------------------------------------------
  const title = opts.title || deriveTitle(theme, seed)
  // Topology and puzzles are measured, not asserted: a caller who passes
  // `topology: 'dag'` for a graph with cycles gets their claim recorded and
  // then rejected by validateStoryIR, which is the right place to find out.
  const topology = opts.topology || (findCycle(passages, links) ? 'bidirectional' : 'dag')
  const puzzles = typeof opts.puzzles === 'boolean'
    ? opts.puzzles
    : links.some(function (l) { return l.condition !== null })

  return {
    irVersion: IR_VERSION,
    meta: {
      title: title,
      id: opts.id || slugify(title),
      seed: seed,
      theme: theme,
      grammar: opts.grammar == null ? null : String(opts.grammar),
      generator: 'graphgram ' + PKG_VERSION,
      topology: topology,
      puzzles: puzzles,
      // A budget is a property of the generator *run*, not of the graph it
      // produced: caps that never bound anything leave no trace to recover
      // from the output. Null is the honest answer when the caller is
      // silent, and beats inventing numbers the docs site would then show.
      budget: opts.budget == null ? null : opts.budget
    },
    vars: varRecords
      .slice()
      .sort(function (a, b) { return a.rank - b.rank || a.seq - b.seq })
      .map(function (r) { return { name: r.name, kind: r.kind, ref: r.ref, init: r.init } }),
    items: items,
    passages: passages,
    links: links,
    start: passageByHost[startHost] ? passageByHost[startHost].id : null,
    endings: passages
      .filter(function (p) { return p.role === 'ending' || p.role === 'death' })
      .map(function (p) { return p.id })
  }
}

// The start node is whichever node the grammar typed `start`. Falling back
// to a source with no inbound edges keeps hand-seeded graphs (which both
// the tests and `bin/transform.js -i` produce) buildable rather than
// throwing on a graph that is otherwise perfectly exportable.
function pickStartHost (hosts, labelOf, graph) {
  for (let i = 0; i < hosts.length; i++) {
    if (labelOf[hosts[i]].type === T_START) return hosts[i]
  }
  for (let i = 0; i < hosts.length; i++) {
    if ((graph.inEdges(hosts[i]) || []).length === 0) return hosts[i]
  }
  return hosts[0]
}

// Breadth-first from start, each level sorted by host id, then whatever the
// start cannot reach appended in host order. Unreachable passages are
// emitted rather than dropped, so validateStoryIR can report them — quietly
// deleting them would turn a generator bug into a mysteriously small story.
function bfsOrder (hosts, startHost, outEdgesOf) {
  const order = []
  const seen = Object.create(null)
  if (startHost != null) {
    let frontier = [startHost]
    seen[startHost] = true
    while (frontier.length) {
      frontier.sort(compareHostIds)
      const next = []
      frontier.forEach(function (v) {
        order.push(v)
        outEdgesOf[v].forEach(function (e) {
          if (!seen[e.w]) {
            seen[e.w] = true
            next.push(e.w)
          }
        })
      })
      frontier = next
    }
  }
  hosts.forEach(function (v) {
    if (!seen[v]) order.push(v)
  })
  return order
}

// --- cycle detection ----------------------------------------------------

// Iterative three-colour DFS, returning "a -> b" for the first back edge it
// finds. Recursion would be shorter, but a generated dungeon can be
// thousands of passages deep along one corridor chain, and a stack overflow
// inside a *validator* is the worst available failure mode.
function findCycle (passages, links) {
  const out = Object.create(null)
  passages.forEach(function (p) { out[p.id] = [] })
  links.forEach(function (l) {
    if (out[l.from] && out[l.to]) out[l.from].push(l.to)
  })
  const WHITE = 0
  const GREY = 1
  const BLACK = 2
  const color = Object.create(null)
  passages.forEach(function (p) { color[p.id] = WHITE })
  for (let i = 0; i < passages.length; i++) {
    const root = passages[i].id
    if (color[root] !== WHITE) continue
    color[root] = GREY
    const stack = [{ id: root, next: 0 }]
    while (stack.length) {
      const top = stack[stack.length - 1]
      const kids = out[top.id]
      if (top.next >= kids.length) {
        color[top.id] = BLACK
        stack.pop()
        continue
      }
      const w = kids[top.next]
      top.next++
      if (color[w] === GREY) return top.id + ' -> ' + w
      if (color[w] === WHITE) {
        color[w] = GREY
        stack.push({ id: w, next: 0 })
      }
    }
  }
  return null
}

// --- validation ---------------------------------------------------------

// Walk a section 8 condition tree, calling back with every variable it reads.
function eachConditionVar (cond, fn) {
  if (!cond || typeof cond !== 'object') return
  if (typeof cond.var === 'string') fn(cond.var)
  if (Array.isArray(cond.all)) cond.all.forEach(function (c) { eachConditionVar(c, fn) })
  if (Array.isArray(cond.any)) cond.any.forEach(function (c) { eachConditionVar(c, fn) })
  if (cond.not) eachConditionVar(cond.not, fn)
}

// Returns [] when the IR is exportable, otherwise one complete sentence per
// problem. Exporters throw on a non-empty result, so the only consumer of
// these strings is a human reading a stack trace: every message names the
// offending id, and each of the spec's ten failure classes gets its own
// leading tag so a caller can grep for one class.
function validateStoryIR (ir) {
  const errs = []
  if (!ir || typeof ir !== 'object' || Array.isArray(ir)) return ['ir: expected an object']
  if (ir.irVersion !== IR_VERSION) {
    errs.push('irVersion: expected ' + IR_VERSION + ', got ' + JSON.stringify(ir.irVersion))
  }
  const passages = Array.isArray(ir.passages) ? ir.passages : null
  const links = Array.isArray(ir.links) ? ir.links : null
  const vars = Array.isArray(ir.vars) ? ir.vars : null
  const items = Array.isArray(ir.items) ? ir.items : null
  if (!passages) errs.push('passages: expected an array')
  if (!links) errs.push('links: expected an array')
  if (!vars) errs.push('vars: expected an array')
  if (!items) errs.push('items: expected an array')
  if (!ir.meta || typeof ir.meta !== 'object') errs.push('meta: expected an object')
  if (!passages || !links || !vars || !items) return errs

  // (8) ids unique and inside the exporter-safe charset.
  const passageById = Object.create(null)
  passages.forEach(function (p, i) {
    const id = p && p.id
    if (typeof id !== 'string' || !ID_RE.test(id)) {
      errs.push('id: passage[' + i + '] id ' + JSON.stringify(id) + ' is not [A-Za-z_][A-Za-z0-9_]*')
      return
    }
    if (passageById[id]) errs.push('id: duplicate passage id ' + JSON.stringify(id))
    passageById[id] = p
  })
  const linkById = Object.create(null)
  links.forEach(function (l, i) {
    const id = l && l.id
    if (typeof id !== 'string' || !ID_RE.test(id)) {
      errs.push('id: link[' + i + '] id ' + JSON.stringify(id) + ' is not [A-Za-z_][A-Za-z0-9_]*')
      return
    }
    if (linkById[id]) errs.push('id: duplicate link id ' + JSON.stringify(id))
    linkById[id] = l
  })
  const varByName = Object.create(null)
  vars.forEach(function (v, i) {
    const n = v && v.name
    if (typeof n !== 'string' || !VAR_RE.test(n)) {
      errs.push('id: vars[' + i + '] name ' + JSON.stringify(n) + ' is not [a-z][a-z0-9_]*')
      return
    }
    if (varByName[n]) errs.push('id: duplicate var name ' + JSON.stringify(n))
    if (isReservedName(n)) errs.push('id: var name ' + JSON.stringify(n) + ' is a reserved word')
    varByName[n] = v
  })
  const itemById = Object.create(null)
  items.forEach(function (it, i) {
    const id = it && it.id
    if (typeof id !== 'string' || id === '') {
      errs.push('id: items[' + i + '] id ' + JSON.stringify(id) + ' is not a non-empty string')
      return
    }
    if (itemById[id]) errs.push('id: duplicate item id ' + JSON.stringify(id))
    itemById[id] = it
  })

  // (1) every id on a passage's links array resolves, and resolves to a
  // link that agrees about where it starts.
  passages.forEach(function (p) {
    if (!Array.isArray(p.links)) {
      errs.push('links: passage ' + p.id + ' has no links array')
      return
    }
    p.links.forEach(function (id) {
      const l = linkById[id]
      if (!l) errs.push('links: passage ' + p.id + ' lists unknown link ' + JSON.stringify(id))
      else if (l.from !== p.id) {
        errs.push('links: passage ' + p.id + ' lists link ' + id + ' whose from is ' + JSON.stringify(l.from))
      }
    })
  })

  // (2) link endpoints resolve.
  links.forEach(function (l) {
    if (!passageById[l.from]) errs.push('endpoint: link ' + l.id + ' from ' + JSON.stringify(l.from) + ' is not a passage')
    if (!passageById[l.to]) errs.push('endpoint: link ' + l.id + ' to ' + JSON.stringify(l.to) + ' is not a passage')
  })

  // (3) start and endings resolve.
  if (!passageById[ir.start]) errs.push('start: ' + JSON.stringify(ir.start) + ' is not a passage')
  if (!Array.isArray(ir.endings)) errs.push('endings: expected an array')
  else {
    ir.endings.forEach(function (id) {
      if (!passageById[id]) errs.push('endings: ' + JSON.stringify(id) + ' is not a passage')
    })
  }

  // (4) reachability, following every link regardless of its condition: a
  // gated link is still an edge the player can eventually walk, so only a
  // genuinely orphaned passage counts as unreachable.
  if (passageById[ir.start]) {
    const succ = Object.create(null)
    links.forEach(function (l) {
      if (!succ[l.from]) succ[l.from] = []
      succ[l.from].push(l.to)
    })
    const seen = Object.create(null)
    const queue = [ir.start]
    seen[ir.start] = true
    while (queue.length) {
      const v = queue.shift()
      const kids = succ[v] || []
      for (let i = 0; i < kids.length; i++) {
        if (passageById[kids[i]] && !seen[kids[i]]) {
          seen[kids[i]] = true
          queue.push(kids[i])
        }
      }
    }
    passages.forEach(function (p) {
      if (!seen[p.id]) errs.push('reachability: passage ' + p.id + ' is unreachable from start')
    })
  }

  // (5) a sink must terminate the story rather than soft-lock the player.
  passages.forEach(function (p) {
    const n = Array.isArray(p.links) ? p.links.length : 0
    if (n === 0 && p.role !== 'ending' && p.role !== 'death') {
      errs.push('sink: passage ' + p.id + ' has no outgoing links but role is ' + JSON.stringify(p.role))
    }
  })

  // (6) every variable read or written is declared, and every acquired
  // item exists.
  function checkVar (name, where) {
    if (typeof name !== 'string' || !varByName[name]) {
      errs.push('var: undeclared variable ' + JSON.stringify(name) + ' referenced by ' + where)
    }
  }
  function checkEffects (effects, where) {
    if (!Array.isArray(effects)) return
    effects.forEach(function (e) {
      if (!e || typeof e !== 'object') return
      if (e.op === 'set' || e.op === 'add') checkVar(e.var, where)
      else if (e.op === 'acquire' && !itemById[e.item]) {
        errs.push('item: ' + where + ' acquires unknown item ' + JSON.stringify(e.item))
      }
    })
  }
  passages.forEach(function (p) { checkEffects(p.onEnter, 'passage ' + p.id + ' onEnter') })
  links.forEach(function (l) {
    checkEffects(l.onTraverse, 'link ' + l.id + ' onTraverse')
    eachConditionVar(l.condition, function (n) { checkVar(n, 'link ' + l.id + ' condition') })
  })

  // (7) an item's backing variable is declared.
  items.forEach(function (it) {
    if (typeof it.var !== 'string' || !varByName[it.var]) {
      errs.push('item: item ' + JSON.stringify(it.id) + ' var ' + JSON.stringify(it.var) + ' is not declared')
    }
  })

  // (9) a "dag" promise must actually hold, because exporters lean on it.
  if (ir.meta && ir.meta.topology === 'dag') {
    const cycle = findCycle(passages, links)
    if (cycle) errs.push('topology: meta.topology is "dag" but the link graph has a cycle (' + cycle + ')')
  }

  // (10) a random passage is auto-resolved by the engine, so every exit
  // must be rollable.
  passages.forEach(function (p) {
    if (p.role !== 'random' || !Array.isArray(p.links)) return
    p.links.forEach(function (id) {
      const l = linkById[id]
      if (!l) return
      if (l.kind !== 'random') {
        errs.push('random: passage ' + p.id + ' has role "random" but link ' + id + ' has kind ' + JSON.stringify(l.kind))
      }
      if (!(typeof l.weight === 'number' && isFinite(l.weight) && l.weight > 0)) {
        errs.push('random: passage ' + p.id + ' link ' + id + ' needs a positive weight, got ' + JSON.stringify(l.weight))
      }
    })
  })

  return errs
}

module.exports = {
  IR_VERSION,
  buildStoryIR,
  validateStoryIR,
  normalizeText
}
