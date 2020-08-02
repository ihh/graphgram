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
      live: ['#happy'],
      enter: ['thinking','wave','raised_hand'],
      ignore: ['expressionless', 'running_man', 'running_woman'],
      bypass: ['eyes', 'roll_eyes', 'unamused'],
      scenery: ['#building','#plant','#flower','#nature'],
      x: ['#nature'],
      crossroads: ['#plus','#x','#road'],
      fork: ['#y','#road'],
      rumor: ['#secret'],
      treasure: ['#money'],
      door: ['door']
    }
  }
};

const opt = getopt.create([
  ['d' , 'dot=PATH'    , 'GraphViz file (required)'],
  ['e' , 'emojis=PATH' , 'JSON emojis file (optional)'],
  ['p' , 'print'       , 'print all emojis'],
  ['t' , 'theme=STRING', 'theme from emojis file (optional)'],
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

const toEmoji = (options) => {
  if (opt.options.print) {
    options.forEach ((keyword) => {
      const emojiList = (keyword[0] === '#'
                         ? emojiSearch (keyword.substr(1))
                         : [extend ({name:keyword}, emojiLib.lib[keyword])])
      console.warn (keyword + " => " + emojiList.map ((emoji) => {
        if (!emoji)
          throw new Error ('Emoji ' + keyword + ' not found')
        return emoji.name + emoji.char
      }).join(","))
    })
  }
  const keyword = randElement (options)
  let result = keyword, emoji
  if (keyword[0] === '#') {
    const emojiList = emojiSearch (keyword.substr(1))
    if (emojiList && emojiList.length) {
      emoji = randElement (emojiList)
    }
  } else
    emoji = extend ({ name: keyword }, emojiLib.lib[keyword])
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

fs.readFileSync(dotFile).toString()
  .split ("\n")
  .forEach ((line) => {
    line = line.replace (/label="(.*?)"/g, (_m, label) => {
      const emoji = toEmoji (theme[label] || ['#' + label])
      console.warn ("Replacing " + label + " with " + emoji)
      return 'label="' + emoji + '"'
    })
    console.log (line)
  })
