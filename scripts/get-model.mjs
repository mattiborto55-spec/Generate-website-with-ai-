/**
 * Scarica un modello 3D di vettura per la scena della hero.
 *
 *   npm run model:get
 *
 * Il modello NON sta nel repository di proposito: la licenza e l'eventuale
 * marchio della vettura sono una scelta di chi pubblica il sito, non una
 * dipendenza da trascinarsi dietro. Senza il file la scena mostra la forma
 * parametrica, che non ha nessun vincolo.
 *
 * Il modello scaricato qui è quello dell'esempio ufficiale di three.js:
 * Ferrari 458 Italia di vicent091036 (Sketchfab). Va benissimo per vedere
 * subito com'è il sito con un'auto vera, ma prima di pubblicare verifica la
 * licenza del modello e considera che rappresenta una vettura di marca.
 * Per sostituirlo basta mettere un altro .glb in public/models/car.glb.
 *
 * Appena scaricato, il file passa da `scripts/optimize-model.mjs`: com'è
 * distribuito è compresso con Draco, che ha bisogno di un worker e di
 * WebAssembly e ci mette secondi buoni a rimettere insieme le sue cinquanta
 * primitive. Dopo l'ottimizzazione si apre con il solo parser glTF.
 */

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODELS = join(ROOT, 'public/models');

const MODEL_URL = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/ferrari.glb';

await mkdir(MODELS, { recursive: true });

console.log('· scarico il modello…');
const res = await fetch(MODEL_URL);
if (!res.ok) throw new Error(`download fallito: HTTP ${res.status}`);
const buf = Buffer.from(await res.arrayBuffer());
await writeFile(join(MODELS, 'car.glb'), buf);

const { size } = await stat(join(MODELS, 'car.glb'));
console.log(`✓ scaricato — ${(size / 1024 / 1024).toFixed(2)} MB\n`);

console.log('· preparo il modello per il web…');
await import('./optimize-model.mjs');
console.log('');
console.log('Crediti: Ferrari 458 Italia, modello di vicent091036 (Sketchfab),');
console.log('distribuito con gli esempi di three.js. Verifica licenza e marchio');
console.log('prima di usarlo su un sito pubblicato.\n');
console.log('Per usare un altro modello: sostituisci public/models/car.glb.');
