// Retakes the app screenshots the website shows (website/img/*.jpg) using the example vehicle.
// 1. In the main folder run:  python3 -m http.server 8080
// 2. In another terminal run: node development/tools/app-screenshots.js
// Needs Playwright (already in Claude's cloud sessions). Optional: pass another port, e.g. 8090.
const { chromium } = require('playwright');
const path = require('path');
const port = process.argv[2] || 8080;
const out = path.join(__dirname, '..', '..', 'website', 'img');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
  await p.addInitScript(() => { Date.prototype.getHours = function () { return 9; }; }); // "Good morning" in every shot
  const shot = name => p.screenshot({ path: path.join(out, name + '.jpg'), type: 'jpeg', quality: 86 });
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1200);
  await p.click('[data-act=example]'); await p.waitForTimeout(400);
  await shot('home');
  await p.click('[data-act=menu]'); await p.click('#menu [data-tab=lights]'); await p.waitForTimeout(300); await shot('lights');
  await p.click('[data-code=engine]'); await p.waitForTimeout(300); await shot('light-detail'); await p.click('[data-close]');
  await p.click('[data-tab=car]'); await p.click('[data-key=oil]'); await p.waitForTimeout(300); await shot('oil'); await p.click('[data-close]');
  await p.click('[data-tab=money]'); await p.waitForTimeout(500); await shot('money');
  await p.click('[data-tab=ask]'); await p.click('[data-act=suggest]'); await p.waitForTimeout(300); await p.click('[data-act=mechQs]'); await p.waitForTimeout(300);
  await p.evaluate(() => scrollTo(0, 0)); await shot('ask');
  await b.close();
  console.log('Saved 6 screenshots to website/img/');
})();
