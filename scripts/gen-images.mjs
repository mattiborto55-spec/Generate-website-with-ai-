/**
 * Generatore di asset visivi per Autofficina Autostop.
 *
 * Non usiamo foto stock: ogni immagine è una composizione automotive astratta
 * (battistrada, cerchi, manometro, bombola, curve di potenza) disegnata in SVG e
 * rasterizzata in WebP con sharp. Il risultato è coerente con la palette del
 * sito, pesa pochissimo ed è riproducibile: `npm run images`.
 *
 * Pipeline per ogni immagine:
 *   1. layer BASE   -> forme e gradienti nitidi
 *   2. layer GLOW   -> solo le sorgenti luminose, sfocate e in blend `screen`
 *   3. layer GRAIN  -> rumore monocromatico in blend `overlay`
 */

import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/img');

/* ------------------------------------------------------------------ utils */

/** PRNG deterministico: le immagini non cambiano fra due build. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const r2 = (n) => Math.round(n * 100) / 100;

const PALETTE = {
  void: '#050506',
  carbon: '#0A0A0B',
  slate: '#141418',
  steel: '#3A3D46',
  chrome: '#C9CCD4',
  orange: '#FF5A1F',
  cyan: '#22D3EE'
};

const svgDoc = (w, h, defs, body, bg = PALETTE.void) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs><rect width="${w}" height="${h}" fill="${bg}"/>${body}</svg>`;

/** Sfondo: buio profondo con una sacca di luce fuori centro. */
function ambient(w, h, { cx = 0.5, cy = 0.45, tint = PALETTE.slate, power = 0.9 } = {}) {
  const id = `amb${Math.round(cx * 100)}${Math.round(cy * 100)}`;
  return {
    defs: `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.78">
      <stop offset="0" stop-color="${tint}" stop-opacity="${power}"/>
      <stop offset="0.55" stop-color="${tint}" stop-opacity="${power * 0.28}"/>
      <stop offset="1" stop-color="${PALETTE.void}" stop-opacity="0"/></radialGradient>`,
    body: `<rect width="${w}" height="${h}" fill="url(#${id})"/>`
  };
}

/**
 * Pannello di carrozzeria: una forma a doppia curvatura riempita con un
 * gradiente che simula il rollover della luce sulla vernice (scuro -> banda
 * speculare -> scuro), più una linea di piega netta.
 */
function bodyPanel(w, h, o = {}) {
  const {
    id = 'panel',
    top = 0.34, // altezza del bordo superiore (0..1)
    swell = 0.16, // quanto "gonfia" la fiancata
    angle = 96, // direzione del gradiente
    peak = 0.42, // posizione della banda speculare
    intensity = 1,
    crease = true,
    bottom = 1.06
  } = o;
  const y = top * h;
  const cp = swell * h;
  const yb = bottom * h;
  const rad = (angle * Math.PI) / 180;
  const x1 = r2(50 - Math.cos(rad) * 50), y1 = r2(50 - Math.sin(rad) * 50);
  const x2 = r2(50 + Math.cos(rad) * 50), y2 = r2(50 + Math.sin(rad) * 50);
  const g = (v) => Math.min(1, v * intensity);

  const defs = `<linearGradient id="${id}g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
      <stop offset="0" stop-color="#0B0B0E"/>
      <stop offset="${r2(peak - 0.2)}" stop-color="#1B1D23"/>
      <stop offset="${r2(peak - 0.06)}" stop-color="#5A5F6B" stop-opacity="${g(0.95)}"/>
      <stop offset="${r2(peak)}" stop-color="#E8ECF5" stop-opacity="${g(0.98)}"/>
      <stop offset="${r2(peak + 0.045)}" stop-color="#767C89" stop-opacity="${g(0.9)}"/>
      <stop offset="${r2(peak + 0.2)}" stop-color="#191B20"/>
      <stop offset="${r2(peak + 0.52)}" stop-color="#0C0C10"/>
      <stop offset="1" stop-color="#070709"/>
    </linearGradient>`;

  const path = `M-40 ${r2(y + cp * 0.9)} C ${r2(w * 0.22)} ${r2(y - cp)}, ${r2(w * 0.62)} ${r2(y - cp * 0.35)}, ${w + 40} ${r2(y + cp * 0.55)} L ${w + 40} ${r2(yb)} L -40 ${r2(yb)} Z`;

  const creaseLine = crease
    ? `<path d="M-40 ${r2(y + cp * 0.9 + h * 0.19)} C ${r2(w * 0.24)} ${r2(y - cp + h * 0.2)}, ${r2(w * 0.62)} ${r2(y - cp * 0.35 + h * 0.17)}, ${w + 40} ${r2(y + cp * 0.55 + h * 0.15)}"
        fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1.4"/>
       <path d="M-40 ${r2(y + cp * 0.9 + h * 0.205)} C ${r2(w * 0.24)} ${r2(y - cp + h * 0.215)}, ${r2(w * 0.62)} ${r2(y - cp * 0.35 + h * 0.185)}, ${w + 40} ${r2(y + cp * 0.55 + h * 0.165)}"
        fill="none" stroke="#000000" stroke-opacity="0.65" stroke-width="3"/>`
    : '';

  return { defs, body: `<path d="${path}" fill="url(#${id}g)"/>${creaseLine}` };
}

/** Striscia di softbox riflessa sulla vernice: il tratto che dice "lucido". */
function streak(w, h, o = {}) {
  const { id = 'st', x = 0.5, y = 0.4, len = 0.9, thick = 0.05, rot = -8, op = 0.8, color = '#FFFFFF' } = o;
  return {
    defs: `<linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0" stop-color="${color}" stop-opacity="0"/>
      <stop offset="0.3" stop-color="${color}" stop-opacity="${op}"/>
      <stop offset="0.62" stop-color="${color}" stop-opacity="${op * 0.75}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`,
    body: `<g transform="translate(${r2(x * w)} ${r2(y * h)}) rotate(${rot})"><rect x="${r2(-len * w * 0.5)}" y="${r2(-thick * h * 0.5)}" width="${r2(len * w)}" height="${r2(thick * h)}" rx="${r2(thick * h * 0.5)}" fill="url(#${id}g)"/></g>`
  };
}

/** Cerchio in lega: disco forato, pinza accesa, razze sottili in luce radente. */
function wheel(w, h, o = {}) {
  const { id = 'wh', cx = 0.5, cy = 0.55, r = 0.3, spokes = 10, caliper = PALETTE.orange, tilt = 0 } = o;
  const CX = cx * w, CY = cy * h, R = r * Math.min(w, h);
  const rand = rng(7);

  // Razze: sottili, affusolate, staccate dal mozzo.
  let sp = '';
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * 360 + rand() * 1.2;
    sp += `<g transform="rotate(${r2(a)} ${r2(CX)} ${r2(CY)})">
      <path d="M ${r2(CX - R * 0.045)} ${r2(CY - R * 0.26)} L ${r2(CX - R * 0.062)} ${r2(CY - R * 0.9)} L ${r2(CX + R * 0.062)} ${r2(CY - R * 0.9)} L ${r2(CX + R * 0.045)} ${r2(CY - R * 0.26)} Z" fill="url(#${id}spoke)"/>
      <path d="M ${r2(CX - R * 0.045)} ${r2(CY - R * 0.26)} L ${r2(CX - R * 0.062)} ${r2(CY - R * 0.9)} L ${r2(CX - R * 0.03)} ${r2(CY - R * 0.9)} L ${r2(CX - R * 0.02)} ${r2(CY - R * 0.26)} Z" fill="#FFFFFF" opacity="0.16"/></g>`;
  }

  // Disco freno forato, visibile fra le razze.
  let holes = '';
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, rr = R * (0.44 + (i % 2) * 0.12);
    holes += `<circle cx="${r2(CX + Math.cos(a) * rr)}" cy="${r2(CY + Math.sin(a) * rr)}" r="${r2(R * 0.022)}" fill="#08090B"/>`;
  }

  const defs = `<linearGradient id="${id}spoke" x1="10%" y1="0%" x2="90%" y2="70%">
      <stop offset="0" stop-color="#20232A"/><stop offset="0.35" stop-color="#7F8593"/>
      <stop offset="0.55" stop-color="#DCE1EA"/><stop offset="0.8" stop-color="#4A4F59"/>
      <stop offset="1" stop-color="#191B20"/></linearGradient>
    <radialGradient id="${id}tyre" cx="50%" cy="42%" r="62%">
      <stop offset="0.72" stop-color="#0E0E11"/><stop offset="0.9" stop-color="#1C1D22"/>
      <stop offset="1" stop-color="#06060700"/></radialGradient>
    <radialGradient id="${id}disc" cx="42%" cy="36%" r="70%">
      <stop offset="0" stop-color="#40444C"/><stop offset="0.6" stop-color="#24272D"/>
      <stop offset="1" stop-color="#111318"/></radialGradient>
    <linearGradient id="${id}rim" x1="0%" y1="0%" x2="70%" y2="100%">
      <stop offset="0" stop-color="#EDF1F8"/><stop offset="0.35" stop-color="#6E7482"/>
      <stop offset="0.7" stop-color="#22252B"/><stop offset="1" stop-color="#AEB4C0"/></linearGradient>`;

  const body = `<g transform="rotate(${tilt} ${r2(CX)} ${r2(CY)}) translate(${r2(CX)} ${r2(CY)}) scale(0.96 1) translate(${r2(-CX)} ${r2(-CY)})">
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 1.44)}" fill="url(#${id}tyre)"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 1.06)}" fill="none" stroke="#0A0A0C" stroke-width="${r2(R * 0.2)}"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.97)}" fill="#08090B"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.62)}" fill="url(#${id}disc)"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.62)}" fill="none" stroke="#5B6069" stroke-opacity="0.5" stroke-width="${r2(R * 0.012)}"/>
    ${holes}
    <path d="M ${r2(CX - R * 0.78)} ${r2(CY + R * 0.3)} A ${r2(R * 0.84)} ${r2(R * 0.84)} 0 0 1 ${r2(CX - R * 0.66)} ${r2(CY - R * 0.5)}" fill="none" stroke="${caliper}" stroke-width="${r2(R * 0.13)}" stroke-linecap="round"/>
    <path d="M ${r2(CX - R * 0.74)} ${r2(CY + R * 0.22)} A ${r2(R * 0.78)} ${r2(R * 0.78)} 0 0 1 ${r2(CX - R * 0.52)} ${r2(CY - R * 0.56)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="${r2(R * 0.03)}" stroke-linecap="round"/>
    ${sp}
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.97)}" fill="none" stroke="url(#${id}rim)" stroke-width="${r2(R * 0.075)}"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.85)}" fill="none" stroke="#000000" stroke-opacity="0.55" stroke-width="${r2(R * 0.03)}"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.17)}" fill="#15171B"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.17)}" fill="none" stroke="url(#${id}rim)" stroke-width="${r2(R * 0.035)}"/>
    <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.055)}" fill="${caliper}" opacity="0.9"/></g>`;
  return { defs, body };
}

/** Gruppo ottico: taglio angolare + firma luminosa. */
function headlamp(w, h, o = {}) {
  const { id = 'hl', x = 0.52, y = 0.44, s = 0.5, color = '#DFF7FF', rot = -6 } = o;
  const W = s * w, H = s * w * 0.26;
  return {
    defs: `<linearGradient id="${id}g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0" stop-color="#12141A"/><stop offset="0.5" stop-color="#2B303A"/>
        <stop offset="1" stop-color="#080A0D"/></linearGradient>
      <linearGradient id="${id}s" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0" stop-color="${color}" stop-opacity="0.25"/>
        <stop offset="0.5" stop-color="${color}" stop-opacity="1"/>
        <stop offset="1" stop-color="${color}" stop-opacity="0.35"/></linearGradient>`,
    body: `<g transform="translate(${r2(x * w)} ${r2(y * h)}) rotate(${rot})">
      <path d="M ${r2(-W / 2)} ${r2(-H * 0.12)} C ${r2(-W * 0.2)} ${r2(-H * 0.72)}, ${r2(W * 0.2)} ${r2(-H * 0.92)}, ${r2(W / 2)} ${r2(-H * 0.7)} L ${r2(W * 0.46)} ${r2(H * 0.5)} C ${r2(W * 0.1)} ${r2(H * 0.74)}, ${r2(-W * 0.22)} ${r2(H * 0.62)}, ${r2(-W * 0.46)} ${r2(H * 0.16)} Z" fill="url(#${id}g)"/>
      <path d="M ${r2(-W / 2)} ${r2(-H * 0.12)} C ${r2(-W * 0.2)} ${r2(-H * 0.72)}, ${r2(W * 0.2)} ${r2(-H * 0.92)}, ${r2(W / 2)} ${r2(-H * 0.7)}" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.6"/>
      <path d="M ${r2(-W * 0.4)} ${r2(-H * 0.1)} C ${r2(-W * 0.1)} ${r2(-H * 0.46)}, ${r2(W * 0.16)} ${r2(-H * 0.56)}, ${r2(W * 0.42)} ${r2(-H * 0.42)}" stroke="url(#${id}s)" stroke-width="${r2(H * 0.11)}" stroke-linecap="round" fill="none"/>
      <path d="M ${r2(-W * 0.34)} ${r2(H * 0.2)} C ${r2(-W * 0.08)} ${r2(H * 0.02)}, ${r2(W * 0.14)} ${r2(-H * 0.04)}, ${r2(W * 0.38)} ${r2(-H * 0.06)}" stroke="url(#${id}s)" stroke-width="${r2(H * 0.05)}" stroke-opacity="0.65" stroke-linecap="round" fill="none"/>
    </g>`
  };
}

/** Trama in carbonio (twill) come pattern ripetuto. */
function carbon(w, h, o = {}) {
  const { id = 'cb', cell = 26, op = 0.5 } = o;
  return {
    defs: `<pattern id="${id}p" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      <rect width="${cell}" height="${cell}" fill="#0C0D10"/>
      <rect width="${cell / 2}" height="${cell / 2}" fill="#171A1F"/>
      <rect x="${cell / 2}" y="${cell / 2}" width="${cell / 2}" height="${cell / 2}" fill="#171A1F"/>
      <rect x="${cell / 2}" width="${cell / 2}" height="${cell / 2}" fill="#101216"/>
    </pattern>`,
    body: `<rect width="${w}" height="${h}" fill="url(#${id}p)" opacity="${op}"/>`
  };
}

/** Schiuma / gocce: macchie chiare morbide, usate con parsimonia. */
function foam(w, h, seed = 3, count = 26) {
  const rand = rng(seed);
  let body = '';
  for (let i = 0; i < count; i++) {
    const x = rand() * w, y = h * (0.45 + rand() * 0.6), rr = (4 + rand() * 26) * (w / 1200);
    body += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(rr)}" fill="#FFFFFF" opacity="${r2(0.05 + rand() * 0.16)}"/>`;
  }
  return { defs: '', body };
}

/** Alone di colore: usato solo come accento, mai come soggetto. */
function glow(w, h, o = {}) {
  const { id = 'gl', x = 0.5, y = 0.5, r = 0.35, color = PALETTE.orange, op = 0.5 } = o;
  return {
    defs: `<radialGradient id="${id}g" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${color}" stop-opacity="${op}"/>
      <stop offset="0.5" stop-color="${color}" stop-opacity="${op * 0.25}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`,
    body: `<ellipse cx="${r2(x * w)}" cy="${r2(y * h)}" rx="${r2(r * w)}" ry="${r2(r * w * 0.75)}" fill="url(#${id}g)"/>`
  };
}

/** Pavimento bagnato: riflesso verticale sfumato sotto il soggetto. */
function wetFloor(w, h, o = {}) {
  const { id = 'fl', y = 0.72, color = '#8B919C', op = 0.3 } = o;
  return {
    defs: `<linearGradient id="${id}g" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" stop-color="${color}" stop-opacity="${op}"/>
      <stop offset="0.35" stop-color="${color}" stop-opacity="${op * 0.28}"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`,
    body: `<rect x="0" y="${r2(y * h)}" width="${w}" height="${r2(h * (1 - y))}" fill="url(#${id}g)"/>`
  };
}


/**
 * Battistrada visto in prospettiva. `wear` va da 0 (nuovo) a 1 (al limite):
 * cambiano profondità dei canali, contrasto e lucidità della gomma, non la
 * geometria — così le due versioni si sovrappongono nello slider prima/dopo.
 */
function tread(w, h, o = {}) {
  const { id = 'td', wear = 0, rows = 9 } = o;
  const rand = rng(23);
  const depth = 1 - wear;
  const topW = 0.34 + wear * 0.02;   // prospettiva: stretto in alto
  const botW = 1.02;
  const yTop = 0.16 * h;
  const yBot = 1.02 * h;

  // interpolazione lineare fra il bordo alto e quello basso
  const edge = (t, side) => {
    const half = (topW + (botW - topW) * t) * 0.5;
    return w * (0.5 + side * half);
  };

  let grooves = '';
  const lanes = [-0.62, -0.21, 0.21, 0.62];
  for (let i = 0; i < lanes.length; i++) {
    const k = lanes[i];
    const gw = (0.052 + 0.03 * depth);
    const p0l = edge(0, k - gw), p0r = edge(0, k + gw);
    const p1l = edge(1, (k - gw) * 1.02), p1r = edge(1, (k + gw) * 1.02);
    grooves += `<path d="M ${r2(p0l)} ${r2(yTop)} L ${r2(p0r)} ${r2(yTop)} L ${r2(p1r)} ${r2(yBot)} L ${r2(p1l)} ${r2(yBot)} Z" fill="url(#${id}groove)"/>`;
    // spigolo illuminato: sparisce man mano che la gomma si consuma
    grooves += `<path d="M ${r2(p0r)} ${r2(yTop)} L ${r2(p1r)} ${r2(yBot)}" stroke="#FFFFFF" stroke-opacity="${r2(0.06 + 0.16 * depth)}" stroke-width="${r2(1 + depth)}" fill="none"/>`;
  }

  // tagli trasversali
  let sipes = '';
  for (let i = 0; i < rows; i++) {
    const t = i / (rows - 1);
    const y = yTop + (yBot - yTop) * Math.pow(t, 1.35);
    const tilt = h * 0.012 * (1 + t);
    sipes += `<path d="M ${r2(edge(t, -0.95))} ${r2(y)} L ${r2(edge(t, 0.95))} ${r2(y - tilt)}"
      stroke="#000000" stroke-opacity="${r2(0.35 + 0.4 * depth)}" stroke-width="${r2((1.4 + 2.6 * depth) * (0.5 + t))}" fill="none"/>`;
  }

  // La gomma consumata è più chiara e lucida: la superficie si è levigata.
  const defs = `<linearGradient id="${id}rub" x1="14%" y1="0%" x2="86%" y2="100%">
      <stop offset="0" stop-color="#1c1e24"/>
      <stop offset="0.32" stop-color="${wear > 0.5 ? '#4a4e57' : '#383c44'}"/>
      <stop offset="0.62" stop-color="${wear > 0.5 ? '#3a3e46' : '#282b31'}"/>
      <stop offset="1" stop-color="#0d0e11"/></linearGradient>
    <linearGradient id="${id}sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="0.35" stop-color="#FFFFFF" stop-opacity="${r2(0.1 + wear * 0.16)}"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
    <linearGradient id="${id}groove" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0" stop-color="#000000" stop-opacity="${r2(0.6 + 0.38 * depth)}"/>
      <stop offset="1" stop-color="#000000" stop-opacity="${r2(0.42 + 0.5 * depth)}"/></linearGradient>`;

  const body = `<path d="M ${r2(edge(0, -1))} ${r2(yTop)} L ${r2(edge(0, 1))} ${r2(yTop)} L ${r2(edge(1, 1))} ${r2(yBot)} L ${r2(edge(1, -1))} ${r2(yBot)} Z" fill="url(#${id}rub)"/>
    ${grooves}${sipes}
    <path d="M ${r2(edge(0, -1))} ${r2(yTop)} L ${r2(edge(0, 1))} ${r2(yTop)} L ${r2(edge(1, 1))} ${r2(yBot)} L ${r2(edge(1, -1))} ${r2(yBot)} Z" fill="url(#${id}sheen)"/>`;
  return { defs, body };
}

/** Manometro: quadrante scuro, lancetta, vetro. Per il servizio clima. */
function gauge(w, h, o = {}) {
  const { id = 'gg', cx = 0.5, cy = 0.5, r = 0.3, needle = -38, accent = PALETTE.volt } = o;
  const CX = cx * w, CY = cy * h, R = r * Math.min(w, h);
  let ticks = '';
  for (let i = 0; i <= 40; i++) {
    const a = (-215 + (i / 40) * 250) * (Math.PI / 180);
    const big = i % 5 === 0;
    const r1 = R * (big ? 0.72 : 0.8);
    ticks += `<path d="M ${r2(CX + Math.cos(a) * r1)} ${r2(CY + Math.sin(a) * r1)} L ${r2(CX + Math.cos(a) * R * 0.88)} ${r2(CY + Math.sin(a) * R * 0.88)}"
      stroke="#E8ECF5" stroke-opacity="${big ? 0.75 : 0.3}" stroke-width="${big ? 2.4 : 1.2}"/>`;
  }
  const na = needle * (Math.PI / 180);
  return {
    defs: `<radialGradient id="${id}face" cx="42%" cy="34%" r="72%">
        <stop offset="0" stop-color="#23262d"/><stop offset="0.7" stop-color="#111318"/>
        <stop offset="1" stop-color="#08090b"/></radialGradient>
      <linearGradient id="${id}ring" x1="0%" y1="0%" x2="80%" y2="100%">
        <stop offset="0" stop-color="#EDF1F8"/><stop offset="0.45" stop-color="#5C6270"/>
        <stop offset="1" stop-color="#1B1E24"/></linearGradient>`,
    body: `<circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 1.08)}" fill="none" stroke="url(#${id}ring)" stroke-width="${r2(R * 0.13)}"/>
      <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R)}" fill="url(#${id}face)"/>
      ${ticks}
      <path d="M ${r2(CX - R * 0.85)} ${r2(CY - R * 0.35)} A ${r2(R * 0.92)} ${r2(R * 0.92)} 0 0 1 ${r2(CX - R * 0.2)} ${r2(CY - R * 0.9)}"
        fill="none" stroke="${accent}" stroke-opacity="0.8" stroke-width="${r2(R * 0.06)}"/>
      <path d="M ${r2(CX)} ${r2(CY)} L ${r2(CX + Math.cos(na) * R * 0.82)} ${r2(CY + Math.sin(na) * R * 0.82)}"
        stroke="${PALETTE.orange}" stroke-width="${r2(R * 0.045)}" stroke-linecap="round"/>
      <circle cx="${r2(CX)}" cy="${r2(CY)}" r="${r2(R * 0.09)}" fill="#D8DCE4"/>
      <ellipse cx="${r2(CX - R * 0.3)}" cy="${r2(CY - R * 0.42)}" rx="${r2(R * 0.55)}" ry="${r2(R * 0.3)}" fill="#FFFFFF" opacity="0.05" transform="rotate(-28 ${r2(CX)} ${r2(CY)})"/>`
  };
}

/** Bombola cilindrica con valvola: impianti GPL e metano. */
function tank(w, h, o = {}) {
  const { id = 'tk', cx = 0.5, cy = 0.54, len = 0.62, rad = 0.17, rot = -14 } = o;
  const L = len * w, R = rad * h;
  return {
    defs: `<linearGradient id="${id}body" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0" stop-color="#1A1D23"/><stop offset="0.3" stop-color="#7C8391"/>
        <stop offset="0.44" stop-color="#D6DCE6"/><stop offset="0.62" stop-color="#5A606C"/>
        <stop offset="1" stop-color="#0E1014"/></linearGradient>`,
    body: `<g transform="translate(${r2(cx * w)} ${r2(cy * h)}) rotate(${rot})">
      <rect x="${r2(-L / 2)}" y="${r2(-R)}" width="${r2(L)}" height="${r2(R * 2)}" rx="${r2(R)}" fill="url(#${id}body)"/>
      <rect x="${r2(-L / 2 + L * 0.16)}" y="${r2(-R)}" width="${r2(L * 0.06)}" height="${r2(R * 2)}" fill="#000000" opacity="0.35"/>
      <rect x="${r2(L / 2 - L * 0.22)}" y="${r2(-R)}" width="${r2(L * 0.06)}" height="${r2(R * 2)}" fill="#000000" opacity="0.35"/>
      <rect x="${r2(L / 2 - 6)}" y="${r2(-R * 0.34)}" width="${r2(L * 0.13)}" height="${r2(R * 0.68)}" rx="4" fill="#3B4049"/>
      <circle cx="${r2(L / 2 + L * 0.13)}" cy="0" r="${r2(R * 0.34)}" fill="${PALETTE.orange}" opacity="0.9"/>
      <rect x="${r2(-L / 2)}" y="${r2(-R * 0.06)}" width="${r2(L)}" height="${r2(R * 0.12)}" fill="#FFFFFF" opacity="0.16"/>
    </g>`
  };
}

/** Curve di potenza su griglia: mappatura centraline. */
function curve(w, h, o = {}) {
  const { id = 'cv' } = o;
  let grid = '';
  for (let i = 1; i < 8; i++) grid += `<path d="M ${r2((i / 8) * w)} 0 L ${r2((i / 8) * w)} ${h}" stroke="#20242b" stroke-width="1"/>`;
  for (let i = 1; i < 6; i++) grid += `<path d="M 0 ${r2((i / 6) * h)} L ${w} ${r2((i / 6) * h)}" stroke="#20242b" stroke-width="1"/>`;

  const line = (peak, drop, color, width, op) => {
    let d = `M 0 ${r2(h * 0.92)}`;
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const y = h * (0.92 - peak * Math.pow(Math.sin(Math.PI * Math.min(t * drop, 1)), 0.85));
      d += ` L ${r2(t * w)} ${r2(y)}`;
    }
    return `<path d="${d}" fill="none" stroke="${color}" stroke-opacity="${op}" stroke-width="${width}" stroke-linecap="round"/>`;
  };

  return {
    defs: '',
    body: `${grid}
      ${line(0.5, 0.78, PALETTE.chrome, 2, 0.35)}
      ${line(0.68, 0.86, PALETTE.orange, 3.4, 1)}`
  };
}

const stack = (...parts) => ({
  defs: parts.map((p) => p.defs).join(''),
  body: parts.map((p) => p.body).join('')
});

/* ------------------------------------------------------ composizioni */

/**
 * Ogni voce restituisce { w, h, base, glow } dove `glow` è un SVG con le sole
 * sorgenti luminose: viene sfocato e sommato in `screen` per il bloom.
 */
const SCENES = {
  hero: (w, h) => {
    const s = stack(
      ambient(w, h, { cx: 0.5, cy: 0.38, tint: '#1A1C22', power: 1 }),
      bodyPanel(w, h, { id: 'p1', top: 0.42, swell: 0.13, peak: 0.4, angle: 100 }),
      streak(w, h, { id: 's1', x: 0.5, y: 0.48, len: 1.5, thick: 0.022, rot: -5, op: 0.9 }),
      streak(w, h, { id: 's2', x: 0.42, y: 0.6, len: 1.2, thick: 0.01, rot: -3, op: 0.4 }),
      wetFloor(w, h, { y: 0.74, op: 0.22 }),
      glow(w, h, { id: 'g1', x: 0.78, y: 0.32, r: 0.3, color: PALETTE.orange, op: 0.34 }),
      glow(w, h, { id: 'g2', x: 0.16, y: 0.6, r: 0.26, color: PALETTE.cyan, op: 0.14 })
    );
    const gl = stack(
      streak(w, h, { id: 'q1', x: 0.5, y: 0.48, len: 1.4, thick: 0.02, rot: -5, op: 1 }),
      glow(w, h, { id: 'q2', x: 0.78, y: 0.32, r: 0.26, color: PALETTE.orange, op: 0.7 })
    );
    return { base: s, glow: gl };
  },

  // Slider prima/dopo: stesso battistrada, consumato e nuovo.
  before: (w, h) => ({
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.28, tint: '#22252c', power: 1 }),
      tread(w, h, { id: 'tw', wear: 1 }),
      streak(w, h, { id: 'tws', x: 0.5, y: 0.34, len: 1.3, thick: 0.2, rot: -3, op: 0.05 })
    ),
    glow: { defs: '', body: '' }
  }),

  after: (w, h) => ({
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.28, tint: '#22252c', power: 1 }),
      tread(w, h, { id: 'tn', wear: 0 }),
      glow(w, h, { id: 'tng', x: 0.5, y: 0.2, r: 0.34, color: PALETTE.orange, op: 0.12 })
    ),
    glow: { defs: '', body: '' }
  }),

  'work-01': (w, h) => ({ // gomme
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.35, tint: '#1a1d23' }),
      tread(w, h, { id: 'w1t', wear: 0.1 }),
      glow(w, h, { id: 'w1g', x: 0.5, y: 0.18, r: 0.3, color: PALETTE.orange, op: 0.14 })
    ),
    glow: { defs: '', body: '' }
  }),

  'work-02': (w, h) => ({ // convergenza e assetto
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.5, tint: '#181b21' }),
      wheel(w, h, { id: 'w2', cx: 0.5, cy: 0.52, r: 0.3, spokes: 10, caliper: PALETTE.orange, tilt: 6 }),
      { defs: '', body: `<path d="M0 ${r2(h * 0.52)} L ${w} ${r2(h * 0.52)}" stroke="${PALETTE.volt}" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="10 8"/>
        <path d="M ${r2(w * 0.5)} 0 L ${r2(w * 0.5)} ${h}" stroke="${PALETTE.volt}" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="6 8"/>
        <path d="M ${r2(w * 0.16)} ${r2(h * 0.14)} L ${r2(w * 0.84)} ${r2(h * 0.2)}" stroke="${PALETTE.orange}" stroke-opacity="0.7" stroke-width="1.5"/>` },
      wetFloor(w, h, { y: 0.82, op: 0.18 })
    ),
    glow: { defs: '', body: `<path d="M0 ${r2(h * 0.52)} L ${w} ${r2(h * 0.52)}" stroke="${PALETTE.volt}" stroke-width="2" stroke-dasharray="10 8"/>` }
  }),

  'work-03': (w, h) => ({ // aria condizionata
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.45, tint: '#171a20' }),
      gauge(w, h, { id: 'w3', cx: 0.5, cy: 0.5, r: 0.31, needle: -150, accent: PALETTE.volt }),
      glow(w, h, { id: 'w3g', x: 0.5, y: 0.5, r: 0.34, color: PALETTE.volt, op: 0.12 })
    ),
    glow: stack(glow(w, h, { id: 'w3q', x: 0.5, y: 0.5, r: 0.2, color: PALETTE.volt, op: 0.3 }))
  }),

  'work-04': (w, h) => ({ // impianti GPL e metano
    base: stack(
      ambient(w, h, { cx: 0.45, cy: 0.45, tint: '#1a1d24' }),
      tank(w, h, { id: 'w4', cx: 0.5, cy: 0.52, len: 0.66, rad: 0.14, rot: -12 }),
      streak(w, h, { id: 'w4s', x: 0.5, y: 0.3, len: 1.2, thick: 0.014, rot: -6, op: 0.5 }),
      wetFloor(w, h, { y: 0.78, op: 0.16 })
    ),
    glow: stack(streak(w, h, { id: 'w4q', x: 0.5, y: 0.3, len: 1.1, thick: 0.012, rot: -6, op: 0.7 }))
  }),

  'work-05': (w, h) => ({ // revisione: la luce ispettiva sulla lamiera
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.2, tint: '#1c1f26', power: 1 }),
      bodyPanel(w, h, { id: 'w5', top: 0.46, swell: 0.1, peak: 0.4, angle: 98 }),
      streak(w, h, { id: 'w5s', x: 0.5, y: 0.5, len: 1.5, thick: 0.016, rot: -4, op: 0.9 }),
      { defs: '', body: `<path d="M ${r2(w * 0.42)} 0 L ${r2(w * 0.2)} ${r2(h * 0.52)} L ${r2(w * 0.82)} ${r2(h * 0.52)} L ${r2(w * 0.6)} 0 Z" fill="#FFFFFF" opacity="0.045"/>` }
    ),
    glow: stack(streak(w, h, { id: 'w5q', x: 0.5, y: 0.5, len: 1.4, thick: 0.014, rot: -4, op: 1 }))
  }),

  'work-06': (w, h) => ({ // mappatura centraline
    base: stack(
      ambient(w, h, { cx: 0.4, cy: 0.4, tint: '#15181e' }),
      curve(w, h, { id: 'w6' }),
      glow(w, h, { id: 'w6g', x: 0.62, y: 0.4, r: 0.32, color: PALETTE.orange, op: 0.16 })
    ),
    glow: stack(curve(w, h, { id: 'w6q' }))
  }),

  og: (w, h) => ({
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.42, tint: '#1C1F27', power: 1 }),
      bodyPanel(w, h, { id: 'og1', top: 0.52, swell: 0.14, peak: 0.4, angle: 100 }),
      streak(w, h, { id: 'ogs', x: 0.5, y: 0.58, len: 1.5, thick: 0.02, rot: -5, op: 0.9 }),
      glow(w, h, { id: 'ogg', x: 0.76, y: 0.34, r: 0.3, color: PALETTE.orange, op: 0.32 }),
      wetFloor(w, h, { y: 0.8, op: 0.2 })
    ),
    glow: stack(streak(w, h, { id: 'ogq', x: 0.5, y: 0.58, len: 1.4, thick: 0.018, rot: -5, op: 1 }))
  })
};

/* --------------------------------------------------------- rasterizzazione */

async function noiseLayer(w, h, seed = 42, strength = 26) {
  const rand = rng(seed);
  const px = Buffer.alloc(w * h);
  for (let i = 0; i < px.length; i++) px[i] = 128 + Math.round((rand() - 0.5) * strength * 2);
  return sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

async function render(name, w, h, { format = 'webp', quality = 82, blur = 34 } = {}) {
  const scene = SCENES[name](w, h);
  const baseSvg = svgDoc(w, h, scene.base.defs, scene.base.body);
  const glowSvg = svgDoc(w, h, scene.glow.defs, scene.glow.body, '#000000');

  const base = sharp(Buffer.from(baseSvg), { density: 96 }).resize(w, h);
  const layers = [];

  if (scene.glow.body) {
    const g = await sharp(Buffer.from(glowSvg), { density: 96 }).resize(w, h).blur(blur).png().toBuffer();
    layers.push({ input: g, blend: 'screen' });
  }
  layers.push({ input: await noiseLayer(w, h, 42, 22), blend: 'overlay' });

  const pipe = base.composite(layers).modulate({ brightness: 1.02 }).sharpen({ sigma: 0.6 });
  const file = join(OUT, `${name}.${format}`);
  if (format === 'jpg') await pipe.jpeg({ quality: 88, mozjpeg: true }).toFile(file);
  else await pipe.webp({ quality, effort: 6 }).toFile(file);
  return file;
}

/** Mappa vettoriale stilizzata: più coerente di uno screenshot di Maps. */
function darkMap() {
  const rand = rng(19);
  const W = 1000, H = 760;
  let roads = '';
  for (let i = 0; i < 9; i++) {
    const y = 60 + i * 82 + rand() * 20;
    roads += `<path d="M-20 ${r2(y)} L ${W + 20} ${r2(y - 30 + rand() * 60)}" stroke="#1D2027" stroke-width="${i % 3 === 0 ? 7 : 3}" fill="none"/>`;
  }
  for (let i = 0; i < 8; i++) {
    const x = 60 + i * 122 + rand() * 24;
    roads += `<path d="M ${r2(x)} -20 L ${r2(x - 40 + rand() * 80)} ${H + 20}" stroke="#1D2027" stroke-width="${i % 4 === 0 ? 8 : 3}" fill="none"/>`;
  }
  let blocks = '';
  for (let i = 0; i < 44; i++) {
    const x = rand() * W, y = rand() * H, bw = 30 + rand() * 110, bh = 26 + rand() * 90;
    blocks += `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(bw)}" height="${r2(bh)}" rx="3" fill="#101318" opacity="${r2(0.5 + rand() * 0.4)}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Mappa stilizzata di Maranello con la sede dell'officina in Via Firenze 56">
  <defs>
    <radialGradient id="mg" cx="52%" cy="46%" r="60%">
      <stop offset="0" stop-color="#1A1D24"/><stop offset="1" stop-color="#08090B"/></radialGradient>
    <radialGradient id="pin" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FF5A1F" stop-opacity="0.55"/><stop offset="1" stop-color="#FF5A1F" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#mg)"/>
  ${blocks}${roads}
  <path d="M-20 430 L ${W + 20} 360" stroke="#FF5A1F" stroke-opacity="0.22" stroke-width="10" fill="none"/>
  <circle cx="520" cy="352" r="150" fill="url(#pin)"/>
  <circle cx="520" cy="352" r="12" fill="#FF5A1F"/>
  <circle cx="520" cy="352" r="26" fill="none" stroke="#FF5A1F" stroke-opacity="0.6" stroke-width="2"/>
  <text x="556" y="346" fill="#F5F5F7" font-family="Inter,Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="1">AUTOFFICINA AUTOSTOP</text>
  <text x="556" y="372" fill="#9A9AA3" font-family="Inter,Arial,sans-serif" font-size="17">Via Firenze 56 — Maranello (MO)</text>
</svg>`;
}

/* ---------------------------------------------------------------- esecuzione */

await mkdir(OUT, { recursive: true });

const JOBS = [
  ['hero', 1920, 1080],
  ['before', 1800, 1100],
  ['after', 1800, 1100],
  ['work-01', 1200, 1500],
  ['work-02', 1200, 1200],
  ['work-03', 1200, 900],
  ['work-04', 1200, 1500],
  ['work-05', 1200, 900],
  ['work-06', 1200, 1200]
];

for (const [name, w, h] of JOBS) console.log('✓', await render(name, w, h));
console.log('✓', await render('og', 1200, 630, { format: 'jpg' }));

// Grana cinematografica riutilizzata dal CSS su tutto il sito.
await sharp(await noiseLayer(180, 180, 7, 130)).png({ colors: 16, compressionLevel: 9 }).toFile(join(OUT, 'grain.png'));
console.log('✓ grain.png');

await writeFile(join(OUT, 'map.svg'), darkMap());
console.log('✓ map.svg');

/* Icona per iOS: Safari non accetta l'SVG come apple-touch-icon, e senza
   questo file la schermata home mostrerebbe uno screenshot sgranato. */
const TOUCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">
  <rect width="180" height="180" fill="#0A0A0B"/>
  <path d="M90 26 31 60v60l59 34 59-34V60z" fill="none" stroke="#FF5A1F" stroke-width="10" stroke-linejoin="round"/>
  <path d="M90 62 62 78v34l28 16 28-16V78z" fill="none" stroke="#22D3EE" stroke-width="7" stroke-linejoin="round" opacity=".85"/>
</svg>`;
await sharp(Buffer.from(TOUCH_ICON)).png({ compressionLevel: 9 }).toFile(join(ROOT, 'public/apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');
