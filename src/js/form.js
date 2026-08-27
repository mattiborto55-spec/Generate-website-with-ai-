import gsap from 'gsap';
import { $, $$ } from './utils.js';

/**
 * Form contatti: validazione in italiano, stati di errore animati e conferma
 * animata. Non essendoci backend, l'invio è simulato: collega qui il tuo
 * endpoint (fetch POST) o un servizio tipo Formspree.
 */
const RULES = {
  'f-nome': (v) => (v.trim().length >= 2 ? '' : 'Scrivi il tuo nome.'),
  'f-tel': (v) =>
    /^[+\d][\d\s./-]{7,}$/.test(v.trim()) ? '' : 'Serve un numero valido: ti richiamiamo lì.',
  'f-auto': (v) => (v.trim().length >= 2 ? '' : 'Marca e modello, anche approssimativi.'),
  'f-servizio': (v) => (v ? '' : 'Scegli un servizio, o "Non lo so ancora".'),
  'f-privacy': (v) => (v ? '' : 'Serve il consenso per poterti ricontattare.')
};

export function initForm() {
  const form = $('#form');
  if (!form) return;
  const done = $('#form-done');

  const showError = (id, message) => {
    const input = document.getElementById(id);
    const box = $(`[data-error-for="${id}"]`);
    const field = input.closest('.field') || input.closest('.check');
    field?.classList.toggle('is-invalid', !!message);
    if (!box) return;
    box.textContent = message;
    box.classList.toggle('is-on', !!message);
  };

  const valueOf = (id) => {
    const el = document.getElementById(id);
    return el.type === 'checkbox' ? el.checked : el.value;
  };

  const validate = (id) => {
    const message = RULES[id](valueOf(id));
    showError(id, message);
    return !message;
  };

  Object.keys(RULES).forEach((id) => {
    const el = document.getElementById(id);
    el.addEventListener('blur', () => validate(id));
    el.addEventListener('input', () => {
      if (el.closest('.field')?.classList.contains('is-invalid')) validate(id);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const failed = Object.keys(RULES).filter((id) => !validate(id));
    if (failed.length) {
      const first = document.getElementById(failed[0]);
      first.focus({ preventScroll: true });
      gsap.fromTo(
        first.closest('.field') || first.closest('.check'),
        { x: -8 },
        { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' }
      );
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Invio in corso…';

    // Sostituisci questa simulazione con la chiamata al tuo endpoint.
    setTimeout(() => {
      done.hidden = false;
      gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
      gsap.to($$('.field, .check', form), {
        opacity: 0.35,
        duration: 0.6,
        ease: 'power2.out'
      });
      btn.querySelector('span').textContent = 'Richiesta inviata';
      form.reset();
    }, 900);
  });
}
