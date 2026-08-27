import gsap from 'gsap';
import { $ } from './utils.js';

/**
 * Preloader: le lettere del logo si compongono mentre il contatore sale a 100,
 * poi il sipario nero si apre verso l'alto. Massimo 1,8 secondi — oltre, è
 * tempo rubato all'utente.
 */
export function runPreloader({ reducedMotion = false } = {}) {
  const root = $('#preloader');
  const count = $('#preloader-count');
  const bar = $('#preloader-bar');
  const curtain = $('#preloader-curtain');
  const letters = gsap.utils.toArray('.preloader__letter');

  document.documentElement.classList.add('is-loading');

  return new Promise((resolve) => {
    const finish = () => {
      document.documentElement.classList.remove('is-loading');
      root.remove();
      resolve();
    };

    if (reducedMotion) {
      gsap.to(root, { opacity: 0, duration: 0.4, onComplete: finish });
      return;
    }

    const progress = { value: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: finish });

    tl.to(letters, { opacity: 1, y: 0, duration: 0.75, stagger: 0.045 }, 0)
      .to(
        progress,
        {
          value: 100,
          duration: 1.15,
          ease: 'power2.inOut',
          onUpdate: () => {
            const v = Math.round(progress.value);
            count.textContent = v;
            bar.style.width = `${v}%`;
          }
        },
        0.05
      )
      // il sipario si apre verso l'alto e scopre la hero
      .to(curtain, { scaleY: 0, duration: 0.9, ease: 'expo.inOut' }, 1.15)
      .to('.preloader__inner', { opacity: 0, y: -30, duration: 0.6 }, 1.15)
      .set(root, { pointerEvents: 'none' }, 1.15);
  });
}
