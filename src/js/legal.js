import gsap from 'gsap';
import { $$ } from './utils.js';

/**
 * Pannelli legali (privacy e cookie) come <dialog> modali: il browser ci mette
 * gratis la trappola del focus, la chiusura con Esc e lo sfondo inerte. Qui
 * aggiungiamo solo l'animazione, il blocco dello scroll di Lenis e il
 * collegamento con l'hash, così un link condiviso apre già il pannello giusto.
 */
export function initLegal({ lenis, reducedMotion = false } = {}) {
  const panels = new Map();
  $$('dialog.legal').forEach((el) => panels.set(el.id, el));
  if (!panels.size) return;

  let current = null;

  const open = (id) => {
    const el = panels.get(id);
    if (!el || el.open) return;
    current = el;
    el.showModal();
    lenis?.stop();
    document.body.classList.add('has-legal');
    // Dietro un pannello opaco la scena 3D non si vede: fermarla restituisce
    // frame al browser proprio mentre l'utente sta leggendo.
    document.dispatchEvent(new CustomEvent('ui:overlay', { detail: { open: true } }));
    if (history.replaceState) history.replaceState(null, '', `#${id}`);

    if (reducedMotion) {
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      return;
    }
    gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    gsap.fromTo(
      el.querySelector('.legal__panel'),
      { y: 40, clipPath: 'inset(0% 0% 100% 0%)' },
      { y: 0, clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.out' }
    );
  };

  const close = (el = current) => {
    if (!el?.open) return;
    const finish = () => {
      el.close();
      el.style.opacity = '';
      if (current === el) current = null;
      document.body.classList.remove('has-legal');
      document.dispatchEvent(new CustomEvent('ui:overlay', { detail: { open: false } }));
      lenis?.start();
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
    };
    if (reducedMotion) return finish();
    gsap.to(el, { opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: finish });
  };

  // Apertura dai link: restano <a href="#privacy"> così senza JavaScript il
  // pannello è comunque raggiungibile (:target in sections.css).
  $$('[data-legal]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // dentro la <label> del consenso: non spuntare la casella
      open(link.dataset.legal);
    });
  });

  panels.forEach((el) => {
    el.querySelector('.legal__close')?.addEventListener('click', (e) => {
      e.preventDefault();
      close(el);
    });
    // Click sullo sfondo: il <dialog> riceve l'evento solo fuori dal pannello.
    el.addEventListener('click', (e) => {
      if (e.target === el) close(el);
    });
    // Esc: intercettiamo per animare l'uscita invece di far sparire tutto.
    el.addEventListener('cancel', (e) => {
      e.preventDefault();
      close(el);
    });
  });

  // Link condiviso o ricaricato con l'hash già puntato al pannello.
  const fromHash = () => {
    const id = location.hash.slice(1);
    if (panels.has(id)) open(id);
  };
  fromHash();
  window.addEventListener('hashchange', fromHash);
}
