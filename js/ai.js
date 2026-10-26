// ===== AI =====
// easy   : 휴리스틱 상위 3개 후보 중 하나를 고른다 (최선이 아닌 수를 자연스럽게 섞음). 가끔 카드를 아끼고 턴을 넘긴다
// normal : 휴리스틱 상위 5개 후보를 실제로 두어 보고(내 전투까지) 평가가 가장 좋은 것을 고른다. 교환·처치·상대 위협을 따진다
// hard   : 복제 상태에서 행동 2수까지 실행 → 내 전투 → 상대의 다음 턴 배치(휴리스틱)까지 진행한 뒤 상대 반격을 평가하는 빔 탐색

const AI = {
  // 한 번에 한 행동만 반환 (UI가 애니메이션 사이에 호출). null이면 턴 종료.
  nextAction(game, p, level = 'normal') {
    if (level === 'hard') return this.searchAction(game, p);
    if (level === 'easy') {
      const opts = this.heuristicOptions(game, p).slice(0, 3);
      if (!opts.length) return game.random() < 0.5 ? this.commandAction(game, p) : null;
      if (game.random() < 0.15) return null; // 카드를 아껴 둔다
      return opts[Math.floor(game.random() * opts.length)];
    }
    return this.lookaheadAction(game, p);
  },

  heuristicAction(game, p) { return this.heuristicOptions(game, p)[0] || null; },
  // 낼 수 있는 행동을 가치가 높은 순서로 (카드마다 가장 좋은 레인·대상 하나)
  heuristicOptions(game, p) {
    const o = game.other(p);
    const playable = p.hand.filter(c => p.canAfford(c));
    if (!playable.length) return [];
    const skills = playable.filter(c => c.kind === 'skill').map(c => ({ card: c, ...this.evalSkill(game, p, o, c) })).filter(x => x.value > 0);
    const empty = p.emptyLanes();
    const units = [];
    if (empty.length) {
      playable.filter(c => c.kind === 'unit').forEach(c => {
        let best = null;
        empty.forEach(l => {
          let v = c.c * 2 + c.a + c.h * 0.5 + (c.kw || []).length;
          const opp = o.lanes[l];
          if (opp) {
            if (TYPE_BEATS[c.t] === opp.type) v += 2;
            if (TYPE_BEATS[opp.type] === c.t) v -= 1.5;
            if (c.h > opp.atk) v += 1;
          } else if (o.hp <= c.a + 2) v += 5;
          if (c.r === 'SUP') { [l - 1, l + 1].forEach(k => { if (k >= 0 && k < 3 && p.lanes[k]) v += 1; }); }
          if (c.r === 'DEF' && l === 1) v += 0.5;
          if (!best || v > best.value) best = { lane: l, value: v };
        });
        if (best) units.push({ card: c, ...best });
      });
    }
    return [...skills, ...units].sort((a, b) => b.value - a.value);
  },

  // 카드를 다 낸 뒤 남은 AP로 작전 지시: 마무리 > 처치 가능한 가장 비싼 유닛 > 상대 라이프
  commandAction(game, p) {
    if (game.cur !== p || !game.canCommand()) return null;
    const o = game.other(p), dmg = RULES.COMMAND.dmg;
    if (o.hp <= dmg) return { command: true, card: COMMAND_CARD, target: { cmd: o } };
    const kill = o.units().filter(u => !u.evade && u.hp + u.shield <= dmg).sort((a, b) => b.card.c - a.card.c)[0];
    if (kill) return { command: true, card: COMMAND_CARD, target: { unit: kill } };
    return { command: true, card: COMMAND_CARD, target: { cmd: o } };
  },

  evalSkill(game, p, o, c) {
    const kind = skillTargetKind(c);
    const eu = o.units(), au = p.units();
    const e = c.fx[0];
    let value = 0, target = null;
    switch (e.op) {
      case 'dmg':
        if (e.tgt === 'allEnemyUnits') { value = eu.reduce((s, u) => s + Math.min(u.hp, e.v) + (u.hp <= e.v ? 2 : 0), 0) - c.c; }
        else if (kind === 'enemyUnit' || kind === 'any') {
          if (kind === 'any' && o.hp <= e.v) { value = 100; target = { cmd: o }; break; }
          eu.forEach(u => { const v = Math.min(u.hp, e.v) + (u.hp <= e.v ? u.card.c : 0) - c.c + 1; if (v > value) { value = v; target = { unit: u }; } });
          if (kind === 'any' && !target && p.hand.length > 5) { value = 1; target = { cmd: o }; }
        }
        break;
      case 'heal': value = (p.maxHp - p.hp) >= e.v ? e.v - c.c + 1 : -1; break;
      case 'healAll': value = au.reduce((s, u) => s + Math.min(u.maxHp - u.hp, e.v), 0) - c.c; break;
      case 'buffAll': value = au.length * 2 - c.c; break;
      case 'draw': value = p.hand.length <= 3 ? 2 : -1; break;
      case 'res': value = p.hand.some(h => h.kind === 'unit' && !p.canAfford(h)) ? 2 : -1; break;
      case 'evade': value = au.length * 1.5 - c.c; break;
      case 'summon': value = p.emptyLanes().length * 1.5 - c.c + 1; break;
      case 'destroyLowest': { const cand = eu.filter(u => !e.v || u.hp <= e.v); if (!cand.length) break; const low = cand.reduce((a, b) => (b.hp < a.hp ? b : a)); value = low.card.c + low.atk - c.c; break; }
      case 'shield': if (kind === 'allyUnit') { au.forEach(u => { const v = (u.maxHp - u.hp) + 2 - c.c; if (v > value) { value = v; target = { unit: u }; } }); } else value = au.length * 1.5 - c.c; break;
      case 'healFull': au.forEach(u => { const v = (u.maxHp - u.hp) + 2 - c.c; if (v > value) { value = v; target = { unit: u }; } }); break;
      case 'sacrificeBlast': au.forEach(u => { const v = u.atk * eu.length - u.card.c - c.c + 2; if (v > value) { value = v; target = { unit: u }; } }); break;
    }
    if (kind !== 'none' && !target) value = 0;
    return { value, target };
  },

  // ---- hard: 탐색 ----
  legalActions(game, p) {
    const o = game.other(p);
    const acts = [];
    const seen = new Set();
    for (const c of p.hand) {
      if (!p.canAfford(c) || seen.has(c.id)) continue;
      seen.add(c.id);
      if (c.kind === 'unit') p.emptyLanes().forEach(l => acts.push({ card: c, lane: l }));
      else {
        const k = skillTargetKind(c);
        if (k === 'none') acts.push({ card: c });
        else if (k === 'enemyUnit') o.units().forEach(u => acts.push({ card: c, target: { unit: u } }));
        else if (k === 'allyUnit') p.units().forEach(u => acts.push({ card: c, target: { unit: u } }));
        else if (k === 'any') { o.units().forEach(u => acts.push({ card: c, target: { unit: u } })); acts.push({ card: c, target: { cmd: o } }); }
      }
    }
    if (game.cur === p && game.canCommand()) {
      o.units().forEach(u => acts.push({ command: true, card: COMMAND_CARD, target: { unit: u } }));
      acts.push({ command: true, card: COMMAND_CARD, target: { cmd: o } });
    }
    return acts;
  },

  unitValue(u, g) {
    let v = u.atk * 1.6 + u.hp * 1.0 + u.shield * 0.7 + (u.evade ? 2 : 0) + (u.slowed ? -1.5 : 0);
    if (u.kw['광역']) v += 3; if (u.kw['돌격']) v += 0.5; if (u.kw['관통']) v += 1.5;
    if (u.kw['반격']) v += 1.5; if (u.kw['재생']) v += u.kw['재생'];
    if (u.role === 'SUP') v += 1.5; if (u.role === 'DEF') v += 1;
    return v;
  },

  evaluate(g, p) {
    const o = g.other(p);
    if (g.winner === p) return 1e6;
    if (g.winner && g.winner !== p) return -1e6;
    let s = 0;
    // 사령관 체력: 낮아질수록 가치 상승 (마무리 우선)
    s += (o.maxHp - o.hp) * 2.2 + (o.hp <= 8 ? (8 - o.hp) * 2 : 0);
    s -= (p.maxHp - p.hp) * 2.0 + (p.hp <= 8 ? (8 - p.hp) * 2.5 : 0);
    p.units().forEach(u => { s += this.unitValue(u, g); });
    o.units().forEach(u => { s -= this.unitValue(u, g) * 1.1; });
    s += p.hand.length * 1.2;
    // 상대의 다음 공격 위협
    const fc = g.forecast(o);
    if (fc.lethal) s -= 5e5;
    s -= fc.cmdDmg * 1.5;
    fc.deadUids.forEach(id => { const u = p.units().find(x => x.uid === id); if (u) s -= this.unitValue(u, g) * 0.6; });
    return s;
  },

  // 복제 게임 g에 행동을 적용한다 (대상 유닛을 uid로 다시 찾는다)
  applyAct(g, gp, act) {
    if (act.command && g.cur !== gp) return false;
    let target = act.target;
    if (target && target.unit) {
      const uid = target.unit.uid;
      target = null;
      for (const q of g.players) for (const u of q.lanes) if (u && u.uid === uid) target = { unit: u };
      if (!target) return false;
    } else if (target && target.cmd) target = { cmd: g.other(gp) };
    if (act.command) return g.command(target);
    const card = gp.hand.find(c => c.id === act.card.id);
    return !!card && g.play(card, act.lane, target);
  },
  // 행동(들) 적용 → 내 전투 → 상대 턴 시작과 배치까지 진행했을 때의 평가값
  // 상대가 빈 레인을 채우고 지원 카드를 쓴 뒤의 반격을 보므로, 다음 턴에 막힐 공격·받을 피해를 더 정확히 따진다
  scoreSeq(game, p, acts) {
    const g = game.clone();
    const gp = g.players[game.players.indexOf(p)];
    for (const a of acts) { if (!this.applyAct(g, gp, a)) return -Infinity; if (g.phase === 'over') return this.evaluate(g, gp); }
    g.phase = 'combat'; g.resolveCombat();
    if (g.phase === 'over') return this.evaluate(g, gp);
    const go = g.other(gp);
    g.current = g.players.indexOf(go); g.quiet = true; g.noEvents = true;
    g.beginTurn();
    for (let i = 0; i < 7 && g.phase === 'main'; i++) {
      const a = this.heuristicAction(g, go);
      const a2 = a || this.commandAction(g, go);
      if (!a2 || !g.act(a2)) break;
    }
    return this.evaluate(g, gp);
  },
  scoreAfter(game, p, act) { return this.scoreSeq(game, p, act ? [act] : []); },

  // 탐색용 복제: 상대의 손패와 덱 순서는 알 수 없으므로, 남은 카드(손패+덱)를 섞어 다시 나눈다.
  // 상대 덱 구성(공개 정보)은 알지만 지금 무엇을 쥐었는지, 다음에 무엇을 뽑을지는 모르는 상태로 둔다.
  hiddenInfoView(game, p) {
    const g = game.clone();
    const o = g.players[1 - game.players.indexOf(p)];
    g.seed = (g.seed ^ 0x9E3779B9) >>> 0; // 실제 대국의 난수와 다른 흐름 (같은 상태에서는 같은 가정 → 새로고침해도 같은 판단)
    const pool = shuffle([...o.hand, ...o.deck], () => g.random());
    o.hand = pool.slice(0, o.hand.length); o.deck = pool.slice(o.hand.length);
    // 내 덱 순서도 모르는 것으로 한다 (다음에 뽑을 카드를 미리 알고 판단하지 않게)
    const me = g.players[game.players.indexOf(p)]; me.deck = shuffle(me.deck.slice(), () => g.random());
    return g;
  },

  // 보통: 휴리스틱 후보를 한 수씩 두어 보고 내 전투까지 진행한 평가로 고른다 (상대 다음 턴은 보지 않음)
  shallowScore(game, p, act) {
    const g = game.clone(); const gp = g.players[game.players.indexOf(p)];
    if (act && !this.applyAct(g, gp, act)) return -Infinity;
    if (g.phase !== 'over') { g.phase = 'combat'; g.resolveCombat(); }
    return this.evaluate(g, gp);
  },
  lookaheadAction(real, rp) {
    const game = this.hiddenInfoView(real, rp);
    const p = game.players[real.players.indexOf(rp)];
    const cands = this.heuristicOptions(game, p).slice(0, 5);
    const cmd = this.commandAction(game, p); if (cmd) cands.push(cmd);
    if (!cands.length) return null;
    const base = this.shallowScore(game, p, null);
    let best = null, bestScore = base - 1.5; // 손해가 크지 않으면 카드를 내서 판을 채운다
    for (const a of cands) { const s = this.shallowScore(game, p, a); if (s > bestScore) { bestScore = s; best = a; } }
    if (!best) return null;
    if (best.command) { const t = best.target.cmd ? { cmd: real.players[game.players.indexOf(best.target.cmd)] } : (() => { for (const q of real.players) for (const u of q.lanes) if (u && u.uid === best.target.unit.uid) return { unit: u }; return null; })(); return t ? { command: true, card: COMMAND_CARD, target: t } : null; }
    const card = rp.hand.find(c => c.id === best.card.id);
    let target = best.target;
    if (target && target.cmd) target = { cmd: real.players[game.players.indexOf(target.cmd)] };
    else if (target && target.unit) { const uid = target.unit.uid; target = null; for (const q of real.players) for (const u of q.lanes) if (u && u.uid === uid) target = { unit: u }; }
    return card ? { card, lane: best.lane, target } : null;
  },

  // 2수 빔 탐색: 1수 후보 상위 4개에 대해 2번째 행동까지 평가한다
  searchAction(real, rp) {
    const game = this.hiddenInfoView(real, rp);
    const p = game.players[real.players.indexOf(rp)];
    const base = this.scoreSeq(game, p, []);
    const firsts = this.legalActions(game, p).map(a => ({ a, s: this.scoreSeq(game, p, [a]) })).filter(x => x.s > -Infinity).sort((x, y) => y.s - x.s);
    let best = null, bestScore = base + 0.5; // 아무것도 안 하는 것보다 확실히 나을 때만 행동
    for (const f of firsts) if (f.s > bestScore) { bestScore = f.s; best = f.a; }
    for (const f of firsts.slice(0, 4)) {
      const g = game.clone(); const gp = g.players[game.players.indexOf(p)];
      if (!this.applyAct(g, gp, f.a) || g.phase === 'over') continue;
      for (const a2 of this.legalActions(g, gp)) {
        const s2 = this.scoreSeq(g, gp, [a2]);
        if (s2 > bestScore + 0.3) { bestScore = s2; best = f.a; }
      }
    }
    if (!best) return null;
    // 탐색용 복제의 카드·대상을 실제 대국의 것으로 바꿔 돌려준다
    const card = best.command ? COMMAND_CARD : rp.hand.find(c => c.id === best.card.id);
    let target = best.target;
    if (target && target.cmd) target = { cmd: real.players[game.players.indexOf(target.cmd)] };
    else if (target && target.unit) { const uid = target.unit.uid; target = null; for (const q of real.players) for (const u of q.lanes) if (u && u.uid === uid) target = { unit: u }; }
    if (best.command) return target ? { command: true, card, target } : null;
    return card ? { card, lane: best.lane, target } : null;
  },

  // 멀리건: 비싼 카드(5 이상)를 교체
  pickMulligan(p, level = 'normal') {
    if (level === 'easy') return [];
    // 비싼 카드부터 최대 교체 장수까지만 돌려보낸다
    return p.hand.filter(c => c.c >= 5).sort((a, b) => b.c - a.c).slice(0, RULES.MULLIGAN_MAX ?? 3);
  },
};
