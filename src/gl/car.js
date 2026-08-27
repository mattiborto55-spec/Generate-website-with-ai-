import * as THREE from 'three';

/**
 * La "speed form": il modello di stile che gli studi di design scolpiscono in
 * clay prima della vettura vera. Nessun modello GLB da scaricare — la carena è
 * una superficie parametrica costruita qui, quindi pesa zero e si adatta al
 * livello di dettaglio del dispositivo.
 *
 * Superficie: sezione a superellisse (spalle piene sopra, sottoscocca piatto)
 * modulata lungo l'asse X dal profilo laterale di una sportiva.
 */

const LENGTH = 4.9;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x, mu, sigma) => Math.exp(-(((x - mu) / sigma) ** 2));

/** Rastremazione alle estremità: né punta d'ago né mattone. */
const taper = (u) => Math.pow(Math.sin(Math.PI * Math.min(Math.max(u, 0), 1)), 0.42);

/** Semilarghezza: massima sulle spalle posteriori. */
const halfWidth = (u) => 1.02 * taper(u) * (1 + 0.07 * gauss(u, 0.74, 0.22));

/**
 * Profilo laterale. Proporzioni prese da una 911 reale e riportate in scala
 * (4,5 m di lunghezza, 1,30 m di altezza, passo corto): se il tetto è troppo
 * basso la forma smette di leggere come un'auto e diventa un guscio.
 * La gaussiana è asimmetrica: parabrezza inclinato davanti, coda fastback.
 */
const topHeight = (u) => {
  const cabin = 0.66 * gauss(u, 0.62, u < 0.62 ? 0.2 : 0.3);
  const hood = 0.16 * gauss(u, 0.27, 0.21);
  const deck = 0.06 * smoothstep(0.84, 1, u);
  return (0.3 + cabin + hood + deck) * Math.pow(Math.sin(Math.PI * Math.min(Math.max(u, 0), 1)), 0.16);
};

/** Sottoscocca: quasi piatto, appena rientrante. */
const bottomHeight = (u) => 0.15 * Math.pow(Math.sin(Math.PI * Math.min(Math.max(u, 0), 1)), 0.3);

/** Punto sulla carena. theta: 0 = colmo, ±π = sottoscocca. */
function hullPoint(u, theta, inflate = 0) {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const nY = c >= 0 ? 2 / 2.7 : 2 / 3.6;
  const nZ = 2 / 2.9;

  // nervatura di spalla: una piega netta a ~66°, come sulle fiancate vere
  const shoulder = 1 + 0.055 * gauss(Math.abs(theta), 1.12, 0.13);

  const h = (c >= 0 ? topHeight(u) : bottomHeight(u)) + inflate;
  const w = halfWidth(u) * shoulder + inflate;

  return new THREE.Vector3(
    (u - 0.5) * LENGTH,
    Math.sign(c) * Math.pow(Math.abs(c), nY) * h,
    Math.sign(s) * Math.pow(Math.abs(s), nZ) * w
  );
}

/**
 * Genera una porzione di carena. Usata tre volte: scocca completa, "serra"
 * dei vetri e firme luminose. Riusare la stessa superficie garantisce che i
 * pezzi combacino al millimetro.
 */
function loft({ u0 = 0, u1 = 1, t0 = -Math.PI, t1 = Math.PI, su = 160, sv = 96, inflate = 0 }) {
  const pos = [];
  const uv = [];
  const idx = [];

  for (let i = 0; i <= su; i++) {
    const u = u0 + ((u1 - u0) * i) / su;
    for (let j = 0; j <= sv; j++) {
      const theta = t0 + ((t1 - t0) * j) / sv;
      const p = hullPoint(u, theta, inflate);
      pos.push(p.x, p.y, p.z);
      uv.push(i / su, j / sv);
    }
  }
  for (let i = 0; i < su; i++) {
    for (let j = 0; j < sv; j++) {
      const a = i * (sv + 1) + j;
      const b = a + sv + 1;
      // winding antiorario visto da fuori: le normali devono uscire dalla carena
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/**
 * Ruota completa: pneumatico (lathe), canale, razze e pinza freno.
 * È costruita già con l'asse su Z — l'asse trasversale della vettura — così
 * non serve ruotare il gruppo e nessun pezzo finisce sul piano sbagliato.
 */
function buildWheel({ radius = 0.46, width = 0.3, rimMat, tyreMat, caliperMat, quality = 1, side = 1 }) {
  const wheel = new THREE.Group();
  const hw = width / 2;
  const segs = quality > 0.5 ? 40 : 20;

  // sezione del pneumatico: spalla piena, battistrada piatto
  const profile = [
    [0.6, -hw * 0.8],
    [0.8, -hw],
    [0.95, -hw * 0.76],
    [1.0, -hw * 0.3],
    [1.0, hw * 0.3],
    [0.95, hw * 0.76],
    [0.8, hw],
    [0.6, hw * 0.8]
  ].map(([r, y]) => new THREE.Vector2(r * radius, y));

  const tyre = new THREE.Mesh(new THREE.LatheGeometry(profile, segs), tyreMat);
  tyre.rotation.x = Math.PI / 2; // il lathe nasce sull'asse Y: lo coricchiamo su Z
  wheel.add(tyre);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width * 0.94, segs, 1, true),
    rimMat
  );
  barrel.rotation.x = Math.PI / 2;
  wheel.add(barrel);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, width * 0.4, 20), rimMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = side * hw * 0.5;
  wheel.add(hub);

  // razze: già nel piano XY (asse Z). Una geometria istanziata = un draw call.
  const count = 10;
  const spoke = new THREE.BoxGeometry(radius * 0.08, radius * 0.56, width * 0.24);
  spoke.translate(0, radius * 0.44, 0);
  const spokes = new THREE.InstancedMesh(spoke, rimMat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axisZ = new THREE.Vector3(0, 0, 1);
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i++) {
    q.setFromAxisAngle(axisZ, (i / count) * Math.PI * 2);
    m.compose(new THREE.Vector3(0, 0, side * hw * 0.42), q, one);
    spokes.setMatrixAt(i, m);
  }
  wheel.add(spokes);

  // pinza freno: l'unico tocco arancione del carrello
  const caliper = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.5, radius * 0.07, 8, 18, Math.PI * 0.55),
    caliperMat
  );
  caliper.rotation.z = Math.PI * 0.6;
  caliper.position.z = side * hw * 0.2;
  wheel.add(caliper);

  return wheel;
}

/**
 * Costruisce l'oggetto completo.
 * @param {object} o
 * @param {THREE.Material} o.paint  materiale vernice (condiviso col light sweep)
 * @param {number} o.quality        1 = desktop, 0.5 = mobile
 */
export function buildCar({ paint, quality = 1 }) {
  const group = new THREE.Group();
  const su = Math.round(180 * quality);
  const sv = Math.round(110 * quality);

  // --- scocca
  const body = new THREE.Mesh(loft({ su, sv }), paint);
  body.castShadow = true;
  group.add(body);

  // --- serra vetrata: stessa superficie, appena gonfiata, materiale scuro
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0f18,
    roughness: 0.028,
    metalness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.1
  });
  const glass = new THREE.Mesh(
    loft({ u0: 0.42, u1: 0.86, t0: -0.95, t1: 0.95, su: Math.round(70 * quality), sv: Math.round(50 * quality), inflate: 0.006 }),
    glassMat
  );
  group.add(glass);

  // --- firme luminose: due strisce sottili per estremità, ricavate dalla
  // stessa carena e sollevate di pochi millimetri. Un nastro che gira intorno
  // al muso leggerebbe come un pezzo di plastica incollato.
  const lampMat = (color, intensity) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });

  const headMat = lampMat(0xdff4ff, 2.0);
  const tailMat = lampMat(0xff3b12, 1.5);
  const strip = (u0, u1, t0, t1, mat) =>
    group.add(new THREE.Mesh(loft({ u0, u1, t0, t1, su: 10, sv: 16, inflate: 0.014 }), mat));

  for (const side of [1, -1]) {
    strip(0.055, 0.135, side * 0.62, side * 0.92, headMat);   // proiettori
    strip(0.9, 0.95, side * 0.52, side * 0.86, tailMat);      // fanaleria
  }

  // --- carrello
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xb6bcc9, metalness: 1, roughness: 0.23, envMapIntensity: 1.5 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0e, metalness: 0, roughness: 0.82 });
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xff5a1f,
    emissive: 0xff5a1f,
    emissiveIntensity: 0.35,
    metalness: 0.2,
    roughness: 0.45
  });

  const axles = [
    { u: 0.235, radius: 0.37 },
    { u: 0.785, radius: 0.39 }
  ];
  const wheels = [];
  for (const axle of axles) {
    for (const side of [-1, 1]) {
      const w = buildWheel({ radius: axle.radius, width: 0.26, rimMat, tyreMat, caliperMat, quality, side });
      // rientrate sotto la fiancata: devono sparire nei passaruota, non sporgere
      w.position.set((axle.u - 0.5) * LENGTH, 0, side * halfWidth(axle.u) * 0.74);
      group.add(w);
      wheels.push(w);
    }
  }

  // Appoggiamo la vettura a terra: il raggio ruota è l'altezza da terra.
  group.position.y = 0.36;

  return { group, body, wheels, glassMat, materials: [glassMat, rimMat, tyreMat, caliperMat] };
}
