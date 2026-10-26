// ===== 부트스트랩 =====
window.addEventListener('DOMContentLoaded', async () => {
  Store.load();
  Audio2.init();
  fitStage();
  applySpeedVar();
  window.addEventListener('resize', fitStage);
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
