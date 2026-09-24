'use strict';
/* ============================================================
   core：工具、渲染器、音频、输入、粒子
   ============================================================ */
const $ = id => document.getElementById(id);
const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const angNorm = a => { a %= TAU; if (a > Math.PI) a -= TAU; if (a < -Math.PI) a += TAU; return a; };
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const _v1 = new V3(), _v2 = new V3(), _v3 = new V3(), _v4 = new V3(), _v5 = new V3();
const _c1 = new THREE.Color();
const _q1 = new THREE.Quaternion();
const IS_TOUCH = ('ontouchstart' in window) && matchMedia('(pointer:coarse)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtT = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
const settings = Object.assign({ players: 50, diff: 1, quality: 1, sens: 1, fov: 90, vol: 0.6, view: 'tpp', skin: 0, name: '吃鸡新人' }, loadJSON('pubg3d.settings'));
function saveSettings() { try { localStorage.setItem('pubg3d.settings', JSON.stringify(settings)); } catch (e) { } }

/* 可复现随机数 */
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------------- 渲染器 ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 2600);
camera.rotation.order = 'YXZ';
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xdfeeff, 0x6b6450, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.castShadow = true;
Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 500 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun, sun.target);
const SUN_DIR = new V3(-0.5, 0.75, -0.35).normalize();

let zoomMul = 1, pScale = 500;
function updateFov() {
  const asp = innerWidth / innerHeight;
  const h = THREE.MathUtils.degToRad(settings.fov);
  let v = 2 * Math.atan(Math.tan(h / 2) / asp);
  v = Math.min(v, THREE.MathUtils.degToRad(95));
  v = 2 * Math.atan(Math.tan(v / 2) / zoomMul);
  camera.fov = THREE.MathUtils.radToDeg(v);
  camera.updateProjectionMatrix();
  pScale = (innerHeight * renderer.getPixelRatio()) / (2 * Math.tan(v / 2));
  if (typeof glowFx !== 'undefined') { glowFx.mat.uniforms.uScale.value = pScale; smokeFx.mat.uniforms.uScale.value = pScale; }
}
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; updateFov(); }
function applyQuality() {
  const q = settings.quality;
  renderer.setPixelRatio(Math.min(devicePixelRatio, [0.7, 1, 1.5][q]));
  renderer.shadowMap.enabled = q > 0; sun.castShadow = q > 0;
  const ms = q === 2 ? 4096 : 2048;
  if (sun.shadow.mapSize.x !== ms) { sun.shadow.mapSize.set(ms, ms); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  if (scene.fog) scene.fog.far = [650, 900, 1300][q];
  resize();
}
addEventListener('resize', resize);

/* ---------------- 程序化贴图 ---------------- */
function canvasTex(w, h, draw, rep, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
function shade(hex, amt) { _c1.set(hex); _c1.offsetHSL(0, 0, amt); return '#' + _c1.getHexString(); }
function noiseFill(g, w, h, base, amt, n = 2500, sz = 3) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.fillStyle = shade(base, rand(-amt, amt)); g.globalAlpha = rand(0.15, 0.5); g.fillRect(rand(0, w), rand(0, h), rand(1, sz), rand(1, sz)); }
  g.globalAlpha = 1;
}
function texBrick(base, mortar, rep) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = mortar; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 16; y++) for (let x = -1; x < 8; x++) { g.fillStyle = shade(base, rand(-0.07, 0.05)); g.fillRect(x * 42 + (y % 2) * 21 + 2, y * 16 + 2, 38, 12); }
  }, rep);
}
function texPlanks(base, rep, vertical) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < 8; y++) {
      g.fillStyle = shade(base, rand(-0.06, 0.05));
      if (vertical) g.fillRect(y * 32 + 1, 0, 30, h); else g.fillRect(0, y * 32 + 1, w, 30);
    }
    g.globalAlpha = 0.25; noiseFill(g, w, h, base, 0.1, 800); g.globalAlpha = 1;
  }, rep);
}
function texPlaster(base, rep) { return canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, base, 0.05, 3000, 4); g.strokeStyle = shade(base, -0.15); g.globalAlpha = 0.3; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(rand(0, w), rand(0, h)); g.lineTo(rand(0, w), rand(0, h)); g.stroke(); } }, rep); }
function texCorrugated(base, rep) { return canvasTex(128, 128, (g, w, h) => { for (let x = 0; x < w; x++) { g.fillStyle = shade(base, Math.sin(x / 4) * 0.08); g.fillRect(x, 0, 1, h); } g.globalAlpha = 0.3; noiseFill(g, w, h, base, 0.08, 300); }, rep); }

/* ---------------- 音频 ---------------- */
let actx = null, master = null, noiseBuf = null;
function initAudio() {
  if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = settings.vol; master.connect(actx.destination);
  noiseBuf = actx.createBuffer(1, actx.sampleRate * 2, actx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
/* 距离衰减 + 声像 + 远处低通 */
function audioOut(vol, pos, range = 60) {
  const g = actx.createGain(); g.gain.value = vol;
  if (pos) {
    const d = camera.position.distanceTo(pos);
    if (d > range) return null;
    g.gain.value = vol * Math.pow(1 - d / range, 1.6);
    let node = g;
    if (d > 60) { const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = clamp(6000 - d * 18, 500, 6000); g.connect(f); node = f; }
    if (actx.createStereoPanner) {
      const p = actx.createStereoPanner();
      _v1.copy(pos).sub(camera.position); _v1.applyQuaternion(_q1.copy(camera.quaternion).invert());
      p.pan.value = clamp(_v1.x / (Math.abs(_v1.z) + Math.abs(_v1.x) + 0.5), -0.85, 0.85);
      node.connect(p); p.connect(master);
    } else node.connect(master);
  } else g.connect(master);
  return g;
}
function tone(out, type, f0, f1, dur, vol, t0 = 0) {
  const t = actx.currentTime + t0;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
}
function noise(out, dur, vol, ftype, f0, f1, t0 = 0, q = 1) {
  const t = actx.currentTime + t0;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = ftype; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, rand(0, 1)); s.stop(t + dur + 0.02);
}
const SFX = {
  ar(o) { noise(o, 0.16, 0.8, 'lowpass', 5000, 400); tone(o, 'sine', 140, 50, 0.12, 0.6); noise(o, 0.5, 0.12, 'bandpass', 900, 300, 0.06, 0.7); },
  ak(o) { noise(o, 0.2, 0.9, 'lowpass', 3800, 300); tone(o, 'sine', 110, 40, 0.14, 0.7); noise(o, 0.6, 0.14, 'bandpass', 700, 250, 0.06, 0.7); },
  smg(o) { noise(o, 0.1, 0.6, 'lowpass', 4500, 600); tone(o, 'sine', 180, 70, 0.07, 0.4); },
  dmr(o) { noise(o, 0.25, 0.9, 'lowpass', 6000, 400); tone(o, 'sine', 120, 45, 0.15, 0.7); noise(o, 0.8, 0.15, 'bandpass', 800, 200, 0.08, 0.7); },
  sniper(o) { noise(o, 0.35, 1, 'lowpass', 7000, 200); tone(o, 'sine', 90, 30, 0.3, 0.9); noise(o, 1.3, 0.2, 'bandpass', 600, 150, 0.1, 0.6); },
  shotgun(o) { noise(o, 0.35, 1, 'lowpass', 3000, 150); tone(o, 'sine', 80, 30, 0.25, 0.9); },
  bolt(o) { tone(o, 'square', 500, 480, 0.04, 0.07, 0.35); tone(o, 'square', 700, 650, 0.04, 0.07, 0.6); },
  empty(o) { tone(o, 'square', 900, 880, 0.03, 0.08); },
  reload(o) { tone(o, 'square', 420, 400, 0.04, 0.08); tone(o, 'square', 650, 600, 0.04, 0.08, 0.3); noise(o, 0.06, 0.15, 'highpass', 3000, 2000, 0.5); },
  hit(o) { tone(o, 'square', 1600, 1500, 0.04, 0.1); },
  head(o) { tone(o, 'triangle', 2400, 2300, 0.15, 0.25); noise(o, 0.05, 0.2, 'highpass', 4000, 3000); },
  hurt(o) { noise(o, 0.12, 0.4, 'lowpass', 700, 200); },
  kill(o) { tone(o, 'triangle', 700, 700, 0.1, 0.2); tone(o, 'triangle', 1050, 1050, 0.2, 0.2, 0.08); },
  whiz(o) { noise(o, 0.12, 0.35, 'bandpass', 4000, 1500, 0, 3); },
  crack(o) { noise(o, 0.05, 0.5, 'highpass', 3000, 2500); },
  impact(o) { noise(o, 0.06, 0.25, 'bandpass', 1800, 900, 0, 2); },
  boom(o) { noise(o, 1.2, 1, 'lowpass', 1500, 40); tone(o, 'sine', 70, 25, 0.9, 1); },
  pin(o) { tone(o, 'square', 1200, 1100, 0.04, 0.08); tone(o, 'triangle', 2000, 1800, 0.08, 0.06, 0.1); },
  pickup(o) { noise(o, 0.08, 0.25, 'bandpass', 1500, 800, 0, 2); tone(o, 'sine', 500, 700, 0.06, 0.08); },
  heal(o) { noise(o, 0.5, 0.15, 'bandpass', 2500, 1500, 0, 3); },
  healdone(o) { tone(o, 'sine', 600, 900, 0.15, 0.12); },
  step(o) { noise(o, 0.07, 0.14, 'lowpass', 900, 200); },
  land(o) { noise(o, 0.15, 0.4, 'lowpass', 600, 100); },
  chute(o) { noise(o, 0.5, 0.5, 'bandpass', 400, 1500, 0, 1); },
  zone(o) { tone(o, 'sine', 440, 440, 0.3, 0.15); tone(o, 'sine', 330, 330, 0.5, 0.15, 0.3); },
  alert(o) { tone(o, 'sine', 880, 880, 0.15, 0.15); tone(o, 'sine', 660, 660, 0.25, 0.15, 0.18); },
  click(o) { tone(o, 'square', 1000, 1000, 0.03, 0.06); },
  door(o) { noise(o, 0.2, 0.3, 'lowpass', 800, 300); },
  crash(o) { noise(o, 0.5, 0.8, 'lowpass', 1500, 100); tone(o, 'sawtooth', 120, 40, 0.3, 0.2); },
  horn(o) { tone(o, 'square', 400, 400, 0.4, 0.12); tone(o, 'square', 500, 500, 0.4, 0.1); },
  win(o) { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(o, 'triangle', f, f, 0.35, 0.2, i * 0.12)); },
};
function sfx(name, pos = null, vol = 1, range = 60) {
  if (!actx || !SFX[name]) return;
  try { const o = audioOut(vol, pos, range); if (o) SFX[name](o); } catch (e) { }
}
function setVolume(v) { settings.vol = v; if (master) master.gain.value = v; }
/* 持续音（飞机/风/引擎） */
function makeLoop(kind) {
  if (!actx) return null;
  const g = actx.createGain(); g.gain.value = 0; g.connect(master);
  const nodes = [];
  if (kind === 'wind') {
    const s = actx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 0.6;
    s.connect(f); f.connect(g); s.start(); nodes.push(s); return { g, set(v, p = 1) { g.gain.setTargetAtTime(v, actx.currentTime, 0.1); f.frequency.setTargetAtTime(400 + p * 900, actx.currentTime, 0.1); }, stop() { s.stop(); g.disconnect(); } };
  }
  const o1 = actx.createOscillator(), o2 = actx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square';
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = kind === 'plane' ? 300 : 500;
  const base = kind === 'plane' ? 55 : 40;
  o1.frequency.value = base; o2.frequency.value = base * 1.5;
  const g2 = actx.createGain(); g2.gain.value = 0.3;
  o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); o1.start(); o2.start();
  return { g, set(v, p = 1) { g.gain.setTargetAtTime(v, actx.currentTime, 0.1); o1.frequency.setTargetAtTime(base * p, actx.currentTime, 0.1); o2.frequency.setTargetAtTime(base * 1.5 * p, actx.currentTime, 0.1); }, stop() { o1.stop(); o2.stop(); g.disconnect(); } };
}

/* ---------------- 输入 ---------------- */
const keys = {}, pressed = new Set(), mouseBtn = {};
let mdx = 0, mdy = 0, wheel = 0;
const locked = () => document.pointerLockElement === $('gl');
addEventListener('keydown', e => {
  if (G.state === 'play' && !['F5', 'F11', 'F12'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed.add(e.code);
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; for (const k in mouseBtn) mouseBtn[k] = false; });
addEventListener('mousedown', e => { if (G.state === 'play' && locked()) { mouseBtn[e.button] = true; pressed.add('M' + e.button); } });
addEventListener('mouseup', e => { mouseBtn[e.button] = false; });
addEventListener('mousemove', e => { if (locked()) { mdx += e.movementX; mdy += e.movementY; } });
addEventListener('wheel', e => { if (G.state === 'play') wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- 粒子 ---------------- */
class PSys {
  constructor(max, additive) {
    this.max = max; this.head = 0; this.active = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max); this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.ml = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max); this.a0 = new Float32Array(max);
    this.grav = new Float32Array(max); this.drag = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3); this.aCol = new THREE.BufferAttribute(this.col, 3);
    this.aSize = new THREE.BufferAttribute(this.size, 1); this.aAlpha = new THREE.BufferAttribute(this.alpha, 1);
    [this.aPos, this.aCol, this.aSize, this.aAlpha].forEach(a => a.setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('position', this.aPos); g.setAttribute('pcol', this.aCol); g.setAttribute('psize', this.aSize); g.setAttribute('palpha', this.aAlpha);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 500 } },
      vertexShader: `attribute vec3 pcol;attribute float psize;attribute float palpha;uniform float uScale;varying vec3 vC;varying float vA;
        void main(){vC=pcol;vA=palpha;vec4 mv=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(psize*uScale/max(-mv.z,0.05),512.0);gl_Position=projectionMatrix*mv;}`,
      fragmentShader: `varying vec3 vC;varying float vA;void main(){vec2 c=gl_PointCoord-0.5;float d=length(c);if(d>0.5)discard;float a=smoothstep(0.5,${additive ? '0.0' : '0.2'},d);gl_FragColor=vec4(vC,a*vA);}`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 20 : 19;
    scene.add(this.points);
  }
  spawn(x, y, z, vx, vy, vz, color, s0, s1, life, grav = 0, drag = 0, a0 = 1) {
    const i = this.head; this.head = (i + 1) % this.max; const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    _c1.set(color); this.col[i3] = _c1.r; this.col[i3 + 1] = _c1.g; this.col[i3 + 2] = _c1.b;
    this.s0[i] = s0; this.s1[i] = s1; this.size[i] = s0; this.life[i] = life; this.ml[i] = life;
    this.grav[i] = grav; this.drag[i] = drag; this.a0[i] = a0; this.alpha[i] = a0;
    this.active = Math.min(this.max, this.active + 1);
  }
  update(dt) {
    if (this.active <= 0) return;
    let alive = 0; const P = this.pos, Vl = this.vel;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      alive++;
      const i3 = i * 3, t = 1 - this.life[i] / this.ml[i], dr = Math.max(0, 1 - this.drag[i] * dt);
      Vl[i3] *= dr; Vl[i3 + 1] = Vl[i3 + 1] * dr - this.grav[i] * dt; Vl[i3 + 2] *= dr;
      P[i3] += Vl[i3] * dt; P[i3 + 1] += Vl[i3 + 1] * dt; P[i3 + 2] += Vl[i3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * (1 - t * t);
    }
    this.active = alive;
    this.aPos.needsUpdate = this.aCol.needsUpdate = this.aSize.needsUpdate = this.aAlpha.needsUpdate = true;
  }
  clear() { this.life.fill(0); this.alpha.fill(0); this.size.fill(0); this.active = 1; this.update(0); }
}
const glowFx = new PSys(2500, true);
const smokeFx = new PSys(2500, false);
function burst(p, n, color, speed, size, life, grav = 0, smoke = false) {
  const sys = smoke ? smokeFx : glowFx;
  for (let i = 0; i < n; i++) {
    _v5.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.3, 1));
    sys.spawn(p.x, p.y, p.z, _v5.x, _v5.y, _v5.z, color, size * rand(0.6, 1.2), size * 0.2, life * rand(0.6, 1.2), grav, 2);
  }
}
function impactFx(p, color = '#b8a88a') {
  for (let i = 0; i < 5; i++) smokeFx.spawn(p.x, p.y, p.z, rand(-1, 1), rand(0.5, 2), rand(-1, 1), color, 0.12, 0.45, 0.6, 3, 2, 0.8);
  glowFx.spawn(p.x, p.y, p.z, 0, 0, 0, '#ffd9a0', 0.15, 0.02, 0.06);
}
function bloodFx(p) { for (let i = 0; i < 8; i++) smokeFx.spawn(p.x, p.y, p.z, rand(-1.5, 1.5), rand(-0.5, 1.5), rand(-1.5, 1.5), pick(['#8a0d0d', '#b01818', '#6d0808']), 0.12, 0.3, 0.5, 6, 2, 0.9); }
function explosionFx(p, r = 5) {
  burst(p, 50, '#ff9a3a', r * 3, 1.4, 0.5, 1);
  burst(p, 25, '#fff0b0', r * 2, 0.9, 0.25);
  for (let i = 0; i < 22; i++) smokeFx.spawn(p.x + rand(-1, 1), p.y + rand(0, 1), p.z + rand(-1, 1), rand(-2, 2), rand(1, 4), rand(-2, 2), '#4a4a4a', r * 0.4, r * 1.2, rand(1.5, 2.5), -0.3, 1.2, 0.7);
  flashLight(p, '#ffaa55', 60, r * 6, 0.25);
}
const flashPool = [];
for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffaa55, 0, 10, 2); l.userData.t = 0; scene.add(l); flashPool.push(l); }
let flashIdx = 0;
function flashLight(p, color, intensity, dist, dur) {
  const l = flashPool[flashIdx++ % flashPool.length];
  l.position.copy(p); l.color.set(color); l.intensity = intensity; l.distance = dist; l.userData.t = dur; l.userData.d = dur; l.userData.i = intensity;
}
function updateFlash(dt) { for (const l of flashPool) if (l.userData.t > 0) { l.userData.t -= dt; l.intensity = Math.max(0, l.userData.i * l.userData.t / l.userData.d); } }

/* 曳光条（子弹可视化） */
const tracerGeo = new THREE.BoxGeometry(1, 1, 1); tracerGeo.translate(0, 0, 0.5);
const tracers = [];
for (let i = 0; i < 80; i++) {
  const m = new THREE.Mesh(tracerGeo, new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.visible = false; m.frustumCulled = false; m.renderOrder = 21; m.userData = { t: 0, d: 0 }; scene.add(m); tracers.push(m);
}
let tracerIdx = 0;
function tracer(a, b, color = '#ffe0a0', w = 0.02, life = 0.05) {
  const m = tracers[tracerIdx++ % tracers.length];
  m.position.copy(a); m.lookAt(b); m.scale.set(w, w, Math.max(0.01, a.distanceTo(b)));
  m.material.color.set(color); m.material.opacity = 0.9; m.visible = true; m.userData.t = life; m.userData.d = life;
}
function updateTracers(dt) { for (const m of tracers) if (m.visible) { m.userData.t -= dt; if (m.userData.t <= 0) m.visible = false; else m.material.opacity = 0.9 * m.userData.t / m.userData.d; } }

/* 几何合并（减少绘制调用） */
function mergeGeos(list) {
  let n = 0; const parts = [];
  for (const g of list) { const ng = g.index ? g.toNonIndexed() : g; parts.push(ng); n += ng.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let hasCol = parts.some(p => p.attributes.color), col = hasCol ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const p of parts) {
    const c = p.attributes.position.count;
    pos.set(p.attributes.position.array, o * 3); nor.set(p.attributes.normal.array, o * 3);
    if (p.attributes.uv) uv.set(p.attributes.uv.array, o * 2);
    if (col) { if (p.attributes.color) col.set(p.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + c) * 3); }
    o += c; p.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
function disposeGroup(g) {
  g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && !m.map.userData.shared) m.map.dispose(); m.dispose(); }); });
}
