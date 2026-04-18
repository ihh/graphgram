'use strict'

// Seance: circle prepared, voice answered, price paid.
// Linear 3-beat set-piece with decline and post-visit bypass.

const sp = require('../../setpiece-primitives')

module.exports = function (opts) {
  return [
    sp.makeSetpiece({
      name: 'setpiece-gothic-horror-seance',
      role: 'seance',
      beatMacros: ['seance_setup', 'seance_contact', 'seance_consequence'],
      entryMacro: 'seance_enter',
      declineMacro: 'seance_decline',
      bypassMacro: 'seance_bypass'
    }, opts)
  ]
}
