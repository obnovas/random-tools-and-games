import { createGame } from "./src/engine/index.js";
import { edges, marketMorning as level, nodes } from "./src/content/marketMorning.js";

const $ = (selector) => document.querySelector(selector);
const canvas = $("#board");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const palette = {
  ink: "#25221f", paper: "#f5e7c4", paperLight: "#fff7df", paperShade: "#d9c393",
  grass: "#779657", grassDark: "#4f6d43", timber: "#9d643f", timberDark: "#613f31",
  stone: "#908a76", water: "#65a4a0", berry: "#a34f61", honey: "#dfa943",
  blue: "#587e93", plum: "#76566f", success: "#5f8c55", danger: "#a9473e", focus: "#f1c85b",
};

const toolDefs = [
  { id: "sign", icon: "↗", name: "Bakery sign", cost: 6, description: "Points shoppers into the clear Quiet Alley.", target: "sign", targetLabel: "Place at Old Fingerpost" },
  { id: "cart", icon: "▣", name: "Market handcart", cost: 12, description: "Carries shoppers quickly through one busy lane.", target: "route", targetLabel: "Place on a highlighted route" },
  { id: "gate", icon: "▥", name: "Timber gate", cost: 10, description: "Closes the crowded lane so shoppers choose another way.", target: "route", targetLabel: "Place on a highlighted route" },
];
const specialistDefs = [
  { id: "pip", icon: "↟", name: "Pip", role: "Quick porter", description: "Speeds everyone approaching one place by 65%." },
  { id: "mara", icon: "♪", name: "Mara", role: "Market caller", description: "Keeps people moving toward one busy place." },
  { id: "orin", icon: "⌁", name: "Orin", role: "Patient baker", description: "Helps arrivals move steadily into the bakery." },
];

const placements = {
  sign: [{ id: "sign-fork", kind: "node", nodeId: "fork", edgeId: "fork-alley", x: 280, y: 300, label: "Point shoppers into the Quiet Alley" }],
  cart: [
    { id: "cart-fruit", kind: "edge", edgeId: "fork-fruit", x: 382, y: 240, label: "Speed up the crowded fruit lane" },
    { id: "cart-alley", kind: "edge", edgeId: "fork-alley", x: 382, y: 359, label: "Speed up the Quiet Alley" },
  ],
  gate: [{ id: "gate-fruit", kind: "edge", edgeId: "fork-fruit", x: 382, y: 240, label: "Close the crowded fruit lane" }],
  pip: [{ id: "pip-bakery", kind: "node", nodeId: "bakery", x: 850, y: 282, label: "Help shoppers enter the bakery faster" }],
  mara: [{ id: "mara-fork", kind: "node", nodeId: "fork", x: 280, y: 300, label: "Help people decide at the fork" }],
  orin: [{ id: "orin-bakery", kind: "node", nodeId: "bakery", x: 850, y: 282, label: "Keep the bakery entrance moving" }],
};

let game;
let state;
let selected = null;
let hoverTarget = null;
let observed = false;
let guideSkipped = false;
let resultShown = false;
let speed = 1;
let toastTimer;
let lastUI = 0;
let lastEventCount = 0;

function nodeById(id) { return nodes.find((node) => node.id === id); }
function edgeById(id) { return edges.find((edge) => edge.id === id); }
function currentTargets() { return selected ? placements[selected.id] ?? [] : []; }
function spent() { return state.tools.reduce((total, tool) => total + tool.cost, 0); }

function showToast(message) {
  $("#toast").textContent = message;
  $(".board-wrap").classList.add("show-toast");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $(".board-wrap").classList.remove("show-toast"), 1900);
}

function addEvent(title, copy, tone = "") {
  const item = document.createElement("div");
  item.className = `event ${tone}`;
  item.innerHTML = `<strong>${title}</strong><span>${copy}</span>`;
  $("#eventLog").prepend(item);
  while ($("#eventLog").children.length > 5) $("#eventLog").lastElementChild.remove();
}

function selectItem(kind, definition) {
  selected = selected?.kind === kind && selected.id === definition.id ? null : { kind, ...definition };
  hoverTarget = null;
  renderUI(true);
  if (selected) showToast(`${definition.name} selected — choose a glowing target`);
}

function cancelSelection() {
  selected = null;
  hoverTarget = null;
  renderUI(true);
}

function placeSelected(target) {
  if (!selected) return;
  if (selected.kind === "tool") {
    const tool = {
      id: `${selected.id}-${Date.now()}`, type: selected.id, cost: selected.cost, active: true,
      nodeId: target.nodeId, edgeId: target.edgeId,
      ...(selected.id === "sign" ? { strength: 12, targetTag: "follower" } : {}),
      ...(selected.id === "gate" ? { mode: "closed" } : {}),
    };
    if (!game.dispatch({ type: "place-tool", tool })) {
      showToast("That tool cannot be placed there, or you need more timber.");
      return;
    }
    addEvent(`${selected.name} placed`, target.label, "good");
  } else {
    if (!game.dispatch({ type: "assign", agentId: selected.id, nodeId: target.nodeId })) {
      showToast("That neighbor cannot work there.");
      return;
    }
    addEvent(`${selected.name} assigned`, target.label, "good");
  }
  selected = null;
  hoverTarget = null;
  renderUI(true);
  showToast("Placed. You can undo, or open the market.");
}

function undoLast() {
  if (state.tools.length) {
    game.dispatch({ type: "remove-tool", toolId: state.tools.at(-1).id });
    addEvent("Tool returned", "Its timber has been refunded.");
  } else if (state.assignments.length) {
    game.dispatch({ type: "unassign", agentId: state.assignments.at(-1).agentId });
    addEvent("Assignment cleared", "That neighbor is available again.");
  }
  renderUI(true);
}

function renderToolCards() {
  $("#tools").innerHTML = toolDefs.map((tool) => {
    const isSelected = selected?.kind === "tool" && selected.id === tool.id;
    const disabled = state.remainingBudget < tool.cost || state.finished;
    return `<button class="tool-card ${isSelected ? "selected" : ""}" data-tool="${tool.id}" ${disabled ? "disabled" : ""} aria-pressed="${isSelected}">
      <span class="card-title"><span><span class="tool-icon">${tool.icon}</span> ${tool.name}</span><span>${tool.cost} timber</span></span>
      <span class="card-copy">${tool.description}</span><span class="card-action">${isSelected ? "PLACING · ESC TO CANCEL" : disabled ? "NOT ENOUGH TIMBER" : "SELECT TOOL"}</span></button>`;
  }).join("");
  $("#specialists").innerHTML = specialistDefs.map((person) => {
    const assignment = state.assignments.find((item) => item.agentId === person.id);
    const isSelected = selected?.kind === "specialist" && selected.id === person.id;
    return `<button class="specialist-card ${isSelected ? "selected" : ""}" data-specialist="${person.id}" aria-pressed="${isSelected}">
      <span class="card-title"><span>${person.icon} ${person.name}</span><span>${person.role}</span></span>
      <span class="card-copy">${assignment ? `Assigned: ${nodeById(assignment.nodeId).name}` : person.description}</span><span class="card-action">${isSelected ? "ASSIGNING · ESC TO CANCEL" : "SELECT NEIGHBOR"}</span></button>`;
  }).join("");
}

function renderGuide() {
  const hasPlan = state.tools.length + state.assignments.length > 0;
  const step = !observed && !guideSkipped ? "observe" : !hasPlan ? "build" : "run";
  const copy = {
    observe: ["First, look at the problem", "Click the blue Notice marker beside the crowded lane. Time is paused while you investigate."],
    build: ["Now choose one response", "Select a tool below. Only compatible places will glow, and the map previews exactly what it changes."],
    run: ["Your plan is ready to test", "Open the market. Watch the route, pause if needed, and revise without starting over."],
  }[step];
  $("#guideTitle").textContent = copy[0];
  $("#guideCopy").textContent = copy[1];
  ["observe", "build", "run"].forEach((name, index) => {
    const element = $(`#step-${name}`);
    element.className = index < ["observe", "build", "run"].indexOf(step) ? "done" : name === step ? "active" : "";
  });
  const action = $("#actionBar");
  if (selected) {
    const targetButtons = currentTargets().map((target, index) => `<button class="target-choice" data-target="${index}">${target.label}</button>`).join("");
    action.innerHTML = `<strong>PLACE</strong><span>${selected.targetLabel ?? `Assign ${selected.name} to a glowing place.`}</span>${targetButtons}<button id="cancelSelection">Cancel · Esc</button>`;
    action.querySelectorAll("[data-target]").forEach((button) => { button.onclick = () => placeSelected(currentTargets()[Number(button.dataset.target)]); });
    $("#cancelSelection").onclick = cancelSelection;
  } else if (step === "observe") action.innerHTML = "<strong>STEP 1</strong><span>Click the blue Notice marker beside the fruit queue.</span>";
  else if (step === "build") action.innerHTML = "<strong>STEP 2</strong><span>Select a tool or neighbor below. The map will show where it works.</span>";
  else if (state.phase === "planning") action.innerHTML = "<strong>STEP 3</strong><span>Your intervention is visible on the map. Open the market when ready.</span>";
  else if (state.running) action.innerHTML = "<strong>LIVE</strong><span>Watch the shoppers’ route. Pause whenever you want to revise it.</span>";
  else action.innerHTML = "<strong>PAUSED</strong><span>The clock is stopped. Change your plan or resume the market.</span>";
}

function renderUI(force = false) {
  state = game.getState();
  $("#served").textContent = Math.min(6, state.metrics.delivered);
  $("#servedMeter").style.width = `${Math.min(100, state.metrics.delivered / 6 * 100)}%`;
  $("#phase").textContent = state.phase === "planning" ? "Plan freely" : state.finished ? "Complete" : state.running ? "Market open" : "Paused";
  $("#time").textContent = `0:${String(Math.ceil(state.remainingTime)).padStart(2, "0")}`;
  $("#budget").textContent = state.remainingBudget;
  const activeVisitors = state.agents.filter((agent) => agent.tags?.includes("visitor"));
  const goodwill = activeVisitors.reduce((sum, agent) => sum + agent.satisfaction, 0) / activeVisitors.length;
  $("#goodwillText").textContent = `${Math.round(goodwill * 100)}%`;
  const hasPlan = state.tools.length + state.assignments.length > 0;
  $("#start").disabled = state.phase !== "planning" || (!hasPlan && !guideSkipped);
  $("#pause").disabled = state.phase === "planning" || state.finished;
  $("#pause").textContent = state.running ? "Pause" : "Resume";
  $("#speed").disabled = state.phase === "planning" || state.finished;
  $("#speed").textContent = `Speed ×${speed}`;
  $("#undo").disabled = state.finished || (!state.tools.length && !state.assignments.length);
  if (force) renderToolCards();
  renderGuide();
  if (state.events.length > lastEventCount) {
    for (const event of state.events.slice(lastEventCount)) {
      if (event.type === "agent-delivered" && event.agentId.startsWith("visitor")) addEvent("Bread shopper served", `${state.metrics.delivered} of 6 have reached Orin’s Bakery.`, "good");
      if (event.type === "level-lost") addEvent("Sunset arrived", "Some shoppers were still on the way.", "warn");
    }
    lastEventCount = state.events.length;
  }
  if (state.finished && !resultShown) showResults();
}

function screenPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height,
    cssX: event.clientX - rect.left, cssY: event.clientY - rect.top };
}
function targetAt(point) { return currentTargets().find((target) => Math.hypot(target.x - point.x, target.y - point.y) < 42); }
function noticeAt(point) { return !observed && Math.hypot(505 - point.x, 125 - point.y) < 42; }

canvas.addEventListener("pointermove", (event) => {
  const point = screenPoint(event);
  hoverTarget = targetAt(point);
  const notice = noticeAt(point);
  canvas.style.cursor = hoverTarget || notice ? "pointer" : selected ? "not-allowed" : "default";
  const tip = $("#hoverTip");
  if (hoverTarget || notice) {
    tip.hidden = false; tip.style.left = `${point.cssX}px`; tip.style.top = `${point.cssY}px`;
    tip.textContent = hoverTarget?.label ?? "Notice: inspect the fruit queue";
  } else tip.hidden = true;
});
canvas.addEventListener("pointerleave", () => { hoverTarget = null; $("#hoverTip").hidden = true; });
canvas.addEventListener("click", (event) => {
  const point = screenPoint(event);
  if (selected) {
    const target = targetAt(point);
    if (target) placeSelected(target);
    else showToast("That is not a valid place. Choose a glowing target.");
  } else if (noticeAt(point)) {
    observed = true;
    addEvent("Crowd spotted", "The fruit queue blocks the short lane. The Quiet Alley remains clear.", "warn");
    showToast("Observation: shoppers need a clearer route to the bakery.");
    renderUI(true);
  }
});

$("#tools").addEventListener("click", (event) => {
  const button = event.target.closest("[data-tool]");
  if (button) selectItem("tool", toolDefs.find((tool) => tool.id === button.dataset.tool));
});
$("#specialists").addEventListener("click", (event) => {
  const button = event.target.closest("[data-specialist]");
  if (button) selectItem("specialist", specialistDefs.find((person) => person.id === button.dataset.specialist));
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape") cancelSelection(); });
$("#start").onclick = () => { game.dispatch({ type: "start" }); addEvent("The market is open", "The clock has started. Watch which lane shoppers choose."); renderUI(true); };
$("#tryBare").onclick = () => { guideSkipped = true; $("#start").disabled = false; showToast("You can test the market with no intervention."); renderUI(true); };
$("#skipGuide").onclick = () => { guideSkipped = true; observed = true; renderUI(true); };
$("#pause").onclick = () => { game.dispatch({ type: state.running ? "pause" : "resume" }); renderUI(true); };
$("#speed").onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; game.dispatch({ type: "set-speed", speed }); renderUI(); };
$("#undo").onclick = undoLast;
$("#reset").onclick = resetGame;
$("#replay").onclick = resetGame;
$("#keepTinkering").onclick = () => { $("#results").close(); resetGame(); };
const help = $("#help");
$("#helpButton").onclick = () => help.showModal();
help.querySelector(".dialog-close").onclick = () => help.close();
$("#begin").onclick = () => $("#welcome").close();

function drawPath(edge) {
  const from = nodeById(edge.from); const to = nodeById(edge.to);
  const isCrowded = edge.id.includes("fruit");
  const gated = state.tools.some((tool) => tool.type === "gate" && tool.edgeId === edge.id);
  const carted = state.tools.some((tool) => tool.type === "cart" && tool.edgeId === edge.id);
  ctx.lineCap = "round"; ctx.strokeStyle = gated ? palette.danger : isCrowded ? "#c7a15e" : palette.paperShade; ctx.lineWidth = 24;
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  ctx.strokeStyle = gated ? palette.paperLight : isCrowded ? palette.danger : palette.grassDark; ctx.lineWidth = gated ? 5 : 2;
  if (gated) ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke(); ctx.setLineDash([]);
  const angle = Math.atan2(to.y - from.y, to.x - from.x); const x = from.x + (to.x - from.x) * 0.62; const y = from.y + (to.y - from.y) * 0.62;
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = gated ? palette.danger : palette.ink; ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.fill(); ctx.restore();
  if (carted) drawMechanism("cart", (from.x + to.x) / 2, (from.y + to.y) / 2);
}

function drawMapLabel(text, x, y, tone = "dark") {
  ctx.font = "bold 12px monospace"; const width = ctx.measureText(text).width + 14;
  ctx.fillStyle = tone === "light" ? palette.paperLight : `${palette.ink}e8`; ctx.fillRect(x - width / 2, y - 10, width, 20);
  ctx.fillStyle = tone === "light" ? palette.ink : palette.paperLight; ctx.textAlign = "center"; ctx.fillText(text, x, y + 4);
}

function drawNode(node) {
  ctx.save(); ctx.translate(node.x, node.y);
  if (node.kind === "entry") {
    ctx.fillStyle = palette.timberDark; ctx.fillRect(-29, -34, 8, 68); ctx.fillRect(21, -34, 8, 68); ctx.fillStyle = palette.timber; ctx.fillRect(-21, -29, 42, 8);
  } else if (node.kind === "junction") {
    ctx.fillStyle = palette.stone; ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = palette.ink; ctx.lineWidth = 2; ctx.stroke();
  } else if (node.kind === "blocker") {
    ctx.fillStyle = palette.berry; ctx.fillRect(-44, -44, 88, 22); ctx.fillStyle = palette.timber; for (let x = -42; x < 38; x += 20) ctx.fillRect(x, -18, 12, 18);
    ctx.strokeStyle = palette.danger; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-25, 18); ctx.lineTo(25, -18); ctx.moveTo(-25, -18); ctx.lineTo(25, 18); ctx.stroke();
  } else if (node.kind === "stall") {
    ctx.fillStyle = palette.timberDark; ctx.fillRect(-55, -68, 110, 62); ctx.fillStyle = palette.honey; ctx.fillRect(-60, -73, 120, 18);
    for (let x = -58; x < 58; x += 24) { ctx.fillStyle = x % 48 ? palette.paperLight : palette.berry; ctx.fillRect(x, -73, 12, 18); }
    ctx.fillStyle = palette.paperLight; ctx.fillRect(-22, -48, 44, 30); ctx.fillStyle = palette.honey; ctx.beginPath(); ctx.arc(0, -34, 10, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  const labels = { gate: "WEST GATE · 8 SHOPPERS", fork: "OLD FINGERPOST", fruit: "FRUIT LANE · JAMMED", alley: "QUIET ALLEY · CLEAR", bakery: `ORIN'S BAKERY · ${Math.min(6, state.metrics.delivered)}/6` };
  drawMapLabel(labels[node.id], node.x, node.y + (node.kind === "stall" ? 28 : 52), node.id === "alley" ? "light" : "dark");
}

function agentPosition(agent) {
  if (agent.edgeId) { const edge = edgeById(agent.edgeId); const from = nodeById(edge.from); const to = nodeById(edge.to); return { x: from.x + (to.x - from.x) * agent.progress, y: from.y + (to.y - from.y) * agent.progress }; }
  return nodeById(agent.nodeId) ?? nodes[0];
}
function drawPerson(agent, index) {
  if (agent.status === "scheduled" || agent.status === "delivered") return;
  const point = agentPosition(agent); const coat = { visitor: palette.blue, porter: palette.berry, keeper: palette.plum, maker: palette.honey }[agent.role];
  const bob = agent.status === "moving" ? Math.floor(performance.now() / 150 + index) % 2 : 0;
  ctx.save(); ctx.translate(Math.round(point.x) + (index % 3) * 4 - 4, Math.round(point.y) - 16);
  ctx.fillStyle = palette.ink; ctx.fillRect(-5, 12 + bob, 4, 3); ctx.fillRect(2, 13 - bob, 4, 3); ctx.fillStyle = coat; ctx.fillRect(-6, 4, 12, 10); ctx.fillStyle = palette.paper; ctx.fillRect(-5, -4, 10, 8); ctx.fillStyle = palette.ink; ctx.fillRect(-6, -5, 11, 2); ctx.fillRect(2, -1, 1, 1);
  if (agent.tags?.includes("visitor")) { ctx.fillStyle = palette.paperLight; ctx.fillRect(-10, -23, 20, 13); ctx.strokeStyle = palette.ink; ctx.strokeRect(-10, -23, 20, 13); ctx.fillStyle = palette.honey; ctx.fillRect(-4, -20, 8, 6); }
  ctx.restore();
}

function drawMechanism(kind, x, y) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = palette.ink; ctx.lineWidth = 2;
  if (kind === "sign") { ctx.fillStyle = palette.paperLight; ctx.fillRect(-12, -19, 24, 14); ctx.strokeRect(-12, -19, 24, 14); ctx.fillStyle = palette.ink; ctx.font = "bold 14px monospace"; ctx.fillText("↘", -8, -7); ctx.fillStyle = palette.timber; ctx.fillRect(-2, -5, 4, 27); }
  if (kind === "cart") { ctx.fillStyle = palette.timber; ctx.fillRect(-15, -10, 30, 15); ctx.strokeRect(-15, -10, 30, 15); ctx.fillStyle = palette.ink; ctx.fillRect(-10, 7, 7, 7); ctx.fillRect(5, 7, 7, 7); }
  if (kind === "gate") { ctx.fillStyle = palette.timberDark; ctx.fillRect(-14, -18, 5, 36); ctx.fillRect(9, -18, 5, 36); ctx.fillStyle = palette.timber; ctx.fillRect(-9, -12, 18, 5); ctx.fillRect(-9, 0, 18, 5); ctx.fillRect(-9, 12, 18, 5); }
  ctx.restore();
}

function drawTargets() {
  if (!selected) return;
  for (const target of currentTargets()) {
    const pulse = 28 + Math.sin(performance.now() / 180) * 3;
    ctx.fillStyle = `${palette.focus}55`; ctx.strokeStyle = hoverTarget?.id === target.id ? palette.paperLight : palette.focus; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = palette.ink; ctx.font = "bold 18px monospace"; ctx.textAlign = "center"; ctx.fillText("+", target.x, target.y + 6);
    if (hoverTarget?.id === target.id) drawMapLabel(target.label.toUpperCase(), target.x, target.y - 46, "light");
  }
}

function drawNotice() {
  if (observed || guideSkipped) return;
  const y = 125 + Math.sin(performance.now() / 190) * 5;
  ctx.fillStyle = "#65a4c0"; ctx.strokeStyle = palette.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(505, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = palette.paperLight; ctx.font = "bold 20px monospace"; ctx.textAlign = "center"; ctx.fillText("?", 505, y + 7); drawMapLabel("NOTICE", 505, y - 33, "light");
}

function draw() {
  ctx.fillStyle = "#96b26d"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 560; y += 16) for (let x = 0; x < 960; x += 16) if (((x * 3 + y * 7) >> 4) % 13 === 0) { ctx.fillStyle = "#728d52"; ctx.fillRect(x + 4, y + 7, 2, 2); }
  ctx.fillStyle = palette.water; ctx.fillRect(0, 495, 960, 65); ctx.fillStyle = "#8ec0b8"; for (let x = -20; x < 960; x += 45) ctx.fillRect(x + performance.now() / 90 % 45, 518, 24, 2);
  edges.forEach(drawPath); nodes.forEach(drawNode);
  for (const tool of state.tools) { if (tool.type === "sign") drawMechanism("sign", nodeById(tool.nodeId).x + 26, nodeById(tool.nodeId).y - 15); if (tool.type === "gate") { const edge = edgeById(tool.edgeId); drawMechanism("gate", (nodeById(edge.from).x + nodeById(edge.to).x) / 2, (nodeById(edge.from).y + nodeById(edge.to).y) / 2); } }
  state.agents.slice().sort((a, b) => agentPosition(a).y - agentPosition(b).y).forEach(drawPerson);
  drawNotice(); drawTargets();
  ctx.fillStyle = `${palette.ink}e8`; ctx.fillRect(14, 14, 285, 34); ctx.fillStyle = palette.paperLight; ctx.font = "bold 13px monospace"; ctx.textAlign = "left";
  ctx.fillText(state.phase === "planning" ? "TIME PAUSED · INVESTIGATE & BUILD" : `${Math.ceil(state.remainingTime)} SECONDS UNTIL SUNSET`, 26, 36);
}

function showResults() {
  resultShown = true;
  const won = state.success; const timber = spent();
  $("#resultContent").innerHTML = `<span class="ow-label">Market Morning · ${won ? "Job complete" : "Plan interrupted"}</span>
    <h2>${won ? "The bakery is busy!" : "Sunset reached the market."}</h2><div class="result-score">${Math.min(6, state.metrics.delivered)}/6</div>
    <p>${won ? `Your plan helped six neighbors reach Orin’s Bakery with ${Math.ceil(state.remainingTime)} seconds left.` : `${state.metrics.delivered} neighbors arrived. The others were still delayed by the fruit lane.`}</p>
    <div class="fingerprints"><span class="badge">${timber <= 6 ? "✦ Clear & lean" : "⌁ Resourceful builder"}</span><span class="badge">${timber} timber used</span></div>
    <p>${won ? "That was one workable answer. Try a sign, a gate, a cart, or a neighbor to discover a different tradeoff." : "Pause during the run, redirect the crowded lane, or assign a neighbor where the route slows."}</p>`;
  $("#results").showModal();
}

function resetGame() {
  game = createGame(level); state = game.getState(); selected = null; hoverTarget = null; observed = false; guideSkipped = false; resultShown = false; speed = 1; lastEventCount = 0;
  $("#eventLog").innerHTML = '<div class="event"><strong>Planning is free.</strong><span>Explore and build before the clock starts.</span></div>';
  if ($("#results").open) $("#results").close();
  renderUI(true); draw();
}

let last = performance.now();
function frame(now) {
  const elapsed = (now - last) / 1000; last = now;
  game.update(elapsed); state = game.getState();
  if (now - lastUI > 100 || (state.finished && !resultShown)) { renderUI(); lastUI = now; }
  draw(); requestAnimationFrame(frame);
}

resetGame();
renderToolCards();
if (!sessionStorage.getItem("oddworks-welcomed")) { $("#welcome").showModal(); sessionStorage.setItem("oddworks-welcomed", "yes"); }
requestAnimationFrame(frame);
