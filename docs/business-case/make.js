// Turns business-case.html into motorpal-road-safety-business-case.pdf (A4). Run from the repo root: node docs/business-case/make.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + path.join(__dirname, 'business-case.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  await p.pdf({ path: path.join(__dirname, 'motorpal-road-safety-business-case.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
})();
