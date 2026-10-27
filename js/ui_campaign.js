// ===== 캠페인 지도 / 대화 =====
const NODE_POS = [[120, 800], [330, 660], [210, 460], [430, 300], [640, 460], [820, 660], [1000, 480], [860, 250], [1080, 110]];
const NODE_POS_EX = [[170, 760], [450, 560], [760, 400], [1020, 190]]; // 외전 지도 (본편과 같은 지도 칸에 따로 그린다)
const CHAPTERS = { main: { name: '본편 · 오르카 카드 리그', short: '본편 리그' }, ex: { name: '외전 · 붉은 시뮬레이션', short: '외전: 붉은 시뮬레이션' } };
const chapterOf = s => s.chapter || 'main';
let campChapter = 'main';
const DIFF = {
  easy: { label: '쉬움', hp: 0.8, shift: -1, desc: '적 체력 -20%, AI 한 단계 약화 · 별은 2개까지만 얻을 수 있음' },
  normal: { label: '보통', hp: 1.0, shift: 0, desc: '기본 난이도' },
  hard: { label: '어려움', hp: 1.25, shift: 1, desc: '적 체력 +25%, AI 한 단계 강화 · 이기면 지도에 어려움 정복 표시' },
};
const LEVELS = ['easy', 'normal', 'hard'];
const LEVEL_LABEL = { easy: '쉬움', normal: '보통', hard: '어려움' };
let selStage = null;

function stageEnemy(stage) {
  const d = DIFF[Store.data.campaign.difficulty] || DIFF.normal;
  const li = Math.max(0, Math.min(2, LEVELS.indexOf(stage.enemy.level) + (stage.tutorial ? 0 : d.shift)));
  return { ...stage.enemy, hp: Math.round(stage.enemy.hp * (stage.tutorial ? 1 : d.hp)), level: LEVELS[li], start: stage.start || [] };
}

screenHooks.campaign = el => {
  Audio2.bgm('talk');
  if (selStage === null) {
    const next = CAMPAIGN.findIndex((s, i) => Store.stageUnlocked(i) && !Store.data.campaign.cleared[s.id]);
    selStage = next >= 0 ? next : CAMPAIGN.length - 1;
  }
  campChapter = chapterOf(CAMPAIGN[selStage]);
  const exOpen = !!Store.data.campaign.cleared.s8;
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/vr2.jpg')"></div><div class="bg-dim"></div>
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>스토리 — 오렌지에이드의 카드 마스터 리그</h2><span class="sub">★ ${Store.totalStars()} / ${CAMPAIGN.length * 3}</span>
      <span class="spacer"></span><div class="seg camp-tabs">${Object.entries(CHAPTERS).map(([k, v]) => `<button data-ch="${k}" class="${k === campChapter ? 'on' : ''} ${k === 'ex' && !exOpen ? 'locked' : ''}">${k === 'ex' && !exOpen ? '🔒 ' : ''}${v.short}</button>`).join('')}</div></div>
    <div class="camp-map"><svg width="1180" height="940"></svg></div>
    <div class="camp-diff">난이도 <div class="seg">${Object.entries(DIFF).map(([k, v]) => `<button data-d="${k}" class="${Store.data.campaign.difficulty === k ? 'on' : ''}">${v.label}</button>`).join('')}</div><span data-v="ddesc"></span></div>
    <div class="panel stage-panel"></div>`;
  $('[data-a=back]', el).onclick = () => showScreen('lobby');
  $('[data-v=ddesc]', el).textContent = DIFF[Store.data.campaign.difficulty].desc;
  $$('[data-d]', el).forEach(b => b.onclick = () => {
    Store.data.campaign.difficulty = b.dataset.d; Store.save();
    $$('[data-d]', el).forEach(x => x.classList.toggle('on', x === b));
    $('[data-v=ddesc]', el).textContent = DIFF[b.dataset.d].desc;
    renderStagePanel(el); Audio2.play('click');
  });
  $$('[data-ch]', el).forEach(b => b.onclick = () => {
    if (b.dataset.ch === 'ex' && !exOpen) { toast('본편 결승에서 이기면 외전이 열립니다.', true); return; }
    campChapter = b.dataset.ch;
    const first = CAMPAIGN.findIndex((s, i) => chapterOf(s) === campChapter && Store.stageUnlocked(i) && !Store.data.campaign.cleared[s.id]);
    selStage = first >= 0 ? first : CAMPAIGN.map(chapterOf).lastIndexOf(campChapter);
    $$('[data-ch]', el).forEach(x => x.classList.toggle('on', x === b));
    Audio2.play('click'); renderMap(el); renderStagePanel(el);
  });
  renderMap(el); renderStagePanel(el);
};

function renderMap(el) {
  const map = $('.camp-map', el);
  $$('.node', map).forEach(n => n.remove());
  // 지도 장식은 장(본편/외전)마다 다르다
  if (map.dataset.ch !== campChapter) {
    map.dataset.ch = campChapter;
    $$('.map-deco', map).forEach(n => n.remove());
    map.classList.toggle('ex', campChapter === 'ex');
    map.insertAdjacentHTML('afterbegin', campChapter === 'ex'
      ? `<img class="map-boss map-deco" src="${fullOf(CARDS['IW_LemonadeOmega'])}" alt=""><img class="map-orca map-deco" src="${fullOf(CARDS['PECS_LemonadeAlpha'])}" alt="">
        <div class="zone map-deco" style="left:120px;top:850px">SECTOR 1 · VR 훈련실</div><div class="zone map-deco" style="left:560px;top:640px">SECTOR 2 · 오프라인 구역</div><div class="zone map-deco" style="left:700px;top:90px">SECTOR 3 · 서버 심층부</div>`
      : `<img class="map-boss map-deco" src="${fullOf(CARDS['3P_Labiata'])}" alt=""><img class="map-orca map-deco" src="${fullOf(CARDS['PECS_Orangeade'])}" alt="">
        <div class="zone map-deco" style="left:330px;top:780px">예선 구역</div><div class="zone map-deco" style="left:520px;top:130px">본선 구역</div><div class="zone map-deco" style="left:760px;top:760px">상위 리그 구역</div>`);
  }
  const idxs = CAMPAIGN.map((s, i) => i).filter(i => chapterOf(CAMPAIGN[i]) === campChapter);
  const posOf = i => (campChapter === 'ex' ? NODE_POS_EX : NODE_POS)[idxs.indexOf(i)];
  const svg = $('svg', map);
  let paths = '';
  for (let k = 1; k < idxs.length; k++) {
    const i = idxs[k];
    const [x1, y1] = posOf(idxs[k - 1]), [x2, y2] = posOf(i);
    const open = Store.stageUnlocked(i);
    paths += `<line class="${open ? 'open' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${open ? 'rgba(255,177,59,0.75)' : 'rgba(120,160,200,0.25)'}" stroke-width="${open ? 5 : 3}" stroke-dasharray="${open ? '14 10' : '10 10'}"/>`;
  }
  svg.innerHTML = paths;
  const nextIdx = CAMPAIGN.findIndex((s, i) => Store.stageUnlocked(i) && !Store.data.campaign.cleared[s.id]);
  idxs.forEach(i => {
    const s = CAMPAIGN[i];
    const [x, y] = posOf(i);
    const unlocked = Store.stageUnlocked(i);
    const stars = Store.stageStars(s.id);
    const n = h(`<div class="node ${s.boss ? 'boss' : ''} ${i === selStage ? 'sel' : ''} ${unlocked ? '' : 'locked'} ${i === nextIdx ? 'next' : ''}" style="left:${x}px;top:${y}px">
      <div class="n-hex"><div class="n-img" style="background-image:url('${artOf(CARDS[s.enemy.portrait])}')"></div><span class="n-no">${unlocked ? s.no : '🔒'}</span></div>
      <div class="n-title">${esc(s.title)}</div>
      <div class="n-stars">${stars.map(v => `<span class="lo-star ${v ? 'on' : ''}"></span>`).join('')}</div>${Store.data.campaign.hardCleared[s.id] ? '<div class="n-hard">어려움 정복</div>' : ''}</div>`);
    n.onclick = () => {
      if (!unlocked) { toast('이전 배틀에서 먼저 이겨야 합니다.', true); return; }
      selStage = i; Audio2.play('click'); renderMap(el); renderStagePanel(el);
    };
    map.appendChild(n);
  });
}

function renderStagePanel(el) {
  const s = CAMPAIGN[selStage];
  const en = stageEnemy(s);
  const stars = Store.stageStars(s.id);
  const panel = $('.stage-panel', el);
  const decks = Store.storyDecks(); // 스토리는 내 덱으로만 한다 (프리셋 덱은 빠른 전투용)
  const curDeck = decks.some(d => d.id === Store.data.activeDeck) ? Store.data.activeDeck : decks.length ? decks[0].id : null;
  panel.innerHTML = `
    <div class="stage-hero" style="background-image:url('assets/bg/${s.bg}.jpg')">
      <img src="${fullOf(CARDS[en.portrait])}" alt="">
      <div class="sh-text"><div class="sh-no">${stageLabel(s)}${s.boss ? ' · 보스' : ''}</div><h3>${esc(s.title)}</h3><div class="sh-sub">${esc(s.sub)}</div></div>
    </div>
    <div class="stage-body">
      <p>${esc(s.desc)}</p>
      <div class="stage-info"><span>배틀 상대 <b>${esc(en.name)}</b></span><span>상대 라이프 <b>${en.hp}</b>${RULES.SECOND_HP_BONUS && !s.tutorial ? `<small> (후공이면 +${RULES.SECOND_HP_BONUS})</small>` : ''}</span><span>AI <b>${LEVEL_LABEL[en.level]}</b></span><span>성향 <b>${{ aggro: '공격형', control: '제어형', balanced: '균형형' }[en.style || 'balanced']}</b></span>${en.start.length ? `<span>선배치 <b>${en.start.map(x => CARDS[x.id].n).join(', ')}</b></span>` : ''}</div>
      <div class="stage-info"><span>적 제작사 ${[...new Set(en.deck.map(id => CARDS[id].f))].map(f => `<span class="chip" style="background:${FACTIONS[f].color}">${FACTIONS[f].name}</span>`).join(' ')}</span></div>
      <div class="star-list">${s.stars.map((st, i) => `<div class="s ${stars[i] ? 'on' : ''}"><span class="lo-star ${stars[i] ? 'on' : ''}"></span> ${starLabel(st)}</div>`).join('')}</div>
      ${(STAGE_REWARDS[s.id] || []).length ? `<div class="stage-reward">첫 클리어 보상 <span data-v="rw"></span>${Store.data.campaign.cleared[s.id] ? '<span class="done">✔ 획득 완료</span>' : ''}</div>` : ''}
      ${s.playerDeck ? '<div class="stage-info">이 배틀은 콘스탄챠가 빌려준 연습용 덱으로 진행합니다.</div>' : decks.length ? `<div class="stage-deck">내 덱 <select data-a="deck">${decks.map(d => `<option value="${d.id}" ${d.id === curDeck ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select><button class="btn small" data-a="editdeck">덱 고치기</button></div>`
        : '<div class="stage-deck">규칙에 맞는 내 덱이 없습니다. <button class="btn small" data-a="editdeck">덱 고치기</button></div>'}
      <div class="stage-go"><button class="btn small" data-a="enemydeck">상대 덱 보기</button><span class="spacer"></span><button class="btn primary big" data-a="go">배틀 시작</button></div>
    </div>`;
  const rw = $('[data-v=rw]', panel);
  if (rw) (STAGE_REWARDS[s.id] || []).forEach(id => { const ce = cardEl(CARDS[id], { w: 76 }); ce.onclick = () => openCardDetail(CARDS[id]); rw.appendChild(ce); });
  rw && (rw.style.cssText = 'display:flex;gap:8px');
  const sel = $('[data-a=deck]', panel);
  if (sel) sel.onchange = () => { Store.data.activeDeck = sel.value; Store.save(); };
  $('[data-a=enemydeck]', panel).onclick = () => {
    const box = h(`<div class="modal-box" style="width:1240px"><h3>${esc(en.name)}의 덱</h3><div class="pile-view scroll"></div></div>`);
    const list = en.deck.map(id => CARDS[id]).sort((a, b) => a.c - b.c);
    list.forEach(c => { const ce = cardEl(c, { w: 170 }); ce.onclick = () => openCardDetail(c, list); $('.pile-view', box).appendChild(ce); });
    openModal(box);
  };
  const ed = $('[data-a=editdeck]', panel);
  if (ed) ed.onclick = () => { if (sel) Store.data.activeDeck = sel.value; Store.save(); deckReturn = 'campaign'; showScreen('deck'); };
  $('[data-a=go]', panel).onclick = () => {
    if (!s.playerDeck && !decks.length) { toast('덱 편성에서 내 덱을 먼저 고쳐 주세요.', true); return; }
    launchStage(selStage, sel ? sel.value : null);
  };
}

async function launchStage(idx, deckId) {
  const s = CAMPAIGN[idx];
  const deck = s.playerDeck ? { cards: s.playerDeck, name: '훈련용 덱' } : Store.storyDecks().find(d => d.id === (deckId || Store.data.activeDeck)) || Store.storyDecks()[0];
  if (!deck) { toast('덱 편성에서 내 덱을 먼저 고쳐 주세요.', true); return; }
  if (Store.deckProblem(deck.cards, !!s.playerDeck)) { toast(Store.deckProblem(deck.cards, !!s.playerDeck), true); return; } // 튜토리얼 덱은 빌려 쓰는 덱이라 보유 여부를 보지 않는다
  if (!await confirmAbandon()) return;
  Audio2.play('start');
  await playDialogue(s.intro, { bg: s.bg, title: [stageLabel(s), s.title] });
  const en = stageEnemy(s);
  startBattle({
    mode: 'campaign', stageIdx: idx, tutorial: !!s.tutorial, myDeck: deck.cards, myDeckName: deck.name, diff: Store.data.campaign.difficulty,
    enemy: en, first: s.playerFirst ? 'me' : 'random', openingHand: s.openingHand, bg: s.bg, bgm: s.bgm,
  });
}

// ---------- 대화 ----------
// 오렌지에이드와 리그 운영자 콘스탄챠는 왼쪽, 배틀 상대와 그 일행은 오른쪽에 선다
// 말하는 인물을 세울 자리: 이미 서 있으면 그 자리, 주인공은 왼쪽,
// 다른 인물은 빈 자리(오른쪽 먼저)나 가장 오래 말하지 않은 인물의 자리를 차지한다
function speakerSide(who, stage) {
  if (stage.left.who === who) return 'left';
  if (stage.right.who === who) return 'right';
  if (who === 'PECS_Orangeade') return 'left';
  if (!stage.right.who) return 'right';
  if (!stage.left.who) return 'left';
  if (stage.left.who === 'PECS_Orangeade') return 'right';
  return stage.left.last < stage.right.last ? 'left' : 'right';
}
function playDialogue(lines, opts = {}) {
  if (!lines || !lines.length) return Promise.resolve();
  return new Promise(resolve => {
    const d = $('#dialogue');
    d.innerHTML = `${opts.bg ? `<div class="dl-bg" style="background-image:url('assets/bg/${opts.bg}.jpg')"></div>` : ''}<div class="dl-dim"></div>
      <div class="dl-char left"></div><div class="dl-char right"></div>
      ${opts.title ? `<div class="dl-title"><div class="t1">${esc(opts.title[0])}</div><div class="t2">${esc(opts.title[1])}</div></div>` : ''}
      <div class="dl-tools"><button class="btn small ghost dl-log">지난 대사</button><button class="btn small ghost dl-auto">자동 넘김</button><button class="btn small ghost dl-skip">건너뛰기 ▶▶</button></div>
      <div class="dl-box"><div class="dl-name"></div><div class="dl-text"></div><div class="dl-next">▼ 클릭</div></div>`;
    d.classList.add('show');
    let i = -1, typing = null, full = '', auto = false, autoT = null;
    const stage = { left: { who: null, last: -1 }, right: { who: null, last: -1 } };
    const textEl = $('.dl-text', d);
    // 자동 넘김: 글이 다 나온 뒤 길이에 맞춰 기다렸다가 다음 대사로
    const armAuto = () => { clearTimeout(autoT); if (auto && !typing) autoT = setTimeout(() => { if (auto && !$('.dl-logbox', d)) next(); }, 1400 + full.length * 45); };
    const finish = () => { clearInterval(typing); clearTimeout(autoT); d.classList.remove('show'); d.innerHTML = ''; d.onclick = null; window.removeEventListener('keydown', key); resolve(); };
    const next = () => {
      if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; armAuto(); return; }
      clearTimeout(autoT);
      i++;
      if (i >= lines.length) return finish();
      const L = lines[i], c = CARDS[L.who];
      const side = speakerSide(L.who, stage);
      stage[side].who = L.who; stage[side].last = i;
      const ch = $(`.dl-char.${side}`, d), other = $(`.dl-char.${side === 'left' ? 'right' : 'left'}`, d);
      // 등장인물이 바뀌면 옆에서 미끄러져 들어오고, 같은 인물이 이어 말하면 살짝 들썩인다
      const src = fullOf(c);
      if (ch.dataset.src !== src) { ch.dataset.src = src; ch.style.backgroundImage = `url('${src}')`; retrigger(ch, 'enter'); }
      else retrigger(ch, 'talk');
      ch.classList.remove('dim'); other.classList.add('dim');
      $('.dl-name', d).textContent = c ? c.n : L.who;
      retrigger($('.dl-name', d), 'pop');
      // 외전의 모의 개체 대사는 화면이 깨지는 연출, 감탄문은 대화창이 흔들린다
      const glitch = L.text.startsWith('[모의 개체');
      d.classList.toggle('glitch', glitch);
      if (/[!！]$/.test(L.text.trim()) && !glitch) retrigger($('.dl-box', d), 'excite');
      full = L.text; let k = 0; textEl.textContent = '';
      Audio2.play(glitch ? 'zap' : 'card', glitch ? 0.35 : 0.4);
      typing = setInterval(() => { k += 2; textEl.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typing); typing = null; armAuto(); } }, 22);
    };
    const key = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); } if (e.key === 'Escape') finish(); };
    d.onclick = e => {
      const t = e.target;
      if (t.classList.contains('dl-skip')) { finish(); return; }
      if (t.classList.contains('dl-auto')) { auto = !auto; t.classList.toggle('on', auto); armAuto(); return; }
      if (t.classList.contains('dl-log')) {
        // 지금까지 나온 대사를 모아 보여 준다. 아무 곳이나 누르면 닫힌다
        const past = lines.slice(0, i + 1).map(L => `<div><b>${esc(CARDS[L.who] ? CARDS[L.who].n : L.who)}</b>${esc(L.text)}</div>`).join('');
        const box = h(`<div class="dl-logbox"><div class="dl-loglist">${past}</div><small>아무 곳이나 누르면 닫힙니다</small></div>`);
        box.onclick = ev => { ev.stopPropagation(); box.remove(); armAuto(); };
        d.appendChild(box); clearTimeout(autoT); $('.dl-loglist', box).scrollTop = 1e9; return;
      }
      if ($('.dl-logbox', d)) return;
      next();
    };
    window.addEventListener('keydown', key);
    // 전신 그림을 미리 받아 글자보다 인물이 늦게 뜨지 않게 한다(최대 0.8초 기다림).
    // 인물은 처음 말할 때 등장하고, 말을 마친 인물은 상대가 말하는 동안 어둡게 남는다
    const srcs = [...new Set(lines.map(L => CARDS[L.who] && fullOf(CARDS[L.who])).filter(Boolean))];
    const loads = srcs.map(src => new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = src; }));
    Promise.race([Promise.all(loads.slice(0, 3)), sleepRaw(800)]).then(next);
  });
}
