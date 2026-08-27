import gsap from 'gsap';
import Flip from 'gsap/Flip';
import { $, $$ } from './utils.js';

/**
 * Portfolio: hover con zoom lento (CSS) e lightbox con transizione FLIP —
 * l'immagine cliccata vola nella sua posizione ingrandita invece di apparire
 * dal nulla. Nessun taglio netto, mai.
 */
export function initWorks({ lenis, reducedMotion = false } = {}) {
  const lightbox = $('#lightbox');
  const frame = $('#lightbox-frame');
  const title = $('#lightbox-title');
  const sub = $('#lightbox-sub');
  const closeBtn = $('#lightbox-close');
  if (!lightbox) return;

  let openFrom = null; // <img> di partenza
  let placeholder = null;
  let lastFocus = null;

  const open = (btn) => {
    const img = btn.querySelector('img');
    const meta = btn.querySelector('.work__meta');
    title.textContent = meta.querySelector('b').textContent;
    sub.textContent = meta.querySelector('em').textContent;

    lastFocus = document.activeElement;
    openFrom = img;

    const state = Flip.getState(img);

    // Lasciamo un segnaposto per non far collassare la griglia.
    placeholder = document.createElement('div');
    placeholder.style.cssText = `width:100%;aspect-ratio:${img.naturalWidth || 4}/${img.naturalHeight || 3}`;
    img.after(placeholder);

    lightbox.hidden = false;
    frame.prepend(img);
    lightbox.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    lenis?.stop();

    Flip.from(state, {
      duration: reducedMotion ? 0.2 : 0.85,
      ease: 'expo.inOut',
      absolute: false,
      scale: false
    });
    gsap.fromTo(
      lightbox,
      { opacity: 0 },
      { opacity: 1, duration: reducedMotion ? 0.2 : 0.5, ease: 'power2.out' }
    );
    gsap.fromTo(
      '.lightbox__cap',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, delay: 0.2, ease: 'expo.out' }
    );
    closeBtn.focus({ preventScroll: true });
  };

  const close = () => {
    if (!openFrom) return;
    const img = openFrom;
    const state = Flip.getState(img);

    placeholder.replaceWith(img);
    placeholder = null;

    Flip.from(state, {
      duration: reducedMotion ? 0.2 : 0.7,
      ease: 'expo.inOut',
      scale: false,
      onComplete: () => {
        lightbox.hidden = true;
        lightbox.classList.remove('is-open');
      }
    });
    gsap.to(lightbox, { opacity: 0, duration: 0.45, ease: 'power2.in' });

    document.documentElement.style.overflow = '';
    lenis?.start();
    openFrom = null;
    lastFocus?.focus({ preventScroll: true });
  };

  $$('.work__btn').forEach((btn) => btn.addEventListener('click', () => open(btn)));
  closeBtn.addEventListener('click', close);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openFrom) close();
    // trappola del focus: dentro il lightbox c'è un solo controllo
    if (e.key === 'Tab' && openFrom) {
      e.preventDefault();
      closeBtn.focus();
    }
  });
}
