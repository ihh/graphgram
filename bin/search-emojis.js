#!/usr/bin/env node

const getopt = require('node-getopt'),
      emojiLib = require('emojilib'),
      emojiSearch = require('@jukben/emoji-search').default

const opt = getopt.create([
  ['n' , 'name'        , 'search by name'],
  ['k' , 'keyword'     , 'search by keyword (default)'],
  ['h' , 'help'        , 'display this help message']
])              // create Getopt instance
      .bindHelp()     // bind option 'help' to default action
      .parseSystem() // parse command line

if (!opt.argv.length)
  throw new Error ("Please specify keyword(s)")

opt.argv.forEach ((arg) => {
  if (opt.options.name) {
    const emoji = emojiLib.lib[arg]
    if (!emoji)
      console.log (arg + ' not found')
    else
      console.log (arg + ' ' + emoji.char)
  } else {
    const emojis = emojiSearch (arg)
    if (!emojis.length)
      console.log (arg + ' not found')
    else
      emojis.forEach ((emoji) => {
        console.log (arg + ' ' + emoji.name + ' ' + emoji.char + '  ' + emoji.keywords.join(','))
      })
  }
})
