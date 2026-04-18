// Synchronous Sonnet runner for graphgram narrator helpers.
//
// The grammar rewrite loop is synchronous, so each LLM call blocks until
// complete. We shell out to `curl` via execFileSync: avoids needing a
// sync wrapper around the SDK's promises, keeps the HTTP request
// transparent, and lets us reuse Anthropic's prompt caching via the
// `cache_control` field on the system block.
//
// Local disk cache: keyed by sha256(model + systemPreamble + prompt),
// stored as one JSON file per key under cacheDir. Fixed-seed re-runs
// hit cache for every call and make zero API requests.

'use strict'

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')
const tmp = require('tmp')

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 256
const DEFAULT_CACHE_DIR = '.graphgram-cache'

const DEFAULT_SYSTEM_PREAMBLE =
  'You are a narrative generator for a dungeon-crawler text adventure. ' +
  'Keep responses short (1 to 3 sentences), evocative, and in the tone the user requests. ' +
  'Never break the fourth wall, never list options, never add meta-commentary — just produce the requested narrative or command text.'

// Pricing per million tokens, for on-screen cost estimation only.
const PRICING = {
  'claude-sonnet-4-6':   { in: 3.00, out: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-opus-4-7':     { in: 15.00, out: 75.00, cacheRead: 1.50, cacheWrite: 18.75 },
  'claude-haiku-4-5':    { in: 1.00, out: 5.00, cacheRead: 0.10, cacheWrite: 1.25 }
}

function hashKey (parts) {
  const h = crypto.createHash('sha256')
  for (let i = 0; i < parts.length; i++) {
    h.update(String(parts[i]))
    h.update('\0')
  }
  return h.digest('hex')
}

function summarize (s) {
  const flat = String(s).replace(/\s+/g, ' ')
  return flat.length > 70 ? flat.slice(0, 70) + '…' : flat
}

function makeSonnetRunner (opts) {
  opts = opts || {}
  const warn = opts.warn || function () {}
  const disabled = !!opts.disabled
  const model = opts.model || DEFAULT_MODEL
  const maxTokens = opts.maxTokens || DEFAULT_MAX_TOKENS
  const systemPreamble = typeof opts.systemPreamble === 'string' ? opts.systemPreamble : DEFAULT_SYSTEM_PREAMBLE
  const cacheEnabled = opts.cache !== false
  const cacheDir = opts.cacheDir || DEFAULT_CACHE_DIR
  const cacheReadOnly = !!opts.cacheReadOnly
  const apiKey = opts.apiKey || process.env.ANTHROPIC_API_KEY

  if (cacheEnabled && !fs.existsSync(cacheDir))
    fs.mkdirSync(cacheDir, { recursive: true })

  const stats = {
    calls: 0,
    cacheHits: 0,
    cacheMisses: 0,
    apiErrors: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0
  }

  function cachePath (key) {
    return path.join(cacheDir, key.slice(0, 2), key.slice(2) + '.json')
  }

  function readCache (key) {
    if (!cacheEnabled) return null
    const p = cachePath(key)
    if (!fs.existsSync(p)) return null
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'))
    } catch (e) {
      warn('cache read failed for ' + key + ': ' + e.message)
      return null
    }
  }

  function writeCache (key, entry) {
    if (!cacheEnabled) return
    const p = cachePath(key)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(entry, null, 2))
  }

  function callApi (prompt) {
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set (add to .env or pass opts.apiKey)')
    const body = JSON.stringify({
      model: model,
      max_tokens: maxTokens,
      system: [
        { type: 'text',
          text: systemPreamble,
          cache_control: { type: 'ephemeral' } }
      ],
      messages: [{ role: 'user', content: prompt }]
    })
    const tf = tmp.fileSync({ postfix: '.json' })
    try {
      fs.writeFileSync(tf.name, body)
      const out = execFileSync('curl', [
        '-sS',
        '-X', 'POST',
        'https://api.anthropic.com/v1/messages',
        '-H', 'content-type: application/json',
        '-H', 'anthropic-version: 2023-06-01',
        '-H', 'x-api-key: ' + apiKey,
        '--data-binary', '@' + tf.name
      ], { encoding: 'utf-8' })
      const resp = JSON.parse(out)
      if (resp.type === 'error' || resp.error)
        throw new Error((resp.error && resp.error.message) || JSON.stringify(resp))
      const text = (resp.content || []).map(function (c) { return c.text || '' }).join('').trim()
      const usage = resp.usage || {}
      return {
        text: text,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_read_input_tokens: usage.cache_read_input_tokens || 0,
        cache_creation_input_tokens: usage.cache_creation_input_tokens || 0
      }
    } finally {
      try { tf.removeCallback() } catch (_) {}
    }
  }

  function run (prompt) {
    stats.calls++
    if (disabled) return '[placeholder]'

    const key = hashKey([model, systemPreamble, prompt])
    const cached = readCache(key)

    if (cached) {
      stats.cacheHits++
      warn('[cache] ' + summarize(prompt))
      return cached.text
    }

    if (cacheReadOnly)
      throw new Error('Cache miss in read-only mode for prompt: ' + prompt.slice(0, 200))

    warn('[api]   ' + summarize(prompt))
    try {
      const result = callApi(prompt)
      stats.cacheMisses++
      stats.inputTokens += result.input_tokens
      stats.outputTokens += result.output_tokens
      stats.cacheReadTokens += result.cache_read_input_tokens
      stats.cacheWriteTokens += result.cache_creation_input_tokens
      writeCache(key, {
        model: model,
        prompt: prompt,
        text: result.text,
        input_tokens: result.input_tokens,
        output_tokens: result.output_tokens,
        cache_read_input_tokens: result.cache_read_input_tokens,
        cache_creation_input_tokens: result.cache_creation_input_tokens,
        timestamp: new Date().toISOString()
      })
      return result.text
    } catch (e) {
      stats.apiErrors++
      warn('api error: ' + e.message)
      return '[api error]'
    }
  }

  function summary () {
    const p = PRICING[model]
    let cost = null
    if (p) {
      cost = stats.inputTokens * p.in / 1e6
           + stats.outputTokens * p.out / 1e6
           + stats.cacheReadTokens * p.cacheRead / 1e6
           + stats.cacheWriteTokens * p.cacheWrite / 1e6
    }
    return {
      model: model,
      calls: stats.calls,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      apiErrors: stats.apiErrors,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      cacheReadTokens: stats.cacheReadTokens,
      cacheWriteTokens: stats.cacheWriteTokens,
      estCostUSD: cost === null ? null : Number(cost.toFixed(4))
    }
  }

  run.stats = stats
  run.summary = summary
  return run
}

module.exports = { makeSonnetRunner, DEFAULT_MODEL, DEFAULT_CACHE_DIR, DEFAULT_SYSTEM_PREAMBLE }
