/* Healthy Hero VR: สุขภาพดี 3 ด้าน
 * Modules: Hygiene (Handwash 7 steps), Nutrition (Sort foods), Exercise (Touch moving targets)
 * Modes: Timed / Practice
 * UI: VR-friendly HUD, adjustable camera height & UI scale
 */

const APP = {
  state: 'home', // 'home' | 'playing' | 'summary'
  currentModule: 'hygiene', // 'hygiene' | 'nutrition' | 'exercise'
  mode: 'practice', // 'timed' | 'practice'
  score: 0,
  mistakes: 0,
  startTime: 0,
  elapsed: 0,
  timerInterval: null,
  ui: {},
  settings: {
    cameraY: 1.6,
    hudZ: -1.8,
    hudY: 1.8,
  }
};

AFRAME.registerComponent('clickable', {
  init: function () {
    this.el.setAttribute('class', (this.el.getAttribute('class')||'') + ' clickable');
    this.el.addEventListener('click', () => {
      this.el.emit('clicked');
    });
  }
});

function qs(id){ return document.getElementById(id); }

/* ---------- Initialization ---------- */
window.addEventListener('load', () => {
  APP.ui = {
    hud: qs('hud'),
    summary: qs('summary'),
    sumTitle: qs('sumTitle'),
    sumStars: qs('sumStars'),
    sumStats: qs('sumStats'),
    sumTips: qs('sumTips'),
    floatingHUD: qs('floatingHUD'),
    txtTimer: qs('txtTimer'),
    txtScore: qs('txtScore'),
    boardHygiene: qs('boardHygiene'),
    boardNutrition: qs('boardNutrition'),
    boardExercise: qs('boardExercise'),
    rig: qs('rig'),
    camera: qs('camera'),
    hudTitle: qs('hudTitle'),
    hudSub: qs('hudSub'),
    hudMsg: qs('hudMsg'),
    btnHygiene: qs('btnHygiene'),
    btnNutrition: qs('btnNutrition'),
    btnExercise: qs('btnExercise'),
    btnTimed: qs('btnTimed'),
    btnPractice: qs('btnPractice'),
  };

  // Bind buttons
  bindButton(APP.ui.btnHygiene, ()=>selectModule('hygiene'));
  bindButton(APP.ui.btnNutrition, ()=>selectModule('nutrition'));
  bindButton(APP.ui.btnExercise, ()=>selectModule('exercise'));
  bindButton(APP.ui.btnTimed, ()=>startGame('timed'));
  bindButton(APP.ui.btnPractice, ()=>startGame('practice'));

  // Build boards
  buildHygieneBoard();
  buildNutritionBoard();
  buildExerciseBoard();

  updateHUD();
  goHome();
});

function bindButton(el, fn){
  el.addEventListener('mouseenter', ()=> el.setAttribute('material','opacity',0.9));
  el.addEventListener('mouseleave', ()=> el.setAttribute('material','opacity',1));
  el.addEventListener('clicked', fn);
}

/* ---------- Navigation ---------- */
function selectModule(mod){
  APP.currentModule = mod;
  APP.ui.hudMsg.setAttribute('text','value', 
    mod==='hygiene' ? 'ล้างมือ 7 ขั้น — แตะวง "เขียว" ตามลำดับ' :
    mod==='nutrition' ? 'คัดแยกอาหาร: สุขภาพดี / จำกัด' :
    'แตะเป้าหมายที่เคลื่อนที่ตามลำดับ');
  updateHUD();
}

function startGame(mode){
  APP.mode = mode;
  APP.state = 'playing';
  APP.score = 0;
  APP.mistakes = 0;
  APP.elapsed = 0;
  APP.startTime = Date.now();
  if (APP.timerInterval) clearInterval(APP.timerInterval);
  if (APP.mode==='timed'){
    APP.timerInterval = setInterval(()=>{
      APP.elapsed = Math.floor((Date.now()-APP.startTime)/1000);
      updateTimer();
    }, 250);
  } else {
    updateTimer();
  }
  showBoard(APP.currentModule);
  APP.ui.hud.setAttribute('visible', false); 
  APP.ui.summary.setAttribute('visible', false);
  APP.ui.floatingHUD.setAttribute('visible', true);
  updateScore();
  if (APP.currentModule==='hygiene') hygieneStart();
  if (APP.currentModule==='nutrition') nutritionStart();
  if (APP.currentModule==='exercise') exerciseStart();
}

function goHome(){
  APP.state = 'home';
  APP.ui.hud.setAttribute('visible', true);
  APP.ui.summary.setAttribute('visible', false);
  APP.ui.floatingHUD.setAttribute('visible', false);
  showBoard(null);
  updateHUD();
}

function endGame(){
  APP.state = 'summary';
  if (APP.timerInterval) {clearInterval(APP.timerInterval); APP.timerInterval=null;}
  APP.elapsed = Math.floor((Date.now()-APP.startTime)/1000);
  APP.ui.floatingHUD.setAttribute('visible', false);
  APP.ui.summary.setAttribute('visible', true);

  let stars = 1;
  if (APP.mistakes<=2 && APP.elapsed <= 60) stars = 3;
  else if (APP.mistakes<=4 && APP.elapsed <= 90) stars = 2;

  renderStars(stars);
  APP.ui.sumStats.setAttribute('text','value', `เวลา: ${APP.elapsed} วิ | ผิดพลาด: ${APP.mistakes} | คะแนน: ${APP.score}`);
  const tip = tipForModule(APP.currentModule, APP.mistakes);
  APP.ui.sumTips.setAttribute('text','value', `คำแนะนำ: ${tip}`);
}

function renderStars(n){
  const group = APP.ui.sumStars;
  while (group.firstChild) group.removeChild(group.firstChild);
  const spacing = 0.25;
  for (let i=0;i<3;i++){
    const star = document.createElement('a-entity');
    star.setAttribute('geometry','primitive: cone; radiusBottom:0.08; radiusTop:0; height:0.12');
    star.setAttribute('material', `color:${i<n?'#FFD54F':'#37474F'}`);
    star.setAttribute('position', `${(i-1)*spacing} 0 0`);
    group.appendChild(star);
  }
}

function tipForModule(mod, mistakes){
  if (mod==='hygiene') return mistakes ? 'ท่องลำดับ 7 ขั้น แล้วแตะวงสีเขียวเท่านั้น' : 'ยอดเยี่ยม! รักษานิสัยล้างมือให้ถูกวิธี';
  if (mod==='nutrition') return mistakes ? 'จำกลุ่มอาหารที่ควรเลือกบ่อย vs จำกัด' : 'ดีมาก! เลือกอาหารได้เหมาะสม';
  return mistakes ? 'จับจังหวะและมองเป้าล่วงหน้า' : 'สุดยอด! การตอบสนองดีมาก';
}

function updateHUD(){
  APP.ui.hudTitle.setAttribute('text','value','Healthy Hero VR: สุขภาพดี 3 ด้าน');
  const sub = APP.currentModule==='hygiene' ? 'อนามัยส่วนบุคคล — ล้างมือ 7 ขั้น' :
              APP.currentModule==='nutrition' ? 'โภชนาการ — คัดแยกอาหาร' :
              'การออกกำลังกาย — แตะเป้าหมาย';
  APP.ui.hudSub.setAttribute('text','value', sub);
}

function updateTimer(){
  const t = APP.elapsed;
  const mm = String(Math.floor(t/60)).padStart(2,'0');
  const ss = String(t%60).padStart(2,'0');
  APP.ui.txtTimer.setAttribute('text','value', `เวลา: ${mm}:${ss}`);
}

function addScore(v=1){ APP.score += v; updateScore(); }
function addMistake(v=1){ APP.mistakes += v; }
function updateScore(){
  APP.ui.txtScore.setAttribute('text','value', `คะแนน: ${APP.score}`);
}

function showBoard(name){
  APP.ui.boardHygiene.setAttribute('visible', name==='hygiene');
  APP.ui.boardNutrition.setAttribute('visible', name==='nutrition');
  APP.ui.boardExercise.setAttribute('visible', name==='exercise');
}

/* ---------- Hygiene Module ---------- */
const HYGIENE_STEPS = [
  'ล้างฝ่ามือ', 'ถูหลังมือ', 'ถูซอกนิ้ว', 'ถูหลังนิ้ว', 'ถูนิ้วหัวแม่มือ', 'ถูปลายนิ้ว', 'ถูรอบข้อมือ'
];
let hygieneState = { idx:0, nodes:[] };

function buildHygieneBoard(){
  const board = APP.ui.boardHygiene;
  const panel = document.createElement('a-entity');
  panel.setAttribute('geometry','primitive:plane; width:1.8; height:1.1');
  panel.setAttribute('material','color:#0d2020; opacity:0.85');
  board.appendChild(panel);

  const title = document.createElement('a-entity');
  title.setAttribute('text','value:ล้างมือ 7 ขั้น; align:center; width:2.2; color:#E0F7FA');
  title.setAttribute('position','0 0.45 0');
  board.appendChild(title);

  const startX = -0.75, dx=0.25, rowY1=0.18, rowY2=-0.12;
  const positions = [
    [startX+0*dx, rowY1],[startX+1*dx, rowY1],[startX+2*dx, rowY1],[startX+3*dx,rowY1],
    [startX+0*dx, rowY2],[startX+1*dx, rowY2],[startX+2*dx, rowY2]
  ];
  for (let i=0;i<7;i++){
    const p = positions[i];
    const ring = document.createElement('a-entity');
    ring.setAttribute('geometry','primitive:circle; radius:0.1');
    ring.setAttribute('material','color:#757575; opacity:0.95');
    ring.setAttribute('position', `${p[0]} ${p[1]} 0.01`);
    ring.setAttribute('class','clickable');
    const label = document.createElement('a-entity');
    label.setAttribute('text',`value:${HYGIENE_STEPS[i]}; align:center; width:1.2; color:#B2DFDB`);
    label.setAttribute('position', `${p[0]} ${p[1]-0.12} 0.02`);
    board.appendChild(ring);
    board.appendChild(label);
    ring.addEventListener('clicked', ()=> hygieneTap(i, ring));
    hygieneState.nodes.push(ring);

    // ภาพประกอบใต้ป้ายคำอธิบาย
    const img = document.createElement('a-image');
    img.setAttribute('src', '#hand'+(i+1));
    img.setAttribute('width', '0.28');
    img.setAttribute('height', '0.28');
    const ix = p[0];
    const iy = p[1] - 0.28;
    img.setAttribute('position', `${ix} ${iy} 0.02`);
    board.appendChild(img);
  }
}

function hygieneStart(){
  hygieneState.idx = 0;
  hygieneState.nodes.forEach((n,i)=>{
    n.setAttribute('material','color', i===0 ? '#2E7D32' : '#757575');
  });
}

function hygieneTap(i, ring){
  const expected = hygieneState.idx;
  if (i===expected){
    ring.setAttribute('material','color','#1976D2'); 
    hygieneState.idx++;
    addScore(5);
    if (hygieneState.idx<7){
      hygieneState.nodes[hygieneState.idx].setAttribute('material','color','#2E7D32');
    } else {
      endGame();
    }
  } else {
    addMistake(1);
    ring.setAttribute('material','color','#B71C1C');
    setTimeout(()=>{
      if (i!==hygieneState.idx && hygieneState.idx<7){
        ring.setAttribute('material','color','#757575');
      }
      if (hygieneState.idx<7){
        hygieneState.nodes[hygieneState.idx].setAttribute('material','color','#2E7D32');
      }
    }, 600);
  }
}

/* ---------- Nutrition Module ---------- */
const FOODS = [
  {name:'แอปเปิล', good:true},
  {name:'ผักโขม', good:true},
  {name:'ปลา', good:true},
  {name:'นมจืด', good:true},
  {name:'น้ำอัดลม', good:false},
  {name:'มันฝรั่งทอด', good:false},
  {name:'ขนมกรุบกรอบ', good:false},
  {name:'ไส้กรอก', good:false},
];
let nutritionState = { items:[], i:0, bins:{} };

function buildNutritionBoard(){
  const board = APP.ui.boardNutrition;
  const panel = document.createElement('a-entity');
  panel.setAttribute('geometry','primitive:plane; width:1.8; height:1.1');
  panel.setAttribute('material','color:#0d1730; opacity:0.85');
  board.appendChild(panel);

  const title = document.createElement('a-entity');
  title.setAttribute('text','value:คัดแยกอาหาร; align:center; width:2.2; color:#E3F2FD');
  title.setAttribute('position','0 0.45 0');
  board.appendChild(title);

  const binGood = document.createElement('a-entity');
  binGood.setAttribute('geometry','primitive:plane; width:0.7; height:0.5');
  binGood.setAttribute('material','color:#1B5E20; opacity:0.9');
  binGood.setAttribute('position','-0.5 -0.05 0.01');
  const labelGood = document.createElement('a-entity');
  labelGood.setAttribute('text','value:สุขภาพดี; align:center; width:1.2; color:#fff');
  labelGood.setAttribute('position','-0.5 0.22 0.02');

  const binLimit = document.createElement('a-entity');
  binLimit.setAttribute('geometry','primitive:plane; width:0.7; height:0.5');
  binLimit.setAttribute('material','color:#8B2F1D; opacity:0.9');
  binLimit.setAttribute('position','0.5 -0.05 0.01');
  const labelLimit = document.createElement('a-entity');
  labelLimit.setAttribute('text','value:จำกัด; align:center; width:1.2; color:#fff');
  labelLimit.setAttribute('position','0.5 0.22 0.02');

  board.appendChild(binGood); board.appendChild(labelGood);
  board.appendChild(binLimit); board.appendChild(labelLimit);

  const itemLabel = document.createElement('a-entity');
  itemLabel.setAttribute('id','nutritionItem');
  itemLabel.setAttribute('text','value:; align:center; width:1.8; color:#FFFDE7');
  itemLabel.setAttribute('position','0 0.32 0.02');
  board.appendChild(itemLabel);

  binGood.setAttribute('class','clickable');
  binLimit.setAttribute('class','clickable');
  binGood.addEventListener('clicked', ()=> nutritionChoose(true));
  binLimit.addEventListener('clicked', ()=> nutritionChoose(false));

  nutritionState.bins = {good:binGood, limit:binLimit};
}

function nutritionStart(){
  nutritionState.items = [...FOODS];
  for (let i=nutritionState.items.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [nutritionState.items[i], nutritionState.items[j]] = [nutritionState.items[j], nutritionState.items[i]];
  }
  nutritionState.i = 0;
  updateNutritionItem();
}

function updateNutritionItem(){
  const item = nutritionState.items[nutritionState.i];
  const label = qs('nutritionItem');
  if (!item){ endGame(); return; }
  label.setAttribute('text','value', `อาหาร: ${item.name} → เลือกช่อง`);
}

function nutritionChoose(chosenGood){
  const item = nutritionState.items[nutritionState.i];
  if (!item) return;
  const correct = (item.good === chosenGood);
  if (correct){ addScore(3); } else { addMistake(1); }
  nutritionState.i++;
  updateNutritionItem();
}

/* ---------- Exercise Module ---------- */
let exerciseState = { order:[], i:0, targets:[] };

function buildExerciseBoard(){
  const board = APP.ui.boardExercise;
  const panel = document.createElement('a-entity');
  panel.setAttribute('geometry','primitive:plane; width:1.8; height:1.1');
  panel.setAttribute('material','color:#1a1022; opacity:0.85');
  board.appendChild(panel);

  const title = document.createElement('a-entity');
  title.setAttribute('text','value:แตะเป้าหมายตามลำดับ; align:center; width:2.2; color:#F3E5F5');
  title.setAttribute('position','0 0.45 0');
  board.appendChild(title);

  const positions = [-0.6, -0.3, 0, 0.3, 0.6];
  for (let i=0;i<5;i++){
    const t = document.createElement('a-entity');
    t.setAttribute('geometry','primitive:circle; radius:0.09');
    t.setAttribute('material','color','#7B1FA2; opacity:0.95');
    t.setAttribute('position', `${positions[i]} 0 0.01`);
    t.setAttribute('class','clickable');
    t.addEventListener('clicked', ((idx, el)=>()=> exerciseTap(idx, el))(i,t));
    t.setAttribute('animation__move', `property: position; dir:alternate; dur:${1200+Math.random()*1200}; loop:true; to: ${positions[i]} -0.25 0.01`);
    board.appendChild(t);
    exerciseState.targets.push(t);
  }
}

function exerciseStart(){
  exerciseState.order = [0,1,2,3,4].sort(()=>Math.random()-0.5);
  exerciseState.i = 0;
  highlightExerciseTarget();
}

function highlightExerciseTarget(){
  exerciseState.targets.forEach((t)=> t.setAttribute('material','color','#7B1FA2'));
  const idx = exerciseState.order[exerciseState.i];
  const t = exerciseState.targets[idx];
  if (t) t.setAttribute('material','color','#2E7D32'); // green next
}

function exerciseTap(i, el){
  const expected = exerciseState.order[exerciseState.i];
  if (i===expected){
    el.setAttribute('material','color','#1976D2'); // blue correct
    addScore(2);
    exerciseState.i++;
    if (exerciseState.i < exerciseState.order.length){
      highlightExerciseTarget();
    } else {
      endGame();
    }
  } else {
    addMistake(1);
    el.setAttribute('material','color','#B71C1C');
    setTimeout(()=>{
      el.setAttribute('material','color','#7B1FA2');
      highlightExerciseTarget();
    }, 500);
  }
}
