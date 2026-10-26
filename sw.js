// 오프라인 캐시 (웹 배포용). 개발 서버(localhost)에서는 등록하지 않는다 — main.js 참고.
// 코드(html·js·css)는 네트워크 우선이라 새 버전이 바로 반영된다.
// 그림·소리·글꼴은 캐시에서 먼저 보여 주고, 뒤에서 새로 받아 캐시를 갱신한다 (같은 이름으로 고친 파일도 다음 방문에 반영).
// 자원 구성을 크게 바꾸면 CACHE 이름을 올려 예전 캐시를 한 번에 지운다.
const CACHE = 'lao-tcg-v4';
const CODE = /\.(html|js|css|webmanifest)$|\/$/;

// 설치할 때 precache.txt(배포 작업이 만든 목록)의 파일을 미리 받아 둔다. 첫 방문 뒤 바로 오프라인이 되어도 대국을 할 수 있게.
// 목록이 없거나 일부를 받지 못해도 설치는 계속한다 (볼 때 받는 방식으로 돌아간다).
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(fetch('precache.txt').then(r => r.ok ? r.text() : '').then(async txt => {
    const files = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const cache = await caches.open(CACHE);
    for (let i = 0; i < files.length; i += 20) await Promise.all(files.slice(i, i + 20).map(f => cache.match(f).then(hit => hit || cache.add(f)).catch(() => {})));
  }).catch(() => {}));
});
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
