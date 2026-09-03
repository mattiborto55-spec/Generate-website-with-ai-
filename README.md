# Sito 3D per studio di detailing

Sito one-page in WebGL costruito sulla specifica di [`prompt-freebuff-sito-3d.md`](prompt-freebuff-sito-3d.md).
È lo strumento di vendita: generi il sito con il nome dell'officina già dentro, mandi il link
su WhatsApp e chiami.

Statico puro — nessun build, nessun `npm install`. Apri `index.html` e funziona.

---

## Personalizzarlo per un cliente (60 secondi)

Apri **`assets/js/config.js`** e cambia gli 8 valori:

```js
window.BUSINESS = {
  name:      'Apex Detailing Studio',   // nome completo
  nameShort: 'APEX',                    // logo, preloader, footer gigante (max ~8 caratteri)
  city:      'Milano',                  // titoli, copy e SEO locale
  phone:     '+39 351 234 5678',        // diventa tel: e wa.me/
  street:    'Via della Carrozzeria 18',
  instagram: '@apexdetailing',
  vat:       'IT 09876543210',
  domain:    'https://apexdetailing.it' // canonical + Open Graph
};
```

Da lì si aggiornano da soli: logo, footer, `<title>`, meta description, Open Graph,
i dati strutturati JSON-LD, il link a Google Maps, i pulsanti "Chiama ora" e "WhatsApp",
il messaggio precompilato di WhatsApp e la pagina privacy.

Non serve toccare altro. Prezzi, servizi e testi del portfolio stanno in `index.html`
se vuoi adattarli al listino reale dell'officina.

## Pubblicarlo

Carica la cartella così com'è su qualsiasi hosting statico (Netlify, Vercel, GitHub Pages,
un sottodominio Freebuff). Non c'è nulla da compilare.

Il form contatti non ha backend: alla conferma apre WhatsApp con la richiesta già scritta,
che è il canale con cui questi clienti rispondono davvero. Per l'invio via email sostituisci
il blocco marcato nel punto 12 di `assets/js/main.js` con un `fetch` verso il tuo endpoint.

---

## Cosa c'è dentro

| File | Contenuto |
|---|---|
| `index.html` | Le 13 sezioni della specifica, JSON-LD `AutoDetailing`, Open Graph |
| `assets/css/style.css` | Palette, tipografia, layout, tutte le varianti responsive |
| `assets/js/config.js` | I dati del business — l'unico file da modificare |
| `assets/js/scene.js` | La scena Three.js: carrozzeria, materiali, luci, particelle |
| `assets/js/main.js` | Preloader, scroll, camera cinematografica, interazioni, form |
| `assets/vendor/` | Three.js, GSAP, ScrollTrigger, Lenis serviti in locale |
| `privacy.html` | Informativa, allineata alla stessa configurazione |

### La scena 3D

Non c'è nessun modello da scaricare: la carrozzeria è generata a runtime da un profilo
laterale estruso e smussato, con materiale vernice metallizzata (clearcoat, fiocchi metallici,
riflessi da un HDRI di studio disegnato su canvas). Il *light sweep* che attraversa la vernice
ogni 6 secondi è un'iniezione di shader su `MeshPhysicalMaterial`.

Scendendo, la camera è agganciata allo scroll e orbita su cerchio, faro e cofano mentre
i tre blocchi di testo introducono le lavorazioni. Sul CTA finale l'auto si allontana nel buio.

### Prestazioni e accessibilità

- DPR limitato a 2, particelle e luci ridotte su mobile, antialiasing spento su schermi piccoli
- Il rendering si ferma quando la scena è coperta dai contenuti
- Senza WebGL parte un fallback a gradiente e la sequenza cinematografica diventa
  tre blocchi di testo statici
- Con `prefers-reduced-motion` le animazioni diventano dissolvenze, lo scroll orizzontale
  del processo si apre a griglia e la scena renderizza un solo fotogramma
- Nessuno scroll orizzontale, tap target da 48px, contrasto AA, focus visibile,
  navigazione da tastiera, HTML semantico

### Librerie

Three.js `0.160.0`, GSAP + ScrollTrigger `3.12.5`, Lenis `1.0.42` — copiate in
`assets/vendor/` invece che prese da CDN: se stai facendo vedere il sito al telefono
mentre sei in chiamata, una CDN lenta non ti rovina la demo. I font arrivano da Google
Fonts con fallback di sistema dichiarati.
