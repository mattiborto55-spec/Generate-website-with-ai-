/**
 * Ottimizza il modello 3D della hero.
 *
 * Il file che si scarica dagli esempi di three.js è compresso con Draco e ha
 * 51 primitive: ognuna viene decodificata in un worker e restituita al thread
 * principale, e i 51 viaggi di andata e ritorno costano secondi proprio mentre
 * la pagina sta montando la scena. Risultato: per qualche istante nella hero
 * c'è la forma parametrica al posto della vettura vera.
 *
 * Qui il modello viene decompresso, ripulito, unito e quantizzato, e riscritto
 * senza nessuna compressione di geometria. Il file su disco cresce, ma:
 *
 *   • si apre con il solo parser glTF, in millisecondi, senza worker, senza
 *     WebAssembly e senza scaricare un decodificatore;
 *   • KHR_mesh_quantization lo capiscono tutti i browser che fanno WebGL;
 *   • sulla rete pesa quanto la sua versione gzip, che ogni hosting statico
 *     serve da solo (e la build a file unico se lo comprime da sé).
 *
 * Draco e meshopt facevano un file più piccolo, ma tutti e due hanno bisogno
 * di WebAssembly: dentro una pagina con Content-Security-Policy stretta non
 * partono, e al loro posto resta la forma parametrica. Meglio qualche mega in
 * più che una vettura che non si vede.
 *
 *   npm run model:opt          # public/models/car.glb, in place
 *   npm run model:opt -- --ratio 0.5
 */
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, join as joinMeshes, simplify, resample, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'public/models/car.glb');

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? Number(process.argv[i + 1]) : fallback;
};

// Quanti triangoli tenere. 1 = nessuna semplificazione, ed è il default:
// su un modello di vettura la topologia è fatta di gusci separati, il
// semplificatore non può fondere i bordi e quello che toglie lo paga in
// spigoli visibili. Su modelli più uniti abbassalo pure.
const RATIO = arg('ratio', 1);
const ERROR = arg('error', 0.004);

const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

try {
  await stat(FILE);
} catch {
  console.error(`Manca ${FILE}. Prima: npm run model:get`);
  process.exit(1);
}

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule()
  });

const before = (await readFile(FILE)).byteLength;
const doc = await io.read(FILE);

const count = () =>
  doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);

const trisBefore = count();
const primsBefore = doc
  .getRoot()
  .listMeshes()
  .reduce((n, m) => n + m.listPrimitives().length, 0);

await MeshoptSimplifier.ready;

await doc.transform(
  // Il modello arriva compresso con Draco: togliamo l'estensione, il resto
  // della pipeline lavora sulla geometria in chiaro.
  resample(),
  dedup(),
  prune({ keepAttributes: false, keepLeaves: false }),
  // Unisce le primitive che condividono lo stesso materiale: meno draw call
  // e, soprattutto, meno pezzi da rimettere insieme al caricamento.
  joinMeshes(),
  weld(),
  ...(RATIO < 1 ? [simplify({ simplifier: MeshoptSimplifier, ratio: RATIO, error: ERROR, lockBorder: false })] : []),
  // Quantizzazione: le posizioni non hanno bisogno di 32 bit per stare a
  // filo di carrozzeria, e meshopt comprime molto meglio i valori interi.
  // 12 bit su 4,9 m di vettura = poco più di un millimetro: sotto la
  // precisione di qualsiasi riflesso. Le normali restano a 10, perché è lì
  // che si vede la differenza sulla vernice.
  quantize({ quantizePosition: 12, quantizeNormal: 10, quantizeTexcoord: 10 })
);

// Via l'estensione Draco: la geometria esce in chiaro, e lasciarla dichiarata
// obbligherebbe il browser a caricare un decodificatore che non serve più.
doc
  .getRoot()
  .listExtensionsUsed()
  .filter((e) => e.extensionName === 'KHR_draco_mesh_compression')
  .forEach((e) => e.dispose());

const out = await io.writeBinary(doc);
await writeFile(FILE, out);

const trisAfter = doc
  .getRoot()
  .listMeshes()
  .flatMap((m) => m.listPrimitives())
  .reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const primsAfter = doc
  .getRoot()
  .listMeshes()
  .reduce((n, m) => n + m.listPrimitives().length, 0);

console.log(`✓ ${FILE}`);
console.log(`  peso      ${mb(before)} → ${mb(out.byteLength)}`);
console.log(`  triangoli ${Math.round(trisBefore).toLocaleString('it-IT')} → ${Math.round(trisAfter).toLocaleString('it-IT')}`);
console.log(`  primitive ${primsBefore} → ${primsAfter}`);
console.log(`  sulla rete  ${mb(gzipSync(out).byteLength)} con gzip (il file unico se lo comprime da sé)`);
console.log('  nessun decodificatore: solo KHR_mesh_quantization, nativo in three');
