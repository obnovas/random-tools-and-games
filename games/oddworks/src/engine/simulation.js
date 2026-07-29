import { chooseNextEdge } from "./pathfinding.js";
import { createRandom } from "./random.js";

const clone = (value) => globalThis.structuredClone
  ? globalThis.structuredClone(value)
  : JSON.parse(JSON.stringify(value));

const DEFAULT_SCORING = {
  deliveryPoints: 100,
  missedPenalty: 25,
  wastePenalty: 10,
  secondPenalty: 1,
  toolCosts: { sign: 8, gate: 12, bell: 15, cart: 20 },
};

function normalizeLevel(level) {
  const state = clone(level);
  state.id ??= "oddworks-level";
  state.duration ??= 90;
  state.budget ??= 100;
  state.goal ??= { deliveries: 1 };
  state.nodes ??= [];
  state.edges ??= [];
  state.agents ??= [];
  state.tools ??= [];
  state.assignments ??= [];
  state.events ??= [];
  state.metrics = { delivered: 0, missed: 0, waste: 0, satisfaction: 0 };
  state.time = 0;
  state.phase = "planning";
  state.running = false;
  state.finished = false;
  state.success = false;
  state.speed = 1;
  for (const edge of state.edges) edge.length ??= 1;
  for (const agent of state.agents) {
    agent.status ??= (agent.spawnAt ?? 0) > 0 ? "scheduled" : "idle";
    agent.status ??= "idle";
    agent.speed ??= 1;
    agent.progress ??= 0;
    agent.satisfaction ??= 1;
    agent.tags ??= [];
  }
  return state;
}

function emit(state, type, details = {}) {
  state.events.push({ id: `${state.tick}-${state.events.length}`, time: state.time, type, ...details });
  if (state.events.length > 250) state.events.shift();
}

function assignedBoost(state, agent, nodeId) {
  if (!agent.tags?.includes("visitor")) return 1;
  return state.assignments.reduce((boost, assignment) => {
    if (assignment.nodeId !== nodeId) return boost;
    const specialist = state.agents.find((item) => item.id === assignment.agentId);
    return Math.max(boost, specialist?.assignmentBoost ?? 1.25);
  }, 1);
  return state.assignments.some((item) => item.agentId === agent.id && item.nodeId === nodeId)
    ? (agent.assignmentBoost ?? 1.25)
    : 1;
}

function arrive(state, agent, nodeId) {
  agent.nodeId = nodeId;
  agent.edgeId = null;
  agent.progress = 0;
  const destination = state.nodes.find((node) => node.id === nodeId);
  if (nodeId === agent.destinationId && destination?.kind === "stall") {
    agent.status = "delivered";
    const value = agent.value ?? 1;
    state.metrics.delivered += value;
    if (value > 0) state.metrics.satisfaction += agent.satisfaction;
  if (nodeId === agent.destinationId) {
    agent.status = "delivered";
    state.metrics.delivered += agent.value ?? 1;
    state.metrics.satisfaction += agent.satisfaction;
    emit(state, "agent-delivered", { agentId: agent.id, nodeId });
    return;
  }
  agent.status = "idle";
}

function moveAgents(state, dt) {
  for (const agent of state.agents) {
    if (agent.status === "delivered" || agent.status === "missed") continue;
    if (agent.status === "scheduled") {
      if (state.time < (agent.spawnAt ?? 0)) continue;
      agent.status = "idle";
    }
    if (!agent.edgeId) {
      const edge = chooseNextEdge(state, agent, agent.nodeId, agent.destinationId);
      if (!edge) {
        agent.status = "waiting";
        agent.waitTime = (agent.waitTime ?? 0) + dt;
        agent.satisfaction = Math.max(0, agent.satisfaction - dt * 0.015);
        continue;
      }
      agent.edgeId = edge.id;
      agent.status = "moving";
      agent.waitTime = 0;
    }
    const edge = state.edges.find((item) => item.id === agent.edgeId);
    if (!edge) continue;
    const crowd = state.agents.filter((item) => item.edgeId === edge.id).length;
    const congestion = Math.max(0.28, 1 / (1 + Math.max(0, crowd - 1) * (edge.moveCrowdCost ?? 0.18)));
    const cart = state.tools.some((item) => item.active && item.type === "cart" && item.edgeId === edge.id) ? 1.75 : 1;
    const speed = agent.speed * assignedBoost(state, agent, edge.to) * congestion * cart;
    const speed = agent.speed * assignedBoost(state, agent, edge.to);
    agent.progress += (speed * dt) / edge.length;
    if (agent.progress >= 1) arrive(state, agent, edge.to);
  }
}

function operateTools(state, dt) {
  for (const tool of state.tools) {
    if (!tool.active || tool.type !== "bell") continue;
    tool.cooldownRemaining = Math.max(0, (tool.cooldownRemaining ?? 0) - dt);
    if (tool.cooldownRemaining > 0) continue;
    tool.cooldownRemaining = tool.interval ?? 10;
    for (const agent of state.agents) {
      if (agent.status === "delivered" || !tool.destinationId) continue;
      if (tool.targetTag && !agent.tags.includes(tool.targetTag)) continue;
      agent.destinationId = tool.destinationId;
    }
    emit(state, "bell-rang", { toolId: tool.id });
  }
}

function finish(state) {
  for (const agent of state.agents) {
    if (agent.status !== "delivered") {
      agent.status = "missed";
      state.metrics.missed += agent.value ?? 1;
    }
  }
  state.finished = true;
  state.running = false;
  state.phase = "results";
  state.success = state.metrics.delivered >= (state.goal.deliveries ?? 0)
    && state.metrics.satisfaction >= (state.goal.satisfaction ?? 0);
  emit(state, state.success ? "level-won" : "level-lost", { score: calculateScore(state) });
}

export function calculateScore(state, scoring = DEFAULT_SCORING) {
  const toolCost = state.tools.reduce((total, tool) => total + (tool.cost ?? scoring.toolCosts[tool.type] ?? 0), 0);
  return Math.max(0, Math.round(
    state.metrics.delivered * scoring.deliveryPoints
    + state.metrics.satisfaction * 10
    - state.metrics.missed * scoring.missedPenalty
    - state.metrics.waste * scoring.wastePenalty
    - state.time * scoring.secondPenalty
    - toolCost,
  ));
}

/**
 * Create a renderer-agnostic deterministic game session.
 * Commands are plain objects, making runs easy to record and replay.
 */
export function createGame(level, options = {}) {
  const initial = normalizeLevel(level);
  let state = clone(initial);
  state.seed = options.seed ?? level.seed ?? 1;
  state.tick = 0;
  const random = createRandom(state.seed);
  const fixedStep = options.fixedStep ?? 1 / 30;
  let accumulator = 0;
  const listeners = new Set();

  function notify() {
    const snapshot = getState();
    listeners.forEach((listener) => listener(snapshot));
  }

  function dispatch(command) {
    if (!command?.type) return false;
    if (command.type === "start") {
      if (state.finished || state.phase !== "planning") return false;
      if (state.finished) return false;
      state.phase = "live";
      state.running = true;
    } else if (command.type === "pause") {
      state.running = false;
    } else if (command.type === "resume") {
      if (!state.finished) state.running = true;
    } else if (command.type === "set-speed") {
      state.speed = Math.max(0.25, Math.min(4, Number(command.speed) || 1));
    } else if (command.type === "place-tool") {
      if (state.finished || state.tools.some((tool) => tool.id === command.tool.id)) return false;
      const tool = clone(command.tool);
      tool.active ??= true;
      const validNode = tool.nodeId && state.nodes.some((node) => node.id === tool.nodeId);
      const validEdge = tool.edgeId && state.edges.some((edge) => edge.id === tool.edgeId);
      if ((["sign", "bell"].includes(tool.type) && !validNode)
        || (["gate", "cart"].includes(tool.type) && !validEdge)
        || (tool.type === "bell" && !state.nodes.some((node) => node.id === tool.destinationId && node.kind === "stall"))) return false;
      const cost = tool.cost ?? DEFAULT_SCORING.toolCosts[tool.type] ?? 0;
      const spent = state.tools.reduce((sum, item) => sum + (item.cost ?? DEFAULT_SCORING.toolCosts[item.type] ?? 0), 0);
      if (spent + cost > state.budget) return false;
      state.tools.push(tool);
      emit(state, "tool-placed", { toolId: tool.id });
    } else if (command.type === "remove-tool") {
      const index = state.tools.findIndex((tool) => tool.id === command.toolId);
      if (index < 0) return false;
      state.tools.splice(index, 1);
    } else if (command.type === "toggle-tool") {
      const tool = state.tools.find((item) => item.id === command.toolId);
      if (!tool) return false;
      tool.active = command.active ?? !tool.active;
      if (tool.type === "gate" && command.mode) tool.mode = command.mode;
    } else if (command.type === "assign") {
      if (!state.nodes.some((node) => node.id === command.nodeId)
        || !state.agents.some((agent) => agent.id === command.agentId && agent.tags?.includes("specialist"))) return false;
      state.assignments = state.assignments.filter((item) => item.agentId !== command.agentId);
      state.assignments.push({ agentId: command.agentId, nodeId: command.nodeId });
    } else if (command.type === "unassign") {
      state.assignments = state.assignments.filter((item) => item.agentId !== command.agentId);
    } else if (command.type === "reset") {
      state = clone(initial);
      state.seed = options.seed ?? level.seed ?? 1;
      state.tick = 0;
      random.state = state.seed;
      accumulator = 0;
    } else return false;
    notify();
    return true;
  }

  function fixedUpdate(dt) {
    if (!state.running || state.finished) return;
    state.tick += 1;
    state.time += dt;
    // Advance the PRNG every tick so future disturbances remain replayable.
    state.randomValue = random.next();
    operateTools(state, dt);
    moveAgents(state, dt);
    const goalMet = state.metrics.delivered >= (state.goal.deliveries ?? 0)
      && state.metrics.satisfaction >= (state.goal.satisfaction ?? 0);
    if (goalMet) state.goalMetFor = (state.goalMetFor ?? 0) + dt;
    else state.goalMetFor = 0;
    if (goalMet && state.goalMetFor >= (state.goal.stableSeconds ?? 2)) finish(state);
    if (!state.finished && state.time + Number.EPSILON * 16 >= state.duration) {
    if (state.time + Number.EPSILON * 16 >= state.duration) {
      state.time = state.duration;
      finish(state);
    }
  }

  function update(elapsedSeconds) {
    if (!state.running || state.finished) return getState();
    accumulator += Math.min(0.25, Math.max(0, elapsedSeconds)) * state.speed;
    while (accumulator >= fixedStep) {
      fixedUpdate(fixedStep);
      accumulator -= fixedStep;
    }
    notify();
    return getState();
  }

  function getState() {
    const snapshot = clone(state);
    snapshot.score = calculateScore(snapshot, options.scoring);
    snapshot.remainingTime = Math.max(0, snapshot.duration - snapshot.time);
    snapshot.remainingBudget = snapshot.budget - snapshot.tools.reduce(
      (sum, tool) => sum + (tool.cost ?? DEFAULT_SCORING.toolCosts[tool.type] ?? 0), 0,
    );
    return snapshot;
  }

  return {
    dispatch,
    update,
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
  };
}

export { DEFAULT_SCORING };
