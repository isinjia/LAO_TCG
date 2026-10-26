// 개발용 UI 자동 플레이 봇 — 브라우저 콘솔에서 로드해 실제 화면 입력(포인터·클릭)으로 전투를 끝까지 진행한다.
// 사용: const s = document.createElement('script'); s.src = 'tools/uibot.js'; document.head.appendChild(s);
//       await uiBot(60000)            // 결과 화면까지
//       await uiBot(60000, 4)         // 4라운드 내 턴에서 멈춤
window.__errs = [];
window.addEventListener('error', e => window.__errs.push(e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
window.addEventListener('unhandledrejection', e => { if (typeof BATTLE_ABORT === 'undefined' || e.reason !== BATTLE_ABORT) window.__errs.push('rej: ' + (e.reason && e.reason.stack || e.reason)); });
window.noAnim = () => { if (document.getElementById('noanim')) return; const st = document.createElement('style'); st.id = 'noanim'; st.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important}'; document.head.appendChild(st); };
window.uiBot = async function (maxMs, stopRound) {
  const W = ms => new Promise(r => setTimeout(r, ms));
  const t0 = performance.now();
  const at = el => { const r = el.getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, pointerId: 1, bubbles: true }; };
  for (let i = 0; i < 50 && !B; i++) await W(100);
  while (B && !B.resultShown && performance.now() - t0 < maxMs) {
    await W(120);
    const nx = document.querySelector('#coach.show [data-a=next]'); if (nx) { nx.click(); continue; }
    const top = topModal();
    if (top) { const ok = top.querySelector('[data-a=ok]'); if (ok) { ok.click(); continue; } }
    if (!canAct()) continue;
    if (stopRound && B.game.round() >= stopRound) return { stopped: true, round: B.game.round() };
    // 튜토리얼이 지원 카드·포격 지원을 직접 해 보라고 기다리는 단계면 그대로 따른다
    const st = Tutorial.active && !Tutorial.waitingTrigger && TUTORIAL_STEPS[Tutorial.i];
    if (st && st.can && st.wait === 'moved' && st.can()) {
      const u = B.me.units().find(x => [0, 1, 2].some(l => B.game.canMove(x, l))), l = [0, 1, 2].find(k => B.game.canMove(u, k));
      document.querySelector(`.slot[data-side=me][data-lane="${B.me.lanes.indexOf(u)}"]`).click(); await W(60);
      document.querySelector(`.slot[data-side=me][data-lane="${l}"]`).click();
      for (let k = 0; k < 300 && B && B.busy; k++) await W(50);
      continue;
    }
    if (st && st.can && st.wait === 'cardPlayed' && st.can()) {
      if (st.cond(COMMAND_CARD)) { document.querySelector('.cmd-power').click(); await W(60); document.querySelector('#cmd-enemy').click(); }
      else {
        const sk = B.me.hand.find(c => c.kind === 'skill' && B.me.canAfford(c)), ce = document.querySelectorAll('.hand .card')[B.me.hand.indexOf(sk)];
        ce.dispatchEvent(new PointerEvent('pointerdown', at(ce))); window.dispatchEvent(new PointerEvent('pointerup', at(ce))); await W(60);
        document.querySelector(`.slot[data-side=me][data-lane="${B.me.lanes.findIndex(Boolean)}"]`).click();
      }
      for (let k = 0; k < 300 && B && B.busy; k++) await W(50);
      continue;
    }
    const act = AI.heuristicAction(B.game, B.me);
    if (!act) { document.querySelector('.end-btn').click(); continue; }
    const ce = document.querySelectorAll('.hand .card')[B.me.hand.indexOf(act.card)];
    ce.dispatchEvent(new PointerEvent('pointerdown', at(ce))); window.dispatchEvent(new PointerEvent('pointerup', at(ce)));
    await W(60);
    if (act.card.kind === 'skill' && skillTargetKind(act.card) === 'none') { const cb = document.querySelector('.cast-btn'); if (cb) cb.click(); }
    else if (act.card.kind === 'unit') document.querySelector(`.slot[data-side=me][data-lane="${act.lane}"]`).click();
    else if (act.target) {
      if (act.target.cmd) document.querySelector('#cmd-enemy').click();
      else { const own = act.target.unit.owner === B.me; const i = act.target.unit.owner.lanes.indexOf(act.target.unit); document.querySelector(`.slot[data-side=${own ? 'me' : 'enemy'}][data-lane="${i}"]`).click(); }
    }
    for (let k = 0; k < 300 && B && B.busy; k++) await W(50);
  }
  return B ? { done: !!B.resultShown, winner: B.game.winner && B.game.winner.name, round: B.game.round(), hp: [B.me.hp, B.ai.hp], errs: window.__errs } : { left: true, errs: window.__errs };
};
