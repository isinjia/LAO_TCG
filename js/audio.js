// ===== 사운드: BGM 크로스페이드 + 효과음 =====
const Audio2 = {
  bgmA: null, bgmB: null, current: null, currentName: null, unlocked: false, pending: null,
  sfxCache: {},
  SFX: {
    click: 'pick.wav', pick: 'pick.wav', pickSS: 'pick_ss.wav', place: 'place.wav', card: 'card.wav',
    buff: 'buff.wav', res: 'res.wav', shot: 'shot.wav', rifle: 'rifle.wav', cannon: 'cannon.wav', beam: 'beam.wav',
    energy: 'energy.wav', explosion: 'explosion.wav', boom: 'boom_big.wav', boomSci: 'boom_scifi.wav',
    heal: 'heal.wav', shield: 'shield.wav', smoke: 'smoke.wav', swing: 'swing.wav', swingHeavy: 'swing_heavy.wav',
    zap: 'zap.wav', trans: 'trans.wav', warning: 'warning.wav', round: 'round.wav', start: 'battle_start.wav',
    win: 'win.wav', rankup: 'rankup.mp3',
  },
  init() {
    this.bgmA = new Audio(); this.bgmB = new Audio();
    [this.bgmA, this.bgmB].forEach(a => { a.loop = true; a.volume = 0; a.preload = 'auto'; });
    const unlock = () => {
      if (this.unlocked) return;
      this.unlocked = true;
      if (this.pending) { const n = this.pending; this.pending = null; this.bgm(n, true); }
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });
  },
  bgm(name, force) {
    if (!name) return;
    if (!this.unlocked) { this.pending = name; return; }
    if (this.currentName === name && !force) return;
    this.currentName = name;
    const next = this.current === this.bgmA ? this.bgmB : this.bgmA;
    const prev = this.current;
    next.src = `assets/bgm/${name}.mp3`;
    next.currentTime = 0;
    next.volume = 0;
    next.play().catch(() => {});
    this.current = next;
    this.fade(next, Store.settings.bgm, 900);
    if (prev) this.fade(prev, 0, 700, () => prev.pause());
  },
  fade(a, to, ms, done) {
    // 탭이 백그라운드여도 진행되도록 타이머 기반으로 페이드
    clearInterval(a._fade);
    const from = a.volume, t0 = performance.now();
    a._fade = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      a.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k >= 1) { clearInterval(a._fade); if (done) done(); }
    }, 40);
  },
  setBgmVolume(v) { if (this.current) this.current.volume = v; },
  play(name, vol = 1) {
    const file = this.SFX[name]; if (!file || !this.unlocked) return;
    const v = Store.settings.sfx * vol; if (v <= 0) return;
    let pool = this.sfxCache[name];
    if (!pool) pool = this.sfxCache[name] = [];
    let a = pool.find(x => x.paused || x.ended);
    if (!a) { if (pool.length >= 4) a = pool[0]; else { a = new Audio(`assets/sfx/${file}`); pool.push(a); } }
    try { a.currentTime = 0; a.volume = Math.min(1, v); a.play().catch(() => {}); } catch (e) {}
  },
};
