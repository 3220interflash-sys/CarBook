// Makes Canva-ready PDFs (one design per file, at the right size) from the editable SVGs. Run from the repo root.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'editable'), O = path.join(__dirname, 'canva');
const jobs = [
  ['motorpal-icon.svg', 'motorpal-icon.pdf', 1080, 1080, 'transparent'],
  ['motorpal-logo-light.svg', 'motorpal-logo-white.pdf', 1360, 400, '#FFFFFF'],
  ['motorpal-logo-dark.svg', 'motorpal-logo-dark.pdf', 1360, 400, '#0F172A'],
  ['motorpal-mark-only.svg', 'motorpal-mark-on-dark.pdf', 1080, 1080, '#0F172A'],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  for (const [src, out, w, h, bg] of jobs) {
    const svg = fs.readFileSync(path.join(D, src), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '')
      .replace('<svg ', `<svg style="width:${w}px;height:${h}px;display:block" `);
    await p.setContent(`<html><head><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap" rel="stylesheet"><style>*{margin:0}html,body{background:${bg}}</style></head><body>${svg}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.pdf({ path: path.join(O, out), width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '1' });
    fs.copyFileSync(path.join(D, src), path.join(O, src));
  }
  await b.close();
})();
