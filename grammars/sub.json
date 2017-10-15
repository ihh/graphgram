{
  start: "START",
  rules: [
    { lhs: { node: [{id:"S",label:"START"}] }, rhs: { node: [{id:"H",head:["S"],label:"BEGIN"},{id:"T",tail:["S"],label:"END"}],
                                                      edge: [{v:"H",w:"T"}] } },
    { lhs: { node: [{id:"B",label:"BEGIN"}] }, rhs: { node: [{id:"B",label:"xBEGIN"}] } },
    { lhs: { node: [{id:"E",label:"END"}] }, rhs: { node: [{id:"E",label:"xEND"}] } },
    { lhs: { node: [{id:"E",label:"xEND"}] }, rhs: { node: [{id:"a",head:["E"],label:"a"},{id:"b",label:"b"},{id:"c",tail:["E"],label:"yEND"}],
                                                     edge: [{v:"a",w:"b",label:"ab"},{v:"b",w:"c"}] } },
    { lhs: { node: [{id:"x"},{id:"y"},{id:"z"}],
             edge: [{v:"x",w:"y",id:"e"},{v:"y",w:"z",id:"f"}] }, rhs: { node: [{id:"x",label:"${x.label}"},{id:"z",label:"${z.label}"}],
                                                                         edge: [{v:"x",w:"z",label:"${e.label}${f.label}"}] } },
    { lhs: { node: [{id:"x",label:"xBEGIN"},{id:"y",label:"yEND"}],
             edge: [{v:"x",w:"y",id:"e"}] }, rhs: { node: [{id:"x",label:"_${x.label}"},{id:"y",label:"_${y.label}"},{id:"z",label:"zEND"}],
                                                    edge: [{v:"x",w:"y",label:"${e.label}"},{v:"x",w:"z",label:"xz"}] } },
    { lhs: { node: [{id:"x"},{id:"y"},{id:"z",label:"z.*"}],
             edge: [{v:"x",w:"y",id:"e"},{v:"x",w:"z",id:"f"}] }, rhs: { node: [{id:"x",label:"_${x.label}"},{id:"y",label:"_${y.label}"},{id:"z",label:"_${z.label}"}],
                                                                         edge: [{v:"x",w:"y",label:"${e.label}"},{v:"y",w:"z",label:{$eval:"$f.label"}}] } }
  ]
}
