// ===== 튜토리얼 코치 =====
// 각 단계: text, spot(선택자 또는 함수), wait(넘어가기 위한 이벤트), cond(이벤트 데이터 조건), trigger(이 이벤트가 와야 표시)
const TUTORIAL_STEPS = [
  { text: '환영해, 오렌지에이드. 위쪽 상대의 <b>라이프</b>를 0으로 만들면 이기는 거란다.', spot: '#cmd-enemy', box: [490, 170] },
  { text: '아래쪽 초상화가 너야. 숫자가 네 <b>라이프</b>란다.', spot: '#cmd-me', box: [1090, 600] },
  { text: '<b>손패</b>야. 왼쪽 위가 <b>AP 비용</b>, 가운데 두 숫자가 <b>공격력·체력</b>이지.', spot: '.hand', box: [1380, 140] },
  { trigger: 'myTurn', text: '오른쪽 아래가 <b>AP</b>야. 턴마다 1씩 늘어나고(최대 10), 지금은 1이란다.', spot: '#ap-me', box: [1080, 560] },
  { text: '비용 1인 <b>포이</b>를 <b>레인</b>에 끌어다 놓아 보렴.', spot: '.hand', box: [1380, 140], wait: 'cardPlayed' },
  { text: '잘했어. 낸 턴에는 공격하지 않아(<b>돌격</b>이 있으면 바로 공격).', spot: '.lanes.me', box: [1380, 140] },
  { text: '<b>턴 종료</b>를 눌러 보렴. 그러면 네 전투원이 공격해.', spot: '.end-btn', box: [1380, 560], wait: 'turnEnded' },
  { trigger: 'myTurn', text: '이번 턴 AP는 2야. 남긴 AP는 <b>2까지 다음 턴으로 넘어가</b>.', spot: '#ap-me', box: [1080, 560] },
  { text: '<b>하치코</b>를 골라 보렴. 레인 위에 <b>유리 ▲ / 불리 ▼</b>가 떠. 경장 ▶ 기동 ▶ 중장 ▶ 경장 순으로 강하단다.', spot: '.hand', box: [1380, 140], wait: 'cardSelected', cond: c => c.kind === 'unit' },
  { text: '<b>유리</b>한 레인에 놓아 보렴.', spot: '.lanes.me', box: [1380, 140], wait: 'cardPlayed' },
  { text: '<b>빨간 숫자</b>는 이번 턴 <b>예상 피해</b>야. ☠는 격파 예상이란다.', spot: '.lanes.enemy', box: [1380, 560] },
  { text: '<b>보호기</b>는 옆 빈 레인의 공격을 대신 맞고, <b>지원기</b>는 양옆 공격력을 1 올려 준단다.', spot: '.lanes.me', box: [1380, 140] },
  { trigger: 'myTurn', text: '<b>지원 카드</b> <b>야전 의료</b>를 고르고, 빛나는 내 전투원을 누르렴.', spot: '.hand', box: [1380, 140], wait: 'cardPlayed',
    cond: c => c.kind === 'skill' && c !== COMMAND_CARD, can: () => B.me.units().length > 0 && B.me.hand.some(c => c.kind === 'skill' && B.me.canAfford(c)) },
  { trigger: 'myTurn', text: '<b>이동</b>이야. 내 전투원을 누르고 빛나는 옆 레인을 누르렴(턴마다 한 번, AP 2).', spot: '.lanes.me', wait: 'moved',
    can: () => B.me.units().some(u => [0, 1, 2].some(l => B.game.canMove(u, l))) },
  { trigger: 'myTurn', text: '내 특성 스킬 <b>회로 간섭</b>이야. 내 초상화 왼쪽 아이콘을 누르고 <b>상대 초상화</b>를 누르렴(턴마다 한 번).', spot: '#cmd-me .hero-skill', wait: 'cardPlayed',
    cond: c => c === COMMAND_CARD, can: () => B.game.canCommand() && B.me.units().length > 0 }, // AP가 모자라거나 내 전장이 비었으면 건너뛴다
  { text: '같은 제작사 2기가 모여 <b>결속</b>이 켜졌어. 초상 아래 이름을 보렴.', spot: '#cmd-me', when: () => B.me.factions.some(f => SYNERGY[f] && B.game.synergy(B.me, f)) },
  { text: '레인이 차면 내 전투원 위에 겹쳐 내는 <b>교체 배치</b>도 돼(AP 1 더). 규칙은 오른쪽 위 <b>?</b>에 있어. 끝까지 해 보렴!', spot: null },
];

const Tutorial = {
  active: false, i: -1, waitingTrigger: false, timer: null, seen: new Set(), _ready: null,
  // 첫 '트리거 대기' 단계에 도달하면 resolve → 전투가 그때부터 진행된다
  start() {
    this.active = true; this.seen = new Set();
    const p = new Promise(res => { this._ready = res; });
    this.go(0); this.timer = setInterval(() => this.place(), 350);
    return p;
  },
  release() { if (this._ready) { const r = this._ready; this._ready = null; r(); } },
  stop() { this.active = false; clearInterval(this.timer); const c = $('#coach'); c.classList.remove('show'); c.innerHTML = ''; this.release(); },
  // triggered: 이 단계가 기다리던 신호(내 턴 시작 등)가 이미 왔다
  go(i, triggered = false) {
    this.i = i;
    const st = TUTORIAL_STEPS[i];
    if (!st) { this.stop(); return; }
    if (st.trigger && !triggered) {
      if (this.seen.has(st.trigger)) { this.seen.delete(st.trigger); this.go(i, true); return; }
      this.waitingTrigger = true; this.hide(); this.release(); return;
    }
    this.waitingTrigger = false;
    // when: 이 조건일 때만 보여 줄 설명 단계 (예: 결속은 실제로 켜졌을 때만)
    if (st.when && !st.when()) { this.go(i + 1); return; }
    // 카드 사용을 기다리는 단계인데 쓸 수 있는 카드가 없으면 건너뛴다 (막힘 방지)
    if ((st.wait === 'cardSelected' || st.wait === 'cardPlayed' || st.wait === 'moved') && !(st.can ? st.can() : tutHasPlayable())) { this.go(i + 1); return; }
    this.render();
  },
  hide() { const c = $('#coach'); c.classList.remove('show'); },
  render() {
    const st = TUTORIAL_STEPS[this.i];
    const c = $('#coach');
    c.innerHTML = `<div class="ch-spot"></div><div class="ch-box"><div class="ch-face" style="background-image:url('${artOf(CARDS['3P_ConstantiaS2'])}')"></div>
      <span class="ch-step">${this.i + 1}/${TUTORIAL_STEPS.length}</span><div class="ch-who">콘스탄챠 S2</div><div class="ch-text">${touchText(st.text)}</div>
      ${st.wait ? '<div class="ch-wait">▶ 직접 해 보세요</div>' : ''}
      <div class="ch-btns"><button class="btn small ghost" data-a="skip">튜토리얼 끄기</button>${st.wait ? '' : `<button class="btn small primary" data-a="next">${this.i === TUTORIAL_STEPS.length - 1 ? '시작!' : '다음'}</button>`}</div></div>`;
    c.classList.add('show');
    const nx = $('[data-a=next]', c); if (nx) nx.onclick = () => { Audio2.play('click'); this.go(this.i + 1); };
    // 「다음」과 붙어 있어 잘못 누르기 쉬우므로 한 번 더 묻는다
    $('[data-a=skip]', c).onclick = async () => {
      c.classList.add('under-modal');
      if (!await confirmBox('튜토리얼 끄기', '안내를 끄고 남은 배틀을 직접 진행할까요? 스토리 지도의 「첫 카드 수업」에서 언제든 다시 할 수 있습니다.', '끄기')) return;
      this.stop(); toast('튜토리얼을 껐습니다. 오른쪽 위 ? 버튼으로 규칙을 볼 수 있어요.');
    };
    this.place();
  },
  place() {
    // 확인 창·카드 상세 같은 창이 열려 있으면 안내 상자가 그 위를 덮지 않게 잠시 숨긴다
    $('#coach').classList.toggle('under-modal', !!document.querySelector('#modal-root .modal'));
    if (!this.active || this.waitingTrigger) return;
    const st = TUTORIAL_STEPS[this.i]; if (!st) return;
    placeCoach(st.spot, st.box);
  },
  on(evt, data) {
    const st = TUTORIAL_STEPS[this.i]; if (!st) return;
    if (this.waitingTrigger) { if (st.trigger === evt) { this.waitingTrigger = false; this.go(this.i, true); } return; }
    if (evt === 'myTurn') this.seen.add(evt);
    if (st.wait === evt && (!st.cond || st.cond(data))) this.go(this.i + 1);
    // 카드를 고르는 단계에서 바로 배치까지 끝낸 경우 다음 단계(배치 대기)도 함께 넘긴다
    else if (evt === 'cardPlayed' && st.wait === 'cardSelected') { this.go(this.i + 1); const n = TUTORIAL_STEPS[this.i]; if (n && n.wait === 'cardPlayed') this.go(this.i + 1); }
  },
};
// 안내 상자와 강조 테두리를 대상 요소 옆에 놓는다 (튜토리얼·실전 안내 공용)
function placeCoach(spotSel, fixedBox) {
  const c = $('#coach'); const spot = $('.ch-spot', c), box = $('.ch-box', c);
  if (!spot || !box) return;
  const target = spotSel ? $(spotSel) : null;
  if (target && target.offsetParent !== null) {
    const r = stageRect(target); const pad = 10;
    spot.classList.remove('none');
    Object.assign(spot.style, { left: (r.x - pad) + 'px', top: (r.y - pad) + 'px', width: (r.w + pad * 2) + 'px', height: (Math.min(r.h, STAGE_H - r.y) + pad * 2) + 'px' });
    const bw = box.offsetWidth || 520, bh = box.offsetHeight || 170;
    let x = Math.max(20, Math.min(STAGE_W - bw - 20, r.cx - bw / 2));
    let y = r.cy > STAGE_H / 2 ? r.y - bh - 30 : r.y + r.h + 30;
    if (y < 20) y = 20; if (y + bh > STAGE_H - 20) y = STAGE_H - 20 - bh;
    // 대상과 겹치면 옆으로 비킨다
    if (y < r.y + r.h && y + bh > r.y) x = r.x > STAGE_W / 2 ? Math.max(20, r.x - bw - 30) : Math.min(STAGE_W - bw - 20, r.x + r.w + 30);
    // 고정 상자 좌표는 기준 해상도 기준이며, 대상(AP 표시)이 오른쪽 아래에 고정되어 있으므로 같은 방향으로 옮긴다
    if (fixedBox) { x = Math.min(fixedBox[0] + (STAGE_W - REF_W), STAGE_W - bw - 20); y = fixedBox[1] + (STAGE_H - REF_H); }
    box.style.left = x + 'px'; box.style.top = y + 'px';
  } else {
    spot.classList.add('none');
    box.style.left = (STAGE_W / 2 - (box.offsetWidth || 520) / 2) + 'px'; box.style.top = (420 + (STAGE_H - REF_H) / 2) + 'px';
  }
}
function tut(evt, data) { if (Tutorial.active) Tutorial.on(evt, data); }
function tutHasPlayable() {
  if (!B) return false;
  return B.me.hand.some(c => c.kind === 'unit' && B.me.canAfford(c)) && B.me.emptyLanes().length > 0;
}
function tutAllowsEndTurn() {
  if (!Tutorial.active || Tutorial.waitingTrigger) return true;
  const st = TUTORIAL_STEPS[Tutorial.i];
  if (st && (st.wait === 'cardPlayed' || st.wait === 'cardSelected' || st.wait === 'moved')) {
    if (!(st.can ? st.can() : tutHasPlayable())) { while (TUTORIAL_STEPS[Tutorial.i] && /^(card|moved)/.test(TUTORIAL_STEPS[Tutorial.i].wait || '') && !TUTORIAL_STEPS[Tutorial.i].trigger) Tutorial.i++; Tutorial.go(Tutorial.i); return true; }
    toast('튜토리얼: 먼저 안내에 따라 해 보세요.', true); return false;
  }
  return true;
}

// ===== 실전 규칙 안내 =====
// 튜토리얼에서 다루지 않은 규칙을, 실제 배틀에서 그 상황이 처음 생겼을 때 한 번씩 알려 준다 (내 턴 시작 시 하나씩)
const LESSONS = [
  { id: 'command', when: b => b.me.ap >= COMMAND_CARD.c && !b.me.hand.some(c => b.me.canAfford(c) && c.c >= COMMAND_CARD.c), spot: '#cmd-me .hero-skill',
    text: () => `내 초상화 왼쪽 아이콘이 특성 스킬 <b>카두세우스 : 회로 간섭</b>이야. 지휘관마다 원작 스킬을 닮은 특성 스킬이 다르단다. 회로 간섭은 턴마다 한 번, AP ${COMMAND_CARD.c}를 써서 적 전투원 하나나 상대 라이프에 <b>${RULES.COMMAND.dmg} 피해</b>를 준단다. 카드를 다 내고 AP가 남을 때 쓰렴.` },
  { id: 'skill', when: b => b.me.hand.some(c => c.kind === 'skill' && b.me.canAfford(c)), spot: '.hand',
    text: () => '손패의 <b>지원 카드</b>는 전장에 남지 않고 효과만 낸단다. 대상을 고르는 카드는 카드를 누른 뒤 <b>빛나는 전투원</b>을 누르면 되고, 끌어다 놓아도 쓸 수 있어.' },
  { id: 'guard', when: b => b.ai.units().some(u => u.role === 'DEF'), spot: '.lanes.enemy',
    text: () => '상대에게 <b>보호기</b>가 나왔구나. 보호기는 앞이 빈 양옆 레인에서 상대 라이프로 가는 공격을 대신 받고, 전투원에게 받는 피해가 1 줄어든단다. 특성 스킬이나 광역 공격으로 넘기거나, 보호기가 없는 쪽을 노리렴.' },
  { id: 'keywords', when: b => [...b.me.units(), ...b.ai.units()].some(u => Object.keys(u.kw).some(k => KW_LESSON.includes(k))), spot: '.lanes.enemy',
    text: b => { const ks = [...new Set([...b.me.units(), ...b.ai.units()].flatMap(u => Object.keys(u.kw)).filter(k => KW_LESSON.includes(k)))].slice(0, 3);
      return '전투원 위의 작은 표시는 <b>키워드</b>란다. ' + ks.map(k => `<b>${k}</b>: ${KEYWORD_HELP[k]}`).join(' ') + ' 카드를 길게 보면 모든 키워드 설명이 나와.'; } },
  { id: 'replace', when: b => !b.me.emptyLanes().length && b.me.hand.some(c => c.kind === 'unit' && b.me.placeableLanes(b.game.turn, c).length), spot: '.lanes.me',
    text: () => `레인이 다 찼니? 그래도 <b>교체 배치</b>를 할 수 있단다. 이번 턴에 낸 것이 아닌 내 전투원 위에 새 전투원을 놓으면 AP를 ${RULES.REPLACE_COST} 더 쓰고, 원래 전투원은 철수해(격파 효과는 없어).` },
  { id: 'move', when: b => b.game.round() >= 3 && b.me.units().length >= 1 && b.game.canMove(b.me.units()[0]) && b.ai.units().some(e => b.me.units().some(m => TYPE_BEATS[e.type] === m.type)), spot: '.lanes.me',
    text: () => `상성이 불리한 자리에 있는 전투원이 있구나. 내 턴에 내 전투원을 누르면 <b>이동</b>할 수 있단다. 턴마다 한 번, AP ${RULES.MOVE_COST}로 이웃 레인으로 옮기고, 아군이 있으면 자리를 바꿔.` },
  { id: 'synergy', when: b => b.me.factions.some(f => SYNERGY[f] && b.game.synergy(b.me, f)), spot: '#cmd-me',
    text: b => { const f = b.me.factions.find(x => SYNERGY[x] && b.game.synergy(b.me, x)); return `같은 제작사 전투원이 ${RULES.SYNERGY_MIN}기 모여 <b>제작사 결속</b>이 켜졌구나! ${FACTIONS[f].name}의 「${SYNERGY[f].name}」: ${SYNERGY[f].text}. 제작사마다 결속 효과가 다르니 덱을 짤 때 생각해 보렴.`; } },
  { id: 'overtime', when: b => b.game.round() >= RULES.OVERTIME_ROUND - 3, spot: '.round-info',
    text: () => `오른쪽 위 라운드를 보렴. <b>${RULES.OVERTIME_ROUND}라운드</b>부터는 작전 시간 초과로 매 턴 양쪽 라이프가 깎이고, 피해도 점점 커진단다. 그 전에 끝낼 수 있게 몰아붙이렴.` },
];
const KW_LESSON = ['회피', '방어막', '재생', '반격', '광역', '관통'];
const Lessons = {
  cur: null,
  // 내 턴이 시작될 때 부른다. 아직 안 본 안내 중 조건이 맞는 첫 번째 하나만 띄운다
  check(b) {
    if (!b || b.cfg.tutorial || Tutorial.active || this.cur || !Store.settings.tips) return;
    const seen = Store.data.lessons || (Store.data.lessons = {});
    const l = LESSONS.find(x => !seen[x.id] && x.when(b)); if (!l) return;
    seen[l.id] = true; Store.save();
    this.show(l, b);
  },
  show(l, b) {
    this.cur = l;
    const c = $('#coach');
    c.innerHTML = `<div class="ch-spot"></div><div class="ch-box"><div class="ch-face" style="background-image:url('${artOf(CARDS['3P_ConstantiaS2'])}')"></div>
      <span class="ch-step">실전 안내</span><div class="ch-who">콘스탄챠 S2</div><div class="ch-text">${touchText(l.text(b))}</div>
      <div class="ch-btns"><button class="btn small ghost" data-a="off">안내 끄기</button><button class="btn small primary" data-a="ok">알겠어요</button></div></div>`;
    c.classList.add('show');
    $('[data-a=ok]', c).onclick = () => { Audio2.play('click'); this.close(); };
    $('[data-a=off]', c).onclick = () => { Store.settings.tips = false; Store.save(); this.close(); toast('실전 안내와 전술 팁을 껐습니다. 설정에서 다시 켤 수 있어요.'); };
    this.place(); clearInterval(this.timer); this.timer = setInterval(() => this.place(), 350);
  },
  close() { clearInterval(this.timer); this.cur = null; const c = $('#coach'); c.classList.remove('show'); c.innerHTML = ''; },
  place() {
    if (!this.cur) return;
    $('#coach').classList.toggle('under-modal', !!document.querySelector('#modal-root .modal'));
    placeCoach(this.cur.spot);
  },
};
