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
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
console.log(`Static site written to ${OUT}`);
