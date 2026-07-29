export type Point = { x: number; y: number };

export type ToolId = "signpost" | "handcart" | "bell" | "footbridge";
export type SpecialistId = "mara" | "pip" | "orin";
export type VisitorKind = "hurried" | "curious";

export interface ToolDefinition {
  id: ToolId;
  name: string;
  shortName: string;
  description: string;
  hint: string;
  cost: number;
  footprint: { width: number; height: number };
  color: string;
  accent: string;
  icon: "arrow" | "cart" | "bell" | "bridge";
  tags: Array<"route" | "store" | "signal" | "crossing">;
}

export interface SpecialistDefinition {
  id: SpecialistId;
  name: string;
  role: string;
  bio: string;
  strength: string;
  limitation: string;
  color: string;
  accent: string;
  speed: number;
  ability: {
    name: string;
    description: string;
    toolBonuses: Partial<Record<ToolId, string>>;
  };
}

export type TerrainTile =
  | "grass"
  | "path"
  | "water"
  | "bridge"
  | "plaza"
  | "stall"
  | "wall";

export interface WorldObject {
  id: string;
  kind: "spawn" | "goal" | "stall" | "tree" | "crate" | "lamp" | "waterwheel";
  position: Point;
  label?: string;
  color?: string;
}

export interface VisitorWave {
  at: number;
  count: number;
  kind: VisitorKind;
  spawnId: string;
}

export interface Discovery {
  id: string;
  title: string;
  observation: string;
  hint: string;
  trigger: {
    kind: "elapsed" | "inspect" | "visitor_event";
    value: number | string;
  };
}

export interface CompletionContract {
  minServed: number;
  maxLost: number;
  minSatisfaction: number;
  sustainSeconds: number;
}

export interface ScoreThresholds {
  bronze: number;
  silver: number;
  gold: number;
}

export interface LevelDefinition {
  id: string;
  title: string;
  kicker: string;
  story: string;
  objective: string;
  planningSeconds: number;
  operatingSeconds: number;
  startingBudget: number;
  map: {
    width: number;
    height: number;
    tileSize: number;
    rows: string[];
    legend: Record<string, TerrainTile>;
  };
  objects: WorldObject[];
  roster: SpecialistId[];
  inventory: Partial<Record<ToolId, number>>;
  waves: VisitorWave[];
  discoveries: Discovery[];
  contract: CompletionContract;
  thresholds: ScoreThresholds;
  introLines: string[];
  outcomeLines: Record<"success" | "failure" | "elegant" | "kind", string>;
}

/** Runtime snapshot expected by the content-only completion and scoring helpers. */
export interface OutcomeSnapshot {
  served: number;
  lost: number;
  satisfaction: number;
  stableSeconds: number;
  spent: number;
  toolCount: number;
  reassignmentCount: number;
  waste: number;
}

export interface ScoreBreakdown {
  total: number;
  medal: "none" | "bronze" | "silver" | "gold";
  outcome: number;
  care: number;
  economy: number;
  simplicity: number;
  label: "Unfinished" | "Bootstrapper" | "Caretaker" | "Clockmaker" | "Town Planner";
}
