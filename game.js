// Fitness Adventure VR — Beat Map JSON system + progressive difficulty
const APP = {
  running: false,
  duration: 60,
  timeLeft: 60,
  score: 0,
  combo: 0,
  basePerfect: 0.28,
  baseGood: 0.52,
  perfectWindow: 0.28,
  goodWindow: 0.52,
  baseSpeed: 2.0,
  speed: 2.0,
  track: [],
  nextIdx: 0,
  lastTick: 0,
  mapMeta: { title: "Free Run", bpm: 0 }
};

const hud = {
  root: document.getElementById('hud'),
  time: document.getElementById('hudTime'),
  score: document.getElementById('hudScore'),
  combo: document.getElementById('hudCombo'),
  diff: document.getElementById('hudDiff'),
};

const ui = {
  start: document.getElementById('btnStart'),
  how: document.getElementById('btnHow'),
  selectBeat: document.getElementById('selectBeat'),
};

async function loadBeatMap(url){
  try{
    const res = await fetch(url, {cache:'no-store'});
    const json = await res.json();
    const events = (json.events||[]).slice().sort((a,b)=>a.t-b.t);
    APP.duration = json.duration || 60;
    APP.mapMeta = { title: json.title||'Beat Map', bpm: json.bpm||0 };
    return events;
  }catch(e){
    console.warn("Beat map load failed, fallback to generator", e);
    return buildTrack();
  }
}

function buildTrack(){
  const track = [];
  let t = 2.0;
  while (t < APP.duration - 2){
    const r = Math.random();
    if (r < 0.5) track.push({ t, type: (Math.random()<0.5?'punchL':'punchR') });
    else if (r < 0.75) track.push({ t, type:'duck' });
    else track.push({ t, type:'handsUp' });
    t += 1.6 + (Math.random()*0.4);
  }
  return track;
}

function resetGame(){
  APP.running = false;
  APP.timeLeft = APP.duration;
  APP.score = 0; APP.combo = 0; APP.nextIdx = 0; APP.lastTick = 0;
  APP.perfectWindow = APP.basePerfect;
  APP.goodWindow = APP.baseGood;
  APP.speed = APP.baseSpeed;
  hud.time.textContent = APP.timeLeft;
  hud.score.textContent = APP.score;
  hud.combo.textContent = APP.combo;
  if (hud.diff) hud.diff.textContent = 0;
  document.getElementById('summaryPanel').setAttribute('visible', false);
  document.getElementById('titleBoard').setAttribute('visible', true);
}

async function startGame(){
  const url = ui.selectBeat ? ui.selectBeat.value : 'assets/beatmap_easy.json';
  APP.track = await loadBeatMap(url);
  resetGame();
  APP.running = true;
  hud.root.hidden = false;
  document.getElementById('titleBoard').setAttribute('visible', false);
  const bgm = document.getElementById('bgm');
  if (bgm) { bgm.currentTime = 0; bgm.play().catch(()=>{}); }
}

const world = document.getElementById('world');
const pools = { targets: [], hurdles: [], cues: [] };

function spawnTarget(side){
  const x = side==='L'?-0.45:0.45; const y = 1.3; const z = -10;
  const e = document.createElement('a-entity');
  e.setAttribute('geometry', 'primitive: circle; radius: 0.22');
  e.setAttribute('material', 'color: #28c76f; emissive: #28c76f; emissiveIntensity: 0.5');
  e.setAttribute('position', `${x} ${y} ${z}`);
  e.classList.add('target');
  const ring = document.createElement('a-ring');
  ring.setAttribute('radius-inner','0.22');
  ring.setAttribute('radius-outer','0.28');
  ring.setAttribute('color','#b7f5d6');
  e.appendChild(ring);
  world.appendChild(e);
  pools.targets.push({el:e, active:true, tHit: performance.now()/1000 + 10/APP.speed});
}

function spawnHurdle(){
  const e = document.createElement('a-box');
  e.setAttribute('width','1.2'); e.setAttribute('height','0.6'); e.setAttribute('depth','0.4');
  e.setAttribute('color', '#ff6b6b');
  e.setAttribute('position', `0 0.6 -12`);
  e.classList.add('hurdle');
  world.appendChild(e);
  pools.hurdles.push({el:e, active:true, tHit: performance.now()/1000 + 12/APP.speed});
}

function spawnHandsUpCue(){
  const e = document.createElement('a-entity');
  e.setAttribute('position', `0 1.6 -11`);
  const arrow = document.createElement('a-triangle');
  arrow.setAttribute('color', '#ffd166');
  arrow.setAttribute('vertex-a','0 0.6 0');
  arrow.setAttribute('vertex-b','-0.6 -0.4 0');
  arrow.setAttribute('vertex-c','0.6 -0.4 0');
  e.appendChild(arrow);
  const outline = document.createElement('a-triangle');
  outline.setAttribute('color', '#fff'); outline.setAttribute('opacity','0.6');
  outline.setAttribute('vertex-a','0 0.7 0'); outline.setAttribute('vertex-b','-0.7 -0.5 0'); outline.setAttribute('vertex-c','0.7 -0.5 0');
  e.appendChild(outline);
  world.appendChild(e);
  pools.cues.push({el:e, active:true, tHit: performance.now()/1000 + 11/APP.speed});
}

function feedback(text, color){
  const tpl = document.getElementById('fxTemplate');
  const fx = tpl.cloneNode(true);
  fx.id = '';
  fx.setAttribute('visible', true);
  fx.setAttribute('position', `0 2 -1.2`);
  fx.querySelector('#fxText').setAttribute('text', `value: ${text}; align:center; color: ${color}; width: 3`);
  world.appendChild(fx);
  const start = performance.now();
  function anim(){
    const dt = (performance.now()-start)/1000;
    if (dt<0.7){ fx.object3D.position.y = 2 + dt*0.6; fx.object3D.children[0].material.opacity = 1 - dt/0.7; requestAnimationFrame(anim); }
    else { world.removeChild(fx); }
  }
  requestAnimationFrame(anim);
}

function addScore(kind){
  let delta=0; let color="#fff";
  if (kind==='perfect'){ delta=360; color="#7CFC00"; APP.combo++; }
  else if (kind==='good'){ delta=120; color="#A7F3D0"; APP.combo=0; }
  else { delta=0; color="#ffb3b3"; APP.combo=0; }
  const elapsed = APP.duration - APP.timeLeft;
  const p = Math.min(1, Math.max(0, elapsed / APP.duration));
  const mult = 1 + Math.floor(p*3); // x1..x4
  APP.score += (delta + Math.floor(APP.combo*6)) * mult;
  hud.score.textContent = APP.score; hud.combo.textContent = APP.combo;
  feedback((mult>1?`x${mult} `:'') + kind.toUpperCase(), color);
  const id = kind==='perfect'?'sfxPerfect':(kind==='good'?'sfxGood':'sfxMiss');
  const el = document.getElementById(id); if (el){ el.currentTime=0; el.play().catch(()=>{}); }
}

function endGame(){
  APP.running=false;
  hud.root.hidden = true;
  const bgm = document.getElementById('bgm'); if (bgm) bgm.pause();
  [...world.children].forEach(c=>world.removeChild(c));
  const s = document.getElementById('summaryPanel');
  const stars = APP.score>4800? '★★★' : (APP.score>2500? '★★☆' : '★☆☆');
  s.querySelector('#sumStars').setAttribute('text', `value: ${stars}; align:center; color:#FFD166; width: 2`);
  s.querySelector('#sumStats').setAttribute('text', `value: Score: ${APP.score} | Time: ${APP.duration}s; align:center; color:#CFE8FF; width:2`);
  s.setAttribute('visible', true);
  document.getElementById('titleBoard').setAttribute('visible', true);
}

function tick(t){
  if (!APP.running){ APP.lastTick=t; return; }
  if (!APP.lastTick) APP.lastTick=t; const dt=(t-APP.lastTick)/1000; APP.lastTick=t;
  APP.timeLeft -= dt; if (APP.timeLeft<=0){ APP.timeLeft=0; endGame(); }
  hud.time.textContent = Math.ceil(APP.timeLeft);

  const elapsed = APP.duration - APP.timeLeft;
  const p = Math.min(1, Math.max(0, elapsed / APP.duration));
  APP.speed = APP.baseSpeed + 1.6 * p;
  APP.perfectWindow = APP.basePerfect - 0.10 * p;
  APP.goodWindow = APP.baseGood - 0.12 * p;
  if (hud.diff) hud.diff.textContent = Math.round(p*100);

  while(APP.nextIdx < APP.track.length && APP.track[APP.nextIdx].t <= elapsed + 2.2){
    const evt = APP.track[APP.nextIdx++];
    if (evt.type==='punchL') spawnTarget('L');
    else if (evt.type==='punchR') spawnTarget('R');
    else if (evt.type==='duck') spawnHurdle();
    else if (evt.type==='handsUp') spawnHandsUpCue();
  }

  const dz = APP.speed * dt;
  [...world.children].forEach(el=>{ el.object3D.position.z += dz; });

  handlePunches();
  handleDuck();
  handleHandsUp();

  pools.targets = pools.targets.filter(o=>{
    const z=o.el.object3D.position.z; if (z>0){
      if (o.active){ addScore('miss'); o.active=false; }
      world.removeChild(o.el); return false;
    } return true;
  });
  pools.hurdles = pools.hurdles.filter(o=>{
    const z=o.el.object3D.position.z; if (z>0){
      if (o.active){
        const cam = document.getElementById('camera');
        const y = cam.object3D.position.y + document.getElementById('rig').object3D.position.y;
        if (y>1.1) addScore('miss'); else addScore('good');
        o.active=false;
      }
      world.removeChild(o.el); return false;
    } return true;
  });
  pools.cues = pools.cues.filter(o=>{
    const z=o.el.object3D.position.z; if (z>0){
      if (o.active){ const ok = areHandsUp(); addScore(ok? 'perfect' : 'miss'); o.active=false; }
      world.removeChild(o.el); return false;
    } return true;
  });

  requestAnimationFrame(tick);
}

function getHandPositions(){
  const left = document.getElementById('leftHand').object3D.getWorldPosition(new THREE.Vector3());
  const right = document.getElementById('rightHand').object3D.getWorldPosition(new THREE.Vector3());
  return { left, right };
}

function handlePunches(){
  const { left, right } = getHandPositions();
  const now = performance.now()/1000;
  pools.targets.forEach(o=>{
    if (!o.active) return;
    const p = o.el.object3D.getWorldPosition(new THREE.Vector3());
    const dL = p.distanceTo(left); const dR = p.distanceTo(right);
    const d = Math.min(dL, dR);
    if (p.z>-0.2 && p.z<0.2 && d<0.25){
      const off = Math.abs(now - o.tHit);
      addScore(off < APP.perfectWindow ? 'perfect' : (off < APP.goodWindow ? 'good' : 'good'));
      o.active=false; world.removeChild(o.el);
    }
  });
}

function handleDuck(){ /* logic in cull when hurdle passes */ }

function areHandsUp(){
  const { left, right } = getHandPositions();
  return (left.y>2.0 && right.y>2.0);
}

function handleHandsUp(){ /* resolved in cull */ }

(function initFallbackHandDrag(){
  let dragging=false; let last=null;
  function toWorldDelta(dx, dy){ return { x: dx/300, y: -dy/300 }; }
  window.addEventListener('pointerdown', e=>{ dragging=true; last={x:e.clientX,y:e.clientY}; });
  window.addEventListener('pointerup', ()=>{ dragging=false; last=null; });
  window.addEventListener('pointermove', e=>{
    if (!dragging || !last) return; const dx=e.clientX-last.x, dy=e.clientY-last.y; last={x:e.clientX,y:e.clientY};
    const d = toWorldDelta(dx,dy);
    const lh = document.getElementById('leftHand'); const rh = document.getElementById('rightHand');
    const lp = lh.object3D.position; const rp = rh.object3D.position;
    lp.x += d.x; lp.y = Math.max(0.4, Math.min(2.2, lp.y + d.y));
    rp.x += d.x; rp.y = Math.max(0.4, Math.min(2.2, rp.y + d.y));
  });
})();

ui.start.addEventListener('click', ()=>{ startGame(); requestAnimationFrame(tick); });
ui.how.addEventListener('click', ()=>{
  const meta = APP.mapMeta;
  alert('HOW TO PLAY\\n\\n• Punch green targets as they reach you.\\n• Duck under red hurdles (lower your head).\\n• Raise both hands when the big up arrow appears.\\n• Difficulty ramps up over time (speed, timing, multiplier).\\n\\nBeat Map: ' + meta.title + (meta.bpm? ('  |  BPM: '+meta.bpm):''));
});

resetGame();
