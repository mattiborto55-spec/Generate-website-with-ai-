import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { $ } from './utils.js';

/**
 * Processo: la sezione si blocca e i quattro step scorrono in orizzontale
 * mentre la pagina scende; la barra di progresso si riempie con lo scroll.
 *
 * Sotto i 720px il pin non si attiva affatto — su mobile è quasi sempre una
 * pessima idea — e il CSS lascia uno scroll orizzontale nativo con snap.
 */
export function initProcess({ reducedMotion = false } = {}) {
  const pin = $('#process-pin');
  const track = $('#process-track');
  const bar = $('#process-bar');
  if (!pin || !track) return;

  if (reducedMotion) {
    bar.style.width = '100%';
    return;
  }

  const mm = gsap.matchMedia();

  mm.add('(min-width: 721px)', () => {
    const distance = () => Math.max(track.scrollWidth - window.innerWidth + 32, 1);

    const st = ScrollTrigger.create({
      trigger: pin,
      start: 'top top',
      end: () => `+=${distance() * 1.15}`,
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      animation: gsap.to(track, { x: () => -distance(), ease: 'none' }),
      onUpdate: (self) => {
        bar.style.width = `${(self.progress * 100).toFixed(2)}%`;
      }
    });

    return () => {
      st.kill();
      gsap.set(track, { x: 0 });
    };
  });

  mm.add('(max-width: 720px)', () => {
    bar.style.width = '100%';
  });
}
