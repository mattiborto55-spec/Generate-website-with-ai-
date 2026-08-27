import * as THREE from 'three';
import { buildStudioEnvironment } from './env.js';
import { createPaintMaterial } from './paint.js';

/**
 * Mini-scene WebGL nelle card dei servizi.
 *
 * Un solo contesto WebGL per tutte e cinque: una canvas fissa a pagina intera
 * e il classico trucco dello scissor test — si disegna solo dentro il
 * rettangolo di ogni card. Cinque contesti separati sarebbero cinque volte il
 * costo, per cinque oggetti che stanno in 130 pixel d'altezza.
 */

const OBJECTS = {
  // pneumatico
  gomme: () => new THREE.TorusGeometry(0.72, 0.3, 32, 96),
  // cristallo di freddo: l'aria condizionata
  clima: () => new THREE.IcosahedronGeometry(0.95, 1),
  // foglio: il tagliando della revisione
  revisione: () => {
    const g = new THREE.PlaneGeometry(2.2, 1.5, 48, 32);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      p.setZ(i, Math.sin(x * 1.3) * 0.28 + Math.cos(y * 1.6) * 0.12);
    }
    g.computeVertexNormals();
    return g;
  },
  // nodo continuo: le curve di una mappatura
  mappatura: () => new THREE.TorusKnotGeometry(0.62, 0.21, 160, 24, 2, 3),
  // bombola: impianti GPL e metano
  gas: () =>
    new THREE.LatheGeometry(
      [
          [0, -0.8], [0.42, -0.8], [0.55, -0.66], [0.55, 0.66], [0.42, 0.8], [0, 0.8]
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      48
    )
};

// Tinte più chiare del nero della carrozzeria: dentro un box di 130px un
// oggetto nero su fondo nero non si vede.
const TINTS = {
  gomme: 0x4a4e56,
  clima: 0x8fb6cd,
  revisione: 0xa9b4c4,
  mappatura: 0xc2612c,
  gas: 0x9aa3b2
};

export class CardScenes {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cardgl';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.renderer.autoClear = false;
    this.renderer.setClearAlpha(0);

    this.env = buildStudioEnvironment(this.renderer);
    this.items = [];
    this.active = false;
    this.resize();
  }

  /** Collega un elemento DOM (il box in cima alla card) a un oggetto 3D. */
  add(el, kind) {
    const geometry = (OBJECTS[kind] || OBJECTS.gomme)();
    const { material } = createPaintMaterial({
      color: TINTS[kind] ?? 0x1e2229,
      roughness: kind === 'gomme' ? 0.72 : 0.22,
      metalness: kind === 'gomme' ? 0.05 : 1,
      flake: kind === 'gomme' ? 0.015 : 0.06,
      envMapIntensity: 1.7
    });

    // Il foglio di pellicola è una superficie aperta: senza DoubleSide sparisce
    // per metà rotazione.
    if (kind === 'revisione') material.side = THREE.DoubleSide;

    const scene = new THREE.Scene();
    scene.environment = this.env;
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    scene.add(new THREE.AmbientLight(0x3a4049, 0.8));

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0.35, 3.7);
    camera.lookAt(0, 0, 0);

    this.items.push({ el, scene, camera, mesh, material, geometry, seed: this.items.length * 1.7 });
  }

  setActive(v) {
    this.active = v;
    this.canvas.style.opacity = v ? '1' : '0';
    // il fallback CSS si toglie solo quando le scene stanno davvero girando
    document.body.classList.toggle('has-cardgl', v);
  }

  resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  update(dt, elapsed) {
    if (!this.active || !this.items.length) return;

    const h = this.renderer.domElement.clientHeight;
    this.renderer.setScissorTest(false);
    this.renderer.clear(true, true, true);
    this.renderer.setScissorTest(true);

    for (const item of this.items) {
      const r = item.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || r.width < 2) continue;

      const bottom = h - r.bottom;
      this.renderer.setViewport(r.left, bottom, r.width, r.height);
      this.renderer.setScissor(r.left, bottom, r.width, r.height);

      item.camera.aspect = r.width / r.height;
      item.camera.updateProjectionMatrix();

      item.mesh.rotation.y = elapsed * 0.32 + item.seed;
      item.mesh.rotation.x = Math.sin(elapsed * 0.24 + item.seed) * 0.28;

      this.renderer.render(item.scene, item.camera);
    }
    this.renderer.setScissorTest(false);
  }

  dispose() {
    this.items.forEach((i) => {
      i.geometry.dispose();
      i.material.dispose();
    });
    this.env.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
