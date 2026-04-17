// Simple wall-clock benchmark. Runs a representative grammar workload
// several times at a fixed seed and reports the median time. Use it as a
// before/after check when touching the subgraph matcher. Not a test.

const { Grammar } = require('../index')
const dp = require('../dungeon-primitives')

function runDungeon (seed) {
  const g = new Grammar({
    name: 'bench-dungeon',
    start: 'START',
    stages: [
      dp.initStartGoalStage(),
      {
        name: 'expand',
        limit: 20,
        rules: [
          dp.midpointRoom({ weight: 2 }),
          dp.deadEnd({ weight: 1 }),
          dp.parallelPath({ weight: 1 }),
          dp.keyDoor({ weight: 1, limit: 3 })
        ]
      },
      {
        name: 'refine',
        rules: dp.refineEdges(dp.EDGE_PATH,
          [dp.EDGE_PASSAGE, dp.EDGE_MONSTER, dp.EDGE_PUZZLE],
          { weight: 1 })
      },
      dp.dotDecorationStage()
    ]
  })
  return g.evolve({ seed }).graph
}

function time (fn) {
  const t0 = process.hrtime.bigint()
  const r = fn()
  const t1 = process.hrtime.bigint()
  return { ms: Number(t1 - t0) / 1e6, r }
}

function median (xs) {
  const s = xs.slice().sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const WARMUP = 2

for (let i = 0; i < WARMUP; i++) runDungeon(SEEDS[i % SEEDS.length])

const times = []
const sizes = []
for (const s of SEEDS) {
  const { ms, r } = time(() => runDungeon(s))
  times.push(ms)
  sizes.push({ n: r.nodes().length, e: r.edges().length })
}

const avgN = sizes.reduce((a, b) => a + b.n, 0) / sizes.length
const avgE = sizes.reduce((a, b) => a + b.e, 0) / sizes.length
console.log(`dungeon (${SEEDS.length} seeds): median=${median(times).toFixed(1)}ms `
  + `min=${Math.min(...times).toFixed(1)}ms max=${Math.max(...times).toFixed(1)}ms `
  + `avgNodes=${avgN.toFixed(1)} avgEdges=${avgE.toFixed(1)}`)
