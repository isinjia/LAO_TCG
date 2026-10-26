// 헤드리스 Chrome으로 실제 UI 흐름을 검사한다 (의존성 없음: Node 22 내장 WebSocket + DevTools 프로토콜)
// 사용법: node tools/ui_test.js            (Chrome 경로는 CHROME 환경변수로 바꿀 수 있음)
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => fs.existsSync(p));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function main() {
  if (!CHROME) { console.log('SKIP: Chrome/Edge를 찾을 수 없습니다 (CHROME 환경변수로 지정).'); return; }
  const srv = await serve(); const port = srv.address().port;
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'laotcg-'));
  const dbg = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${dbg}`, `--user-data-dir=${profile}`, '--window-size=1600,900', '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json()).find(t => t.type === 'page'); } catch (e) {} }
  if (!target) throw new Error('Chrome DevTools에 연결할 수 없습니다');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const errors = [];
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push(m.params.args.map(a => a.value || a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.url || '')) errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr, timeout = 120000) => {
    const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true, timeout });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception ? r.result.exceptionDetails.exception.description : r.result.exceptionDetails.text);
    return r.result.result.value;
  };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  const load = async () => {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/?dev` });
    await sleep(800);
    await ev(`for (let i = 0; i < 200 && (typeof currentScreen === 'undefined' || currentScreen !== 'lobby'); i++) await new Promise(r => setTimeout(r, 100));
      const s = document.createElement('script'); s.src = 'tools/uibot.js'; document.head.appendChild(s); await new Promise(r => s.onload = r);
      Store.settings.speed = 3; applySpeedVar(); return currentScreen;`);
  };

  let pass = 0, fail = 0;
  const t = async (name, fn) => {
    const e0 = errors.length;
    try { await fn(); if (errors.length > e0) throw new Error('콘솔 오류: ' + errors.slice(e0).join(' | ')); pass++; console.log('ok  ', name); }
    catch (e) { fail++; console.log('FAIL', name, '-', e.message.split('\n')[0]); }
  };

  await send('Page.navigate', { url: `http://127.0.0.1:${port}/?dev` }); await sleep(500);
  await ev(`localStorage.clear(); return 1;`);
  await load();

  await t('모든 화면 열기', async () => {
    const r = await ev(`const out = {}; for (const s of ['campaign', 'deck', 'collection', 'setup', 'lobby']) { await showScreen(s); out[s] = document.querySelector('#scr-' + s).childElementCount; } openHowTo(); closeModal(topModal()); openSettings(false); closeModal(topModal()); openCardDetail(CARDS['3P_Labiata'], POOL); closeModal(topModal()); return out;`);
    for (const [k, v] of Object.entries(r)) if (!v) throw new Error(k + ' 화면이 비어 있음');
  });

  await t('튜토리얼 완주 → 승리·보상 해금', async () => {
    await ev(`launchStage(0); for (let i = 0; i < 50 && !document.querySelector('#dialogue.show'); i++) await new Promise(r => setTimeout(r, 100)); document.querySelector('#dialogue .dl-skip').click(); return 1;`);
    let r;
    for (let k = 0; k < 6; k++) { r = await ev(`return await uiBot(100000);`); if (r.done) break; }
    if (!r.done) throw new Error('끝나지 않음: ' + JSON.stringify(r));
    if (r.winner !== '오렌지에이드') throw new Error('패배: ' + JSON.stringify(r));
    const u = await ev(`await new Promise(r => setTimeout(r, 1500)); return { unlocked: Store.data.unlocked, reward: !!document.querySelector('.rs-reward'), tut: Store.data.tutorialDone };`);
    if (!u.unlocked.includes('3P_Fenrir') || !u.reward || !u.tut) throw new Error(JSON.stringify(u));
  });

  await t('재도전 경쟁 상태: 이전 전투가 새 전투를 끝내지 않음', async () => {
    const r = await ev(`closeModal(topModal()); B = null;
      startBattle({ mode: 'quick', myDeck: PRESET_DECKS[0].cards, myDeckName: 't', enemy: { name: 'X', deck: PRESET_DECKS[1].cards, level: 'normal', portrait: 'BR_Phoenix', hp: 25 }, first: 'me', bg: 'board', bgm: 'battle1' });
      await uiBot(60000, 2);
      document.querySelector('.end-btn').click(); await new Promise(r => setTimeout(r, 150));
      B.over = true; B.game.phase = 'over'; B.game.winner = B.ai; finishBattle(true);
      await new Promise(r => setTimeout(r, 1200));
      const rec = Store.data.record.l;
      document.querySelector('[data-a=retry]').click();
      await new Promise(r => setTimeout(r, 6000));
      return { phase: B.game.phase, result: !!document.querySelector('.result'), rec, rec2: Store.data.record.l, round: B.game.round() };`);
    if (r.result || r.rec2 !== r.rec) throw new Error('유령 결과: ' + JSON.stringify(r));
  });

  await t('이어하기: 새로고침 후 같은 상태로 복원', async () => {
    const before = await ev(`closeModal(topModal()); B = null;
      startBattle({ mode: 'quick', myDeck: PRESET_DECKS[2].cards, myDeckName: 't', enemy: { name: 'Y', deck: PRESET_DECKS[3].cards, level: 'hard', portrait: 'DS_Saraqael', hp: 25 }, first: 'me', bg: 'board', bgm: 'battle1' });
      await uiBot(80000, 3); return Store.loadBattle() && Store.loadBattle().round;`);
    if (!before) throw new Error('저장 없음');
    await load();
    const r = await ev(`const item = document.querySelector('[data-go=resume]'); if (!item) return { item: false }; item.click();
      for (let i = 0; i < 60 && !(B && B.game); i++) await new Promise(r => setTimeout(r, 100));
      await new Promise(r => setTimeout(r, 2500));
      return { item: true, round: B.game.round(), units: document.querySelectorAll('.unit').length, logs: document.querySelectorAll('.log-list div').length };`);
    if (!r.item || r.round < 1) throw new Error(JSON.stringify(r));
    let f;
    for (let k = 0; k < 6; k++) { f = await ev(`return await uiBot(100000);`); if (f.done) break; }
    if (!f.done) throw new Error('복원 후 끝나지 않음');
    const cleared = await ev(`await new Promise(r => setTimeout(r, 1200)); return !Store.loadBattle();`);
    if (!cleared) throw new Error('결과 후 저장이 남아 있음');
  });

  await t('덱 편성: 잠긴 카드 추가 불가, 자동 채우기', async () => {
    const r = await ev(`closeModal(topModal()); B = null; await showScreen('deck');
      document.querySelector('[data-a=new]').click(); await new Promise(r => setTimeout(r, 200));
      const locked = [...document.querySelectorAll('.pool-grid .card.locked')]; if (locked.length) locked[0].click();
      const afterLocked = editing.cards.length;
      document.querySelector('[data-a=auto]').click(); await new Promise(r => setTimeout(r, 200));
      return { lockedShown: locked.length, afterLocked, size: editing.cards.length, problem: Store.deckProblem(editing.cards) };`);
    if (r.afterLocked !== 0 || r.size !== 12 || r.problem) throw new Error(JSON.stringify(r));
  });

  console.log(`${pass} passed, ${fail} failed`);
  ws.close(); chrome.kill(); srv.close();
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {}
  if (fail) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; process.exit(); });
