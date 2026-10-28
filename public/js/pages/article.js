(async function articlePage() {
  const root = document.getElementById('article');
  const id = new URLSearchParams(location.search).get('id');
  try {
    if (!id) throw new Error('No article was picked.');
    const a = await api(`/api/articles/${encodeURIComponent(id)}`);
    document.title = `${a.title} | AAPC`;
    root.innerHTML = `
      <header class="article-head">
        <span class="chip pink">${esc(a.topic)}</span>
        <h1>${esc(a.title)}</h1>
        <p class="muted">${esc(a.excerpt)}</p>
        <div class="meta" style="justify-content:center">By <strong>${esc(a.author)}</strong> · ${fmtDate(a.publishDate)}</div>
      </header>
      <figure class="card main-graphic" style="margin:0"><img src="${esc(a.mainGraphic || placeholder(a.id))}" alt="${esc(a.title)} main graphic"></figure>
      <div class="card article-body">${a.content.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      ${a.images.length ? `<div class="gallery">${a.images.map((img, i) => `
        <figure class="card"><img src="${esc(img.src || placeholder(`${a.id}-img${i + 1}`))}" alt="${esc(img.caption || '')}" loading="lazy">
        ${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
      <p style="text-align:center;margin-top:32px"><a class="btn ghost" href="archives.html">← More articles</a></p>`;
  } catch (err) {
    root.innerHTML = `<div class="page-hero"><h1>Article not found</h1><p>${esc(err.message)}</p><p><a class="btn" href="archives.html">Browse the archives</a></p></div>`;
  }
})();
