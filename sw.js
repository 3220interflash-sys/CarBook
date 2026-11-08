'use strict';
/* CarBook offline support.
   Keeps a copy of the app's files on the phone so it opens without internet.
   When you change any app file, bump VERSION so phones fetch the new copy. */
const VERSION = 'carbook-v12';
const FILES = ['./', 'index.html', 'styles.css', 'strings.js', 'app.js', 'manifest.webmanifest', 'icon.svg', 'privacy.html', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
const FONT_CACHE = 'carbook-fonts';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

// Remove copies left over from older versions.
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fonts: use the saved copy, fetch once when online.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  if (url.origin !== location.origin) return;
  // The website in /website/ is a normal web page: leave it to the browser.
  if (url.pathname.includes('/website/')) return;

  // App files: get the newest copy when online (and save it), use the saved copy when offline.
  e.respondWith(fetch(req).then(res => { if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone())); return res; })
    .catch(() => caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }).then(hit => hit || c.match('index.html')))));
});
