#!/usr/bin/env node

// bin/build-docs.js — render the GitHub Pages site into docs/.
//
// GitHub Pages serves this repo from `master:/docs` (legacy build, no Jekyll
// step we control), so the site has to be committed as static HTML. This
// script is the generator: markdown in, wrapped HTML out, one shared shell.
//
//   docs/src/*.md      -> docs/*.html          (guide, landing, gallery)
//   papers/*.md        -> docs/papers/*.html   (the whitepaper literature)
//   docs/spec/*.md     -> docs/spec/*.html     (the export contracts)
//
// Left alone: docs/jsdoc/ and docs/schema_doc.html, which are produced by
// jsdoc and generate-schema-doc via docs/Makefile, and docs/play/, which is
// the playable app plus its pre-generated stories.
//
// Two link-rewriting rules make the same markdown readable both on GitHub and
// on the site:
//   1. a relative link to a .md file becomes a link to the .html we emit;
//   2. a relative link that escapes the docs tree — into source, tests, or
//      fixtures — becomes an absolute link to the file on GitHub, because
//      those files are not published to Pages.

const fs = require('fs'),
      path = require('path'),
      { marked } = require('marked')

const ROOT = path.resolve(__dirname, '..')
const DOCS = path.join(ROOT, 'docs')
const REPO_BLOB = 'https://github.com/ihh/graphgram/blob/master/'

const NAV = [
  { href: 'index.html', text: 'graphgram', brand: true },
  { href: 'guide.html', text: 'Guide' },
  { href: 'advanced.html', text: 'Advanced' },
  { href: 'examples.html', text: 'Examples' },
  { href: 'play/index.html', text: 'Play' },
  { href: 'papers/index.html', text: 'Papers' },
  { href: 'spec/story-ir.html', text: 'Spec' },
  { href: 'jsdoc/index.html', text: 'API' },
  { href: 'https://github.com/ihh/graphgram', text: 'GitHub', external: true }
]

// `depth` is how many directories below docs/ the page lives, so that nav
// links resolve from docs/papers/foo.html as well as from docs/foo.html.
function navHtml (depth, activeHref) {
  const up = '../'.repeat(depth)
  return NAV.map(function (n) {
    const href = n.external ? n.text && n.href : up + n.href
    const cls = [n.brand ? 'brand' : '', n.href === activeHref ? 'active' : ''].filter(Boolean).join(' ')
    return '<a href="' + (n.external ? n.href : href) + '"' +
      (cls ? ' class="' + cls + '"' : '') +
      (n.external ? ' rel="noopener"' : '') + '>' + n.text + '</a>'
  }).join('\n      ')
}

function shell (opts) {
  const up = '../'.repeat(opts.depth)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(opts.description || 'graphgram — a graph grammar library for procedural narrative')}">
<link rel="stylesheet" href="${up}assets/site.css">
</head>
<body>
<header class="site-nav">
  <nav>
      ${navHtml(opts.depth, opts.active)}
  </nav>
</header>
<main class="prose">
${opts.body}
</main>
<footer class="site-foot">
  <p>graphgram · <a href="https://github.com/ihh/graphgram">github.com/ihh/graphgram</a> · ISC</p>
</footer>
</body>
</html>
`
}

function escapeHtml (s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Rewrite one markdown link href for the published site.
//
// `srcDir` is the source file's directory (repo-relative), `outDepth` is how
// deep below docs/ the emitted page sits. Anything absolute, anchor-only, or
// mailto is left alone.
function rewriteHref (href, srcDir, outDepth, mdToHtml) {
  if (/^(https?:|mailto:|#)/.test(href)) return href

  const hashAt = href.indexOf('#')
  const hash = hashAt >= 0 ? href.slice(hashAt) : ''
  const bare = hashAt >= 0 ? href.slice(0, hashAt) : href
  if (!bare) return href

  // Resolve to a repo-relative path so we can decide where it lands.
  const target = path.normalize(path.join(srcDir, bare))

  const asHtml = mdToHtml[target]
  if (asHtml) {
    // Both source and destination live in the published tree: link page-to-page.
    return path.posix.relative(path.posix.dirname(outPathFor(srcDir, outDepth)), asHtml) + hash
  }
  // Escapes the published tree (source files, fixtures, tests): send to GitHub.
  return REPO_BLOB + target.split(path.sep).join('/') + hash
}

// Where a page emitted from `srcDir` at `outDepth` lives, docs-relative. Only
// its directory is used, so a placeholder basename is fine.
function outPathFor (srcDir, outDepth) {
  return outDepth === 0 ? 'page.html' : '../'.repeat(0) + srcDir.split(path.sep).slice(-outDepth).join('/') + '/page.html'
}

function render (markdown, ctx, mdToHtml) {
  const renderer = new marked.Renderer()
  const baseLink = renderer.link.bind(renderer)
  renderer.link = function (token) {
    token.href = rewriteHref(token.href, ctx.srcDir, ctx.depth, mdToHtml)
    return baseLink(token)
  }
  // Heading anchors, so papers can deep-link to each other's sections.
  const baseHeading = renderer.heading.bind(renderer)
  renderer.heading = function (token) {
    const html = baseHeading(token)
    const id = slug(token.text)
    return html.replace(/^<h(\d)>/, '<h$1 id="' + id + '">')
  }
  return marked.parse(markdown, { renderer: renderer, mangle: false, headerIds: false })
}

function slug (text) {
  return String(text).toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function firstHeading (md, fallback) {
  const m = md.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : fallback
}

// --- discover the page set -------------------------------------------------

function listMd (dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter(function (f) { return f.endsWith('.md') }).sort()
}

const pages = []

listMd(path.join(DOCS, 'src')).forEach(function (f) {
  pages.push({ src: path.join('docs', 'src', f), out: f.replace(/\.md$/, '.html'), depth: 0 })
})
listMd(path.join(ROOT, 'papers')).forEach(function (f) {
  pages.push({ src: path.join('papers', f), out: 'papers/' + f.replace(/\.md$/, '.html'), depth: 1 })
})
listMd(path.join(DOCS, 'spec')).forEach(function (f) {
  pages.push({ src: path.join('docs', 'spec', f), out: 'spec/' + f.replace(/\.md$/, '.html'), depth: 1 })
})

// Map every markdown source path to the page it becomes, so link rewriting can
// tell an internal cross-reference from an escape to GitHub.
const mdToHtml = {}
pages.forEach(function (p) { mdToHtml[path.normalize(p.src)] = p.out })

// --- generated fragments ---------------------------------------------------

// The example gallery's prose is hand-written, but the facts in it — ids,
// seeds, budgets, which formats exist — are generated, so the page cannot drift
// from the catalogue. `docs/src/examples.md` carries the placeholder.
function exampleCards () {
  let examples
  try {
    examples = require('../examples')
  } catch (e) {
    // The gallery is buildable before every example module exists; say so
    // rather than failing the whole site build.
    return '<p><em>Example catalogue unavailable: ' + escapeHtml(e.message) + '</em></p>'
  }
  const cards = examples.list().map(function (ex) {
    const seed = ex.defaultSeeds[0]
    const budget = Object.keys(ex.budget || {})
      .filter(function (k) { return ex.budget[k] })
      .map(function (k) { return k + ' ' + ex.budget[k] })
      .join(' · ')
    return [
      '<li class="card">',
      '<h3><a href="play/index.html?story=' + ex.id + '.' + seed + '">' + escapeHtml(ex.title) + '</a></h3>',
      '<p><span class="pill">' + ex.topology + '</span>',
      '<span class="pill">' + (ex.puzzles ? 'puzzles' : 'no puzzles') + '</span></p>',
      '<p><code>' + ex.id + '</code>, canonical seed <code>' + seed + '</code>.',
      ' Other pinned seeds: ' + ex.defaultSeeds.slice(1).map(function (s) {
        return '<a href="play/index.html?story=' + ex.id + '.' + s + '">' + s + '</a>'
      }).join(', ') + '.</p>',
      '<span class="meta">' + escapeHtml(budget) + '</span>',
      '</li>'
    ].join('\n')
  })
  return '<ul class="cards">\n' + cards.join('\n') + '\n</ul>'
}

const FRAGMENTS = { '<!--EXAMPLE-CARDS-->': exampleCards }

// --- build -----------------------------------------------------------------

let written = 0
pages.forEach(function (p) {
  let md = fs.readFileSync(path.join(ROOT, p.src), 'utf-8')
  Object.keys(FRAGMENTS).forEach(function (token) {
    if (md.indexOf(token) >= 0) md = md.split(token).join(FRAGMENTS[token]())
  })
  const title = firstHeading(md, path.basename(p.out, '.html'))
  const ctx = { srcDir: path.dirname(p.src), depth: p.depth }
  const body = render(md, ctx, mdToHtml)
  const html = shell({
    title: title === 'graphgram' ? 'graphgram' : title + ' · graphgram',
    depth: p.depth,
    active: p.out,
    body: body
  })
  const dest = path.join(DOCS, p.out)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, html)
  written++
  console.log('  ' + p.src + ' -> docs/' + p.out)
})

console.log(written + ' pages written to docs/')
