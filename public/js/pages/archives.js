(async function archivesPage() {
  const [{ tree, topics }, articles] = await Promise.all([api('/api/archive'), api('/api/articles')]);
  const side = document.getElementById('archive-side');
  const chips = document.getElementById('topic-chips');
  const list = document.getElementById('archive-list');

  // Several dates and topics can be on at once. Dates are "2026" (whole year) or "2026-10".
  // An article shows if it matches any picked date AND any picked topic (empty = everything).
  // The picks are remembered in this browser for the next visit.
  const saved = store.get('archive-filters', {});
  const dateKeys = new Set(Object.entries(tree).flatMap(([y, months]) => [y, ...Object.keys(months).map((m) => `${y}-${m}`)]));
  const dates = new Set((saved.dates || []).filter((d) => dateKeys.has(d)));
  const picked = new Set((saved.topics || []).filter((t) => topics.includes(t)));

  const years = Object.keys(tree).sort((a, b) => b - a);
  side.innerHTML = `<h3>Browse by date</h3>
    <p class="muted filter-hint">Pick as many as you like.</p>
    <button type="button" data-clear="dates">All dates</button>
    ${years.map((y, i) => `<details ${i === 0 ? 'open' : ''}><summary>${y}</summary>
      <button type="button" data-date="${y}">All of ${y}</button>
      ${Object.keys(tree[y]).sort((a, b) => b - a).map((m) => `
        <button type="button" data-date="${y}-${m}"><span>${MONTHS[m - 1]}</span><span class="muted">${tree[y][m]}</span></button>`).join('')}
    </details>`).join('')}`;

  chips.innerHTML = `<button type="button" data-clear="topics">All topics</button>${topics.map((t) => `<button type="button" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}`;

  const matchesDate = (a) => {
    if (!dates.size) return true;
    const d = new Date(a.publishDate);
    return dates.has(String(d.getFullYear())) || dates.has(`${d.getFullYear()}-${d.getMonth() + 1}`);
  };

  function render() {
    store.set('archive-filters', { dates: [...dates], topics: [...picked] });
    side.querySelector('[data-clear]').classList.toggle('active', !dates.size);
    side.querySelectorAll('[data-date]').forEach((b) => {
      b.classList.toggle('active', dates.has(b.dataset.date));
      b.setAttribute('aria-pressed', dates.has(b.dataset.date));
    });
    chips.querySelector('[data-clear]').classList.toggle('active', !picked.size);
    chips.querySelectorAll('[data-topic]').forEach((b) => {
      b.classList.toggle('active', picked.has(b.dataset.topic));
      b.setAttribute('aria-pressed', picked.has(b.dataset.topic));
    });

    const shown = articles.filter((a) => matchesDate(a) && (!picked.size || picked.has(a.topic)));
    const filtered = dates.size || picked.size;
    const summary = filtered
      ? `<p class="filter-summary">${shown.length} article${shown.length === 1 ? '' : 's'} <button type="button" class="link-btn" data-clear="all">Clear filters</button></p>`
      : '';
    if (!shown.length) {
      list.innerHTML = `${summary}<p class="empty card">No articles match those filters.</p>`;
      return;
    }
    // Group by "Month Year"; the API already returns newest first.
    const groups = new Map();
    for (const a of shown) {
      const d = new Date(a.publishDate);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    list.innerHTML = summary + [...groups].map(([label, items]) => `
      <div class="month-group"><h3>${label}</h3><div class="grid">${items.map(articleCard).join('')}</div></div>`).join('');
  }

  const toggle = (set, value) => (set.has(value) ? set.delete(value) : set.add(value));
  document.querySelector('.archive-layout').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const { clear, date, topic } = btn.dataset;
    if (clear === 'dates' || clear === 'all') dates.clear();
    if (clear === 'topics' || clear === 'all') picked.clear();
    if (date) {
      toggle(dates, date);
      // Picking a whole year replaces its single months, and a single month replaces its year.
      const [y, m] = date.split('-');
      if (!m) [...dates].filter((d) => d.startsWith(`${y}-`)).forEach((d) => dates.delete(d));
      else dates.delete(y);
    }
    if (topic) toggle(picked, topic);
    render();
  });
  render();
})();
