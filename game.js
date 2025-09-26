// VR Dance Game (A-Frame) with beat map and simple scoring.
// Directions: 'up','down','left','right'
// Judgement windows (seconds)
const JUDGE = {
  perfect: 0.15,
  good: 0.30
};

const SPEED = 0.9; // arrow movement units per second (toward z=0 plane from z=-2)
const NOTE_START_Z = -1.6; // spawn behind hit zone
const HIT_Z = 0.0; // where lanes are placed (z relative to arena)
const SONG_OFFSET = 0.2; // delay to allow spawn before first note

// Build a simple beat map: 100 BPM, quarter notes with some patterns (about 32 bars)
function buildBeatmap(bpm=100) {
  const secPerBeat = 60 / bpm;
  const map = [];
  const dirs = ['up','left','right','down'];
  let t = SONG_OFFSET;
  // 64 beats (about 38s with offset)
  for (let i = 0; i < 64; i++) {
    // pattern: alternating directions + occasional doubles
    const dir = dirs[i % dirs.length];
    map.push({time: t, dir});
    // every 8th beat, add a second note slightly later (syncopation)
    if (i % 8 === 4) {
      const dir2 = dirs[(i+2) % dirs.length];
      map.push({time: t + secPerBeat * 0.5, dir: dir2});
    }
    t += secPerBeat;
  }
  return map;
}

const BEATMAP = buildBeatmap(100);

window.APP = {
  state: "splash",
  mode: "game",
  timer: 60,
  score: 0,
  combo: 0,
  maxCombo: 0,
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

    // lane clicks
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
  APP.notes = BEATMAP.map(n => ({...n, hit:false, miss:false, spawned:false, el:null}));
  APP.activeArrows = [];
  APP.arena = $('#arena');
  setVisible('#ui-menu', false);
  setVisible('#ui-howto', false);
  setVisible('#arena', true);
  setVisible('#hud', true);
  updateHUD();
  startAudio();
  requestAnimationFrame(loop);
}

function finishGame(){
  APP.state='finished';
  stopAudio();
  const overlay = document.createElement('a-entity');
  overlay.setAttribute('position','0 1.6 -1.6');
  overlay.innerHTML = `
    <a-plane width="2.1" height="1.2" color="#162235" material="opacity:0.95"></a-plane>
    <a-text value="Results" color="#fff" width="1.8" align="center" position="0 0.4 0"></a-text>
    <a-text value="Score: ${APP.score}   Max Combo: ${APP.maxCombo}" color="#bfe" width="1.8" align="center" position="0 0.15 0"></a-text>
    <a-plane id="btn-retry" class="clickable" width="1.3" height="0.24" color="#60a5fa" position="0 -0.18 0">
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
  // Wait until audio is actually playing to sync spawn timing
  if (!APP.audio || APP.audio.paused || t <= 0.05){
    updateHUD();
    return requestAnimationFrame(loop);
  }
  // spawn notes slightly before their hit time based on speed and distance
  APP.notes.forEach(n => {
    if (!n.spawned && !n.hit && !n.miss){
      // time to travel from NOTE_START_Z to HIT_Z
      const travel = (Math.abs(NOTE_START_Z - HIT_Z)) / SPEED;
      if (t >= n.time - travel){
        spawnNote(n);
        n.spawned = true;
      }
    }
  });

  // move active arrows toward z=HIT_Z
  const dt = 1/60; // approx
  const toRemove = [];
  APP.activeArrows.forEach(n => {
    if (!n.el) { toRemove.push(n); return; }
    const pos = n.el.getAttribute('position');
    let z = pos.z + SPEED * dt;
    n.el.setAttribute('position', `${pos.x} ${pos.y} ${z}`);

    // miss if passed hit line beyond good window
    if (z >= HIT_Z + 0.08){ // a bit beyond
      const delta = t - n.time;
      if (!n.hit && Math.abs(delta) > JUDGE.good){
        n.miss = true;
        n.el.parentNode.removeChild(n.el);
        toRemove.push(n);
        applyJudge('miss');
      }
    }
  });
  // cleanup
  APP.activeArrows = APP.activeArrows.filter(n => !toRemove.includes(n));

  // timer for game mode
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
  // find an active note for this direction closest in time
  let best = null;
  let bestAbs = 999;
  APP.notes.forEach(n => {
    if (n.dir!==dir || n.hit || n.miss) return;
    const d = Math.abs(n.time - t);
    // only consider ones that have spawned or are very near
    if (!n.spawned && d > 0.8) return;
    if (d < bestAbs){
      bestAbs = d; best = n;
    }
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

  // mark hit
  note.hit = true;
  if (note.el && note.el.parentNode){
    // flash
    note.el.setAttribute('material','opacity:0.2');
    setTimeout(()=>{ if (note.el && note.el.parentNode) note.el.parentNode.removeChild(note.el); }, 50);
  }
  applyJudge(result);
}

function applyJudge(j){
  if (j==='perfect'){ APP.score += 100; APP.combo += 1; }
  else if (j==='good'){ APP.score += 70; APP.combo += 1; }
  else { APP.combo = 0; }
  APP.maxCombo = Math.max(APP.maxCombo, APP.combo);

  // small feedback pulse on lane panel?
  // (Optional) could add visual text popups here.
  updateHUD();
}

// Boot
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#click-handler').setAttribute('click-bindings','');
});
