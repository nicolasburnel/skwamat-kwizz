// Skwamat Kwizz — fonctionnement hors connexion.
// Augmentez VERSION à chaque modification du code (css/js/html) pour forcer la mise à jour.
const VERSION = 'sk-app-v6';
const MEDIA = 'sk-media-v1';
const SHELL = ['./', 'index.html', 'css/style.css', 'js/app.js', 'data/especes.csv', 'data/medias.json', 'data/inat.json', 'data/photos.csv', 'manifest.webmanifest',
  'assets/icon-sk-192.png', 'assets/icon-sk-512.png', 'assets/logo-sk-noir.png', 'assets/logo-sk-blanc.png', 'assets/mark-sk-noir.png', 'assets/mark-sk-blanc.png',
  'assets/fonts/nunito-latin-400-normal.woff2', 'assets/fonts/nunito-latin-400-italic.woff2', 'assets/fonts/nunito-latin-600-normal.woff2',
  'assets/fonts/nunito-latin-600-italic.woff2', 'assets/fonts/nunito-latin-700-normal.woff2', 'assets/fonts/nunito-latin-800-normal.woff2',
  'assets/fonts/barlow-condensed-latin-600-normal.woff2', 'assets/fonts/barlow-condensed-latin-700-normal.woff2'];
const INAT_IMG = /inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org/;

self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== MEDIA).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (INAT_IMG.test(url.host)) {
    // photos iNaturalist : cache d'abord, gardées pour le hors-ligne
    e.respondWith(caches.open(MEDIA).then(c => c.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') c.put(e.request, r.clone()); return r; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // appli et données : réseau d'abord (pour recevoir les mises à jour), cache si hors connexion
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
});
