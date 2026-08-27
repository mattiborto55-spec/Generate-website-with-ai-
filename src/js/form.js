import gsap from 'gsap';
import { $, $$ } from './utils.js';

/**
 * Form contatti: validazione in italiano, stati di errore animati e conferma
 * animata.
 *
 * L'invio ha due modalità, decise dall'attributo `data-endpoint` sul <form>:
 *   • valorizzato → POST JSON verso quell'indirizzo (Formspree, Web3Forms, una
 *     funzione serverless, quello che preferisci);
 *   • vuoto → apre il programma di posta dell'utente con il messaggio già
 *     compilato verso l'indirizzo dell'officina. Non è un invio finto: la mail
 *     parte davvero, solo dal client invece che dal server.
 */
const MAILTO = 'info@autostopmaranello.it';
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
    const label = btn.querySelector('span');
    const data = Object.fromEntries(new FormData(form).entries());
    const endpoint = form.dataset.endpoint?.trim();

    btn.disabled = true;
    label.textContent = 'Invio in corso…';

    const succeed = (message) => {
      done.innerHTML = message;
      done.hidden = false;
      gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' });
      gsap.to($$('.field, .check', form), { opacity: 0.35, duration: 0.6, ease: 'power2.out' });
      label.textContent = 'Richiesta inviata';
      form.reset();
    };

    const fail = (message) => {
      done.innerHTML = message;
      done.hidden = false;
      done.classList.add('is-error');
      gsap.fromTo(done, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' });
      btn.disabled = false;
      label.textContent = 'Riprova';
    };

    if (endpoint) {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      })
        .then((res) => {
          if (!res.ok) throw new Error(res.status);
          succeed('<b>Richiesta inviata.</b> Ti richiamiamo al numero che ci hai lasciato.');
        })
        .catch(() =>
          fail(
            `<b>Invio non riuscito.</b> Chiama lo <a href="tel:+390536944190">0536 944190</a> o scrivi a <a href="mailto:${MAILTO}">${MAILTO}</a>.`
          )
        );
      return;
    }

    // Senza endpoint: il messaggio viene composto e passato al client di posta.
    const body = [
      `Nome: ${data.nome || ''}`,
      `Telefono: ${data.telefono || ''}`,
      `Auto: ${data.auto || ''}`,
      `Servizio: ${data.servizio || ''}`,
      '',
      data.messaggio || '(nessun messaggio)',
      '',
      '— Richiesta inviata dal sito di Autofficina Autostop'
    ].join('\n');

    const href = `mailto:${MAILTO}?subject=${encodeURIComponent(
      `Richiesta dal sito — ${data.servizio || 'informazioni'}`
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = href;
    succeed(
      '<b>Richiesta pronta.</b> Si è aperto il tuo programma di posta con il messaggio già scritto: controlla e premi invia.'
    );
  });
}
