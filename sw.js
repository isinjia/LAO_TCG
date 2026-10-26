// 오프라인 캐시 (웹 배포용). 개발 서버(localhost)에서는 등록하지 않는다 — main.js 참고.
// 코드(html·js·css)는 네트워크 우선이라 새 버전이 바로 반영된다.
// 그림·소리·글꼴은 캐시에서 먼저 보여 주고, 뒤에서 새로 받아 캐시를 갱신한다 (같은 이름으로 고친 파일도 다음 방문에 반영).
// 자원 구성을 크게 바꾸면 CACHE 이름을 올려 예전 캐시를 한 번에 지운다.
const CACHE = 'lao-tcg-v3';
const CODE = /\.(html|js|css|webmanifest)$|\/$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // 음원의 부분 응답(206)이나 범위 요청은 캐시에 넣지 않는다 (Cache API가 거부한다)
  if (req.headers.has('range')) return;
  const put = res => { if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); } return res; };
  if (CODE.test(url.pathname)) {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req)));
  } else {
    e.respondWith(caches.match(req).then(hit => {
      const fresh = fetch(req).then(put).catch(() => hit);
      if (hit) { e.waitUntil(fresh); return hit; }
      return fresh;
    }));
  }
});
