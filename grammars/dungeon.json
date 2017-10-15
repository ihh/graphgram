// https://www.reddit.com/r/DnD/comments/20cges/classic_tropes_of_dd/
{
  name: 'dungeon-grammar',
  start: 'START',
  stages:
  [{ name: 'generation-stage',
     rules:
     [{ lhs: 'START', rhs: ['entrance', 'x', 'boss'] },
      { lhs: 'x', rhs: ['x','x'], limit: 3 },
      { lhs: 'x', rhs: { node: ['fork', 'x', 'die', 'x'], edge: [[0,1],[1,2],[0,3]] }, type: 'ending', limit: 3 },
      { lhs: 'x', rhs: { node: ['fork', 'x', 'live', 'x'], edge: [[0,1],[1,2],[0,3]] }, type: 'ending', limit: 3 },
      { lhs: 'x', rhs: { node: ['fork', 'x', 'x', 'x'], edge: [[0,1],[0,2],[1,3],[2,3]] }, type: 'fork', limit: 2, delay: 2 },
      { lhs: 'x', rhs: { node: ['crossroads', 'x', 'x', 'x', 'x'], edge: [[0,1],[0,2],[0,3],[1,4],[2,4],[3,4]] }, type: 'fork', limit: 1, delay: 2 },
      { lhs: 'x', rhs: { node: ['door', 'x1', 'x'], edge: [[0,1,'enter'],[1,2,'exit'],[0,2,'bypass']] }, limit: 3 },
      { lhs: 'x', rhs: { node: ['fork', 'x', 'x', 'x', 'rescue', 'x', 'x'], edge: [[0,1],[1,2],[2,3],[0,3],[3,4],[4,5],[5,6],[3,6],[1,4,'rumor']] }, type: 'rescue', limit: 1 },
      { lhs: 'x', rhs: { node: ['door', 'x1', 'x', 'rescue', 'x', 'x'], edge: [[0,1,'enter'],[1,2,'exit'],[0,2,'bypass'],[2,3],[3,4],[4,5],[2,5],[1,3,'rumor']] }, type: 'rescue', limit: 1 },
      { lhs: 'x', rhs: { node: ['chest', 'chest_contents', 'x'], edge: [[0,1,'open'],[1,2],[0,2,'ignore']] }, limit: 3 },
      { lhs: 'chest_contents', rhs: 'trap', weight: 2 },
      { lhs: 'chest_contents', rhs: 'treasure' },
      { lhs: 'chest_contents', rhs: 'weapon' },
      { lhs: 'x', rhs: { node: ['vial', 'vial_contents', 'x'], edge: [[0,1,'drink'],[1,2],[0,2,'ignore']] }, limit: 3 },
      { lhs: 'vial_contents', rhs: 'potion' },
      { lhs: 'vial_contents', rhs: 'poison' },
      { lhs: 'x', rhs: 'x1', delay: 10 },
      { lhs: 'x1', rhs: 'trap' },
      { lhs: 'x1', rhs: 'monster' },
      { lhs: 'x1', rhs: 'weapon', limit: 2 },
      { lhs: 'x1', rhs: 'treasure', limit: 3 },
      { lhs: 'x1', rhs: 'scenery', weight: 2 }
     ]
   },

   // Second stage is mostly here to illustrate graphviz styling and JSON pattern-matching
   // This is pretty advanced usage, the whole stage can be deleted without substantially changing anything
   { name: 'decoration-stage',
     rules:
     // First rule gives 'rumor' edges dotted-line styling in graphviz
     // Note that this rule drastically slows things down,
     // since it matches every edge in the graph at every iteration;
     // that is why we put these decoration rules in a separate stage.
     [{ name: 'dot-rumor-edge',
	lhs: { node: [{id:'a'},{id:'b'}], edge: [['a','b','rumor']] },
	rhs: { node: [{id:'a'},{id:'b'}], edge: [['a','b',{dot:{label:'rumor',style:'dotted'}}]] } },
      // This rule flags endpoints
      { name: 'flag-endpoints',
	lhs: '(die|live|boss)',  // first node on LHS automatically assigned id 'a'
	rhs: { node: [{ label: { endpoint: '${a.match[1]}' } }] } },
      // This rule gives previously-flagged endpoints a rectangular node-shape styling in graphviz
      // The '$equals' ensures that the JSON is an exact match at that level, and prevents repeat applications
      { name: 'make-endpoints-rectangular',
        lhs: { node: [{ id: 'a', label: { $equals: { endpoint: '.*' } }}] },
//        lhs: { node: [{ id: 'a', label: { $and: [{ endpoint: '.*' }, {$test:'(label)=>!label.dot'}]}}] },
	rhs: { node: [{ id: 'a', update: { dot: { label: '${a.match.endpoint[0]}', shape: 'rect' } } }] } }
     ]
   }
  ]
}
