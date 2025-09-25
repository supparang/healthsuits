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


document.querySelector('a-scene').addEventListener('exit-vr', ensureMenuInFront);
