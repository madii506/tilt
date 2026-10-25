// tilt: the table. One warm lamp over red felt, stacks of chips, and the intro:
// a chip drops, rolls on its edge, wobbles down like a coin on a bar top, and tips over flat. Then the camera pulls back.
import * as THREE from 'three';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';
import { chip, chipKit, feltTexture } from './chips.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lin = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const smooth = t => t * t * (3 - 2 * t), ease = t => 1 - Math.pow(1 - t, 3), inout = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const DEBUG_T = (() => { const m = /[?&]introAt=([\d.]+)/.exec(location.search); return m ? +m[1] : null; })();
export const END = 7.4;

export function createTable(canvas, { intro = true, mobile = false } = {}) {
  const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  R.setPixelRatio(Math.min(mobile ? 1.5 : 2, devicePixelRatio || 1)); R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = .92;
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.setClearColor(0x120207, 1);
  const scene = new THREE.Scene(); scene.fog = new THREE.Fog(0x120207, 14, 34);
  scene.environment = new THREE.PMREMGenerator(R).fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .32;

  // felt
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: feltTexture(14), roughness: .96 }));
  felt.rotation.x = -Math.PI / 2; felt.receiveShadow = true; scene.add(felt);
  // the rail of the table, far back, catches a little light
  const rail = new THREE.Mesh(new THREE.TorusGeometry(15, .55, 24, 160, Math.PI * .9), new THREE.MeshPhysicalMaterial({ color: 0x2a0b10, roughness: .35, clearcoat: .8 }));
  rail.rotation.x = Math.PI / 2; rail.rotation.z = Math.PI * .05; rail.position.set(1, .4, 8); scene.add(rail);

  // light: one lamp that flickers on, then sways a little
  const hemi = new THREE.HemisphereLight(0xffd9c4, 0x2a0710, 0); scene.add(hemi);
  const lamp = new THREE.SpotLight(0xffe6c8, 0, 46, .6, .75, 1.5); lamp.position.set(2.4, 13, 3.2); lamp.target.position.set(2.2, 0, .8);
  lamp.castShadow = true; lamp.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048); lamp.shadow.radius = 5; lamp.shadow.bias = -.0004; scene.add(lamp, lamp.target);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.25, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe8c8 })); bulb.position.copy(lamp.position); scene.add(bulb);
  const LAMP = 300;
  // the cone of light under the lamp, with dust drifting in it
  const coneTex = (() => { const c = document.createElement('canvas'); c.width = 4; c.height = 256; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,230,200,.9)'); g.addColorStop(1, 'rgba(255,230,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(.22, 6.2, 13, 48, 1, true), new THREE.MeshBasicMaterial({ map: coneTex, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  cone.position.set(2.4, 6.5, 3.2); scene.add(cone);
  const DUST = mobile ? 160 : 360, dpos = new Float32Array(DUST * 3), dseed = new Float32Array(DUST);
  for (let i = 0; i < DUST; i++) { const h = Math.random(), r = Math.sqrt(Math.random()) * (.3 + h * 5.4), a = Math.random() * Math.PI * 2; dpos.set([2.4 + Math.cos(a) * r, 13 - h * 12.6, 3.2 + Math.sin(a) * r], i * 3); dseed[i] = Math.random() * 100; }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,240,220,1)'); g.addColorStop(1, 'rgba(255,240,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const dust = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: .05, map: dotTex, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); scene.add(dust);
  const DBASE = dpos.slice();

  // chips on the table
  chipKit();
  const stacks = new THREE.Group(); scene.add(stacks);
  const put = (kind, x, y, z, ry) => { const c = chip(kind); c.position.set(x, y, z); c.rotation.y = ry; stacks.add(c); return c; };
  const stack = (kind, x, z, n, seed = 1) => { for (let i = 0; i < n; i++) put(i % 5 === 4 ? 'ink' : kind, x + Math.sin(i * 1.7 + seed) * .045, .1 + i * .205, z + Math.cos(i * 2.3 + seed) * .045, i * .7 + seed); };
  if (mobile) { stack('cream', 3.6, -1.4, 8); stack('red', 5.4, -.2, 5, 2); stack('ink', 1.2, -2.4, 4, 3); }
  else { stack('cream', 4.6, -1.2, 10); stack('red', 6.8, .4, 6, 2); stack('ink', 3.0, -2.8, 5, 3); stack('cream', 8.4, -2.2, 7, 4); stack('red', 6.2, -3.6, 3, 5);
    put('cream', 5.6, .1, 2.2, .3); put('ink', 7.4, .1, 3.0, 1.9); put('red', 8.9, .1, 1.2, .8); }

  // the intro chip: yaw (heading / precession) > tilt > spin
  const hero = { g: new THREE.Group(), yaw: new THREE.Group(), tilt: new THREE.Group(), mesh: chip('cream') };
  hero.g.add(hero.yaw); hero.yaw.add(hero.tilt); hero.tilt.add(hero.mesh); scene.add(hero.g);
  { const m = chipKit().cream, top = m[1].clone(); hero.mesh.material = [m[0], top, top]; hero.top = top; }
  const RAD = 1, HALF = .1;
  const LAND = mobile ? V(-.6, 0, .6) : V(.6, 0, .4), REST = mobile ? V(1.0, 0, 1.4) : V(2.3, 0, 1.3);
  // the rolling path: from LAND, curving to REST
  const path = new THREE.QuadraticBezierCurve3(LAND, mobile ? V(.8, 0, -.2) : V(2.2, 0, -.4), REST);
  const PATH_LEN = path.getLength();

  const cam = new THREE.PerspectiveCamera(30, 1, .1, 200);
  // click the felt and a chip drops there
  const DROPS = [], ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = V(), KINDS = ['cream', 'red', 'ink'];
  canvas.addEventListener('pointerdown', e => {
    if (!st.done) return; const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    if (!ray.ray.intersectPlane(plane, hit) || hit.length() > 22) return;
    let d = DROPS.length >= 14 ? DROPS.shift() : null;
    if (!d) { d = { g: new THREE.Group(), yaw: new THREE.Group(), tilt: new THREE.Group(), mesh: chip(KINDS[DROPS.length % 3]) }; d.g.add(d.yaw); d.yaw.add(d.tilt); d.tilt.add(d.mesh); scene.add(d.g); }
    Object.assign(d, { vy: 0, t: 0, landed: false, spin: Math.random() * 6, prec: Math.random() * 6, a0: .35 + Math.random() * .35 });
    d.g.position.set(hit.x, 5.5, hit.z); d.tilt.rotation.z = d.a0; d.yaw.rotation.y = d.prec; DROPS.push(d);
  });
  const st = { jolt: 0, t: 0, intro, done: !intro, introStart: 0, started: false, mx: 0, my: 0, smx: 0, smy: 0, reel: 0, visible: true, onIntroEnd: null, onBeat: null, beat: -1, pulse: 0 };
  const HERO = () => mobile ? [V(.9, 9.4, 15.5), V(2.0, -3.4, .4)] : [V(-2.2, 6.2, 12.6), V(1.2, .6, -.3)];
  const TOP = () => mobile ? [V(1.1, 7.4, 4.2), V(1.0, 0, .9)] : [V(2.5, 6.6, 4.6), V(2.3, 0, .9)];

  function size() { const r = canvas.getBoundingClientRect(); R.setSize(r.width, r.height, false); cam.aspect = r.width / Math.max(1, r.height); cam.fov = cam.aspect < 1 ? 42 : 30; cam.updateProjectionMatrix(); }
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { st.mx = e.clientX / innerWidth * 2 - 1; st.my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  new IntersectionObserver(es => { st.visible = es[0].isIntersecting; }).observe(canvas);

  // chip pose at intro time t (seconds)
  const T_DROP = .85, T_LAND = 1.75, T_ROLL = 3.0, T_FLAT = 5.0, T_SETTLE = 5.35;
  let spin = 0, prec = 0, lastT = 0;
  function chipAt(t, dt) {
    let pos = LAND.clone(), a = Math.PI / 2, heading = 0, y;
    if (t < T_LAND) {   // falling on its edge, spinning
      const k = lin(t, T_DROP, T_LAND); y = RAD + (1 - k * k) * 3.6; spin += dt * 9;
      heading = Math.atan2(path.getTangent(0).x, path.getTangent(0).z);
      hero.g.visible = t > T_DROP;
      pos.y = y;
    } else if (t < T_ROLL) {   // rolling on its edge along the curve, slowing, starting to lean
      const k = lin(t, T_LAND, T_ROLL), s = 1 - Math.pow(1 - k, 2.2); const p = path.getPointAt(s), tg = path.getTangentAt(s);
      pos.copy(p); heading = Math.atan2(tg.x, tg.z); a = Math.PI / 2 - smooth(k) * .42;
      const bounce = t - T_LAND < .28 ? Math.sin((t - T_LAND) / .28 * Math.PI) * .22 * (1 - (t - T_LAND) / .28) : 0;
      spin += (PATH_LEN * 2.2 * Math.pow(1 - k, 1.2) / (T_ROLL - T_LAND)) * dt / RAD; hero.g.visible = true;
      pos.y = RAD * Math.sin(a) + HALF * Math.cos(a) + bounce; prec = heading;
    } else {   // the wobble: tilt falls, precession speeds up (the whirr), then it lies flat with a little thunk
      const k = lin(t, T_ROLL, T_FLAT); a = (Math.PI / 2 - .42) * Math.pow(1 - k, 1.6);
      prec += dt * Math.min(46, 2.6 / Math.sqrt(Math.sin(a) + .015)); heading = prec; pos.copy(REST);
      const thunk = t > T_FLAT && t < T_SETTLE ? Math.sin(lin(t, T_FLAT, T_SETTLE) * Math.PI) * .05 : 0;
      pos.y = RAD * Math.sin(a) + HALF * Math.cos(a) + thunk; spin *= .99;
    }
    hero.g.position.copy(pos); hero.yaw.rotation.y = heading; hero.tilt.rotation.z = a; hero.mesh.rotation.y = spin;
  }
  function restPose() { hero.g.visible = true; hero.g.position.set(REST.x, HALF, REST.z); hero.tilt.rotation.z = 0; hero.yaw.rotation.y = prec || 2.1; }

  // camera keys for the intro: [t, position, look]
  const FO = mobile ? V(1.0, 1.7, 5.4) : V(2.6, 1.5, 3.8);
  const follow = (t) => { const p = hero.g.position; return [V(p.x + FO.x, Math.max(1.6, p.y + FO.y), p.z + FO.z), V(p.x, Math.min(p.y, 1.2), p.z)]; };
  let last = performance.now(); const look = V(), camPos = V();
  function frame(now) {
    requestAnimationFrame(frame); const dt = clamp((now - last) / 1000, 0, .05); last = now; if (!st.visible) return; st.t += dt;
    if (!st.started) { st.started = true; st.introStart = now; }
    st.smx += (st.mx - st.smx) * Math.min(1, dt * 2.2); st.smy += (st.my - st.smy) * Math.min(1, dt * 2.2);
    let lampK = 1;
    if (!st.done) {
      const t = DEBUG_T != null ? DEBUG_T : (now - st.introStart) / 1000, idt = Math.max(0, t - lastT); lastT = t;
      // lamp flickers on
      lampK = smooth(lin(t, .15, .9)) * (t > .2 && t < .75 ? (Math.sin(t * 90) > .2 ? 1 : .35) : 1);
      if (DEBUG_T != null) { // jump straight to t for screenshots: integrate quickly
        if (!st._sim) { st._sim = 1; for (let s = 0; s < t; s += 1 / 60) chipAt(s, 1 / 60); } }
      else chipAt(t, idt);
      // beats for the captions
      const beats = [.5, 1.8, 3.3, 5.0]; const b = beats.filter(x => t >= x).length - 1; if (b !== st.beat) { st.beat = b; st.onBeat && st.onBeat(b); }
      // camera: close and low, following the chip; then pull back to the hero framing
      const [fp, fl] = follow(t), [hp, hl] = HERO();
      const open = mobile ? [V(LAND.x + .8, 2.4, LAND.z + 7.2), V(LAND.x, 1.9, LAND.z)] : [V(LAND.x + 3.6, 2.2, LAND.z + 5.6), V(LAND.x, 1.7, LAND.z)];
      const k1 = smooth(lin(t, 1.5, 2.4)), k2 = inout(lin(t, 5.3, END));
      camPos.copy(open[0]).lerp(fp, k1).lerp(hp, k2); look.copy(open[1]).lerp(fl, k1).lerp(hl, k2);
      if (t > T_FLAT) st.pulse = Math.max(st.pulse, 1 - lin(t, T_FLAT, T_FLAT + 1.6));
      if (t > T_FLAT && !st._jolted && DEBUG_T == null) { st._jolted = 1; st.jolt = 1; st.onThunk && st.onThunk(); }
      if (t >= END && DEBUG_T == null) { st.done = true; restPose(); st.onIntroEnd && st.onIntroEnd(); }
    } else {
      if (!st._rest) { st._rest = 1; restPose(); }
      const [hp, hl] = HERO(), [tp, tl] = TOP(), k = smooth(clamp(st.reel * 1.25, 0, 1));
      camPos.copy(hp).lerp(tp, k); look.copy(hl).lerp(tl, k);
      camPos.x += st.smx * .55 * (1 - k * .6); camPos.y -= st.smy * .3 * (1 - k * .6);
      // the idle hero chip turns very slowly, like someone is spinning it with a finger
      hero.yaw.rotation.y += dt * .12;
      st.pulse *= .985;
    }
    cam.position.copy(camPos); cam.lookAt(look);
    // chips you drop with a click: fall, bounce once, wobble flat
    for (let i = DROPS.length - 1; i >= 0; i--) { const d = DROPS[i]; d.t += dt;
      if (!d.landed) { d.vy -= 26 * dt; d.g.position.y += d.vy * dt; d.spin += dt * 7; if (d.g.position.y <= HALF + d.a0 * .9) { d.g.position.y = HALF + d.a0 * .9; if (d.vy < -3) d.vy = -d.vy * .28; else { d.landed = true; d.t = 0; } } }
      else { const amp = d.a0 * Math.exp(-d.t * 2.4); d.prec += dt * Math.min(30, 3 / Math.sqrt(amp + .02)); d.tilt.rotation.z = amp; d.yaw.rotation.y = d.prec; d.g.position.y = RAD * Math.sin(amp) + HALF * Math.cos(amp); }
      d.mesh.rotation.y = d.spin; }
    // the lamp sways a touch on its cord
    const sway = Math.sin(st.t * .6) * .35; lamp.position.x = 2.4 + sway; bulb.position.x = lamp.position.x; lamp.target.position.x = 2.2 + sway * .4;
    cone.position.x = 2.4 + sway * .5; cone.material.opacity = .05 * lampK; dust.material.opacity = .55 * lampK;
    { const P = dgeo.attributes.position.array; for (let i = 0; i < DUST; i++) { const sd = dseed[i]; P[i * 3] = DBASE[i * 3] + Math.sin(st.t * .21 + sd) * .35 + sway * .3; P[i * 3 + 1] = DBASE[i * 3 + 1] + Math.sin(st.t * .13 + sd * 2) * .4; P[i * 3 + 2] = DBASE[i * 3 + 2] + Math.cos(st.t * .17 + sd) * .35; } dgeo.attributes.position.needsUpdate = true; }
    // the thunk: when the chip lands flat the whole table jolts, stacks hop, the camera shakes
    st.jolt *= Math.pow(.02, dt); const jj = st.jolt;
    stacks.position.y = jj * .05 * Math.abs(Math.sin(st.t * 38)); stacks.rotation.z = jj * .006 * Math.sin(st.t * 31);
    if (jj > .002) { cam.rotateZ(jj * .018 * Math.sin(st.t * 44)); cam.position.y += jj * .03 * Math.sin(st.t * 52); }
    lamp.intensity = LAMP * lampK; hemi.intensity = .42 * lampK; bulb.material.color.setScalar(.25 + .75 * lampK);
    hero.top.emissiveIntensity = st.pulse * .35;
    R.render(scene, cam);
  }
  try { R.compile(scene, cam); } catch {}
  requestAnimationFrame(frame);
  return { st, skip() { if (!st.done) { st.done = true; restPose(); st.onIntroEnd && st.onIntroEnd(); } }, size };
}
