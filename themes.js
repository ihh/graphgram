'use strict'

// A fixed thematic vocabulary shared by the grammar, the narrator, and the
// debug/placeholder renderer. The theme is picked once per grammar run
// (deterministic in the seed) and then flows through every narrative slot,
// so all text in one dungeon is drawn from the same world.

const THEMES = [
  'space_opera',
  'gothic_horror',
  'high_fantasy',
  'steampunk',
  'post_apocalyptic',
  'cosmic_horror',
  'cyberpunk',
  'dark_fairy_tale',
  'pirate_adventure',
  'eldritch_deep_sea'
]

// Semantic "slots" where a narrative snippet will eventually live. Names are
// load-bearing: they appear in placeholder strings during debug, and they key
// into prompt templates once the runner is hooked up. Descriptions are used
// verbatim in the prompt templates produced by `macroPrompt` below.
const MACROS = {
  theme_intro:              'Opening scene: establish the world, tone, and the player-character\'s situation.',
  describe_room:            'A generic room the player enters.',
  describe_fork:            'A branching point with choices.',
  describe_door:            'A door, typically closed or locked.',
  describe_key:             'A key the player finds.',
  describe_unlock:          'The action of unlocking a door with the key.',
  describe_after_unlock:    'What lies beyond a newly unlocked door.',
  describe_passage:         'An uneventful corridor between rooms.',
  describe_take_passage:    'Player command: take this passage.',
  describe_monster_intro:   'A monster encounter begins.',
  describe_monster_attack:  'Player command: attack the monster.',
  describe_monster_retreat: 'Player command: retreat from the monster.',
  describe_monster_defeat:  'The monster is defeated.',
  describe_monster_death:   'The player is killed by the monster.',
  describe_puzzle_intro:    'A puzzle presents itself.',
  describe_puzzle_right:    'A correct answer solves the puzzle.',
  describe_puzzle_wrong:    'A wrong answer misleads the player.',
  describe_chest:           'A chest the player may open.',
  describe_chest_trap:      'A trapped chest springs.',
  describe_chest_treasure:  'Treasure found in a chest.',
  describe_chest_weapon:    'A weapon found in a chest.',
  describe_potion:          'A potion the player may drink.',
  describe_poison:          'A vial turns out to be poison.',
  describe_trap:            'A hidden trap triggers.',
  describe_scenery:         'Ambient environmental flavor.',
  describe_dead_end:        'A dead end discovery.',
  describe_win:             'Victory: the player reaches the final goal.',
  describe_death:           'The player has died.',

  // --- space_opera set-piece: rescue_mission -----------------------------
  // A 3-beat linear showpiece: answering a distress call, infiltrating a
  // hostile craft, escaping with the rescued party.
  rescue_mission_enter:     'Affordance text for accepting the rescue mission.',
  rescue_mission_setup:     'Rescue mission beat 1: the distress call arrives and the player suits up.',
  rescue_mission_stealth:   'Rescue mission beat 2: boarding the hostile craft, moving unseen.',
  rescue_mission_escape:    'Rescue mission beat 3: fighting free with the rescued party.',
  rescue_mission_decline:   'Choosing to walk away from the rescue call — the comms are silenced.',
  rescue_mission_bypass:    'Returning past the spot where the rescue call once came; the wreckage now drifts quietly.',

  // --- gothic_horror set-piece: seance -----------------------------------
  // A 3-beat ritual: preparing the circle, making contact, paying the price.
  seance_enter:             'Affordance text for beginning the seance.',
  seance_setup:             'Seance beat 1: preparing the circle, lighting candles, steadying nerves.',
  seance_contact:           'Seance beat 2: a voice answers through the veil — it knows things it should not.',
  seance_consequence:       'Seance beat 3: the price is paid; the circle breaks.',
  seance_decline:           'Choosing not to begin the ritual — the candles are left dark.',
  seance_bypass:            'Returning past the cold parlor where the seance once bled through; the room is empty now.'
}

// FNV-1a over the seed string — same seed in, same theme out.
function pickTheme (seed) {
  let h = 2166136261
  const s = String(seed == null ? '' : seed)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return THEMES[(h >>> 0) % THEMES.length]
}

function formatPlaceholder (theme, name, ctxId) {
  const t = theme || '?'
  const c = (ctxId == null || ctxId === '') ? '' : '#' + ctxId
  return '[' + t + ':' + name + c + ']'
}

// Build the prompt we'll send to the LLM for a given macro. Kept short and
// well-formed so that prompt caching sees a stable preamble — the per-call
// payload is just the theme/slot/ctx lines.
function macroPrompt (theme, name, ctxId) {
  const desc = MACROS[name] || ('Narrative slot "' + name + '".')
  return 'Theme: ' + theme + '.\n'
       + 'Slot: ' + name + '.\n'
       + 'Context id: ' + (ctxId == null || ctxId === '' ? '(none)' : ctxId) + '.\n'
       + 'Task: ' + desc + ' Write 1 to 2 sentences, in second person, in the voice of the theme.'
}

module.exports = {
  THEMES,
  MACROS,
  pickTheme,
  formatPlaceholder,
  macroPrompt,
  listThemes: function () { return THEMES.slice() },
  listMacros: function () { return Object.keys(MACROS) }
}
