'use strict'

// mystery-embed.js — the embedding: where the social map lands on the physical one.
//
// This is step 3 of docs/spec/two-layer-mystery.md §5, and the only step of the
// five that was missing. Steps 1 and 2 already exist and are already good:
// `mystery-cast.js` grows the approval layer G_n (people, and the provenance
// relation "who holds whose secret") with no rooms in sight, and the ordinary
// dungeon primitives grow the geographic layer G_s with no people in sight.
// Nothing joined them, so `mystery-primitives.socialLock` was doing both jobs
// at once by splicing a person into a corridor — which is why, measured over a
// year of seeds, EVERY lock had its key exactly two hops from its lock. The
// spec's §8 warning ("when the two layers are aligned it collapses into a
// corridor") was not a risk the generator was running; it was the generator's
// only output.
//
// So this module does exactly one thing: given a finished cast and a finished
// map, choose
//
//   φ : person  -> room      where each person stands
//   σ : person  -> location  where that person's secret is learned
//
// and choose them so the player has to walk. σ is mostly not a free choice:
// provenance already says that if `holder` is h, you learn this person's secret
// by breaking h, so σ(n) = φ(h) and the freedom is all in φ. Only the roots —
// the people whose secret lies at large, which is what gives the puzzle a way
// in — get a room of their own chosen for them.
//
// WHAT "FORCED TO CROSS THE HOUSE" MEANS PRECISELY. The objective is maximin,
// not mean: maximise the SMALLEST separation first, and only use the mean to
// break ties. Maximising the mean is the wrong objective here and it is worth
// saying why, because it looks reasonable. A layout with separations
// {1, 1, 6, 6} has a better mean than one with {3, 3, 3, 3} and is a worse
// puzzle: the two 1s are two locks that have collapsed back into corridors, and
// a player meets them as "oh, they were standing right there". One collapsed
// lock is not paid for by a distant one somewhere else, so the thing to push up
// is the floor.
//
// Everything here is a pure function of an injected `rnd`, per the rule in
// hallmarks.js: a daily puzzle that varies per run is not shareable.

const DEFAULT_ROOM_TYPES = ['scene', 'room', 'start']

// ---------------------------------------------------------------------------
// 1. The map, reduced to what the embedding needs
// ---------------------------------------------------------------------------

// Rooms and the walkable adjacency between them, as an undirected graph with
// all-pairs hop distances.
//
// Undirected, and that is a deliberate approximation rather than an oversight.
// The generated house is bidirectional by construction (`topology:
// 'bidirectional'` is a promise mystery-daily makes to the exporters, kept by
// midpointRoom's backtrack edges), so for the purpose of "how far apart are
// these two rooms" the direction of any individual edge carries no information.
// Where it would carry information — a locked door — that is handled by
// `verifyEmbedding`, which walks the real directed graph with real gates.
//
// `dist` is a full BFS from every room. At the sizes this runs at (a house is
// eight or nine rooms) that is free, and it lets the placement search below ask
// for a distance in constant time instead of recomputing reachability inside
// its inner loop.
function roomGraph (graph, opts) {
  opts = opts || {}
  const roomTypes = new Set(opts.roomTypes || DEFAULT_ROOM_TYPES)

  const rooms = graph.nodes().filter(function (n) {
    return roomTypes.has((graph.node(n) || {}).type)
  })
  const isRoom = new Set(rooms)

  const adj = {}
  rooms.forEach(function (n) { adj[n] = new Set() })
  graph.edges().forEach(function (e) {
    if (!isRoom.has(e.v) || !isRoom.has(e.w) || e.v === e.w) return
    adj[e.v].add(e.w)
    adj[e.w].add(e.v)
  })

  const dist = {}
  rooms.forEach(function (src) {
    const d = {}
    d[src] = 0
    const queue = [src]
    for (let head = 0; head < queue.length; head++) {
      const x = queue[head]
      adj[x].forEach(function (y) {
        if (d[y] === undefined) { d[y] = d[x] + 1; queue.push(y) }
      })
    }
    dist[src] = d
  })

  // A house that the room-growing stage left in two pieces would silently make
  // every cross-component separation Infinity, and the search below would love
  // that — it maximises separation, so it would happily post everyone into an
  // unreachable wing. Report it; `embedCast` refuses on it.
  const components = []
  const seen = new Set()
  rooms.forEach(function (n) {
    if (seen.has(n)) return
    const comp = []
    const queue = [n]
    seen.add(n)
    for (let head = 0; head < queue.length; head++) {
      const x = queue[head]
      comp.push(x)
      adj[x].forEach(function (y) { if (!seen.has(y)) { seen.add(y); queue.push(y) } })
    }
    components.push(comp)
  })

  return { rooms: rooms, adj: adj, dist: dist, components: components }
}

// ---------------------------------------------------------------------------
// 2. The provenance order
// ---------------------------------------------------------------------------

// People, ordered so that every holder precedes everyone whose secret they
// hold. `mystery-cast` guarantees the relation is acyclic (it builds it as a
// forest and `validateCast` proves it on the output), so this always succeeds —
// but it is written as a real Kahn sort with a real failure, not as an assumed
// order, because the guarantee lives in another module and modules get edited.
//
// This order is what makes the spec's legality condition a formality rather
// than a filter: place people in it, and each person's secret is placed at
// someone already placed, so a lock can never guard its own key.
function provenanceOrder (cast) {
  const holderOf = {}
  cast.provenance.forEach(function (e) { holderOf[e.subject] = e.holder })

  const order = []
  const placed = new Set()
  const ids = cast.people.map(function (p) { return p.id })
  let progress = true
  while (progress && order.length < ids.length) {
    progress = false
    ids.forEach(function (id) {
      if (placed.has(id)) return
      const h = holderOf[id]
      if (h && !placed.has(h)) return
      placed.add(id)
      order.push(id)
      progress = true
    })
  }
  if (order.length !== ids.length) {
    const stuck = ids.filter(function (id) { return !placed.has(id) })
    throw new Error('mystery-embed: provenance is cyclic, cannot order: ' + stuck.join(', '))
  }
  return order
}

// ---------------------------------------------------------------------------
// 3. Scoring a layout
// ---------------------------------------------------------------------------

// The separation of one person: how far the player must walk between learning
// this person's secret and reaching the person it opens.
//
// For a person whose secret is held by h that is d(φ(h), φ(n)) — you break h
// where h stands, and then you have to get to n. For a root, whose secret lies
// at large in room r, it is d(r, φ(n)).
//
// A person nobody has a secret for (there is no provenance entry at all) has no
// separation to measure and is skipped rather than scored as zero, which would
// drag the maximin floor to zero and make every layout look equally bad.
function separations (layout, cast, rg) {
  const out = []
  cast.provenance.forEach(function (e) {
    const at = layout.people[e.subject]
    const from = e.holder ? layout.people[e.holder] : layout.secrets[e.subject]
    if (at === undefined || from === undefined) return
    const d = rg.dist[from] && rg.dist[from][at]
    out.push({ subject: e.subject, from: from, to: at, hops: d === undefined ? Infinity : d })
  })
  return out
}

// Root secrets must lie in distinct rooms, whenever there are rooms enough.
//
// This is a constraint rather than a term in the score, because it is not a
// thing to be traded off. Separation only ever measures the walk from a secret
// to the person it opens; it is completely blind to two secrets sitting in the
// same room, and the search exploits that — the first version of this module
// put all three of a day's at-large secrets in room 15, scored it as excellent,
// and was right by its own lights. But a player who finds three keys in one
// drawer has made one trip and holds the whole opening move, which is the exact
// thing "make them cross the house" was supposed to prevent. Spreading the
// entry points is what gives the opening its shape.
function rootRoomsDistinct (layout, roomCount) {
  const used = Object.keys(layout.secrets).map(function (id) { return layout.secrets[id] })
  if (used.length > roomCount) return true
  return new Set(used).size === used.length
}

// Lexicographic (floor, mean). Compared as a pair rather than folded into one
// number so that no weighting has to be invented and defended.
function scoreOf (seps) {
  if (!seps.length) return { floor: 0, mean: 0 }
  let floor = Infinity
  let total = 0
  seps.forEach(function (s) {
    if (s.hops < floor) floor = s.hops
    total += s.hops
  })
  return { floor: floor, mean: total / seps.length }
}

function better (a, b) {
  if (a.floor !== b.floor) return a.floor > b.floor
  return a.mean > b.mean
}

// ---------------------------------------------------------------------------
// 4. The embedding
// ---------------------------------------------------------------------------

// Choose φ and σ. Greedy along the provenance order to get a legal layout, then
// hill-climb it.
//
// The greedy pass alone is not good enough, and the reason is structural rather
// than a matter of tuning. Placing in provenance order means each person is
// placed to be far from their holder, but the holder was placed to be far from
// THEIR holder — so a chain of three tends to oscillate between two ends of the
// house and the third link lands back on top of the first. The climb fixes
// that by moving one person at a time and keeping the move only if the pair
// (floor, mean) improves; since every candidate layout it considers is a
// permutation of people over rooms, and legality here does not depend on which
// room anyone is in (see `verifyEmbedding` for the case where it does), every
// layout it visits is as legal as the one it started from.
//
// The climb is deterministic given `rnd` and bounded by `opts.rounds`, so this
// stays a pure function of the seed.
function embedCast (graph, cast, rnd, opts) {
  opts = opts || {}
  const rg = roomGraph(graph, opts)
  const rounds = opts.rounds == null ? 40 : opts.rounds

  if (!rg.rooms.length) throw new Error('mystery-embed: the map has no rooms to place anyone in')
  if (rg.components.length > 1) {
    throw new Error('mystery-embed: the map is in ' + rg.components.length +
                    ' disconnected pieces; separations across them are not walks')
  }

  const order = provenanceOrder(cast)
  const holderOf = {}
  cast.provenance.forEach(function (e) { holderOf[e.subject] = e.holder })

  // Rooms people may stand in. The start room is excluded when there is any
  // choice: a suspect standing on the doorstep is met before the player has
  // learned anything, and their evasion is the first thing in the story.
  const startNode = rg.rooms.find(function (n) { return (graph.node(n) || {}).type === 'start' })
  const standable = rg.rooms.length > cast.people.length && startNode
    ? rg.rooms.filter(function (n) { return n !== startNode })
    : rg.rooms.slice()

  // --- greedy seed
  const layout = { people: {}, secrets: {} }
  const taken = new Set()
  order.forEach(function (id) {
    const h = holderOf[id]
    let anchor
    if (h) {
      anchor = layout.people[h]
    } else {
      // A root secret lies at large. Put it wherever is emptiest — far from
      // everyone already placed AND from the other secrets already dropped —
      // and then put its owner far from it.
      const usedByRoots = new Set(Object.keys(layout.secrets).map(function (k) { return layout.secrets[k] }))
      const openRooms = rg.rooms.filter(function (n) { return !usedByRoots.has(n) })
      const pool = openRooms.length ? openRooms : rg.rooms
      anchor = furthest(pool, Array.from(taken).concat(Array.from(usedByRoots)), rg, rnd)
      layout.secrets[id] = anchor
    }
    const free = standable.filter(function (n) { return !taken.has(n) })
    const pool = free.length ? free : standable
    const spot = furthest(pool, [anchor], rg, rnd)
    layout.people[id] = spot
    taken.add(spot)
  })

  // --- hill climb
  let best = layout
  let bestScore = scoreOf(separations(best, cast, rg))
  for (let round = 0; round < rounds; round++) {
    let improved = false
    const ids = cast.people.map(function (p) { return p.id })
    ids.forEach(function (id) {
      standable.forEach(function (room) {
        const trial = { people: Object.assign({}, best.people), secrets: Object.assign({}, best.secrets) }
        // Move `id` to `room`, swapping with whoever is there so the layout
        // stays injective wherever it started injective.
        const sitting = ids.find(function (other) { return other !== id && trial.people[other] === room })
        if (sitting) trial.people[sitting] = trial.people[id]
        trial.people[id] = room
        const score = scoreOf(separations(trial, cast, rg))
        if (better(score, bestScore)) { best = trial; bestScore = score; improved = true }
      })
    })
    // Root secrets move too — they are the other half of the freedom, and
    // leaving them where the greedy pass dropped them wastes it.
    Object.keys(best.secrets).forEach(function (id) {
      standable.forEach(function (room) {
        const trial = { people: Object.assign({}, best.people), secrets: Object.assign({}, best.secrets) }
        trial.secrets[id] = room
        if (!rootRoomsDistinct(trial, rg.rooms.length)) return
        const score = scoreOf(separations(trial, cast, rg))
        if (better(score, bestScore)) { best = trial; bestScore = score; improved = true }
      })
    })
    if (!improved) break
  }

  const seps = separations(best, cast, rg)
  return {
    phi: best.people,
    sigma: best.secrets,
    order: order,
    separations: seps,
    score: bestScore,
    rooms: rg.rooms.length,
    diameter: diameterOf(rg)
  }
}

// The member of `pool` whose minimum distance to `anchors` is largest. Ties are
// broken by `rnd` rather than by node order, so two rooms that are equally far
// away are not always resolved the same way.
function furthest (pool, anchors, rg, rnd) {
  if (!anchors.length) return pool[Math.floor(rnd() * pool.length) % pool.length]
  let bestScore = -1
  let bestSet = []
  pool.forEach(function (n) {
    let m = Infinity
    anchors.forEach(function (a) {
      const d = rg.dist[a] && rg.dist[a][n]
      if (d !== undefined && d < m) m = d
    })
    if (m === Infinity) m = 0
    if (m > bestScore) { bestScore = m; bestSet = [n] } else if (m === bestScore) bestSet.push(n)
  })
  return bestSet[Math.floor(rnd() * bestSet.length) % bestSet.length]
}

function diameterOf (rg) {
  let d = 0
  rg.rooms.forEach(function (a) {
    rg.rooms.forEach(function (b) {
      const x = rg.dist[a] && rg.dist[a][b]
      if (x !== undefined && x > d) d = x
    })
  })
  return d
}

// ---------------------------------------------------------------------------
// 5. Verification
// ---------------------------------------------------------------------------

// Spec §5 step 4: prove the embedding does not deadlock. Walk the provenance
// order and, at each step, check that where this person's secret is found is
// reachable using ONLY the cooperations of people strictly earlier in the
// order — that is, without the cooperation of the person whose secret it is.
// A lock that guards its own key is the failure this is looking for.
//
// With a house full of open doorways this always passes, which is the spec's
// own prediction: placing along the approval order "turns the check from a
// filter into a formality". It is still worth running, and worth running on the
// real gated graph rather than the undirected reduction, because the moment the
// map layer adds a physical lock the formality has teeth again — a keeper's
// key can be the thing standing between the player and a room a secret is in.
//
// `lockedEdges(edge) -> keyId | null` reports which physical key an edge needs;
// the default says no edge needs one.
function verifyEmbedding (graph, cast, embedding, opts) {
  opts = opts || {}
  const roomTypes = new Set(opts.roomTypes || DEFAULT_ROOM_TYPES)
  const lockedEdges = opts.lockedEdges || function () { return null }
  const startNode = graph.nodes().find(function (n) {
    return (graph.node(n) || {}).type === 'start'
  })

  const holderOf = {}
  cast.provenance.forEach(function (e) { holderOf[e.subject] = e.holder })
  const payoffOf = {}
  cast.people.forEach(function (p) { payoffOf[p.id] = p.payoff || {} })

  const problems = []
  const broken = new Set()
  const keys = new Set()

  embedding.order.forEach(function (id) {
    // Where this person's secret is learned, and what the player must reach to
    // learn it: a room for a root, otherwise the room the holder stands in.
    const h = holderOf[id]
    const target = h ? embedding.phi[h] : embedding.sigma[id]
    if (target === undefined) {
      problems.push('no location for ' + id + "'s secret")
      return
    }
    const reach = reachableRooms(graph, startNode, roomTypes, keys, lockedEdges)
    if (!reach.has(target)) {
      problems.push(id + "'s secret is at " + target + ', which is not reachable before breaking ' + id)
    }
    if (h && !broken.has(h)) {
      problems.push(id + "'s secret is held by " + h + ', who has not been broken yet')
    }
    broken.add(id)
    const payoff = payoffOf[id]
    if (payoff && payoff.kind === 'keeper' && payoff.keyId) keys.add(payoff.keyId)
  })

  return problems
}

// Rooms reachable from `start` holding `keys`, honouring physical gates. A
// monotone closure over the real directed graph, unlike `roomGraph`'s
// undirected reduction — this is the one place the difference can matter.
function reachableRooms (graph, start, roomTypes, keys, lockedEdges) {
  const reached = new Set()
  if (start === undefined) return reached
  reached.add(start)
  let changed = true
  while (changed) {
    changed = false
    graph.edges().forEach(function (e) {
      if (!reached.has(e.v) || reached.has(e.w)) return
      if (!roomTypes.has((graph.node(e.w) || {}).type)) return
      const needs = lockedEdges(e, graph.edge(e) || {})
      if (needs && !keys.has(needs)) return
      reached.add(e.w)
      changed = true
    })
  }
  return reached
}

// ---------------------------------------------------------------------------
// 6. Reporting
// ---------------------------------------------------------------------------

// A human-readable account of one embedding, for eyeballing a day's puzzle
// without loading it into the play engine.
function renderEmbedding (cast, embedding) {
  const nameOf = {}
  cast.people.forEach(function (p) { nameOf[p.id] = p.fullName })
  const holderOf = {}
  cast.provenance.forEach(function (e) { holderOf[e.subject] = e.holder })

  const lines = []
  lines.push('rooms ' + embedding.rooms + ' · diameter ' + embedding.diameter +
             ' · separation floor ' + embedding.score.floor +
             ' · mean ' + embedding.score.mean.toFixed(2))
  lines.push('')
  embedding.order.forEach(function (id) {
    const h = holderOf[id]
    const sep = embedding.separations.find(function (s) { return s.subject === id })
    const where = h
      ? 'from ' + nameOf[h] + ' at ' + embedding.phi[h]
      : 'at large in ' + embedding.sigma[id]
    lines.push('  ' + (nameOf[id] || id) + ' stands in ' + embedding.phi[id] +
               '; their secret is ' + where +
               (sep ? ' — ' + sep.hops + ' hop' + (sep.hops === 1 ? '' : 's') : ''))
  })
  return lines.join('\n')
}

module.exports = {
  roomGraph,
  provenanceOrder,
  separations,
  embedCast,
  verifyEmbedding,
  renderEmbedding,
  DEFAULT_ROOM_TYPES
}
