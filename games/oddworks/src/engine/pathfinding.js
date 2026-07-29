function edgeCost(edge, agent, state) {
  if (edge.enabled === false || edge.blocked) return Infinity;
  const tool = state.tools.find((item) => item.edgeId === edge.id && item.active);
  if (tool?.type === "gate" && tool.mode === "closed") return Infinity;
  const crowd = state.agents.filter((item) => item.edgeId === edge.id).length;
  const signBias = state.tools
    .filter((item) => item.nodeId === edge.to && item.active && item.type === "sign")
    .reduce((total, item) => total + (item.targetTag && agent.tags?.includes(item.targetTag) ? -item.strength : 0), 0);
  return Math.max(0.05, edge.length + crowd * (edge.crowdCost ?? 0.08) + signBias);
}

/** Returns the first edge on the lowest-cost route, or null when unreachable. */
export function chooseNextEdge(state, agent, fromId, destinationId) {
  if (fromId === destinationId) return null;
  const distances = new Map([[fromId, 0]]);
  const firstEdges = new Map();
  const pending = [{ nodeId: fromId, cost: 0 }];

  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost || String(a.nodeId).localeCompare(String(b.nodeId)));
    const current = pending.shift();
    if (current.cost !== distances.get(current.nodeId)) continue;
    if (current.nodeId === destinationId) return firstEdges.get(current.nodeId) ?? null;

    for (const edge of state.edges) {
      if (edge.from !== current.nodeId) continue;
      const cost = current.cost + edgeCost(edge, agent, state);
      if (cost >= (distances.get(edge.to) ?? Infinity)) continue;
      distances.set(edge.to, cost);
      firstEdges.set(edge.to, current.nodeId === fromId ? edge : firstEdges.get(current.nodeId));
      pending.push({ nodeId: edge.to, cost });
    }
  }
  return null;
}
