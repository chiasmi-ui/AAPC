(async function home() {
  const now = new Date();
  document.getElementById('month-name').textContent = MONTHS[now.getMonth()];
  document.getElementById('month-year').textContent = now.getFullYear();

  const [countdowns, featured, monthArticles, events, site] = await Promise.all([
    api('/api/countdowns'),
    api('/api/articles?featured=true'),
    api(`/api/articles?year=${now.getFullYear()}&month=${now.getMonth() + 1}`),
    api('/api/events'),
    api('/api/site')
  ]);

  // Instagram-sticker style countdown to next month's articles.
  const articleBox = document.getElementById('article-countdown');
  if (countdowns.nextMonth) {
    const a = countdowns.nextMonth;
    articleBox.innerHTML = `<div class="ig-sticker">
      <p class="title">${MONTHS[a.month - 1]}'s articles coming in</p>
      <div class="ig-digits">
        <div><b data-u="days">00</b><span>days</span></div>
        <div><b data-u="hours">00</b><span>hours</span></div>
        <div><b data-u="minutes">00</b><span>mins</span></div>
        <div><b data-u="seconds">00</b><span>secs</span></div>
      </div>
      <button class="ig-remind" type="button">Add to calendar</button>
    </div>`;
    startCountdown(a.releaseDate, (t) => {
      for (const u of ['days', 'hours', 'minutes', 'seconds']) articleBox.querySelector(`[data-u="${u}"]`).textContent = pad(t[u]);
    });
    articleBox.querySelector('.ig-remind').addEventListener('click', () => downloadIcs({
      id: `articles-${a.year}-${a.month}`,
      title: `New AAPC articles (${MONTHS[a.month - 1]})`,
      start: a.releaseDate,
      url: location.href.replace(/[^/]*$/, 'index.html')
    }));
  }

  // Spotify-album style emphasized countdown for the next magazine.
  const magBox = document.getElementById('magazine-countdown');
  if (countdowns.magazine) {
    const m = countdowns.magazine;
    magBox.innerHTML = `<div class="mag-countdown">
      ${m.cover
        ? `<div class="mag-cover"><img src="${esc(m.cover)}" alt="${esc(m.title)} cover"></div>`
        : '<div class="mag-cover soon"><span class="logo" role="img" aria-label="AAPC lotus logo"></span>Cover reveal soon</div>'}
      <div>
        <div class="label">Magazine · Coming ${fmtDate(m.releaseDate)}</div>
        <h2>${esc(m.title)}</h2>
        ${m.theme ? `<p class="theme">${esc(m.theme)}</p>` : ''}
        <div class="big-timer">
          <div><b data-u="days">0</b><span>days</span></div>
          <div><b data-u="hours">00</b><span>hrs</span></div>
          <div><b data-u="minutes">00</b><span>min</span></div>
          <div><b data-u="seconds">00</b><span>sec</span></div>
        </div>
        <div class="actions">
          <a class="btn" href="newsletter.html">Email me when it’s out</a>
          <a class="btn ghost" href="previous-years.html">Past issues</a>
        </div>
      </div>
    </div>`;
    startCountdown(m.releaseDate, (t) => {
      for (const u of ['days', 'hours', 'minutes', 'seconds']) {
        magBox.querySelector(`[data-u="${u}"]`).textContent = u === 'days' ? t.days : pad(t[u]);
      }
    });
  }

  // Highlighted articles carousel with gentle auto-scroll.
  const track = document.getElementById('highlights');
  track.innerHTML = featured.length
    ? featured.map((a) => `<a class="card polaroid" href="article.html?id=${encodeURIComponent(a.id)}">
        <div class="img"><img src="${esc(a.mainGraphic || placeholder(a.id))}" alt=""></div>
        <span class="chip pink" style="margin-top:10px">${esc(a.topic)}</span>
        <h3>${esc(a.title)}</h3>
        <p>${esc(a.excerpt)}</p>
      </a>`).join('')
    : '<p class="empty">No highlighted articles yet.</p>';
  const step = () => track.firstElementChild ? track.firstElementChild.offsetWidth + 22 : 300;
  document.querySelector('.carousel-btn.prev').onclick = () => track.scrollBy({ left: -step() });
  document.querySelector('.carousel-btn.next').onclick = () => track.scrollBy({ left: step() });
  let paused = false;
  track.addEventListener('mouseenter', () => (paused = true));
  track.addEventListener('mouseleave', () => (paused = false));
  track.addEventListener('focusin', () => (paused = true));
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => {
      if (paused) return;
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 5;
      track.scrollTo({ left: atEnd ? 0 : track.scrollLeft + step() });
    }, 4000);
  }

  // This month's articles.
  document.getElementById('month-articles').innerHTML = monthArticles.length
    ? monthArticles.map(articleCard).join('')
    : '<p class="empty card">Nothing posted yet this month.</p>';

  // Upcoming events (next 4).
  const upcoming = events.filter((e) => new Date(e.end || e.start) >= now).slice(0, 4);
  document.getElementById('mini-events').innerHTML = upcoming.length
    ? upcoming.map((e) => `<li>
        <span class="date-badge">${fmtDate(e.start, { month: 'short' })}<b>${new Date(e.start).getDate()}</b></span>
        <span><strong>${esc(e.title)}</strong><br><small class="muted">${fmtTime(e.start)} · ${esc(e.location)}</small></span>
      </li>`).join('')
    : '<li class="muted">No upcoming events.</li>';

  document.getElementById('socials-band').innerHTML = site.socials.map((s) => `
    <a class="card social-card" href="${esc(s.url)}" target="_blank" rel="noopener">
      <span class="social-icon">${ICONS[s.icon] || ICONS.link}</span>
      <span><strong>${esc(s.name)}</strong><span>${esc(s.handle)}</span></span>
    </a>`).join('');
})();
