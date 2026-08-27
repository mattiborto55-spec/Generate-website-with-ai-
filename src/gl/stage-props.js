import * as THREE from 'three';

/** Texture radiale generata a runtime: serve per il velo e la pozza di luce. */
function radialTexture({ inner = 'rgba(0,0,0,0)', outer = 'rgba(0,0,0,1)', stops = [] } = {}) {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  for (const [at, color] of stops) g.addColorStop(at, color);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Piano riflettente "povero ma bello": invece di un secondo render pass
 * usiamo la copia specchiata dell'auto, coperta da un velo scuro che si
 * apre al centro. Costo: zero draw call in più rispetto a un mirror vero,
 * e il riflesso sfuma con la distanza come su un pavimento in resina.
 */
export function buildFloor() {
  const group = new THREE.Group();

  // Il velo copre lo stesso raggio dello specchio: se restasse più piccolo,
  // oltre il suo bordo si vedrebbe il riflesso pieno.
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 220),
    new THREE.MeshBasicMaterial({
      color: 0x08080a,
      transparent: true,
      depthWrite: false,
      alphaMap: radialTexture({
        inner: 'rgba(0,0,0,0.5)',
        stops: [[0.045, 'rgba(0,0,0,0.72)'], [0.11, 'rgba(0,0,0,0.97)']],
        outer: 'rgba(0,0,0,1)'
      })
    })
  );
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = 0.001;
  veil.renderOrder = 4;
  group.add(veil);

  // pozza di luce sotto la vettura
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.MeshBasicMaterial({
      color: 0x6d7686,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: radialTexture({ inner: 'rgba(255,255,255,0.85)', stops: [[0.35, 'rgba(255,255,255,0.16)']], outer: 'rgba(0,0,0,0)' })
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.002;
  pool.renderOrder = 5;
  group.add(pool);

  // Ombra di contatto: senza, la vettura sembra galleggiare.
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 3.4),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      map: radialTexture({ inner: 'rgba(255,255,255,0.95)', stops: [[0.3, 'rgba(255,255,255,0.5)']], outer: 'rgba(0,0,0,0)' }),
      blending: THREE.NormalBlending
    })
  );
  contact.material.alphaMap = contact.material.map;
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.003;
  contact.renderOrder = 6;
  group.add(contact);

  return { group, veil, pool, contact };
}

/**
 * Micro-polvere sospesa nella luce. Le particelle si allontanano dal cursore:
 * il calcolo sta nel vertex shader, la CPU passa solo la posizione del mouse.
 */
export function buildParticles({ count = 1200, spread = 16 }) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    // distribuzione schiacciata verso il basso: è polvere sospesa nel fascio
    // di luce, non un cielo stellato
    positions[i * 3 + 1] = Math.pow(Math.random(), 1.9) * spread * 0.34;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    seeds[i] = Math.random();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector3(999, 999, 0) },
    uRadius: { value: 2.6 },
    uPush: { value: 1.15 },
    uSize: { value: 15 },
    uOpacity: { value: 0.3 }
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime, uRadius, uPush, uSize;
      uniform vec3 uMouse;
      varying float vFade;

      void main() {
        vec3 p = position;

        // deriva lentissima: la polvere non "vola", galleggia
        p.x += sin(uTime * 0.11 + aSeed * 26.0) * 0.34;
        p.y += sin(uTime * 0.16 + aSeed * 14.0) * 0.22;
        p.z += cos(uTime * 0.09 + aSeed * 19.0) * 0.34;

        // repulsione dal cursore proiettato sul piano dell'auto
        vec2 d = p.xy - uMouse.xy;
        float dist = length(d);
        float force = smoothstep(uRadius, 0.0, dist);
        p.xy += normalize(d + 1e-5) * force * uPush;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (uSize * (0.35 + aSeed)) / max(-mv.z, 0.001);

        float twinkle = 0.45 + 0.55 * sin(uTime * (0.7 + aSeed) + aSeed * 40.0);
        float lowLying = smoothstep(3.6, 0.2, p.y);   // più fitta vicino al piano
        vFade = twinkle * lowLying * smoothstep(34.0, 5.0, -mv.z);
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.06, d);
        gl_FragColor = vec4(vec3(1.0, 0.94, 0.88), a * vFade * uOpacity);
      }`
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, uniforms };
}
