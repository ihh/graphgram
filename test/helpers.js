// Shared test helpers.
//
// The dungeon primitives stamp narrative slots (`{$macro: [...]}`,
// `{$kdBundle: [...]}`) onto RHS labels. Those are *plugin* RHS-label
// functions: graphgram only accepts them once `registerNarrator` has
// installed them on the Matcher, because the grammar JSON schema is
// generated from the matcher's registered function table.
//
// Tests therefore build grammars through this wrapper, which supplies a
// narrator-equipped Matcher in placeholder mode — no LLM calls, every
// narrative slot resolving to a deterministic `[theme:macro#ctx]` string.

const { Grammar: BaseGrammar, Matcher } = require('../index')
const { registerNarrator } = require('../narrator')

// A narrator-equipped Matcher. `placeholder: true` keeps every narrative
// slot deterministic and offline.
function testMatcher (opts) {
  const matcher = new Matcher()
  registerNarrator(matcher, Object.assign({ placeholder: true, theme: 'high_fantasy' }, opts))
  return matcher
}

// Drop-in replacement for `new Grammar(json, opts)` in tests.
function Grammar (json, opts) {
  return new BaseGrammar(json, Object.assign({ matcher: testMatcher() }, opts))
}

module.exports = { Grammar, testMatcher }
