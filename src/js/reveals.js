import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import SplitText from 'gsap/SplitText';
import { $$ } from './utils.js';

/**
 * Titoli che salgono da sotto una linea (clip-path reveal) e paragrafi che
 * emergono. Mai un taglio netto: ogni elemento entra da dietro una maschera.
 */
export function initReveals({ reducedMotion = false } = {}) {
  /* --- titoli riga per riga ------------------------------------------- */
  $$('[data-split]').forEach((el) => {
    // Il testo è visibile PRIMA di animarlo: se lo split fallisse, il titolo
    // resterebbe comunque leggibile invece di sparire.
    el.classList.add('is-split');
    gsap.set(el, { opacity: 1 });

    if (reducedMotion) {
      // Fade semplice, creato al momento dell'ingresso: nessun stato iniziale
      // invisibile che possa restare appeso se il trigger non scatta.
      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter: () => gsap.from(el, { opacity: 0, duration: 0.45, ease: 'power1.out' })
      });
      return;
    }

    try {
      // SplitText con maschera per riga: ogni riga ha il suo overflow hidden
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'line__inner',
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 115,
            duration: 1.15,
            ease: 'expo.out',
            stagger: 0.075,
            scrollTrigger: { trigger: el, start: 'top 85%', once: true }
          });
        }
      });
    } catch (err) {
      console.warn('[autostop] split non riuscito, resta il testo semplice:', err);
    }
  });

  /* --- blocchi secondari ---------------------------------------------- */
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (batch) =>
      gsap.from(batch, {
        opacity: 0,
        y: reducedMotion ? 0 : 26,
        duration: reducedMotion ? 0.4 : 1,
        ease: 'expo.out',
        stagger: 0.09,
        clearProps: 'transform'
      })
  });

  /* --- card dei servizi, lavori e recensioni --------------------------- */
  if (!reducedMotion) {
    ScrollTrigger.batch('.services__list > li, .work, .stats__grid li', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.from(batch, {
          opacity: 0,
          y: 44,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.08,
          clearProps: 'transform'
        })
    });
  }
}

/**
 * Marquee infinito. Cloniamo la riga finché non copre due volte lo schermo,
 * poi trasliamo di esattamente una riga: il loop è invisibile.
 */
export function initMarquee({ reducedMotion = false } = {}) {
  $$('[data-marquee]').forEach((track) => {
    const row = track.firstElementChild;
    const width = row.getBoundingClientRect().width;
    if (!width) return;

    const copies = Math.max(2, Math.ceil((window.innerWidth * 2) / width));
    for (let i = 0; i < copies; i++) track.appendChild(row.cloneNode(true));

    if (reducedMotion) return;

    const tween = gsap.to(track, {
      x: -width,
      duration: width / 55,
      ease: 'none',
      repeat: -1
    });

    // Lo scroll accelera il nastro: dà peso al movimento della pagina.
    ScrollTrigger.create({
      trigger: track,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        const v = gsap.utils.clamp(0.6, 3.2, 1 + Math.abs(self.getVelocity()) / 2200);
        gsap.to(tween, { timeScale: v, duration: 0.5, overwrite: true });
      }
    });
  });
}
