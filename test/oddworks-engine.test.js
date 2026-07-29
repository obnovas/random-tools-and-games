import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../games/oddworks/src/engine/index.js";
import { marketMorning } from "../games/oddworks/src/content/marketMorning.js";

const level = {
  duration: 3,
  budget: 20,
  goal: { deliveries: 1 },
  nodes: [{ id: "start" }, { id: "finish", kind: "stall" }],
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

test("tools reject invalid targets and non-stalls cannot count as delivery", () => {
  const game = createGame({
    duration: 1, budget: 20, goal: { deliveries: 1 },
    nodes: [{ id: "start" }, { id: "junction", kind: "junction" }],
    edges: [{ id: "path", from: "start", to: "junction", length: 0.1 }],
    agents: [{ id: "visitor", nodeId: "start", destinationId: "junction", tags: ["visitor"] }],
  });
  assert.equal(game.dispatch({ type: "place-tool", tool: { id: "bad", type: "cart", edgeId: "missing" } }), false);
  assert.equal(game.dispatch({ type: "place-tool", tool: { id: "bad-bell", type: "bell", nodeId: "junction", destinationId: "junction" } }), false);
  game.dispatch({ type: "start" });
  for (let i = 0; i < 60; i += 1) game.update(1 / 30);
  assert.equal(game.getState().metrics.delivered, 0);
});

test("a handcart materially speeds travel on its assigned route", () => {
  const cartLevel = {
    duration: 5, budget: 20, goal: { deliveries: 1 },
    nodes: [{ id: "start" }, { id: "finish", kind: "stall" }],
    edges: [{ id: "slow", from: "start", to: "finish", length: 5 }],
    agents: [{ id: "visitor", nodeId: "start", destinationId: "finish", speed: 1, tags: ["visitor"] }],
  };
  const without = createGame(cartLevel);
  without.dispatch({ type: "start" });
  for (let i = 0; i < 90; i += 1) without.update(1 / 30);
  const withCart = createGame(cartLevel);
  withCart.dispatch({ type: "place-tool", tool: { id: "cart", type: "cart", edgeId: "slow", cost: 12 } });
  withCart.dispatch({ type: "start" });
  for (let i = 0; i < 90; i += 1) withCart.update(1 / 30);
  assert.equal(without.getState().metrics.delivered, 0);
  assert.equal(withCart.getState().metrics.delivered, 1);
});

function runMarket(commands = []) {
  const game = createGame(marketMorning);
  commands.forEach((command) => assert.equal(game.dispatch(command), true));
  game.dispatch({ type: "start" });
  for (let i = 0; i < marketMorning.duration * 30 + 2; i += 1) game.update(1 / 30);
  return game.getState();
}

test("Market Morning fails without an intervention", () => {
  const state = runMarket();
  assert.equal(state.success, false);
  assert.ok(state.metrics.delivered < marketMorning.goal.deliveries);
});

test("Market Morning supports three distinct winning tool strategies", () => {
  const plans = [
    [{ type: "place-tool", tool: { id: "sign", type: "sign", nodeId: "fork", edgeId: "fork-alley", targetTag: "follower", strength: 12, cost: 6 } }],
    [{ type: "place-tool", tool: { id: "cart", type: "cart", edgeId: "fork-fruit", cost: 12 } }],
    [{ type: "place-tool", tool: { id: "gate", type: "gate", edgeId: "fork-fruit", mode: "closed", cost: 10 } }],
  ];
  for (const plan of plans) assert.equal(runMarket(plan).success, true);
});
