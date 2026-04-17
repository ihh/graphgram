// Example user overrides for the play engine's phrasebook.
//
// Copy this file to `play/text.js` (same directory) and tweak. Anything
// you set here overrides the corresponding defaults in phrasebook.js.
// You only need to include the entries you want to change.
//
// Lookup order: the engine looks for a key matching the node/edge's
// `nodeId` or `edgeId` first (specific override), then its `type`
// (category override), then `_default`. Placeholders like {pairId} or
// {healValue} pull from the node/edge label object; damage / heal
// fractions render as percentages.

window.TEXT = {
  node: {
    // Broad overrides by type
    start: {
      verbose: 'Dust motes hang in a shaft of light. You can just make out a passage ahead.',
      brief:   'The entry hall, empty now.'
    },
    key: {
      verbose: 'A small iron key glints on the flagstones. You slip it into your pouch ({pairId}).',
      brief:   'Dust outlines where the key lay.',
      status:  '🔑 {pairId}'
    },
    potion: {
      verbose: 'A vial of red liquid. You uncork it and drink — warmth spreads through your chest. (+{healValue})',
      brief:   'The empty vial glitters on the floor.',
      status:  '💧 potion drunk'
    },
    death: {
      verbose: 'The world tilts. Your last thought is of the dungeon. You have died.',
      brief:   'You have died.'
    },
    win: {
      verbose: 'Daylight! You emerge into the open air. The dungeon is behind you.',
      brief:   'The way out.'
    }

    // Per-node-id overrides (highest priority):
    // 'room_7': { verbose: 'A specific custom room only nodeId=room_7 sees.' }
  },

  edge: {
    monster: {
      initial: 'Something heavy drops from the ceiling.',
      link:    'Face the beast'
    },
    puzzle: {
      initial: 'An inscription, half-legible, challenges you.',
      link:    'Read the inscription'
    },
    retreat: {
      initial: 'You break off and run. The monster\'s roar fades behind you.',
      link:    'Flee'
    }

    // Per-edge-id overrides (highest priority):
    // 'e_ad_4': { initial: 'A specific custom traversal narrative.' }
  }
}
