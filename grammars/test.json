{
  start: "START",
  limit: 5,
  rules: [
    { lhs: "START", rhs: { node: ["X"], edge: [[0,0,'self1']] } },
    { lhs: "X", rhs: ["F"], weight: 100, condition: "$a.label === 'X' && $$iter == 0" },
    { lhs: "X", rhs: ["Y","Z"], weight: "1" },
    { lhs: ["Y","Z"], rhs: ["U${a.label}","V"] },
    { lhs: ["UY","V"], rhs: { node: ["R","S","C","D"], edge: [[0,1,"rs"],[0,2],[2,2,'self2'],[1,3],[2,3]] } },
    { lhs: ["R","S","rx"], rhs: { node: ["A","B"], edge: [[0,1,"nope"]] } },
    { lhs: ["R","S","rs"], rhs: { node: ["A","B"], edge: [[0,1,"${c.label}"]] } }
  ]
}
