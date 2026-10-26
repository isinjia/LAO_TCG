// ===== 튜토리얼 코치 =====
// 각 단계: text, spot(선택자 또는 함수), wait(넘어가기 위한 이벤트), cond(이벤트 데이터 조건), trigger(이 이벤트가 와야 표시)
const TUTORIAL_STEPS = [
  { text: '첫 대국에 온 걸 환영해, 오렌지에이드. 위쪽이 <b>대국 상대</b>야. 상대의 <b>라이프</b>를 0으로 만들면 이기는 거란다.', spot: '#cmd-enemy', box: [490, 170] },
  { text: '아래 가운데가 네 자리야. 초상화 오른쪽 아래 숫자가 <b>라이프</b>고, 0이 되면 지는 거야.', spot: '#cmd-me', box: [1090, 600] },
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
  { text: '기본은 여기까지야. 남은 대국은 네 마음대로 지휘해 보렴. 오른쪽 위 <b>?</b> 버튼으로 언제든 규칙을 다시 볼 수 있어.', spot: null },
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
    if ((st.wait === 'cardSelected' || st.wait === 'cardPlayed') && !tutHasPlayable()) { this.go(i + 1); return; }
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
    $('[data-a=skip]', c).onclick = () => { this.stop(); toast('튜토리얼을 종료했습니다. ? 버튼으로 규칙을 볼 수 있어요.'); };
    this.place();
  },
  place() {
    if (!this.active || this.waitingTrigger) return;
    const st = TUTORIAL_STEPS[this.i]; if (!st) return;
    const c = $('#coach'); const spot = $('.ch-spot', c), box = $('.ch-box', c);
    if (!spot || !box) return;
    const target = st.spot ? $(st.spot) : null;
    if (target && target.offsetParent !== null) {
      const r = stageRect(target); const pad = 10;
      spot.classList.remove('none');
      Object.assign(spot.style, { left: (r.x - pad) + 'px', top: (r.y - pad) + 'px', width: (r.w + pad * 2) + 'px', height: (Math.min(r.h, STAGE_H - r.y) + pad * 2) + 'px' });
      const bw = 520, bh = box.offsetHeight || 170;
      let x = Math.max(20, Math.min(STAGE_W - bw - 20, r.cx - bw / 2));
      let y = r.cy > STAGE_H / 2 ? r.y - bh - 30 : r.y + r.h + 30;
      if (y < 20) y = 20; if (y + bh > STAGE_H - 20) y = STAGE_H - 20 - bh;
      // 대상과 겹치면 옆으로 비킨다
      if (y < r.y + r.h && y + bh > r.y) x = r.x > STAGE_W / 2 ? Math.max(20, r.x - bw - 30) : Math.min(STAGE_W - bw - 20, r.x + r.w + 30);
      // 고정 상자 좌표는 기준 해상도 기준이며, 대상(AP 표시)이 오른쪽 아래에 고정되어 있으므로 같은 방향으로 옮긴다
      if (st.box) { x = st.box[0] + (STAGE_W - REF_W); y = st.box[1] + (STAGE_H - REF_H); }
      box.style.left = x + 'px'; box.style.top = y + 'px';
    } else {
      spot.classList.add('none');
      box.style.left = (STAGE_W / 2 - 260) + 'px'; box.style.top = (420 + (STAGE_H - REF_H) / 2) + 'px';
    }
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
function tut(evt, data) { if (Tutorial.active) Tutorial.on(evt, data); }
function tutHasPlayable() {
  if (!B) return false;
  return B.me.hand.some(c => c.kind === 'unit' && B.me.canAfford(c)) && B.me.emptyLanes().length > 0;
}
function tutAllowsEndTurn() {
  if (!Tutorial.active || Tutorial.waitingTrigger) return true;
  const st = TUTORIAL_STEPS[Tutorial.i];
  if (st && (st.wait === 'cardPlayed' || st.wait === 'cardSelected')) {
    if (!tutHasPlayable()) { while (TUTORIAL_STEPS[Tutorial.i] && /^card/.test(TUTORIAL_STEPS[Tutorial.i].wait || '')) Tutorial.i++; Tutorial.go(Tutorial.i); return true; }
    toast('튜토리얼: 먼저 안내에 따라 카드를 배치해 보세요.', true); return false;
  }
  return true;
}
