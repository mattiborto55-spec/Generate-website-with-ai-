# CARBONIO — Detailing & Wrapping Studio

Sito one-page immersivo per uno studio di car detailing: scena 3D real-time in
WebGL, camera agganciata allo scroll, motion design cinematografico. Tutto
statico, nessun backend richiesto.

**Attenzione:** nome, indirizzo, telefono, P.IVA, prezzi e recensioni sono
**dati di esempio inventati**. Vanno sostituiti con quelli reali prima di
pubblicare — in particolare `aggregateRating` e `review` nel JSON-LD, che con
recensioni non autentiche violano le linee guida di Google. Vedi
[Cosa sostituire](#cosa-sostituire).

---

## Avvio

```bash
npm install
npm run dev       # server di sviluppo su http://localhost:5173
npm run build     # build di produzione in dist/
npm run preview   # anteprima della build
npm run images    # rigenera gli asset visivi in public/img

npm run build:single   # dist-single/carbonio.html: tutto in un file solo
```

`build:single` produce un unico `.html` da ~3 MB con dentro CSS, JavaScript,
font e immagini in base64: si apre con un doppio clic, si manda per email e si
carica ovunque, senza server né cartelle. Per il sito in produzione si usa
`npm run build`, che tiene gli asset separati e quindi in cache.

La cartella `dist/` è pubblicabile così com'è su qualsiasi hosting statico
(Netlify, Vercel, Cloudflare Pages, un semplice Apache).

---

## Com'è fatto

```
index.html                markup completo, JSON-LD, Open Graph
scripts/gen-images.mjs    generatore degli asset visivi (SVG -> WebP con sharp)
public/
  img/                    immagini generate + mappa vettoriale + grana
  fonts/                  Anton e Inter self-hostati (latin, latin-ext)
src/
  main.js                 orchestratore: scroll, scena, moduli, preloader
  styles/
    tokens.css            palette, tipografia, spazi, easing
    base.css              reset, fondo, grana, cursore, preloader
    components.css        nav, bottoni, card, marquee, form, dock
    sections.css          le tredici sezioni
  gl/
    index.js              Stage: renderer, camera, inquadrature, loop
    env.js                ambiente studio generato a runtime (PMREM)
    paint.js              vernice metallizzata + fiocchi + light sweep
    car.js                carena parametrica, vetri, fanali, ruote
    stage-props.js        pavimento, riflesso, polvere in sospensione
    cards.js              mini-scene 3D nelle card dei servizi
  js/                     un modulo per comportamento (nav, compare, faq, ...)
```

### La scena 3D

Non c'è nessun modello `.glb` da scaricare: la vettura è una **speed form**,
la scultura che gli studi di design usano prima del modello definitivo. È una
superficie parametrica costruita in `gl/car.js` — sezione a superellisse
modulata dal profilo laterale di una sportiva — con proporzioni prese da una
911 reale e riportate in scala. Vetri, firme luminose e passaruota nascono
dalla stessa superficie, quindi combaciano sempre.

Il resto della resa viene da:

- **Ambiente generato a runtime** (`gl/env.js`): una cupola scura e sei
  pannelli luminosi cotti in una envMap con `PMREMGenerator`. Sono i softbox a
  disegnare i riflessi lunghi sulla vernice; senza, il car paint sembra
  plastica.
- **Materiale vernice** (`gl/paint.js`): `MeshPhysicalMaterial` con clearcoat,
  più due innesti via `onBeforeCompile` — fiocchi metallici (perturbazione ad
  alta frequenza della normale) e il *light sweep*, la lama di luce che
  attraversa la carrozzeria ogni 6 secondi.
- **Pavimento a specchio**: un `Reflector` con sopra un velo scuro che apre al
  centro, così il riflesso sfuma con la distanza come sulla resina.
- **Inquadrature** (`SHOTS` in `gl/index.js`): ogni sezione ha la sua posizione
  di camera, apertura, esposizione e scostamento nel piano immagine. La camera
  insegue l'obiettivo con smorzamento esponenziale, quindi il movimento resta
  morbido a qualsiasi framerate.

Per rifinire un'inquadratura dal browser: `carbonio.stage.setShot('ppf')`.

### Immagini

Niente foto stock: `scripts/gen-images.mjs` disegna ogni immagine in SVG
(pannelli di carrozzeria, riflessi, cerchi, fari, schiuma, carbonio) e la
rasterizza in WebP con sharp, in tre livelli — forme nitide, sorgenti luminose
sfocate in `screen`, grana in `overlay`. È deterministico: due build producono
gli stessi file. Sostituendo le foto vere basta tenere gli stessi nomi in
`public/img/`.

---

## Accessibilità e prestazioni

- `prefers-reduced-motion`: niente smooth scroll, niente split dei titoli,
  scena 3D ferma, animazioni sostituite da dissolvenze.
- Senza WebGL la scena lascia il posto a un fermo immagine con lo stesso velo.
- Mobile: meno poligoni, meno luci, meno particelle, niente bloom né
  post-processing, DPR limitato, nessun pin orizzontale, tap target da 48px.
- Contrasto AA, focus visibile, HTML semantico, `<details>` nativo per le FAQ,
  slider prima/dopo pilotabile da tastiera, alt text su tutte le immagini.
- Font self-hostati e precaricati, immagini in WebP con `loading="lazy"`,
  `three` e `gsap` in chunk separati per la cache.

---

## Cosa sostituire

| Dove | Cosa |
| --- | --- |
| `index.html` (JSON-LD, footer, contatti, dock) | nome, indirizzo, telefono, WhatsApp, email, P.IVA, orari, social |
| `index.html` (JSON-LD `aggregateRating` e `review`) | **obbligatorio**: solo recensioni reali, o rimuovere i blocchi |
| `index.html` (`<title>`, meta description, canonical, `og:url`) | dominio e città reali |
| Sezione Servizi e FAQ | prezzi e tempi effettivi |
| `public/img/` | foto reali dei lavori (stessi nomi file) |
| `src/js/form.js` | l'invio è simulato: collega il tuo endpoint o un servizio tipo Formspree |
| `public/img/map.svg` | mappa stilizzata: sostituibile con un embed reale se serve |

---

## Licenze

Anton e Inter sono distribuiti con SIL Open Font License 1.1.
Three.js e GSAP sono soggetti alle rispettive licenze (MIT per Three.js,
licenza standard GSAP per l'uso commerciale).
