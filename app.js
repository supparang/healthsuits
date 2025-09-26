/* WebXR Health Game — Clean Start (Hygiene only) */
(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));

  const STEPS = [
    'ฝ่ามือถูฝ่ามือ','หลังมือ','ซอกนิ้ว','หลังนิ้วมือ','นิ้วหัวแม่มือ','ปลายนิ้ว/เล็บ','รอบข้อมือ'
  ];

  const state = { step:0, score:0 };

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
    $('#hud-score').setAttribute('text', `value: คะแนน: ${state.score}; color:#e6f3ff; align:right; width:2.0`);
    $('#hud-hint').setAttribute('text', `value: ขั้นต่อไป: ${STEPS[Math.min(state.step,6)] || 'ครบแล้ว!'}; color:#cfe9ff; align:left; wrapCount:48; width:2.4`);
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
    if (i===state.step){ state.score += 2; state.step++; if (state.step>=7){ finish(); } }
    else { state.score -= 1; flashHint('เลือกตามลำดับ (ดูวงสีเขียว)'); }
    refreshHUD(); refreshIndicators();
  }

  function flashHint(msg){
    const el = $('#hud-hint');
    el.setAttribute('text', `value: ${msg}; color:#ffd479; align:left; wrapCount:48; width:2.4`);
    setTimeout(()=>refreshHUD(), 1100);
  }

  function finish(){
    // Simple end toast
    flashHint(`เยี่ยม! ทำครบทั้ง 7 ขั้นตอน คะแนนรวม ${state.score}`);
  }

  function show(id, on){ $(id).setAttribute('visible', !!on); }

  function bindUI(){
    $('#btn-to-menu').addEventListener('click', ()=>{ show('#ui-splash',false); show('#ui-menu',true); });
    $('#btn-hygiene').addEventListener('click', ()=>{
      state.step=0; state.score=0; spawnGrid(); refreshHUD();
      show('#ui-menu',false); show('#ui-hygiene',true);
    });
    $('#btn-back-menu').addEventListener('click', ()=>{ show('#ui-hygiene',false); show('#ui-menu',true); });
    $('#btn-restart').addEventListener('click', ()=>{ state.step=0; state.score=0; spawnGrid(); refreshHUD(); });
    // Disabled for now:
    $('#btn-nutrition').addEventListener('click', ()=>{});
    $('#btn-fitness').addEventListener('click', ()=>{});
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    bindUI();
    show('#ui-splash',true); show('#ui-menu',false); show('#ui-hygiene',false);
  });
})();
