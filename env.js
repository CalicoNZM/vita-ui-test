(function () {
  window.envState = null;

  function makeSkyTexture() {
    var c = document.createElement('canvas');
    c.width = 2;
    c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#9fd8ff');
    grad.addColorStop(0.55, '#c8ecff');
    grad.addColorStop(0.78, '#e6f7ff');
    grad.addColorStop(1, '#bfe9ff');
    g.fillStyle = grad;
    g.fillRect(0, 0, 2, 512);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  window.makeSkyTexture = makeSkyTexture;

  function makeGlowTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(205,238,255,0.6)');
    grad.addColorStop(1, 'rgba(205,238,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }

  window.makeGlowTexture = makeGlowTexture;

  window.sunPos = new THREE.Vector3(60, 95, -80);

  function buildEnvironment() {
    var sky = new THREE.Mesh(
      new THREE.SphereGeometry(220, 24, 16),
      new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide })
    );
    scene.add(sky);

    var sun = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    sun.position.copy(sunPos);
    scene.add(sun);

    var glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        color: 0xe8f8ff,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    glow.scale.set(70, 70, 1);
    glow.position.copy(sunPos);
    scene.add(glow);

    var ground = new THREE.Mesh(
      new THREE.CircleGeometry(140, 48),
      new THREE.MeshStandardMaterial({ color: 0x8fd0f5, metalness: 0.15, roughness: 0.2 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    var pool = new THREE.Mesh(
      new THREE.CircleGeometry(60, 48),
      new THREE.MeshStandardMaterial({ color: 0x9fdcff, metalness: 0.1, roughness: 0.12, transparent: true, opacity: 0.75 })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.03;
    scene.add(pool);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8fd0ff, 0.95));
    var dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(50, 90, -40);
    scene.add(dl);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    var pmrem = new THREE.PMREMGenerator(renderer);
    (function () {
      var es = new THREE.Scene();
      var dom = new THREE.Mesh(
        new THREE.SphereGeometry(50, 16, 12),
        new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide })
      );
      es.add(dom);
      var sg = new THREE.Mesh(new THREE.CircleGeometry(14, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sg.position.copy(sunPos).normalize().multiplyScalar(44);
      sg.lookAt(0, 0, 0);
      es.add(sg);
      scene.environment = pmrem.fromScene(es, 0.02).texture;
    })();

    var clouds = [];
    (function () {
      var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, roughness: 1, metalness: 0, flatShading: true });
      var puffs = [[0, 0, 0, 1], [1.1, 0.15, 0.3, 0.72], [-1.1, 0.1, -0.2, 0.68], [0.5, 0.28, -0.7, 0.55], [-0.4, 0.3, 0.7, 0.5]];
      for (var c = 0; c < 8; c++) {
        var g = new THREE.Group();
        for (var p = 0; p < puffs.length; p++) {
          var m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), mat);
          m.position.set(puffs[p][0], puffs[p][1], puffs[p][2]);
          m.scale.set(1.4, 0.5, 1.1);
          g.add(m);
        }
        var s = 2.5 + Math.random() * 3.5;
        g.scale.setScalar(s);
        g.position.set((Math.random() - 0.5) * 170, 45 + Math.random() * 45, (Math.random() - 0.5) * 170);
        scene.add(g);
        clouds.push(g);
      }
    })();

    var rays = new THREE.Group();
    (function () {
      var rayMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.045,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      var rayGeo = new THREE.PlaneGeometry(70, 150);
      for (var i = 0; i < 4; i++) {
        var r = new THREE.Mesh(rayGeo, rayMat);
        var off = (i - 1.5) * 26;
        r.position.set(sunPos.x * 0.45 + off * 0.4, sunPos.y * 0.5, sunPos.z * 0.45 + off);
        r.lookAt(new THREE.Vector3(sunPos.x + off * 0.4, sunPos.y, sunPos.z + off));
        rays.add(r);
      }
      scene.add(rays);
    })();

    var bubbles = [];
    var BUB = 16;
    for (var i = 0; i < BUB; i++) {
      var r = 0.8 + Math.random() * 3.2;
      var mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 32, 32),
        new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.55, 0.8),
          transparent: true,
          opacity: 0.22 + Math.random() * 0.16,
          roughness: 0.05,
          metalness: 0.1,
          depthWrite: false
        })
      );
      mesh.position.set((Math.random() - 0.5) * 90, 1.5 + Math.random() * 26, (Math.random() - 0.5) * 90);
      scene.add(mesh);
      var hl = new THREE.Mesh(
        new THREE.SphereGeometry(r * 0.32, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false })
      );
      hl.position.set(r * 0.45, r * 0.42, r * 0.5);
      mesh.add(hl);
      bubbles.push({
        mesh: mesh,
        base: mesh.position.clone(),
        sp: 0.4 + Math.random() * 0.7,
        amp: 0.8 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        dx: (Math.random() - 0.5) * 0.4,
        dz: (Math.random() - 0.5) * 0.4
      });
    }

    var ripples = [];
    function spawnRipple() {
      var mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.5, 32), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      var a = Math.random() * Math.PI * 2;
      var r = Math.random() * 22;
      ring.position.x = Math.cos(a) * r;
      ring.position.z = Math.sin(a) * r;
      scene.add(ring);
      ripples.push({ mesh: ring, t: 0 });
      if (ripples.length > 14) {
        var old = ripples.shift();
        scene.remove(old.mesh);
        old.mesh.material.dispose();
        old.mesh.geometry.dispose();
      }
    }
    for (var rp = 0; rp < 3; rp++) spawnRipple();
    setInterval(spawnRipple, 950);

    var motes = [];
    (function () {
      var moteTex = makeGlowTexture();
      for (var i = 0; i < 18; i++) {
        var sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: moteTex,
            color: 0xd9fff0,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        sp.scale.set(1.6, 1.6, 1);
        sp.position.set((Math.random() - 0.5) * 90, 1.5 + Math.random() * 14, (Math.random() - 0.5) * 90);
        scene.add(sp);
        motes.push({ sp: sp, base: sp.position.clone(), ph: Math.random() * Math.PI * 2, spd: 0.3 + Math.random() * 0.5 });
      }
    })();

    var blades = [];
    (function () {
      var bladeMat = new THREE.MeshStandardMaterial({ color: 0x7fce6b, roughness: 0.85 });
      var bladeGeo = new THREE.ConeGeometry(0.09, 0.55, 4);
      for (var i = 0; i < 90; i++) {
        var m = new THREE.Mesh(bladeGeo, bladeMat);
        var a = Math.random() * Math.PI * 2;
        var r = 36 + Math.random() * 95;
        m.position.set(Math.cos(a) * r, 0.28, Math.sin(a) * r);
        m.rotation.set((Math.random() - 0.5) * 0.35, Math.random() * Math.PI, (Math.random() - 0.5) * 0.35);
        scene.add(m);
        blades.push(m);
      }
    })();

    var weeds = [];
    (function () {
      var wmat = new THREE.MeshStandardMaterial({ color: 0x6fd8a8, transparent: true, opacity: 0.7, roughness: 0.4 });
      var wgeo = new THREE.ConeGeometry(0.16, 1, 5);
      for (var i = 0; i < 14; i++) {
        var m = new THREE.Mesh(wgeo, wmat);
        var a = Math.random() * Math.PI * 2;
        var r = 3 + Math.random() * 24;
        var h = 2 + Math.random() * 2.2;
        m.scale.set(1, h, 1);
        m.position.set(Math.cos(a) * r, h * 0.5, Math.sin(a) * r);
        m.rotation.z = (Math.random() - 0.5) * 0.35;
        scene.add(m);
        weeds.push({ m: m, ph: Math.random() * Math.PI * 2, amp: 0.1 + Math.random() * 0.22, a: a, r: r, baseRot: m.rotation.z });
      }
    })();

    var smallBubbles = [];
    (function () {
      var mat = new THREE.MeshStandardMaterial({
        color: 0xc9f2ff,
        transparent: true,
        opacity: 0.4,
        roughness: 0.05,
        metalness: 0.1,
        depthWrite: false
      });
      for (var i = 0; i < 26; i++) {
        var r = 0.16 + Math.random() * 0.3;
        var m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), mat);
        var a = Math.random() * Math.PI * 2;
        var rr = Math.random() * 40;
        m.position.set(Math.cos(a) * rr, 0.3 + Math.random() * 0.6, Math.sin(a) * rr);
        scene.add(m);
        smallBubbles.push({ mesh: m, speed: 0.6 + Math.random() * 1.1, ph: Math.random() * Math.PI * 2 });
      }
    })();

    envState = {
      clouds: clouds,
      rays: rays,
      bubbles: bubbles,
      ripples: ripples,
      motes: motes,
      blades: blades,
      weeds: weeds,
      smallBubbles: smallBubbles,
      glow: glow,
      pmrem: pmrem
    };
    return envState;
  }

  function updateEnvironment(t, dt) {
    var e = envState;
    for (var c = 0; c < e.clouds.length; c++) {
      var cl = e.clouds[c];
      cl.position.x += dt * 0.7;
      if (cl.position.x > 95) cl.position.x = -95;
    }
    e.rays.rotation.y += dt * 0.015;

    for (var i = 0; i < e.bubbles.length; i++) {
      var b = e.bubbles[i];
      b.mesh.position.y = b.base.y + Math.sin(t * b.sp + b.ph) * b.amp;
      b.mesh.position.x = b.base.x + Math.sin(t * b.dx + b.ph * 1.7) * 6;
      b.mesh.position.z = b.base.z + Math.cos(t * b.dz + b.ph) * 6;
      b.mesh.rotation.y += dt * 0.2;
    }

    for (var rw = e.ripples.length - 1; rw >= 0; rw--) {
      var ri = e.ripples[rw];
      ri.t += dt * 0.55;
      var s = 1 + ri.t * 7;
      ri.mesh.scale.set(s, s, s);
      ri.mesh.material.opacity = 0.55 * (1 - ri.t);
      if (ri.t >= 1) {
        scene.remove(ri.mesh);
        ri.mesh.material.dispose();
        ri.mesh.geometry.dispose();
        e.ripples.splice(rw, 1);
      }
    }

    for (var mo = 0; mo < e.motes.length; mo++) {
      var mt = e.motes[mo];
      mt.sp.position.y = mt.base.y + Math.sin(t * mt.spd + mt.ph) * 1.6;
      mt.sp.position.x = mt.base.x + Math.sin(t * 0.3 + mt.ph * 1.3) * 3;
      mt.sp.material.opacity = 0.35 + Math.sin(t * 1.4 + mt.ph * 2) * 0.22;
    }

    for (var gb = 0; gb < e.blades.length; gb++) {
      var blade = e.blades[gb];
      blade.rotation.z += Math.sin(t * 1.2 + gb) * dt * 0.15;
    }

    for (var wd = 0; wd < e.weeds.length; wd++) {
      var w = e.weeds[wd];
      w.m.rotation.z = w.baseRot + Math.sin(t * 0.9 + w.ph) * w.amp;
      w.m.position.x = Math.cos(w.a) * (w.r + Math.sin(t * 0.7 + w.ph) * 0.6);
    }

    for (var sb = 0; sb < e.smallBubbles.length; sb++) {
      var bub = e.smallBubbles[sb];
      bub.mesh.position.y += bub.speed * dt;
      bub.mesh.position.x += Math.sin(t * 0.8 + bub.ph) * dt * 0.4;
      if (bub.mesh.position.y > 7) {
        var ba = Math.random() * Math.PI * 2;
        var br = Math.random() * 40;
        bub.mesh.position.set(Math.cos(ba) * br, 0.3, Math.sin(ba) * br);
      }
    }

    e.glow.material.opacity = 0.75 + Math.sin(t * 1.1) * 0.15;
  }

  window.buildEnvironment = buildEnvironment;
  window.updateEnvironment = updateEnvironment;
})();