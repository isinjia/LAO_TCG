// AI vs AI 자동 대전 시뮬레이션
// node tools/sim.js [판수] [--verbose] [--cards] [--set=규칙=값] [--eval=JS] [--ai=normal|hard|easy] [--vs=normal|hard|easy] [--random=덱수]
// --random=N: 프리셋 대신 무작위로 짠 유효 덱 N개(제작사 2~3곳, 지원 카드 0~3장)끼리 대전한다. 판수는 덱 조합당 판수.
const fs = require('fs'); const vm = require('vm');
const ctx = { console, Math, Set, Map, process };
vm.createContext(ctx);
for (const f of ['js/data.js', 'js/engine.js', 'js/ai.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
for (const a of process.argv) { const m = a.match(/^--set=(\w+)=(-?\d+)$/); if (m) vm.runInContext(`RULES.${m[1]} = ${m[2]};`, ctx); }
for (const a of process.argv) if (a.startsWith('--eval=')) vm.runInContext(a.slice(7), ctx);
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
ctx.LV0 = arg('ai', 'normal'); ctx.LV1 = arg('vs', ctx.LV0);
ctx.N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '200', 10);
ctx.VERBOSE = process.argv.includes('--verbose'); ctx.CARDSFLAG = process.argv.includes('--cards'); ctx.RANDOM = parseInt(arg('random', '0'), 10);
vm.runInContext(`
if (RANDOM) {
  // 플레이어용 카드에서 무작위 덱을 만든다 (해금 여부는 따지지 않는다)
  const pool = Object.values(CARDS).filter(c => !c.enemy && !c.token && c.id !== COMMAND_CARD.id);
  const facs = [...new Set(pool.map(c => c.f))];
  const decks = [];
  while (decks.length < RANDOM) {
    const fs = facs.slice().sort(() => Math.random() - 0.5).slice(0, 2 + (Math.random() < 0.5 ? 1 : 0));
    const units = pool.filter(c => fs.includes(c.f) && c.kind === 'unit').sort(() => Math.random() - 0.5);
    const skills = pool.filter(c => fs.includes(c.f) && c.kind === 'skill').sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 4));
    const cards = [...skills, ...units].slice(0, RULES.DECK_SIZE).map(c => c.id);
    if (!validateDeck(cards)) decks.push({ name: '무작위 ' + (decks.length + 1) + ' (' + fs.join('+') + ')', cards });
  }
  PRESET_DECKS.length = 0; PRESET_DECKS.push(...decks);
}
const CARDSTAT = {};
// lv[0]은 덱 a를 쓰는 쪽, lv[1]은 덱 b를 쓰는 쪽. 선후공은 번갈아 배정한다.
function sim(da, db, lvA, lvB, aFirst) {
  const A = new Player('A', PRESET_DECKS[da].cards, { isAI: true }), B = new Player('B', PRESET_DECKS[db].cards, { isAI: true });
  const g = aFirst ? new Game(A, B) : new Game(B, A);
  const lv = new Map([[A, lvA], [B, lvB]]);
  for (const p of [A, B]) g.mulligan(p, AI.pickMulligan(p, lv.get(p)));
  g.start();
  const played = new Map([[A, new Set()], [B, new Set()]]);
  let safety = 0;
  while (g.phase !== 'over' && safety++ < 200) {
    const p = g.cur;
    let n = 0;
    while (g.phase === 'main' && n++ < 12) {
      const a = AI.nextAction(g, p, lv.get(p)); if (!a) break;
      played.get(p).add(a.card.id);
      const ok = g.act(a);
      if (!ok) throw new Error('AI chose unplayable: ' + a.card.id);
      g.events.length = 0;
    }
    if (g.phase === 'main') g.endTurn();
    g.events.length = 0; g.logs.length = 0;
    for (const q of [A, B]) { if (q.hp > q.maxHp) throw new Error('hp over max'); q.lanes.forEach(u => { if (u && u.hp <= 0) throw new Error('dead unit on board'); }); }
  }
  const w = g.winner === A ? 0 : g.winner === B ? 1 : -1;
  for (const [p, idx] of [[A, 0], [B, 1]]) for (const id of played.get(p)) { const c = CARDSTAT[id] = CARDSTAT[id] || { p: 0, w: 0 }; c.p++; if (w === idx) c.w++; }
  return { w, aFirst, turns: g.round() };
}
const D = PRESET_DECKS.length;
const deckW = Array(D).fill(0), deckG = Array(D).fill(0); let firstW = 0, total = 0, turns = 0, draws = 0, lv0W = 0;
const mx = [...Array(D)].map(() => Array(D).fill(0));
for (let a = 0; a < D; a++) for (let b = 0; b < D; b++) for (let i = 0; i < N; i++) {
  const r = sim(a, b, LV0, LV1, i % 2 === 0); total++; turns += r.turns;
  if (r.w < 0) { draws++; continue; }
  if ((r.w === 0) === r.aFirst) firstW++;
  if (r.w === 0) lv0W++;
  const win = r.w === 0 ? a : b, lose = r.w === 0 ? b : a;
  if (a !== b) { deckW[win]++; deckG[a]++; deckG[b]++; mx[win][lose]++; }
}
console.log('first-player win %', (firstW / (total - draws) * 100).toFixed(1), ' draws', draws, ' avg rounds', (turns / total).toFixed(1));
if (LV0 !== LV1) console.log(LV0, 'vs', LV1, ':', LV0, 'win %', (lv0W / (total - draws) * 100).toFixed(1));
if (RANDOM) { const r = PRESET_DECKS.map((d, i) => deckW[i] / deckG[i] * 100).sort((a, b) => a - b); console.log('무작위 덱', D, '개 승률 분포: 최저', r[0].toFixed(1), '· 중앙', r[D >> 1].toFixed(1), '· 최고', r[D - 1].toFixed(1)); }
else PRESET_DECKS.forEach((d, i) => console.log(('  ' + d.name).padEnd(30), 'win %', (deckW[i] / deckG[i] * 100).toFixed(1)));
if (CARDSFLAG) { console.log('card win % when played (games played):'); Object.entries(CARDSTAT).sort((a, b) => b[1].w / b[1].p - a[1].w / a[1].p).forEach(([id, c]) => console.log('  ' + (CARDS[id] || (id === COMMAND_CARD.id ? COMMAND_CARD : { n: id })).n.padEnd(14), (c.w / c.p * 100).toFixed(0).padStart(3), '(' + c.p + ')')); }
if (VERBOSE) { console.log('matchup (row beats col, %):'); for (let a = 0; a < D; a++) console.log('  ' + a, mx[a].map((v, b) => a === b ? '  - ' : String(Math.round(v / (2 * N) * 100)).padStart(4)).join('')); }
`, ctx);
