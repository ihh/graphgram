// Default phrasebook for the play engine.
//
// All text the engine displays goes through this lookup:
//   - `node` entries keyed by `nodeId` or `type` determine what the player
//     sees when they enter a node (verbose / brief descriptions, optional
//     status chip in the status bar).
//   - `edge` entries keyed by `edgeId` or `type` determine the narrative
//     line printed when an edge is traversed (`initial` / `repeat`) and
//     the text of the outgoing-link affordance (`link`).
//
// Lookup order: by-id -> by-type -> `_default`. The {field} placeholders
// in strings are replaced by the corresponding label field; `healValue`,
// `playerDamage`, and `monsterDamage` are rendered as percentages.
//
// To override: drop a sibling `text.js` in this folder that sets
// `window.TEXT = { node: { ... }, edge: { ... } }`. Your overrides are
// merged over these defaults at load time; anything you omit falls
// through to the default.

window.DEFAULT_TEXT = {
  node: {
    // --- Structural / map nodes -------------------------------------
    // `{text}` surfaces whatever the grammar stamped onto the label —
    // a themed-macro placeholder in --placeholder / --no-llm mode, or
    // LLM-generated prose in --sonnet mode. Interpolates to empty when
    // absent, so the fallback copy still reads cleanly.
    start:        { verbose: '{text}',
                    brief:   'The entrance.' },

    win:          { verbose: '{text}',
                    brief:   'The goal.' },

    room:         { verbose: '{text}',
                    brief:   'The room, as you remember it.' },

    dead_end:     { verbose: '{text}',
                    brief:   'A dead end.' },

    // --- Inventory-bearing nodes ------------------------------------
    // `{text}` surfaces whatever the grammar stamped onto the label —
    // a themed macro placeholder in --placeholder mode, or LLM-generated
    // prose once the runner is wired up. Interpolates to empty for
    // labels that don't carry a text field.
    key:          { verbose: 'A key lies on the floor. You pick it up ({pairId}). {text}',
                    brief:   'The spot where you found the key. {text}',
                    status:  'Key {pairId}' },

    door:         { verbose: 'A locked door ({pairId}) blocks the way. {text}',
                    brief:   'A locked door ({pairId}). {text}' },

    potion:       { verbose: '{text} You drink it. (+{healValue})',
                    brief:   'An empty vial where the potion was.',
                    status:  'potion used' },

    // --- Combat mini-game nodes -------------------------------------
    // {text} is only present on the entry choice node (stamped by
    // monsterBattle on cN); the advantage state keeps its generic copy.
    choice:       { verbose: '{text}',
                    brief:   'The monster faces you. The fight continues.' },

    random:       { verbose: '...',
                    brief:   '...' },

    death:        { verbose: 'You have died.',
                    brief:   'You have died.' },

    // --- Puzzle mini-game nodes -------------------------------------
    puzzle_intro: { verbose: '{text}',
                    brief:   'The puzzle bars the way.' },

    distractor:   { verbose: 'That was wrong. You are forced back to the puzzle.',
                    brief:   'Wrong path.' },

    // --- Set-piece nodes --------------------------------------------
    // Beat nodes in a linear showpiece (setup / stealth / escape, etc).
    // The {text} placeholder surfaces whatever macro was stamped by
    // the set-piece rule; {beat} is 1..N.
    setpiece_step: { verbose: 'Set-piece beat {beat}. {text}',
                     brief:   'Set-piece beat {beat}.' },

    // Intermediate "walk away" / "return past" nodes attached to the
    // decline and bypass edges, respectively. {role} is 'decline' or
    // 'bypass'.
    setpiece_exit: { verbose: 'Set-piece {role}. {text}',
                     brief:   'Set-piece {role}.' },

    // --- Catch-all --------------------------------------------------
    _default:     { verbose: 'A featureless space.',
                    brief:   'Here.' }
  },

  edge: {
    // `initial` is the narrative line printed the first time you traverse
    // the edge; `repeat` (optional) is printed on subsequent traversals;
    // `link` is the hyperlink text used as the outgoing affordance.

    // --- Forward corridors ------------------------------------------
    // `{link}` IS the button label when the edge's label stamped one
    // (via a button_ macro or kdBundle). When empty, the engine's
    // linkTextFor falls through to dot.label, then to the type name —
    // so a missing-link edge still gets a readable button.
    // `{before}` (passage preview) and `{prereq.after}` (opened-door
    // description) are set by kdBundle on the key-branch and locked
    // edges respectively; empty elsewhere.
    path:        { initial: '{before} {prereq.after}',
                   link:    '{link}' },

    passage:     { initial: '{before} {prereq.after}',
                   link:    '{link}' },

    monster:     { initial: '{before} {prereq.after}',
                   link:    '{link}' },

    puzzle:      { initial: '{before} {prereq.after}',
                   link:    '{link}' },

    // --- Return corridors -------------------------------------------
    backtrack:   { initial: 'You double back the way you came.',
                   link:    'Go back' },

    return:      { initial: 'You take the shortcut.',
                   link:    'Take the shortcut' },

    // --- Mini-game internals ----------------------------------------
    // A `choice` edge's link text falls back to the edge's dot.label
    // (e.g. "attack", "defend", "press attack") which is usually more
    // descriptive than a generic string. Override per-edgeId for custom
    // flavor.
    choice:      { initial: 'You make your move.',
                   link:    null },

    // Random-node consequence edges are resolved by the engine, not the
    // player, so they have no link text.
    consequence: { initial: '...',
                   link:    null },

    retreat:     { initial: 'You flee from battle.',
                   link:    'Retreat' },

    // --- Set-piece edges --------------------------------------------
    // All three surface `{link}` directly — the set-piece primitive stamps
    // a themed button macro on each so they read as distinct affordances.
    // The narrative line printed on traversal is suppressed to avoid
    // echoing the button text; the destination node's `text` carries the
    // beat / decline / bypass prose.
    setpiece_entry:   { initial: '',
                        link:    '{link}' },

    setpiece_decline: { initial: '',
                        link:    '{link}' },

    setpiece_bypass:  { initial: '',
                        link:    '{link}' },

    // Internal linear edges inside the set-piece; no affordance flair,
    // just short forward-movement prose.
    setpiece:         { initial: '...',
                        link:    'Continue' },

    // --- Catch-all --------------------------------------------------
    _default:    { initial: 'You move on.',
                   link:    'Go' }
  }
}
