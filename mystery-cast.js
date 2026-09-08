'use strict'

// mystery-cast.js — the household, and who knows what about whom.
//
// This is the first of the three layers in docs/spec/two-layer-mystery.md, and
// deliberately the only one here: no rooms, no approval DAG, no map. Just the
// people, what each is hiding, and — the part that actually matters — the
// PROVENANCE relation: for each person, who else holds their secret, and on
// what grounds.
//
// WHY PROVENANCE IS THE HARD PART. It is easy to give five people five secrets.
// The question that makes a mystery is: how did the player learn this one? If
// every answer is "their subordinate told you", the cast reads as an
// organisational chart and the puzzle is a walk down a hierarchy. The relation
// has to be arbitrary — rumour, kinship, complicity, a shared hour, a bundle of
// letters — and its arbitrariness is content, because *why these two are
// connected* is itself a clue the player is given.
//
// THE ACYCLICITY CONSTRAINT. `knows(a, b)` means "a holds b's secret", so the
// player learns b's secret by first getting a to talk. If that relation had a
// cycle, the people in it would be mutually locked and the puzzle would be dead
// before a map was ever drawn. So the provenance graph is generated as a
// forest: people are ordered, each person's secret is held by someone EARLIER
// in the order or is at large in the world, and at least one is always at large
// so there is somewhere to start. Section 5 proves the invariant on the output
// rather than trusting the construction, because the construction will get
// edited and the invariant should outlive it.
//
// Everything here is a pure function of an injected `rnd`. See hallmarks.js for
// why (a "daily" puzzle that varies per run is not shareable).

const hallmarks = require('./hallmarks')

// ---------------------------------------------------------------------------
// 1. The household
// ---------------------------------------------------------------------------

// `station` and `rank` exist to make relations plausible rather than random.
// A butler's subordinate is a footman, not the dowager; a valet and a lady's
// maid share an upstairs-adjacent sphere and so can plausibly overhear each
// other. Without this the relation kinds are noise, and a reader notices
// immediately — "the scullery maid is the widow's confidante" needs a reason.
//
// `rank` is within-station and lower means senior (1 is the top of the hall).
const ROLES = [
  { id: 'widow',      noun: 'the widow',          station: 'family',    rank: 1 },
  { id: 'heir',       noun: 'the heir',           station: 'family',    rank: 2 },
  { id: 'sister',     noun: 'the dead man\'s sister', station: 'family', rank: 2 },
  { id: 'companion',  noun: 'the companion',      station: 'family',    rank: 3 },
  { id: 'solicitor',  noun: 'the solicitor',      station: 'professional', rank: 1 },
  { id: 'physician',  noun: 'the physician',      station: 'professional', rank: 1 },
  { id: 'curate',     noun: 'the curate',         station: 'professional', rank: 2 },
  { id: 'butler',     noun: 'the butler',         station: 'service',   rank: 1 },
  { id: 'housekeeper', noun: 'the housekeeper',   station: 'service',   rank: 1 },
  { id: 'governess',  noun: 'the governess',      station: 'service',   rank: 2 },
  { id: 'valet',      noun: 'the valet',          station: 'service',   rank: 2 },
  { id: 'ladysmaid',  noun: 'the lady\'s maid',   station: 'service',   rank: 2 },
  { id: 'cook',       noun: 'the cook',           station: 'service',   rank: 2 },
  { id: 'footman',    noun: 'the footman',        station: 'service',   rank: 3 },
  { id: 'coachman',   noun: 'the coachman',       station: 'service',   rank: 3 },
  { id: 'gardener',   noun: 'the gardener',       station: 'service',   rank: 3 },
  { id: 'scullion',   noun: 'the scullery maid',  station: 'service',   rank: 4 }
]

// Surnames give the cast individuality without displacing the role, which stays
// the primary handle — a player tracks "the butler" far more reliably than
// "Pargeter", and the clue language in hallmarks.js reads better over roles.
const SURNAMES = [
  'Pargeter', 'Halloway', 'Thrale', 'Vesey', 'Mordaunt', 'Culpepper',
  'Ashby', 'Rennick', 'Devereux', 'Stannard', 'Quillan', 'Wrenfield',
  'Loveridge', 'Sackville', 'Hentridge', 'Bellamy', 'Crowther'
]

// ---------------------------------------------------------------------------
// 2. Provenance relations
// ---------------------------------------------------------------------------

// How one person comes to hold another's secret. `fits(holder, subject)` is the
// plausibility gate; `why` renders the reason the player is told.
//
// The gates are not decoration. They are what stops the generator producing
// "the scullery maid knows the solicitor's secret because she is his
// subordinate" — true of no household anywhere, and the kind of sentence that
// tells a player the world is not being modelled, only shuffled.
//
// `rumour` deliberately has no gate at all. It is the wildcard that cuts across
// station and hierarchy, and a cast without at least one of them is guessable
// from the seating plan.
const RELATIONS = [
  {
    id: 'subordinate',
    weight: 3,
    fits: function (h, s) {
      return h.role.station === s.role.station && h.role.rank > s.role.rank
    },
    why: function (h, s) {
      return h.noun + ' serves under ' + s.noun + ', and servants see everything'
    }
  },
  {
    id: 'predecessor',
    weight: 1,
    fits: function (h, s) {
      return h.role.station === s.role.station && h.role.rank === s.role.rank
    },
    why: function (h, s) {
      return h.noun + ' held the same place before ' + s.noun + ', and left knowing things'
    }
  },
  {
    id: 'proximity',
    weight: 2,
    fits: function (h, s) {
      return h.role.station === s.role.station ||
             Math.abs(h.role.rank - s.role.rank) <= 1
    },
    why: function (h, s) {
      return h.noun + ' keeps the same hours as ' + s.noun + ', and walls are thin'
    }
  },
  {
    id: 'complicity',
    weight: 2,
    fits: function () { return true },
    why: function (h, s) {
      return h.noun + ' was there when ' + s.noun + ' did it'
    }
  },
  {
    id: 'kinship',
    weight: 1,
    // Kinship across stations is the interesting case — an acknowledged tie
    // between family and service is itself scandalous — so this is gated to
    // *cross*-station pairs, and same-station kinship is left to `proximity`.
    fits: function (h, s) { return h.role.station !== s.role.station },
    why: function (h, s) {
      return h.noun + ' is related to ' + s.noun + ', which the household does not discuss'
    }
  },
  {
    id: 'correspondence',
    weight: 1,
    fits: function () { return true },
    why: function (h, s) {
      return s.noun + ' wrote letters, and ' + h.noun + ' kept them'
    }
  },
  {
    id: 'rumour',
    weight: 2,
    // No gate. The wildcard.
    fits: function () { return true },
    why: function (h, s) {
      return 'the household says there is something between ' + h.noun + ' and ' + s.noun
    }
  }
]

// ---------------------------------------------------------------------------
// 3. Sampling
// ---------------------------------------------------------------------------

function pick (rnd, list) { return list[Math.floor(rnd() * list.length)] }

function pickWeighted (rnd, list) {
  const total = list.reduce(function (t, x) { return t + (x.weight || 1) }, 0)
  let r = rnd() * total
  for (let i = 0; i < list.length; i++) {
    r -= (list[i].weight || 1)
    if (r <= 0) return list[i]
  }
  return list[list.length - 1]
}

/**
 * Build a cast and its provenance graph.
 *
 * @param {Function} rnd Zero-argument RNG returning a float in [0,1).
 * @param {Object} [opts]
 * @param {Integer} [opts.size=5] How many people.
 * @param {Number}  [opts.atLargeRate=0.34] Probability a person's secret is
 *   free-standing (found in the world) rather than held by another person.
 *   Lower means deeper nesting and a more chained puzzle; higher means more
 *   independent lines of enquiry the player can start in any order. Note that
 *   this does NOT control dead weight — see `assignPayoffs`.
 * @param {Integer} [opts.physicalKeys] How many people should carry a physical
 *   map key. Defaults to every person the social chain has no use for, which is
 *   the setting that leaves nobody idle. The map layer binds these.
 * @param {Integer} [opts.herrings=0] How many people are allowed to unlock
 *   nothing at all. A budget, so that a dead end is a decision.
 * @returns {Object} { people, provenance, roots, murderer, depth, physicalKeys }
 */
function buildCast (rnd, opts) {
  opts = opts || {}
  const size = opts.size == null ? 5 : opts.size
  const atLargeRate = opts.atLargeRate == null ? 0.34 : opts.atLargeRate
  if (size < 2) throw new Error('a cast needs at least two people')
  if (size > ROLES.length) throw new Error('only ' + ROLES.length + ' roles are defined')

  const roles = hallmarks.shuffle(rnd, ROLES).slice(0, size)
  const surnames = hallmarks.shuffle(rnd, SURNAMES).slice(0, size)
  // Distinct transgressions, materials and per-person bearing/register, drawn
  // by the same code the clue engine uses — so a clue phrased over `bearing`
  // means the same thing here as it does there.
  const marks = hallmarks.sampleHallmarks(rnd, size)

  const people = roles.map(function (role, i) {
    return {
      id: role.id,
      index: i,
      role: role,
      surname: surnames[i],
      noun: role.noun,
      // "the butler, Pargeter" — role first, because the role is the handle.
      fullName: role.noun + ', ' + surnames[i],
      transgression: marks[i].transgression,
      bearing: marks[i].bearing,
      register: marks[i].register
    }
  })

  // The provenance order. `people[order[k]]`'s secret may only be held by
  // someone appearing earlier in `order`, which is what makes the relation
  // acyclic by construction. The order is *not* the cast order, so the reader
  // cannot infer the chain from the order people are introduced in.
  const order = hallmarks.shuffle(rnd, people.map(function (_, i) { return i }))

  const provenance = []
  order.forEach(function (subjectIdx, k) {
    const subject = people[subjectIdx]
    const earlier = order.slice(0, k).map(function (i) { return people[i] })

    // The first person in the order has nobody earlier, so their secret is
    // necessarily at large. That is the guarantee that the puzzle has a
    // starting point; §5 asserts it rather than assuming it.
    const candidates = earlier.filter(function (h) {
      return RELATIONS.some(function (r) { return r.fits(h, subject) })
    })
    if (!candidates.length || rnd() < atLargeRate) {
      provenance.push({ subject: subject.id, holder: null, relation: null, why: null })
      return
    }
    const holder = pick(rnd, candidates)
    const usable = RELATIONS.filter(function (r) { return r.fits(holder, subject) })
    const relation = pickWeighted(rnd, usable)
    provenance.push({
      subject: subject.id,
      holder: holder.id,
      relation: relation.id,
      why: relation.why(holder, subject)
    })
  })

  // Present provenance in cast order rather than generation order, so nothing
  // downstream can accidentally read the nesting order off the array.
  provenance.sort(function (a, b) {
    return people.findIndex(function (p) { return p.id === a.subject }) -
           people.findIndex(function (p) { return p.id === b.subject })
  })

  const byId = {}
  people.forEach(function (p) { byId[p.id] = p })
  const holderOf = {}
  provenance.forEach(function (e) { holderOf[e.subject] = e.holder })

  // The murderer sits at the far end of the longest chain: the person the
  // player can only reach after breaking everyone between. That is the "boss at
  // the top" of docs/spec/two-layer-mystery.md — reaching them is what yields
  // the truth of the conspiracy, so the structure has to make them last, not
  // merely guilty.
  //
  // Ties are broken by how many other people's secrets they hold (the
  // conspiracy hangs from whoever has leverage), then by cast index so the
  // choice is deterministic.
  const depths = {}
  provenance.forEach(function (e) { depths[e.subject] = chainDepth(provenance, e.subject) })
  const holdCount = {}
  provenance.forEach(function (e) { if (e.holder) holdCount[e.holder] = (holdCount[e.holder] || 0) + 1 })
  const murderer = people.slice().sort(function (a, b) {
    return (depths[b.id] - depths[a.id]) ||
           ((holdCount[b.id] || 0) - (holdCount[a.id] || 0)) ||
           (a.index - b.index)
  })[0]

  const { payoff, keys, warnings } = assignPayoffs(rnd, people, provenance, murderer.id, opts)
  people.forEach(function (p) { p.payoff = payoff[p.id] })

  return {
    people: people,
    provenance: provenance,
    roots: provenance.filter(function (e) { return !e.holder }).map(function (e) { return e.subject }),
    murderer: murderer.id,
    depth: provenanceDepth(provenance),
    // The handles the map layer binds to. Each is a physical lock somewhere on
    // the map whose key is carried by a person, so opening it requires a social
    // move rather than a search.
    physicalKeys: keys,
    // Non-fatal: the cast is sound, but the layer above asked for something it
    // is not going to get. Surfaced rather than silently reconciled.
    warnings: warnings,
    herringBudget: opts.herrings == null ? 0 : opts.herrings
  }
}

// ---------------------------------------------------------------------------
// 3b. Payoffs — what breaking a person is FOR
// ---------------------------------------------------------------------------

// Every person must be worth reaching. The test is not "is their secret hard to
// get" but "does anyone need them", and those come apart: a person whose secret
// sits at large is trivially reachable, and a person at the end of a two-link
// chain is hard to reach — and if breaking either one unlocks nothing, both are
// dead weight the player will resent having walked to.
//
// So payoff is assigned by `holdCount`, not by chain position:
//
//   broker   holds somebody else's secret. Breaking them unlocks a person.
//            This is the social chain, and it needs no help.
//   culprit  the murderer. Breaking them ends the story; that is payoff enough.
//   keeper   holds a PHYSICAL key. Breaking them unlocks a door on the map.
//            This is the whole point of the category: it repurposes people the
//            social layer has no further use for into the coupling between the
//            two layers, so they pay their way instead of being decoration.
//   herring  deliberately unlocks nothing. Legitimate — a mystery with no dead
//            ends is a corridor — but budgeted, so it is a choice rather than
//            an accident of sampling.
//
// The keeper category is what makes the composition in
// docs/spec/two-layer-mystery.md bite. Secrets are found in rooms, so the
// social layer already depends on the map; giving people physical keys makes
// the map depend on the social layer too. That two-way coupling is exactly what
// creates the deadlock in §4 of that spec — B's secret is in the locked study,
// the study key is held by A, and A will not talk until B vouches — which is
// why the solvability check has to run on the product and not on either layer.
// We are not avoiding that hazard; we are choosing it, because the alternative
// is two layers that never touch.
function assignPayoffs (rnd, people, provenance, murdererId, opts) {
  const holdCount = {}
  provenance.forEach(function (e) { if (e.holder) holdCount[e.holder] = (holdCount[e.holder] || 0) + 1 })

  const payoff = {}
  const spare = []
  people.forEach(function (p) {
    if (holdCount[p.id]) payoff[p.id] = { kind: 'broker', unlocks: holdCount[p.id] }
    else if (p.id === murdererId) payoff[p.id] = { kind: 'culprit' }
    else spare.push(p)
  })

  // `herrings` is a CAP on how many people may unlock nothing, not a target.
  // Everyone spare beyond that cap becomes a keeper — "nobody is idle" is the
  // hard invariant here and `physicalKeys` is only a request from the map
  // layer, so when the cast has more spare people than the map planned locks
  // for, the cast wins and the map is told it needs more locks. Silently
  // turning the excess into herrings would satisfy the request by breaking the
  // invariant the request exists to serve.
  //
  // Shuffle before slicing so which spare person ends up a herring is a
  // function of the seed rather than of cast order.
  const herringCap = Math.min(opts.herrings == null ? 0 : opts.herrings, spare.length)
  const requested = opts.physicalKeys == null ? spare.length - herringCap : opts.physicalKeys
  const keeperCount = Math.max(0, Math.min(spare.length, Math.max(requested, spare.length - herringCap)))

  const shuffled = hallmarks.shuffle(rnd, spare)
  const keepers = shuffled.slice(0, keeperCount)
  const herrings = shuffled.slice(keeperCount)

  keepers.forEach(function (p, i) {
    payoff[p.id] = { kind: 'keeper', keyId: 'phys_' + (i + 1) }
  })
  herrings.forEach(function (p) { payoff[p.id] = { kind: 'herring' } })

  const warnings = []
  if (opts.physicalKeys != null && keeperCount > opts.physicalKeys) {
    warnings.push('cast needs ' + keeperCount + ' physical locks but the map layer asked for ' +
                  opts.physicalKeys + '; raise the map budget or the herring budget')
  }

  return {
    payoff: payoff,
    warnings: warnings,
    keys: keepers.map(function (p, i) {
      return { keyId: 'phys_' + (i + 1), holder: p.id }
    })
  }
}

// ---------------------------------------------------------------------------
// 4. Measurement
// ---------------------------------------------------------------------------

// How deep one person's chain runs: 1 for a secret lying at large, otherwise
// 1 + the depth of whoever holds it. Guards against a cycle by returning
// Infinity rather than recursing forever — validateCast reports the cycle; this
// function must not hang on the way there.
function chainDepth (provenance, id) {
  const holderOf = {}
  provenance.forEach(function (e) { holderOf[e.subject] = e.holder })
  const seen = {}
  let d = 0, cur = id
  while (cur != null) {
    if (seen[cur]) return Infinity
    seen[cur] = true
    d++
    cur = holderOf[cur]
  }
  return d
}

// The cast's depth is its deepest chain, and it is what the budget field
// `nestingDepth` refers to.
function provenanceDepth (provenance) {
  return provenance.reduce(function (max, e) {
    return Math.max(max, chainDepth(provenance, e.subject))
  }, 0)
}

// ---------------------------------------------------------------------------
// 5. Invariants
// ---------------------------------------------------------------------------

// Checked on the OUTPUT rather than argued from the construction, because the
// construction is the part that will get edited. Returns [] when the cast is
// sound.
function validateCast (cast) {
  const errs = []
  const ids = cast.people.map(function (p) { return p.id })
  const idSet = new Set(ids)

  if (new Set(ids).size !== ids.length) errs.push('duplicate person id')
  if (cast.provenance.length !== cast.people.length)
    errs.push('provenance: expected one entry per person')

  cast.provenance.forEach(function (e) {
    if (!idSet.has(e.subject)) errs.push('provenance: unknown subject ' + e.subject)
    if (e.holder != null && !idSet.has(e.holder)) errs.push('provenance: unknown holder ' + e.holder)
    if (e.holder === e.subject) errs.push('provenance: ' + e.subject + ' holds their own secret')
    if (e.holder != null && !e.relation) errs.push('provenance: ' + e.subject + ' has a holder but no relation')
    if (e.holder != null && !e.why) errs.push('provenance: ' + e.subject + ' has a holder but no stated reason')
  })

  // Acyclic. A cycle means a set of people mutually locked, and the puzzle is
  // dead before a map is drawn.
  const holderOf = {}
  cast.provenance.forEach(function (e) { holderOf[e.subject] = e.holder })
  const state = {}
  function walk (id) {
    if (state[id] === 'done') return false
    if (state[id] === 'open') return true
    state[id] = 'open'
    const h = holderOf[id]
    const cyc = h != null && walk(h)
    state[id] = 'done'
    return cyc
  }
  ids.forEach(function (id) {
    if (walk(id)) errs.push('provenance: cycle through ' + id)
  })

  // At least one starting point, or the player has nothing to pull on.
  if (!cast.roots.length) errs.push('provenance: no secret is at large; nothing can be learned first')

  // Everyone is worth reaching. An unbudgeted person who unlocks nothing is the
  // failure this check exists for: the player walks a chain to them and gets
  // nothing, which reads as a bug in the mystery rather than as a red herring.
  const KINDS = ['broker', 'culprit', 'keeper', 'herring']
  cast.people.forEach(function (p) {
    if (!p.payoff || KINDS.indexOf(p.payoff.kind) < 0)
      errs.push('payoff: ' + p.id + ' has no valid payoff')
  })
  const herringCount = cast.people.filter(function (p) { return p.payoff && p.payoff.kind === 'herring' }).length
  if (herringCount > (cast.herringBudget || 0))
    errs.push('payoff: ' + herringCount + ' people unlock nothing but the herring budget is ' +
              (cast.herringBudget || 0))

  const culprits = cast.people.filter(function (p) { return p.payoff && p.payoff.kind === 'culprit' })
  if (culprits.length > 1) errs.push('payoff: more than one culprit')
  if (culprits.length === 1 && culprits[0].id !== cast.murderer)
    errs.push('payoff: the culprit is not the murderer')

  // Physical keys must agree with the payoffs that produced them.
  const keepers = cast.people.filter(function (p) { return p.payoff && p.payoff.kind === 'keeper' })
  if ((cast.physicalKeys || []).length !== keepers.length)
    errs.push('payoff: ' + keepers.length + ' keepers but ' +
              (cast.physicalKeys || []).length + ' physical keys')
  ;(cast.physicalKeys || []).forEach(function (k) {
    if (!idSet.has(k.holder)) errs.push('payoff: key ' + k.keyId + ' held by unknown ' + k.holder)
    const holder = cast.people.filter(function (p) { return p.id === k.holder })[0]
    if (holder && holder.payoff.keyId !== k.keyId)
      errs.push('payoff: key ' + k.keyId + ' and its holder disagree')
  })
  if (new Set((cast.physicalKeys || []).map(function (k) { return k.keyId })).size !==
      (cast.physicalKeys || []).length)
    errs.push('payoff: duplicate physical key id')

  // Relations must remain plausible for the pair they were assigned to. This is
  // the check that catches a future edit loosening a gate by accident.
  const byId = {}
  cast.people.forEach(function (p) { byId[p.id] = p })
  cast.provenance.forEach(function (e) {
    if (!e.relation) return
    const rel = RELATIONS.filter(function (r) { return r.id === e.relation })[0]
    if (!rel) { errs.push('provenance: unknown relation ' + e.relation); return }
    if (!rel.fits(byId[e.holder], byId[e.subject]))
      errs.push('provenance: ' + e.relation + ' does not fit ' +
                e.holder + ' holding ' + e.subject + '\'s secret')
  })

  return errs
}

// ---------------------------------------------------------------------------
// 6. Rendering
// ---------------------------------------------------------------------------

// Plain text, for reading a generated cast at the terminal. Not narrative — the
// narrator macros do that later — but it has to be readable enough that a
// person can judge whether the household hangs together.
function renderCast (cast) {
  const T = {}; hallmarks.TRANSGRESSIONS.forEach(function (x) { T[x.id] = x })
  const R = {}; hallmarks.REGISTERS.forEach(function (x) { R[x.id] = x })
  const B = {}; hallmarks.BEARINGS.forEach(function (x) { B[x.id] = x })
  const byId = {}; cast.people.forEach(function (p) { byId[p.id] = p })
  const provOf = {}; cast.provenance.forEach(function (e) { provOf[e.subject] = e })

  const out = []
  out.push('THE HOUSEHOLD')
  cast.people.forEach(function (p) {
    out.push('  ' + p.fullName + (p.id === cast.murderer ? '   [the murderer]' : ''))
    out.push('      visibly ' + B[p.bearing].adj +
             '; hiding ' + T[p.transgression].secret +
             '; afraid of ' + R[p.register].noun + '.')
    const pay = p.payoff || {}
    out.push('      ' + {
      broker:  'BROKER  — breaking them unlocks ' + pay.unlocks + ' other' + (pay.unlocks === 1 ? '' : 's') + '.',
      culprit: 'CULPRIT — breaking them ends it.',
      keeper:  'KEEPER  — carries a physical key (' + pay.keyId + ') to somewhere on the map.',
      herring: 'HERRING — unlocks nothing. Budgeted.'
    }[pay.kind])
    const e = provOf[p.id]
    if (!e.holder) {
      out.push('      Their secret is at large — findable without asking anyone.')
    } else {
      out.push('      Their secret is held by ' + byId[e.holder].noun +
               '  [' + e.relation + ']')
      out.push('      because ' + e.why + '.')
    }
  })
  out.push('')
  out.push('CHAINS  (to break X you must first break Y)')
  cast.people.forEach(function (p) {
    const chain = []
    let cur = p.id
    const seen = {}
    while (cur && !seen[cur]) {
      seen[cur] = true
      chain.push(byId[cur].noun)
      cur = provOf[cur].holder
    }
    if (chain.length > 1) out.push('  ' + chain.reverse().join('  ->  '))
  })
  out.push('')
  out.push('start with: ' + cast.roots.map(function (id) { return byId[id].noun }).join(', '))
  out.push('deepest chain: ' + cast.depth)
  if ((cast.physicalKeys || []).length)
    out.push('physical keys: ' + cast.physicalKeys.map(function (k) {
      return k.keyId + ' (' + byId[k.holder].noun + ')'
    }).join(', '))
  return out.join('\n')
}

module.exports = {
  ROLES,
  SURNAMES,
  RELATIONS,
  buildCast,
  assignPayoffs,
  validateCast,
  chainDepth,
  provenanceDepth,
  renderCast
}
