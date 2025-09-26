// VR Dance Game (A-Frame) PRO: feedback, stars, hand-tracking pinch.
const JUDGE = { perfect: 0.15, good: 0.30 };
const SPEED = 0.9;
const NOTE_START_Z = -1.6;
const HIT_Z = 0.0;
const SONG_OFFSET = 0.2;

function buildBeatmap(bpm=100){
  const secPerBeat = 60 / bpm;
  const map = [];
  const dirs = ['up','left','right','down'];
  let t = SONG_OFFSET;
  for (let i=0;i<64;i++){
    const dir = dirs[i % dirs.length];
    map.push({time: t, dir});
    if (i % 8 === 4){
      const dir2 = dirs[(i+2)%dirs.length];
      map.push({time: t + secPerBeat*0.5, dir: dir2});
    }
    t += secPerBeat;
  }
  return map;
}
const BEATMAP = buildBeatmap(100);

// --- Feedback popup (floating text) ---
function spawnPopup(text, color, atPos){
  const root = APP.arena || document.querySelector('a-scene');
  const e = document.createElement('a-entity');
  const x = atPos?.x ?? 0, y = (atPos?.y ?? 1.6) + 0.12, z = (APP.arena ? 0 : -1.6);
  e.setAttribute('position', `${x} ${y} ${z}`);
  e.innerHTML = `<a-text value="${text}" color="${color}" width="0.8" align="center"></a-text>`;
  root.appendChild(e);
  e.setAttribute('animation__move', 'property: position; to: ' + x + ' ' + (y+0.18) + ' ' + z + '; dur: 550; easing: easeOutQuad');
  e.setAttribute('animation__fade', 'property: components.text.material.opacity; to: 0; dur: 550; delay: 100; easing: linear');
  setTimeout(()=>{ if (e && e.parentNode) e.parentNode.removeChild(e); }, 650);
}

function computeStars(stats){
  const total = Math.max(1, stats.total);
  const acc = (stats.perfect + stats.good) / total * 100;
  if (acc >= 85) return 3;
  if (acc >= 60) return 2;
  return 1;
}
function starString(n){ return '★'.repeat(n) + '☆'.repeat(3-n); }

function worldPos(el){
  if (!el || !el.object3D) return {x:0,y:0,z:0};
  const v = new THREE.Vector3();
  el.object3D.getWorldPosition(v);
  return {x:v.x,y:v.y,z:v.z};
}

window.APP = {
  state: "splash",
  mode: "game",
  timer: 60,
  score: 0,
  combo: 0,
  maxCombo: 0,
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  notes: [],
  activeArrows: [],
  audio: null,
  startPerf: 0,
  arena: null
};

AFRAME.registerComponent('click-bindings', {
  init: function () {
    const $ = sel => document.querySelector(sel);
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };

    on('#btn-continue', () => showMenu());
    on('#btn-play', () => startGame('game'));
    on('#btn-practice', () => startGame('practice'));
    on('#btn-howto', () => showHowto());
    on('#btn-back-menu', () => showMenu());

    ['up','down','left','right'].forEach(dir => {
      const id = '#lane-' + dir;
      const el = $(id);
      el.addEventListener('click', () => tryHit(dir));
      el.addEventListener('mouseenter', () => el.setAttribute('scale','1.05 1.05 1'));
      el.addEventListener('mouseleave', () => el.setAttribute('scale','1 1 1'));
    });
  }
});

function $(sel){ return document.querySelector(sel); }
function setVisible(id, v){ const el=$(id); if (el) el.setAttribute('visible', v); }

function showMenu(){
  APP.state='menu';
  setVisible('#ui-splash', false);
  setVisible('#ui-howto', false);
  setVisible('#arena', false);
  setVisible('#hud', false);
  setVisible('#ui-menu', true);
  stopAudio();
}

function showHowto(){
  APP.state='howto';
  setVisible('#ui-menu', false);
  setVisible('#ui-howto', true);
}

function updateHUD(){
  const tl = $('#hud-left');
  const tm = $('#hud-mid');
  const tr = $('#hud-right');
  if (APP.mode==='game') tl.setAttribute('value', `Time: ${Math.max(0, Math.ceil(APP.timer))}`);
  else tl.setAttribute('value', `Practice`);
  tm.setAttribute('value', `Combo: ${APP.combo}`);
  tr.setAttribute('value', `Score: ${APP.score}`);
}

function startGame(mode){
  APP.mode = mode;
  APP.state = 'playing';
  APP.timer = (mode==='game') ? 60 : 0;
  APP.score = 0;
  APP.combo = 0;
  APP.maxCombo = 0;
  APP.perfectCount = 0;
  APP.goodCount = 0;
  APP.missCount = 0;
  APP.notes = BEATMAP.map(n => ({...n, hit:false, miss:false, spawned:false, el:null}));
  APP.activeArrows = [];
  APP.arena = $('#arena');
  setVisible('#ui-menu', false);
  setVisible('#ui-howto', false);
  setVisible('#arena', true);
  setVisible('#hud', true);
  updateHUD();
  setupPinchHandlers();
  startAudio();
  requestAnimationFrame(loop);
}

function finishGame(){
  APP.state='finished';
  stopAudio();
  const totalNotes = APP.notes.filter(n => n.spawned || n.hit || n.miss).length || APP.notes.length;
  const stats = {perfect: APP.perfectCount, good: APP.goodCount, miss: APP.missCount, total: totalNotes};
  const stars = computeStars(stats);
  const acc = Math.round((stats.perfect + stats.good) / Math.max(1, stats.total) * 100);

  const overlay = document.createElement('a-entity');
  overlay.setAttribute('position','0 1.6 -1.6');
  overlay.innerHTML = `
    <a-plane width="2.2" height="1.35" color="#162235" material="opacity:0.95"></a-plane>
    <a-text value="Results" color="#fff" width="1.9" align="center" position="0 0.45 0"></a-text>
    <a-text value="Score: ${APP.score}   Max Combo: ${APP.maxCombo}" color="#bfe" width="1.8" align="center" position="0 0.2 0"></a-text>
    <a-text value="Accuracy: ${acc}%   Perfect: ${APP.perfectCount}   Good: ${APP.goodCount}   Miss: ${APP.missCount}" color="#bfe" width="1.8" align="center" position="0 -0.02 0"></a-text>
    <a-text value="${starString(stars)}" color="#ffd166" width="1.2" align="center" position="0 -0.28 0"></a-text>
    <a-plane id="btn-retry" class="clickable" width="1.3" height="0.24" color="#60a5fa" position="0 -0.52 0">
      <a-text value="Back to Menu" align="center" color="#062" width="1.0" position="0 0 0.01"></a-text>
    </a-plane>
  `;
  document.querySelector('a-scene').appendChild(overlay);
  const back = overlay.querySelector('#btn-retry');
  back.addEventListener('click', () => {
    overlay.parentNode.removeChild(overlay);
    showMenu();
  });
}

function getSongTime(){
  if (!APP.audio) return 0;
  return APP.audio.currentTime;
}

function startAudio(){
  const el = document.getElementById('bgm');
  APP.audio = el;
  try { el.currentTime = 0; } catch(e){}
  el.play().catch(()=>{});
  APP.startPerf = performance.now()/1000;
}

function stopAudio(){
  if (APP.audio){
    try { APP.audio.pause(); } catch(e){}
  }
}

function spawnNote(note){
  const root = $('#spawn-root');
  const imgId = note.dir==='up'?'#arrowUpImg': note.dir==='down'?'#arrowDownImg': note.dir==='left'?'#arrowLeftImg':'#arrowRightImg';
  const pos = dirToLaneXY(note.dir);
  const el = document.createElement('a-image');
  el.setAttribute('src', imgId);
  el.setAttribute('position', `${pos.x} ${pos.y} ${NOTE_START_Z}`);
  el.setAttribute('width', '0.22');
  el.setAttribute('height', '0.22');
  el.setAttribute('material', 'transparent:true;opacity:1');
  root.appendChild(el);
  note.el = el;
  APP.activeArrows.push(note);
}

function dirToLaneXY(dir){
  switch(dir){
    case 'up': return {x:0, y:0.6};
    case 'left': return {x:-0.8, y:0.2};
    case 'right': return {x:0.8, y:0.2};
    case 'down': return {x:0, y:-0.2};
  }
  return {x:0,y:0};
}

function loop(){
  if (APP.state!=='playing') return;

  const t = getSongTime();
  if (!APP.audio || APP.audio.paused || t <= 0.05){
    updateHUD();
    return requestAnimationFrame(loop);
  }

  // spawn based on travel time
  APP.notes.forEach(n => {
    if (!n.spawned && !n.hit && !n.miss){
      const travel = (Math.abs(NOTE_START_Z - HIT_Z)) / SPEED;
      if (t >= n.time - travel){
        spawnNote(n);
        n.spawned = true;
      }
    }
  });

  const dt = 1/60;
  const toRemove = [];
  APP.activeArrows.forEach(n => {
    if (!n.el) { toRemove.push(n); return; }
    const pos = n.el.getAttribute('position');
    let z = pos.z + SPEED * dt;
    n.el.setAttribute('position', `${pos.x} ${pos.y} ${z}`);
    if (z >= HIT_Z + 0.08){
      const delta = t - n.time;
      if (!n.hit && Math.abs(delta) > JUDGE.good){
        n.miss = true;
        n.el.parentNode.removeChild(n.el);
        toRemove.push(n);
        applyJudge('miss');
      }
    }
  });
  APP.activeArrows = APP.activeArrows.filter(n => !toRemove.includes(n));

  if (APP.mode==='game'){
    APP.timer -= dt;
    if (APP.timer <= 0){
      APP.timer = 0;
      updateHUD();
      return finishGame();
    }
  }
  updateHUD();
  requestAnimationFrame(loop);
}

function nearestNoteForDir(dir){
  const t = getSongTime();
  let best = null;
  let bestAbs = 999;
  APP.notes.forEach(n => {
    if (n.dir!==dir || n.hit || n.miss) return;
    const d = Math.abs(n.time - t);
    if (!n.spawned && d > 0.8) return;
    if (d < bestAbs){ bestAbs = d; best = n; }
  });
  return best;
}

function tryHit(dir){
  if (APP.state!=='playing') return;
  const note = nearestNoteForDir(dir);
  if (!note) { applyJudge('miss'); return; }
  const delta = Math.abs(getSongTime() - note.time);
  let result = 'miss';
  if (delta <= JUDGE.perfect) result = 'perfect';
  else if (delta <= JUDGE.good) result = 'good';

  if (result === 'miss'){ applyJudge('miss'); return; }

  note.hit = true;
  if (note.el && note.el.parentNode){
    note.el.setAttribute('material','opacity:0.2');
    setTimeout(()=>{ if (note.el && note.el.parentNode) note.el.parentNode.removeChild(note.el); }, 50);
  }

  // Popup at lane position
  const p = dirToLaneXY(dir);
  spawnPopup(result.toUpperCase(), result==='perfect' ? '#34d399' : '#60a5fa', {x:p.x, y:p.y});

  applyJudge(result);
}

function applyJudge(j){
  if (j==='perfect'){ APP.score += 100; APP.combo += 1; APP.perfectCount += 1; }
  else if (j==='good'){ APP.score += 70; APP.combo += 1; APP.goodCount += 1; }
  else { APP.combo = 0; APP.missCount += 1; }
  APP.maxCombo = Math.max(APP.maxCombo, APP.combo);
  updateHUD();
}

// --- Hand-tracking pinch handling ---
function setupPinchHandlers(){
  ['#leftHand','#rightHand'].forEach(id => {
    const hand = document.querySelector(id);
    if (!hand) return;
    hand.addEventListener('pinchstarted', () => {
      if (APP.state!=='playing') return;
      const hpos = worldPos(hand);
      const lanes = [
        {dir:'up',   el: document.querySelector('#lane-up')},
        {dir:'down', el: document.querySelector('#lane-down')},
        {dir:'left', el: document.querySelector('#lane-left')},
        {dir:'right',el: document.querySelector('#lane-right')},
      ];
      let best = lanes[0], bestD = 999;
      lanes.forEach(L => {
        const p = worldPos(L.el);
        const d = Math.hypot(hpos.x - p.x, hpos.y - p.y);
        if (d < bestD){ bestD = d; best = L; }
      });
      if (best) tryHit(best.dir);
    });
  });
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#click-handler').setAttribute('click-bindings','');
  setupPinchHandlers();
});
