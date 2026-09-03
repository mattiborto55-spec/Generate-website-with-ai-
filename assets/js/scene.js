/* ============================================================
   SCENA 3D — showroom notturno
   Nessun modello esterno da scaricare: la carrozzeria è una forma
   scolpita procedurale (profilo estruso e smussato) con materiale
   vernice metallizzata, clearcoat e riflessi da un HDRI generato
   a runtime. Il "light sweep" è un'iniezione di shader.
   ============================================================ */

window.APEX_SCENE = (function () {
  'use strict';

  var api = {
    ok: false,
    cam: { px: 1.20, py: 1.90, pz: 10.6, tx: -1.55, ty: .80, tz: 0, fov: 38 },
    spin: { speed: 1 },
    resize: function () {},
    setPointer: function () {}
  };

  var canvas = document.getElementById('gl');
  if (!canvas || typeof THREE === 'undefined') {
    document.documentElement.classList.add('no-webgl');
    return api;
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.matchMedia('(max-width: 860px), (hover: none)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance'
    });
  } catch (e) {
    document.documentElement.classList.add('no-webgl');
    return api;
  }
  if (!renderer.getContext()) {
    document.documentElement.classList.add('no-webgl');
    return api;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // DPR max 2, anche su mobile
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.052);

  var camera = new THREE.PerspectiveCamera(api.cam.fov, window.innerWidth / window.innerHeight, .1, 120);
  camera.position.set(api.cam.px, api.cam.py, api.cam.pz);

  /* ---------- HDRI di studio generato a runtime ---------- */
  function studioEnvironment() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    var g = c.getContext('2d');

    var sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#23232b');
    sky.addColorStop(.48, '#101014');
    sky.addColorStop(.52, '#08080a');
    sky.addColorStop(1, '#020203');
    g.fillStyle = sky;
    g.fillRect(0, 0, 1024, 512);

    // Tre softbox: le luci d'area che vedi riflesse sulla vernice
    var boxes = [
      { x: 140, y: 96,  w: 300, h: 54, a: .95 },
      { x: 620, y: 70,  w: 250, h: 40, a: .78 },
      { x: 380, y: 190, w: 420, h: 26, a: .45 }
    ];
    boxes.forEach(function (b) {
      var lg = g.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(.5, 'rgba(255,255,255,' + b.a + ')');
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg;
      g.fillRect(b.x, b.y, b.w, b.h);
    });

    // Accenti colore: arancione caldo a sinistra, ciano a destra
    var warm = g.createRadialGradient(90, 250, 0, 90, 250, 220);
    warm.addColorStop(0, 'rgba(255,90,31,.55)');
    warm.addColorStop(1, 'rgba(255,90,31,0)');
    g.fillStyle = warm; g.fillRect(0, 40, 320, 420);

    var cool = g.createRadialGradient(930, 210, 0, 930, 210, 200);
    cool.addColorStop(0, 'rgba(34,211,238,.42)');
    cool.addColorStop(1, 'rgba(34,211,238,0)');
    g.fillStyle = cool; g.fillRect(720, 20, 304, 400);

    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    return env;
  }

  var envMap = studioEnvironment();
  scene.environment = envMap;

  /* ---------- Fiocchi metallici (normal map procedurale) ---------- */
  function flakeMap() {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#8080ff';
    g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 5200; i++) {
      var x = Math.random() * 256, y = Math.random() * 256;
      var r = 40 + Math.random() * 60;
      var gr = Math.random() * 40 + 100;
      g.fillStyle = 'rgb(' + (128 + (Math.random() - .5) * r) + ',' + (128 + (Math.random() - .5) * r) + ',' + (200 + gr * .3) + ')';
      g.fillRect(x, y, 1, 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 26);
    return t;
  }

  /* ---------- Vernice metallizzata + light sweep ---------- */
  var sweep = { x: -6.5, strength: 0 };

  function paintMaterial(color) {
    var m = new THREE.MeshPhysicalMaterial({
      color: color,
      metalness: .90,
      roughness: .20,
      clearcoat: 1,
      clearcoatRoughness: .04,
      envMapIntensity: 1.9,
      normalMap: isMobile ? null : flakeMap(),
      normalScale: new THREE.Vector2(.055, .055)
    });

    m.userData.sweep = {
      uSweepX: { value: sweep.x },
      uSweepStrength: { value: 0 }
    };

    m.onBeforeCompile = function (shader) {
      shader.uniforms.uSweepX = m.userData.sweep.uSweepX;
      shader.uniforms.uSweepStrength = m.userData.sweep.uSweepStrength;

      shader.vertexShader = 'varying vec3 vSweepPos;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vSweepPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );

      shader.fragmentShader =
        'varying vec3 vSweepPos;\nuniform float uSweepX;\nuniform float uSweepStrength;\n' +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          '#include <dithering_fragment>\n' +
          '  float sd = (vSweepPos.x - uSweepX) / 0.42;\n' +
          '  float band = exp(-sd * sd);\n' +
          '  float lift = smoothstep(0.0, 1.4, vSweepPos.y + 0.4);\n' +
          '  gl_FragColor.rgb += band * lift * uSweepStrength * vec3(1.0, 0.72, 0.52);'
        );
    };

    return m;
  }

  /* ---------- Profilo della carrozzeria ---------- */
  function bodyShape() {
    var s = new THREE.Shape();
    s.moveTo(-2.50, 0.30);
    s.lineTo(-2.50, 0.74);
    s.quadraticCurveTo(-2.34, 0.96, -1.98, 1.00);
    s.lineTo(-1.42, 1.02);
    s.bezierCurveTo(-1.10, 1.06, -1.00, 1.30, -0.74, 1.32);
    s.lineTo(0.16, 1.34);
    s.bezierCurveTo(0.58, 1.30, 0.72, 0.98, 1.02, 0.92);
    s.lineTo(1.94, 0.88);
    s.bezierCurveTo(2.32, 0.86, 2.50, 0.66, 2.50, 0.46);
    s.lineTo(2.50, 0.30);
    s.lineTo(-2.50, 0.30);
    return s;
  }

  var car = new THREE.Group();
  var paint = paintMaterial(0x1c1c26);

  var body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(bodyShape(), {
      depth: 1.78,
      bevelEnabled: true,
      bevelThickness: .16,
      bevelSize: .16,
      bevelSegments: isMobile ? 3 : 6,
      curveSegments: isMobile ? 8 : 18
    }),
    paint
  );
  body.geometry.translate(0, 0, -.89);
  car.add(body);

  // Vetri: nero fumé lucido
  var glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x05050a, metalness: .1, roughness: .06, transmission: 0,
    clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 2.1
  });
  var greenhouse = new THREE.Mesh(new THREE.BoxGeometry(1.62, .34, 1.86), glassMat);
  greenhouse.position.set(-.30, 1.20, 0);
  greenhouse.rotation.z = -.035;
  car.add(greenhouse);

  // Ruote: gomma + cerchio metallico + pinza freno arancione
  var rubber = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: .05, roughness: .92 });
  var rimMat = new THREE.MeshPhysicalMaterial({
    color: 0x9aa0a8, metalness: 1, roughness: .18, clearcoat: 1, envMapIntensity: 1.7
  });
  var caliperMat = new THREE.MeshStandardMaterial({
    color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: .55, roughness: .5
  });

  var wheelSeg = isMobile ? 20 : 40;
  [[1.58, 1.02], [1.58, -1.02], [-1.58, 1.02], [-1.58, -1.02]].forEach(function (p) {
    var w = new THREE.Group();
    var tire = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .30, wheelSeg), rubber);
    tire.rotation.x = Math.PI / 2;
    w.add(tire);

    var rim = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .33, wheelSeg), rimMat);
    rim.rotation.x = Math.PI / 2;
    w.add(rim);

    var caliper = new THREE.Mesh(new THREE.TorusGeometry(.20, .035, 6, 18, Math.PI * .8), caliperMat);
    caliper.position.z = p[1] > 0 ? -.02 : .02;
    w.add(caliper);

    w.position.set(p[0], .47, p[1]);
    car.add(w);
  });

  // Faro anteriore e barra luminosa posteriore
  var headMat = new THREE.MeshStandardMaterial({
    color: 0xdff4ff, emissive: 0xbfe9ff, emissiveIntensity: 2.4, roughness: .25
  });
  [.72, -.72].forEach(function (z) {
    var h = new THREE.Mesh(new THREE.BoxGeometry(.10, .10, .46), headMat);
    h.position.set(2.44, .74, z);
    car.add(h);
  });
  var tail = new THREE.Mesh(
    new THREE.BoxGeometry(.06, .07, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xff5a1f, emissive: 0xff5a1f, emissiveIntensity: 2.2, roughness: .4 })
  );
  tail.position.set(-2.52, .86, 0);
  car.add(tail);

  car.position.y = 0;
  scene.add(car);

  /* ---------- Riflesso a specchio sul pavimento ---------- */
  var mirror = car.clone(true);
  mirror.scale.y = -1;
  mirror.traverse(function (o) {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.transparent = true;
    o.material.opacity = .30;
    o.material.depthWrite = false;
    if (o.material.emissiveIntensity) o.material.emissiveIntensity *= .5;
  });
  scene.add(mirror);

  /* ---------- Pavimento riflettente ---------- */
  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(90, 90),
    new THREE.MeshPhysicalMaterial({
      // roughness bassa: i riflessi restano stretti e "liquidi",
      // niente pozze di luce larghe sotto la scena
      color: 0x07070a, metalness: 1, roughness: .17,
      envMapIntensity: .85, transparent: true, opacity: .84
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = .002;
  scene.add(floor);

  // Ombra di contatto finta: mantiene l'auto "appoggiata"
  var contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 128;
  var cg = contactCanvas.getContext('2d');
  var rg = cg.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(0,0,0,.85)');
  rg.addColorStop(.55, 'rgba(0,0,0,.35)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  cg.fillStyle = rg; cg.fillRect(0, 0, 128, 128);
  var contact = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 3.4),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(contactCanvas), transparent: true, opacity: .9, depthWrite: false
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = .012;
  scene.add(contact);

  /* ---------- Luci ---------- */
  scene.add(new THREE.AmbientLight(0xffffff, .16));

  var keyLight = new THREE.SpotLight(0xffffff, 420, 30, .52, .66, 2);
  keyLight.position.set(-5.2, 8.8, 6.4);
  keyLight.target.position.set(0, .7, 0);
  scene.add(keyLight, keyLight.target);

  var rimLight = new THREE.SpotLight(0x22d3ee, 130, 26, .46, .74, 2);
  rimLight.position.set(6.8, 5.4, -6.0);
  rimLight.target.position.set(0, .8, 0);
  scene.add(rimLight, rimLight.target);

  // Riempimento morbido dal lato camera: la carrozzeria non sparisce mai del tutto
  var fill = new THREE.DirectionalLight(0xbcd2e8, .55);
  fill.position.set(3.2, 3.0, 7.5);
  scene.add(fill);

  var warmLight = null;
  if (!isMobile) {
    warmLight = new THREE.PointLight(0xff5a1f, 70, 16, 2);
    warmLight.position.set(4.6, 2.6, 4.6);
    scene.add(warmLight);
  }

  /* ---------- Particelle di polvere ---------- */
  var COUNT = isMobile ? 240 : 900;
  var pPos = new Float32Array(COUNT * 3);
  var pHome = new Float32Array(COUNT * 3);
  for (var i = 0; i < COUNT; i++) {
    var x = (Math.random() - .5) * 22;
    var y = Math.random() * 7.2 + .1;
    var z = (Math.random() - .5) * 16;
    pPos[i * 3] = pHome[i * 3] = x;
    pPos[i * 3 + 1] = pHome[i * 3 + 1] = y;
    pPos[i * 3 + 2] = pHome[i * 3 + 2] = z;
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  var dust = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xd7dde5, size: .035, transparent: true, opacity: .55,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  scene.add(dust);

  /* ---------- Puntatore ---------- */
  var pointer = { x: 0, y: 0 };      // -1..1
  var pointerSmooth = { x: 0, y: 0 };
  var repel = new THREE.Vector3();
  var ray = new THREE.Raycaster();
  var groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  api.setPointer = function (nx, ny) { pointer.x = nx; pointer.y = ny; };

  /* ---------- Resize ---------- */
  api.resize = function () {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', api.resize, { passive: true });

  /* ---------- Loop ---------- */
  var clock = new THREE.Clock();
  var lastSweep = 0;
  var prevT = 0;
  var tmp = new THREE.Vector3();

  function frame() {
    if (api.paused) return;                 // la scena è coperta dai contenuti: non renderizzare
    var t = clock.getElapsedTime();
    var dt = Math.min(Math.max(t - prevT, .001), .05);
    prevT = t;

    // Camera guidata dallo scroll + parallax dolce al mouse (max 8°)
    pointerSmooth.x += (pointer.x - pointerSmooth.x) * .055;
    pointerSmooth.y += (pointer.y - pointerSmooth.y) * .055;

    camera.fov += (api.cam.fov - camera.fov) * .08;
    camera.updateProjectionMatrix();
    camera.position.set(
      api.cam.px + pointerSmooth.x * .55,
      api.cam.py - pointerSmooth.y * .38,
      api.cam.pz
    );
    camera.lookAt(api.cam.tx, api.cam.ty, api.cam.tz);

    // Rotazione lenta in loop + inclinazione reattiva al mouse
    car.rotation.y += .085 * api.spin.speed * dt;
    var tiltMax = 8 * Math.PI / 180;
    car.rotation.z += (-pointerSmooth.y * tiltMax * .55 - car.rotation.z) * .06;
    car.rotation.x += (pointerSmooth.y * tiltMax * .30 - car.rotation.x) * .06;

    mirror.rotation.y = car.rotation.y;
    mirror.rotation.z = -car.rotation.z;
    mirror.rotation.x = -car.rotation.x;

    // Luci d'area in movimento lento
    keyLight.position.x = -5.6 + Math.sin(t * .18) * 2.6;
    keyLight.position.z = 5.2 + Math.cos(t * .14) * 2.0;
    rimLight.position.x = 7.4 + Math.cos(t * .21) * 2.2;
    if (warmLight) warmLight.position.z = 5.4 + Math.sin(t * .26) * 2.4;

    // Light sweep ogni 6 secondi
    if (t - lastSweep > 6) lastSweep = t;
    var sp = (t - lastSweep) / 1.25;                 // 0..1 durante la passata
    if (sp <= 1) {
      paint.userData.sweep.uSweepX.value = -5.2 + sp * 10.4;
      paint.userData.sweep.uSweepStrength.value = Math.sin(sp * Math.PI) * .85;
    } else {
      paint.userData.sweep.uSweepStrength.value = 0;
    }

    // Polvere: deriva lenta e fuga dal cursore
    ray.setFromCamera({ x: pointerSmooth.x, y: pointerSmooth.y }, camera);
    ray.ray.intersectPlane(groundPlane, repel);

    var arr = pGeo.attributes.position.array;
    for (var j = 0; j < COUNT; j++) {
      var k = j * 3;
      arr[k + 1] = pHome[k + 1] + Math.sin(t * .35 + j) * .22;
      arr[k] = pHome[k] + Math.cos(t * .22 + j * .7) * .18;

      tmp.set(arr[k] - repel.x, arr[k + 1] - repel.y, arr[k + 2] - repel.z);
      var d2 = tmp.lengthSq();
      if (d2 < 6.5 && d2 > .0001) {
        var push = (6.5 - d2) / 6.5 * 1.5;
        tmp.normalize();
        arr[k] += tmp.x * push;
        arr[k + 1] += tmp.y * push;
        arr[k + 2] += tmp.z * push;
      }
    }
    pGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }

  api.ok = true;

  if (reduced) {
    // prefers-reduced-motion: una sola immagine, niente loop
    camera.position.set(api.cam.px, api.cam.py, api.cam.pz);
    camera.lookAt(api.cam.tx, api.cam.ty, api.cam.tz);
    car.rotation.y = -.42;
    mirror.rotation.y = car.rotation.y;
    renderer.render(scene, camera);
    api.render = function () { renderer.render(scene, camera); };
  } else {
    renderer.setAnimationLoop(frame);
    api.render = frame;
  }

  // Inquadrature usate dallo scroll cinematografico
  api.shots = {
    hero:      { px: 1.20, py: 1.90, pz: 10.6, tx: -1.55, ty: .80, tz: 0, fov: 38, spin: 1 },
    wheel:     { px: 3.05, py: .62,  pz: 3.15, tx: 1.55, ty: .48, tz: .55, fov: 32, spin: .12 },
    headlight: { px: 4.35, py: 1.02, pz: 1.95, tx: 2.30, ty: .78, tz: .35, fov: 30, spin: .10 },
    hood:      { px: 2.15, py: 2.35, pz: 4.05, tx: .45,  ty: .95, tz: 0,   fov: 36, spin: .18 },
    away:      { px: 0,    py: 1.30, pz: 15.5, tx: 0,    ty: .70, tz: 0,   fov: 40, spin: .55 }
  };

  return api;
})();
