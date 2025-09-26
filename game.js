/* Handwash Quest (Personal Hygiene) - WebXR (A-Frame)
   - 7 steps in order with green indicator on the next target
   - Practice mode (no timer) and Game mode (with countdown)
   - Gaze or click to select targets; big readable HUD for mobile VR
   - Hand tracking can be added by enabling WebXR Hands polyfill/library and mapping pinch to click.
*/
(function(){
  const TEXT = (window.APP_CFG && window.APP_CFG.TEXT) || {hud:0.045, title:0.065, hint:0.04, label:0.042, button:0.05};
  const $ = (sel)=>document.querySelector(sel);
  const $$ = (sel)=>Array.from(document.querySelectorAll(sel));

  const STEPS = [
    { key:'1', label:'ฝ่ามือถูฝ่ามือ', icon:'#img-hands' },
    { key:'2', label:'หลังมือ', icon:'#img-hands' },
    { key:'3', label:'ซอกนิ้ว', icon:'#img-hands' },
    { key:'4', label:'หลังนิ้วมือ', icon:'#img-hands' },
    { key:'5', label:'นิ้วหัวแม่มือ', icon:'#img-hands' },
    { key:'6', label:'ปลายนิ้ว/เล็บ', icon:'#img-hands' },
    { key:'7', label:'รอบข้อมือ', icon:'#img-hands' }
  ];

  const APP = {
    mode: "practice", // practice | game
    score: 0,
    timeLeft: 60,
    stepIndex: 0,
    timerId: null,
    playing: false
  };

  function setTextSize(){
    // apply sizes to key HUD elements
    const set = (id, size)=>{
      const el = $(id);
      if(!el) return;
      const t = el.getAttribute('text') || '';
      el.setAttribute('text', `${t}; width:${size*30}`); // width scales text size indirectly
      el.object3D.scale.setScalar(1.0); // keep scale 1, use width for clarity
    };
    // We rely mainly on width + wrapCount from index.html; sizes are chosen large enough already.
  }

  function playSfx(ok=true){
    const el = ok ? $('#audio-ok') : $('#audio-ng');
    if (!el) return;
    try { el.play(); } catch(e){}
  }

  function showSplash(b=true){
    $('#ui-splash').setAttribute('visible', b);
  }
  function showMenu(b=true){
    $('#ui-menu').setAttribute('visible', b);
  }
  function showHow(b=true){
    $('#ui-how').setAttribute('visible', b);
  }
  function showHUD(b=true){
    $('#hud').setAttribute('visible', b);
  }
  function showStage(b=true){
    $('#stage').setAttribute('visible', b);
  }
  function showResult(b=true){
    $('#ui-result').setAttribute('visible', b);
  }

  function resetGame(){
    APP.score = 0;
    APP.stepIndex = 0;
    APP.timeLeft = 60;
    APP.playing = false;
    updateHUD();
    updateProgress();
    clearTargets();
    spawnTargets();
  }

  function updateHUD(){
    $('#hud-score').setAttribute('text', `value: คะแนน: ${APP.score}; color:#e6f3ff; align:right; width:2.2`);
    $('#hud-timer').setAttribute('text', `value: เวลา: ${APP.mode==='game' ? APP.timeLeft+' วิ' : '--'}; color:#ffd479; align:right; width:2.2`);
    const hint = APP.stepIndex < STEPS.length ? `ขั้นต่อไป: ${STEPS[APP.stepIndex].label}` : 'เสร็จครบแล้ว!';
    $('#hud-hint').setAttribute('text', `value: ${hint}; color:#cfe9ff; align:left; wrapCount:42; width:2.6`);
  }

  function updateProgress(){
    const ratio = Math.min(APP.stepIndex / STEPS.length, 1);
    const totalW = 2.6, leftX = -1.3;
    const fillW = totalW * ratio;
    const fill = $('#progress-fill');
    fill.setAttribute('width', fillW.toFixed(3));
    fill.setAttribute('position', `${leftX + fillW/2} 0 0.01`);
  }

  function startTimer(){
    if (APP.mode!=='game') return;
    if (APP.timerId) clearInterval(APP.timerId);
    APP.timerId = setInterval(()=>{
      APP.timeLeft--;
      if (APP.timeLeft <= 0){
        APP.timeLeft = 0;
        updateHUD();
        endGame();
      } else {
        updateHUD();
      }
    }, 1000);
  }

  function clearTargets(){
    const wrap = $('#target-wrap');
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  }

  function makeTarget(step, i){
    const wrap = $('#target-wrap');
    const x = -1.2 + (i%4)*0.8;
    const y = 0.5 - Math.floor(i/4)*0.7;
    const isNext = (i===APP.stepIndex);
    const ringColor = isNext ? '#26d97a' : '#2a84ff';
    const ringWidth = isNext ? 0.44 : 0.38;
    const target = document.createElement('a-entity');
    target.setAttribute('class', 'clickable');
    target.setAttribute('position', `${x} ${y} 0.02`);
    target.setAttribute('geometry', 'primitive:plane; width:0.5; height:0.5');
    target.setAttribute('material', 'color:#123043; opacity:0.95; shader:standard; metalness:0; roughness:1');

    // icon
    const ico = document.createElement('a-image');
    ico.setAttribute('src', step.icon);
    ico.setAttribute('width', '0.24');
    ico.setAttribute('height', '0.24');
    ico.setAttribute('position', '0 0.06 0.01');
    target.appendChild(ico);

    // label
    const lbl = document.createElement('a-entity');
    lbl.setAttribute('text', `value:${step.key}) ${step.label}; color:#e6f3ff; align:center; width:1.8`);
    lbl.setAttribute('position', '0 -0.16 0.01');
    target.appendChild(lbl);

    // ring indicator
    const ring = document.createElement('a-entity');
    ring.setAttribute('geometry', `primitive:ring; radiusInner:${ringWidth/2-0.01}; radiusOuter:${ringWidth/2}`);
    ring.setAttribute('material', `color:${ringColor}; shader:flat; opacity:${isNext?1:0.5}`);
    ring.setAttribute('position', '0 0 0.005');
    target.appendChild(ring);

    // interaction
    target.addEventListener('click', ()=>onSelect(i));
    wrap.appendChild(target);
  }

  function spawnTargets(){
    STEPS.forEach((s,i)=>makeTarget(s,i));
  }

  function refreshIndicators(){
    const cards = $$('#target-wrap > a-entity');
    cards.forEach((card, i)=>{
      const ring = card.children[2];
      if (!ring) return;
      const isNext = (i===APP.stepIndex);
      ring.setAttribute('material', `color:${isNext?'#26d97a':'#2a84ff'}; shader:flat; opacity:${isNext?1:0.5}`);
      const ringWidth = isNext ? 0.44 : 0.38;
      ring.setAttribute('geometry', `primitive:ring; radiusInner:${ringWidth/2-0.01}; radiusOuter:${ringWidth/2}`);
    });
  }

  function onSelect(i){
    if (!APP.playing) return;
    if (i===APP.stepIndex){
      APP.score += 2;
      APP.stepIndex++;
      playSfx(true);
      updateHUD();
      updateProgress();
      refreshIndicators();
      if (APP.stepIndex>=STEPS.length){
        endGame();
      }
    } else {
      // wrong selection
      APP.score -= 1;
      playSfx(false);
      flashHint('เลือกตามลำดับ (ดูวงเขียว)');
      updateHUD();
    }
  }

  function flashHint(msg){
    const el = $('#hud-hint');
    el.setAttribute('text', `value: ${msg}; color:#ffd479; align:left; wrapCount:42; width:2.6`);
    setTimeout(()=>updateHUD(), 1200);
  }

  function endGame(){
    APP.playing = false;
    if (APP.timerId){ clearInterval(APP.timerId); APP.timerId = null; }
    showStage(false);
    showHUD(false);
    // Summary
    const stars = APP.score >= 12 ? 3 : (APP.score >= 8 ? 2 : 1);
    const line1 = `คะแนนรวม: ${APP.score} คะแนน`;
    const line2 = `ขั้นตอนสำเร็จ: ${Math.min(APP.stepIndex, STEPS.length)} / ${STEPS.length}`;
    const line3 = APP.mode==='game' ? `เวลาคงเหลือ: ${APP.timeLeft} วิ` : 'โหมดฝึก (ไม่มีจับเวลา)';
    const line4 = `ระดับ: ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`;
    $('#result-lines').setAttribute('text', `value: ${line1}\n${line2}\n${line3}\n${line4}; color:#cfe9ff; align:center; wrapCount:40; width:2.2`);
    $('#result-title').setAttribute('text', `value: สรุปผล (อนามัยส่วนบุคคล); color:#e6f3ff; align:center; width:2.6`);
    showResult(true);
  }

  function start(mode){
    APP.mode = mode;
    resetGame();
    showMenu(false);
    showHow(false);
    showHUD(true);
    showStage(true);
    APP.playing = true;
    if (APP.mode==='game') startTimer();
  }

  function backToMenu(){
    if (APP.timerId){ clearInterval(APP.timerId); APP.timerId = null; }
    APP.playing = false;
    showStage(false);
    showHUD(false);
    showResult(false);
    showMenu(true);
  }

  function initUIBindings(){
    $('#btn-splash-continue').addEventListener('click', ()=>{
      showSplash(false);
      showMenu(true);
    });
    $('#btn-how').addEventListener('click', ()=>{
      showMenu(false); showHow(true);
    });
    $('#btn-how-back').addEventListener('click', ()=>{
      showHow(false); showMenu(true);
    });
    $('#btn-practice').addEventListener('click', ()=> start('practice'));
    $('#btn-game').addEventListener('click', ()=> start('game'));
    $('#btn-exit').addEventListener('click', ()=>{
      // simple exit: go back to splash
      showMenu(false); showSplash(true);
    });
    $('#btn-retry').addEventListener('click', ()=>{
      showResult(false); start(APP.mode);
    });
    $('#btn-menu').addEventListener('click', ()=>{
      showResult(false); backToMenu();
    });
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    // enlarge key text elements for visibility on mobile VR
    setTextSize();
    initUIBindings();
    // Start at splash
    showSplash(true);
    showMenu(false);
    showHow(false);
    showHUD(false);
    showStage(false);
    showResult(false);
  });
})();
