var scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe9ff, 55, 150);

var renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

var camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);

buildEnvironment();
buildAppIslands();
buildDorm();
buildGame();
buildBridges();

var keys = {};
var started = false;

function firstInput() {
  if (started) return;
  started = true;
  document.body.classList.add('ready');
  VITA.startMusic();
}

addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(e.code) !== -1) e.preventDefault();
  firstInput();
});
addEventListener('keyup', function (e) {
  keys[e.code] = false;
});

var yaw = 0.6,
  pitch = -0.08,
  dragging = false,
  lx = 0,
  ly = 0;

renderer.domElement.addEventListener('pointerdown', function (e) {
  dragging = true;
  lx = e.clientX;
  ly = e.clientY;
  downX = e.clientX;
  downY = e.clientY;
  hideTooltip();
  firstInput();
});
renderer.domElement.addEventListener('touchstart', function (e) {
  if (e.touches.length) {
    dragging = true;
    var t = e.touches[0];
    lx = t.clientX;
    ly = t.clientY;
    downX = t.clientX;
    downY = t.clientY;
    firstInput();
  }
}, { passive: true });

var downX = 0,
  downY = 0;

addEventListener('pointermove', function (e) {
  if (dragging) {
    yaw -= (e.clientX - lx) * 0.005;
    pitch -= (e.clientY - ly) * 0.0038;
    if (pitch > 1.15) pitch = 1.15;
    if (pitch < -1.15) pitch = -1.15;
    lx = e.clientX;
    ly = e.clientY;
  } else {
    if (!isUiOpen()) updateHover(e.clientX, e.clientY);
  }
});
addEventListener('pointerup', function (e) {
  dragging = false;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) < 6) {
    handleClick(e.clientX, e.clientY);
  }
});
addEventListener('pointercancel', function () { dragging = false; });

var raycaster = new THREE.Raycaster();
var hoveredObj = null;

function ndcFrom(x, y) {
  return new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
}

function castHit(x, y) {
  raycaster.setFromCamera(ndcFrom(x, y), camera);
  return raycaster.intersectObjects(window.clickables, false)[0];
}

function updateHover(x, y) {
  var hit = castHit(x, y);
  var obj = hit ? hit.object : null;
  if (obj === hoveredObj) return;
  if (hoveredObj && hoveredObj.userData.click && hoveredObj.userData.click.hoverScale) {
    hoveredObj.scale.setScalar(1);
  }
  hoveredObj = obj;
  if (obj && obj.userData.click) {
    var c = obj.userData.click;
    if (c.hoverScale) obj.scale.setScalar(c.hoverScale);
    if (c.name) showTooltip(c.name, x, y + 14);
    else hideTooltip();
  } else {
    hideTooltip();
  }
}

function handleClick(x, y) {
  var hit = castHit(x, y);
  if (!hit) return;
  var c = hit.object.userData.click;
  if (!c) return;
  if (dorm.active) {
    if (c.type === 'dormItem') {
      if (isPaletteOpen()) removeDecor(c.id);
    } else if (c.type === 'dormFloor') {
      if (isPaletteOpen()) placeDecor(selectedDecor(), hit.point.x, hit.point.z);
    } else if (c.type === 'dormDoor') {
      closePalette();
      exitDorm();
    }
    return;
  }
  if (c.type === 'app') {
    openApp(c.id);
  } else if (c.type === 'dormDoor') {
    enterDorm();
    openPalette();
  } else if (c.type === 'pop') {
    popBubble(c.bubble);
  }
}

document.addEventListener('visibilitychange', function () {
  if (!document.hidden && started && VITA.getTrack().paused) VITA.startMusic();
});

var clock = new THREE.Clock();
var camPos = new THREE.Vector3(0, 1.7, 26);

var EYE = 1.7;

function animate() {
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  var t = clock.elapsedTime;

  var moving = dorm.trans === null;
  if (moving) {
    var fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    var str = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    var sp = 11;
    var fx = Math.sin(yaw),
      fz = Math.cos(yaw);
    var rx = Math.cos(yaw),
      rz = -Math.sin(yaw);
    camPos.x += (fx * fwd + rx * str) * sp * dt;
    camPos.z += (fz * fwd + rz * str) * sp * dt;
  }

  var rr = camPos.x * camPos.x + camPos.z * camPos.z;
  if (rr > 118 * 118) {
    var n = Math.sqrt(rr);
    camPos.x = camPos.x / n * 118;
    camPos.z = camPos.z / n * 118;
  }

  if (dorm.trans) {
    dorm.trans.t = Math.min(dorm.trans.t + dt * 0.5, 1);
    var k = dorm.trans.t * dorm.trans.t * (3 - 2 * dorm.trans.t);
    camPos.lerpVectors(dorm.trans.from, dorm.trans.to, k);
    if (dorm.trans.t >= 1) dorm.trans = null;
  } else if (dorm.active) {
    var cdx = camPos.x,
      cdz = camPos.z;
    var cd = Math.hypot(cdx, cdz);
    if (cd > 3.4) {
      camPos.x = cdx / cd * 3.4;
      camPos.z = cdz / cd * 3.4;
    }
    camPos.y += (DORM_Y + EYE - camPos.y) * dt * 3;
  } else {
    var fh = bridgeFloor(camPos.x, camPos.z);
    var targetY = fh !== null ? fh + EYE : EYE + Math.sin(t * 0.9) * 0.15;
    camPos.y += (targetY - camPos.y) * dt * (fh !== null ? 6 : 2);
  }

  camera.position.copy(camPos);
  camera.lookAt(camPos.x + Math.sin(yaw) * 10, camPos.y + Math.sin(pitch) * 12, camPos.z + Math.cos(yaw) * 10);

  updateEnvironment(t, dt);
  updateIslands(t, dt);

  renderer.render(scene, camera);
}

addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();