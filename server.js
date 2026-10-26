// AAPC website server: serves the static frontend in /public and a small JSON API.
// Content (articles, events, magazines, eboard) lives in /data as JSON files.
// Form submissions (feedback, topic requests, newsletter) are appended to /storage.

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const STORAGE_DIR = path.join(__dirname, 'storage');
// Placeholder paywall: members unlock magazines with an access code.
// Replace with real payments (e.g. Stripe Checkout) before charging anyone.
const MAGAZINE_ACCESS_CODE = process.env.MAGAZINE_ACCESS_CODE || 'AAPC-PREVIEW';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'change-me-in-production';

const app = express();
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------- helpers ----------

function readData(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${name}.json`), 'utf8'));
}

function appendSubmission(name, entry) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const file = path.join(STORAGE_DIR, `${name}.json`);
  const list = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  list.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...entry });
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
  return list;
}

function clean(value, max = 2000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACEHOLDER_BODY = [
  'This is placeholder article text. Once the editorial team publishes this piece, the full story will appear here — personal essays, interviews, poetry, photo stories and more from the AAPC community.',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
];

function isPublished(article, now = new Date()) {
  return new Date(article.publishDate) <= now;
}

function summarize(article) {
  const { content, images, ...rest } = article;
  return { ...rest, mainGraphic: article.mainGraphic || `/placeholder/${article.id}.svg` };
}

function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
  return payload.exp > Date.now() ? payload : null;
}

// ---------- site / eboard / years ----------

app.get('/api/site', (req, res) => res.json(readData('site')));
app.get('/api/eboard', (req, res) => res.json(readData('eboard')));
app.get('/api/years', (req, res) => res.json(readData('years')));

// ---------- articles ----------

// GET /api/articles?year=2026&month=10&topic=Identity&featured=true
app.get('/api/articles', (req, res) => {
  const { year, month, topic, featured } = req.query;
  let list = readData('articles').filter((a) => isPublished(a));
  if (year) list = list.filter((a) => new Date(a.publishDate).getFullYear() === Number(year));
  if (month) list = list.filter((a) => new Date(a.publishDate).getMonth() + 1 === Number(month));
  if (topic) list = list.filter((a) => a.topic.toLowerCase() === String(topic).toLowerCase());
  if (featured === 'true') list = list.filter((a) => a.featured);
  list.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  res.json(list.map(summarize));
});

app.get('/api/articles/:id', (req, res) => {
  const article = readData('articles').find((a) => a.id === req.params.id);
  if (!article || !isPublished(article)) return res.status(404).json({ error: 'Article not found' });
  res.json({
    ...summarize(article),
    content: article.content && article.content.length ? article.content : PLACEHOLDER_BODY,
    images: (article.images || []).map((img, i) => ({
      ...img,
      src: img.src || `/placeholder/${article.id}-img${i + 1}.svg`
    }))
  });
});

// Year -> month -> count tree for the archive sidebar, plus the topic list.
app.get('/api/archive', (req, res) => {
  const tree = {};
  const topics = new Set();
  for (const a of readData('articles').filter((x) => isPublished(x))) {
    const d = new Date(a.publishDate);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    tree[y] = tree[y] || {};
    tree[y][m] = (tree[y][m] || 0) + 1;
    topics.add(a.topic);
  }
  res.json({ tree, topics: [...topics].sort() });
});

// ---------- events / calendar ----------

// GET /api/events?year=2026&month=10
app.get('/api/events', (req, res) => {
  const { year, month } = req.query;
  let list = readData('events');
  if (year) list = list.filter((e) => new Date(e.start).getFullYear() === Number(year));
  if (month) list = list.filter((e) => new Date(e.start).getMonth() + 1 === Number(month));
  list.sort((a, b) => new Date(a.start) - new Date(b.start));
  res.json(list);
});

// ---------- countdowns ----------

// Next scheduled (unpublished) article and next magazine release.
app.get('/api/countdowns', (req, res) => {
  const now = new Date();
  const nextArticle = readData('articles')
    .filter((a) => !isPublished(a, now))
    .sort((a, b) => new Date(a.publishDate) - new Date(b.publishDate))[0];
  const nextMagazine = readData('magazines')
    .filter((m) => new Date(m.releaseDate) > now)
    .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))[0];
  res.json({
    article: nextArticle
      ? { title: nextArticle.title, topic: nextArticle.topic, author: nextArticle.author, releaseDate: nextArticle.publishDate }
      : null,
    magazine: nextMagazine
      ? { id: nextMagazine.id, title: nextMagazine.title, theme: nextMagazine.theme, releaseDate: nextMagazine.releaseDate, cover: nextMagazine.cover || `/placeholder/${nextMagazine.id}.svg` }
      : null
  });
});

// ---------- magazines (paywalled) ----------

app.get('/api/magazines', (req, res) => {
  const now = new Date();
  const list = readData('magazines')
    .map(({ fullContent, ...m }) => ({
      ...m,
      cover: m.cover || `/placeholder/${m.id}.svg`,
      released: new Date(m.releaseDate) <= now
    }))
    .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
  res.json(list);
});

app.post('/api/magazines/unlock', (req, res) => {
  const code = clean(req.body.code, 100);
  if (code !== MAGAZINE_ACCESS_CODE) return res.status(401).json({ error: 'That access code is not valid.' });
  const token = signToken({ role: 'member', exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
  res.json({ token });
});

app.get('/api/magazines/:id/read', (req, res) => {
  const mag = readData('magazines').find((m) => m.id === req.params.id);
  if (!mag) return res.status(404).json({ error: 'Magazine not found' });
  if (new Date(mag.releaseDate) > new Date()) return res.status(403).json({ error: 'This issue has not been released yet.' });
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (mag.paywalled && !verifyToken(token)) return res.status(401).json({ error: 'Members only — unlock to read this issue.' });
  res.json({ id: mag.id, title: mag.title, fullContent: mag.fullContent || [] });
});

// ---------- forms ----------

app.post('/api/feedback', (req, res) => {
  const message = clean(req.body.message);
  if (message.length < 3) return res.status(400).json({ error: 'Please write a little feedback first.' });
  const email = clean(req.body.email, 200);
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email does not look right.' });
  appendSubmission('feedback', {
    name: clean(req.body.name, 100),
    email,
    category: clean(req.body.category, 50) || 'General',
    rating: Number(req.body.rating) || null,
    message
  });
  res.status(201).json({ ok: true });
});

app.post('/api/topic-requests', (req, res) => {
  const topic = clean(req.body.topic, 200);
  if (topic.length < 3) return res.status(400).json({ error: 'Please describe the topic you want covered.' });
  appendSubmission('topic-requests', {
    topic,
    details: clean(req.body.details),
    category: clean(req.body.category, 50),
    name: clean(req.body.name, 100)
  });
  res.status(201).json({ ok: true });
});

app.post('/api/newsletter', (req, res) => {
  const email = clean(req.body.email, 200).toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  const file = path.join(STORAGE_DIR, 'newsletter.json');
  const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  if (existing.some((s) => s.email === email)) return res.json({ ok: true, already: true });
  appendSubmission('newsletter', { email });
  res.status(201).json({ ok: true });
});

// ---------- placeholder graphics ----------

// Generates a scrapbook-style SVG so placeholder articles/magazines have art.
const PALETTES = [
  ['#c8e2c2', '#2f5e34', '#ec6fa8'],
  ['#f7d6e4', '#b03a74', '#8fbf7f'],
  ['#f5e9d4', '#5b4a3a', '#f2c94c'],
  ['#dfe7f2', '#3d4f7a', '#ec6fa8'],
  ['#e9f1d0', '#5e7d2a', '#f29fc5'],
  ['#d9d2e9', '#4a3d6b', '#c8e2c2']
];

app.get('/placeholder/:seed.svg', (req, res) => {
  const seed = [...req.params.seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [bg, ink, accent] = PALETTES[seed % PALETTES.length];
  const rot = (seed % 14) - 7;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs><pattern id="d" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="${ink}" opacity=".12"/></pattern></defs>
  <rect width="800" height="600" fill="${bg}"/><rect width="800" height="600" fill="url(#d)"/>
  <g transform="rotate(${rot} 400 300)">
    <rect x="190" y="120" width="420" height="330" fill="#fffdf7" stroke="${ink}" stroke-opacity=".25"/>
    <rect x="215" y="145" width="370" height="230" fill="${accent}" opacity=".55"/>
    <path d="M400 190 C430 240 430 290 400 330 C370 290 370 240 400 190Z" fill="#fff" opacity=".9"/>
    <path d="M400 330 C350 310 320 270 318 230 C360 245 390 280 400 330Z" fill="#fff" opacity=".75"/>
    <path d="M400 330 C450 310 480 270 482 230 C440 245 410 280 400 330Z" fill="#fff" opacity=".75"/>
    <rect x="300" y="105" width="200" height="34" fill="${ink}" opacity=".18" transform="rotate(-4 400 122)"/>
  </g>
  <text x="400" y="525" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="${ink}" letter-spacing="6">AAPC · PLACEHOLDER</text>
</svg>`;
  res.type('image/svg+xml').set('Cache-Control', 'public, max-age=86400').send(svg);
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`AAPC site running at http://localhost:${PORT}`));
