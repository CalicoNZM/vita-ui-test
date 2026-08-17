const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8000;
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'groq/compound';
const MAX_BODY = 1024 * 1024;
const UPSTREAM_TIMEOUT = 45000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2'
};

(function loadEnv() {
  try {
    const text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    text.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eq = line.indexOf('=');
      if (eq < 0) return;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (process.env[k] === undefined) process.env[k] = v;
    });
  } catch (e) { /* no .env file */ }
})();

const API_KEY = process.env.GROQ_API_KEY || '';
const PUBLIC_DIR = __dirname;

function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function applyCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) throw new Error('messages must be an array');
  return messages.map(m => {
    let content = m.content;
    if (Array.isArray(content)) {
      content = content
        .filter(b => b && b.type === 'text' && typeof b.text === 'string')
        .map(b => ({ type: 'text', text: b.text }))
        .join('');
    }
    if (typeof content !== 'string') throw new Error('message content must be a string');
    return { role: m.role === 'assistant' || m.role === 'user' || m.role === 'system' ? m.role : 'user', content };
  });
}

async function proxyToGroq(body) {
  if (!API_KEY) throw Object.assign(new Error('GROQ_API_KEY is not set. Add it to .env or the environment.'), { status: 500 });

  const messages = normalizeMessages(body.messages);
  const payload = {
    model: body.model || DEFAULT_MODEL,
    messages,
    max_tokens: Math.min(parseInt(body.max_tokens, 10) || 1000, 4096),
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.7
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT);
  let res;
  try {
    res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw Object.assign(new Error('Upstream request timed out.'), { status: 504 });
    throw Object.assign(new Error('Could not reach Groq: ' + e.message), { status: 502 });
  }
  clearTimeout(timer);

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch (e) { data = { raw }; }

  if (!res.ok) {
    const msg = (data && (data.error && data.error.message)) || ('Groq returned HTTP ' + res.status);
    throw Object.assign(new Error(msg), { status: res.status });
  }
  return data;
}

const PRIVATE = ['.env', '.env.example', 'server.js'];

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' || rel === '') rel = '/index.html';
  const base = rel.split('/').pop();
  if (base.startsWith('.') || PRIVATE.includes(base)) {
    sendJSON(res, 403, { ok: false, error: 'Forbidden' });
    return;
  }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep) && file !== path.join(PUBLIC_DIR, 'index.html')) {
    sendJSON(res, 403, { ok: false, error: 'Forbidden' });
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      if (err.code === 'ENOENT') sendJSON(res, 404, { ok: false, error: 'Not found' });
      else sendJSON(res, 500, { ok: false, error: err.message });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

function handler(req, res) {
  const origin = req.headers.origin;
  applyCors(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/nzain') {
    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', async () => {
      let parsed;
      try { parsed = JSON.parse(body || '{}'); }
      catch (e) { sendJSON(res, 400, { ok: false, error: 'Invalid JSON body' }); return; }
      try {
        const data = await proxyToGroq(parsed);
        const content = data.choices && data.choices[0] && data.choices[0].message
          ? data.choices[0].message.content
          : '';
        sendJSON(res, 200, { ok: true, content: content || '' });
      } catch (e) {
        sendJSON(res, e.status || 500, { ok: false, error: e.message || 'Proxy error' });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }

  sendJSON(res, 405, { ok: false, error: 'Method not allowed' });
}

function createServer() {
  return http.createServer(handler);
}

function startServer(port, cb) {
  const server = createServer();
  server.on('error', err => {
    if (cb) cb(err);
    else throw err;
  });
  server.listen(port, () => {
    const status = API_KEY ? 'key loaded' : 'NO KEY (set GROQ_API_KEY)';
    console.log('');
    console.log('  VITA UI TEST proxy server');
    console.log('  ---------------------------');
    console.log('  Local:      http://localhost:' + port + '/');
    console.log('  API:        POST http://localhost:' + port + '/api/nzain');
    console.log('  Groq key:   ' + status);
    console.log('  Start:      GROQ_API_KEY=your_key node server.js');
    console.log('');
    if (cb) cb(null, port);
  });
  return server;
}

if (require.main === module) {
  startServer(PORT, err => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
  });
}

module.exports = { createServer, startServer };