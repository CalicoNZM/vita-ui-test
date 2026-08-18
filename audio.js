const playlist = [
  { title: 'SoundHelix Session One', artist: 'Streaming Demo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { title: 'SoundHelix Session Two', artist: 'Streaming Demo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { title: 'SoundHelix Session Three', artist: 'Streaming Demo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { title: 'Cosmic Vibes', artist: 'Streaming Demo', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' }
];
let curTrack = 0;
let isPlaying = false;
const audio = new Audio();
audio.crossOrigin = 'anonymous';
audio.src = playlist[curTrack].url;
let audioCtx = null;
let analyser = null;
let freqData = null;
let audioGraphReady = false;

function ensureAudioGraph() {
  if (audioGraphReady) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 64;
  freqData = new Uint8Array(analyser.frequencyBinCount);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  audioGraphReady = true;
}

function togglePlay() {
  ensureAudioGraph();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (isPlaying) { audio.pause(); isPlaying = false; }
  else { audio.play().catch(() => { }); isPlaying = true; }
}
function playTrack(i) {
  ensureAudioGraph();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  curTrack = ((i % playlist.length) + playlist.length) % playlist.length;
  audio.src = playlist[curTrack].url;
  audio.play().catch(() => { });
  isPlaying = true;
}
function nextTrack() { playTrack(curTrack + 1); }
function prevTrack() { playTrack(curTrack - 1); }
function switchTrackByQuery(query) {
  const q = String(query || '').toLowerCase().trim();
  const asNum = parseInt(q, 10);
  if (!isNaN(asNum) && asNum >= 1 && asNum <= playlist.length) { playTrack(asNum - 1); addActivity('Now playing ' + playlist[asNum - 1].title); return 'Now playing ' + playlist[asNum - 1].title + '.'; }
  const idx = playlist.findIndex(t => t.title.toLowerCase().includes(q));
  if (idx >= 0) { playTrack(idx); addActivity('Now playing ' + playlist[idx].title); return 'Now playing ' + playlist[idx].title + '.'; }
  return 'No track matches "' + query + '".';
}
audio.addEventListener('ended', () => { nextTrack(); });