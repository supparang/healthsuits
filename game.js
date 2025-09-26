/* Healthy Hero VR — Handwashing 7 Steps (Grade 5)
   WebXR with A-Frame 1.5.0
   English UI, improved splash/menu flow, checked visibility and logic.
*/
(function(){
  const SFX = {
    ding: null, buzz: null, click: null
  };
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
  function visible(id, v){ $(id).setAttribute('visible', v); }
  function setText(id, v){ $(id).setAttribute('value', v); }
  function setImageStep(step){
    const img = APP.stepImages[step-1] || APP.stepImages[0];
    $('stepImage').setAttribute('material', 'src', img);
  }

  AFRAME.registerComponent('handwash-button', {
    schema: { label: {type:'string', default:'Button'}, id:{type:'string', default:''} },
    init: function(){
      const el = this.el;
      const label = this.data.label;
      const text = document.createElement('a-text');
      text.setAttribute('value', label);
      text.setAttribute('align','center');
      text.setAttribute('color','#ffffff');
      text.setAttribute('width','0.8');
      text.setAttribute('position','0 0 0.01');
      el.appendChild(text);

      el.setAttribute('class', (el.getAttribute('class')||'') + ' clickable');
      el.setAttribute('event-set__enter', 'scale: 1.06 1.06 1');
      el.setAttribute('event-set__leave', 'scale: 1 1 1');

      el.addEventListener('click', ()=>{
        playSfx('click');
        const bid = this.data.id || el.id;
        switch (bid) {
          case 'practice': startGame('practice'); break;
          case 'timed': startGame('timed'); break;
          case 'how': showPanel('howto'); break;
          case 'credits': showPanel('credits'); break;
          default:
            if (el.id === 'btnReplay') restart();
            else if (el.id === 'btnMenu') gotoMenu();
            else if (el.id === 'btnBackHow' || el.id === 'btnBackCredits') backToMenu();
        }
      });
    }
  });

  AFRAME.registerComponent('handwash-nodes', {
    init: function(){
      const el = this.el;
      const posList = [
        [-0.60,  0.00, 0.02],
        [-0.35,  0.00, 0.02],
        [-0.10,  0.00, 0.02],
        [ 0.15,  0.00, 0.02],
        [ 0.40,  0.00, 0.02],
        [ 0.65,  0.00, 0.02],
        [ 0.00, -0.12, 0.02]
      ];
      for(let i=1;i<=7;i++){
        const n = document.createElement('a-entity');
        n.setAttribute('id', 'node'+i);
        n.setAttribute('class', 'clickable');
        n.setAttribute('geometry','primitive: circle; radius: 0.042');
        n.setAttribute('material','color:#6b7280; opacity:0.95');
        n.setAttribute('position', `${posList[i-1][0]} ${posList[i-1][1]} ${posList[i-1][2]}`);

        const label = document.createElement('a-text');
        label.setAttribute('value', i.toString());
        label.setAttribute('align','center');
        label.setAttribute('color','#ffffff');
        label.setAttribute('width','0.32');
        label.setAttribute('position','0 0 0.01');
        n.appendChild(label);

        n.addEventListener('click', ()=> onNodeClick(i, n));
        el.appendChild(n);
      }
      refreshNodes();
    }
  });

  function startGame(mode){
    APP.mode = mode;
    APP.step = 1;
    APP.score = 0;
    APP.wrong = 0;
    APP.started = true;
    APP.timeLeft = 60;
    setImageStep(1);

    // Hide all non-game panels
    ['splash','howto','credits','result'].forEach(id=>visible(id,false));
    visible('board', true);
    visible('hud', true);

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
    setText('hudMode', `Mode: ${APP.mode==='timed'?'Timed (60s)':'Practice'}`);
    setText('hudScore', `Score: ${APP.score}`);
    setText('hudTime', APP.mode==='timed' ? `Time: ${APP.timeLeft}s` : 'Time: ∞');
  }

  function refreshNodes(){
    for(let i=1;i<=7;i++){
      const n = $('node'+i);
      const isNext = (i===APP.step);
      if (!n) continue;
      n.setAttribute('material', 'color', isNext ? '#10b981' : '#6b7280');
      n.setAttribute('scale', isNext ? '1.18 1.18 1' : '1 1 1');
    }
  }

  function onNodeClick(i, nodeEl){
    if(!APP.started) return;
    if(i===APP.step){
      APP.score += 10;
      flash(nodeEl, true);
      playSfx('ding');
      APP.step++;
      if(APP.step>7){
        finishGame();
      } else {
        setImageStep(APP.step);
        refreshNodes();
      }
    } else {
      APP.score = Math.max(0, APP.score - 5);
      APP.wrong++;
      flash(nodeEl, false);
      playSfx('buzz');
    }
    refreshHUD();
  }

  function flash(nodeEl, ok){
    nodeEl.setAttribute('material','color', ok ? '#22c55e' : '#ef4444');
    nodeEl.setAttribute('animation__pulse', {
      property: 'scale', dir: 'alternate', dur: 180, loop: 1,
      to: ok ? '1.34 1.34 1' : '0.84 0.84 1', easing: 'easeOutQuad'
    });
    const icon = document.createElement('a-image');
    icon.setAttribute('src', ok ? '#ok' : '#no');
    icon.setAttribute('position','0 0.12 0.01');
    icon.setAttribute('scale','0.18 0.18 0.18');
    nodeEl.appendChild(icon);
    setTimeout(()=> icon.remove(), 420);
  }

  function finishGame(){
    APP.started = false;
    clearInterval(APP.timerHandle);
    visible('board', false);
    visible('hud', true);
    visible('result', true);

    let stars = 1;
    if(APP.wrong<=1 && (APP.mode==='practice' || APP.timeLeft>=20)) stars = 3;
    else if(APP.wrong<=3) stars = 2;

    setText('resultTitle', 'Completed!');
    const used = (APP.mode==='timed') ? (60 - APP.timeLeft) : '—';
    setText('resultDetail', `Score: ${APP.score}  |  Wrong: ${APP.wrong}  |  Time Used: ${used}s`);
    setText('resultStars', '★'.repeat(stars) + '☆'.repeat(3-stars));
  }

  function restart(){
    startGame(APP.mode);
  }
  function gotoMenu(){
    clearInterval(APP.timerHandle);
    APP.started = false;
    visible('result', false);
    visible('board', false);
    visible('hud', false);
    visible('howto', false);
    visible('credits', false);
    visible('splash', true);
  }
  function showPanel(id){
    visible('splash', false);
    visible('howto', id==='howto');
    visible('credits', id==='credits');
  }
  function backToMenu(){ showPanel('splash'); }

  // Keep UI in front of camera at a comfy height
  AFRAME.registerComponent('follow-camera', {
    schema: { dist: {default: 1.6}, yOffset:{default:-0.05} },
    tick: function(){
      const cam = document.querySelector('#camera');
      const uiObj = this.el.object3D;
      if(!cam) return;
      const camObj = cam.object3D;
      const v = new THREE.Vector3(0, this.data.yOffset, -this.data.dist);
      camObj.localToWorld(v);
      uiObj.position.copy(v);
      const q = new THREE.Quaternion();
      camObj.getWorldQuaternion(q);
      uiObj.quaternion.copy(q);
    }
  });

  function playSfx(name){
    const el = SFX[name];
    if(el){ try { el.components && el.components.sound ? el.components.sound.playSound() : el.play(); } catch(e){} }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Bind audio
    SFX.ding = document.querySelector('#ding');
    SFX.buzz = document.querySelector('#buzz');
    SFX.click = document.querySelector('#click');
  });
})();
