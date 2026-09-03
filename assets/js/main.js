/* ============================================================
   INTERAZIONI, SCROLL E MOTION
   ============================================================ */

(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TOUCH = window.matchMedia('(hover: none)').matches;
  var SCENE = window.APEX_SCENE || {};
  var hasGsap = typeof gsap !== 'undefined';

  if (hasGsap && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  /* ==========================================================
     1. DATI DEL BUSINESS
     Un solo punto di verità: assets/js/config.js
     ========================================================== */
  function applyBusiness() {
    var B = window.BUSINESS;
    if (!B) return;

    var digits = (B.phone || '').replace(/[^\d+]/g, '');
    var waDigits = digits.replace(/^\+/, '');
    var igHandle = (B.instagram || '').replace(/^@/, '');

    var values = {
      name: B.name,
      nameShort: B.nameShort,
      city: B.city,
      phone: B.phone,
      address: B.street ? B.street + ', ' + B.city : B.city,
      ig: B.instagram,
      vat: B.vat
    };

    Object.keys(values).forEach(function (key) {
      if (values[key] == null) return;
      doc.querySelectorAll('[data-biz="' + key + '"]').forEach(function (el) {
        el.textContent = values[key];
      });
    });

    doc.querySelectorAll('[data-biz="phoneLink"]').forEach(function (el) { el.href = 'tel:' + digits; });
    doc.querySelectorAll('[data-biz="waLink"]').forEach(function (el) {
      el.href = 'https://wa.me/' + waDigits + '?text=' +
        encodeURIComponent('Ciao ' + B.name + ', vorrei un preventivo per la mia auto.');
    });
    doc.querySelectorAll('[data-biz="igLink"]').forEach(function (el) {
      el.href = 'https://instagram.com/' + igHandle;
    });

    // Titolo, meta e dati strutturati seguono la configurazione
    doc.title = B.name + ' — Detailing, Ceramic Coating e Wrapping a ' + B.city;
    setMeta('name', 'description',
      'Detailing professionale, ceramic coating, PPF e wrapping a ' + B.city +
      '. Oltre 500 auto trattate, garanzia 5 anni sul coating. Preventivo gratuito in 24 ore.');
    setMeta('property', 'og:title', B.name + ' — La tua auto come il primo giorno');
    setMeta('property', 'og:description',
      'Ceramic coating, detailing, PPF e wrapping a ' + B.city + '. Preventivo gratuito in 24 ore.');

    var canonical = doc.querySelector('link[rel="canonical"]');
    if (canonical && B.domain) canonical.href = B.domain + '/';

    var ld = doc.querySelector('script[type="application/ld+json"]');
    if (ld) {
      try {
        var data = JSON.parse(ld.textContent);
        data.name = B.name;
        data.telephone = digits;
        data.description = 'Studio di car detailing, ceramic coating, pellicola PPF e car wrapping a ' + B.city + '.';
        data.address.streetAddress = B.street;
        data.address.addressLocality = B.city;
        data.areaServed.name = B.city;
        if (B.domain) { data.url = B.domain + '/'; data.image = B.domain + '/og-image.svg'; }
        ld.textContent = JSON.stringify(data, null, 2);
      } catch (e) { /* JSON-LD statico: resta quello nell'HTML */ }
    }

    var mapLink = doc.querySelector('.map__link');
    if (mapLink) {
      mapLink.href = 'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent((B.street || '') + ' ' + B.city);
    }
  }

  function setMeta(attr, key, value) {
    var el = doc.querySelector('meta[' + attr + '="' + key + '"]');
    if (el) el.setAttribute('content', value);
  }

  applyBusiness();
  var yearEl = doc.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ==========================================================
     2. SMOOTH SCROLL (Lenis) + ScrollTrigger
     ========================================================== */
  var lenis = null;
  if (!REDUCED && typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      touchMultiplier: 1.5
    });

    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      requestAnimationFrame(function raf(t) { lenis.raf(t); requestAnimationFrame(raf); });
    }
  }

  function goTo(target) {
    var el = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!el) return;
    var navH = nav ? nav.offsetHeight : 84;
    if (lenis) lenis.scrollTo(el, { offset: -(navH + 12) });
    else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }

  doc.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var el = doc.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      goTo(el);
    });
  });

  /* ==========================================================
     3. PRELOADER — contatore 0→100, poi il tendaggio si apre
     ========================================================== */
  var pre = doc.getElementById('preloader');
  var preCount = doc.getElementById('preCount');
  var preBar = pre && pre.querySelector('.preloader__bar > i');
  var preSub = pre && pre.querySelector('.preloader__sub');
  var preWord = pre && pre.querySelector('.preloader__word');

  function splitWord() {
    if (!preWord) return;
    var text = preWord.textContent.trim();
    preWord.textContent = '';
    text.split('').forEach(function (ch, i) {
      var s = doc.createElement('i');
      s.textContent = ch;
      s.style.transitionDelay = (i * 45) + 'ms';
      s.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
      preWord.appendChild(s);
    });
    requestAnimationFrame(function () {
      preWord.querySelectorAll('i').forEach(function (s) { s.style.transform = 'translateY(0)'; });
    });
  }

  function finishPreloader() {
    body.classList.add('is-ready');
    if (!pre) return;

    if (REDUCED || !hasGsap) {
      pre.style.display = 'none';
      pre.classList.add('is-done');
      startScroll();
      return;
    }

    gsap.timeline({ onComplete: function () { pre.style.display = 'none'; startScroll(); } })
      .to(pre.querySelector('.preloader__inner'), { opacity: 0, duration: .35, ease: 'power2.out' })
      .to(pre.querySelector('.preloader__curtain'), { scaleY: 0, duration: .75, ease: 'expo.inOut' }, '-=.1')
      .set(pre, { autoAlpha: 0 });
  }

  function runPreloader() {
    if (!pre) { body.classList.add('is-ready'); startScroll(); return; }
    body.classList.add('is-locked');
    splitWord();
    if (preSub) {
      preSub.style.transition = 'opacity .7s .35s';
      requestAnimationFrame(function () { preSub.style.opacity = '1'; });
    }

    var n = 0;
    var total = REDUCED ? 200 : 1250;               // max 1,8s come da brief
    var t0 = performance.now();

    (function tick(now) {
      var p = Math.min((now - t0) / total, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      n = Math.round(eased * 100);
      if (preCount) preCount.textContent = n;
      if (preBar) preBar.style.width = (eased * 100) + '%';
      if (p < 1) requestAnimationFrame(tick);
      else { body.classList.remove('is-locked'); finishPreloader(); }
    })(performance.now());
  }

  /* ==========================================================
     4. NAVBAR + MENU MOBILE
     ========================================================== */
  var nav = doc.getElementById('nav');
  var burger = doc.getElementById('burger');
  var menu = doc.getElementById('mobileMenu');
  var menuOpen = false;

  function onScrollNav() {
    var y = window.scrollY || doc.documentElement.scrollTop;
    if (nav) nav.classList.toggle('is-pill', y > 40);
  }
  window.addEventListener('scroll', onScrollNav, { passive: true });
  if (lenis) lenis.on('scroll', onScrollNav);
  onScrollNav();

  function openMenu() {
    if (!menu) return;
    menu.hidden = false;
    menuOpen = true;
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Chiudi il menu');
    body.classList.add('is-locked');
    if (lenis) lenis.stop();
    if (hasGsap) {
      gsap.fromTo(menu.querySelectorAll('a'),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: .6, stagger: .06, ease: 'expo.out' });
    }
  }
  function closeMenu() {
    if (!menu || !menuOpen) return;
    menu.hidden = true;
    menuOpen = false;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Apri il menu');
    body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }
  if (burger) burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeMenu(); closeLightbox(); }
  });

  /* ==========================================================
     5. CURSORE CUSTOM + MAGNETIC BUTTONS
     ========================================================== */
  var cursor = doc.getElementById('cursor');
  var pointerNorm = { x: 0, y: 0 };

  window.addEventListener('pointermove', function (e) {
    pointerNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointerNorm.y = -((e.clientY / window.innerHeight) * 2 - 1);
    if (SCENE.setPointer) SCENE.setPointer(pointerNorm.x, pointerNorm.y);

    if (cursor && !TOUCH) {
      body.classList.add('has-cursor');
      if (hasGsap) gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: .38, ease: 'power3.out' });
      else { cursor.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }
    }
  }, { passive: true });

  if (cursor && !TOUCH && !REDUCED) {
    doc.querySelectorAll('a, button, .shot, .acc summary, [data-tilt]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cursor.classList.add('is-hot'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('is-hot'); });
    });
  }

  if (!TOUCH && !REDUCED && hasGsap) {
    doc.querySelectorAll('.btn--magnetic').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, {
          x: (e.clientX - (r.left + r.width / 2)) * .28,
          y: (e.clientY - (r.top + r.height / 2)) * .38,
          duration: .5, ease: 'power3.out'
        });
      });
      btn.addEventListener('pointerleave', function () {
        gsap.to(btn, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1, .5)' });
      });
    });
  }

  /* ==========================================================
     6. CARD CON TILT
     ========================================================== */
  if (!TOUCH && !REDUCED && hasGsap) {
    doc.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - .5;
        var ny = (e.clientY - r.top) / r.height - .5;
        gsap.to(card, {
          rotateY: nx * 7, rotateX: -ny * 7, duration: .6, ease: 'power2.out',
          transformPerspective: 900
        });
      });
      card.addEventListener('pointerleave', function () {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: .9, ease: 'expo.out' });
      });
    });
  }

  /* ==========================================================
     7. SCROLL: reveal, camera cinematografica, processo, numeri
     ========================================================== */
  function startScroll() {
    if (!hasGsap || typeof ScrollTrigger === 'undefined') {
      doc.querySelectorAll('.reveal-line > span').forEach(function (s) { s.style.transform = 'none'; });
      var cin = doc.getElementById('cinema');
      if (cin) cin.classList.add('is-static');
      countUp(doc.querySelectorAll('[data-count]'));
      return;
    }

    /* Esegue `run` quando l'elemento entra in viewport. Se al momento della
       creazione è GIÀ passato (pagina ricaricata a metà, ancora cliccata durante
       il preloader), ScrollTrigger non chiamerebbe mai onEnter: in quel caso
       eseguiamo subito, altrimenti il contenuto resterebbe invisibile. */
    function whenInView(el, startRatio, run) {
      if (el.getBoundingClientRect().top < window.innerHeight * startRatio) { run(true); return; }
      ScrollTrigger.create({
        trigger: el,
        start: 'top ' + (startRatio * 100) + '%',
        once: true,
        onEnter: function () { run(false); }
      });
    }

    /* --- reveal dei testi sezione per sezione --- */
    doc.querySelectorAll('.section, .finale, .trust').forEach(function (sec) {
      var lines = sec.querySelectorAll('.reveal-line > span');
      if (!lines.length) return;
      gsap.set(lines, { y: REDUCED ? 0 : '105%' });
      whenInView(sec, .78, function (instant) {
        gsap.to(lines, {
          y: 0, duration: (REDUCED || instant) ? .2 : 1.05,
          stagger: instant ? 0 : .075, ease: 'expo.out'
        });
      });
    });

    /* --- reveal generico di card, step e scatti --- */
    if (!REDUCED) {
      [['.services__grid', '.card'], ['.work__grid', '.shot'], ['.stats__grid', '.stat'],
       ['.reviews__rail', '.quote'], ['.faq__list', '.acc'], ['.contact__grid', '.field, .map, .info']]
      .forEach(function (pair) {
        var wrap = doc.querySelector(pair[0]);
        if (!wrap) return;
        var items = wrap.querySelectorAll(pair[1]);
        if (!items.length) return;
        gsap.set(items, { y: 40, opacity: 0 });
        whenInView(wrap, .82, function (instant) {
          gsap.to(items, {
            y: 0, opacity: 1, duration: instant ? .25 : .95,
            stagger: instant ? 0 : .07, ease: 'expo.out'
          });
        });
      });
    }

    /* --- camera 3D agganciata allo scroll --- */
    var stage = doc.getElementById('stage');
    var cinema = doc.getElementById('cinema');

    if (!(SCENE.ok && SCENE.shots) && cinema) cinema.classList.add('is-static');

    if (SCENE.ok && SCENE.shots && cinema && !REDUCED) {
      var shots = SCENE.shots;
      var caps = cinema.querySelectorAll('.cinema__caption');

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: cinema,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.1
        }
      });

      [shots.wheel, shots.headlight, shots.hood].forEach(function (shot, i) {
        tl.to(SCENE.cam, {
          px: shot.px, py: shot.py, pz: shot.pz,
          tx: shot.tx, ty: shot.ty, tz: shot.tz, fov: shot.fov,
          duration: 1, ease: 'power2.inOut'
        }, i)
          .to(SCENE.spin, { speed: shot.spin, duration: .6 }, i)
          .fromTo(caps[i],
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: .32, ease: 'power2.out' }, i + .12)
          .to(caps[i], { opacity: 0, y: -30, duration: .28, ease: 'power2.in' }, i + .72);
      });

      // Uscita: la scena si spegne quando iniziano i contenuti
      gsap.to(stage, {
        opacity: 0, duration: .6, ease: 'none',
        scrollTrigger: {
          trigger: '#prima-dopo', start: 'top 85%', end: 'top 45%', scrub: true,
          onLeave: function () { SCENE.paused = true; },
          onEnterBack: function () { SCENE.paused = false; }
        }
      });

      // Rientro sul CTA finale: l'auto si allontana nel buio
      gsap.timeline({
        scrollTrigger: {
          trigger: '#finale', start: 'top bottom', end: 'bottom bottom', scrub: 1,
          onEnter: function () { SCENE.paused = false; },
          onLeaveBack: function () { SCENE.paused = true; }
        }
      })
        .to(stage, { opacity: 1, duration: .3, ease: 'none' })
        .fromTo(SCENE.cam,
          { px: shots.hood.px, py: shots.hood.py, pz: shots.hood.pz,
            tx: shots.hood.tx, ty: shots.hood.ty, tz: shots.hood.tz, fov: shots.hood.fov },
          { px: shots.away.px, py: shots.away.py, pz: shots.away.pz,
            tx: shots.away.tx, ty: shots.away.ty, tz: shots.away.tz, fov: shots.away.fov,
            duration: 1, ease: 'power1.inOut',
            /* senza questo GSAP applicherebbe subito i valori "from",
               spostando la camera della hero al caricamento */
            immediateRender: false }, 0)
        .to(SCENE.spin, { speed: shots.away.spin, duration: 1 }, 0);
    }

    /* --- PROCESSO: scroll orizzontale bloccato --- */
    var track = doc.getElementById('processTrack');
    var pin = doc.querySelector('.process__pin');
    var bar = doc.getElementById('processBar');

    if (track && pin && !REDUCED && window.innerWidth > 700) {
      var distance = function () {
        return Math.max(0, track.scrollWidth - window.innerWidth + 40);
      };
      gsap.to(track, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: '.process',
          start: 'top top',
          end: function () { return '+=' + (distance() + window.innerHeight * .6); },
          pin: pin,
          scrub: .8,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            if (bar) bar.style.width = (self.progress * 100).toFixed(1) + '%';
          }
        }
      });
    } else if (track) {
      track.style.overflowX = 'auto';
      track.style.paddingRight = 'var(--gutter)';
      if (pin) pin.style.height = 'auto';
    }

    /* --- Numeri animati --- */
    doc.querySelectorAll('[data-count]').forEach(function (el) {
      whenInView(el, .88, function () { countUp([el]); });
    });

    ScrollTrigger.refresh();

    // Il pin del processo aggiunge spazio alla pagina: un link diretto
    // (sito.it/#lavori) va riportato sul bersaglio dopo il refresh.
    if (location.hash) {
      var target = doc.querySelector(location.hash);
      if (target) requestAnimationFrame(function () { goTo(target); });
    }
  }

  function countUp(nodes) {
    Array.prototype.forEach.call(nodes, function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var render = function (v) {
        el.innerHTML = v.toFixed(decimals).replace('.', ',') +
          (suffix ? '<sup>' + suffix + '</sup>' : '');
      };
      if (REDUCED || !hasGsap) { render(target); return; }
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.9, ease: 'power2.out',
        onUpdate: function () { render(obj.v); }
      });
    });
  }

  /* ==========================================================
     8. SLIDER PRIMA / DOPO
     ========================================================== */
  (function beforeAfter() {
    var frame = doc.getElementById('baFrame');
    var after = doc.getElementById('baAfter');
    var handle = doc.getElementById('baHandle');
    var range = doc.getElementById('baRange');
    if (!frame || !after || !handle || !range) return;

    function set(pct) {
      pct = Math.max(0, Math.min(100, pct));
      after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.style.left = pct + '%';
      range.value = pct;
      range.setAttribute('aria-valuetext', 'Dopo visibile al ' + Math.round(pct) + '%');
    }

    var dragging = false;
    function fromEvent(e) {
      var r = frame.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set((x / r.width) * 100);
    }

    frame.addEventListener('pointerdown', function (e) {
      dragging = true;
      frame.setPointerCapture && frame.setPointerCapture(e.pointerId);
      fromEvent(e);
    });
    frame.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    window.addEventListener('pointerup', function () { dragging = false; });
    range.addEventListener('input', function () { set(parseFloat(range.value)); });

    set(50);

    // Piccolo invito: la maniglia si muove da sola al primo ingresso
    if (!REDUCED && hasGsap && typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.create({
        trigger: frame, start: 'top 72%', once: true,
        onEnter: function () {
          var o = { v: 50 };
          gsap.to(o, {
            v: 72, duration: 1.1, ease: 'expo.out', yoyo: true, repeat: 1,
            onUpdate: function () { if (!dragging) set(o.v); }
          });
        }
      });
    }
  })();

  /* ==========================================================
     9. PORTFOLIO — lightbox con transizione FLIP
     ========================================================== */
  var lb = doc.getElementById('lightbox');
  var lbMedia = doc.getElementById('lbMedia');
  var lbTitle = doc.getElementById('lbTitle');
  var lbService = doc.getElementById('lbService');
  var lbClose = doc.getElementById('lbClose');
  var lastFocus = null;

  function openLightbox(btn) {
    if (!lb) return;
    lastFocus = btn;
    lbTitle.textContent = btn.getAttribute('data-title') || '';
    lbService.textContent = btn.getAttribute('data-service') || '';
    lbMedia.className = 'lightbox__media lb-tone-' + (btn.getAttribute('data-tone') || '0');

    lb.hidden = false;
    body.classList.add('is-locked');
    if (lenis) lenis.stop();
    lbClose.focus();

    if (REDUCED || !hasGsap) return;

    var from = btn.getBoundingClientRect();
    var to = lbMedia.getBoundingClientRect();
    gsap.set(lb, { opacity: 0 });
    gsap.to(lb, { opacity: 1, duration: .3, ease: 'power2.out' });
    gsap.fromTo(lbMedia, {
      x: from.left - to.left, y: from.top - to.top,
      scaleX: from.width / to.width, scaleY: from.height / to.height,
      transformOrigin: 'top left'
    }, { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .85, ease: 'expo.out' });
    gsap.fromTo(lb.querySelector('figcaption'),
      { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .6, delay: .18, ease: 'expo.out' });
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    var done = function () {
      lb.hidden = true;
      body.classList.remove('is-locked');
      if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus();
    };
    if (REDUCED || !hasGsap) { done(); return; }
    gsap.to(lb, { opacity: 0, duration: .28, ease: 'power2.in', onComplete: done });
  }

  doc.querySelectorAll('.shot').forEach(function (btn) {
    btn.addEventListener('click', function () { openLightbox(btn); });
  });
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lb) lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });

  /* ==========================================================
     10. RECENSIONI — carosello drag-and-drop
     ========================================================== */
  (function reviewsDrag() {
    var rail = doc.getElementById('reviewsRail');
    if (!rail) return;
    var down = false, startX = 0, startLeft = 0, moved = 0;

    rail.addEventListener('pointerdown', function (e) {
      down = true; moved = 0;
      startX = e.clientX;
      startLeft = rail.scrollLeft;
      rail.classList.add('is-dragging');
    });
    rail.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      moved = Math.abs(dx);
      rail.scrollLeft = startLeft - dx;
      if (moved > 6) e.preventDefault();
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (evt) {
      rail.addEventListener(evt, function () { down = false; rail.classList.remove('is-dragging'); });
    });
  })();

  /* ==========================================================
     11. FAQ — accordion con altezza animata
     ========================================================== */
  doc.querySelectorAll('.acc').forEach(function (acc) {
    var bodyEl = acc.querySelector('.acc__body');
    var summary = acc.querySelector('summary');
    if (!bodyEl || !summary) return;

    if (REDUCED || !hasGsap) return;              // <details> nativo: già accessibile

    bodyEl.style.height = '0px';
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = acc.hasAttribute('open');

      if (isOpen) {
        gsap.to(bodyEl, {
          height: 0, duration: .5, ease: 'expo.inOut',
          onComplete: function () { acc.removeAttribute('open'); }
        });
      } else {
        acc.setAttribute('open', '');
        gsap.fromTo(bodyEl, { height: 0 },
          { height: bodyEl.scrollHeight, duration: .6, ease: 'expo.out',
            onComplete: function () { bodyEl.style.height = 'auto'; } });
      }
    });
  });

  /* ==========================================================
     12. FORM — validazione e conferma animata
     ========================================================== */
  (function form() {
    var f = doc.getElementById('quoteForm');
    if (!f) return;
    var done = doc.getElementById('formDone');

    var messages = {
      fName: 'Scrivi il tuo nome, così sappiamo come chiamarti.',
      fPhone: 'Serve un numero valido per richiamarti.',
      fCar: 'Marca e modello: ci servono per il preventivo.',
      fService: 'Scegli un servizio, o "consigliatemi".'
    };

    function validateField(el) {
      var wrap = el.closest('.field');
      var err = wrap && wrap.querySelector('[data-err]');
      var ok = true;

      if (el.hasAttribute('required') && !el.value.trim()) ok = false;
      if (ok && el.id === 'fPhone') ok = /^[+\d][\d\s().\-]{6,}$/.test(el.value.trim());

      if (wrap) wrap.classList.toggle('is-bad', !ok);
      if (err) err.textContent = ok ? '' : (messages[el.id] || 'Campo non valido.');
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }

    f.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('blur', function () { if (el.value.trim()) validateField(el); });
      el.addEventListener('input', function () {
        var wrap = el.closest('.field');
        if (wrap && wrap.classList.contains('is-bad')) validateField(el);
      });
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = f.querySelectorAll('[required]');
      var allOk = true;
      var firstBad = null;
      fields.forEach(function (el) {
        if (!validateField(el)) { allOk = false; if (!firstBad) firstBad = el; }
      });

      if (!allOk) {
        if (hasGsap) gsap.fromTo(firstBad.closest('.field'),
          { x: -7 }, { x: 0, duration: .5, ease: 'elastic.out(1, .35)' });
        firstBad.focus();
        return;
      }

      /* Nessun backend in questa build statica: la richiesta viene
         consegnata su WhatsApp, che è il canale che questi clienti
         usano davvero. Per un invio via email basta sostituire
         questo blocco con un fetch verso il tuo endpoint. */
      var B = window.BUSINESS || {};
      var wa = (B.phone || '').replace(/[^\d]/g, '');
      var text =
        'Richiesta preventivo\n' +
        'Nome: ' + f.nome.value.trim() + '\n' +
        'Telefono: ' + f.telefono.value.trim() + '\n' +
        'Auto: ' + f.auto.value.trim() + '\n' +
        'Servizio: ' + f.servizio.value + '\n' +
        (f.messaggio.value.trim() ? 'Messaggio: ' + f.messaggio.value.trim() : '');

      if (done) {
        done.hidden = false;
        if (hasGsap) gsap.fromTo(done, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: 'expo.out' });
      }
      f.reset();
      f.querySelectorAll('.is-bad').forEach(function (w) { w.classList.remove('is-bad'); });

      if (wa) window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    });
  })();

  /* ==========================================================
     13. AVVIO
     ========================================================== */
  // Il preloader deve partire dalla hero, non da dove il browser
  // aveva lasciato la pagina al refresh precedente.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  if (doc.readyState === 'complete') runPreloader();
  else window.addEventListener('load', runPreloader);

  // Rimisura tutto quando cambia il viewport (barra indirizzi mobile inclusa)
  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (hasGsap && typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }, 220);
  }, { passive: true });
})();
