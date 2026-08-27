import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * Caricamento di un'auto vera in formato glTF/GLB.
 *
 * La forma parametrica in car.js è una scultura di stile: legge come "auto",
 * ma non ha parabrezza, montanti, griglie, specchietti. Per il fotorealismo
 * serve un modello vero, e questo modulo lo innesta nella scena senza
 * cambiare nient'altro: stessa vernice con light sweep e fiocchi metallici,
 * stessa scala, stesso appoggio a terra.
 *
 * Il modello NON è nel repository (vedi README: licenze e marchi sono una
 * scelta di chi pubblica). Se il file non c'è, la scena usa la speed form.
 */

/** Lunghezza a cui viene normalizzata qualsiasi vettura, in unità di scena. */
const TARGET_LENGTH = 4.9;

/**
 * Riconosce a cosa serve una mesh dal nome del nodo o del materiale.
 * I modelli seri nominano i pezzi; quelli che non lo fanno tengono il
 * materiale originale, che è comunque meglio di un'euristica sbagliata.
 */
function classify(mesh) {
  const name = `${mesh.name} ${mesh.material?.name || ''}`.toLowerCase();
  if (/body_?colou?r|carrozzeria|paint|bodywork|^body$|\bbody\b/.test(name)) return 'paint';
  if (/glass|vetro|window|windshield|windscreen/.test(name)) return 'glass';
  // La gomma prima del cerchio: in molti modelli il pneumatico si chiama
  // "wheel_tire", e chi cerca "wheel" per primo se lo porta via.
  if (/tire|tyre|pneumatic|gomm|rubber/.test(name)) return 'tyre';
  if (/chrome|cromatur|rim|cerchi|wheel|mozzo/.test(name)) return 'chrome';
  return null;
}

/**
 * Carica il modello e lo prepara per la scena.
 *
 * La geometria arriva già in chiaro e solo quantizzata (vedi
 * `scripts/optimize-model.mjs`): si apre con il solo parser glTF, senza
 * worker e senza WebAssembly. Con Draco servivano un worker, un
 * decodificatore da scaricare e un viaggio di andata e ritorno per ognuna
 * delle cinquanta primitive — venti secondi buoni — e in una pagina con
 * Content-Security-Policy stretta non partiva affatto.
 *
 * @param {string} [o.url] indirizzo del file .glb
 * @param {ArrayBuffer} [o.buffer] byte del modello, già in memoria: la build
 *        a file unico li passa così, senza nessuna richiesta di rete.
 * @returns {Promise<{group: THREE.Group, painted: number}>}
 */
export async function loadCarModel({ url, buffer, paint }) {
  const loader = new GLTFLoader();

  const gltf = buffer
    ? await loader.parseAsync(buffer, '')
    : await loader.loadAsync(url);

  const model = gltf.scene;

  // Le camere di scena del modello non ci servono: la nostra è una sola.
  model.traverse((o) => {
    if (o.isCamera || o.isLight) o.userData.remove = true;
  });
  model.traverse((o) => {
    if (o.userData.remove) o.removeFromParent();
  });

  // --- orientamento: il muso deve guardare lungo -X, come la speed form
  let box = new THREE.Box3().setFromObject(model);
  let size = box.getSize(new THREE.Vector3());
  if (size.z > size.x) {
    model.rotation.y = Math.PI / 2;
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);
    size = box.getSize(new THREE.Vector3());
  }

  // --- scala: qualunque modello arriva alla stessa lunghezza in scena
  const scale = TARGET_LENGTH / size.x;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  // --- appoggio: centrato in pianta, ruote a terra
  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b1016,
    metalness: 0.2,
    roughness: 0.03,
    transmission: 0.55,
    thickness: 0.2,
    envMapIntensity: 2.2
  });
  // Cerchi: metallo spazzolato, non cromatura da concessionaria. Con
  // riflettanza troppo alta prendevano il caldo delle luci di scena e
  // diventavano rosati sotto il bloom.
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: 0x7c828b,
    metalness: 1,
    roughness: 0.42,
    envMapIntensity: 0.95
  });
  const tyreMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b0b0e,
    metalness: 0,
    roughness: 0.85
  });

  let painted = 0;
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;

    switch (classify(o)) {
      case 'paint':
        // La carrozzeria prende la vernice del sito: è lei a portare il
        // light sweep e i fiocchi, quindi l'auto vera resta coerente con
        // tutto il resto della scena.
        o.material = paint;
        painted++;
        break;
      case 'glass':
        o.material = glassMaterial;
        break;
      case 'chrome':
        o.material = chromeMaterial;
        break;
      case 'tyre':
        o.material = tyreMaterial;
        break;
      default:
        // Materiali originali: alziamo solo la risposta all'ambiente, così
        // interni e dettagli non restano piatti nel buio dello showroom.
        if (o.material && 'envMapIntensity' in o.material) {
          o.material = o.material.clone();
          o.material.envMapIntensity = 1.05;
          // I modelli da configuratore hanno interni pensati per la luce del
          // giorno: qui siamo in uno showroom buio, e sedili color panna
          // sparano più della carrozzeria. Li portiamo giù di un terzo.
          o.material.color?.multiplyScalar(0.62);
        }
    }
  });

  const group = new THREE.Group();
  group.add(model);
  return { group, painted, materials: [glassMaterial, chromeMaterial, tyreMaterial] };
}
