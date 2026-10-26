(async function archivesPage() {
  const { tree, topics } = await api('/api/archive');
  const side = document.getElementById('archive-side');
  const chips = document.getElementById('topic-chips');
  const list = document.getElementById('archive-list');
  const state = { year: null, month: null, topic: null };

  const years = Object.keys(tree).sort((a, b) => b - a);
  side.innerHTML = `<h3>Browse by date</h3>
    <button type="button" data-all="1" class="active">All articles</button>
    ${years.map((y, i) => `<details ${i === 0 ? 'open' : ''}><summary>${y}</summary>
      <button type="button" data-year="${y}">All of ${y}</button>
      ${Object.keys(tree[y]).sort((a, b) => b - a).map((m) => `
        <button type="button" data-year="${y}" data-month="${m}"><span>${MONTHS[m - 1]}</span><span class="muted">${tree[y][m]}</span></button>`).join('')}
    </details>`).join('')}`;

  chips.innerHTML = ['All topics', ...topics].map((t, i) => `<button type="button" class="${i === 0 ? 'active' : ''}" data-topic="${i === 0 ? '' : esc(t)}">${esc(t)}</button>`).join('');

  async function load() {
    const q = new URLSearchParams();
    if (state.year) q.set('year', state.year);
    if (state.month) q.set('month', state.month);
    if (state.topic) q.set('topic', state.topic);
    const articles = await api(`/api/articles?${q}`);
    if (!articles.length) { list.innerHTML = '<p class="empty card">No articles match those filters.</p>'; return; }
    // Group by "Month Year", already sorted newest-first by the API.
    const groups = new Map();
    for (const a of articles) {
      const d = new Date(a.publishDate);
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(a);
    }
    list.innerHTML = [...groups].map(([label, items]) => `
      <div class="month-group"><h3>${label}</h3><div class="grid">${items.map(articleCard).join('')}</div></div>`).join('');
  }

  side.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    side.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.year = btn.dataset.year || null;
    state.month = btn.dataset.month || null;
    load();
  });
  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    chips.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.topic = btn.dataset.topic || null;
    load();
  });
  load();
})();
