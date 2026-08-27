import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

import { buildStudioEnvironment } from './env.js';
import { createPaintMaterial, updateSweep } from './paint.js';
import { buildCar } from './car.js';
import { buildFloor, buildParticles } from './stage-props.js';

/**
 * Inquadrature agganciate allo scroll. Ogni sezione ha la sua: la camera
 * orbita attorno alla vettura e stringe sui dettagli mentre il testo cambia.
 * `dim` abbassa l'esposizione dove la pagina è densa di testo, così la scena
 * resta atmosfera e non rumore.
 */
export const SHOTS = {
  // `off` sposta la camera nel suo piano: serve a spingere l'auto fuori
  // centro e lasciare respiro al testo (hero: testo a sinistra, auto a destra).
  hero:      { pos: [6.3, 2.1, 7.0],   target: [0, 0.5, 0],       fov: 34, dim: 1.0,  spin: 0.055, off: [-0.95, -0.5] },
  coating:   { pos: [-7.4, 2.6, 6.2],  target: [0, 0.6, 0],       fov: 32, dim: 0.34,  spin: 0.03,  off: [0.8, -0.2] },
  detailing: { pos: [3.1, 1.1, 3.3],   target: [0.5, 0.45, 0.1],  fov: 30, dim: 0.4, spin: 0.018, off: [-0.5, 0] },
  ppf:       { pos: [-3.4, 0.9, 2.7],  target: [-1.5, 0.4, 0.1],  fov: 27, dim: 0.34, spin: 0.012, off: [0.45, 0] },
  wrapping:  { pos: [3.9, 0.95, 2.8],  target: [1.3, 0.35, 0.3],  fov: 29, dim: 0.32, spin: 0.02,  off: [-0.45, 0] },
  interni:   { pos: [0.4, 3.6, 4.2],   target: [0, 0.6, 0],       fov: 34, dim: 0.3,  spin: 0.03,  off: [0.3, 0] },
  outro:     { pos: [6.4, 1.9, 13.5],  target: [0, 0.45, 0],      fov: 40, dim: 0.95, spin: 0.05,  off: [0, -0.25] }
};

export function isWebGLAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

export class Stage {
  constructor(canvas, { reducedMotion = false } = {}) {
    this.canvas = canvas;
    this.reducedMotion = reducedMotion;

    // Livello di dettaglio: il mobile prende meno poligoni, meno luci,
    // meno particelle e niente bloom.
    this.mobile = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
    this.quality = this.mobile ? 0.5 : 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.mobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.6 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearAlpha(0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);

    this.envMap = buildStudioEnvironment(this.renderer);
    this.scene.environment = this.envMap;

    this._buildContent();
    this._buildLights();
    if (!this.mobile) this._buildComposer();

    // stato camera: `now` insegue `goal` con smorzamento esponenziale
    const hero = SHOTS.hero;
    this.now = {
      pos: new THREE.Vector3(...hero.pos),
      target: new THREE.Vector3(...hero.target),
      fov: hero.fov,
      dim: hero.dim,
      spin: hero.spin,
      off: new THREE.Vector2(...hero.off)
    };
    this.goal = {
      pos: this.now.pos.clone(),
      target: this.now.target.clone(),
      fov: hero.fov,
      dim: hero.dim,
      spin: hero.spin,
      off: this.now.off.clone()
    };

    this.pointer = new THREE.Vector2(0, 0);      // -1..1
    this.pointerWorld = new THREE.Vector3(999, 999, 0);
    this.tilt = new THREE.Vector2(0, 0);
    this.spinAngle = 0;
    this.intro = 0; // 0 -> 1 durante l'apertura del sipario
    this.frameScale = 1;

    this.resize();
  }

  /* --------------------------------------------------------- contenuto */

  _buildContent() {
    const { material, uniforms } = createPaintMaterial({
      color: 0x1b212b,
      roughness: 0.17,
      envMapIntensity: 2.1,
      flake: this.mobile ? 0.045 : 0.08
    });
    this.paint = material;
    this.paintUniforms = uniforms;

    const car = buildCar({ paint: material, quality: this.quality });
    this.car = car.group;
    this.scene.add(this.car);

    // Pavimento a specchio vero: un secondo render dal punto di vista
    // riflesso. Costa un passaggio in più, ma è ciò che rende la scena uno
    // showroom e non un oggetto sospeso nel vuoto. Solo su desktop.
    if (!this.mobile) {
      this.reflector = new Reflector(new THREE.PlaneGeometry(220, 220), {
        clipBias: 0.004,
        textureWidth: 1024,
        textureHeight: 1024,
        color: 0x1c2027
      });
      this.reflector.rotation.x = -Math.PI / 2;
      this.reflector.position.y = 0;
      this.scene.add(this.reflector);
    }

    const floor = buildFloor();
    this.floor = floor;
    this.scene.add(floor.group);

    const dust = buildParticles({
      count: this.mobile ? 260 : 900,
      spread: 11
    });
    this.dust = dust;
    this.scene.add(dust.points);
  }

  _buildLights() {
    RectAreaLightUniformsLib.init();
    this.lights = [];

    const add = (color, intensity, w, h, pos, rot) => {
      const l = new THREE.RectAreaLight(color, intensity, w, h);
      l.position.set(...pos);
      l.lookAt(0, 0.6, 0);
      l.userData.base = new THREE.Vector3(...pos);
      l.userData.phase = rot;
      this.scene.add(l);
      this.lights.push(l);
      return l;
    };

    add(0xffffff, 7.5, 9, 2.4, [-3.4, 5.2, 4.6], 0);
    add(0xdce6ff, 4.2, 8, 2.0, [5.2, 4.2, -3.4], 2.1);
    if (!this.mobile) add(0xff5a1f, 5.5, 5, 1.6, [4.6, 1.6, 3.2], 4.2);

    this.scene.add(new THREE.AmbientLight(0x20222a, 0.6));
  }

  _buildComposer() {
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(size, 0.55, 0.75, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  /* ------------------------------------------------------------ input */

  setShot(name) {
    const shot = SHOTS[name] || SHOTS.hero;
    this.goal.pos.set(...shot.pos);
    this.goal.target.set(...shot.target);
    this.goal.fov = shot.fov;
    this.goal.dim = shot.dim;
    this.goal.spin = shot.spin;
    this.goal.off.set(...(shot.off || [0, 0]));
  }

  setPointer(nx, ny) {
    this.pointer.set(nx, ny);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // In verticale la vettura non ci sta: si arretra la camera invece di
    // tagliarla, e si annulla lo scostamento pensato per il layout desktop.
    this.frameScale = this.camera.aspect < 0.8 ? 2.15 : this.camera.aspect < 1.1 ? 1.35 : 1;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  /* ------------------------------------------------------------- loop */

  update(dt, elapsed) {
    const d = Math.min(dt, 0.05);
    // smorzamento esponenziale: indipendente dal framerate, sempre morbido
    const k = 1 - Math.exp(-1.5 * d);

    this.now.pos.lerp(this.goal.pos, k);
    this.now.target.lerp(this.goal.target, k);
    this.now.fov += (this.goal.fov - this.now.fov) * k;
    this.now.dim += (this.goal.dim - this.now.dim) * k;
    // Con reduced motion la scena resta ferma: si muove solo l'inquadratura.
    this.now.spin += ((this.reducedMotion ? 0 : this.goal.spin) - this.now.spin) * k;
    this.now.off.lerp(this.goal.off, k);

    // parallasse: la camera si sposta, l'auto si inclina (max 8°)
    const tk = 1 - Math.exp(-3.2 * d);
    this.tilt.x += (this.pointer.x - this.tilt.x) * tk;
    this.tilt.y += (this.pointer.y - this.tilt.y) * tk;

    const MAX = THREE.MathUtils.degToRad(8);
    this.spinAngle += this.now.spin * d;

    if (this.car) {
      this.car.rotation.y = this.spinAngle + this.tilt.x * MAX * 0.8;
      this.car.rotation.z = -this.tilt.y * MAX * 0.35;
      this.car.rotation.x = this.tilt.y * MAX * 0.22;
    }

    this.camera.position.copy(this.now.pos).multiplyScalar(this.frameScale);
    this.camera.position.x += this.tilt.x * 0.55;
    this.camera.position.y += -this.tilt.y * 0.32;
    this.camera.lookAt(this.now.target);
    // spostamento nel piano immagine: cambia l'inquadratura, non la direzione
    const offK = this.frameScale > 1.2 ? 0.25 : 1;
    this.camera.translateX(this.now.off.x * offK);
    this.camera.translateY(this.now.off.y * offK);
    if (Math.abs(this.camera.fov - this.now.fov) > 0.01) {
      this.camera.fov = this.now.fov;
      this.camera.updateProjectionMatrix();
    }

    // luci d'area in movimento lento: i riflessi non stanno mai fermi
    for (const l of (this.reducedMotion ? [] : this.lights)) {
      const b = l.userData.base;
      const p = l.userData.phase;
      l.position.set(
        b.x + Math.sin(elapsed * 0.13 + p) * 1.5,
        b.y + Math.sin(elapsed * 0.09 + p) * 0.6,
        b.z + Math.cos(elapsed * 0.11 + p) * 1.5
      );
      l.lookAt(0, 0.6, 0);
    }

    if (!this.reducedMotion) updateSweep(this.paintUniforms, elapsed, { span: 5.4, period: 6, duration: 1.15 });
    if (!this.reducedMotion) this.dust.uniforms.uTime.value = elapsed;

    // il cursore proiettato sul piano verticale che taglia l'auto
    this.pointerWorld.set(this.pointer.x, this.pointer.y, 0.5).unproject(this.camera);
    const dir = this.pointerWorld.sub(this.camera.position).normalize();
    const dist = -this.camera.position.z / (dir.z || -0.0001);
    this.dust.uniforms.uMouse.value.copy(this.camera.position).addScaledVector(dir, dist);

    this.renderer.toneMappingExposure = 1.15 * this.now.dim * (0.25 + 0.75 * this.intro);
    if (this.bloom) this.bloom.strength = 0.55 * this.now.dim;
    this.floor.pool.material.opacity = 0.32 * this.now.dim;

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    this.envMap?.dispose();
    this.scene.traverse((o) => {
      if (o.isMesh || o.isPoints) {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  }
}
