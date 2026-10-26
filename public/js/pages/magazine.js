(async function magazinePage() {
  const TOKEN_KEY = 'aapc-member-token';
  const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };

  const [site, mags] = await Promise.all([api('/api/site'), api('/api/magazines')]);
  const info = site.magazineInfo;
  document.getElementById('mag-what').textContent = info.what;
  document.getElementById('mag-info').innerHTML = `
    <div class="card tape"><h3>Release schedule</h3><p>${esc(info.schedule)}</p></div>
    <div class="card tape pink"><h3>How to contribute</h3><p>${esc(info.contribute)}</p>
      <a class="btn" href="${esc(site.submissionFormUrl)}">Submit your work</a></div>
    <div class="card tape"><h3>Join the team</h3><p>We're always looking for:</p>
      <div class="topic-chips">${info.roles.map((r) => `<span class="chip">${esc(r)}</span>`).join('')}</div>
      <a href="feedback.html#request">Request a topic →</a></div>`;

  // Group issues by year, newest first.
  const years = [...new Set(mags.map((m) => m.year))].sort((a, b) => b - a);
  let activeYear = years[0];
  const yearTabs = document.getElementById('mag-years');
  const shelf = document.getElementById('mag-shelf');
  const reader = document.getElementById('reader');

  function renderShelf() {
    yearTabs.innerHTML = years.map((y) => `<button type="button" class="${y === activeYear ? 'active' : ''}" data-year="${y}">${y}</button>`).join('');
    const list = mags.filter((m) => m.year === activeYear).sort((a, b) => b.month - a.month);
    shelf.innerHTML = list.map((m) => `
      <div class="card mag-item">
        <div class="cover"><img src="${esc(m.cover || placeholder(m.id))}" alt="${esc(m.title)} cover">
          ${m.paywalled ? '<span class="lock">🔒 Members</span>' : '<span class="lock" style="background:var(--pink)">Free</span>'}</div>
        <h3>${esc(m.title)}</h3>
        <span class="chip pink">${esc(m.theme)}</span>
        <p class="muted" style="font-size:.88rem">${MONTHS[m.month - 1]} ${m.year} · ${m.pages} pages</p>
        ${m.released
          ? `<button class="btn${m.paywalled ? '' : ' ghost'}" data-read="${esc(m.id)}">${m.paywalled ? `Read ($${m.price})` : 'Read free'}</button>`
          : `<a class="btn ghost" href="index.html">Releases ${fmtDate(m.releaseDate, { month: 'short', day: 'numeric' })}</a>`}
      </div>`).join('');
  }

  async function openIssue(id) {
    try {
      const issue = await api(`/api/magazines/${id}/read`, { headers: { Authorization: `Bearer ${getToken() || ''}` } });
      reader.innerHTML = `<div class="card reader tape"><h2>${esc(issue.title)}</h2>${issue.fullContent.map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
    } catch (err) {
      reader.innerHTML = `<div class="card unlock-box tape pink">
        <h3>🔒 ${esc(err.message)}</h3>
        <p class="muted">Magazine issues are AAPC's main publication and help fund the club. Payments are coming soon — for now, members can unlock with an access code from the eboard.</p>
        <form class="form" id="unlock-form" novalidate>
          <div class="inline-form"><input name="code" placeholder="Access code" required><button class="btn" type="submit">Unlock</button></div>
          <p class="form-msg" role="status"></p>
        </form>
      </div>`;
      const form = document.getElementById('unlock-form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = form.querySelector('.form-msg');
        try {
          const { token } = await api('/api/magazines/unlock', { method: 'POST', body: JSON.stringify({ code: form.code.value }) });
          try { localStorage.setItem(TOKEN_KEY, token); } catch {}
          openIssue(id);
        } catch (e2) {
          msg.className = 'form-msg err';
          msg.textContent = e2.message;
        }
      });
    }
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  yearTabs.addEventListener('click', (e) => {
    const y = e.target.dataset.year;
    if (y) { activeYear = Number(y); renderShelf(); }
  });
  shelf.addEventListener('click', (e) => {
    const id = e.target.dataset.read;
    if (id) openIssue(id);
  });
  renderShelf();
})();
