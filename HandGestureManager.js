// HandGestureManager.js
// รองรับ pinch / wave สำหรับมือซ้ายและขวา
// วิธีใช้:
//   const hgm = new HandGestureManager(renderer.xr);
//   hgm.on('pinchstart', (e) => { /* e.hand = 'left'|'right' */ });
//   hgm.on('pinchend',   (e) => {});
//   hgm.on('wave',       (e) => {});
//   ใน game loop เรียก hgm.update(frame);

export class HandGestureManager {
  constructor(xr) {
    this.xr = xr;
    this.refSpace = null;
    this.listeners = { pinchstart: [], pinchend: [], wave: [] };
    this.state = {
      left:  this._makeHandState(),
      right: this._makeHandState(),
    };

    this.cfg = {
      pinchThreshold: 0.022,     // ระยะ thumb-index (เมตร) ที่ถือว่า pinch
      pinchHysteresis: 0.005,    // กันเด้ง เมื่อเลิก pinch
      waveWindowMs: 600,         // หน้าต่างเวลาตรวจ wave
      waveMinSwings: 2,          // อย่างน้อย 2 การส่าย ซ้าย-ขวา
      waveMinAmplitude: 0.06,    // ระยะส่ายรวมอย่างน้อย ~6 ซม.
      waveMinSpeed: 0.25,        // m/s โดยประมาณ
    };

    this._ensureRefSpace();
    this.update = this.update.bind(this);
  }

  _makeHandState() {
    return {
      pinching: false,
      lastPinchDist: Infinity,
      wristTrail: [], // [{t, x}]
      lastWaveTime: 0,
    };
  }

  async _ensureRefSpace() {
    try {
      this.refSpace = await this.xr.getSession().requestReferenceSpace?.('local-floor')
                 || await this.xr.getReferenceSpace?.();
    } catch (e) {
      console.warn('RefSpace not ready; relying on renderer.xr reference space', e);
    }
  }

  on(type, cb) {
    if (this.listeners[type]) this.listeners[type].push(cb);
  }

  _emit(type, payload) {
    const list = this.listeners[type] || [];
    for (const cb of list) cb(payload);
  }

  update(frame) {
    const session = this.xr.getSession?.();
    if (!session || !frame) return;

    for (const source of session.inputSources) {
      if (!source.hand) continue;
      const handedness = source.handedness === 'left' ? 'left' : 'right';
      const hs = this.state[handedness];

      const pinchDist = this._getThumbIndexDistance(frame, source);
      if (pinchDist !== null) {
        this._updatePinchState(handedness, hs, pinchDist);
      }

      const wristX = this._getJointX(frame, source, 'wrist');
      if (wristX !== null) {
        this._updateWaveState(handedness, hs, wristX);
      }
    }
  }

  _getThumbIndexDistance(frame, source) {
    try {
      const ref = this.xr.getReferenceSpace?.() || this.refSpace;
      if (!ref) return null;
      const thumb = frame.getJointPose(source.hand.get('thumb-tip'), ref);
      const index = frame.getJointPose(source.hand.get('index-finger-tip'), ref);
      if (!thumb || !index || !thumb.transform || !index.transform) return null;

      const dx = thumb.transform.position.x - index.transform.position.x;
      const dy = thumb.transform.position.y - index.transform.position.y;
      const dz = thumb.transform.position.z - index.transform.position.z;
      return Math.hypot(dx, dy, dz);
    } catch {
      return null;
    }
  }

  _getJointX(frame, source, jointName) {
    try {
      const ref = this.xr.getReferenceSpace?.() || this.refSpace;
      if (!ref) return null;
      const jp = frame.getJointPose(source.hand.get(jointName), ref);
      if (!jp || !jp.transform) return null;
      return jp.transform.position.x;
    } catch {
      return null;
    }
  }

  _updatePinchState(handedness, hs, dist) {
    const { pinchThreshold, pinchHysteresis } = this.cfg;
    const wasPinching = hs.pinching;
    const goingPinch   = dist <= pinchThreshold;
    const goingRelease = dist >= (pinchThreshold + pinchHysteresis);

    if (!wasPinching && goingPinch) {
      hs.pinching = true;
      this._emit('pinchstart', { hand: handedness });
    } else if (wasPinching && goingRelease) {
      hs.pinching = false;
      this._emit('pinchend', { hand: handedness });
    }

    hs.lastPinchDist = dist;
  }

  _updateWaveState(handedness, hs, wristX) {
    const now = performance.now();
    hs.wristTrail.push({ t: now, x: wristX });

    const windowMs = this.cfg.waveWindowMs;
    while (hs.wristTrail.length && (now - hs.wristTrail[0].t) > windowMs) {
      hs.wristTrail.shift();
    }
    if (hs.wristTrail.length < 3) return;

    let swings = 0;
    let lastDir = 0;
    let minX = hs.wristTrail[0].x;
    let maxX = hs.wristTrail[0].x;
    for (let i = 1; i < hs.wristTrail.length; i++) {
      const dx = hs.wristTrail[i].x - hs.wristTrail[i - 1].x;
      const dir = Math.sign(dx);
      if (dir !== 0 && lastDir !== 0 && dir !== lastDir) swings++;
      if (dir !== 0) lastDir = dir;
      if (hs.wristTrail[i].x < minX) minX = hs.wristTrail[i].x;
      if (hs.wristTrail[i].x > maxX) maxX = hs.wristTrail[i].x;
    }
    const amplitude = Math.abs(maxX - minX);

    const dt = (hs.wristTrail.at(-1).t - hs.wristTrail[0].t) / 1000;
    const speed = dt > 0 ? amplitude / dt : 0;

    const ok =
      swings >= this.cfg.waveMinSwings &&
      amplitude >= this.cfg.waveMinAmplitude &&
      speed >= this.cfg.waveMinSpeed;

    if (ok && (performance.now() - hs.lastWaveTime) > 800) {
      hs.lastWaveTime = performance.now();
      this._emit('wave', { hand: handedness });
      hs.wristTrail = hs.wristTrail.slice(-3);
    }
  }
}
