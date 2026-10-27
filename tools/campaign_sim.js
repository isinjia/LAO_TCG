// 캠페인 난이도 점검: node tools/campaign_sim.js [판수/덱] [--eval=JS]
// 플레이어는 프리셋 덱 4종(normal AI)으로 각 스테이지를 플레이한다.
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, Set, Map, process }; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/engine.js', 'js/ai.js', 'js/campaign.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
for (const a of process.argv) if (a.startsWith('--eval=')) vm.runInContext(a.slice(7), ctx);
ctx.N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '30', 10);
vm.runInContext(`
for (const s of CAMPAIGN) {
  let w = 0, n = 0, rounds = 0;
  for (const d of PRESET_DECKS) for (let i = 0; i < N; i++) {
    const me = new Player('me', s.playerDeck || d.cards, { isAI: true, portrait: 'PECS_Orangeade' });
    const en = new Player('en', s.enemy.deck, { isAI: true, hp: s.enemy.hp, style: s.enemy.style, portrait: s.enemy.portrait });
    const g = (s.playerFirst || i % 2 === 0) ? new Game(me, en) : new Game(en, me);
    (s.start || []).forEach(x => g.placeStart(en, x.lane, x.id));
    g.start();
    let k = 0;
    while (g.phase !== 'over' && k++ < 200) {
      const p = g.cur, lv = p === en ? s.enemy.level : 'normal';
      let m = 0;
      while (g.phase === 'main' && m++ < 12) { const a = AI.nextAction(g, p, lv); if (!a) break; g.act(a); }
      if (g.phase === 'main') g.endTurn();
      g.events.length = 0;
    }
    n++; rounds += g.round(); if (g.winner === me) w++;
  }
  console.log(s.id.padEnd(3), s.title.padEnd(10), 'hp', String(s.enemy.hp).padStart(2), s.enemy.level.padEnd(6), 'player win %', String(Math.round(w / n * 100)).padStart(3), ' avg rounds', (rounds / n).toFixed(1));
}
`, ctx);
