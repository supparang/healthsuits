// VR Handwashing for Grade 5 (Thai). Uses A-Frame.
(function(){
  const STEPS = [
    {key:'palm',   label:'1) ฝ่ามือ',        color:'#00e676'},
    {key:'back',   label:'2) หลังมือ',        color:'#26c6da'},
    {key:'between',label:'3) ง่ามนิ้ว',      color:'#ffd54f'},
    {key:'knuckle',label:'4) หลังนิ้ว',      color:'#ff8a65'},
    {key:'tips',   label:'5) ปลายนิ้ว/เล็บ', color:'#ba68c8'},
    {key:'thumb',  label:'6) โป้ง',          color:'#90caf9'},
    {key:'wrist',  label:'7) ข้อมือ',        color:'#f06292'}
  ];

  const App = {
    state: 'menu', // 'menu' | 'tutorial' | 'game' | 'end'
    difficulty: 'normal',
    timeLeft: 45,
    score: 0,
    stepIdx: 0,
    timerId: null,
    world: document.querySelector('#world'),
    hud: {
      title: document.querySelector('#title'),
      status: document.querySelector('#status'),
      score: document.querySelector('#score'),
    },
    menu: {
      root: document.querySelector('#menu'),
      btnStart: document.querySelector('#btnStart'),
      btnTutorial: document.querySelector('#btnTutorial'),
      btnEasy: document.querySelector('#btnEasy'),
      btnNormal: document.querySelector('#btnNormal'),
      btnHard: document.querySelector('#btnHard'),
      diffLabel: document.querySelector('#difficultyLabel'),
    },
    init(){
      // Bind menu
      this.menu.btnStart.addEventListener('click', ()=> this.startGame());
      this.menu.btnTutorial.addEventListener('click', ()=> this.startTutorial());
      this.menu.btnEasy.addEventListener('click', ()=> this.setDifficulty('easy'));
      this.menu.btnNormal.addEventListener('click', ()=> this.setDifficulty('normal'));
      this.menu.btnHard.addEventListener('click', ()=> this.setDifficulty('hard'));
      this.updateHud('เลือกโหมดเพื่อเริ่ม');
      this.updateScore();
    },
    setDifficulty(level){
      this.difficulty = level;
      const label = level==='easy' ? 'ง่าย' : level==='hard' ? 'ยาก' : 'กลาง';
      this.menu.diffLabel.setAttribute('text','value',`ระดับความยาก: ${label}`);
    },
    resetCommon(){
      this.clearWorld();
      this.score = 0;
      this.stepIdx = 0;
      this.timeLeft = (this.difficulty==='easy')? 70 : (this.difficulty==='hard')? 35 : 50;
      this.updateScore();
    },
    startTutorial(){
      this.state='tutorial';
      this.menu.root.setAttribute('visible', false);
      this.resetCommon();
      this.updateHud('โหมดฝึก: ทำตามลำดับ 1–7 (ไม่มีจับเวลา)');
      this.spawnStep(STEPS[this.stepIdx], true);
    },
    startGame(){
      this.state='game';
      this.menu.root.setAttribute('visible', false);
      this.resetCommon();
      this.updateHud('จับเวลาเริ่ม! แตะเป้าตามลำดับ 1–7 ให้ถูกต้อง');
      // Start timer
      this.timerId = setInterval(()=>{
        this.timeLeft -= 1;
        this.updateScore();
        if (this.timeLeft<=0) this.end(false);
      }, 1000);
      this.spawnStep(STEPS[this.stepIdx], false);
    },
    end(isWin){
      this.state='end';
      clearInterval(this.timerId);
      this.updateHud(isWin? `ยอดเยี่ยม! คุณผ่านครบ 7 ขั้นตอน ได้ ${this.score} คะแนน` : `หมดเวลา! คะแนน ${this.score}`);
      this.menu.root.setAttribute('visible', true);
      this.clearWorld();
    },
    updateHud(msg){
      this.hud.status.setAttribute('text','value', msg);
    },
    updateScore(){
      const stepText = Math.min(this.stepIdx+1, 7);
      const t = String(this.timeLeft).padStart(2,'0');
      this.hud.score.setAttribute('text','value', `คะแนน: ${this.score} | ขั้น: ${stepText}/7 | เวลา: ${t}s`);
    },
    clearWorld(){
      while(this.world.firstChild) this.world.removeChild(this.world.firstChild);
    },
    // Spawn one target for the current step, with Thai label and helper ring.
    spawnStep(step, tutorial){
      this.clearWorld();
      // Place targets around front hemisphere with fixed slots for consistency by key
      const pos = this.positionFor(step.key);
      const cont = document.createElement('a-entity');
      cont.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);

      const target = document.createElement('a-entity');
      target.classList.add('clickable');
      target.setAttribute('geometry','primitive: sphere; radius: 0.11');
      target.setAttribute('material', `color:${step.color}; emissive:#222; roughness:0.2; metalness:0.1`);
      target.setAttribute('animation__pulse','property: scale; to: 1.25 1.25 1.25; dir: alternate; loop: true; dur: 600');

      // Label (smaller text)
      const label = document.createElement('a-entity');
      label.setAttribute('position','0 0.22 0.01');
      label.setAttribute('text',`value:${step.label}; width: 1.0; align: center; color: #fff`);

      // Helper ring
      const ring = document.createElement('a-entity');
      ring.setAttribute('geometry','primitive: torus; radius: 0.16; radiusTubular: 0.008');
      ring.setAttribute('rotation','90 0 0');
      ring.setAttribute('material','color:#ffffff; opacity:0.18');

      cont.appendChild(target);
      cont.appendChild(label);
      cont.appendChild(ring);
      this.world.appendChild(cont);

      // Click logic
      target.addEventListener('click', ()=>{
        // Correct step
        this.score += 10;
        this.updateScore();
        target.setAttribute('material','color:#ffd54f; emissive:#8d6e63');
        target.setAttribute('animation__hit','property: scale; to: 0.05 0.05 0.05; dur: 120; easing: easeInCubic');
        setTimeout(()=>{
          this.stepIdx += 1;
          if (this.stepIdx>=STEPS.length){
            this.end(true);
          } else {
            this.spawnStep(STEPS[this.stepIdx], tutorial);
          }
        }, 130);
      });

      if (!tutorial){
        // Spawn 2 distractors (wrong steps) to increase difficulty
        const wrongs = this.pickDistractors(step.key, 2);
        wrongs.forEach(k=> this.spawnDistractor(k));
        // Reduce lifetime at higher difficulty by auto-moving the target
        if (this.difficulty!=='easy'){
          const mover = document.createElement('a-animation');
          mover.setAttribute('attribute','position');
          const oscillate = (this.difficulty==='hard')? 0.35 : 0.2;
          mover.setAttribute('to', `${pos.x+oscillate} ${pos.y} ${pos.z}`);
          mover.setAttribute('direction','alternate');
          mover.setAttribute('dur', (this.difficulty==='hard')? 1200 : 1800);
          mover.setAttribute('repeat','indefinite');
          cont.appendChild(mover);
        }
      }
    },
    spawnDistractor(key){
      const pos = this.positionFor(key, true);
      const wrong = document.createElement('a-entity');
      wrong.classList.add('clickable');
      wrong.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);
      wrong.setAttribute('geometry','primitive: sphere; radius: 0.1');
      wrong.setAttribute('material','color:#b0bec5; emissive:#111');
      wrong.setAttribute('animation__pulse','property: scale; to: 1.15 1.15 1.15; dir: alternate; loop: true; dur: 700');

      const label = document.createElement('a-entity');
      label.setAttribute('position','0 0.2 0.01');
      label.setAttribute('text',`value:${this.labelFor(key)}; width: 0.9; align: center; color: #d0d7de`);
      wrong.appendChild(label);

      wrong.addEventListener('click', ()=>{
        // Penalty for wrong hit
        this.score = Math.max(0, this.score - 5);
        if (this.state==='game'){
          this.timeLeft = Math.max(0, this.timeLeft - 3);
        }
        this.updateScore();
        wrong.setAttribute('material','color:#ef5350; emissive:#7f0000');
        wrong.setAttribute('animation__hit','property: scale; to: 0.03 0.03 0.03; dur: 100; easing: easeInCubic');
        setTimeout(()=> wrong.remove(), 120);
      });

      this.world.appendChild(wrong);
    },
    labelFor(key){
      const m = {palm:'1) ฝ่ามือ', back:'2) หลังมือ', between:'3) ง่ามนิ้ว', knuckle:'4) หลังนิ้ว', tips:'5) ปลายนิ้ว/เล็บ', thumb:'6) โป้ง', wrist:'7) ข้อมือ'};
      return m[key] || key;
    },
    pickDistractors(correctKey, count){
      const keys = STEPS.map(s=>s.key).filter(k=>k!==correctKey);
      // Simple shuffle
      for (let i = keys.length -1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }
      return keys.slice(0, count);
    },
    positionFor(key, spread=false){
      // Pre-defined anchor positions in front hemisphere; slight random spread if requested
      const base = {
        palm:    {x:  0.0, y:1.5, z:-2.0},
        back:    {x: -0.8, y:1.7, z:-2.4},
        between: {x:  0.9, y:1.55,z:-2.2},
        knuckle: {x: -1.1, y:1.35,z:-2.0},
        tips:    {x:  1.2, y:1.35,z:-2.0},
        thumb:   {x: -0.3, y:1.2, z:-1.8},
        wrist:   {x:  0.4, y:1.1, z:-1.7}
      }[key] || {x:0,y:1.6,z:-2};
      if (spread){
        return {
          x: base.x + (Math.random()*0.8 - 0.4),
          y: base.y + (Math.random()*0.3 - 0.15),
          z: base.z + (Math.random()*0.6 - 0.3)
        };
      }
      return base;
    }
  };

  document.querySelector('a-scene').addEventListener('loaded', ()=> App.init());
  window.HANDWASH_APP = App; // expose for debugging in console
})();
