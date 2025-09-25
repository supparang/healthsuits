// ===== Utilities =====
const angle = (i / steps.length) * Math.PI*2; const r=0.8;
const x=Math.cos(angle)*r, y=1.0 + (i%2?0.15:-0.15), z=-1.4+Math.sin(angle)*0.05;
const node = document.createElement('a-entity');
node.setAttribute('geometry','primitive: circle; radius: 0.12');
node.setAttribute('material','color: #3ad16b; opacity: 0.9');
node.setAttribute('position',`${x} ${y} ${z}`);
node.setAttribute('class','clickable');
node.setAttribute('text',`value: ${i+1}. ${name}; align: center; width: 1.2; color: #063`);
node.addEventListener('uiclick', ()=> onTarget(i, node));
targets.appendChild(node);
});
APP._next = 0;
function onTarget(idx, node){
if(idx !== APP._next) { node.setAttribute('material','color','#f0b429'); return; }
APP.addScore(2); // base 2 → scaled by difficulty
node.setAttribute('material','color','#0ea5e9');
node.setAttribute('text',`value: ✓ ${idx+1}; align: center; width: 1.2; color: #045`);
APP._next++;
if(APP._next>=7){ APP.endMode(); }
}
}


function startNutrition(){
APP.current='nutrition'; APP.score = 0; APP.setMode('โภชนาการ'); APP.showOnly('#scene-nutrition'); qs('#btn-exit').style.display='block';
const secs = DIFFS[APP.difficulty].timers.nutrition; APP.startTimer(secs);
const data = [
{label:'ผักใบเขียว', good:true, img:'#img-veg'},
{label:'ผลไม้สด', good:true, img:'#img-fruit'},
{label:'ปลา/โปรตีนไม่ติดมัน', good:true, img:'#img-fish'},
{label:'น้ำหวานขวด', good:false, img:'#img-soda'},
{label:'มันฝรั่งทอด', good:false, img:'#img-fries'},
{label:'ขนมกรุบกรอบ', good:false, img:'#img-chips'},
];
const grid = qs('#foods'); grid.innerHTML='';
data.forEach((item,i)=>{
const col = (i%3)-1; const row = Math.floor(i/3);
const x = col*0.95; const y = 0.2 - row*0.5;
const card = document.createElement('a-entity');
card.setAttribute('geometry','primitive: plane; width: 0.85; height: 0.36');
card.setAttribute('material',`color: ${item.good?'#d1fae5':'#fee2e2'}`);
card.setAttribute('position',`${x} ${y} 0`);
card.setAttribute('class','clickable');


const pic = document.createElement('a-image');
pic.setAttribute('src', item.img);
pic.setAttribute('position', `0 0.02 0.01`);
pic.setAttribute('width','0.7'); pic.setAttribute('height','0.22');


const label = document.createElement('a-entity');
label.setAttribute('text',`value: ${item.label}; align: center; width: 1.4; color: #111`);
label.setAttribute('position','0 -0.15 0.02');


card.appendChild(pic); card.appendChild(label);
card.addEventListener('uiclick', ()=>{
if(card.getAttribute('data-done')) return;
card.setAttribute('data-done','1');
if(item.good){ APP.addScore(3); card.setAttribute('material','color','#86efac'); }
else { APP.addScore(-1); card.setAttribute('material','color','#fca5a5'); }
});
grid.appendChild(card);
});
}


function startFitness(){
APP.current='fitness'; APP.score = 0; APP.setMode('การออกกำลังกาย'); APP.showOnly('#scene-fitness'); qs('#btn-exit').style.display='block';
const secs = DIFFS[APP.difficulty].timers.fitness; APP.startTimer(secs);
let left = (APP.difficulty==='hard'? 14 : APP.difficulty==='easy'? 10 : 12);
const goal = qs('#fitness-goal');
const btn = qs('#btn-jump');
function update(){ goal.setAttribute('text',`value: แตะปุ่ม Jump ให้ครบ ${left} ครั้ง!; align: center; width: 1.8; color: #111`); }
update();
const act = ()=>{ if(left<=0) return; left--; APP.addScore(1); update(); if(left===0){ APP.endMode(); } };
btn.addEventListener('uiclick', act);


// Head-bob jump helper
let lastY = null; const rig = qs('#rig');
rig.addEventListener('componentchanged', e=>{
if(e.detail.name!=="position") return; const y = rig.object3D.position.y;
if(lastY!==null && y - lastY > 0.045) { act(); }
lastY = y;
});
}


// Init
UI.setHUD(APP.mode, APP.score, APP.timeLeft, APP.difficulty);
bindMenu();
