#!/usr/bin/env node

// bin/story.js — generate a worked example and export it to a target.
//
//   grammar ──evolve──▶ graphlib graph ──buildStoryIR──▶ Story IR ──▶ format
//
// This is the single entry point behind every reproducible artefact in the
// repo: the files under out/, the playable stories on the docs site, and the
// golden files the export tests pin. `bin/transform.js` remains the
// lower-level tool — it runs an arbitrary grammar file and stops at the
// graph. This one knows about the example catalogue and about the three
// export targets.
//
// Reproducibility contract (docs/spec/examples.md): for a fixed library
// version, `--example E --seed S` produces byte-identical output on every
// machine in every format. The only entropy source is the seeded Mersenne
// Twister; the theme is derived from the seed; nothing stamps a timestamp.

require('dotenv').config({ quiet: true })

const fs = require('fs'),
      path = require('path'),
      getopt = require('node-getopt'),
      colors = require('colors'),
      gg = require('../index'),
      Grammar = gg.Grammar,
      Matcher = gg.Matcher,
      narrator = require('../narrator'),
      sonnetRunner = require('../sonnet-runner'),
      themes = require('../themes'),
      debugOpts = require('../debug-opts'),
      examples = require('../examples')

const FORMATS = ['ir', 'twine', 'choicescript', 'inform7', 'play', 'dot', 'graph']

// choicescript is the odd one out: a ChoiceScript project is several files,
// so its exporter returns a file map and --out names a directory. Everything
// else writes a single file (and accepts `-` for stdout).
const DIRECTORY_FORMATS = { choicescript: true }

const opt = getopt.create([
  ['e', 'example=ID', 'worked example to generate (see --list)'],
  ['s', 'seed=N', 'RNG seed (default: the example\'s canonical seed)'],
  ['f', 'format=NAME', 'output format: ' + FORMATS.join(', ') + ' (default "ir")'],
  ['o', 'out=PATH', 'output file, or directory for choicescript; "-" for stdout'],
  ['l', 'list', 'list the worked examples and exit'],
  ['', 'theme=NAME', 'pin the theme (default: deterministic from seed)'],
  ['', 'list-themes', 'print available themes and exit'],
  ['', 'placeholder', 'narrative slots emit [theme:macro#ctx] placeholders'],
  ['', 'no-llm', 'disable LLM calls entirely (the default)'],
  ['', 'sonnet', 'generate real prose via the Anthropic API'],
  ['', 'model=NAME', 'model for --sonnet (default "' + sonnetRunner.DEFAULT_MODEL + '")'],
  ['', 'cache-dir=PATH', 'local prompt cache dir for --sonnet'],
  ['', 'no-cache', 'disable the local prompt cache'],
  ['', 'title=TEXT', 'override the story title'],
  ['q', 'quiet', 'do not print progress messages'],
  ['v', 'verbose', 'print MORE progress messages'],
  ['h', 'help', 'display this help message']
]).bindHelp().parseSystem()

const o = opt.options

if (o['list-themes']) {
  console.log(themes.listThemes().join('\n'))
  process.exit(0)
}

if (o.list) {
  examples.list().forEach(function (ex) {
    const b = ex.budget || {}
    console.log(
      pad(ex.id, 16) +
      pad(ex.topology, 16) +
      pad(ex.puzzles ? 'puzzles' : 'no puzzles', 12) +
      pad('seed ' + ex.defaultSeeds[0], 14) +
      ex.title)
    console.log(' '.repeat(16) + 'budget: ' +
      Object.keys(b).map(function (k) { return k + '=' + b[k] }).join(' '))
  })
  process.exit(0)
}

function pad (s, n) { s = String(s); return s + ' '.repeat(Math.max(1, n - s.length)) }

if (!o.example) {
  console.error('No example given. Try --list, or --help.')
  process.exit(1)
}

const format = o.format || 'ir'
if (FORMATS.indexOf(format) < 0) {
  console.error('Unknown format "' + format + '". Known: ' + FORMATS.join(', '))
  process.exit(1)
}

const verbosity = o.quiet ? 0 : (o.verbose ? 2 : 1)
function note (msg) { if (verbosity) console.warn(colors.cyan(msg)) }

const example = examples.get(o.example)
const seed = typeof o.seed !== 'undefined' ? parseInt(o.seed, 10) : example.defaultSeeds[0]
if (!Number.isFinite(seed)) {
  console.error('Seed must be an integer.')
  process.exit(1)
}

// Theme before grammar load: grammar modules may branch on it (set-pieces are
// theme-specific), and the narrator needs it pinned so every slot in one run
// draws from one world.
const theme = o.theme || themes.pickTheme(seed)
if (o.theme && themes.listThemes().indexOf(theme) < 0 && verbosity)
  console.warn(colors.yellow('Warning: theme "' + theme + '" is not built in. See --list-themes.'))
note('example ' + example.id + ' · seed ' + seed + ' · theme ' + theme + ' · format ' + format)

// --placeholder and --sonnet are the two non-default narrative modes. Without
// either, narrator slots resolve to themed placeholder strings anyway (the
// `disabled` path in narrator.js implies placeholder behaviour), which keeps
// the offline build readable rather than emitting the literal '[placeholder]'.
const usePlaceholder = !!o.placeholder
const useSonnet = !!o.sonnet && !usePlaceholder

debugOpts.set({ placeholder: usePlaceholder, theme: theme })

let runner = null
if (useSonnet) {
  runner = sonnetRunner.makeSonnetRunner({
    model: o.model,
    cache: !o['no-cache'],
    cacheDir: o['cache-dir'],
    warn: function (m) { if (verbosity > 1) console.warn(colors.yellow(m)) }
  })
}

// The narrator must be registered on the Matcher *before* the Grammar is
// constructed: Grammar#validate builds its JSON schema from the matcher's
// registered RHS-function table, so an unregistered `$macro` is a schema
// error rather than a runtime one.
const matcher = new Matcher()
narrator.registerNarrator(matcher, {
  disabled: !useSonnet,
  runner: runner,
  theme: theme,
  placeholder: usePlaceholder || !useSonnet,
  warn: function (m) { if (verbosity > 1) console.warn(colors.yellow(m)) }
})

const grammarJson = example.grammar({ theme: theme, budget: example.budget, seed: seed })
const grammar = new Grammar(grammarJson, { matcher: matcher, verbose: verbosity > 1 ? 2 : 0 })

const info = grammar.evolve({ seed: seed, verbose: verbosity > 1 ? 2 : 0 })
const graph = info.graph
note(info.iterations + ' rule applications · ' +
     graph.nodes().length + ' nodes · ' + graph.edges().length + ' edges')

// --- emit ------------------------------------------------------------------

function buildIR () {
  const { buildStoryIR, validateStoryIR } = require('../story-ir')
  const ir = buildStoryIR(graph, {
    id: example.id,
    title: o.title || example.title,
    seed: seed,
    theme: theme,
    grammar: 'examples/' + example.id + '.js',
    generator: 'graphgram ' + require('../package.json').version,
    topology: example.topology,
    puzzles: example.puzzles,
    budget: example.budget
  })
  const errs = validateStoryIR(ir)
  if (errs.length) {
    console.error(colors.red('Story IR failed validation (' + errs.length + '):'))
    errs.forEach(function (e) { console.error('  ' + e) })
    process.exit(2)
  }
  return ir
}

let payload, files = null
switch (format) {
  case 'ir':
    payload = JSON.stringify(buildIR(), null, 2) + '\n'
    break
  case 'twine':
    payload = require('../exporters/twine').exportTwine(buildIR(), {})
    break
  case 'inform7':
    payload = require('../exporters/inform7').exportInform7(buildIR(), {})
    break
  case 'choicescript':
    files = require('../exporters/choicescript').exportChoiceScript(buildIR(), {}).files
    break
  case 'dot':
    payload = grammar.toDot(graph)
    break
  case 'graph':
    payload = JSON.stringify(require('graphlib').json.write(graph), null, 2) + '\n'
    break
  case 'play':
    // The browser play engine (play/game.js) reads a bare graphlib graph off
    // `window.GRAPH`, not the Story IR — it predates the IR and has its own
    // phrasebook layer. Keeping it on the graph means the docs site's playable
    // seeds exercise exactly the artefact the exporters consume upstream of,
    // rather than a re-rendering of it.
    payload = 'window.GRAPH = ' +
      JSON.stringify(require('graphlib').json.write(graph), null, 2) + ';\n'
    break
}

const out = o.out || '-'

if (files) {
  if (out === '-') {
    console.error('choicescript writes several files; --out must name a directory.')
    process.exit(1)
  }
  fs.mkdirSync(out, { recursive: true })
  Object.keys(files).sort().forEach(function (rel) {
    const dest = path.join(out, rel)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, files[rel])
    note('wrote ' + dest)
  })
} else if (out === '-') {
  process.stdout.write(payload)
} else {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true })
  fs.writeFileSync(out, payload)
  note('wrote ' + out + ' (' + payload.length + ' bytes)')
}

if (runner && verbosity) {
  const s = runner.summary()
  console.warn(colors.cyan('sonnet: ' + s.calls + ' calls (' + s.cacheHits + ' cache, ' +
    s.cacheMisses + ' api); tokens in=' + s.inputTokens + ' out=' + s.outputTokens))
}
