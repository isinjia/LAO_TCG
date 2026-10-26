// ===== 로딩 / 로비 / 빠른 전투 설정 =====
const BATTLE_BGS = { board: '오르카호 격납고', camp_day: '야영지 (낮)', camp_night: '야영지 (밤)', snow: '설산', mansion: '저택', corridor_dark: '어두운 복도', beach: '해변', offline: '오프라인 구역', vr: 'VR 훈련실' };
// 로비 대사: 로비 캐릭터가 오렌지에이드면 혼잣말, 아니면 오렌지에이드에게 건네는 말
const HERO_LINES = [
  '오늘도 카드 연습! 최고의 카드 마스터가 되려면 매일 한 판씩이에요.',
  '다음 리그 상대는 누구일까? 덱부터 다시 점검해 봐야지.',
  '경장은 기동에, 기동은 중장에, 중장은 경장에 강하다… 외워 뒀어요!',
  '챔피언 라비아타 씨를 이기는 그날까지, 오렌지에이드는 멈추지 않아요!',
  'AP는 2까지 남겨 둘 수 있으니까, 큰 카드를 아껴 두는 것도 작전이에요.',
];
const SECRETARY_LINES = [
  '오렌지에이드, 오늘도 한 판 어때?',
  '새 카드가 들어왔다던데, 덱을 점검해 보는 건 어때?',
  '리그 순위표 봤어? 다음 상대가 기다리고 있대.',
  '경장은 기동에, 기동은 중장에, 중장은 경장에 강하다는 것, 잊지 마세요.',
  '보호기를 중앙에 두면 양옆 레인을 모두 지킬 수 있어요.',
  '지원기는 양옆 아군의 공격력을 올려 줍니다. 배치 순서가 중요해요.',
  '덱이 바닥나면 버린 카드가 돌아옵니다. 강한 카드는 몇 번이고 다시 쓸 수 있죠.',
  'AP는 매 턴 1씩 늘어나요. 남은 AP는 2까지 이월되니 큰 카드를 아껴 둘 수도 있습니다.',
  '턴 종료 버튼에 마우스를 올리면 공격 경로가 보여요.',
];

// ---------- 로딩 ----------
// 시작 화면에서 기다리는 것은 로비에 바로 보이는 그림뿐이다. 카드 그림 약 150장(8MB)은 로비에 들어간 뒤 뒤에서 받는다.
function preloadList() {
  const sec = CARDS[Store.data.secretary] || CARDS['PECS_Orangeade'];
  return ['assets/bg/squad.jpg', `assets/bg/${Store.data.lobbyBg || 'barracks'}.jpg`, fullOf(sec), artOf(CARDS['PECS_Orangeade']),
    'assets/ui/btn_on.png', 'assets/ui/btn_off.png', 'assets/ui/panel.png', 'assets/ui/popup.png', 'assets/ui/title_bg.png'];
}
function backgroundPreloadList() {
  const list = new Set();
  Object.values(CARDS).forEach(c => { list.add(artOf(c)); if (iconOf(c)) list.add(iconOf(c)); });
  ['board', 'vr2'].forEach(b => list.add(`assets/bg/${b}.jpg`));
  ['frame_B', 'frame_A', 'frame_S', 'frame_SS', 'dlg_box', 'dlg_name', 'btn_big_on', 'btn_big_off'].forEach(n => list.add(`assets/ui/${n}.png`));
  return [...list];
}
// 네 장씩 차례로 받아 게임 조작을 방해하지 않게 한다
function preloadInBackground() {
  const queue = backgroundPreloadList();
  const next = () => { const src = queue.shift(); if (!src) return; const img = new Image(); img.onload = img.onerror = next; img.src = src; };
  for (let i = 0; i < 4; i++) next();
}
async function runLoading() {
  const el = $('#scr-loading');
  el.innerHTML = `<div class="bg-layer" style="background-image:url('assets/bg/squad.jpg')"></div>
    <div class="load-wrap">
      <div class="logo-kicker">LAST ORIGIN</div>
      <h1 class="logo-main">TACTICAL CARD GAME</h1>
      <div class="logo-ko">라스트오리진 택티컬 카드 게임</div>
      <div class="load-bar"><div class="fill"></div></div>
      <div class="load-text">전술 데이터 동기화 중… 0%</div>
    </div>`;
  const list = preloadList();
  let done = 0;
  const fill = $('.load-bar .fill', el), txt = $('.load-text', el);
  await Promise.all(list.map(src => new Promise(res => {
    const img = new Image();
    img.onload = img.onerror = () => { done++; const p = Math.round(done / list.length * 100); fill.style.width = p + '%'; txt.textContent = `전술 데이터 동기화 중… ${p}%`; res(); };
    img.src = src;
  })));
  txt.textContent = '동기화 완료';
  preloadInBackground();
  const press = h('<div class="press">화면을 클릭하여 시작</div>');
  $('.load-wrap', el).appendChild(press);
  if (/[?&]dev(&|$)/.test(location.search)) { Audio2.unlocked = true; return; }
  await new Promise(res => {
    const go = () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); res(); };
    window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
  });
  Audio2.unlocked = true;
  Audio2.play('trans');
}

// ---------- 로비 ----------
screenHooks.lobby = el => {
  Audio2.bgm('lobby');
  const sec = CARDS[Store.data.secretary];
  const rec = Store.data.record;
  const stars = Store.totalStars(), maxStars = CAMPAIGN.length * 3;
  const nextIdx = CAMPAIGN.findIndex((s, i) => Store.stageUnlocked(i) && !Store.data.campaign.cleared[s.id]);
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/${LOBBY_BGS.some(b => b.id === Store.data.lobbyBg && lobbyBgUnlocked(b)) ? Store.data.lobbyBg : 'barracks'}.jpg')"></div>
    <div class="secretary" style="background-image:url('${fullOf(sec)}')" title="클릭하여 대화"></div>
    <div class="bg-dim"></div>
    <div class="speech"><div class="who">${esc(sec.n)}</div><div class="line"></div></div>
    <div class="lobby-logo"><div class="logo-kicker">LAST ORIGIN</div><div class="logo-main">TACTICAL CARD GAME</div></div>
    <div class="lobby-top">
      <button class="icon-btn" data-a="sec" title="로비 꾸미기 (배경·캐릭터)">👤</button>
      ${document.fullscreenEnabled ? '<button class="icon-btn" data-a="full" title="전체 화면">⛶</button>' : ''}
      <button class="icon-btn" data-a="help" title="게임 방법">?</button>
      <button class="icon-btn" data-a="settings" title="설정">⚙</button>
    </div>
    <div class="lobby-menu">
      ${Store.loadBattle() ? `<div class="menu-item main resume" data-go="resume"><div class="mi-icon">▶</div><div><div class="mi-title">전투 이어하기</div><div class="mi-sub">${esc(Store.loadBattle().cfg.enemy.name)} 전 · 라운드 ${Store.loadBattle().round}</div></div></div>` : ''}
      <div class="menu-item ${Store.loadBattle() ? '' : 'main'}" data-go="campaign"><div class="mi-icon">⚔</div><div><div class="mi-title">스토리</div><div class="mi-sub">${nextIdx >= 0 ? `다음 대국: ${esc(CAMPAIGN[nextIdx].no)}. ${esc(CAMPAIGN[nextIdx].title)}` : '오르카 카드 마스터 달성!'}</div></div><div class="mi-badge">★ ${stars}/${maxStars}</div></div>
      <div class="menu-item ${Store.data.tutorialDone ? '' : 'locked'}" data-go="challenge"><div class="mi-icon">🏆</div><div><div class="mi-title">도전 모드</div><div class="mi-sub">${Store.data.tutorialDone ? `리그 순회전 · 오늘의 대국 · 업적 ${Ach.count()}/${ACHIEVEMENTS.length}` : '스토리 "첫 카드 수업"을 마치면 열립니다'}</div></div>${Store.data.tutorialDone && !Daily.doneToday() ? '<div class="mi-badge">NEW</div>' : ''}</div>
      <div class="menu-item" data-go="setup"><div class="mi-icon">⚡</div><div><div class="mi-title">자유 대국</div><div class="mi-sub">원하는 덱으로 AI와 1:1 대국</div></div></div>
      <div class="menu-item" data-go="deck"><div class="mi-icon">🗂</div><div><div class="mi-title">덱 편성</div><div class="mi-sub">12장 덱 만들기 · 저장 ${Store.data.decks.length}개</div></div></div>
      <div class="menu-item" data-go="collection"><div class="mi-icon">📖</div><div><div class="mi-title">카드 도감</div><div class="mi-sub">전투원 ${POOL.filter(c => c.kind === 'unit').length}종 · 지원 카드 ${POOL.filter(c => c.kind === 'skill').length}종</div></div></div>
      <div class="menu-item" data-go="howto"><div class="mi-icon">📘</div><div><div class="mi-title">게임 방법</div><div class="mi-sub">규칙 · 상성 · 키워드</div></div></div>
    </div>
    <div class="lobby-foot"><span>전적 <b>${rec.w}</b>승 <b>${rec.l}</b>패</span><span>연승 <b>${rec.streak}</b></span><span style="font-size:14px">${touchText('마우스를 올리면 카드 정보 · 우클릭 상세 보기')}</span></div>`;
  const speech = $('.speech', el);
  let speechTimer = null;
  const say = line => {
    $('.line', speech).textContent = touchText(line); speech.classList.add('show');
    clearTimeout(speechTimer); speechTimer = setTimeout(() => speech.classList.remove('show'), 4200);
  };
  const pool = Store.data.secretary === 'PECS_Orangeade' ? HERO_LINES : SECRETARY_LINES;
  const pick = () => pool[Math.floor(Math.random() * pool.length)];
  setTimeout(() => say(!Store.data.tutorialDone ? (Store.data.secretary === 'PECS_Orangeade' ? '좋아, 스토리 모드의 "첫 카드 수업"부터 시작하자!' : '오렌지에이드, 처음이지? 스토리 모드의 "첫 카드 수업"부터 해 봐!') : pick()), 500);
  $('.secretary', el).onclick = () => { Audio2.play('click'); say(pick()); };
  $$('.menu-item', el).forEach(m => {
    m.onmouseenter = () => Audio2.play('card', 0.5);
    m.onclick = () => {
      Audio2.play('click');
      const go = m.dataset.go;
      if (m.classList.contains('locked')) { toast('스토리 "첫 카드 수업"을 마치면 열립니다.', true); return; }
      if (go === 'howto') openHowTo();
      else if (go === 'resume') resumeBattle(Store.loadBattle());
      else showScreen(go);
    };
  });
  $('[data-a=settings]', el).onclick = () => openSettings(false);
  $('[data-a=help]', el).onclick = () => openHowTo();
  const full = $('[data-a=full]', el);
  if (full) full.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); };
  $('[data-a=sec]', el).onclick = () => chooseSecretary();
};

function chooseSecretary() {
  const box = h(`<div class="modal-box" style="width:1500px"><h3>로비 꾸미기</h3><p>로비 배경과 캐릭터를 고르세요. 배경은 업적으로, 특별 캐릭터는 스토리 별로 해금됩니다.</p>
    <div class="bg-pick">${LOBBY_BGS.map(b => `<div class="bgp ${b.id === Store.data.lobbyBg ? 'on' : ''} ${lobbyBgUnlocked(b) ? '' : 'locked'}" data-bg="${b.id}" style="background-image:url('assets/bg/${b.id}.jpg')"><span>${esc(b.name)}${lobbyBgUnlocked(b) ? '' : `<small>업적 「${esc(ACHIEVEMENTS.find(a => a.id === b.ach).name)}」</small>`}</span></div>`).join('')}</div>
    <div class="pile-view scroll" style="grid-template-columns:repeat(7,170px);max-height:520px"></div></div>`);
  $$('.bgp', box).forEach(el => el.onclick = () => {
    const bg = LOBBY_BGS.find(b => b.id === el.dataset.bg);
    if (!lobbyBgUnlocked(bg)) { toast(`해금 조건: 업적 「${ACHIEVEMENTS.find(a => a.id === bg.ach).name}」`, true); return; }
    Store.data.lobbyBg = bg.id; Store.save(); closeModal(m); showScreen('lobby', { instant: true });
  });
  const grid = $('.pile-view', box);
  const bosses = STAR_REWARDS.map(r => CARDS[r.secretary]);
  [CARDS['PECS_Orangeade'], ...bosses, ...POOL.filter(c => c.kind === 'unit' && c.id !== 'PECS_Orangeade')].forEach(c => {
    const ce = cardEl(c, { w: 170 });
    const ok = Store.secretaryUnlocked(c.id);
    if (!ok) { ce.classList.add('locked'); ce.dataset.lock = unlockSource(c.id); }
    if (c.id === Store.data.secretary) ce.classList.add('in-deck');
    ce.onclick = () => {
      if (!ok) { toast(`해금 조건: ${unlockSource(c.id)}`, true); return; }
      Store.data.secretary = c.id; Store.save(); closeModal(m); showScreen('lobby', { instant: true });
    };
    grid.appendChild(ce);
  });
  const m = openModal(box);
}

// ---------- 빠른 전투 설정 ----------
const setupState = { myDeck: null, oppDeck: 'random', level: 'normal', first: 'random', bg: 'board' };
screenHooks.setup = el => {
  Audio2.bgm('lobby');
  if (!setupState.myDeck) setupState.myDeck = Store.data.activeDeck;
  const decks = Store.allDecks();
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/${setupState.bg}.jpg');opacity:.35"></div>
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>자유 대국</h2><span class="sub">덱과 상대를 고르고 대국을 시작하세요</span><span class="spacer"></span><button class="btn primary big" data-a="go">대국 시작</button></div>
    <div class="setup-wrap">
      <div class="panel setup-col"><h3>내 덱</h3><div class="deck-cards scroll" data-list="my"></div><button class="btn small" data-a="edit">덱 편성으로 이동</button></div>
      <div class="panel setup-col"><h3>상대</h3><div class="deck-cards scroll" data-list="opp" style="flex:0 0 auto;max-height:470px"></div>
        <div class="setup-opts">
          <span>AI 난이도</span><div class="seg" data-k="level"><button data-v="easy">쉬움</button><button data-v="normal">보통</button><button data-v="hard">어려움</button></div>
          <span>선공</span><div class="seg" data-k="first"><button data-v="random">무작위</button><button data-v="me">내가 선공</button><button data-v="ai">상대 선공</button></div>
          <span>전장</span><select data-k="bg">${Object.entries(BATTLE_BGS).map(([k, v]) => `<option value="${k}" ${k === setupState.bg ? 'selected' : ''}>${v}</option>`).join('')}</select>
        </div>
      </div>
    </div>`;
  const deckCard = (d, on, list) => {
    const err = d.story ? null : Store.deckProblem(d.cards); // 스토리 상대 덱은 특수 카드가 있어도 상대로는 쓸 수 있다
    const facs = [...new Set(d.cards.map(id => CARDS[id] && CARDS[id].f).filter(Boolean))];
    const top = d.cards.map(id => CARDS[id]).filter(c => c && c.kind === 'unit').sort((a, b) => b.c - a.c)[0];
    const dc = h(`<div class="deck-card ${on ? 'on' : ''} ${err ? 'invalid' : ''}">
      ${top ? `<div class="dc-art" style="background-image:url('${artOf(top)}')"></div>` : ''}
      <div class="dc-name">${esc(d.name)}</div>
      <div class="dc-desc">${err ? esc(err) : esc(d.desc || `${d.cards.length}장 사용자 덱`)}</div>
      <div class="dc-chips">${facs.map(f => `<span class="chip" style="background:${FACTIONS[f].color}">${FACTIONS[f].name}</span>`).join('')}</div></div>`);
    return dc;
  };
  const renderLists = () => {
    const my = $('[data-list=my]', el); my.innerHTML = '';
    decks.forEach(d => {
      const dc = deckCard(d, d.id === setupState.myDeck);
      dc.onclick = () => { if (Store.deckProblem(d.cards)) { toast(Store.deckProblem(d.cards), true); return; } setupState.myDeck = d.id; Audio2.play('click'); renderLists(); };
      my.appendChild(dc);
    });
    const opp = $('[data-list=opp]', el); opp.innerHTML = '';
    const rnd = h(`<div class="deck-card ${setupState.oppDeck === 'random' ? 'on' : ''}"><div class="dc-name">🎲 무작위 프리셋 덱</div><div class="dc-desc">4종 프리셋 중 하나를 무작위로 고릅니다.</div></div>`);
    rnd.onclick = () => { setupState.oppDeck = 'random'; Audio2.play('click'); renderLists(); };
    opp.appendChild(rnd);
    decks.filter(d => !validateDeck(d.cards)).forEach(d => {
      const dc = deckCard(d, d.id === setupState.oppDeck);
      dc.onclick = () => { setupState.oppDeck = d.id; Audio2.play('click'); renderLists(); };
      opp.appendChild(dc);
    });
    // 이긴 적 있는 스토리 상대의 덱 (철충 특수 카드 포함)
    CAMPAIGN.filter(s => !s.tutorial && Store.data.campaign.cleared[s.id]).forEach(s => {
      const id = 'story:' + s.id;
      const dc = deckCard({ name: s.enemy.name, cards: s.enemy.deck, desc: `스토리 ${s.no}. ${s.title}의 덱`, story: true }, setupState.oppDeck === id);
      dc.onclick = () => { setupState.oppDeck = id; Audio2.play('click'); renderLists(); };
      opp.appendChild(dc);
    });
  };
  renderLists();
  $$('.seg', el).forEach(seg => {
    const k = seg.dataset.k;
    $$('button', seg).forEach(b => { b.classList.toggle('on', b.dataset.v === setupState[k]); b.onclick = () => { setupState[k] = b.dataset.v; $$('button', seg).forEach(x => x.classList.toggle('on', x === b)); Audio2.play('click'); }; });
  });
  $('select[data-k=bg]', el).onchange = e => { setupState.bg = e.target.value; $('.bg-layer', el).style.backgroundImage = `url('assets/bg/${setupState.bg}.jpg')`; };
  $('[data-a=back]', el).onclick = () => showScreen('lobby');
  $('[data-a=edit]', el).onclick = () => showScreen('deck');
  $('[data-a=go]', el).onclick = async () => {
    if (!await confirmAbandon()) return;
    const my = Store.getDeck(setupState.myDeck);
    if (Store.deckProblem(my.cards)) { toast(Store.deckProblem(my.cards), true); return; }
    const story = setupState.oppDeck.startsWith('story:') ? CAMPAIGN.find(s => 'story:' + s.id === setupState.oppDeck) : null;
    const opp = story ? { name: story.enemy.name, cards: story.enemy.deck } : setupState.oppDeck === 'random' ? Store.allDecks()[Math.floor(Math.random() * PRESET_DECKS.length)] : Store.getDeck(setupState.oppDeck);
    Store.data.activeDeck = my.id; Store.save();
    const top = opp.cards.map(id => CARDS[id]).filter(c => c.kind === 'unit').sort((a, b) => b.c - a.c || (b.g > a.g ? 1 : -1))[0];
    startBattle({
      mode: 'quick', myDeck: my.cards, myDeckName: my.name,
      enemy: { name: opp.name.replace(/\s*\(.*\)$/, ''), deck: opp.cards, level: setupState.level, portrait: story ? story.enemy.portrait : top.id, hp: RULES.CMD_HP },
      first: setupState.first, bg: setupState.bg, bgm: ['battle1', 'battle2', 'battle3'][Math.floor(Math.random() * 3)],
    });
  };
};
