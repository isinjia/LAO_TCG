// ===== 게임 엔진 (규칙/상태) =====
// UI와 분리된 순수 로직. 이벤트는 game.events 배열에 push되어 UI가 애니메이션에 사용한다.

let _uid = 1;
function uid() { return _uid++; }

// rnd: 0 이상 1 미만 난수 함수. 대국 중에는 game.random을 넘겨 저장·복원 뒤에도 같은 결과가 나오게 한다
function shuffle(arr, rnd = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseKw(kw) {
  // ['방어막:3', '재생:2', '돌격'] → { 방어막:3, 재생:2, 돌격:true }
  const o = {};
  (kw || []).forEach(k => {
    const [name, v] = k.split(':');
    o[name] = v === undefined ? true : parseInt(v, 10);
  });
  return o;
}

function makeUnit(card, owner) {
  const kw = parseKw(card.kw);
  return {
    uid: uid(), cardId: card.id, card, owner,
    atk: card.a, hp: card.h, maxHp: card.h,
    type: card.t, role: card.r,
    kw,
    shield: kw['방어막'] || 0,
    evade: !!kw['회피'],
    slowed: false,
    summonedTurn: -1,
  };
}

function newStats() { return { dmgCmd: 0, dmgUnits: 0, kills: 0, unitsPlayed: 0, skillsUsed: 0, healed: 0, cardDmg: {} }; }

class Player {
  // opts: { hp, isAI, portrait }
  constructor(name, deckIds, opts = {}) {
    this.name = name;
    this.isAI = !!opts.isAI;
    this.portrait = opts.portrait || null;
    this.style = opts.style || 'balanced'; // AI 성향: aggro(공격형) | control(제어형) | balanced(균형형)
    this.maxHp = opts.hp || RULES.CMD_HP;
    this.hp = this.maxHp;
    this.deckIds = deckIds.slice();
    this.deck = shuffle(deckIds.map(id => CARDS[id]));
    this.grave = [];
    this.hand = [];
    this.lanes = [null, null, null];
    this.factions = [...new Set(deckIds.map(id => CARDS[id].f))];
    this.maxAp = 0; this.ap = 0; // AP: 매 턴 최대치 +1 (최대 RULES.MAX_AP), 턴 시작마다 가득 충전
    this.mulliganDone = false;
    this.stats = newStats();
  }
  draw(n, game) {
    for (let i = 0; i < n; i++) {
      if (this.deck.length === 0) {
        if (this.grave.length === 0) return;
        this.deck = shuffle(this.grave, () => game.random()); this.grave = [];
        game.log(`${this.name}의 덱이 소진되어 묘지를 다시 섞습니다.`, 'sys');
        game.emit({ type: 'reshuffle', player: this });
      }
      const c = this.deck.pop();
      if (this.hand.length >= RULES.HAND_MAX) {
        this.grave.push(c);
        game.log(`${this.name}의 패가 가득 차 ${c.n}이(가) 소각됩니다.`, 'sys');
        game.emit({ type: 'burn', player: this, card: c });
      } else { this.hand.push(c); game.emit({ type: 'draw', player: this, card: c }); }
    }
  }
  units() { return this.lanes.filter(Boolean); }
  canAfford(card) { return this.ap >= card.c; }
  emptyLanes() { return this.lanes.map((u, i) => (u ? -1 : i)).filter(i => i >= 0); }
  // 전투원을 낼 수 있는 레인: 빈 레인과, 이번 턴에 배치하지 않은 내 전투원이 있는 레인(교체 배치)
  placeableLanes(turn, card) { return this.lanes.map((u, i) => (!u || (RULES.REPLACE && u.summonedTurn !== turn && (!card || this.ap >= card.c + (RULES.REPLACE_COST || 0))) ? i : -1)).filter(i => i >= 0); }
}

class Game {
  // p0 = 선공, p1 = 후공
  constructor(p0, p1, opts = {}) {
    this.players = [p0, p1];
    this.opts = opts;
    this.turn = 0;           // 전체 턴 카운트 (양쪽 합산)
    this.current = 0;        // 현재 플레이어 index
    this.phase = 'mulligan'; // mulligan | main | combat | over
    this.events = [];
    this.logs = [];
    this.winner = null;
    this.seed = Math.floor(Math.random() * 4294967296); // 대국 난수 상태 (저장에 포함되어 새로고침으로 무작위 결과를 다시 굴릴 수 없다)
    this.quiet = false;      // 로그 생략 (AI 시뮬레이션용)
    this.noEvents = false;   // 이벤트 생략 (AI 시뮬레이션용)
    // 양쪽 모두 같은 장수로 시작한다. 후공 보정 카드는 교체가 끝난 뒤 start()에서 준다.
    p0.draw(RULES.START_HAND, this);
    p1.draw(RULES.START_HAND, this);
  }
  get cur() { return this.players[this.current]; }
  get opp() { return this.players[1 - this.current]; }
  other(p) { return this.players[p === this.players[0] ? 1 : 0]; }
  log(msg, kind) { if (this.quiet) return; this.logs.push({ msg, kind: kind || '' }); this.emit({ type: 'log', msg, kind: kind || '' }); }
  emit(ev) { if (!this.noEvents) this.events.push(ev); }
  round() { return Math.ceil(this.turn / 2); }
  // 대국 전용 난수 (mulberry32)
  random() {
    let t = (this.seed = (this.seed + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  // 이번 턴 시작 시 받을 작전 시간 초과 피해 (없으면 0)
  overtimeDamage(round = this.round()) { const r = RULES.OVERTIME_ROUND; return r ? Math.max(0, round - r + 1) : 0; }

  // ---- 시작 전 배치 (캠페인) ----
  placeStart(p, lane, cardId) {
    const u = makeUnit(CARDS[cardId], p);
    u.summonedTurn = -99;
    u.slowed = true; // 미리 배치된 유닛은 첫 공격을 건너뛴다
    p.lanes[lane] = u;
  }

  // ---- 멀리건: 선택한 카드를 덱에 되돌리고 같은 수만큼 다시 뽑는다 (1회, 최대 MULLIGAN_MAX장) ----
  mulligan(p, cards) {
    if (p.mulliganDone) return;
    p.mulliganDone = true;
    const back = cards.filter((c, i) => p.hand.includes(c) && cards.indexOf(c) === i).slice(0, RULES.MULLIGAN_MAX ?? 3);
    back.forEach(c => p.hand.splice(p.hand.indexOf(c), 1));
    const n = back.length;
    // 돌려놓은 카드가 바로 다시 나오지 않도록, 남은 덱에서 먼저 뽑는다
    shuffle(p.deck, () => this.random());
    for (let i = 0; i < n; i++) p.hand.push(p.deck.pop());
    p.deck.push(...back); shuffle(p.deck, () => this.random());
    if (n) this.log(`${p.name}: 카드 ${n}장 교체`, 'sys');
  }

  start() {
    this.players.forEach(p => { p.mulliganDone = true; });
    // 후공 보정: 교체 단계가 끝난 뒤 추가 카드를 준다
    const extra = RULES.SECOND_EXTRA_CARDS ?? 1;
    if (extra > 0) { this.players[1].draw(extra, this); this.log(`${this.players[1].name}: 후공 보정 카드 +${extra}`, 'sys'); }
    const hpBonus = RULES.SECOND_HP_BONUS || 0;
    if (hpBonus > 0) { const q = this.players[1]; q.maxHp += hpBonus; q.hp += hpBonus; this.log(`${q.name}: 후공 보정 라이프 +${hpBonus}`, 'sys'); }
    this.beginTurn();
  }

  // ---- 턴 시작: AP 충전 → 드로우 → 재생 → 메인 ----
  beginTurn() {
    if (this.phase === 'over') return;
    this.turn++;
    const p = this.cur;
    this.emit({ type: 'turnStart', player: p, turn: this.turn });
    this.log(`${p.name}의 턴 ${this.round()}`, 'turn');
    p.maxAp = Math.min(RULES.MAX_AP, Math.max(p.maxAp + 1, RULES.START_AP || 1));
    // 남은 AP 이월(AP_CARRY만큼까지) 후 최대치만큼 충전
    p.ap = p.maxAp + Math.min(p.ap, RULES.AP_CARRY || 0);
    if (p === this.players[1] && this.turn === 2 && RULES.SECOND_AP_BONUS) {
      p.ap += RULES.SECOND_AP_BONUS;
      this.log(`${p.name}: 후공 보급 AP +${RULES.SECOND_AP_BONUS}`, 'sys');
    }
    this.emit({ type: 'apGain', player: p });
    if (this.turn > 1) p.draw(1, this);
    // 작전 시간 초과: 정해진 라운드부터 턴을 시작하는 쪽이 1, 2, 3… 늘어나는 피해를 받는다 (교착 방지)
    const ot = this.overtimeDamage();
    if (ot > 0) {
      this.log(`작전 시간 초과! ${p.name}에게 피해 ${ot}`, 'sys');
      this.emit({ type: 'overtime', player: p, v: ot });
      this.damageCmd(p, ot, null);
      if (this.phase === 'over') return;
    }
    p.units().forEach(u => {
      if (u.kw['재생'] && u.hp < u.maxHp) {
        const v = Math.min(u.kw['재생'], u.maxHp - u.hp);
        u.hp += v; p.stats.healed += v;
        this.emit({ type: 'heal', unit: u, v });
      }
    });
    this.phase = 'main';
  }

  // ---- 카드 사용 ----
  // 유닛: lane 지정. 스킬: target = { unit } | { cmd: player } | null
  canPlay(card, lane, target) {
    const p = this.cur;
    if (this.phase !== 'main' || !p.hand.includes(card) || !p.canAfford(card)) return false;
    if (card.kind === 'unit') return lane !== undefined && lane !== null && p.placeableLanes(this.turn, card).includes(lane);
    const need = skillTargetKind(card);
    if (need === 'enemyUnit') return !!(target && target.unit && target.unit.owner !== p);
    if (need === 'allyUnit') return !!(target && target.unit && target.unit.owner === p);
    if (need === 'any') return !!(target && ((target.unit && target.unit.owner !== p) || (target.cmd && target.cmd !== p)));
    return true;
  }

  play(card, lane, target) {
    if (!this.canPlay(card, lane, target)) return false;
    const p = this.cur;
    p.ap -= card.c;
    p.hand.splice(p.hand.indexOf(card), 1);
    if (card.kind === 'unit') {
      const old = p.lanes[lane];
      if (old) {
        // 교체 배치: AP를 더 내고, 원래 전투원은 철수해 묘지로 간다 (격파가 아니므로 격파 효과는 없다)
        p.ap -= RULES.REPLACE_COST || 0;
        p.lanes[lane] = null;
        if (!old.card.token) p.grave.push(old.card);
        this.emit({ type: 'withdraw', unit: old, lane, player: p });
        this.log(`${p.name}: ${old.card.n} 철수`);
      }
      const u = makeUnit(card, p);
      u.summonedTurn = this.turn;
      p.lanes[lane] = u;
      p.stats.unitsPlayed++;
      this.emit({ type: 'summon', unit: u, lane, player: p });
      this.log(`${p.name}: ${card.n} 배치 (${LANE_NAMES[lane]})`);
      if (card.deploy) this.runEffects(card.deploy, p, { unit: u, lane, src: card });
    } else {
      p.grave.push(card);
      p.stats.skillsUsed++;
      this.emit({ type: 'skill', card, player: p, target });
      this.log(`${p.name}: ${card.n} 사용`, 'skill');
      this.runEffects(card.fx, p, { target, src: card });
    }
    return true;
  }

  // ---- 작전 지시 (사령관 능력): 턴당 1회, AP를 써서 적 유닛이나 상대 라이프에 피해 ----
  // target을 생략하면 지금 쓸 수 있는지만 확인한다
  canCommand(target) {
    const p = this.cur, c = RULES.COMMAND;
    if (!c || this.phase !== 'main' || p.cmdUsed === this.turn || p.ap < c.cost) return false;
    if (target === undefined) return true;
    return !!(target && ((target.unit && target.unit.owner !== p && p.lanes.indexOf(target.unit) < 0) || (target.cmd && target.cmd !== p)));
  }
  command(target) {
    if (!this.canCommand(target)) return false;
    const p = this.cur;
    p.ap -= RULES.COMMAND.cost; p.cmdUsed = this.turn; p.stats.commands = (p.stats.commands || 0) + 1;
    this.emit({ type: 'skill', card: COMMAND_CARD, player: p, target });
    this.log(`${p.name}: 작전 지시 — 포격 지원`, 'skill');
    this.runEffects(COMMAND_CARD.fx, p, { target, src: null });
    return true;
  }
  // ---- 이동: 턴마다 한 번, AP를 써서 내 전투원을 이웃 레인으로 옮긴다. 아군이 있으면 자리를 바꾼다 ----
  canMove(u, lane) {
    const p = this.cur, c = RULES.MOVE_COST;
    if (c === undefined || this.phase !== 'main' || !u || u.owner !== p || p.movedTurn === this.turn || p.ap < c) return false;
    const from = p.lanes.indexOf(u);
    if (lane === undefined) return from >= 0;
    return from >= 0 && Math.abs(lane - from) === 1;
  }
  move(u, lane) {
    if (!this.canMove(u, lane)) return false;
    const p = this.cur, from = p.lanes.indexOf(u), other = p.lanes[lane];
    p.ap -= RULES.MOVE_COST; p.movedTurn = this.turn;
    p.lanes[lane] = u; p.lanes[from] = other;
    this.emit({ type: 'move', unit: u, from, lane, player: p, swap: other || null });
    this.log(`${p.name}: ${u.card.n} 이동 (${LANE_NAMES[from]} → ${LANE_NAMES[lane]})${other ? ` · ${other.card.n}와 자리 바꿈` : ''}`);
    return true;
  }
  // AI·도구용: 행동 하나를 실행 ({ card, lane } | { card, target } | { command: true, target } | { move: true, unit, lane })
  act(a) {
    if (a.move) return this.move(a.unit, a.lane);
    if (a.command) return this.command(a.target);
    return a.card.kind === 'unit' ? this.play(a.card, a.lane) : this.play(a.card, null, a.target);
  }

  // ---- 효과 처리 ----
  runEffects(fx, p, ctx) {
    const o = this.other(p);
    for (const e of fx) {
      if (this.phase === 'over') return;
      const targets = this.resolveTargets(e.tgt, p, ctx);
      switch (e.op) {
        case 'dmg':
          this.emit({ type: 'fx', op: 'dmg', src: ctx.src, player: p, from: ctx.unit, targets });
          targets.forEach(t => t.unit ? this.damageUnit(t.unit, e.v, null, ctx.src) : this.damageCmd(t.cmd, e.v, ctx.src));
          break;
        case 'heal':
          targets.forEach(t => {
            if (t.cmd) { const v = Math.min(e.v, t.cmd.maxHp - t.cmd.hp); t.cmd.hp += v; p.stats.healed += v; this.emit({ type: 'healCmd', player: t.cmd, v }); }
            else if (t.unit) { const v = Math.min(e.v, t.unit.maxHp - t.unit.hp); t.unit.hp += v; p.stats.healed += v; this.emit({ type: 'heal', unit: t.unit, v }); }
          });
          break;
        case 'healAll':
          p.units().forEach(u => { const v = Math.min(e.v, u.maxHp - u.hp); u.hp += v; p.stats.healed += v; this.emit({ type: 'heal', unit: u, v }); });
          break;
        case 'healFull':
          targets.forEach(t => { if (t.unit) { const v = t.unit.maxHp - t.unit.hp; t.unit.hp = t.unit.maxHp; p.stats.healed += v; this.emit({ type: 'heal', unit: t.unit, v }); } });
          break;
        case 'buff':
          targets.forEach(t => { if (t.unit) { t.unit.atk += e.a || 0; t.unit.hp += e.h || 0; t.unit.maxHp += e.h || 0; this.emit({ type: 'buff', unit: t.unit, a: e.a || 0, h: e.h || 0 }); } });
          break;
        case 'buffAll':
          p.units().forEach(u => { if (ctx.unit && u === ctx.unit) return; u.atk += e.a || 0; u.hp += e.h || 0; u.maxHp += e.h || 0; this.emit({ type: 'buff', unit: u, a: e.a || 0, h: e.h || 0 }); });
          break;
        case 'debuff':
          targets.forEach(t => { if (t.unit && t.unit.hp > 0) { t.unit.atk = Math.max(0, t.unit.atk - (e.a || 0)); this.emit({ type: 'debuff', unit: t.unit, a: e.a || 0 }); } });
          break;
        case 'shield':
          targets.forEach(t => { if (t.unit) { t.unit.shield = Math.max(t.unit.shield, e.v); this.emit({ type: 'shield', unit: t.unit, v: e.v }); } });
          break;
        case 'evade':
          targets.forEach(t => { if (t.unit) { t.unit.evade = true; this.emit({ type: 'evadeGain', unit: t.unit }); } });
          break;
        case 'slow':
          targets.forEach(t => { if (t.unit && t.unit.hp > 0) { t.unit.slowed = true; this.emit({ type: 'slow', unit: t.unit }); } });
          break;
        case 'draw': p.draw(e.v, this); break;
        case 'res': { // 이번 턴 AP 추가
          p.ap += e.v; this.emit({ type: 'apGain', player: p, v: e.v });
          break;
        }
        case 'summon': {
          p.emptyLanes().forEach(l => {
            const u = makeUnit(CARDS[e.card], p); u.summonedTurn = this.turn; p.lanes[l] = u;
            this.emit({ type: 'summon', unit: u, lane: l, player: p, token: true });
          });
          break;
        }
        case 'destroyLowest': {
          const us = o.units().filter(u => !e.v || u.hp <= e.v); if (!us.length) { this.log('처치할 대상이 없습니다.', 'sys'); break; }
          const low = us.reduce((a, b) => (b.hp < a.hp ? b : a));
          this.emit({ type: 'fx', op: 'destroy', src: ctx.src, player: p, from: ctx.unit, targets: [{ unit: low }] });
          this.log(`${low.card.n}이(가) 처치됩니다.`);
          this.killUnit(low, ctx.src, p);
          break;
        }
        case 'sacrificeBlast': {
          const t = targets[0];
          if (t && t.unit) {
            const dmg = t.unit.atk; this.killUnit(t.unit, null, null);
            this.emit({ type: 'fx', op: 'dmg', src: ctx.src, player: p, targets: o.units().map(u => ({ unit: u })) });
            o.units().forEach(u => this.damageUnit(u, dmg, null, ctx.src));
          }
          break;
        }
      }
    }
  }

  resolveTargets(tgt, p, ctx) {
    const o = this.other(p);
    switch (tgt) {
      case 'oppUnit': { const u = ctx.lane !== undefined ? o.lanes[ctx.lane] : null; return u ? [{ unit: u }] : []; }
      case 'allEnemyUnits': return o.units().map(u => ({ unit: u }));
      case 'enemyCmd': return [{ cmd: o }];
      case 'myCmd': return [{ cmd: p }];
      case 'randomEnemyUnit': { const us = o.units(); return us.length ? [{ unit: us[Math.floor(this.random() * us.length)] }] : []; }
      case 'self': return ctx.unit ? [{ unit: ctx.unit }] : [];
      case 'adjAllies': {
        if (ctx.lane === undefined) return [];
        return [ctx.lane - 1, ctx.lane + 1].filter(l => l >= 0 && l < 3 && p.lanes[l]).map(l => ({ unit: p.lanes[l] }));
      }
      case 'allAllies': return p.units().map(u => ({ unit: u }));
      case 'pickEnemyUnit': case 'pickAllyUnit': case 'pickAny':
        return ctx.target ? [ctx.target] : [];
      default: return [];
    }
  }

  // ---- 피해 ----
  // attacker: 공격한 유닛(전투), src: 피해 출처 카드(통계용)
  damageUnit(u, dmg, attacker, src) {
    if (u.hp <= 0 || !u.owner.lanes.includes(u)) return 0;
    let d = dmg;
    if (d <= 0) return 0; // 공격력 0은 피해가 없다 (회피도 쓰지 않고, 보호기 최소 피해 1 규칙보다 먼저)
    if (u.evade) { u.evade = false; this.emit({ type: 'evade', unit: u }); this.log(`${u.card.n}이(가) 회피!`); return 0; }
    if (attacker && u.role === 'DEF' && RULES.DEF_ROLE_ARMOR) d = Math.max(1, d - RULES.DEF_ROLE_ARMOR);
    if (u.shield > 0) { const ab = Math.min(u.shield, d); u.shield -= ab; d -= ab; this.emit({ type: 'shieldHit', unit: u, v: ab }); }
    const dealt = Math.min(d, Math.max(0, u.hp));
    u.hp -= d;
    const srcCard = attacker ? attacker.card : src;
    const srcOwner = attacker ? attacker.owner : this.other(u.owner);
    srcOwner.stats.dmgUnits += dealt;
    if (srcCard) srcOwner.stats.cardDmg[srcCard.id] = (srcOwner.stats.cardDmg[srcCard.id] || 0) + dealt;
    this.emit({ type: 'dmg', unit: u, v: d });
    const overkill = u.hp < 0 ? -u.hp : 0;
    if (attacker && u.hp > 0 && u.kw['반격'] && attacker.hp > 0) {
      this.log(`${u.card.n}의 반격!`);
      this.emit({ type: 'counter', unit: u, target: attacker });
      this.damageUnit(attacker, u.atk, null, u.card);
    }
    if (u.hp <= 0) this.killUnit(u, srcCard, srcOwner);
    return overkill;
  }

  damageCmd(p, dmg, src) {
    if (this.phase === 'over') return;
    if (p.minHp) dmg = Math.min(dmg, Math.max(0, p.hp - p.minHp)); // 튜토리얼: 라이프가 minHp 아래로 내려가지 않는다 (지지 않는 첫 대국)
    p.hp -= dmg;
    const o = this.other(p);
    o.stats.dmgCmd += dmg;
    if (src) o.stats.cardDmg[src.id] = (o.stats.cardDmg[src.id] || 0) + dmg;
    this.emit({ type: 'dmgCmd', player: p, v: dmg });
    if (p.hp <= 0) {
      p.hp = 0; this.phase = 'over'; this.winner = o;
      this.log(`${o.name} 승리!`, 'turn');
      this.emit({ type: 'gameOver', winner: this.winner });
    }
  }

  killUnit(u, killerCard, killer) {
    const p = u.owner;
    const lane = p.lanes.indexOf(u);
    if (lane < 0) return;
    p.lanes[lane] = null;
    if (!u.card.token) p.grave.push(u.card);
    if (killer && killer !== p) killer.stats.kills++;
    this.emit({ type: 'die', unit: u, lane });
    this.log(`${u.card.n} 격파됨.`, 'die');
    if (u.card.death) this.runEffects(u.card.death, p, { unit: u, lane, src: u.card });
  }

  // ---- 공격력 계산 (지원기 오라) ----
  effectiveAtk(u) {
    const p = u.owner; const lane = p.lanes.indexOf(u);
    let a = u.atk;
    [lane - 1, lane + 1].forEach(l => { if (l >= 0 && l < 3 && p.lanes[l] && p.lanes[l].role === 'SUP') a += 1; });
    return a;
  }
  canAttack(u) { return !(u.summonedTurn === this.turn && !u.kw['돌격']); }

  // ---- 턴 종료: 전투 ----
  endTurn() {
    if (this.phase !== 'main') return;
    this.phase = 'combat';
    this.resolveCombat();
    if (this.phase === 'over') return;
    this.emit({ type: 'turnEnd', player: this.cur });
    this.current = 1 - this.current;
    this.beginTurn();
  }

  resolveCombat() {
    const p = this.cur;
    for (let lane = 0; lane < 3; lane++) {
      if (this.phase === 'over') break;
      const u = p.lanes[lane];
      if (!u || u.hp <= 0) continue;
      if (!this.canAttack(u)) continue;
      if (u.slowed) { u.slowed = false; this.emit({ type: 'skip', unit: u }); this.log(`${u.card.n}은(는) 둔화로 공격하지 못합니다.`); continue; }
      this.attack(u, lane);
      // 공격 후 효과: 공격한 유닛이 살아 있으면 발동한다
      if (u.card.strike && u.hp > 0 && p.lanes[lane] === u && this.phase !== 'over') {
        this.emit({ type: 'strike', unit: u });
        this.runEffects(u.card.strike, p, { unit: u, lane, src: u.card });
      }
    }
  }

  attack(u, lane) {
    const p = u.owner, o = this.other(p);
    const atk = this.effectiveAtk(u);
    if (u.kw['광역'] && o.units().length) {
      this.emit({ type: 'attack', unit: u, lane, aoe: true, targets: o.units() });
      this.log(`${u.card.n}의 광역 공격!`);
      o.units().forEach(t => this.damageUnit(t, atk + this.typeBonus(u, t), u));
      return;
    }
    // 대상 결정: 마주한 적 → 인접 보호기 → 사령관
    let target = o.lanes[lane];
    if (!target) {
      const guards = [lane - 1, lane + 1].filter(l => l >= 0 && l < 3 && o.lanes[l] && o.lanes[l].role === 'DEF');
      if (guards.length) { target = o.lanes[guards[0]]; this.log(`${target.card.n}이(가) 보호합니다.`); this.emit({ type: 'guard', unit: target }); o.stats.guards = (o.stats.guards || 0) + 1; }
    }
    if (target) {
      const dmg = atk + this.typeBonus(u, target);
      this.emit({ type: 'attack', unit: u, lane, targetUnit: target, advantage: this.typeBonus(u, target) > 0 });
      const over = this.damageUnit(target, dmg, u);
      if (over > 0 && (u.kw['관통'] || (RULES.ATK_ROLE_PIERCE && u.role === 'ATK')) && this.phase !== 'over') {
        this.log(`${u.card.n}의 관통 피해 ${over}!`);
        this.emit({ type: 'pierce', unit: u, v: over });
        this.damageCmd(o, over, u.card);
      }
    } else {
      this.emit({ type: 'attack', unit: u, lane, targetCmd: o });
      this.log(`${u.card.n} → ${o.name} 직격 ${atk}`);
      this.damageCmd(o, atk, u.card);
    }
  }

  typeBonus(att, def) {
    if (TYPE_BEATS[att.type] !== def.type) return 0;
    return RULES.TYPE_BONUS + (att.role === 'ATK' ? (RULES.ATK_ROLE_TYPE_BONUS || 0) : 0);
  }

  // ---- 상태 복제 (AI 탐색 / 전투 예측용) ----
  clone() {
    const g = Object.create(Game.prototype);
    g.opts = this.opts; g.turn = this.turn; g.current = this.current; g.phase = this.phase; g.seed = this.seed;
    g.events = []; g.logs = []; g.quiet = true; g.noEvents = true;
    const map = new Map();
    g.players = this.players.map(p => {
      const q = Object.create(Player.prototype);
      Object.assign(q, p);
      q.deck = p.deck.slice(); q.hand = p.hand.slice(); q.grave = p.grave.slice();

      q.stats = { ...p.stats, cardDmg: { ...p.stats.cardDmg } };
      map.set(p, q);
      return q;
    });
    g.players.forEach((q, i) => { q.lanes = this.players[i].lanes.map(u => (u ? { ...u, owner: q } : null)); });
    g.winner = this.winner ? map.get(this.winner) : null;
    return g;
  }

  // 지정 플레이어가 지금 전투를 치르면 어떻게 되는지 예측 (UI 표시용)
  // 반환: { hits: [{ fromUid, toUid | 'cmd', v, evaded }], cmdDmg(시간 초과 피해 포함), overtime, lethal, deadUids:Set }
  forecast(player) {
    const g = this.clone();
    const idx = this.players.indexOf(player);
    if (g.current !== idx) { g.current = idx; g.turn += 1; }
    g.phase = 'combat'; g.noEvents = false;
    const opp = g.players[1 - idx];
    const hpBefore = opp.hp;
    g.resolveCombat();
    const hits = []; let curFrom = null;
    const dead = new Set();
    for (const e of g.events) {
      if (e.type === 'attack') curFrom = e.unit.uid;
      else if (e.type === 'dmg') hits.push({ fromUid: curFrom, toUid: e.unit.uid, v: e.v });
      else if (e.type === 'evade') hits.push({ fromUid: curFrom, toUid: e.unit.uid, v: 0, evaded: true });
      else if (e.type === 'dmgCmd') hits.push({ fromUid: curFrom, toUid: 'cmd', v: e.v });
      else if (e.type === 'die') dead.add(e.unit.uid);
    }
    // 전투 직후 상대 턴이 시작되며 받는 작전 시간 초과 피해도 포함한다
    const overtime = opp.hp > 0 ? g.overtimeDamage(Math.ceil((g.turn + 1) / 2)) : 0;
    opp.hp -= overtime;
    return { hits, cmdDmg: hpBefore - opp.hp, overtime, lethal: opp.hp <= 0, deadUids: dead };
  }
}

// ---- 직렬화 (전투 이어하기) ----
function serializeGame(g) {
  const ids = arr => arr.map(c => c.id);
  return {
    v: 2, turn: g.turn, current: g.current, phase: g.phase, seed: g.seed, logs: g.logs.slice(-60), winner: g.winner ? g.players.indexOf(g.winner) : -1,
    players: g.players.map(p => ({
      name: p.name, isAI: p.isAI, portrait: p.portrait, style: p.style, maxHp: p.maxHp, hp: p.hp, deckIds: p.deckIds,
      deck: ids(p.deck), hand: ids(p.hand), grave: ids(p.grave), factions: p.factions,
      ap: p.ap, maxAp: p.maxAp, cmdUsed: p.cmdUsed || 0, movedTurn: p.movedTurn || 0, mulliganDone: p.mulliganDone !== false, stats: JSON.parse(JSON.stringify(p.stats)),
      lanes: p.lanes.map(u => u && { cardId: u.cardId, atk: u.atk, hp: u.hp, maxHp: u.maxHp, shield: u.shield, evade: u.evade, slowed: u.slowed, summonedTurn: u.summonedTurn }),
    })),
  };
}
function restoreGame(snap) {
  const g = Object.create(Game.prototype);
  Object.assign(g, { opts: {}, turn: snap.turn, current: snap.current, phase: snap.phase, seed: snap.seed ?? Math.floor(Math.random() * 4294967296), events: [], logs: (snap.logs || []).slice(), winner: null, quiet: false, noEvents: false });
  const card = id => { if (!CARDS[id]) throw new Error('unknown card ' + id); return CARDS[id]; };
  g.players = snap.players.map(sp => {
    const p = Object.create(Player.prototype);
    Object.assign(p, { name: sp.name, isAI: sp.isAI, portrait: sp.portrait, style: sp.style || 'balanced', maxHp: sp.maxHp, hp: sp.hp, deckIds: sp.deckIds,
      deck: sp.deck.map(card), hand: sp.hand.map(card), grave: sp.grave.map(card), factions: sp.factions,
      ap: sp.ap || 0, maxAp: sp.maxAp || 0, cmdUsed: sp.cmdUsed || 0, movedTurn: sp.movedTurn || 0, stats: { ...newStats(), ...sp.stats }, mulliganDone: sp.mulliganDone !== false });
    p.lanes = sp.lanes.map(su => {
      if (!su) return null;
      const u = makeUnit(card(su.cardId), p);
      Object.assign(u, { atk: su.atk, hp: su.hp, maxHp: su.maxHp, shield: su.shield, evade: su.evade, slowed: su.slowed, summonedTurn: su.summonedTurn });
      return u;
    });
    return p;
  });
  if (snap.phase === 'over' && snap.winner >= 0) g.winner = g.players[snap.winner];
  return g;
}

const LANE_NAMES = ['좌익', '중앙', '우익'];

function skillTargetKind(card) {
  const t = (card.fx || []).map(e => e.tgt);
  if (t.includes('pickAny')) return 'any';
  if (t.includes('pickEnemyUnit')) return 'enemyUnit';
  if (t.includes('pickAllyUnit')) return 'allyUnit';
  return 'none';
}

function validateDeck(ids) {
  if (ids.length !== RULES.DECK_SIZE) return `덱은 ${RULES.DECK_SIZE}장이어야 합니다 (현재 ${ids.length}장).`;
  if (new Set(ids).size !== ids.length) return '같은 카드는 1장만 넣을 수 있습니다.';
  const fs = new Set(ids.map(id => CARDS[id] && CARDS[id].f));
  if ([...fs].some(f => !f)) return '알 수 없는 카드가 포함되어 있습니다.';
  if (fs.size > RULES.MAX_FACTIONS) return `제작사는 최대 ${RULES.MAX_FACTIONS}개까지입니다.`;
  return null;
}
