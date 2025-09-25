// ===== Utilities =====
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


// Keep menu always in front even after orientation changes
function ensureMenuInFront(){
const rig = qs('#rig'); const menu = qs('#menu');
if(!rig || !menu) return;
// Force menu to be ~1.2m in front of camera
menu.object3D.position.set(0,0,-1.2);
menu.object3D.rotation.set(0,0,0);
}


UI.setHUD(APP.mode, APP.score, APP.timeLeft, APP.difficulty);
bindMenu();
ensureMenuInFront();


// Re‑apply when entering/exiting VR or device orientation changes
window.addEventListener('orientationchange', ensureMenuInFront);
document.querySelector('a-scene').addEventListener('enter-vr', ensureMenuInFront);
document.querySelector('a-scene').addEventListener('exit-vr', ensureMenuInFront);
