import type { LevelDefinition, OutcomeSnapshot, ScoreBreakdown } from "./types";

export function isLevelComplete(level: LevelDefinition, state: OutcomeSnapshot): boolean {
  const contract = level.contract;
  return (
    state.served >= contract.minServed &&
    state.lost <= contract.maxLost &&
    state.satisfaction >= contract.minSatisfaction &&
    state.stableSeconds >= contract.sustainSeconds
  );
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function scoreOutcome(level: LevelDefinition, state: OutcomeSnapshot): ScoreBreakdown {
  if (!isLevelComplete(level, state)) {
    return { total: 0, medal: "none", outcome: 0, care: 0, economy: 0, simplicity: 0, label: "Unfinished" };
  }

  const totalVisitors = Math.max(1, state.served + state.lost);
  const outcome = Math.round(clamp(state.served / totalVisitors) * 400);
  const care = Math.round(clamp(state.satisfaction) * 250);
  const economy = Math.round(clamp(1 - state.spent / Math.max(1, level.startingBudget) * 0.75) * 220);
  const simplicity = Math.round(clamp(1 - (state.toolCount + state.reassignmentCount * 0.5 + state.waste) / 14) * 130);
  const total = outcome + care + economy + simplicity;
  const medal = total >= level.thresholds.gold ? "gold" : total >= level.thresholds.silver ? "silver" : "bronze";

  const scores = { Bootstrapper: economy, Caretaker: care, Clockmaker: outcome, "Town Planner": simplicity } as const;
  const label = (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Town Planner") as ScoreBreakdown["label"];
  return { total, medal, outcome, care, economy, simplicity, label };
}
