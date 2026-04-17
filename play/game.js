// graphgram play engine. Consumes a graphlib-shaped JSON graph on
// window.GRAPH, optional text overrides on window.TEXT, and drives a
// CYOA-style traversal in the DOM.

(function () {
  'use strict'

  // ------------------------------------------------------------------
  // Default text dictionary. Users can override any entry by defining
  // window.TEXT = { node: {...}, edge: {...} } before game.js loads.
  // Keys are matched against label fields in this order:
  //   1. by `nodeId` / `edgeId` (specific override for a particular
  //      node or edge)
  //   2. by `type` (broad override for all nodes/edges of that type)
  //   3. the `_default` entry
  // Template substitution: {field} in a text string is replaced by the
  // corresponding label field.
  // ------------------------------------------------------------------
  const DEFAULT_TEXT = {
    node: {
      start:        { verbose: 'You stand at the entrance.',           brief: 'The entrance.' },
      win:          { verbose: 'You reach the goal. You have won!',    brief: 'The goal.' },
      room:         { verbose: 'A room.',                              brief: 'A room.' },
      dead_end:     { verbose: 'A dead end; nothing here but dust.',   brief: 'A dead end.' },
      key:          { verbose: 'A key lies on the floor. You pick it up ({pairId}).',
                      brief:   'The spot where you found the key.',
                      status:  'Key {pairId}' },
      door:         { verbose: 'A locked door ({pairId}) blocks the way.',
                      brief:   'A locked door ({pairId}).' },
      potion:       { verbose: 'A health potion. You drink it. (+{healValue})',
                      brief:   'An empty vial where the potion was.',
                      status:  'potion used' },
      choice:       { verbose: 'A monster snarls. The fight is on.',
                      brief:   'The monster faces you. The fight continues.' },
      random:       { verbose: '...',                                  brief: '...' },
      death:        { verbose: 'You have died.',                       brief: 'You have died.' },
      puzzle_intro: { verbose: 'A puzzle bars the way. Solve it.',
                      brief:   'The puzzle bars the way.' },
      distractor:   { verbose: 'That was wrong. You are forced back to the puzzle.',
                      brief:   'Wrong path.' },
      _default:     { verbose: 'A featureless space.', brief: 'Here.' }
    },
    edge: {
      // `initial` is the narrative text printed the first time you traverse
      // the edge (used for atmosphere); `link` is the hyperlink text shown
      // as an affordance from the source node.
      path:        { initial: 'You continue forward.',            link: 'Continue' },
      passage:     { initial: 'A quiet passage unfolds.',         link: 'Take the passage' },
      monster:     { initial: 'A monster lunges!',                link: 'Fight' },
      puzzle:      { initial: 'A puzzle bars the way.',           link: 'Tackle the puzzle' },
      backtrack:   { initial: 'You double back the way you came.', link: 'Go back' },
      return:      { initial: 'You take the shortcut.',           link: 'Take the shortcut' },
      choice:      { initial: 'You make your move.',              link: null /* use edge.dot.label */ },
      consequence: { initial: '...',                              link: null /* engine-resolved */ },
      retreat:     { initial: 'You flee from battle.',            link: 'Retreat' },
      _default:    { initial: 'You move on.',                     link: 'Go' }
    }
  }

  // ------------------------------------------------------------------
  // Graph indexing.
  // ------------------------------------------------------------------
  if (!window.GRAPH || !window.GRAPH.nodes || !window.GRAPH.edges) {
    showError('Missing window.GRAPH. Regenerate play/graph.js.')
    return
  }
  const GRAPH = window.GRAPH
  // Merge user-supplied text over the defaults.
  const TEXT = mergeText(DEFAULT_TEXT, window.TEXT || {})

  const nodeById = {}         // host id -> label object
  for (const n of GRAPH.nodes) nodeById[n.v] = n.value || {}
  const nodeIdToHostId = {}   // label.nodeId -> host id (for prereq.visited lookups)
  for (const n of GRAPH.nodes) {
    const nid = (n.value || {}).nodeId
    if (nid) nodeIdToHostId[nid] = n.v
  }
  // Index edges by source.
  const outgoing = {}
  for (const e of GRAPH.edges) {
    if (!outgoing[e.v]) outgoing[e.v] = []
    outgoing[e.v].push({ v: e.v, w: e.w, label: e.value || {} })
  }
  // All edgeIds that actually exist (for prereq.traversed validation).
  const allEdgeIds = new Set()
  for (const e of GRAPH.edges) {
    const eid = (e.value || {}).edgeId
    if (eid) allEdgeIds.add(eid)
  }

  // Find the start node: prefer label.type === 'start', fallback to
  // label.nodeId === 'start', fallback to first node.
  function findStart () {
    for (const n of GRAPH.nodes) if ((n.value || {}).type === 'start') return n.v
    for (const n of GRAPH.nodes) if ((n.value || {}).nodeId === 'start') return n.v
    return GRAPH.nodes[0].v
  }

  // ------------------------------------------------------------------
  // Player state.
  // ------------------------------------------------------------------
  const state = {
    currentNode: findStart(),
    playerHP: 1,
    monsterHP: null,            // null when not in a battle
    inBattleGroup: null,        // monster group-id (shared by battle nodes)
    visited: new Set(),         // set of label.nodeId values the player has visited
    traversed: new Set(),       // set of label.edgeId values the player has traversed
    moves: 0,
    score: null,                // set on win
    gameOver: false
  }

  // A battle is delimited by a set of nodes created in one rule application.
  // The monsterBattle primitive names its nodes with suffixes "_N" where N is
  // the rule application iter; we pull that iter out as the battle id.
  function battleGroup (label) {
    const t = label && label.type
    if (t !== 'choice' && t !== 'random' && t !== 'death') return null
    // Parse iter suffix off the nodeId — e.g. battle_normal_3 -> 3.
    const nid = label.nodeId || ''
    const m = nid.match(/_(\d+)$/)
    return m ? ('battle_' + m[1]) : null
  }

  // ------------------------------------------------------------------
  // Edge accessibility.
  // ------------------------------------------------------------------
  function edgeAccessible (edge) {
    const prereq = edge.label.prereq
    if (!prereq) return true
    if (prereq.pairId) {
      // Player must have visited the key with this pairId.
      for (const n of GRAPH.nodes) {
        const lab = n.value || {}
        if (lab.type === 'key' && lab.pairId === prereq.pairId) {
          if (state.visited.has(lab.nodeId)) return true
        }
      }
      return false
    }
    if (prereq.traversed) return state.traversed.has(prereq.traversed)
    if (prereq.visited)   return state.visited.has(prereq.visited)
    return true
  }

  // ------------------------------------------------------------------
  // Text lookup with template substitution.
  // ------------------------------------------------------------------
  function lookupText (bucket, label, field) {
    const dict = TEXT[bucket]
    const byId = label[bucket === 'node' ? 'nodeId' : 'edgeId']
    const byType = label.type
    let entry = null
    if (byId && dict[byId] && dict[byId][field] != null)       entry = dict[byId][field]
    else if (byType && dict[byType] && dict[byType][field] != null) entry = dict[byType][field]
    else if (dict._default && dict._default[field] != null)    entry = dict._default[field]
    if (entry == null) return null
    return interpolate(entry, label)
  }
  function interpolate (tmpl, label) {
    return String(tmpl).replace(/\{([a-zA-Z0-9_]+)\}/g, function (_, k) {
      const v = label[k]
      if (v == null) return ''
      if (typeof v === 'number') {
        // Render 0..1 fractions as percentages for HP-like fields.
        if (k === 'healValue' || k === 'playerDamage' || k === 'monsterDamage') {
          return Math.round(v * 100) + '%'
        }
      }
      return String(v)
    })
  }

  // ------------------------------------------------------------------
  // Rendering: text pane, status line, graph.
  // ------------------------------------------------------------------
  function appendEvent (html, cls) {
    const pane = document.getElementById('text-pane')
    const div = document.createElement('div')
    div.className = 'event ' + (cls || '')
    div.innerHTML = html
    pane.appendChild(div)
    pane.scrollTop = pane.scrollHeight
    return div
  }
  function appendLinks (links) {
    if (!links.length) return
    const pane = document.getElementById('text-pane')
    const container = document.createElement('div')
    container.className = 'links event'
    links.forEach(function (l) {
      const a = document.createElement('a')
      a.href = '#'
      a.className = l.cls || ''
      a.textContent = l.text
      a.addEventListener('click', function (ev) {
        ev.preventDefault()
        // Strip all currently-active links so the player can only act once.
        document.querySelectorAll('#text-pane .links').forEach(function (el) {
          el.parentNode.removeChild(el)
        })
        l.onClick()
      })
      container.appendChild(a)
    })
    pane.appendChild(container)
    pane.scrollTop = pane.scrollHeight
  }
  function appendDivider () {
    document.getElementById('text-pane').appendChild(
      Object.assign(document.createElement('div'), { className: 'divider' }))
  }

  function renderStatus () {
    const status = document.getElementById('status')
    const chips = []
    const hpPct = Math.max(0, Math.round(state.playerHP * 100))
    chips.push('<span class="chip ' + (hpPct <= 0 ? 'dead' : '') + '">HP: ' + hpPct + '</span>')
    if (state.monsterHP != null) {
      const m = Math.max(0, Math.round(state.monsterHP * 100))
      chips.push('<span class="chip mon">Monster: ' + m + '</span>')
    }
    chips.push('<span class="chip moves">Moves: ' + state.moves + '</span>')
    if (state.score != null) chips.push('<span class="chip score">Score: ' + state.score + '</span>')
    // Visited nodes with a `status` text become inventory chips.
    const inv = []
    state.visited.forEach(function (nid) {
      const hostId = nodeIdToHostId[nid]
      if (!hostId) return
      const label = nodeById[hostId]
      const s = lookupText('node', label, 'status')
      if (s) inv.push(s)
    })
    if (inv.length) {
      chips.push('<span class="chip inv">' + inv.map(escapeHtml).join(', ') + '</span>')
    }
    status.innerHTML = chips.join('')
  }

  // ------------------------------------------------------------------
  // Core transitions.
  // ------------------------------------------------------------------
  function start () {
    renderStatus()
    renderGraph()
    enterNode(state.currentNode, /*viaEdge*/ null)
  }

  // Arrive at a node: apply node-entry effects, print its text, offer its
  // outgoing affordances. May short-circuit via random-node auto-roll.
  function enterNode (nodeId, viaEdge) {
    const label = nodeById[nodeId] || {}
    const wasFirstVisit = !state.visited.has(label.nodeId)
    state.currentNode = nodeId

    // Node-entry effects.
    applyNodeEntryEffects(label, wasFirstVisit)
    if (label.nodeId) state.visited.add(label.nodeId)

    // Track battle group: entering a battle node sets monsterHP to 1.0,
    // leaving resets.
    const bg = battleGroup(label)
    if (bg && state.inBattleGroup !== bg) {
      state.inBattleGroup = bg
      state.monsterHP = 1
    } else if (!bg && state.inBattleGroup) {
      state.inBattleGroup = null
      state.monsterHP = null
    }

    renderStatus()
    renderGraph()

    // Death / win short-circuits.
    if (label.type === 'death' || state.playerHP <= 0) {
      appendEvent('<div class="death">' + escapeHtml(lookupText('node', label, 'verbose') || 'You have died.') + '</div>')
      state.gameOver = true
      return
    }
    if (label.type === 'win') {
      state.score = state.moves
      appendEvent('<div class="victory">' + escapeHtml(lookupText('node', label, 'verbose') || 'You have won!') + ' Final score: ' + state.score + ' moves.</div>')
      state.gameOver = true
      return
    }

    // Random node: engine rolls immediately.
    if (label.type === 'random') {
      rollAtRandom(nodeId)
      return
    }

    // Normal node: show text + offer affordances.
    const verbose = lookupText('node', label, wasFirstVisit ? 'verbose' : 'brief') || ''
    const klass = wasFirstVisit ? 'verbose' : 'brief'
    appendEvent('<div class="' + klass + '">' + escapeHtml(verbose) + '</div>')

    // Offer the "look" affordance on repeat visits to see verbose text again.
    const accessible = accessibleOutgoing(nodeId)
    const links = accessible.map(function (edge) {
      return {
        text: linkTextFor(edge),
        cls: linkClassFor(edge),
        onClick: function () { takeEdge(edge) }
      }
    })
    if (!wasFirstVisit) {
      const repeatVerbose = lookupText('node', label, 'verboseRepeat') || lookupText('node', label, 'verbose') || verbose
      links.unshift({
        text: 'Look', cls: 'look',
        onClick: function () {
          appendEvent('<div class="verbose">' + escapeHtml(repeatVerbose) + '</div>')
          renderNodeAffordances()  // re-render the same links
        }
      })
    }
    appendLinks(links)
  }

  // Re-render current node's outgoing links without printing new node text
  // (used by the "look" affordance).
  function renderNodeAffordances () {
    const accessible = accessibleOutgoing(state.currentNode)
    appendLinks(accessible.map(function (edge) {
      return {
        text: linkTextFor(edge),
        cls: linkClassFor(edge),
        onClick: function () { takeEdge(edge) }
      }
    }))
  }

  function accessibleOutgoing (nodeId) {
    const label = nodeById[nodeId] || {}
    const out = outgoing[nodeId] || []
    // `random` nodes have only consequence edges; the engine will roll,
    // never the player.
    if (label.type === 'random') return []
    return out.filter(edgeAccessible)
  }

  function linkTextFor (edge) {
    // Prefer explicit user/text-dict link text by edgeId -> type.
    const t = lookupText('edge', edge.label, 'link')
    if (t) return t
    // Next: dot.label (often the most descriptive, e.g. 'attack', 'defend').
    if (edge.label.dot && edge.label.dot.label) return edge.label.dot.label
    // Fallback: type name.
    return edge.label.type || 'Go'
  }
  function linkClassFor (edge) {
    return edge.label.type || ''
  }

  function applyNodeEntryEffects (label, firstVisit) {
    // Heal if potion and first visit.
    if (label.type === 'potion' && firstVisit && typeof label.healValue === 'number') {
      const before = state.playerHP
      state.playerHP = Math.min(1, state.playerHP + label.healValue)
      const gained = Math.round((state.playerHP - before) * 100)
      if (gained > 0) {
        appendEvent('<span class="heal">+' + gained + ' HP</span>')
      }
    }
  }

  // Player traverses an edge.
  function takeEdge (edge) {
    state.moves++
    if (edge.label.edgeId) state.traversed.add(edge.label.edgeId)

    // Print narrative text for the edge.
    const firstTime = edge.label.edgeId
      ? !state.traversedOnce || !state.traversedOnce.has(edge.label.edgeId)
      : true
    const narrative = lookupText('edge', edge.label,
      firstTime ? 'initial' : 'repeat') || lookupText('edge', edge.label, 'initial')
    if (narrative && narrative !== '...') {
      appendEvent('<div class="narrative">' + escapeHtml(narrative) + '</div>')
    }
    if (!state.traversedOnce) state.traversedOnce = new Set()
    if (edge.label.edgeId) state.traversedOnce.add(edge.label.edgeId)

    // Apply damage encoded on the edge.
    applyEdgeDamage(edge.label)

    renderStatus()

    // If player died mid-edge, route directly to the nearest death node
    // (prefer one in the current battle group).
    if (state.playerHP <= 0) {
      goToDeathNode()
      return
    }
    // If the monster died, force victory route.
    if (state.monsterHP != null && state.monsterHP <= 0) {
      const victory = findVictoryTarget(edge.v)
      if (victory) {
        appendEvent('<div class="narrative">Your final blow lands. The monster falls.</div>')
        enterNode(victory, edge)
        return
      }
    }
    enterNode(edge.w, edge)
  }

  // Engine picks an outgoing edge at a random node by `weight`; if the
  // rolled edge carries lethal damage, reroute to death/victory as needed.
  function rollAtRandom (nodeId) {
    const edges = (outgoing[nodeId] || []).filter(function (e) {
      return e.label.type === 'consequence'
    })
    if (!edges.length) return  // malformed graph
    const total = edges.reduce(function (s, e) { return s + (e.label.weight || 0) }, 0)
    let r = Math.random() * total
    let picked = edges[edges.length - 1]
    for (const e of edges) {
      r -= (e.label.weight || 0)
      if (r <= 0) { picked = e; break }
    }
    // Short description of what happened.
    const role = picked.label.role || 'the die is cast'
    appendEvent('<div class="narrative"><em>' + escapeHtml(role.replace(/-/g, ' ')) + '</em></div>')
    takeEdge(picked)
  }

  function applyEdgeDamage (label) {
    if (typeof label.playerDamage === 'number' && label.playerDamage > 0) {
      state.playerHP = Math.max(0, state.playerHP - label.playerDamage)
      appendEvent('<span class="damage">-' + Math.round(label.playerDamage * 100) + ' HP</span>')
    }
    if (typeof label.monsterDamage === 'number' && label.monsterDamage > 0
        && state.monsterHP != null) {
      state.monsterHP = Math.max(0, state.monsterHP - label.monsterDamage)
      appendEvent('<span class="damage">Monster -' + Math.round(label.monsterDamage * 100) + ' HP</span>')
    }
  }

  function findVictoryTarget (fromNodeId) {
    // Victory consequence edges target a non-death, non-choice, non-random
    // node; in the monsterBattle expansion that's `b`.
    const ns = outgoing[fromNodeId] || []
    for (const e of ns) {
      if (e.label.type === 'consequence') {
        const tt = (nodeById[e.w] || {}).type
        if (tt !== 'death' && tt !== 'choice' && tt !== 'random') return e.w
      }
    }
    return null
  }
  function goToDeathNode () {
    // Find a death node reachable from the current battle neighborhood.
    for (const n of GRAPH.nodes) {
      if ((n.value || {}).type === 'death') {
        enterNode(n.v, null)
        return
      }
    }
    // No death node? Just end the game.
    appendEvent('<div class="death">You have died.</div>')
    state.gameOver = true
  }

  // ------------------------------------------------------------------
  // Graphviz rendering.
  // ------------------------------------------------------------------
  let vizInstance = null
  Viz.instance().then(function (viz) { vizInstance = viz; renderGraph() })

  function renderGraph () {
    if (!vizInstance) return
    const dot = dotForGraph()
    try {
      const svg = vizInstance.renderSVGElement(dot)
      const pane = document.getElementById('graph-pane')
      pane.innerHTML = ''
      pane.appendChild(svg)
    } catch (e) {
      showError('Graph render: ' + e.message)
    }
  }

  // Radius (in edges) of the neighborhood to show around the current node.
  // 1 = just current node + immediate neighbors; 2 = also two-hop nodes.
  // Increase to feel less claustrophobic, decrease to reduce clutter in
  // dense battle subgraphs.
  let graphRadius = 2

  // Build a DOT string for the subgraph within `graphRadius` edges of the
  // current node, traversing in both directions. Nodes at the frontier
  // (exactly `graphRadius` away) are drawn but their further neighbors are
  // not — instead we hint at them with a "..." pseudo-node when they have
  // unshown neighbors.
  function dotForGraph () {
    const lines = ['digraph G {']
    lines.push('  rankdir=LR;')
    lines.push('  node [fontname="Helvetica",fontsize=10];')
    lines.push('  edge [fontname="Helvetica",fontsize=9];')

    const center = state.currentNode
    const distance = new Map()
    distance.set(center, 0)
    // BFS on undirected adjacency out to graphRadius.
    const queue = [center]
    while (queue.length) {
      const v = queue.shift()
      const d = distance.get(v)
      if (d >= graphRadius) continue
      const neighbors = new Set()
      for (const e of (outgoing[v] || [])) neighbors.add(e.w)
      for (const e of GRAPH.edges) if (e.w === v) neighbors.add(e.v)
      for (const u of neighbors) {
        if (!distance.has(u)) {
          distance.set(u, d + 1)
          queue.push(u)
        }
      }
    }
    const visibleSet = distance

    // Emit visible nodes.
    for (const [v, d] of visibleSet) {
      const label = nodeById[v] || {}
      const attrs = nodeDotAttrs(v, label, d)
      lines.push('  ' + v + ' ' + attrs + ';')
    }

    // Emit edges whose both endpoints are visible.
    const emittedEdgeKeys = new Set()
    for (const e of GRAPH.edges) {
      if (!visibleSet.has(e.v) || !visibleSet.has(e.w)) continue
      const label = e.value || {}
      const attrs = edgeDotAttrs({ v: e.v, w: e.w, label }, label)
      lines.push('  ' + e.v + ' -> ' + e.w + ' ' + attrs + ';')
      emittedEdgeKeys.add(e.v + '>' + e.w)
    }

    // For each frontier node (at distance graphRadius), hint at its
    // off-screen neighbors with an anonymous "..." node.
    let stubId = 0
    for (const [v, d] of visibleSet) {
      if (d !== graphRadius) continue
      let hiddenOut = 0, hiddenIn = 0
      for (const e of (outgoing[v] || [])) if (!visibleSet.has(e.w)) hiddenOut++
      for (const e of GRAPH.edges) if (e.w === v && !visibleSet.has(e.v)) hiddenIn++
      if (hiddenOut) {
        const sid = '__out_' + (stubId++)
        lines.push('  ' + sid + ' [label="... +' + hiddenOut + '",shape="plain",fontcolor="#888"];')
        lines.push('  ' + v + ' -> ' + sid + ' [style="dotted",color="#aaa",arrowhead="open"];')
      }
      if (hiddenIn) {
        const sid = '__in_' + (stubId++)
        lines.push('  ' + sid + ' [label="+' + hiddenIn + ' ...",shape="plain",fontcolor="#888"];')
        lines.push('  ' + sid + ' -> ' + v + ' [style="dotted",color="#aaa",arrowhead="open"];')
      }
    }

    lines.push('}')
    return lines.join('\n')
  }

  function nodeDotAttrs (v, label, distance) {
    const d = label.dot || {}
    const parts = []
    parts.push('label="' + dotEscape(d.label || label.type || v) + '"')
    if (d.shape) parts.push('shape="' + d.shape + '"')
    if (d.color) parts.push('color="' + d.color + '"')
    // State-based class so CSS can restyle the SVG post-render.
    const cls = []
    if (v === state.currentNode) cls.push('current')
    if (label.nodeId && state.visited.has(label.nodeId)) cls.push('visited')
    // Fade frontier nodes a bit so the eye is drawn inward.
    if (distance != null && distance >= graphRadius) cls.push('frontier')
    if (cls.length) parts.push('class="' + cls.join(' ') + '"')
    return '[' + parts.join(',') + ']'
  }
  function edgeDotAttrs (e, label) {
    const d = label.dot || {}
    const parts = []
    if (d.label) parts.push('label="' + dotEscape(d.label) + '"')
    if (d.color) parts.push('color="' + d.color + '"')
    if (d.style) parts.push('style="' + d.style + '"')
    const cls = []
    if (label.edgeId && state.traversed.has(label.edgeId)) cls.push('traversed')
    if (cls.length) parts.push('class="' + cls.join(' ') + '"')
    return parts.length ? '[' + parts.join(',') + ']' : ''
  }

  // ------------------------------------------------------------------
  // Helpers.
  // ------------------------------------------------------------------
  function escapeHtml (s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
  function dotEscape (s) {
    return String(s).replace(/"/g, '\\"').replace(/\n/g, '\\n')
  }
  function showError (msg) {
    const el = document.getElementById('error')
    el.style.display = 'block'
    el.textContent = msg
  }
  function mergeText (base, over) {
    const out = { node: Object.assign({}, base.node), edge: Object.assign({}, base.edge) }
    for (const k of Object.keys(over.node || {})) {
      out.node[k] = Object.assign({}, out.node[k] || {}, over.node[k])
    }
    for (const k of Object.keys(over.edge || {})) {
      out.edge[k] = Object.assign({}, out.edge[k] || {}, over.edge[k])
    }
    return out
  }

  // ------------------------------------------------------------------
  // Zoom controls.
  // ------------------------------------------------------------------
  function setupZoomControls () {
    const pane = document.getElementById('graph-pane')
    const bar = document.createElement('div')
    bar.id = 'zoom-bar'
    bar.innerHTML =
      '<button id="zoom-out">–</button>' +
      '<span id="zoom-level">radius ' + graphRadius + '</span>' +
      '<button id="zoom-in">+</button>'
    pane.parentNode.insertBefore(bar, pane)
    document.getElementById('zoom-in').addEventListener('click', function () {
      graphRadius = Math.min(6, graphRadius + 1)
      document.getElementById('zoom-level').textContent = 'radius ' + graphRadius
      renderGraph()
    })
    document.getElementById('zoom-out').addEventListener('click', function () {
      graphRadius = Math.max(1, graphRadius - 1)
      document.getElementById('zoom-level').textContent = 'radius ' + graphRadius
      renderGraph()
    })
  }

  // ------------------------------------------------------------------
  // Kick off. Script is at end of <body>, so the DOM is ready; no need
  // to wait for DOMContentLoaded (and it may well have already fired).
  // ------------------------------------------------------------------
  setupZoomControls()
  start()
})()
