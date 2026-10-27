// ===== 부트스트랩 =====
window.addEventListener('DOMContentLoaded', async () => {
  Store.load();
  // 다른 탭에서 저장이 바뀌면 이 탭의 오래된 데이터로 덮어쓰지 않도록 다시 불러온다
  window.addEventListener('storage', e => {
    if (e.key !== STORE_KEY || e.newValue === null) return;
    Store.load();
    toast('다른 창에서 진행 상황이 바뀌어 다시 불러왔습니다. 한 창에서만 플레이하는 것을 권장합니다.', true);
    if (currentScreen && currentScreen !== 'battle') showScreen('lobby', { instant: true });
  });
  Audio2.init();
  fitStage();
  applySpeedVar();
  window.addEventListener('resize', fitStage);
  // 중간 크기 화면(1280x720 등, 배율 0.6~0.8): 보조 글자를 조금 키운다 (lo_skin.css의 .mid)
  const markMid = () => document.body.classList.toggle('mid', stageScale >= 0.6 && stageScale < 0.8);
  markMid(); window.addEventListener('resize', markMid);
  // 포커스·scrollIntoView 등으로 화면이 밀리지 않도록 스크롤을 고정한다
  const lockScroll = () => {
    if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
    for (const el of [$('#viewport'), $('#stage')]) { if (el.scrollTop || el.scrollLeft) { el.scrollTop = 0; el.scrollLeft = 0; } }
  };
  window.addEventListener('scroll', lockScroll, true);
  document.addEventListener('dragstart', e => e.preventDefault());
  // 터치: 길게 누르면 우클릭(상세 보기)으로 처리한다. iOS는 contextmenu가 없어서 직접 만든다. 손패 카드는 전투 코드가 따로 처리한다.
  let lp = null, lastTouch = 0;
  // 안드로이드가 스스로 보내는 길게 누르기 우클릭은 막고, 위에서 만든 것만 쓴다 (상세 창이 두 번 열리지 않게)
  document.addEventListener('contextmenu', e => { if (e.isTrusted && Date.now() - lastTouch < 1500) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') lastTouch = Date.now();
    if (e.pointerType !== 'touch' || (e.target.closest && e.target.closest('.hand'))) return;
    const t = e.target, x = e.clientX, y = e.clientY;
    lp = { x, y, timer: setTimeout(() => { lp = null; t.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y })); }, 550) };
  });
  const lpCancel = e => { if (lp && (e.type !== 'pointermove' || Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 12)) { clearTimeout(lp.timer); lp = null; } };
  ['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, lpCancel));
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('#stage')) e.preventDefault(); });
  // 터치로 목록을 밀어 넘긴다. 손가락 움직임을 무대 좌표로 바꿔 쓰므로 무대가 90도 돌아간 세로 화면에서도 손가락 방향대로 움직이고,
  // 손을 떼면 관성으로 조금 더 미끄러진다. 밀어 넘긴 뒤 손을 뗄 때의 클릭은 카드 선택으로 치지 않는다
  const scrollerOf = el => {
    for (let e = el; e && e.id !== 'stage'; e = e.parentElement) {
      if (e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY)) return e;
    }
    return null;
  };
  let ds = null, dragEnd = 0, glide = 0;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    cancelAnimationFrame(glide);
    const sc = scrollerOf(e.target); if (!sc) return;
    const p = stagePoint(e.clientX, e.clientY);
    ds = { sc, id: e.pointerId, y0: p.y, top: sc.scrollTop, moved: false, lastY: p.y, lastT: performance.now(), v: 0 };
  });
  document.addEventListener('pointermove', e => {
    if (!ds || e.pointerId !== ds.id) return;
    const y = stagePoint(e.clientX, e.clientY).y, now = performance.now();
    if (!ds.moved && Math.abs(y - ds.y0) < 10) return;
    ds.moved = true;
    ds.sc.scrollTop = ds.top - (y - ds.y0);
    const dt = Math.max(1, now - ds.lastT); ds.v = 0.8 * ((ds.lastY - y) / dt) + 0.2 * ds.v; ds.lastY = y; ds.lastT = now;
  });
  const dsEnd = e => {
    if (!ds || e.pointerId !== ds.id) return;
    const d = ds; ds = null;
    if (!d.moved) return;
    dragEnd = performance.now();
    let v = performance.now() - d.lastT > 80 ? 0 : d.v, last = performance.now(); // 멈췄다가 떼면 미끄러지지 않는다
    const step = now => { const dt = now - last; last = now; d.sc.scrollTop += v * dt; v *= Math.pow(0.995, dt); if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step); };
    if (Math.abs(v) > 0.05) glide = requestAnimationFrame(step);
  };
  document.addEventListener('pointerup', dsEnd);
  document.addEventListener('pointercancel', dsEnd);
  document.addEventListener('click', e => { if (performance.now() - dragEnd < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
  window.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) { if (e.key === 'Escape') e.target.blur(); return; }
    if ($('#dialogue').classList.contains('show')) return;
    if (battleKey(e)) return;
    const top = topModal();
    if (top) {
      if (e.key === 'Escape' && top._closable) closeModal(top);
      if (top._keyNav && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) top._keyNav(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    if (e.key === 'Escape' && currentScreen && !['lobby', 'loading', 'battle'].includes(currentScreen)) showScreen('lobby');
  });
  // 웹 배포본에서만 오프라인 캐시를 켠다 (개발 중에는 수정한 파일이 캐시에 가려지지 않도록 끔)
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) navigator.serviceWorker.register('sw.js').catch(() => {});
  await runLoading();
  await showScreen('lobby');
});
