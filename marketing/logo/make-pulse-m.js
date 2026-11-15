// Renders pulse-m.html to motorpal-logo-pulse-m.png. Run from the repo root: node marketing/logo/make-pulse-m.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1900, height: 1400 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'pulse-m.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'motorpal-logo-pulse-m.png'), fullPage: true });
  await b.close();
})();
