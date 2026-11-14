// Turns scenes.html into three 20 second vertical videos (1080 x 1920, 30 fps) plus one 60 second cut.
// Run from the repo root:  node marketing/video/render.js        (all parts)
//                          node marketing/video/render.js 2      (one part)
//                          node marketing/video/render.js stills (a few frames to check the look)
// Needs Playwright and ffmpeg (both are in Claude's cloud sessions) and internet for the font.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname, OUT = path.join(DIR, 'out');
const FPS = 30, SECS = 20;
const arg = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

async function open(browser, part) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(DIR, 'scenes.html') + '?part=' + part);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  return page;
}

(async () => {
  const browser = await chromium.launch();
  if (arg === 'stills') {
    const times = [0.8, 2.5, 5, 8, 12, 15, 16.8, 19.5];
    for (const part of [1, 2, 3]) {
      const page = await open(browser, part);
      for (const t of times) {
        await page.evaluate(t => seek(t), t);
        await page.screenshot({ path: path.join(OUT, `still-${part}-${String(t).replace('.', '_')}.jpg`), type: 'jpeg', quality: 80 });
      }
      await page.close();
    }
  } else {
    const parts = arg ? [+arg] : [1, 2, 3];
    for (const part of parts) {
      const file = path.join(OUT, `carbook-part${part}.mp4`);
      const page = await open(browser, part);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS),
        '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = 0; f < FPS * SECS; f++) {
        await page.evaluate(t => seek(t), f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await new Promise(r => ff.on('close', r));
      await page.close();
      console.log('made', file);
    }
    if (!arg) {
      const list = path.join(OUT, 'list.txt');
      fs.writeFileSync(list, [1, 2, 3].map(n => `file 'carbook-part${n}.mp4'`).join('\n'));
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(OUT, 'carbook-all-60s.mp4')]);
      fs.unlinkSync(list);
      console.log('made carbook-all-60s.mp4');
    }
  }
  await browser.close();
})();
