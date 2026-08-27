/** Utility condivise. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Rispettiamo la preferenza di sistema: niente animazioni pesanti. */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouch = () => window.matchMedia('(hover: none), (pointer: coarse)').matches;

/** Formatta i contatori in stile italiano (4,9 / 500). */
export function formatNumber(value, decimals = 0) {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}
