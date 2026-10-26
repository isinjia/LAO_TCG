// 보급 원정 시뮬레이션: node tools/draft_sim.js <원정 수> [--eval=JS] — 보통 AI가 드래프트(높은 등급 우선 + 무작위)하고 원정을 도는 결과
const fs = require('fs'), vm = require('vm');
const ctx = { console, Math, Set, Map, process }; vm.createContext(ctx);
for (const f of ['js/data.js', 'js/engine.js', 'js/ai.js', 'js/campaign.js', 'js/draft.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
for (const a of process.argv) if (a.startsWith('--eval=')) vm.runInContext(a.slice(7), ctx);
ctx.N = +(process.argv[2] || 100);
vm.runInContext(`
const rnd = Math.random; const matchW = Array(DRAFT.MATCHES).fill(0), matchN = Array(DRAFT.MATCHES).fill(0); let clears = 0, totalWins = 0; const dist = Array(DRAFT.MATCHES + 1).fill(0);
for (let r = 0; r < N; r++) {
  const fac = draftFactionChoices(rnd)[0]; const picks = [];
  while (picks.length < RULES.DECK_SIZE) { const o = draftOffer(fac, picks, rnd).map(id => CARDS[id]); o.sort((a, b) => (b.c * 2 + (b.a || 0) + (b.h || 0) * 0.5) - (a.c * 2 + (a.a || 0) + (a.h || 0) * 0.5)); picks.push((rnd() < 0.7 ? o[0] : o[Math.floor(rnd() * o.length)]).id); }
  if (validateDeck(picks)) throw new Error(validateDeck(picks));
  const opps = draftOpponents(rnd); let wins = 0, losses = 0, idx = 0;
  while (wins < DRAFT.MATCHES && losses < DRAFT.LOSSES) {
    const s = CAMPAIGN.find(x => x.id === opps[idx]);
    const me = new Player('me', picks, { isAI: true }), en = new Player('en', s.enemy.deck, { isAI: true, hp: DRAFT.ENEMY_HP, style: s.enemy.style });
    const g = rnd() < 0.5 ? new Game(me, en) : new Game(en, me); (s.start || []).forEach(x => g.placeStart(en, x.lane, x.id)); g.quiet = true; g.start();
    let k = 0; while (g.phase !== 'over' && k++ < 200) { const p = g.cur, lv = p === en ? DRAFT.LEVELS[idx] : 'normal'; let m = 0; while (g.phase === 'main' && m++ < 12) { const a = AI.nextAction(g, p, lv); if (!a) break; g.act(a); } if (g.phase === 'main') g.endTurn(); g.events.length = 0; }
    matchN[idx]++; if (g.winner === me) { wins++; matchW[idx]++; idx++; } else losses++;
  }
  dist[wins]++; totalWins += wins; if (wins >= DRAFT.MATCHES) clears++;
}
console.log('돌파율', (clears / N * 100).toFixed(1) + '%', '평균 승수', (totalWins / N).toFixed(2), '승수 분포', dist.join('/'));
console.log('대국별 승률', matchW.map((w, i) => (w / Math.max(1, matchN[i]) * 100).toFixed(0) + '%').join(' '));
`, ctx);
