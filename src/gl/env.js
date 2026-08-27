import * as THREE from 'three';

/**
 * Ambiente HDRI generato in tempo reale: niente file .hdr da scaricare.
 *
 * Costruiamo una piccola scena "da showroom" (cupola scura + softbox
 * rettangolari accesi) e la cuociamo in una envMap con PMREMGenerator.
 * Sono i softbox a disegnare i riflessi lunghi e affilati sulla vernice:
 * senza di loro il car paint sembra plastica.
 */
export function buildStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const scene = new THREE.Scene();

  // Cupola: quasi nera in basso, appena grigia in alto.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
      uniforms: {
        top: { value: new THREE.Color(0x15161b) },
        bottom: { value: new THREE.Color(0x030304) }
      },
      vertexShader: `varying float vY;
        void main(){ vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying float vY; uniform vec3 top; uniform vec3 bottom;
        void main(){ gl_FragColor = vec4(mix(bottom, top, smoothstep(-0.25, 0.85, vY)), 1.0); }`
    })
  );
  scene.add(dome);

  /** Un pannello luminoso: la sorgente dei riflessi speculari. */
  const panel = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        toneMapped: false
      })
    );
    m.position.copy(pos);
    m.lookAt(look ?? new THREE.Vector3(0, 0.6, 0));
    scene.add(m);
    return m;
  };

  // Tre softbox principali: chiave dall'alto, riempimento laterale, controluce.
  panel(26, 2.6, 0xffffff, 5.2, new THREE.Vector3(0, 9, 2.5));
  panel(22, 2.0, 0xffffff, 3.4, new THREE.Vector3(0, 7.5, -6));
  panel(3.2, 14, 0xdfe8ff, 2.6, new THREE.Vector3(-11, 3.4, 3));
  // Accenti: caldo a destra, ciano dietro. Restano bordi, non colorano la scena.
  // largo e tenue: sulla vernice a specchio un pannello piccolo si
  // riflette come un adesivo, uno grande come una velatura calda
  panel(7, 20, 0xff5a1f, 0.22, new THREE.Vector3(12, 3.5, -1));
  panel(14, 1.2, 0x22d3ee, 0.85, new THREE.Vector3(0, 1.2, -12));
  // Rimbalzo da terra: evita che il sottoscocca diventi un buco nero.
  panel(30, 30, 0x2a2d36, 0.5, new THREE.Vector3(0, -2.5, 0), new THREE.Vector3(0, 10, 0));

  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();

  dome.geometry.dispose();
  dome.material.dispose();
  scene.traverse((o) => {
    if (o.isMesh && o !== dome) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });

  return rt.texture;
}
