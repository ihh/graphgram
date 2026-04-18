'use strict'

// Theme → set-piece-rule-factory registry. Themes that aren't listed
// here contribute no set-pieces (the dungeon falls back to its usual
// generic expansion). Each factory returns an array of graphgram rules,
// shaped like the keyDoor rule.
//
// Lives at the project root so that grammar files eval'd by
// bin/transform.js can reach it with the same `../foo` convention they
// already use for dungeon-primitives.

const registry = {
  space_opera:    require('./grammars/setpieces/space_opera'),
  gothic_horror:  require('./grammars/setpieces/gothic_horror')
}

module.exports = {
  rulesFor: function (themeName, opts) {
    const factory = registry[themeName]
    return factory ? factory(opts) : []
  },
  themes: function () { return Object.keys(registry) }
}
