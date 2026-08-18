let voiceMuted = false;
let nzainSpeaking = false;

function speak(text) {
  if (voiceMuted || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  utter.onstart = () => { nzainSpeaking = true; };
  utter.onend = () => { nzainSpeaking = false; };
  utter.onerror = () => { nzainSpeaking = false; };
  window.speechSynthesis.speak(utter);
}

document.getElementById('voiceToggle').addEventListener('click', e => {
  voiceMuted = !voiceMuted;
  e.currentTarget.classList.toggle('active', !voiceMuted);
  if (voiceMuted) window.speechSynthesis.cancel();
});

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;
let listening = false;
const micBtn = document.getElementById('micBtn');
if (SpeechRecognitionImpl) {
  recognizer = new SpeechRecognitionImpl();
  recognizer.continuous = false;
  recognizer.interimResults = false;
  recognizer.lang = 'en-US';
  recognizer.onstart = () => { listening = true; micBtn.classList.add('listening'); };
  recognizer.onend = () => { listening = false; micBtn.classList.remove('listening'); };
  recognizer.onerror = () => { listening = false; micBtn.classList.remove('listening'); };
  recognizer.onresult = e => {
    const transcript = e.results[0][0].transcript;
    document.getElementById('nzainInput').value = transcript;
    sendToNZAIN();
  };
  micBtn.addEventListener('click', () => {
    if (listening) { recognizer.stop(); return; }
    try { recognizer.start(); } catch (err) { }
  });
} else {
  micBtn.style.opacity = '0.35';
}