// "Coming soon" still for every social platform: a neon mint pulse line that rises and traces the MotorPal gauge,
// drops back to a heartbeat, with the name and "Coming soon" below. Same look as the website's pulse line.
// Run from the project folder: node marketing/coming-soon/make.js   (needs Playwright and internet for the font)
// Saves square (1080x1080, any feed), portrait (1080x1350, Instagram and LinkedIn) and story (1080x1920, stories and status).
const { chromium } = require('playwright');
const path = require('path');
const OUT = __dirname;

// The logo's four segments, centred on (256, 282) in its 512 box; outer radius 172.
const SEG = [
  'M134.38 403.62 A172.0 172.0 0 0 1 90.76 234.26 L133.03 246.47 A128.0 128.0 0 0 0 165.49 372.51 Z',
  'M99.51 210.62 A172.0 172.0 0 0 1 242.91 110.50 L246.26 154.37 A128.0 128.0 0 0 0 139.54 228.88 Z',
  'M268.11 110.43 A172.0 172.0 0 0 1 412.08 209.73 L372.15 228.22 A128.0 128.0 0 0 0 265.01 154.32 Z',
  'M420.97 233.31 A172.0 172.0 0 0 1 378.32 402.92 L347.03 371.99 A128.0 128.0 0 0 0 378.76 245.77 Z'];

function art(W, H, cy, s) {
  // logo coordinates -> canvas: (256, 282) lands on (W/2, cy), scaled by s
  const X = x => W / 2 + (x - 256) * s, Y = y => cy + (y - 282) * s;
  const base = Y(403.3), R = 172 * s;
  const ecg = (x, k = 1) => `L${x} ${base} q${8 * k} ${-9 * k} ${16 * k} 0 L${x + 30 * k} ${base} l${6 * k} ${9 * k} l${9 * k} ${-60 * k} l${9 * k} ${74 * k} l${8 * k} ${-23 * k} L${x + 76 * k} ${base} q${14 * k} ${-16 * k} ${28 * k} 0`;
  const k = W / 1080;
  // the pulse: heartbeats from the left, up into the dial's outer edge, round the top, down the right side, heartbeats on
  const pulse = `M-40 ${base} ${ecg(70 * k, k)} ${ecg(250 * k, k)} L${X(134.38)} ${base} L${X(134.38)} ${Y(403.62)} A${R} ${R} 0 1 1 ${X(378.32)} ${Y(402.92)} L${X(378.32)} ${base} ${ecg(W - 360 * k, k)} ${ecg(W - 190 * k, k)} L${W + 40} ${base}`;
  const g = `transform="translate(${W / 2 - 256 * s} ${cy - 282 * s}) scale(${s})"`;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${6 * k}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${26 * k}"/></filter>
    <linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#00C47F" stop-opacity="0"/><stop offset=".22" stop-color="#00C47F" stop-opacity=".55"/><stop offset=".5" stop-color="#3EE0A4"/><stop offset=".78" stop-color="#00C47F" stop-opacity=".55"/><stop offset="1" stop-color="#00C47F" stop-opacity="0"/></linearGradient>
    <radialGradient id="dot"><stop offset="0" stop-color="#3EE0A4" stop-opacity=".8"/><stop offset="1" stop-color="#00C47F" stop-opacity="0"/></radialGradient>
    <radialGradient id="halo"><stop offset="0" stop-color="#00C47F" stop-opacity=".30"/><stop offset="1" stop-color="#00C47F" stop-opacity="0"/></radialGradient>
  </defs>
  <circle cx="${W / 2}" cy="${cy}" r="${R * 1.9}" fill="url(#halo)"/>
  <!-- dial: the four pillars as glowing neon outlines with a faint fill -->
  <g ${g} filter="url(#glow)">${SEG.map(d => `<path d="${d}" fill="rgba(0,196,127,.16)" stroke="#00C47F" stroke-width="${3 / s}" stroke-linejoin="round"/>`).join('')}
    <path d="M256 282 L352 232" stroke="#fff" stroke-width="22" stroke-linecap="round"/><circle cx="256" cy="282" r="26" fill="#fff"/></g>
  <!-- the pulse line, soft glow underneath, crisp line on top, brightest at the dial -->
  <path d="${pulse}" fill="none" stroke="#00C47F" stroke-width="${10 * k}" stroke-linejoin="round" stroke-linecap="round" opacity=".35" filter="url(#soft)"/>
  <path d="${pulse}" fill="none" stroke="url(#fade)" stroke-width="${3.4 * k}" stroke-linejoin="round" stroke-linecap="round" filter="url(#glow)"/>
  <!-- the monitor's moving dot, on the right-hand line -->
  <circle cx="${W - 48 * k}" cy="${base}" r="${30 * k}" fill="url(#dot)"/>
  <circle cx="${W - 48 * k}" cy="${base}" r="${6 * k}" fill="#E6FFF4"/>
</svg>`;
}

const page = (W, H, cy, s, textTop) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#EAF2EE;
  background:radial-gradient(${W * .8}px ${W * .55}px at 50% ${cy}px,rgba(0,196,127,.10),transparent 70%),
  linear-gradient(rgba(0,196,127,.045) 1px,transparent 1px) 0 0/${W / 27}px ${W / 27}px,
  linear-gradient(90deg,rgba(0,196,127,.045) 1px,transparent 1px) 0 0/${W / 27}px ${W / 27}px,#030B08}
svg{position:absolute;inset:0}
.txt{position:absolute;left:0;right:0;top:${textTop}px;text-align:center}
.name{font-size:${W * .13}px;font-weight:800;letter-spacing:-.035em;line-height:1;text-shadow:0 0 40px rgba(0,196,127,.35)}
.name span{color:#00C47F}
.soon{display:inline-block;margin-top:${W * .035}px;padding:${W * .012}px ${W * .034}px;border-radius:999px;font-size:${W * .033}px;font-weight:700;color:#3EE0A4;
  box-shadow:inset 0 0 0 2px rgba(0,196,127,.55),0 0 30px -6px rgba(0,196,127,.8);background:rgba(0,196,127,.07)}
</style></head><body>${art(W, H, cy, s)}<div class="txt"><p class="name">Motor<span>Pal</span></p><p class="soon">Coming soon</p></div></body></html>`;

const SIZES = [
  ['motorpal-coming-soon-square', 1080, 1080, 430, 1.05, 655],
  ['motorpal-coming-soon-portrait', 1080, 1350, 540, 1.12, 810],
  ['motorpal-coming-soon-story', 1080, 1920, 780, 1.25, 1140]
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, W, H, cy, s, top] of SIZES) {
    await p.setViewportSize({ width: W, height: H });
    await p.setContent(page(W, H, cy, s, top), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name + '.png') });
  }
  await b.close();
  console.log('Saved', SIZES.length, 'images to', OUT);
})();
