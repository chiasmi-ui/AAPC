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
  tiktok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v11a4 4 0 1 1-4-4"/><path d="M14 3c.5 3 2.5 5 6 5"/></svg>',
  link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>'
};

async function api(path, options = {}) {
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

function fmtDate(iso, opts = { month: 'long', day: 'numeric', year: 'numeric' }) {
  return new Date(iso).toLocaleDateString('en-US', opts);
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function articleCard(a) {
  return `<a class="card article-card" href="/article.html?id=${encodeURIComponent(a.id)}">
    <div class="img"><img src="${esc(a.mainGraphic)}" alt="" loading="lazy"></div>
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
      <a class="brand" href="/" aria-label="AAPC home">
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
          <a href="/newsletter.html">Newsletter</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom"><div class="container">© ${new Date().getFullYear()} AAPC — Asian Awareness &amp; Perspective Connections</div></div>`;
  document.body.append(footer);
  wireNewsletterForm(footer.querySelector('.newsletter-form'));
  api('/api/site').then((site) => {
    footer.querySelector('#footer-socials').innerHTML = socialLinks(site.socials);
  }).catch(() => {});
}

renderChrome();
