// ===== 도전 모드: 리그 순회전 · 오늘의 대국 · 업적 =====

// ---------- 업적 ----------
// test(ctx): 대국이 끝날 때마다 호출. ctx = { win, mode, level, round, hp, kills, userDeck, factions }
// test(ctx): 대국이 끝날 때마다 호출. ctx = { win, fair(쉬움이 아닌 상대에게 승리), mode, level, round, hp, kills, userDeck, factions }
const ACHIEVEMENTS = [
  { id: 'win1', name: '첫 승리', desc: '대국에서 처음으로 승리한다.', test: c => c.win },
  { id: 'win10', name: '리그의 신성', desc: '보통 이상 상대에게 10번 승리한다.', test: c => c.stats.wins >= 10 },
  { id: 'win50', name: '베테랑', desc: '보통 이상 상대에게 50번 승리한다.', test: c => c.stats.wins >= 50 },
  { id: 'streak5', name: '연승 행진', desc: '보통 이상 상대에게 5연승한다.', test: c => c.stats.fairStreak >= 5 },
  { id: 'story', name: '오르카 카드 마스터', desc: '스토리 결승에서 승리한다.', test: () => !!Store.data.campaign.cleared.s8 },
  { id: 'stars', name: '완벽주의자', desc: '스토리 별 27개를 모두 모은다.', test: () => Store.totalStars() >= CAMPAIGN.length * 3 },
  { id: 'exstory', name: '붉은 시뮬레이션 종결', desc: '외전 결전 「오메가」에서 승리한다.', test: () => !!Store.data.campaign.cleared.ex4 },
  { id: 'hardstory', name: '어려움 정복', desc: '스토리 난이도 어려움으로 결승에서 승리한다.', test: () => !!Store.data.campaign.hardCleared.s8 },
  { id: 'hardall', name: '전 리그 제패', desc: '스토리 여덟 대국을 모두 어려움 난이도로 이긴다.', test: () => CAMPAIGN.every(s => s.tutorial || Store.data.campaign.hardCleared[s.id]) },
  { id: 'flawless', name: '무결점', desc: '보통 이상 상대에게 라이프를 하나도 잃지 않고 승리한다.', test: c => c.fair && c.hp >= c.maxHp },
  { id: 'comeback', name: '기사회생', desc: '보통 이상 상대에게 라이프 3 이하로 승리한다.', test: c => c.fair && c.hp <= 3 },
  { id: 'blitz', name: '전격전', desc: '보통 이상 상대에게 6라운드 안에 승리한다.', test: c => c.fair && c.round <= 6 },
  { id: 'reaper', name: '전장 정리', desc: '보통 이상 상대와의 한 대국에서 적 전투원을 8기 처치한다.', test: c => c.level !== 'easy' && c.kills >= 8 },
  { id: 'hard', name: '정예 격파', desc: '어려움 인공지능을 상대로 승리한다.', test: c => c.win && c.level === 'hard' },
  { id: 'mydeck', name: '나만의 전술', desc: '직접 만든 덱으로 보통 이상 상대에게 승리한다.', test: c => c.fair && c.userDeck },
  { id: 'factions', name: '오르카의 모든 제작사', desc: '다섯 제작사를 각각 넣은 덱으로 보통 이상 상대에게 한 번씩 승리한다.', test: c => c.stats.factionsWon.length >= 5 },
  { id: 'gauntlet', name: '순회전 돌파', desc: '리그 순회전 5연전을 끝까지 이긴다.', test: () => Store.data.gauntlet.clears >= 1 },
  { id: 'gauntlet15', name: '여유로운 순회', desc: '라이프 15 이상 남기고 리그 순회전을 돌파한다.', test: () => Store.data.gauntlet.bestClearHp >= 15 },
  { id: 'daily1', name: '오늘의 승자', desc: '오늘의 대국에서 승리한다.', test: () => Store.data.daily.wins >= 1 },
  { id: 'daily3', name: '꾸준함', desc: '서로 다른 3일 동안 오늘의 대국에서 승리한다.', test: () => Store.data.daily.wins >= 3 },
  { id: 'daily7', name: '개근상', desc: '서로 다른 7일 동안 오늘의 대국에서 승리한다.', test: () => Store.data.daily.wins >= 7 },
];

// 업적 보상: 로비 배경 (첫 번째는 기본)
const LOBBY_BGS = [
  { id: 'barracks', name: '오르카호 숙소' },
  { id: 'camp_day', name: '야영지', ach: 'win10' },
  { id: 'beach', name: '해변', ach: 'daily3' },
  { id: 'mansion', name: '저택', ach: 'gauntlet' },
  { id: 'snow_night', name: '설산의 밤', ach: 'daily7' },
  { id: 'camp_night', name: '야영지의 밤', ach: 'stars' },
  { id: 'blacksun', name: '검은 태양', ach: 'hardstory' },
  { id: 'red_boss', name: '붉은 서버', ach: 'exstory' },
];
function lobbyBgUnlocked(bg) { return !bg.ach || !!Store.data.ach[bg.ach]; }

const Ach = {
  has(id) { return !!Store.data.ach[id]; },
  count() { return ACHIEVEMENTS.filter(a => this.has(a.id)).length; },
  // 대국 결과를 반영하고 새로 달성한 업적 목록을 돌려준다
  record(info) {
    const st = Store.data.stats;
    info.fair = info.win && info.level !== 'easy'; // 쉬움 인공지능 상대 승리는 누적 업적에 세지 않는다
    if (info.fair) {
      st.wins++; st.fairStreak = (st.fairStreak || 0) + 1;
      info.factions.forEach(f => { if (!st.factionsWon.includes(f)) st.factionsWon.push(f); });
    } else if (!info.win) st.fairStreak = 0;
    st.kills += info.kills;
    const ctx = { ...info, stats: st, streak: Store.data.record.streak };
    const got = ACHIEVEMENTS.filter(a => !this.has(a.id) && a.test(ctx));
    got.forEach(a => { Store.data.ach[a.id] = Date.now(); });
    Store.save();
    return got;
  },
};

// ---------- 리그 순회전 ----------
// 스토리 상대 다섯 명과 연달아 대국한다. 라이프는 다음 대국으로 이어지고, 이길 때마다 조금 회복한다.
// 상대 라이프는 스테이지와 상관없이 ENEMY_HP로 고정한다 (보통 AI 플레이어 기준 돌파율 약 13%)
const GAUNTLET = { MATCHES: 5, HEAL: 14, ENEMY_HP: 14, LEVELS: ['easy', 'normal', 'normal', 'normal', 'hard'] };
// 대국마다 고를 수 있는 스토리 스테이지 (뒤로 갈수록 강한 상대)
const GAUNTLET_POOL = [['s1', 's2', 's3'], ['s2', 's3', 's4'], ['s4', 's5', 's6'], ['s6', 's7'], ['s7', 's8']];

const Gauntlet = {
  get run() { return Store.data.gauntlet.run; },
  async start(deckId) {
    if (!await confirmAbandon()) return;
    abandonSavedBattle();
    const picked = [];
    GAUNTLET_POOL.forEach(pool => {
      const opts = pool.filter(id => !picked.includes(id));
      picked.push(opts[Math.floor(Math.random() * opts.length)]);
    });
    const deck = Store.getDeck(deckId);
    Store.data.gauntlet.run = { deckId, deckName: deck.name, cards: deck.cards.slice(), stages: picked, idx: 0, hp: RULES.CMD_HP }; // 덱은 시작 시점으로 고정
    Store.data.gauntlet.runs++;
    Store.save();
    this.play();
  },
  async play() {
    const r = this.run; if (!r) return;
    // 이 대국을 하다 나갔다면 새로 시작하지 않고 이어서 한다
    const saved = Store.loadBattle();
    if (saved && saved.cfg.mode === 'gauntlet' && saved.cfg.gauntlet.idx === r.idx) { resumeBattle(saved); return; }
    if (!await confirmAbandon()) return;
    abandonSavedBattle();
    if (!this.run) return;
    const deck = r.cards ? { cards: r.cards, name: r.deckName, preset: false } : Store.getDeck(r.deckId);
    if (Store.deckProblem(deck.cards)) { toast(Store.deckProblem(deck.cards), true); return; }
    const st = CAMPAIGN.find(s => s.id === r.stages[r.idx]);
    startBattle({
      mode: 'gauntlet', myDeck: deck.cards, myDeckName: deck.name, myHp: r.hp, userDeck: !String(r.deckId).startsWith('preset:'),
      enemy: { ...st.enemy, hp: GAUNTLET.ENEMY_HP, level: GAUNTLET.LEVELS[r.idx] },
      first: 'random', bg: st.bg, bgm: r.idx === GAUNTLET.MATCHES - 1 ? 'boss2' : st.bgm,
      gauntlet: { idx: r.idx, total: GAUNTLET.MATCHES },
    });
  },
  // 대국 결과 반영. 결과 화면에 띄울 문구를 돌려준다
  finish(win, hpLeft) {
    const g = Store.data.gauntlet, r = g.run; if (!r) return '';
    let note;
    if (win && r.idx + 1 >= GAUNTLET.MATCHES) {
      g.clears++; g.best = GAUNTLET.MATCHES; g.bestClearHp = Math.max(g.bestClearHp, hpLeft); g.run = null;
      note = `리그 순회전 돌파! 남은 라이프 ${hpLeft}`;
    } else if (win) {
      r.idx++; r.hp = Math.min(RULES.CMD_HP, hpLeft + GAUNTLET.HEAL); g.best = Math.max(g.best, r.idx);
      note = `순회전 ${r.idx}/${GAUNTLET.MATCHES} 돌파 — 다음 대국은 라이프 ${r.hp}로 시작합니다${r.hp > hpLeft ? ` (+${r.hp - hpLeft} 회복)` : ''}`;
    } else {
      g.best = Math.max(g.best, r.idx); g.run = null;
      note = `순회전 종료 — ${r.idx}/${GAUNTLET.MATCHES} 돌파`;
    }
    Store.save();
    return note;
  },
};

// ---------- 오늘의 대국 ----------
// 날짜마다 정해지는 상대(스토리 상대 7명 + 프리셋 덱 4종)와 특수 조건 8종. 조건마다 상대 인공지능 수준이 다르다.
// 보통 AI 플레이어 기준 전체 승률 약 40% (조건별 35~48%)로 맞췄다.
const DAILY_TWISTS = [
  { name: '철벽 상대', desc: '상대 라이프 +4', level: 'normal', apply: c => { c.enemy.hp += 4; } },
  { name: '벼랑 끝', desc: '내 라이프 18로 시작', level: 'normal', apply: c => { c.myHp = 18; } },
  { name: '선제 배치', desc: '상대가 중앙 레인에 전투원을 미리 배치하고 시작', level: 'normal', apply: (c, rnd) => {
    const units = c.enemy.deck.filter(id => CARDS[id].kind === 'unit' && CARDS[id].c <= 4);
    c.enemy.start = [{ lane: 1, id: units[Math.floor(rnd() * units.length)] }];
  } },
  { name: '후공 강요', desc: '항상 상대가 먼저 시작', level: 'normal', apply: c => { c.first = 'ai'; } },
  { name: '단기 결전', desc: '상대 라이프 14, 내 라이프 18 · 상대 어려움', level: 'hard', apply: c => { c.enemy.hp = 14; c.myHp = 18; } },
  { name: '정예 지휘관', desc: '상대 어려움 인공지능, 상대 라이프 16', level: 'hard', apply: c => { c.enemy.hp = 16; } },
  { name: '물량 공세', desc: '상대가 먼저 시작하고 상대 라이프 +2', level: 'normal', apply: c => { c.first = 'ai'; c.enemy.hp += 2; } },
  { name: '역전의 기회', desc: '양쪽 라이프 14', level: 'normal', apply: c => { c.myHp = 14; c.enemy.hp = 14; } },
];

function todayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
// 날짜 문자열로 만드는 재현 가능한 난수
function seededRandom(seed) {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}
// 오늘의 대국 상대 후보
function dailyOpponents() {
  const fromStory = CAMPAIGN.filter(s => !s.tutorial && s.id !== 's1').map(s => ({ name: s.enemy.name, portrait: s.enemy.portrait, deck: s.enemy.deck, hp: RULES.CMD_HP, start: s.start || [], bg: s.bg, bgm: s.bgm, sub: `${s.title}의 덱` }));
  const presets = PRESET_DECKS.map(d => {
    const top = d.cards.map(id => CARDS[id]).filter(c => c.kind === 'unit').sort((a, b) => b.c - a.c)[0];
    return { name: d.name.replace(/\s*\(.*\)$/, ''), portrait: top.id, deck: d.cards, hp: RULES.CMD_HP, start: [], bg: 'board', bgm: 'battle2', sub: '프리셋 덱' };
  });
  return [...fromStory, ...presets];
}

const Daily = {
  info(day = todayKey()) {
    const rnd = seededRandom('lao-daily-' + day);
    const opps = dailyOpponents();
    const opp = opps[Math.floor(rnd() * opps.length)];
    const twist = DAILY_TWISTS[Math.floor(rnd() * DAILY_TWISTS.length)];
    return { day, opp, twist, rnd };
  },
  // 오늘의 대국 설정 (화면과 시뮬레이션이 같이 쓴다)
  config(day, deck) {
    const { opp, twist, rnd } = this.info(day);
    const cfg = {
      mode: 'daily', myDeck: deck.cards, myDeckName: deck.name, userDeck: !deck.preset,
      enemy: { name: opp.name, portrait: opp.portrait, deck: opp.deck.slice(), hp: opp.hp, start: opp.start.slice(), level: twist.level },
      first: 'random', bg: opp.bg, bgm: opp.bgm, daily: { day, twist: twist.name },
    };
    twist.apply(cfg, rnd);
    return cfg;
  },
  doneToday() { return Store.data.daily.lastWin === todayKey(); },
  async play(deckId) {
    if (!await confirmAbandon()) return;
    const deck = Store.getDeck(deckId);
    if (Store.deckProblem(deck.cards)) { toast(Store.deckProblem(deck.cards), true); return; }
    const cfg = this.config(todayKey(), deck);
    Store.data.daily.tries++; Store.save();
    startBattle(cfg);
  },
  finish(win, day) {
    const d = Store.data.daily;
    if (!win) { Store.save(); return '오늘의 대국은 몇 번이든 다시 도전할 수 있습니다.'; }
    if (d.lastWin === day) return '오늘의 대국은 이미 승리했습니다. 내일 새로운 상대가 기다립니다.';
    d.wins++; d.lastWin = day; Store.save();
    return `오늘의 대국 승리! 지금까지 ${d.wins}일 승리했습니다.`;
  },
};

// ---------- 대국 종료 처리 (결과 화면에서 호출) ----------
function recordChallengeResult({ win, surrendered, game, me, cfg }) {
  let note = '';
  if (cfg.mode === 'gauntlet') note = Gauntlet.finish(win && !surrendered, me.hp);
  if (cfg.mode === 'daily') note = Daily.finish(win && !surrendered, cfg.daily.day);
  const before = LOBBY_BGS.filter(lobbyBgUnlocked).length;
  const achievements = Ach.record({
    win: win && !surrendered, mode: cfg.mode, level: cfg.enemy.level, round: game.round(), hp: me.hp, maxHp: me.maxHp,
    kills: me.stats.kills, userDeck: !!cfg.userDeck, factions: [...new Set(cfg.myDeck.map(id => CARDS[id].f))],
  });
  const newBgs = LOBBY_BGS.filter(lobbyBgUnlocked).length > before ? LOBBY_BGS.filter(b => b.ach && achievements.some(a => a.id === b.ach)) : [];
  return { note, achievements, newBgs };
}

// ---------- 도전 모드 화면 ----------
const challengeState = { deck: null };
screenHooks.challenge = el => {
  Audio2.bgm('lobby');
  const decks = Store.allDecks().filter(d => !Store.deckProblem(d.cards));
  if (!challengeState.deck || !decks.some(d => d.id === challengeState.deck)) challengeState.deck = decks.some(d => d.id === Store.data.activeDeck) ? Store.data.activeDeck : decks[0].id;
  const g = Store.data.gauntlet, run = g.run;
  const dly = Daily.info(), done = Daily.doneToday();
  const runStage = run ? CAMPAIGN.find(s => s.id === run.stages[run.idx]) : null;
  el.innerHTML = `
    <div class="bg-layer" style="background-image:url('assets/bg/squad.jpg');opacity:.3"></div>
    <div class="title-bar"><button class="btn small" data-a="back">← 로비</button><h2>도전 모드</h2><span class="sub">스토리 뒤에도 계속 즐길 수 있는 대국</span><span class="spacer"></span>
      <span class="sub">사용할 덱</span><select class="ch-deck">${decks.map(d => `<option value="${d.id}" ${d.id === challengeState.deck ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</select></div>
    <div class="ch-wrap">
      <div class="panel ch-col">
        <div class="ch-kicker">GAUNTLET</div><h3>리그 순회전</h3>
        <p>스토리 상대 다섯 명과 연달아 대국합니다. 라이프는 다음 대국으로 이어지고, 이길 때마다 ${GAUNTLET.HEAL}씩 회복합니다. 상대 라이프는 ${GAUNTLET.ENEMY_HP}이고, 마지막 대국의 상대는 어려움 인공지능입니다.</p>
        <div class="ch-path">${Array.from({ length: GAUNTLET.MATCHES }, (_, i) => {
          const st = run ? CAMPAIGN.find(s => s.id === run.stages[i]) : null;
          const state = !run ? '' : i < run.idx ? 'done' : i === run.idx ? 'now' : '';
          return `<div class="ch-node ${state}"><div class="cn-face" style="${st ? `background-image:url('${artOf(CARDS[st.enemy.portrait])}')` : ''}">${st ? '' : '?'}</div><span>${i + 1}</span></div>`;
        }).join('<i></i>')}</div>
        <div class="ch-stats"><div><span>최고 기록</span><b>${g.best}/${GAUNTLET.MATCHES}</b></div><div><span>돌파 횟수</span><b>${g.clears}</b></div><div><span>최고 남은 라이프</span><b>${g.bestClearHp || '-'}</b></div></div>
        ${run ? `<div class="ch-now">진행 중: ${run.idx + 1}번째 대국 · ${esc(runStage.enemy.name)} · 내 라이프 ${run.hp}${run.deckName ? ` · 덱 「${esc(run.deckName)}」 고정` : ""}</div>` : ''}
        <div class="ch-actions">${run ? '<button class="btn" data-a="g-quit">포기</button><button class="btn primary big" data-a="g-go">이어서 대국</button>' : '<button class="btn primary big" data-a="g-new">순회전 시작</button>'}</div>
      </div>
      <div class="panel ch-col">
        <div class="ch-kicker">DAILY · ${dly.day}</div><h3>오늘의 대국</h3>
        <div class="ch-daily">
          <div class="cd-face" style="background-image:url('${artOf(CARDS[dly.opp.portrait])}')"></div>
          <div><div class="cd-name">${esc(dly.opp.name)}</div><div class="cd-sub">${esc(dly.opp.sub)} · ${dly.twist.level === 'hard' ? '어려움' : '보통'} 인공지능</div>
            <div class="cd-twist"><b>${esc(dly.twist.name)}</b>${esc(dly.twist.desc)}</div></div>
        </div>
        <p>날마다 상대와 특수 조건이 바뀝니다. 승리한 날짜 수가 기록됩니다.</p>
        <div class="ch-stats"><div><span>오늘</span><b>${done ? '승리' : '도전 전'}</b></div><div><span>승리한 날</span><b>${Store.data.daily.wins}</b></div><div><span>도전 횟수</span><b>${Store.data.daily.tries}</b></div></div>
        <div class="ch-actions"><button class="btn primary big" data-a="d-go">${done ? '다시 대국' : '오늘의 대국 시작'}</button></div>
      </div>
      <div class="panel ch-col ch-ach">
        <div class="ch-kicker">ACHIEVEMENTS</div><h3>업적 <small>${Ach.count()} / ${ACHIEVEMENTS.length}</small></h3>
        <div class="ach-list scroll">${ACHIEVEMENTS.map(a => `<div class="ach ${Ach.has(a.id) ? 'on' : ''}"><span class="lo-star ${Ach.has(a.id) ? 'on' : ''}"></span><div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${LOBBY_BGS.some(b => b.ach === a.id) ? `<em>보상: 로비 배경 「${esc(LOBBY_BGS.find(b => b.ach === a.id).name)}」</em>` : ''}</div></div>`).join('')}</div>
      </div>
    </div>`;
  $('.ch-deck', el).onchange = e => { challengeState.deck = e.target.value; };
  $('[data-a=back]', el).onclick = () => showScreen('lobby');
  const gNew = $('[data-a=g-new]', el); if (gNew) gNew.onclick = () => Gauntlet.start(challengeState.deck);
  const gGo = $('[data-a=g-go]', el); if (gGo) gGo.onclick = () => Gauntlet.play();
  const gQuit = $('[data-a=g-quit]', el);
  if (gQuit) gQuit.onclick = async () => {
    if (!await confirmBox('순회전 포기', '진행 중인 리그 순회전을 포기할까요? 지금까지의 돌파 수는 최고 기록에 반영됩니다.', '포기', true)) return;
    g.best = Math.max(g.best, run.idx); g.run = null; Store.save(); showScreen('challenge', { instant: true });
  };
  $('[data-a=d-go]', el).onclick = () => Daily.play(challengeState.deck);
};
