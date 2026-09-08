const { Grammar, Matcher } = require('./index')
const { registerNarrator } = require('./narrator')
const dp = require('./dungeon-primitives')
const mp = require('./mystery-primitives')

// grammars/*.js are bare expressions, not modules, and their require() paths
// are written relative to bin/ — which is how bin/transform.js loads them.
const req = require('module').createRequire(__dirname + '/bin/transform.js')
const src = require('fs').readFileSync('grammars/dunjs-dungeon.js').toString()
const grammarJson = function () { return new Function('require', 'return (' + src + ')')(req) }

const PLACE = { start: 1, win: 1, room: 1, dead_end: 1, potion: 1 }
for (let seed = 1; seed <= 50; ++seed) {
  const matcher = new Matcher()
  registerNarrator(matcher, { placeholder: true, theme: 'high_fantasy' })
  const g = new Grammar(grammarJson(), { matcher }).evolve({ seed }).graph
  const type = function (n) { return (g.node(n) || {}).type }
  console.log(seed,
    g.nodes().filter(function (n) { return PLACE[type(n)] }).length,
    g.nodes().filter(function (n) { return type(n) === dp.NODE_KEY }).length,
    mp.nestingDepth(g, { secretType: dp.NODE_KEY }))
}
