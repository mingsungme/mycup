/* My Cup — 설치(PWA) 가능하게 만들기 위한 최소 서비스워커.
   네트워크 우선(항상 최신 파일을 받아오고, 오프라인일 때만 캐시로 폴백) —
   API 호출(YouTube/Gemini/iTunes)도 같은 방식으로 통과하되 실패해도 캐시가 없어 그냥 실패함(정상). */
const CACHE = 'mycup-shell-v2';
const SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
