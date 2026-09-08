'use strict'

// mystery-daily — the murder-mystery track of the worked-example catalogue.
//
// Bidirectional and puzzle-inclusive, but the locks are social: the keys are
// facts about people, and the doors are people who will not talk. See the
// header of ../mystery-primitives.js for the conceit; this file is the
// staging of it into a grammar.
//
// The stage order is load-bearing:
//
//   init       start --path--> win, the seed everything grows from
//   scenes     the house: midpoint rooms, parallel routes, dead ends,
//              all typed `scene` rather than `room`
//   deduction  the spine — ONE seeded social lock, then nestingDepth-1
//              nestings of it. This is the chain the mystery is actually
//              about, and it is built before anything else can consume the
//              `path` edges it needs
//   cast       the rest of the household: spare locks and a witness or two
//              who will simply talk
//   denouement/unmask/verdicts/dossier   the terminal structure
//   minigame   one cipher, refined from a leftover corridor. Runs AFTER the
//              funnel, because refining a `path` edge into `win` before the
//              funnel had swallowed it would leave a route to the goal that
//              skips the accusation entirely
//   decorate   dot labels
//
// Reproducibility: `seedForDate` turns a calendar date into the seed, so
// "today's mystery" is a pure function of the date string and nothing in
// this file reads a clock.

const dp = require('../dungeon-primitives')
const mp = require('../mystery-primitives')

const BUDGET = { rooms: 8, keys: 4, nestingDepth: 3, npcs: 5, minigames: 1 }

// 'YYYY-MM-DD' -> a stable non-negative integer seed.
//
// FNV-1a over the raw date string — the same hash themes.pickTheme uses,
// chosen for the same reason: it is four lines, it has no dependencies, and
// it avalanches enough that adjacent dates land nowhere near each other.
// The final `>>> 1` keeps the result inside the non-negative 31-bit range
// that every consumer (MersenneTwister, JSON, a CLI's parseInt) handles
// without surprises.
//
// Deliberately NOT date arithmetic: no Date parsing, no timezone, no
// Date.now(). The string is the input, an integer is the output, and the
// same date names the same mystery on every machine on earth.
function seedForDate (dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString)))
    throw new Error('seedForDate: expected a YYYY-MM-DD date string, got ' + JSON.stringify(dateString))
  let h = 2166136261
  const s = String(dateString)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) >>> 1
}

function grammar (opts) {
  opts = opts || {}
  const budget = Object.assign({}, BUDGET, opts.budget)

  // Scenes are grown one per rule application on top of start/win.
  const sceneLimit = Math.max(2, budget.rooms - 1)
  // The spine consumes `nestingDepth` of the key budget: one seeded lock
  // plus one per level of nesting beyond the first. Whatever is left over
  // becomes a stand-alone lock somewhere else in the house — a red herring
  // that is nonetheless a real puzzle.
  const spineLocks = Math.max(1, budget.nestingDepth)
  const looseLocks = Math.max(0, budget.keys - spineLocks)
  // Every lock puts one person in the house; the remainder of the npc
  // budget are witnesses with nothing to hide.
  const witnesses = Math.max(0, budget.npcs - spineLocks - looseLocks)
  // Name the murderer only with most of the file in hand. One short of the
  // full key budget, so the last secret can stay unfound and the case still
  // close — a mystery that demands every scrap is a checklist, not a case.
  const minEvidence = Math.max(1, budget.keys - 1)

  const stages = [
    dp.initStartGoalStage(),

    { name: 'scenes',
      limit: sceneLimit,
      rules: [
        // Two-way midpoints make the house bidirectional (topology
        // 'bidirectional' is a promise the IR makes to exporters).
        dp.midpointRoom({ roomType: mp.NODE_SCENE, weight: 2 }),
        // parallelPath matters more here than in a dungeon: it is the only
        // primitive that manufactures fresh edgeId-free `path` edges, which
        // is what the social locks need somewhere to hang from.
        dp.parallelPath({ roomType: mp.NODE_SCENE, weight: 2 }),
        dp.deadEnd({ deadEndType: mp.NODE_SCENE, weight: 1 })
      ] },

    // Freeze a seed-derived salt onto the start node now that the house is
    // built and before anyone is put in it. Without this the cast is pinned
    // by the stage limits and every day of the year deals the same five
    // servants — see CAST_INDEX_SRC in ../mystery-primitives.js.
    { name: 'cast-salt', rules: [mp.stampCastSalt()] },

    // The deduction spine. Both rules share the 'spine' id qualifier, which
    // is safe because they live in one stage and $$iter advances on every
    // application regardless of which rule fired.
    { name: 'deduction',
      limit: spineLocks,
      rules: [
        mp.socialLock({ idRole: 'spine', chain: 'spine', limit: 1, weight: 1 }),
        mp.socialLock({ idRole: 'spine', nest: true, limit: spineLocks - 1, weight: 1 })
      ] },

    { name: 'cast',
      limit: looseLocks + witnesses,
      rules: [
        mp.socialLock({ idRole: 'cast', limit: looseLocks, weight: 1 }),
        mp.suspect({ idRole: 'cast', limit: witnesses, weight: 1 })
      ] }
  ].concat(mp.accusation({ minEvidence: minEvidence }))

  if (budget.minigames > 0) {
    // Two applications per minigame: one to flavor a corridor as a puzzle,
    // one to expand it into the quiz. The locked cabinet the ledger is in.
    stages.push({ name: 'minigame',
      limit: budget.minigames * 2,
      rules: [
        dp.refineEdge(dp.EDGE_PATH, dp.EDGE_PUZZLE, { limit: budget.minigames, weight: 1 }),
        dp.puzzleChoice({ limit: budget.minigames, numDistractors: 3, weight: 1 })
      ] })
  }

  stages.push(dp.dotDecorationStage())

  return { name: 'mystery-daily', start: 'START', stages: stages }
}

module.exports = {
  id: 'mystery-daily',
  title: 'A Note in Another Hand',
  topology: 'bidirectional',
  puzzles: true,
  // defaultSeeds[0] is canonical: the docs site ships it, golden tests pin
  // it, `make examples` builds it. For the daily puzzle the canonical seed
  // is a date, worked through seedForDate so the derivation is visible.
  defaultSeeds: [seedForDate('2026-01-01'), 42, 1729],
  budget: BUDGET,
  grammar,
  seedForDate
}
