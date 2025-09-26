/* Healthy Hero VR: Handwash 7 Steps (P.5)
   A-Frame 1.5.0
   - Two modes: Practice (no timer) and Timed (60s)
   - HUD shows mode, time, score
   - 7 steps sequence with visual nodes; green = next step
   - Correct => +10, Wrong => -5
   - Summary with stars (1–3)
*/
(function(){
  const APP = {
    mode: "practice",       // 'practice' | 'timed'
    step: 1,                // 1..7
    score: 0,
    wrong: 0,
    timeLeft: 60,
    timerHandle: null,
    stepImages: ["#step1","#step2","#step3","#step4","#step5","#step6","#step7"],
    started: false
  };

  const $ = (id)=> document.getElementById(id);

  // Simple button component with hover/fuse feedback
  AFRAME.registerComponent('handwash-button', {
    schema: { label: {type:'string', default:'ปุ่ม'} },
    init: function(){
      const el = this.el;
      const label = this.data.label;
      const text = document.createElement('a-text');
      text.setAttribute('value', label);
      text.setAttribute('align','center');
      text.setAttribute('color','#ffffff');
      text.setAttribute('width','0.7');
      text.setAttribute('position','0 0 0.01');
      el.appendChild(text);

      el.setAttribute('class', (el.getAttribute('class')||'') + ' clickable');
      el.setAttribute('event-set__enter', 'scale: 1.05 1.05 1');
      el.setAttribute('event-set__leave', 'scale: 1 1 1');

      el.addEventListener('click', ()=>{
        if (el.id === 'btnPractice') { startGame('practice'); }
        else if (el.id === 'btnTimed') { startGame('timed'); }
        else if (el.id === 'btnReplay') { restart(); }
        else if (el.id === 'btnMenu') { gotoMenu(); }
      });
    }
  });

  // Create 7 nodes dynamically and manage interactions
  AFRAME.registerComponent('handwash-nodes', {
    init: function(){
      const el = this.el;
      const positions = [
        {-0.65:0} // dummy to align 1-indexed; we'll ignore index 0
      ];
      // Predefined around the bottom area for visibility
      const posList = [
        [-0.60,  0.00, 0.02],
        [-0.35,  0.00, 0.02],
        [-0.10,  0.00, 0.02],
        [ 0.15,  0.00, 0.02],
        [ 0.40,  0.00, 0.02],
        [ 0.65,  0.00, 0.02],
        [ 0.00, -0.10, 0.02]
      ];
      for(let i=1;i<=7;i++){
        const n = document.createElement('a-entity');
        n.setAttribute('id', 'node'+i);
        n.setAttribute('class', 'clickable');
        n.setAttribute('geometry','primitive: circle; radius: 0.04');
        n.setAttribute('material','color:#6b7280; opacity:0.95');
        n.setAttribute('position', `${posList[i-1][0]} ${posList[i-1][1]} ${posList[i-1][2]}`);

        const label = document.createElement('a-text');
        label.setAttribute('value', i.toString());
        label.setAttribute('align','center');
        label.setAttribute('color','#ffffff');
        label.setAttribute('width','0.3');
        label.setAttribute('position','0 0 0.01');
        n.appendChild(label);

        n.addEventListener('click', ()=> onNodeClick(i, n));
        el.appendChild(n);
      }
      refreshNodes();
    }
  });

  function setVisible(id, v){ $(id).setAttribute('visible', v); }
  function setText(id, v){ $(id).setAttribute('value', v); }
  function setImageStep(step){
    const img = APP.stepImages[step-1] || APP.stepImages[0];
    $('stepImage').setAttribute('material', 'src', img);
  }

  function startGame(mode){
    APP.mode = mode;
    APP.step = 1;
    APP.score = 0;
    APP.wrong = 0;
    APP.started = true;
    APP.timeLeft = 60;
    setImageStep(1);

    setVisible('splash', false);
    setVisible('result', false);
    setVisible('board', true);
    setVisible('hud', true);

    refreshNodes();
    refreshHUD();

    clearInterval(APP.timerHandle);
    if(mode==='timed'){
      APP.timerHandle = setInterval(()=>{
        APP.timeLeft--;
        if(APP.timeLeft<=0){
          APP.timeLeft = 0;
          clearInterval(APP.timerHandle);
          finishGame();
        }
        refreshHUD();
      }, 1000);
    }
  }

  function refreshHUD(){
    setText('hudMode', `โหมด: ${APP.mode==='timed'?'จับเวลา (60s)':'ฝึก (ไม่จับเวลา)'}`);
    setText('hudScore', `คะแนน: ${APP.score}`);
    setText('hudTime', APP.mode==='timed' ? `เวลา: ${APP.timeLeft}s` : 'เวลา: ∞');
  }

  function refreshNodes(){
    for(let i=1;i<=7;i++){
      const n = $('node'+i);
      const isNext = (i===APP.step);
      n.setAttribute('material', 'color', isNext ? '#10b981' : '#6b7280'); // green for next
      n.setAttribute('scale', isNext ? '1.2 1.2 1' : '1 1 1');
    }
  }

  function onNodeClick(i, nodeEl){
    if(!APP.started) return;
    if(i===APP.step){
      // correct
      APP.score += 10;
      setFlash(nodeEl, true);
      APP.step++;
      if(APP.step>7){
        finishGame();
      } else {
        setImageStep(APP.step);
        refreshNodes();
      }
    } else {
      // wrong
      APP.score = Math.max(0, APP.score - 5);
      APP.wrong++;
      setFlash(nodeEl, false);
    }
    refreshHUD();
  }

  function setFlash(nodeEl, ok){
    nodeEl.setAttribute('material','color', ok ? '#22c55e' : '#ef4444');
    nodeEl.setAttribute('animation__pulse', {
      property: 'scale', dir: 'alternate', dur: 180, loop: 1,
      to: ok ? '1.35 1.35 1' : '0.8 0.8 1', easing: 'easeOutQuad'
    });
    // tiny OK/NO icon above node
    const icon = document.createElement('a-image');
    icon.setAttribute('src', ok ? '#ok' : '#no');
    icon.setAttribute('position','0 0.1 0.01');
    icon.setAttribute('scale','0.18 0.18 0.18');
    nodeEl.appendChild(icon);
    setTimeout(()=> icon.remove(), 400);
  }

  function finishGame(){
    APP.started = false;
    clearInterval(APP.timerHandle);

    // stars by performance
    let stars = 1;
    if(APP.wrong<=1 && (APP.mode==='practice' || APP.timeLeft>=20)) stars = 3;
    else if(APP.wrong<=3) stars = 2;

    setVisible('board', false);
    setVisible('hud', true);
    setVisible('result', true);

    setText('resultTitle', 'เสร็จสิ้น!');
    const used = (APP.mode==='timed') ? (60 - APP.timeLeft) : '—';
    setText('resultDetail', `คะแนน: ${APP.score}  |  ผิด: ${APP.wrong} ครั้ง  |  เวลาใช้ไป: ${used}s`);
    setText('resultStars', '★'.repeat(stars) + '☆'.repeat(3-stars));
  }

  function restart(){
    startGame(APP.mode);
  }

  function gotoMenu(){
    clearInterval(APP.timerHandle);
    APP.started = false;
    setVisible('result', false);
    setVisible('board', false);
    setVisible('hud', false);
    setVisible('splash', true);
  }

  // Keep panel pinned in front of camera
  function tick(){
    const cam = document.querySelector('#camera');
    const ui = document.querySelector('#uiRoot');
    if(!cam || !ui) return;
    const camObj = cam.object3D;
    const uiObj = ui.object3D;
    // position a bit in front of camera and slightly down for comfortable view
    const dist = 1.6;
    const v = new THREE.Vector3(0, -0.05, -dist);
    camObj.localToWorld(v);
    uiObj.position.copy(v);

    // face the camera
    const q = new THREE.Quaternion();
    camObj.getWorldQuaternion(q);
    uiObj.quaternion.copy(q);
  }

  AFRAME.registerComponent('follow-camera', {
    tick: tick
  });

  // Attach follow-camera to uiRoot
  document.addEventListener('DOMContentLoaded', ()=>{
    const ui = document.querySelector('#uiRoot');
    ui.setAttribute('follow-camera','');
  });
})();
