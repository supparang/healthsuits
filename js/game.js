/* VR สุขภาพ ป.5 — game.js
   โครงสร้างสถานะ + มินิเกม 3 ส่วน (Hygiene/Nutrition/Exercise)
   - ทำ UI ให้อ่านง่าย (ตัวอักษรใหญ่/คอนทราสต์สูง)
   - โหมดจับเวลา/ฝึก
   - สรุปผลแบบเต็ม: ดาว 1–3, เวลา, คำแนะนำรายจุด
*/
(function(){
  const APP = {
    modeTimed: false,
    timer: 0,
    timerHandle: null,
    score: 0,
    maxScore: 0,
    tips: [],
    currentMini: null, // 'hygiene' | 'nutrition' | 'exercise'
    hud: null,
    hudTextEl: null,
    sfx: {},
    bgm: null,
    el: {
      uiMain: null,
      uiHow: null,
      uiGameSelect: null,
      uiSummary: null,
      summaryTitle: null,
      summaryText: null,
      btnSummaryBack: null,
      gameRoot: null
    },
    state: "MAIN" // MAIN -> SELECT -> PLAYING -> SUMMARY
  };

  // ---------- Helpers ----------
  function $(id){ return document.getElementById(id); }
  function show(el, v){ el.setAttribute('visible', v); }
  function playSfx(name){ APP.sfx[name] && APP.sfx[name].play(); }
  function setHUD(msg){ APP.hudTextEl.setAttribute('text', 'value', msg); }

  function resetScores(){
    APP.score = 0; APP.maxScore = 0;
    APP.tips = [];
  }

  function startTimer(seconds){
    APP.timer = seconds;
    if(APP.timerHandle){ clearInterval(APP.timerHandle); }
    setHUD(`เวลา: ${APP.timer}s | คะแนน: ${APP.score}`);
    APP.timerHandle = setInterval(()=>{
      APP.timer--;
      if(APP.timer < 0){
        clearInterval(APP.timerHandle);
        APP.timerHandle = null;
        // Time up -> finish current mini-game
        finishMini();
        return;
      }
      setHUD(`เวลา: ${APP.timer}s | คะแนน: ${APP.score}`);
    }, 1000);
  }

  function stopTimer(){
    if(APP.timerHandle){ clearInterval(APP.timerHandle); APP.timerHandle = null; }
  }

  function starsByPerformance(score, maxScore, timeUsed){
    const pct = maxScore ? (score / maxScore) : 0;
    if(pct >= 0.9) return 3;
    if(pct >= 0.6) return 2;
    return 1;
  }

  function toSummary(title){
    APP.state = "SUMMARY";
    show(APP.el.gameRoot, false);
    show(APP.el.uiGameSelect, false);
    show(APP.el.uiSummary, true);

    const timeUsed = APP.modeTimed ? 'โหมดจับเวลา' : 'โหมดฝึก';
    const star = '★'.repeat(starsByPerformance(APP.score, APP.maxScore, APP.timer)) + '☆'.repeat(3 - starsByPerformance(APP.score, APP.maxScore, APP.timer));
    const tipsText = APP.tips.length ? APP.tips.map((t,i)=>`${i+1}) ${t}`).join('\\n') : "เยี่ยม! ทำได้ครบถ้วน";
    APP.el.summaryTitle.setAttribute('text', 'value', `สรุปผล: ${title}`);
    APP.el.summaryText.setAttribute('text', 'value',
      `โหมด: ${timeUsed}\\nคะแนน: ${APP.score}/${APP.maxScore} | ดาว: ${star}\\nคำแนะนำ:\\n${tipsText}`
    );
    setHUD("สรุปผล");
  }

  function finishMini(){
    stopTimer();
    playSfx('success');
    let title = "";
    if(APP.currentMini === 'hygiene') title = "อนามัยส่วนบุคคล (ล้างมือ)";
    if(APP.currentMini === 'nutrition') title = "โภชนาการ";
    if(APP.currentMini === 'exercise') title = "ออกกำลังกาย";
    toSummary(title);
  }

  // ---------- Hygiene Mini-game (Complete) ----------
  const HYGIENE_STEPS = [
    {name:"ฝ่ามือ", tip:"ถูฝ่ามือเข้าหากัน 5 วินาที"},
    {name:"หลังมือ", tip:"ถูหลังมือและซอกนิ้ว"},
    {name:"ซอกนิ้ว", tip:"ถูซอกนิ้วทั้งสองมือ"},
    {name:"หลังนิ้ว", tip:"ถูหลังนิ้วมือสลับกัน"},
    {name:"นิ้วหัวแม่มือ", tip:"ถูนิ้วหัวแม่มือหมุนเป็นวง"},
    {name:"ปลายนิ้ว/เล็บ", tip:"ถูปลายนิ้วบนฝ่ามือ"},
    {name:"ข้อมือ", tip:"ถูรอบข้อมือให้ทั่ว"}
  ];

  function hygieneStart(){
    APP.currentMini = 'hygiene';
    resetScores();
    APP.maxScore = HYGIENE_STEPS.length;
    setHUD("ล้างมือ 7 ขั้น: เล็งวงสีเขียวตามลำดับ");
    // Clear gameRoot and build targets in a semicircle
    const root = APP.el.gameRoot;
    while(root.firstChild) root.removeChild(root.firstChild);

    const radius = 1.4;
    const y = 1.45;
    const baseAngle = -70; // degrees
    HYGIENE_STEPS.forEach((step, i)=>{
      const angle = (baseAngle + i * (140/(HYGIENE_STEPS.length-1))) * Math.PI/180;
      const x = Math.sin(angle) * radius;
      const z = -Math.cos(angle) * radius;
      const target = document.createElement('a-entity');
      target.setAttribute('class','clickable hygieneTarget');
      target.setAttribute('geometry','primitive: circle; radius: 0.11');
      // next step is green, others gray; will update dynamically
      target.setAttribute('material','color: #374151; opacity: 0.9');
      target.setAttribute('position',`${x} ${y} ${z}`);
      target.setAttribute('look-at','#camera');
      target.setAttribute('step-index', i);

      const label = document.createElement('a-entity');
      label.setAttribute('text', `value: ${i+1}. ${step.name}; width: 2.4; align: center; color: #fff`);
      label.setAttribute('position',`0 -0.19 0.01`);
      target.appendChild(label);

      // fuse interaction
      target.addEventListener('click', onHygieneClick);
      root.appendChild(target);
    });

    APP.hygieneNext = 0;
    updateHygieneIndicators();

    // Timer if needed
    if(APP.modeTimed) startTimer(45); else setHUD("โหมดฝึก | แตะตามลำดับสีเขียว");
  }

  function updateHygieneIndicators(){
    const targets = document.querySelectorAll('.hygieneTarget');
    targets.forEach(t=>{
      const idx = parseInt(t.getAttribute('step-index'));
      if(idx === APP.hygieneNext){
        t.setAttribute('material','color: #10b981; opacity: 0.95'); // green
      }else if(idx < APP.hygieneNext){
        t.setAttribute('material','color: #3b82f6; opacity: 0.9'); // done blue
      }else{
        t.setAttribute('material','color: #374151; opacity: 0.8'); // pending gray
      }
    });
  }

  function onHygieneClick(e){
    const idx = parseInt(e.currentTarget.getAttribute('step-index'));
    const step = HYGIENE_STEPS[idx];
    if(idx === APP.hygieneNext){
      // correct
      playSfx('click');
      APP.score += 1;
      setHUD(`ถูกต้อง! ขั้นที่ ${idx+1}: ${step.name} | คะแนน: ${APP.score}/${APP.maxScore}`);
      APP.hygieneNext += 1;
      updateHygieneIndicators();
      if(APP.hygieneNext >= HYGIENE_STEPS.length){
        finishMini();
      }
    }else{
      // wrong
      playSfx('wrong');
      APP.tips.push(`ควรทำลำดับ ${APP.hygieneNext+1}: ${HYGIENE_STEPS[APP.hygieneNext].name}`);
      setHUD(`ผิดลำดับ ลองใหม่ที่ขั้น ${APP.hygieneNext+1}`);
    }
  }

  // ---------- Nutrition Mini-game (Scaffold) ----------
  function nutritionStart(){
    APP.currentMini = 'nutrition';
    resetScores();
    APP.maxScore = 5;
    setHUD("โภชนาการ: เลือกอาหารที่เหมาะสม (ต้นแบบ)");
    const root = APP.el.gameRoot;
    while(root.firstChild) root.removeChild(root.firstChild);

    // Simple 2 choices per round
    const q = document.createElement('a-entity');
    q.setAttribute('position','0 1.5 -1.6');
    const question = document.createElement('a-entity');
    question.setAttribute('text','value: เลือกอาหารเช้าที่สมดุลกว่า; width: 2.8; align: center; color: #fff');
    q.appendChild(question);

    const choiceA = document.createElement('a-entity');
    choiceA.setAttribute('class','clickable');
    choiceA.setAttribute('geometry','primitive: plane; width: 0.9; height: 0.22');
    choiceA.setAttribute('material','src: #texBtn; transparent: true');
    choiceA.setAttribute('position','-0.6 -0.22 0');
    const labelA = document.createElement('a-entity');
    labelA.setAttribute('text','value: โยเกิร์ตไม่หวาน + ผลไม้; width: 2.2; align: center; color: #111');
    labelA.setAttribute('position','0 0 0.01');
    choiceA.appendChild(labelA);

    const choiceB = document.createElement('a-entity');
    choiceB.setAttribute('class','clickable');
    choiceB.setAttribute('geometry','primitive: plane; width: 0.9; height: 0.22');
    choiceB.setAttribute('material','src: #texBtn; transparent: true');
    choiceB.setAttribute('position','0.6 -0.22 0');
    const labelB = document.createElement('a-entity');
    labelB.setAttribute('text','value: น้ำอัดลม + โดนัท; width: 2.2; align: center; color: #111');
    labelB.setAttribute('position','0 0 0.01');
    choiceB.appendChild(labelB);

    q.appendChild(choiceA); q.appendChild(choiceB);
    root.appendChild(q);

    choiceA.addEventListener('click', ()=>{
      APP.score = 5; // full marks for prototype
      setHUD("เลือกได้ดี! อาหารสมดุลกว่า");
      finishMini();
    });
    choiceB.addEventListener('click', ()=>{
      APP.tips.push("ลดน้ำตาลและอาหารทอด/มัน เลือกผลไม้และโปรตีนไขมันต่ำแทน");
      APP.score = 3;
      setHUD("ลองเลือกใหม่ครั้งหน้า");
      finishMini();
    });

    if(APP.modeTimed) startTimer(25);
  }

  // ---------- Exercise Mini-game (Scaffold) ----------
  function exerciseStart(){
    APP.currentMini = 'exercise';
    resetScores();
    APP.maxScore = 10;
    setHUD("ออกกำลังกาย: มอง/แตะเป้าหมายให้ครบ (ต้นแบบ)");
    const root = APP.el.gameRoot;
    while(root.firstChild) root.removeChild(root.firstChild);

    // spawn 10 targets around
    const N = 10, radius = 1.6, y = 1.5;
    for(let i=0;i<N;i++){
      const angle = (-80 + i*(160/(N-1))) * Math.PI/180;
      const x = Math.sin(angle)*radius;
      const z = -Math.cos(angle)*radius;
      const t = document.createElement('a-entity');
      t.setAttribute('class','clickable exTarget');
      t.setAttribute('geometry','primitive: circle; radius: 0.1');
      t.setAttribute('material','color: #f59e0b; opacity: 0.95');
      t.setAttribute('position',`${x} ${y} ${z}`);
      t.setAttribute('look-at','#camera');
      root.appendChild(t);
      t.addEventListener('click', ()=>{
        playSfx('click');
        t.setAttribute('visible','false');
        APP.score += 1;
        setHUD(`เป้าที่ทำได้: ${APP.score}/${APP.maxScore}`);
        if(APP.score >= APP.maxScore){ finishMini(); }
      });
    }
    if(APP.modeTimed) startTimer(30);
  }

  // ---------- Navigation & UI wiring ----------
  function goMain(){
    APP.state = "MAIN";
    show(APP.el.uiMain, true);
    show(APP.el.uiGameSelect, false);
    show(APP.el.uiHow, false);
    show(APP.el.gameRoot, false);
    show(APP.el.uiSummary, false);
    stopTimer();
    setHUD("พร้อมเริ่มเกม");
  }

  function fromMainToSelect(){
    APP.state = "SELECT";
    show(APP.el.uiMain, false);
    show(APP.el.uiGameSelect, true);
    show(APP.el.uiHow, false);
    show(APP.el.gameRoot, false);
    show(APP.el.uiSummary, false);
    setHUD(APP.modeTimed ? "โหมดจับเวลา" : "โหมดฝึก");
  }

  function startMini(which){
    APP.state = "PLAYING";
    show(APP.el.uiGameSelect, false);
    show(APP.el.gameRoot, true);
    show(APP.el.uiSummary, false);
    if(which==='hygiene') hygieneStart();
    if(which==='nutrition') nutritionStart();
    if(which==='exercise') exerciseStart();
  }

  function init(){
    APP.el.uiMain = $('uiMain');
    APP.el.uiHow = $('uiHow');
    APP.el.uiGameSelect = $('uiGameSelect');
    APP.el.uiSummary = $('uiSummary');
    APP.el.summaryTitle = $('summaryTitle');
    APP.el.summaryText = $('summaryText');
    APP.el.btnSummaryBack = $('btnSummaryBack');
    APP.el.gameRoot = $('gameRoot');
    APP.hud = $('hud');
    APP.hudTextEl = $('hudText');

    APP.sfx.click = $('sfxClick');
    APP.sfx.success = $('sfxSuccess');
    APP.sfx.wrong = $('sfxWrong');
    APP.bgm = $('bgm');
    APP.bgm.loop = true;
    APP.bgm.volume = 0.25;
    // Try autoplay after first user interaction

    // Main buttons
    $('btnStartTimed').addEventListener('click', ()=>{
      APP.modeTimed = true; playSfx('click'); fromMainToSelect(); APP.bgm.play().catch(()=>{});
    });
    $('btnStartPractice').addEventListener('click', ()=>{
      APP.modeTimed = false; playSfx('click'); fromMainToSelect(); APP.bgm.play().catch(()=>{});
    });
    $('btnHow').addEventListener('click', ()=>{
      playSfx('click');
      show(APP.el.uiHow, true);
      show(APP.el.uiMain, false);
    });
    $('btnCloseHow').addEventListener('click', ()=>{
      playSfx('click');
      show(APP.el.uiHow, false);
      show(APP.el.uiMain, true);
    });
    $('btnBackToMain').addEventListener('click', ()=>{ playSfx('click'); goMain(); });

    // Game select buttons
    $('btnHygiene').addEventListener('click', ()=>{ playSfx('click'); startMini('hygiene'); });
    $('btnNutrition').addEventListener('click', ()=>{ playSfx('click'); startMini('nutrition'); });
    $('btnExercise').addEventListener('click', ()=>{ playSfx('click'); startMini('exercise'); });

    // Summary back
    APP.el.btnSummaryBack.addEventListener('click', ()=>{
      playSfx('click');
      fromMainToSelect();
    });

    // Start in Main
    goMain();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
