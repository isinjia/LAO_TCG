// 오프라인 캐시 (웹 배포용). 개발 서버(localhost)에서는 등록하지 않는다 — main.js 참고.
// 코드(html·js·css)는 네트워크 우선이라 새 버전이 바로 반영된다.
// 그림·소리·글꼴은 캐시에서 먼저 보여 주고, 뒤에서 새로 받아 캐시를 갱신한다 (같은 이름으로 고친 파일도 다음 방문에 반영).
// 자원 구성을 크게 바꾸면 CACHE 이름을 올려 예전 캐시를 한 번에 지운다.
const CACHE = 'lao-tcg-v7';
const CODE = /\.(html|js|css|webmanifest)$|\/$/;

// 설치할 때 precache.txt(배포 작업이 만든 목록)의 파일을 미리 받아 둔다. 첫 방문 뒤 바로 오프라인이 되어도 대국을 할 수 있게.
// 목록이 없거나 일부를 받지 못해도 설치는 계속한다 (볼 때 받는 방식으로 돌아간다).
self.addEventListener('install', e => {
  self.skipWaiting();
  // 데이터 절약 모드이거나 느린 연결이면 미리 받지 않는다 (볼 때 받는 방식으로)
  const c = self.navigator && self.navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
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
  const key = url.origin + url.pathname; // 꼬리표를 뺀 주소로 저장해 같은 파일이 두 번 쌓이지 않게 한다
  const put = res => { if (res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {}); } return res; };
  // 페이지는 버전 꼬리표(?v=…)를 붙여 파일을 부르고, 미리 받기 목록에는 꼬리표가 없다. 캐시 조회는 꼬리표를 무시한다.
  const any = { ignoreSearch: true };
  if (req.mode === 'navigate') {
    // 게임 주소("/"로 끝남)로 들어올 때 오프라인이면 미리 받아 둔 index.html로 연다
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req, any).then(hit => hit || caches.match('index.html', any))));
  } else if (CODE.test(url.pathname)) {
    e.respondWith(fetch(req).then(put).catch(() => caches.match(req, any)));
  } else {
    e.respondWith(caches.match(req, any).then(hit => {
      const fresh = fetch(req).then(put).catch(() => hit);
      if (hit) { e.waitUntil(fresh); return hit; }
      return fresh;
    }));
  }
});
