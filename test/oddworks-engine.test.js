import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../games/oddworks/src/engine/index.js";

const level = {
  duration: 3,
  budget: 20,
  goal: { deliveries: 1 },
  nodes: [{ id: "start" }, { id: "finish" }],
  edges: [{ id: "path", from: "start", to: "finish", length: 1 }],
  agents: [{ id: "visitor", nodeId: "start", destinationId: "finish", speed: 1 }],
};

test("a visitor completes a deterministic route", () => {
  const game = createGame(level, { seed: 4 });
  game.dispatch({ type: "start" });
  for (let i = 0; i < 120; i += 1) game.update(1 / 30);
  const state = game.getState();
  assert.equal(state.metrics.delivered, 1);
  assert.equal(state.success, true);
  assert.equal(state.phase, "results");
});

test("planning is timeless and budgets reject overspending", () => {
  const game = createGame(level);
  game.update(2);
  assert.equal(game.getState().time, 0);
  assert.equal(game.dispatch({ type: "place-tool", tool: { id: "too-much", type: "cart", cost: 21 } }), false);
  assert.equal(game.getState().tools.length, 0);
});

test("identical command streams produce identical results", () => {
  const run = () => {
    const game = createGame(level, { seed: 99 });
    game.dispatch({ type: "start" });
    for (let i = 0; i < 90; i += 1) game.update(1 / 30);
    return game.getState();
  };
  assert.deepEqual(run(), run());
});
