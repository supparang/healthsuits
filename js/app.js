/* Clean WebXR Health v1 */
(function(){
  const APP = {
    modeTimed:false, timer:0, tHandle:null,
    score:0, maxScore:0, tips:[], state:"MAIN", current:null,
    el:{},
  };

  const $ = id=>document.getElementById(id);
  const show = (el,v)=>el.setAttribute('visible', v);
  const setHUD = (s)=>APP.el.hudText.setAttribute('text','value',s);
  const sfx = {
    click: null, ok: null, no: null
  };

  function reset(){ APP.score=0; APP.maxScore=0; APP.tips=[]; }
  function startTimer(sec){
    APP.timer=sec; clearInterval(APP.tHandle);
    APP.tHandle = setInterval(()=>{
      APP.timer--; if(APP.timer<0){ stopTimer(); finish(); }
      setHUD(`เวลา: ${Math.max(APP.timer,0)}s | คะแนน: ${APP.score}`);
    },1000);
    setHUD(`เวลา: ${APP.timer}s | คะแนน: ${APP.score}`);
  }
  function stopTimer(){ if(APP.tHandle){ clearInterval(APP.tHandle); APP.tHandle=null; } }
  function stars(score,max){ const p=max?score/max:0; return p>=0.9?3:(p>=0.6?2:1); }

  // -------- HYGIENE (complete) --------
  const STEPS = [
    {name:"1. ฝ่ามือ", cap:"ถูฝ่ามือเข้าหากัน ~5 วินาที", img:"#h0"},
    {name:"2. หลังมือ", cap:"ถูหลังมือและซอกนิ้ว", img:"#h1"},
    {name:"3. ซอกนิ้ว", cap:"ถูซอกนิ้วทั้งสองมือ", img:"#h2"},
    {name:"4. หลังนิ้ว", cap:"ถูหลังนิ้วมือสลับกัน", img:"#h3"},
    {name:"5. นิ้วหัวแม่มือ", cap:"ถูหัวแม่มือหมุนเป็นวง", img:"#h4"},
    {name:"6. ปลายนิ้ว/เล็บ", cap:"ถูปลายนิ้วบนฝ่ามือ", img:"#h5"},
    {name:"7. ข้อมือ", cap:"ถูรอบข้อมือให้ทั่ว", img:"#h6"},
  ];
  function hygieneStart(){
    APP.current='HYGIENE'; reset(); APP.maxScore=STEPS.length;
    const root=APP.el.game; while(root.firstChild) root.removeChild(root.firstChild);
    // Semi-circle targets
    const R=1.35, y=1.5, A0=-70, span=140;
    for(let i=0;i<STEPS.length;i++){
      const a=(A0+i*(span/(STEPS.length-1)))*Math.PI/180;
      const x=Math.sin(a)*R, z=-Math.cos(a)*R;
      const t=document.createElement('a-entity');
      t.setAttribute('class','clickable step');
      t.setAttribute('geometry','primitive: circle; radius: 0.11');
      t.setAttribute('material','color:#374151; opacity:0.85');
      t.setAttribute('position',`${x} ${y} ${z}`);
      t.setAttribute('look-at','#cam');
      t.setAttribute('data-i', i);
      const lab=document.createElement('a-entity');
      lab.setAttribute('text',`value: ${i+1}; width:1.5; align:center; color:#fff`);
      lab.setAttribute('position','0 0 0.01');
      t.appendChild(lab);
      t.addEventListener('click', onStep);
      root.appendChild(t);
    }
    APP.next=0; updateSteps(); show(APP.el.hPanel,true);
    updatePanel();
    if(APP.modeTimed) startTimer(45); else setHUD("โหมดฝึก | แตะวงเขียวตามลำดับ");
  }
  function updatePanel(){
    const s = STEPS[Math.min(APP.next, STEPS.length-1)];
    APP.el.hImg.setAttribute('material', `src: ${s.img}`);
    APP.el.hCap.setAttribute('text','value', `${s.name} — ${s.cap}`);
  }
  function updateSteps(){
    document.querySelectorAll('.step').forEach(n=>{
      const i = +n.getAttribute('data-i');
      if(i<APP.next) n.setAttribute('material','color:#3b82f6; opacity:0.95');
      else if(i===APP.next) n.setAttribute('material','color:#10b981; opacity:0.98');
      else n.setAttribute('material','color:#374151; opacity:0.8');
    });
  }
  function onStep(e){
    const i=+e.currentTarget.getAttribute('data-i');
    if(i===APP.next){
      sfx.click.play();
      APP.score++; APP.next++; setHUD(`ถูกต้อง! คะแนน ${APP.score}/${APP.maxScore}`);
      updateSteps(); updatePanel();
      if(APP.next>=STEPS.length){ finish(); }
    }else{
      sfx.no.play();
      APP.tips.push(`ทำลำดับที่ ${APP.next+1}: ${STEPS[APP.next].name}`);
      setHUD(`ผิดลำดับ ลองที่ขั้น ${APP.next+1}`);
    }
  }

  // -------- NUTRITION (simple working) --------
  function nutritionStart(){
    APP.current='NUTRI'; reset(); APP.maxScore=3;
    const root=APP.el.game; while(root.firstChild) root.removeChild(root.firstChild);
    const panel=document.createElement('a-entity');
    panel.setAttribute('position','0 1.55 -1.6');
    const q=document.createElement('a-entity');
    q.setAttribute('text','value: อาหารเช้าที่สมดุลกว่า?; width:2.8; align:center; color:#fff');
    panel.appendChild(q);
    const mk=(id, txt, x)=>{
      const b=document.createElement('a-entity');
      b.setAttribute('class','clickable'); b.setAttribute('geometry','primitive: plane; width:0.98; height:0.22');
      b.setAttribute('material','src:#btn; transparent:true'); b.setAttribute('position',`${x} -0.24 0.01`);
      const t=document.createElement('a-entity'); t.setAttribute('text',`value: ${txt}; width:2.2; align:center; color:#111`); t.setAttribute('position','0 0 0.01');
      b.appendChild(t); panel.appendChild(b); return b;
    };
    const A = mk('A','โยเกิร์ตไม่หวาน + ผลไม้', -0.6);
    const B = mk('B','โดนัท + น้ำอัดลม', 0.6);
    root.appendChild(panel);
    A.addEventListener('click', ()=>{ sfx.ok.play(); APP.score=3; finish(); });
    B.addEventListener('click', ()=>{ sfx.no.play(); APP.tips.push('ลดน้ำตาล/ทอดมัน เลือกผลไม้+โปรตีนไขมันต่ำ'); APP.score=1; finish(); });
    show(APP.el.hPanel,false);
    if(APP.modeTimed) startTimer(20); else setHUD("โหมดฝึก");
  }

  // -------- EXERCISE (simple working) --------
  function exerciseStart(){
    APP.current='EXER'; reset(); APP.maxScore=10;
    const root=APP.el.game; while(root.firstChild) root.removeChild(root.firstChild);
    const N=10, R=1.6, y=1.5;
    for(let i=0;i<N;i++){
      const a=(-80+i*(160/(N-1)))*Math.PI/180;
      const x=Math.sin(a)*R, z=-Math.cos(a)*R;
      const t=document.createElement('a-entity');
      t.setAttribute('class','clickable');
      t.setAttribute('geometry','primitive: circle; radius: 0.1');
      t.setAttribute('material','color:#f59e0b; opacity:0.98');
      t.setAttribute('position',`${x} ${y} ${z}`);
      t.setAttribute('look-at','#cam');
      t.addEventListener('click', ()=>{
        sfx.click.play(); t.setAttribute('visible','false');
        APP.score++; setHUD(`เป้าที่ทำได้: ${APP.score}/${APP.maxScore}`);
        if(APP.score>=APP.maxScore) finish();
      });
      root.appendChild(t);
    }
    show(APP.el.hPanel,false);
    if(APP.modeTimed) startTimer(30); else setHUD("โหมดฝึก");
  }

  // -------- Flow --------
  function finish(){
    stopTimer();
    show(APP.el.game,false); show(APP.el.uiSelect,false); show(APP.el.hPanel,false);
    const title = APP.current==='HYGIENE'?'อนามัยส่วนบุคคล (ล้างมือ)':
                  APP.current==='NUTRI'  ?'โภชนาการ':'ออกกำลังกาย';
    const st = '★'.repeat(stars(APP.score,APP.maxScore))+ '☆'.repeat(3-stars(APP.score,APP.maxScore));
    const tips = APP.tips.length? APP.tips.map((t,i)=>`${i+1}) ${t}`).join('\\n') : 'ดีมาก!';
    APP.el.sumTitle.setAttribute('text','value', `สรุปผล: ${title}`);
    APP.el.sumText.setAttribute('text','value', `โหมด: ${APP.modeTimed?'จับเวลา':'ฝึก'}\\nคะแนน: ${APP.score}/${APP.maxScore} | ดาว: ${st}\\nคำแนะนำ:\\n${tips}`);
    show(APP.el.uiSummary,true);
  }

  function goMain(){
    APP.state='MAIN';
    show(APP.el.uiMain,true);
    show(APP.el.uiHow,false);
    show(APP.el.uiSelect,false);
    show(APP.el.game,false);
    show(APP.el.uiSummary,false);
    show(APP.el.hPanel,false);
    stopTimer();
    setHUD('พร้อมเริ่ม');
  }
  function toSelect(){
    APP.state='SELECT';
    show(APP.el.uiMain,false);
    show(APP.el.uiHow,false);
    show(APP.el.uiSummary,false);
    show(APP.el.game,false);
    show(APP.el.uiSelect,true);
    setHUD(APP.modeTimed? 'โหมดจับเวลา':'โหมดฝึก');
  }
  function startMini(which){
    APP.state='PLAY';
    show(APP.el.uiSelect,false);
    show(APP.el.game,true);
    if(which==='HYGIENE') hygieneStart();
    if(which==='NUTRI') nutritionStart();
    if(which==='EXER') exerciseStart();
  }

  function init(){
    APP.el.uiMain = $('uiMain');
    APP.el.uiHow = $('uiHow');
    APP.el.uiSelect = $('uiSelect');
    APP.el.uiSummary = $('uiSummary');
    APP.el.sumTitle = $('sumTitle');
    APP.el.sumText = $('sumText');
    APP.el.btnSumBack = $('btnSumBack');
    APP.el.btnBackMain = $('btnBackMain');
    APP.el.game = $('game');
    APP.el.hPanel = $('hPanel'); APP.el.hImg = $('hImg'); APP.el.hCap = $('hCap');
    APP.el.hudText = $('hudText');

    sfx.click = $('click'); sfx.ok=$('ok'); sfx.no=$('no');

    $('btnTimed').addEventListener('click', ()=>{ APP.modeTimed=true; sfx.click.play(); toSelect(); });
    $('btnPractice').addEventListener('click', ()=>{ APP.modeTimed=false; sfx.click.play(); toSelect(); });
    $('btnHow').addEventListener('click', ()=>{ sfx.click.play(); show(APP.el.uiMain,false); show(APP.el.uiHow,true); });
    $('btnCloseHow').addEventListener('click', ()=>{ sfx.click.play(); show(APP.el.uiHow,false); show(APP.el.uiMain,true); });
    $('btnBackMain').addEventListener('click', ()=>{ sfx.click.play(); goMain(); });

    $('selHygiene').addEventListener('click', ()=>{ sfx.click.play(); startMini('HYGIENE'); });
    $('selNutrition').addEventListener('click', ()=>{ sfx.click.play(); startMini('NUTRI'); });
    $('selExercise').addEventListener('click', ()=>{ sfx.click.play(); startMini('EXER'); });

    APP.el.btnSumBack.addEventListener('click', ()=>{ sfx.click.play(); toSelect(); });

    goMain();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
