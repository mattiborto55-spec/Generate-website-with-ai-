import gsap from 'gsap';
import { $, $$, isTouch } from './utils.js';

const LABELS = {
  guarda: 'Guarda',
  prenota: 'Prenota',
  trascina: 'Trascina',
  apri: 'Apri',
  chiama: 'Chiama',
  scrivi: 'Scrivi',
  invia: 'Invia',
  click: 'Vai'
};

/**
 * Cursore custom: un anello che insegue il puntatore con ritardo, si dilata
 * sugli elementi interattivi e mostra l'azione ("GUARDA", "PRENOTA"...).
 * Su touch non esiste: non ha senso e ruba frame.
 */
export function initCursor() {
  if (isTouch()) return null;

  const el = $('#cursor');
  const ring = $('.cursor__ring', el);
  const dot = $('.cursor__dot', el);
  const label = $('.cursor__label', el);
  document.body.classList.add('has-cursor');

  const setRingX = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
  const setRingY = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
  const setDotX = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
  const setDotY = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });

  window.addEventListener(
    'pointermove',
    (e) => {
      setRingX(e.clientX);
      setRingY(e.clientY);
      setDotX(e.clientX);
      setDotY(e.clientY);
    },
    { passive: true }
  );

  window.addEventListener('pointerdown', () => el.classList.add('is-down'));
  window.addEventListener('pointerup', () => el.classList.remove('is-down'));
  document.addEventListener('mouseleave', () => gsap.to(el, { opacity: 0, duration: 0.3 }));
  document.addEventListener('mouseenter', () => gsap.to(el, { opacity: 1, duration: 0.3 }));

  const bind = (node) => {
    const key = node.dataset.cursor || 'click';
    node.addEventListener('pointerenter', () => {
      label.textContent = LABELS[key] || '';
      el.classList.add('is-active');
    });
    node.addEventListener('pointerleave', () => el.classList.remove('is-active'));
  };

  $$('[data-cursor]').forEach(bind);
  return { bind };
}

/**
 * Bottoni magnetici: il bottone insegue leggermente il mouse quando gli passi
 * vicino. Spostamento massimo contenuto — deve sembrare peso, non elastico.
 */
export function initMagnetic(strength = 0.32) {
  if (isTouch()) return;

  $$('[data-magnetic]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.75)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.75)' });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength * 0.8);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/** Alone che segue il puntatore dentro le card in vetro. */
export function initCardGlow() {
  $$('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });
}
