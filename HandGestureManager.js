// HandGestureManager.js
// รองรับ pinch / wave สำหรับมือซ้ายและขวา
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
      pinchThreshold: 0.022,
      pinchHysteresis: 0.005,
      waveWindowMs: 600,
      waveMinSwings: 2,
      waveMinAmplitude: 0.06,
      waveMinSpeed: 0.25,
    };
    this._ensureRefSpace();
    this.update = this.update.bind(this);
  }
  _makeHandState() {
    return { pinching:false, lastPinchDist:Infinity, wristTrail:[], lastWaveTime:0 };
  }
  async _ensureRefSpace() {
    try {
      this.refSpace = await this.xr.getSession().requestReferenceSpace?.('local-floor')
          || await this.xr.getReferenceSpace?.();
    } catch (e) { /* ignore */ }
  }
  on(type, cb){ if (this.listeners[type]) this.listeners[type].push(cb); }
  _emit(type, payload){ (this.listeners[type]||[]).forEach(cb=>cb(payload)); }
  update(frame){
    const session = this.xr.getSession?.();
    if (!session || !frame) return;
    for (const source of session.inputSources){
      if (!source.hand) continue;
      const handedness = source.handedness === 'left' ? 'left' : 'right';
      const hs = this.state[handedness];
      const pinchDist = this._getThumbIndexDistance(frame, source);
      if (pinchDist !== null) this._updatePinchState(handedness, hs, pinchDist);
      const wristX = this._getJointX(frame, source, 'wrist');
      if (wristX !== null) this._updateWaveState(handedness, hs, wristX);
    }
  }
  _getThumbIndexDistance(frame, source){
    try {
      const ref = this.xr.getReferenceSpace?.() || this.refSpace; if (!ref) return null;
      const thumb = frame.getJointPose(source.hand.get('thumb-tip'), ref);
      const index = frame.getJointPose(source.hand.get('index-finger-tip'), ref);
      if (!thumb || !index || !thumb.transform || !index.transform) return null;
      const dx = thumb.transform.position.x - index.transform.position.x;
      const dy = thumb.transform.position.y - index.transform.position.y;
      const dz = thumb.transform.position.z - index.transform.position.z;
      return Math.hypot(dx, dy, dz);
    } catch { return null; }
  }
  _getJointX(frame, source, joint){
    try {
      const ref = this.xr.getReferenceSpace?.() || this.refSpace; if (!ref) return null;
      const jp = frame.getJointPose(source.hand.get(joint), ref);
      if (!jp || !jp.transform) return null;
      return jp.transform.position.x;
    } catch { return null; }
  }
  _updatePinchState(handedness, hs, dist){
    const { pinchThreshold, pinchHysteresis } = this.cfg;
    const was = hs.pinching;
    const nowPinch = dist <= pinchThreshold;
    const nowRelease = dist >= (pinchThreshold + pinchHysteresis);
    if (!was && nowPinch){ hs.pinching = true;  this._emit('pinchstart', { hand: handedness }); }
    else if (was && nowRelease){ hs.pinching = false; this._emit('pinchend', { hand: handedness }); }
    hs.lastPinchDist = dist;
  }
  _updateWaveState(handedness, hs, wristX){
    const now = performance.now();
    hs.wristTrail.push({ t: now, x: wristX });
    const windowMs = this.cfg.waveWindowMs;
    while (hs.wristTrail.length && (now - hs.wristTrail[0].t) > windowMs) hs.wristTrail.shift();
    if (hs.wristTrail.length < 3) return;
    let swings=0, lastDir=0, minX=hs.wristTrail[0].x, maxX=hs.wristTrail[0].x;
    for (let i=1;i<hs.wristTrail.length;i++){
      const dx = hs.wristTrail[i].x - hs.wristTrail[i-1].x;
      const dir = Math.sign(dx);
      if (dir!==0 && lastDir!==0 && dir!==lastDir) swings++;
      if (dir!==0) lastDir = dir;
      if (hs.wristTrail[i].x < minX) minX = hs.wristTrail[i].x;
      if (hs.wristTrail[i].x > maxX) maxX = hs.wristTrail[i].x;
    }
    const amplitude = Math.abs(maxX - minX);
    const dt = (hs.wristTrail.at(-1).t - hs.wristTrail[0].t)/1000;
    const speed = dt>0 ? amplitude/dt : 0;
    const ok = swings>=this.cfg.waveMinSwings && amplitude>=this.cfg.waveMinAmplitude && speed>=this.cfg.waveMinSpeed;
    if (ok && (performance.now() - hs.lastWaveTime) > 800){
      hs.lastWaveTime = performance.now();
      this._emit('wave', { hand: handedness });
      hs.wristTrail = hs.wristTrail.slice(-3);
    }
  }
}
