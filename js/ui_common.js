// ===== 공통 UI: 스테이지 스케일, 카드 렌더, 모달, 툴팁, 이펙트 =====
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
// 기준 해상도 (유니티 CanvasScaler의 Reference Resolution). 실제 무대는 화면 비율에 맞춰 이보다 넓거나 높아진다.
const REF_W = 1920, REF_H = 1080;
let STAGE_W = REF_W, STAGE_H = REF_H;
let stageScale = 1;

function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// 전투 속도 반영 대기
function sleep(ms) { return new Promise(r => setTimeout(r, ms / (Store.settings.speed || 1))); }
function sleepRaw(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------- 스테이지 스케일 ----------
// 유니티 CanvasScaler 'Scale With Screen Size + Expand'와 같은 방식:
// 기준 영역(1920x1080)이 항상 다 보이도록 배율을 정하고, 남는 방향으로 무대를 넓혀 화면을 꽉 채운다.
// 요소는 CSS에서 가장자리(left/right/top/bottom) 또는 가운데(--ox/--oy 보정) 기준으로 고정된다.
//   --ox / --oy : 기준 영역이 무대 가운데에 놓이도록 하는 가로/세로 여백 (가운데 앵커용)
//   --ex / --ey : 기준보다 늘어난 전체 폭/높이 (반대쪽 가장자리 앵커용 = 여백 x2)
function fitStage() {
  const vw = window.innerWidth, vh = window.innerHeight;
  stageScale = Math.min(vw / REF_W, vh / REF_H);
  // 휴대폰처럼 많이 줄어드는 화면에서는 작은 글자를 키운다 (lo_skin.css의 .compact)
  document.body.classList.toggle('compact', stageScale < 0.6);
  STAGE_W = Math.max(REF_W, vw / stageScale);
  STAGE_H = Math.max(REF_H, vh / stageScale);
  const st = $('#stage');
  Object.assign(st.style, { width: STAGE_W + 'px', height: STAGE_H + 'px', transform: `scale(${stageScale})` });
  const ex = STAGE_W - REF_W, ey = STAGE_H - REF_H;
  st.style.setProperty('--ox', ex / 2 + 'px'); st.style.setProperty('--oy', ey / 2 + 'px');
  st.style.setProperty('--ex', ex + 'px'); st.style.setProperty('--ey', ey + 'px');
}
// 요소의 스테이지 좌표 (스케일 보정)
function stageRect(el) {
  const s = $('#stage').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: (r.left - s.left) / stageScale, y: (r.top - s.top) / stageScale, w: r.width / stageScale, h: r.height / stageScale,
    get cx() { return this.x + this.w / 2; }, get cy() { return this.y + this.h / 2; } };
}
function stagePoint(clientX, clientY) {
  const s = $('#stage').getBoundingClientRect();
  return { x: (clientX - s.left) / stageScale, y: (clientY - s.top) / stageScale };
}
function applySpeedVar() { $('#stage').style.setProperty('--spd', Store.settings.speed || 1); }

// ---------- 화면 전환 ----------
let currentScreen = null;
const screenHooks = {};
async function showScreen(id, opts = {}) {
  const fade = $('#fade');
  if (currentScreen && !opts.instant) { fade.classList.add('on'); await sleepRaw(320); }
  hideTip(); hidePreview();
  if (id !== 'battle' && typeof Lessons !== 'undefined') { if (Tutorial.active) Tutorial.stop(); Lessons.close(); } // 전투를 떠나면 안내 상자도 닫는다
  $$('.screen').forEach(s => s.classList.remove('active'));
  const el = $('#scr-' + id);
  el.classList.add('active');
  const prev = currentScreen;
  currentScreen = id;
  if (screenHooks[id]) await screenHooks[id](el, opts, prev);
  if (!opts.instant) { await sleepRaw(30); fade.classList.remove('on'); }
}

// ---------- 터치 환경 문구 ----------
// 마우스가 없는 기기(휴대폰·태블릿)에서는 "마우스를 올리면"·"우클릭" 안내를 길게 누르기로 바꿔 보여 준다
const IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(hover: none)').matches;
// 휴대폰 진동 (터치 기기에서만, 지원하지 않으면 무시)
function vibrate(p) { try { if (IS_TOUCH && navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
function touchText(s) { return IS_TOUCH ? String(s).replace(/마우스를 올리면/g, '길게 누르면').replace(/우클릭으로/g, '길게 눌러').replace(/우클릭/g, '길게 누르기') : s; }

// ---------- 카드 텍스트 ----------
function kwText(card) {
  const parts = (card.kw || []).map(k => { const [n, v] = k.split(':'); return `<span class="kw">${n}${v ? ' ' + v : ''}</span>`; });
  if (card.text) parts.push(esc(card.text).replace(/^(전개|격파|공격 후):/, '<span class="kw">$1</span>:'));
  return parts.join(' · ');
}
function kwHelpList(card) {
  const out = [];
  if (card.kind === 'unit') {
    const roleHelp = { ATK: KEYWORD_HELP['공격기'], DEF: KEYWORD_HELP['보호'], SUP: KEYWORD_HELP['지원'] }[card.r];
    out.push([ROLES[card.r], roleHelp]);
    out.push([`${TYPES[card.t]}형`, `${TYPES[TYPE_BEATS[card.t]]}형을 공격하면 피해 +1, ${TYPES[Object.keys(TYPE_BEATS).find(k => TYPE_BEATS[k] === card.t)]}형에게 약하다.`]);
  }
  (card.kw || []).forEach(k => { const [n, v] = k.split(':'); out.push([`${n}${v ? ' ' + v : ''}`, (KEYWORD_HELP[n] || '').replace('N', v || 'N')]); });
  if (card.deploy) out.push(['전개', '배치되는 즉시 효과가 발동한다.']);
  if (card.strike) out.push(['공격 후', '이 유닛이 공격한 뒤 살아 있으면 효과가 발동한다.']);
  if (card.death) out.push(['격파', '파괴될 때 효과가 발동한다.']);
  return out;
}

// 원작 역할·등급 아이콘 (공격기=검, 보호기=방패, 지원기=톱니, 글자가 등급)
function roleIconOf(card) { return `assets/ui/role_${card.r}_${card.g}.png`; }

// ---------- 카드 엘리먼트 ----------
// opts: { w, cost (현재 사용 가능 여부), noHover }
function cardEl(card, opts = {}) {
  const f = FACTIONS[card.f];
  const el = document.createElement('div');
  el.className = `card kind-${card.kind} g-${card.g} f-${card.f}`;
  el.style.setProperty('--fc', f.color);
  if (opts.w) el.style.setProperty('--w', opts.w + 'px');
  el.dataset.id = card.id;
  const isUnit = card.kind === 'unit';
  el.innerHTML = `
    <div class="c-bg"></div>
    <div class="c-art" style="background-image:url('${artOf(card)}')"></div>
    ${!isUnit && iconOf(card) ? `<div class="c-icon" style="background-image:url('${iconOf(card)}')"></div>` : ''}
    <div class="c-frame"></div>
    <div class="c-cost">${card.c}</div>
    ${isUnit ? `<div class="c-grade role-ico" style="background-image:url('${roleIconOf(card)}')"></div>` : `<div class="c-grade" style="color:${GRADE_COLOR[card.g]}">${card.g}</div>`}
    <div class="c-fac">${f.short}</div>
    <div class="c-plate">
      <div class="c-name">${esc(card.n)}</div>
      <div class="c-tags">${isUnit ? `<span class="tag type-${card.t}">${TYPES[card.t]}</span><span class="tag role-${card.r}">${ROLES[card.r]}</span>` : '<span class="tag skill">지원 카드</span>'}${card.enemy ? '<span class="tag enemy">특수 카드</span>' : ''}</div>
    </div>
    <div class="c-text">${kwText(card) || (isUnit ? '<span style="opacity:.5">특수 능력 없음</span>' : '')}</div>
    ${isUnit ? `<div class="c-stat c-atk">${card.a}</div><div class="c-stat c-hp">${card.h}</div>` : ''}`;
  if (opts.lockCheck && !Store.isUnlocked(card.id)) { el.classList.add('locked'); el.dataset.lock = unlockSource(card.id); }
  // 도감·덱 편성에서는 카드 숙련도(동·은·금)를 표시한다. 금은 테두리가 반짝인다
  if (opts.lockCheck && typeof masteryLevel === 'function' && masteryLevel(card.id)) {
    const lv = masteryLevel(card.id);
    el.classList.add('mastery-' + lv);
    el.insertAdjacentHTML('beforeend', `<div class="c-mastery m${lv}" title="숙련도 ${MASTERY[lv - 1].name} · 승리 ${masteryWins(card.id)}회">${MASTERY[lv - 1].name}</div>`);
  }
  if (!opts.noHover) {
    el.addEventListener('mouseenter', () => { if (opts.preview) showPreview(card, opts.preview); });
    el.addEventListener('mouseleave', () => { if (opts.preview) hidePreview(); });
  }
  return el;
}

// ---------- 큰 카드 미리보기 (전투/덱) ----------
let previewEl = null;
function showPreview(card, side = 'left', live = null) {
  if (!previewEl) { previewEl = h('<div class="preview"></div>'); $('#stage').appendChild(previewEl); }
  previewEl.className = 'preview show' + (side === 'right' ? ' right' : '');
  previewEl.innerHTML = '';
  previewEl.appendChild(cardEl(card, { noHover: true }));
  const kws = kwHelpList(card);
  if (kws.length || live) {
    const box = h('<div class="pv-kw"></div>');
    if (live) box.appendChild(h(`<div class="pv-live">${live}</div>`));
    kws.forEach(([k, v]) => box.appendChild(h(`<div><b>[${esc(k)}]</b> ${esc(v)}</div>`)));
    previewEl.appendChild(box);
  }
}
function hidePreview() { if (previewEl) previewEl.className = 'preview'; }

// ---------- 툴팁 ----------
function bindTip(el, htmlFn) {
  el.addEventListener('mouseenter', e => { showTip(typeof htmlFn === 'function' ? htmlFn() : htmlFn, e); });
  el.addEventListener('mousemove', moveTip);
  el.addEventListener('mouseleave', hideTip);
}
function showTip(html, e) { const t = $('#tip'); t.innerHTML = html; t.classList.add('show'); moveTip(e); }
function moveTip(e) {
  const t = $('#tip'); const p = stagePoint(e.clientX, e.clientY);
  let x = p.x + 18, y = p.y + 18;
  const w = t.offsetWidth, hh = t.offsetHeight;
  if (x + w > STAGE_W - 10) x = p.x - w - 12;
  if (y + hh > STAGE_H - 10) y = p.y - hh - 12;
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTip() { $('#tip').classList.remove('show'); }

// ---------- 토스트 ----------
function toast(msg, err) {
  const t = h(`<div class="toast${err ? ' err' : ''}">${esc(msg)}</div>`);
  $('#toast-root').appendChild(t);
  setTimeout(() => t.remove(), 3300);
}

// ---------- 모달 ----------
function openModal(inner, opts = {}) {
  const m = h(`<div class="modal${opts.clear ? ' clear' : ''}"></div>`);
  const box = typeof inner === 'string' ? h(inner) : inner;
  if (!box.classList.contains('modal-box')) box.classList.add('modal-box');
  m.appendChild(box);
  if (opts.closable !== false) {
    const x = h('<button class="modal-x" title="닫기 (Esc)">×</button>');
    x.onclick = () => closeModal(m);
    box.appendChild(x);
    m.addEventListener('pointerdown', e => { if (e.target === m) closeModal(m); });
  }
  m._onClose = opts.onClose;
  m._closable = opts.closable !== false;
  $('#modal-root').appendChild(m);
  return m;
}
function closeModal(m) {
  if (!m || !m.parentNode) return;
  m.remove();
  if (m._onClose) m._onClose();
}
function topModal() { const ms = $$('#modal-root .modal'); return ms[ms.length - 1] || null; }
function confirmBox(title, msg, okLabel = '확인', danger = false) {
  return new Promise(res => {
    const box = h(`<div class="modal-box"><h3>${esc(title)}</h3><p>${esc(msg)}</p><div class="modal-actions"><button class="btn ghost" data-a="no">취소</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="ok">${esc(okLabel)}</button></div></div>`);
    let done = false;
    const m = openModal(box, { onClose: () => { if (!done) res(false); } });
    box.querySelector('[data-a=no]').onclick = () => { done = true; closeModal(m); res(false); };
    box.querySelector('[data-a=ok]').onclick = () => { done = true; closeModal(m); res(true); };
  });
}

// ---------- 카드 상세 ----------
function openCardDetail(card, list) {
  const idx = list ? list.indexOf(card) : -1;
  const f = FACTIONS[card.f];
  const box = h(`<div class="modal-box detail"></div>`);
  box.style.setProperty('--fc', f.color);
  const isUnit = card.kind === 'unit';
  box.innerHTML = `
    <div class="d-art">${isUnit || !iconOf(card) ? `<img src="${fullOf(card)}" alt="">` : `<img src="${fullOf(card)}" style="opacity:.35" alt=""><div class="d-icon" style="background-image:url('${iconOf(card)}')"></div>`}</div>
    <div class="d-body">
      <div class="d-meta">
        <span class="tag" style="background:${f.color};color:#111">${f.name}</span>
        <span class="tag" style="color:${GRADE_COLOR[card.g]}">${card.g} 등급</span>
        ${isUnit ? `<span class="tag type-${card.t}">${TYPES[card.t]}형</span><span class="tag role-${card.r}">${ROLES[card.r]}</span>` : '<span class="tag skill">지원 카드</span>'}
        ${card.enemy ? '<span class="tag enemy">특수 카드</span>' : ''}
      </div>
      <h2>${esc(card.n)}</h2>
      <div class="d-stats">
        <div><span class="s-l">비용</span><span style="color:${f.color}">${card.c}</span></div>
        ${isUnit ? `<div><span class="s-l">공격력</span><span style="color:#ffb13b">${card.a}</span></div><div><span class="s-l">체력</span><span style="color:#4fd66b">${card.h}</span></div>` : ''}
      </div>
      <div class="d-text">${kwText(card) || '특수 능력이 없는 기본 전투원입니다.'}</div>
      ${typeof masteryWins === 'function' && !card.enemy ? `<div class="d-mastery">숙련도 <b class="m${masteryLevel(card.id)}">${masteryLevel(card.id) ? MASTERY[masteryLevel(card.id) - 1].name : '없음'}</b> · 이 카드가 든 덱으로 보통 이상 상대에게 이긴 횟수 ${masteryWins(card.id)}회${masteryLevel(card.id) < 3 ? ` (다음 단계까지 ${MASTERY[masteryLevel(card.id)].n - masteryWins(card.id)}회)` : ''}</div>` : ''}
      ${!Store.isUnlocked(card.id) ? `<div class="d-lock">🔒 잠김 — 해금 조건: ${esc(unlockSource(card.id))}</div>` : ''}
      <div class="d-kw">${kwHelpList(card).map(([k, v]) => `<div><b>[${esc(k)}]</b>${esc(v)}</div>`).join('')}</div>
      <div class="d-nav">${list ? `<button class="btn small" data-n="-1" ${idx <= 0 ? 'disabled' : ''}>◀ 이전</button><button class="btn small" data-n="1" ${idx >= list.length - 1 ? 'disabled' : ''}>다음 ▶</button>` : ''}<span class="spacer"></span><span style="color:var(--muted);font-size:15px;align-self:center">${list ? `${idx + 1} / ${list.length}` : ''}</span></div>
    </div>`;
  const m = openModal(box);
  box.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { closeModal(m); openCardDetail(list[idx + parseInt(b.dataset.n, 10)], list); });
  m._keyNav = d => { const n = idx + d; if (list && n >= 0 && n < list.length) { closeModal(m); openCardDetail(list[n], list); } };
}

// ---------- 설정 ----------
function openSettings(inBattle) {
  const s = Store.settings;
  const box = h(`<div class="modal-box"><h3>설정</h3>
    <div class="settings-grid">
      <span>배경음</span><input type="range" min="0" max="1" step="0.05" value="${s.bgm}" data-k="bgm">
      <span>효과음</span><input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-k="sfx">
      <span>캐릭터 음성</span><input type="range" min="0" max="1" step="0.05" value="${s.voice ?? 0.8}" data-k="voice">
      <span>전투 속도</span><div class="seg" data-k="speed">${[1, 1.5, 2, 3].map(v => `<button data-v="${v}" class="${s.speed === v ? 'on' : ''}">x${v}</button>`).join('')}</div>
      <span>전투 예측 표시</span><div class="switch ${s.forecast ? 'on' : ''}" data-k="forecast"></div>
      <span class="hint">이번 턴 전투 결과(피해·격파)를 유닛 위에 미리 표시합니다.</span>
      <span>전술 팁·실전 안내</span><div class="switch ${s.tips ? 'on' : ''}" data-k="tips"></div>
    </div>
    <div class="modal-actions">${inBattle ? '' : '<button class="btn danger small" data-a="reset">저장 데이터 초기화</button><button class="btn small" data-a="export">저장 내보내기</button><button class="btn small" data-a="import">저장 불러오기</button><span class="spacer"></span>'}<button class="btn primary" data-a="ok">닫기</button></div></div>`);
  const m = openModal(box);
  box.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => {
    s[r.dataset.k] = parseFloat(r.value);
    if (r.dataset.k === 'bgm') Audio2.setBgmVolume(s.bgm);
    if (r.dataset.k === 'sfx') Audio2.play('click');
    if (r.dataset.k === 'voice') Audio2.voice(Store.data.secretary, 'deploy', true);
    Store.save();
  });
  box.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    s.speed = parseFloat(b.dataset.v); Store.save(); applySpeedVar();
    box.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
    if (typeof onSpeedChanged === 'function') onSpeedChanged();
  });
  box.querySelectorAll('.switch').forEach(sw => sw.onclick = () => {
    s[sw.dataset.k] = !s[sw.dataset.k]; sw.classList.toggle('on', s[sw.dataset.k]); Store.save();
    if (sw.dataset.k === 'forecast' && typeof refreshForecast === 'function') refreshForecast();
  });
  box.querySelector('[data-a=ok]').onclick = () => closeModal(m);
  // 저장 백업: 파일로 내려받고, 같은 파일로 되돌린다 (브라우저 저장소가 지워져도 복구할 수 있게)
  const ex = box.querySelector('[data-a=export]');
  if (ex) ex.onclick = () => {
    const blob = new Blob([JSON.stringify({ game: 'lao-tcg', savedAt: new Date().toISOString(), data: Store.data }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lao_tcg_save_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('저장 파일을 내려받았습니다.');
  };
  const im = box.querySelector('[data-a=import]');
  if (im) im.onclick = () => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      const f = input.files && input.files[0]; if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        if (!obj || obj.game !== 'lao-tcg' || typeof obj.data !== 'object') throw new Error('형식');
        if (!await confirmBox('저장 불러오기', '지금 저장 데이터를 파일 내용으로 바꿉니다. 지금 진행 상황은 사라집니다.', '불러오기', true)) return;
        // 불러온 파일은 보급소 도입 전 저장으로 치지 않는다 (보급 카드를 공짜로 받는 것을 막음)
        if (obj.data.supplyV === undefined) obj.data.supplyV = 1;
        localStorage.setItem(STORE_KEY, JSON.stringify(obj.data)); Store.clearBattle(); Store.load(); Store.save();
        closeModal(m); toast('저장 데이터를 불러왔습니다.'); showScreen('lobby');
      } catch (e) { toast('이 게임의 저장 파일이 아닙니다.', true); }
    };
    input.click();
  };
  const rb = box.querySelector('[data-a=reset]');
  if (rb) rb.onclick = async () => {
    if (await confirmBox('저장 데이터 초기화', '덱, 스토리 진행도, 전적, 설정이 모두 삭제됩니다. 되돌릴 수 없습니다.', '초기화', true)) {
      localStorage.removeItem(STORE_KEY); Store.load(); closeModal(m); toast('저장 데이터를 초기화했습니다.'); showScreen('lobby');
    }
  };
}

// ---------- 게임 방법 ----------
const HOWTO = [
  ['기본 흐름', `
    <h4>목표</h4>상대의 라이프를 0으로 만들면 승리합니다. 기본 라이프는 ${RULES.CMD_HP}입니다.
    <h4>한 턴의 흐름</h4>
    <table><tr><th>1. AP 충전</th><td>매 턴 최대 AP가 1씩 늘어나고(최대 ${RULES.MAX_AP}) 가득 충전됩니다. 쓰지 않은 AP는 ${RULES.AP_CARRY}까지 다음 턴으로 이월됩니다. 모든 카드는 AP로 사용합니다.</td></tr>
    <tr><th>2. 드로우</th><td>카드 1장을 뽑습니다. 손패는 최대 ${RULES.HAND_MAX}장입니다.</td></tr>
    <tr><th>3. 배치·지원</th><td>전투원은 빈 레인에 배치하고, 지원 카드는 즉시 효과를 발휘합니다. 카드를 끌어다 놓거나 클릭해서 사용합니다.</td></tr>
    <tr><th>4. 작전 지시</th><td>턴마다 한 번, AP ${RULES.COMMAND.cost}를 써서 <b>포격 지원</b>을 할 수 있습니다. 적 전투원 하나나 상대 라이프에 ${RULES.COMMAND.dmg} 피해를 줍니다. 카드를 다 내고 남은 AP를 쓰기 좋습니다.</td></tr>
    <tr><th>5. 전투</th><td>턴 종료 버튼을 누르면 내 전투원이 왼쪽 레인부터 차례로 공격합니다.</td></tr></table>
    <h4>덱과 순환</h4>덱은 ${RULES.DECK_SIZE}장이며 같은 카드는 1장만 넣을 수 있습니다. 제작사는 최대 ${RULES.MAX_FACTIONS}곳까지 섞을 수 있습니다. 덱이 바닥나면 버린 카드를 섞어 다시 사용하므로, 강한 카드는 몇 번이고 돌아옵니다.
    ${RULES.OVERTIME_ROUND ? `<h4>작전 시간 초과</h4>${RULES.OVERTIME_ROUND}라운드부터는 턴을 시작하는 쪽이 라이프 피해를 받습니다. 피해는 1부터 시작해 라운드마다 1씩 커지므로, 교착 상태가 길어지면 라이프가 많은 쪽이 유리합니다.` : ''}
    <h4>선공과 후공</h4>양쪽 모두 카드 ${RULES.START_HAND}장으로 시작하며, 그중 최대 ${RULES.MULLIGAN_MAX}장을 한 번 교체할 수 있습니다. 선공은 첫 턴에 카드를 뽑지 않습니다. 후공은 교체가 끝난 뒤 카드 ${RULES.SECOND_EXTRA_CARDS}장을 더 받고, 첫 턴에 AP를 ${RULES.SECOND_AP_BONUS} 더 받으며, 라이프가 ${RULES.SECOND_HP_BONUS} 더 많습니다.`],
  ['전투 규칙', `
    <h4>레인 전투</h4>전장은 좌익·중앙·우익 3개 레인입니다. 전투원은 <b>마주 보는 적 전투원</b>을 공격하고, 앞이 비어 있으면 <b>상대 라이프</b>를 직접 공격합니다.
    <h4>소환 대기</h4>전투원은 배치된 턴에는 공격하지 않습니다. <b>돌격</b> 키워드가 있으면 바로 공격합니다.
    <h4>보호</h4>보호기는 양옆 레인으로 가는 공격을 대신 받습니다. 앞이 비어 상대 라이프를 치려던 공격도 옆의 보호기가 막아섭니다.
    <h4>전투 예측</h4>내 턴 동안 이번 전투에서 들어갈 피해가 적 유닛 위에 빨간 숫자로 표시됩니다. 다음 적 턴에 내가 받을 예상 피해는 주황색으로 표시됩니다. 턴 종료 버튼에 마우스를 올리면 공격 경로 화살표가 나타납니다.`],
  ['상성과 역할', `
    <h4>병종 상성</h4>
    <div class="tri"><span class="tag type-L">경장</span> ▶ <span class="tag type-M">기동</span> ▶ <span class="tag type-H">중장</span> ▶ <span class="tag type-L">경장</span></div>
    유리한 상대를 공격하면 피해가 +${RULES.TYPE_BONUS} 늘어납니다. 카드를 배치할 때 레인 위에 <b style="color:#4fd66b">유리</b> / <b style="color:#ff4d5a">불리</b>가 표시됩니다.
    <h4>역할</h4>
    <table><tr><th><span class="tag role-ATK">공격기</span></th><td>높은 공격력의 주력 화력입니다.</td></tr>
    <tr><th><span class="tag role-DEF">보호기</span></th><td>양옆 레인을 노리는 공격을 대신 받고, 전투원에게 받는 피해가 1 줄어듭니다 (최소 1).</td></tr>
    <tr><th><span class="tag role-SUP">지원기</span></th><td>양옆 레인 아군의 공격력을 +1 올립니다.</td></tr></table>`],
  ['키워드', `<table>${Object.entries(KEYWORD_HELP).filter(([k]) => !['공격기', '보호', '지원'].includes(k)).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('')}
    <tr><th>전개</th><td>배치되는 즉시 효과가 발동합니다.</td></tr><tr><th>격파</th><td>파괴될 때 효과가 발동합니다.</td></tr><tr><th>공격 후</th><td>그 유닛이 공격한 뒤 살아 있으면 효과가 발동합니다.</td></tr></table>`],
  ['제작사', `<table>${PLAYER_FACTIONS.map(f => `<tr><th style="color:${FACTIONS[f].color}">${FACTIONS[f].name}</th><td>${{ '3P': '균형형. 오르카호의 정예 전투원과 함포 지원.', PECS: '회복·버프·AP 가속. 장기전에 강합니다.', BR: '고화력 공격과 직접 피해. 돌격 전투원이 많습니다.', DS: '회피와 암살. 적 전투원을 제거하며 파고듭니다.', AGS: '중장 로봇과 방어막. 단단하게 버티며 반격합니다.' }[f]}</td></tr>`).join('')}
    <tr><th style="color:${FACTIONS.IW.color}">철충</th><td>철충 연구 자료로 만든 특수 카드입니다. 스토리의 일부 상대가 사용하며, 무리 소환과 부식 공격이 특징입니다.</td></tr></table>`],
  ['조작', `<table>
    <tr><th>카드 사용</th><td>손패의 카드를 레인이나 대상으로 끌어다 놓습니다. 또는 카드를 클릭한 뒤 레인·대상을 클릭합니다.</td></tr>
    <tr><th>카드 정보</th><td>카드에 마우스를 올리면 왼쪽에 크게 표시됩니다. 덱 편성과 도감에서는 우클릭으로 상세 정보를 엽니다.</td></tr>
    <tr><th>단축키</th><td><b>Space</b> 턴 종료 · <b>Esc</b> 선택 취소 · <b>1~7</b> 손패 선택 · <b>L</b> 전투 기록</td></tr>
    <tr><th>전투 속도</th><td>오른쪽 위 속도 버튼이나 설정에서 x1~x3으로 바꿀 수 있습니다.</td></tr></table>`],
];
function openHowTo(tab = 0) {
  const box = h(`<div class="modal-box howto"><h3>게임 방법</h3><div class="howto-tabs">${HOWTO.map((t, i) => `<button data-t="${i}" class="${i === tab ? 'on' : ''}">${t[0]}</button>`).join('')}</div><div class="howto-body scroll"></div></div>`);
  const body = box.querySelector('.howto-body');
  const show = i => { body.innerHTML = touchText(HOWTO[i][1]); box.querySelectorAll('.howto-tabs button').forEach(b => b.classList.toggle('on', +b.dataset.t === i)); body.scrollTop = 0; };
  box.querySelectorAll('.howto-tabs button').forEach(b => b.onclick = () => show(+b.dataset.t));
  show(tab);
  openModal(box);
}

// ---------- 이펙트 ----------
function fx() { return $('#fx-layer'); }
function floatAt(x, y, text, cls = 'dmg') {
  const f = h(`<div class="float ${cls}">${esc(text)}</div>`);
  f.style.left = x + 'px'; f.style.top = y + 'px';
  fx().appendChild(f); setTimeout(() => f.remove(), 1100 / (Store.settings.speed || 1));
}
function floatOn(el, text, cls) { if (!el) return; const r = stageRect(el); floatAt(r.cx, r.y + r.h * 0.35, text, cls); }
function burstAt(x, y, color = '#ffcf6b') {
  const b = h('<div class="burst"></div>'); b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.setProperty('--c', color);
  fx().appendChild(b); setTimeout(() => b.remove(), 600);
}
function sparkleAt(x, y, color = '#6bff88', n = 10) {
  for (let i = 0; i < n; i++) {
    const s = h('<div class="sparkle"></div>');
    s.style.left = (x + (Math.random() - 0.5) * 120) + 'px'; s.style.top = (y + (Math.random() - 0.2) * 100) + 'px';
    s.style.setProperty('--c', color); s.style.setProperty('--dx', ((Math.random() - 0.5) * 60) + 'px'); s.style.setProperty('--dy', (-60 - Math.random() * 80) + 'px');
    fx().appendChild(s); setTimeout(() => s.remove(), 900);
  }
}
function slashAt(x, y) { const s = h('<div class="slash"></div>'); s.style.left = x + 'px'; s.style.top = y + 'px'; fx().appendChild(s); setTimeout(() => s.remove(), 600); }
function beamBetween(a, b, color = '#ffcf6b') {
  const dx = b.x - a.x, dy = b.y - a.y; const len = Math.hypot(dx, dy);
  const bm = h('<div class="beam"></div>');
  bm.style.left = a.x + 'px'; bm.style.top = a.y + 'px'; bm.style.width = len + 'px';
  bm.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`; bm.style.setProperty('--c', color);
  fx().appendChild(bm); setTimeout(() => bm.remove(), 600);
}
// 발사체가 a → b로 날아간다
function boltTo(a, b, color = '#ffcf6b', ms = 220) {
  return new Promise(res => {
    const bt = h('<div class="bolt"></div>');
    bt.style.setProperty('--c', color);
    bt.style.left = a.x + 'px'; bt.style.top = a.y + 'px';
    fx().appendChild(bt);
    const dur = ms / (Store.settings.speed || 1);
    let done = false; const fin = () => { if (done) return; done = true; bt.remove(); res(); };
    bt.animate([{ left: a.x + 'px', top: a.y + 'px' }, { left: b.x + 'px', top: b.y + 'px' }], { duration: dur, easing: 'ease-in' }).onfinish = fin;
    setTimeout(fin, dur + 80); // 탭이 보이지 않아 애니메이션이 멈춰도 진행이 막히지 않도록
  });
}
function screenFlash(kind = 'red') { const f = h(`<div class="screen-flash ${kind}"></div>`); $('#stage').appendChild(f); setTimeout(() => f.remove(), 600); }
function quake() { const s = $('#scr-battle'); s.classList.remove('quake'); void s.offsetWidth; s.classList.add('quake'); }
function retrigger(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
