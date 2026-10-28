// Full-screen magazine reader with page-turn animation (StPageFlip, loaded on first open).
// openFlipbook({ title, path, pages, pageWidth, pageHeight }) — pages live at `${path}/001.webp` …

const PAGE_FLIP_SRC = 'https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js';
let pageFlipLoading;

function loadPageFlip() {
  if (window.St) return Promise.resolve();
  pageFlipLoading = pageFlipLoading || new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = PAGE_FLIP_SRC;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load the magazine reader.'));
    document.head.append(s);
  });
  return pageFlipLoading;
}

const pageSrc = (mag, i) => `${mag.path}/${String(i + 1).padStart(3, '0')}.webp`;

async function openFlipbook(mag) {
  const overlay = document.createElement('div');
  overlay.className = 'flipbook-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', mag.title);
  overlay.innerHTML = `
    <div class="flipbook-bar">
      <strong>${esc(mag.title)}</strong>
      <button type="button" class="flipbook-close" aria-label="Close magazine">✕</button>
    </div>
    <div class="flipbook-stage"><div class="flipbook-fit"><div class="flipbook-book"></div></div><p class="flipbook-loading">Opening the magazine…</p></div>
    <div class="flipbook-controls">
      <button type="button" class="btn ghost" data-dir="prev" aria-label="Previous page">‹ Prev</button>
      <span class="flipbook-count" aria-live="polite"></span>
      <button type="button" class="btn ghost" data-dir="next" aria-label="Next page">Next ›</button>
    </div>`;
  document.body.append(overlay);
  document.body.style.overflow = 'hidden';
  const book = overlay.querySelector('.flipbook-book');
  const count = overlay.querySelector('.flipbook-count');
  const stage = overlay.querySelector('.flipbook-stage');
  const fit = overlay.querySelector('.flipbook-fit');
  let flip;

  // StPageFlip sizes the book from its parent's width and writes its own max-width onto
  // the book, so the size limit lives on this wrapper: as wide as possible while the
  // pages' full height still fits the stage (two pages side by side, or one on phones).
  const fitToStage = () => {
    const pageRatio = mag.pageWidth / mag.pageHeight;
    const w = stage.clientWidth - 32;
    const h = stage.clientHeight - 16;
    const twoUp = w >= 2 * 240;
    fit.style.width = `${Math.floor(Math.min(w, h * pageRatio * (twoUp ? 2 : 1)))}px`;
  };
  fitToStage();
  window.addEventListener('resize', fitToStage);

  const close = () => {
    window.removeEventListener('resize', fitToStage);
    document.removeEventListener('keydown', onKey);
    if (flip) flip.destroy();
    overlay.remove();
    document.body.style.overflow = '';
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (!flip) return;
    if (e.key === 'ArrowRight') flip.flipNext();
    if (e.key === 'ArrowLeft') flip.flipPrev();
  };
  document.addEventListener('keydown', onKey);
  overlay.querySelector('.flipbook-close').onclick = close;

  try {
    await loadPageFlip();
  } catch (err) {
    overlay.querySelector('.flipbook-loading').textContent = err.message;
    return;
  }
  overlay.querySelector('.flipbook-loading').remove();

  // Pages start empty; images load only near the current page so 100+ pages don't download at once.
  const pageEls = Array.from({ length: mag.pages }, (_, i) => {
    const el = document.createElement('div');
    el.className = 'flipbook-page';
    el.dataset.density = i === 0 || i === mag.pages - 1 ? 'hard' : 'soft';
    el.innerHTML = `<img alt="Page ${i + 1}" draggable="false">`;
    book.append(el);
    return el;
  });
  const loadAround = (index) => {
    for (let i = Math.max(0, index - 2); i <= Math.min(mag.pages - 1, index + 5); i++) {
      const img = pageEls[i].querySelector('img');
      if (!img.src) img.src = pageSrc(mag, i);
    }
  };
  loadAround(0);

  flip = new St.PageFlip(book, {
    width: mag.pageWidth,
    height: mag.pageHeight,
    size: 'stretch',
    minWidth: 240,
    maxWidth: 1545,
    minHeight: 310,
    maxHeight: 1999,
    showCover: true,
    usePortrait: true,
    mobileScrollSupport: false,
    maxShadowOpacity: 0.4
  });
  flip.loadFromHTML(pageEls);

  const update = (index) => {
    loadAround(index);
    const orient = flip.getOrientation();
    const last = Math.min(mag.pages, index + (orient === 'landscape' && index > 0 ? 2 : 1));
    count.textContent = last > index + 1 ? `Pages ${index + 1}–${last} of ${mag.pages}` : `Page ${index + 1} of ${mag.pages}`;
  };
  flip.on('flip', (e) => update(e.data));
  flip.on('changeOrientation', () => update(flip.getCurrentPageIndex()));
  update(0);

  overlay.querySelector('[data-dir="prev"]').onclick = () => flip.flipPrev();
  overlay.querySelector('[data-dir="next"]').onclick = () => flip.flipNext();
  overlay.querySelector('.flipbook-close').focus();
}
