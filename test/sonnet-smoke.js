#!/usr/bin/env node
// Quick smoke-test for sonnet-runner. Not hooked into `npm test` —
// run manually: `node test/sonnet-smoke.js`. Costs a few tokens per run
// (one uncached call) unless the cache is already warm.

require('dotenv').config({ quiet: true })
const fs = require('fs')
const path = require('path')
const { makeSonnetRunner } = require('../sonnet-runner')

const cacheDir = path.join(__dirname, '.sonnet-smoke-cache')
fs.rmSync(cacheDir, { recursive: true, force: true })

const prompt = 'Reply with exactly the word: ping'
const warn = (m) => console.log('  runner> ' + m)

console.log('1. First call (expected: api miss, cache write)')
const r1 = makeSonnetRunner({ cacheDir, warn })
const out1 = r1(prompt)
console.log('  result: ' + JSON.stringify(out1))
const s1 = r1.summary()
console.log('  stats: ', s1)
if (s1.cacheHits !== 0 || s1.cacheMisses !== 1) throw new Error('expected 0 hits + 1 miss')

console.log('\n2. Second call, fresh runner, same cacheDir (expected: cache hit)')
const r2 = makeSonnetRunner({ cacheDir, warn })
const out2 = r2(prompt)
console.log('  result: ' + JSON.stringify(out2))
const s2 = r2.summary()
console.log('  stats: ', s2)
if (s2.cacheHits !== 1 || s2.cacheMisses !== 0) throw new Error('expected 1 hit + 0 misses')
if (out2 !== out1) throw new Error('cache returned different text than first call')

console.log('\n3. cacheReadOnly on a fresh prompt (expected: throw)')
const r3 = makeSonnetRunner({ cacheDir, cacheReadOnly: true, warn })
let threw = false
try { r3('Reply with exactly the word: pong') }
catch (e) { threw = true; console.log('  caught: ' + e.message.slice(0, 80)) }
if (!threw) throw new Error('expected cacheReadOnly to throw on miss')

console.log('\n4. cacheReadOnly on a cached prompt (expected: hit, no throw)')
const out4 = r3(prompt)
console.log('  result: ' + JSON.stringify(out4))
if (out4 !== out1) throw new Error('read-only cache returned different text')

console.log('\nAll smoke tests passed.')
fs.rmSync(cacheDir, { recursive: true, force: true })
