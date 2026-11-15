// Renders modern.html to motorpal-logo-modern.png. Run from the repo root: node marketing/logo/make-modern.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 2600, height: 1400 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'modern.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'motorpal-logo-modern.png'), fullPage: true });
  await b.close();
})();
