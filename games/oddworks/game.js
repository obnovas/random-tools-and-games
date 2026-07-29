import { createGame } from "./src/engine/index.js";

const canvas = document.querySelector("#board");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const nodes = [
  { id:"gate", x:76, y:292, name:"West Gate", kind:"gate" },
  { id:"fork", x:230, y:292, name:"Old Fingerpost", kind:"junction", clue:"The old sign points everyone toward the shortest lane—even when it is packed." },
  { id:"fruit", x:420, y:185, name:"Fruit Stall", kind:"stall", clue:"Mara's lively stall draws followers. Quiet visitors turn away from a dense crowd." },
  { id:"alley", x:420, y:385, name:"Service Alley", kind:"junction", clue:"The service alley looks longer, but stays clear when the square is busy." },
  { id:"square", x:628, y:282, name:"Market Square", kind:"square", clue:"The noon bell changes where visitors look. A signal can help—or send everyone the same way." },
  { id:"bakery", x:842, y:170, name:"Orin's Bakery", kind:"stall", clue:"Orin serves patiently. Pip can make the last delivery leg much quicker." },
  { id:"garden", x:842, y:397, name:"Garden Stall", kind:"stall" },
];

const edge = (id, from, to, length, crowdCost=.12) => ({ id, from, to, length, crowdCost });
const edges = [
  edge("gate-fork","gate","fork",5), edge("fork-gate","fork","gate",5),
  edge("fork-fruit","fork","fruit",6,1.1), edge("fruit-fork","fruit","fork",6,1.1),
  edge("fork-alley","fork","alley",8,.02), edge("alley-fork","alley","fork",8,.02),
  edge("fruit-square","fruit","square",7,.8), edge("square-fruit","square","fruit",7,.8),
  edge("alley-square","alley","square",6,.02), edge("square-alley","square","alley",6,.02),
  edge("square-bakery","square","bakery",7,.15), edge("bakery-square","bakery","square",7,.15),
  edge("square-garden","square","garden",7,.15), edge("garden-square","garden","square",7,.15),
  edge("bakery-garden","bakery","garden",9,.05), edge("garden-bakery","garden","bakery",9,.05),
];

const visitorNames = ["Ada","Bram","Cora","Dove","Em","Finn","Gilly","Hob","Iris","Jory","Kit","Lark","Moss","Nell","Odo","Posy"];
const destinations = ["bakery","garden","bakery","garden","bakery","garden","garden","bakery","bakery","garden","bakery","garden","bakery","garden","bakery","garden"];
const agents = visitorNames.map((name,i)=>({
  id:`visitor-${i}`, name, role:"visitor", nodeId:"gate", destinationId:destinations[i],
  speed:.72+(i%4)*.055, value:1, tags:[i%3===0?"quiet":"follower"], satisfaction:1,
}));
agents.push(
  {id:"mara",name:"Mara",role:"keeper",nodeId:"fruit",destinationId:"square",speed:.55,tags:["specialist"],value:0,assignmentBoost:1.8},
  {id:"pip",name:"Pip",role:"porter",nodeId:"gate",destinationId:"bakery",speed:1.05,tags:["specialist"],value:0,assignmentBoost:2.2},
  {id:"orin",name:"Orin",role:"maker",nodeId:"bakery",destinationId:"garden",speed:.5,tags:["specialist"],value:0,assignmentBoost:1.7},
);

const level = { id:"barrow-market", seed:27, duration:75, budget:42, goal:{deliveries:10,satisfaction:5.5}, nodes, edges, agents };
const toolDefs = [
  {type:"sign",icon:"↗",name:"Painted sign",cost:8,copy:"Coax followers toward a junction.",strength:5,targetTag:"follower"},
  {type:"gate",icon:"▥",name:"Timber gate",cost:12,copy:"Close one route to redirect the flow.",mode:"closed"},
  {type:"cart",icon:"▣",name:"Handcart",cost:15,copy:"A flexible, economical buffer."},
  {type:"bell",icon:"♢",name:"Brass bell",cost:18,copy:"Call quiet visitors toward a place.",interval:14,targetTag:"quiet"},
];
const specialistDefs = [
  {id:"mara",name:"Mara",role:"Market caller",icon:"♪",copy:"Makes assignments visible and inviting."},
  {id:"pip",name:"Pip",role:"Quick porter",icon:"↟",copy:"Moves fastest on an assigned route."},
  {id:"orin",name:"Orin",role:"Patient joiner",icon:"⌁",copy:"Keeps a station working steadily."},
];
const clues = nodes.filter(n=>n.clue);
const foundClues = new Set();
let game, state, selectedTool=null, selectedSpecialist=null, resultShown=false, toastTimer, speed=1;

function resetGame(){
  game=createGame(level); state=game.getState(); selectedTool=null; selectedSpecialist=null; resultShown=false; speed=1;
  foundClues.clear(); document.querySelector("#results").close(); renderUI(); draw();
}

function toolSpent(){return state.tools.reduce((n,t)=>n+t.cost,0)}
function showToast(message){const wrap=document.querySelector(".board-wrap");document.querySelector("#toast").textContent=message;wrap.classList.add("show-toast");clearTimeout(toastTimer);toastTimer=setTimeout(()=>wrap.classList.remove("show-toast"),1800)}

function renderTools(){
  document.querySelector("#tools").innerHTML=toolDefs.map((t,i)=>`<button class="tool-card ${selectedTool===i?'selected':''}" data-tool="${i}" ${state.remainingBudget<t.cost?'disabled':''}><span class="card-title"><span><span class="tool-icon">${t.icon}</span> ${t.name}</span><span>${t.cost}</span></span><span class="card-copy">${t.copy}</span></button>`).join("");
  document.querySelectorAll("[data-tool]").forEach(btn=>btn.onclick=()=>{selectedTool=Number(btn.dataset.tool);selectedSpecialist=null;renderUI();showToast("Now choose a marked place")});
}
function renderSpecialists(){
  document.querySelector("#specialists").innerHTML=specialistDefs.map((s,i)=>{const a=state.assignments.find(x=>x.agentId===s.id);return `<button class="specialist-card ${selectedSpecialist===i?'selected':''}" data-specialist="${i}"><span class="card-title"><span>${s.icon} ${s.name}</span></span><span class="card-copy">${a?'Assigned to '+nodeById(a.nodeId).name:s.role+' · '+s.copy}</span></button>`}).join("");
  document.querySelectorAll("[data-specialist]").forEach(btn=>btn.onclick=()=>{selectedSpecialist=Number(btn.dataset.specialist);selectedTool=null;renderUI();showToast("Choose where they should help")});
}
function renderClues(){document.querySelector("#clues").innerHTML=clues.map((n,i)=>`<div class="clue ${foundClues.has(n.id)?'found':''}"><span class="clue-mark">${foundClues.has(n.id)?'✓ Noticed':'○ Unnoticed'}</span>${foundClues.has(n.id)?`<br>${n.clue}`:''}</div>`).join("")}
function renderUI(){
  state=game.getState(); document.querySelector("#phase").textContent=state.phase==="planning"?"Planning":state.phase==="results"?"Closed":state.running?"Market open":"Paused";
  document.querySelector("#time").textContent=`${Math.floor(state.remainingTime/60)}:${String(Math.ceil(state.remainingTime%60)).padStart(2,"0")}`;
  document.querySelector("#served").textContent=state.metrics.delivered;document.querySelector("#budget").textContent=state.remainingBudget;
  const active=state.agents.filter(a=>a.role==="visitor");const goodwill=active.reduce((n,a)=>n+a.satisfaction,0)/active.length;document.querySelector("#goodwill").style.width=`${goodwill*100}%`;
  document.querySelector("#start").disabled=state.phase!=="planning";document.querySelector("#pause").disabled=state.phase==="planning"||state.finished;document.querySelector("#pause").textContent=state.running?"Pause":"Resume";document.querySelector("#speed").disabled=state.phase==="planning"||state.finished;document.querySelector("#speed").textContent=`Speed ×${speed}`;
  document.querySelector("#toolHint").textContent=selectedTool!==null?`Place ${toolDefs[selectedTool].name} on the map.`:selectedSpecialist!==null?`Assign ${specialistDefs[selectedSpecialist].name} to a place.`:"Choose a tool or specialist, then a marked place.";
  renderTools();renderSpecialists();renderClues();
  if(state.finished&&!resultShown)showResults();
}
function nodeById(id){return nodes.find(n=>n.id===id)}
function edgeById(id){return edges.find(e=>e.id===id)}
function nodeAt(x,y){return nodes.find(n=>Math.hypot(n.x-x,n.y-y)<34)}

canvas.addEventListener("click",e=>{
  const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height,n=nodeAt(x,y);if(!n)return;
  if(selectedTool!==null){
    const d=toolDefs[selectedTool];const tool={...d,id:`${d.type}-${Date.now()}`,nodeId:n.id};
    if(d.type==="gate"){const candidate=edges.find(e=>e.from===n.id);if(!candidate){showToast("A gate needs a route");return}tool.edgeId=candidate.id}
    if(d.type==="bell")tool.destinationId=n.id;
    if(game.dispatch({type:"place-tool",tool})){showToast(`${d.name} placed at ${n.name}`);selectedTool=null}else showToast("Not enough timber for that");
  }else if(selectedSpecialist!==null){const s=specialistDefs[selectedSpecialist];game.dispatch({type:"assign",agentId:s.id,nodeId:n.id});showToast(`${s.name} will help at ${n.name}`);selectedSpecialist=null;
  }else if(n.clue){foundClues.add(n.id);showToast(n.clue)}else showToast(n.name);
  renderUI();draw();
});

document.querySelector("#start").onclick=()=>{game.dispatch({type:"start"});showToast("The market is open!");renderUI()};
document.querySelector("#pause").onclick=()=>{game.dispatch({type:state.running?"pause":"resume"});renderUI()};
document.querySelector("#speed").onclick=()=>{speed=speed===1?2:speed===2?4:1;game.dispatch({type:"set-speed",speed});renderUI()};
document.querySelector("#reset").onclick=resetGame;document.querySelector("#replay").onclick=resetGame;
const help=document.querySelector("#help");document.querySelector("#helpButton").onclick=()=>help.showModal();help.querySelector(".dialog-close").onclick=()=>help.close();

const palette={ink:"#25221f",paper:"#f5e7c4",paperLight:"#fff7df",grass:"#779657",grassDark:"#4f6d43",soil:"#8d6545",timber:"#9d643f",timberDark:"#613f31",stone:"#908a76",water:"#65a4a0",berry:"#a34f61",honey:"#dfa943",blue:"#587e93",plum:"#76566f",focus:"#f1c85b"};
function line(a,b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
function drawBackground(){
  ctx.fillStyle="#9ab36e";ctx.fillRect(0,0,960,560);for(let y=0;y<560;y+=16)for(let x=0;x<960;x+=16){if(((x*3+y*7)>>4)%11===0){ctx.fillStyle="#789255";ctx.fillRect(x+4,y+7,2,2)}}
  ctx.fillStyle="#65a4a0";ctx.fillRect(0,458,960,102);ctx.fillStyle="#8ec0b8";for(let x=0;x<960;x+=42)ctx.fillRect(x+(performance.now()/80)%42,480,22,2);
  ctx.strokeStyle="#d9c393";ctx.lineWidth=22;ctx.lineCap="round";for(const e of edges.filter((_,i)=>i%2===0))line(nodeById(e.from),nodeById(e.to));ctx.strokeStyle="#8d6545";ctx.lineWidth=2;for(const e of edges.filter((_,i)=>i%2===0))line(nodeById(e.from),nodeById(e.to));
}
function drawBuilding(n){
  const stall=n.kind==="stall";ctx.save();ctx.translate(n.x,n.y);if(stall){ctx.fillStyle=palette.timberDark;ctx.fillRect(-38,-55,76,48);ctx.fillStyle=n.id==="bakery"?palette.honey:n.id==="garden"?palette.grassDark:palette.berry;ctx.fillRect(-42,-60,84,14);for(let x=-40;x<40;x+=20){ctx.fillStyle=x%40===0?palette.paperLight:palette.berry;ctx.fillRect(x,-60,10,14)}ctx.fillStyle=palette.ink;ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillText(n.name.toUpperCase(),0,-67)}
  else{ctx.fillStyle=n.kind==="gate"?palette.timber:palette.stone;ctx.beginPath();ctx.arc(0,0,n.kind==="square"?20:12,0,Math.PI*2);ctx.fill();ctx.strokeStyle=palette.ink;ctx.lineWidth=2;ctx.stroke()}
  if(state.phase==="planning"&&Math.floor(performance.now()/450)%2===0){ctx.strokeStyle=palette.focus;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.stroke()}ctx.restore();
}
function agentPosition(a){if(a.edgeId){const e=edgeById(a.edgeId),from=nodeById(e.from),to=nodeById(e.to);return{x:from.x+(to.x-from.x)*a.progress,y:from.y+(to.y-from.y)*a.progress}}return nodeById(a.nodeId)||nodes[0]}
function drawPerson(a,i){const p=agentPosition(a),role=a.role,coat={visitor:palette.berry,porter:palette.blue,maker:palette.honey,keeper:palette.plum}[role],bob=a.status==="moving"?(Math.floor(performance.now()/160+i)%2):0;ctx.save();ctx.translate(Math.round(p.x)+(i%4)*3-5,Math.round(p.y)-12);ctx.fillStyle=palette.ink;ctx.fillRect(-4,11+bob,3,3);ctx.fillRect(2,12-bob,3,3);ctx.fillStyle=coat;ctx.fillRect(-5,4,10,9);ctx.fillStyle=palette.paper;ctx.fillRect(-4,-3,8,7);ctx.fillStyle=palette.ink;ctx.fillRect(-5,-4,9,2);ctx.fillRect(2,0,1,1);if(a.tags?.includes("quiet")){ctx.fillStyle=palette.blue;ctx.fillRect(-7,3,2,5)}ctx.restore()}
function drawTool(t){const n=nodeById(t.nodeId);ctx.save();ctx.translate(n.x+18,n.y-18);ctx.fillStyle=t.type==="bell"?palette.honey:t.type==="sign"?palette.paperLight:palette.timber;ctx.strokeStyle=palette.ink;ctx.lineWidth=2;if(t.type==="bell"){ctx.fillRect(-7,-7,14,10);ctx.strokeRect(-7,-7,14,10)}else if(t.type==="sign"){ctx.fillRect(-8,-8,16,10);ctx.strokeRect(-8,-8,16,10);ctx.fillStyle=palette.ink;ctx.fillText("→",-4,0)}else if(t.type==="cart"){ctx.fillRect(-10,-7,20,11);ctx.strokeRect(-10,-7,20,11);ctx.fillStyle=palette.ink;ctx.fillRect(-7,5,5,5);ctx.fillRect(3,5,5,5)}else{ctx.fillRect(-9,-11,18,22);ctx.strokeRect(-9,-11,18,22)}ctx.restore()}
function draw(){drawBackground();nodes.forEach(drawBuilding);state.tools.forEach(drawTool);[...state.agents].sort((a,b)=>agentPosition(a).y-agentPosition(b).y).forEach(drawPerson);ctx.fillStyle="#25221fcc";ctx.fillRect(14,14,250,34);ctx.fillStyle="#fff7df";ctx.font="bold 13px monospace";ctx.fillText(state.phase==="planning"?"TIME IS PAUSED · EXPLORE FREELY":`${Math.ceil(state.remainingTime)} SECONDS TO SUNDOWN`,26,36)}
function showResults(){resultShown=true;const won=state.success,spent=toolSpent(),lean=spent<=20,kind=state.metrics.satisfaction>=9,score=state.score;document.querySelector("#resultContent").innerHTML=`<span class="ow-label">Market closed · ${won?'A workable day':'A useful experiment'}</span><h2>${won?'The bell rings over a thriving square.':'The market needed one more revision.'}</h2><div class="result-score">${score}</div><p>${state.metrics.delivered} visitors reached their destination. You spent ${spent} timber and found ${foundClues.size} of ${clues.length} observable patterns.</p><div class="fingerprints">${lean?'<span class="badge">✦ Minimalist</span>':''}${kind?'<span class="badge">♥ Caretaker</span>':''}<span class="badge">⌁ Tinkerer</span></div><p>${won?'There was no single correct answer—only the system you chose to make. Can you solve it with a different set of tradeoffs?':'Pause earlier, inspect the junctions, or assign a specialist. Failed hypotheses cost nothing but a fresh idea.'}</p>`;document.querySelector("#results").showModal()}

let last=performance.now(),lastUI=0;function frame(now){const dt=(now-last)/1000;last=now;if(game){game.update(dt);state=game.getState();if(now-lastUI>100||state.finished&&!resultShown){renderUI();lastUI=now}draw()}requestAnimationFrame(frame)}
resetGame();requestAnimationFrame(frame);
