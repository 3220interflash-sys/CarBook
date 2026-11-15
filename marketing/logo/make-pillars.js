// Renders final/*.svg into PNGs (2x) and Canva-ready PDFs. Run from the repo root: node marketing/logo/make-pillars.js
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, 'final');
const FONT = '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700&display=swap" rel="stylesheet">';
const jobs = [
  ['motorpal-icon.svg', 'motorpal-icon', 1024, 1024, 'transparent'],
  ['motorpal-mark-only.svg', 'motorpal-mark-on-dark', 1024, 1024, '#050505'],
  ['motorpal-logo-light.svg', 'motorpal-logo-white', 1360, 400, '#FFFFFF'],
  ['motorpal-logo-dark.svg', 'motorpal-logo-dark', 1360, 400, '#050505'],
];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
  for (const [src, out, w, h, bg] of jobs) {
    const svg = fs.readFileSync(path.join(D, src), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '')
      .replace('<svg ', `<svg style="width:${w}px;height:${h}px;display:block" `);
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><head>${FONT}<style>*{margin:0}html,body{background:${bg}}</style></head><body>${svg}</body></html>`);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(D, out + '.png'), omitBackground: bg === 'transparent' });
    await p.pdf({ path: path.join(D, out + '.pdf'), width: w + 'px', height: h + 'px', printBackground: true, pageRanges: '1' });
  }
  await b.close();
})();
