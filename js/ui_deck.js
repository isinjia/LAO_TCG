// ===== 덱 편성 / 카드 도감 =====
const GRADE_ORDER = { B: 0, A: 1, S: 2, SS: 3 };
// 덱 편성·도감 카드 크기: 휴대폰(.compact)에서는 크게 그려 효과 글씨를 읽을 수 있게 한다
function poolCardW() { return document.body.classList.contains('compact') ? 330 : 190; }
function makeFilterState() { return { q: '', facs: new Set(), kind: '', grade: '', cost: '', sort: 'cost', enemy: false }; }
const deckFilter = makeFilterState();
const colFilter = makeFilterState();

function filterCards(list, st) {
  const q = st.q.trim();
  let out = list.filter(c =>
    (!q || c.n.includes(q) || (c.text || '').includes(q) || (c.kw || []).some(k => k.includes(q))) &&
    (!st.facs.size || st.facs.has(c.f)) &&
    (!st.kind || c.kind === st.kind) &&
    (!st.grade || c.g === st.grade) &&
    (!st.cost || (st.cost === '7' ? c.c >= 7 : c.c === +st.cost)));
  const fi = f => Object.keys(FACTIONS).indexOf(f);
  const sorters = {
    cost: (a, b) => a.c - b.c || fi(a.f) - fi(b.f) || GRADE_ORDER[b.g] - GRADE_ORDER[a.g],
    grade: (a, b) => GRADE_ORDER[b.g] - GRADE_ORDER[a.g] || a.c - b.c,
    faction: (a, b) => fi(a.f) - fi(b.f) || a.c - b.c,
    name: (a, b) => a.n.localeCompare(b.n, 'ko'),
    atk: (a, b) => (b.a || 0) - (a.a || 0),
    hp: (a, b) => (b.h || 0) - (a.h || 0),
  };
  return out.sort(sorters[st.sort] || sorters.cost);
}

function filterBarHtml(st, withEnemy) {
  const facs = withEnemy ? Object.keys(FACTIONS) : PLAYER_FACTIONS;
  return `<div class="filters">
    <input type="search" placeholder="이름·키워드 검색" value="${esc(st.q)}" data-f="q">
    <div class="fac-toggle">${facs.map(f => `<button data-fac="${f}" style="--fc:${FACTIONS[f].color}" class="${st.facs.has(f) ? 'on' : ''}">${FACTIONS[f].short}</button>`).join('')}</div>
    <select data-f="kind"><option value="">전체 종류</option><option value="unit">전투원</option><option value="skill">지원 카드</option></select>
    <select data-f="grade"><option value="">전체 등급</option><option>SS</option><option>S</option><option>A</option><option>B</option></select>
    <select data-f="cost"><option value="">전체 비용</option>${[1, 2, 3, 4, 5, 6].map(v => `<option value="${v}">비용 ${v}</option>`).join('')}<option value="7">비용 7+</option></select>
    <select data-f="sort"><option value="cost">비용순</option><option value="grade">등급순</option><option value="faction">제작사순</option><option value="name">이름순</option><option value="atk">공격력순</option><option value="hp">체력순</option></select>
    <span class="spacer"></span><span class="pool-count"></span></div>`;
}
function bindFilterBar(root, st, rerender) {
  const bar = $('.filters', root);
  ['kind', 'grade', 'cost', 'sort'].forEach(k => { const s = $(`[data-f=${k}]`, bar); s.value = st[k]; s.onchange = () => { st[k] = s.value; rerender(); }; });
  const q = $('[data-f=q]', bar); q.oninput = () => { st.q = q.value; rerender(); };
  $$('[data-fac]', bar).forEach(b => b.onclick = () => { const f = b.dataset.fac; st.facs.has(f) ? st.facs.delete(f) : st.facs.add(f); b.classList.toggle('on', st.facs.has(f)); rerender(); });
}

// ---------- 덱 편성 ----------
let editing = null; // { id, name, cards, preset }

function loadEditing(id) {
  const d = Store.getDeck(id);
  editing = { id: d.id, name: d.name, cards: d.cards.slice(), preset: !!d.preset };
}
function ensureEditable() {
  if (!editing.preset) return;
  const copy = { id: Store.newDeckId(), name: editing.name.replace(/\s*\(.*\)$/, '') + ' (사본)', cards: editing.cards.slice() };
  Store.saveDeck(copy);
  editing = { ...copy, preset: false };
  Store.data.activeDeck = copy.id; Store.save();
  toast('프리셋은 수정할 수 없어 사본을 만들었습니다.');
}
function commitEditing() {
  if (editing.preset) return;
  Store.saveDeck({ id: editing.id, name: editing.name, cards: editing.cards.slice() });
}

let deckReturn = null; // 덱 편성에서 「뒤로」를 눌렀을 때 돌아갈 화면
screenHooks.deck = el => {
  Audio2.bgm('lobby');
  if (!editing || deckReturn || !Store.allDecks().some(d => d.id === editing.id)) loadEditing(Store.data.activeDeck);
  el.innerHTML = `
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>덱 편성</h2><span class="sub">${touchText('카드를 클릭해 추가·제거 · 우클릭으로 상세 정보')}</span><span class="spacer"></span><button class="btn small" data-a="howto">덱 규칙</button><button class="btn primary" data-a="battle">이 덱으로 빠른 전투</button></div>
    <div class="deck-left">
      <div class="deck-select"><select data-a="pick"></select><button class="btn small" data-a="new" title="새 덱">＋</button></div>
      <input class="deck-name" maxlength="24" data-a="name">
      <div class="deck-summary"><div class="deck-count"><span data-v="count">0</span><small>/${RULES.DECK_SIZE}</small></div><div class="curve" data-v="curve"></div></div>
      <div data-v="facs" style="display:flex;gap:6px;flex-wrap:wrap;min-height:24px"></div>
      <div class="deck-list scroll" data-v="list"></div>
      <div class="deck-msg" data-v="msg"></div>
      <div class="deck-actions">
        <button class="btn small" data-a="auto" title="빈 칸을 현재 제작사 카드로 채웁니다">자동 채우기</button>
        <button class="btn small" data-a="clear">비우기</button>
        <button class="btn small" data-a="dup">복제</button>
        <button class="btn small danger" data-a="del">삭제</button>
      </div>
    </div>
    <div class="pool-wrap">${filterBarHtml(deckFilter, false)}<div class="pool-grid scroll" data-v="pool"></div></div>`;
  bindFilterBar(el, deckFilter, () => renderPool(el));
  const back = deckReturn; deckReturn = null; // 스토리에서 「덱 고치기」로 들어왔으면 스토리로 돌아간다
  $('[data-a=back]', el).innerHTML = back === 'campaign' ? '← 스토리' : '← 로비';
  $('[data-a=back]', el).onclick = () => showScreen(back || 'lobby');
  $('[data-a=howto]', el).onclick = () => openHowTo(0);
  $('[data-a=battle]', el).onclick = () => {
    if (Store.deckProblem(editing.cards, editing.preset)) { toast(Store.deckProblem(editing.cards, editing.preset), true); return; }
    Store.data.activeDeck = editing.id; Store.save(); setupState.myDeck = editing.id; showScreen('setup');
  };
  $('[data-a=pick]', el).onchange = e => { loadEditing(e.target.value); Store.data.activeDeck = editing.id; Store.save(); renderDeck(el); renderPool(el); };
  $('[data-a=new]', el).onclick = () => {
    const d = { id: Store.newDeckId(), name: `새 덱 ${Store.data.decks.length + 1}`, cards: [] };
    Store.saveDeck(d); loadEditing(d.id); Store.data.activeDeck = d.id; Store.save(); renderDeck(el); renderPool(el); toast('새 덱을 만들었습니다.');
  };
  const nameIn = $('[data-a=name]', el);
  nameIn.oninput = () => { if (editing.preset) return; editing.name = nameIn.value || '이름 없는 덱'; commitEditing(); refreshPicker(el); };
  $('[data-a=clear]', el).onclick = () => { ensureEditable(); editing.cards = []; commitEditing(); renderDeck(el); renderPool(el); };
  $('[data-a=dup]', el).onclick = () => {
    const d = { id: Store.newDeckId(), name: editing.name.replace(/\s*\(.*\)$/, '') + ' (사본)', cards: editing.cards.slice() };
    Store.saveDeck(d); loadEditing(d.id); Store.data.activeDeck = d.id; Store.save(); renderDeck(el); renderPool(el); toast('덱을 복제했습니다.');
  };
  $('[data-a=del]', el).onclick = async () => {
    if (editing.preset) { toast('프리셋 덱은 삭제할 수 없습니다.', true); return; }
    if (!(await confirmBox('덱 삭제', `"${editing.name}" 덱을 삭제할까요?`, '삭제', true))) return;
    Store.deleteDeck(editing.id); loadEditing(Store.data.activeDeck); renderDeck(el); renderPool(el);
  };
  $('[data-a=auto]', el).onclick = () => {
    ensureEditable();
    let facs = [...new Set(editing.cards.map(id => CARDS[id].f))];
    const pool = POOL.filter(c => Store.isUnlocked(c.id)).sort(() => Math.random() - 0.5);
    // 제작사가 모자라면 가진 카드가 많은 제작사부터 고른다 (처음에는 가진 카드가 적어 무작위로 고르면 덱이 다 차지 않는다)
    const owned = f => pool.filter(c => c.f === f && !editing.cards.includes(c.id)).length;
    const order = PLAYER_FACTIONS.filter(f => !facs.includes(f)).sort((a, b) => owned(b) - owned(a));
    while (facs.length < RULES.MAX_FACTIONS && facs.length < 2 && order.length) facs.push(order.shift());
    // 비용 곡선을 고려해 저·중·고비용을 고르게 채운다
    const want = c => { const n = editing.cards.filter(id => Math.abs(CARDS[id].c - c.c) <= 1).length; return n < 4; };
    for (const c of pool) { if (editing.cards.length >= RULES.DECK_SIZE) break; if (facs.includes(c.f) && !editing.cards.includes(c.id) && want(c)) editing.cards.push(c.id); }
    for (const c of pool) { if (editing.cards.length >= RULES.DECK_SIZE) break; if (facs.includes(c.f) && !editing.cards.includes(c.id)) editing.cards.push(c.id); }
    if (editing.cards.length < RULES.DECK_SIZE) toast('가진 카드가 모자라 덱을 다 채우지 못했습니다. 스토리 보상이나 보급소로 카드를 늘려 보세요.', true);
    commitEditing(); renderDeck(el); renderPool(el); Audio2.play('buff');
  };
  renderDeck(el); renderPool(el);
};

function refreshPicker(el) {
  const sel = $('[data-a=pick]', el);
  // 내 덱을 먼저, 빌려 쓰는 프리셋 덱은 뒤에
  sel.innerHTML = `<optgroup label="내 덱">${Store.data.decks.map(d => `<option value="${d.id}">${esc(d.name)}${Store.deckProblem(d.cards) ? ' ⚠' : ''}</option>`).join('')}</optgroup>` +
    `<optgroup label="프리셋 (빠른 전투·도전 모드용)">${Store.allDecks().filter(d => d.preset).map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</optgroup>`;
  sel.value = editing.id;
}

function renderDeck(el) {
  refreshPicker(el);
  const nameIn = $('[data-a=name]', el);
  nameIn.value = editing.name; nameIn.disabled = editing.preset; nameIn.title = editing.preset ? '프리셋 덱은 이름을 바꿀 수 없습니다' : '';
  $('[data-a=del]', el).disabled = editing.preset;
  const cards = editing.cards.map(id => CARDS[id]).sort((a, b) => a.c - b.c || a.f.localeCompare(b.f));
  $('[data-v=count]', el).textContent = cards.length;
  // 비용 곡선
  const buckets = [1, 2, 3, 4, 5, 6, 7].map(c => cards.filter(x => (c === 7 ? x.c >= 7 : x.c === c)).length);
  const mx = Math.max(3, ...buckets);
  $('[data-v=curve]', el).innerHTML = buckets.map((n, i) => `<div class="bar"><b>${n || ''}</b><i style="height:${n / mx * 60}px"></i>${i === 6 ? '7+' : i + 1}</div>`).join('');
  const facs = [...new Set(cards.map(c => c.f))];
  const units = cards.filter(c => c.kind === 'unit');
  const roleCnt = r => units.filter(u => u.r === r).length, typeCnt = t => units.filter(u => u.t === t).length;
  $('[data-v=facs]', el).innerHTML = facs.map(f => `<span class="chip" style="background:${FACTIONS[f].color}">${FACTIONS[f].name} ${cards.filter(c => c.f === f).length}</span>`).join('') +
    (units.length ? `<span class="chip" style="background:#2a3647;color:#cfe0f2">공${roleCnt('ATK')} 보${roleCnt('DEF')} 지${roleCnt('SUP')} · 경${typeCnt('L')} 기${typeCnt('M')} 중${typeCnt('H')}</span>` : '');
  const list = $('[data-v=list]', el); list.innerHTML = '';
  cards.forEach(c => {
    const row = h(`<div class="deck-row" style="--fc:${FACTIONS[c.f].color}">${c.kind === 'skill' && iconOf(c) ? `<div class="r-art r-icon" style="background-image:url('${iconOf(c)}')"></div>` : `<div class="r-art" style="background-image:url('${artOf(c)}')"></div>`}<span class="r-cost">${c.c}</span><span class="r-name">${esc(c.n)}</span><span class="r-grade" style="color:${GRADE_COLOR[c.g]}">${c.g}</span></div>`);
    row.title = '클릭하여 제거';
    row.onclick = () => { hidePreview(); ensureEditable(); editing.cards.splice(editing.cards.indexOf(c.id), 1); commitEditing(); Audio2.play('card'); renderDeck(el); renderPool(el); };
    row.oncontextmenu = e => { e.preventDefault(); openCardDetail(c, cards); };
    // 큰 카드 미리보기는 마우스를 올렸을 때만. 휴대폰은 탭할 때도 '올림' 신호가 오는데 '떠남' 신호가 없어 큰 카드가 남아 목록을 가린다
    row.onpointerenter = e => { if (e.pointerType === 'mouse') showPreview(c, 'right'); };
    row.onpointerleave = hidePreview;
    list.appendChild(row);
  });
  for (let i = cards.length; i < RULES.DECK_SIZE; i++) list.appendChild(h('<div class="deck-row empty">빈 슬롯</div>'));
  const err = Store.deckProblem(editing.cards, editing.preset);
  const msg = $('[data-v=msg]', el);
  msg.className = 'deck-msg ' + (err ? 'err' : 'ok');
  msg.textContent = err || (editing.preset ? '✔ 프리셋 덱 (수정하면 사본이 만들어집니다)' : '✔ 사용 가능 · 자동 저장됨');
}

function renderPool(el) {
  const grid = $('[data-v=pool]', el); grid.innerHTML = '';
  const facs = [...new Set(editing.cards.map(id => CARDS[id].f))];
  const own = c => (Store.isUnlocked(c.id) ? 0 : 1);
  // 덱에 넣은 카드는 오른쪽 목록에서 빼고(빼려면 왼쪽 덱 목록을 누른다), 가진 카드를 앞에 둔다
  const list = filterCards(POOL, deckFilter).filter(c => !editing.cards.includes(c.id)).map((c, i) => [c, i]).sort((a, b) => own(a[0]) - own(b[0]) || a[1] - b[1]).map(x => x[0]); // 가진 카드를 앞에
  $('.pool-count', el).textContent = `${list.length}장 · 보유 ${POOL.filter(c => Store.isUnlocked(c.id)).length}/${POOL.length}`;
  list.forEach(c => {
    const ce = cardEl(c, { w: poolCardW(), lockCheck: true });
    const inDeck = editing.cards.includes(c.id);
    const locked = !Store.isUnlocked(c.id);
    const full = editing.cards.length >= RULES.DECK_SIZE;
    const facBlock = facs.length >= RULES.MAX_FACTIONS && !facs.includes(c.f);
    ce.classList.toggle('in-deck', inDeck);
    ce.classList.toggle('blocked', !inDeck && facBlock);
    ce.classList.toggle('full', !inDeck && full && !facBlock);
    ce.onclick = () => {
      if (inDeck) { ensureEditable(); editing.cards.splice(editing.cards.indexOf(c.id), 1); Audio2.play('card'); }
      else if (locked) { toast(`잠긴 카드입니다. 해금 조건: ${unlockSource(c.id)}`, true); return; }
      else if (full) { toast(`덱은 ${RULES.DECK_SIZE}장까지입니다.`, true); return; }
      else if (facBlock) { toast(`제작사는 최대 ${RULES.MAX_FACTIONS}곳까지 섞을 수 있습니다.`, true); return; }
      else { ensureEditable(); editing.cards.push(c.id); Audio2.play(c.g === 'SS' ? 'pickSS' : 'pick'); }
      commitEditing(); renderDeck(el); renderPool(el);
    };
    ce.oncontextmenu = e => { e.preventDefault(); openCardDetail(c, list); };
    grid.appendChild(ce);
  });
}

// ---------- 카드 도감 ----------
screenHooks.collection = el => {
  Audio2.bgm('lobby');
  el.innerHTML = `
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>카드 도감</h2><span class="sub">카드를 클릭하면 일러스트와 상세 정보를 볼 수 있습니다</span><span class="spacer"></span>
      <button class="btn primary small" data-a="supply">보급소 · <span data-v="bp">${Store.data.bp || 0}</span></button>
      <label style="display:flex;gap:10px;align-items:center;font-size:17px;color:var(--muted)">특수 카드 포함 <div class="switch ${colFilter.enemy ? 'on' : ''}" data-a="enemy"></div></label></div>
    <div class="pool-wrap full">${filterBarHtml(colFilter, true)}<div class="pool-grid scroll" data-v="pool"></div></div>`;
  const render = () => {
    const grid = $('[data-v=pool]', el); grid.innerHTML = '';
    const base = Object.values(CARDS).filter(c => !c.token && (colFilter.enemy || !c.enemy));
    const list = filterCards(base, colFilter);
    $('.pool-count', el).textContent = `${list.length}장`;
    $('.pool-count', el).textContent = `${list.length}장 · 해금 ${POOL.filter(c => Store.isUnlocked(c.id)).length}/${POOL.length}`;
    list.forEach(c => { const ce = cardEl(c, { w: poolCardW(), lockCheck: true }); ce.onclick = () => { Audio2.play('click'); openCardDetail(c, list); }; ce.oncontextmenu = e => { e.preventDefault(); openCardDetail(c, list); }; grid.appendChild(ce); });
  };
  bindFilterBar(el, colFilter, render);
  $('[data-a=supply]', el).onclick = () => openSupply(() => { render(); $('[data-v=bp]', el).textContent = Store.data.bp || 0; });
  $('[data-a=enemy]', el).onclick = e => { colFilter.enemy = !colFilter.enemy; e.currentTarget.classList.toggle('on', colFilter.enemy); render(); };
  const back = deckReturn; deckReturn = null; // 스토리에서 「덱 고치기」로 들어왔으면 스토리로 돌아간다
  $('[data-a=back]', el).innerHTML = back === 'campaign' ? '← 스토리' : '← 로비';
  $('[data-a=back]', el).onclick = () => showScreen(back || 'lobby');
  render();
};
