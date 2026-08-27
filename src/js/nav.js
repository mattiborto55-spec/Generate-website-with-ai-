import ScrollTrigger from 'gsap/ScrollTrigger';
import { $, $$ } from './utils.js';

/**
 * Navbar: trasparente in cima, si contrae in una pill di vetro al primo
 * scroll. Gestisce anche il drawer mobile e la voce attiva.
 */
export function initNav({ lenis } = {}) {
  const nav = $('#nav');
  const burger = $('#nav-burger');
  const drawer = $('#nav-drawer');

  ScrollTrigger.create({
    start: 'top -60',
    end: 99999,
    onUpdate: (self) => nav.classList.toggle('is-pill', self.scroll() > 60),
    onToggle: (self) => nav.classList.toggle('is-pill', self.isActive)
  });

  /* --- drawer mobile ------------------------------------------------- */
  const setDrawer = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    if (open) {
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add('is-open'));
      lenis?.stop();
    } else {
      drawer.classList.remove('is-open');
      lenis?.start();
      setTimeout(() => {
        if (burger.getAttribute('aria-expanded') === 'false') drawer.hidden = true;
      }, 700);
    }
  };

  burger.addEventListener('click', () => setDrawer(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setDrawer(false);
  });

  /* --- scroll morbido sulle ancore ----------------------------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      setDrawer(false);
      if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* --- voce attiva ---------------------------------------------------- */
  const links = $$('.nav__links a[data-nav-link]');
  links.forEach((link) => {
    const section = document.querySelector(link.getAttribute('href'));
    if (!section) return;
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => link.classList.toggle('is-current', self.isActive)
    });
  });
}
