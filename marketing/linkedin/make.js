// Draws the five MotorPal LinkedIn launch posts as 1080x1350 PNGs (LinkedIn's tallest feed size).
// Run from the project folder: node marketing/linkedin/make.js
// Uses the app screenshots in website/img/ (retake them first with development/tools/app-screenshots.js).
// Needs Playwright (pre-installed in Claude's cloud sessions) and internet for the font.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'posts');
fs.mkdirSync(OUT, { recursive: true });

const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'website', 'img', f)).toString('base64');
// The Four pillars mark, drawn here so each segment can be lit on its own.
const SEG = [
  'M134.38 403.62 A172.0 172.0 0 0 1 90.76 234.26 L133.03 246.47 A128.0 128.0 0 0 0 165.49 372.51 Z',
  'M99.51 210.62 A172.0 172.0 0 0 1 242.91 110.50 L246.26 154.37 A128.0 128.0 0 0 0 139.54 228.88 Z',
  'M268.11 110.43 A172.0 172.0 0 0 1 412.08 209.73 L372.15 228.22 A128.0 128.0 0 0 0 265.01 154.32 Z',
  'M420.97 233.31 A172.0 172.0 0 0 1 378.32 402.92 L347.03 371.99 A128.0 128.0 0 0 0 378.76 245.77 Z'];
const mark = (size, on = [0, 1, 2, 3], tile = false) => `<svg width="${size}" height="${size}" viewBox="0 0 512 512">${tile ? '<rect width="512" height="512" rx="112" fill="#050505"/>' : ''}
  ${SEG.map((d, i) => `<path d="${d}" fill="${on.includes(i) ? '#00A86B' : 'rgba(255,255,255,.12)'}"/>`).join('')}
  <path d="M256 282 L352 232" stroke="#fff" stroke-width="28" stroke-linecap="round"/><circle cx="256" cy="282" r="30" fill="#fff"/></svg>`;
const ic = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  fuel: '<path d="M4 20V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 20h12M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8l-3-3"/><path d="M7 7h4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',
  glove: '<rect x="3" y="7" width="18" height="11" rx="2"/><path d="M3 11h18M10 14h4"/>',
  chat: '<path d="M5 18l-1.5 3.5L8 19.5h9a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v8"/><path d="M8 9.5h8M8 13h5"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3h0V4z"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.8 16a4.8 4.8 0 0 1 6.4 0"/><circle cx="12" cy="19.3" r="1"/>',
  lang: '<path d="M4 5h9M8.5 3v2M6 5c.5 4 3 7 6 8.5M11 5c-.5 4-3 7-6.5 8.5"/><path d="M13 21l4-9 4 9M14.5 18h5"/>',
  chain: '<rect x="2.5" y="9" width="8" height="6" rx="3"/><rect x="13.5" y="9" width="8" height="6" rx="3"/><path d="M9 12h6"/>'
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#EAF2EE;overflow:hidden;
  background:radial-gradient(900px 600px at 90% -10%,rgba(0,196,127,.20),transparent 70%),#06150F;-webkit-font-smoothing:antialiased}
.pad{position:absolute;inset:0;padding:84px 84px 0}
.brand{display:flex;align-items:center;gap:16px;font-weight:800;font-size:34px;letter-spacing:-.01em}
.foot{position:absolute;left:84px;right:84px;bottom:64px;display:flex;justify-content:space-between;align-items:center;font-size:24px;color:#A9C4B8;font-weight:600}
.foot b{color:#00C47F;font-weight:700}
.kick{display:inline-block;padding:10px 22px;border-radius:999px;background:rgba(0,196,127,.14);color:#3EE0A4;font-weight:700;font-size:24px}
h1{font-size:84px;line-height:1.04;letter-spacing:-.035em;font-weight:800}
h1 em{font-style:normal;color:#00C47F}
.sub{font-size:32px;line-height:1.45;color:#B3C6BE;font-weight:500}
.card{background:#23342E;border-radius:32px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 30px 60px -30px rgba(0,0,0,.6)}
.ic{width:72px;height:72px;border-radius:50%;background:#050505;color:#00C47F;display:grid;place-items:center;flex:none}
.ic svg{width:36px;height:36px}
.phone{width:372px;border-radius:52px;padding:12px;background:#050505;box-shadow:0 0 0 2px rgba(0,196,127,.25),0 50px 90px -30px rgba(0,0,0,.8)}
.phone img{display:block;width:100%;border-radius:40px}
`;

const brand = `<div class="brand">${mark(64, [0, 1, 2, 3], true)}MotorPal</div>`;
const foot = (n, txt) => `<div class="foot"><span>${txt}</span><span>${n} / 5</span></div>`;

const posts = [
  // 1. Introducing MotorPal
  ['01-introducing', `<div class="pad">
    ${brand}
    <div style="position:absolute;left:0;right:0;top:230px;display:grid;place-items:center">${mark(420)}</div>
    <div style="position:absolute;left:84px;right:84px;top:720px">
      <span class="kick">Coming soon in Sri Lanka</span>
      <h1 style="margin-top:28px">Your vehicle's whole life, <em>in one place.</em></h1>
      <p class="sub" style="margin-top:28px">Reminders, service records, fuel and costs, and warranties. Kept for you, explained in plain words.</p>
    </div>
    ${foot(1, '<b>Introducing MotorPal</b>')}</div>`],

  // 2. The problem
  ['02-the-problem', `<div class="pad">
    ${brand}
    <h1 style="margin-top:80px">Where is your car's <em>service history</em> right now?</h1>
    <div style="display:grid;gap:22px;margin-top:64px">
      ${[['glove', 'In the glovebox', 'Faded receipts and a stamp book, if it survived.'],
         ['chat', 'In a WhatsApp chat', 'A photo from the garage, somewhere above 400 other messages.'],
         ['brain', 'In your memory', '"I think the oil was changed... around April?"']]
        .map(([i, t, s]) => `<div class="card" style="display:flex;gap:28px;align-items:center;padding:30px 34px"><span class="ic">${ic(I[i])}</span><div><p style="font-size:34px;font-weight:800">${t}</p><p class="sub" style="font-size:27px;margin-top:4px">${s}</p></div></div>`).join('')}
    </div>
    <p style="margin-top:56px;font-size:40px;font-weight:800;line-height:1.3">Deadlines get missed. Proof gets lost. <span style="color:#00C47F">We think owners deserve better.</span></p>
    ${foot(2, 'The problem we are solving')}</div>`],

  // 3. Four pillars
  ['03-four-pillars', `<div class="pad">
    ${brand}
    <h1 style="margin-top:72px;font-size:76px">Four pillars. <em>One app.</em></h1>
    <p class="sub" style="margin-top:20px">Each segment of our logo stands for one job MotorPal does for you.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:52px">
      ${[[0, 'bell', 'Reminders', 'Emission test, insurance and revenue licence, in the right order. Never miss one.'],
         [1, 'wrench', 'Service records', 'Every oil change and part, with the date, km and garage.'],
         [2, 'fuel', 'Fuel and costs', 'Know your km per litre and what each km really costs.'],
         [3, 'shield', 'Warranties', 'Battery, tyres and parts, with the date each one runs out.']]
        .map(([n, i, t, s]) => `<div class="card" style="padding:32px 30px 36px">
          <div style="display:flex;justify-content:space-between;align-items:center"><span class="ic">${ic(I[i])}</span>${mark(92, [n])}</div>
          <p style="font-size:36px;font-weight:800;margin-top:26px">${t}</p><p class="sub" style="font-size:26px;margin-top:10px">${s}</p></div>`).join('')}
    </div>
    ${foot(3, 'What MotorPal does')}</div>`],

  // 4. A look inside
  ['04-look-inside', `<div class="pad">
    ${brand}
    <h1 style="margin-top:64px;font-size:72px">Built for <em>Sri Lankan</em> owners.</h1>
    <div style="position:absolute;left:84px;top:430px;display:grid;gap:26px;width:420px">
      ${[['chain', 'Knows the order', 'Emission test, then insurance, then revenue licence.'],
         ['heart', 'Car health at a glance', 'Which parts are due, in km and days.'],
         ['wifi', 'Works offline', 'Your records stay on your phone.'],
         ['lang', 'Sinhala and Tamil', 'Coming soon, alongside English.']]
        .map(([i, t, s]) => `<div style="display:flex;gap:22px;align-items:flex-start"><span class="ic" style="width:64px;height:64px">${ic(I[i])}</span><div><p style="font-size:30px;font-weight:800">${t}</p><p class="sub" style="font-size:24px;margin-top:4px">${s}</p></div></div>`).join('')}
    </div>
    <div style="position:absolute;right:70px;top:400px;transform:rotate(3deg)"><div class="phone"><img src="${img('home.jpg')}"></div></div>
    ${foot(4, 'A first look at the app')}</div>`],

  // 5. Why it matters
  ['05-why-it-matters', `<div class="pad">
    ${brand}
    <span class="kick" style="margin-top:80px">Why this matters</span>
    <div class="card" style="margin-top:34px;padding:44px 44px 40px;background:#050505;box-shadow:0 0 0 2px rgba(0,196,127,.22)">
      <p style="font-size:150px;font-weight:800;letter-spacing:-.04em;line-height:1;color:#00C47F">2,700+</p>
      <p style="font-size:34px;font-weight:700;margin-top:16px;line-height:1.35">people lost their lives on Sri Lankan roads in 2025.</p>
      <p style="font-size:22px;color:#A9C4B8;margin-top:14px">Sri Lanka Police figures, as reported in the press.</p>
    </div>
    <h1 style="margin-top:64px;font-size:64px;line-height:1.12">A well-kept vehicle removes <em>one avoidable risk</em> for the people you carry.</h1>
    <p class="sub" style="margin-top:28px">MotorPal helps you keep it that way, and keeps the proof in one place.</p>
    ${foot(5, '<b>Follow us</b> for the launch')}</div>`]
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [name, body] of posts) {
    await p.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
      <style>${CSS}</style></head><body>${body}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, name + '.png') });
  }
  await b.close();
  console.log('Saved', posts.length, 'posts to', OUT);
})();
