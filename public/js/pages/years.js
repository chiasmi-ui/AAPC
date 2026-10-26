(async function yearsPage() {
  const years = await api('/api/years');
  document.getElementById('years').innerHTML = years.map((y) => `
    <div class="card year-block tape">
      <h2><span class="script">${esc(y.year)}</span></h2>
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
})();
