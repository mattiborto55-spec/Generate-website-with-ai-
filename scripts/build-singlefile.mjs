/**
 * Build "a file unico": un solo .html con dentro CSS, JavaScript, font e
 * immagini in base64. Serve per mandare il sito a qualcuno, aprirlo con un
 * doppio clic o caricarlo dove non si può pubblicare una cartella.
 *
 *   npm run build:single   ->   dist-single/carbonio.html
 *
 * Pesa più della build normale (niente cache, niente lazy loading): per il
 * sito vero in produzione si usa `npm run build`.
 */

import { build } from 'vite';
import { readFile, writeFile, mkdir, stat, access, readdir } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist-single');
const TMP_DIR = join(ROOT, '.tmp-single');
const DRACO_SRC = join(ROOT, 'node_modules/three/examples/jsm/libs/draco/gltf');

const MIME = {
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

/** Legge un file qualsiasi e lo restituisce come data URI. */
async function fileUri(file) {
  const buf = await readFile(file);
  const mime = MIME[extname(file)] || 'application/octet-stream';
  return `data:${mime};base64,${buf.toString('base64')}`;
}

/** Come sopra, ma partendo da un percorso pubblico del sito. */
const dataUri = (publicPath) =>
  fileUri(join(ROOT, 'public', publicPath.replace(/^(?:\.{0,2}\/)+/, '')));

/** Sostituisce ogni riferimento a /img|/fonts con il contenuto in base64. */
async function inlineAssets(text) {
  const refs = [...new Set(text.match(/(?:\.{0,2}\/)+(?:img|fonts)\/[\w.-]+/g) || [])];
  for (const ref of refs) {
    try {
      const uri = await dataUri(ref);
      text = text.split(ref).join(uri);
    } catch {
      console.warn('  ! asset non trovato, lasciato com\'è:', ref);
    }
  }
  return text;
}

console.log('· build in un solo bundle…');
await build({
  root: ROOT,
  // Ignoriamo vite.config.js: lì i chunk sono separati apposta per la cache,
  // qui serve l'esatto contrario.
  configFile: false,
  // base assoluta: così i percorsi di public/ restano riconoscibili e li
  // sostituiamo noi con i data URI.
  base: '/',
  logLevel: 'warn',
  build: {
    outDir: TMP_DIR,
    emptyOutDir: true,
    target: 'es2020',
    copyPublicDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Niente code splitting: tutto in un file, import dinamici compresi.
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        // nomi originali: forzarli tutti a uno solo li fa collidere fra loro
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});

console.log('· inlining di CSS, JS, font e immagini…');
let html = await readFile(join(TMP_DIR, 'index.html'), 'utf8');
const js = await readFile(join(TMP_DIR, 'app.js'), 'utf8');

const cssFile = (await readdir(join(TMP_DIR, 'assets'))).find((f) => f.endsWith('.css'));
const css = await inlineAssets(await readFile(join(TMP_DIR, 'assets', cssFile), 'utf8'));

html = html
  .replace(/<script[^>]*src="[^"]*\.js"[^>]*><\/script>/, '')
  .replace(/<link[^>]*rel="stylesheet"[^>]*>/, '')
  // il favicon diventa inline: nessuna richiesta esterna
  .replace(/<link rel="icon"[^>]*>/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>/, '')
  .replace(/<link rel="preload"[^>]*>/g, '');

html = await inlineAssets(html);

// `</script>` dentro il codice chiuderebbe il tag in anticipo.
const safeJs = js.replace(/<\/script/gi, '<\\/script');
const favicon = await dataUri('/favicon.svg');

/**
 * Il modello 3D e il decodificatore Draco vivono in public/, che qui non
 * esiste: li portiamo dentro come data URI e la scena li trova da sé.
 * Se il modello non c'è (repo appena clonato), il file unico userà la forma
 * parametrica, esattamente come il sito.
 */
let assetsTag = '';
try {
  await access(join(ROOT, 'public/models/car.glb'));
  console.log('· includo il modello 3D e il decodificatore Draco…');
  const assets = {
    car: await dataUri('/models/car.glb'),
    draco: {
      js: await fileUri(join(DRACO_SRC, 'draco_wasm_wrapper.js')),
      wasm: await fileUri(join(DRACO_SRC, 'draco_decoder.wasm'))
    }
  };
  assetsTag = `<script>window.__CARBONIO_ASSETS__ = ${JSON.stringify(assets)};</script>\n`;
} catch {
  console.log('· nessun modello 3D: il file unico userà la forma parametrica');
}

// Attenzione: con una stringa di sostituzione, `$&` e `$'` dentro il codice
// minificato verrebbero interpretati da String.replace. Serve una funzione.
html = html
  .replace('</head>', () => `<link rel="icon" href="${favicon}" />\n<style>${css}</style>\n</head>`)
  .replace('</body>', () => `${assetsTag}<script type="module">${safeJs}</script>\n</body>`);

await mkdir(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, 'carbonio.html');
await writeFile(outFile, html);

const { size } = await stat(outFile);
console.log(`✓ ${outFile} — ${(size / 1024 / 1024).toFixed(2)} MB`);
