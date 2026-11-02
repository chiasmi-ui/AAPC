(async function calendarPage() {
  // Subscribing (vs. adding one event) keeps the visitor's calendar in sync with events.ics.
  const feed = new URL('events.ics', location.href).href.replace(/^https?:/, 'webcal:');
  document.getElementById('cal-subscribe').href = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(feed)}`;

  const events = await api('/api/events');
  const today = new Date();
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const grid = document.getElementById('cal-grid');
  const listEl = document.getElementById('event-list');

  const gcalLink = (e, cls) => `<a class="${cls}" href="${esc(googleCalendarUrl({ title: `AAPC: ${e.title}`, start: e.start, end: e.end, details: e.description, location: e.location }))}" target="_blank" rel="noopener">Add to Google Calendar</a>`;
  const when = (e) => `${fmtDate(e.start, { weekday: 'long', month: 'long', day: 'numeric' })} · ${fmtTime(e.start)}${e.end ? ` – ${fmtTime(e.end)}` : ''}`;

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function render() {
    const y = view.getFullYear();
    const m = view.getMonth();
    document.getElementById('cal-title').innerHTML = `${MONTHS[m]} ${y}`;
    const start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dayEvents = events.filter((e) => sameDay(new Date(e.start), day));
      html += `<div class="cal-day${day.getMonth() !== m ? ' other' : ''}${sameDay(day, today) ? ' today' : ''}${dayEvents.length ? ' has-events' : ''}" data-day="${day.toDateString()}">
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
            <p class="event-actions">${e.link ? `<a class="btn" href="${esc(e.link.url)}" target="_blank" rel="noopener">${esc(e.link.label)}</a>` : ''}
              ${gcalLink(e, 'btn ghost')}</p></div>
        </div>`).join('')
      : '<p class="empty card">No events this month yet.</p>';
  }

  document.getElementById('cal-prev').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); };
  document.getElementById('cal-next').onclick = () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); };
  // Tapping an event (or a day that has events, since events are tiny dots on phones) opens a
  // card with the details and a one-tap Google Calendar button.
  const dialog = document.getElementById('event-dialog');
  const body = dialog.querySelector('.event-dialog-body');
  grid.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-id]');
    const cell = e.target.closest('.cal-day.has-events');
    if (!chip && !cell) return;
    const shown = chip
      ? events.filter((ev) => ev.id === chip.dataset.id)
      : events.filter((ev) => new Date(ev.start).toDateString() === cell.dataset.day);
    body.innerHTML = shown.map((ev) => `<article class="event-dialog-item">
        <span class="chip ${ev.type === 'GBM' ? 'pink' : ev.type === 'Deadline' ? 'gold' : ''}">${esc(ev.type)}</span>
        <h3>${esc(ev.title)}</h3>
        <p class="muted">${when(ev)}<br>${esc(ev.location)}</p>
        <p>${esc(ev.description)}</p>
        <p class="event-actions">${gcalLink(ev, 'btn')}${ev.link ? `<a class="btn ghost" href="${esc(ev.link.url)}" target="_blank" rel="noopener">${esc(ev.link.label)}</a>` : ''}</p>
      </article>`).join('');
    dialog.showModal();
  });
  dialog.addEventListener('click', (e) => {
    // Close on the X, or on a click outside the card (the backdrop).
    if (e.target === dialog || e.target.closest('.event-dialog-close')) dialog.close();
  });
  render();
})();
