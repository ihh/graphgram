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
    start:        { verbose: 'You stand at the entrance.',
                    brief:   'The entrance.' },

    win:          { verbose: 'You reach the goal. You have won!',
                    brief:   'The goal.' },

    room:         { verbose: 'A room.',
                    brief:   'A room.' },

    dead_end:     { verbose: 'A dead end; nothing here but dust.',
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

    potion:       { verbose: 'A health potion. You drink it. (+{healValue})',
                    brief:   'An empty vial where the potion was.',
                    status:  'potion used' },

    // --- Combat mini-game nodes -------------------------------------
    choice:       { verbose: 'A monster snarls. The fight is on.',
                    brief:   'The monster faces you. The fight continues.' },

    random:       { verbose: '...',
                    brief:   '...' },

    death:        { verbose: 'You have died.',
                    brief:   'You have died.' },

    // --- Puzzle mini-game nodes -------------------------------------
    puzzle_intro: { verbose: 'A puzzle bars the way. Solve it.',
                    brief:   'The puzzle bars the way.' },

    distractor:   { verbose: 'That was wrong. You are forced back to the puzzle.',
                    brief:   'Wrong path.' },

    // --- Catch-all --------------------------------------------------
    _default:     { verbose: 'A featureless space.',
                    brief:   'Here.' }
  },

  edge: {
    // `initial` is the narrative line printed the first time you traverse
    // the edge; `repeat` (optional) is printed on subsequent traversals;
    // `link` is the hyperlink text used as the outgoing affordance.

    // --- Forward corridors ------------------------------------------
    // `{before}` and `{link}` carry placeholders stamped on the
    // key-branch edge (a->k from keyDoor). `{prereq.link}` and
    // `{prereq.after}` appear on the locked edge (d->b). All
    // interpolate to empty when absent, so the templates stay clean
    // for non-keyDoor edges.
    path:        { initial: 'You continue forward. {before} {prereq.after}',
                   link:    'Continue {link} {prereq.link}' },

    passage:     { initial: 'A quiet passage unfolds. {before} {prereq.after}',
                   link:    'Take the passage {link} {prereq.link}' },

    monster:     { initial: 'A monster lunges! {before} {prereq.after}',
                   link:    'Fight {link} {prereq.link}' },

    puzzle:      { initial: 'A puzzle bars the way. {before} {prereq.after}',
                   link:    'Tackle the puzzle {link} {prereq.link}' },

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

    // --- Catch-all --------------------------------------------------
    _default:    { initial: 'You move on.',
                   link:    'Go' }
  }
}
