// ===== 사운드: BGM 크로스페이드 + 효과음 =====
const Audio2 = {
  bgmA: null, bgmB: null, current: null, currentName: null, unlocked: false, pending: null,
  muted: false, // 창이 포커스를 잃으면 true (모든 소리 끔)
  sfxCache: {},
  SFX: {
    click: 'pick.mp3', pick: 'pick.mp3', pickSS: 'pick_ss.mp3', place: 'place.mp3', card: 'card.mp3',
    buff: 'buff.mp3', res: 'res.mp3', shot: 'shot.mp3', rifle: 'rifle.mp3', cannon: 'cannon.mp3', beam: 'beam.mp3',
    energy: 'energy.mp3', explosion: 'explosion.mp3', boom: 'boom_big.mp3', boomSci: 'boom_scifi.mp3',
    heal: 'heal.mp3', shield: 'shield.mp3', smoke: 'smoke.mp3', swing: 'swing.mp3', swingHeavy: 'swing_heavy.mp3',
    zap: 'zap.mp3', trans: 'trans.mp3', warning: 'warning.mp3', round: 'round.mp3', start: 'battle_start.mp3',
    win: 'win.mp3', rankup: 'rankup.mp3',
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
    // 창이 포커스를 잃거나(다른 창 클릭·알트탭) 탭이 숨겨지면 소리를 끄고, 돌아오면 다시 켠다
    const sync = () => this.setMuted(document.hidden || !document.hasFocus());
    window.addEventListener('blur', sync);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    sync();
  },
  // 음소거는 볼륨 대신 muted 속성을 써서, 페이드·음량 설정과 BGM 재생 위치를 그대로 유지한다
  setMuted(m) {
    if (this.muted === m) return;
    this.muted = m;
    this.allEls().forEach(a => { a.muted = m; });
  },
  allEls() {
    const out = [this.bgmA, this.bgmB].filter(Boolean);
    Object.values(this.sfxCache).forEach(pool => out.push(...pool));
    return out;
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
    const file = this.SFX[name]; if (!file || !this.unlocked || this.muted) return;
    const v = Store.settings.sfx * vol; if (v <= 0) return;
    let pool = this.sfxCache[name];
    if (!pool) pool = this.sfxCache[name] = [];
    let a = pool.find(x => x.paused || x.ended);
    if (!a) { if (pool.length >= 4) a = pool[0]; else { a = new Audio(`assets/sfx/${file}`); pool.push(a); } }
    a.muted = this.muted;
    try { a.currentTime = 0; a.volume = Math.min(1, v); a.play().catch(() => {}); } catch (e) {}
  },
};
