(async function calendarPage() {
  const events = await api('/api/events');
  const today = new Date();
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const grid = document.getElementById('cal-grid');
  const listEl = document.getElementById('event-list');

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function render() {
    const y = view.getFullYear();
    const m = view.getMonth();
    document.getElementById('cal-title').innerHTML = `<span class="script">${MONTHS[m]}</span> ${y}`;
    const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dayEvents = events.filter((e) => sameDay(new Date(e.start), day));
      html += `<div class="cal-day${day.getMonth() !== m ? ' other' : ''}${sameDay(day, today) ? ' today' : ''}">
        <span class="num">${day.getDate()}</span>
        ${dayEvents.map((e) => `<button type="button" class="cal-event ${esc(e.type)}" data-id="${esc(e.id)}" title="${esc(e.title)}">${esc(e.title)}</button>`).join('')}
      </div>`;
    }
    grid.innerHTML = html;

    const monthEvents = events.filter((e) => {
      const d = new Date(e.start);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    listEl.innerHTML = monthEvents.length
      ? monthEvents.map((e) => `<div class="card event-item" id="ev-${esc(e.id)}">
          <span class="date-badge">${fmtDate(e.start, { month: 'short' })}<b>${new Date(e.start).getDate()}</b></span>
          <div><span class="chip ${e.type === 'GBM' ? 'pink' : e.type === 'Deadline' ? 'gold' : ''}">${esc(e.type)}</span>
            <h3>${esc(e.title)}</h3>
            <p class="muted">${fmtTime(e.start)}${e.end ? ` – ${fmtTime(e.end)}` : ''} · ${esc(e.location)}</p>
            <p>${esc(e.description)}</p>
            ${e.link ? `<p><a class="btn" href="${esc(e.link.url)}" target="_blank" rel="noopener">${esc(e.link.label)}</a></p>` : ''}</div>
        </div>`).join('')
      : '<p class="empty card">No events this month yet.</p>';
  }

  document.getElementById('cal-prev').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); };
  document.getElementById('cal-next').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); };
  grid.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (id) document.getElementById(`ev-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  render();
})();
