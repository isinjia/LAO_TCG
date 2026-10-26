// ===== 튜토리얼 코치 =====
// 각 단계: text, spot(선택자 또는 함수), wait(넘어가기 위한 이벤트), cond(이벤트 데이터 조건), trigger(이 이벤트가 와야 표시)
const TUTORIAL_STEPS = [
  { text: '첫 대국에 온 걸 환영해, 오렌지에이드. 위쪽이 <b>대국 상대</b>야. 상대의 <b>라이프</b>를 0으로 만들면 이기는 거란다.', spot: '#cmd-enemy', box: [490, 170] },
  { text: '아래쪽 초상화가 네 자리야. 초상화 오른쪽 아래 숫자가 <b>라이프</b>고, 0이 되면 지는 거야.', spot: '#cmd-me', box: [1090, 600] },
  { text: '이게 <b>손패</b>야. 카드 왼쪽 위 숫자가 <b>AP 비용</b>, 가운데 두 숫자가 <b>공격력</b>과 <b>체력</b>이지. 카드에 마우스를 올리면 크게 보여 줄게.', spot: '.hand', box: [1380, 140] },
  { trigger: 'myTurn', text: '오른쪽 아래가 <b>AP</b>야. 매 턴 최대 AP가 1씩 늘어나고(최대 10) 가득 채워지지. 첫 턴인 지금은 AP 1이란다.', spot: '#ap-me', box: [1080, 560] },
  { text: 'AP 1로 쓸 수 있는 비용 1짜리 <b>피</b>를 끌어다 <b>레인</b>에 놓아 볼래? (카드를 클릭한 뒤 레인을 클릭해도 돼)', spot: '.hand', box: [1380, 140], wait: 'cardPlayed' },
  { text: '잘했어. 전투원은 <b>배치된 턴에는 공격하지 않아</b>. 단, <b>돌격</b> 키워드가 있으면 바로 공격하지.', spot: '.lanes.me', box: [1380, 140] },
  { text: '이제 <b>턴 종료</b>를 눌러 봐 (단축키 Space). 턴이 끝나면 네 전투원들이 왼쪽 레인부터 공격한단다.', spot: '.end-btn', box: [1380, 560], wait: 'turnEnded' },
  { trigger: 'myTurn', text: '상대가 행동을 마쳤어. 이번 턴 AP는 2야. 다 쓰지 못한 AP는 <b>최대 2까지 다음 턴으로 이월</b>되니까 기억해 두렴.', spot: '#ap-me', box: [1080, 560] },
  { text: '이번엔 비용 2인 <b>하치코</b>를 골라 볼래? 레인 위에 <b>유리 ▲ / 불리 ▼</b>가 보일 거야. 경장 ▶ 기동 ▶ 중장 ▶ 경장 순으로 유리하고, 유리하면 피해가 1 늘어나.', spot: '.hand', box: [1380, 140], wait: 'cardSelected', cond: c => c.kind === 'unit' },
  { text: '좋아. 상성이 유리한 레인이나, 적이 없는 레인(상대 직격)에 놓아 보렴.', spot: '.lanes.me', box: [1380, 140], wait: 'cardPlayed' },
  { text: '적 전투원과 상대 초상화 위의 <b>빨간 숫자</b>는 이번 턴 전투의 <b>예상 피해</b>야. ☠는 격파 예상이고, 주황색은 다음 상대 턴에 네가 받을 피해란다.', spot: '.lanes.enemy', box: [1380, 560] },
  { text: '<b>턴 종료</b> 버튼에 마우스를 올리면 공격 경로가 화살표로 보여. <b>보호기</b>는 양옆 레인을 지키고, <b>지원기</b>는 양옆 아군의 공격력을 1 올려 준단다.', spot: '.end-btn', box: [1380, 560] },
  { trigger: 'myTurn', text: '이번엔 <b>지원 카드</b>를 써 보자. 방금 뽑은 <b>야전 의료</b>를 고른 뒤, 빛나는 내 전투원을 누르렴. 그 전투원의 체력을 가득 채워 준단다.', spot: '.hand', box: [1380, 140], wait: 'cardPlayed',
    cond: c => c.kind === 'skill' && c !== COMMAND_CARD, can: () => B.me.units().length > 0 && B.me.hand.some(c => c.kind === 'skill' && B.me.canAfford(c)) },
  { trigger: 'myTurn', text: '오른쪽 아래 <b>포격 지원</b>도 써 볼래? 턴마다 한 번, AP 4로 적 전투원이나 상대 라이프에 2 피해를 준단다. 버튼을 누르고 대상을 고르렴.', spot: '.cmd-power', wait: 'cardPlayed',
    cond: c => c === COMMAND_CARD, can: () => B.game.canCommand() },
  { text: '레인이 다 차도 이번 턴에 낸 것이 아닌 내 전투원 위에 새 전투원을 겹쳐 내는 <b>교체 배치</b>를 할 수 있단다(AP 1 더). 기본은 여기까지야. 오른쪽 위 <b>?</b> 버튼으로 언제든 규칙을 다시 볼 수 있어.', spot: null },
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
  go(i) {
    this.i = i;
    const st = TUTORIAL_STEPS[i];
    if (!st) { this.stop(); return; }
    if (st.trigger) {
      if (this.seen.has(st.trigger)) { this.seen.delete(st.trigger); this.waitingTrigger = false; this.render(); return; }
      this.waitingTrigger = true; this.hide(); this.release(); return;
    }
    this.waitingTrigger = false;
    // 카드 사용을 기다리는 단계인데 쓸 수 있는 카드가 없으면 건너뛴다 (막힘 방지)
    if ((st.wait === 'cardSelected' || st.wait === 'cardPlayed') && !(st.can ? st.can() : tutHasPlayable())) { this.go(i + 1); return; }
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
      if (!await confirmBox('튜토리얼 끄기', '안내를 끄고 남은 대국을 직접 진행할까요? 스토리 지도의 「첫 카드 수업」에서 언제든 다시 할 수 있습니다.', '끄기')) return;
      this.stop(); toast('튜토리얼을 껐습니다. 오른쪽 위 ? 버튼으로 규칙을 볼 수 있어요.');
    };
    this.place();
  },
  place() {
    if (!this.active || this.waitingTrigger) return;
    const st = TUTORIAL_STEPS[this.i]; if (!st) return;
    placeCoach(st.spot, st.box);
  },
  on(evt, data) {
    const st = TUTORIAL_STEPS[this.i]; if (!st) return;
    if (this.waitingTrigger) { if (st.trigger === evt) { this.waitingTrigger = false; this.render(); } return; }
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
  if (st && (st.wait === 'cardPlayed' || st.wait === 'cardSelected')) {
    if (!(st.can ? st.can() : tutHasPlayable())) { while (TUTORIAL_STEPS[Tutorial.i] && /^card/.test(TUTORIAL_STEPS[Tutorial.i].wait || '') && !TUTORIAL_STEPS[Tutorial.i].trigger) Tutorial.i++; Tutorial.go(Tutorial.i); return true; }
    toast('튜토리얼: 먼저 안내에 따라 해 보세요.', true); return false;
  }
  return true;
}

// ===== 실전 규칙 안내 =====
// 튜토리얼에서 다루지 않은 규칙을, 실제 대국에서 그 상황이 처음 생겼을 때 한 번씩 알려 준다 (내 턴 시작 시 하나씩)
const LESSONS = [
  { id: 'command', when: b => b.me.ap >= RULES.COMMAND.cost && !b.me.hand.some(c => b.me.canAfford(c) && c.c >= RULES.COMMAND.cost), spot: '.cmd-power',
    text: () => `오른쪽 아래 <b>포격 지원</b>은 턴마다 한 번, AP ${RULES.COMMAND.cost}를 써서 적 전투원 하나나 상대 라이프에 <b>${RULES.COMMAND.dmg} 피해</b>를 준단다. 카드를 다 내고 AP가 남을 때 쓰렴.` },
  { id: 'skill', when: b => b.me.hand.some(c => c.kind === 'skill' && b.me.canAfford(c)), spot: '.hand',
    text: () => '손패의 <b>지원 카드</b>는 전장에 남지 않고 효과만 낸단다. 대상을 고르는 카드는 카드를 누른 뒤 <b>빛나는 전투원</b>을 누르면 되고, 끌어다 놓아도 쓸 수 있어.' },
  { id: 'guard', when: b => b.ai.units().some(u => u.role === 'DEF'), spot: '.lanes.enemy',
    text: () => '상대에게 <b>보호기</b>가 나왔구나. 보호기는 양옆 레인으로 가는 공격을 대신 받고, 전투원에게 받는 피해가 1 줄어든단다. 포격 지원이나 광역 공격으로 넘기거나, 보호기가 없는 쪽을 노리렴.' },
  { id: 'keywords', when: b => [...b.me.units(), ...b.ai.units()].some(u => Object.keys(u.kw).some(k => KW_LESSON.includes(k))), spot: '.lanes.enemy',
    text: b => { const ks = [...new Set([...b.me.units(), ...b.ai.units()].flatMap(u => Object.keys(u.kw)).filter(k => KW_LESSON.includes(k)))].slice(0, 3);
      return '전투원 위의 작은 표시는 <b>키워드</b>란다. ' + ks.map(k => `<b>${k}</b>: ${KEYWORD_HELP[k]}`).join(' ') + ' 카드를 길게 보면 모든 키워드 설명이 나와.'; } },
  { id: 'replace', when: b => !b.me.emptyLanes().length && b.me.hand.some(c => c.kind === 'unit' && b.me.placeableLanes(b.game.turn, c).length), spot: '.lanes.me',
    text: () => `레인이 다 찼니? 그래도 <b>교체 배치</b>를 할 수 있단다. 이번 턴에 낸 것이 아닌 내 전투원 위에 새 전투원을 놓으면 AP를 ${RULES.REPLACE_COST} 더 쓰고, 원래 전투원은 철수해(격파 효과는 없어).` },
  { id: 'move', when: b => b.game.round() >= 3 && b.me.units().length >= 1 && b.game.canMove(b.me.units()[0]) && b.ai.units().some(e => b.me.units().some(m => TYPE_BEATS[e.type] === m.type)), spot: '.lanes.me',
    text: () => `상성이 불리한 자리에 있는 전투원이 있구나. 내 턴에 내 전투원을 누르면 <b>이동</b>할 수 있단다. 턴마다 한 번, AP ${RULES.MOVE_COST}로 이웃 레인으로 옮기고, 아군이 있으면 자리를 바꿔.` },
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
    this.place();
  },
  close() { this.cur = null; const c = $('#coach'); c.classList.remove('show'); c.innerHTML = ''; },
  place() { if (this.cur) placeCoach(this.cur.spot); },
};
