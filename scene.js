function shadeNum(c, amt) {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return (f(r) << 16) | (f(g) << 8) | f(b);
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(22, 17, 22);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas3d'), antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(30, 30, 20);
dirLight.castShadow = true;
scene.add(dirLight);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0x141926, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

let gridHelper = null;
function rebuildGrid(pal) {
  if (gridHelper) scene.remove(gridHelper);
  gridHelper = new THREE.GridHelper(90, 18, pal.gridA, pal.gridB);
  scene.add(gridHelper);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

const interactiveObjects = [];

const avatars = [];
function makeAvatar(data) {
  const mat = new THREE.MeshStandardMaterial({ color: data.hex, roughness: 0.4, metalness: 0.3, emissive: data.hex, emissiveIntensity: 0.22 });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 4), mat);
  mesh.position.set(...data.pos);
  mesh.castShadow = true;
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.7, 2.15, 48),
    new THREE.MeshBasicMaterial({ color: data.hex, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(data.pos[0], 0.06, data.pos[2]);
  ring.userData.baseOpacity = 0.35;
  scene.add(ring);
  mesh.userData = { type: 'avatar', id: data.id, avatar: data, baseY: data.pos[1], ring };
  scene.add(mesh);
  interactiveObjects.push(mesh);
  avatars.push(mesh);
  return mesh;
}
AVATAR_DEFAULTS.forEach(d => makeAvatar(getAvatar(d.id)));

function findAvatarMesh(id) { return avatars.find(a => a.userData.id === id); }

let spotlightId = null;
function setAvatarSpotlight(id) {
  spotlightId = id;
  avatars.forEach(a => {
    a.userData.ring.material.opacity = a.userData.id === id ? 0.8 : a.userData.ring.userData.baseOpacity;
  });
}

const orbMat = new THREE.MeshStandardMaterial({ color: 0x35e0c0, roughness: 0.25, metalness: 0.5, emissive: 0x35e0c0, emissiveIntensity: 0.4, wireframe: false });
const nzainOrb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), orbMat);
nzainOrb.position.set(0, 5, -1);
nzainOrb.castShadow = true;
nzainOrb.userData = { type: 'nzainOrb' };
scene.add(nzainOrb);
interactiveObjects.push(nzainOrb);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x35e0c0, transparent: true, opacity: 0.5 });
const nzainRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.03, 8, 48), ringMat);
nzainRing.rotation.x = Math.PI / 2.3;
nzainOrb.add(nzainRing);

const visGroup = new THREE.Group();
visGroup.position.set(0, 0, 7);
scene.add(visGroup);
const barCount = 20;
const bars = [];
for (let i = 0; i < barCount; i++) {
  const angle = (i / barCount) * Math.PI * 2;
  const mat = new THREE.MeshStandardMaterial({ color: 0x35e0c0, emissive: 0x35e0c0, emissiveIntensity: 0.3 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), mat);
  bar.position.set(Math.cos(angle) * 3.2, 0.5, Math.sin(angle) * 3.2);
  visGroup.add(bar);
  bars.push(bar);
}
const visBaseMat = new THREE.MeshStandardMaterial({ color: 0x161b25, roughness: 0.7 });
const visBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.2, 32), visBaseMat);
visBase.position.y = -0.05;
visBase.userData = { type: 'visBase' };
visGroup.add(visBase);
interactiveObjects.push(visBase);

const arrowMeshes = [];
function makeArrowMesh(dir, x) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#35e0c0'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if (dir === 'prev') { ctx.moveTo(80, 30); ctx.lineTo(45, 64); ctx.lineTo(80, 98); }
  else { ctx.moveTo(48, 30); ctx.lineTo(83, 64); ctx.lineTo(48, 98); }
  ctx.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  mesh.position.set(x, 0.8, 4.6);
  mesh.userData = { type: dir === 'prev' ? 'visPrev' : 'visNext' };
  visGroup.add(mesh);
  interactiveObjects.push(mesh);
  arrowMeshes.push(mesh);
  return mesh;
}
function rebuildArrows(pal) {
  arrowMeshes.forEach(m => {
    const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#' + pal.accent.toString(16).padStart(6, '0'); ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const dir = m.userData.type === 'visPrev' ? 'prev' : 'next';
    if (dir === 'prev') { ctx.moveTo(80, 30); ctx.lineTo(45, 64); ctx.lineTo(80, 98); }
    else { ctx.moveTo(48, 30); ctx.lineTo(83, 64); ctx.lineTo(48, 98); }
    ctx.stroke();
    m.material.map = new THREE.CanvasTexture(canvas);
    m.material.needsUpdate = true;
  });
}
makeArrowMesh('prev', -1.3);
makeArrowMesh('next', 1.3);

const rooms = [];
let roomAutoCount = 0;
const ROOM_COLORS = [0xff6b9d, 0x4a9eff, 0x00d4ff, 0xffb84f];
function createRoom(x, z, label, w, d) {
  w = w || 4; d = d || 4;
  const color = ROOM_COLORS[rooms.length % ROOM_COLORS.length];
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.18, roughness: 0.5, emissive: color, emissiveIntensity: 0.15 }));
  mesh.position.set(x, 1.2, z);
  mesh.userData = { type: 'room', label };
  scene.add(mesh);
  interactiveObjects.push(mesh);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = '600 26px Space Grotesk, sans-serif';
  ctx.fillStyle = '#e7edf3';
  ctx.textAlign = 'center';
  ctx.fillText(label, 128, 42);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  sprite.scale.set(4, 1, 1);
  sprite.position.set(x, 2.8, z);
  scene.add(sprite);
  const room = { mesh, sprite, label, x, z, w, d };
  rooms.push(room);
  saveRooms();
  return room;
}
function spawnRoomByName(name) {
  roomAutoCount++;
  const angle = roomAutoCount * 2.4;
  const radius = 8 + roomAutoCount * 2.5;
  const x = Math.cos(angle) * radius * 0.5 + 18;
  const z = Math.sin(angle) * radius * 0.5 - 16;
  createRoom(x, z, name || ('Room ' + roomAutoCount));
  return 'Room "' + (name || ('Room ' + roomAutoCount)) + '" created in the grid.';
}
function saveRooms() {
  try {
    localStorage.setItem('vita.rooms', JSON.stringify(rooms.map(r => ({ label: r.label, x: r.x, z: r.z, w: r.w, d: r.d }))));
  } catch (e) { }
}

const deskGroup = new THREE.Group();
deskGroup.position.set(-2, 0, -24);
scene.add(deskGroup);
const deskMat = new THREE.MeshStandardMaterial({ color: 0x12161f, roughness: 0.8 });
const deskSurface = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 6), deskMat);
deskSurface.position.y = 0.15;
deskGroup.add(deskSurface);

const deskNotes = [];
const deskTasks = [];
const noteMeshes = [];
const taskMeshes = [];

function buildNoteTexture(text) {
  const canvas = document.createElement('canvas'); canvas.width = 340; canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(255,214,102,0.95)';
  roundRectPath(ctx, 4, 4, 332, 212, 14);
  ctx.fill();
  ctx.fillStyle = '#241d05';
  ctx.font = '500 22px IBM Plex Sans, sans-serif';
  const lines = wrapLines(ctx, text, 290, 6);
  let y = 42;
  lines.forEach(l => { ctx.fillText(l, 24, y); y += 30; });
  return new THREE.CanvasTexture(canvas);
}
function buildAddTexture(label, pal) {
  const canvas = document.createElement('canvas'); canvas.width = 340; canvas.height = 220;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = pal ? 'rgba(53,224,192,0.6)' : 'rgba(53,224,192,0.6)';
  const col = pal ? '#' + pal.accent.toString(16).padStart(6, '0') : '#35e0c0';
  ctx.strokeStyle = col + '99';
  ctx.lineWidth = 4;
  roundRectPath(ctx, 4, 4, 332, 212, 14);
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.font = '600 54px Space Grotesk, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('+', 170, 120);
  ctx.font = '500 16px IBM Plex Sans, sans-serif';
  ctx.fillText(label, 170, 160);
  return new THREE.CanvasTexture(canvas);
}
function buildTaskTexture(text, done, pal) {
  const col = pal ? '#' + pal.accent.toString(16).padStart(6, '0') : '#35e0c0';
  const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = done ? (pal ? 'rgba(53,224,192,0.16)' : 'rgba(53,224,192,0.16)') : 'rgba(22,27,37,0.96)';
  roundRectPath(ctx, 4, 4, 292, 172, 14);
  ctx.fill();
  ctx.strokeStyle = done ? col : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3;
  roundRectPath(ctx, 4, 4, 292, 172, 14);
  ctx.stroke();
  ctx.strokeStyle = done ? col : '#7a8494'; ctx.lineWidth = 3;
  roundRectPath(ctx, 20, 20, 26, 26, 6);
  ctx.stroke();
  if (done) { ctx.beginPath(); ctx.moveTo(25, 33); ctx.lineTo(31, 40); ctx.lineTo(42, 24); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.fillStyle = done ? '#7a8494' : '#e7edf3';
  ctx.font = '500 18px IBM Plex Sans, sans-serif';
  const lines = wrapLines(ctx, text, 230, 4);
  let y = 34;
  lines.forEach(l => { ctx.fillText(l, 58, y); y += 24; });
  return new THREE.CanvasTexture(canvas);
}
function buildCalendarTexture(pal) {
  const canvas = document.createElement('canvas'); canvas.width = 420; canvas.height = 140;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(17,21,29,0.95)';
  roundRectPath(ctx, 4, 4, 412, 132, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2;
  roundRectPath(ctx, 4, 4, 412, 132, 14);
  ctx.stroke();
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today = new Date();
  const cellW = 412 / 7;
  const col = pal ? '#' + pal.accent.toString(16).padStart(6, '0') : '#35e0c0';
  for (let i = -3; i <= 3; i++) {
    const d = new Date(); d.setDate(today.getDate() + i);
    const cx = (i + 3) * cellW + cellW / 2 + 4;
    ctx.fillStyle = '#454c58';
    ctx.font = '500 13px IBM Plex Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(labels[d.getDay()], cx, 40);
    ctx.fillStyle = i === 0 ? col : '#e7edf3';
    ctx.font = (i === 0 ? '600 ' : '500 ') + '22px IBM Plex Mono, monospace';
    ctx.fillText(String(d.getDate()), cx, 78);
    if (i === 0) { ctx.fillStyle = col; ctx.fillRect(cx - 16, 90, 32, 3); }
  }
  return new THREE.CanvasTexture(canvas);
}
const calendarMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.1), new THREE.MeshBasicMaterial({ map: buildCalendarTexture(), transparent: true }));
calendarMesh.position.set(0, 3.6, -2.8);
calendarMesh.rotation.x = -0.15;
deskGroup.add(calendarMesh);

function removeFromInteractive(mesh) {
  const i = interactiveObjects.indexOf(mesh);
  if (i >= 0) interactiveObjects.splice(i, 1);
}

function rebuildNoteMeshes(pal) {
  noteMeshes.forEach(m => { removeFromInteractive(m); deskGroup.remove(m); });
  noteMeshes.length = 0;
  const startX = -6.5;
  deskNotes.forEach((n, i) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: buildNoteTexture(n.text), transparent: true }));
    mesh.position.set(startX + i * 2.5, 2.1, 0.4);
    mesh.rotation.x = -0.25;
    mesh.userData = { type: 'noteCard', id: n.id };
    deskGroup.add(mesh);
    interactiveObjects.push(mesh);
    noteMeshes.push(mesh);
  });
  const addMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.5), new THREE.MeshBasicMaterial({ map: buildAddTexture('Add note', pal), transparent: true }));
  addMesh.position.set(startX + deskNotes.length * 2.5, 2.1, 0.4);
  addMesh.rotation.x = -0.25;
  addMesh.userData = { type: 'addNote' };
  deskGroup.add(addMesh);
  interactiveObjects.push(addMesh);
  noteMeshes.push(addMesh);
}
function rebuildTaskMeshes(pal) {
  taskMeshes.forEach(m => { removeFromInteractive(m); deskGroup.remove(m); });
  taskMeshes.length = 0;
  const startX = -6;
  deskTasks.forEach((t, i) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ map: buildTaskTexture(t.text, t.done, pal), transparent: true }));
    mesh.position.set(startX + i * 2.2, 0.9, 2.6);
    mesh.rotation.x = -0.2;
    mesh.userData = { type: 'taskCard', id: t.id };
    deskGroup.add(mesh);
    interactiveObjects.push(mesh);
    taskMeshes.push(mesh);
  });
  const addMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ map: buildAddTexture('Add task', pal), transparent: true }));
  addMesh.position.set(startX + deskTasks.length * 2.2, 0.9, 2.6);
  addMesh.rotation.x = -0.2;
  addMesh.userData = { type: 'addTask' };
  deskGroup.add(addMesh);
  interactiveObjects.push(addMesh);
  taskMeshes.push(addMesh);
}

function saveDesk() {
  try {
    localStorage.setItem('vita.notes', JSON.stringify(deskNotes));
    localStorage.setItem('vita.tasks', JSON.stringify(deskTasks));
  } catch (e) { }
}
function addDeskNote(text) {
  deskNotes.push({ id: Date.now() + Math.random(), text });
  rebuildNoteMeshes(VITA.scenePalette());
  saveDesk();
  return 'Note added to the desk.';
}
function addDeskTask(text) {
  deskTasks.push({ id: Date.now() + Math.random(), text, done: false });
  rebuildTaskMeshes(VITA.scenePalette());
  saveDesk();
  return 'Task added to the desk.';
}

try {
  const n = JSON.parse(localStorage.getItem('vita.notes') || 'null');
  if (n && n.length) deskNotes.push(...n);
} catch (e) { }
try {
  const t = JSON.parse(localStorage.getItem('vita.tasks') || 'null');
  if (t && t.length) deskTasks.push(...t);
} catch (e) { }
try {
  const saved = JSON.parse(localStorage.getItem('vita.rooms') || 'null');
  if (saved && saved.length) {
    saved.forEach(r => createRoom(r.x, r.z, r.label, r.w, r.d));
    roomAutoCount = saved.length;
  }
} catch (e) { }

const bubbles = [];
function spawnBubble(role, text) {
  const canvas = document.createElement('canvas'); canvas.width = 420; canvas.height = 180;
  const ctx = canvas.getContext('2d');
  const isUser = role === 'user';
  ctx.font = '500 24px IBM Plex Sans, sans-serif';
  ctx.fillStyle = isUser ? 'rgba(53,224,192,0.16)' : 'rgba(17,21,29,0.94)';
  roundRectPath(ctx, 4, 4, 412, 172, 18);
  ctx.fill();
  ctx.strokeStyle = isUser ? 'rgba(53,224,192,0.5)' : 'rgba(255,255,255,0.12)'; ctx.lineWidth = 3;
  roundRectPath(ctx, 4, 4, 412, 172, 18);
  ctx.stroke();
  ctx.fillStyle = isUser ? '#35e0c0' : '#e7edf3';
  const lines = wrapLines(ctx, text, 360, 5);
  let y = 44;
  lines.forEach(l => { ctx.fillText(l, 26, y); y += 32; });
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0 }));
  const stackIndex = bubbles.length % 4;
  sprite.scale.set(5, 2.1, 1);
  sprite.position.set(nzainOrb.position.x + (isUser ? 2.2 : -2.2), nzainOrb.position.y + 2.5 + stackIndex * 0.15, nzainOrb.position.z);
  scene.add(sprite);
  const record = { sprite, born: Date.now(), life: 7000 };
  bubbles.push(record);
}
function updateBubbles() {
  const now = Date.now();
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    const age = now - b.born;
    const t = age / b.life;
    if (t >= 1) { scene.remove(b.sprite); bubbles.splice(i, 1); continue; }
    b.sprite.material.opacity = t < 0.15 ? t / 0.15 : (t > 0.75 ? (1 - t) / 0.25 : 1);
    b.sprite.position.y += 0.003;
  }
}

let focusLabel = 'default overview';
let manualFocus = null;
function focusByName(target) {
  const t = String(target || '').toLowerCase().trim();
  if (!t || t === 'default' || t === 'home' || t === 'reset') { manualFocus = null; focusLabel = 'default overview'; return 'Camera reset to default overview.'; }
  if (t === 'nzain') { manualFocus = nzainOrb.position; focusLabel = 'NZAIN'; return 'Camera focused on NZAIN.'; }
  const av = avatars.find(a => a.userData.id === t || a.userData.avatar.name.toLowerCase() === t);
  if (av) { manualFocus = av.position; focusLabel = av.userData.avatar.name; return 'Camera focused on ' + av.userData.avatar.name + '.'; }
  const room = rooms.find(r => r.label.toLowerCase().includes(t));
  if (room) { manualFocus = room.mesh.position; focusLabel = room.label; return 'Camera focused on ' + room.label + '.'; }
  return 'No avatar or room matches "' + target + '".';
}

function handleObjectClick(obj) {
  const type = obj.userData.type;
  if (type === 'avatar') showProfile(obj.userData.avatar);
  else if (type === 'nzainOrb') { document.querySelector('[data-view="nzain"]').click(); }
  else if (type === 'room') { manualFocus = obj.position; focusLabel = obj.userData.label; }
  else if (type === 'visBase') { togglePlay(); }
  else if (type === 'visPrev') { prevTrack(); }
  else if (type === 'visNext') { nextTrack(); }
  else if (type === 'addNote') { openSpatialInput('Add note', '', text => addDeskNote(text)); }
  else if (type === 'addTask') { openSpatialInput('Add task', '', text => addDeskTask(text)); }
  else if (type === 'noteCard') {
    const note = deskNotes.find(n => n.id === obj.userData.id);
    if (note) openSpatialInput('Edit note', note.text, text => { note.text = text; rebuildNoteMeshes(VITA.scenePalette()); saveDesk(); });
  }
  else if (type === 'taskCard') {
    const task = deskTasks.find(t => t.id === obj.userData.id);
    if (task) { task.done = !task.done; rebuildTaskMeshes(VITA.scenePalette()); saveDesk(); }
  }
}

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let pointerDownPos = null;
let pendingClickObj = null;
let dragStart = null;
let dragPreview = null;
const dragPreviewMat = new THREE.MeshStandardMaterial({ color: 0x35e0c0, transparent: true, opacity: 0.22 });

function castNDC(clientX, clientY) {
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
}
function groundHit(clientX, clientY) {
  castNDC(clientX, clientY);
  const hit = raycaster.intersectObject(ground)[0];
  return hit ? hit.point : null;
}

renderer.domElement.addEventListener('pointerdown', e => {
  if (isOverlayOpen()) return;
  pointerDownPos = { x: e.clientX, y: e.clientY };
  castNDC(e.clientX, e.clientY);
  const hit = raycaster.intersectObjects(interactiveObjects)[0];
  if (hit) { pendingClickObj = hit.object; dragStart = null; }
  else {
    pendingClickObj = null;
    const gp = groundHit(e.clientX, e.clientY);
    if (gp) dragStart = gp.clone();
  }
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!dragStart && !pendingClickObj) {
    camRot.y = ((e.clientX / window.innerWidth) * 2 - 1) * 0.5;
    camRot.x = (-(e.clientY / window.innerHeight) * 2 + 1) * 0.3;
  }
  if (!dragStart) return;
  const gp = groundHit(e.clientX, e.clientY);
  if (!gp) return;
  const minX = Math.min(dragStart.x, gp.x), maxX = Math.max(dragStart.x, gp.x);
  const minZ = Math.min(dragStart.z, gp.z), maxZ = Math.max(dragStart.z, gp.z);
  const w = Math.max(maxX - minX, 0.6), d = Math.max(maxZ - minZ, 0.6);
  if (!dragPreview) {
    dragPreview = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), dragPreviewMat);
    scene.add(dragPreview);
  }
  dragPreview.scale.set(w, 1, d);
  dragPreview.position.set((minX + maxX) / 2, 1, (minZ + maxZ) / 2);
});
renderer.domElement.addEventListener('pointerup', e => {
  const moved = pointerDownPos ? Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) : 0;
  if (pendingClickObj && moved < 8) handleObjectClick(pendingClickObj);
  else if (dragStart) {
    const gp = groundHit(e.clientX, e.clientY) || dragStart;
    const dist = Math.hypot(gp.x - dragStart.x, gp.z - dragStart.z);
    if (dist > 2.5) {
      const minX = Math.min(dragStart.x, gp.x), maxX = Math.max(dragStart.x, gp.x);
      const minZ = Math.min(dragStart.z, gp.z), maxZ = Math.max(dragStart.z, gp.z);
      roomAutoCount++;
      createRoom((minX + maxX) / 2, (minZ + maxZ) / 2, 'Room ' + roomAutoCount, Math.max(maxX - minX, 3), Math.max(maxZ - minZ, 3));
      addActivity('You created Room ' + roomAutoCount);
    }
  }
  if (dragPreview) { scene.remove(dragPreview); dragPreview = null; }
  pendingClickObj = null;
  dragStart = null;
  pointerDownPos = null;
});

let camRot = { x: 0, y: 0 };

function applySceneTheme(pal) {
  if (!pal) pal = VITA.scenePalette();
  scene.background = new THREE.Color(pal.bg);
  scene.fog = new THREE.Fog(pal.bg, 90, 150);
  ground.material.color.setHex(pal.ground);
  rebuildGrid(pal);
  orbMat.color.setHex(pal.accent);
  orbMat.emissive.setHex(pal.accent);
  ringMat.color.setHex(pal.accent);
  bars.forEach(b => { b.material.color.setHex(pal.accent); b.material.emissive.setHex(pal.accent); });
  visBaseMat.color.setHex(shadeNum(pal.bg, 0.06));
  deskMat.color.setHex(shadeNum(pal.bg, 0.04));
  dragPreviewMat.color.setHex(pal.accent);
  rebuildArrows(pal);
  calendarMesh.material = new THREE.MeshBasicMaterial({ map: buildCalendarTexture(pal), transparent: true });
  rebuildNoteMeshes(pal);
  rebuildTaskMeshes(pal);
}

VITA.onTheme(applySceneTheme);

function animate() {
  requestAnimationFrame(animate);
  const now = Date.now();
  avatars.forEach((o, i) => {
    o.position.y = o.userData.baseY + Math.sin(now * 0.001 + i) * 0.3;
    o.rotation.z += 0.004;
    if (o.userData.ring) o.userData.ring.rotation.z += 0.008;
  });
  if (spotlightId) {
    const a = findAvatarMesh(spotlightId);
    if (a && a.userData.ring) a.userData.ring.material.opacity = 0.75 + Math.sin(now * 0.006) * 0.2;
  }
  nzainOrb.rotation.y += 0.006;
  nzainRing.rotation.z += 0.01;
  let bass = 0;
  if (analyser && isPlaying) {
    analyser.getByteFrequencyData(freqData);
    bars.forEach((bar, i) => {
      const v = freqData[i * 2] || 0;
      const h = 0.4 + (v / 255) * 3.2;
      bar.scale.y += (h - bar.scale.y) * 0.25;
      bar.position.y = bar.scale.y * 0.5;
      bar.material.emissiveIntensity = 0.2 + (v / 255) * 0.8;
    });
    for (let i = 0; i < 8; i++) bass += freqData[i];
    bass = bass / 8 / 255;
  } else {
    bars.forEach(bar => { bar.scale.y += (0.4 - bar.scale.y) * 0.1; bar.position.y = bar.scale.y * 0.5; });
  }
  const speakBoost = nzainSpeaking ? 0.6 : 0;
  nzainOrb.material.emissiveIntensity = 0.35 + bass * 0.6 + speakBoost;
  nzainOrb.scale.setScalar(1 + bass * 0.15 + (nzainSpeaking ? Math.sin(now * 0.01) * 0.06 : 0));
  updateBubbles();
  if (selectedAvatar) {
    const obj = avatars.find(a => a.userData.avatar === selectedAvatar);
    const pos = obj ? obj.position : null;
    if (pos) {
      const v = pos.clone();
      v.y += 1.8;
      v.project(camera);
      profileCard.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      profileCard.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    }
  }
  if (manualFocus) {
    const target = new THREE.Vector3(manualFocus.x + 9, manualFocus.y + 7, manualFocus.z + 9);
    camera.position.lerp(target, 0.06);
    camera.lookAt(manualFocus.x, manualFocus.y + 1, manualFocus.z);
  } else {
    const target = new THREE.Vector3(22 + camRot.y * 8, 17 + camRot.x * 5, 22 + camRot.y * -8);
    camera.position.lerp(target, 0.06);
    camera.lookAt(0, 3, 0);
  }
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});