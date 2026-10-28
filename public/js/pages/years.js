(async function yearsPage() {
  const years = await api('/api/years');
  const root = document.getElementById('years');
  root.innerHTML = years.map((y, i) => `
    <div class="card year-block tape">
      <h2><span class="script">${esc(y.year)}</span></h2>
      ${y.magazine ? `
        <div class="year-magazine">
          <button type="button" class="mag-book" data-mag="${i}" aria-label="Read ${esc(y.magazine.title)}">
            <img src="${esc(y.magazine.path)}/001.webp" alt="${esc(y.magazine.title)} cover">
          </button>
          <div>
            <span class="kicker">The magazine</span>
            <h3>${esc(y.magazine.title)}</h3>
            <p class="muted">${y.magazine.pages} pages · ${esc(y.magazine.subtitle)}</p>
            <button type="button" class="btn" data-mag="${i}">Open the magazine</button>
            <p class="muted" style="font-size:.85rem">Click or drag the page corners to turn pages.</p>
          </div>
        </div>` : ''}
      <p>${esc(y.summary)}</p>
      <div class="year-cols">
        <div>
          <h3>Eboard</h3>
          <ul>${y.eboard.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        </div>
        <div>
          <h3>Highlights</h3>
          <ul class="timeline">${y.highlights.map((h) => `<li><small>${esc(h.date)}</small>${esc(h.title)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>`).join('');

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mag]');
    if (btn) openFlipbook(years[Number(btn.dataset.mag)].magazine);
  });
})();
