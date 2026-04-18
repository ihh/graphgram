'use strict'

// Rescue mission: a distress call, a quiet boarding, a loud escape.
// Linear 3-beat set-piece with decline and post-visit bypass.

const sp = require('../../setpiece-primitives')

module.exports = function (opts) {
  return [
    sp.makeSetpiece({
      name: 'setpiece-space-opera-rescue',
      role: 'rescue',
      beatMacros: ['rescue_mission_setup', 'rescue_mission_stealth', 'rescue_mission_escape'],
      entryMacro: 'rescue_mission_enter',
      declineMacro: 'rescue_mission_decline',
      bypassMacro: 'rescue_mission_bypass'
    }, opts)
  ]
}
