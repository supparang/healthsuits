console.log('Handwash VR Game logic loaded');

// ระบบ Splash → Menu
document.addEventListener("DOMContentLoaded", () => {
  const splash = document.querySelector("#splash");
  const menu = document.querySelector("#menu");
  const hudStatus = document.querySelector("#status");
  const btnEnter = document.querySelector("#btnEnter");
  const btnStart = document.querySelector("#btnStart");
  const btnTutorial = document.querySelector("#btnTutorial");

  function showMenu() {
    splash.setAttribute("visible", false);
    menu.setAttribute("visible", true);
    hudStatus.setAttribute("text", "value: อยู่ที่หน้าเมนู");
    playClick();
  }

  function playClick() {
    const audio = document.querySelector("#ui-click");
    if (audio) { audio.currentTime = 0; audio.play(); }
  }

  btnEnter.addEventListener("click", showMenu);

  btnStart.addEventListener("click", () => {
    hudStatus.setAttribute("text","value: กำลังเริ่มเกม (จับเวลา)...");
    playClick();
    startCountdown();
  });

  btnTutorial.addEventListener("click", () => {
    hudStatus.setAttribute("text","value: โหมดฝึก...");
    playClick();
    // TODO: ใส่ logic โหมดฝึก
  });
});

// ฟังก์ชันนับถอยหลังก่อนเริ่มเกม
function startCountdown() {
  const hudStatus = document.querySelector("#status");
  const sounds = [
    document.querySelector("#sfx-b3"),
    document.querySelector("#sfx-b2"),
    document.querySelector("#sfx-b1"),
    document.querySelector("#sfx-bgo"),
  ];

  let step = 0;
  function next() {
    if (step < sounds.length) {
      sounds[step].play();
      hudStatus.setAttribute("text", "value", step < 3 ? (3-step) : "เริ่ม!");
      step++;
      setTimeout(next, 1000);
    } else {
      hudStatus.setAttribute("text","value: เล่นเกมแล้ว!");
      // TODO: logic เกมจริง เช่น spawn เป้า
    }
  }
  next();
}
