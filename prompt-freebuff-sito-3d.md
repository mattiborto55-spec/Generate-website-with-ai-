# Prompt per Freebuff — Sito web 3D / motion design (2026)

**Business scelto:** studio di *car detailing, ceramic coating, PPF e wrapping* — categoria ad altissimo impatto visivo, ticket medio alto (400–3.000 €), e nella stragrande maggioranza dei casi **senza sito web** (lavorano solo con Instagram e passaparola). È il caso perfetto per una vendita telefonica: gli mostri il sito già pronto con il *suo* nome dentro e la trattativa si chiude da sola.

> **Come usarlo:** copia il blocco "PROMPT DA INCOLLARE" qui sotto dentro Freebuff. Prima di lanciarlo, sostituisci i segnaposto `[NOME OFFICINA]`, `[CITTÀ]`, `[TELEFONO]` con i dati reali del business che stai per chiamare (li trovi su Google Maps / Instagram in 30 secondi). Vedere il proprio nome sul sito moltiplica la percentuale di sì.

---

## PROMPT DA INCOLLARE

```text
Sei un art director e creative developer di livello mondiale, il tipo di studio che vince Awwwards Site of the Day, FWA e CSS Design Awards. Devi progettare e costruire un sito web one-page immersivo, in 3D real-time e con motion design cinematografico, per un business reale. Obiettivo dichiarato: deve essere uno dei siti più belli mai generati, roba da far dire "wow" ad alta voce nei primi 3 secondi. Standard estetico: 2026, non 2020.

=== IL BUSINESS ===
Nome: [NOME OFFICINA] — Detailing & Wrapping Studio
Città: [CITTÀ], Italia
Settore: car detailing professionale, ceramic coating, pellicola protettiva PPF, car wrapping, lucidatura carrozzeria, sanificazione e restyling interni, trattamento cerchi e vetri.
Cliente tipo: proprietari di auto premium e sportive (Porsche, BMW M, Audi RS, Tesla, Mercedes AMG), appassionati, piccoli concessionari, aziende con flotte.
Tono di voce: italiano, professionale, sicuro di sé, un po' "car culture" — mai infantile, mai gergo da agenzia. Frasi corte, forti, concrete.
Obiettivo del sito: far prenotare un preventivo gratuito. Ogni sezione deve spingere verso quel gesto.

=== DIREZIONE ARTISTICA ===
Mood: showroom notturno di lusso. Buio profondo, riflessi liquidi, luce che scorre sulla vernice.
Palette (usa esattamente questa):
- Fondo: nero carbone #0A0A0B con un gradiente radiale appena percettibile verso #141418
- Superfici/vetro: bianco al 4-8% di opacità, con blur
- Accento primario: arancione incandescente #FF5A1F (come metallo caldo)
- Accento secondario: ciano elettrico #22D3EE, usato solo per bordi luminosi e stati hover
- Testo: bianco #F5F5F7 per i titoli, grigio #9A9AA3 per i paragrafi
Tipografia: display in un sans grottesco molto stretto e imponente per i titoli (tipo Anton, Archivo Black o Clash Display), corpo testo in Inter o Satoshi. Titoli enormi: clamp(3rem, 9vw, 9rem), letter-spacing negativo (-0.03em), tutto maiuscolo sui claim.
Griglia: layout asimmetrico, ampio respiro, molto spazio negativo. Niente impaginazione a blocchetti tutti uguali: alterna sezioni full-bleed, split 60/40 e momenti a tutto schermo.
Textures: grana sottile (film grain) su tutto il sito, bagliori volumetrici, riflessi speculari, vetro smerigliato (glassmorphism sobrio, non anni '20).

=== 3D E MOTION (il cuore del progetto) ===
Usa Three.js / React Three Fiber con WebGL. Elementi richiesti:
1. HERO: un'auto sportiva 3D al centro della scena, su piano riflettente scuro, illuminata da tre luci d'area in movimento lento. L'auto ruota lentamente in loop e reagisce al mouse (parallax dolce sull'inclinazione, max 8 gradi). Materiale con vernice metallizzata realistica: clearcoat, riflessi HDRI di un ambiente studio, fiocchi metallici. Se non hai un modello 3D di auto disponibile, sostituisci con un'astrazione altrettanto forte: una superficie liquida metallica che si deforma, o pannelli di carrozzeria fluttuanti con shader di vernice — mai un placeholder banale.
2. SHADER PERSONALIZZATO: una "luce che scorre" (light sweep) che attraversa la carrozzeria ogni 6 secondi, come nelle pubblicità delle auto.
3. SCROLL CINEMATOGRAFICO: la camera 3D è agganciata allo scroll. Scendendo, la camera orbita attorno all'auto e si avvicina ai dettagli — cerchio, faro, cofano — e ogni inquadratura introduce un servizio diverso. Usa GSAP ScrollTrigger + Lenis per lo smooth scroll.
4. PARTICELLE: un sistema leggero di micro-particelle di polvere sospese nella luce, che si allontanano dal cursore.
5. TRANSIZIONI DI SEZIONE: mai un taglio netto. Usa maschere che si aprono, wipe diagonali, testi che salgono da sotto una linea (clip-path reveal), immagini che si scoprono con overlay che scivola.
6. MICRO-INTERAZIONI: cursore custom (un anello che si dilata e diventa "GUARDA" sopra gli elementi cliccabili), magnetic buttons che inseguono il mouse, hover con distorsione sulle immagini, numeri che scattano al conteggio quando entrano in viewport, link con underline che si disegna.
7. PRELOADER: contatore 0→100 con il logo che si compone, poi un tendaggio nero che si apre verso l'alto rivelando la hero. Durata max 1,8 secondi.
Regola d'oro sul motion: easing morbidi (cubic-bezier .16,1,.3,1), durate 0.6–1.2s, tutto deve sembrare pesante e costoso, mai frenetico o "rimbalzante".

=== STRUTTURA DELLE SEZIONI ===
1. Navbar fissa, trasparente, che al primo scroll si contrae in una pill di vetro. Voci: Servizi · Lavori · Processo · Recensioni · Contatti + bottone arancione "PRENOTA UN PREVENTIVO".
2. HERO — Claim gigante: "LA TUA AUTO. COME IL PRIMO GIORNO." Sottotitolo: detailing, ceramic coating e wrapping a [CITTÀ]. Due CTA: "Preventivo gratuito in 24h" (piena) e "Guarda i lavori" (ghost). In basso indicatore di scroll animato.
3. BARRA DI FIDUCIA scorrevole (marquee infinito): marchi trattati, "+500 auto trattate", "Garanzia 5 anni sul coating", "Prodotti certificati", "Preventivo in 24h".
4. SERVIZI — 5 card in vetro con icona 3D o mini-scena WebGL, che si sollevano e si illuminano di ciano all'hover: Ceramic Coating, Detailing Completo, PPF, Wrapping, Restyling Interni. Ogni card: prezzo "a partire da", 3 bullet di cosa include, link "Scopri".
5. PRIMA / DOPO — slider trascinabile a tutta larghezza su una foto di carrozzeria: la maniglia è una linea luminosa arancione. Questa sezione è quella che chiude le vendite: mettila in evidenza.
6. PROCESSO — 4 step in orizzontale con scroll bloccato (horizontal pinned scroll): 01 Analisi e preventivo · 02 Preparazione e decontaminazione · 03 Lavorazione · 04 Consegna e garanzia. Numeri enormi in outline, linea di progresso che si riempie.
7. PORTFOLIO — griglia masonry di 8 lavori, hover con zoom lento e didascalia che sale; click apre un lightbox con transizione fluida (FLIP animation). Ogni scheda: modello auto + servizio eseguito.
8. NUMERI — contatori animati: 500+ auto trattate, 12 anni di esperienza, 4.9★ su Google, 5 anni di garanzia.
9. RECENSIONI — 3 testimonianze reali-style in card di vetro, con stelle, nome e modello auto, in carosello drag-and-drop.
10. FAQ — accordion elegante: quanto dura il coating, quanto tempo resta ferma l'auto, si può lavare normalmente, quanto costa, fate ritiro e consegna.
11. CTA FINALE — sezione full-screen con l'auto 3D che si allontana nel buio e claim: "PRONTO A FARLA TORNARE NUOVA?" + bottone gigante + numero di telefono cliccabile [TELEFONO].
12. CONTATTI — form (nome, telefono, modello auto, servizio desiderato, messaggio) con validazione, stati di focus animati e messaggio di conferma animato. Accanto: mappa in stile scuro, indirizzo, orari, WhatsApp, Instagram.
13. FOOTER — logo enorme in outline a tutta larghezza, link, P.IVA, privacy, credits.
Extra sempre visibili su mobile: barra fissa in basso con "Chiama ora" e "WhatsApp".

=== CONTENUTI ===
Scrivi tutti i testi in italiano, già pronti e persuasivi — niente lorem ipsum, niente "[inserisci qui]". Copy orientato al beneficio: protezione, valore di rivendita, brillantezza, tempo risparmiato. Titoli di massimo 6 parole. Paragrafi di massimo 2 righe. Per le immagini usa foto automotive scure e ad alto contrasto (dettagli di carrozzeria, riflessi, cerchi, schiuma, luci) o, se non disponibili, gradienti e rendering 3D generati — mai foto stock allegre o sfondi bianchi.

=== QUALITÀ TECNICA ===
- Responsive perfetto: su mobile la scena 3D si semplifica (meno particelle, meno luci, DPR limitato a 2), mai scroll orizzontale, tap target da 48px.
- Performance: lazy loading, immagini in WebP, 60fps stabili, degradazione elegante con fallback a immagine/video se WebGL non è supportato, rispetto di prefers-reduced-motion (animazioni sostituite da fade semplici).
- Accessibilità: contrasto AA, focus visibile, alt text, HTML semantico, navigazione da tastiera.
- SEO locale: title e meta description ottimizzati per "detailing [CITTÀ]", "ceramic coating [CITTÀ]", dati strutturati JSON-LD LocalBusiness con indirizzo, orari e recensioni, Open Graph con immagine dedicata.
- Codice pulito, componenti riutilizzabili, variabili CSS per la palette, commenti dove serve.
- Favicon, cursore custom, scrollbar personalizzata, selezione testo in arancione, tema scuro nativo.

=== COSA NON VOGLIO ===
Niente template generico da agenzia, niente Bootstrap, niente card tutte identiche in fila, niente icone piatte colorate, niente sfondi bianchi, niente animazioni che rimbalzano, niente testi in inglese, niente placeholder. Se una scelta è "carina ma già vista", scartala.

Consegna il sito completo, funzionante e pronto alla pubblicazione, con tutte le sezioni sopra realmente implementate e popolate.
```

---

## Versione corta (se Freebuff ha un limite di caratteri)

```text
Crea un sito one-page immersivo in 3D WebGL (Three.js + GSAP ScrollTrigger + Lenis) per "[NOME OFFICINA]", studio di car detailing, ceramic coating, PPF e wrapping a [CITTÀ]. Estetica 2026 da Awwwards Site of the Day: showroom notturno di lusso, fondo #0A0A0B, accento arancione #FF5A1F e ciano #22D3EE, titoli maiuscoli enormi in font grottesco stretto, vetro sfocato, grana sottile, molto spazio negativo.
Hero con auto sportiva 3D su piano riflettente, vernice metallizzata con clearcoat e riflessi HDRI, rotazione lenta, parallax al mouse e light sweep ogni 6 secondi. La camera 3D è legata allo scroll e orbita avvicinandosi ai dettagli dell'auto mentre introduce i servizi. Preloader con contatore 0-100, cursore custom, magnetic buttons, reveal dei testi in clip-path, contatori animati, particelle di polvere reattive al mouse.
Sezioni: navbar in pill di vetro con CTA "Prenota un preventivo"; hero "LA TUA AUTO. COME IL PRIMO GIORNO."; marquee di fiducia; 5 card servizi con prezzi da; slider prima/dopo trascinabile; processo in 4 step con scroll orizzontale bloccato; portfolio masonry con lightbox; numeri animati; recensioni in carosello; FAQ accordion; CTA finale full-screen; form contatti con mappa scura, WhatsApp e orari; footer con logo gigante in outline. Su mobile barra fissa "Chiama ora / WhatsApp".
Tutti i testi in italiano, persuasivi e definitivi, zero lorem ipsum. Immagini automotive scure ad alto contrasto. 60fps, responsive impeccabile, scena 3D semplificata su mobile, fallback senza WebGL, prefers-reduced-motion, contrasto AA, JSON-LD LocalBusiness e SEO locale per "detailing [CITTÀ]". Niente template generico, niente Bootstrap, niente sfondi bianchi, niente placeholder.
```

---

## Note per la telefonata

- Genera il sito **prima** di chiamare, con il nome reale dell'officina già dentro: la frase che apre la porta è *"Le ho già fatto il sito, glielo mando adesso, lo guardi e mi dica se le piace."*
- Manda il link su WhatsApp mentre sei al telefono e resta in linea mentre lo scorre: l'effetto wow arriva sullo scroll, non sulla hero statica.
- Punta sullo slider prima/dopo e sul portfolio: sono le due sezioni che un detailer riconosce come "il suo lavoro fatto bene".
- Se il sito è già online su un sottodominio Freebuff, il passo successivo da vendere è il dominio personalizzato + la scheda Google collegata.
