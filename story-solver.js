'use strict'

// story-solver.js — is this story actually winnable?
//
// A generated map can be structurally valid and still dead. validateStoryIR
// checks that every link points somewhere and every variable is declared; it
// says nothing about whether a player can get from the start to an ending. Those
// are different questions, and the second one is the one that ships broken.
//
// The failure this exists to catch has a canonical shape: a lock guarding its
// own key. The door to the study is locked; the key is in the study. Nothing
// local detects it — the door rule cannot see where the key rule put the key,
// and the key rule cannot see what got locked afterwards. The cycle exists only
// in the composition, so the composition is where it has to be checked. See
// docs/spec/two-layer-mystery.md section 4 for the social version of the same
// deadlock, which is worse because it involves three parties.
//
// THE ALGORITHM, and why it is exact rather than a heuristic.
//
// The state a player carries is (passage, variable assignment), which is far too
// big to enumerate: a 30-passage story declares ~40 booleans, so 30 * 2^40.
// What makes it tractable is MONOTONICITY. Every boolean effect the IR can
// express is `set var true` — nothing ever sets a flag back to false. So the set
// of achievable flags only grows, and the standard key-lock reachability
// fixpoint applies:
//
//   F := {}                                  // flags known achievable
//   repeat until F stops growing:
//     R := passages reachable from start using only links openable under F
//     F := F ∪ (flags set on entering any passage in R
//               ∪ flags set on traversing any usable link within R)
//
// Each round is a graph traversal, F grows by at least one flag per round or we
// stop, so this terminates in at most |vars| rounds and is exact for the
// boolean fragment.
//
// NUMERIC CONDITIONS are the fragment where exactness ends, and the module says
// so rather than pretending otherwise. `hp > 0` depends on a running total that
// random consequence edges move both ways, so deciding it means searching the
// numeric state space. We evaluate numeric conditions OPTIMISTICALLY — assume
// the player can arrange to satisfy them — and record every place we did that in
// `assumptions`. That gives a sound answer to "is this definitely dead" (if the
// optimistic analysis says unwinnable, it really is) and a caveated answer to
// "is this winnable". For map-shaped questions, which is what a generator needs
// to reject seeds on, that is the right trade.

const { normalizeText } = require('./story-ir')

// --- condition evaluation --------------------------------------------------

// Evaluate an IR condition (docs/spec/story-ir.md section 8) against a set of
// achievable boolean flags. Returns { value, assumed } — `assumed` is true when
// the answer relied on optimism about a numeric variable.
function evalCondition (cond, flags, numericVars) {
  if (!cond) return { value: true, assumed: false }

  if (cond.all) {
    let assumed = false
    for (const c of cond.all) {
      const r = evalCondition(c, flags, numericVars)
      assumed = assumed || r.assumed
      if (!r.value) return { value: false, assumed: assumed }
    }
    return { value: true, assumed: assumed }
  }
  if (cond.any) {
    let assumed = false
    for (const c of cond.any) {
      const r = evalCondition(c, flags, numericVars)
      assumed = assumed || r.assumed
      if (r.value) return { value: true, assumed: assumed }
    }
    return { value: false, assumed: assumed }
  }
  if (cond.not) {
    // Negation breaks monotonicity: a condition that is false now may become
    // true later, so "not X" being true now is not stable. We take the
    // optimistic reading — a negated condition is satisfiable — and flag it,
    // because a generator that emits negated gates has left this module's exact
    // fragment and should know.
    return { value: true, assumed: true }
  }

  if (typeof cond.var === 'string') {
    if (numericVars.has(cond.var)) return { value: true, assumed: true }
    if ('is' in cond) return { value: (cond.is === true) === flags.has(cond.var), assumed: false }
    // A comparison on a boolean is a generator bug, but be permissive: treat it
    // as an assumption rather than throwing in the middle of a QC run.
    return { value: true, assumed: true }
  }

  return { value: true, assumed: true }
}

// --- the fixpoint ----------------------------------------------------------

/**
 * Analyse a Story IR for reachability and winnability.
 *
 * @param {Object} ir A Story IR document.
 * @returns {Object} report — see the fields assembled at the bottom.
 */
function analyzeStory (ir) {
  const P = new Map(ir.passages.map(p => [p.id, p]))
  const L = new Map(ir.links.map(l => [l.id, l]))
  const numericVars = new Set(
    (ir.vars || []).filter(v => typeof v.init === 'number').map(v => v.name))

  // Flags a passage grants on entry, and a link grants on traversal. `acquire`
  // is folded to the item's declared var, so items and flags are one mechanism
  // from here on.
  const itemVar = new Map((ir.items || []).map(i => [i.id, i.var]))
  function grants (effects) {
    const out = []
    ;(effects || []).forEach(function (e) {
      if (e.op === 'set' && e.value === true) out.push(e.var)
      else if (e.op === 'acquire' && itemVar.has(e.item)) out.push(itemVar.get(e.item))
    })
    return out
  }

  const flags = new Set(
    (ir.vars || []).filter(v => v.init === true).map(v => v.name))

  const assumptions = []
  let reachable = new Set()
  let usable = new Set()
  let rounds = 0

  for (;;) {
    rounds++
    // One traversal of the link graph under the current flag set.
    reachable = new Set([ir.start])
    usable = new Set()
    const queue = [ir.start]
    while (queue.length) {
      const p = P.get(queue.shift())
      grants(p.onEnter).forEach(f => flags.add(f))
      for (const lid of p.links) {
        const link = L.get(lid)
        const r = evalCondition(link.condition, flags, numericVars)
        if (!r.value) continue
        if (r.assumed) assumptions.push({ link: lid, why: 'condition depends on a numeric or negated term' })
        usable.add(lid)
        grants(link.onTraverse).forEach(f => flags.add(f))
        if (!reachable.has(link.to)) { reachable.add(link.to); queue.push(link.to) }
      }
    }

    // `flags` was mutated in place during the traversal, so growth is detected
    // by whether this round opened anything new rather than by set comparison.
    const beforeSize = usable.size + reachable.size
    // Re-run once more to see whether the flags gathered late in this traversal
    // open anything; if the sizes are stable, we are at the fixpoint.
    let grew = false
    for (const p of reachable) {
      for (const lid of P.get(p).links) {
        if (usable.has(lid)) continue
        if (evalCondition(L.get(lid).condition, flags, numericVars).value) { grew = true; break }
      }
      if (grew) break
    }
    if (!grew || rounds > (ir.vars || []).length + 2) break
    void beforeSize
  }

  const endingsReached = (ir.endings || []).filter(function (e) {
    const p = P.get(e)
    return reachable.has(e) && p && p.role !== 'death'
  })
  const deathsReached = (ir.endings || []).filter(function (e) {
    const p = P.get(e)
    return reachable.has(e) && p && p.role === 'death'
  })

  const unreachablePassages = ir.passages.filter(p => !reachable.has(p.id)).map(p => p.id)
  // A link is dead if its source is reachable but the link itself never opens.
  // These are the interesting ones: a lock whose key is behind itself.
  const deadLinks = ir.links.filter(function (l) {
    return reachable.has(l.from) && !usable.has(l.id)
  }).map(function (l) {
    return { id: l.id, from: l.from, to: l.to, condition: l.condition }
  })

  // A flag nothing can ever set is usually a generator bug: a prereq naming an
  // edgeId or nodeId that no longer exists, typically because a rule split an
  // edge that something else was keyed on.
  const grantable = new Set()
  ir.passages.forEach(p => grants(p.onEnter).forEach(f => grantable.add(f)))
  ir.links.forEach(l => grants(l.onTraverse).forEach(f => grantable.add(f)))
  const danglingRefs = []
  function collectVars (cond, into) {
    if (!cond) return
    if (cond.var) into.push(cond.var)
    ;(cond.all || cond.any || []).forEach(c => collectVars(c, into))
    if (cond.not) collectVars(cond.not, into)
  }
  ir.links.forEach(function (l) {
    const vs = []
    collectVars(l.condition, vs)
    vs.forEach(function (v) {
      if (!numericVars.has(v) && !grantable.has(v) && !flags.has(v))
        danglingRefs.push({ link: l.id, variable: v })
    })
  })

  return {
    winnable: endingsReached.length > 0,
    endingsReached: endingsReached,
    deathsReached: deathsReached,
    reachedCount: reachable.size,
    passageCount: ir.passages.length,
    unreachablePassages: unreachablePassages,
    deadLinks: deadLinks,
    danglingRefs: danglingRefs,
    achievableFlags: Array.from(flags).sort(),
    assumptions: assumptions,
    rounds: rounds
  }
}

// --- shortest solution -----------------------------------------------------

// The length of the shortest winning walk, measured in link traversals. This is
// the numerator of the difficulty ratio in papers/murder-mystery.md: a map where
// the optimal informed route is much shorter than the route a player takes by
// carrying every key to every door is a map where deduction pays.
//
// Search is over (passage, flag-set), which is exponential in principle. It is
// tractable here for the same reason the fixpoint is: flags are monotone, so the
// reachable flag-sets form a chain rather than a lattice in practice, and the
// visited set collapses. A cap keeps a pathological grammar from hanging a QC
// run rather than pretending the bound does not exist.
function shortestSolution (ir, opts) {
  opts = opts || {}
  const cap = opts.cap || 200000
  const P = new Map(ir.passages.map(p => [p.id, p]))
  const L = new Map(ir.links.map(l => [l.id, l]))
  const numericVars = new Set(
    (ir.vars || []).filter(v => typeof v.init === 'number').map(v => v.name))
  const itemVar = new Map((ir.items || []).map(i => [i.id, i.var]))
  const goals = new Set((ir.endings || []).filter(function (e) {
    const p = P.get(e); return p && p.role !== 'death'
  }))
  if (!goals.size) return { found: false, reason: 'no non-death ending' }

  function grants (effects) {
    const out = []
    ;(effects || []).forEach(function (e) {
      if (e.op === 'set' && e.value === true) out.push(e.var)
      else if (e.op === 'acquire' && itemVar.has(e.item)) out.push(itemVar.get(e.item))
    })
    return out
  }
  const keyOf = (p, f) => p + '|' + Array.from(f).sort().join(',')

  const init = new Set((ir.vars || []).filter(v => v.init === true).map(v => v.name))
  grants(P.get(ir.start).onEnter).forEach(f => init.add(f))
  const queue = [{ at: ir.start, flags: init, path: [] }]
  const seen = new Set([keyOf(ir.start, init)])
  let expanded = 0

  while (queue.length) {
    const s = queue.shift()
    if (goals.has(s.at)) return { found: true, length: s.path.length, path: s.path }
    if (++expanded > cap) return { found: false, reason: 'search cap of ' + cap + ' states reached' }

    for (const lid of P.get(s.at).links) {
      const link = L.get(lid)
      if (!evalCondition(link.condition, s.flags, numericVars).value) continue
      const flags = new Set(s.flags)
      grants(link.onTraverse).forEach(f => flags.add(f))
      grants(P.get(link.to).onEnter).forEach(f => flags.add(f))
      const k = keyOf(link.to, flags)
      if (seen.has(k)) continue
      seen.add(k)
      queue.push({ at: link.to, flags: flags, path: s.path.concat([lid]) })
    }
  }
  return { found: false, reason: 'no winning route exists' }
}

// --- reporting -------------------------------------------------------------

// Human-readable lines for a CLI. Ordered worst-first, because the first line a
// person reads should be the one that matters.
function formatReport (ir, report, solution) {
  const out = []
  const title = (normalizeText(ir.meta && ir.meta.title) || {}).first || ir.meta.id
  out.push(title + '  (' + ir.meta.id + ' @ seed ' + ir.meta.seed + ')')
  out.push(report.winnable
    ? 'winnable: yes, via ' + report.endingsReached.join(', ')
    : 'WINNABLE: NO — no non-death ending is reachable')
  out.push('reached ' + report.reachedCount + '/' + report.passageCount + ' passages')
  if (solution && solution.found) out.push('shortest solution: ' + solution.length + ' moves')
  else if (solution) out.push('shortest solution: not found (' + solution.reason + ')')
  if (report.danglingRefs.length)
    out.push('DANGLING: ' + report.danglingRefs.length + ' condition(s) name a variable nothing can set: ' +
      report.danglingRefs.slice(0, 5).map(d => d.variable + ' on ' + d.link).join(', '))
  if (report.deadLinks.length)
    out.push('dead links (source reachable, gate never opens): ' +
      report.deadLinks.slice(0, 8).map(d => d.id).join(', ') +
      (report.deadLinks.length > 8 ? ' …and ' + (report.deadLinks.length - 8) + ' more' : ''))
  if (report.unreachablePassages.length)
    out.push('unreachable passages: ' + report.unreachablePassages.slice(0, 8).join(', ') +
      (report.unreachablePassages.length > 8 ? ' …and ' + (report.unreachablePassages.length - 8) + ' more' : ''))
  if (report.assumptions.length)
    out.push('note: ' + report.assumptions.length + ' gate(s) evaluated optimistically (numeric or negated); ' +
      'the winnable verdict is caveated on those')
  return out.join('\n')
}

module.exports = { analyzeStory, shortestSolution, formatReport, evalCondition }
