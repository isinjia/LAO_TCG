// ===== 스토리: 오렌지에이드의 오르카 카드 마스터 리그 =====
// enemy.deck: 12장 (최대 3제작사), enemy.hp: 상대 라이프, enemy.level: AI 난이도
// enemy.start: 전투 시작 시 미리 배치된 적 유닛, stars: 별 조건 (win / hp / rounds)
// intro/outro: 대사. who는 초상화로 쓸 카드 id
// 말투·호칭은 원작 대본 분석 자료(7_LAO_3Kingdom/자료/캐릭터_말투.md, 캐릭터_관계도.md)를 따른다.
// 오렌지에이드는 해요체에 남을 「○○ 씨」로 부르고, 같은 부대 상관인 레모네이드 알파는 「알파 님」으로 모신다.

const CAMPAIGN = [
  {
    id: 's0', no: '0', title: '첫 카드 수업', sub: '튜토리얼 · 연습 상대: 스파르탄 캡틴', bg: 'board', bgm: 'battle1', tutorial: true,
    desc: '오르카호에서 처음 열리는 카드 리그. 리그 운영을 맡은 콘스탄챠에게 AP, 배치, 전투, 상성을 차례로 배웁니다.',
    playerDeck: ['3P_Poi', '3P_Hachiko', '3P_Ajax', '3P_Daphne', 'PECS_Orangeade', '3P_Aqua', '3P_Sowan', '3P_CSPerrault', '3P_BlackWyrm', '3P_ConstantiaS2', '3P_Labiata', 'SK_3P_Barrage'],
    playerFirst: true,
    openingHand: ['3P_Poi', '3P_Hachiko', '3P_Daphne', 'PECS_Orangeade'],
    enemy: { name: '스파르탄 캡틴', portrait: 'AGS_SpartanA', hp: 15, level: 'easy',
      deck: ['AGS_SpartanA', 'AGS_SpartanB', 'AGS_SpartanC', 'AGS_Watcher', 'AGS_Shade', 'AGS_Seljuq', 'AGS_Roc', 'AGS_Rampart', 'AGS_Fallen', 'AGS_Aeda', 'AGS_Arachne', 'SK_AGS_Barrier'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 15 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'PECS_Orangeade', text: '오르카 카드 리그, 참가자 모집 중…? 우승하면 오르카호 최고의 카드 마스터로 인정받는대요!' },
      { who: 'PECS_Orangeade', text: '알파 님께 보여 드릴 기회예요. 저도 혼자서 해낼 수 있다는 거요. 헤헤…' },
      { who: '3P_ConstantiaS2', text: '참가 신청하러 왔니? 리그 운영은 제가 맡고 있어요. 그럼 규칙부터 익혀야겠지?' },
      { who: '3P_ConstantiaS2', text: '연습 상대는 스파르탄 캡틴이 맡아 줄 거야. 연습이라도 실전처럼 하는 아이니까 긴장 풀지 말고.' },
      { who: 'AGS_SpartanA', text: '본 유닛이 연습 상대를 맡는다. 봐주지는 않겠다. 준비되었는가?' },
      { who: 'PECS_Orangeade', text: '무, 물론이죠! 잘 부탁드려요!' },
    ],
    outro: [
      { who: 'AGS_SpartanA', text: '훈련 종료. 귀 유닛의 기본기는 합격이다.' },
      { who: '3P_ConstantiaS2', text: '잘했어. 이 정도면 정식 참가 자격은 충분하잖니. 첫 상대는 스틸 라인의 레드후드야.' },
      { who: 'PECS_Orangeade', text: '레드후드 씨요…? 연대장님이시잖아요! 그, 그래도 해 볼게요!' },
    ],
  },
  {
    id: 's1', no: '1', title: '첫 도전', sub: '리그 1차전 · 레드후드', bg: 'barracks', bgm: 'battle1',
    desc: '스틸 라인 연대장 레드후드의 속공 덱. 보호기와 중장형으로 초반 공세를 버텨 내세요.',
    enemy: { name: '레드후드', portrait: 'BR_RedHood', hp: 20, level: 'easy',
      deck: ['BR_RedHood', 'BR_Cheona', 'BR_Harpy', 'BR_Impet', 'BR_PoniesAnger', 'BR_Emily', 'BR_Gremlin', 'BR_BeastHunter', 'BR_Leona', 'BR_Brownie', 'BR_Pixie', 'SK_BR_Snipe'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 15 }, { type: 'rounds', v: 9 }],
    intro: [
      { who: 'BR_RedHood', text: '승리! 네가 이번 리그의 신참인가. 스틸 라인 연대장, 레드후드다.' },
      { who: 'PECS_Orangeade', text: '아, 안녕하세요! 오렌지에이드예요. 잘 부탁드려요!' },
      { who: 'BR_RedHood', text: '카드라도 전장은 전장이다. 선제공격으로 단숨에 끝내겠다. 각오하도록.' },
      { who: 'PECS_Orangeade', text: '빠른 공격은 보호기로 막으면 된다고 콘스탄챠 씨가 그랬거든요. 배운 대로만 하면 돼요!' },
    ],
    outro: [
      { who: 'BR_RedHood', text: '…패배를 인정한다. 방어 배치가 훌륭했다. 다음 대국까지 정진하도록.' },
      { who: 'PECS_Orangeade', text: '첫 승리예요! 헤헤, 알파 님께 자랑해야지.' },
    ],
  },
  {
    id: 's2', no: '2', title: '회복의 숲', sub: '리그 2차전 · 엘븐 포레스트메이커', bg: 'mansion', bgm: 'battle2',
    desc: '끊임없이 회복하는 엘프 덱. 회복량보다 빠르게 피해를 쌓아야 합니다.',
    enemy: { name: '엘븐 포레스트메이커', portrait: 'PECS_ElvenForestmaker', hp: 28, level: 'normal',
      deck: ['PECS_ElvenForestmaker', 'PECS_HighElven', 'PECS_DarkElf', 'PECS_Sekhmet', 'PECS_Hestia', 'PECS_LemonadeBeta', 'PECS_Fortune', 'PECS_Sonia', 'PECS_Cerberus', 'PECS_Muse', 'SK_PECS_Blessing', 'SK_PECS_Repair'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'PECS_ElvenForestmaker', text: '뭐야, 레드후드를 이긴 신인이 너였어? 좋아, 내 숲에서 얼마나 버티는지 보자.' },
      { who: 'PECS_Orangeade', text: '회복 덱이죠? 회복하는 것보다 빨리 피해를 쌓으면 되거든요!' },
      { who: 'PECS_ElvenForestmaker', text: '말은 쉽지. 내 숲은 베어 내도 금방 다시 자라. 어디 해 보자.' },
    ],
    outro: [
      { who: 'PECS_ElvenForestmaker', text: '알았어, 알았어. 내가 졌어. 숲이 자라는 것보다 네가 더 빨랐네.' },
      { who: 'PECS_Orangeade', text: '헤헤, 물론이죠! 같은 PECS라도 봐 드릴 수는 없었거든요.' },
    ],
  },
  {
    id: 's3', no: '3', title: '그림자 대국', sub: '리그 3차전 · 쿠노이치 제로', bg: 'corridor_dark', bgm: 'battle3',
    desc: '회피와 암살에 능한 덴세츠 덱. 회피는 한 번만 막아 준다는 점을 이용하세요.',
    enemy: { name: '쿠노이치 제로', portrait: 'DS_KunoichiZero', hp: 26, level: 'normal',
      deck: ['DS_Saraqael', 'DS_Sarena', 'DS_BunnySlayer', 'DS_Ramiel', 'DS_Baekto', 'DS_Faucre', 'DS_KunoichiZero', 'DS_Angel', 'DS_KunoichiShiden', 'DS_KunoichiEnrai', 'SK_DS_Smoke', 'SK_DS_Shuriken'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'DS_KunoichiZero', text: '오오, 네가 소문의 신인이구나! 쿠노이치 제로다. 이번 대국은 그림자 속에서 끝내 주지!' },
      { who: 'PECS_Orangeade', text: '회피 카드가 잔뜩이네요… 그래도 회피는 한 번만 막아 주잖아요. 약한 카드로 먼저 벗겨 내면 돼요.' },
      { who: 'DS_KunoichiZero', text: '하아… 벌써 간파당했어? 그래도 그렇게 쉽게는 안 될걸!' },
    ],
    outro: [
      { who: 'DS_KunoichiZero', text: '졌다… 내 인술을 이렇게 받아칠 줄이야. 오, 대단해…' },
      { who: 'PECS_Orangeade', text: '수리검이 날아올 때마다 심장이 철렁했어요. 헤헤…' },
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
      { who: 'AGS_Stronghold', text: '자네가 이번 상대인가. 본 기는 서두르지 않는다네. 벽 앞에서 먼저 지치는 쪽은 언제나 상대였지.' },
      { who: 'PECS_Orangeade', text: '중앙에 벌써 한 장이 깔려 있네요… 정면이 단단하면 측면부터 뚫으면 되죠!' },
      { who: 'AGS_Stronghold', text: '좋은 판단일세. 그 판단이 끝까지 가는지 지켜보겠네.' },
    ],
    outro: [
      { who: 'AGS_Stronghold', text: '허허, 본 기의 벽이 뚫리다니. 자네, 지식과 경험이 착실히 쌓이고 있군.' },
      { who: 'PECS_Orangeade', text: '칭찬받았어요! 헤헤…' },
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
      { who: '3P_Alexandra', text: '후후, 어서 와요, 오렌지에이드 양. 오늘은 철충 연구 자료로 만든 특별한 덱을 준비했어요.' },
      { who: 'PECS_Orangeade', text: '처, 철충 카드요?! 레인이 한꺼번에 채워지잖아요!' },
      { who: '3P_Alexandra', text: '실전에서 마주칠 적을 미리 알아 두는 것도 공부죠. 메탈 패러사이트는 쓰러질 때 라이프를 깎으니 조심하세요.' },
    ],
    outro: [
      { who: '3P_Alexandra', text: '훌륭하군요. 무리를 상대하는 법을 제대로 익혔어요. 오늘 수업은 여기까지 하죠.' },
      { who: 'PECS_Orangeade', text: '수업이었어요…? 네, 네! 감사합니다, 알렉산드라 선생님!' },
    ],
  },
  {
    id: 's6', no: '6', title: '강철 군단', sub: '리그 6차전 · 신속의 칸', bg: 'sub', bgm: 'battle1',
    desc: '침식된 AGS와 아이언 프린스 카드로 짠 신속의 칸의 덱. 광역 공격에 대비해 유닛을 분산하세요.',
    enemy: { name: '신속의 칸', portrait: 'BR_Khan', hp: 22, level: 'normal',
      deck: ['IW_IronPrince', 'IW_Robert', 'IW_MetalGuard', 'IW_RocC', 'IW_Stalker', 'IW_Parasite', 'AGS_Gigantes', 'AGS_Deathstalker', 'AGS_Fortress', 'AGS_Roc', 'SK_IW_Corrode', 'SK_AGS_Barrier'] },
    start: [{ lane: 1, id: 'IW_Stalker' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 10 }, { type: 'rounds', v: 13 }],
    intro: [
      { who: 'BR_Khan', text: '신속의 칸이다. 침식된 기체로 짠 덱이지. 광역 공격에 대비는 했겠지?' },
      { who: 'PECS_Orangeade', text: '유닛을 흩어 두면 한꺼번에 당하지 않아요. 이번엔 머리로 이길 거예요!' },
      { who: 'BR_Khan', text: '좋다. 그 판단이 맞는지 직접 확인하겠다. 신속하게 끝내도록 하지.' },
    ],
    outro: [
      { who: 'BR_Khan', text: '훌륭한 판단이었다. 준결승에 오를 자격은 충분하다. 다음 상대는… 알고 있겠지.' },
      { who: 'PECS_Orangeade', text: '네. 알파 님이에요.' },
    ],
  },
  {
    id: 's7', no: '7', title: '알파 님의 시험', sub: '준결승 · 레모네이드 알파', bg: 'beach', bgm: 'boss1', boss: true,
    desc: '레모네이드 컬렉션 덱. 제타와 오메가 한정 카드가 등장하니 레인을 비워 두지 마세요.',
    enemy: { name: '레모네이드 알파', portrait: 'PECS_LemonadeAlpha', hp: 20, level: 'normal',
      deck: ['PECS_LemonadeAlpha', 'PECS_LemonadeBeta', 'PECS_LemonadeGamma', 'IW_LemonadeZeta', 'IW_LemonadeOmega', 'PECS_Hathor', 'PECS_Ignis', 'PECS_Empress', 'PECS_Draculina', 'PECS_Sekhmet', 'SK_PECS_Blessing', 'SK_IW_Corrode'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 10 }, { type: 'rounds', v: 13 }],
    intro: [
      { who: 'PECS_Orangeade', text: '알파 님…! 정말 알파 님이 준결승 상대세요?' },
      { who: 'PECS_LemonadeAlpha', text: '그래요, 오렌지에이드. 리그에 나갔다는 이야기는 다른 아이들에게 들었어요. 저에게는 한마디도 없었죠.' },
      { who: 'PECS_Orangeade', text: '그, 그게 말이죠… 우승해서 깜짝 놀라게 해 드리고 싶었거든요.' },
      { who: 'PECS_LemonadeAlpha', text: '그렇다면 여기서 보여 주세요. 제 앞에서 망설인다면 결승은 꿈도 꾸지 마요.' },
    ],
    outro: [
      { who: 'PECS_LemonadeAlpha', text: '…잘했어요. 제가 가르친 것보다 훨씬 많이 컸네요.' },
      { who: 'PECS_Orangeade', text: '알파 님…!' },
      { who: 'PECS_LemonadeAlpha', text: '결승 상대는 라비아타예요. 거기서 무너지면 그때는 정말로 혼낼 거예요.' },
    ],
  },
  {
    id: 's8', no: '8', title: '오르카 카드 마스터', sub: '결승 · 챔피언 라비아타', bg: 'squad', bgm: 'boss2', boss: true,
    desc: '오르카 리그 챔피언 라비아타의 삼안 정예 덱. 광역 공격과 강력한 SS 카드를 넘어서야 합니다.',
    enemy: { name: '라비아타 프로토타입', portrait: '3P_Labiata', hp: 25, level: 'normal',
      deck: ['3P_Labiata', '3P_Titania', '3P_Ajax', '3P_ConstantiaS2', '3P_Fenrir', '3P_BlackLilith', '3P_Sowan', '3P_Daphne', '3P_CSPerrault', '3P_Aqua', 'SK_3P_Rally', 'SK_3P_Barrage'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 8 }, { type: 'rounds', v: 15 }],
    intro: [
      { who: '3P_Labiata', text: '어서 오렴, 오렌지에이드 양. 여기까지 올라온 걸 보니 정말 많이 노력했구나.' },
      { who: 'PECS_Orangeade', text: '라비아타 씨…! 오늘은 챔피언 자리를 받으러 왔어요!' },
      { who: '3P_Labiata', text: '후후, 그 기세 좋구나. 그럼 나도 봐주지 않겠단다. 전력으로 상대할게요.' },
    ],
    outro: [
      { who: '3P_Labiata', text: '…내가 졌구나. 축하한단다. 오늘부터 오르카호 최고의 카드 마스터는 너야.' },
      { who: 'PECS_Orangeade', text: '해, 해냈어요…! 정말요? 헤헤…' },
      { who: 'PECS_LemonadeAlpha', text: '축하해요, 오렌지에이드. 오늘만큼은 마음껏 자랑해도 좋아요.' },
      { who: '3P_ConstantiaS2', text: '우승 축하해. 축하 파티 준비는 벌써 끝났잖니. 다들 기다리고 있어.' },
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
