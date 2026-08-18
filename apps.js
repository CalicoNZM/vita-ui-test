(function () {
  window.VITA = window.VITA || {};

  var audioTrack = new Audio('hh.mp3');
  audioTrack.loop = true;
  audioTrack.volume = 0.7;
  var audioCtx = null,
    analyser = null,
    freq = null;

  function startMusic() {
    if (audioTrack._p) return;
    audioTrack._p = true;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    if (!analyser) {
      var src = audioCtx.createMediaElementSource(audioTrack);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      freq = new Uint8Array(analyser.frequencyBinCount);
      src.connect(analyser);
      analyser.connect(audioCtx.destination);
    }
    audioTrack.play().catch(function () {});
    updateMusicUI();
  }

  function toggleMusic() {
    if (audioTrack.paused) startMusic();
    else {
      audioTrack.pause();
      audioTrack._p = false;
      updateMusicUI();
    }
  }

  VITA.startMusic = startMusic;
  VITA.toggleMusic = toggleMusic;
  VITA.getTrack = function () { return audioTrack; };
  VITA.getAnalyser = function () { return analyser; };
  VITA.getFreq = function () { return freq; };

  function popSound() {
    if (!audioCtx) return;
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(880, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.08);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.13);
  }
  window.popSound = popSound;

  var overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML =
    '<div class="appPanel">' +
    '<div class="appHead"><h2 id="appTitle"></h2><button id="appClose" class="appClose">&#10005;</button></div>' +
    '<div id="appBody"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var palette = document.createElement('div');
  palette.className = 'dormPalette hidden';
  document.body.appendChild(palette);

  var tooltip = document.createElement('div');
  tooltip.className = 'tooltip hidden';
  document.body.appendChild(tooltip);

  var paletteOpen = false;
  var decorSelected = 'rug';
  var currentApp = null;
  var vizId = null;

  function openApp(id) {
    currentApp = id;
    document.getElementById('appTitle').textContent = { music: 'Music', notes: 'Notes', gallery: 'Gallery', timer: 'Timer', game: 'Bubbles', dorm: 'My Dorm' }[id] || id;
    var body = document.getElementById('appBody');
    body.innerHTML = '';
    if (id === 'music') renderMusic(body);
    else if (id === 'notes') renderNotes(body);
    else if (id === 'gallery') renderGallery(body);
    else if (id === 'timer') renderTimer(body);
    else if (id === 'game') renderGame(body);
    else if (id === 'dorm') renderDorm(body);
    overlay.classList.add('open');
  }

  function closeApp() {
    overlay.classList.remove('open');
    if (currentApp === 'music') stopViz();
    currentApp = null;
  }

  window.openApp = openApp;
  window.closeApp = closeApp;

  document.getElementById('appClose').addEventListener('click', closeApp);
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Escape') {
      closeApp();
      closePalette();
    }
  });

  window.isUiOpen = function () {
    return overlay.classList.contains('open') || !palette.classList.contains('hidden');
  };

  function showTooltip(text, x, y) {
    tooltip.textContent = text;
    tooltip.classList.remove('hidden');
    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  }
  function hideTooltip() {
    tooltip.classList.add('hidden');
  }
  window.showTooltip = showTooltip;
  window.hideTooltip = hideTooltip;

  var DECOR_TYPES = ['lamp', 'plant', 'orb', 'chair', 'table', 'rug'];

  function openPalette() {
    paletteOpen = true;
    palette.classList.remove('hidden');
    palette.innerHTML = '<span class="dpTitle">Place things in your dorm</span>' +
      DECOR_TYPES.map(function (t) {
        return '<button class="dpItem' + (t === decorSelected ? ' sel' : '') + '" data-t="' + t + '">' + t + '</button>';
      }).join('') +
      '<button class="dpAct" id="dpClear">Clear all</button>' +
      '<button class="dpAct" id="dpLeave">Leave room</button>';
    palette.querySelectorAll('.dpItem').forEach(function (b) {
      b.addEventListener('click', function () {
        decorSelected = b.getAttribute('data-t');
        palette.querySelectorAll('.dpItem').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
      });
    });
    document.getElementById('dpClear').addEventListener('click', function () {
      clearDecor();
    });
    document.getElementById('dpLeave').addEventListener('click', function () {
      closePalette();
      exitDorm();
    });
  }
  function closePalette() {
    paletteOpen = false;
    palette.classList.add('hidden');
    palette.innerHTML = '';
  }
  function isPaletteOpen() { return paletteOpen; }
  function selectedDecor() { return decorSelected; }
  window.openPalette = openPalette;
  window.closePalette = closePalette;
  window.isPaletteOpen = isPaletteOpen;
  window.selectedDecor = selectedDecor;

  var gameScore = 0;
  var gameHigh = 0;
  try { gameHigh = parseInt(localStorage.getItem('vita.game') || '0', 10) || 0; } catch (e) {}
  function gameScoreAdd() {
    gameScore++;
    if (gameScore > gameHigh) {
      gameHigh = gameScore;
      try { localStorage.setItem('vita.game', String(gameHigh)); } catch (e) {}
    }
    var el = document.getElementById('gameScore');
    if (el) el.textContent = gameScore;
    var hi = document.getElementById('gameHigh');
    if (hi) hi.textContent = gameHigh;
  }
  window.gameScoreAdd = gameScoreAdd;

  function renderMusic(body) {
    var viz = document.createElement('canvas');
    viz.width = 340;
    viz.height = 84;
    viz.id = 'viz';
    body.innerHTML =
      '<div class="trackTitle">hh</div>' +
      '<div class="nowPlaying">ambient loop</div>' +
      '<div class="vizWrap"></div>' +
      '<div class="musicControls">' +
      '<button id="playBtn" class="glossBtn big">&#9654;</button>' +
      '<input type="range" id="volSlider" min="0" max="100" value="' + Math.round(audioTrack.volume * 100) + '">' +
      '<span id="timeInfo" class="timeInfo">0:00</span>' +
      '</div>';
    body.querySelector('.vizWrap').appendChild(viz);
    document.getElementById('playBtn').addEventListener('click', toggleMusic);
    document.getElementById('volSlider').addEventListener('input', function () {
      audioTrack.volume = this.value / 100;
    });
    updateMusicUI();
    startViz();
  }

  function updateMusicUI() {
    var b = document.getElementById('playBtn');
    if (b) b.innerHTML = audioTrack.paused ? '&#9654;' : '&#10073;&#10073;';
  }
  window.updateMusicUI = updateMusicUI;

  function startViz() {
    stopViz();
    vizId = requestAnimationFrame(vizTick);
  }
  function stopViz() {
    if (vizId) {
      cancelAnimationFrame(vizId);
      vizId = null;
    }
  }
  function vizTick() {
    if (!vizId) return;
    var viz = document.getElementById('viz');
    var ti = document.getElementById('timeInfo');
    if (viz) {
      var g = viz.getContext('2d');
      g.clearRect(0, 0, viz.width, viz.height);
      var bars = 28;
      var bw = viz.width / bars;
      if (analyser && freq && !audioTrack.paused) {
        analyser.getByteFrequencyData(freq);
        for (var i = 0; i < bars; i++) {
          var v = freq[Math.floor(i * 1.7)] / 255;
          var h = Math.max(4, v * viz.height * 0.9);
          var grad = g.createLinearGradient(0, viz.height - h, 0, viz.height);
          grad.addColorStop(0, 'rgba(79,163,255,0.95)');
          grad.addColorStop(1, 'rgba(53,224,192,0.85)');
          g.fillStyle = grad;
          g.fillRect(i * bw + 2, viz.height - h, bw - 4, h);
        }
      } else {
        g.fillStyle = 'rgba(79,163,255,0.25)';
        for (var j = 0; j < bars; j++) {
          var hh = 8 + Math.sin(Date.now() / 300 + j) * 6;
          g.fillRect(j * bw + 2, viz.height - hh, bw - 4, hh);
        }
      }
    }
    if (ti && audioTrack.duration && !isNaN(audioTrack.duration)) {
      var mm = Math.floor(audioTrack.currentTime / 60);
      var ss = Math.floor(audioTrack.currentTime % 60);
      ti.textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
    }
    vizId = requestAnimationFrame(vizTick);
  }

  var notes = [];
  try { notes = JSON.parse(localStorage.getItem('vita.notes') || '[]'); } catch (e) {}

  function renderNotes(body) {
    body.innerHTML =
      '<div class="notesRow"><input id="noteInput" maxlength="120" placeholder="write something..."><button id="noteAdd" class="glossBtn">Add</button></div>' +
      '<div id="noteList"></div>';
    function draw() {
      var list = document.getElementById('noteList');
      list.innerHTML = '';
      if (!notes.length) {
        list.innerHTML = '<div class="empty">no notes yet</div>';
        return;
      }
      notes.slice().reverse().forEach(function (n) {
        var d = document.createElement('div');
        d.className = 'noteCard';
        d.innerHTML = '<span class="noteText"></span><button class="noteDel" data-idx="' + notes.indexOf(n) + '">&#10005;</button>';
        d.querySelector('.noteText').textContent = n.text;
        d.querySelector('.noteDel').addEventListener('click', function () {
          notes.splice(parseInt(this.getAttribute('data-idx'), 10), 1);
          try { localStorage.setItem('vita.notes', JSON.stringify(notes)); } catch (e) {}
          draw();
        });
        list.appendChild(d);
      });
    }
    document.getElementById('noteAdd').addEventListener('click', addNote);
    document.getElementById('noteInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') addNote();
    });
    function addNote() {
      var inp = document.getElementById('noteInput');
      var v = inp.value.trim();
      if (!v) return;
      notes.push({ text: v, ts: Date.now() });
      try { localStorage.setItem('vita.notes', JSON.stringify(notes)); } catch (e) {}
      inp.value = '';
      draw();
    }
    draw();
  }

  var gallery = [];
  try { gallery = JSON.parse(localStorage.getItem('vita.gallery') || '[]'); } catch (e) {}

  function makeDefaultArt(index) {
    var c = document.createElement('canvas');
    c.width = 480;
    c.height = 320;
    var g = c.getContext('2d');
    var pals = [
      ['#9fd8ff', '#e6f7ff', '#4fa3ff'],
      ['#8fe3c0', '#dff8ee', '#35e0c0'],
      ['#ffd166', '#fff3d6', '#ff9a4d']
    ];
    var p = pals[index % 3];
    var gr = g.createLinearGradient(0, 0, 0, 320);
    gr.addColorStop(0, p[0]);
    gr.addColorStop(1, p[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, 480, 320);
    g.fillStyle = p[2];
    for (var i = 0; i < 8; i++) {
      var r = 10 + Math.random() * 26;
      g.beginPath();
      g.arc(Math.random() * 480, Math.random() * 320, r, 0, Math.PI * 2);
      g.globalAlpha = 0.5;
      g.fill();
    }
    g.globalAlpha = 1;
    return c.toDataURL('image/jpeg', 0.7);
  }

  function renderGallery(body) {
    body.innerHTML =
      '<div class="galRow"><button id="snapBtn" class="glossBtn big">&#128247; Snap photo</button><button id="galClear" class="glossBtn">Clear</button></div>' +
      '<div id="galGrid"></div>';
    var grid = document.getElementById('galGrid');
    var items = gallery.slice();
    function draw() {
      grid.innerHTML = '';
      if (!items.length) {
        grid.innerHTML = '<div class="empty">snap photos of the world — they land here</div>';
        return;
      }
      items.slice().reverse().forEach(function (src, i) {
        var d = document.createElement('div');
        d.className = 'galCard';
        d.innerHTML = '<img src=""><button class="galDel" data-i="' + i + '">&#10005;</button>';
        d.querySelector('img').src = src;
        d.querySelector('.galDel').addEventListener('click', function () {
          items.splice(parseInt(this.getAttribute('data-i'), 10), 1);
          try { localStorage.setItem('vita.gallery', JSON.stringify(items)); } catch (e) {}
          draw();
        });
        grid.appendChild(d);
      });
    }
    document.getElementById('snapBtn').addEventListener('click', function () {
      try {
        var src = renderer.domElement.toDataURL('image/jpeg', 0.7);
        var img = new Image();
        img.onload = function () {
          var c = document.createElement('canvas');
          var w = 480;
          c.width = w;
          c.height = Math.max(1, Math.round(img.height * (w / img.width)));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          items.push(c.toDataURL('image/jpeg', 0.7));
          if (items.length > 8) items.shift();
          try { localStorage.setItem('vita.gallery', JSON.stringify(items)); } catch (e) {}
          draw();
        };
        img.src = src;
      } catch (e) {}
    });
    document.getElementById('galClear').addEventListener('click', function () {
      items.length = 0;
      try { localStorage.setItem('vita.gallery', '[]'); } catch (e) {}
      draw();
    });
    draw();
  }

  var timer = { running: false, left: 0, total: 0, iv: null };

  function renderTimer(body) {
    body.innerHTML =
      '<div id="timerDisp" class="timerDisp">25:00</div>' +
      '<div class="timerRow">' +
      '<button class="chip" data-m="5">5m</button>' +
      '<button class="chip" data-m="15">15m</button>' +
      '<button class="chip sel" data-m="25">25m</button>' +
      '</div>' +
      '<div class="timerRow"><button id="tStart" class="glossBtn big">Start</button><button id="tReset" class="glossBtn">Reset</button></div>';
    var disp = document.getElementById('timerDisp');
    function show() {
      var m = Math.floor(timer.left / 60);
      var s = Math.floor(timer.left % 60);
      disp.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
    function tick() {
      timer.left -= 0.25;
      if (timer.left <= 0) {
        timer.left = 0;
        stopTimer();
        show();
        for (var i = 0; i < 3; i++) setTimeout(popSound, i * 160);
        disp.classList.add('flash');
        setTimeout(function () { disp.classList.remove('flash'); }, 900);
        return;
      }
      show();
    }
    function stopTimer() {
      timer.running = false;
      if (timer.iv) clearInterval(timer.iv);
      timer.iv = null;
      var b = document.getElementById('tStart');
      if (b) b.innerHTML = 'Start';
    }
    function startTimer() {
      if (timer.left <= 0) timer.left = timer.total;
      if (timer.running) return;
      timer.running = true;
      if (timer.iv) clearInterval(timer.iv);
      timer.iv = setInterval(tick, 250);
      var b = document.getElementById('tStart');
      if (b) b.innerHTML = 'Pause';
      show();
    }
    body.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () {
        body.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
        timer.total = parseInt(b.getAttribute('data-m'), 10) * 60;
        timer.left = timer.total;
        stopTimer();
        show();
      });
    });
    document.getElementById('tStart').addEventListener('click', function () {
      if (timer.running) stopTimer();
      else startTimer();
    });
    document.getElementById('tReset').addEventListener('click', function () {
      stopTimer();
      timer.left = timer.total;
      show();
    });
    show();
  }

  function renderGame(body) {
    body.innerHTML =
      '<div class="gameBig">' + gameHigh + '</div>' +
      '<div class="gameLabels"><span>HIGH SCORE</span></div>' +
      '<div class="gameLabels"><span>current: <b id="gameScore">' + gameScore + '</b></span></div>' +
      '<div class="gameHint">Walk to the Bubbles island and pop the floating bubbles by clicking them. They come back!</div>';
  }

  function renderDorm(body) {
    var st = getDormState();
    body.innerHTML =
      '<p class="dormIntro">Your own island. Enter the hut, then tap the floor to place things. Click things to remove them.</p>' +
      '<div class="swRow"><span>Walls</span><div id="wallSwatches"></div></div>' +
      '<div class="swRow"><span>Floor</span><div id="floorSwatches"></div></div>' +
      '<div class="dormCount">' + st.items + ' things placed</div>' +
      '<div class="timerRow"><button id="dormEnter" class="glossBtn big">&#8594; Enter room</button><button id="dormClear" class="glossBtn">Clear decor</button></div>';
    var wallColors = ['#dff5ff', '#ffe3f0', '#fff0c9', '#d9f0d0'];
    var floorColors = ['#c9e8a0', '#e8c9a0', '#c9e0f0', '#e8d0f0'];
    function swatches(container, colors, sel) {
      container.innerHTML = '';
      colors.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'swatch' + (c === sel ? ' sel' : '');
        b.style.background = c;
        b.addEventListener('click', function () {
          var kind = container.id === 'wallSwatches' ? 'wall' : 'floor';
          setDormColor(kind, c);
          swatches(container, colors, c);
        });
        container.appendChild(b);
      });
    }
    swatches(document.getElementById('wallSwatches'), wallColors, st.wall);
    swatches(document.getElementById('floorSwatches'), floorColors, st.floor);
    document.getElementById('dormEnter').addEventListener('click', function () {
      closeApp();
      enterDorm();
      openPalette();
    });
    document.getElementById('dormClear').addEventListener('click', function () {
      clearDecor();
      var st2 = getDormState();
      body.querySelector('.dormCount').textContent = st2.items + ' things placed';
    });
  }
})();