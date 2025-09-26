// Simple VR target game for mobile WebXR (A‑Frame)
AFRAME.registerComponent('game-manager', {
  init: function () {
    this.score = 0;
    this.timeLeft = 30;
    this.timerId = null;
    this.running = false;

    this.hud = {
      status: document.querySelector('#status'),
      score: document.querySelector('#score')
    };
    this.targets = document.querySelector('#targets');
    this.startBtn = document.querySelector('#startBtn');

    this.onStart = this.start.bind(this);
    this.startBtn.addEventListener('click', this.onStart);
  },

  start: function () {
    if (this.running) return;
    this.running = true;
    this.score = 0;
    this.timeLeft = 30;
    this.updateHud('เริ่มแล้ว! แตะเป้าสีเขียวให้ได้มากที่สุด');
    this.updateScore();

    // Hide start button
    this.startBtn.setAttribute('visible', false);

    // Spawn targets periodically
    this.spawnInterval = setInterval(() => this.spawnTarget(), 900);

    // Countdown
    this.timerId = setInterval(() => {
      this.timeLeft -= 1;
      this.updateScore();
      if (this.timeLeft <= 0) this.end();
    }, 1000);

    // Spawn initial targets
    for (let i = 0; i < 3; i++) this.spawnTarget();
  },

  end: function () {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.timerId);
    clearInterval(this.spawnInterval);
    this.clearTargets();
    this.updateHud(`จบเกม! คุณได้คะแนน ${this.score} แตะ 'เริ่มเกม' เพื่อเล่นอีกครั้ง`);
    this.startBtn.setAttribute('visible', true);
  },

  updateHud: function (msg) {
    this.hud.status.setAttribute('text', 'value', msg);
  },

  updateScore: function () {
    this.hud.score.setAttribute('text', 'value', `คะแนน: ${this.score} | เวลา: ${this.timeLeft}s`);
  },

  clearTargets: function () {
    while (this.targets.firstChild) this.targets.removeChild(this.targets.firstChild);
  },

  spawnTarget: function () {
    if (!this.running) return;
    const t = document.createElement('a-entity');
    t.classList.add('clickable');
    // Random position in front hemisphere
    const r = 2 + Math.random() * 2.5;
    const yaw = (Math.random() * 120 - 60) * (Math.PI / 180);
    const pitch = (Math.random() * 40 - 15) * (Math.PI / 180);
    const x = r * Math.sin(yaw) * Math.cos(pitch);
    const y = 1.6 + r * Math.sin(pitch);
    const z = -r * Math.cos(yaw) * Math.cos(pitch);

    t.setAttribute('position', `${x.toFixed(2)} ${y.toFixed(2)} ${z.toFixed(2)}`);
    t.setAttribute('geometry', 'primitive: sphere; radius: 0.12');
    t.setAttribute('material', 'color: #00e676; emissive: #004d40; metalness: 0.2; roughness:0.2');
    t.setAttribute('animation__pulse', 'property: scale; to: 1.2 1.2 1.2; dir: alternate; loop: true; dur: 500');

    // Lifetime (harder over time)
    const life = Math.max(900, 2200 - (30 - this.timeLeft) * 35);
    const timeoutId = setTimeout(() => t.remove(), life);

    t.addEventListener('click', () => {
      clearTimeout(timeoutId);
      this.score += 10;
      this.updateScore();
      // hit feedback
      t.setAttribute('material', 'color: #ffd54f; emissive: #8d6e63');
      t.setAttribute('animation__hit', 'property: scale; to: 0.01 0.01 0.01; dur: 120; easing: easeInCubic');
      setTimeout(() => t.remove(), 130);
    });

    this.targets.appendChild(t);
  }
});

// Attach game-manager to scene when loaded
document.querySelector('a-scene').addEventListener('loaded', () => {
  document.querySelector('a-scene').setAttribute('game-manager', '');
});
