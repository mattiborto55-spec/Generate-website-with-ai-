import gsap from 'gsap';
import Draggable from 'gsap/Draggable';
import { $, $$, clamp } from './utils.js';

/**
 * Carosello recensioni: trascinabile col mouse e col dito, con inerzia dove
 * disponibile, più due frecce per chi naviga da tastiera.
 */
export function initReviews() {
  const viewport = $('#reviews-viewport');
  const track = $('#reviews-track');
  if (!viewport || !track) return;

  const bounds = () => ({
    minX: Math.min(0, viewport.clientWidth - track.scrollWidth),
    maxX: 0
  });

  const [drag] = Draggable.create(track, {
    type: 'x',
    inertia: true,
    edgeResistance: 0.9,
    dragResistance: 0.06,
    bounds,
    cursor: 'grab',
    activeCursor: 'grabbing',
    allowNativeTouchScrolling: true
  });

  const cards = $$('.review', track);
  let index = 0;

  const goTo = (i) => {
    index = clamp(i, 0, cards.length - 1);
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    const step = cards[0].offsetWidth + gap;
    const x = clamp(-index * step, bounds().minX, 0);
    gsap.to(track, {
      x,
      duration: 0.9,
      ease: 'expo.out',
      onUpdate: () => drag?.update()
    });
  };

  $('#reviews-next')?.addEventListener('click', () => goTo(index + 1));
  $('#reviews-prev')?.addEventListener('click', () => goTo(index - 1));

  window.addEventListener('resize', () => drag?.applyBounds(bounds()));
}
