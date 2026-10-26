// 자동 테스트: node tools/test.js
// 카드 데이터 무결성, 엔진 규칙, 캠페인 데이터, AI 대전 안정성을 검사한다.
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const ctx = { console, Math, Set, Map, process }; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/engine.js', 'js/ai.js', 'js/campaign.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
ctx.ROOT = ROOT; ctx.fs = fs; ctx.path = path;

vm.runInContext(`
let pass = 0, fail = 0;
function t(name, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('FAIL', name, '-', e.message); } }
function eq(a, b, m) { if (a !== b) throw new Error((m || '') + ' expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); }
function ok(v, m) { if (!v) throw new Error(m || 'assertion failed'); }
function fresh(p0deck, p1deck) { const a = new Player('A', p0deck, { isAI: true }), b = new Player('B', p1deck, { isAI: true }); const g = new Game(a, b); return { a, b, g }; }
const D0 = PRESET_DECKS[0].cards, D1 = PRESET_DECKS[1].cards;

// ---------- 데이터 ----------
t('모든 카드에 필수 필드', () => Object.values(CARDS).forEach(c => {
  ok(c.id && c.n && FACTIONS[c.f] && GRADE_COLOR[c.g] && typeof c.c === 'number', c.id);
  if (c.kind === 'unit') ok(TYPES[c.t] && ROLES[c.r] && c.a >= 0 && c.h > 0, c.id + ' unit');
  else ok(Array.isArray(c.fx) && c.fx.length, c.id + ' skill fx');
}));
t('카드 id 중복 없음', () => { const ids = [...UNITS, ...SKILLS, ...TOKENS].map(c => c.id); eq(new Set(ids).size, ids.length); });
t('키워드는 정의된 것만', () => Object.values(CARDS).forEach(c => (c.kw || []).forEach(k => ok(KEYWORD_HELP[k.split(':')[0]], c.id + ' ' + k))));
t('모든 카드 아트 파일 존재', () => Object.values(CARDS).forEach(c => {
  ok(fs.existsSync(path.join(ROOT, artOf(c).split('?')[0])), 'art ' + c.id);
  ok(fs.existsSync(path.join(ROOT, fullOf(c).split('?')[0])), 'full ' + c.id);
  if (c.icon) ok(fs.existsSync(path.join(ROOT, iconOf(c))), 'icon ' + c.id);
}));
t('프리셋 덱 유효', () => PRESET_DECKS.forEach(d => eq(validateDeck(d.cards), null, d.name)));
t('덱 검증: 장수/중복/제작사', () => {
  ok(validateDeck(D0.slice(0, 11)));
  ok(validateDeck([...D0.slice(0, 11), D0[0]]));
  const four = ['3P_Poi', 'PECS_Muse', 'BR_Harpy', 'DS_Angel', '3P_Alice', '3P_Maria', '3P_Hachiko', '3P_Vanilla', '3P_Alcyone', '3P_Aqua', '3P_Ajax', '3P_Merope'];
  ok(validateDeck(four));
});

// ---------- 캠페인 ----------
t('캠페인 덱·대사·초상 유효', () => CAMPAIGN.forEach(s => {
  eq(validateDeck(s.enemy.deck), null, s.id + ' enemy');
  if (s.playerDeck) eq(validateDeck(s.playerDeck), null, s.id + ' player');
  ok(CARDS[s.enemy.portrait], s.id + ' portrait');
  [...(s.intro || []), ...(s.outro || [])].forEach(l => ok(CARDS[l.who], s.id + ' who ' + l.who));
  (s.start || []).forEach(x => ok(CARDS[x.id] && x.lane >= 0 && x.lane < 3, s.id + ' start'));
  ok(fs.existsSync(path.join(ROOT, 'assets/bg/' + s.bg + '.jpg')), s.id + ' bg');
  ok(fs.existsSync(path.join(ROOT, 'assets/bgm/' + s.bgm + '.mp3')), s.id + ' bgm');
  eq(s.stars.length, 3, s.id + ' stars');
}));
t('튜토리얼 시작 패에 비용 1 카드', () => { const s = CAMPAIGN[0]; ok(s.openingHand.some(id => CARDS[id].c === 1)); });

// ---------- 엔진 규칙 ----------
t('시작 패: 선공 4장, 후공 6장', () => { const { a, b } = fresh(D0, D1); eq(a.hand.length, RULES.START_HAND); eq(b.hand.length, RULES.START_HAND + RULES.SECOND_EXTRA_CARDS); });
t('AP: 매 턴 최대치 +1, 충전 + 남은 AP 이월, 최대 10', () => {
  const { a, g } = fresh(D0, D1); g.start(); eq(a.ap, 1); eq(a.maxAp, 1);
  g.endTurn(); g.endTurn(); eq(a.maxAp, 2); eq(a.ap, 2 + Math.min(1, RULES.AP_CARRY), '남은 AP 이월 포함');
  for (let i = 0; i < 30; i++) g.endTurn(); ok(a.maxAp <= RULES.MAX_AP);
});
t('AP 사용과 부족', () => { const { a, g } = fresh(D0, D1); g.start(); const c = a.hand.find(x => x.c > 1); if (c) ok(!g.canPlay(c, 0)); a.ap = 9; const u = a.hand.find(x => x.kind === 'unit'); ok(g.play(u, 0)); eq(a.ap, 9 - u.c); });
t('후공 첫 턴 AP 보너스', () => { const { b, g } = fresh(D0, D1); g.start(); g.endTurn(); eq(b.ap, 1 + RULES.SECOND_AP_BONUS); });
t('소환 턴 공격 불가, 돌격은 가능', () => {
  const { a, b, g } = fresh(D0, D1); g.start();
  const u = makeUnit(CARDS['3P_Poi'], a); u.summonedTurn = g.turn; a.lanes[0] = u;
  const r = makeUnit(CARDS['3P_BlackLilith'], a); r.summonedTurn = g.turn; a.lanes[1] = r;
  const hp = b.hp; g.endTurn(); eq(b.hp, hp - CARDS['3P_BlackLilith'].a);
});
t('상성 보너스 +1 (경장→기동)', () => {
  const { a, b, g } = fresh(D0, D1); g.start();
  const atk = makeUnit(CARDS['3P_Alice'], a); atk.summonedTurn = -5; a.lanes[0] = atk; // 경장 3
  const def = makeUnit(CARDS['PECS_Express76'], b); def.summonedTurn = -5; b.lanes[0] = def; // 기동 1/3
  g.endTurn(); ok(!b.lanes[0], '기동 유닛이 3+1 피해로 격파되어야 함');
});
t('보호기: 빈 레인 공격을 대신 받고 피해 -1', () => {
  const { a, b, g } = fresh(D0, D1); g.start();
  const atk = makeUnit(CARDS['3P_SnowFeather'], a); atk.summonedTurn = -5; a.lanes[0] = atk; // 기동 4
  const guard = makeUnit(CARDS['3P_Merope'], b); guard.summonedTurn = -5; b.lanes[1] = guard; // 중장 보호기 2/6
  const hp = b.hp; g.endTurn();
  eq(b.hp, hp, '사령관 피해 없음'); eq(guard.hp, 6 - (4 + 1 - 1 - 1), '기동→중장 +1, 보호 -1, 방어막 1');
});
t('회피는 1회 피격 무효', () => {
  const { a, b, g } = fresh(D0, D1); const u = makeUnit(CARDS['3P_Daphne'], b); b.lanes[0] = u;
  eq(g.damageUnit(u, 5, null), 0); eq(u.hp, u.maxHp); ok(!u.evade); g.damageUnit(u, 2, null); eq(u.hp, u.maxHp - 2);
});
t('방어막은 피해를 흡수', () => { const { b, g } = fresh(D0, D1); const u = makeUnit(CARDS['AGS_Rampart'], b); b.lanes[0] = u; g.damageUnit(u, 3, null); eq(u.shield, 0); eq(u.hp, u.maxHp - 1); });
t('반격', () => {
  const { a, b, g } = fresh(D0, D1); const att = makeUnit(CARDS['3P_Alice'], a); a.lanes[0] = att;
  const c = makeUnit(CARDS['AGS_RheinRitter'], b); b.lanes[0] = c; g.damageUnit(c, 3, att); eq(att.hp, att.maxHp - c.atk);
});
t('관통: 초과 피해가 사령관에게', () => {
  const { a, b, g } = fresh(D0, D1); g.start();
  const p = makeUnit(CARDS['BR_RedHood'], a); p.summonedTurn = -5; a.lanes[0] = p; // 3 관통, 경장
  const v = makeUnit(CARDS['PECS_MissSafety'], b); v.summonedTurn = -5; b.lanes[0] = v; // 경장 1/2
  const hp = b.hp; g.endTurn(); eq(b.hp, hp - 1);
});
t('지원기 오라: 양옆 공격력 +1', () => { const { a } = fresh(D0, D1); const g = new Game(a, new Player('X', D1)); const s = makeUnit(CARDS['3P_Vanilla'], a); const u = makeUnit(CARDS['3P_Alice'], a); a.lanes = [u, s, null]; eq(g.effectiveAtk(u), CARDS['3P_Alice'].a + 1); });
t('격파 효과 발동 (메탈 패러사이트)', () => { const { a, b, g } = fresh(D0, D1); const u = makeUnit(CARDS['IW_Parasite'], b); b.lanes[0] = u; const hp = a.hp; g.damageUnit(u, 10, null); eq(a.hp, hp - 2); });
t('소환 효과 (철충 무리)', () => { const { a, b } = fresh(D0, D1); const p = new Player('I', CAMPAIGN[5].enemy.deck); const g2 = new Game(p, a); g2.start(); p.ap = 9; p.hand.push(CARDS['SK_IW_Swarm']); g2.play(CARDS['SK_IW_Swarm']); eq(p.units().length, 3); });
t('멀리건: 같은 장수 유지', () => { const { a, g } = fresh(D0, D1); const n = a.hand.length; g.mulligan(a, a.hand.slice(0, 2)); eq(a.hand.length, n); eq(a.hand.length + a.deck.length, 12); });
t('덱 소진 시 묘지 재순환', () => { const { a, g } = fresh(D0, D1); a.grave.push(...a.deck.splice(0)); a.hand.length = 0; a.draw(3, g); eq(a.hand.length, 3); });
t('패 최대치 초과 시 소각', () => { const { a, g } = fresh(D0, D1); a.draw(10, g); eq(a.hand.length, RULES.HAND_MAX); });
t('clone은 원본을 바꾸지 않음', () => {
  const { a, g } = fresh(D0, D1); g.start(); a.ap = 9;
  const c = a.hand.find(x => x.kind === 'unit'); const before = JSON.stringify(a.hand.map(x => x.id));
  const g2 = g.clone(); g2.play(g2.cur.hand.find(x => x.id === c.id), 0); g2.endTurn();
  eq(JSON.stringify(a.hand.map(x => x.id)), before); eq(a.lanes[0], null); eq(g.turn, 1);
});
t('forecast는 실제 전투와 일치', () => {
  for (let i = 0; i < 30; i++) {
    const { a, g } = fresh(D0, D1); g.start();
    let guard = 0;
    while (g.phase !== 'over' && guard++ < 30) { let n = 0;
      while (g.phase === 'main' && n++ < 8) { const act = AI.nextAction(g, g.cur); if (!act) break; act.card.kind === 'unit' ? g.play(act.card, act.lane) : g.play(act.card, null, act.target); }
      if (g.phase !== 'main') break;
      const opp = g.opp; const fc = g.forecast(g.cur); const before = opp.hp;
      g.endTurn();
      if (g.phase !== 'over') eq(before - opp.hp, fc.cmdDmg, 'cmd dmg forecast');
    }
  }
});

t('직렬화 → 복원 후 동일하게 진행', () => {
  const { a, g } = fresh(D0, D1); g.start();
  for (let i = 0; i < 6 && g.phase !== 'over'; i++) { const act = AI.nextAction(g, g.cur); if (act) act.card.kind === 'unit' ? g.play(act.card, act.lane) : g.play(act.card, null, act.target); g.endTurn(); }
  const snap = JSON.parse(JSON.stringify(serializeGame(g)));
  const r = restoreGame(snap);
  eq(JSON.stringify(serializeGame(r)), JSON.stringify(snap));
  eq(r.turn, g.turn); eq(r.cur.name, g.cur.name);
  r.players.forEach(p => p.lanes.forEach(u => ok(!u || u.owner === p, 'owner')));
  const fa = g.forecast(g.cur), fb = r.forecast(r.cur); eq(fa.cmdDmg, fb.cmdDmg, 'forecast same');
});
t('잠금 카드는 프리셋·튜토리얼에 없음', () => { [...LOCKED].forEach(id => { ok(CARDS[id], id); ok(!PRESET_DECKS.some(d => d.cards.includes(id)), 'preset ' + id); ok(!CAMPAIGN[0].playerDeck.includes(id), 'tut ' + id); }); });

// ---------- AI 안정성 ----------
t('AI 대전 300판: 예외·무한루프 없음', () => {
  for (let i = 0; i < 300; i++) {
    const da = PRESET_DECKS[i % 4].cards, db = PRESET_DECKS[(i + 1 + (i >> 2)) % 4].cards;
    const lv = ['easy', 'normal', 'hard'][i % 3];
    const { a, b, g } = fresh(da, db);
    g.mulligan(a, AI.pickMulligan(a, lv)); g.mulligan(b, AI.pickMulligan(b, lv)); g.start();
    let k = 0;
    while (g.phase !== 'over' && k++ < 300) {
      const p = g.cur; let n = 0;
      while (g.phase === 'main' && n++ < 12) { const act = AI.nextAction(g, p, lv); if (!act) break; ok(act.card.kind === 'unit' ? g.play(act.card, act.lane) : g.play(act.card, null, act.target), 'legal act'); }
      if (g.phase === 'main') g.endTurn();
      [a, b].forEach(q => { ok(q.hp <= q.maxHp, 'hp<=max'); ok(q.hand.length <= RULES.HAND_MAX, 'hand'); q.lanes.forEach(u => ok(!u || u.hp > 0, 'alive')); ok(q.hand.length + q.deck.length + q.grave.length + q.units().filter(u => !u.card.token).length === 12, 'card conservation'); });
      g.events.length = 0;
    }
    ok(g.phase === 'over', 'game ended');
  }
});

console.log(\`\${pass} passed, \${fail} failed\`);
if (fail) process.exitCode = 1;
`, ctx);
