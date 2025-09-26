/* Hygiene New Start — robust state machine, high UI, timer + result */
(function(){
  const $  = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  const STEPS = [
    'ฝ่ามือถูฝ่ามือ','หลังมือ','ซอกนิ้ว','หลังนิ้วมือ','นิ้วหัวแม่มือ','ปลายนิ้ว/เล็บ','รอบข้อมือ'
  ];
  const ADVICE = [
    'ถูฝ่ามือให้ทั่วอย่างน้อย 20 วินาที',
    'ถูสลับหลังมือทั้งสองข้าง',
    'สอดนิ้วถูซอกนิ้วให้สะอาด',
    'ถูหลังนิ้วมือโดยกำมือสลับ',
    'ถูรอบนิ้วหัวแม่มือเป็นวง',
    'ถูปลายนิ้วและใต้เล็บบนฝ่ามือ',
    'ถูรอบข้อมือทั้งสองข้าง'
  ];

  const state = {
    scene: 'splash', // splash | menu | hygiene | result
    mode: 'practice',
    playing: false,
    step: 0,
    score: 0,
    mistakes: Array(7).fill(0),
    timeLeft: 60,
    timerId: null
  };

  function show(id, on){
    const el = $(id);
    if (!el) return;
    el.setAttribute('visible', !!on);
    // Toggle interactive class
    const btns = el.querySelectorAll('.clickable');
    btns.forEach(b=>{
      const cls = b.getAttribute('class')||'';
      const has = cls.includes('active');
      if (on && !has) b.setAttribute('class', cls + ' active');
      if (!on && has) b.setAttribute('class', cls.replace(' active',''));
    });
    // Move hidden panels out of view & shrink
    if (on){
      el.setAttribute('scale','1 1 1');
      if (el.getAttribute('data-pos')) el.setAttribute('position', el.getAttribute('data-pos'));
    } else {
      if (!el.getAttribute('data-pos')) el.setAttribute('data-pos', el.getAttribute('position'));
      const p = el.getAttribute('position');
      el.setAttribute('position', `${p.x} -999 ${p.z}`);
      el.setAttribute('scale','0.0001 0.0001 0.0001');
    }
  }

  function go(scene){
    state.scene = scene;
    show('#ui-splash', scene==='splash');
    show('#ui-menu',   scene==='menu');
    show('#ui-hygiene',scene==='hygiene');
    show('#ui-result', scene==='result');
  }

  function resetGame(){
    state.step = 0; state.score = 0; state.mistakes = Array(7).fill(0); state.timeLeft = 60;
    spawnGrid(); refreshHUD(); updateProgress();
  }

  function spawnGrid(){
    const wrap = $('#grid'); while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
    STEPS.forEach((name,i)=>{
      const x = -1.1 + (i%4)*0.73;
      const y = 0.3 - Math.floor(i/4)*0.6;
      const card = document.createElement('a-entity');
      card.setAttribute('class','clickable');
      card.setAttribute('position', `${x} ${y} 0`);
      card.setAttribute('geometry','primitive:plane; width:0.64; height:0.38');
      card.setAttribute('material','color:#123043; opacity:0.95');
      const lbl = document.createElement('a-entity');
      lbl.setAttribute('text', `value:${i+1}) ${name}; color:#e6f3ff; align:center; width:2.0`);
      lbl.setAttribute('position','0 -0.09 0.01'); card.appendChild(lbl);
      const img = document.createElement('a-image');
      img.setAttribute('src','#i-hands'); img.setAttribute('width','0.22'); img.setAttribute('height','0.22');
      img.setAttribute('position','0 0.06 0.01'); card.appendChild(img);
      const ring = document.createElement('a-entity');
      const isNext = (i===state.step);
      const rw = isNext?0.56:0.5;
      ring.setAttribute('geometry', `primitive:ring; radiusInner:${rw/2-0.01}; radiusOuter:${rw/2}`);
      ring.setAttribute('material', `color:${isNext?'#26d97a':'#2a84ff'}; shader:flat; opacity:${isNext?1:0.5}`);
      ring.setAttribute('position','0 0 0.02'); card.appendChild(ring);
      card.addEventListener('click', ()=>onPick(i));
      wrap.appendChild(card);
    });
  }

  function refreshHUD(){
    $('#hud-score').setAttribute('text', `value: คะแนน: ${state.score}; color:#e6f3ff; align:right; width:1.8`);
    $('#hud-hint').setAttribute('text', `value: ขั้นต่อไป: ${STEPS[Math.min(state.step,6)] || 'ครบแล้ว!'}; color:#cfe9ff; align:left; wrapCount:48; width:2.4`);
    $('#hud-timer').setAttribute('text', `value: เวลา: ${state.mode==='game' ? (state.timeLeft+' วิ') : '--'}; color:#ffd479; align:right; width:1.6`);
  }

  function updateProgress(){
    const ratio = Math.min(state.step / 7, 1);
    const totalW = 2.4, leftX = -1.2;
    const fillW = totalW * ratio;
    $('#progress-fill').setAttribute('width', fillW.toFixed(3));
    $('#progress-fill').setAttribute('position', `${leftX + fillW/2} 0 0.01`);
  }

  function refreshIndicators(){
    const cards = $$('#grid > a-entity');
    cards.forEach((c, i)=>{
      const ring = c.children[2];
      const isNext = (i===state.step);
      ring.setAttribute('material', `color:${isNext?'#26d97a':'#2a84ff'}; shader:flat; opacity:${isNext?1:0.5}`);
      const rw = isNext?0.56:0.5;
      ring.setAttribute('geometry', `primitive:ring; radiusInner:${rw/2-0.01}; radiusOuter:${rw/2}`);
    });
  }

  function onPick(i){
    if (!state.playing) return;
    if (i===state.step){
      state.score += 2; state.step++;
      refreshHUD(); updateProgress(); refreshIndicators();
      if (state.step>=7) endGame();
    } else {
      state.score -= 1;
      const target = Math.min(state.step, 6);
      state.mistakes[target] += 1;
      flashHint('เลือกตามลำดับ (ดูวงสีเขียว)');
      refreshHUD();
    }
  }

  function flashHint(msg){
    const el = $('#hud-hint');
    el.setAttribute('text', `value: ${msg}; color:#ffd479; align:left; wrapCount:48; width:2.4`);
    setTimeout(()=>refreshHUD(), 1100);
  }

  function start(mode){
    state.mode = mode;
    state.playing = true;
    go('hygiene');
    resetGame();
    if (state.mode==='game') startTimer();
  }

  function startTimer(){
    stopTimer();
    state.timerId = setInterval(()=>{
      state.timeLeft--;
      if (state.timeLeft<=0){ state.timeLeft=0; refreshHUD(); endGame(); }
      else refreshHUD();
    }, 1000);
  }
  function stopTimer(){ if (state.timerId){ clearInterval(state.timerId); state.timerId=null; } }

  function buildAdvice(){
    const lines = [];
    for (let i=0;i<7;i++){
      if (state.mistakes[i]>0 || state.step<=i){
        lines.push(`• ขั้นที่ ${i+1}: ${ADVICE[i]}`);
      }
    }
    return lines.length? lines.slice(0,6).join('\\n') : 'เยี่ยมมาก! คุณทำครบและถูกต้องทั้งหมด';
  }

  function endGame(){
    state.playing = false;
    stopTimer();
    const stars = state.score >= 12 ? 3 : (state.score >= 8 ? 2 : 1);
    const line1 = `คะแนนรวม: ${state.score} คะแนน`;
    const line2 = `ขั้นตอนสำเร็จ: ${Math.min(state.step,7)} / 7`;
    const line3 = state.mode==='game' ? `เวลาคงเหลือ: ${state.timeLeft} วิ` : 'โหมดฝึก (ไม่มีจับเวลา)';
    const line4 = `ระดับ: ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`;
    $('#result-lines').setAttribute('text', `value: ${line1}\\n${line2}\\n${line3}\\n${line4}; color:#cfe9ff; align:center; wrapCount:44; width:2.4`);
    $('#result-advice').setAttribute('text', `value: คำแนะนำ:\\n${buildAdvice()}; color:#a9d6ff; align:center; wrapCount:44; width:2.4`);
    go('result');
  }

  function bindUI(){
    $('#btn-to-menu').addEventListener('click', ()=> go('menu'));
    $('#btn-exit').addEventListener('click', ()=> go('splash'));
    $('#btn-start-practice').addEventListener('click', ()=> start('practice'));
    $('#btn-start-game').addEventListener('click', ()=> start('game'));
    $('#btn-menu').addEventListener('click', ()=>{ stopTimer(); state.playing=false; go('menu'); });
    $('#btn-restart').addEventListener('click', ()=> start(state.mode));
    $('#btn-result-retry').addEventListener('click', ()=> start(state.mode));
    $('#btn-result-menu').addEventListener('click', ()=>{ stopTimer(); go('menu'); });
  }

  // Extra guard: while playing, ensure splash/menu are off
  function tickEnforce(){
    if (state.playing){
      const splash = $('#ui-splash'); const menu = $('#ui-menu');
      if (splash && splash.getAttribute('visible')) show('#ui-splash', false);
      if (menu && menu.getAttribute('visible')) show('#ui-menu', false);
    }
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    bindUI();
    go('splash');
    setInterval(tickEnforce, 300);
  });
})();
