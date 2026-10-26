// ===== 캠페인 지도 / 대화 =====
const NODE_POS = [[120, 800], [330, 660], [210, 460], [430, 300], [640, 460], [820, 660], [1000, 480], [860, 250], [1080, 110]];
const DIFF = {
  easy: { label: '쉬움', hp: 0.8, shift: -1, desc: '적 체력 -20%, AI 한 단계 약화' },
  normal: { label: '보통', hp: 1.0, shift: 0, desc: '기본 난이도' },
  hard: { label: '어려움', hp: 1.25, shift: 1, desc: '적 체력 +25%, AI 한 단계 강화' },
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
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/vr2.jpg')"></div><div class="bg-dim"></div>
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>스토리 — 오렌지에이드의 카드 마스터 리그</h2><span class="sub">★ ${Store.totalStars()} / ${CAMPAIGN.length * 3}</span></div>
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
  renderMap(el); renderStagePanel(el);
};

function renderMap(el) {
  const map = $('.camp-map', el);
  $$('.node', map).forEach(n => n.remove());
  if (!$('.map-boss', map)) {
    map.insertAdjacentHTML('afterbegin', `<img class="map-boss" src="${fullOf(CARDS['3P_Labiata'])}" alt=""><img class="map-orca" src="${fullOf(CARDS['PECS_Orangeade'])}" alt="">
      <div class="zone" style="left:330px;top:780px">STAGE A · 예선</div><div class="zone" style="left:520px;top:130px">STAGE B · 본선</div><div class="zone" style="left:760px;top:760px">STAGE C · 상위 리그</div>`);
  }
  const svg = $('svg', map);
  let paths = '';
  for (let i = 1; i < CAMPAIGN.length; i++) {
    const [x1, y1] = NODE_POS[i - 1], [x2, y2] = NODE_POS[i];
    const open = Store.stageUnlocked(i);
    paths += `<line class="${open ? 'open' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${open ? 'rgba(255,177,59,0.75)' : 'rgba(120,160,200,0.25)'}" stroke-width="${open ? 5 : 3}" stroke-dasharray="${open ? '14 10' : '10 10'}"/>`;
  }
  svg.innerHTML = paths;
  const nextIdx = CAMPAIGN.findIndex((s, i) => Store.stageUnlocked(i) && !Store.data.campaign.cleared[s.id]);
  CAMPAIGN.forEach((s, i) => {
    const [x, y] = NODE_POS[i];
    const unlocked = Store.stageUnlocked(i);
    const stars = Store.stageStars(s.id);
    const n = h(`<div class="node ${s.boss ? 'boss' : ''} ${i === selStage ? 'sel' : ''} ${unlocked ? '' : 'locked'} ${i === nextIdx ? 'next' : ''}" style="left:${x}px;top:${y}px">
      <div class="n-hex"><div class="n-img" style="background-image:url('${artOf(CARDS[s.enemy.portrait])}')"></div><span class="n-no">${unlocked ? s.no : '🔒'}</span></div>
      <div class="n-title">${esc(s.title)}</div>
      <div class="n-stars">${stars.map(v => `<span class="lo-star ${v ? 'on' : ''}"></span>`).join('')}</div></div>`);
    n.onclick = () => {
      if (!unlocked) { toast('이전 대국에서 먼저 이겨야 합니다.', true); return; }
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
  const decks = Store.allDecks().filter(d => !Store.deckProblem(d.cards));
  const curDeck = decks.some(d => d.id === Store.data.activeDeck) ? Store.data.activeDeck : decks[0].id;
  panel.innerHTML = `
    <div class="stage-hero" style="background-image:url('assets/bg/${s.bg}.jpg')">
      <img src="${fullOf(CARDS[en.portrait])}" alt="">
      <div class="sh-text"><div class="sh-no">STAGE ${s.no}${s.boss ? ' · BOSS' : ''}</div><h3>${esc(s.title)}</h3><div class="sh-sub">${esc(s.sub)}</div></div>
    </div>
    <div class="stage-body">
      <p>${esc(s.desc)}</p>
      <div class="stage-info"><span>대국 상대 <b>${esc(en.name)}</b></span><span>상대 라이프 <b>${en.hp}</b></span><span>AI <b>${LEVEL_LABEL[en.level]}</b></span>${en.start.length ? `<span>선배치 <b>${en.start.map(x => CARDS[x.id].n).join(', ')}</b></span>` : ''}</div>
      <div class="stage-info"><span>적 제작사 ${[...new Set(en.deck.map(id => CARDS[id].f))].map(f => `<span class="chip" style="background:${FACTIONS[f].color}">${FACTIONS[f].name}</span>`).join(' ')}</span></div>
      <div class="star-list">${s.stars.map((st, i) => `<div class="s ${stars[i] ? 'on' : ''}"><span class="lo-star ${stars[i] ? 'on' : ''}"></span> ${starLabel(st)}</div>`).join('')}</div>
      ${(STAGE_REWARDS[s.id] || []).length ? `<div class="stage-reward">첫 클리어 보상 <span data-v="rw"></span>${Store.data.campaign.cleared[s.id] ? '<span class="done">✔ 획득 완료</span>' : ''}</div>` : ''}
      ${s.playerDeck ? '<div class="stage-info">이 대국은 콘스탄챠가 빌려준 연습용 덱으로 진행합니다.</div>' : `<div class="stage-deck">사용할 덱 <select data-a="deck">${decks.map(d => `<option value="${d.id}" ${d.id === curDeck ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>`}
      <div class="stage-go"><button class="btn small" data-a="enemydeck">상대 덱 보기</button><span class="spacer"></span><button class="btn primary big" data-a="go">대국 시작</button></div>
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
  $('[data-a=go]', panel).onclick = () => launchStage(selStage, sel ? sel.value : null);
}

async function launchStage(idx, deckId) {
  const s = CAMPAIGN[idx];
  const deck = s.playerDeck ? { cards: s.playerDeck, name: '훈련용 덱' } : Store.getDeck(deckId || Store.data.activeDeck);
  if (Store.deckProblem(deck.cards)) { toast(Store.deckProblem(deck.cards), true); return; }
  Audio2.play('start');
  await playDialogue(s.intro, { bg: s.bg, title: [`MATCH ${s.no}`, s.title] });
  const en = stageEnemy(s);
  startBattle({
    mode: 'campaign', stageIdx: idx, tutorial: !!s.tutorial, myDeck: deck.cards, myDeckName: deck.name,
    enemy: en, first: s.playerFirst ? 'me' : 'random', openingHand: s.openingHand, bg: s.bg, bgm: s.bgm,
  });
}

// ---------- 대화 ----------
function speakerSide(who) {
  const c = CARDS[who];
  return c && (c.enemy || CAMPAIGN.some(s => s.enemy.portrait === who)) ? 'right' : 'left';
}
function playDialogue(lines, opts = {}) {
  if (!lines || !lines.length) return Promise.resolve();
  return new Promise(resolve => {
    const d = $('#dialogue');
    d.innerHTML = `${opts.bg ? `<div class="dl-bg" style="background-image:url('assets/bg/${opts.bg}.jpg')"></div>` : ''}<div class="dl-dim"></div>
      <div class="dl-char left"></div><div class="dl-char right"></div>
      ${opts.title ? `<div class="dl-title"><div class="t1">${esc(opts.title[0])}</div><div class="t2">${esc(opts.title[1])}</div></div>` : ''}
      <button class="btn small ghost dl-skip">건너뛰기 ▶▶</button>
      <div class="dl-box"><div class="dl-name"></div><div class="dl-text"></div><div class="dl-next">▼ 클릭</div></div>`;
    d.classList.add('show');
    let i = -1, typing = null, full = '';
    const textEl = $('.dl-text', d);
    const finish = () => { clearInterval(typing); d.classList.remove('show'); d.innerHTML = ''; d.onclick = null; window.removeEventListener('keydown', key); resolve(); };
    const next = () => {
      if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; return; }
      i++;
      if (i >= lines.length) return finish();
      const L = lines[i], c = CARDS[L.who];
      const side = speakerSide(L.who);
      const ch = $(`.dl-char.${side}`, d), other = $(`.dl-char.${side === 'left' ? 'right' : 'left'}`, d);
      ch.style.backgroundImage = `url('${fullOf(c)}')`; ch.classList.remove('dim'); other.classList.add('dim');
      $('.dl-name', d).textContent = c ? c.n : L.who;
      full = L.text; let k = 0; textEl.textContent = '';
      Audio2.play('card', 0.4);
      typing = setInterval(() => { k += 2; textEl.textContent = full.slice(0, k); if (k >= full.length) { clearInterval(typing); typing = null; } }, 22);
    };
    const key = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); next(); } if (e.key === 'Escape') finish(); };
    d.onclick = e => { if (e.target.classList.contains('dl-skip')) { finish(); return; } next(); };
    window.addEventListener('keydown', key);
    next();
  });
}
