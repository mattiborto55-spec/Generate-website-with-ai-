/**
 * Generatore di asset visivi per CARBONIO Studio.
 *
 * Non usiamo foto stock: ogni immagine è una composizione automotive astratta
 * (carrozzeria, riflessi, cerchi, fari, schiuma, carbonio) disegnata in SVG e
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

  before: (w, h) => {
    // Vernice ossidata: micrograffi circolari SOLO sulla lamiera, riflesso
    // slavato e contrasto compresso. Stessa inquadratura di `after`.
    const rand = rng(11);
    const panel = bodyPanel(w, h, { id: 'b1', top: 0.2, swell: 0.16, peak: 0.4, angle: 98, intensity: 0.68 });
    const panelPath = `M-40 ${r2(0.2 * h + 0.16 * h * 0.9)} C ${r2(w * 0.22)} ${r2(0.2 * h - 0.16 * h)}, ${r2(w * 0.62)} ${r2(0.2 * h - 0.16 * h * 0.35)}, ${w + 40} ${r2(0.2 * h + 0.16 * h * 0.55)} L ${w + 40} ${r2(1.06 * h)} L -40 ${r2(1.06 * h)} Z`;

    let swirls = '';
    for (let i = 0; i < 320; i++) {
      const cx = rand() * w, cy = h * (0.3 + rand() * 0.72), rr = (6 + rand() * 30) * (w / 1600);
      const a0 = rand() * 6.28, sweep = 2 + rand() * 3.2;
      const x1 = cx + Math.cos(a0) * rr, y1 = cy + Math.sin(a0) * rr * 0.5;
      const x2 = cx + Math.cos(a0 + sweep) * rr, y2 = cy + Math.sin(a0 + sweep) * rr * 0.5;
      swirls += `<path d="M ${r2(x1)} ${r2(y1)} A ${r2(rr)} ${r2(rr * 0.5)} 0 ${sweep > 3.14 ? 1 : 0} 1 ${r2(x2)} ${r2(y2)}" fill="none" stroke="#D6DCE8" stroke-opacity="${r2(0.09 + rand() * 0.13)}" stroke-width="${r2(0.9 + rand() * 1.3)}"/>`;
    }
    const s = stack(
      ambient(w, h, { cx: 0.45, cy: 0.4, tint: '#16181D', power: 0.62 }),
      panel,
      streak(w, h, { id: 'bs1', x: 0.5, y: 0.36, len: 1.5, thick: 0.16, rot: -6, op: 0.09 }),
      { defs: `<clipPath id="bclip"><path d="${panelPath}"/></clipPath>`, body: `<g clip-path="url(#bclip)">${swirls}<rect width="${w}" height="${h}" fill="#4A4E58" opacity="0.1"/></g>` },
      { defs: '', body: `<rect width="${w}" height="${h}" fill="#0A0A0B" opacity="0.14"/>` },
      wetFloor(w, h, { y: 0.8, op: 0.06 })
    );
    return { base: s, glow: { defs: '', body: '' } };
  },

  after: (w, h) => {
    const s = stack(
      ambient(w, h, { cx: 0.45, cy: 0.4, tint: '#1D2027', power: 1 }),
      bodyPanel(w, h, { id: 'a1', top: 0.2, swell: 0.16, peak: 0.4, angle: 98, intensity: 1 }),
      streak(w, h, { id: 'as1', x: 0.5, y: 0.3, len: 1.6, thick: 0.018, rot: -6, op: 0.95 }),
      streak(w, h, { id: 'as2', x: 0.48, y: 0.44, len: 1.3, thick: 0.008, rot: -4, op: 0.5 }),
      glow(w, h, { id: 'ag', x: 0.8, y: 0.28, r: 0.26, color: PALETTE.orange, op: 0.3 }),
      wetFloor(w, h, { y: 0.8, op: 0.26 })
    );
    const gl = stack(streak(w, h, { id: 'ag1', x: 0.5, y: 0.3, len: 1.5, thick: 0.016, rot: -6, op: 1 }));
    return { base: s, glow: gl };
  },

  'work-01': (w, h) => ({ // Porsche 911 — ceramic coating
    base: stack(
      ambient(w, h, { cx: 0.55, cy: 0.35, tint: '#1B1E25' }),
      bodyPanel(w, h, { id: 'w1', top: 0.3, swell: 0.2, peak: 0.36, angle: 104 }),
      streak(w, h, { id: 'w1s', x: 0.5, y: 0.4, len: 1.5, thick: 0.02, rot: -9, op: 0.9 }),
      glow(w, h, { id: 'w1g', x: 0.2, y: 0.72, r: 0.3, color: PALETTE.orange, op: 0.22 }),
      wetFloor(w, h, { y: 0.7, op: 0.24 })
    ),
    glow: stack(streak(w, h, { id: 'w1q', x: 0.5, y: 0.4, len: 1.4, thick: 0.018, rot: -9, op: 1 }))
  }),

  'work-02': (w, h) => ({ // BMW M4 — PPF frontale
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.5, tint: '#171A20' }),
      bodyPanel(w, h, { id: 'w2', top: 0.62, swell: 0.14, peak: 0.46, angle: 100 }),
      headlamp(w, h, { id: 'w2h', x: 0.55, y: 0.42, s: 0.72, rot: -7 }),
      glow(w, h, { id: 'w2g', x: 0.55, y: 0.42, r: 0.32, color: PALETTE.cyan, op: 0.2 })
    ),
    glow: stack(headlamp(w, h, { id: 'w2hq', x: 0.55, y: 0.42, s: 0.72, rot: -7 }))
  }),

  'work-03': (w, h) => ({ // Audi RS6 — wrapping satinato
    base: stack(
      ambient(w, h, { cx: 0.4, cy: 0.4, tint: '#191B21' }),
      bodyPanel(w, h, { id: 'w3', top: 0.34, swell: 0.15, peak: 0.5, angle: 88, intensity: 0.55 }),
      streak(w, h, { id: 'w3s', x: 0.5, y: 0.46, len: 1.6, thick: 0.09, rot: -4, op: 0.16 }),
      glow(w, h, { id: 'w3g', x: 0.82, y: 0.7, r: 0.3, color: PALETTE.cyan, op: 0.14 }),
      wetFloor(w, h, { y: 0.78, op: 0.12 })
    ),
    glow: { defs: '', body: '' }
  }),

  'work-04': (w, h) => ({ // Tesla Model 3 — detailing completo
    base: stack(
      ambient(w, h, { cx: 0.5, cy: 0.42, tint: '#1A1D24' }),
      bodyPanel(w, h, { id: 'w4', top: 0.4, swell: 0.12, peak: 0.42, angle: 100 }),
      foam(w, h, 5, 30),
      streak(w, h, { id: 'w4s', x: 0.5, y: 0.42, len: 1.4, thick: 0.014, rot: -6, op: 0.75 }),
      wetFloor(w, h, { y: 0.74, op: 0.28 })
    ),
    glow: stack(streak(w, h, { id: 'w4q', x: 0.5, y: 0.42, len: 1.3, thick: 0.012, rot: -6, op: 0.9 }))
  }),

  'work-05': (w, h) => ({ // Mercedes-AMG GT — lucidatura
    base: stack(
      ambient(w, h, { cx: 0.48, cy: 0.5, tint: '#1C1F26' }),
      wheel(w, h, { id: 'w5', cx: 0.5, cy: 0.52, r: 0.34, spokes: 11, caliper: PALETTE.orange, tilt: -8 }),
      glow(w, h, { id: 'w5g', x: 0.5, y: 0.52, r: 0.36, color: PALETTE.orange, op: 0.14 }),
      wetFloor(w, h, { y: 0.82, op: 0.2 })
    ),
    glow: stack(glow(w, h, { id: 'w5q', x: 0.5, y: 0.55, r: 0.22, color: PALETTE.orange, op: 0.45 }))
  }),

  'work-06': (w, h) => ({ // Golf R — restyling interni
    base: stack(
      ambient(w, h, { cx: 0.55, cy: 0.45, tint: '#15171C' }),
      carbon(w, h, { id: 'w6c', cell: 30, op: 0.85 }),
      { defs: '', body: `<path d="M0 ${r2(h * 0.62)} C ${r2(w * 0.3)} ${r2(h * 0.5)}, ${r2(w * 0.7)} ${r2(h * 0.56)}, ${w} ${r2(h * 0.44)} L ${w} ${h} L 0 ${h} Z" fill="#08090B" opacity="0.92"/>` },
      { defs: '', body: `<path d="M0 ${r2(h * 0.615)} C ${r2(w * 0.3)} ${r2(h * 0.495)}, ${r2(w * 0.7)} ${r2(h * 0.555)}, ${w} ${r2(h * 0.435)}" fill="none" stroke="${PALETTE.orange}" stroke-opacity="0.75" stroke-width="2" stroke-dasharray="14 10"/>` },
      streak(w, h, { id: 'w6s', x: 0.45, y: 0.78, len: 1.1, thick: 0.12, rot: -6, op: 0.07 }),
      glow(w, h, { id: 'w6g', x: 0.5, y: 0.5, r: 0.4, color: PALETTE.orange, op: 0.1 })
    ),
    glow: { defs: '', body: `<path d="M0 ${r2(h * 0.615)} C ${r2(w * 0.3)} ${r2(h * 0.495)}, ${r2(w * 0.7)} ${r2(h * 0.555)}, ${w} ${r2(h * 0.435)}" fill="none" stroke="${PALETTE.orange}" stroke-width="3" stroke-dasharray="14 10"/>` }
  }),

  'work-07': (w, h) => ({ // Alfa Romeo Giulia QV — cerchi e freni
    base: stack(
      ambient(w, h, { cx: 0.42, cy: 0.48, tint: '#1A1C22' }),
      wheel(w, h, { id: 'w7', cx: 0.46, cy: 0.5, r: 0.3, spokes: 5, caliper: PALETTE.orange, tilt: 14 }),
      streak(w, h, { id: 'w7s', x: 0.5, y: 0.16, len: 1.4, thick: 0.02, rot: -3, op: 0.45 }),
      wetFloor(w, h, { y: 0.8, op: 0.22 })
    ),
    glow: stack(streak(w, h, { id: 'w7q', x: 0.5, y: 0.16, len: 1.3, thick: 0.018, rot: -3, op: 0.7 }))
  }),

  'work-08': (w, h) => ({ // Range Rover — wrapping totale
    base: stack(
      ambient(w, h, { cx: 0.6, cy: 0.36, tint: '#181B21' }),
      bodyPanel(w, h, { id: 'w8', top: 0.44, swell: 0.06, peak: 0.34, angle: 94, intensity: 0.8 }),
      streak(w, h, { id: 'w8s', x: 0.5, y: 0.5, len: 1.7, thick: 0.012, rot: -2, op: 0.6 }),
      glow(w, h, { id: 'w8g', x: 0.24, y: 0.3, r: 0.28, color: PALETTE.cyan, op: 0.16 }),
      wetFloor(w, h, { y: 0.76, op: 0.18 })
    ),
    glow: stack(streak(w, h, { id: 'w8q', x: 0.5, y: 0.5, len: 1.6, thick: 0.01, rot: -2, op: 0.8 }))
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Mappa stilizzata della zona di Modena Nord con la sede CARBONIO Studio">
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
  <text x="556" y="346" fill="#F5F5F7" font-family="Inter,Arial,sans-serif" font-size="21" font-weight="700" letter-spacing="1">CARBONIO STUDIO</text>
  <text x="556" y="372" fill="#9A9AA3" font-family="Inter,Arial,sans-serif" font-size="17">Via dell'Industria 46 — Modena</text>
</svg>`;
}

/* ---------------------------------------------------------------- esecuzione */

await mkdir(OUT, { recursive: true });

const JOBS = [
  ['hero', 1920, 1080],
  ['before', 1800, 1100],
  ['after', 1800, 1100],
  ['work-01', 1200, 1500],
  ['work-02', 1200, 900],
  ['work-03', 1200, 1200],
  ['work-04', 1200, 1500],
  ['work-05', 1200, 900],
  ['work-06', 1200, 1200],
  ['work-07', 1200, 1500],
  ['work-08', 1200, 900]
];

for (const [name, w, h] of JOBS) console.log('✓', await render(name, w, h));
console.log('✓', await render('og', 1200, 630, { format: 'jpg' }));

// Grana cinematografica riutilizzata dal CSS su tutto il sito.
await sharp(await noiseLayer(180, 180, 7, 130)).png({ colors: 16, compressionLevel: 9 }).toFile(join(OUT, 'grain.png'));
console.log('✓ grain.png');

await writeFile(join(OUT, 'map.svg'), darkMap());
console.log('✓ map.svg');
