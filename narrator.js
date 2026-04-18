// Port of dunjs's LLM CLI narrative helpers, packaged as a set of
// RHS-label functions that can be registered on a graphgram Grammar.
//
// Once registered, rule authors can reach for the following expressions
// inside any RHS `label` block:
//
//   { $asNarrator: "describe a rusty gate" }
//   { $asPlayer: "go through the gate" }
//   { $themedVersion: ["dank mildewy", "There is a door here."] }
//   { $themedContinuation: [theme, previous, template] }
//   { $contextualCommand: [previous, template] }
//   { $themedCommand: [theme, template] }
//   { $themedContextualCommand: [theme, previous, template] }
//   { $getTheme: [] }
//   { $theme: [] }                    // returns the pinned theme (or $getTheme fallback)
//   { $macro: ["describe_room", "${a.id}"] }   // [name, ctxId]
//   { $kdBundle: [iter, field] }      // used by dungeon-primitives keyDoor
//
// `iter` for $kdBundle is typically `{$eval: "$iter"}` so that every rule
// application gets its own cached bundle of coherent (same-theme) texts.
//
// Two modes decide what `$macro` and `$kdBundle` actually produce:
//   (a) placeholder mode (opts.placeholder = true) — every narrative slot
//       returns a structured `[theme:macro#ctxId]` string, so the grammar
//       can be debugged without any LLM calls.
//   (b) runner mode — prompts are built (via themes.macroPrompt for $macro)
//       and handed to opts.runner (sonnet-runner or the `llm` CLI wrapper).

const { execSync } = require('child_process')
const themes = require('./themes')

// Shell-escape a prompt for `llm "<prompt>"`.
function shellQuote (s) {
  return '"' + String(s).replace(/(["'$`\\])/g, '\\$1') + '"'
}

function makeRunner (opts) {
  const llmCmd = opts.llm || 'llm'
  const disabled = !!opts.disabled
  const warn = opts.warn || (() => {})
  return function run (prompt) {
    if (disabled) return '[placeholder]'
    const cmd = llmCmd + ' ' + shellQuote(prompt)
    warn(cmd)
    try {
      return execSync(cmd, { encoding: 'utf-8' }).trim()
    } catch (e) {
      warn('llm failed: ' + e.message)
      return '[llm error]'
    }
  }
}

// Permissive JSON schemas for rhs-function arguments; graphgram validates
// the grammar against these. Kept loose so callers can use `{$eval:...}`.
const anyValue = {}
const anyList = { type: 'array', items: anyValue }

// opts = { llm, disabled, warn, kdBundleCache, runner, theme, placeholder }
// If opts.runner is a function (e.g. a sonnet-runner) it is used instead of
// shelling to `llm`. opts.theme pins the theme globally (so kdBundle/$macro
// see one consistent world per run). opts.placeholder short-circuits all
// model calls and returns `[theme:slot#ctx]` strings for debug.
function registerNarrator (target, opts) {
  opts = opts || {}
  const run = (typeof opts.runner === 'function') ? opts.runner : makeRunner(opts)
  const kdCache = opts.kdBundleCache || {}
  const pinnedTheme = opts.theme || null
  const placeholder = !!opts.placeholder

  function register (name, func, schema) {
    if (target && typeof target.registerRhsLabelFunction === 'function')
      target.registerRhsLabelFunction(name, func, schema)
    else if (target && target.rhsLabelFunc)
      target.rhsLabelFunc['$' + name] = { func: func, schema: schema }
    else
      throw new Error('registerNarrator: target must be a Grammar or Matcher')
  }

  function asNarrator (prompt) {
    return run('In the second person, as a narrator to a player, ' + prompt)
  }
  function asPlayer (prompt) {
    return run('In the second person imperative, as a player commanding their character, ' + prompt)
  }
  function themedVersion (theme, template) {
    return asNarrator('reword the following text with a ' + theme + ' theme: ' + template)
  }
  function themedContinuation (theme, previous, template) {
    previous = String(previous).replace(/\n/g, ' ')
    return asNarrator(
      "give the next section of the narrative. The next section should reword the text '" +
      template + "' with a " + theme + " theme. The narrative so far is: " + previous)
  }
  function contextualCommand (previous, template) {
    previous = String(previous).replace(/\n/g, ' ')
    return asPlayer(
      "give the next command after the narrative so far. The command should reword the command '" +
      template + "' to make it specific to the narrative so far, which is: " + previous)
  }
  function themedCommand (theme, template) {
    return asPlayer('reword the following command with a ' + theme + ' theme: ' + template)
  }
  function themedContextualCommand (theme, previous, template) {
    previous = String(previous).replace(/\n/g, ' ')
    return asPlayer(
      "give the next command after the narrative so far. The command should reword the text '" +
      template + "' with a " + theme + " theme. The narrative so far is: " + previous)
  }

  // If opts.theme is pinned, getTheme short-circuits and returns it (zero
  // API / zero shell-out). Otherwise fall back to the original prompt.
  function getTheme () {
    if (pinnedTheme) return pinnedTheme
    return run("A two-or-three word adjectival phrase, evocative of a dungeon (e.g. 'rusty iron' or 'dank mildewy').")
  }

  // $theme: direct accessor to the current theme. Useful in RHS labels like
  // `{ theme: { $theme: [] } }` to stamp the chosen theme onto a node.
  function theme () { return getTheme() }

  // $macro: the main narrative primitive. In placeholder mode, produces a
  // structured `[theme:name#ctxId]` string; in runner mode, issues a
  // well-formed prompt via themes.macroPrompt and returns the response.
  //
  // Call forms from grammars:
  //   { $macro: 'describe_room' }                  — name only
  //   { $macro: ['describe_room', '${a.id}'] }     — name + ctxId
  function macro (name, ctxId) {
    const t = getTheme()
    if (placeholder) return themes.formatPlaceholder(t, name, ctxId)
    return run(themes.macroPrompt(t, name, ctxId))
  }

  // Shared-theme narrative bundle for the keyDoor primitive.
  // Cached by the unique key the rule supplies (typically iteration number),
  // so every label in a single rule application reads the same coherent set
  // of texts without issuing the same LLM prompt twice.
  //
  // In placeholder mode, the bundle's fields are macro placeholders so the
  // graph is legible without any LLM calls. In runner mode, the original
  // LLM-driven bundle path is used (preserves the hand-tuned prompts that
  // produced the best narrative coherence in earlier experiments).
  function kdBundle (key, field) {
    let b = kdCache[key]
    if (!b) {
      const t = getTheme()
      const pairId = 'pair_' + key
      if (placeholder) {
        b = kdCache[key] = {
          theme: t,
          pairId: pairId,
          shutText: themes.formatPlaceholder(t, 'describe_door', pairId),
          keyText:  themes.formatPlaceholder(t, 'describe_key',  pairId),
          before:   themes.formatPlaceholder(t, 'describe_passage', pairId + '/branch'),
          link:     themes.formatPlaceholder(t, 'describe_take_passage', pairId + '/branch'),
          unlock:   themes.formatPlaceholder(t, 'describe_unlock', pairId),
          after:    themes.formatPlaceholder(t, 'describe_after_unlock', pairId)
        }
      } else {
        const shut = themedVersion(t, 'There is a door here. It is closed and locked.')
        const keyText = themedVersion(t, 'There is a key here. You pick it up.')
        const preview = themedVersion(t, 'You see a passage.')
        const takeCmd = themedCommand(t, 'Take the passage.')
        const doorContext = keyText + ' (...later in your adventure...) ' + shut
        const unlock = contextualCommand(doorContext, 'Unlock the door with the key (describing the key).')
        const opened = themedContinuation(t, doorContext, 'The key unlocks the door. You go through.')
        b = kdCache[key] = {
          theme: t,
          pairId: pairId,
          shutText: shut,
          keyText: keyText,
          before: preview,
          link: takeCmd,
          unlock: unlock,
          after: opened
        }
      }
    }
    return field ? b[field] : b
  }

  register('asNarrator', asNarrator,
    { description: 'LLM narration in the second person.', oneOf: [{ type: 'string' }] })
  register('asPlayer', asPlayer,
    { description: 'LLM output in the voice of a player giving commands.', oneOf: [{ type: 'string' }] })
  register('themedVersion', themedVersion,
    { description: 'Reword a template with a given theme, as a narrator.', oneOf: [anyList] })
  register('themedContinuation', themedContinuation,
    { description: 'Continue a narrative with a themed reword of a template.', oneOf: [anyList] })
  register('contextualCommand', contextualCommand,
    { description: 'Player command that fits the narrative so far.', oneOf: [anyList] })
  register('themedCommand', themedCommand,
    { description: 'Player command reworded with a theme.', oneOf: [anyList] })
  register('themedContextualCommand', themedContextualCommand,
    { description: 'Player command fitting both a theme and the narrative so far.', oneOf: [anyList] })
  register('getTheme', getTheme,
    { description: 'Generate a short dungeon-flavored theme phrase.', oneOf: [anyValue] })
  register('theme', theme,
    { description: 'Return the currently pinned theme (or fall back to $getTheme).', oneOf: [anyValue] })
  register('macro', macro,
    { description: 'Narrative slot; returns a themed placeholder or an LLM-generated snippet. Args are [name] or [name, ctxId].',
      oneOf: [{ type: 'string' }, anyList] })
  register('kdBundle', kdBundle,
    { description: 'Cached bundle of key/door narrative fields; args are [key, field].', oneOf: [anyList] })

  return target
}

module.exports = { registerNarrator, makeRunner }
