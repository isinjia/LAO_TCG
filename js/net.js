// ===== 대전 모드 연결 (P2P) =====
// 우리 서버 없이 상대를 찾는다: 기다리는 지휘관끼리 공개 Nostr 중계소의 대기실(Trystero)에서 만나 짝을 정하고,
// 짝이 정해지면 두 브라우저가 직접 연결(WebRTC)해 행동을 주고받는다. 중계소는 만날 때만 쓴다.
// 라이브러리·중계소가 없거나 기다리는 사람이 없으면 null로 끝나고, 대전 모드는 인공지능 상대로 넘어간다. (LAO_Royal의 js/net.js와 같은 방식)
(function () {
  const LIB = 'https://cdn.jsdelivr.net/npm/trystero@0.25.4/+esm';
  const APP = 'laotcg-isinjia';
  const PROTO = 1; // 주고받는 약속이 바뀌면 올린다: 옛 판과 새 판은 서로 만나지 않는다
  // 응답하는 중계소만 고른 목록 (라이브러리 기본 목록에는 꺼졌거나 인증서가 깨진 곳이 있어 앱 안 브라우저가 경고를 띄운다)
  const RELAYS = ['wss://nos.lol', 'wss://relay.mostro.network', 'wss://nostr-01.yakihonne.com', 'wss://relay.sigit.io', 'wss://schnorr.me', 'wss://yabu.me/v2', 'wss://nostr.data.haus', 'wss://strfry.shock.network'];
  let lib = null;
  async function load() { if (!lib) lib = await import(LIB); return lib; }

  // find(profile, ms, blocked) → { guest, seed, foe, send(msg), listen(fn), close() } | null. cancel()은 찾기를 멈춘다
  // blocked(상대 프로필): 최근에 만난 상대·등급 점수 차가 큰 상대 등 지금은 짝짓지 않을 상대면 true
  // 같은 게임 버전끼리만 만난다 (카드 수치가 다르면 두 기기의 판이 어긋난다)
  let cancelFn = null, active = null; // active: 이 페이지가 들어가 있는 대기실 (새로 찾기 전에 나간다)
  const leaveActive = () => { if (active) { try { active.leave(); } catch (e) { /* 이미 나감 */ } active = null; } };
  function find(profile, ms, blocked) {
    const no = p => !!(blocked && blocked(p));
    return new Promise(resolve => {
      let done = false, room = null, engaged = null, seed = 0, inviteT = null, again = null;
      const finish = v => {
        if (done) return; done = true; clearTimeout(timer); clearTimeout(inviteT); clearInterval(again); cancelFn = null;
        if (!v && room) { if (active === room) active = null; try { room.leave(); } catch (e) { /* 이미 나감 */ } }
        resolve(v);
      };
      const timer = setTimeout(() => finish(null), ms);
      cancelFn = () => finish(null);
      load().then(L => {
        if (done) return;
        const me = Object.assign({ v: PROTO }, profile);
        leaveActive();
        room = active = L.joinRoom({ appId: APP, relayConfig: { urls: RELAYS, warnOnRelayFailure: false } }, `lobby-v${PROTO}-${typeof GAME_VER === 'string' ? GAME_VER : ''}`);
        const hello = room.makeAction('hello'), invite = room.makeAction('invite'), accept = room.makeAction('accept'), game = room.makeAction('game');
        const say = () => hello.send(me);
        say();
        again = setInterval(() => { if (!done && !engaged) say(); }, 1500); // (조금 전 건너뛴 상대가 이제는 맞을 수 있다: 범위가 넓어진다)
        room.onPeerJoin = pid => { if (!done) hello.send(me, { target: pid }); };
        // 아이디가 작은 쪽이 초대한다: 기다리던 두 사람이 동시에 서로를 초대하지 않게
        hello.onMessage = (them, { peerId }) => {
          if (done || engaged || !them || them.v !== PROTO || no(them)) return;
          if (L.selfId < peerId) {
            engaged = peerId; seed = (Math.random() * 2147483647) | 0;
            invite.send({ seed, p: me }, { target: peerId });
            inviteT = setTimeout(() => { if (!done && engaged === peerId) { engaged = null; say(); } }, 4000); // 답이 없으면 다시 자유롭게
          }
        };
        invite.onMessage = (m, { peerId }) => {
          if (done || (engaged && engaged !== peerId) || !m || !m.p || m.p.v !== PROTO || no(m.p)) return;
          engaged = peerId; accept.send({ p: me }, { target: peerId });
          link(true, m.seed, m.p, peerId);
        };
        accept.onMessage = (m, { peerId }) => { if (done || engaged !== peerId || !m || !m.p) return; if (no(m.p)) { engaged = null; return; } link(false, seed, m.p, peerId); };
        // 짝이 정해졌다: 상대와의 전용 통로 (배틀 화면이 들을 준비가 될 때까지 받은 메시지는 쌓아 둔다)
        function link(guest, sd, p, peerId) {
          let fn = null; const early = [];
          game.onMessage = (m, { peerId: from }) => { if (from !== peerId) return; if (fn) fn(m); else early.push(m); };
          room.onPeerLeave = pid => { if (pid !== peerId) return; const m = { k: 'left' }; if (fn) fn(m); else early.push(m); };
          finish({
            guest, seed: sd, foe: p,
            send: m => { try { game.send(m, { target: peerId }); } catch (e) { /* 닫히는 중 */ } },
            listen: f => { fn = f; while (early.length) f(early.shift()); },
            close: () => { if (active === room) active = null; try { room.leave(); } catch (e) { /* 이미 나감 */ } },
          });
        }
      }).catch(() => finish(null));
    });
  }
  window.NET = { find, cancel: () => cancelFn && cancelFn() };
})();
