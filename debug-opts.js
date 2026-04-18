'use strict'

// A tiny shared-state module that lets the CLI tell grammar files which
// optional stages to include. The CLI calls `.set(...)` before loading the
// grammar; the grammar file calls `.get()` at load time and branches on the
// flags. Keeps grammars declarative — no CLI plumbing leaks into the grammar
// JS — while still giving debug-time control over what gets generated.

let opts = {}

module.exports = {
  set: function (o) { opts = Object.assign({}, opts, o || {}) },
  get: function () { return opts },
  reset: function () { opts = {} }
}
