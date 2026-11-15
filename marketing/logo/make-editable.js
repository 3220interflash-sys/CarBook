// Renders the editable SVGs into a vector PDF (one logo per page) and PNG previews. Run from the repo root.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'editable');
const files = ['motorpal-icon.svg', 'motorpal-logo-light.svg', 'motorpal-logo-dark.svg', 'motorpal-mark-only.svg'];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const font = '<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap" rel="stylesheet">';
  const pages = files.map(f => {
    let s = fs.readFileSync(path.join(D, f), 'utf8').replace(/<\?xml[^>]*>/, '');
    const w = +s.match(/width="(\d+)"/)[1], h = +s.match(/height="(\d+)"/)[1];
    const bg = f === 'motorpal-mark-only.svg' ? '#0F172A' : '#FFFFFF';
    return `<div style="width:1400px;height:700px;display:grid;place-items:center;background:${bg};page-break-after:always">${s.replace('<svg ', `<svg style="width:${Math.min(1200, w * 1.6)}px;height:auto" `)}</div>`;
  }).join('');
  await p.setContent(`<html><head>${font}<style>*{margin:0}</style></head><body>${pages}</body></html>`);
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  await p.pdf({ path: path.join(D, 'motorpal-logo.pdf'), width: '1400px', height: '700px', printBackground: true });
  for (const f of files) {
    const s = fs.readFileSync(path.join(D, f), 'utf8').replace(/<\?xml[^>]*>/, '');
    const w = +s.match(/width="(\d+)"/)[1], h = +s.match(/height="(\d+)"/)[1];
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><head>${font}<style>*{margin:0}body{background:transparent}</style></head><body>${s}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D, f.replace('.svg', '.png')), omitBackground: true, scale: 'device' });
  }
  await b.close();
})();
