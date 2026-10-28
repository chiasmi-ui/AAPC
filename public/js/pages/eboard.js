(async function eboardPage() {
  const data = await api('/api/eboard');
  document.getElementById('eboard-year').textContent = data.year;
  document.getElementById('eboard').innerHTML = data.members.map((m, i) => `
    <div class="card member tape${i % 2 ? ' pink' : ''}">
      <div class="photo">${m.photo
        ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" style="object-position:${esc(m.focus || '50% 50%')}"${i > 3 ? ' loading="lazy"' : ''}>`
        : `<span class="initial">${esc(m.name[0])}</span>`}</div>
      <div class="role">${esc(m.role)}</div>
      <h3>${esc(m.name)}</h3>
    </div>`).join('');
})();
