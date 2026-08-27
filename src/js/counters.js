import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { $$, formatNumber } from './utils.js';

/** Numeri che scattano quando entrano in viewport. Una volta sola. */
export function initCounters({ reducedMotion = false } = {}) {
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';

    if (reducedMotion) {
      el.textContent = formatNumber(end, decimals) + suffix;
      return;
    }

    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: 'expo.out',
          onUpdate: () => {
            el.textContent = formatNumber(obj.v, decimals) + suffix;
          }
        })
    });
  });
}
