export const nodes = [
  { id: "gate", x: 88, y: 300, name: "West Gate", kind: "entry", icon: "6 shoppers" },
  { id: "fork", x: 280, y: 300, name: "Old Fingerpost", kind: "junction", icon: "Choose a lane" },
  { id: "fruit", x: 485, y: 180, name: "Fruit Queue", kind: "blocker", icon: "JAMMED" },
  { id: "alley", x: 485, y: 418, name: "Quiet Alley", kind: "junction", icon: "Clear route" },
  { id: "bakery", x: 850, y: 282, name: "Orin’s Bakery", kind: "stall", icon: "BREAD" },
];

export const edges = [
  { id: "gate-fork", from: "gate", to: "fork", length: 4, crowdCost: 0.1, moveCrowdCost: 0.12, name: "Entry walk" },
  { id: "fork-fruit", from: "fork", to: "fruit", length: 4, crowdCost: 0.05, moveCrowdCost: 1.15, name: "Crowded fruit lane" },
  { id: "fruit-bakery", from: "fruit", to: "bakery", length: 5, crowdCost: 0.05, moveCrowdCost: 0.8, name: "Short lane" },
  { id: "fork-alley", from: "fork", to: "alley", length: 7, crowdCost: 0.02, moveCrowdCost: 0.04, name: "Quiet alley" },
  { id: "alley-bakery", from: "alley", to: "bakery", length: 7, crowdCost: 0.02, moveCrowdCost: 0.04, name: "Garden walk" },
];

const visitors = ["Ada", "Bram", "Cora", "Dove", "Em", "Finn", "Gilly", "Hob"].map((name, index) => ({
  id: `visitor-${index}`, name, role: "visitor", nodeId: "gate", destinationId: "bakery",
  speed: 0.8 + (index % 2) * 0.05, spawnAt: index * 2.2, value: 1,
  tags: ["visitor", "follower"], satisfaction: 1,
}));

const specialists = [
  { id: "pip", name: "Pip", role: "porter", nodeId: "bakery", destinationId: "bakery", speed: 1, value: 0, tags: ["specialist"], assignmentBoost: 1.65 },
  { id: "mara", name: "Mara", role: "keeper", nodeId: "fruit", destinationId: "fruit", speed: 1, value: 0, tags: ["specialist"], assignmentBoost: 1.35 },
  { id: "orin", name: "Orin", role: "maker", nodeId: "bakery", destinationId: "bakery", speed: 1, value: 0, tags: ["specialist"], assignmentBoost: 1.25 },
];

export const marketMorning = {
  id: "market-morning",
  seed: 27,
  duration: 52,
  budget: 32,
  goal: { deliveries: 6, satisfaction: 5, stableSeconds: 1.25 },
  nodes,
  edges,
  agents: [...visitors, ...specialists],
};
