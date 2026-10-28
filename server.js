// AAPC website server: serves the static frontend in /public and a small JSON API.
// Content (articles, events, magazines, eboard) lives in /data as JSON files.
// Form submissions (feedback, topic requests, newsletter) are appended to /storage.
// The query logic is shared with the browser's static mode via public/js/content.js.

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const content = require('./public/js/content');

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
app.get('/api/articles', (req, res) => res.json(content.listArticles(readData('articles'), req.query)));

app.get('/api/articles/:id', (req, res) => {
  const article = content.getArticle(readData('articles'), req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

app.get('/api/archive', (req, res) => res.json(content.archive(readData('articles'))));

// ---------- events / calendar ----------

// GET /api/events?year=2026&month=10
app.get('/api/events', (req, res) => res.json(content.listEvents(readData('events'), req.query)));

// ---------- countdowns ----------

app.get('/api/countdowns', (req, res) => res.json(content.countdowns(readData('articles'), readData('magazines'))));

// ---------- magazines (paywalled) ----------

app.get('/api/magazines', (req, res) => res.json(content.listMagazines(readData('magazines'))));

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

app.post('/api/suggestions', (req, res) => {
  const suggestion = clean(req.body.suggestion);
  if (suggestion.length < 3) return res.status(400).json({ error: 'Please write a suggestion first.' });
  const email = clean(req.body.email, 200);
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'That email does not look right.' });
  appendSubmission('suggestions', { suggestion, name: clean(req.body.name, 100), email });
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

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log(`AAPC site running at http://localhost:${PORT}`));
