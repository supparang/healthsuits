/* Healthy Hero VR (Integrated, Fixed Raycaster)
   Modules: Main Menu + Personal Hygiene (Handwashing 7 Steps).
   A-Frame 1.5.0 — English UI.
*/
(function(){
  const SFX = { ding:null, buzz:null, click:null };
  const APP = {
    activeModule: null,
    mode: "practice",
    step: 1,
    score: 0,
    wrong: 0,
    timeLeft: 60,
    timerHandle: null,
    stepImages: ["#step1","#step2","#step3","#step4","#step5","#step6","#step7"],
    started: false
  };

  const $ = (id)=> document.getElementById(id);
  const show = (id, v)=> $(id).setAttribute('visible', v);
  const setText = (id, v)=> $(id).setAttribute('value', v);

  AFRAME.registerComponent('hh-button', {
    schema: { label: {type:'string', default:'Button'}, id:{type:'string', default:''} },
    init: function(){
      const el = this.el;
      const label = this.data.label;
      const text = document.createElement('a-text');
      text.setAttribute('value', label);
      text.setAttribute('align','center');
      text.setAttribute('color','#ffffff');
      text.setAttribute('width','0.9');
      text.setAttribute('position','0 0 0.01');
      el.appendChild(text);

      el.setAttribute('class', (el.getAttribute('class')||'') + ' clickable');
      el.setAttribute('event-set__enter', 'scale: 1.06 1.06 1');
      el.setAttribute('event-set__leave', 'scale: 1 1 1');

      el.addEventListener('click', ()=>{
        playSfx('click');
        const id = this.data.id || el.id;
        routeButton(id);
      });
    }
  });

  function routeButton(id){
    switch(id){
      case 'goHygiene': openHygieneMenu(); break;
      case 'goNutrition': openNutrition(); break;
      case 'goExercise': openExercise(); break;
      case 'practice': startHygiene('practice'); break;
      case 'timed': startHygiene('timed'); break;
      case 'how': openHowTo(); break;
      case 'backMain': backToMain(); break;
      case 'backModuleMenu': backToModuleMenu(); break;
      default: break;
    }
  }

  function hideAllPanels(){
    ['mainMenu','hygieneMenu','howto','nutritionPanel','exercisePanel','board','hud','result'].forEach(id=> show(id,false));
  }
  function backToMain(){
    clearTimer();
    APP.started = false;
    hideAllPanels();
    show('mainMenu', true);
    APP.activeModule = null;
  }
  function openHygieneMenu(){
    hideAllPanels();
    show('hygieneMenu', true);
    APP.activeModule = 'hygiene';
  }
  function backToModuleMenu(){
    if(APP.activeModule==='hygiene'){ openHygieneMenu(); }
    else if(APP.activeModule==='nutrition'){ openNutrition(); }
    else if(APP.activeModule==='exercise'){ openExercise(); }
  }
  function openNutrition(){
    hideAllPanels();
    show('nutritionPanel', true);
    APP.activeModule = 'nutrition';
  }
  function openExercise(){
    hideAllPanels();
    show('exercisePanel', true);
    APP.activeModule = 'exercise';
  }
  function openHowTo(){
    hideAllPanels();
    show('howto', true);
  }

  // HYGIENE game
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

        n.addEventListener('click', ()=> onHygieneNode(i, n));
        el.appendChild(n);
      }
      refreshHygieneNodes();
    }
  });

  function startHygiene(mode){
    APP.activeModule = 'hygiene';
    APP.mode = mode;
    APP.step = 1;
    APP.score = 0;
    APP.wrong = 0;
    APP.started = true;
    APP.timeLeft = 60;
    setHygieneImage(1);

    hideAllPanels();
    show('board', true);
    show('hud', true);

    refreshHygieneNodes();
    refreshHUD();

    clearTimer();
    if(mode==='timed'){
      APP.timerHandle = setInterval(()=>{
        APP.timeLeft--;
        if(APP.timeLeft<=0){
          APP.timeLeft = 0;
          clearTimer();
          finishHygiene();
        }
        refreshHUD();
      }, 1000);
    }
  }

  function restartHygiene(){ startHygiene(APP.mode); }

  function setHygieneImage(step){
    const img = APP.stepImages[step-1] || APP.stepImages[0];
    $('stepImage').setAttribute('material', 'src', img);
  }

  function refreshHUD(){
    setText('hudMode', `Mode: ${APP.mode==='timed'?'Timed (60s)':'Practice'}`);
    setText('hudScore', `Score: ${APP.score}`);
    setText('hudTime', APP.mode==='timed' ? `Time: ${APP.timeLeft}s` : 'Time: ∞');
  }

  function refreshHygieneNodes(){
    for(let i=1;i<=7;i++){
      const n = $('node'+i);
      const isNext = (i===APP.step);
      if (!n) continue;
      n.setAttribute('material', 'color', isNext ? '#10b981' : '#6b7280');
      n.setAttribute('scale', isNext ? '1.18 1.18 1' : '1 1 1');
    }
  }

  function onHygieneNode(i, nodeEl){
    if(!APP.started || APP.activeModule!=='hygiene') return;
    if(i===APP.step){
      APP.score += 10;
      flash(nodeEl, true);
      playSfx('ding');
      APP.step++;
      if(APP.step>7){
        finishHygiene();
      } else {
        setHygieneImage(APP.step);
        refreshHygieneNodes();
      }
    } else {
      APP.score = Math.max(0, APP.score - 5);
      APP.wrong++;
      flash(nodeEl, false);
      playSfx('buzz');
    }
    refreshHUD();
  }

  function finishHygiene(){
    APP.started = false;
    clearTimer();
    show('board', false);
    show('hud', true);
    show('result', true);

    let stars = 1;
    if(APP.wrong<=1 && (APP.mode==='practice' || APP.timeLeft>=20)) stars = 3;
    else if(APP.wrong<=3) stars = 2;

    setText('resultTitle', 'Completed!');
    const used = (APP.mode==='timed') ? (60 - APP.timeLeft) : '—';
    setText('resultDetail', `Score: ${APP.score}  |  Wrong: ${APP.wrong}  |  Time Used: ${used}s`);
    setText('resultStars', '★'.repeat(stars) + '☆'.repeat(3-stars));
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

  function clearTimer(){
    if(APP.timerHandle) clearInterval(APP.timerHandle);
    APP.timerHandle = null;
  }

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
    SFX.ding = document.querySelector('#ding');
    SFX.buzz = document.querySelector('#buzz');
    SFX.click = document.querySelector('#click');
  });
})();
