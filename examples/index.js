'use strict'

// The worked-example catalogue.
//
// Each entry is a module matching the interface in docs/spec/examples.md:
//
//   { id, title, topology, puzzles, defaultSeeds, budget, grammar(opts) }
//
// `grammar(opts)` returns grammar JSON — never a constructed Grammar. The
// caller owns construction because it also owns narrator registration, and
// the narrator has to be installed on the Matcher *before* the grammar JSON
// is validated (the `$macro` / `$kdBundle` RHS functions are plugins, and
// the JSON schema is generated from the matcher's plugin table). See
// bin/story.js for the assembly, and test/helpers.js for the same dance in
// miniature.
//
// The catalogue is deliberately ordered from simplest to richest. That order
// is what the docs site and `bin/story.js --list` present, and it is the
// order someone reading the examples for the first time should meet them in.

const CATALOGUE = [
  require('./dag-plain'),
  require('./dag-locked'),
  require('./maze-plain'),
  require('./maze-locked'),
  require('./mystery-daily')
]

const byId = {}
CATALOGUE.forEach(function (ex) {
  if (byId[ex.id]) throw new Error('duplicate example id: ' + ex.id)
  byId[ex.id] = ex
})

function list () { return CATALOGUE.slice() }

function get (id) {
  const ex = byId[id]
  if (!ex) {
    throw new Error('unknown example "' + id + '". Known: ' +
      CATALOGUE.map(function (e) { return e.id }).join(', '))
  }
  return ex
}

// The canonical seed is the one the docs site ships as playable and the one
// golden-file tests pin. Keeping the choice in one place means a change to
// `defaultSeeds` can never leave the site and the tests disagreeing.
function canonicalSeed (id) { return get(id).defaultSeeds[0] }

module.exports = { list, get, canonicalSeed, ids: CATALOGUE.map(function (e) { return e.id }) }
