// Shared helpers + header/footer injection used by every page.

const NAV = [
  { href: '/', label: 'Home', page: 'home' },
  { href: '/eboard.html', label: 'Meet the Eboard', page: 'eboard' },
  { href: '/previous-years.html', label: 'Previous Years', page: 'years' },
  { href: '/magazine.html', label: 'More Info on Magazine', page: 'magazine' },
  { href: '/archives.html', label: 'Archives', page: 'archives' },
  { href: '/calendar.html', label: 'Calendar', page: 'calendar' },
  { href: '/feedback.html', label: 'Feedback', page: 'feedback' }
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ICONS = {
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
};

const STATIC_FORM_MSG = "Forms aren't live on this preview site yet — DM us on Instagram @udaapc in the meantime!";

async function loadJson(name) {
  const res = await fetch(`data/${name}.json`);
  if (!res.ok) throw new Error('Could not load site content.');
  return res.json();
}

// Static mode (GitHub Pages): answer the same API routes in the browser from data/*.json.
async function staticApi(path, options) {
  if (options.method && options.method !== 'GET') {
    if (path === '/api/magazines/unlock') throw new Error('Magazine purchases are coming soon!');
    throw new Error(STATIC_FORM_MSG);
  }
  const url = new URL(path, location.href);
  const query = Object.fromEntries(url.searchParams);
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  const C = window.AAPCContent;
  switch (parts[0]) {
    case 'site': case 'eboard': case 'years': return loadJson(parts[0]);
    case 'articles': {
      const articles = await loadJson('articles');
      if (!parts[1]) return C.listArticles(articles, query);
      const article = C.getArticle(articles, decodeURIComponent(parts[1]));
      if (!article) throw new Error('Article not found');
      return article;
    }
    case 'archive': return C.archive(await loadJson('articles'));
    case 'events': return C.listEvents(await loadJson('events'), query);
    case 'countdowns': return C.countdowns(await loadJson('articles'), await loadJson('magazines'));
    case 'magazines': {
      const mags = await loadJson('magazines');
      if (!parts[1]) return C.listMagazines(mags);
      const mag = mags.find((m) => m.id === parts[1]);
      if (!mag) throw new Error('Magazine not found');
      if (mag.paywalled) throw new Error('Members-only issues are coming soon to the site!');
      return mag;
    }
  }
  throw new Error('Not found');
}

// Form posts go to the Google Sheet (via the Apps Script in google-apps-script/) once
// site.json has a `sheetsEndpoint`; the value of `type` picks the sheet tab.
const SHEET_FORMS = {
  '/api/suggestions': 'suggestions',
  '/api/newsletter': 'newsletter',
  '/api/feedback': 'feedback',
  '/api/topic-requests': 'topic-requests'
};
let sitePromise;
const getSite = () => (sitePromise = sitePromise || api('/api/site'));

async function postToSheet(endpoint, type, body) {
  // text/plain keeps this a "simple" request, which Apps Script web apps accept cross-origin.
  const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ...body, type }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong — please try again.');
  return data;
}

async function api(path, options = {}) {
  if (options.method === 'POST' && SHEET_FORMS[path]) {
    const site = await getSite();
    if (site.sheetsEndpoint) return postToSheet(site.sheetsEndpoint, SHEET_FORMS[path], JSON.parse(options.body || '{}'));
  }
  if (window.AAPC_STATIC) return staticApi(path, options);
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Scrapbook-style placeholder art (data URI) for articles/magazines without a graphic yet.
const PALETTES = [
  ['#c8e2c2', '#2f5e34', '#ec6fa8'],
  ['#f7d6e4', '#b03a74', '#8fbf7f'],
  ['#f5e9d4', '#5b4a3a', '#f2c94c'],
  ['#dfe7f2', '#3d4f7a', '#ec6fa8'],
  ['#e9f1d0', '#5e7d2a', '#f29fc5'],
  ['#d9d2e9', '#4a3d6b', '#c8e2c2']
];

function placeholder(seedText) {
  const seed = [...String(seedText)].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
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
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function fmtDate(iso, opts = { month: 'long', day: 'numeric', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-US', opts);
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function articleCard(a) {
  return `<a class="card article-card" href="article.html?id=${encodeURIComponent(a.id)}">
    <div class="img"><img src="${esc(a.mainGraphic || placeholder(a.id))}" alt="" loading="lazy"></div>
    <div class="body">
      <span class="chip">${esc(a.topic)}</span>
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.excerpt)}</p>
      <div class="meta"><span>${esc(a.author)}</span>·<span>${fmtDate(a.publishDate, { month: 'short', day: 'numeric' })}</span></div>
    </div>
  </a>`;
}

// Calls render({days, hours, minutes, seconds, done}) every second until target.
function startCountdown(targetIso, render) {
  const target = new Date(targetIso).getTime();
  const tick = () => {
    const diff = Math.max(0, target - Date.now());
    render({
      days: Math.floor(diff / 86400000),
      hours: Math.floor(diff / 3600000) % 24,
      minutes: Math.floor(diff / 60000) % 60,
      seconds: Math.floor(diff / 1000) % 60,
      done: diff === 0
    });
    if (diff === 0) clearInterval(timer);
  };
  const timer = setInterval(tick, 1000);
  tick();
}

const pad = (n) => String(n).padStart(2, '0');

function wireNewsletterForm(form) {
  const msg = form.querySelector('.form-msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.className = 'form-msg';
    msg.textContent = 'Adding you…';
    try {
      const res = await api('/api/newsletter', { method: 'POST', body: JSON.stringify({ email: form.email.value }) });
      msg.className = 'form-msg ok';
      msg.textContent = res.already ? "You're already on the list — thank you!" : "You're in! Watch your inbox for the next issue.";
      form.reset();
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = err.message;
    }
  });
}

function socialLinks(socials, cls = '') {
  return socials.map((s) => `<li><a class="${cls}" href="${esc(s.url)}" target="_blank" rel="noopener">
    <span class="social-icon">${ICONS[s.icon] || ICONS.link}</span><span><strong>${esc(s.name)}</strong> ${esc(s.handle)}</span></a></li>`).join('');
}

function renderChrome() {
  const page = document.body.dataset.page;
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `<div class="gingham"></div>
    <div class="container header-inner">
      <a class="brand" href="index.html" aria-label="AAPC home">
        <span class="logo" role="img" aria-label="AAPC lotus logo"></span>
        <span class="brand-text"><strong>AAPC</strong><span>Asian Awareness &amp; Perspective Connections</span></span>
      </a>
      <button class="menu-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="nav" id="site-nav">
        ${NAV.map((n) => `<a href="${n.href}" class="${n.page === page ? 'active' : ''}">${n.label}</a>`).join('')}
      </nav>
    </div>`;
  document.body.prepend(header);
  const toggle = header.querySelector('.menu-toggle');
  const nav = header.querySelector('.nav');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });

  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.innerHTML = `<div class="container footer-grid">
      <div>
        <h3>Join the newsletter</h3>
        <p>New articles, magazine drops and GBM invites — straight to your inbox.</p>
        <form class="form newsletter-form" novalidate>
          <div class="inline-form">
            <label class="visually-hidden" for="footer-email">Email</label>
            <input id="footer-email" name="email" type="email" placeholder="you@udel.edu" required>
            <button class="btn pink" type="submit">Subscribe</button>
          </div>
          <p class="form-msg" role="status"></p>
        </form>
      </div>
      <div>
        <h3>Follow along</h3>
        <ul class="social-list" id="footer-socials"></ul>
      </div>
      <div>
        <h3>Explore</h3>
        <div class="footer-links">
          ${NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join('')}
          <a href="newsletter.html">Newsletter</a>
          <a id="footer-submit" href="magazine.html" target="_blank" rel="noopener">Submit an article</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom"><div class="container">© ${new Date().getFullYear()} AAPC — Asian Awareness &amp; Perspective Connections</div></div>`;
  document.body.append(footer);
  wireNewsletterForm(footer.querySelector('.newsletter-form'));
  api('/api/site').then((site) => {
    footer.querySelector('#footer-socials').innerHTML = socialLinks(site.socials);
    footer.querySelector('#footer-submit').href = site.submissionFormUrl;
  }).catch(() => {});
}

renderChrome();
