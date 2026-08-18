window.VITA = window.VITA || {};

function hexToRgb(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const v = parseInt(h, 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}
function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function shade(hex, amt) {
  const c = hexToRgb(hex);
  const f = v => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return rgbToHex(f(c.r), f(c.g), f(c.b));
}
function rgba(hex, a) {
  const c = hexToRgb(hex);
  return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + a + ')';
}
function hexToNum(hex) {
  const c = hexToRgb(hex);
  return (c.r << 16) | (c.g << 8) | c.b;
}

const VITA_THEMES = [
  {
    id: 'vita', name: 'VITA',
    vars: { '--bg': '#0a0d12', '--panel': '#11151d', '--panel-2': '#161b25', '--line': 'rgba(255,255,255,0.07)', '--accent': '#35e0c0', '--magenta': '#ff5c8a', '--text': '#e7edf3', '--text-dim': '#7a8494', '--text-dimmer': '#454c58' },
    scene: { bg: 0x0a0d12, ground: 0x141926, gridA: 0x22c9ae, gridB: 0x1a2230, accent: 0x35e0c0, magenta: 0xff5c8a }
  },
  {
    id: 'synthwave', name: 'Synthwave',
    vars: { '--bg': '#12061a', '--panel': '#1c0f28', '--panel-2': '#241438', '--line': 'rgba(255,255,255,0.09)', '--accent': '#ff5c8a', '--magenta': '#9b6bff', '--text': '#ffdceb', '--text-dim': '#b78aa8', '--text-dimmer': '#6d4f63' },
    scene: { bg: 0x12061a, ground: 0x1c0f28, gridA: 0xff5c8a, gridB: 0x2a1636, accent: 0xff5c8a, magenta: 0x9b6bff }
  },
  {
    id: 'midnight', name: 'Midnight',
    vars: { '--bg': '#060b14', '--panel': '#0d1524', '--panel-2': '#131e33', '--line': 'rgba(255,255,255,0.08)', '--accent': '#4fa3ff', '--magenta': '#9b6bff', '--text': '#dceaff', '--text-dim': '#7d8fb0', '--text-dimmer': '#46536e' },
    scene: { bg: 0x060b14, ground: 0x0d1524, gridA: 0x4fa3ff, gridB: 0x152238, accent: 0x4fa3ff, magenta: 0x9b6bff }
  },
  {
    id: 'terminal', name: 'Terminal',
    vars: { '--bg': '#0a0f0a', '--panel': '#0f1710', '--panel-2': '#142014', '--line': 'rgba(120,255,150,0.10)', '--accent': '#35e07a', '--magenta': '#ff5c5c', '--text': '#d7ffdd', '--text-dim': '#6fae7d', '--text-dimmer': '#3f6248' },
    scene: { bg: 0x0a0f0a, ground: 0x0f1710, gridA: 0x35e07a, gridB: 0x132112, accent: 0x35e07a, magenta: 0xff5c5c }
  },
  {
    id: 'paper', name: 'Paper',
    vars: { '--bg': '#eae4d8', '--panel': '#f6f2e9', '--panel-2': '#efe9dc', '--line': 'rgba(0,0,0,0.09)', '--accent': '#9a3dd0', '--magenta': '#ff5c8a', '--text': '#2a2433', '--text-dim': '#6d6474', '--text-dimmer': '#a89eae' },
    scene: { bg: 0xeae4d8, ground: 0xd9d2c4, gridA: 0x9a3dd0, gridB: 0xcfc6b6, accent: 0x9a3dd0, magenta: 0xff5c8a }
  }
];

let currentThemeId = 'vita';
let customColors = { bg: '#0a0d12', accent: '#35e0c0', magenta: '#ff5c8a', text: '#e7edf3' };
const themeListeners = [];
let scenePalette = VITA_THEMES[0].scene;

function buildCustomVars(c) {
  return {
    '--bg': c.bg,
    '--panel': shade(c.bg, 0.05),
    '--panel-2': shade(c.bg, 0.09),
    '--line': rgba(c.text, 0.10),
    '--accent': c.accent,
    '--magenta': c.magenta,
    '--text': c.text,
    '--text-dim': rgba(c.text, 0.5),
    '--text-dimmer': rgba(c.text, 0.3)
  };
}
function customScene(c) {
  return {
    bg: hexToNum(c.bg),
    ground: hexToNum(shade(c.bg, 0.06)),
    gridA: hexToNum(c.accent),
    gridB: hexToNum(shade(c.bg, 0.10)),
    accent: hexToNum(c.accent),
    magenta: hexToNum(c.magenta)
  };
}

function resolveTheme() {
  if (currentThemeId === 'custom') return { vars: buildCustomVars(customColors), scene: customScene(customColors) };
  return VITA_THEMES.find(t => t.id === currentThemeId) || VITA_THEMES[0];
}

VITA.applyTheme = function (id, opts) {
  currentThemeId = id;
  const t = resolveTheme();
  const vars = Object.assign({}, t.vars);
  vars['--accent-soft'] = rgba(vars['--accent'], 0.13);
  vars['--accent-dim'] = rgba(vars['--accent'], 0.35);
  const root = document.documentElement;
  Object.keys(vars).forEach(k => root.style.setProperty(k, vars[k]));
  scenePalette = t.scene;
  themeListeners.forEach(cb => { try { cb(scenePalette); } catch (e) { } });
  if (!opts || opts.persist !== false) {
    try {
      localStorage.setItem('vita.theme', JSON.stringify({ id: currentThemeId, custom: currentThemeId === 'custom' ? customColors : null }));
    } catch (e) { }
  }
};
VITA.getTheme = function () { return currentThemeId; };
VITA.setCustomColors = function (c) { customColors = Object.assign({}, customColors, c); };
VITA.getCustomColors = function () { return Object.assign({}, customColors); };
VITA.scenePalette = function () { return scenePalette; };
VITA.onTheme = function (cb) { themeListeners.push(cb); cb(scenePalette); return cb; };
VITA.THEMES = VITA_THEMES;

(function initTheme() {
  let id = 'vita';
  let custom = null;
  const params = new URLSearchParams(location.search);
  const param = params.get('theme');
  if (param) {
    id = param;
    if (param === 'custom') {
      const p = {
        bg: params.get('bg'),
        accent: params.get('accent'),
        magenta: params.get('magenta'),
        text: params.get('text')
      };
      if (p.bg && p.accent && p.text) {
        customColors = { bg: p.bg, accent: p.accent, magenta: p.magenta || customColors.magenta, text: p.text };
        custom = Object.assign({}, customColors);
      }
    }
  } else {
    try {
      const s = JSON.parse(localStorage.getItem('vita.theme') || 'null');
      if (s && s.id) { id = s.id; if (s.custom) custom = s.custom; }
    } catch (e) { }
  }
  if (custom) customColors = Object.assign({}, customColors, custom);
  VITA.applyTheme(VITA_THEMES.some(t => t.id === id) ? id : 'vita', { persist: false });
})();