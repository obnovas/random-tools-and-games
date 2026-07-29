import type { LevelDefinition } from "./types";

/**
 * Tile legend: . grass, = path, ~ water, # existing bridge/plaza,
 * S stall footprint, X blocked wall. Runtime placement should use map legend.
 */
export const BARROW_MARKET: LevelDefinition = {
  id: "barrow-market",
  title: "The Bell at Barrow Market",
  kicker: "A market full of goods, with customers on the wrong side of the water.",
  story:
    "Barrow Market closes at the evening bell. Two paths wind toward the baker, but the quick way pinches shut beside the canal. Mara, Pip, and Orin each see a different opportunity. You have just enough timber and twine to try one—or invent another.",
  objective: "Help at least 12 visitors reach a welcoming stall before the closing bell.",
  planningSeconds: 0,
  operatingSeconds: 105,
  startingBudget: 10,
  map: {
    width: 20,
    height: 12,
    tileSize: 32,
    rows: [
      "....................",
      "..============......",
      "..=....~~....=..SS..",
      "..=....~~....=======",
      "..=====##=====.....=",
      "......=~~=.........=",
      "..=====~~======....=",
      "..=....~~.....=....=",
      "..=....~~.....======",
      "..======~...........",
      "....................",
      "....................",
    ],
    legend: {
      ".": "grass",
      "=": "path",
      "~": "water",
      "#": "bridge",
      S: "stall",
      X: "wall",
    },
  },
  objects: [
    { id: "south-gate", kind: "spawn", position: { x: 2, y: 8 }, label: "South Gate" },
    { id: "west-gate", kind: "spawn", position: { x: 2, y: 1 }, label: "West Gate" },
    { id: "bakery", kind: "goal", position: { x: 17, y: 2 }, label: "Baker's Stall", color: "#d77c5f" },
    { id: "old-stall", kind: "stall", position: { x: 14, y: 8 }, label: "Empty Stall", color: "#8e6c4a" },
    { id: "canal-wheel", kind: "waterwheel", position: { x: 7, y: 7 }, label: "Canal Wheel" },
    { id: "market-lamp", kind: "lamp", position: { x: 12, y: 4 }, label: "Market Lamp" },
  ],
  roster: ["mara", "pip", "orin"],
  inventory: { signpost: 4, handcart: 1, bell: 1, footbridge: 1 },
  waves: [
    { at: 1, count: 3, kind: "hurried", spawnId: "south-gate" },
    { at: 10, count: 3, kind: "curious", spawnId: "west-gate" },
    { at: 23, count: 4, kind: "hurried", spawnId: "south-gate" },
    { at: 38, count: 4, kind: "curious", spawnId: "west-gate" },
    { at: 55, count: 5, kind: "hurried", spawnId: "south-gate" },
    { at: 72, count: 5, kind: "curious", spawnId: "west-gate" },
  ],
  discoveries: [
    {
      id: "crowd-follows-sound",
      title: "Heads turn before feet do",
      observation: "Curious visitors pause when the market bell sounds, then favor activity nearby.",
      hint: "A signal can create a destination, but it can create a queue too.",
      trigger: { kind: "elapsed", value: 12 },
    },
    {
      id: "the-long-way-works",
      title: "The long way is still a way",
      observation: "The northern path reaches the baker without crossing the narrow southern channel.",
      hint: "A sign can make a reliable route more attractive than a short, crowded one.",
      trigger: { kind: "inspect", value: "north-path" },
    },
    {
      id: "bring-market-to-people",
      title: "The stall need not stay put",
      observation: "The empty pitch beside the south gate could serve visitors where they already gather.",
      hint: "Sometimes moving the answer is cheaper than moving everyone else.",
      trigger: { kind: "inspect", value: "old-stall" },
    },
  ],
  contract: { minServed: 12, maxLost: 10, minSatisfaction: 0.55, sustainSeconds: 8 },
  thresholds: { bronze: 520, silver: 700, gold: 840 },
  introLines: [
    "The evening bell waits for no market.",
    "Watch first. Timber is scarce, but good ideas are not.",
    "Choose a tool to place it. Choose a neighbor to lend their particular knack.",
  ],
  outcomeLines: {
    success: "The bell rings on a market still humming with life.",
    failure: "The stalls close quietly. Tomorrow offers another arrangement.",
    elegant: "A little timber did a remarkable amount of work today.",
    kind: "Nobody felt like an afterthought in the market you made.",
  },
};

export const LEVELS: LevelDefinition[] = [BARROW_MARKET];
