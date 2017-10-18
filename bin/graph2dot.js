#!/usr/bin/env node

var fs = require('fs'),
    getopt = require('node-getopt'),
    graphlib = require('graphlib'),
    Grammar = require('../index').Grammar,
    tmp = require('tmp'),
    exec = require('child_process').exec

var opt = getopt.create([
  ['g' , 'graph=PATH'      , 'read graphlib graph file'],
  ['p' , 'pdf=PATH'        , 'run neato to generate PDF'],
  ['o' , 'open'            , 'run neato, then open PDF with open'],
  ['n' , 'no-autolabel'    , 'do not auto-label using \'pos\' & \'name\''],
  ['h' , 'help'            , 'display this help message']
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem() // parse command line

var filename = opt.options.graph || opt.argv[0]
var graph = graphlib.json.read (JSON.parse (fs.readFileSync (filename)))

var label = !opt.options['no-autolabel']
if (label) {
  graph.nodes().forEach (function (node) {
    var info = graph.node(node)
    info.dot = info.dot || {}
    if (info.name)
      info.dot.label = info.name
  })
  graph.edges().forEach (function (edge) {
    var info = graph.edge(edge)
    info.dot = info.dot || {}
    if (info.name)
      info.dot.label = info.name
  })
}

var dot = Grammar.prototype.toDot (graph)

var pdf = opt.options.pdf, open = opt.options.open
if (pdf)
  makePdf (dot, pdf, open ? openPdf : null)
else if (open)
  tmp.file ({keep:true,
             postfix:'.pdf'},
            (err, path, fd) => {
              if (err) throw err
              makePdf (dot, path, openPdf)
            })
else
  console.log (dot)

function openPdf (pdfFilename) {
  var cmd = 'open ' + pdfFilename
  console.warn(cmd)
  exec (cmd, (err, stdout, stderr) => {})
}

function makePdf (dot, pdfFilename, callback) {
  tmp.file ((err, path, fd) => {
    if (err) throw err
    fs.writeSync (fd, dot)
    fs.closeSync (fd)
    var cmd = 'neato -Tpdf -n ' + path + ' >' + pdfFilename
    console.warn(cmd)
    exec (cmd, (err, stdout, stderr) => {
      if (err) throw err
      if (callback)
        callback (pdfFilename)
    })
  })
}
