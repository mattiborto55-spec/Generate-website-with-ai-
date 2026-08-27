import gsap from 'gsap';
import { $$ } from './utils.js';

/**
 * Accordion: <details> nativo (accessibile, funziona senza JS) con l'apertura
 * animata a mano, perché l'altezza automatica non è animabile in modo pulito.
 * Una risposta alla volta.
 */
export function initFaq({ reducedMotion = false } = {}) {
  const items = $$('.faq__item');

  items.forEach((item) => {
    const summary = item.querySelector('summary');
    const panel = item.querySelector('.faq__answer');

    gsap.set(panel, { height: item.open ? 'auto' : 0 });

    summary.addEventListener('click', (e) => {
      e.preventDefault();
      const willOpen = !item.open;

      // chiudiamo le altre
      items.forEach((other) => {
        if (other !== item && other.open) {
          const p = other.querySelector('.faq__answer');
          gsap.to(p, {
            height: 0,
            duration: reducedMotion ? 0.15 : 0.55,
            ease: 'expo.inOut',
            onComplete: () => {
              other.open = false;
            }
          });
        }
      });

      if (willOpen) {
        item.open = true;
        gsap.fromTo(
          panel,
          { height: 0 },
          { height: 'auto', duration: reducedMotion ? 0.15 : 0.65, ease: 'expo.out' }
        );
      } else {
        gsap.to(panel, {
          height: 0,
          duration: reducedMotion ? 0.15 : 0.5,
          ease: 'expo.inOut',
          onComplete: () => {
            item.open = false;
          }
        });
      }
    });
  });
}
