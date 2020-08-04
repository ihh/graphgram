#!/usr/bin/env node

const fs = require('fs'),
      extend = require('extend'),
      path = require('path'),
      MersenneTwister = require('mersennetwister'),
      getopt = require('node-getopt'),
      emojiLib = require('emojilib'),
      emojiSearch = require('@jukben/emoji-search').default,
      Bracery = require('bracery').Bracery

// Bracery dialect:
// For node labels, $node is set to the node ID ($src, $dest are empty)
// For edge labels, $src and $dest are the end node IDs ($node is empty)
// #keyword gets replaced with a random emoji that matches keyword
// @name gets replaced with a specific named emoji

const defaultEmojis = {
  theme: {
    standard: {
      rules: {},
      labels: {
        live: '#happy',
        enter: '[@thinking|@wave|@tickets|@arrow_forward]',
        ignore: '[@expressionless|@running_man|@running_woman]',
        bypass: '[@eyes|@roll_eyes|@unamused|@no_entry]',
        scenery: '[#building|#plant|#flower|#nature]',
        x: '#nature',
        crossroads: '[crossroads|junction][#plus|#x|#road]',
        fork: '[#y|#road]',
        rumor: '#secret',
        treasure: '#money',
        door: '@door'
      }
    }
  }
};

const opt = getopt.create([
  ['d' , 'dot=PATH'    , 'GraphViz file (required)'],
  ['e' , 'emojis=PATH' , 'JSON emojis file (optional)'],
  ['i' , 'import=PATH' , 'JSON file from Bracery import directory (optional)'],
  ['t' , 'theme=STRING', 'theme from emojis file (optional)'],
  ['k' , 'keep'        , 'keep original label'],
  ['f' , 'fitzpatrick' , 'use Fitzpatrick modifiers'],
  ['s' , 'seed=N'      , 'seed random number generator'],
  ['h' , 'help'        , 'display this help message']
])              // create Getopt instance
      .bindHelp()     // bind option 'help' to default action
      .parseSystem() // parse command line

const dotFile = opt.options.dot
if (!dotFile)
  throw new Error ("Please specify --dot file")

const emojisFile = opt.options.emojis
const emojis = (emojisFile
                ? eval ('(()=>{return (' + fs.readFileSync(emojisFile).toString() + ')})()')
                : defaultEmojis)

let seed = opt.options.seed
if (typeof(seed) === 'undefined') {
  seed = new Date().getTime()
  console.warn ("Random number seed: " + seed)
}
const mt = new MersenneTwister (seed)
const randElement = (array) => array[Math.floor (mt.rnd() * array.length)];

const theme = emojis.theme[opt.options.theme || randElement (Object.keys(emojis.theme))]
let extraRules = {}
if (opt.options.import) {
  const imported = JSON.parse(fs.readFileSync(opt.options.import).toString())
  imported.forEach ((entry) => { extraRules[entry.name] = entry.rules.map (rhs => rhs.join("")) })
}
const bracery = new Bracery (extend (theme.rules, extraRules))

const toEmoji = (str) => {
  let result = str
  const emoji = (str[0] === '@'
                 ? emojiLib.lib[str.substr(1)]
                 : randElement (emojiSearch (str.substr(1)).filter ((emoji) => emoji.keywords.filter ((keyword) => keyword === str.substr(1)).length)))
  if (emoji) {
    result = emoji.char
    if (opt.options.fitzpatrick && emoji.fitzpatrick_scale) {
      const mod = randElement (emojiLib.fitzpatrick_scale_modifiers)
      const modResult = result + mod
      result = modResult.length < 6 ? modResult : result  // hack to avoid double characters
    }
  }
  return result
}

let vars = {}
const expandBracery = (template) => {
  let expansion = bracery.expand(template,{vars})
  vars = expansion.vars
  return expansion.text.replace (/([@#][a-z_0-9\-]+)/g, toEmoji)
}

const labelRegex = /label="(.*?)"/g;
const nodeRegex = /^ *([0-9]+) *\[/;
const edgeRegex = /^ *([0-9]+) *-> *([0-9]+) *\[/;
fs.readFileSync(dotFile).toString()
  .split ("\n")
  .forEach ((line) => {
    let node = '', src = '', dest = '', type, match
    if (match = edgeRegex.exec(line)) {
      src = match[1];
      dest = match[2];
      type = 'taillabel'
    } else if (match = nodeRegex.exec(line)) {
      node = match[1];
      type = 'label'
    }
    line = line.replace (labelRegex, (_m, label) => {
      vars = extend (vars, { node, src, dest });
      const expansion = label && expandBracery (theme.labels[label] || ('#' + label))
      console.warn ("Replacing " + label + " with " + expansion)
      return type + '="' + (opt.options.keep ? label : "") + expansion + '"'
    })
    console.log (line)
  })
