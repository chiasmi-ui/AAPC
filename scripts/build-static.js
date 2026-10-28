// Builds a backend-free copy of the site into _site/ for GitHub Pages.
// Content JSON is copied next to the pages and read by the browser (static mode).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, '_site');

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'js', 'config.js'), 'window.AAPC_STATIC = true;\n');

fs.mkdirSync(path.join(OUT, 'data'));
for (const file of fs.readdirSync(path.join(ROOT, 'data'))) {
  let data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
  // Never publish paywalled issue contents as a public file.
  if (file === 'magazines.json') data = data.map((m) => (m.paywalled ? { ...m, fullContent: [] } : m));
  fs.writeFileSync(path.join(OUT, 'data', file), JSON.stringify(data));
}
// Stamp local script/style URLs with a build version so browsers fetch fresh code after
// every deploy instead of reusing a cached copy (GitHub Pages caches files for 10 minutes).
const version = Date.now().toString(36);
for (const file of fs.readdirSync(OUT).filter((f) => f.endsWith('.html'))) {
  const p = path.join(OUT, file);
  const html = fs.readFileSync(p, 'utf8').replace(/(src="js\/[^"?]+\.js|href="css\/[^"?]+\.css)"/g, `$1?v=${version}"`);
  fs.writeFileSync(p, html);
}
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Static site written to ${OUT}`);
