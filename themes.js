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
  seance_bypass:            'Returning past the cold parlor where the seance once bled through; the room is empty now.',

  // --- button_ slots: short click affordances ---------------------------
  // Rendered short (2 to 6 words, imperative) rather than 1-2 sentences —
  // see macroPrompt. Use when a narrative slot is a button / link label
  // rather than descriptive prose.
  button_passage:           'Button label: move forward down a corridor / passage. Neutral about what lies ahead.',
  button_retreat:           'Button label: double back the way you came.',
  button_approach:          'Button label: step toward a thing the player has already noticed (door, object, figure).'
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
// payload is just the theme/slot/ctx lines. `worldBlurb` (optional) is a
// 1-2 sentence world-setup shared across all calls in one run; threading it
// in gives every snippet the same lore, props, and tone — so a sequence of
// rooms reads as one place rather than ten disconnected vignettes.
// Small vocabulary of concrete spatial nouns, used to seed a per-call
// variation anchor for button macros. Without a concrete anchor the
// model converges to a single modal answer ("Venture Deeper into the
// Dark", every time) because the ctxId is opaque to it. Deterministic
// hash(ctxId) -> one of these, so per-call variety is reproducible and
// cache-stable across replays.
const VARY_WORDS = [
  'stair', 'archway', 'corridor', 'threshold', 'descent', 'aperture',
  'vestibule', 'landing', 'antechamber', 'gallery', 'cloister', 'transept',
  'narthex', 'annex', 'undercroft', 'mezzanine', 'catwalk', 'spiral',
  'gateway', 'breach', 'passage', 'hall', 'chamber', 'concourse', 'ramp',
  'bridge', 'walkway', 'alcove', 'tunnel', 'grate'
]
function varyHint (ctxId) {
  const s = String(ctxId == null ? '' : ctxId)
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  return VARY_WORDS[h % VARY_WORDS.length]
}

function macroPrompt (theme, name, ctxId, worldBlurb) {
  const desc = MACROS[name] || ('Narrative slot "' + name + '".')
  // Naming convention: any slot whose name starts with "button_" is a
  // short click affordance, not descriptive prose. Kept to 2-6 words so
  // a link / button stays legible. This lets grammar authors reach for
  // a button macro without having to wire a separate runner path — the
  // prompt template just adapts to the slot name.
  const isButton = /^button_/.test(name)
  let p = 'Theme: ' + theme + '.\n'
  if (worldBlurb) p += 'World: ' + worldBlurb + '\n'
  p += 'Slot: ' + name + '.\n'
     + 'Context id: ' + (ctxId == null || ctxId === '' ? '(none)' : ctxId) + '.\n'
  if (isButton) {
    p += 'Variation anchor (build the label around re-theming this spatial concept): '
       + varyHint(ctxId) + '.\n'
       + 'Task: ' + desc + ' '
       + 'Write 2 to 6 words, imperative, suitable as a click-through button label. '
       + 'No trailing punctuation. Do not reveal what lies beyond. '
       + 'Do NOT include the word "dark" or "darkness"; reach for more specific imagery.'
  } else {
    p += 'Task: ' + desc + ' '
       + 'Write 1 to 2 sentences, in second person, in the voice of the theme. '
       + 'Do not repeat the world setup verbatim; add specific new detail that fits it.'
  }
  return p
}

// One-shot prompt for the shared world-setup blurb. Cached in the narrator
// and passed into every subsequent macroPrompt, giving all per-room /
// per-passage prose a common anchor.
function worldBlurbPrompt (theme) {
  return 'Theme: ' + theme + '.\n'
       + 'Task: In 1 to 2 sentences, establish the world and tone of a dungeon-crawler text adventure '
       + 'set in this theme. Name at most one concrete location / faction / artifact so later '
       + 'descriptions can reference it. Second person, no meta-commentary.'
}

module.exports = {
  THEMES,
  MACROS,
  pickTheme,
  formatPlaceholder,
  macroPrompt,
  worldBlurbPrompt,
  listThemes: function () { return THEMES.slice() },
  listMacros: function () { return Object.keys(MACROS) }
}
