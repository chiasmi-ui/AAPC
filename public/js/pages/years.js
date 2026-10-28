(async function yearsPage() {
  const years = await api('/api/years');
  const root = document.getElementById('years');
  root.innerHTML = years.map((y, i) => `
    <div class="card year-block">
      <h2>${esc(y.year)}</h2>
      ${y.magazine ? `
        <div class="year-magazine">
          <button type="button" class="mag-book" data-mag="${i}" aria-label="Read ${esc(y.magazine.title)}">
            <img src="${esc(y.magazine.path)}/001.webp" alt="${esc(y.magazine.title)} cover">
          </button>
          <div>
            <h3>${esc(y.magazine.title)}</h3>
            <p class="muted">${y.magazine.pages} pages</p>
            <button type="button" class="btn" data-mag="${i}">Read it</button>
            <p class="muted" style="font-size:.85rem">Click or drag a page corner to turn the page.</p>
          </div>
        </div>` : ''}
      ${y.summary ? `<p>${esc(y.summary)}</p>` : ''}
      <div class="year-cols">
        ${y.eboard && y.eboard.length ? `<div>
          <h3>Eboard</h3>
          <ul>${y.eboard.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        </div>` : ''}
        ${y.highlights && y.highlights.length ? `<div>
          <h3>Highlights</h3>
          <ul class="timeline">${y.highlights.map((h) => `<li><small>${esc(h.date)}</small>${esc(h.title)}</li>`).join('')}</ul>
        </div>` : ''}
      </div>
    </div>`).join('');

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mag]');
    if (btn) openFlipbook(years[Number(btn.dataset.mag)].magazine);
  });
})();
