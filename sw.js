/* ═══════════════════════════════════════════════════════════════
   LUMINA — Service Worker (sw.js)
   Ermöglicht:
   - Offline-Nutzung (App-Dateien werden gecacht)
   - Schnelleres Laden (Cache-First für App-Dateien)
   - PWA-Installation auf Homescreen
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME    = 'lumina-v1';
const CACHE_VERSION = '1.0.0';

/* Dateien die beim ersten Laden gecacht werden */
const STATIC_FILES = [
  './index.html',
  './style.css',
  './data.js',
  './ui.js',
  './learn.js',
  './garden.js',
  './import-export.js',
  './script.js',
  './manifest.json',
];

/* ── Installation: Alle statischen Dateien cachen ── */
self.addEventListener('install', (event) => {
  console.log('[Lumina SW] Installiere Version', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES);
    }).then(() => {
      // Sofort aktivieren ohne auf alten SW zu warten
      return self.skipWaiting();
    })
  );
});

/* ── Aktivierung: Alten Cache löschen ── */
self.addEventListener('activate', (event) => {
  console.log('[Lumina SW] Aktiviert');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

/* ── Fetch: Cache-First für App-Dateien, Network für Firebase ── */
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Firebase und Google Fonts: immer vom Netzwerk laden
  if (
    url.includes('firebase') ||
    url.includes('googleapis.com') ||
    url.includes('gstatic.com') ||
    url.includes('firebaseapp.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // App-Dateien: Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Nicht im Cache: vom Netzwerk laden und cachen
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline und nicht gecacht: Fallback auf index.html
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
