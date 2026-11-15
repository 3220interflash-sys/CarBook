// Turns motorpal-one-pager.html into a shareable PNG and a printable PDF.
// Run from the repo root: node marketing/one-pager/make.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'motorpal-one-pager.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'motorpal-one-pager.png') });
  await page.pdf({ path: path.join(__dirname, 'motorpal-one-pager.pdf'), width: '1080px', height: '1350px', printBackground: true, pageRanges: '1' });
  await b.close();
})();
