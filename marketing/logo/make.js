// Renders concepts.html to motorpal-logo-concepts.png. Run from the repo root: node marketing/logo/make.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1800, height: 1180 }, deviceScaleFactor: 2 });
  await page.goto('file://' + path.join(__dirname, 'concepts.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, 'motorpal-logo-concepts.png'), fullPage: true });
  await b.close();
})();
