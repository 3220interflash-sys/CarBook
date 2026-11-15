// Renders face.html to PNGs. Run from the repo root: node marketing/logo/make-face.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  for (const [f, out] of [['face.html', 'motorpal-logo-gauge-face.png']]) {
    const page = await b.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
    await page.goto('file://' + path.join(__dirname, f));
    await page.evaluate(() => document.fonts.ready);
    const w = await page.evaluate(() => document.body.scrollWidth);
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(__dirname, out), fullPage: true });
    await page.close();
  }
  await b.close();
})();
