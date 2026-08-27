# Autofficina Autostop — sito one-page

Sito immersivo per l'officina **Autofficina Autostop** di Maranello (MO):
scena 3D real-time in WebGL, camera agganciata allo scroll, motion design
cinematografico. Tutto statico, nessun backend richiesto.

I dati dell'attività in pagina sono quelli reali: ragione sociale, indirizzo,
telefono, email, P.IVA, REA, PEC, orari, servizi e recensioni Google. Resta
qualcosa da decidere prima di pubblicare — vedi
[Prima di pubblicare](#prima-di-pubblicare).

---

## Avvio

```bash
npm install
npm run dev       # server di sviluppo su http://localhost:5173
npm run build     # build di produzione in dist/
npm run preview   # anteprima della build
npm run images    # rigenera le illustrazioni in public/img
npm run model:get # scarica un modello 3D di vettura per la hero

npm run build:single   # dist-single/autostop.html: tutto in un file solo
```

`build:single` produce un unico `.html` con dentro CSS, JavaScript, font,
immagini e — se c'è — il modello 3D, tutto in base64 (~3 MB senza modello,
~5,5 MB con): si apre con un doppio clic, si manda per email e si carica
ovunque, senza server né cartelle. Per il sito in produzione si usa
`npm run build`, che tiene gli asset separati e quindi in cache.

La cartella `dist/` è pubblicabile così com'è su qualsiasi hosting statico
(Netlify, Vercel, Cloudflare Pages, un semplice Apache).

---

## Com'è fatto

```
index.html                markup completo, JSON-LD, Open Graph
scripts/gen-images.mjs    generatore delle illustrazioni (SVG -> WebP con sharp)
scripts/get-model.mjs     scarica un modello 3D di vettura
scripts/build-singlefile.mjs   build in un solo file
public/
  img/                    illustrazioni generate + mappa vettoriale + grana
  fonts/                  Anton e Inter self-hostati (latin, latin-ext)
src/
  main.js                 orchestratore: scroll, scena, moduli, preloader
  styles/
    tokens.css            palette, tipografia, spazi, easing
    base.css              reset, fondo, grana, cursore, preloader
    components.css        nav, bottoni, card, marquee, form, dock
    sections.css          le sezioni
  gl/
    index.js              Stage: renderer, camera, inquadrature, loop
    env.js                ambiente studio generato a runtime (PMREM)
    paint.js              vernice metallizzata + fiocchi + light sweep
    car.js                carena parametrica, vetri, fanali, ruote
    model.js              caricamento e adattamento di un modello glTF vero
    stage-props.js        pavimento, riflesso, polvere in sospensione
    cards.js              mini-scene 3D nelle card dei servizi
  js/                     un modulo per comportamento (nav, compare, faq, ...)
```

### La vettura

La scena accetta **due tipi di vettura** e sceglie da sola.

**Un modello glTF/GLB vero**, se trova `public/models/car.glb`. È l'unico modo
per avere parabrezza, montanti, griglie, specchietti e cerchi veri: quello che
distingue un'auto da una scultura. `gl/model.js` lo normalizza — lo orienta,
lo porta alla lunghezza di scena, lo appoggia a terra — e sostituisce i
materiali chiave: la carrozzeria prende la vernice del sito, quindi anche
l'auto importata riceve il light sweep e i fiocchi metallici.

Il modello **non è nel repository**: licenza e marchio della vettura sono una
scelta di chi pubblica, non una dipendenza da trascinarsi dietro.
`npm run model:get` ne scarica uno (la Ferrari 458 degli esempi di three.js,
modello di vicent091036) per vedere subito il risultato. Per usarne un altro
basta sostituire il file. Il decodificatore Draco non serve copiarlo: three ne
porta già uno e il bundler lo include.

**La speed form**, quando il modello non c'è o tarda ad arrivare: la scultura
di stile che gli studi di design fanno prima del modello definitivo. È una
superficie parametrica costruita in `gl/car.js` — sezione a superellisse
modulata dal profilo laterale di una sportiva. Non ha vincoli di licenza e non
lascia mai la hero vuota.

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

Per rifinire un'inquadratura dal browser: `autostop.stage.setShot('gomme')`.

### Modulo dei contatti

L'invio ha due modalità, decise dall'attributo `data-endpoint` sul `<form>`:

- **vuoto** (com'è ora): il pulsante compone la mail — nome, telefono, auto,
  servizio, messaggio — e la apre nel programma di posta dell'utente, già
  indirizzata a `info@autostopmaranello.it`. Non parte nulla verso terzi e non
  serve alcun backend;
- **valorizzato** con l'indirizzo di un servizio di invio (Formspree,
  Web3Forms, una funzione serverless): il modulo fa una `POST` JSON e mostra la
  conferma, o l'errore con telefono ed email come via alternativa.

### Note legali

Privacy e cookie sono due pannelli modali (`<dialog>`) dentro la stessa pagina:
il browser porta con sé trappola del focus, chiusura con Esc e sfondo inerte.
Senza JavaScript i link `#privacy` e `#cookie` li mostrano comunque, via
`:target`. Il testo descrive il sito com'è davvero: nessun cookie, nessun
analytics, nessuna risorsa esterna, niente salvato nel browser. Se un domani
verrà aggiunto uno strumento di misurazione, va aggiornato **prima**.

### Immagini

Niente foto stock: `scripts/gen-images.mjs` disegna ogni immagine in SVG
(battistrada, cerchi, manometro, bombola, curve di potenza) e la rasterizza in
WebP con sharp, in tre livelli — forme nitide, sorgenti luminose sfocate in
`screen`, grana in `overlay`. È deterministico: due build producono gli stessi
file.

Sono **illustrazioni dei servizi, non foto di lavori**: la pagina lo dice
esplicitamente. Appena avete foto vere dell'officina, sostituitele tenendo gli
stessi nomi in `public/img/` — il layout non cambia.

---

## Accessibilità e prestazioni

- `prefers-reduced-motion`: niente smooth scroll, niente split dei titoli,
  scena 3D ferma, animazioni sostituite da dissolvenze.
- Senza WebGL la scena lascia il posto a un fermo immagine con lo stesso velo.
- Mobile: meno poligoni, meno luci, meno particelle, niente bloom né
  post-processing, DPR limitato, nessun pin orizzontale, tap target da 48px.
- Contrasto AA, focus visibile, HTML semantico, `<details>` nativo per le FAQ,
  `<dialog>` nativo per le note legali,
  slider del battistrada pilotabile da tastiera, alt text su tutte le immagini.
- Font self-hostati e precaricati, immagini in WebP con `loading="lazy"`,
  `three` e `gsap` in chunk separati per la cache.

---

## Prima di pubblicare

| Cosa | Dove | Perché |
| --- | --- | --- |
| **Dominio** | `index.html`, blocco commentato nel `<head>`; `public/robots.txt` | canonical, `og:url`, `og:image` assoluto e riga della sitemap: senza dominio restano commentati |
| **Invio del form** | attributo `data-endpoint` sul `<form>` in `index.html` | vuoto = apre il programma di posta verso `info@autostopmaranello.it`; con un endpoint diventa una POST JSON |
| **Testi del processo** | sezione "Come lavoriamo" | sono impegni presi con il cliente (preventivo prima, richiamata se salta fuori altro): rileggeteli e correggeteli dove non corrisponde |
| **Note legali** | pannelli `#privacy` e `#cookie` in `index.html` | il testo c'è ed è aderente a come funziona il sito oggi: va riletto e aggiornato se cambiano strumenti o tempi di conservazione |
| **Foto vere** | `public/img/` | le illustrazioni reggono, ma le foto dell'officina convertono di più |
| **Modello 3D** | `public/models/car.glb` | quello di prova è una vettura di marca: verificane licenza e opportunità |

Valutazione media e recensioni **non** sono nei dati strutturati, ed è voluto:
i rich result di Google non ammettono recensioni raccolte da terze parti, e le
quattro in pagina arrivano da Google. Sono riportate con nome e data, come
sono state scritte.

---

## Licenze

Anton e Inter sono distribuiti con SIL Open Font License 1.1.
Three.js e GSAP sono soggetti alle rispettive licenze (MIT per Three.js,
licenza standard GSAP per l'uso commerciale).
