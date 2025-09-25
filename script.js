/* ===== Utility: once scene loaded, prepare raycaster/cursor for desktop & shared helpers ===== */
function $(sel){ return document.querySelector(sel); }
function setAttrCompat(element, name, value){
  // แปลง A-Frame text → troika-text สำหรับภาษาไทย
  if (name === 'text') {
    // map key names
    value = String(value)
      .replace(/(^|;)\s*align\s*:/g, '$1 anchor:')
      .replace(/(^|;)\s*width\s*:/g, '$1 maxWidth:');
    name = 'troika-text';
  }
  element.setAttribute(name, value);
}
function el(tag, attrs={}, children=[]){
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (typeof v === 'object' && k !== 'animation' && !k.startsWith('animation__')) {
      // แปลง object → '; ' string
      const s = Object.entries(v).map(([kk,vv])=>`${kk}:${vv}`).join('; ');
      setAttrCompat(e, k, s);
    } else {
      setAttrCompat(e, k, v);
    }
  });
  children.forEach(c=>e.appendChild(c));
  return e;
}


AFRAME.registerComponent('ensure-cursor', {
  init(){
    const cam = $('#camera');
    if (cam){
      cam.setAttribute('cursor', 'rayOrigin: mouse');
      cam.setAttribute('raycaster', 'objects: .clickable; far: 20');
    }
  }
});

/* ===== Core Gameflow System ===== */
AFRAME.registerSystem('gameflow', {
  init(){
    this.state = 'menu';         // menu | hygiene | nutrition | exercise
    this.timeLeft = 0;
    this.score = 0;
    this.activeGame = null;
    // HUD ensure
    const scene = this.sceneEl;
    // add HUD score/time if not exist
    if (!$('#hudScore')){
      const hud = el('a-entity', {position:'0 1.55 -1.2'});
      hud.id = 'hudWrap';
      hud.appendChild(el('a-entity', {id:'hudScore', text:'value:คะแนน: 0; color:#FFF; align:center; width:2'}));
      hud.appendChild(el('a-entity', {id:'hudTime', position:'0 -0.18 0', text:'value:เวลา: 0s; color:#FFF; align:center; width:2'}));
      scene.appendChild(hud);
    }
    // ensure cursor
    scene.setAttribute('ensure-cursor','');
  },
  setState(s){
    this.state = s;
    $('#hudState')?.setAttribute('text', 'value', 'โหมด: ' + s);
    ['menu','hygiene','nutrition','exercise'].forEach(id=>{
      const grp = $('#grp_'+id);
      if (grp) grp.setAttribute('visible', id===s);
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
    const score = this.score;
    alert(`${message}\nคะแนนของคุณ: ${score}`);
    if (this.activeGame?.stop) this.activeGame.stop();
    this.activeGame = null;
    this.setState('menu');
  },
  addScore(n=1){ this.score += n; this.updateHUD(); },
  updateHUD(){
    $('#hudScore')?.setAttribute('text', 'value', 'คะแนน: ' + this.score);
    $('#hudTime')?.setAttribute('text', 'value', 'เวลา: ' + Math.max(0, Math.ceil(this.timeLeft)) + 's');
  }
});

/* ===== Global tick: countdown timer ===== */
AFRAME.registerComponent('tick-timer', {
  tick(t, dt){
    const sys = this.el.sceneEl.systems.gameflow;
    if (['hygiene','nutrition','exercise'].includes(sys.state) && sys.timeLeft>0){
      sys.timeLeft -= dt/1000;
      sys.updateHUD();
      if (sys.timeLeft<=0){
        sys.endGame('หมดเวลา!');
      }
    }
  }
});

/* ===== Hand gestures (optional wave to return) ===== */
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
      if (speedX>0.6 && this.cool===0){
        this.cool = 1500;
        sys.endGame('หยุด/กลับเมนู');
      }
    }
    if (wrist) this.prevX = wrist.x;
  }
});

/* ===== Menu buttons wiring (from index.html onclick) ===== */
window.goMode = function(mode){
  const sys = $('a-scene').systems.gameflow;
  if (mode==='hygiene') sys.startGame('hygiene', 90);
  if (mode==='nutrition') sys.startGame('nutrition', 90);
  if (mode==='exercise') sys.startGame('exercise', 90);
};

/* =========================
   MiniGame #1: Hygiene (ล้างมือ 7 ขั้น + ความยาก)
   ========================= */
const HygieneGame = (function(){
  // 7 ขั้นพื้นฐาน
  const BASE_STEPS = [
    {key:'palm',    label:'ฝ่ามือถูฝ่ามือ'},
    {key:'back',    label:'ถูหลังมือ'},
    {key:'between', label:'ถูซอกนิ้ว'},
    {key:'thumb',   label:'ถูโคนนิ้วโป้ง'},
    {key:'tips',    label:'ถูปลายนิ้ว/เล็บ'},
    {key:'wrist',   label:'ถูรอบข้อมือ'},
    {key:'rinse',   label:'ล้าง/เช็ดให้แห้ง'}
  ];

  // ตั้งค่าความยาก
  const DIFF = {
    easy:   { radius:0.16, holdMs:  0, shuffle:false, timeBonus: 5, scoreAdd: 5, distractors:0 },
    normal: { radius:0.13, holdMs:150, shuffle:false, timeBonus: 3, scoreAdd: 6, distractors:1 },
    hard:   { radius:0.10, holdMs:350, shuffle:true,  timeBonus: 2, scoreAdd: 7, distractors:3, penalty:-3 }
  };

  let group=null, idx=0, steps=[], targets=[], currentBtn=null, holdTimer=null, diffKey='normal';
  let hintText=null, titleText=null, chooser=null, distractorEls=[];

  // UI เลือกความยาก
  function buildDifficultyChooser(){
    chooser = document.createElement('a-entity');
    chooser.setAttribute('position','0 1.35 -1.15');
    const head = document.createElement('a-entity');
    head.setAttribute('text','value:เลือกความยาก; width:2; align:center; color:#FFF');
    chooser.appendChild(head);

    const defs = [
      {x:-0.6, key:'easy',   label:'ง่าย'},
      {x: 0.0, key:'normal', label:'ปกติ'},
      {x: 0.6, key:'hard',   label:'ยาก'}
    ];
    defs.forEach(d=>{
      const btn = document.createElement('a-box');
      btn.setAttribute('class','clickable');
      btn.setAttribute('position', `${d.x} -0.25 0`);
      btn.setAttribute('width','0.6'); btn.setAttribute('height','0.22'); btn.setAttribute('depth','0.08');
      btn.setAttribute('color', d.key==='easy'?'#06D6A0': (d.key==='normal'?'#FFD166':'#EF476F'));
      const label = document.createElement('a-entity');
      label.setAttribute('position','0 0 0.06');
      label.setAttribute('text', `value:${d.label}; align:center; width:1.4`);
      btn.appendChild(label);
      btn.addEventListener('click', ()=>{
        diffKey = d.key;
        if (chooser && chooser.parentNode) chooser.parentNode.removeChild(chooser);
        startRound();
      });
      chooser.appendChild(btn);
    });
    group.appendChild(chooser);
  }

  // สร้างเป้าหมาย 7 จุด
  function makeTarget(pos, text, key, radius, holdMs){
    const wrap = document.createElement('a-entity');
    wrap.setAttribute('position', pos);

    const plate = document.createElement('a-circle');
    plate.setAttribute('radius', radius);
    plate.setAttribute('color', '#88E0FF');
    plate.setAttribute('class','clickable');

    const label = document.createElement('a-entity');
    label.setAttribute('position','0 -0.24 0');
    label.setAttribute('text', `value:${text}; align:center; width:2; color:#FFF`);

    wrap.appendChild(plate); wrap.appendChild(label);

    // การกดค้าง (hold detection)
    const startHold = ()=>{
      if (holdTimer) clearTimeout(holdTimer);
      holdTimer = setTimeout(()=>{ checkHit(); }, Math.max(0, holdMs));
    };
    const cancelHold = ()=>{ if (holdTimer) { clearTimeout(holdTimer); holdTimer=null; } };

    // ทำงานทั้งคลิก (desktop) และกดค้าง (VR cursor)
    plate.addEventListener('mousedown', startHold);
    plate.addEventListener('mouseup', cancelHold);
    plate.addEventListener('mouseleave', cancelHold);
    // รองรับกรณีที่ไม่มี hold (easy)
    plate.addEventListener('click', ()=>{ if (holdMs===0) checkHit(); });

    function checkHit(){
      const sys = document.querySelector('a-scene').systems.gameflow;
      if (steps[idx].key===key){
        sys.addScore(DIFF[diffKey].scoreAdd);
        sys.timeLeft += DIFF[diffKey].timeBonus; // ให้เวลาเพิ่ม
        plate.setAttribute('animation__pop', {property:'scale', to:'1.3 1.3 1.3', dur:120, dir:'alternate', loop:1});
        idx++;
        updateHighlight();
        if (idx>=steps.length) sys.endGame('สะอาดหมดจด!');
      } else {
        // ผิดขั้น (เฉพาะ hard จะมีโทษ)
        if (DIFF[diffKey].penalty) {
          sys.addScore(DIFF[diffKey].penalty);
        }
        // สั่นเตือน
        plate.setAttribute('animation__shake', {property:'position', to:'0 0 0.02', dur:80, dir:'alternate', loop:2});
        hint(`ยังไม่ใช่ขั้นนี้ ลองดูวงสีเขียว (ขั้นถัดไป)`);
      }
    }

    // เก็บอ้างอิงเพื่อเปลี่ยนสีไฮไลต์
    wrap.__plate = plate;
    return wrap;
  }

  // สิ่งรบกวน (คลิกแล้วหักคะแนน)
  function makeDistractor(pos){
    const d = document.createElement('a-sphere');
    d.setAttribute('class','clickable');
    d.setAttribute('position', pos);
    d.setAttribute('radius','0.08');
    d.setAttribute('color','#FF595E');
    d.addEventListener('click', ()=>{
      const sys = document.querySelector('a-scene').systems.gameflow;
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
    if (!hintText) return;
    hintText.setAttribute('text', `value:${msg}; width:2; align:center`);
  }

  function updateHighlight(){
    targets.forEach((t,i)=>{
      const c = (i===idx)? '#00FFC6' : '#88E0FF';
      t.__plate.setAttribute('color', c);
    });
    const next = steps[idx]?.label || 'เสร็จแล้ว!';
    titleText?.setAttribute('text', `value:ล้างมือให้ครบลำดับ — ขั้นต่อไป: ${next}; width:2; align:center`);
  }

  function startRound(){
    // เคลียร์ฉาก
    group.innerHTML = '';

    // เตรียม steps ตามระดับ
    steps = BASE_STEPS.slice();
    if (DIFF[diffKey].shuffle) steps = shuffle(steps);
    idx = 0;

    // UI หัวข้อ + hint
    titleText = document.createElement('a-entity');
    titleText.setAttribute('position','0 1.1 -1.2');
    titleText.setAttribute('text','value:ล้างมือให้ครบลำดับ — เล็งวงสีเขียว; width:2; align:center');
    hintText = document.createElement('a-entity');
    hintText.setAttribute('position','0 0.95 -1.2');
    hintText.setAttribute('text','value:แตะ/กดค้างที่เป้า (ยากจะต้องค้างนานขึ้น); width:2; align:center');

    group.appendChild(titleText);
    group.appendChild(hintText);

    // วางตำแหน่ง 7 จุด
    const positions = [
      ' -0.6 1.45 -1.2', ' -0.2 1.45 -1.2', ' 0.2 1.45 -1.2',
      ' 0.6 1.45 -1.2',  ' -0.4 1.15 -1.2',' 0.0 1.15 -1.2',' 0.4 1.15 -1.2'
    ];
    const cfg = DIFF[diffKey];
    targets = steps.map((s,i)=> makeTarget(positions[i], s.label, s.key, cfg.radius, cfg.holdMs));
    targets.forEach(t=>group.appendChild(t));

    // สร้างสิ่งรบกวน (เฉพาะโหมดยาก/หรือมี distractors>0)
    distractorEls = [];
    for (let i=0;i<(cfg.distractors||0);i++){
      const x = -0.8 + Math.random()*1.6;
      const y =  1.0 + Math.random()*0.6;
      const d = makeDistractor(`${x.toFixed(2)} ${y.toFixed(2)} -1.2`);
      group.appendChild(d);
      distractorEls.push(d);
    }

    updateHighlight();
  }

  return {
    start(sys){
      group = document.querySelector('#grp_hygiene');
      group.innerHTML = '';
      // แสดงตัวเลือกความยากก่อนเริ่ม
      buildDifficultyChooser();
      return { stop(){ group && (group.innerHTML=''); } };
    }
  };
})();


/* =========================
   MiniGame #2: Nutrition (แยกหมวดอาหารแบบกดตอบ)
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
    {name:'ข้าวสวย', cat:'carb'},
    {name:'ขนมปังโฮลวีต', cat:'carb'},
    {name:'ไก่อบ', cat:'protein'},
    {name:'เต้าหู้', cat:'protein'},
    {name:'ปลาอบ', cat:'protein'},
    {name:'กล้วย', cat:'vegfruit'},
    {name:'แอปเปิล', cat:'vegfruit'},
    {name:'ผักกาดหอม', cat:'vegfruit'},
    {name:'นมถั่วเหลือง', cat:'dairy'},
    {name:'โยเกิร์ตรสธรรมชาติ', cat:'dairy'},
    {name:'อะโวคาโด', cat:'fat'},
    {name:'ถั่วอัลมอนด์', cat:'fat'}
  ];
  let group=null, qText=null, choiceBtns=[], current=null, asked=0, maxQ=10;

  function makeChoice(x, label, cat){
    const btn = el('a-box', {class:'clickable', position:`${x} 0.6 -1.1`, width:0.7, height:0.22, depth:0.08, color:'#3A86FF'});
    btn.appendChild(el('a-entity',{position:'0 0 0.06', text:`value:${label}; align:center; width:1.6`}));
    btn.addEventListener('click', ()=>{
      const sys = $('a-scene').systems.gameflow;
      if (!current) return;
      if (current.cat===cat){
        sys.addScore(10);
        hint(`ถูกต้อง! ${current.name} → ${label}`);
      } else {
        hint(`ยังไม่ใช่ ลองใหม่: ${current.name}`);
      }
      nextQuestion();
    });
    return btn;
  }
  function hint(msg){
    $('#grp_nutrition_hint')?.setAttribute('text', `value:${msg}; width:2; align:center`);
  }
  function nextQuestion(){
    const sys = $('a-scene').systems.gameflow;
    asked++;
    if (asked>maxQ){ sys.endGame('ควิซโภชนาการครบแล้ว!'); return; }
    current = ITEMS[Math.floor(Math.random()*ITEMS.length)];
    qText.setAttribute('text', `value:จัดหมวด: ${current.name}; width:2; align:center`);
  }

  return {
    start(sys){
      group = $('#grp_nutrition');
      group.innerHTML = '';
      qText = el('a-entity',{position:'0 1.15 -1.2', text:'value:จัดหมวด: ...; width:2; align:center'});
      const hintText = el('a-entity',{id:'grp_nutrition_hint', position:'0 0.95 -1.2', text:'value:แตะเลือกหมวดให้ถูกต้อง; width:2; align:center'});
      group.appendChild(qText); group.appendChild(hintText);
      const xs = [-0.9, -0.45, 0, 0.45, 0.9];
      choiceBtns = CATS.map((c,i)=> makeChoice(xs[i], c.label, c.id));
      choiceBtns.forEach(b=>group.appendChild(b));
      asked=0; nextQuestion();
      return { stop(){ group && (group.innerHTML=''); } };
    }
  };
})();

/* =========================
   MiniGame #3: Exercise (เอามือแตะ “เป้า” หรือคลิกให้ทัน)
   ========================= */
const ExerciseGame = (function(){
  // series of targets the player should touch (by hand proximity) or click
  const TARGET_POS = [
    '-0.5 1.4 -1.0', '0.5 1.4 -1.0', '0 1.8 -1.0', '-0.3 1.2 -1.0', '0.3 1.2 -1.0'
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
    markers.forEach((m,i)=>{
      m.setAttribute('color', i===currentTargetIdx()? '#06D6A0' : '#FFD166');
    });
    if (info) info.setAttribute('text', `value:${POSES[poseIdx].name} — เป้าหมายที่ ${stepIdx+1}/${POSES[poseIdx].seq.length}; width:2; align:center`);
  }
  function hit(i){
    const sys = $('a-scene').systems.gameflow;
    if (i!==currentTargetIdx()){
      // small shake on wrong
      markers[i].setAttribute('animation__shake', {property:'position', to:'0 0 0.03', dur:80, dir:'alternate', loop:2});
      return;
    }
    sys.addScore(3);
    markers[i].setAttribute('animation__pop', {property:'scale', to:'1.3 1.3 1.3', dur:100, dir:'alternate', loop:1});
    stepIdx++;
    if (stepIdx>=POSES[poseIdx].seq.length){
      poseIdx++;
      stepIdx=0;
      if (poseIdx>=POSES.length){
        sys.endGame('สุดยอด! ทำครบทุกท่าแล้ว');
        return;
      }
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
    // get world position of current marker
    const idx = currentTargetIdx();
    const obj = markers[idx].object3D;
    const wp = new THREE.Vector3(); obj.getWorldPosition(wp);
    if (distance(wrist, wp) < 0.15){ // “เอามือจ่อเป้า”
      hit(idx);
    }
  }

  return {
    start(sys){
      group = $('#grp_exercise');
      group.innerHTML = '';
      info = el('a-entity',{position:'0 1.05 -1.1', text:'value:ทำตามเป้าให้ทันเวลา; width:2; align:center'});
      group.appendChild(info);
      markers = TARGET_POS.map((p,i)=> makeMarker(p, i));
      markers.forEach(m=>group.appendChild(m));
      poseIdx=0; stepIdx=0; highlight();
      // check hand proximity every 120ms
      handCheckInterval = setInterval(checkHandProximity, 120);
      return { stop(){ clearInterval(handCheckInterval); group && (group.innerHTML=''); } };
    }
  };
})();
