(async function eboardPage() {
  const data = await api('/api/eboard');
  document.getElementById('eboard-year').textContent = data.year;
  document.getElementById('eboard').innerHTML = data.members.map((m) => `
    <div class="card member tape${Math.random() > 0.5 ? ' pink' : ''}">
      <div class="photo">${m.photo ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}">` : `<span class="initial">${esc(m.role[0])}</span>`}</div>
      <h3>${esc(m.name)}</h3>
      <div class="role">${esc(m.role)}</div>
      <p>${esc(m.major)}</p>
      <p>${esc(m.bio)}</p>
      <p><em>${esc(m.favorite)}</em></p>
    </div>`).join('');
})();
