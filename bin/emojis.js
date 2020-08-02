#!/usr/bin/env node

const fs = require('fs'),
      extend = require('extend'),
      path = require('path'),
      MersenneTwister = require('mersennetwister'),
      getopt = require('node-getopt'),
      emojiLib = require('emojilib'),
      emojiSearch = require('@jukben/emoji-search').default

const defaultEmojis = {
  theme: {
    standard: {
      
    }
  }
};

const opt = getopt.create([
  ['d' , 'dot=PATH'    , 'GraphViz file (required)'],
  ['e' , 'emojis=PATH' , 'JSON emojis file (optional)'],
  ['t' , 'theme=STRING', 'theme from emojis file (optional)'],
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
                ? JSON.parse (fs.readFileSync(emojisFile).toString())
                : defaultEmojis)

let seed = opt.options.seed
if (typeof(seed) === 'undefined') {
  seed = new Date().getTime()
  console.warn ("Random number seed: " + seed)
}
const mt = new MersenneTwister (seed)
const randElement = (array) => array[Math.floor (mt.rnd() * array.length)];

const theme = emojis.theme[opt.options.theme || randElement (Object.keys(emojis.theme))]

const toEmoji = (keyword) => {
  let result = keyword
  const emojiList = emojiSearch (keyword)
  if (emojiList && emojiList.length) {
    const emoji = randElement (emojiList)
    result = emoji.char
    if (emoji.fitzpatrick_scale)
      result += randElement (emojiLib.fitzpatrick_scale_modifiers)
  }
  return result
}

fs.readFileSync(dotFile).toString()
  .split ("\n")
  .forEach ((line) => {
    line = line.replace (/label="(.*)"/g, (_m, label) => {
      return 'label="' + toEmoji (theme[label] || label) + '"'
    })
    console.log (line)
  })
