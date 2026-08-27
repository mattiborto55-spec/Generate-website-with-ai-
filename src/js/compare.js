import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { $, clamp } from './utils.js';

/**
 * Slider prima/dopo. Trascinabile col puntatore, col dito e con le frecce
 * (il pulsante è un vero role="slider", quindi funziona da tastiera).
 */
export function initCompare({ reducedMotion = false } = {}) {
  const stage = $('#compare');
  if (!stage) return;

  const clip = $('#compare-clip');
  const handle = $('#compare-handle');
  const grab = $('.compare__grab', stage);

  let value = 50;
  let dragging = false;

  const apply = (v) => {
    value = clamp(v, 2, 98);
    grab.setAttribute('aria-valuenow', Math.round(value));
    clip.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    handle.style.left = `${value}%`;
  };

  const fromEvent = (e) => {
    const r = stage.getBoundingClientRect();
    apply(((e.clientX - r.left) / r.width) * 100);
  };

  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    stage.setPointerCapture?.(e.pointerId);
    fromEvent(e);
  });
  stage.addEventListener('pointermove', (e) => {
    if (dragging) fromEvent(e);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) =>
    stage.addEventListener(type, () => {
      dragging = false;
    })
  );

  grab.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft') apply(value - step);
    else if (e.key === 'ArrowRight') apply(value + step);
    else if (e.key === 'Home') apply(2);
    else if (e.key === 'End') apply(98);
    else return;
    e.preventDefault();
  });

  apply(50);

  // All'ingresso in viewport la maniglia fa un passaggio: dice "sono viva".
  if (!reducedMotion) {
    ScrollTrigger.create({
      trigger: stage,
      start: 'top 70%',
      once: true,
      onEnter: () => {
        const proxy = { v: 88 };
        apply(88);
        gsap.to(proxy, {
          v: 42,
          duration: 1.6,
          ease: 'expo.inOut',
          delay: 0.15,
          onUpdate: () => apply(proxy.v)
        });
      }
    });
  }
}
