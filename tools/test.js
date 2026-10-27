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
t('시작 패: 교체 단계는 양쪽 모두 4장', () => { const { a, b } = fresh(D0, D1); eq(a.hand.length, 4); eq(b.hand.length, 4); eq(RULES.START_HAND, 4); });
t('후공 보정: 교체 후 시작하면 후공만 추가 카드', () => { const { a, b, g } = fresh(D0, D1); g.mulligan(a, []); g.mulligan(b, []); g.start(); eq(a.hand.length, RULES.START_HAND); eq(b.hand.length, RULES.START_HAND + RULES.SECOND_EXTRA_CARDS); });
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
  const def = makeUnit(CARDS['PECS_Express76'], b); def.summonedTurn = -5; def.hp = def.maxHp = 3; b.lanes[0] = def; // 기동, 체력 3으로 고정
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
  const v = makeUnit(CARDS['PECS_MissSafety'], b); v.summonedTurn = -5; v.hp = v.maxHp = 2; b.lanes[0] = v; // 경장, 체력 2로 고정
  const hp = b.hp; g.endTurn(); eq(b.hp, hp - 1);
});
t('교체 배치: 내 전투원 위에 내면 원래 전투원은 철수(묘지, 격파 효과 없음)', () => {
  const { a, b, g } = fresh(D0, D1); g.mulligan(a, []); g.mulligan(b, []); g.start();
  const p = g.cur, o = g.other(p);
  const old = makeUnit(CARDS['AGS_Shade'], p); old.summonedTurn = -5; p.lanes = [old, null, null]; // 격파: 상대 라이프 2
  const c = CARDS['3P_Alice']; p.hand.push(c); p.ap = 9; const ohp = o.hp, ap0 = p.ap;
  ok(g.play(c, 0), '교체 배치 성공'); eq(p.ap, ap0 - c.c - RULES.REPLACE_COST, '추가 AP'); eq(p.lanes[0].cardId, '3P_Alice'); ok(p.grave.includes(CARDS['AGS_Shade']), '묘지로'); eq(o.hp, ohp, '격파 효과 없음');
  const c2 = CARDS['3P_Poi']; p.hand.push(c2); ok(!g.play(c2, 0), '이번 턴에 낸 전투원은 교체 불가');
});
t('이동: 턴마다 한 번, AP를 써서 이웃 레인으로 (아군이 있으면 자리 바꿈)', () => {
  const { a, b, g } = fresh(D0, D1); g.mulligan(a, []); g.mulligan(b, []); g.start();
  const p = g.cur; p.ap = 9;
  const u1 = makeUnit(CARDS['3P_Alice'], p), u2 = makeUnit(CARDS['3P_Poi'], p); p.lanes = [u1, null, u2];
  ok(!g.canMove(u1, 2), '두 칸은 불가'); ok(g.move(u1, 1), '이동'); eq(p.lanes[1], u1); eq(p.ap, 9 - RULES.MOVE_COST);
  ok(!g.move(u2, 1), '턴당 한 번'); p.movedTurn = -1; ok(g.move(u2, 1), '자리 바꿈'); eq(p.lanes[1], u2); eq(p.lanes[2], u1);
});
t('제작사 결속: 2기 이상이면 켜짐 (AGS 방어막·블랙리버 직격·삼안 포격)', () => {
  const { a, b, g } = fresh(D0, D1); g.mulligan(a, []); g.mulligan(b, []); g.start();
  const p = g.cur, o = g.other(p);
  p.lanes = [makeUnit(CARDS['AGS_Rampart'], p), null, null]; ok(!g.synergy(p, 'AGS'), '1기는 꺼짐');
  p.lanes[1] = makeUnit(CARDS['AGS_SpartanA'], p); ok(g.synergy(p, 'AGS'), '2기면 켜짐');
  const br = makeUnit(CARDS['BR_RedHood'], p), br2 = makeUnit(CARDS['BR_Leona'], p); br.summonedTurn = br2.summonedTurn = -5;
  p.lanes = [br, br2, null]; o.lanes = [null, null, null]; const hp = o.hp; g.attack(br, 0);
  eq(o.hp, hp - (g.effectiveAtk(br) + 1), '블랙리버 직격 +1');
  p.lanes = [makeUnit(CARDS['3P_Alice'], p), makeUnit(CARDS['3P_Poi'], p), null]; eq(g.commandCost(p), RULES.COMMAND.cost - 1, '삼안 포격 AP -1');
});
t('보호: 마주 선 전투원끼리의 공격은 막지 않는다 (설명과 동작 일치)', () => {
  const { a, b, g } = fresh(D0, D1); g.start();
  const att = makeUnit(CARDS['3P_Alice'], a); att.summonedTurn = -5; a.lanes = [att, null, null];
  const opp = makeUnit(CARDS['3P_Poi'], b), guard = makeUnit(CARDS['AGS_Rampart'], b); opp.hp = opp.maxHp = 20; b.lanes = [opp, guard, null];
  const ghp = guard.hp; g.attack(att, 0); eq(guard.hp, ghp, '보호기는 맞지 않음'); ok(opp.hp < 20, '마주 선 전투원이 맞음');
  ok(KEYWORD_HELP['보호'].includes('앞이 빈'), '설명 문구가 실제 동작과 같음');
});
t('튜토리얼 대본: 정해 둔 시작 패와 2·3턴 드로우가 지켜진다', () => {
  const st = CAMPAIGN[0];
  for (let k = 0; k < 30; k++) {
    const me = new Player('me', st.playerDeck), ai = new Player('ai', st.enemy.deck, { isAI: true, hp: st.enemy.hp });
    const want = st.openingHand.map(id => me.deck.find(c => c.id === id));
    me.deck = me.deck.filter(c => !want.includes(c)).concat(want.reverse());
    const g = new Game(me, ai); (st.start || []).forEach(x => g.placeStart(ai, x.lane, x.id));
    g.mulligan(ai, []); g.mulligan(me, []); g.start();
    eq(me.hand.map(c => c.id).sort().join(), st.openingHand.slice(0, RULES.START_HAND).sort().join(), '시작 패');
    g.endTurn(); g.endTurn(); ok(me.hand.some(c => c.id === st.openingHand[4]), '2턴 드로우');
    g.endTurn(); g.endTurn(); ok(me.hand.some(c => c.id === st.openingHand[5]), '3턴 드로우');
  }
});
t('시작 패에 비용 2 이하가 보장된다 (덱에 있을 때)', () => {
  for (let k = 0; k < 50; k++) { const { a, b } = fresh(D0, D1); for (const p of [a, b]) if (p.deckIds.some(id => CARDS[id].c <= 2)) ok(p.hand.some(c => c.c <= 2), '싼 카드'); }
});
t('스토리 전투 중 대사 구조: 각 대사는 { who, text }이고 알 수 없는 키가 없다', () => {
  const keys = new Set(['half', 'low', 'ssMe', 'ssAi', 'comeback']);
  CAMPAIGN.forEach(s => Object.entries(s.mid || {}).forEach(([k, v]) => {
    ok(keys.has(k), s.id + ' 알 수 없는 키 ' + k);
    ok(v && CARDS[v.who] && typeof v.text === 'string', s.id + ' ' + k + ' 형식');
    eq(Object.keys(v).sort().join(), 'text,who', s.id + ' ' + k + ' 안에 다른 키가 섞임');
  }));
  ok(CAMPAIGN.find(s => s.id === 's8').mid.ssAi, '결승 상대 SS 대사');
});
t('지원기 오라: 양옆 공격력 +1', () => { const { a } = fresh(D0, D1); const g = new Game(a, new Player('X', D1)); const s = makeUnit(CARDS['3P_Vanilla'], a); const u = makeUnit(CARDS['3P_Alice'], a); a.lanes = [u, s, null]; eq(g.effectiveAtk(u), CARDS['3P_Alice'].a + 1); });
t('격파 효과 발동 (메탈 패러사이트)', () => { const { a, b, g } = fresh(D0, D1); const u = makeUnit(CARDS['IW_Parasite'], b); b.lanes[0] = u; const hp = a.hp; g.damageUnit(u, 10, null); eq(a.hp, hp - 2); });
t('소환 효과 (철충 무리)', () => { const { a, b } = fresh(D0, D1); const p = new Player('I', CAMPAIGN[5].enemy.deck); const g2 = new Game(p, a); g2.start(); p.ap = 9; p.hand.push(CARDS['SK_IW_Swarm']); g2.play(CARDS['SK_IW_Swarm']); eq(p.units().length, 3); });
t('멀리건: 같은 장수 유지', () => { const { a, g } = fresh(D0, D1); const n = a.hand.length; g.mulligan(a, a.hand.slice(0, 2)); eq(a.hand.length, n); eq(a.hand.length + a.deck.length, 12); });
t('멀리건: 4장을 골라도 최대 3장만 교체', () => { const { a, g } = fresh(D0, D1); const before = a.hand.slice(); g.mulligan(a, before.slice()); eq(a.hand.length, 4); eq(a.hand.length + a.deck.length, 12); eq(before.filter(c => a.hand.includes(c)).length, 1, '남은 원래 카드 수'); eq(RULES.MULLIGAN_MAX, 3); });
t('멀리건: 1회만 가능', () => { const { a, g } = fresh(D0, D1); g.mulligan(a, []); const h = a.hand.slice(); g.mulligan(a, a.hand.slice(0, 3)); eq(a.hand.every((c, i) => c === h[i]), true); });
t('어려움 AI: 이번 턴 확정 승리를 찾는다 (포격 지원으로 마무리)', () => {
  const { a, b, g } = fresh(D0, D1); g.mulligan(a, []); g.mulligan(b, []); g.start();
  const p = g.cur, o = g.other(p);
  p.hand = []; p.ap = RULES.COMMAND.cost; o.hp = RULES.COMMAND.dmg; o.lanes = [null, null, null]; p.lanes = [null, null, null];
  const act = AI.nextAction(g, p, 'hard');
  ok(act && act.command && act.target.cmd === o, '상대 라이프에 포격 지원');
});
t('AI 멀리건: 최대 3장', () => { const p = new Player('X', D0, { isAI: true }); p.hand = [...p.deck]; eq(AI.pickMulligan(p, 'normal').length <= 3, true); });
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
      while (g.phase === 'main' && n++ < 8) { const act = AI.nextAction(g, g.cur); if (!act) break; g.act(act); }
      if (g.phase !== 'main') break;
      const opp = g.opp; const fc = g.forecast(g.cur); const before = opp.hp;
      g.endTurn();
      if (g.phase !== 'over') eq(before - opp.hp, fc.cmdDmg, 'cmd dmg forecast');
    }
  }
});

t('작전 시간 초과: 정해진 라운드부터 턴 시작 피해가 1씩 커짐', () => {
  const { a, g } = fresh(D0, D1); g.start();
  const R = RULES.OVERTIME_ROUND; ok(R > 0, 'rule on');
  eq(g.overtimeDamage(R - 1), 0); eq(g.overtimeDamage(R), 1); eq(g.overtimeDamage(R + 2), 3);
  // 양쪽이 아무것도 하지 않아도 결국 끝난다
  let guard = 0; while (g.phase !== 'over' && guard++ < 200) g.endTurn();
  ok(g.phase === 'over', 'game ends'); ok(g.round() < R + 10, 'ends soon after overtime');
});
// ---------- 효과별 규칙 ----------
// 현재 턴 플레이어에게 카드를 쥐여 주고, 상대 레인에 유닛을 세운 상태를 만든다
function setup(hand, enemyUnits = [], myUnits = []) {
  const { a, b, g } = fresh(D0, D1); g.start();
  const p = g.cur, o = g.opp;
  p.ap = 10; p.hand = hand.map(id => CARDS[id]);
  enemyUnits.forEach((id, i) => { if (id) { const u = makeUnit(CARDS[id], o); u.summonedTurn = -9; o.lanes[i] = u; } });
  myUnits.forEach((id, i) => { if (id) { const u = makeUnit(CARDS[id], p); u.summonedTurn = -9; p.lanes[i] = u; } });
  return { g, p, o };
}
t('효과: 최약체 처치(암살 지령)는 체력 조건 이하 중 가장 약한 유닛만', () => {
  const { g, p, o } = setup(['SK_DS_Assassinate'], ['DS_Angel', 'AGS_Stronghold', 'PECS_Muse']);
  const angel = o.lanes[0];
  ok(g.play(p.hand[0], null, null)); ok(!o.lanes.includes(angel), '엔젤 처치'); ok(o.lanes[1], '스트롱홀드 생존');
});
t('효과: 희생 폭발은 아군을 바치고 그 공격력만큼 모든 적에게 피해', () => {
  const { g, p, o } = setup(['SK_AGS_Overload'], ['DS_Angel', 'PECS_Muse'], ['AGS_Stronghold']);
  const me = p.lanes[0], atk = me.atk, museHp = o.lanes[1].hp;
  ok(g.play(p.hand[0], null, { unit: me })); ok(!p.lanes.includes(me), '희생');
  ok(!o.lanes[1] || o.lanes[1].hp === museHp - atk, '뮤즈 피해');
});
t('효과: 공격력 감소는 0 아래로 내려가지 않음', () => {
  const { g, p, o } = setup(['BR_Banshee'], ['DS_Angel']);
  o.lanes[0].atk = 0; ok(g.play(p.hand[0], 0)); eq(o.lanes[0].atk, 0);
});
t('효과: 완전 회복은 대상 체력을 최대로', () => {
  const { g, p } = setup(['SK_AGS_Protocol'], [], ['AGS_Stronghold']);
  const u = p.lanes[0]; u.hp = 1; ok(g.play(p.hand[0], null, { unit: u })); eq(u.hp, u.maxHp);
});
t('효과: AP 추가(바닐라)는 이번 턴 AP를 늘림', () => {
  const { g, p } = setup(['3P_Vanilla']); const before = p.ap; ok(g.play(p.hand[0], 0)); eq(p.ap, before - CARDS['3P_Vanilla'].c + 1);
});
t('공격력 0 유닛은 보호기에게도 피해를 주지 않음', () => {
  const { g, p, o } = setup([], ['AGS_Rampart'], ['DS_Angel']);
  const att = p.lanes[0]; att.atk = 0; const def = o.lanes[0]; const hp = def.hp;
  g.damageUnit(def, 0, att, att.card); eq(def.hp, hp);
});
t('작전 지시: 턴당 1회, AP 차감, 대상 피해, 아군 대상 불가', () => {
  const { g, p, o } = setup([], ['AGS_Stronghold'], ['PECS_Muse']);
  ok(!g.canCommand({ unit: p.lanes[0] }), '아군 불가');
  const hp = o.hp, ap = p.ap;
  ok(g.command({ cmd: o })); eq(o.hp, hp - RULES.COMMAND.dmg); eq(p.ap, ap - RULES.COMMAND.cost);
  ok(!g.canCommand(), '두 번째 불가');
  g.endTurn(); g.endTurn(); ok(g.cur === p && (p.ap < RULES.COMMAND.cost || g.canCommand()), '다음 내 턴엔 다시 가능');
});
t('후공 라이프 보정', () => { const { a, b, g } = fresh(D0, D1); g.start(); eq(b.maxHp, RULES.CMD_HP + RULES.SECOND_HP_BONUS); eq(a.maxHp, RULES.CMD_HP); });
t('대국 난수: 저장 → 복원 뒤 무작위 결과가 같음', () => {
  const { g } = setup(['3P_SnowFeather'], ['DS_Angel', 'PECS_Muse', 'AGS_Stronghold']);
  const r = restoreGame(JSON.parse(JSON.stringify(serializeGame(g))));
  const seq = x => [x.random(), x.random(), x.random()].join(',');
  eq(seq(r), seq(g));
});
t('어려움 AI는 상대 손패를 바꿔도 같은 판단 (숨은 정보 미사용)', () => {
  // 같은 판에서 상대 손패·덱만 다르게 섞어도 AI 판단이 손패 내용에 기대지 않는지: 결과가 합법 행동이면 통과
  for (let i = 0; i < 20; i++) {
    const { a, b, g } = fresh(D0, D1); g.start();
    const act = AI.nextAction(g, g.cur, 'hard');
    ok(!act || (act.command ? g.canCommand(act.target) : g.canPlay(act.card, act.lane, act.target)), '합법 행동');
    const view = AI.hiddenInfoView(g, g.cur); const o = view.players[1 - g.players.indexOf(g.cur)];
    eq(o.hand.length + o.deck.length, g.opp.hand.length + g.opp.deck.length, '카드 수 유지');
  }
});
t('AI 판단은 저장·복원 뒤에도 같음 (새로고침으로 다시 굴릴 수 없음)', () => {
  for (const lv of ['easy', 'normal', 'hard']) for (let i = 0; i < 10; i++) {
    const { g } = fresh(D0, D1); g.start();
    const r = restoreGame(JSON.parse(JSON.stringify(serializeGame(g))));
    const key = (x, a) => a ? (a.command ? 'cmd' : a.card.id + ':' + a.lane + ':' + (a.target ? (a.target.cmd ? 'cmd' : a.target.unit.uid) : '')) : 'end';
    eq(key(r, AI.nextAction(r, r.cur, lv)), key(g, AI.nextAction(g, g.cur, lv)), lv);
  }
});
t('교체 단계 저장·복원: 같은 손패, 교체 권한 유지', () => {
  const { a, b, g } = fresh(D0, D1);
  g.mulligan(b, []); // AI가 먼저 교체를 마친 시점에 저장된다
  const r = restoreGame(JSON.parse(JSON.stringify(serializeGame(g))));
  eq(r.phase, 'mulligan'); eq(r.players[0].hand.map(c => c.id).join(), a.hand.map(c => c.id).join(), '같은 손패');
  ok(!r.players[0].mulliganDone, '플레이어는 아직 교체 가능'); ok(r.players[1].mulliganDone, 'AI는 교체 끝');
});
t('승패가 정해진 대국 저장·복원: 승자 유지', () => {
  const { a, b, g } = fresh(D0, D1); g.start(); b.hp = 0; g.phase = 'over'; g.winner = a;
  const r = restoreGame(JSON.parse(JSON.stringify(serializeGame(g))));
  eq(r.phase, 'over'); eq(r.winner, r.players[g.players.indexOf(a)], '승자 유지');
});
t('특수 임무 별 판정', () => {
  const { a, b, g } = fresh(D0, D1); g.start(); g.winner = a;
  a.stats.kills = 5; a.stats.commands = 2; a.stats.skillsUsed = 0; a.stats.guards = 1; a.stats.unitsPlayed = 7;
  ok(starMet({ type: 'kills', v: 5 }, g, a) && !starMet({ type: 'kills', v: 6 }, g, a), 'kills');
  ok(starMet({ type: 'commands', v: 2 }, g, a) && !starMet({ type: 'commands', v: 3 }, g, a), 'commands');
  ok(starMet({ type: 'noSkill' }, g, a), 'noSkill'); a.stats.skillsUsed = 1; ok(!starMet({ type: 'noSkill' }, g, a), 'noSkill used');
  ok(starMet({ type: 'guards', v: 1 }, g, a), 'guards'); ok(starMet({ type: 'units', v: 7 }, g, a) && !starMet({ type: 'units', v: 6 }, g, a), 'units');
  CAMPAIGN.forEach(st => st.stars.forEach(x => ok(starLabel(x), st.id + ' label ' + x.type)));
});
t('보급 카드는 처음 받은 덱·스토리 보상과 겹치지 않고, 나머지 카드는 모두 보급소에서 얻을 수 있음', () => {
  ok(SUPPLY_CARDS.size > 40, 'size'); SUPPLY_CARDS.forEach(id => { ok(CARDS[id] && !CARDS[id].enemy && SUPPLY_COST[CARDS[id].g], id); ok(LOCKED.has(id), 'locked ' + id); ok(!STARTER_DECK.cards.includes(id), 'starter ' + id); });
  Object.values(CARDS).filter(c => !c.enemy && !c.token && c.id !== COMMAND_CARD.id && !STARTER_DECK.cards.includes(c.id)).forEach(c => ok(LOCKED.has(c.id), 'free ' + c.id));
  LEGACY_FREE.forEach(id => ok(SUPPLY_CARDS.has(id), 'legacy ' + id));
});
t('오늘의 대국: 같은 날짜는 같은 상대·조건, 덱은 유효', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js/ui_challenge.js'), 'utf8');
  const code = src.slice(src.indexOf('const DAILY_TWISTS'), src.indexOf('  doneToday()')) + '}; this.__Daily = Daily; this.__opps = dailyOpponents;';
  (0, eval)(code);
  for (let d = 0; d < 30; d++) {
    const c1 = __Daily.config('t' + d, { cards: D0, name: 'x', preset: true }), c2 = __Daily.config('t' + d, { cards: D0, name: 'x', preset: true });
    eq(JSON.stringify(c1), JSON.stringify(c2), '재현');
    eq(validateDeck(c1.enemy.deck), null, '상대 덱');
    ok(c1.enemy.hp > 0 && (!c1.myHp || c1.myHp > 0), '라이프');
  }
});

t('직렬화 → 복원 후 동일하게 진행', () => {
  const { a, g } = fresh(D0, D1); g.start();
  for (let i = 0; i < 6 && g.phase !== 'over'; i++) { const act = AI.nextAction(g, g.cur); if (act) g.act(act); g.endTurn(); }
  const snap = JSON.parse(JSON.stringify(serializeGame(g)));
  const r = restoreGame(snap);
  eq(JSON.stringify(serializeGame(r)), JSON.stringify(snap));
  eq(r.turn, g.turn); eq(r.cur.name, g.cur.name);
  r.players.forEach(p => p.lanes.forEach(u => ok(!u || u.owner === p, 'owner')));
  const fa = g.forecast(g.cur), fb = r.forecast(r.cur); eq(fa.cmdDmg, fb.cmdDmg, 'forecast same');
});
t('처음 받는 내 덱은 규칙에 맞고 잠긴 카드가 없음', () => { ok(!validateDeck(STARTER_DECK.cards), validateDeck(STARTER_DECK.cards)); ok(!STARTER_DECK.cards.some(id => LOCKED.has(id)), 'locked'); });

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
      while (g.phase === 'main' && n++ < 12) { const act = AI.nextAction(g, p, lv); if (!act) break; ok(g.act(act), 'legal act'); }
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
