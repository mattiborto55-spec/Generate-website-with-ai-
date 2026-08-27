import './styles/main.css';

import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import Draggable from 'gsap/Draggable';
import InertiaPlugin from 'gsap/InertiaPlugin';
import Flip from 'gsap/Flip';
import SplitText from 'gsap/SplitText';
import Lenis from 'lenis';

import { $, $$, prefersReducedMotion } from './js/utils.js';
import { runPreloader } from './js/preloader.js';
import { initNav } from './js/nav.js';
import { initCursor, initMagnetic, initCardGlow } from './js/cursor.js';
import { initReveals, initMarquee } from './js/reveals.js';
import { initCompare } from './js/compare.js';
import { initProcess } from './js/process.js';
import { initWorks } from './js/works.js';
import { initCounters } from './js/counters.js';
import { initReviews } from './js/reviews.js';
import { initFaq } from './js/faq.js';
import { initForm } from './js/form.js';
import { Stage, isWebGLAvailable } from './gl/index.js';

gsap.registerPlugin(ScrollTrigger, Draggable, InertiaPlugin, Flip, SplitText);
gsap.defaults({ ease: 'expo.out', duration: 0.9 });

const reducedMotion = prefersReducedMotion();

/* ------------------------------------------------------------ 1. SCROLL */

let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);
}

// Niente lag smoothing: su un primo frame lento GSAP altrimenti "rallenta" il
// tempo e i reveal restano appesi a metà.
gsap.ticker.lagSmoothing(0);

/* --------------------------------------------------------------- 2. 3D */

let stage = null;
let cardScenes = null;

if (isWebGLAvailable()) {
  try {
    stage = new Stage($('#gl'), { reducedMotion });
  } catch (err) {
    console.warn('[autostop] WebGL non inizializzato:', err);
    document.documentElement.classList.add('no-webgl');
  }
} else {
  document.documentElement.classList.add('no-webgl');
}

if (stage) {
  // Ogni sezione chiama la sua inquadratura: la camera orbita con lo scroll.
  $$('[data-scene]').forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: 'top 65%',
      end: 'bottom 35%',
      onToggle: (self) => {
        if (self.isActive) stage.setShot(section.dataset.scene);
      }
    });
  });

  window.addEventListener(
    'pointermove',
    (e) => stage.setPointer((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1),
    { passive: true }
  );

  // Mini-scene nelle card dei servizi: solo dove c'è potenza per farlo bene.
  const wantsCards = !stage.mobile && !reducedMotion;
  if (wantsCards) {
    import('./gl/cards.js')
      .then(({ CardScenes }) => {
        cardScenes = new CardScenes();
        $$('.card__gl[data-icon]').forEach((el) => cardScenes.add(el, el.dataset.icon));

        // Le mini-scene girano solo mentre la sezione è a schermo. Il trigger
        // passa da ScrollTrigger (già sincronizzato con Lenis) e non da un
        // IntersectionObserver, che con lo smooth scroll può perdere colpi.
        ScrollTrigger.create({
          trigger: '#servizi',
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => cardScenes.setActive(self.isActive)
        });
        ScrollTrigger.refresh();
      })
      .catch(() => {});
  }
}

// Utile per rifinire le inquadrature dal browser: autostop.stage.setShot('gomme')
window.autostop = { get stage() { return stage; }, gsap, ScrollTrigger };

/* --------------------------------------------------- 3. loop unificato */

gsap.ticker.add((time, deltaTime) => {
  lenis?.raf(time * 1000);
  const dt = deltaTime / 1000;
  stage?.update(dt, time);
  cardScenes?.update(dt, time);
});

let resizeTimer;
window.addEventListener('resize', () => {
  stage?.resize();
  cardScenes?.resize();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => ScrollTrigger.refresh(), 220);
});

/* ------------------------------------------------------- 4. interfaccia */

initNav({ lenis });
initCursor();
initMagnetic();
initCardGlow();
initMarquee({ reducedMotion });
initCompare({ reducedMotion });
initProcess({ reducedMotion });
initWorks({ lenis, reducedMotion });
initCounters({ reducedMotion });
initReviews();
initFaq({ reducedMotion });
initForm();

$('#year').textContent = new Date().getFullYear();

/* ------------------------------------------------- 5. entrata in scena */

runPreloader({ reducedMotion }).then(() => {
  // I reveal partono dopo il sipario: la hero si costruisce sotto gli occhi.
  initReveals({ reducedMotion });

  if (stage) {
    gsap.to(stage, { intro: 1, duration: 1.8, ease: 'power2.out' });
  } else {
    document.documentElement.classList.add('no-webgl');
  }

  ScrollTrigger.refresh();
});

// Se i font arrivano dopo il primo layout, le righe spezzate vanno ricalcolate.
document.fonts?.ready.then(() => ScrollTrigger.refresh());
