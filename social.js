const MOODS = ['Focused', 'Chill', 'Cozy', 'Hyped', 'Dreamy', 'Busy'];

const AVATAR_DEFAULTS = [
  {
    id: 'luna', name: 'Luna', username: 'luna.curates', hex: '#4a9eff',
    pos: [-11, 2, -6],
    bio: "Curating tonight's listening room. Usually mid-album.",
    about: 'Sound hunter and late-night DJ. If you find me in the Listening Lounge, bring a track you can\'t stop replaying. Happy to trade mixes.',
    presence: 'Active', mood: 'Focused', hosted: 'Listening Lounge',
    interests: ['Lo-fi', 'Record crates', 'Analog synths'],
    music: ['Cosmic Vibes', 'Midnight Tape', 'Neon Rain']
  },
  {
    id: 'kaze', name: 'Kaze', username: 'kaze.winds', hex: '#ff6b9d',
    pos: [11, 2, -8],
    bio: 'Marathoning a new series. Open to spoiler-free chat.',
    about: 'Binge-watcher and breadwinner of the Anime Corner. Will trade episode notes for coffee. Currently three arcs deep and committed.',
    presence: 'Idle', mood: 'Cozy', hosted: 'Anime Corner',
    interests: ['Shonen', 'Filler arcs', 'Con snacks'],
    music: ['City Pop', 'Anime OPs', 'Lo-fi']
  },
  {
    id: 'yuki', name: 'Yuki', username: 'yuki.built', hex: '#00d4ff',
    pos: [0, 2, 13],
    bio: 'Hosting a build tonight. Bring your own controller.',
    about: 'PC builder with zero chill and one (1) spare RGB cable. Build Night is every Friday. Bring airflow and a sense of adventure.',
    presence: 'Active', mood: 'Hyped', hosted: 'Build Night',
    interests: ['RGB', 'Thermals', 'Overclocking'],
    music: ['Hyperpop', 'Chiptune', 'Bass']
  }
];

const SOCIAL_SEED = {
  avatars: {
    luna: {
      mood: 'Focused', friends: ['kaze'],
      comments: [{ author: 'Kaze', text: 'that mix last night was unreal. straight into my rotation', ts: Date.now() - 86400000 * 2 }]
    },
    kaze: {
      mood: 'Cozy', friends: ['luna', 'yuki'],
      comments: [
        { author: 'Yuki', text: 'finished ep 34. you were right about the filler arc', ts: Date.now() - 86400000 },
        { author: 'Luna', text: 'con snacks on standby for friday', ts: Date.now() - 86400000 * 3 }
      ]
    },
    yuki: {
      mood: 'Hyped', friends: ['kaze'],
      comments: [{ author: 'Kaze', text: 'that cable management is illegal. in a good way', ts: Date.now() - 86400000 * 4 }]
    }
  },
  me: { friends: [], pendingOut: [] },
  activity: []
};

function clone(x) { return JSON.parse(JSON.stringify(x)); }

let socialState = SOCIAL_SEED;
try {
  socialState = JSON.parse(localStorage.getItem('vita.social')) || clone(SOCIAL_SEED);
} catch (e) { socialState = clone(SOCIAL_SEED); }

function saveSocial() {
  try { localStorage.setItem('vita.social', JSON.stringify(socialState)); } catch (e) { }
}

function getAvatar(id) {
  const d = AVATAR_DEFAULTS.find(a => a.id === id);
  if (!d) return null;
  const o = socialState.avatars[id] || {};
  const friends = o.friends || [];
  return Object.assign({}, d, {
    mood: o.mood || d.mood,
    friends: friends.slice(),
    pendingIn: (o.pendingIn || []).slice(),
    pendingOut: (o.pendingOut || []).slice(),
    comments: (o.comments || []).slice()
  });
}

function getAvatarList() { return AVATAR_DEFAULTS.map(a => getAvatar(a.id)); }

function friendStatus(id) {
  const me = socialState.me || { friends: [], pendingOut: [] };
  if (me.friends.includes(id)) return 'friends';
  if (me.pendingOut.includes(id)) return 'pending';
  const st = socialState.avatars[id] || {};
  if ((st.pendingIn || []).includes('you')) return 'pending-in';
  return 'none';
}

function sendFriendRequest(id) {
  const a = getAvatar(id);
  if (!a || friendStatus(id) !== 'none') return;
  const st = socialState.avatars[id] || (socialState.avatars[id] = {});
  st.pendingIn = (st.pendingIn || []);
  if (!st.pendingIn.includes('you')) st.pendingIn.push('you');
  const me = socialState.me = socialState.me || { friends: [], pendingOut: [] };
  if (!me.pendingOut.includes(id)) me.pendingOut.push(id);
  addActivity('You sent a friend request to ' + a.name);
  saveSocial();
}

function acceptFriend(id) {
  const a = getAvatar(id);
  if (!a) return;
  const st = socialState.avatars[id] || (socialState.avatars[id] = {});
  st.pendingIn = (st.pendingIn || []).filter(x => x !== 'you');
  const me = socialState.me = socialState.me || { friends: [], pendingOut: [] };
  me.pendingOut = (me.pendingOut || []).filter(x => x !== id);
  if (!me.friends.includes(id)) me.friends.push(id);
  addActivity('You and ' + a.name + ' are now friends');
  saveSocial();
}

function addComment(id, text) {
  const a = getAvatar(id);
  if (!a || !text) return;
  const st = socialState.avatars[id] || (socialState.avatars[id] = {});
  st.comments = st.comments || [];
  st.comments.push({ author: 'You', text: text.slice(0, 240), ts: Date.now() });
  addActivity('You commented on ' + a.name + "'s profile");
  saveSocial();
}

function setMood(id, mood) {
  const a = getAvatar(id);
  if (!a || !MOODS.includes(mood)) return;
  const st = socialState.avatars[id] || (socialState.avatars[id] = {});
  st.mood = mood;
  addActivity(a.name + ' is now ' + mood);
  saveSocial();
}

function addActivity(text) {
  socialState.activity = socialState.activity || [];
  socialState.activity.unshift({ text, ts: Date.now() });
  if (socialState.activity.length > 20) socialState.activity.length = 20;
  saveSocial();
}

function getActivity() {
  return (socialState.activity || []).slice(0, 20);
}