// Handwash VR – full gameplay with on-screen instructions
(function(){
  const STEPS = [
    {key:'palm',   label:'1) ฝ่ามือ',        color:'#00e676', guide:'#guide-palm'},
    {key:'back',   label:'2) หลังมือ',        color:'#26c6da', guide:'#guide-back'},
    {key:'between',label:'3) ง่ามนิ้ว',      color:'#ffd54f', guide:'#guide-between'},
    {key:'knuckle',label:'4) หลังนิ้ว',      color:'#ff8a65', guide:'#guide-knuckle'},
    {key:'tips',   label:'5) ปลายนิ้ว/เล็บ', color:'#ba68c8', guide:'#guide-tips'},
    {key:'thumb',  label:'6) โป้ง',          color:'#90caf9', guide:'#guide-thumb'},
    {key:'wrist',  label:'7) ข้อมือ',        color:'#f06292', guide:'#guide-wrist'}
  ];

  const App = {
    state: 'splash',
    difficulty: 'normal',
    timeLeft: 50,
    score: 0,
    stepIdx: 0,
    timerId: null,
    world: null,
    hud: null,
    sfx: null,

    init(){
      this.world = document.querySelector('#world');
      this.hud = {
        status: document.querySelector('#status'),
        score: document.querySelector('#score')
      };
      this.sfx = {
        b3: document.querySelector('#sfx-b3'),
        b2: document.querySelector('#sfx-b2'),
        b1: document.querySelector('#sfx-b1'),
        bgo: document.querySelector('#sfx-bgo'),
        warn: document.querySelector('#sfx-warn'),
        correct: document.querySelector('#sfx-correct'),
        wrong: document.querySelector('#sfx-wrong'),
        click: document.querySelector('#ui-click'),
      };

      // Splash → Menu
      document.querySelector('#btnEnter').addEventListener('click', ()=>{
        this.play(this.sfx.click);
        document.querySelector('#splash').setAttribute('visible', false);
        document.querySelector('#menu').setAttribute('visible', true);
        this.updateHud('เลือกโหมด: เริ่มเกม (จับเวลา) หรือ โหมดฝึก (ไม่มีเวลา)');
      });

      // Help overlay
      const btnHow = document.querySelector('#btnHow');
      const howOverlay = document.querySelector('#howOverlay');
      const btnCloseHow = document.querySelector('#btnCloseHow');
      if (btnHow && howOverlay && btnCloseHow){
        btnHow.addEventListener('click', ()=>{ this.play(this.sfx.click); howOverlay.setAttribute('visible', true); });
        btnCloseHow.addEventListener('click', ()=>{ this.play(this.sfx.click); howOverlay.setAttribute('visible', false); });
      }

      // Menu bindings
      document.querySelector('#btnStart').addEventListener('click', ()=>{
        this.play(this.sfx.click);
        this.startCountdownThenGame();
      });
      document.querySelector('#btnTutorial').addEventListener('click', ()=>{
        this.play(this.sfx.click);
        this.startTutorial();
      });

      this.updateScore();
    },

    play(node){ try{ node.currentTime=0; node.play(); }catch(e){} },
    updateHud(msg){ this.hud.status.setAttribute('text','value', msg); },
    updateScore(){
      const stepText = Math.min(this.stepIdx+1, 7);
      const t = String(Math.max(0,this.timeLeft)).padStart(2,'0');
      this.hud.score.setAttribute('text','value', `คะแนน: ${this.score} | ขั้น: ${stepText}/7 | เวลา: ${t}s`);
    },
    resetCommon(){
      this.clearWorld();
      this.score = 0;
      this.stepIdx = 0;
      this.timeLeft = (this.difficulty==='easy')? 70 : (this.difficulty==='hard')? 35 : 50;
      this.updateScore();
    },
    clearWorld(){
      while(this.world.firstChild) this.world.removeChild(this.world.firstChild);
    },

    // ===== Tutorial (no timer) =====
    startTutorial(){
      this.state='tutorial';
      document.querySelector('#menu').setAttribute('visible', false);
      this.resetCommon();
      this.updateHud('โหมดฝึก: แตะเป้าที่ถูกต้องตามลำดับ 1 → 7 (ไม่มีจับเวลา)');
      this.spawnStep(STEPS[this.stepIdx], true);
    },

    // ===== Timed Game =====
    startCountdownThenGame(){
      this.state='countdown';
      document.querySelector('#menu').setAttribute('visible', false);
      this.resetCommon();
      let t=0;
      this.updateHud('นับถอยหลัง: 3 → 2 → 1 → เริ่ม!');
      setTimeout(()=>{ this.updateHud('3 — เตรียมพร้อม'); this.play(this.sfx.b3); }, t+=300);
      setTimeout(()=>{ this.updateHud('2 — เล็งเป้าให้ดี'); this.play(this.sfx.b2); }, t+=1000);
      setTimeout(()=>{ this.updateHud('1 — จะเริ่มแล้ว'); this.play(this.sfx.b1); }, t+=1000);
      setTimeout(()=>{
        this.updateHud('เริ่ม! แตะเป้าตามลำดับ 1–7');
        this.play(this.sfx.bgo);
        this.startGame();
      }, t+=1000);
    },
    startGame(){
      this.state='game';
      // timer
      this.timerId = setInterval(()=>{
        this.timeLeft -= 1;
        if (this.timeLeft<=5 && this.timeLeft>0){ this.play(this.sfx.warn); this.updateHud(`เหลือเวลา ${this.timeLeft}s — เร็วขึ้น!`); }
        this.updateScore();
        if (this.timeLeft<=0){ this.end(false); }
      }, 1000);
      this.spawnStep(STEPS[this.stepIdx], false);
    },
    end(isWin){
      if (this.state==='end') return;
      this.state='end';
      clearInterval(this.timerId);
      this.updateHud(isWin? `ยอดเยี่ยม! ผ่านครบ 7 ขั้นตอน ได้ ${this.score} คะแนน` : `หมดเวลา! คะแนน ${this.score}`);
      this.clearWorld();
      setTimeout(()=>{
        document.querySelector('#menu').setAttribute('visible', true);
        this.updateHud('เลือกโหมดเพื่อเล่นอีกครั้ง');
      }, 2000);
    },

    // ===== Spawning =====
    spawnStep(step, tutorial){
      this.clearWorld();
      const pos = this.positionFor(step.key);
      const cont = document.createElement('a-entity');
      cont.setAttribute('position', `${pos.x} ${pos.y} ${pos.z}`);

      // Correct target
      const target = document.createElement('a-entity');
      target.classList.add('clickable');
      target.setAttribute('geometry','primitive: sphere; radius: 0.11');
      target.setAttribute('material', `color:${step.color}; emissive:#222; roughness:0.2; metalness:0.1`);
      target.setAttribute('animation__pulse','property: scale; to: 1.25 1.25 1.25; dir: alternate; loop: true; dur: 600');

      const label = document.createElement('a-entity');
      label.setAttribute('position','0 0.22 0.01');
      label.setAttribute('text',`value:${step.label}; width: 1.0; align: center; color: #fff`);

      const guide = document.createElement('a-entity');
      guide.setAttribute('geometry','primitive: plane; width: 0.72; height: 0.54');
      guide.setAttribute('material',`shader: flat; src: ${step.guide}`);
      guide.setAttribute('position','0.55 0.02 0.0');
      guide.setAttribute('rotation','0 -10 0');
      guide.setAttribute('animation__pop','property: scale; to: 1.05 1.05 1.05; dir: alternate; loop: true; dur: 1200');

      cont.appendChild(target);
      cont.appendChild(label);
      cont.appendChild(guide);
      this.world.appendChild(cont);

      target.addEventListener('click', ()=>{
        this.score += 10;
        this.updateScore();
        this.play(this.sfx.correct);
        target.setAttribute('material','color:#ffd54f; emissive:#8d6e63');
        target.setAttribute('animation__hit','property: scale; to: 0.05 0.05 0.05; dur: 120; easing: easeInCubic');
        setTimeout(()=>{
          this.stepIdx += 1;
          if (this.stepIdx>=STEPS.length){
            this.end(true);
          } else {
            this.updateHud(`ดีมาก! ต่อไป: ${STEPS[this.stepIdx].label}`);
            this.spawnStep(STEPS[this.stepIdx], tutorial);
          }
        }, 140);
      });

      if (!tutorial){
        // distractors
        this.pickDistractors(step.key, 2).forEach(k=> this.spawnDistractor(k));
        // motion
        const mover = document.createElement('a-animation');
        mover.setAttribute('attribute','position');
        mover.setAttribute('to', `${pos.x+0.2} ${pos.y} ${pos.z}`);
        mover.setAttribute('direction','alternate');
        mover.setAttribute('dur','1600');
        mover.setAttribute('repeat','indefinite');
        cont.appendChild(mover);
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
        this.score = Math.max(0, this.score - 5);
        if (this.state==='game'){ this.timeLeft = Math.max(0, this.timeLeft - 3); }
        this.updateScore();
        this.play(this.sfx.wrong);
        this.updateHud('ยังไม่ใช่ขั้นนี้! ลองดูภาพตัวอย่างด้านข้าง');
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
      for (let i = keys.length -1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }
      return keys.slice(0, count);
    },
    positionFor(key, spread=false){
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
  window.HANDWASH_APP = App;
})();
