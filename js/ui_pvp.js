// ===== 대전 모드: 다른 지휘관과 1:1 배틀 (P2P) =====
// 상대 찾기는 js/net.js(공개 중계소에서 만나 브라우저끼리 직접 연결). 두 기기는 같은 시드로 같은 판을 만들고,
// 행동(시작 패 교체·카드 사용·특성 스킬·이동·턴 종료·항복)만 주고받아 똑같이 재생한다.
// 등급 점수(전공)는 LAO_Royal과 같은 방식: 이기면 오르고 지면 내려가며, 한 번 오른 등급 아래로는 떨어지지 않는다.
// 비슷한 점수의 상대부터 찾고 점점 범위를 넓히며, 아무도 없으면 인공지능이 그 자리를 맡는다.
const PVP = {
  TIERS: [
    { name: '훈련병', min: 0, color: '#9aa0a8' },
    { name: '정찰대', min: 300, color: '#6fd08c' },
    { name: '돌격대', min: 800, color: '#5ab4ff' },
    { name: '지휘관', min: 1500, color: '#c08aff' },
    { name: '오르카 에이스', min: 2500, color: '#ffc600' },
  ],
  TURN_SEC: 90,                // 한 턴 제한 시간: 다 쓰면 턴이 저절로 끝난다
  REMATCH_MS: 5 * 60 * 1000,   // 방금 만난 상대와는 5분 동안 다시 짝짓지 않는다
  SILENCE_MS: 45000,           // 상대 기기에서 이만큼 아무 소식이 없으면 연결이 끊긴 것으로 본다
};
const RESERVED_NICK = /개발자|개발|운영자|운영|관리자|dev|gm|admin|staff|moderator/i; // 아무도 새로 고를 수 없는 이름 (이미 쓰던 사람은 그대로)

const Pvp = {
  get d() { return Store.data.pvp; },
  tierOf(mmr) { let t = 0; PVP.TIERS.forEach((r, i) => { if (mmr >= r.min) t = i; }); return t; },
  pid() { if (!this.d.pid) { this.d.pid = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); Store.save(); } return this.d.pid; },
  // 승리: 30에 상대와의 점수 차를 조금 반영 (강한 상대를 이기면 더). 연결 끊김 승리는 절반
  winDelta(foeMmr, reason) {
    const d = 30 + Math.max(-6, Math.min(6, Math.round(((+foeMmr || 0) - this.d.mmr) / 40)));
    return reason === 'disconnect' ? Math.round(d / 2) : d;
  },
  // 패배: 등급이 높을수록 많이 잃지만, 도달한 등급의 하한 아래로는 떨어지지 않는다
  lossDelta() { const t = this.tierOf(this.d.mmr); return Math.max(PVP.TIERS[t].min - this.d.mmr, -(18 + t * 3)); },
  // 배틀이 실제로 시작되었다: 지금 나가면(창을 닫으면) 다음 실행 때 패배로 처리한다
  begin() { this.d.pending = { t: Date.now() }; Store.save(); },
  settlePending() {
    if (!this.d.pending) return;
    const delta = this.lossDelta();
    this.d.pending = null; this.d.mmr += delta; this.d.l++; this.d.streak = 0;
    const rec = Store.data.record; rec.l++; rec.streak = 0;
    Store.save();
    setTimeout(() => toast(`끝내지 않고 나간 대전이 패배로 처리되었습니다 (전공 ${delta})`, true), 1200);
  },
  // 결과 반영. 결과 화면에 띄울 문구를 돌려준다
  finish(win, cfg, reason) {
    const d = this.d, t0 = this.tierOf(d.mmr);
    const delta = win ? this.winDelta(cfg.pvp.foeMmr, reason) : this.lossDelta();
    d.pending = null; d.mmr += delta; d.best = Math.max(d.best, d.mmr);
    if (win) { d.w++; d.streak++; } else { d.l++; d.streak = 0; }
    Store.save();
    const t1 = this.tierOf(d.mmr);
    return `전공 ${d.mmr - delta} → ${d.mmr} (${!delta && !win ? '등급 하한이라 그대로' : (delta >= 0 ? '+' : '') + delta})${reason === 'disconnect' && win ? ' · 연결 끊김 승리는 절반' : ''}${t1 > t0 ? ` · 승급! 「${PVP.TIERS[t1].name}」` : ''}`;
  },
};

// ---------- 화면 ----------
const pvpState = { deck: null };
screenHooks.pvp = el => {
  Audio2.bgm('lobby');
  const decks = Store.allDecks().filter(d => !Store.deckProblem(d.cards, d.preset));
  if (!pvpState.deck || !decks.some(d => d.id === pvpState.deck)) pvpState.deck = decks.some(d => d.id === Store.data.activeDeck) ? Store.data.activeDeck : decks[0].id;
  const d = Pvp.d, t = Pvp.tierOf(d.mmr), T = PVP.TIERS[t], nx = PVP.TIERS[t + 1];
  const pct = nx ? Math.min(100, (d.mmr - T.min) / (nx.min - T.min) * 100) : 100;
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/vr.jpg');opacity:.3"></div>
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>대전 모드</h2><span class="sub">다른 지휘관과 실시간 1:1 배틀</span><span class="spacer"></span>
      <span class="sub">사용할 덱</span><select class="ch-deck">${decks.map(x => `<option value="${x.id}" ${x.id === pvpState.deck ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    <div class="pvp-wrap">
      <div class="panel pvp-col">
        <div class="ch-kicker">RANKED</div>
        <div class="pvp-rank">
          <div class="pvp-emblem" style="--tc:${T.color}"><span>${t + 1}</span></div>
          <div><div class="pvp-tier" style="color:${T.color}">${esc(T.name)}</div><div class="pvp-mmr">전공 <b>${d.mmr}</b><small>최고 ${d.best}</small></div></div>
        </div>
        <div class="pvp-bar"><i style="width:${pct}%;background:${T.color}"></i></div>
        <div class="pvp-next">${nx ? `<span>${d.mmr} / ${nx.min}</span><span>다음 등급: ${esc(nx.name)}</span>` : '<span>최고 등급 도달!</span>'}</div>
        <div class="ch-stats"><div><span>승리</span><b>${d.w}</b></div><div><span>패배</span><b>${d.l}</b></div><div><span>연승</span><b>${d.streak}</b></div></div>
        <label class="pvp-nick"><span>닉네임</span><input type="text" maxlength="10" placeholder="2~10자" value="${esc(d.nick || '')}"></label>
        <div class="ch-actions"><button class="btn primary big" data-a="find">상대 찾기</button></div>
      </div>
      <div class="panel pvp-col">
        <div class="ch-kicker">RULES</div><h3>대전 규칙</h3>
        <ul class="pvp-rules">
          <li>비슷한 전공의 지휘관부터 찾고, 시간이 지나면 범위를 넓힙니다. 기다리는 지휘관이 없으면 인공지능이 대신 상대합니다.</li>
          <li>한 턴은 <b>${PVP.TURN_SEC}초</b>입니다. 시간이 다 되면 턴이 저절로 끝납니다.</li>
          <li>이기면 전공이 오르고(강한 상대일수록 더), 지면 내려갑니다. 한 번 오른 등급 아래로는 떨어지지 않습니다.</li>
          <li>상대의 연결이 끊기면 승리하지만 전공은 절반만 오릅니다. 배틀 도중 창을 닫으면 패배로 처리됩니다.</li>
          <li>같은 상대와는 5분 동안 다시 만나지 않습니다.</li>
        </ul>
        <div class="pvp-tiers">${PVP.TIERS.map((r, i) => `<div class="${i === t ? 'on' : ''}" style="--tc:${r.color}"><b>${esc(r.name)}</b><span>${r.min}+</span></div>`).join('')}</div>
      </div>
    </div>`;
  $('.ch-deck', el).onchange = e => { pvpState.deck = e.target.value; };
  $('[data-a=back]', el).onclick = () => showScreen('lobby');
  $('[data-a=find]', el).onclick = async () => {
    const v = $('.pvp-nick input', el).value.trim().replace(/\s+/g, ' ');
    if (v.length < 2) { toast('닉네임은 2~10자로 정하세요.', true); $('.pvp-nick input', el).focus(); return; }
    if (v !== d.nick && RESERVED_NICK.test(v.replace(/\s+/g, ''))) { toast('사용할 수 없는 닉네임입니다.', true); return; }
    d.nick = v.slice(0, 10); Store.save();
    if (!await confirmAbandon()) return;
    pvpSearch(pvpState.deck);
  };
};

// ---------- 상대 찾기 ----------
let pvpSearching = false;
async function pvpSearch(deckId) {
  if (pvpSearching) return;
  const deck = Store.getDeck(deckId);
  if (!deck || Store.deckProblem(deck.cards, deck.preset)) { toast('사용할 수 있는 덱을 고르세요.', true); return; }
  Store.data.activeDeck = deck.id; Store.save();
  const d = Pvp.d, myMmr = d.mmr;
  const profile = { nick: d.nick, pid: Pvp.pid(), deck: deck.cards.slice(), face: Store.data.secretary, mmr: myMmr };
  pvpSearching = true;
  let canceled = false;
  const box = h(`<div class="modal-box pvp-search"><div class="ps-spin"></div><h3>상대를 찾고 있습니다</h3><p class="ps-msg">전공 ${myMmr} 근처의 지휘관을 찾는 중…</p><div class="ps-sec">0초</div>
    <div class="modal-actions" style="justify-content:center"><button class="btn" data-a="cancel">취소</button></div></div>`);
  const m = openModal(box, { closable: false });
  const t0 = performance.now();
  // 가까운 점수부터: 4초까지 ±200, 8초까지 ±500, 그 뒤는 누구든 (기다리는 지휘관이 없으면 12~18초 뒤 인공지능이 앉는다)
  const span = () => { const e = performance.now() - t0; return e < 4000 ? 200 : e < 8000 ? 500 : Infinity; };
  const tick = setInterval(() => {
    const s = Math.floor((performance.now() - t0) / 1000);
    $('.ps-sec', box).textContent = `${s}초`;
    $('.ps-msg', box).textContent = span() === Infinity ? '범위를 넓혀 모든 지휘관을 찾는 중…' : `전공 ${Math.max(0, myMmr - span())}~${myMmr + span()} 범위에서 찾는 중…`;
  }, 250);
  $('[data-a=cancel]', box).onclick = () => { canceled = true; Audio2.play('click'); if (window.NET) NET.cancel(); };
  const now = Date.now();
  d.recent = d.recent.filter(r => now - r.t < PVP.REMATCH_MS);
  const blocked = p => !p || typeof p.pid !== 'string' || p.pid === profile.pid // (같은 기기의 다른 창)
    || d.recent.some(r => r.id === p.pid)
    || !Array.isArray(p.deck) || !!validateDeck(p.deck)
    || Math.abs((+p.mmr || 0) - myMmr) > span();
  const WAIT = 12000 + Math.random() * 6000;
  let found = null;
  if (window.NET && navigator.onLine !== false && !/[?&]offline=1/.test(location.search)) found = await NET.find(profile, WAIT, blocked);
  else await new Promise(res => { const w = setInterval(() => { if (canceled || performance.now() - t0 > 3000) { clearInterval(w); res(); } }, 100); });
  clearInterval(tick); closeModal(m); pvpSearching = false;
  if (found) { pvpStartOnline(found, profile, deck); return; }
  if (canceled) return;
  pvpStartBot(profile, deck);
}

// 상대 프로필의 닉네임: 공백 정리, 10자까지 (예전 판이 보낸 빈 이름은 기본 이름으로)
function pvpNick(p) { return typeof p.nick === 'string' && p.nick.replace(/\s+/g, ' ').trim() ? p.nick.replace(/\s+/g, ' ').trim().slice(0, 10) : '이름 없는 지휘관'; }
function pvpFace(id) { return CARDS[id] && CARDS[id].kind === 'unit' && !CARDS[id].enemy ? id : 'PECS_Orangeade'; }
const PVP_BGS = ['board', 'camp_night', 'snow', 'corridor_dark', 'offline', 'vr'];

// 사람 상대를 찾았다: 두 기기가 같은 시드로 같은 판을 만든다. 저마다 자기가 아래쪽(아군 진영)에 보인다
// 특성 스킬은 양쪽 모두 오렌지에이드의 것으로 공평하게. 상대 초상은 그 지휘관의 로비 캐릭터로 보여 준다
function pvpStartOnline(m, profile, deck) {
  abandonSavedBattle();
  const f = m.foe, seed = m.seed >>> 0;
  const foeNick = pvpNick(f);
  Pvp.d.recent.push({ id: f.pid, t: Date.now() }); Store.save();
  const host = m.guest ? f : profile, guest = m.guest ? profile : f;
  const hostFirst = (seed & 1) === 0;
  const first = hostFirst ? host : guest, second = hostFirst ? guest : host;
  const rnd = seedRng(seed ^ 0x2545F491);
  const mk = pr => { const p = new Player(pr === profile ? profile.nick : foeNick, pr.deck, { rnd, portrait: 'PECS_Orangeade' }); p.face = pr === profile ? 'PECS_Orangeade' : pvpFace(pr.face); return p; };
  const p0 = mk(first), p1 = mk(second);
  const game = new Game(p0, p1, { seed });
  const me = first === profile ? p0 : p1, ai = me === p0 ? p1 : p0;
  const cfg = {
    mode: 'pvp', myDeck: deck.cards, myDeckName: deck.name,
    enemy: { name: foeNick, deck: f.deck, level: 'normal', portrait: 'PECS_Orangeade', face: ai.face, hp: RULES.CMD_HP },
    first: 'random', bg: PVP_BGS[seed % PVP_BGS.length], bgm: ['battle1', 'battle2', 'battle3'][(seed >>> 3) % 3],
    pvp: { online: true, foeMmr: +f.mmr || 0 },
  };
  B = { cfg, game, me, ai, meFirst: me === p0, unitEls: new Map(), selected: null, pending: null, busy: true, drag: null, over: false, handSig: '', logCount: 0 };
  B.net = pvpLink(m, B);
  Pvp.begin();
  showScreen('battle', { cfg });
}

// 기다리는 지휘관이 없었다: 인공지능이 지휘관 이름을 달고 같은 규칙(제한 시간·전공)으로 상대한다
function pvpStartBot(profile, deck) {
  const nicks = ['오르카호선장', '밤샘지휘관', '무과금지휘관', '라오고인물', '철충잡는사람', '덱연구중', '한판만더', '칼퇴지휘관', '고양이집사', '민트초코파', '새벽세시', '브라우니분대장', '콘챠사랑', '레드후드팬', '오늘도출격', 'Orca_07', 'deckmaster', 'sleepy_cat', 'noob_cmdr', 'ㅇㅇ'];
  const pd = PRESET_DECKS[Math.floor(Math.random() * PRESET_DECKS.length)];
  const faces = pd.cards.map(id => CARDS[id]).filter(c => c.kind === 'unit');
  const foeMmr = Math.max(0, Pvp.d.mmr + Math.round((Math.random() - 0.5) * 120));
  startBattle({
    mode: 'pvp', myDeck: deck.cards, myDeckName: deck.name,
    enemy: { name: nicks[Math.floor(Math.random() * nicks.length)], deck: pd.cards, level: 'normal', portrait: 'PECS_Orangeade', face: faces[Math.floor(Math.random() * faces.length)].id, hp: RULES.CMD_HP },
    first: 'random', bg: PVP_BGS[Math.floor(Math.random() * PVP_BGS.length)], bgm: ['battle1', 'battle2', 'battle3'][Math.floor(Math.random() * 3)],
    pvp: { online: false, foeMmr },
  });
  Pvp.begin();
}

// ---------- 배틀 중 통신 ----------
// 받은 행동은 차례대로 쌓아 두고 next()로 하나씩 꺼낸다. 항복·연결 끊김은 쌓지 않고 바로 처리한다
function pvpLink(m, myB) {
  const L = { q: [], waiter: null, last: performance.now(), send: m.send, close: m.close };
  L.next = () => new Promise(res => { if (L.q.length) res(L.q.shift()); else L.waiter = res; });
  m.listen(msg => {
    if (!msg || typeof msg !== 'object') return;
    L.last = performance.now();
    if (B !== myB || B.over) return;
    if (msg.k === 'ping') return;
    if (msg.k === 'bye') { pvpWinBy('surrender'); return; }           // 상대가 항복했다
    if (msg.k === 'gone') { pvpLoseBy(); return; }                     // 상대 쪽에서 이 기기가 너무 오래 조용했다고 판정했다
    if (msg.k === 'void') { pvpVoid(true); return; }                   // 상대 쪽에서 판이 어긋난 것을 찾았다
    if (msg.k === 'left') { toast('상대의 연결이 끊겼습니다. 5초 안에 돌아오지 않으면 승리합니다.', true); setTimeout(() => { if (B === myB && !B.over && performance.now() - L.last > 4500) pvpWinBy('disconnect', true); }, 5000); return; }
    if (L.waiter) { const w = L.waiter; L.waiter = null; w(msg); } else L.q.push(msg);
  });
  // 살아 있다는 신호. 상대가 오래 조용하거나(이 화면이 보이는 동안만 센다) 상대 턴이 너무 길면 연결이 끊긴 것으로 본다
  L.beat = setInterval(() => {
    if (B !== myB || B.over) { clearInterval(L.beat); return; }
    L.send({ k: 'ping' });
    if (document.visibilityState !== 'visible') { L.last = Math.max(L.last, performance.now() - 5000); return; }
    const quiet = performance.now() - L.last > PVP.SILENCE_MS;
    const stalled = B.game.cur === B.ai && B.turnStart && Date.now() - B.turnStart > (PVP.TURN_SEC + 30) * 1000;
    if (quiet || stalled) pvpWinBy('disconnect');
  }, 3000);
  return L;
}
function pvpSend(msg) { if (B && B.net && !B.over) B.net.send(msg); }
// 대상 표시: 두 기기에서 같은 순서인 플레이어 번호와 레인으로 주고받는다
function pvpEncTarget(t) {
  if (!t) return null;
  const g = B.game;
  if (t.unit) { const p = t.unit.owner, pi = g.players.indexOf(p); return { u: [pi, p.lanes.indexOf(t.unit)] }; }
  if (t.cmd) return { c: g.players.indexOf(t.cmd) };
  return null;
}
function pvpDecTarget(t) {
  if (!t) return null;
  const g = B.game;
  if (t.u) { const p = g.players[t.u[0]], u = p && p.lanes[t.u[1]]; return u ? { unit: u } : undefined; }
  if (t.c !== undefined) { const p = g.players[t.c]; return p ? { cmd: p } : undefined; }
  return null;
}
// 상대가 보낸 행동을 엔진 행동으로 되돌린다 (틀린 내용이면 null)
function pvpDecodeAct(msg) {
  const { game, ai } = B;
  if (msg.k === 'play') {
    const card = ai.hand[msg.h]; if (!card) return null;
    if (card.kind === 'unit') return { card, lane: msg.lane };
    const target = pvpDecTarget(msg.t); if (target === undefined) return null;
    return { card, target };
  }
  if (msg.k === 'cmd') { const target = pvpDecTarget(msg.t); if (target === undefined) return null; return { command: true, card: heroSkillOf(ai), target }; }
  if (msg.k === 'move') { const u = ai.lanes[msg.from]; return u ? { move: true, unit: u, lane: msg.lane } : null; }
  return null;
}
// 두 기기의 판이 같은지 비교하는 짧은 요약 (턴이 끝날 때마다 주고받는다)
function pvpDigest(g) {
  return JSON.stringify([g.turn, g.current, g.seed, g.players.map(p => [p.hp, p.ap, p.maxAp, p.hand.length, p.deck.length, p.grave.length, p.lanes.map(u => u && [u.cardId, u.atk, u.hp, u.shield])])]);
}

// 상대 턴: 상대 기기가 보낸 행동을 하나씩 받아 같은 연출로 재생한다
async function pvpRemoteTurn() {
  const myB = B; const { game, ai } = B;
  B.busy = true; renderAll();
  setPhaseLabel('상대 지휘관 행동 중…');
  while (!B.over) {
    const msg = await B.net.next(); alive(myB);
    if (B.over) return;
    if (msg.k === 'end') {
      setPhaseLabel('적 전투 중…');
      game.endTurn();
      if (msg.d && msg.d !== pvpDigest(game)) { pvpVoid(); return; }
      await processEvents(); alive(myB);
      break;
    }
    const act = pvpDecodeAct(msg);
    if (!act) { pvpVoid(); return; }
    if (!act.move) { await revealCard(act.card, false); alive(myB); }
    if (!game.act(act)) { pvpVoid(); return; }
    await processEvents(); alive(myB); renderAll();
    if (game.phase === 'over') break;
  }
  B.busy = false;
  if (game.phase === 'over' || B.over) return finishBattle();
  onTurnBegin();
}

// 시작 패 교체: 내 선택을 보내고 상대 선택을 받은 뒤, 두 기기 모두 선공 → 후공 순서로 적용한다 (난수 순서를 맞춘다)
async function pvpMulligan(mine) {
  const myB = B; const { game, me, ai } = B;
  B.net.send({ k: 'mul', idx: mine.map(c => me.hand.indexOf(c)) });
  const msg = await B.net.next(); alive(myB);
  const theirs = msg.k === 'mul' && Array.isArray(msg.idx) ? msg.idx.map(i => ai.hand[i]).filter(Boolean) : [];
  game.players.forEach(p => game.mulligan(p, p === me ? mine : theirs));
}

// 턴 제한 시간: 내 턴이면 다 쓴 순간 턴을 끝내고, 상대 턴이면 남은 시간만 보여 준다
function pvpTurnClock() {
  if (!B || B.cfg.mode !== 'pvp') return;
  const myB = B, mine = B.game.cur === B.me;
  B.turnStart = Date.now();
  clearInterval(B.clock);
  let el = $('.pvp-timer');
  if (!el) { el = h('<div class="pvp-timer"></div>'); $('.end-turn').appendChild(el); }
  const tick = () => {
    if (B !== myB || B.over) { clearInterval(myB.clock); return; }
    const left = Math.max(0, PVP.TURN_SEC - Math.floor((Date.now() - B.turnStart) / 1000));
    el.textContent = `${mine ? '내 턴' : '상대 턴'} ${left}초`;
    el.classList.toggle('warn', left <= 10);
    if (left === 10 && mine && !B.warned) { B.warned = true; Audio2.play('warning'); }
    if (left <= 0 && mine && B.game.cur === B.me) { if (!B.busy) { clearSelection(); endMyTurn(); } return; }
    if (B.game.cur !== (mine ? B.me : B.ai)) clearInterval(myB.clock);
  };
  B.warned = false;
  tick(); B.clock = setInterval(tick, 250);
}

// 상대가 항복했거나 연결이 끊겼다: 이 쪽의 승리. told가 아니면 상대가 돌아왔을 때를 위해 알린다
function pvpWinBy(reason, told) {
  if (!B || B.over || B.cfg.mode !== 'pvp') return;
  if (reason === 'disconnect' && !told) try { B.net.send({ k: 'gone' }); } catch (e) { /* 이미 끊김 */ }
  B.endReason = reason;
  B.game.phase = 'over'; B.game.winner = B.me;
  finishBattle();
}
function pvpLoseBy() {
  if (!B || B.over || B.cfg.mode !== 'pvp') return;
  B.endReason = 'disconnect';
  B.game.phase = 'over'; B.game.winner = B.ai;
  finishBattle();
}
// 두 기기의 판이 어긋났다: 승패 없이 끝낸다 (전공·전적 변동 없음)
function pvpVoid(told) {
  if (!B || B.over) return;
  const myB = B;
  B.over = true; clearInterval(B.clock);
  try { if (!told) B.net.send({ k: 'void' }); setTimeout(() => B.net.close(), 2000); } catch (e) { /* 이미 끊김 */ }
  Pvp.d.pending = null; Store.save();
  $$('#modal-root .modal').forEach(x => closeModal(x));
  toast('두 기기의 배틀 상태가 어긋나 이번 대전은 무효로 처리했습니다.', true);
  setTimeout(() => { if (B === myB) { B = null; showScreen('pvp'); } }, 1500);
}
