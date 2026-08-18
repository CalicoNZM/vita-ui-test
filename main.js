function tickClock() {
  const d = new Date();
  document.getElementById('clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

let syncOn = true;
document.getElementById('syncChip').addEventListener('click', () => {
  syncOn = !syncOn;
  document.getElementById('syncDot').classList.toggle('on', syncOn);
});

const terminalDrawer = document.getElementById('terminalDrawer');
const nzainDrawer = document.getElementById('nzainDrawer');
const profileDrawer = document.getElementById('profileDrawer');
const themeDrawer = document.getElementById('themeDrawer');
const allDrawers = [terminalDrawer, nzainDrawer, profileDrawer, themeDrawer];

function closeDrawers() {
  allDrawers.forEach(d => d.classList.remove('open'));
}
function openDockView(view) {
  document.querySelectorAll('.dockBtn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  closeDrawers();
  if (view === 'profile') profileDrawer.classList.add('open');
  else if (view === 'terminal') terminalDrawer.classList.add('open');
  else if (view === 'nzain') nzainDrawer.classList.add('open');
  else if (view === 'theme') themeDrawer.classList.add('open');
}
document.querySelectorAll('.dockBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.view;
    const wasActive = btn.classList.contains('active');
    if (v === 'hub' || !wasActive) {
      openDockView(v);
      if (v === 'hub') { manualFocus = null; focusLabel = 'default overview'; }
    } else {
      closeDrawers();
      document.querySelectorAll('.dockBtn').forEach(b => b.classList.remove('active'));
      document.querySelector('[data-view="hub"]').classList.add('active');
      manualFocus = null;
      focusLabel = 'default overview';
    }
  });
});
document.getElementById('closeTerminal').addEventListener('click', () => { document.querySelector('[data-view="hub"]').click(); });
document.getElementById('closeNzain').addEventListener('click', () => { document.querySelector('[data-view="hub"]').click(); });
document.getElementById('closeProfile').addEventListener('click', () => { document.querySelector('[data-view="hub"]').click(); });
document.getElementById('closeTheme').addEventListener('click', () => { document.querySelector('[data-view="hub"]').click(); });

function isOverlayOpen() {
  return spatialOverlay.classList.contains('show') || allDrawers.some(d => d.classList.contains('open')) || profileCard.classList.contains('show');
}

let selectedAvatar = null;
const profileCard = document.getElementById('profileCard');
function showProfile(data) {
  if (!data) return;
  selectedAvatar = data;
  document.getElementById('pcName').textContent = data.name;
  document.getElementById('pcUsername').textContent = '@' + data.username;
  document.getElementById('pcBio').textContent = data.bio;
  document.getElementById('pcPresence').textContent = data.presence;
  document.getElementById('pcMood').textContent = data.mood;
  document.getElementById('pcRooms').textContent = data.hosted;
  document.getElementById('pcOpen').onclick = () => openAvatarProfile(data.id);
  profileCard.classList.add('show');
}
document.getElementById('pcClose').addEventListener('click', () => { selectedAvatar = null; profileCard.classList.remove('show'); });

let currentProfileId = null;

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'now';
  if (d < 3600000) return Math.floor(d / 60000) + 'm';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  return Math.floor(d / 86400000) + 'd';
}

function renderComments(id) {
  const cur = getAvatar(id);
  const list = document.getElementById('pfComments');
  list.innerHTML = '';
  const comments = (cur.comments || []).slice().reverse();
  if (!comments.length) {
    const e = document.createElement('div');
    e.className = 'pfEmpty';
    e.textContent = 'No comments yet — be the first.';
    list.appendChild(e);
    return;
  }
  comments.forEach(c => {
    const d = document.createElement('div');
    d.className = 'commentItem';
    d.innerHTML = '<div class="commentMeta"><b>' + escapeHTML(c.author) + '</b><span>' + timeAgo(c.ts) + '</span></div><div class="commentText">' + escapeHTML(c.text) + '</div>';
    list.appendChild(d);
  });
}

function renderActivity() {
  const list = document.getElementById('pfActivity');
  list.innerHTML = '';
  const acts = getActivity();
  if (!acts.length) {
    const e = document.createElement('div');
    e.className = 'pfEmpty';
    e.textContent = 'Nothing yet.';
    list.appendChild(e);
    return;
  }
  acts.forEach(a => {
    const d = document.createElement('div');
    d.className = 'actItem';
    d.innerHTML = '<span>' + timeAgo(a.ts) + '</span><div>' + escapeHTML(a.text) + '</div>';
    list.appendChild(d);
  });
}

function renderProfilePage(id) {
  const cur = getAvatar(id);
  if (!cur) return;
  currentProfileId = id;
  document.getElementById('pfCover').style.background = 'linear-gradient(135deg, ' + cur.hex + '66, ' + cur.hex + '22 55%, rgba(10,13,18,0.6))';
  document.getElementById('pfCover').style.border = '1px solid ' + cur.hex + 'aa';
  document.getElementById('pfName').textContent = cur.name;
  document.getElementById('pfUsername').textContent = '@' + cur.username;
  document.getElementById('pfMoodChip').textContent = cur.mood;
  document.getElementById('pfPresence').textContent = cur.presence;
  document.getElementById('pfHosted').textContent = cur.hosted;
  document.getElementById('pfAbout').textContent = cur.about || cur.bio;

  document.getElementById('pfInterests').innerHTML = (cur.interests || []).map(i => '<span class="pfTag">' + escapeHTML(i) + '</span>').join('');
  document.getElementById('pfMusic').innerHTML = (cur.music || []).map(m => '<div class="pfMusicItem"><span class="pfMusicDot" style="background:' + cur.hex + ';box-shadow:0 0 6px ' + cur.hex + '"></span>' + escapeHTML(m) + '</div>').join('');

  const fb = document.getElementById('pfFriendBtn');
  const status = friendStatus(id);
  fb.className = 'pfActionBtn';
  if (status === 'friends') { fb.textContent = 'Friends'; fb.classList.add('isFriend'); }
  else if (status === 'pending') { fb.textContent = 'Request sent'; fb.classList.add('pending'); }
  else if (status === 'pending-in') { fb.textContent = 'Accept request'; fb.classList.add('pendingIn'); }
  else { fb.textContent = 'Add friend'; }
  fb.onclick = () => {
    const s = friendStatus(id);
    if (s === 'friends' || s === 'pending') return;
    if (s === 'pending-in') acceptFriend(id); else sendFriendRequest(id);
    renderProfilePage(id);
    renderActivity();
  };

  const g8 = document.getElementById('pfTop8');
  g8.innerHTML = '';
  const t8 = (cur.friends || []).slice(0, 8);
  if (!t8.length) {
    const e = document.createElement('div');
    e.className = 'pfEmpty';
    e.textContent = 'No friends yet.';
    g8.appendChild(e);
  }
  t8.forEach(fid => {
    const f = getAvatar(fid);
    if (!f) return;
    const cell = document.createElement('button');
    cell.className = 'top8Cell';
    cell.innerHTML = '<span class="top8Dot" style="background:' + f.hex + '"></span><span>' + f.name + '</span>';
    cell.onclick = () => openAvatarProfile(fid);
    g8.appendChild(cell);
  });

  const mrow = document.getElementById('pfMoodRow');
  mrow.innerHTML = '';
  MOODS.forEach(m => {
    const b = document.createElement('button');
    b.className = 'moodChip' + (m === cur.mood ? ' active' : '');
    b.textContent = m;
    b.onclick = () => { setMood(id, m); renderProfilePage(id); renderActivity(); };
    mrow.appendChild(b);
  });

  renderComments(id);
  renderActivity();
}

function openAvatarProfile(id) {
  const mesh = findAvatarMesh(id);
  const data = mesh ? mesh.userData.avatar : getAvatar(id);
  if (!data) return;
  openDockView('profile');
  renderProfilePage(id);
  setAvatarSpotlight(id);
  focusByName(data.name);
  profileCard.classList.remove('show');
  selectedAvatar = null;
}

function postComment() {
  const inp = document.getElementById('pfCommentInput');
  const v = inp.value.trim();
  if (!v || !currentProfileId) return;
  addComment(currentProfileId, v);
  inp.value = '';
  renderProfilePage(currentProfileId);
}
document.getElementById('pfCommentPost').addEventListener('click', postComment);
document.getElementById('pfCommentInput').addEventListener('keydown', e => { if (e.key === 'Enter') postComment(); });

document.getElementById('pfShare').addEventListener('click', e => {
  if (!currentProfileId) return;
  const url = location.origin + location.pathname + '?profile=' + currentProfileId;
  if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => { });
  const btn = e.currentTarget;
  const old = btn.innerHTML;
  btn.textContent = 'Link copied';
  setTimeout(() => { btn.innerHTML = old; }, 1500);
});

function renderThemeDrawer() {
  const grid = document.getElementById('themeGrid');
  grid.innerHTML = '';
  const active = VITA.getTheme();
  VITA.THEMES.forEach(t => {
    const s = document.createElement('button');
    s.className = 'themeSwatch' + (t.id === active ? ' active' : '');
    s.style.background = t.vars['--bg'];
    s.style.setProperty('--acc', t.vars['--accent']);
    s.innerHTML = '<span class="tsAccent"></span><span class="tsName">' + t.name + '</span>';
    s.onclick = () => { VITA.applyTheme(t.id); renderThemeDrawer(); };
    grid.appendChild(s);
  });
  const c = VITA.getCustomColors();
  ['bg', 'accent', 'magenta', 'text'].forEach(key => {
    const inp = document.getElementById('cust-' + key);
    if (inp) inp.value = c[key];
  });
}
['bg', 'accent', 'magenta', 'text'].forEach(key => {
  const inp = document.getElementById('cust-' + key);
  if (inp) {
    inp.addEventListener('input', () => {
      VITA.setCustomColors({ [key]: inp.value });
      VITA.applyTheme('custom');
      renderThemeDrawer();
    });
  }
});
document.getElementById('themeShare').addEventListener('click', e => {
  const active = VITA.getTheme();
  let url = location.origin + location.pathname;
  if (active === 'custom') {
    const c = VITA.getCustomColors();
    url += '?theme=custom&bg=' + encodeURIComponent(c.bg) + '&accent=' + encodeURIComponent(c.accent) + '&magenta=' + encodeURIComponent(c.magenta) + '&text=' + encodeURIComponent(c.text);
  } else {
    url += '?theme=' + active;
  }
  if (navigator.clipboard) navigator.clipboard.writeText(url).catch(() => { });
  const btn = e.currentTarget;
  const old = btn.innerHTML;
  btn.textContent = 'Theme link copied';
  setTimeout(() => { btn.innerHTML = old; }, 1500);
});

const spatialOverlay = document.getElementById('spatialOverlay');
const spatialTextarea = document.getElementById('spatialTextarea');
const spatialPrompt = document.getElementById('spatialPrompt');
let spatialSubmitHandler = null;
function openSpatialInput(promptText, initial, onSubmit) {
  spatialPrompt.textContent = promptText;
  spatialTextarea.value = initial || '';
  spatialSubmitHandler = onSubmit;
  spatialOverlay.classList.add('show');
  setTimeout(() => spatialTextarea.focus(), 50);
}
document.getElementById('siCancel').addEventListener('click', () => spatialOverlay.classList.remove('show'));
document.getElementById('siConfirm').addEventListener('click', () => {
  const val = spatialTextarea.value.trim();
  spatialOverlay.classList.remove('show');
  if (val && spatialSubmitHandler) spatialSubmitHandler(val);
});

(function initApp() {
  tickClock();
  setInterval(tickClock, 15000);
  document.getElementById('syncDot').classList.add('on');
  renderThemeDrawer();
  const prof = new URLSearchParams(location.search).get('profile');
  if (prof) {
    setTimeout(() => openAvatarProfile(prof.toLowerCase()), 600);
  }
  animate();
})();