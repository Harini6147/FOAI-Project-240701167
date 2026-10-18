// Generic A*. graph = { node: [[neighbour, edgeCost], ...] }; h(node) = estimated remaining cost.
export function aStar(graph, start, goal, h) {
  const open = [{ node: start, g: 0, f: h(start), path: [start] }]; // open set
  const closed = new Set(); // closed set
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift();
    if (cur.node === goal) return { path: cur.path, cost: cur.g };
    if (closed.has(cur.node)) continue;
    closed.add(cur.node);
    for (const [next, cost] of graph[cur.node] || []) {
      if (closed.has(next)) continue;
      const g = cur.g + cost;
      open.push({ node: next, g, f: g + h(next), path: [...cur.path, next] });
    }
  }
  return null;
}
