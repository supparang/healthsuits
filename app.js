// ===== Utilities =====
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => [...r.querySelectorAll(s)];


const DIFFS = {
easy: { label:'ง่าย', mult: 1.0, timers:{ hygiene:60, nutrition:75, fitness:45 } },
normal: { label:'ปกติ', mult: 1.2, timers:{ hygiene:45, nutrition:60, fitness:30 } },
hard: { label:'ยาก', mult: 1.5, timers:{ hygiene:35, nutrition:50, fitness:25 } },
};


const UI = {
setHUD(mode, score, secs, diff){
qs('#hud-mode').textContent = 'โหมด: ' + mode;
qs('#hud-score').textContent = 'คะแนน: ' + score;
const m = Math.floor(secs / 60).toString().padStart(2,'0');
const s = (secs % 60).toString().padStart(2,'0');
qs('#hud-timer').textContent = `เวลา: ${m}:${s}`;
const d = DIFFS[diff] || DIFFS.normal;
qs('#hud-diff').textContent = `ระดับ: ${d.label} ×${d.mult.toFixed(1)}`;
}
};


// ===== Stats =====
const STATS = {
hygiene: { plays:0, best:0, total:0 },
nutrition:{ plays:0, best:0, total:0 },
fitness: { plays:0, best:0, total:0 },
overall(){ return this.hygiene.total + this.nutrition.total + this.fitness.total; }
};


// ===== Core App State =====
const APP = {
mode: 'เมนู', score: 0, timeLeft: 45, timerId: null, current: null, difficulty: 'normal',
setMode(m){ this.mode = m; UI.setHUD(this.mode,this.score,this.timeLeft,this.difficulty); },
startTimer(sec){ this.timeLeft = sec; clearInterval(this.timerId);
this.timerId = setInterval(()=>{ this.timeLeft--; UI.setHUD(this.mode,this.score,this.timeLeft,this.difficulty); if(this.timeLeft<=0){ this.endMode(); } },1000);
},
mult(){ return (DIFFS[this.difficulty]||DIFFS.normal).mult; },
addScore(n=1){ this.score += Math.max(0, Math.round(n * this.mult())); UI.setHUD(this.mode,this.score,this.timeLeft,this.difficulty); },
goMenu(){ this.setMode('เมนู'); clearInterval(this.timerId); this.showOnly('#menu'); qs('#btn-exit').style.display='none'; try{ const a=qs('#bgm'); a && a.pause(); }catch(e){}
if(this._lastSummary){ alert(this._lastSummary); this._lastSummary=''; }
// show HTML overlay menu
const ov = qs('#menuOverlay'); if(ov) ov.classList.remove('hidden');
}catch(e){}
// After a round, show summary briefly
if(this._lastSummary){ alert(this._lastSummary); this._lastSummary=''; }
},
showOnly(sel){
qsa('#menu, #scene-hygiene, #scene-nutrition, #scene-fitness').forEach(e=>e.setAttribute('visible', false));
qs(sel).setAttribute('visible', true);
const ov = qs('#menuOverlay');
if(ov){ if(sel==='#menu') ov.classList.remove('hidden'); else ov.classList.add('hidden'); }
},
endMode(){
// Update stats by mode
const m = this.current;
if(m){
const S = STATS[m]; S.plays++; S.total += this.score; if(this.score > S.best) S.best = this.score;
}
const sum = `จบโหมด ${this.mode}
คะแนนรอบนี้: ${this.score}
— สถิติโหมด —
เล่น: ${STATS[m].plays} ครั้ง
document.querySelector('a-scene').addEventListener('exit-vr', ensureMenuInFront);
