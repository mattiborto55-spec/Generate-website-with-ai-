# Motion dal Telefono

Roadmap per costruire e vendere siti web animati ad alto impatto visivo
usando **solo uno smartphone Android** e **zero euro di budget**.

---

## 0. Calibrazione (leggi questo o esegui il piano sbagliato)

Tre correzioni alle premesse. Non tolgono niente al piano: lo rendono eseguibile.

1. **"Cifre altissime" al mese 1 non esistono, ma la scala è più ripida di quanto pensi.**
   Sequenza reale: sito #1–2 **gratis** (ti servono le prove), sito #3–5 a **€250–400**,
   dal sito #6 in poi **€600–1.200**. Chi salta i primi due gradini non incassa niente,
   perché sta vendendo senza mostrare nulla.

2. **Budget zero è vero al 100% per te — non per il cliente, ed è normale.**
   Strumenti, editor e hosting gratuiti esistono davvero e bastano per lavoro professionale.
   Ma il **dominio lo compra il cliente** (€10–30/anno, con la sua carta, intestato a lui).
   Nessuna agenzia al mondo regala i domini. Non è una crepa nel vincolo: è come funziona.
   E ti conviene — un dominio intestato al cliente ti toglie ogni responsabilità di rinnovo.

3. **Un sito animato che lagga vale meno di uno statico.**
   Il pubblico dei tuoi clienti è su Android di fascia media in 4G. Se il tuo hero fa 22fps,
   hai consegnato un danno. La performance non è un dettaglio tecnico: **è il prodotto.**

Il vantaggio che hai davvero non è "sono giovane". È che puoi consegnare in 5 giorni quello
per cui un'agenzia chiede 6 settimane e €4.000, perché non hai riunioni, non hai preventivi
da approvare e non hai un project manager.

---

## 1. La Android Design Stack 2026

Quattro livelli. Non installare tutto oggi: installa il livello 1 e 2, il resto quando serve.

### Livello 1 — Dove nasce il sito (AI / no-code, da browser Android)

| Strumento | Perché |
|---|---|
| **Lovable** | Prompt → sito React + Tailwind funzionante, preview live e deploy incluso. Piano gratuito. Funziona da browser mobile. È il modo più veloce di avere uno scheletro serio in 10 minuti. |
| **Replit** | App Android nativa, agente AI, hosting incluso. Piano gratuito. Il migliore se vuoi mettere le mani nel codice dal telefono. |
| **v0 (Vercel)** | Genera singole sezioni animate di alta qualità. Usalo per i pezzi, non per il sito intero. |

> Regola: l'AI ti dà lo **scheletro**, mai il risultato finale. Il sito che spacca nasce nei
> 40 minuti in cui aggiungi il motion a mano. Chi consegna l'output grezzo dell'AI si fa
> pagare €80 e non torna nessuno.

### Livello 2 — Dove lo rendi "hit 2026" (codice, dal telefono)

| Strumento | Perché |
|---|---|
| **Spck Editor** (Android, gratis) | Il vero unlock. Editor di codice con **Git integrato** e **preview live** sul telefono. Cloni il repo, modifichi, vedi il risultato, fai push. Tutto con le dita. |
| **Acode** + **Termux** (gratis) | Se vuoi `git`, `node` e npm veri su Android. Curva più ripida, potenza molto maggiore. |
| **GitHub mobile** + `github.dev` | Per modifiche rapide e per gestire i repo. Da browser, apri un repo e sostituisci `github.com` con `github.dev`. |

### Livello 3 — Le librerie che creano l'effetto

| Libreria | Peso | Cosa fa |
|---|---|---|
| **GSAP + ScrollTrigger** | ~50KB | Il motore. **Oggi è gratuito al 100%, plugin inclusi** (SplitText, ScrollSmoother): è il singolo fatto più sfruttabile del 2026, perché fino a ieri costava centinaia di euro l'anno. |
| **Lenis** | ~3KB | Smooth scroll con inerzia. Da solo cambia la percezione del sito. |
| **CSS scroll-driven animations** (`animation-timeline: view()`) | 0KB | Nativo. Reveal su scroll senza una riga di JS. |
| **View Transitions API** | 0KB | Transizioni morbide fra pagine, native. Fa sembrare il sito un'app. |
| **Three.js** | ~150KB | Solo se il progetto lo richiede davvero. Pesante: usalo con criterio. |

### Livello 4 — Asset, colore, hosting

- **Grafica:** Canva (mockup, poster), Coolors (palette), Google Fonts (typography), Lucide (icone), Pexels/Unsplash (video e foto).
- **Riferimenti:** Awwwards, Godly, Land-book — salva 20 sezioni che ti piacciono in una board. Sarà la tua libreria mentale.
- **Hosting gratuito, per sempre:** Cloudflare Pages, Netlify, Vercel, GitHub Pages. Tutti danno HTTPS e un sottodominio gratis (`nome.pages.dev`). Per un cliente pagante colleghi poi il **suo** dominio: cinque minuti di lavoro.

### Le 5 da installare oggi

`Spck Editor` · `Chrome` (per Lovable, v0, Cloudflare) · `GitHub` · `Canva` · `CapCut` (ti serve per i video di vendita, vedi parte 4).

---

## 2. Il flusso di lavoro mobile

Otto passi. Dal telefono, senza toccare un PC. Tempo per il primo sito: 4–6 ore. A regime: 2.

**1 · Riferimento (15 min).** Prima di aprire qualsiasi strumento, scegli 3 sezioni da
Awwwards o Godly che vuoi *emulare come struttura*. Screenshot, cartella. Non si progetta
dal nulla: si ricombina.

**2 · Brief in 5 righe.** Chi è il brand, cosa vende, a chi, che sensazione deve dare,
qual è l'unica azione che l'utente deve compiere. Se non stai in 5 righe, non hai capito
il progetto.

**3 · Scheletro con l'AI (20 min).** Apri Lovable e usa un prompt strutturato — questo,
riempito:

```
Costruisci una landing one-page per [BRAND], settore [X].
Stack: HTML + Tailwind + GSAP. Niente framework pesanti.
Struttura: hero full-bleed / 3 sezioni prodotto / gallery a griglia / CTA finale.
Direzione visiva: [2 aggettivi] · palette [3 hex] · display [font] su body [font].
Motion: titolo che si rivela lettera per lettera, sezioni che entrano su scroll
con ScrollTrigger (solo transform e opacity), smooth scroll con Lenis.
Vincoli: mobile-first a 390px, LCP sotto 2,5s, rispetta prefers-reduced-motion,
nessuna immagine oltre 200KB.
```

Un prompt vago produce il sito generico che fanno tutti. Un prompt con vincoli produce
qualcosa di consegnabile.

**4 · Porta il codice su GitHub.** Da Lovable o Replit esporti/colleghi il repo. Ora il
progetto è tuo, versionato, e non dipende più da nessuna piattaforma.

**5 · Il motion a mano (40 min) — è qui che nasce il valore.** Apri il repo in Spck Editor
e aggiungi i quattro effetti firma (sotto). Preview live sul telefono a ogni salvataggio.

**6 · Deploy (5 min).** Collega il repo a Cloudflare Pages. Da qui in poi ogni push
ripubblica il sito da solo. Hai un URL HTTPS pubblico, gratis, per sempre.

**7 · Il test che nessuno fa.** Apri PageSpeed Insights dal telefono e incolla l'URL.
Sotto 80 in mobile, non consegni: torni al punto 5 e alleggerisci. Poi guarda il sito
sul tuo Android in 4G, non in wifi.

**8 · Consegna.** Screen recording verticale di 15 secondi dello scroll completo. Quello
è il tuo prodotto commerciale — più del sito stesso.

### I quattro effetti firma "hit 2026"

1. **Reveal su scroll nativo.** `animation-timeline: view()` in CSS puro: le sezioni entrano
   mentre scorri, zero JavaScript, zero peso.
2. **Type reveal lettera per lettera.** GSAP SplitText sul titolo dell'hero. Tre righe di
   codice, ed è l'effetto che fa dire "chi l'ha fatto?".
3. **Smooth scroll con inerzia.** Lenis, 3KB. È il 20% di lavoro che dà l'80% della
   sensazione "sito costoso".
4. **Uno — e uno solo — sfondo generativo.** Gradiente animato su canvas o shader leggero
   dietro l'hero. **Mai due elementi generativi nella stessa pagina**: raddoppi il carico
   e dimezzi l'effetto.

Bonus: **View Transitions API** fra le pagine. Nativa, gratis, e fa sembrare il sito un'app.

### Le cinque regole dei 60fps

- Anima **solo `transform` e `opacity`**. Mai `width`, `height`, `top`, `left`: forzano
  il ricalcolo del layout a ogni frame ed è la causa numero uno dei siti che scattano.
- `will-change` solo sull'elemento che si sta muovendo, e rimuovilo quando ha finito.
- Video nell'hero: massimo 2MB, con `poster`, `muted` e `playsinline`.
- `prefers-reduced-motion`: riduci tutto a una dissolvenza. Non è opzionale — per alcune
  persone le animazioni aggressive causano nausea reale.
- Testa su un Android vero in rete mobile. L'emulatore mente sempre.

---

## 3. Strategia Money & Fame a costo zero

### Chi paga davvero

Cerca chi ha **già dimostrato di spendere in immagine**: streetwear e brand di abbigliamento
locali, rapper emergenti (landing per l'uscita di un singolo — hanno una scadenza, e la
scadenza fa firmare), studi di tatuaggi e barber shop di fascia alta, fotografi e videomaker,
palestre boutique, ristoranti in apertura, startup pre-seed.

Chi **non** paga: chi non ha mai speso un euro in marketing. Non convincerlo, non è il tuo
lavoro e non è il tuo cliente.

### Il metodo "esca visiva"

Non chiedere. **Costruisci prima.** Scegli un brand, fai il sito senza dire niente a nessuno,
poi manda un video di 15 secondi dello scroll. Non stai chiedendo un'opportunità: stai
consegnando un regalo. È una posizione completamente diversa.

Il messaggio, testato, in quattro righe:

> Ciao [nome], ho fatto una cosa per voi senza chiedere il permesso.
> Ho ricostruito la vostra pagina come sito animato — 15 secondi, guarda: [link]
> È vostro, gratis, anche se non ne facciamo niente.
> Se vi piace, in 5 giorni lo metto online sul vostro dominio. — [nome], 15 anni, fatto dal telefono.

Perché funziona: c'è già il lavoro (non una promessa), c'è un video (non un testo),
c'è zero rischio per loro, e la firma finale è impossibile da ignorare.

**Follow-up:** tre tocchi e basta. Giorno 3 ("ci hai dato un'occhiata?"), giorno 8
(mandi un secondo effetto aggiunto), giorno 20 (chiudi con eleganza). Al quarto messaggio
diventi il ragazzino insistente e bruci il brand.

**Volume:** 10 contatti al giorno. Con 3 siti-esca ben fatti in rotazione, un tasso di
risposta del 15–25% è normale. Se stai sotto il 10%, il problema è il video, non il mercato.

### La scala dei prezzi

| Fase | Prezzo | Cosa includi |
|---|---|---|
| Siti #1–2 | **Gratis** | In cambio di due cose scritte: il permesso di pubblicarlo nel portfolio e una **testimonianza in video** di 20 secondi. Senza questi due, non è gratis: è regalato. |
| Siti #3–5 | **€250–400** | One-page animata, 5 giorni di consegna, 2 giri di revisioni. Punto. |
| Dal #6 | **€600–1.200** | Motion su misura, più sezioni, micro-interazioni, ottimizzazione performance certificata. |
| Ricorrente | **€49–99/mese** | Aggiornamenti, nuove sezioni, monitoraggio. **Cinque clienti a canone valgono più di venti siti una tantum**, perché non devi ricominciare da zero ogni mese. |

Due condizioni non negoziabili: **50% all'inizio**, saldo alla consegna; e **2 giri di
revisioni inclusi**, poi si tariffa. Senza il limite sulle revisioni, il tuo primo cliente
diventa il tuo ultimo.

### La parte legale e l'incasso (60 minuti, con un genitore)

- A 15 anni non puoi intestarti PayPal Business, Stripe o una partita IVA. **Incassi e
  contratto passano da un genitore**, dichiarato apertamente. Il lavoro resta tuo.
- Contratto in una pagina: cosa consegni, in quanti giorni, quante revisioni, quanto costa,
  chi possiede cosa. Bastano 15 righe scritte in Google Docs. Un contratto brutto batte
  qualsiasi accordo a voce.
- Domini e hosting li paga e li intesta **il cliente**. Tu non anticipi mai nulla.
- **Copyright:** per i siti-esca usa i marchi altrui solo come *concept non ufficiale*,
  dichiarato tale nel video e nella pagina. Non spacciarlo mai per un lavoro commissionato,
  non replicare il loro sito esistente pixel per pixel, e usa foto tue o di stock libere.

---

## 4. Lo storytelling virale

### La regola che decide tutto

**Non fare tutorial.** I tutorial attirano altri designer, cioè persone che vogliono
imparare gratis quello che tu vendi. Gli showcase e i risultati attirano **clienti**.
Un video "come si fa questo effetto" ti porta 50.000 designer; un video "il sito che ho
fatto per questo brand" ti porta tre preventivi. Scegli.

### I tre formati che funzionano

**A · Il "before / after" brutale (il tuo pane).**
Split screen: a sinistra il sito attuale del brand, statico e triste. A destra il tuo,
in movimento. Zero parlato, solo la musica e lo scroll. Hook a schermo:
*"Il loro sito. Il sito che gli ho fatto ieri. Dal telefono."*

**B · Il time-lapse della build.**
Screen recording accelerato del telefono mentre costruisci, con un timer a schermo.
Il telefono **sempre in campo**: è la prova, ed è il tuo brand. Chiudi sul risultato
a velocità normale — sempre l'ultimo terzo del video sul prodotto finito, mai sul processo.

**C · La reazione del cliente.**
Il video della testimonianza che hai preteso nei siti gratis. È il formato che converte
di più in assoluto, perché è l'unico che non puoi inventarti.

### Le regole di produzione

- **I primi 3 secondi sono il sito che si muove.** Non la tua faccia, non l'introduzione,
  non "ciao ragazzi". Il movimento, subito.
- **Verticale, 15–25 secondi, sottotitoli sempre.** Il 70% guarda senza audio.
- **Una serie ricorrente batte i video sparsi.** "Rifaccio il sito di un brand locale ogni
  giorno finché uno non mi assume" ha una scadenza e un conflitto: la gente torna a vedere
  come finisce. Un account che pubblica lavori a caso no.
- **Mostra i numeri veri, sempre.** Zero screenshot gonfiati, zero clienti inventati.
  Tutta la tua narrativa poggia sull'essere verificabile: una bugia scoperta azzera in un
  giorno mesi di lavoro — e nel tuo caso i clienti arrivano proprio da chi si fida.
- **L'antagonista è il metodo, non le persone.** "Un'agenzia ci mette 6 settimane, io 5 giorni"
  funziona. "I web designer sono degli incapaci" ti chiude le porte dei professionisti che
  ti manderebbero lavoro.

---

## 5. Roadmap 90 giorni

**Giorni 1–14 · Arsenale e prova.**
Installa le 5 app. Costruisci **tre siti-esca** per brand locali veri, senza dire niente a
nessuno. Pubblicali su Cloudflare Pages. Registra i tre video di scroll. Apri TikTok, IG
e un portfolio (che è a sua volta un tuo sito animato — è il tuo miglior campione).
→ *Obiettivo: 3 siti online, 3 video, 0 euro spesi.*

**Giorni 15–30 · Primo contatto e primo cliente.**
10 DM al giorno con il messaggio "esca visiva". Pubblica un before/after ogni giorno.
Chiudi i primi 1–2 clienti **gratis**, ma solo in cambio di portfolio + testimonianza video.
→ *Obiettivo: 2 lavori reali consegnati, 2 testimonianze in mano.*

**Giorni 31–60 · Primo incasso.**
Ora hai le prove: alza a €250–400 e non trattare. 15 contatti al giorno. Pubblica la
testimonianza — è il video che ti porta il terzo cliente senza che tu faccia niente.
→ *Obiettivo: 2–3 clienti paganti, €500–1.200 incassati.*

**Giorni 61–90 · Da freelance a studio.**
Alza a €600–1.200. Introduci il canone mensile ai clienti esistenti. Standardizza: un
template tuo, riutilizzabile, che ti fa scendere da 6 ore a 2 per sito. Pubblica il
rendiconto pubblico dei 90 giorni con i numeri veri.
→ *Obiettivo: €1.500–4.000 nel trimestre e 2 clienti a canone.*

Se sei sotto: nel 90% dei casi il volume di DM era troppo basso, oppure hai continuato
a consegnare l'output grezzo dell'AI senza aggiungere il motion a mano.

---

## 6. Le sei trappole

- **Consegnare l'output grezzo dell'AI.** È ciò che distingue un lavoro da €800 da uno da €80.
  I 40 minuti di motion a mano *sono* il prodotto.
- **Animare tutto.** Un sito dove si muove ogni elemento è rumore. Il motion serve a guidare
  l'occhio: se guida ovunque, non guida da nessuna parte.
- **Ignorare la performance.** Un hero da 12MB su 4G è un sito che nessuno vedrà mai
  finire di caricare.
- **Revisioni infinite.** Metti il limite nel contratto o lavorerai gratis per mesi.
- **Fare tutorial invece di showcase.** Ti riempie il profilo di colleghi e lo svuota di clienti.
- **Cambiare stile ogni settimana.** Uno stile riconoscibile è ciò per cui ti pagano il doppio.
  Scegli una direzione visiva e restaci per 90 giorni.

E la cosa pratica: tieni la scuola in piedi. Questo piano chiede 2–3 ore al giorno,
non dieci, ed è costruito per capitalizzare su anni.
