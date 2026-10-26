// ===== 저장 데이터 (localStorage) =====
const STORE_KEY = 'lao_tcg_save_v1';

const Store = {
  data: null,
  defaults() {
    return {
      v: 1,
      decks: [],                 // { id, name, cards }
      activeDeck: 'preset:0',    // 'preset:N' | 사용자 덱 id
      settings: { bgm: 0.45, sfx: 0.7, speed: 1, forecast: true, autoLevel: false, tips: true },
      campaign: { stars: {}, difficulty: 'normal', cleared: {}, hardCleared: {} },
      record: { w: 0, l: 0, streak: 0 },
      secretary: 'PECS_Orangeade',  // 로비 캐릭터 (기본: 주인공 오렌지에이드)
      lobbyBg: 'barracks',       // 로비 배경 (업적으로 해금)
      storyV: 3,
      tutorialDone: false,
      seenIntro: false,
      unlocked: [],              // 해금한 카드 id
      secretaries: [],           // 해금한 특별 부관 id
      stats: { wins: 0, kills: 0, factionsWon: [], fairStreak: 0 }, // 업적용 누적 기록 (쉬움 AI 상대 승리 제외)
      ach: {},                   // 달성한 업적 id → 달성 시각
      bp: 0,                     // 보급 포인트 (보급소에서 카드 해금에 쓴다)
      supplyV: 1,                // 보급소 도입 표시 (도입 전 저장은 보급 카드를 모두 가진 것으로 친다)
      mastery: {},               // 카드 숙련도: 카드 id → 그 카드가 든 덱으로 보통 이상 상대에게 이긴 횟수
      gauntlet: { run: null, best: 0, clears: 0, bestClearHp: 0, runs: 0 }, // 리그 순회전
      daily: { lastWin: null, wins: 0, tries: 0 },             // 오늘의 대국
    };
  },
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { d = null; }
    const def = this.defaults();
    if (!d || typeof d !== 'object') d = def;
    // 스토리 개편(v2): 주인공 오렌지에이드를 기본 로비 캐릭터로 (필드 보정 전에 판단)
    if (d !== def && d.storyV !== 3) { d.storyV = 3; if (!d.secretary || d.secretary === '3P_ConstantiaS2') d.secretary = 'PECS_Orangeade'; }
    // 보급소 도입 전부터 하던 저장이면 지금까지 쓰던 카드를 빼앗지 않도록 보급 카드를 모두 준다
    if (d !== def && d.supplyV === undefined) {
      const played = d.tutorialDone || (d.record && (d.record.w + d.record.l) > 0);
      d.supplyV = 1;
      if (played) d.unlocked = [...new Set([...(Array.isArray(d.unlocked) ? d.unlocked : []), ...SUPPLY_CARDS])];
    }
    // 누락 필드 보정
    for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
    d.settings = { ...def.settings, ...(d.settings || {}) };
    d.campaign = { ...def.campaign, ...(d.campaign || {}) };
    if (!d.campaign.hardCleared || typeof d.campaign.hardCleared !== 'object') d.campaign.hardCleared = {};
    d.record = { ...def.record, ...(d.record || {}) };
    d.stats = { ...def.stats, ...(d.stats || {}) };
    d.gauntlet = { ...def.gauntlet, ...(d.gauntlet || {}) };
    d.daily = { ...def.daily, ...(d.daily || {}) };
    if (!d.ach || typeof d.ach !== 'object') d.ach = {};
    if (!d.mastery || typeof d.mastery !== 'object') d.mastery = {};
    if (!Array.isArray(d.stats.factionsWon)) d.stats.factionsWon = [];
    // 순회전 진행 정보가 깨졌으면 버린다
    if (d.gauntlet.run && !(Array.isArray(d.gauntlet.run.stages) && d.gauntlet.run.stages.every(id => CAMPAIGN.some(s => s.id === id)))) d.gauntlet.run = null;
    // 손상된 덱 제거
    if (!Array.isArray(d.unlocked)) d.unlocked = [];
    if (!Array.isArray(d.secretaries)) d.secretaries = [];
    d.decks = (d.decks || []).filter(x => x && Array.isArray(x.cards)).map(x => ({ ...x, cards: x.cards.filter(id => CARDS[id] && !CARDS[id].enemy) }));
    if (!CARDS[d.secretary] || (LOCKED_SECRETARIES.has(d.secretary) && !d.secretaries.includes(d.secretary))) d.secretary = def.secretary;
    this.data = d;
    return d;
  },
  save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(this.data)); } catch (e) { /* 저장 불가 환경 */ } },
  get settings() { return this.data.settings; },

  // ---- 덱 ----
  allDecks() {
    const presets = PRESET_DECKS.map((d, i) => ({ id: `preset:${i}`, name: d.name, cards: d.cards.slice(), preset: true, desc: d.desc }));
    return [...presets, ...this.data.decks];
  },
  getDeck(id) { return this.allDecks().find(d => d.id === id) || this.allDecks()[0]; },
  saveDeck(deck) {
    const i = this.data.decks.findIndex(d => d.id === deck.id);
    if (i >= 0) this.data.decks[i] = deck; else this.data.decks.push(deck);
    this.save();
  },
  deleteDeck(id) {
    this.data.decks = this.data.decks.filter(d => d.id !== id);
    if (this.data.activeDeck === id) this.data.activeDeck = 'preset:0';
    this.save();
  },
  newDeckId() { return 'deck_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); },

  // ---- 해금 ----
  isUnlocked(id) { return !LOCKED.has(id) || this.data.unlocked.includes(id); },
  lockedIn(cards) { return cards.filter(id => !this.isUnlocked(id)); },
  deckProblem(cards) { const e = validateDeck(cards); if (e) return e; const l = this.lockedIn(cards); return l.length ? `잠긴 카드 포함: ${l.map(id => CARDS[id].n).join(', ')}` : null; },
  secretaryUnlocked(id) { return !LOCKED_SECRETARIES.has(id) || this.data.secretaries.includes(id); },
  // 스테이지 결과 반영 후 새로 해금된 보상 목록을 돌려준다
  grantRewards(stageId, won) {
    const got = { cards: [], secretaries: [] };
    if (won) (STAGE_REWARDS[stageId] || []).forEach(id => { if (!this.data.unlocked.includes(id)) { this.data.unlocked.push(id); got.cards.push(id); } });
    const total = this.totalStars();
    STAR_REWARDS.forEach(r => { if (total >= r.stars && !this.data.secretaries.includes(r.secretary)) { this.data.secretaries.push(r.secretary); got.secretaries.push(r.secretary); } });
    this.save();
    return got;
  },

  // ---- 진행 중 전투 (이어하기) ----
  saveBattle(snap) { try { localStorage.setItem(STORE_KEY + '_battle', JSON.stringify(snap)); } catch (e) {} },
  loadBattle() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY + '_battle') || 'null'); return s && s.game && s.game.v === 2 ? s : null; } catch (e) { return null; } },
  clearBattle() { try { localStorage.removeItem(STORE_KEY + '_battle'); } catch (e) {} },

  // ---- 캠페인 ----
  stageStars(id) { return this.data.campaign.stars[id] || [false, false, false]; },
  setStageResult(id, stars) {
    const prev = this.stageStars(id);
    this.data.campaign.stars[id] = prev.map((v, i) => v || stars[i]);
    if (stars[0]) this.data.campaign.cleared[id] = true;
    this.save();
  },
  stageUnlocked(idx) { return idx === 0 || !!this.data.campaign.cleared[CAMPAIGN[idx - 1].id]; },
  totalStars() { return Object.values(this.data.campaign.stars).reduce((s, a) => s + a.filter(Boolean).length, 0); },
};
