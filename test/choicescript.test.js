// ChoiceScript exporter tests.
//
// Most of this file is a structural linter, because the failure mode that
// matters for a code generator is not "the wrong words came out" but "the
// output does not parse, or parses and then throws at runtime". The linter
// re-derives, from the emitted text alone, the five invariants ChoiceScript
// enforces at load time: label resolution, variable declaration, indentation
// consistency, at least one selectable option per *choice, and *create before
// anything else in startup.txt.

const test = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { exportChoiceScript, compileCondition, escapeProse } = require('../exporters/choicescript')

const SAMPLE = path.join(__dirname, 'fixtures', 'story-ir.sample.json')

function loadIR () {
  // Re-read rather than require(), so a test that mutates the IR cannot leak
  // into the next one through the module cache.
  return JSON.parse(require('node:fs').readFileSync(SAMPLE, 'utf8'))
}

// --- the linter ---------------------------------------------------------

// ChoiceScript's own list; these are the only commands allowed above the
// first ordinary command in startup.txt.
const INITIAL_COMMANDS = ['create', 'create_array', 'scene_list', 'title',
  'author', 'comment', 'achievement', 'product', 'ifid']

// Words that appear inside expressions but are not variables.
const EXPR_KEYWORDS = ['and', 'or', 'not', 'modulo', 'round', 'length', 'auto',
  'timestamp', 'log', 'true', 'false']

function parseLines (text) {
  return text.split('\n').map((raw, i) => {
    const indentMatch = /^[ \t]*/.exec(raw)[0]
    const trimmed = raw.trim()
    const command = /^\*(\w+)\s*(.*)$/.exec(trimmed)
    return {
      num: i + 1,
      raw,
      indent: indentMatch,
      depth: indentMatch.length / 2,
      trimmed,
      blank: !trimmed,
      command: command ? command[1].toLowerCase() : null,
      data: command ? command[2] : null
    }
  })
}

// Pull variable names out of an expression, ignoring quoted strings, numbers
// and the language's own keywords.
function exprVars (expr) {
  const withoutStrings = String(expr || '').replace(/"(\\.|[^"\\])*"/g, ' ')
  return (withoutStrings.match(/[A-Za-z_]\w*/g) || [])
    .filter(w => EXPR_KEYWORDS.indexOf(w.toLowerCase()) < 0)
}

// ${expr}, $!{expr}, @{cond a|b} and @{(cond) a|b} all reference variables
// from inside otherwise ordinary prose.
function substitutionVars (line) {
  const out = []
  const re = /([$@])!?!?\{([^{}]*)\}/g
  let m
  while ((m = re.exec(line))) {
    const sigil = m[1]
    const body = m[2]
    if (/^\s*\(/.test(body)) {
      out.push.apply(out, exprVars(body.slice(body.indexOf('(') + 1, body.lastIndexOf(')'))))
    } else if (sigil === '@') {
      out.push.apply(out, exprVars(body.split(/\s/)[0]))
    } else {
      out.push.apply(out, exprVars(body))
    }
  }
  return out
}

function lintProject (project) {
  const problems = []
  const files = project.files
  const names = Object.keys(files)

  const parsed = {}
  names.forEach(name => { parsed[name] = parseLines(files[name]) })

  const labels = {}
  names.forEach(name => {
    labels[name] = new Set()
    parsed[name].forEach(line => {
      if (line.command === 'label') {
        const label = line.data.toLowerCase()
        if (labels[name].has(label)) problems.push(name + ':' + line.num + ': duplicate *label ' + label)
        labels[name].add(label)
      }
    })
  })

  // 1. every *goto / *goto_scene target resolves to a declared *label
  names.forEach(name => {
    parsed[name].forEach(line => {
      if (line.command === 'goto') {
        const target = line.data.toLowerCase()
        if (!labels[name].has(target)) {
          problems.push(name + ':' + line.num + ': *goto ' + target + ' has no matching *label')
        }
      } else if (line.command === 'goto_scene') {
        const parts = line.data.split(/\s+/)
        const sceneFile = parts[0] + '.txt'
        if (!files[sceneFile]) {
          problems.push(name + ':' + line.num + ': *goto_scene ' + parts[0] + ' names no emitted file')
        } else if (parts[1] && !labels[sceneFile].has(parts[1].toLowerCase())) {
          problems.push(name + ':' + line.num + ': *goto_scene ' + line.data + ' has no matching *label')
        }
      }
    })
  })

  // 2. every variable referenced by *set, *if (and friends) or *rand was *create-d
  const created = new Set()
  names.forEach(name => {
    parsed[name].forEach(line => {
      if (line.command === 'create') created.add(line.data.split(/\s+/)[0].toLowerCase())
    })
  })
  names.forEach(name => {
    parsed[name].forEach(line => {
      const refs = []
      if (line.command === 'set') {
        const parts = /^(\S+)\s*(.*)$/.exec(line.data) || []
        refs.push(parts[1])
        refs.push.apply(refs, exprVars(parts[2]))
      } else if (line.command === 'if' || line.command === 'elseif' || line.command === 'elsif') {
        const inline = /^\s*\((.*)\)\s+#/.exec(line.data)
        refs.push.apply(refs, exprVars(inline ? inline[1] : line.data))
      } else if (line.command === 'selectable_if') {
        const parsedOpt = /^\s*\((.*)\)\s+(#.*)/.exec(line.data)
        if (!parsedOpt) {
          problems.push(name + ':' + line.num + ': *selectable_if must be "(condition) #option" on one line')
        } else {
          refs.push.apply(refs, exprVars(parsedOpt[1]))
          refs.push.apply(refs, substitutionVars(parsedOpt[2]))
        }
      } else if (line.command === 'rand') {
        refs.push(line.data.split(/\s+/)[0])
      } else if (line.command === 'stat_chart') {
        // rows are handled below as plain lines
      } else if (!line.command) {
        refs.push.apply(refs, substitutionVars(line.trimmed))
      }
      refs.filter(Boolean).forEach(v => {
        if (!created.has(String(v).toLowerCase())) {
          problems.push(name + ':' + line.num + ': variable "' + v + '" is used but never *create-d')
        }
      })
    })
  })

  // stat_chart rows name a variable in their second word
  names.forEach(name => {
    let inChart = false
    let chartDepth = 0
    parsed[name].forEach(line => {
      if (line.command === 'stat_chart') { inChart = true; chartDepth = line.depth; return }
      if (!inChart || line.blank) return
      if (line.depth <= chartDepth) { inChart = false; return }
      const row = /^(text|percent|opposed_pair)\s+(\S+)/.exec(line.trimmed)
      if (row && !created.has(row[2].toLowerCase())) {
        problems.push(name + ':' + line.num + ': *stat_chart row names undeclared "' + row[2] + '"')
      }
    })
  })

  // 3. indentation is internally consistent
  names.forEach(name => {
    let previous = null
    parsed[name].forEach(line => {
      if (line.blank) return
      if (/\t/.test(line.indent)) {
        problems.push(name + ':' + line.num + ': tab in indentation')
      }
      if (line.indent.length % 2 !== 0) {
        problems.push(name + ':' + line.num + ': indent of ' + line.indent.length + ' is not a multiple of 2')
      }
      if (previous && line.depth > previous.depth + 1) {
        problems.push(name + ':' + line.num + ': indent jumps from ' + previous.depth + ' to ' + line.depth)
      }
      previous = line
    })
  })

  // 4. every *choice has at least one option no condition can remove
  names.forEach(name => {
    const lines = parsed[name]
    lines.forEach((line, i) => {
      if (line.command !== 'choice' && line.command !== 'fake_choice') return
      let unconditional = 0
      let options = 0
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j]
        if (next.blank) continue
        if (next.depth <= line.depth) break
        if (next.depth !== line.depth + 1) continue
        if (/^#/.test(next.trimmed)) { options++; unconditional++ } else if (next.command === 'selectable_if' || next.command === 'if') options++
      }
      if (!options) problems.push(name + ':' + line.num + ': *choice with no options')
      if (!unconditional) {
        problems.push(name + ':' + line.num + ': *choice has no unconditionally selectable option')
      }
    })
  })

  // 6. reaching an *else by falling out of the branch above it is an error
  // unless the game declared implicit_control_flow (Scene.prototype.else).
  const icf = names.some(name => parsed[name].some(l =>
    l.command === 'create' && /^implicit_control_flow\s+true$/.test(l.data)))
  if (!icf) {
    names.forEach(name => {
      const lines = parsed[name]
      lines.forEach((line, i) => {
        if (line.command !== 'else' && line.command !== 'elseif' && line.command !== 'elsif') return
        let previous = null
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j].blank) continue
          if (lines[j].depth <= line.depth) break
          previous = lines[j]
          break
        }
        if (previous && ['goto', 'goto_scene', 'finish', 'ending'].indexOf(previous.command) < 0) {
          problems.push(name + ':' + line.num + ': falls in to *' + line.command +
            ' without implicit_control_flow')
        }
      })
    })
  }

  // 5. startup.txt declares everything before it does anything
  const startup = parsed[project.entry]
  let lastCreate = -1
  let firstOther = Infinity
  startup.forEach((line, i) => {
    if (line.blank || !line.command) return
    if (line.command === 'create') lastCreate = i
    else if (INITIAL_COMMANDS.indexOf(line.command) < 0 && i < firstOther) firstOther = i
  })
  if (lastCreate > firstOther) {
    problems.push(project.entry + ': *create at line ' + startup[lastCreate].num +
      ' comes after the ordinary command on line ' + startup[firstOther].num)
  }
  const createIndexes = startup.map((l, i) => (l.command === 'create' ? i : -1)).filter(i => i >= 0)
  const gaps = createIndexes.filter((idx, k) => k > 0 && startup.slice(createIndexes[k - 1] + 1, idx).some(l => !l.blank))
  if (gaps.length) problems.push(project.entry + ': the *create block is not contiguous')

  return problems
}

// --- the fixture --------------------------------------------------------

test('choicescript: exports the expected file map', () => {
  const project = exportChoiceScript(loadIR())
  assert.strictEqual(project.entry, 'startup.txt')
  assert.deepStrictEqual(Object.keys(project.files).sort(),
    ['choicescript_stats.txt', 'fixture_vault.txt', 'startup.txt'])
  Object.keys(project.files).forEach(name => {
    assert.strictEqual(typeof project.files[name], 'string')
    assert.ok(project.files[name].endsWith('\n'), name + ' should end with a newline')
  })
})

test('choicescript: the sample IR lints clean', () => {
  const problems = lintProject(exportChoiceScript(loadIR()))
  assert.deepStrictEqual(problems, [])
})

test('choicescript: startup declares every variable exactly once, before *goto_scene', () => {
  const project = exportChoiceScript(loadIR())
  const startup = project.files['startup.txt']
  const creates = startup.split('\n').filter(l => /^\*create /.test(l))
  const names = creates.map(l => l.split(/\s+/)[1])
  assert.deepStrictEqual(names, Array.from(new Set(names)), 'no variable is *create-d twice')
  loadIR().vars.forEach(v => {
    assert.ok(names.indexOf(v.name) >= 0, v.name + ' should be declared')
  })
  // Falling out of an *if branch into the *else below it is an error unless
  // the game opts in, and every first/repeat branch here does exactly that.
  assert.ok(/^\*create implicit_control_flow true$/m.test(startup))
  assert.ok(startup.indexOf('*title The Cindermoor Vault') >= 0)
  assert.ok(startup.indexOf('\n*scene_list\n  startup\n  fixture_vault\n') >= 0)
  assert.ok(startup.trimEnd().endsWith('*goto_scene fixture_vault'))
})

test('choicescript: every passage becomes exactly one *label, terminals *ending', () => {
  const ir = loadIR()
  const scene = exportChoiceScript(ir).files['fixture_vault.txt']
  const labels = scene.split('\n').filter(l => /^\*label /.test(l)).map(l => l.slice(7))
  assert.deepStrictEqual(labels.slice().sort(), ir.passages.map(p => p.id.toLowerCase()).sort())
  // The scene is entered by a bare *goto_scene, so the start passage has to
  // be the first thing in the file.
  assert.strictEqual(labels[0], ir.start.toLowerCase())
  const endingBlocks = scene.split(/^\*label /m).filter(b => /^\*ending$/m.test(b))
  assert.strictEqual(endingBlocks.length, ir.endings.length)
})

test('choicescript: a choice whose options are all conditional gets a fallback', () => {
  const scene = exportChoiceScript(loadIR()).files['fixture_vault.txt']
  // P_key's only exit is condition-gated; P_door's two exits are gated in
  // both styles (hide and show). Both would be "No selectable options" at
  // runtime without a fallback.
  const keyBlock = scene.split('*label p_key')[1].split('*label ')[0]
  const doorBlock = scene.split('*label p_door')[1].split('*label ')[0]
  assert.ok(/^ {2}#/m.test(keyBlock), 'p_key needs an unconditional option')
  assert.ok(/\*goto p_key/.test(keyBlock))
  assert.ok(/^ {2}#/m.test(doorBlock), 'p_door needs an unconditional option')
  // P_beast already has an unconditional exit, so no fallback is added.
  const beastBlock = scene.split('*label p_beast')[1].split('*label ')[0]
  assert.ok(beastBlock.indexOf('Wait, and take stock') < 0)
})

test('choicescript: whenBlocked show uses *selectable_if, hide uses a plain *if', () => {
  const scene = exportChoiceScript(loadIR()).files['fixture_vault.txt']
  assert.ok(/\*selectable_if \(has_pair_1\) #/.test(scene), 'the locked door is shown but disabled')
  assert.ok(/\*if \(took_e_hall_key\)\n {4}#/.test(scene), 'the hidden backtrack wraps its option')
  // The closed narration cannot live in a disabled option's body, because
  // that body never runs; it is said before the menu instead.
  assert.ok(/\*if not\(has_pair_1\)\n {2}The door will not move/.test(scene))
})

test('choicescript: random passages roll and branch on cumulative weight', () => {
  const scene = exportChoiceScript(loadIR()).files['fixture_vault.txt']
  const block = scene.split('*label p_roll')[1]
  assert.ok(/\*rand cs_roll 1 4/.test(block), 'weights 3 and 1 give a 1..4 roll')
  assert.ok(/\*if \(cs_roll <= 3\)/.test(block))
  // The last arm is *else so that no roll can fall through the chain.
  assert.ok(/\n\*else\n/.test(block))
  assert.ok(/\*goto p_hall/.test(block) && /\*goto p_death/.test(block))
})

test('choicescript: effects compile to *set, with add as an implicit operand', () => {
  const scene = exportChoiceScript(loadIR()).files['fixture_vault.txt']
  assert.ok(/^\*set moves \+1$/m.test(scene), 'add +1')
  assert.ok(/^ *\*set hp -20$/m.test(scene), 'add -20 subtracts; %- would be fairmath')
  assert.ok(/^\*set seen_hall true$/m.test(scene), 'set true')
  assert.ok(scene.indexOf('%+') < 0 && scene.indexOf('==') < 0)
})

test('choicescript: acquiring an item prints takeText and sets the item var', () => {
  const scene = exportChoiceScript(loadIR()).files['fixture_vault.txt']
  const block = scene.split('*label p_key')[1].split('*choice')[0]
  assert.ok(/\*if not\(has_pair_1\)\n {2}You prise the key/.test(block))
  assert.ok(/\*else\n {2}You take up the key again\./.test(block))
  assert.ok(/\*set has_pair_1 true/.test(block))
})

test('choicescript: first/repeat text branches on a visit flag', () => {
  const scene = exportChoiceScript(loadIR()).files['fixture_vault.txt']
  assert.ok(/\*label p_hall\n\[b\]The Nave\[\/b\]\n\*if not\(cs_seen_p_hall\)\n/.test(scene))
  assert.ok(/\*set cs_seen_p_hall true/.test(scene))
  // A passage with no repeat wording spends no variable on remembering it.
  assert.ok(scene.indexOf('cs_seen_p_vault') < 0)
  // Link affordances that change wording use a multireplace so the option
  // itself stays unconditional.
  assert.ok(/#@\{\(cs_took_l_hall_key\) Go down to the crypt again\|Take the stair down to the crypt\}/.test(scene))
})

test('choicescript: the stats page charts the numbers and lists the inventory', () => {
  const stats = exportChoiceScript(loadIR()).files['choicescript_stats.txt']
  assert.ok(/\*stat_chart\n {2}text hp HP\n {2}text moves Moves/.test(stats))
  assert.ok(/\*if has_pair_1\n {2}carrying the brass key/.test(stats))
  assert.ok(/\*if not\(has_pair_1\)\n {2}You are carrying nothing\./.test(stats))
  // percent rows would misdraw the moment a stat leaves 0..100.
  assert.ok(stats.indexOf('percent ') < 0)
})

test('choicescript: export is deterministic', () => {
  const a = exportChoiceScript(loadIR())
  const b = exportChoiceScript(loadIR())
  assert.deepStrictEqual(a, b)
})

// --- conditions and escaping -------------------------------------------

test('choicescript: conditions compile with one operator per parenthesis level', () => {
  assert.strictEqual(compileCondition(null), 'true')
  assert.strictEqual(compileCondition({ var: 'has_key', is: true }), 'has_key')
  assert.strictEqual(compileCondition({ var: 'has_key', is: false }), 'not(has_key)')
  assert.strictEqual(compileCondition({ var: 'hp', gt: 0 }), 'hp > 0')
  assert.strictEqual(compileCondition({ var: 'hp', eq: 3 }), 'hp = 3', 'equality is a single =')
  assert.strictEqual(compileCondition({ var: 'hp', gte: 3 }), 'hp >= 3')
  assert.strictEqual(compileCondition({ var: 'hp', ne: 3 }), 'hp != 3')
  assert.strictEqual(compileCondition({ not: { var: 'a', is: true } }), 'not(a)')
  assert.strictEqual(
    compileCondition({ all: [{ var: 'a', is: true }, { var: 'b', is: true }, { var: 'c', is: true }] }),
    '((a) and (b)) and (c)')
  assert.strictEqual(
    compileCondition({ any: [{ var: 'a', is: true }, { var: 'hp', lt: 5 }] }),
    '(a) or (hp < 5)')
  assert.strictEqual(compileCondition({ all: [] }), 'true')
})

test('choicescript: prose escapes substitution sigils and markup tags', () => {
  const opts = {}
  assert.strictEqual(escapeProse('costs $5', opts), 'costs $5', 'a lone $ is harmless')
  assert.strictEqual(escapeProse('${x} left', opts), '${"$"}{x} left')
  assert.strictEqual(escapeProse('$!{x}', opts), '${"$"}!{x}')
  assert.strictEqual(escapeProse('@{a b|c}', opts), '${"@"}{a b|c}')
  assert.strictEqual(escapeProse('[b]loud[/b]', opts), '${"["}b]loud${"["}/b]')
  assert.strictEqual(escapeProse('a [box] here', opts), 'a [box] here', 'only real tags are escaped')
  assert.strictEqual(escapeProse('[b]x[/b]', { allowMarkup: true }), '[b]x[/b]')
})

test('choicescript: prose that starts with * or # cannot be read as a command', () => {
  const ir = loadIR()
  ir.passages[0].text = { first: '*goto nowhere\n#not an option\nplain' }
  const scene = exportChoiceScript(ir).files['fixture_vault.txt']
  assert.ok(scene.indexOf('${""}*goto nowhere') >= 0)
  assert.ok(scene.indexOf('${""}#not an option') >= 0)
  assert.deepStrictEqual(lintProject(exportChoiceScript(ir)), [])
})

// --- refusals and edge cases -------------------------------------------

test('choicescript: reserved and malformed variable names are refused', () => {
  // validate:false so that these exercise the exporter's own guard rather
  // than validateStoryIR's; the IR promises safe names, but an exporter that
  // trusted the promise would emit a game that dies on load.
  const refuse = (v, re) => {
    const ir = loadIR()
    ir.vars.push(v)
    assert.throws(() => exportChoiceScript(ir, { validate: false }), re, v.name + ' should be refused')
  }
  ;['choice', 'scene', 'label', 'goto', 'true', 'and', 'not'].forEach(name => {
    refuse({ name, kind: 'number', ref: null, init: 0 }, /reserved word/)
  })
  refuse({ name: 'choice_selected', kind: 'number', ref: null, init: 0 }, /reserved `choice_` prefix/)
  refuse({ name: 'has key', kind: 'item', ref: null, init: false }, /unsafe variable name/)
  refuse({ name: 'HP2', kind: 'number', ref: null, init: 0 }, /unsafe variable name/)
  refuse({ name: '2nd_key', kind: 'item', ref: null, init: false }, /unsafe variable name/)
})

test('choicescript: a negative initial value is created at zero and corrected', () => {
  const ir = loadIR()
  ir.vars.push({ name: 'debt', kind: 'number', ref: null, init: -30 })
  const project = exportChoiceScript(ir)
  // *create takes a single token, so "-30" (an operator and a number) is not
  // expressible there.
  assert.ok(/^\*create debt 0$/m.test(project.files['startup.txt']))
  assert.ok(/^\*set debt \(0 - 30\)$/m.test(project.files['fixture_vault.txt']))
  assert.deepStrictEqual(lintProject(project), [])
})

test('choicescript: identical affordances on one passage are disambiguated', () => {
  const ir = loadIR()
  // Two links out of P_hall wearing the same words: ChoiceScript rejects a
  // duplicate option name outright.
  ir.links.forEach(l => {
    if (l.from === 'P_hall') { l.linkText = { first: 'Press on' } }
  })
  const scene = exportChoiceScript(ir).files['fixture_vault.txt']
  const block = scene.split('*label p_hall')[1].split('*label ')[0]
  const options = block.split('\n').filter(l => /^ {2}#/.test(l))
  assert.strictEqual(options.length, 3)
  assert.deepStrictEqual(options, Array.from(new Set(options)))
})

test('choicescript: a passage whose options are all show-blocked still gets a fallback', () => {
  const ir = loadIR()
  // Every exit visible but disabled: *selectable_if that evaluates false
  // still leaves the engine with no selectable option.
  ir.links.forEach(l => {
    if (l.from === 'P_hall') {
      l.condition = { all: [{ var: 'has_pair_1', is: true }] }
      l.whenBlocked = 'show'
    }
  })
  const project = exportChoiceScript(ir)
  const block = project.files['fixture_vault.txt'].split('*label p_hall')[1].split('*label ')[0]
  assert.ok(/^ {2}#Wait, and take stock\.$/m.test(block))
  assert.deepStrictEqual(lintProject(project), [])
})

test('choicescript: a conflicting implicit_control_flow declaration is refused', () => {
  const ir = loadIR()
  ir.vars.push({ name: 'implicit_control_flow', kind: 'number', ref: null, init: false })
  assert.throws(() => exportChoiceScript(ir, { validate: false }), /needs it true/)
  const agreeable = loadIR()
  agreeable.vars.push({ name: 'implicit_control_flow', kind: 'number', ref: null, init: true })
  const startup = exportChoiceScript(agreeable, { validate: false }).files['startup.txt']
  const declarations = startup.split('\n').filter(l => /^\*create implicit_control_flow /.test(l))
  assert.strictEqual(declarations.length, 1, 'declared once, not renamed around')
})

test('choicescript: the linter catches a fall-through into *else', () => {
  const project = exportChoiceScript(loadIR())
  const files = Object.assign({}, project.files)
  files['startup.txt'] = files['startup.txt'].replace('*create implicit_control_flow true', '*create icf true')
  assert.ok(lintProject({ entry: project.entry, files }).some(p => /without implicit_control_flow/.test(p)))
})

test('choicescript: a scene name colliding with a reserved file is renamed', () => {
  const ir = loadIR()
  ir.meta.id = 'startup'
  const project = exportChoiceScript(ir)
  assert.ok(project.files['startup_story.txt'])
  assert.ok(/^\*goto_scene startup_story$/m.test(project.files['startup.txt']))
  assert.deepStrictEqual(lintProject(project), [])
})

test('choicescript: passage ids that collide once lowercased are refused', () => {
  const ir = loadIR()
  ir.passages[1].id = 'P_START'
  // The rename also breaks the IR's referential integrity, so skip
  // validateStoryIR and test the exporter's own *label collision guard.
  assert.throws(() => exportChoiceScript(ir, { validate: false }), /collide once lowercased/)
})

test('choicescript: link text with a pipe falls back to first-visit wording', () => {
  const ir = loadIR()
  const link = ir.links.find(l => l.id === 'L_hall_key')
  link.linkText = { first: 'Down | or not', repeat: 'Down again' }
  const scene = exportChoiceScript(ir).files['fixture_vault.txt']
  // @{a|b} splits on a naive pipe with no escape available, so the varying
  // affordance is dropped rather than emitted broken.
  assert.ok(scene.indexOf('#Down | or not') >= 0)
  assert.ok(scene.indexOf('@{(cs_took_l_hall_key)') < 0)
})

test('choicescript: fractional random weights are scaled to whole numbers', () => {
  const ir = loadIR()
  ir.links.find(l => l.id === 'L_roll_hall').weight = 0.75
  ir.links.find(l => l.id === 'L_roll_death').weight = 0.25
  const scene = exportChoiceScript(ir).files['fixture_vault.txt']
  assert.ok(/\*rand cs_roll 1 1000/.test(scene))
  assert.ok(/\*if \(cs_roll <= 750\)/.test(scene))
})

test('choicescript: an undeclared variable in an effect is refused', () => {
  const ir = loadIR()
  ir.passages[1].onEnter.push({ op: 'set', var: 'nowhere_var', value: true })
  assert.throws(() => exportChoiceScript(ir), /undeclared variable/)
})

test('choicescript: the linter catches the failures it exists to catch', () => {
  // Guard against a linter that passes because it checks nothing.
  const project = exportChoiceScript(loadIR())
  const broken = name => {
    const copy = { entry: project.entry, files: Object.assign({}, project.files) }
    copy.files[name] = copy.files[name]
    return copy
  }
  const dangling = broken('fixture_vault.txt')
  dangling.files['fixture_vault.txt'] = dangling.files['fixture_vault.txt'].replace('*goto p_hall', '*goto p_elsewhere')
  assert.ok(lintProject(dangling).some(p => /no matching \*label/.test(p)))

  const undeclared = broken('fixture_vault.txt')
  undeclared.files['fixture_vault.txt'] = undeclared.files['fixture_vault.txt'].replace('*set moves +1', '*set turns +1')
  assert.ok(lintProject(undeclared).some(p => /never \*create-d/.test(p)))

  const misindented = broken('fixture_vault.txt')
  misindented.files['fixture_vault.txt'] = misindented.files['fixture_vault.txt'].replace('\n*choice\n', '\n*choice\n      #Jump\n')
  assert.ok(lintProject(misindented).some(p => /indent jumps/.test(p)))

  const allConditional = broken('fixture_vault.txt')
  allConditional.files['fixture_vault.txt'] = allConditional.files['fixture_vault.txt']
    .replace('  #Go back down the ladder, quickly', '  *if (moves > 0)\n    #Go back down the ladder, quickly')
  assert.ok(lintProject(allConditional).some(p => /no unconditionally selectable option/.test(p)))

  const lateCreate = broken('startup.txt')
  lateCreate.files['startup.txt'] = lateCreate.files['startup.txt'] + '\n*create latecomer 1\n'
  assert.ok(lintProject(lateCreate).some(p => /comes after the ordinary command/.test(p)))
})
