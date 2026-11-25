// Turns clip.html (the teaser: neon pulse traces the car, faint icons behind) into a 9-second vertical video, 1080 x 1920, 30 fps.
// Run from the project folder: node marketing/coming-soon/render-clip.js          (the video)
//                              node marketing/coming-soon/render-clip.js stills   (a few frames to check the look)
// Needs Playwright and ffmpeg (both are in Claude's cloud sessions) and internet for the font.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const DIR = __dirname, FPS = 30, SECS = 9;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + path.join(DIR, 'clip.html') + '?still');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  if (process.argv[2] === 'stills') {
    for (const t of [2.0, 2.9, 3.6, 4.4, 5.6, 7.3]) {
      await p.evaluate(t => seek(t), t);
      await p.screenshot({ path: path.join(DIR, `check-${String(t).replace('.', '_')}.jpg`), type: 'jpeg', quality: 80 });
    }
  } else {
    const file = path.join(DIR, 'motorpal-teaser-car-clip.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-shortest',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < FPS * SECS; f++) {
      await p.evaluate(t => seek(t), f / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
    console.log('made', file);
  }
  await b.close();
})();
