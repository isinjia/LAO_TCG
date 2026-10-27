// ===== 보급 원정 (드래프트) 규칙 =====
// 제작사 두 곳을 고른 뒤, 세 장 중 한 장씩 12번 골라 덱을 만들고 연달아 배틀한다.
// 화면과 상관없는 부분만 두어 시뮬레이션(tools/draft_sim.js)에서도 같은 규칙을 쓴다.
const DRAFT = {
  // 다섯 번 이기면 돌파, 세 번 지면 끝. 보통 AI 플레이어가 드래프트하면 돌파율 약 18%, 평균 2.8승
  MATCHES: 5, LOSSES: 3,
  LEVELS: ['easy', 'normal', 'normal', 'normal', 'hard'],
  ENEMY_HP: 14,
  MAX_SKILLS: 4,                               // 지원 카드는 4장까지만 제시한다
  WEIGHT: { B: 4, A: 3, S: 2, SS: 1 },        // 등급별 등장 비중
};

// 서로 다른 제작사 두 곳 묶음 세 가지
function draftFactionChoices(rnd) {
  const pairs = [];
  for (let i = 0; i < PLAYER_FACTIONS.length; i++) for (let j = i + 1; j < PLAYER_FACTIONS.length; j++) pairs.push([PLAYER_FACTIONS[i], PLAYER_FACTIONS[j]]);
  return shuffle(pairs, rnd).slice(0, 3);
}

function draftPool(factions) {
  return Object.values(CARDS).filter(c => factions.includes(c.f) && !c.enemy && !c.token && c.id !== COMMAND_CARD.id);
}

// 이번에 제시할 카드 세 장. 이미 고른 카드는 빼고, 등급 비중으로 뽑는다.
// 싼 카드(비용 3 이하)가 모자라면 한 장은 꼭 싼 카드로 채워 덱이 굳지 않게 한다.
function draftOffer(factions, picks, rnd) {
  const skills = picks.filter(id => CARDS[id].kind === 'skill').length;
  let pool = draftPool(factions).filter(c => !picks.includes(c.id) && (c.kind === 'unit' || skills < DRAFT.MAX_SKILLS));
  const offer = [];
  const take = list => {
    const total = list.reduce((s, c) => s + DRAFT.WEIGHT[c.g], 0);
    let r = rnd() * total;
    for (const c of list) { r -= DRAFT.WEIGHT[c.g]; if (r <= 0) return c; }
    return list[list.length - 1];
  };
  const cheapPicked = picks.filter(id => CARDS[id].c <= 3).length;
  const cheapNeeded = Math.max(0, 5 - cheapPicked) > (RULES.DECK_SIZE - picks.length - 1);
  if (cheapNeeded || cheapPicked < Math.ceil(picks.length / 2)) {
    const cheap = pool.filter(c => c.c <= 3);
    if (cheap.length) { const c = take(cheap); offer.push(c); pool = pool.filter(x => x !== c); }
  }
  while (offer.length < 3 && pool.length) { const c = take(pool); offer.push(c); pool = pool.filter(x => x !== c); }
  return offer.map(c => c.id);
}

// 배틀 상대 다섯 명: 뒤로 갈수록 스토리 후반 상대가 나오도록 고른다
function draftOpponents(rnd) {
  const story = CAMPAIGN.filter(s => !s.tutorial && s.chapter !== 'ex');
  // 단계는 실측 승률 순서로 묶었다 (s7 알파 덱은 보통 인공지능일 때 s5·s6보다 쉽다)
  const by = id => story.find(s => s.id === id);
  const tiers = [['s1', 's2'], ['s2', 's3'], ['s4', 's7'], ['s5', 's6'], ['s8']].map(t => t.map(by));
  const used = new Set();
  return tiers.map(t => { const opts = t.filter(s => !used.has(s.id)); const s = opts[Math.floor(rnd() * opts.length)]; used.add(s.id); return s.id; });
}
