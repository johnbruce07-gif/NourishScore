// NourishCoach Service Worker — scope: /coach/
const CACHE = 'nourishcoach-v1';
const SHELL = ['./index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Never cache Anthropic API calls
  if (url.hostname === 'api.anthropic.com') return;

  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request);
      const netFetch = fetch(e.request).then(res => {
        if (res?.status === 200 && res.type !== 'opaque') cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);

      if (cached) { netFetch.catch(() => {}); return cached; }
      const net = await netFetch;
      if (net) return net;
      if (e.request.mode === 'navigate') {
        const fallback = await cache.match('./index.html');
        if (fallback) return fallback;
      }
      return new Response('NourishCoach is offline.', { status: 503 });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
