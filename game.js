// V2 English: polished neon UI, colored arrows/glow, particles, sfx, stars, hand-tracking, safe gaze.
const JUDGE = { perfect: 0.14, good: 0.28 };
const SPEED = 1.05;
const NOTE_START_Z = -1.8;
const HIT_Z = 0.0;
const SONG_OFFSET = 0.25;

function buildBeatmap(bpm=102){
  const secPerBeat = 60 / bpm;
  const dirs = ['up','left','right','down'];
  const map = [];
  let t = SONG_OFFSET;
  for (let i=0;i<72;i++){
    map.push({time: t, dir: dirs[i%4]});
    if (i%8===4) map.push({time: t + secPerBeat*0.5, dir: dirs[(i+2)%4]});
    if (i%16===8) map.push({time: t + secPerBeat*0.25, dir: dirs[(i+1)%4]});
    t += secPerBeat;
  }
  return map;
}
const BEATMAP = buildBeatmap(102);

function spawnPopup(text, color, atPos){
  const root = APP.arena || document.querySelector('a-scene');
  const e = document.createElement('a-entity');
  const x = atPos?.x ?? 0, y = (atPos?.y ?? 1.6) + 0.14, z = (APP.arena ? 0 : -1.6);
  e.setAttribute('position', `${x} ${y} ${z}`);
  e.innerHTML = `<a-text shader="msdf" negate="false" material="depthTest:false; transparent:true" value="${text}" color="${color}" width="0.9" align="center"></a-text>`;
  root.appendChild(e);
  e.setAttribute('animation__move', 'property: position; to: ' + x + ' ' + (y+0.22) + ' ' + z + '; dur: 520; easing: easeOutQuad');
  e.setAttribute('animation__fade', 'property: components.text.material.opacity; to: 0; dur: 520; delay: 80; easing: linear');
  setTimeout(()=>{ e.remove(); }, 640);
}

function computeStars(stats){
  const total = Math.max(1, stats.total);
  const acc = (stats.perfect + stats.good) / total * 100;
  if (acc >= 90) return 3;
  if (acc >= 70) return 2;
  return 1;
}
function starString(n){ return '★'.repeat(n) + '☆'.repeat(3-n); }

function worldPos(el){
  if (!el || !el.object3D) return {x:0,y:0,z:0};
  const v = new THREE.Vector3(); el.object3D.getWorldPosition(v);
  return {x:v.x,y:v.y,z:v.z};
}

function burst(x,y,z,color='#fff'){
  const root = APP.arena || document.querySelector('a-scene');
  for (let i=0;i<8;i++){
    const p = document.createElement('a-entity');
    p.setAttribute('position', `${x} ${y} ${z}`);
    p.innerHTML = `<a-sphere radius="0.01" color="${color}" material="opacity:0.9; metalness:0.2; roughness:0.1; depthTest:false"></a-sphere>`;
    root.appendChild(p);
    const dx = (Math.random()*2-1)*0.2;
    const dy = (Math.random()*2-1)*0.2 + 0.06;
    const dz = (Math.random()*2-1)*0.05;
    p.setAttribute('animation__move', `property: position; to: ${x+dx} ${y+dy} ${z+dz}; dur: 380; easing: easeOutQuad`);
    p.setAttribute('animation__fade', `property: components.sphere.material.opacity; to: 0; dur: 380; easing: linear`);
    setTimeout(()=>{ p.remove(); }, 400);
  }
}

window.APP = { state:"splash", mode:"game", timer:60, score:0, combo:0, maxCombo:0,
  perfectCount:0, goodCount:0, missCount:0, notes:[], activeArrows:[], audio:null, arena:null };

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
      el.addEventListener('mouseenter', () => el.setAttribute('scale','1.06 1.06 1'));
      el.addEventListener('mouseleave', () => el.setAttribute('scale','1 1 1'));
    });
  }
});

function $(sel){ return document.querySelector(sel); }
function setVisible(id, v){ const el=$(id); if (el) el.setAttribute('visible', v); }

function setMenuClickables(enabled){
  const ids = ['#btn-play','#btn-practice','#btn-howto','#btn-back-menu'];
  ids.forEach(id => {
    const el = document.querySelector(id);
    if (!el) return;
    const cls = el.getAttribute('class') || '';
    const has = cls.split(' ').includes('clickable');
    if (enabled && !has) el.setAttribute('class', (cls + ' clickable').trim());
    if (!enabled && has) el.setAttribute('class', cls.split(' ').filter(c=>c!=='clickable').join(' '));
  });
}

function showMenu(){ APP.state='menu';
  setVisible('#ui-splash', false); setVisible('#ui-howto', false);
  setVisible('#arena', false); setVisible('#hud', false);
  setVisible('#ui-menu', true); setMenuClickables(true); stopAudio(); }

function showHowto(){ APP.state='howto';
  setVisible('#ui-menu', false); setVisible('#ui-howto', true); setMenuClickables(true); }

function updateHUD(){
  const tl = $('#hud-left'), tm = $('#hud-mid'), tr = $('#hud-right');
  tl.setAttribute('value', APP.mode==='game' ? `Time: ${Math.max(0, Math.ceil(APP.timer))}` : `Practice`);
  tm.setAttribute('value', `Combo: ${APP.combo}`);
  tr.setAttribute('value', `Score: ${APP.score}`);
}

function startGame(mode){
  setMenuClickables(false);
  APP.mode = mode; APP.state = 'playing';
  APP.timer = (mode==='game') ? 60 : 0;
  APP.score = 0; APP.combo = 0; APP.maxCombo = 0;
  APP.perfectCount = 0; APP.goodCount = 0; APP.missCount = 0;
  APP.notes = BEATMAP.map(n => ({...n, hit:false, miss:false, spawned:false, el:null, outlineEl:null}));
  APP.activeArrows = []; APP.arena = $('#arena');
  setVisible('#ui-menu', false); setVisible('#ui-howto', false);
  setVisible('#arena', true); setVisible('#hud', true);
  updateHUD(); startAudio(); requestAnimationFrame(loop);
}

function finishGame(){
  APP.state='finished'; stopAudio();
  const totalNotes = APP.notes.filter(n => n.spawned || n.hit || n.miss).length || APP.notes.length;
  const stats = {perfect: APP.perfectCount, good: APP.goodCount, miss: APP.missCount, total: totalNotes};
  const stars = computeStars(stats);
  const acc = Math.round((stats.perfect + stats.good) / Math.max(1, stats.total) * 100);
  const overlay = document.createElement('a-entity');
  overlay.setAttribute('position','0 1.6 -1.45');
  overlay.innerHTML = `
    <a-plane width="2.4" height="1.4" color="#0b1226" material="opacity:0.92; depthTest:false; transparent:true"></a-plane>
    <a-text shader="msdf" negate="false" material="depthTest:false; transparent:true" value="Results" color="#e5e7eb" width="2.0" align="center" position="0 0.46 0.03"></a-text>
    <a-text shader="msdf" negate="false" material="depthTest:false; transparent:true" value="Score: ${APP.score}   Max Combo: ${APP.maxCombo}" color="#cbd5e1" width="1.9" align="center" position="0 0.2 0.03"></a-text>
    <a-text shader="msdf" negate="false" material="depthTest:false; transparent:true" value="Accuracy: ${acc}%   Perfect: ${APP.perfectCount}   Good: ${APP.goodCount}   Miss: ${APP.missCount}" color="#cbd5e1" width="2.0" align="center" position="0 -0.02 0.03"></a-text>
    <a-text shader="msdf" negate="false" material="depthTest:false; transparent:true" value="${starString(stars)}" color="#ffd166" width="1.2" align="center" position="0 -0.28 0.03"></a-text>
    <a-plane id="btn-retry" class="clickable" width="1.4" height="0.26" color="#60a5fa" position="0 -0.54 0" material="depthTest:false; transparent:true">
      <a-text shader="msdf" negate="false" material="depthTest:false; transparent:true" value="Back to Menu" align="center" color="#032d4a" width="1.0" position="0 0 0.03"></a-text>
    </a-plane>`;
  document.querySelector('a-scene').appendChild(overlay);
  overlay.querySelector('#btn-retry').addEventListener('click', () => { overlay.remove(); showMenu(); });
}

function getSongTime(){ return APP.audio ? APP.audio.currentTime : 0; }
function startAudio(){ const el = document.getElementById('bgm'); APP.audio = el; try{ el.currentTime=0; }catch(e){} el.play().catch(()=>{}); }
function stopAudio(){ if (APP.audio){ try{ APP.audio.pause(); }catch(e){} } }

function spawnNote(note){
  const root = document.querySelector('#spawn-root');
  const imgId = note.dir==='up'?'#arrowUpImg': note.dir==='down'?'#arrowDownImg': note.dir==='left'?'#arrowLeftImg':'#arrowRightImg';
  const outlineId = note.dir==='up'?'#arrowUpOutlineImg': note.dir==='down'?'#arrowDownOutlineImg': note.dir==='left'?'#arrowLeftOutlineImg':'#arrowRightOutlineImg';
  const pos = dirToLaneXY(note.dir);
  const out = document.createElement('a-image');
  out.setAttribute('src', outlineId);
  out.setAttribute('position', `${pos.x} ${pos.y} ${NOTE_START_Z - 0.006}`);
  out.setAttribute('width', '0.52'); out.setAttribute('height', '0.52');
  out.setAttribute('material', 'transparent:true; opacity:0.95; depthTest:false');
  root.appendChild(out);
  const el = document.createElement('a-image');
  el.setAttribute('src', imgId);
  el.setAttribute('position', `${pos.x} ${pos.y} ${NOTE_START_Z}`);
  el.setAttribute('width', '0.42'); el.setAttribute('height', '0.42');
  el.setAttribute('material', 'transparent:true;opacity:1; depthTest:false');
  root.appendChild(el);
  note.el = el; note.outlineEl = out; APP.activeArrows.push(note);
}

function dirToLaneXY(dir){
  switch(dir){
    case 'up': return {x:0, y:0.62};
    case 'left': return {x:-0.9, y:0.2};
    case 'right': return {x:0.9, y:0.2};
    case 'down': return {x:0, y:-0.22};
  } return {x:0,y:0};
}

function loop(){
  if (APP.state!=='playing') return;
  const t = getSongTime();
  if (!APP.audio || APP.audio.paused || t <= 0.05){ updateHUD(); return requestAnimationFrame(loop); }
  APP.notes.forEach(n => {
    if (!n.spawned && !n.hit && !n.miss){
      const travel = Math.abs(NOTE_START_Z - HIT_Z) / SPEED;
      if (t >= n.time - travel){ spawnNote(n); n.spawned = true; }
    }
  });
  const dt = 1/60, toRemove = [];
  APP.activeArrows.forEach(n => {
    if (!n.el){ toRemove.push(n); return; }
    const pos = n.el.getAttribute('position');
    const z = pos.z + SPEED * dt;
    n.el.setAttribute('position', `${pos.x} ${pos.y} ${z}`);
    if (n.outlineEl) n.outlineEl.setAttribute('position', `${pos.x} ${pos.y} ${z-0.006}`);
    if (z >= HIT_Z + 0.08){
      const delta = t - n.time;
      if (!n.hit && Math.abs(delta) > JUDGE.good){
        n.miss = true; if (n.el) n.el.remove(); if (n.outlineEl) n.outlineEl.remove();
        toRemove.push(n); applyJudge('miss', n.dir);
      }
    }
  });
  APP.activeArrows = APP.activeArrows.filter(n => !toRemove.includes(n));
  if (APP.mode==='game'){ APP.timer -= dt; if (APP.timer <= 0){ APP.timer = 0; updateHUD(); return finishGame(); } }
  updateHUD(); requestAnimationFrame(loop);
}

function nearestNoteForDir(dir){
  const t = getSongTime(); let best=null, bestAbs=999;
  APP.notes.forEach(n => {
    if (n.dir!==dir || n.hit || n.miss) return;
    const d = Math.abs(n.time - t);
    if (!n.spawned && d > 0.8) return;
    if (d < bestAbs){ bestAbs = d; best = n; }
  }); return best;
}

function tryHit(dir){
  if (APP.state!=='playing') return;
  const note = nearestNoteForDir(dir);
  if (!note) { applyJudge('miss', dir); return; }
  const delta = Math.abs(getSongTime() - note.time);
  let result = 'miss';
  if (delta <= JUDGE.perfect) result = 'perfect';
  else if (delta <= JUDGE.good) result = 'good';
  if (result === 'miss'){ applyJudge('miss', dir); return; }
  note.hit = true; if (note.el) note.el.remove(); if (note.outlineEl) note.outlineEl.remove();
  const p = dirToLaneXY(dir);
  spawnPopup(result.toUpperCase(), result==='perfect' ? '#86efac' : '#93c5fd', {x:p.x, y:p.y});
  burst(p.x, p.y, 0.02, result==='perfect' ? '#86efac' : '#93c5fd');
  applyJudge(result, dir);
}

function playSfx(id){ const el=document.getElementById(id); if (!el) return; try{ el.currentTime=0; el.play(); }catch(e){} }
function applyJudge(j, dir){
  if (j==='perfect'){ APP.score += 120; APP.combo += 1; APP.perfectCount += 1; playSfx('sfxPerfect'); }
  else if (j==='good'){ APP.score += 80; APP.combo += 1; APP.goodCount += 1; playSfx('sfxGood'); }
  else { APP.combo = 0; APP.missCount += 1; playSfx('sfxMiss'); }
  APP.maxCombo = Math.max(APP.maxCombo, APP.combo); updateHUD();
}

function setupPinchHandlers(){
  ['#leftHand','#rightHand'].forEach(id => {
    const hand = document.querySelector(id); if (!hand) return;
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
      lanes.forEach(L => { const p = worldPos(L.el); const d = Math.hypot(hpos.x - p.x, hpos.y - p.y); if (d < bestD){ bestD = d; best = L; } });
      if (best) tryHit(best.dir);
    });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#click-handler').setAttribute('click-bindings','');
  setupPinchHandlers();
});
