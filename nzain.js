const NZAIN_SYSTEM = 'You are NZAIN (Neural Zen Artificial Implementation Network), an embedded AI assistant inside VITA UI TEST, a 3D spatial social hub. Respond concisely. When the user asks you to do spatial or social actions, respond naturally AND include one of these commands in your response:\n[FOCUS: avatar_name|room_name|nzain|default]\n[TRACK: track_title_or_number]\n[ROOM: room_name]\n[NOTE: note_text]\n[MOOD: avatar_name|mood]\n[THEME: theme_id]\nAvailable themes: vita, synthwave, midnight, terminal, paper. Example: "Let me focus on Luna for you. [FOCUS: Luna]" or "I\'ll spawn a room called Studio. [ROOM: Studio]" or "Kaze is feeling chill now. [MOOD: Kaze|Chill]". Include the command even if it fails — I\'ll handle errors.';

function parseNZAINCommands(text) {
  const focusMatch = text.match(/\[FOCUS:\s*([^\]]+)\]/);
  if (focusMatch) focusByName(focusMatch[1].trim());
  const trackMatch = text.match(/\[TRACK:\s*([^\]]+)\]/);
  if (trackMatch) switchTrackByQuery(trackMatch[1].trim());
  const roomMatch = text.match(/\[ROOM:\s*([^\]]+)\]/);
  if (roomMatch) spawnRoomByName(roomMatch[1].trim());
  const noteMatch = text.match(/\[NOTE:\s*([^\]]+)\]/);
  if (noteMatch) addDeskNote(noteMatch[1].trim());
  const moodMatch = text.match(/\[MOOD:\s*([^\]|]+)\|([^\]]+)\]/);
  if (moodMatch) {
    const name = moodMatch[1].trim().toLowerCase();
    const av = findAvatarMesh(name) || avatars.find(a => a.userData.avatar.name.toLowerCase() === name);
    const mood = moodMatch[2].trim();
    if (av && MOODS.includes(mood)) {
      setMood(av.userData.id, mood);
      spawnBubble('nzain', av.userData.avatar.name + ' is now ' + mood);
      renderProfilePage(av.userData.id);
    }
  }
  const themeMatch = text.match(/\[THEME:\s*([^\]]+)\]/);
  if (themeMatch) {
    const id = themeMatch[1].trim().toLowerCase();
    if (VITA.THEMES.some(t => t.id === id)) {
      VITA.applyTheme(id);
      renderThemeDrawer();
    }
  }
}

function buildContext() {
  const roomList = rooms.map(r => r.label).join(', ') || 'none';
  const noteList = deskNotes.map(n => n.text).join(' | ') || 'none';
  const taskList = deskTasks.map(t => (t.done ? '[done] ' : '') + t.text).join(' | ') || 'none';
  const profileList = AVATAR_DEFAULTS.map(a => {
    const p = getAvatar(a.id);
    return p.name + ' (mood: ' + p.mood + ', friends: ' + p.friends.length + ')';
  }).join(', ');
  return 'Rooms in the grid: ' + roomList + '\nDesk notes: ' + noteList + '\nDesk tasks: ' + taskList +
    '\nProfiles: ' + profileList +
    '\nCompiler language: ' + activeLang + '\nCompiler code:\n' + codeStore[activeLang] +
    '\nNow playing: ' + playlist[curTrack].title + ' (' + (isPlaying ? 'playing' : 'paused') + ')\nCamera focus: ' + focusLabel +
    '\nCurrent theme: ' + VITA.getTheme();
}

const proxyFromParam = new URLSearchParams(location.search).get('proxy');
let proxyFromStorage = '';
try { proxyFromStorage = localStorage.getItem('nzainProxy') || ''; } catch (e) { }
const NZAIN_PROXY = proxyFromParam || proxyFromStorage || '/api/nzain';

async function callNZAIN(payload) {
  const res = await fetch(NZAIN_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'groq/compound',
      messages: payload.messages,
      max_tokens: payload.max_tokens || 1000,
      temperature: 0.7
    })
  });
  if (!res.ok) {
    let msg = 'Upstream error ' + res.status;
    try { const e = await res.json(); if (e && e.error) msg = e.error; } catch (err) { }
    throw new Error(msg);
  }
  const data = await res.json();
  return data.content || '';
}

const nzainHistory = [];
let nzainBusy = false;
const nzainStatus = document.getElementById('nzainStatus');

async function sendToNZAIN() {
  const input = document.getElementById('nzainInput');
  const text = input.value.trim();
  if (!text || nzainBusy) return;
  input.value = '';
  spawnBubble('user', text);
  nzainHistory.push({ role: 'user', content: text });
  nzainBusy = true;
  nzainStatus.textContent = 'NZAIN is thinking…';
  try {
    const payload = { max_tokens: 1000, messages: [{ role: 'system', content: NZAIN_SYSTEM + '\n\nCurrent spatial context:\n' + buildContext() }, ...nzainHistory] };
    const textOut = await callNZAIN(payload);
    if (textOut) {
      spawnBubble('nzain', textOut);
      speak(textOut);
      parseNZAINCommands(textOut);
    }
    nzainHistory.push({ role: 'assistant', content: textOut });
  } catch (err) {
    spawnBubble('nzain', 'Connection failed. NZAIN could not respond.');
  }
  nzainBusy = false;
  nzainStatus.textContent = 'Neural Zen Artificial Implementation Network';
}

document.getElementById('nzainSend').addEventListener('click', sendToNZAIN);
document.getElementById('nzainInput').addEventListener('keydown', e => { if (e.key === 'Enter') sendToNZAIN(); });