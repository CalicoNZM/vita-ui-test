(function () {
  window.clickables = [];
  window.DORM_Y = 17;
  window.dorm = { active: false, trans: null };

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function makeIconCanvas(kind, color) {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var gr = g.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0.88)');
    gr.addColorStop(1, 'rgba(255,255,255,0.45)');
    roundRect(g, 6, 6, 52, 52, 14);
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 3;
    roundRect(g, 6, 6, 52, 52, 14);
    g.stroke();
    g.fillStyle = color || '#3a8fd6';
    g.strokeStyle = color || '#3a8fd6';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    switch (kind) {
      case 'note':
        g.fillRect(20, 22, 3.5, 24);
        g.fillRect(36, 18, 3.5, 24);
        g.beginPath();
        g.arc(20, 46, 6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(36, 42, 6, 0, Math.PI * 2);
        g.fill();
        g.fillRect(23, 22, 12, 2.5);
        g.fillRect(39, 18, 12, 2.5);
        break;
      case 'chat':
        roundRect(g, 12, 14, 40, 30, 10);
        g.fill();
        g.beginPath();
        g.moveTo(20, 42);
        g.lineTo(14, 52);
        g.lineTo(30, 42);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.arc(24, 29, 2.6, 0, Math.PI * 2);
        g.arc(32, 29, 2.6, 0, Math.PI * 2);
        g.arc(40, 29, 2.6, 0, Math.PI * 2);
        g.fill();
        break;
      case 'photo':
        roundRect(g, 12, 14, 40, 38, 8);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.arc(44, 22, 4, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(14, 46);
        g.lineTo(26, 30);
        g.lineTo(36, 42);
        g.lineTo(42, 36);
        g.lineTo(52, 46);
        g.closePath();
        g.fill();
        break;
      case 'clock':
        g.beginPath();
        g.arc(32, 32, 20, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.arc(32, 32, 3.4, 0, Math.PI * 2);
        g.fill();
        g.fillRect(30, 32, 2.4, 13);
        g.fillRect(30, 30, 12, 2.4);
        break;
      case 'star':
        g.beginPath();
        for (var i = 0; i < 10; i++) {
          var rr = i % 2 === 0 ? 22 : 9;
          var a = (i * Math.PI) / 5 - Math.PI / 2;
          var x = 32 + Math.cos(a) * rr;
          var y = 32 + Math.sin(a) * rr;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.closePath();
        g.fill();
        break;
      case 'house':
        g.beginPath();
        g.moveTo(32, 12);
        g.lineTo(52, 28);
        g.lineTo(52, 52);
        g.lineTo(12, 52);
        g.lineTo(12, 28);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        roundRect(g, 26, 36, 12, 16, 2);
        g.fill();
        break;
    }
    return c;
  }

  function makeBadgeTexture(kind, color) {
    var c = makeIconCanvas(kind, color);
    var tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function makeIsland(x, y, z, s, grassColor, accent, kind, app) {
    var g = new THREE.Group();
    var dirt = new THREE.Mesh(
      new THREE.ConeGeometry(3 * s, 2.6 * s, 10),
      new THREE.MeshStandardMaterial({ color: 0x9c8a72, roughness: 0.9 })
    );
    dirt.rotation.x = Math.PI;
    dirt.position.y = -0.95 * s;
    g.add(dirt);

    var top = new THREE.Mesh(
      new THREE.CylinderGeometry(3.1 * s, 3.45 * s, 0.8 * s, 12),
      new THREE.MeshStandardMaterial({ color: grassColor, roughness: 0.8 })
    );
    top.position.y = 0.12 * s;
    top.userData.click = app ? { type: 'app', id: app.id } : null;
    g.add(top);
    if (app) clickables.push(top);

    var colors = [0xff8fb8, 0xffd166, 0xffffff];
    for (var f = 0; f < 3; f++) {
      var fl = new THREE.Mesh(
        new THREE.SphereGeometry(0.2 * s, 8, 8),
        new THREE.MeshStandardMaterial({ color: colors[f % 3], roughness: 0.4 })
      );
      fl.position.set((Math.random() - 0.5) * 4.2 * s, 0.6 * s, (Math.random() - 0.5) * 4.2 * s);
      g.add(fl);
    }

    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * s, 0.18 * s, 1.3 * s, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.9 })
    );
    trunk.position.set(1.3 * s, 1.05 * s, 0.4 * s);
    g.add(trunk);
    var leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.75 * s, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f9e4e, roughness: 0.7 })
    );
    leaf.position.set(1.3 * s, 1.85 * s, 0.4 * s);
    g.add(leaf);

    if (app) {
      var badge = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 1.5),
        new THREE.MeshBasicMaterial({ map: makeBadgeTexture(kind, accent), transparent: true, side: THREE.DoubleSide, depthWrite: false })
      );
      badge.position.y = 4.8 * s;
      badge.userData.click = { type: 'app', id: app.id, hoverScale: 1.5 };
      g.add(badge);
      clickables.push(badge);

      var glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: makeGlowTexture(),
          color: new THREE.Color(accent),
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      glow.scale.set(4, 4, 1);
      glow.position.y = 4.8 * s;
      g.add(glow);
    }

    g.position.set(x, y, z);
    scene.add(g);
    return g;
  }

  var appIslands = [];
  function buildAppIslands() {
    var apps = [
      { id: 'music', name: 'Music', x: 0, y: 22, z: -42, grass: 0xff8fa8, accent: '#ff5c7a', icon: 'note', s: 1.5 },
      { id: 'notes', name: 'Notes', x: 42, y: 18, z: 2, grass: 0xf0e354, accent: '#ffc400', icon: 'chat', s: 1.5 },
      { id: 'gallery', name: 'Gallery', x: 30, y: 26, z: 32, grass: 0x4fa3ff, accent: '#4fa3ff', icon: 'photo', s: 1.6 },
      { id: 'timer', name: 'Timer', x: -30, y: 20, z: 30, grass: 0x35e0c0, accent: '#12b891', icon: 'clock', s: 1.5 },
      { id: 'game', name: 'Bubbles', x: -40, y: 24, z: -28, grass: 0xff9a4d, accent: '#ff6b1a', icon: 'star', s: 1.6 }
    ];
    var self = this;
    apps.forEach(function (a) {
      var island = makeIsland(a.x, a.y, a.z, a.s, a.grass, a.accent, a.icon, a);
      appIslands.push({
        g: island,
        baseY: a.y,
        ph: Math.random() * Math.PI * 2,
        amp: 0.9 + Math.random() * 0.8,
        name: a.name,
        app: a
      });
    });

    var coords = [[-52, 34, 40, 1.4, 0x4cbb64], [46, 30, -48, 1.7, 0x54c96f]];
    coords.forEach(function (c) {
      makeIsland(c[0], c[1], c[2], c[3], c[4], '#ffffff', null, null);
    });
  }

  var dormData = {
    wall: '#dff5ff',
    floor: '#c9e8a0',
    items: []
  };
  var decorGroup = new THREE.Group();
  var decorList = [];
  var dormIsland = null;
  var hutWalls = null;
  var floorMat = null;
  var interiorLight = null;

  function loadDorm() {
    try {
      var raw = localStorage.getItem('vita.dorm');
      if (raw) {
        var d = JSON.parse(raw);
        dormData.wall = d.wall || dormData.wall;
        dormData.floor = d.floor || dormData.floor;
        dormData.items = Array.isArray(d.items) ? d.items : [];
      }
    } catch (e) {}
  }
  function saveDorm() {
    try {
      localStorage.setItem('vita.dorm', JSON.stringify(dormData));
    } catch (e) {}
  }

  function decorVisual(type) {
    var g = new THREE.Group();
    var pastels = [0xffffff, 0xffd6e8, 0xffe9b8, 0xd6f0ff];
    var pick = pastels[Math.floor(Math.random() * pastels.length)];
    switch (type) {
      case 'lamp':
        var pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.1, 1.1, 8),
          new THREE.MeshStandardMaterial({ color: 0xd9e6ef, roughness: 0.4 })
        );
        pole.position.y = 0.55;
        g.add(pole);
        var head = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xfff3c0, emissive: 0xffcf7a, emissiveIntensity: 0.6, roughness: 0.3 })
        );
        head.position.y = 1.28;
        g.add(head);
        var halo = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: makeGlowTexture(),
            color: 0xffe6b0,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        halo.scale.set(1.7, 1.7, 1);
        halo.position.y = 1.28;
        g.add(halo);
        break;
      case 'plant':
        var pot = new THREE.Mesh(
          new THREE.ConeGeometry(0.3, 0.45, 10),
          new THREE.MeshStandardMaterial({ color: 0xd99a6c, roughness: 0.8 })
        );
        pot.position.y = 0.22;
        g.add(pot);
        for (var i = 0; i < 4; i++) {
          var leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x2f9e4e, roughness: 0.6 })
          );
          leaf.position.set(Math.sin(i * 1.7) * 0.22, 0.55 + i * 0.07, Math.cos(i * 1.3) * 0.22);
          g.add(leaf);
        }
        break;
      case 'orb':
        var orb = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 20, 20),
          new THREE.MeshStandardMaterial({ color: 0xc9f2ff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, depthWrite: false })
        );
        orb.position.y = 0.8;
        g.add(orb);
        var hl = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false })
        );
        hl.position.set(0.16, 0.95, 0.2);
        g.add(hl);
        break;
      case 'chair':
        var seat = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14),
          new THREE.MeshStandardMaterial({ color: pick, roughness: 0.4 })
        );
        seat.position.y = 0.34;
        g.add(seat);
        var back = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 0.85, 14, 1, true),
          new THREE.MeshStandardMaterial({ color: pick, roughness: 0.4, side: THREE.DoubleSide })
        );
        back.position.y = 0.9;
        back.position.z = -0.34;
        g.add(back);
        break;
      case 'table':
        var top = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16),
          new THREE.MeshStandardMaterial({ color: pick, roughness: 0.35 })
        );
        top.position.y = 0.62;
        g.add(top);
        var leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.09, 0.58, 8),
          new THREE.MeshStandardMaterial({ color: 0xd9e6ef, roughness: 0.5 })
        );
        leg.position.y = 0.29;
        g.add(leg);
        break;
      case 'rug':
        var rug = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 1.1, 0.05, 20),
          new THREE.MeshStandardMaterial({ color: pick, transparent: true, opacity: 0.85, roughness: 0.8 })
        );
        rug.position.y = 0.05;
        g.add(rug);
        break;
    }
    return g;
  }

  function buildDorm() {
    loadDorm();
    dormIsland = makeIsland(0, DORM_Y, 0, 3.4, 0x4ad6b0, '#12b891', null, null);

    var hut = new THREE.Group();
    hutWalls = new THREE.Mesh(
      new THREE.CylinderGeometry(4.2, 4.4, 3.4, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: dormData.wall, transparent: true, opacity: 0.5, roughness: 0.2, metalness: 0.05, side: THREE.DoubleSide })
    );
    hutWalls.position.y = 1.7;
    hut.add(hutWalls);

    var winMat = new THREE.MeshStandardMaterial({ color: 0xc9f2ff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 });
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 + 0.4;
      var win = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), winMat);
      win.position.set(Math.cos(a) * 4.3, 1.9, Math.sin(a) * 4.3);
      win.rotation.y = -a;
      hut.add(win);
    }

    var roof = new THREE.Mesh(
      new THREE.ConeGeometry(4.7, 2.4, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xaee7ff, transparent: true, opacity: 0.55, roughness: 0.3, side: THREE.DoubleSide })
    );
    roof.position.y = 3.4 + 1.2;
    hut.add(roof);

    var door = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 2.05),
      new THREE.MeshStandardMaterial({ color: 0x9ad0f5, roughness: 0.4, side: THREE.DoubleSide })
    );
    door.position.set(0, 1.05, 4.35);
    door.userData.click = { type: 'dormDoor', name: 'Dorm door' };
    hut.add(door);
    clickables.push(door);

    hut.position.y = DORM_Y + 0.1;
    scene.add(hut);

    floorMat = new THREE.MeshStandardMaterial({ color: dormData.floor, roughness: 0.7, transparent: true, opacity: 0.96 });
    var floor = new THREE.Mesh(new THREE.CircleGeometry(3.9, 32), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, DORM_Y + 0.03, 0);
    floor.userData.click = { type: 'dormFloor' };
    scene.add(floor);
    clickables.push(floor);

    interiorLight = new THREE.PointLight(0xdff5ff, 0.7, 14);
    interiorLight.position.set(0, DORM_Y + 2.6, 0);
    scene.add(interiorLight);

    scene.add(decorGroup);
    rebuildDecor();
  }

  function rebuildDecor() {
    decorList.forEach(function (d) {
      var i = clickables.indexOf(d.hit);
      if (i !== -1) clickables.splice(i, 1);
    });
    decorGroup.clear();
    decorList = [];
    if (dormData.items.length === 0) {
      dormData.items = [
        { type: 'rug', x: 0, z: 0, rot: 0 },
        { type: 'lamp', x: -1.6, z: 0.8, rot: 0 },
        { type: 'orb', x: 1.5, z: -1.2, rot: 0 }
      ];
      saveDorm();
    }
    dormData.items.forEach(function (it) {
      var v = decorVisual(it.type);
      v.position.set(it.x, DORM_Y, it.z);
      v.rotation.y = it.rot || 0;
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      m.position.copy(v.position);
      m.userData.click = { type: 'dormItem', id: it.id };
      decorGroup.add(v);
      decorGroup.add(m);
      decorList.push({ id: it.id, vis: v, hit: m });
      clickables.push(m);
    });
  }

  function placeDecor(type, x, z) {
    if (decorList.length >= 12) return;
    var id = 'd' + Date.now() + Math.floor(Math.random() * 999);
    dormData.items.push({ type: type, x: x, z: z, rot: Math.random() * 0.4 });
    saveDorm();
    rebuildDecor();
  }

  function removeDecor(id) {
    dormData.items = dormData.items.filter(function (it) { return it.id !== id; });
    saveDorm();
    decorList.forEach(function (d) {
      if (d.id === id) {
        var i = clickables.indexOf(d.hit);
        if (i !== -1) clickables.splice(i, 1);
        decorGroup.remove(d.vis);
        decorGroup.remove(d.hit);
      }
    });
    decorList = decorList.filter(function (d) { return d.id !== id; });
  }

  function clearDecor() {
    dormData.items = [];
    saveDorm();
    decorList.forEach(function (d) {
      var i = clickables.indexOf(d.hit);
      if (i !== -1) clickables.splice(i, 1);
    });
    decorGroup.clear();
    decorList = [];
  }

  function setDormColor(kind, color) {
    if (kind === 'wall') {
      dormData.wall = color;
      hutWalls.material.color.set(color);
    } else {
      dormData.floor = color;
      floorMat.color.set(color);
    }
    saveDorm();
  }

  function enterDorm() {
    dorm.active = true;
    dorm.trans = {
      from: camPos.clone(),
      to: new THREE.Vector3(0, DORM_Y + 1.75, 0),
      t: 0
    };
    yaw = 0;
    pitch = -0.06;
  }

  function exitDorm() {
    dorm.trans = {
      from: camPos.clone(),
      to: new THREE.Vector3(6, 8, 28),
      t: 0
    };
    yaw = 0.6;
    dorm.active = false;
  }

  var popBubbles = [];
  var bursts = [];
  var GAME_CX = -40;
  var GAME_CZ = -28;

  function spawnPopBubble() {
    var r = 0.5 + Math.random() * 0.7;
    var m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x7fc9ff, transparent: true, opacity: 0.7, roughness: 0.05, metalness: 0.15, depthWrite: false })
    );
    var a = Math.random() * Math.PI * 2;
    var rr = 7 + Math.random() * 16;
    m.position.set(GAME_CX + Math.cos(a) * rr, 10 + Math.random() * 10, GAME_CZ + Math.sin(a) * rr);
    m.userData.click = { type: 'pop', bubble: m, name: 'Bubble' };
    scene.add(m);
    clickables.push(m);
    popBubbles.push({ mesh: m, base: m.position.clone(), ph: Math.random() * Math.PI * 2, spd: 0.5 + Math.random() * 0.8 });
  }

  function buildGame() {
    for (var i = 0; i < 12; i++) spawnPopBubble();
  }

  function popBubble(m) {
    var i = clickables.indexOf(m);
    if (i !== -1) clickables.splice(i, 1);
    scene.remove(m);
    spawnBurst(m.position);
    if (window.gameScoreAdd) gameScoreAdd();
    if (window.popSound) popSound();
    setTimeout(spawnPopBubble, 3500);
  }

  function spawnBurst(pos) {
    var parts = [];
    for (var i = 0; i < 8; i++) {
      var p = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 6),
        new THREE.MeshStandardMaterial({ color: 0xd6f4ff, transparent: true, opacity: 1, depthWrite: false })
      );
      p.position.copy(pos);
      scene.add(p);
      var a = Math.random() * Math.PI * 2;
      var up = Math.random() * 0.8 + 0.3;
      parts.push({
        m: p,
        v: new THREE.Vector3(Math.cos(a) * 2, up, Math.sin(a) * 2),
        t: 0
      });
    }
    bursts.push({ parts: parts, t: 0 });
  }

  function updateIslands(t, dt) {
    for (var i = 0; i < appIslands.length; i++) {
      appIslands[i].g.rotation.y += dt * 0.03;
    }

    for (var p = 0; p < popBubbles.length; p++) {
      var pb = popBubbles[p];
      pb.mesh.position.y = pb.base.y + Math.sin(t * pb.spd + pb.ph) * 1.2;
      pb.mesh.position.x = pb.base.x + Math.sin(t * 0.5 + pb.ph * 1.4) * 2;
      pb.mesh.position.z = pb.base.z + Math.cos(t * 0.4 + pb.ph) * 2;
    }

    for (var a = 0; a < arrows.length; a++) {
      var ar = arrows[a];
      ar.g.position.y = ar.base + Math.sin(t * 2 + ar.ph) * 0.14;
      ar.mat.emissiveIntensity = 0.45 + Math.sin(t * 3 + ar.ph) * 0.25;
    }

    for (var el = 0; el < window.elevators.length; el++) {
      var ev = window.elevators[el];
      var pr = Math.hypot(camPos.x - ev.cx, camPos.z - ev.cz);
      var riding = pr < ev.radius + 0.4;
      var atTop = pr < ev.radius + 1.4 && Math.abs(camPos.y - ev.topY) < 3;
      var target = (riding || atTop) ? ev.topY : ev.baseY;
      ev.currentY += (target - ev.currentY) * dt * 1.6;
      ev.disc.position.y = ev.currentY;
      ev.ring.position.y = ev.currentY + 0.2;
      ev.glow.material.opacity = 0.45 + Math.sin(t * 2 + el) * 0.15;
    }

    for (var b = bursts.length - 1; b >= 0; b--) {
      var bu = bursts[b];
      bu.t += dt;
      for (var q = 0; q < bu.parts.length; q++) {
        var pt = bu.parts[q];
        pt.m.position.addScaledVector(pt.v, dt);
        pt.v.y -= dt * 3;
        pt.m.material.opacity = 1 - bu.t;
      }
      if (bu.t >= 1) {
        bu.parts.forEach(function (pt) {
          scene.remove(pt.m);
          pt.m.material.dispose();
          pt.m.geometry.dispose();
        });
        bursts.splice(b, 1);
      }
    }
  }

  function makeArrow(scale) {
    var s = scale || 1;
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: 0xffd94d, emissive: 0xffaa00, emissiveIntensity: 0.55, roughness: 0.3 });
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.09 * s, 0.7 * s, 8), mat);
    shaft.rotation.x = Math.PI / 2;
    g.add(shaft);
    var head = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 0.36 * s, 10), mat);
    head.rotation.x = Math.PI / 2;
    head.position.z = 0.48 * s;
    g.add(head);
    return { group: g, mat: mat };
  }

  window.elevators = [];
  var arrows = [];

  function buildElevators() {
    var targets = appIslands.map(function (is) {
      var l = Math.hypot(is.app.x, is.app.z);
      return { id: is.app.id, x: is.app.x, z: is.app.z, y: is.baseY, accent: is.app.accent, yaw: Math.atan2(-is.app.x / l, -is.app.z / l) };
    });
    targets.push({ id: 'dorm', x: 0, z: 0, y: DORM_Y, accent: '#12b891', yaw: 0 });
    targets.forEach(makeElevator);
  }

  function makeElevator(t) {
    var baseY = 0.5, topY = t.y + 0.45;
    var disc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 0.35, 24),
      new THREE.MeshStandardMaterial({ color: 0xc9e9ff, transparent: true, opacity: 0.85, roughness: 0.3, metalness: 0.1 })
    );
    disc.position.set(t.x, baseY, t.z);
    scene.add(disc);
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.6, 0.09, 8, 28),
      new THREE.MeshStandardMaterial({ color: 0xffd94d, emissive: 0xffaa00, emissiveIntensity: 0.5, roughness: 0.3 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(t.x, baseY + 0.2, t.z);
    scene.add(ring);
    var arrow = makeArrow(0.95);
    arrow.group.position.set(t.x, baseY + 2.9, t.z);
    arrow.group.rotation.x = -Math.PI / 2;
    scene.add(arrow.group);
    var glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeGlowTexture(), color: new THREE.Color(t.accent || '#ffd94d'), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    glow.scale.set(5, 5, 1);
    glow.position.set(t.x, baseY + 0.9, t.z);
    scene.add(glow);
    arrows.push({ g: arrow.group, mat: arrow.mat, ph: Math.random() * Math.PI * 2, base: baseY + 2.9 });
    window.elevators.push({ id: t.id, cx: t.x, cz: t.z, baseY: baseY, topY: topY, currentY: baseY, radius: 2.6, disc: disc, ring: ring, glow: glow, yaw: t.yaw });
  }

  function elevatorTop(id) {
    for (var i = 0; i < window.elevators.length; i++) {
      if (window.elevators[i].id === id) return window.elevators[i];
    }
    return null;
  }

  function surfaceHeight(x, z) {
    for (var i = 0; i < window.elevators.length; i++) {
      var ev = window.elevators[i];
      if (Math.hypot(x - ev.cx, z - ev.cz) < ev.radius + 0.3) return ev.currentY;
    }
    for (var a = 0; a < appIslands.length; a++) {
      var is = appIslands[a];
      if (Math.hypot(x - is.app.x, z - is.app.z) < 3.6 * is.app.s) return is.baseY + 0.45;
    }
    if (Math.hypot(x, z) < 10.5) return DORM_Y + 0.45;
    return null;
  }

  window.buildElevators = buildElevators;
  window.elevatorTop = elevatorTop;
  window.surfaceHeight = surfaceHeight;
  window.islandList = function () {
    var list = appIslands.map(function (is) {
      return { id: is.app.id, name: is.app.name, color: is.app.accent };
    });
    list.push({ id: 'dorm', name: 'My Dorm', color: '#12b891' });
    return list;
  };
  window.buildAppIslands = buildAppIslands;
  window.buildDorm = buildDorm;
  window.buildGame = buildGame;
  window.updateIslands = updateIslands;
  window.enterDorm = enterDorm;
  window.exitDorm = exitDorm;
  window.placeDecor = placeDecor;
  window.removeDecor = removeDecor;
  window.clearDecor = clearDecor;
  window.setDormColor = setDormColor;
  window.popBubble = popBubble;
  window.getDormState = function () {
    return { wall: dormData.wall, floor: dormData.floor, items: dormData.items.length };
  };
})();