// ===== 스토리: 오렌지에이드의 오르카 카드 마스터 리그 =====
// enemy.deck: 12장 (최대 3제작사), enemy.hp: 상대 라이프, enemy.level: AI 난이도
// enemy.start: 전투 시작 시 미리 배치된 적 유닛, stars: 별 조건 (win / hp / rounds)
// intro/outro: 대사. who는 초상화로 쓸 카드 id

const CAMPAIGN = [
  {
    id: 's0', no: '0', title: '첫 카드 수업', sub: '튜토리얼 · 연습 상대: 스파르탄 캡틴', bg: 'board', bgm: 'battle1', tutorial: true,
    desc: '카드 동아리 담당 콘스탄챠에게 기본 규칙을 배웁니다. AP, 배치, 전투, 상성을 차례로 익혀요.',
    playerDeck: ['3P_Poi', '3P_Hachiko', '3P_Ajax', '3P_Daphne', 'PECS_Orangeade', '3P_Aqua', '3P_Sowan', '3P_CSPerrault', '3P_BlackWyrm', '3P_ConstantiaS2', '3P_Labiata', 'SK_3P_Barrage'],
    playerFirst: true,
    openingHand: ['3P_Poi', '3P_Hachiko', '3P_Daphne', 'PECS_Orangeade'],
    enemy: { name: '연습용 스파르탄', portrait: 'AGS_SpartanA', hp: 15, level: 'easy',
      deck: ['AGS_SpartanA', 'AGS_SpartanB', 'AGS_SpartanC', 'AGS_Watcher', 'AGS_Shade', 'AGS_Seljuq', 'AGS_Roc', 'AGS_Rampart', 'AGS_Fallen', 'AGS_Aeda', 'AGS_Arachne', 'SK_AGS_Barrier'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 15 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'PECS_Orangeade', text: '결심했어요! 오르카호에서 제일가는 카드 게임 마스터가 될 거예요. 오늘이 그 첫걸음!' },
      { who: '3P_ConstantiaS2', text: '의욕이 넘치시네요, 오렌지에이드 씨. 그럼 기본 규칙부터 차근차근 알려 드릴게요. 연습 상대는 스파르탄 캡틴이에요.' },
    ],
    outro: [
      { who: '3P_ConstantiaS2', text: '훌륭해요! 기본은 완벽하네요. 이제 오르카 카드 리그에 정식으로 참가할 수 있어요.' },
      { who: 'PECS_Orangeade', text: '좋았어, 다음은 진짜 승부다! 리그 상대들, 기다려요!' },
    ],
  },
  {
    id: 's1', no: '1', title: '첫 도전', sub: '리그 1차전 · 레드후드', bg: 'barracks', bgm: 'battle1',
    desc: '빠르게 몰아치는 레드후드의 속공 덱. 보호기와 중장형으로 초반 공세를 버텨 내세요.',
    enemy: { name: '레드후드', portrait: 'BR_RedHood', hp: 20, level: 'easy',
      deck: ['BR_RedHood', 'BR_Cheona', 'BR_Harpy', 'BR_Impet', 'BR_PoniesAnger', 'BR_Emily', 'BR_Gremlin', 'BR_BeastHunter', 'BR_Leona', 'BR_Brownie', 'BR_Pixie', 'SK_BR_Snipe'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 15 }, { type: 'rounds', v: 9 }],
    intro: [
      { who: 'BR_RedHood', text: '신입이 리그에 도전한다고? 내 속공 덱 맛 좀 봐라!' },
      { who: 'PECS_Orangeade', text: '빠른 공격은 보호기로 막으면 되죠! 배운 대로만 하면 돼.' },
    ],
    outro: [
      { who: 'BR_RedHood', text: '쳇… 오늘은 운이 좋았던 거야. 다음 판엔 안 진다!' },
      { who: 'PECS_Orangeade', text: '첫 승리! 이 기세로 계속 간다!' },
    ],
  },
  {
    id: 's2', no: '2', title: '회복의 숲', sub: '리그 2차전 · 엘븐 포레스트 메이커', bg: 'mansion', bgm: 'battle2',
    desc: '끊임없이 회복하는 엘프 덱. 회복량보다 빠르게 피해를 쌓아야 합니다.',
    enemy: { name: '엘븐 포레스트 메이커', portrait: 'PECS_ElvenForestmaker', hp: 28, level: 'normal',
      deck: ['PECS_ElvenForestmaker', 'PECS_HighElven', 'PECS_DarkElf', 'PECS_Sekhmet', 'PECS_Hestia', 'PECS_LemonadeBeta', 'PECS_Fortune', 'PECS_Sonia', 'PECS_Cerberus', 'PECS_Muse', 'SK_PECS_Blessing', 'SK_PECS_Repair'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'PECS_ElvenForestmaker', text: '제 덱은 쉽게 쓰러지지 않아요. 회복의 숲을 넘을 수 있을까요?' },
      { who: 'PECS_Orangeade', text: '회복보다 빠르게 몰아치면 돼요! 같은 PECS 출신이라고 봐주지 않을 거예요.' },
    ],
    outro: [
      { who: 'PECS_ElvenForestmaker', text: '인정할게요. 당신의 덱에는 꺾이지 않는 기세가 있네요.' },
    ],
  },
  {
    id: 's3', no: '3', title: '그림자 대국', sub: '리그 3차전 · 쿠노이치 제로', bg: 'corridor_dark', bgm: 'battle3',
    desc: '회피와 암살에 능한 덴세츠 덱. 회피는 한 번만 막아 준다는 점을 이용하세요.',
    enemy: { name: '쿠노이치 제로', portrait: 'DS_KunoichiZero', hp: 26, level: 'normal',
      deck: ['DS_Saraqael', 'DS_Sarena', 'DS_BunnySlayer', 'DS_Ramiel', 'DS_Baekto', 'DS_Faucre', 'DS_KunoichiZero', 'DS_Angel', 'DS_KunoichiShiden', 'DS_KunoichiEnrai', 'SK_DS_Smoke', 'SK_DS_Shuriken'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'DS_KunoichiZero', text: '…대국 상대 확인. 회피와 암살로 조용히 끝내겠습니다.' },
      { who: 'PECS_Orangeade', text: '회피는 첫 공격만 막아 준다! 약한 카드로 먼저 벗겨 내자.' },
    ],
    outro: [
      { who: 'DS_KunoichiZero', text: '…예상 밖의 실력입니다. 다음 대국을 기대하죠.' },
    ],
  },
  {
    id: 's4', no: '4', title: '강철의 벽', sub: '리그 4차전 · 스트롱홀드', bg: 'board', bgm: 'battle2',
    desc: '방어막과 보호기로 무장한 AGS 덱. 보호기는 받는 피해가 줄어드니 빈 레인을 노리세요.',
    enemy: { name: '스트롱홀드', portrait: 'AGS_Stronghold', hp: 22, level: 'normal',
      deck: ['AGS_Goltarion', 'AGS_Stronghold', 'AGS_Rampart', 'AGS_RheinRitter', 'AGS_Arachne', 'AGS_Albatross', 'AGS_SpartanB', 'AGS_Roc', 'PECS_Hestia', 'PECS_LemonadeBeta', 'SK_AGS_Barrier', 'SK_AGS_Protocol'] },
    start: [{ lane: 1, id: 'AGS_SpartanA' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'rounds', v: 13 }],
    intro: [
      { who: 'AGS_Stronghold', text: '[대국 프로토콜 가동] 방어 우선 전술을 실행합니다.' },
      { who: 'PECS_Orangeade', text: '벽이 두꺼우면 보호기가 없는 쪽을 노리면 되죠! 중앙에 이미 한 장이 깔려 있으니 측면부터!' },
    ],
    outro: [
      { who: 'AGS_Stronghold', text: '[분석 완료] 패배 원인: 상대의 공격 경로 선택이 우수함.' },
      { who: 'PECS_Orangeade', text: '헤헤, 로봇한테 칭찬받았다!' },
    ],
  },
  {
    id: 's5', no: '5', title: '철충 테마 덱', sub: '리그 5차전 · 알렉산드라', bg: 'vr', bgm: 'battle3',
    desc: '철충 연구 자료로 만든 특수 카드 덱. 철충 무리 카드가 빈 레인을 한꺼번에 채웁니다.',
    enemy: { name: '알렉산드라', portrait: '3P_Alexandra', hp: 32, level: 'hard',
      deck: ['IW_NightChick', 'IW_Parasite', 'IW_Stalker', 'IW_Speaker', 'IW_Kidnapper', 'IW_RocC', 'IW_MetalGuard', 'IW_Robert', 'AGS_Gigantes', 'AGS_Deathstalker', 'SK_IW_Swarm', 'SK_IW_Corrode'] },
    start: [{ lane: 0, id: 'IW_NightChick' }, { lane: 1, id: 'IW_Stalker' }, { lane: 2, id: 'IW_NightChick' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'rounds', v: 12 }],
    intro: [
      { who: '3P_Alexandra', text: '철충 연구 자료로 만든 특별한 덱이에요. 무리 소환을 막을 수 있을까요?' },
      { who: 'PECS_Orangeade', text: '으앗, 레인이 한꺼번에 채워지잖아?! 메탈 패러사이트는 쓰러질 때 라이프를 깎으니 조심하자.' },
    ],
    outro: [
      { who: '3P_Alexandra', text: '흥미로운 데이터를 얻었어요. 당신의 전술, 꼼꼼히 기록해 둘게요.' },
    ],
  },
  {
    id: 's6', no: '6', title: '강철 군단', sub: '리그 6차전 · 칸', bg: 'sub', bgm: 'battle1',
    desc: '침식된 AGS와 아이언 프린스 카드로 짠 칸의 덱. 광역 공격에 대비해 유닛을 분산하세요.',
    enemy: { name: '칸', portrait: 'BR_Khan', hp: 22, level: 'normal',
      deck: ['IW_IronPrince', 'IW_Robert', 'IW_MetalGuard', 'IW_RocC', 'IW_Stalker', 'IW_Parasite', 'AGS_Gigantes', 'AGS_Deathstalker', 'AGS_Fortress', 'AGS_Roc', 'SK_IW_Corrode', 'SK_AGS_Barrier'] },
    start: [{ lane: 1, id: 'IW_Stalker' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 10 }, { type: 'rounds', v: 13 }],
    intro: [
      { who: 'BR_Khan', text: '실전 경험은 카드에도 드러나는 법이지. 광역 공격에 대비는 했나?' },
      { who: 'PECS_Orangeade', text: '유닛을 흩어 두면 피해가 줄어들 거예요. 이번엔 머리로 이긴다!' },
    ],
    outro: [
      { who: 'BR_Khan', text: '좋은 판단이었다. 넌 결승에 오를 자격이 있다.' },
      { who: 'PECS_Orangeade', text: '준결승이다…! 떨려도 물러서지 않아!' },
    ],
  },
  {
    id: 's7', no: '7', title: '레몬 맛 도전장', sub: '준결승 · 레모네이드 알파', bg: 'beach', bgm: 'boss1', boss: true,
    desc: '레모네이드 컬렉션 덱. 제타와 오메가 한정 카드가 등장하니 레인을 비워 두지 마세요.',
    enemy: { name: '레모네이드 알파', portrait: 'PECS_LemonadeAlpha', hp: 20, level: 'normal',
      deck: ['PECS_LemonadeAlpha', 'PECS_LemonadeBeta', 'PECS_LemonadeGamma', 'IW_LemonadeZeta', 'IW_LemonadeOmega', 'PECS_Hathor', 'PECS_Ignis', 'PECS_Empress', 'PECS_Draculina', 'PECS_Sekhmet', 'SK_PECS_Blessing', 'SK_IW_Corrode'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 10 }, { type: 'rounds', v: 13 }],
    intro: [
      { who: 'PECS_LemonadeAlpha', text: '"에이드"라는 이름을 쓰는 아이가 리그에서 소란을 피운다고 들었어요. 제 레모네이드 컬렉션으로 상대해 드리죠.' },
      { who: 'PECS_Orangeade', text: '이름이 비슷하다고 질 생각은 없어요! 정면 승부예요!' },
    ],
    outro: [
      { who: 'PECS_LemonadeAlpha', text: '…인정하죠. 결승에서 무너지면 제가 가만있지 않을 거예요.' },
    ],
  },
  {
    id: 's8', no: '8', title: '오르카 카드 마스터', sub: '결승 · 챔피언 라비아타', bg: 'squad', bgm: 'boss2', boss: true,
    desc: '오르카 리그 챔피언 라비아타의 삼안 정예 덱. 광역 공격과 강력한 SS 카드를 넘어서야 합니다.',
    enemy: { name: '라비아타 프로토타입', portrait: '3P_Labiata', hp: 25, level: 'normal',
      deck: ['3P_Labiata', '3P_Titania', '3P_Ajax', '3P_ConstantiaS2', '3P_Fenrir', '3P_BlackLilith', '3P_Sowan', '3P_Daphne', '3P_CSPerrault', '3P_Aqua', 'SK_3P_Rally', 'SK_3P_Barrage'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 8 }, { type: 'rounds', v: 15 }],
    intro: [
      { who: '3P_Labiata', text: '여기까지 오다니 대단하네요, 오렌지에이드. 리그 챔피언으로서 전력을 다할게요.' },
      { who: 'PECS_Orangeade', text: '최고의 카드 마스터가 되려고 여기까지 왔어요. 지지 않을 거예요!' },
    ],
    outro: [
      { who: '3P_Labiata', text: '축하해요. 오늘부터 오르카호 최고의 카드 마스터는 당신이에요.' },
      { who: 'PECS_Orangeade', text: '해냈다아! 다음 시즌 챔피언 자리도 제 거예요!' },
      { who: '3P_ConstantiaS2', text: '우승 축하드려요, 오렌지에이드 씨. 축하 파티 준비는 저에게 맡겨 주세요.' },
    ],
  },
];

function starLabel(s) {
  if (s.type === 'win') return '승리';
  if (s.type === 'hp') return `라이프 ${s.v} 이상 남기고 승리`;
  if (s.type === 'rounds') return `${s.v}라운드 이내 승리`;
  return '';
}
function evalStars(stage, game, me) {
  if (game.winner !== me) return [false, false, false];
  return stage.stars.map(s => s.type === 'win' || (s.type === 'hp' && me.hp >= s.v) || (s.type === 'rounds' && game.round() <= s.v));
}

// ===== 보상 / 해금 =====
// 처음 클리어 시 해금되는 카드. 여기에 나온 카드는 해금 전까지 덱에 넣을 수 없다.
const STAGE_REWARDS = {
  s0: ['3P_Fenrir', 'PECS_Hathor'],
  s1: ['BR_Brunhild', 'BR_Scathy'],
  s2: ['PECS_Draculina', 'PECS_Ignis'],
  s3: ['DS_Arman', 'DS_Charlotte'],
  s4: ['AGS_Fortress', 'AGS_Deathstalker'],
  s5: ['BR_Valkyrie', 'SK_BR_Airstrike'],
  s6: ['AGS_Tyrant', 'BR_RoyalArsenal'],
  s7: ['3P_Titania', 'SK_3P_Rally'],
  s8: ['BR_Khan'],
};
// 별 누적 보상: 철충 보스를 로비 캐릭터로 선택 가능
const STAR_REWARDS = [
  { stars: 9, secretary: 'IW_LemonadeZeta' },
  { stars: 18, secretary: 'IW_AzazelAlter' },
  { stars: 27, secretary: 'IW_LemonadeOmega' },
];
const LOCKED = new Set(Object.values(STAGE_REWARDS).flat());
const LOCKED_SECRETARIES = new Set(STAR_REWARDS.map(r => r.secretary));
function unlockSource(id) {
  const sid = Object.keys(STAGE_REWARDS).find(k => STAGE_REWARDS[k].includes(id));
  if (sid) { const s = CAMPAIGN.find(x => x.id === sid); return `스토리 ${s.no}. ${s.title} 승리`; }
  const r = STAR_REWARDS.find(x => x.secretary === id);
  return r ? `스토리 별 ${r.stars}개` : '';
}
