// ===== 전투 화면 =====
let B = null; // { cfg, game, me, ai, unitEls, selected, pending, busy, drag, over }
// 재도전·로비 이동으로 B가 바뀌면 이전 전투의 비동기 흐름을 중단한다
const BATTLE_ABORT = { abort: true };
function alive(b) { if (!b || B !== b) throw BATTLE_ABORT; }
window.addEventListener('unhandledrejection', e => { if (e.reason === BATTLE_ABORT) e.preventDefault(); });
const ROLE_SFX = { L: 'rifle', M: 'shot', H: 'cannon' };
const FX_COLOR = { dmg: '#ff7a5a', heal: '#6bff88', shield: '#8fd4ff', buff: '#ffe08a', debuff: '#c08aff', slow: '#9fd8ff' };

// ---------- 시작 ----------
// 이어하지 않고 버린 대국은 패배로 기록한다 (순회전은 그 자리에서 끝난다). 새로고침으로 불리한 대국을 피하는 것을 막는다.
function abandonSavedBattle() {
  const snap = Store.loadBattle(); if (!snap) return false;
  Store.clearBattle();
  const rec = Store.data.record; rec.l++; rec.streak = 0;
  if (snap.cfg.mode === 'gauntlet') Gauntlet.finish(false, 0);
  if (snap.cfg.mode === 'draft') Draft.finish(false);
  Store.save();
  toast(`이어하지 않은 ${snap.cfg.enemy.name} 전은 패배로 기록되었습니다.`, true);
  return true;
}
// 진행 중인 대국이 저장돼 있으면 새로 시작하기 전에 확인한다
async function confirmAbandon() {
  const snap = Store.loadBattle(); if (!snap) return true;
  return confirmBox('진행 중인 대국', `${snap.cfg.enemy.name} 전이 아직 끝나지 않았습니다. 새 대국을 시작하면 그 대국은 패배로 기록됩니다.`, '패배 처리하고 시작', true);
}

function startBattle(cfg) {
  abandonSavedBattle(); // 새 전투를 시작하면 이전 진행 기록은 패배로 정리한다
  const me = new Player('오렌지에이드', cfg.myDeck, { portrait: 'PECS_Orangeade' }); // 주인공은 항상 오렌지에이드
  if (cfg.myHp) me.hp = Math.min(me.maxHp, cfg.myHp);
  if (cfg.tutorial) me.minHp = 1; // 튜토리얼은 질 수 없다 // 순회전·오늘의 대국: 깎인 라이프로 시작
  const ai = new Player(cfg.enemy.name, cfg.enemy.deck, { isAI: true, hp: cfg.enemy.hp, portrait: cfg.enemy.portrait, style: cfg.enemy.style });
  if (cfg.tutorial) { ai.noHpBonus = true; ai.noSynergy = true; } // 튜토리얼 상대는 지도에 적힌 라이프 그대로, 결속(방어막)도 없이 짧게
  if (cfg.openingHand) {
    // 지정한 카드가 먼저 뽑히도록 덱 끝에 쌓는다 (draw는 pop)
    const want = cfg.openingHand.map(id => me.deck.find(c => c.id === id)).filter(Boolean);
    me.deck = me.deck.filter(c => !want.includes(c)).concat(want.reverse());
  }
  let meFirst = cfg.first === 'me' ? true : cfg.first === 'ai' ? false : Math.random() < 0.5;
  const game = meFirst ? new Game(me, ai) : new Game(ai, me);
  (cfg.enemy.start || []).forEach(s => game.placeStart(ai, s.lane, s.id));
  B = { cfg, game, me, ai, meFirst, unitEls: new Map(), selected: null, pending: null, busy: true, drag: null, over: false, handSig: '', logCount: 0 };
  saveBattleSnapshot(); // 시작 패·선후공이 정해진 즉시 저장한다 (시작 연출 중 새로고침으로 다시 뽑지 못하게)
  showScreen('battle', { cfg });
}

// 저장된 전투 이어하기
function resumeBattle(snap) {
  let game;
  if (!snap || !snap.game || snap.game.v !== 2) { Store.clearBattle(); toast('이전 버전의 전투 기록이라 이어할 수 없습니다.', true); showScreen('lobby', { instant: true }); return; }
  try { game = restoreGame(snap.game); } catch (e) { Store.clearBattle(); toast('저장된 전투를 불러오지 못했습니다.', true); return; }
  const me = game.players[snap.meIdx], ai = game.players[1 - snap.meIdx];
  B = { cfg: snap.cfg, game, me, ai, meFirst: snap.meFirst, unitEls: new Map(), selected: null, pending: null, busy: true, drag: null, over: false, handSig: '', logCount: 0, resumed: true };
  showScreen('battle', { cfg: snap.cfg });
}
function saveBattleSnapshot() {
  // 교체 단계도 저장한다 (첫 손패를 본 뒤 새로고침으로 다시 굴리지 못하게)
  // 승패가 정해진 상태도 저장한다: 결과 연출 중에 새로고침하면 그 결과로 바로 마무리한다 (마지막 턴 되감기 방지)
  if (!B || B.cfg.tutorial || B.over || B.game.phase === 'combat') return;
  const { game, me } = B;
  Store.saveBattle({ game: serializeGame(game), cfg: B.cfg, meIdx: game.players.indexOf(me), meFirst: B.meFirst, round: game.round(), savedAt: Date.now() });
}
async function resumeIntro() {
  const myB = B;
  showBanner('전투 재개', `라운드 ${B.game.round()}부터 이어서 진행합니다`, 'mine');
  const list = $('.log-list');
  B.game.logs.forEach(l => list.appendChild(h(`<div class="${l.kind}">${esc(l.msg)}</div>`)));
  list.appendChild(h('<div class="sys">— 저장된 지점에서 전투 재개 —</div>')); list.scrollTop = 1e9;
  await sleepRaw(1200); alive(myB);
  renderAll(true);
  if (B.game.phase === 'main' && B.game.cur === B.me) { B.busy = false; renderAll(true); setPhaseLabel('카드를 내거나 턴 종료'); return; }
  onTurnBegin();
}

screenHooks.battle = async el => {
  if (!B) return; // 화면 전환 중에 전투가 취소된 경우
  const { cfg, me, ai } = B;
  Audio2.bgm(cfg.bgm || 'battle1');
  applySpeedVar();
  el.classList.remove('overtime');
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/${cfg.bg || 'board'}.jpg')"></div><div class="bg-dim"></div>
    <div class="table"><div class="table-scan"></div><div class="table-mid"></div><div class="table-emblem"><span>VS</span></div><div class="table-side enemy">적 진영</div><div class="table-side me">아군 진영</div></div>
    ${cmdHtml('enemy', ai)}
    <div class="enemy-hand"></div>
    <div class="stack enemy"><div class="st-deck" data-pile="edeck" title="적 덱"><b data-v="edeck">0</b></div><div class="st-grave" data-pile="egrave" title="적 묘지">묘지 <b data-v="egrave">0</b></div></div>
    <div class="history" title="최근 사용한 카드"><div class="hs-title">기록</div><div class="hs-list"></div></div>
    <div class="b-top-right">
      <button class="icon-btn speed-btn" data-a="speed" title="전투 속도">x1</button>
      <button class="icon-btn" data-a="log" title="전투 기록 (L)">☰</button>
      <button class="icon-btn" data-a="help" title="게임 방법">?</button>
      <button class="icon-btn" data-a="settings" title="설정">⚙</button>
      <button class="icon-btn" data-a="surrender" title="항복">⚑</button>
    </div>
    <div class="lanes enemy">${[0, 1, 2].map(i => `<div class="slot" data-side="enemy" data-lane="${i}" data-label="${LANE_NAMES[i]}"></div>`).join('')}</div>
    <div class="lanes me">${[0, 1, 2].map(i => `<div class="slot" data-side="me" data-lane="${i}" data-label="${LANE_NAMES[i]}"></div>`).join('')}</div>
    <svg class="fc-svg"><defs><filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs></svg>
    ${cmdHtml('me', me)}
    <div class="stack me"><div class="st-deck" data-pile="deck" title="내 덱"><b data-v="deck">0</b></div><div class="st-grave" data-pile="grave" title="내 묘지">묘지 <b data-v="grave">0</b></div></div>
    <div class="round-info"></div>
    <div class="end-turn"><button class="end-btn" disabled>턴 종료<small>Space</small></button><div class="phase-label"></div></div>
    <div class="ap-bar" id="ap-me" title="AP: 매 턴 최대치가 1씩 늘어나고(최대 ${RULES.MAX_AP}) 가득 충전됩니다. 남은 AP는 ${RULES.AP_CARRY}까지 다음 턴으로 이월됩니다."><div class="ap-num"></div><div class="ap-gems"></div></div>
    <div class="hand"></div>
    <div class="log-panel"><h4>전투 기록</h4><div class="log-list scroll"></div></div>`;
  bindBattleInputs(el);
  updateSpeedBtn();
  renderAll();
  // 화면 전환(페이드)이 끝난 뒤 전투 연출 시작
  // 그사이 다른 전투로 넘어갔다면(빠른 재시작·화면 이동) 이전 전투의 연출을 새 전투에 붙이지 않는다
  const introB = B;
  setTimeout(() => { if (!B || B !== introB) return; if (B.game.phase === 'mulligan') battleIntro(); else if (B.resumed) resumeIntro(); }, 700);
};

function cmdHtml(side, p) {
  const portrait = p.portrait ? artOf(CARDS[p.portrait]) : '';
  const sk = heroSkillOf(p);
  return `<div class="cmd hero ${side}" id="cmd-${side}">
    <div class="hero-frame"><div class="cm-portrait" style="background-image:url('${portrait}')"></div></div>
    <div class="hero-hp"><span class="num">0</span></div>
    <button class="hero-skill" title="특성 스킬 「${esc(sk.n)}」 — 턴당 1회. ${esc(sk.text.replace(/^[^.]*턴당 1회\. /, ''))}${side === 'me' ? ' (누르면 사용, 우클릭은 상세)' : ''}"><span class="hs-icon" style="background-image:url('${iconOf(sk)}')"></span><b class="hs-cost">${sk.c}</b></button>
    ${side === 'enemy' ? '<div class="hero-ap" title="적 AP"></div>' : ''}
    <div class="hero-name">${esc(p.name)}<small>${side === 'me' ? '카드 마스터 지망생' : '대전 상대'}</small><span class="hero-facs">${p.factions.map(f => `<i data-f="${f}" style="background:${FACTIONS[f].color}" title="${FACTIONS[f].name}${SYNERGY[f] ? ` 결속 「${SYNERGY[f].name}」: 같은 제작사 전투원 ${RULES.SYNERGY_MIN}기 이상이면 ${SYNERGY[f].text}` : ''}"></i>`).join('')}</span><span class="hero-syn"></span></div>
    <div class="cm-fc"></div></div>`;
}

// 패배 결과 화면의 한마디: 이번 판에서 드러난 문제에 맞춘 힌트
function lossHint(cfg, game, me) {
  const ot = RULES.OVERTIME_ROUND && game.round() >= RULES.OVERTIME_ROUND;
  const st = cfg.enemy.style;
  if (ot) return '시간 초과까지 갔어요. 관통·돌격 전투원이나 포격 지원으로 라이프를 더 빨리 깎아 봐요.';
  if (me.stats.unitsPlayed <= game.round() / 2) return '전장이 자주 비었어요. 비용이 낮은 전투원을 더 넣어 레인을 채워 봐요.';
  if (st === 'aggro') return '공격형 상대예요. 보호기로 빈 레인을 지키고, 회복 카드로 버티면 반격할 틈이 생겨요.';
  if (st === 'control') return '제어형 상대예요. 관통 전투원과 포격 지원으로 라이프를 직접 노려 봐요.';
  return '아깝다! 상성이 유리한 레인을 고르고, 같은 제작사 2기로 결속을 켜 봐요.';
}
// 대국 시작 배너에 쓰는 모드 이름
function modeLabel(cfg) {
  if (cfg.mode === 'campaign') return CAMPAIGN[cfg.stageIdx].title;
  if (cfg.mode === 'gauntlet') return `리그 순회전 ${cfg.gauntlet.idx + 1}/${cfg.gauntlet.total}`;
  if (cfg.mode === 'draft') return `보급 원정 ${cfg.draft.idx + 1}/${cfg.draft.total}`;
  if (cfg.mode === 'daily') return '오늘의 대국';
  return '자유 대국';
}
// 선공·후공 결정 연출: 양쪽 얼굴이 새겨진 동전을 던져 위로 나온 쪽이 선공
// 무작위가 아닌 대국(스테이지 규칙·직접 지정)은 돌리지 않고 정해진 면만 보여 준다
async function coinToss() {
  const myB = B; const { me, ai, cfg, meFirst } = B;
  const spin = cfg.first === 'random' && !REDUCE_MOTION;
  const face = (p, side) => `<div class="ct-face ${side}"><div class="ct-portrait" style="background-image:url('${p.portrait ? artOf(CARDS[p.portrait]) : ''}')"></div></div>`;
  const el = h(`<div class="coin-toss"><div class="ct-title">${spin ? '선공 결정' : '선공 지정'}</div>
    <div class="ct-glow"><div class="ct-coin">${face(me, 'mine')}${face(ai, 'theirs')}</div></div>
    <div class="ct-result"></div></div>`);
  $('#stage').appendChild(el);
  const coin = $('.ct-coin', el);
  if (spin) {
    Audio2.play('swing');
    const end = 360 * 6 + (meFirst ? 0 : 180);
    const dur = 1500 / (Store.settings.speed || 1);
    // 위로 솟았다가 떨어지며 점점 느리게 돈다
    coin.animate([
      { transform: 'translateY(0) rotateY(0deg) scale(0.8)' },
      { transform: `translateY(-90px) rotateY(${end * 0.55}deg) scale(1.1)`, offset: 0.45 },
      { transform: `translateY(0) rotateY(${end}deg) scale(1)` },
    ], { duration: dur, easing: 'cubic-bezier(.25,.7,.35,1)', fill: 'forwards' });
    await sleepRaw(dur); alive(myB);
  } else {
    coin.style.transform = `rotateY(${meFirst ? 0 : 180}deg)`;
    await sleep(250); alive(myB);
  }
  Audio2.play(meFirst ? 'rankup' : 'place');
  vibrate(60);
  el.classList.add('done', meFirst ? 'mine' : 'theirs');
  $('.ct-result', el).innerHTML = `<b>${esc(meFirst ? me.name : ai.name)} 선공</b><small>${meFirst ? '첫 턴에는 카드를 뽑지 않습니다' : `오렌지에이드 후공 — 카드 +${RULES.SECOND_EXTRA_CARDS}, 첫 턴 AP +${RULES.SECOND_AP_BONUS}, 라이프 +${RULES.SECOND_HP_BONUS}`}</small>`;
  await sleep(1300); alive(myB);
  el.classList.add('out');
  setTimeout(() => el.remove(), 400);
  await sleepRaw(250); alive(myB);
}
async function battleIntro() {
  const myB = B; const { game, me, ai, cfg } = B;
  if (!cfg.tutorial) { await coinToss(); alive(myB); }
  showBanner('대국 시작', `${B.meFirst ? '오렌지에이드 선공' : '상대 선공'} · ${modeLabel(cfg)}`, 'mine');
  Audio2.play('start');
  await sleepRaw(1300); alive(myB);
  // 멀리건
  game.mulligan(ai, AI.pickMulligan(ai, cfg.enemy.level));
  saveBattleSnapshot();
  if (!cfg.tutorial) { await mulliganPrompt(); alive(myB); }
  else game.mulligan(me, []);
  renderAll(true);
  if (cfg.tutorial) { await Tutorial.start(); alive(myB); }
  game.events = game.events.filter(e => e.type !== 'draw'); // 첫 패 뽑기는 교체 창과 패로 날아가는 연출로 이미 보여 줬다
  game.start();
  await processEvents(); alive(myB);
  onTurnBegin();
}

function mulliganPrompt() {
  return new Promise(res => {
    const { game, me } = B;
    const marked = new Set();
    const MAX = RULES.MULLIGAN_MAX ?? 3;
    const box = h(`<div class="modal-box" style="text-align:center"><div class="coin">${B.meFirst ? '선공 — 첫 턴에는 카드를 뽑지 않습니다' : `후공 — 교체 후 카드 +${RULES.SECOND_EXTRA_CARDS}, 첫 턴 AP +${RULES.SECOND_AP_BONUS}, 라이프 +${RULES.SECOND_HP_BONUS}`}</div>
      <h3 style="margin-top:10px">시작 패 교체</h3><p>교체할 카드를 클릭하세요. <b>최대 ${MAX}장</b>까지 고를 수 있고, 선택한 카드는 덱으로 돌아가고 새 카드를 뽑습니다. (1회)</p>
      <div class="mull-count">교체 0 / ${MAX}</div>
      <div class="mull-hand"></div><div class="modal-actions" style="justify-content:center"><button class="btn primary big" data-a="ok">확인</button></div></div>`);
    const row = $('.mull-hand', box);
    let done = false;
    me.hand.forEach(c => {
      const ce = cardEl(c); // 크기는 CSS(.mull-hand .card)가 정한다: 화면 크기가 바뀌어도 바로 맞춰진다
      ce._card = c;
      holdForDetail(ce, () => openCardDetail(c, me.hand));
      ce.onclick = () => {
        if (ce._held) { ce._held = false; return; }
        if (done) return; // 꾹 눌러 상세를 연 뒤 손을 뗄 때의 클릭은 교체 선택으로 치지 않는다
        if (!marked.has(c) && marked.size >= MAX) { toast(`최대 ${MAX}장까지 교체할 수 있습니다.`, true); return; }
        marked.has(c) ? marked.delete(c) : marked.add(c);
        ce.classList.toggle('marked', marked.has(c)); Audio2.play('card');
        $('[data-a=ok]', box).textContent = marked.size ? `${marked.size}장 교체` : '확인';
        $('.mull-count', box).textContent = `교체 ${marked.size} / ${MAX}`;
        row.classList.toggle('full', marked.size >= MAX);
      };
      row.appendChild(ce);
    });
    const m = openModal(box, { closable: false });
    $('.hand').style.visibility = 'hidden'; // 교체가 끝나 카드가 날아올 때까지 패를 비워 둔다
    $('[data-a=ok]', box).onclick = async () => {
      if (done) return; done = true;
      const myB = B, before = new Set(me.hand);
      game.mulligan(me, [...marked]);
      Audio2.play('click');
      $('.modal-actions', box).style.visibility = 'hidden';
      try {
        const fresh = me.hand.filter(c => !before.has(c));
        if (fresh.length) await mulliganReveal(box, row, fresh);
        if (B === myB) await mulliganToHand(m, row);
      } finally { const hd = $('.hand'); if (hd) hd.style.visibility = ''; closeModal(m); res(); }
    };
  });
}
// 교체 연출 1: 고른 카드가 덱으로 빠지고, 그 자리에 새로 뽑은 카드가 뒤집히며 나타난다
async function mulliganReveal(box, row, fresh) {
  $('h3', box).textContent = '새로 받은 카드';
  $('p', box).textContent = `카드 ${fresh.length}장을 덱에 돌려놓고 새로 뽑았습니다.`;
  $('.mull-count', box).textContent = '';
  const olds = $$('.card.marked', row);
  olds.forEach((ce, i) => ce.animate([{ transform: 'translateY(14px)', opacity: 1 }, { transform: 'translateY(90px) scale(0.85)', opacity: 0 }], { duration: 260, delay: i * 70, easing: 'ease-in', fill: 'forwards' }));
  await sleepRaw(260 + olds.length * 70);
  for (let i = 0; i < olds.length; i++) {
    const ne = cardEl(fresh[i], { noHover: true }); ne._card = fresh[i];
    ne.classList.add('mull-new');
    olds[i].replaceWith(ne);
    Audio2.play('card');
    await sleepRaw(200);
  }
  await sleepRaw(1000);
}
// 교체 연출 2: 창이 걷히고 카드가 한 장씩 패 자리로 날아간다
async function mulliganToHand(m, row) {
  renderAll(true); // 창 아래에 패를 먼저 그려 둬야 날아갈 자리를 잴 수 있다
  const slots = $$('.hand .hslot');
  const targetOf = c => slots[B.me.hand.indexOf(c)];
  slots.forEach(sl => { sl.style.visibility = 'hidden'; });
  $('.hand').style.visibility = '';
  const stage = $('#stage');
  const ghosts = $$('.card', row).map(ce => {
    const r = stageRect(ce), g = h('<div class="card-ghost"></div>');
    const gc = cardEl(ce._card, { noHover: true }); gc.style.setProperty('--w', ce.offsetWidth + 'px'); g.appendChild(gc);
    g.style.left = r.x + 'px'; g.style.top = r.y + 'px';
    stage.appendChild(g);
    return { g, r, card: ce._card, w: ce.offsetWidth };
  });
  m.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
  await sleepRaw(120);
  await Promise.all(ghosts.map(({ g, r, card, w }, i) => new Promise(done => {
    const sl = targetOf(card);
    const fin = () => { g.remove(); if (sl) sl.style.visibility = ''; done(); };
    if (!sl) return fin();
    const t = stageRect($('.card', sl) || sl), k = ($('.card', sl) || sl).offsetWidth / w;
    const rot = parseFloat(sl.style.getPropertyValue('--r')) || 0;
    const a = g.animate([
      { transform: 'translate(0,0) scale(1) rotate(0deg)' },
      { transform: `translate(${t.cx - r.cx}px, ${t.cy - r.cy}px) scale(${k}) rotate(${rot}deg)` },
    ], { duration: 420, delay: i * 90, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' });
    setTimeout(() => Audio2.play('card', 0.5), i * 90);
    a.onfinish = fin; setTimeout(fin, 420 + i * 90 + 200);
  })));
  $$('.hand .hslot').forEach(sl => { sl.style.visibility = ''; });
}

// ---------- 턴 진행 ----------
async function onTurnBegin() {
  if (!B) return;
  const { game, me } = B;
  if (game.phase === 'over') return finishBattle();
  renderAll();
  if (game.cur === me) {
    B.busy = false;
    renderAll(true);
    setPhaseLabel('카드를 내거나 턴 종료');
    saveBattleSnapshot();
    tut('myTurn', game.round());
    if (Lessons.cur) Lessons.close();
    Lessons.check(B);
    if (!Lessons.cur) showTacticalTip();
  } else {
    await aiTurn();
  }
}

async function endMyTurn() {
  if (!B) return;
  const myB = B; const { game, me } = B;
  if (B.busy || game.cur !== me || game.phase !== 'main') return;
  if (!tutAllowsEndTurn()) return;
  clearSelection(); clearArrows();
  B.busy = true; renderAll();
  tut('turnEnded');
  setPhaseLabel('전투 중…');
  game.endTurn();
  saveBattleSnapshot(); // 전투는 이미 확정되었으므로 바로 저장 (새로고침 시 되감기 방지)
  await processEvents(); alive(myB);
  B.busy = false;
  if (game.phase === 'over') return finishBattle();
  onTurnBegin();
}

async function aiTurn() {
  const myB = B; const { game, ai, cfg } = B;
  saveBattleSnapshot();
  B.busy = true; renderAll();
  setPhaseLabel('적 지휘관 행동 중…');
  await sleep(300); alive(myB);
  let guard = 0;
  while (game.phase === 'main' && guard++ < 12 && !B.over) {
    const act = AI.nextAction(game, ai, cfg.enemy.level);
    if (!act) break;
    if (!act.move) { await revealCard(act.card, false); alive(myB); }
    const ok = game.act(act);
    if (!ok) break;
    saveBattleSnapshot();
    await processEvents(); alive(myB); renderAll();
    await sleep(130); alive(myB);
  }
  if (game.phase === 'over' || B.over) { B.busy = false; return finishBattle(); }
  await sleep(250); alive(myB);
  setPhaseLabel('적 전투 중…');
  game.endTurn();
  await processEvents(); alive(myB);
  B.busy = false;
  tut('enemyTurnDone');
  if (game.phase === 'over') return finishBattle();
  onTurnBegin();
}

// ---------- 입력 ----------
function bindBattleInputs(el) {
  $$('.slot', el).forEach(s => {
    s.onclick = () => onSlotClick(s);
    s.onmouseenter = () => { if (s.classList.contains('place') || s.classList.contains('target') || s.classList.contains('target-ally')) s.classList.add('hover'); };
    s.onmouseleave = () => s.classList.remove('hover');
  });
  $('#cmd-enemy').onclick = () => { if (B.selected && (B.pending === 'any')) playSelected(null, { cmd: B.ai }); };
  $('.end-btn', el).onclick = endMyTurn;
  // 지휘관 특성 스킬: 내 초상 왼쪽 아이콘을 누르면 사용(대상이 필요하면 대상 선택), 상대 것은 누르면 상세
  const mySk = $('#cmd-me .hero-skill', el);
  mySk.onclick = e => { e.stopPropagation(); const sk = heroSkillOf(B.me); if (B.selected === sk && skillTargetKind(sk) !== 'none') { clearSelection(); renderAll(); return; } selectCard(sk); renderAll(); };
  mySk.addEventListener('contextmenu', e => { e.preventDefault(); openCardDetail(heroSkillOf(B.me)); });
  $('#cmd-enemy .hero-skill', el).onclick = e => { if (B.selected && B.pending === 'any') return; e.stopPropagation(); openCardDetail(heroSkillOf(B.ai)); };
  $('[data-a=log]', el).onclick = () => $('.log-panel', el).classList.toggle('open');
  $('[data-a=help]', el).onclick = () => openHowTo(1);
  $('[data-a=settings]', el).onclick = () => openSettings(true);
  $('[data-a=speed]', el).onclick = () => {
    const seq = [1, 1.5, 2, 3]; const s = Store.settings;
    s.speed = seq[(seq.indexOf(s.speed) + 1) % seq.length]; Store.save(); applySpeedVar(); updateSpeedBtn();
  };
  $('[data-a=surrender]', el).onclick = async () => {
    if (B.over) return;
    if (await confirmBox('항복', '대국을 포기하고 패배 처리할까요?', '항복', true)) { B.over = true; B.game.phase = 'over'; B.game.winner = B.ai; finishBattle(true); }
  };
  $$('[data-pile]', el).forEach(p => p.onclick = () => showPile(p.dataset.pile));
}
function updateSpeedBtn() { const b = $('[data-a=speed]'); if (b) b.textContent = 'x' + Store.settings.speed; }
function onSpeedChanged() { updateSpeedBtn(); }

function showPile(kind) {
  const { me, ai } = B;
  const map = { deck: [me.deck, '내 덱 (남은 카드, 순서 비공개)'], grave: [me.grave, '내 묘지'], edeck: [null, `적 덱 — ${ai.deck.length}장 남음`], egrave: [ai.grave, '적 묘지'] };
  const [list, title] = map[kind];
  const box = h(`<div class="modal-box" style="width:1240px"><h3>${title}</h3><div class="pile-view scroll"></div></div>`);
  const grid = $('.pile-view', box);
  if (!list) grid.appendChild(h('<div class="empty-note">상대 덱의 내용은 볼 수 없습니다.</div>'));
  else if (!list.length) grid.appendChild(h('<div class="empty-note">카드가 없습니다.</div>'));
  else {
    const cards = kind === 'deck' ? list.slice().sort((a, b) => a.c - b.c) : list.slice().reverse();
    cards.forEach(c => { const ce = cardEl(c, { w: 170 }); ce.onclick = () => openCardDetail(c, cards); grid.appendChild(ce); });
  }
  openModal(box);
}

function canAct() { return B && !B.busy && !B.over && B.game.cur === B.me && B.game.phase === 'main'; }

// 휴대폰: 손패에서 고른 카드를 왼쪽에 크게 띄워 효과 글을 읽을 수 있게 한다 (선택을 풀면 사라진다)
function showSelPreview(card) {
  $$('.sel-preview').forEach(e => e.remove());
  if (!document.body.classList.contains('compact') || card.hero) return;
  const box = h('<div class="sel-preview"></div>');
  box.appendChild(cardEl(card, { w: 320, noHover: true })); // 전장 왼쪽 빈 곳(기록 줄 위)에 들어가는 크기
  $('#scr-battle').appendChild(box);
}
function startMove(u) {
  clearSelection();
  B.moving = u;
  const from = B.me.lanes.indexOf(u);
  [from - 1, from + 1].forEach(l => {
    if (l < 0 || l > 2 || !B.game.canMove(u, l)) return;
    const s = $(`.slot[data-side=me][data-lane="${l}"]`); s.classList.add('place', 'move');
    s.appendChild(h(`<div class="adv replace">${B.me.lanes[l] ? '자리 바꿈' : '이동'} · AP ${RULES.MOVE_COST}</div>`));
  });
  const cb = h(`<button class="cast-btn move-hint">${esc(u.card.n)} 이동<small>빛나는 레인을 누르면 옮깁니다 · 이 버튼을 누르면 상세 보기</small></button>`);
  cb.onclick = e => { e.stopPropagation(); clearSelection(); openCardDetail(u.card); };
  $('#scr-battle').appendChild(cb);
  tut('moveSelected', u);
}
async function doMove(u, lane) {
  const myB = B;
  clearSelection();
  if (!B.game.move(u, lane)) return;
  saveBattleSnapshot();
  B.busy = true; renderAll();
  await processEvents(); alive(myB);
  B.busy = false; renderAll();
  saveBattleSnapshot();
  tut('moved', u);
}
function clearSelection() {
  if (!B) return;
  $$('.sel-preview').forEach(e => e.remove());
  B.selected = null; B.pending = null; B.moving = null;
  $$('.hand .card.selected').forEach(c => c.classList.remove('selected'));
  $$('.slot').forEach(s => { s.classList.remove('place', 'replace', 'move', 'target', 'target-ally', 'hover'); const a = $('.adv', s); if (a) a.remove(); });
  $$('.cast-btn').forEach(b => b.remove());
  $('#cmd-enemy') && $('#cmd-enemy').classList.remove('targetable');
}

function laneAdvice(card, lane) {
  const opp = B.ai.lanes[lane];
  if (opp) {
    if (TYPE_BEATS[card.t] === opp.type) return ['good', `유리 ▲ vs ${opp.card.n}`];
    if (TYPE_BEATS[opp.type] === card.t) return ['bad', `불리 ▼ vs ${opp.card.n}`];
    return ['even', `대등 vs ${opp.card.n}`];
  }
  const guard = [lane - 1, lane + 1].some(l => l >= 0 && l < 3 && B.ai.lanes[l] && B.ai.lanes[l].role === 'DEF');
  return guard ? ['even', '보호기가 막음'] : ['open', '상대 직격'];
}

// 카드 선택 → 가능한 대상 강조. 반환: 선택 성공 여부
function selectCard(card) {
  if (!canAct()) return false;
  const { me, ai } = B;
  if (B.selected === card) {
    // 대상이 필요 없는 지원 카드는 한 번 더 클릭하면 사용
    if (card.kind === 'skill' && skillTargetKind(card) === 'none') { playSelected(null, null); return false; }
    clearSelection(); renderHand(true); return false;
  }
  clearSelection();
  if (card.hero && !B.game.canCommand()) { toast(me.cmdUsed === B.game.turn ? '특성 스킬은 턴당 한 번만 쓸 수 있습니다.' : `AP가 부족합니다 (${me.ap}/${B.game.commandCost(me)})`, true); return false; }
  if (!card.hero && !me.canAfford(card)) { toast(`AP가 부족합니다 (${me.ap}/${card.c})`, true); return false; }
  B.selected = card;
  hidePreview(); // 마우스를 올렸던 카드의 큰 그림은 닫는다
  showSelPreview(card);
  if (card.kind === 'unit') {
    const lanesOk = me.placeableLanes(B.game.turn, card);
    if (!lanesOk.length) { toast('낼 수 있는 레인이 없습니다. 이번 턴에 낸 전투원은 교체할 수 없습니다.', true); clearSelection(); return false; }
    lanesOk.forEach(i => {
      const s = $(`.slot[data-side=me][data-lane="${i}"]`); s.classList.add('place');
      if (me.lanes[i]) { s.classList.add('replace'); s.appendChild(h(`<div class="adv replace">교체 AP+${RULES.REPLACE_COST || 0} · ${esc(me.lanes[i].card.n)} 철수</div>`)); return; }
      const [cls, txt] = laneAdvice(card, i); s.appendChild(h(`<div class="adv ${cls}">${esc(txt)}</div>`));
    });
  } else {
    const kind = skillTargetKind(card);
    if (kind === 'none') {
      const cb = h(`<button class="cast-btn">▶ ${esc(card.n)} 사용<small>한 번 더 클릭하거나 전장으로 끌어다 놓아도 사용됩니다</small></button>`);
      cb.onclick = e => { e.stopPropagation(); playSelected(null, null); };
      $('#scr-battle').appendChild(cb);
      renderHand(true); tut('cardSelected', card); return true;
    }
    B.pending = kind;
    if (kind === 'enemyUnit' || kind === 'any') {
      if (!ai.units().length && kind === 'enemyUnit') { toast('대상이 될 적 전투원이 없습니다.', true); clearSelection(); return false; }
      ai.lanes.forEach((u, i) => { if (u) $(`.slot[data-side=enemy][data-lane="${i}"]`).classList.add('target'); });
      if (kind === 'any') $('#cmd-enemy').classList.add('targetable');
    } else if (kind === 'allyUnit') {
      if (!me.units().length) { toast('대상이 될 아군 전투원이 없습니다.', true); clearSelection(); return false; }
      me.lanes.forEach((u, i) => { if (u) $(`.slot[data-side=me][data-lane="${i}"]`).classList.add('target-ally'); });
    }
  }
  renderHand(true);
  tut('cardSelected', card);
  return true;
}

function onSlotClick(s) {
  if (!B.selected) {
    const lane = +s.dataset.lane, side = s.dataset.side;
    // 이동 중: 빛나는 이웃 레인을 누르면 옮긴다
    if (B.moving && side === 'me' && s.classList.contains('move')) { doMove(B.moving, lane); return; }
    const u = (side === 'me' ? B.me : B.ai).lanes[lane];
    // 내 턴에 내 전투원을 누르면 이동할 레인을 보여 준다. 같은 전투원을 한 번 더 누르면 상세
    if (u && side === 'me' && !B.moving && !B.busy && B.game.cur === B.me && B.game.canMove(u)) { startMove(u); return; }
    clearSelection();
    if (u) openCardDetail(u.card);
    return;
  }
  const lane = +s.dataset.lane, side = s.dataset.side;
  if (B.selected.kind === 'unit' && side === 'me' && s.classList.contains('place')) playSelected(lane, null);
  else if (s.classList.contains('target')) playSelected(null, { unit: B.ai.lanes[lane] });
  else if (s.classList.contains('target-ally')) playSelected(null, { unit: B.me.lanes[lane] });
}

async function playSelected(lane, target, fromRect) {
  const card = B.selected;
  if (!card) return;
  const { game } = B;
  const isCmd = !!card.hero;
  if (isCmd ? !game.canCommand(target) : !game.canPlay(card, lane, target)) { toast('사용할 수 없습니다.', true); return; }
  const handEl = $(`.hand .card[data-id="${card.id}"]`);
  const from = fromRect || (handEl ? stageRect(handEl) : null);
  clearSelection(); B.busy = true; hidePreview(); clearArrows();
  const myB = B;
  if (card.kind === 'unit') {
    const slot = $(`.slot[data-side=me][data-lane="${lane}"]`);
    if (from) await flyCard(card, from, stageRect(slot));
  } else {
    await revealCard(card, true);
  }
  alive(myB);
  if (isCmd) game.command(target); else game.play(card, lane, target);
  saveBattleSnapshot(); // 연출 전에 바로 저장한다 (연출 중 새로고침으로 수를 무르거나 다음 드로우를 엿보지 못하게)
  Audio2.play(card.kind === 'unit' ? 'place' : 'energy');
  await processEvents(); alive(myB);
  B.busy = false; renderAll();
  saveBattleSnapshot();
  tut('cardPlayed', card);
  if (game.phase === 'over') finishBattle();
}

// 드래그 앤 드롭 (포인터 이벤트) — 손패가 다시 그려져도 끊기지 않도록 window에서 추적한다
function attachHandDrag(ce, card) {
  ce.addEventListener('pointerdown', e => {
    if (e.button !== 0 || !B || B.drag) return;
    e.preventDefault();
    B.drag = { card, start: stagePoint(e.clientX, e.clientY), moved: false, ghost: null };
    // 움직이지 않고 꾹 누르고 있으면 카드 상세 (터치·마우스 모두. 마우스는 우클릭으로도 열린다)
    B.drag.timer = setTimeout(() => { const d = B && B.drag; if (d && !d.moved && d.card === card) { d.long = true; openCardDetail(card, B.me.hand); } }, 550);
    const move = ev => onDragMove(ev);
    const up = ev => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); onDragEnd(ev); };
    const cancel = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); if (B && B.drag) { if (B.drag.ghost) B.drag.ghost.remove(); B.drag = null; clearSelection(); renderHand(true); } };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  });
}
function onDragMove(e) {
  const d = B && B.drag; if (!d) return;
  const p = stagePoint(e.clientX, e.clientY);
  if (!d.moved && !d.long && Math.hypot(p.x - d.start.x, p.y - d.start.y) > 12) {
    clearTimeout(d.timer);
    if (!canAct()) { B.drag = null; return; }
    if (B.selected !== d.card && !selectCard(d.card)) { B.drag = null; return; }
    d.moved = true;
    d.ghost = h('<div class="drag-ghost"></div>'); d.ghost.appendChild(cardEl(d.card, { noHover: true }));
    $('#stage').appendChild(d.ghost); hidePreview();
    renderHand(true);
  }
  if (d.moved) {
    d.ghost.style.left = p.x + 'px'; d.ghost.style.top = p.y + 'px';
    const hit = dropTargetAt(e.clientX, e.clientY);
    $$('.slot.hover').forEach(s => { if (s !== hit) s.classList.remove('hover'); });
    if (hit && hit.classList.contains('slot') && (hit.classList.contains('place') || hit.classList.contains('target') || hit.classList.contains('target-ally'))) hit.classList.add('hover');
  }
}
function onDragEnd(e) {
  const d = B && B.drag; if (!d) return;
  B.drag = null;
  clearTimeout(d.timer);
  if (d.long) return;
  const card = d.card;
  if (!d.moved) { selectCard(card); return; }
  const from = d.ghost ? stageRect(d.ghost.firstElementChild) : null;
  if (d.ghost) d.ghost.remove();
  const hit = dropTargetAt(e.clientX, e.clientY);
  const noTarget = card.kind === 'skill' && skillTargetKind(card) === 'none';
  if (hit && hit.id === 'cmd-enemy' && B.pending === 'any') return playSelected(null, { cmd: B.ai }, from);
  if (hit && hit.classList.contains('slot')) {
    const lane = +hit.dataset.lane, side = hit.dataset.side;
    if (card.kind === 'unit' && side === 'me' && hit.classList.contains('place')) return playSelected(lane, null, from);
    if (hit.classList.contains('target')) return playSelected(null, { unit: B.ai.lanes[lane] }, from);
    if (hit.classList.contains('target-ally')) return playSelected(null, { unit: B.me.lanes[lane] }, from);
  }
  // 대상이 필요 없는 지원 카드는 손패 영역 밖으로 끌어 놓으면 사용
  const sp = stagePoint(e.clientX, e.clientY);
  if (noTarget && sp.y < 820) return playSelected(null, null, from);
  clearSelection(); renderHand(true);
}
function dropTargetAt(cx, cy) {
  const els = document.elementsFromPoint(cx, cy);
  for (const e of els) {
    const s = e.closest && (e.closest('.slot') || e.closest('#cmd-enemy'));
    if (s) return s;
  }
  return null;
}

// ---------- 렌더 ----------
// 라운드와 작전 시간 초과까지 남은 라운드
function renderRoundInfo() {
  const el = $('.round-info'); if (!el || !B) return;
  const r = Math.max(1, B.game.round()), ot = RULES.OVERTIME_ROUND;
  const next = B.game.overtimeDamage(r + 1);
  el.className = 'round-info' + (ot && r >= ot ? ' over' : ot && ot - r <= 2 ? ' soon' : '');
  const mission = B.cfg.mode === 'campaign' ? missionProgress(CAMPAIGN[B.cfg.stageIdx], B.game, B.me) : null;
  el.innerHTML = `라운드 <b>${r}</b>${!ot ? '' : r >= ot ? `<span>시간 초과 · 다음 피해 ${next}</span>` : `<span>시간 초과까지 ${ot - r}라운드</span>`}${mission ? `<span class="mission ${mission.ok ? 'ok' : ''}">임무 · ${mission.label}</span>` : ''}`;
}
function setPhaseLabel(t) { const p = $('.phase-label'); if (p) p.textContent = t; }

function renderCmd(side, p) {
  const el = $(`#cmd-${side}`); if (!el) return;
  const num = $('.hero-hp .num', el);
  if (num.textContent !== String(p.hp) && num.textContent !== '0') retrigger($('.hero-hp', el), 'bump');
  num.textContent = p.hp;
  el.classList.toggle('low', p.hp <= Math.ceil(p.maxHp * 0.3));
  el.title = `${p.name} — 체력 ${p.hp}/${p.maxHp}`;
  // 켜진 제작사 결속을 이름 아래에 표시한다
  const syn = p.factions.filter(f => SYNERGY[f] && B.game.synergy(p, f));
  $$('.hero-facs i', el).forEach(i => i.classList.toggle('on', syn.includes(i.dataset.f)));
  // 켜진 결속은 이름과 효과를 함께 적고, 새로 켜지면 초상 옆에 무엇이 좋아졌는지 크게 알린다
  const sl = $('.hero-syn', el);
  if (sl) {
    const sig = syn.join(',');
    if (sl.dataset.sig !== sig) {
      sl.innerHTML = syn.map(f => `<span style="--fc:${FACTIONS[f].color}"><b>결속 「${esc(SYNERGY[f].name)}」</b>${esc(SYNERGY[f].text)}</span>`).join('');
      if (sig) retrigger(sl, 'pop');
      const prev = (sl.dataset.sig || '').split(',').filter(Boolean);
      if (sl.dataset.sig !== undefined) syn.filter(f => !prev.includes(f)).forEach((f, i) => setTimeout(() => synergyCallout(side, p, f), i * 700));
      sl.dataset.sig = sig;
    }
  }
  const ap = $('.hero-ap', el); if (ap) ap.textContent = p.ap > p.maxAp ? `AP ${p.ap} (이월 +${p.ap - p.maxAp})` : `AP ${p.ap}/${p.maxAp}`;
  // 특성 스킬 아이콘: AP 표시(결속으로 싸지면 노랗게), 이번 턴에 썼으면 어둡게, 지금 쓸 수 있으면 빛난다
  const hs = $('.hero-skill', el); if (!hs) return;
  const sk = heroSkillOf(p), cost = B.game.commandCost(p), used = p.cmdUsed === B.game.turn;
  const cb = $('.hs-cost', hs); cb.textContent = cost; cb.classList.toggle('syn', cost < sk.c);
  hs.classList.toggle('used', used);
  hs.classList.toggle('ready', p === B.me && canAct() && B.game.canCommand());
  hs.classList.toggle('selected', B.selected === sk);
}
function renderAp() {
  const { me } = B; const bar = $('#ap-me'); if (!bar) return;
  $('.ap-num', bar).innerHTML = me.ap > me.maxAp ? `${me.ap}<small> 이월 +${me.ap - me.maxAp}</small>` : `${me.ap}<small>/${me.maxAp}</small>`;
  const sig = me.ap + ':' + me.maxAp;
  if (bar.dataset.sig === sig) return; bar.dataset.sig = sig;
  const gems = []; const total = Math.max(RULES.MAX_AP, me.ap);
  for (let i = 1; i <= total; i++) gems.push(`<i class="${i <= me.ap ? (i > me.maxAp ? 'bonus' : 'full') : i <= me.maxAp ? 'spent' : 'locked'}"></i>`);
  $('.ap-gems', bar).innerHTML = gems.join('');
}
function pushHistory(card, player) {
  const list = $('.hs-list'); if (!list) return;
  const it = h(`<div class="hs-item ${player === B.me ? 'mine' : 'theirs'}" style="background-image:url('${artOf(card)}')"><span>${card.c}</span></div>`);
  it.onpointerenter = e => { if (e.pointerType === 'mouse') showPreview(card, 'left', `${player === B.me ? '오렌지에이드' : esc(B.ai.name)} 사용`); };
  it.onpointerleave = hidePreview;
  it.onclick = () => openCardDetail(card);
  list.prepend(it);
  while (list.children.length > 8) list.lastChild.remove();
}

function renderAll(forceHand) {
  if (!B) return;
  const { game, me, ai } = B;
  renderCmd('me', me); renderCmd('enemy', ai); renderAp();
  renderRoundInfo();
  $('[data-v=deck]').textContent = me.deck.length; $('[data-v=grave]').textContent = me.grave.length;
  $('[data-v=edeck]').textContent = ai.deck.length; $('[data-v=egrave]').textContent = ai.grave.length;
  const eh = $('.enemy-hand'); const n = ai.hand.length - (B.holdDrawAi || 0);
  if (eh.childElementCount !== n) eh.innerHTML = ai.hand.map((_, i) => `<div class="card-back" style="--r:${(i - (n - 1) / 2) * -5}deg;--y:${Math.abs(i - (n - 1) / 2) * 5}px"></div>`).join('');
  for (const [p, side] of [[me, 'me'], [ai, 'enemy']]) {
    p.lanes.forEach((u, i) => {
      const slot = $(`.slot[data-side=${side}][data-lane="${i}"]`);
      const existing = $$('.unit', slot).filter(x => !x.classList.contains('dying'));
      // 엔진은 전투를 끝까지 미리 계산하므로, 연출 재생 중에는 아직 '격파' 연출이 남은 유닛을 화면에 그대로 두고
      // 아직 '배치' 연출이 안 나온 유닛은 숨긴다 (안 그러면 살아있는 적이 먼저 사라져 빈 칸을 공격하는 것처럼 보인다)
      if (u && B.holdSpawn && B.holdSpawn.has(u.uid)) u = null;
      const held = existing.filter(x => B.holdDie && B.holdDie.has(x._uid));
      if (held.length) { existing.forEach(x => { if (!held.includes(x)) x.remove(); }); return; }
      if (!u) { existing.forEach(x => { if (!x._dyingKeep) x.remove(); }); return; }
      let el = B.unitEls.get(u.uid);
      if (!el) { el = unitEl(u); B.unitEls.set(u.uid, el); el.classList.add('spawn'); }
      if (el.parentElement !== slot) { existing.forEach(x => x.remove()); slot.appendChild(el); }
      updateUnitEl(u, el);
    });
  }
  renderHand(forceHand);
  const myMain = game.cur === me && game.phase === 'main' && !B.busy && !B.over;
  const btn = $('.end-btn');
  btn.disabled = !myMain;
  btn.classList.toggle('glow', myMain && !me.hand.some(c => me.canAfford(c) && (c.kind === 'skill' || me.emptyLanes().length)));
  if (!myMain && game.cur !== me) setPhaseLabel(game.phase === 'over' ? '' : '적 턴');
  refreshForecast();
}

function renderHand(force) {
  const { me } = B;
  const hand = $('.hand'); if (!hand) return;
  const myMain = canAct();
  const cards = shownHand();
  const sig = cards.map(c => c.id).join(',') + '|' + me.ap + '|' + (B.selected ? B.selected.id : '') + '|' + myMain + '|' + me.placeableLanes(B.game.turn).length;
  if (!force && sig === B.handSig) return;
  B.handSig = sig;
  hand.innerHTML = '';
  const n = cards.length;
  // 휴대폰(.compact)은 카드를 크게(240) 그리고 간격도 넓혀 이름·능력치가 읽히게 한다
  const compact = document.body.classList.contains('compact'), cw = compact ? 240 : 170;
  const spacing = Math.min(compact ? 170 : 130, (compact ? 860 : 760) / Math.max(1, n));
  const total = spacing * (n - 1) + cw;
  const start = (1000 - total) / 2;
  cards.forEach((c, i) => {
    const ce = cardEl(c);
    const off = i - (n - 1) / 2;
    // 받침(.hslot)이 부채꼴 위치/회전과 호버 영역을 담당하고, 카드는 그 안에서 떠오른다
    const slot = h('<div class="hslot"></div>');
    slot.style.left = (start + i * spacing) + 'px';
    slot.style.setProperty('--dy', (off * off * 5) + 'px');
    slot.style.setProperty('--r', (off * 4) + 'deg');
    slot.style.setProperty('--z', 10 + i);
    const afford = me.canAfford(c);
    const usable = afford && (c.kind === 'skill' || me.placeableLanes(B.game.turn, c).length > 0);
    if (!afford) $('.c-cost', ce).classList.add('short');
    if (myMain && usable) ce.classList.add('playable');
    if (!usable) ce.classList.add('dim');
    if (B.selected === c) ce.classList.add('selected');
    if (B.drag && B.drag.moved && B.drag.card === c) ce.classList.add('dragging');
    slot.addEventListener('contextmenu', e => { e.preventDefault(); openCardDetail(c, me.hand); });
    attachHandDrag(slot, c);
    slot.appendChild(ce);
    hand.appendChild(slot);
  });
}

// 엔진은 결과를 미리 계산하므로, 손패에는 아직 뽑기 연출이 나오지 않은 카드가 들어 있을 수 있다. 그런 카드는 연출 때까지 숨긴다
function shownHand() { return B.holdDraw && B.holdDraw.size ? B.me.hand.filter(c => !B.holdDraw.has(c)) : B.me.hand; }
// 카드 뽑기 연출: 덱 더미에서 카드가 뒤집히며 날아와 패 자리에 들어간다
async function drawFly(card) {
  renderAll(true);
  const sl = $$('.hand .hslot')[shownHand().indexOf(card)], ce = sl && $('.card', sl), deck = $('.stack.me .st-deck');
  if (!ce || !deck) return;
  sl.style.visibility = 'hidden';
  const t = stageRect(ce), d = stageRect(deck), w = ce.offsetWidth, hh = ce.offsetHeight, k = Store.settings.speed || 1;
  const g = h('<div class="card-ghost"></div>'), gc = cardEl(card, { noHover: true });
  gc.style.setProperty('--w', w + 'px'); g.appendChild(gc);
  g.style.left = (t.cx - w / 2) + 'px'; g.style.top = (t.cy - hh / 2) + 'px';
  $('#stage').appendChild(g);
  const rot = parseFloat(sl.style.getPropertyValue('--r')) || 0, s0 = d.w / w, dur = 420 / k;
  Audio2.play('card', 0.6);
  await new Promise(res => {
    let done = false; const fin = () => { if (done) return; done = true; g.remove(); sl.style.visibility = ''; res(); };
    g.animate([
      { transform: `translate(${d.cx - t.cx}px, ${d.cy - t.cy}px) scale(${s0}) rotateY(180deg)`, filter: 'brightness(0.2)' },
      { transform: `translate(${(d.cx - t.cx) * 0.45}px, ${(d.cy - t.cy) * 0.45 - 80}px) scale(${(s0 + 1) / 2 * 1.1}) rotateY(0deg)`, filter: 'brightness(1.4)', offset: 0.5 },
      { transform: `translate(0,0) scale(1) rotate(${rot}deg)`, filter: 'none' },
    ], { duration: dur, easing: 'cubic-bezier(.3,.6,.35,1)', fill: 'forwards' }).onfinish = fin;
    setTimeout(fin, dur + 150);
  });
}
// 적 카드 뽑기: 뒷면 카드가 적 덱에서 적 손패로 날아간다
async function drawFlyAi() {
  const deck = $('.stack.enemy .st-deck'), eh = $('.enemy-hand');
  B.holdDrawAi = Math.max(0, (B.holdDrawAi || 0) - 1);
  if (!deck || !eh) { renderAll(); return; }
  const d = stageRect(deck), e = stageRect(eh), k = Store.settings.speed || 1, dur = 340 / k;
  const g = h('<div class="card-ghost"><div class="card-back"></div></div>');
  g.style.left = (d.cx - 37) + 'px'; g.style.top = (d.cy - 52) + 'px';
  $('#stage').appendChild(g);
  Audio2.play('card', 0.35);
  await new Promise(res => {
    let done = false; const fin = () => { if (done) return; done = true; g.remove(); res(); };
    g.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${e.x + e.w - d.cx}px, ${e.cy - d.cy}px) rotate(-12deg)` }],
      { duration: dur, easing: 'ease-in-out', fill: 'forwards' }).onfinish = fin;
    setTimeout(fin, dur + 150);
  });
  renderAll();
}

function unitEl(u) {
  const c = u.card;
  const el = h(`<div class="unit" style="--fc:${FACTIONS[c.f].color}">
    <div class="u-bg"></div><div class="u-art" style="background-image:url('${artOf(c)}')"></div><div class="u-shade"></div><div class="u-shieldfx"></div>
    <div class="u-frame g-${c.g}"></div><div class="u-grade role-ico" style="background-image:url('${roleIconOf(c)}')" title="${ROLES[c.r]} · ${c.g}등급"></div><div class="u-badges"></div><div class="u-zzz">배치 대기</div>
    <div class="u-name${c.n.length > 9 ? ' xlong' : c.n.length > 6 ? ' long' : ''}">${esc(c.n)}</div>
    <div class="u-tags"><span class="tag type-${c.t}">${TYPES[c.t]}</span><span class="tag role-${c.r}">${ROLES[c.r]}</span></div>
    <div class="u-stat u-atk"></div><div class="u-stat u-hp"></div><div class="u-fc"></div></div>`);
  el._uid = u.uid;
  el.addEventListener('mouseenter', () => {
    const live = liveUnit(el._uid); if (!live) return;
    const st = [`현재 ⚔ ${B.game.effectiveAtk(live)} / ♥ ${live.hp}/${live.maxHp}`];
    if (live.shield) st.push(`방어막 ${live.shield}`); if (live.evade) st.push('회피'); if (live.slowed) st.push('둔화');
    showPreview(live.card, live.owner === B.me ? 'left' : 'left', st.join(' · '));
  });
  el.addEventListener('mouseleave', hidePreview);
  return el;
}
function liveUnit(uid) { for (const p of B.game.players) for (const u of p.lanes) if (u && u.uid === uid) return u; return null; }

function updateUnitEl(u, el) {
  const { game } = B;
  const atk = game.effectiveAtk(u);
  const ae = $('.u-atk', el), he = $('.u-hp', el);
  if (ae.textContent !== String(atk) && ae.textContent !== '') retrigger(ae, 'bump');
  if (he.textContent !== String(u.hp) && he.textContent !== '') retrigger(he, 'bump');
  ae.textContent = atk; he.textContent = u.hp;
  setTimeout(() => { ae.classList.remove('bump'); he.classList.remove('bump'); }, 220);
  ae.classList.toggle('up', atk > u.card.a); ae.classList.toggle('down', atk < u.card.a);
  he.classList.toggle('hurt', u.hp < u.maxHp);
  el.classList.toggle('has-shield', u.shield > 0);
  el.classList.toggle('has-evade', !!u.evade);
  const sleeping = game.cur === u.owner && !game.canAttack(u) && game.phase !== 'over';
  el.classList.toggle('sleeping', sleeping);
  el.classList.toggle('ready', u.owner === B.me && game.cur === B.me && game.phase === 'main' && !sleeping && !u.slowed && !B.busy);
  const b = [];
  if (u.shield > 0) b.push(`<span class="badge shield">🛡 ${u.shield}</span>`);
  if (u.evade) b.push('<span class="badge evade">회피</span>');
  if (u.slowed) b.push('<span class="badge slow">둔화</span>');
  Object.keys(u.kw).filter(k => !['회피', '방어막'].includes(k)).forEach(k => b.push(`<span class="badge kw">${k}${typeof u.kw[k] === 'number' ? ' ' + u.kw[k] : ''}</span>`));
  if (u.card.death) b.push('<span class="badge kw">격파</span>');
  const html = b.join('');
  const bd = $('.u-badges', el); if (bd.innerHTML !== html) bd.innerHTML = html;
}

// ---------- 전투 예측 ----------
function refreshForecast() {
  if (!B) return;
  $$('.unit .u-fc').forEach(f => { f.className = 'u-fc'; f.textContent = ''; });
  $$('.cmd .cm-fc').forEach(f => { f.className = 'cm-fc'; f.textContent = ''; });
  // 카드와 사령관 위에 예측 문구(피해량·빗나감·격파)를 띄우지 않는다. 화면을 가린다는 의견에 따라 모두 뺐다.
  // 예측은 공격 화살표로만 보여 준다. 내 차례에는 늘 그려 두고, 화면이 바뀔 때마다 다시 그린다 (설정 > 공격 예측 화살표)
  if (Store.settings.forecast && canAct()) drawArrows(); else clearArrows();
  // 막 배치된 카드는 등장 연출로 잠깐 자리가 어긋나 있으니, 연출이 끝난 뒤 한 번 더 맞춰 그린다
  clearTimeout(B.arrowTimer);
  B.arrowTimer = setTimeout(() => { if (B && Store.settings.forecast && canAct()) drawArrows(); }, 500);
}

function drawArrows() {
  if (!Store.settings.forecast || !canAct()) return;
  const svg = $('.fc-svg');
  const fc = B.game.forecast(B.me, true);
  const seen = new Set(), list = [];
  fc.hits.forEach(hh => {
    if (hh.rnd) return; // 「무작위 적 유닛」 피해는 대상을 미리 보여 주지 않는다
    const fromEl = B.unitEls.get(hh.fromUid); if (!fromEl) return;
    const key = hh.fromUid + '>' + hh.toUid; if (seen.has(key)) return; seen.add(key);
    const toEl = hh.toUid === 'cmd' ? $('#cmd-enemy') : B.unitEls.get(hh.toUid);
    if (!toEl || toEl === fromEl) return;
    if (B.me.lanes.some(u => u && u.uid === hh.toUid)) return; // 반격 화살표 생략
    const a = stageRect(fromEl), b = stageRect(toEl);
    // 공격하는 카드의 가운데에서 출발해 표적 카드의 가운데 조금 아래에 꽂힌다
    list.push({ x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy + b.h * 0.12, cmd: hh.toUid === 'cmd' });
  });
  // 화살표가 그대로면 다시 그리지 않는다 (화면이 바뀔 때마다 등장 연출이 반복되어 깜빡이지 않게)
  const sig = list.map(l => [l.x1, l.y1, l.x2, l.y2].map(Math.round).join(',')).join('|');
  if (sig === B.arrowSig) return;
  clearArrows(); B.arrowSig = sig;
  list.forEach((l, i) => svg.insertAdjacentHTML('beforeend', arrowSvg(l, i)));
}
// 공격 화살표 한 개: 꼬리가 가늘고 끝으로 갈수록 굵어지는 곡선 몸통 + 번지는 빛 + 흐르는 빛줄기 + 화살촉 + 표적 표시
function arrowSvg({ x1, y1, x2, y2, cmd }, i) {
  const col = cmd ? '#ffc04a' : '#ff4655', hot = cmd ? '#fff2c4' : '#ffd2d6';
  // 조절점: 두 점의 가운데에서 옆으로 비켜 활처럼 휘게 한다. 대각선은 위쪽으로, 바로 앞(세로)은 오른쪽으로 휜다
  const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy) || 1;
  let px = -dy / dist, py = dx / dist; if (py > 0 || (Math.abs(py) < 0.01 && px < 0)) { px = -px; py = -py; }
  const bend = Math.min(130, Math.max(34, dist * 0.22));
  const cx = (x1 + x2) / 2 + px * bend, cy = (y1 + y2) / 2 + py * bend;
  const at = t => ({ x: (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2, y: (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2 });
  const tan = t => { const dx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx), dy = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy), m = Math.hypot(dx, dy) || 1; return { x: dx / m, y: dy / m }; };
  // 화살촉 길이만큼 앞에서 몸통을 끝낸다
  const N = 40, HEAD = 40, pts = [];
  let len = 0; for (let k = 0; k <= N; k++) { const p = at(k / N); if (k) len += Math.hypot(p.x - pts[k - 1].x, p.y - pts[k - 1].y); pts.push({ ...p, s: len }); }
  const sEnd = Math.max(len * 0.3, len - HEAD + 6);
  const L = [], R = [];
  for (let k = 0; k <= N; k++) {
    const p = pts[k]; if (p.s > sEnd) break;
    const t = k / N, d = tan(t), w = 2 + 8 * Math.pow(p.s / sEnd, 1.4);
    L.push(`${(p.x - d.y * w).toFixed(1)},${(p.y + d.x * w).toFixed(1)}`); R.unshift(`${(p.x + d.y * w).toFixed(1)},${(p.y - d.x * w).toFixed(1)}`);
  }
  const body = `M${L.join(' L')} L${R.join(' L')} Z`;
  const d = tan(1), n = { x: -d.y, y: d.x }, bx = x2 - d.x * HEAD, by = y2 - d.y * HEAD, nx = x2 - d.x * (HEAD - 12), ny = y2 - d.y * (HEAD - 12);
  const head = `M${x2},${y2} L${(bx + n.x * 22).toFixed(1)},${(by + n.y * 22).toFixed(1)} L${nx.toFixed(1)},${ny.toFixed(1)} L${(bx - n.x * 22).toFixed(1)},${(by - n.y * 22).toFixed(1)} Z`;
  const end = at(sEnd / len), core = `M${x1},${y1} Q${cx},${cy} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;
  return `<g class="arrow${cmd ? ' cmd' : ''}">
    <defs><linearGradient id="ag${i}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${col}" stop-opacity="0.15"/><stop offset="0.55" stop-color="${col}" stop-opacity="0.85"/><stop offset="1" stop-color="${col}"/></linearGradient></defs>
    <path class="a-glow" d="${body} ${head}" fill="${col}" filter="url(#arrowGlow)"/>
    <path class="a-body" d="${body}" fill="url(#ag${i})"/>
    <path class="a-core" d="${core}" stroke="${hot}"/>
    <circle class="a-src" cx="${x1}" cy="${y1}" r="10" stroke="${col}"/>
    <g class="a-tgt" style="transform-origin:${x2}px ${y2}px"><circle cx="${x2}" cy="${y2}" r="30" stroke="${col}"/></g>
    <path class="a-head" d="${head}" fill="${col}" stroke="${hot}" style="transform-origin:${x2}px ${y2}px"/>
  </g>`;
}
function clearArrows() { $$('.fc-svg .arrow').forEach(p => p.remove()); if (B) B.arrowSig = ''; }

// ---------- 전술 팁 (설정 > 전술 팁) ----------
function tacticalTip() {
  const { game, me, ai } = B;
  const tips = [];
  const short = me.hand.filter(c => !me.canAfford(c));
  const fc = game.forecast(me, true);
  if (fc.lethal) tips.push('이번 턴 전투로 상대 라이프를 0으로 만들 수 있어요! 턴을 종료하세요.');
  const after = game.clone(); after.phase = 'combat'; after.resolveCombat();
  const threat = after.phase === 'over' ? null : after.forecast(after.players[game.players.indexOf(ai)]);
  if (threat && threat.lethal) tips.push('다음 적 턴에 패배할 수 있습니다. 빈 레인을 막거나 위협적인 적을 제거하세요.');
  const open = [0, 1, 2].filter(l => !ai.lanes[l] && !me.lanes[l]);
  if (me.hand.some(c => c.kind === 'unit' && me.canAfford(c)) && open.length) tips.push(`${open.map(l => LANE_NAMES[l]).join('·')} 레인은 적이 없어 배치하면 다음 턴 상대 라이프를 직접 공격합니다.`);
  const adv = me.hand.find(c => c.kind === 'unit' && me.canAfford(c) && me.emptyLanes().some(l => ai.lanes[l] && TYPE_BEATS[c.t] === ai.lanes[l].type));
  if (adv) tips.push(`${adv.n}(${TYPES[adv.t]})은 ${TYPES[TYPE_BEATS[adv.t]]}형 적 앞에 두면 상성상 유리합니다.`);
  if (ai.units().some(u => u.role === 'DEF')) tips.push('적 보호기는 앞이 빈 양옆 레인에서 라이프로 가는 공격을 대신 받고 피해를 1 덜 받습니다.');
  if (me.ap >= 2 && !me.hand.some(c => me.canAfford(c)) && short.length) tips.push(`AP가 ${me.ap} 남았습니다. 남은 AP는 ${RULES.AP_CARRY}까지 다음 턴으로 이월됩니다.`);
  if (me.units().some(u => u.role === 'SUP')) tips.push('지원기 양옆에 전투원을 두면 공격력이 +1 됩니다.');
  return tips[0] || null;
}
function showTacticalTip() {
  if (!B || !Store.settings.tips || B.cfg.tutorial || Tutorial.active) return;
  const t = tacticalTip(); if (!t || t === B.lastTip) return;
  B.lastTip = t; toast('💡 ' + t);
}

// ---------- 연출 ----------
async function hitStop() { const st = $('#stage'); st.classList.add('hitstop'); await sleepRaw(130); st.classList.remove('hitstop'); }
// 제작사 결속이 새로 켜졌을 때: 초상 옆에 제작사 색으로 결속 이름과 효과를 잠깐 띄운다
function synergyCallout(side, p, f) {
  const hero = $(`#cmd-${side}`); if (!hero || !B || B.over) return;
  const n = p.units().filter(u => u.card.f === f).length;
  const c = h(`<div class="syn-callout ${side}" style="--fc:${FACTIONS[f].color}"><div class="sc-head">${esc(FACTIONS[f].name)} 결속 발동 · ${esc(SYNERGY[f].name)}</div><div class="sc-text">${esc(SYNERGY[f].text)}</div><div class="sc-why">${side === 'me' ? '내' : '상대'} 전장에 ${esc(FACTIONS[f].short)} 전투원 ${n}기 (${RULES.SYNERGY_MIN}기 이상이면 켜짐)</div></div>`);
  // 전장 카드 위로 보이게 무대 맨 위층에 붙인다: 내 초상은 오른쪽, 상대 초상은 아래쪽
  const r = stageRect(hero);
  if (side === 'me') { c.style.left = `${r.x + r.w + 24}px`; c.style.top = `${r.cy}px`; } else { c.style.left = `${r.x}px`; c.style.top = `${r.y + r.h + 16}px`; }
  $('#stage').appendChild(c); Audio2.play('energy');
  setTimeout(() => c.classList.add('out'), 3200); setTimeout(() => c.remove(), 3700);
}
function showBanner(main, sub, side) {
  const b = h(`<div class="banner ${side}"><div class="bn-main">${esc(main)}</div><div class="bn-sub">${esc(sub || '')}</div></div>`);
  $('#stage').appendChild(b); setTimeout(() => b.remove(), 1300 / (Store.settings.speed || 1));
}
async function revealCard(card, mine) {
  const ss = card.kind === 'unit' && card.g === 'SS';
  const r = h(`<div class="reveal ${mine ? 'mine' : ''} ${ss ? 'ss' : ''}"><div class="rv-who">${mine ? '오렌지에이드' : esc(B.ai.name)} — ${card.kind === 'unit' ? '배치' : card.hero ? '특성 스킬' : '지원 카드'}</div></div>`);
  r.appendChild(cardEl(card, { noHover: true }));
  $('#stage').appendChild(r);
  Audio2.play('card');
  if (ss) { Audio2.play('pickSS'); screenFlash('gold'); vibrate(90); } // SS 등장은 잠깐 멈추고 번쩍인다
  await sleep((mine ? 560 : 580) + (ss ? 550 : 0));
  setTimeout(() => r.remove(), 400);
}
function flyCard(card, from, to) {
  return new Promise(res => {
    const g = h('<div style="position:absolute;z-index:470;pointer-events:none"></div>');
    g.appendChild(cardEl(card, { noHover: true }));
    g.style.left = from.x + 'px'; g.style.top = from.y + 'px';
    $('#stage').appendChild(g);
    const sc = to.w / from.w;
    const dur = 260 / (Store.settings.speed || 1);
    let done = false; const fin = () => { if (done) return; done = true; g.remove(); res(); };
    g.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${sc})`, opacity: 0.4 }], { duration: dur, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' }).onfinish = fin;
    setTimeout(fin, dur + 80);
    Audio2.play('card');
  });
}
function centerOf(el) { const r = stageRect(el); return { x: r.cx, y: r.cy }; }
function cmdElOf(p) { return p === B.me ? $('#cmd-me') : $('#cmd-enemy'); }

async function processEvents() {
  const myB = B; if (!B) return;
  const { game } = B;
  const evs = game.events.splice(0);
  const holdDie = new Set(evs.filter(e => e.type === 'die' || e.type === 'withdraw').map(e => e.unit.uid));
  const holdSpawn = new Set(evs.filter(e => e.type === 'summon').map(e => e.unit.uid));
  const holdDraw = new Set(evs.filter(e => e.type === 'draw' && e.player === B.me).map(e => e.card));
  B.holdDie = holdDie; B.holdSpawn = holdSpawn; B.holdDraw = holdDraw;
  B.holdDrawAi = evs.filter(e => e.type === 'draw' && e.player === B.ai).length;
  try { for (const ev of evs) {
    alive(myB);
    if (ev.type === 'summon') holdSpawn.delete(ev.unit.uid);
    if (ev.type === 'die' || ev.type === 'withdraw') holdDie.delete(ev.unit.uid);
    switch (ev.type) {
      case 'log': {
        const list = $('.log-list'); if (!list) break;
        const d = h(`<div class="${ev.kind}">${esc(ev.msg)}</div>`); list.appendChild(d); list.scrollTop = 1e9;
        break;
      }
      case 'turnStart': {
        const mine = ev.player === B.me;
        renderAll(true);
        showBanner(mine ? '내 턴' : '적 턴', mine ? `오렌지에이드의 턴 ${game.round()}` : `${B.ai.name}의 턴`, mine ? 'mine' : 'theirs');
        Audio2.play('round', 0.7);
        // 작전 시간 초과 예고: 시작 2라운드 전부터 내 턴에 알린다
        const left = RULES.OVERTIME_ROUND ? RULES.OVERTIME_ROUND - game.round() : 0;
        if (mine && left > 0 && left <= 2) toast(`${left}라운드 뒤부터 작전 시간 초과! 턴을 시작할 때마다 라이프 피해가 1씩 커집니다.`, true);
        await sleep(1000);
        break;
      }
      case 'overtime': {
        // 시간 초과에 들어서면 음악을 결전 곡으로 바꾸고 화면 가장자리를 붉게 맥박치게 한다 (한 번만)
        if (!B.overtimeFx) { B.overtimeFx = true; Audio2.bgm(B.cfg.bgm === 'boss2' ? 'boss1' : 'boss2'); $('#scr-battle').classList.add('overtime'); }
        showBanner('시간 초과', `작전 시간 초과 — ${ev.player === B.me ? '오렌지에이드' : esc(B.ai.name)} 피해 ${ev.v}`, 'theirs');
        Audio2.play('warning', 0.8);
        await sleep(900);
        break;
      }
      case 'apGain': {
        renderAll();
        const r = ev.player === B.me ? $('#ap-me') : $('#cmd-enemy .hero-ap');
        if (r) retrigger(r, 'pulse');
        if (ev.v) floatOn(r, `AP +${ev.v}`, 'buff');
        break;
      }
      case 'draw': if (ev.player === B.me) { holdDraw.delete(ev.card); await drawFly(ev.card); } else await drawFlyAi(); break;
      case 'burn': if (ev.player === B.me) toast(`패가 가득 차 ${josa(ev.card.n, '이', '가')} 소각되었습니다.`, true); break;
      case 'reshuffle': toast(`${ev.player.name}: 묘지를 섞어 덱을 재구성했습니다.`); break;
      case 'summon': {
        if (!ev.token) pushHistory(ev.unit.card, ev.player);
        renderAll();
        const el = B.unitEls.get(ev.unit.uid);
        if (el) { const c = centerOf(el); burstAt(c.x, c.y, FACTIONS[ev.unit.card.f].color); }
        Audio2.play('place');
        if (!ev.token) { Audio2.voice(ev.unit.cardId, 'deploy', ev.unit.card.g === 'SS'); ssBark(ev.unit); }
        await sleep(ev.token ? 160 : 380);
        break;
      }
      case 'skill': pushHistory(ev.card, ev.player); Audio2.play('energy'); renderAll(); break;
      case 'fx': {
        const from = ev.from && B.unitEls.get(ev.from.uid) ? centerOf(B.unitEls.get(ev.from.uid)) : { x: STAGE_W / 2, y: STAGE_H / 2 - 40 };
        const color = ev.op === 'destroy' ? '#ff4d5a' : FX_COLOR.dmg;
        for (const t of ev.targets) {
          const el = t.unit ? B.unitEls.get(t.unit.uid) : cmdElOf(t.cmd);
          if (!el) continue;
          const to = centerOf(el);
          beamBetween(from, to, color);
          if (ev.op === 'destroy') slashAt(to.x, to.y);
        }
        if (ev.targets.length) { Audio2.play(ev.targets.length > 1 ? 'boomSci' : (ev.op === 'destroy' ? 'swingHeavy' : 'beam')); await sleep(260); }
        break;
      }
      case 'attack': {
        const el = B.unitEls.get(ev.unit.uid); if (!el) break;
        const up = ev.unit.owner === B.me;
        el.classList.add(up ? 'lunge-up' : 'lunge-down');
        Audio2.play(ev.aoe ? 'boom' : ROLE_SFX[ev.unit.type] || 'shot');
        await sleep(150);
        const from = centerOf(el);
        const color = FACTIONS[ev.unit.card.f].color;
        if (ev.aoe) {
          (ev.targets || []).forEach(t => { const te = B.unitEls.get(t.uid); if (te) beamBetween(from, centerOf(te), color); });
          screenFlash('white');
          await sleep(180);
        } else {
          const tEl = ev.targetUnit ? B.unitEls.get(ev.targetUnit.uid) : cmdElOf(ev.targetCmd);
          if (tEl) await boltTo(from, centerOf(tEl), color, 200);
          if (ev.advantage && tEl) floatOn(tEl, '상성 유리!', 'buff');
        }
        el.classList.remove('lunge-up', 'lunge-down');
        break;
      }
      case 'dmg': {
        const el = B.unitEls.get(ev.unit.uid);
        if (el) { retrigger(el, 'hit'); const c = centerOf(el); burstAt(c.x, c.y, '#ff6a50'); floatAt(c.x, c.y - 30, `-${ev.v}`, ev.v >= 6 ? 'dmg big' : 'dmg'); }
        if (ev.v >= 5) await hitStop(); // 큰 한 방은 잠깐 멈추고 화면을 당긴다
        renderAll(); await sleep(260);
        break;
      }
      case 'shieldHit': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, `🛡 -${ev.v}`, 'shield'); /* 방어막이 깨지면 낮은 소리 */ Audio2.play('shield', 0.8, ev.unit.shield <= 0 ? 0.7 : 1.1); await sleep(120); break; }
      case 'evade': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, '회피!', 'info'); Audio2.play('swing', 0.9, 1.35); renderAll(); await sleep(280); break; }
      case 'counter': { const el = B.unitEls.get(ev.unit.uid), t = B.unitEls.get(ev.target.uid); floatOn(el, '반격!', 'info'); Audio2.play('swingHeavy', 0.8, 0.85); if (el && t) await boltTo(centerOf(el), centerOf(t), '#ff9a3b', 160); break; }
      case 'guard': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, '보호!', 'shield'); Audio2.play('shield', 1, 0.8); await sleep(200); break; }
      case 'move': { Audio2.play('swing', 0.7); renderAll(); const el = B.unitEls.get(ev.unit.uid); if (el) floatOn(el, '이동', 'info'); await sleep(300); break; }
      case 'strike': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, '공격 후', 'buff'); await sleep(140); break; }
      case 'pierce': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, '관통!', 'buff'); Audio2.play('beam', 0.7, 1.4); await sleep(150); break; }
      case 'dmgCmd': {
        const el = cmdElOf(ev.player);
        retrigger(el, 'hit');
        const r = stageRect(el); floatAt(r.x + r.w * 0.6, r.cy, `-${ev.v}`, 'dmg big');
        Audio2.play('explosion');
        if (ev.player === B.me) { screenFlash('red'); quake(); vibrate(ev.v >= 5 ? 160 : 70); }
        if (ev.v >= 5) await hitStop();
        renderAll(); await sleep(380);
        checkBark();
        break;
      }
      case 'heal': { if (!ev.v) break; const el = B.unitEls.get(ev.unit.uid); if (el) { const c = centerOf(el); sparkleAt(c.x, c.y, FX_COLOR.heal); floatOn(el, `+${ev.v}`, 'heal'); } Audio2.play('heal', 0.7); renderAll(); await sleep(200); break; }
      case 'healCmd': { if (!ev.v) break; const el = cmdElOf(ev.player); const c = centerOf(el); sparkleAt(c.x, c.y, FX_COLOR.heal, 14); floatOn(el, `+${ev.v}`, 'heal'); Audio2.play('heal'); renderAll(); await sleep(300); break; }
      case 'buff': { const el = B.unitEls.get(ev.unit.uid); retrigger(el, 'buffed'); floatOn(el, `${ev.a ? '+' + ev.a : '+0'}/${ev.h ? '+' + ev.h : '+0'}`, 'buff'); Audio2.play('buff', 0.7); renderAll(); await sleep(180); break; }
      case 'debuff': { const el = B.unitEls.get(ev.unit.uid); retrigger(el, 'debuffed'); floatOn(el, `공격력 -${ev.a}`, 'info'); Audio2.play('zap', 0.7); renderAll(); await sleep(220); break; }
      case 'shield': { const el = B.unitEls.get(ev.unit.uid); if (el) { const c = centerOf(el); sparkleAt(c.x, c.y, FX_COLOR.shield, 8); } floatOn(el, `방어막 ${ev.v}`, 'shield'); Audio2.play('shield', 0.7); renderAll(); await sleep(160); break; }
      case 'evadeGain': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, '회피 부여', 'info'); Audio2.play('smoke', 0.6); renderAll(); await sleep(160); break; }
      case 'slow': { const el = B.unitEls.get(ev.unit.uid); retrigger(el, 'debuffed'); floatOn(el, '둔화', 'info'); Audio2.play('zap', 0.6); renderAll(); await sleep(200); break; }
      case 'skip': { const el = B.unitEls.get(ev.unit.uid); floatOn(el, '둔화 — 공격 불가', 'info'); await sleep(320); renderAll(); break; }
      case 'die': {
        const el = B.unitEls.get(ev.unit.uid);
        if (el) { el._dyingKeep = true; el.classList.add('dying'); Audio2.play('boomSci', 0.6); await sleep(420); el.remove(); }
        B.unitEls.delete(ev.unit.uid); renderAll();
        break;
      }
      case 'withdraw': {
        const el = B.unitEls.get(ev.unit.uid);
        if (el) { floatOn(el, '철수', 'info'); el._dyingKeep = true; el.classList.add('withdrawing'); Audio2.play('trans', 0.6); await sleep(320); el.remove(); }
        B.unitEls.delete(ev.unit.uid); renderAll();
        break;
      }
      case 'gameOver': break;
      default: break;
    }
  } } finally {
    if (myB.holdDie === holdDie) myB.holdDie = null;
    if (myB.holdSpawn === holdSpawn) myB.holdSpawn = null;
    if (myB.holdDraw === holdDraw) { myB.holdDraw = null; myB.holdDrawAi = 0; }
  }
  renderAll();
}

// ---------- 결과 ----------
async function finishBattle(surrendered) {
  if (!B || B.resultShown) return;
  const myB = B;
  saveBattleSnapshot(); // 인공지능 턴에 끝난 경우에도 결과 상태를 먼저 남긴다
  B.resultShown = true; B.over = true; B.busy = true;
  clearSelection(); renderAll();
  Tutorial.stop(); Lessons.close();
  // 시작 패 교체 창 등 전투 중에 열린 창은 결과 화면 전에 모두 닫는다
  $$('#modal-root .modal').forEach(m => closeModal(m));
  const { game, me, cfg } = B;
  const win = game.winner === me;
  // 전적 (결과를 먼저 저장하고 나서 진행 중 전투 기록을 지운다. 그 사이에 새로고침해도 패배가 빠지지 않게)
  const rec = Store.data.record;
  if (win) { rec.w++; rec.streak++; } else { rec.l++; rec.streak = 0; }
  let stars = null, stage = null, got = { cards: [], secretaries: [] }, campaignBp = 0;
  if (cfg.mode === 'campaign') {
    stage = CAMPAIGN[cfg.stageIdx];
    const prevStars = Store.stageStars(stage.id).filter(Boolean).length, prevCleared = !!Store.data.campaign.cleared[stage.id];
    stars = evalStars(stage, game, me);
    const diff = cfg.diff || 'normal'; // 시작할 때의 난이도 (도중에 바꿔도 결과에 영향 없음)
    if (diff === 'easy' && !stage.tutorial) stars[2] = false; // 쉬움 난이도는 별 2개까지
    if (diff === 'hard' && win && !stage.tutorial) { Store.data.campaign.hardCleared[stage.id] = true; }
    Store.setStageResult(stage.id, stars);
    // 보급 포인트: 처음 이기면 6, 새로 얻은 별마다 2
    campaignBp = (win && !prevCleared ? 6 : 0) + (Store.stageStars(stage.id).filter(Boolean).length - prevStars) * 2;
    if (stage.tutorial && win) Store.data.tutorialDone = true;
    got = Store.grantRewards(stage.id, win);
  }
  Store.save();
  const ch = recordChallengeResult({ win, surrendered, game, me, cfg, campaignBp });
  Store.clearBattle();
  await sleepRaw(700); alive(myB);
  if (win) Audio2.play('win'); else { Audio2.play('boom', 0.7); vibrate([120, 60, 220]); }
  // MVP: 가장 많은 피해를 준 카드
  const dmg = Object.entries(me.stats.cardDmg).sort((a, b) => b[1] - a[1]);
  const mvp = dmg.length ? CARDS[dmg[0][0]] : CARDS['PECS_Orangeade'];
  const st = me.stats;
  const box = h(`<div class="modal-box result">
    <div class="rs-art">${win ? '' : '<!-- 패배 화면에는 수훈 표시를 하지 않는다 -->'}<div class="mvp" ${win ? '' : 'style="display:none"'}>MVP<small>${esc(mvp.n)}${dmg.length ? ` — 피해 ${dmg[0][1]}` : ''}</small></div><img src="${fullOf(mvp.kind === 'unit' ? mvp : CARDS[mvp.art] || mvp)}" alt=""></div>
    <div class="rs-body">
      <h2 class="${win ? 'win' : 'lose'}">${win ? '승리' : '패배'}</h2>
      <div class="rs-sub">${surrendered ? '대국을 포기했습니다.' : win ? `${esc(B.ai.name)}에게 승리했습니다!` : esc(lossHint(cfg, game, me))}</div>
      ${stage && !win && stage.lose ? `<div class="rs-lose"><b>${esc(CARDS[stage.lose.who].n)}</b>“${esc(stage.lose.text)}”</div>` : ''}
      <div class="rs-stats">
        <div><span>라운드</span><b>${game.round()}</b></div>
        <div><span>상대 라이프에 준 피해</span><b>${st.dmgCmd}</b></div>
        <div><span>남은 라이프</span><b>${me.hp}/${me.maxHp}</b></div>
        <div><span>처치한 적</span><b>${st.kills}</b></div>
        <div><span>배치한 전투원</span><b>${st.unitsPlayed}</b></div>
        <div><span>지원 카드 / 회복</span><b>${st.skillsUsed} / ${st.healed}</b></div>
      </div>
      ${stage ? `<div class="rs-stars">${stage.stars.map((s, i) => `<div class="s ${stars[i] ? 'on' : ''}"><span class="st lo-star ${stars[i] ? 'on' : ''}" style="animation-delay:${0.3 + i * 0.35}s"></span>${starLabel(s)}</div>`).join('')}</div>` : ''}
      ${ch.note ? `<div class="rs-note">${esc(ch.note)}</div>` : ''}
      ${ch.bp ? `<div class="rs-bp">보급 포인트 <b>+${ch.bp}</b><span>보유 ${Store.data.bp} · 카드 도감의 보급소에서 카드를 해금할 수 있습니다</span></div>` : ''}
      ${ch.masteryUps.length ? `<div class="rs-mastery">${ch.masteryUps.slice(0, 6).map(m => `<span class="mst m${m.level}">${esc(CARDS[m.id].n)} <b>${MASTERY[m.level - 1].name}</b></span>`).join('')}${ch.masteryUps.length > 6 ? `<span class="mst">외 ${ch.masteryUps.length - 6}장</span>` : ''}<em>숙련도 상승</em></div>` : ''}
      ${ch.achievements.length ? `<div class="rs-ach">${ch.achievements.map(a => `<span><i class="lo-star on"></i>업적 달성 · <b>${esc(a.name)}</b></span>`).join('')}${ch.newBgs.map(b => `<span><i class="lo-star on"></i>로비 배경 해금 · <b>${esc(b.name)}</b></span>`).join('')}</div>` : ''}
      ${got.cards.length || got.secretaries.length ? `<div class="rs-reward"><div class="rr-title">보상 획득!${got.cards.length ? '<small> 덱 편성에서 내 덱에 넣을 수 있습니다</small>' : ''}</div><div class="rr-list"></div></div>` : ''}
      <div class="modal-actions" style="margin-top:auto">
        <button class="btn" data-a="lobby">로비</button>
        ${cfg.mode === 'campaign' ? `${got.cards.length ? '<button class="btn" data-a="deck">덱 편성</button>' : '<button class="btn" data-a="retry">재도전</button>'}<button class="btn primary" data-a="camp">스토리로</button>`
          : cfg.mode === 'gauntlet' ? (Store.data.gauntlet.run ? '<button class="btn" data-a="chal">도전 모드</button><button class="btn primary" data-a="gnext">다음 대국</button>' : '<button class="btn primary" data-a="chal">도전 모드로</button>')
          : cfg.mode === 'draft' ? (Store.data.draft.run ? '<button class="btn" data-a="chal">도전 모드</button><button class="btn primary" data-a="dnext">다음 대국</button>' : '<button class="btn primary" data-a="chal">도전 모드로</button>')
          : cfg.mode === 'daily' ? '<button class="btn" data-a="retry">다시 도전</button><button class="btn primary" data-a="chal">도전 모드로</button>'
          : '<button class="btn" data-a="deck">덱 편성</button><button class="btn primary" data-a="retry">다시 하기</button>'}
      </div>
    </div></div>`);
  const rl = $('.rr-list', box);
  if (rl) {
    got.cards.forEach(id => { const ce = cardEl(CARDS[id], { w: 120 }); ce.title = '새 카드 해금'; ce.onclick = () => openCardDetail(CARDS[id]); rl.appendChild(ce); });
    got.secretaries.forEach(id => rl.appendChild(h(`<div class="rr-sec"><div class="rr-face" style="background-image:url('${artOf(CARDS[id])}')"></div><span>로비 캐릭터 해금<br><b>${esc(CARDS[id].n)}</b></span></div>`)));
  }
  const m = openModal(box, { closable: false });
  if (win) setTimeout(() => Audio2.voice(mvp.kind === 'unit' ? mvp.id : 'PECS_Orangeade', 'mvp', true), 900); // 최고 활약 대사
  if ((stars && stars.filter(Boolean).length === 3) || got.cards.length || ch.achievements.length) setTimeout(() => Audio2.play('rankup'), 900);
  const leave = async target => {
    closeModal(m);
    if (cfg.mode === 'campaign' && win && stage.outro) await playDialogue(stage.outro, { bg: stage.bg });
    if (cfg.mode === 'campaign' && win && stage.epilogue) await playDialogue(stage.epilogue, { bg: 'barracks', title: ['에필로그', '다음 시즌을 기다리며'] });
    if (cfg.mode === 'campaign' && win && cfg.stageIdx < CAMPAIGN.length - 1) selStage = cfg.stageIdx + 1;
    B = null;
    showScreen(target);
  };
  $('[data-a=lobby]', box).onclick = () => leave('lobby');
  const camp = $('[data-a=camp]', box); if (camp) camp.onclick = () => leave('campaign');
  const deck = $('[data-a=deck]', box); if (deck) deck.onclick = () => { if (cfg.mode === 'campaign') deckReturn = 'campaign'; leave('deck'); };
  const chal = $('[data-a=chal]', box); if (chal) chal.onclick = () => leave('challenge');
  const gnext = $('[data-a=gnext]', box); if (gnext) gnext.onclick = () => { closeModal(m); B = null; Gauntlet.play(); };
  const dnext = $('[data-a=dnext]', box); if (dnext) dnext.onclick = () => { closeModal(m); B = null; Draft.play(); };
  const retry = $('[data-a=retry]', box); if (retry) retry.onclick = () => { closeModal(m); const c = B.cfg; B = null; startBattle(c); };
}

// ---------- 전투 중 대사 (캠페인) ----------
// 상대 라이프가 절반 이하가 되거나 내 라이프가 8 이하가 되면 스테이지의 대사를 한 번씩 띄운다
function checkBark() {
  if (!B || B.cfg.mode !== 'campaign' || B.game.phase === 'over') return;
  const mid = CAMPAIGN[B.cfg.stageIdx].mid; if (!mid) return;
  B.barked = B.barked || {};
  const { me, ai } = B;
  if (me.hp + 5 <= ai.hp) B.behind = true; // 역전 판정용: 한때 5 이상 뒤졌는가
  // 한 번에 한 대사만 띄운다
  if (mid.half && !B.barked.half && ai.hp > 0 && ai.hp <= ai.maxHp / 2) { B.barked.half = true; showBark(mid.half); }
  else if (mid.low && !B.barked.low && me.hp > 0 && me.hp <= 8) { B.barked.low = true; showBark(mid.low); }
  // 역전: 한때 라이프가 5 이상 뒤졌다가 앞서게 되면 콘스탄챠가 한마디 (스테이지에 comeback 대사가 있으면 그것을)
  else if (B.behind && !B.barked.comeback && me.hp > ai.hp && ai.hp > 0) { B.barked.comeback = true; showBark(mid.comeback || { who: '3P_ConstantiaS2', text: '흐름이 바뀌었구나! 이대로 몰아붙이렴, 오렌지에이드.' }); }
}
// SS 전투원 등장 때의 한마디 (대국마다 내 쪽·상대 쪽 한 번씩)
function ssBark(unit) {
  if (!B || B.cfg.mode !== 'campaign' || unit.card.g !== 'SS') return;
  B.barked = B.barked || {};
  const mine = unit.owner === B.me, key = mine ? 'ssMe' : 'ssAi';
  if (B.barked[key]) return; B.barked[key] = true;
  const mid = CAMPAIGN[B.cfg.stageIdx].mid || {};
  showBark(mine ? (mid.ssMe || { who: 'PECS_Orangeade', text: `${unit.card.n} 씨, 부탁드려요! 여기서 승부를 걸게요!` })
    : (mid.ssAi || { who: '3P_ConstantiaS2', text: `상대가 ${josa(unit.card.n, '을', '를')} 꺼냈구나! 정면으로 받지 말고 상성을 살피렴.` }));
}
function showBark(line) {
  const c = CARDS[line.who]; if (!c) return;
  const old = $('#scr-battle .bark'); if (old) old.remove();
  const el = h(`<div class="bark ${line.who === 'PECS_Orangeade' ? 'left' : 'right'}"><div class="bk-face" style="background-image:url('${artOf(c)}')"></div><div class="bk-body"><div class="bk-who">${esc(c.n)}</div><div class="bk-text">${esc(line.text)}</div></div></div>`);
  $('#scr-battle').appendChild(el);
  Audio2.play('card', 0.5);
  setTimeout(() => el.classList.add('out'), 4200);
  setTimeout(() => el.remove(), 4700);
}

// ---------- 키보드 ----------
function battleKey(e) {
  if (!B || currentScreen !== 'battle') return false;
  const top = topModal();
  if (top) return false;
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); endMyTurn(); return true; }
  if (e.key === 'Escape') { if (B.selected || B.moving) { clearSelection(); renderHand(true); return true; } return false; }
  if (e.key === 'l' || e.key === 'L') { $('.log-panel').classList.toggle('open'); return true; }
  if (/^[1-7]$/.test(e.key)) { const c = B.me.hand[+e.key - 1]; if (c) selectCard(c); return true; }
  return false;
}
