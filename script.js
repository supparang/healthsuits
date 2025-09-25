/* ===== Global text sizes (meters) – ปรับตรงนี้ทีเดียวทั้งเกม ===== */
const TEXT_SIZE = {
  hud:    0.034,
  title:  0.036,
  hint:   0.025,
  label:  0.025,
  button: 0.034
};

/* ===== Helpers: troika-text compatible creator ===== */
function $(sel){ return document.querySelector(sel); }

function setAttrCompat(element, name, value){
  // แปลง A-Frame text → troika-text (รองรับภาษาไทย) + อัด fontSize ถ้ายังไม่กำหนด
  if (name === 'text') {
    let s = String(value)
      .replace(/(^|;)\s*align\s*:/g, '$1 anchor:')
      .replace(/(^|;)\s*width\s*:/g, '$1 maxWidth:');
    if (!/fontSize\s*:/.test(s)) s += `; fontSize: ${TEXT_SIZE.label}`;
    name = 'troika-text';
    value = s;
  }
  element.setAttribute(name, value);
}

function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (typeof v === 'object' && k !== 'animation' && !k.startsWith('animation__')) {
      const s = Object.entries(v).map(([kk,vv])=>`${kk}:${vv}`).join('; ');
      setAttrCompat(e, k, s);
    } else {
      setAttrCompat(e, k, v);
    }
  });
  children.forEach(c=>e.appendChild(c));
  return e;
}

/* ===== Desktop cursor/raycaster ===== */
AFRAME.registerComponent('ensure-cursor', {
  init(){
    const cam = $('#camera');
    if (cam){
      cam.setAttribute('cursor', 'rayOrigin: mouse');
      cam.setAttribute('raycaster', 'objects: .clickable; far: 20');
    }
  }
});

/* ===== Core Gameflow ===== */
AFRAME.registerSystem('gameflow', {
  init(){
    this.state = 'menu';         // menu | hygiene | nutrition | exercise
    this.timeLeft = 0;
    this.score = 0;
    this.activeGame = null;
    this.updateHUD();
  },
  setState(s){
    this.state = s;
    $('#hudState')?.setAttribute('troika-text',
      `value:โหมด: ${s}; color:#FFFFFF; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hud}`);
    ['menu','hygiene','nutrition','exercise'].forEach(id=>{
      $('#grp_'+id)?.setAttribute('visible', id===s);
    });
  },
  startGame(kind, secs){
    this.score = 0;
    this.timeLeft = secs;
    this.updateHUD();
    this.setState(kind);
    if (this.activeGame?.stop) this.activeGame.stop();
    if (kind==='hygiene') this.activeGame = HygieneGame.start(this);
    if (kind==='nutrition') this.activeGame = NutritionGame.start(this);
    if (kind==='exercise') this.activeGame = ExerciseGame.start(this);
  },
  endGame(message='จบเกม'){
    alert(`${message}\nคะแนนของคุณ: ${this.score}`);
    if (this.activeGame?.stop) this.activeGame.stop();
    this.activeGame = null;
    this.setState('menu');
  },
  addScore(n=1){ this.score += n; this.updateHUD(); },
  updateHUD(){
    $('#hudScore')?.setAttribute('troika-text',
      `value:คะแนน: ${this.score}; color:#FFFFFF; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hud}`);
    $('#hudTime')?.setAttribute('troika-text',
      `value:เวลา: ${Math.max(0, Math.ceil(this.timeLeft))}s; color:#FFFFFF; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hud}`);
  }
});

/* ===== Global countdown ===== */
AFRAME.registerComponent('tick-timer', {
  tick(t, dt){
    const sys = this.el.sceneEl.systems.gameflow;
    if (['hygiene','nutrition','exercise'].includes(sys.state) && sys.timeLeft>0){
      sys.timeLeft -= dt/1000;
      sys.updateHUD();
      if (sys.timeLeft<=0) sys.endGame('หมดเวลา!');
    }
  }
});

/* ===== Hand gestures (optional wave-back) ===== */
AFRAME.registerComponent('hand-gestures', {
  init(){ this.cool=0; },
  tick(t,dt){
    this.cool = Math.max(0, this.cool - dt);
    const right = $('#handRight');
    const sys = this.el.sceneEl.systems.gameflow;
    if (!right || sys.state==='menu') return;
    const wrist = right.components['hand-tracking-controls']?.wristPosition;
    if (wrist && this.prevX!==undefined){
      const speedX = Math.abs(wrist.x - this.prevX) / (dt/1000);
      if (speedX>0.6 && this.cool===0){ this.cool = 1500; sys.endGame('หยุด/กลับเมนู'); }
    }
    if (wrist) this.prevX = wrist.x;
  }
});

/* ===== Menu buttons ===== */
window.goMode = function(mode){
  const sys = $('a-scene').systems.gameflow;
  if (mode==='hygiene')  sys.startGame('hygiene', 90);
  if (mode==='nutrition')sys.startGame('nutrition', 90);
  if (mode==='exercise') sys.startGame('exercise', 90);
};

/* =========================
   MiniGame #1: Hygiene (ล้างมือ 7 ขั้น + ความยาก)
   ========================= */
const HygieneGame = (function(){
  const BASE_STEPS = [
    {key:'palm',    label:'ฝ่ามือถูฝ่ามือ'},
    {key:'back',    label:'ถูหลังมือ'},
    {key:'between', label:'ถูซอกนิ้ว'},
    {key:'thumb',   label:'ถูโคนนิ้วโป้ง'},
    {key:'tips',    label:'ถูปลายนิ้ว/เล็บ'},
    {key:'wrist',   label:'ถูรอบข้อมือ'},
    {key:'rinse',   label:'ล้าง/เช็ดให้แห้ง'}
  ];
  const DIFF = {
    easy:   { radius:0.16, holdMs:  0, shuffle:false, timeBonus: 5, scoreAdd: 5, distractors:0 },
    normal: { radius:0.13, holdMs:150, shuffle:false, timeBonus: 3, scoreAdd: 6, distractors:1 },
    hard:   { radius:0.10, holdMs:350, shuffle:true,  timeBonus: 2, scoreAdd: 7, distractors:3, penalty:-3 }
  };

  let group=null, idx=0, steps=[], targets=[], holdTimer=null, diffKey='normal';
  let hintText=null, titleText=null, chooser=null;

  function buildDifficultyChooser(){
    chooser = el('a-entity', {position:'0 1.35 -1.15'});
    chooser.appendChild(el('a-entity', {
      text:`value:เลือกความยาก; color:#FFFFFF; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`
    }));
    const defs = [
      {x:-0.6, key:'easy',   label:'ง่าย',  color:'#06D6A0'},
      {x: 0.0, key:'normal', label:'ปกติ', color:'#FFD166'},
      {x: 0.6, key:'hard',   label:'ยาก',  color:'#EF476F'}
    ];
    defs.forEach(d=>{
      const btn = el('a-box', {class:'clickable', position:`${d.x} -0.25 0`, width:0.6, height:0.22, depth:0.08, color:d.color}, [
        el('a-entity', {position:'0 0 0.06',
          text:`value:${d.label}; anchor:center; maxWidth:1.4; fontSize: ${TEXT_SIZE.button}`})
      ]);
      btn.addEventListener('click', ()=>{
        diffKey = d.key;
        chooser?.parentNode?.removeChild(chooser);
        startRound();
      });
      chooser.appendChild(btn);
    });
    group.appendChild(chooser);
  }

  function makeTarget(pos, text, key, radius, holdMs){
    const wrap = el('a-entity', {position:pos});
    const plate = el('a-circle', {radius:radius, color:'#88E0FF', class:'clickable'});
    const label = el('a-entity', {position:'0 -0.24 0',
      text:`value:${text}; anchor:center; maxWidth:2; color:#FFFFFF; fontSize: ${TEXT_SIZE.label}`});
    wrap.appendChild(plate); wrap.appendChild(label);

    const startHold = ()=>{
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = setTimeout(()=>{ checkHit(); }, Math.max(0, holdMs));
    };
    const cancelHold = ()=>{ if (holdTimer) { clearTimeout(holdTimer); holdTimer=null; } };

    plate.addEventListener('mousedown', startHold);
    plate.addEventListener('mouseup', cancelHold);
    plate.addEventListener('mouseleave', cancelHold);
    plate.addEventListener('click', ()=>{ if (holdMs===0) checkHit(); });

    function checkHit(){
      const sys = $('a-scene').systems.gameflow;
      if (steps[idx].key===key){
        sys.addScore(DIFF[diffKey].scoreAdd);
        sys.timeLeft += DIFF[diffKey].timeBonus;
        plate.setAttribute('animation__pop', {property:'scale', to:'1.3 1.3 1.3', dur:120, dir:'alternate', loop:1});
        idx++;
        updateHighlight();
        if (idx>=steps.length) sys.endGame('สะอาดหมดจด!');
      } else {
        if (DIFF[diffKey].penalty) sys.addScore(DIFF[diffKey].penalty);
        plate.setAttribute('animation__shake', {property:'position', to:'0 0 0.02', dur:80, dir:'alternate', loop:2});
        hint('ยังไม่ใช่ขั้นนี้ เล็งวงสีเขียวเป็นขั้นถัดไป');
      }
    }

    wrap.__plate = plate;
    return wrap;
  }

  function makeDistractor(pos){
    const d = el('a-sphere', {class:'clickable', position:pos, radius:0.08, color:'#FF595E'});
    d.addEventListener('click', ()=>{
      const sys = $('a-scene').systems.gameflow;
      sys.addScore(DIFF[diffKey].penalty || -2);
      d.setAttribute('animation__shake', {property:'position', to:'0 0 0.03', dur:80, dir:'alternate', loop:2});
      hint('ระวังสิ่งรบกวน!');
    });
    return d;
  }

  function shuffle(arr){
    const a = arr.slice();
    for (let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  function hint(msg){
    hintText?.setAttribute('troika-text',
      `value:${msg}; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hint}`);
  }

  function updateHighlight(){
    targets.forEach((t,i)=>{
      t.__plate.setAttribute('color', i===idx ? '#00FFC6' : '#88E0FF');
    });
    const next = steps[idx]?.label || 'เสร็จแล้ว!';
    titleText?.setAttribute('troika-text',
      `value:ล้างมือให้ครบลำดับ — ขั้นต่อไป: ${next}; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`);
  }

  let targets=[];
  function startRound(){
    group.innerHTML = '';

    steps = BASE_STEPS.slice();
    if (DIFF[diffKey].shuffle) steps = shuffle(steps);
    idx = 0;

    titleText = el('a-entity', {position:'0 1.1 -1.2',
      text:`value:ล้างมือให้ครบลำดับ — เล็งวงสีเขียว; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`});
    hintText  = el('a-entity', {position:'0 0.95 -1.2',
      text:`value:แตะ/กดค้างที่เป้า (ยากจะต้องค้างนานขึ้น); anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hint}`});
    group.appendChild(titleText);
    group.appendChild(hintText);

    const positions = [
      ' -0.6 1.45 -1.2',' -0.2 1.45 -1.2',' 0.2 1.45 -1.2',
      ' 0.6 1.45 -1.2',' -0.4 1.15 -1.2',' 0.0 1.15 -1.2',' 0.4 1.15 -1.2'
    ];
    const cfg = DIFF[diffKey];
    targets = steps.map((s,i)=> makeTarget(positions[i], s.label, s.key, cfg.radius, cfg.holdMs));
    targets.forEach(t=>group.appendChild(t));

    for (let i=0;i<(cfg.distractors||0);i++){
      const x = -0.8 + Math.random()*1.6;
      const y =  1.0 + Math.random()*0.6;
      group.appendChild(makeDistractor(`${x.toFixed(2)} ${y.toFixed(2)} -1.2`));
    }
    updateHighlight();
  }

  let titleText=null, hintText=null;
  return {
    start(){
      group = $('#grp_hygiene');
      group.innerHTML = '';
      buildDifficultyChooser();
      return { stop(){ group && (group.innerHTML=''); } };
    }
  };
})();

/* =========================
   MiniGame #2: Nutrition (แยกหมวดอาหาร)
   ========================= */
const NutritionGame = (function(){
  const CATS = [
    {id:'carb', label:'คาร์โบไฮเดรต'},
    {id:'protein', label:'โปรตีน'},
    {id:'vegfruit', label:'ผัก/ผลไม้'},
    {id:'dairy', label:'นม/นมถั่วเหลือง'},
    {id:'fat', label:'ไขมันดี'}
  ];
  const ITEMS = [
    {name:'ข้าวสวย', cat:'carb'},{name:'ขนมปังโฮลวีต', cat:'carb'},
    {name:'ไก่อบ', cat:'protein'},{name:'เต้าหู้', cat:'protein'},{name:'ปลาอบ', cat:'protein'},
    {name:'กล้วย', cat:'vegfruit'},{name:'แอปเปิล', cat:'vegfruit'},{name:'ผักกาดหอม', cat:'vegfruit'},
    {name:'นมถั่วเหลือง', cat:'dairy'},{name:'โยเกิร์ตรสธรรมชาติ', cat:'dairy'},
    {name:'อะโวคาโด', cat:'fat'},{name:'ถั่วอัลมอนด์', cat:'fat'}
  ];
  let group=null, qText=null, current=null, asked=0, maxQ=10;

  function makeChoice(x, label, cat){
    const btn = el('a-box', {class:'clickable', position:`${x} 0.6 -1.1`,
      width:0.7, height:0.22, depth:0.08, color:'#3A86FF'});
    btn.appendChild(el('a-entity',{position:'0 0 0.06',
      text:`value:${label}; anchor:center; maxWidth:1.6; fontSize: ${TEXT_SIZE.button}`}));
    btn.addEventListener('click', ()=>{
      const sys = $('a-scene').systems.gameflow;
      if (!current) return;
      if (current.cat===cat){ sys.addScore(10); hint(`ถูกต้อง! ${current.name} → ${label}`); }
      else { hint(`ยังไม่ใช่ ลองใหม่: ${current.name}`); }
      nextQuestion();
    });
    return btn;
  }
  function hint(msg){
    $('#grp_nutrition_hint')?.setAttribute('troika-text',
      `value:${msg}; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hint}`);
  }
  function nextQuestion(){
    const sys = $('a-scene').systems.gameflow;
    asked++;
    if (asked>maxQ){ sys.endGame('ควิซโภชนาการครบแล้ว!'); return; }
    current = ITEMS[Math.floor(Math.random()*ITEMS.length)];
    qText.setAttribute('troika-text',
      `value:จัดหมวด: ${current.name}; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`);
  }

  return {
    start(){
      group = $('#grp_nutrition');
      group.innerHTML = '';
      qText = el('a-entity',{position:'0 1.15 -1.2',
        text:`value:จัดหมวด: ...; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`});
      const hintText = el('a-entity',{id:'grp_nutrition_hint', position:'0 0.95 -1.2',
        text:`value:แตะเลือกหมวดให้ถูกต้อง; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.hint}`});
      group.appendChild(qText); group.appendChild(hintText);
      const xs = [-0.9, -0.45, 0, 0.45, 0.9];
      CATS.map((c,i)=> makeChoice(xs[i], c.label, c.id)).forEach(b=>group.appendChild(b));
      asked=0; nextQuestion();
      return { stop(){ group && (group.innerHTML=''); } };
    }
  };
})();

/* =========================
   MiniGame #3: Exercise (แตะ “เป้า” ตามลำดับ)
   ========================= */
const ExerciseGame = (function(){
  const TARGET_POS = [
    '-0.5 1.4 -1.0','0.5 1.4 -1.0','0 1.8 -1.0','-0.3 1.2 -1.0','0.3 1.2 -1.0'
  ];
  const POSES = [
    {name:'Jumping Jacks', seq:[0,1,2,0,1,2]},
    {name:'Arm Circles',   seq:[3,4,3,4,3,4]},
    {name:'Squats (แตะต่ำ)', seq:[4,3,4,3]}
  ];
  let group=null, info=null, markers=[], poseIdx=0, stepIdx=0, handCheckInterval=null;

  function makeMarker(posStr, idx){
    const m = el('a-sphere', {class:'clickable', position:posStr, radius:0.12, color:'#FFD166'});
    m.addEventListener('click', ()=> hit(idx));
    return m;
  }
  function currentTargetIdx(){ return POSES[poseIdx].seq[stepIdx]; }
  function highlight(){
    markers.forEach((m,i)=> m.setAttribute('color', i===currentTargetIdx()? '#06D6A0' : '#FFD166'));
    info?.setAttribute('troika-text',
      `value:${POSES[poseIdx].name} — เป้าหมายที่ ${stepIdx+1}/${POSES[poseIdx].seq.length}; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`);
  }
  function hit(i){
    const sys = $('a-scene').systems.gameflow;
    if (i!==currentTargetIdx()){
      markers[i].setAttribute('animation__shake', {property:'position', to:'0 0 0.03', dur:80, dir:'alternate', loop:2});
      return;
    }
    sys.addScore(3);
    markers[i].setAttribute('animation__pop', {property:'scale', to:'1.3 1.3 1.3', dur:100, dir:'alternate', loop:1});
    stepIdx++;
    if (stepIdx>=POSES[poseIdx].seq.length){
      poseIdx++; stepIdx=0;
      if (poseIdx>=POSES.length){ sys.endGame('สุดยอด! ทำครบทุกท่าแล้ว'); return; }
    }
    highlight();
  }
  function distance(a,b){ const dx=a.x-b.x, dy=a.y-b.y, dz=a.z-b.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  function checkHandProximity(){
    const sys = $('a-scene').systems.gameflow;
    if (sys.state!=='exercise') return;
    const hand = $('#handRight');
    const comp = hand?.components['hand-tracking-controls'];
    if (!comp) return;
    const wrist = comp.wristPosition;
    if (!wrist) return;
    const idx = currentTargetIdx();
    const obj = markers[idx].object3D;
    const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
    if (distance(wrist, wp) < 0.15) hit(idx);
  }

  return {
    start(){
      group = $('#grp_exercise');
      group.innerHTML = '';
      info = el('a-entity',{position:'0 1.05 -1.1',
        text:`value:ทำตามเป้าให้ทันเวลา; anchor:center; maxWidth:2; fontSize: ${TEXT_SIZE.title}`});
      group.appendChild(info);
      markers = TARGET_POS.map((p,i)=> makeMarker(p, i));
      markers.forEach(m=>group.appendChild(m));
      poseIdx=0; stepIdx=0; highlight();
      handCheckInterval = setInterval(checkHandProximity, 120);
      return { stop(){ clearInterval(handCheckInterval); group && (group.innerHTML=''); } };
    }
  };
})();
