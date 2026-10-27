// ===== 스토리: 오렌지에이드의 오르카 카드 마스터 리그 =====
// enemy.deck: 12장 (최대 3제작사), enemy.hp: 상대 라이프, enemy.level: AI 난이도
// enemy.start: 전투 시작 시 미리 배치된 적 유닛, stars: 별 조건 (win / hp / rounds)
// intro/outro: 대사. who는 초상화로 쓸 카드 id
// chapter: 'ex'면 외전(본편 결승을 이기면 열림). 외전 상대는 VR 철충 모의 데이터라 원작 말투 자료 대신 [모의 개체] 시스템 말투를 쓴다.
// mid: 전투 중 대사 (half: 상대 라이프 절반 이하, low: 내 라이프 8 이하일 때 한 번), lose: 패배 시 상대의 한마디, epilogue: 결승 승리 뒤 마무리 대사
// 말투·호칭은 원작 대본 분석 자료(7_LAO_3Kingdom/자료/캐릭터_말투.md, 캐릭터_관계도.md)를 따른다.
// 오렌지에이드는 해요체에 남을 「○○ 씨」로 부르고, 같은 부대 상관인 레모네이드 알파는 「알파 님」으로 모신다.

const CAMPAIGN = [
  {
    id: 's0', no: '0', title: '첫 카드 수업', sub: '튜토리얼 · 연습 상대: 스파르탄 캡틴', bg: 'board', bgm: 'battle1', tutorial: true,
    desc: '오르카호에서 처음 열리는 카드 리그. 리그 운영을 맡은 콘스탄챠에게 AP, 배치, 전투, 상성을 차례로 배웁니다.',
    playerDeck: ['3P_Poi', '3P_Hachiko', '3P_Ajax', '3P_Daphne', 'PECS_Orangeade', '3P_Aqua', '3P_Sowan', '3P_CSPerrault', '3P_BlackWyrm', '3P_ConstantiaS2', '3P_Labiata', 'SK_PECS_Medic'],
    playerFirst: true,
    openingHand: ['3P_Poi', '3P_Hachiko', '3P_Daphne', 'PECS_Orangeade', '3P_Aqua', 'SK_PECS_Medic'], // 시작 패 4장 + 2턴·3턴에 뽑을 카드
    enemy: { name: '스파르탄 캡틴', portrait: 'AGS_SpartanA', hp: 7, level: 'easy',
      deck: ['AGS_SpartanA', 'AGS_SpartanB', 'AGS_SpartanC', 'AGS_Watcher', 'AGS_Shade', 'AGS_Seljuq', 'AGS_Roc', 'AGS_Rampart', 'AGS_Fallen', 'AGS_Aeda', 'AGS_Arachne', 'SK_AGS_Barrier'] },
    start: [{ lane: 2, id: 'AGS_SpartanC' }], // 기동형을 미리 세워 2턴 상성 안내(경장 하치코가 유리)가 실제로 성립하게
    stars: [{ type: 'win' }, { type: 'hp', v: 15 }, { type: 'rounds', v: 11 }],
    intro: [
      { who: 'PECS_Orangeade', text: '오르카 카드 리그, 참가자 모집 중…? 우승하면 오르카호 최고의 카드 마스터로 인정받는대요!' },
      { who: 'PECS_Orangeade', text: '알파 님께 보여 드릴 기회예요. 저도 혼자서 해낼 수 있다는 거요. 헤헤…' },
      { who: '3P_ConstantiaS2', text: '참가 신청하러 왔니? 리그 운영은 내가 맡고 있어.' },
      { who: 'PECS_Orangeade', text: '네! 그런데 저, 카드는 만져 본 적이 거의 없거든요…' },
      { who: '3P_ConstantiaS2', text: '괜찮아. 다들 처음엔 그랬잖니. 규칙부터 하나씩 익히면 돼.' },
      { who: '3P_ConstantiaS2', text: '연습 상대는 스파르탄 캡틴이 맡아 줄 거야. 연습이라도 실전처럼 하는 아이니까 긴장 풀지 말고.' },
      { who: 'AGS_SpartanA', text: '본 유닛이 연습 상대를 맡는다. 봐주지는 않겠다. 준비되었는가?' },
      { who: 'PECS_Orangeade', text: '무, 물론이죠! 잘 부탁드려요!' },
    ],
    outro: [
      { who: 'AGS_SpartanA', text: '훈련 종료. 귀 유닛의 기본기는 합격이다.' },
      { who: '3P_ConstantiaS2', text: '잘했어. 이 정도면 정식 참가 자격은 충분하잖니.' },
      { who: '3P_ConstantiaS2', text: '리그는 여덟 번의 대국으로 치러진단다. 첫 상대는 스틸 라인의 레드후드야.' },
      { who: 'PECS_Orangeade', text: '레드후드 씨요…? 연대장님이시잖아요! 그, 그래도 해 볼게요!' },
      { who: '3P_ConstantiaS2', text: '참, 알파 씨한테는 말했니?' },
      { who: 'PECS_Orangeade', text: '아직이요… 우승하고 나서 깜짝 놀라게 해 드릴 거거든요!' },
    ],
    mid: { half: { who: 'AGS_SpartanA', text: '본 유닛의 손실이 크다. 귀 유닛, 학습 속도가 빠르군.' }, low: { who: 'AGS_SpartanA', text: '방어가 비었다. 빈 레인은 곧 패배로 이어진다.' } },
    lose: { who: 'AGS_SpartanA', text: '훈련은 반복이다. 다시 시작한다.' },
  },
  {
    id: 's1', no: '1', title: '첫 도전', sub: '리그 1차전 · 레드후드', bg: 'barracks', bgm: 'battle1',
    desc: '스틸 라인 연대장 레드후드의 속공 덱. 보호기와 중장형으로 초반 공세를 버텨 내세요.',
    enemy: { name: '레드후드', portrait: 'BR_RedHood', hp: 10, level: 'easy', style: 'balanced',
      deck: ['BR_RedHood', 'BR_Cheona', 'BR_Harpy', 'BR_Impet', 'BR_PoniesAnger', 'BR_Emily', 'BR_Gremlin', 'BR_BeastHunter', 'BR_Leona', 'BR_Brownie', 'BR_Pixie', 'SK_BR_Snipe'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 11 }, { type: 'guards', v: 1 }],
    intro: [
      { who: 'BR_Impet', text: '연대장님, 이번 상대는 신참입니다. 적당히 하시는 게…' },
      { who: 'BR_RedHood', text: '임펫, 전장에 적당히란 없다. 승리! 네가 이번 리그의 신참인가. 스틸 라인 연대장, 레드후드다.' },
      { who: 'PECS_Orangeade', text: '아, 안녕하세요! 오렌지에이드예요. 잘 부탁드려요!' },
      { who: 'BR_RedHood', text: '연대 병사들 사이에서 카드 대국이 유행이라 들었다. 지휘관이 모르는 전장은 있을 수 없지.' },
      { who: 'BR_RedHood', text: '카드라도 전장은 전장이다. 선제공격으로 단숨에 끝내겠다. 각오하도록.' },
      { who: 'PECS_Orangeade', text: '빠른 공격은 보호기로 막으면 된다고 콘스탄챠 씨가 그랬거든요. 배운 대로만 하면 돼요!' },
    ],
    outro: [
      { who: 'BR_RedHood', text: '…패배를 인정한다. 방어 배치가 훌륭했다.' },
      { who: 'BR_Impet', text: '거 봐요, 연대장님. 신참이라고 얕보시더니.' },
      { who: 'BR_RedHood', text: '시끄럽다, 임펫. 오렌지에이드, 다음 대국까지 정진하도록.' },
      { who: 'PECS_Orangeade', text: '첫 승리예요! 헤헤, 알파 님께 자랑… 아, 아직 비밀이었지.' },
      { who: 'PECS_LemonadeBeta', text: '오렌지에이드? 여기서 뭐 하는 거예요? 오늘 알파가 찾던데요.' },
      { who: 'PECS_Orangeade', text: '베, 베타 씨! 아무것도 아니에요! 알파 님께는 비밀이에요, 꼭이요!' },
      { who: 'PECS_LemonadeBeta', text: '…비밀이라고요? 흐음, 알았어요. 대신 무리는 하지 마요.' },
      { who: 'BR_RedHood', text: '연대에 돌아가면 보호기 배치부터 다시 훈련시키겠다. 네 덕분에 숙제가 생겼군.' },
    ],
    mid: { half: { who: 'BR_RedHood', text: '버티는군. 그렇다면 더 빠르게 몰아친다!' }, low: { who: 'BR_RedHood', text: '전선이 무너지고 있다. 여기서 끝내도록 하지.' } },
    lose: { who: 'BR_RedHood', text: '승리! 속도가 곧 전력이다. 다음엔 더 단단히 준비하도록.' },
  },
  {
    id: 's2', no: '2', title: '회복의 숲', sub: '리그 2차전 · 엘븐 포레스트메이커', bg: 'mansion', bgm: 'battle2',
    desc: '끊임없이 회복하는 엘프 덱. 회복량보다 빠르게 피해를 쌓아야 합니다.',
    enemy: { name: '엘븐 포레스트메이커', portrait: 'PECS_ElvenForestmaker', hp: 28, level: 'normal', style: 'aggro',
      deck: ['PECS_ElvenForestmaker', 'PECS_HighElven', 'PECS_DarkElf', 'PECS_Sekhmet', 'PECS_Hestia', 'PECS_LemonadeBeta', 'PECS_Fortune', 'PECS_Sonia', 'PECS_Cerberus', 'PECS_MightyR', 'SK_PECS_Blessing', 'PECS_Azaz'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 16 }, { type: 'kills', v: 15 }],
    intro: [
      { who: '3P_ConstantiaS2', text: '다음 상대는 엘븐 포레스트메이커야. 같은 PECS라서 서로 덱을 잘 알 거란다.' },
      { who: 'PECS_ElvenForestmaker', text: '뭐야, 레드후드를 이긴 신인이 너였어? 생각보다 작네.' },
      { who: 'PECS_Orangeade', text: '작아도 실력은 있거든요! 오렌지에이드예요.' },
      { who: 'PECS_ElvenForestmaker', text: '좋아, 내 숲에서 얼마나 버티는지 보자. 내 숲은 베어 내도 금방 다시 자라.' },
      { who: 'PECS_Orangeade', text: '회복 덱이죠? 회복하는 것보다 빨리 피해를 쌓으면 되거든요!' },
      { who: 'PECS_ElvenForestmaker', text: '난 오르카호 화단을 다 내 손으로 가꿨어. 카드도 똑같아. 시들면 다시 키우면 되거든.' },
      { who: 'PECS_ElvenForestmaker', text: '말은 쉽지. 어디 해 보자.' },
    ],
    outro: [
      { who: 'PECS_ElvenForestmaker', text: '알았어, 알았어. 내가 졌어. 숲이 자라는 것보다 네가 더 빨랐네.' },
      { who: 'PECS_Orangeade', text: '헤헤, 같은 PECS라도 봐 드릴 수는 없었거든요.' },
      { who: 'PECS_ElvenForestmaker', text: '그래, 그래야지. 다음은 덴세츠 쪽 닌자라던데… 걔들은 좀 성가실 거야.' },
    ],
    mid: { half: { who: 'PECS_ElvenForestmaker', text: '뭐야, 숲이 자라는 속도보다 빠르잖아?' }, low: { who: 'PECS_ElvenForestmaker', text: '이제 좀 지쳤지? 숲은 아직 멀쩡해.' } },
    lose: { who: 'PECS_ElvenForestmaker', text: '봤지? 숲은 쉽게 안 쓰러져. 다음엔 더 빨리 와 봐.' },
  },
  {
    id: 's3', no: '3', title: '그림자 대국', sub: '리그 3차전 · 쿠노이치 제로', bg: 'corridor_dark', bgm: 'battle3',
    desc: '회피와 암살에 능한 덴세츠 덱. 회피는 한 번만 막아 준다는 점을 이용하세요.',
    enemy: { name: '쿠노이치 제로', portrait: 'DS_KunoichiZero', hp: 22, level: 'normal', style: 'aggro',
      deck: ['DS_Saraqael', 'DS_Sarena', 'DS_BunnySlayer', 'DS_Ramiel', 'DS_Baekto', 'DS_Faucre', 'DS_KunoichiZero', 'DS_Angel', 'DS_KunoichiShiden', 'DS_KunoichiEnrai', 'SK_DS_Smoke', 'SK_DS_Shuriken'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 12 }, { type: 'commands', v: 5 }],
    intro: [
      { who: 'DS_KunoichiZero', text: '오오, 네가 소문의 신인이구나! 쿠노이치 제로다.' },
      { who: 'DS_KunoichiEnrai', text: '제로, 대국 전에는 예를 갖추라고 했지요. …덴세츠의 엔라이입니다. 오늘은 제로의 대국을 지켜보러 왔습니다.' },
      { who: 'DS_KunoichiZero', text: '엔라이 님, 알고 있어요! 이번 대국은 그림자 속에서 끝내 주지!' },
      { who: 'PECS_Orangeade', text: '회피 카드가 잔뜩이네요… 그래도 회피는 한 번만 막아 주잖아요. 약한 카드로 먼저 벗겨 내면 돼요.' },
      { who: 'DS_KunoichiZero', text: '하아… 벌써 간파당했어? 그래도 그렇게 쉽게는 안 될걸!' },
    ],
    outro: [
      { who: 'DS_KunoichiZero', text: '졌다… 내 인술을 이렇게 받아칠 줄이야. 오, 대단해…' },
      { who: 'DS_KunoichiEnrai', text: '후후, 좋은 대국이었습니다. 제로에게도 좋은 수련이 되었겠지요.' },
      { who: 'PECS_Orangeade', text: '수리검이 날아올 때마다 심장이 철렁했어요. 헤헤…' },
      { who: 'PECS_LemonadeBeta', text: '오렌지에이드, 요즘 알파가 휴게실 리그 순위표 앞에서 오래 서 있더라고요.' },
      { who: 'PECS_Orangeade', text: '네에?! 설마 들킨 건 아니겠죠…?' },
      { who: 'PECS_LemonadeBeta', text: '글쎄요. 알파는 원래 아무 말도 안 하거든요.' },
      { who: 'DS_KunoichiZero', text: '엔라이 님 앞에서 멋지게 이기고 싶었는데… 하아.' },
      { who: 'PECS_Orangeade', text: '저도 그 마음 알아요. 보여 드리고 싶은 분이 있으면 더 떨리죠.' },
      { who: 'DS_KunoichiEnrai', text: '제로, 오늘 진 것도 소첩은 다 보았답니다. 그것으로 충분하지요.' },
    ],
    mid: { half: { who: 'DS_KunoichiZero', text: '하아… 그림자가 자꾸 벗겨지잖아!' }, low: { who: 'DS_KunoichiZero', text: '오오, 빈틈 발견! 일섬으로 끝내 주지!' } },
    lose: { who: 'DS_KunoichiZero', text: '그림자 속에서 끝났다! 다음엔 더 잘 숨어 봐!' },
  },
  {
    id: 's4', no: '4', title: '강철의 벽', sub: '리그 4차전 · 스트롱홀드', bg: 'board', bgm: 'battle2',
    desc: '방어막과 보호기로 무장한 AGS 덱. 보호기는 받는 피해가 줄어드니 빈 레인을 노리세요.',
    enemy: { name: '스트롱홀드', portrait: 'AGS_Stronghold', hp: 17, level: 'normal', style: 'control',
      deck: ['AGS_Goltarion', 'AGS_Stronghold', 'AGS_Rampart', 'AGS_RheinRitter', 'AGS_Arachne', 'AGS_Albatross', 'AGS_SpartanB', 'AGS_Roc', 'PECS_Hestia', 'PECS_LemonadeBeta', 'SK_AGS_Barrier', 'SK_AGS_Protocol'] },
    start: [{ lane: 1, id: 'AGS_SpartanA' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 8 }, { type: 'commands', v: 5 }],
    intro: [
      { who: 'PECS_Orangeade', text: '콘스탄챠 씨… 연습하느라 어제 거의 못 잤어요. 다음 상대는 벽 같은 덱이라던데요.' },
      { who: '3P_ConstantiaS2', text: '그러니까 오늘은 서두르지 마. 단단한 덱일수록 먼저 조급해지는 쪽이 지는 거란다.' },
      { who: 'AGS_Stronghold', text: '자네가 이번 상대인가. 본 기는 서두르지 않는다네.' },
      { who: 'AGS_Stronghold', text: '벽 앞에서 먼저 지치는 쪽은 언제나 상대였지. 이번에도 그럴 걸세.' },
      { who: 'PECS_Orangeade', text: '중앙에 벌써 한 장이 깔려 있네요… 정면이 단단하면 측면부터 뚫으면 되죠!' },
      { who: 'AGS_Stronghold', text: '좋은 판단일세. 그 판단이 끝까지 가는지 지켜보겠네.' },
    ],
    outro: [
      { who: 'AGS_Stronghold', text: '허허, 본 기의 벽이 뚫리다니. 자네, 지식과 경험이 착실히 쌓이고 있군.' },
      { who: 'PECS_Orangeade', text: '칭찬받았어요! 헤헤…' },
      { who: 'AGS_Stronghold', text: '다음 상대는 알렉산드라라네. 그쪽은 수업이라 생각하고 가는 게 좋을 걸세.' },
      { who: 'AGS_Stronghold', text: '한마디만 하겠네. 이기고 싶은 마음이 앞서면 판이 좁아지지. 자네가 보여 주고 싶은 상대가 있다면 더더욱 말일세.' },
      { who: 'PECS_Orangeade', text: '…네. 명심할게요.' },
    ],
    mid: { half: { who: 'AGS_Stronghold', text: '허허, 벽에 금이 가는군. 하지만 아직 무너지진 않았다네.' }, low: { who: 'AGS_Stronghold', text: '지치는 쪽은 언제나 상대였다네. 자네도 예외는 아니지.' } },
    lose: { who: 'AGS_Stronghold', text: '벽은 서두르는 자를 이긴다네. 다시 오게, 젊은이.' },
  },
  {
    id: 's5', no: '5', title: '철충 테마 덱', sub: '리그 5차전 · 알렉산드라', bg: 'vr', bgm: 'battle3',
    desc: '철충 연구 자료로 만든 특수 카드 덱. 철충 무리 카드가 빈 레인을 한꺼번에 채웁니다.',
    enemy: { name: '알렉산드라', portrait: '3P_Alexandra', hp: 19, level: 'normal', style: 'control',
      deck: ['IW_NightChick', 'IW_Parasite', 'IW_Stalker', 'IW_Speaker', 'IW_Kidnapper', 'IW_RocC', 'IW_MetalGuard', 'IW_Robert', 'AGS_Gigantes', 'AGS_Deathstalker', 'SK_IW_Swarm', 'SK_IW_Corrode'] },
    start: [{ lane: 0, id: 'IW_NightChick' }, { lane: 1, id: 'IW_Stalker' }, { lane: 2, id: 'IW_NightChick' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 7 }, { type: 'kills', v: 10 }],
    intro: [
      { who: '3P_Alexandra', text: '후후, 어서 와요, 오렌지에이드 양. 오늘은 철충 연구 자료로 만든 특별한 덱을 준비했어요.' },
      { who: '3P_ConstantiaS2', text: '알렉산드라 언니, 리그 대국에 철충 카드를 쓰는 건 좀…' },
      { who: '3P_Alexandra', text: '리그 규정 7조, 교관 대국에서는 연구소가 승인한 철충 모의 카드를 쓸 수 있다. 콘스탄챠가 직접 쓴 규정이잖아.' },
      { who: '3P_ConstantiaS2', text: '…그건 그렇지만요. 실전 대비 교육용이라고 넣은 조항이었는데.' },
      { who: '3P_Alexandra', text: '그러니까 지금이 딱 교육 시간이야. 걱정 마.' },
      { who: 'PECS_Orangeade', text: '처, 철충 카드요?! 레인이 한꺼번에 채워지잖아요!' },
      { who: '3P_Alexandra', text: '메탈 패러사이트는 쓰러질 때 라이프를 깎으니 조심하세요. 자, 수업을 시작하죠.' },
    ],
    outro: [
      { who: '3P_Alexandra', text: '훌륭하군요. 무리를 상대하는 법을 제대로 익혔어요. 오늘 수업은 여기까지 하죠.' },
      { who: 'PECS_Orangeade', text: '수업이었어요…? 네, 네! 감사합니다, 알렉산드라 선생님!' },
      { who: '3P_ConstantiaS2', text: '정말 다행이다… 다음은 신속의 칸이야. 리그에서 가장 경험 많은 참가자란다.' },
      { who: 'PECS_Orangeade', text: '그런데 신속의 칸 씨도 철충 카드를 쓴다던데요?' },
      { who: '3P_ConstantiaS2', text: '칸은 실제로 철충과 싸워 본 기록으로 모의 카드를 만들었어. 알렉산드라 언니 덱보다 훨씬 거칠 거란다.' },
    ],
    mid: { half: { who: '3P_Alexandra', text: '후후, 무리를 정리하는 순서가 좋군요. 그럼 다음 문제예요.' }, low: { who: '3P_Alexandra', text: '철충은 빈틈을 놓치지 않아요. 수업 중이라도 마찬가지죠.' } },
    lose: { who: '3P_Alexandra', text: '오늘 배운 걸 정리해 오세요. 다음 수업에서 다시 보죠.' },
  },
  {
    id: 's6', no: '6', title: '강철 군단', sub: '리그 6차전 · 신속의 칸', bg: 'sub', bgm: 'battle1',
    desc: '침식된 AGS와 아이언 프린스 카드로 짠 신속의 칸의 덱. 광역 공격에 대비해 유닛을 분산하세요.',
    enemy: { name: '신속의 칸', portrait: 'BR_Khan', hp: 18, level: 'normal', style: 'balanced',
      deck: ['IW_IronPrince', 'IW_Robert', 'IW_MetalGuard', 'IW_RocC', 'IW_Stalker', 'IW_Parasite', 'AGS_Gigantes', 'AGS_Deathstalker', 'AGS_Fortress', 'AGS_Roc', 'SK_IW_Corrode', 'SK_AGS_Barrier'] },
    start: [{ lane: 1, id: 'IW_Stalker' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 8 }, { type: 'units', v: 9 }],
    intro: [
      { who: 'BR_Leona', text: '칸, 상대가 꽤 어리네. 너무 몰아붙이지는 마.' },
      { who: 'BR_Khan', text: '레오나, 실전에 나이는 상관없다. …신속의 칸이다. 침식된 기체로 짠 덱이지.' },
      { who: 'BR_Khan', text: '내 덱의 카드는 전부 실제 전장에서 마주친 적을 본뜬 것이다. 장난으로 만든 덱이 아니지.' },
      { who: 'BR_Khan', text: '광역 공격에 대비는 했겠지?' },
      { who: 'PECS_Orangeade', text: '유닛을 흩어 두면 한꺼번에 당하지 않아요. 이번엔 머리로 이길 거예요!' },
      { who: 'BR_Khan', text: '좋다. 그 판단이 맞는지 직접 확인하겠다. 신속하게 끝내도록 하지.' },
    ],
    outro: [
      { who: 'BR_Khan', text: '훌륭한 판단이었다. 준결승에 오를 자격은 충분하다.' },
      { who: 'BR_Leona', text: '칸이 칭찬을 다 하네. 잘했어, 오렌지에이드.' },
      { who: 'BR_Khan', text: '다음은 준결승이다. 대진은 운영진이 곧 발표하겠지.' },
      { who: 'PECS_Orangeade', text: '네…! 떨리지만 물러서지 않을게요!' },
      { who: '3P_ConstantiaS2', text: '준결승 대진이 나왔어. 오렌지에이드 대 레모네이드 알파.' },
      { who: 'PECS_Orangeade', text: '알파 님이 리그에 나오셨다고요…? 한 번도 그런 말씀 안 하셨는데…' },
      { who: 'PECS_LemonadeBeta', text: '말 안 하는 건 둘 다 똑같네요. 정말 누구를 닮았는지.' },
    ],
    mid: { half: { who: 'BR_Khan', text: '버티는군. 그렇다면 전선을 다시 짠다.' }, low: { who: 'BR_Khan', text: '진형이 무너졌다. 여기서 정리하겠다.' } },
    lose: { who: 'BR_Khan', text: '판단이 한 박자 늦었다. 다시 와라. 그때는 더 신속하게.' },
  },
  {
    id: 's7', no: '7', title: '알파 님의 시험', sub: '준결승 · 레모네이드 알파', bg: 'beach', bgm: 'boss1', boss: true,
    desc: '레모네이드 컬렉션 덱. 제타와 오메가 한정 카드가 등장하니 레인을 비워 두지 마세요.',
    enemy: { name: '레모네이드 알파', portrait: 'PECS_LemonadeAlpha', hp: 26, level: 'hard', style: 'balanced',
      deck: ['PECS_LemonadeAlpha', 'PECS_LemonadeBeta', 'PECS_LemonadeGamma', 'IW_LemonadeZeta', 'IW_LemonadeOmega', 'PECS_Hathor', 'PECS_Ignis', 'PECS_Empress', 'PECS_Draculina', 'PECS_Sekhmet', 'SK_PECS_Blessing', 'SK_IW_Corrode'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 18 }, { type: 'noSkill' }],
    intro: [
      { who: 'PECS_Orangeade', text: '알파 님…! 정말 알파 님이 준결승 상대세요?' },
      { who: 'PECS_LemonadeAlpha', text: '그래요, 오렌지에이드. 리그에 나갔다는 이야기는 다른 아이들에게 들었어요. 저에게는 한마디도 없었죠.' },
      { who: 'PECS_Orangeade', text: '그, 그게 말이죠… 우승해서 깜짝 놀라게 해 드리고 싶었거든요.' },
      { who: 'PECS_LemonadeBeta', text: '알파, 너무 몰아세우지 마요. 오렌지에이드도 나름대로 열심히 했거든요.' },
      { who: 'PECS_LemonadeAlpha', text: '베타는 빠져 있어요. …오렌지에이드, 그렇다면 여기서 보여 주세요.' },
      { who: 'PECS_LemonadeAlpha', text: '제 앞에서 망설인다면 결승은 꿈도 꾸지 마요.' },
      { who: 'PECS_Orangeade', text: '…알파 님은 늘 제 앞에 계셨죠. 저도 언젠가 알파 님 옆에 서고 싶었어요. 그래서 시작한 거예요.' },
      { who: 'PECS_LemonadeAlpha', text: '옆에 서고 싶다면 먼저 저를 넘어야 해요. 그게 부하가 할 수 있는 가장 큰 보답이에요.' },
      { who: 'PECS_LemonadeBeta', text: '아이고, 둘 다 고집은요. 그럼 저는 관중석에 있을게요. 누구 편인지는 비밀이고요.' },
    ],
    outro: [
      { who: 'PECS_LemonadeAlpha', text: '…잘했어요. 제가 가르친 것보다 훨씬 많이 컸네요.' },
      { who: 'PECS_Orangeade', text: '알파 님…!' },
      { who: 'PECS_LemonadeAlpha', text: '사실은요… 리그 이야기를 다른 아이들에게 들었을 때 조금 서운했어요. 제가 모르는 사이에 이렇게 자랐다는 게요.' },
      { who: 'PECS_Orangeade', text: '알파 님이 서운하셨다고요…? 저, 그런 줄도 모르고…' },
      { who: 'PECS_LemonadeAlpha', text: '괜찮아요. 서운한 마음보다 자랑스러운 마음이 훨씬 커요. 그러니 고개 들어요.' },
      { who: 'PECS_LemonadeBeta', text: '거 봐요. 그러니까 제가 뭐라고 했죠?' },
      { who: 'PECS_LemonadeAlpha', text: '결승 상대는 라비아타예요. 거기서 무너지면 그때는 정말로 혼낼 거예요.' },
      { who: 'PECS_Orangeade', text: '네! 꼭 이기고 올게요!' },
    ],
    mid: { half: { who: 'PECS_LemonadeAlpha', text: '…생각보다 단단하네요. 언제 이렇게 배운 거죠?' }, low: { who: 'PECS_LemonadeAlpha', text: '여기까지인가요? 그렇다면 결승은 아직 이르네요.' } },
    lose: { who: 'PECS_LemonadeAlpha', text: '아직 멀었어요. 다시 오세요, 오렌지에이드. 기다리고 있을게요.' },
  },
  {
    id: 's8', no: '8', title: '오르카 카드 마스터', sub: '결승 · 챔피언 라비아타 프로토타입', bg: 'squad', bgm: 'boss2', boss: true,
    desc: '오르카 리그 챔피언 라비아타의 삼안 정예 덱. 광역 공격과 강력한 SS 카드를 넘어서야 합니다.',
    enemy: { name: '라비아타 프로토타입', portrait: '3P_Labiata', hp: 19, level: 'hard', style: 'control',
      deck: ['3P_Labiata', '3P_Titania', '3P_Ajax', '3P_ConstantiaS2', '3P_Fenrir', '3P_BlackLilith', '3P_Sowan', '3P_Daphne', '3P_CSPerrault', '3P_Aqua', 'SK_3P_Rally', 'SK_3P_Barrage'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 16 }, { type: 'rounds', v: 9 }],
    intro: [
      { who: 'PECS_LemonadeAlpha', text: '오렌지에이드. 결승 전에 하나만 말해 둘게요.' },
      { who: 'PECS_LemonadeAlpha', text: '이기든 지든, 오늘은 끝까지 당신답게 해요. …그거면 돼요.' },
      { who: 'PECS_Orangeade', text: '…네! 알파 님!' },
      { who: '3P_ConstantiaS2', text: '드디어 결승이란다. 오르카 카드 리그 결승전, 챔피언 라비아타 대 도전자 오렌지에이드!' },
      { who: '3P_Labiata', text: '어서 오렴, 오렌지에이드 양. 여기까지 올라온 걸 보니 정말 많이 노력했구나.' },
      { who: 'PECS_Orangeade', text: '라비아타 씨…! 오늘은 챔피언 자리를 받으러 왔어요!' },
      { who: '3P_Labiata', text: '후후, 그 기세 좋구나. 알파 양도 보고 있으니 나도 봐주지 않겠단다.' },
      { who: '3P_Labiata', text: '나도 처음 카드를 잡았을 때는 손이 떨렸단다. 보여 주고 싶은 사람이 있으면 더 그렇지.' },
      { who: 'PECS_Orangeade', text: '…저도 지금 떨려요. 그래도 알파 님이 보고 계시니까, 끝까지 할 수 있어요.' },
      { who: '3P_Labiata', text: '전력으로 상대해 줄게. 오르카호의 챔피언으로서.' },
    ],
    outro: [
      { who: '3P_Labiata', text: '…내가 졌구나. 축하한단다. 오늘부터 오르카호 최고의 카드 마스터는 너야.' },
      { who: 'PECS_Orangeade', text: '해, 해냈어요…! 정말요? 헤헤…' },
      { who: 'PECS_LemonadeAlpha', text: '축하해요, 오렌지에이드. 오늘만큼은 마음껏 자랑해도 좋아요.' },
      { who: '3P_Labiata', text: '알파 양, 좋은 부하를 두었구나. 조금 부럽단다.' },
      { who: 'PECS_LemonadeAlpha', text: '…네. 제 자랑이에요.' },
      { who: 'PECS_Orangeade', text: '알파 님이 지금 저를 자랑이라고…! 헤헤, 이건 평생 기억할 거예요!' },
      { who: '3P_ConstantiaS2', text: '우승 축하해. 축하 파티 준비는 벌써 끝났잖니. 다들 기다리고 있어.' },
    ],
    mid: { half: { who: '3P_Labiata', text: '후후, 정말 많이 컸구나. 그럼 나도 조금 더 힘을 내 볼까?' }, low: { who: '3P_Labiata', text: '미안, 여기서는 물러설 수 없단다.' } },
    lose: { who: '3P_Labiata', text: '좋은 대국이었단다. 언제든 다시 도전하렴, 오렌지에이드 양.' },
    epilogue: [
      { who: 'PECS_Orangeade', text: '파티는 정말 굉장했어요. 다들 제 카드 이야기만 하더라고요. 헤헤…' },
      { who: 'PECS_LemonadeAlpha', text: '오렌지에이드. 다음부터는 큰일을 벌이기 전에 저에게 먼저 말하세요.' },
      { who: 'PECS_Orangeade', text: '네… 죄송해요, 알파 님.' },
      { who: 'PECS_LemonadeAlpha', text: '…그리고 다음 시즌에는 저도 처음부터 나갈 거예요. 그때는 봐주지 않을 거예요.' },
      { who: 'PECS_Orangeade', text: '에엣?! 알파 님이요?' },
      { who: '3P_ConstantiaS2', text: '다음 시즌 참가 신청이 벌써 줄을 섰단다. 챔피언, 자리 지킬 준비는 됐니?' },
      { who: 'PECS_Orangeade', text: '물론이죠! 오르카호 최고의 카드 마스터는 오렌지에이드거든요!' },
      { who: '3P_ConstantiaS2', text: '그럼 시즌 사이에는 순회전과 오늘의 대국으로 감을 유지하렴. 도전자들이 매일 바뀌거든.' },
      { who: 'PECS_LemonadeAlpha', text: '저도 가끔 그 대국표를 보러 갈 거예요. 기록이 떨어지면 바로 알 수 있게.' },
      { who: 'PECS_Orangeade', text: '헤헤… 알파 님께 보여 드릴 기록, 계속 늘려 갈게요!' },
    ],
  },
  {
    id: 'ex1', no: 'EX1', chapter: 'ex', title: 'VR 훈련실의 이상', sub: '외전 1 · 모의 개체 레모네이드 제타', bg: 'vr', bgm: 'battle3',
    desc: '알렉산드라의 철충 모의 카드 데이터가 폭주해 VR 리그를 점거했습니다. 회복과 철충 무리를 섞은 덱입니다.',
    enemy: { name: '모의 개체: 레모네이드 제타', portrait: 'IW_LemonadeZeta', hp: 34, level: 'hard', style: 'aggro',
      deck: ['IW_LemonadeZeta', 'IW_NightChick', 'IW_Parasite', 'IW_Stalker', 'IW_Speaker', 'IW_Kidnapper', 'PECS_LemonadeBeta', 'PECS_LemonadeGamma', 'PECS_Sekhmet', 'PECS_Ignis', 'SK_IW_Swarm', 'SK_PECS_Blessing'] },
    start: [{ lane: 1, id: 'IW_NightChick' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 9 }, { type: 'kills', v: 13 }],
    intro: [
      { who: 'PECS_Orangeade', text: '시즌이 끝났는데 VR 훈련실에서 대국 신청이 계속 들어와요. 보낸 사람이… 없대요.' },
      { who: '3P_Alexandra', text: '후후, 미안해요. 제 철충 모의 카드 데이터가 멋대로 대국 상대를 만들어 내고 있군요.' },
      { who: '3P_ConstantiaS2', text: '모의 개체들이 VR 리그 서버를 점거했어. 이기면 데이터가 하나씩 정리된다는구나.' },
      { who: 'PECS_LemonadeAlpha', text: '제가 같이 들어가겠어요. 레모네이드의 얼굴을 한 데이터라면 더더욱요.' },
      { who: 'PECS_Orangeade', text: '알파 님이랑 같이요? 헤헤… 든든해요!' },
      { who: 'IW_LemonadeZeta', text: '[모의 개체 제타] 대국 상대 확인. 오렌지에이드. 승률 기록 갱신을 개시합니다.' },
    ],
    outro: [
      { who: 'IW_LemonadeZeta', text: '[모의 개체 제타] 기록… 손상. 데이터를… 반납합니다.' },
      { who: '3P_Alexandra', text: '첫 번째 데이터는 정리됐어요. 하지만 서버 깊은 곳에 더 큰 반응이 있군요.' },
      { who: 'PECS_LemonadeAlpha', text: '레모네이드 제타의 모습이었어요. 그렇다면 그 끝에 있을 것도 짐작이 가네요.' },
      { who: 'PECS_Orangeade', text: '알파 님…?' },
    ],
    mid: { half: { who: 'IW_LemonadeZeta', text: '[모의 개체 제타] 손상률 50퍼센트. 회복 절차를 실행합니다.' }, low: { who: 'IW_LemonadeZeta', text: '[모의 개체 제타] 상대 라이프 위험 구간. 마무리 절차로 전환합니다.' } },
    lose: { who: 'IW_LemonadeZeta', text: '[모의 개체 제타] 승리 기록 저장. 다음 도전자를 기다립니다.' },
  },
  {
    id: 'ex2', no: 'EX2', chapter: 'ex', title: '강철 왕자의 성', sub: '외전 2 · 모의 개체 아이언 프린스', bg: 'offline', bgm: 'battle2',
    desc: '두꺼운 중장 철충과 AGS로 짠 방어 덱입니다. 작전 지시로 벽 너머 라이프를 노리세요.',
    enemy: { name: '모의 개체: 아이언 프린스', portrait: 'IW_IronPrince', hp: 26, level: 'normal', style: 'control',
      deck: ['IW_IronPrince', 'IW_MetalGuard', 'IW_Robert', 'IW_RocC', 'IW_Stalker', 'IW_Parasite', 'AGS_Goltarion', 'AGS_Stronghold', 'AGS_Rampart', 'AGS_Gigantes', 'SK_AGS_Barrier', 'SK_IW_Corrode'] },
    start: [{ lane: 1, id: 'IW_Stalker' }],
    stars: [{ type: 'win' }, { type: 'hp', v: 8 }, { type: 'commands', v: 5 }],
    intro: [
      { who: '3P_ConstantiaS2', text: '두 번째 구역은 방어 데이터가 몰려 있어. 철충 중장 기체를 본뜬 모의 개체란다.' },
      { who: 'IW_IronPrince', text: '[모의 개체 아이언 프린스] 이 성은 무너지지 않는다. 침입자는 돌아가라.' },
      { who: 'PECS_Orangeade', text: '벽이 두꺼우면 포격 지원으로 넘기면 되죠! 스트롱홀드 씨한테 배운 거예요.' },
      { who: 'PECS_LemonadeAlpha', text: '서두르지 말아요, 오렌지에이드. 벽은 먼저 지치는 쪽이 지는 거예요.' },
    ],
    outro: [
      { who: 'IW_IronPrince', text: '[모의 개체 아이언 프린스] 성벽… 붕괴. 데이터 반납.' },
      { who: '3P_Alexandra', text: '두 번째 데이터도 정리됐어요. 그런데 다음 구역에서 이상한 신호가 잡히는군요. 덴세츠 쪽 기록이에요.' },
      { who: 'PECS_LemonadeBeta', text: '덴세츠라면… 아자젤 님 쪽이요? 아자젤 님께도 연락해 둘게요.' },
    ],
    mid: { half: { who: 'IW_IronPrince', text: '[모의 개체 아이언 프린스] 외벽 손상. 내벽으로 후퇴한다.' }, low: { who: 'IW_IronPrince', text: '[모의 개체 아이언 프린스] 침입자의 전력이 바닥났다. 성문을 닫는다.' } },
    lose: { who: 'IW_IronPrince', text: '[모의 개체 아이언 프린스] 침입자 격퇴. 성은 그대로다.' },
  },
  {
    id: 'ex3', no: 'EX3', chapter: 'ex', title: '타락한 천사의 그림자', sub: '외전 3 · 모의 개체 타락한 아자젤', bg: 'red_boss2', bgm: 'boss1', boss: true,
    desc: '회피와 처치 효과로 무장한 덴세츠·철충 덱입니다. 상대는 어려움 인공지능입니다.',
    enemy: { name: '모의 개체: 타락한 아자젤', portrait: 'IW_AzazelAlter', hp: 23, level: 'hard', style: 'aggro',
      deck: ['IW_AzazelAlter', 'IW_Kidnapper', 'IW_Speaker', 'IW_NightChick', 'IW_RocC', 'DS_Saraqael', 'DS_Sarena', 'DS_Ramiel', 'DS_BunnySlayer', 'DS_Angel', 'SK_DS_Smoke', 'SK_IW_Swarm'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 10 }, { type: 'units', v: 10 }],
    intro: [
      { who: 'DS_Azazel', text: '이게 무슨 재앙인가요. 제 모습을 한 데이터가 대국을 하고 있다니요.' },
      { who: 'PECS_Orangeade', text: '아자젤 씨! 와 주셨군요!' },
      { who: 'DS_Azazel', text: '제 모습으로 소란을 피우는 건 그냥 둘 수 없으니까요. 그런데… 저 덱, 제 전술을 그대로 따라 했군요.' },
      { who: 'IW_AzazelAlter', text: '[모의 개체 타락한 아자젤] 원본 확인. 원본보다 효율적인 전술을 증명한다.' },
      { who: 'DS_Azazel', text: '후후, 그런가요? 오렌지에이드 씨, 회피는 한 번만 막아 준다는 것, 잊지 마세요.' },
    ],
    outro: [
      { who: 'IW_AzazelAlter', text: '[모의 개체 타락한 아자젤] 증명… 실패. 원본의 전술이… 우위.' },
      { who: 'DS_Azazel', text: '수고했어요, 오렌지에이드 씨. 덕분에 제 이름에 먹칠하지 않게 됐네요.' },
      { who: '3P_Alexandra', text: '마지막 구역의 반응이 커지고 있어요. 레모네이드 시리즈의 가장 깊은 기록… 오메가예요.' },
      { who: 'PECS_LemonadeAlpha', text: '…역시 그랬군요. 오렌지에이드, 마지막은 제 싸움이기도 해요. 같이 가요.' },
    ],
    mid: { half: { who: 'IW_AzazelAlter', text: '[모의 개체 타락한 아자젤] 예상 외 손상. 전술을 다시 계산한다.' }, low: { who: 'IW_AzazelAlter', text: '[모의 개체 타락한 아자젤] 원본의 제자, 여기서 탈락한다.' } },
    lose: { who: 'IW_AzazelAlter', text: '[모의 개체 타락한 아자젤] 원본보다 우월함을 증명했다.' },
  },
  {
    id: 'ex4', no: 'EX4', chapter: 'ex', title: '오메가', sub: '외전 결전 · 모의 개체 레모네이드 오메가', bg: 'red_boss', bgm: 'boss2', boss: true,
    desc: '외전의 마지막 상대. 비용 8의 오메가와 철충 보스를 모은 덱입니다. 어려움 인공지능이 상대합니다.',
    enemy: { name: '모의 개체: 레모네이드 오메가', portrait: 'IW_LemonadeOmega', hp: 21, level: 'hard', style: 'balanced',
      deck: ['IW_LemonadeOmega', 'IW_LemonadeZeta', 'IW_AzazelAlter', 'IW_IronPrince', 'IW_MetalGuard', 'IW_Robert', 'IW_Stalker', 'PECS_LemonadeGamma', 'PECS_Empress', 'PECS_Hathor', 'SK_IW_Corrode', 'SK_IW_Swarm'] },
    stars: [{ type: 'win' }, { type: 'hp', v: 13 }, { type: 'rounds', v: 10 }],
    intro: [
      { who: 'IW_LemonadeOmega', text: '[모의 개체 레모네이드 오메가] 레모네이드 알파. 그리고 알파의 부하. 기다리고 있었다.' },
      { who: 'PECS_LemonadeAlpha', text: '제 얼굴을 닮은 데이터가 제 부하에게 말을 걸다니, 기분이 좋지 않네요.' },
      { who: 'PECS_Orangeade', text: '알파 님, 제가 할게요. 알파 님께 보여 드리고 싶었던 거, 여기서 전부 보여 드릴게요.' },
      { who: 'PECS_LemonadeAlpha', text: '…좋아요. 뒤는 제가 지켜보고 있을게요. 망설이지 마요.' },
      { who: '3P_Labiata', text: '오렌지에이드 양, 챔피언의 대국을 보여 주렴. 우리 모두 보고 있단다.' },
    ],
    outro: [
      { who: 'IW_LemonadeOmega', text: '[모의 개체 레모네이드 오메가] 계산… 불일치. 이 부하는… 알파의 예측을 넘었다.' },
      { who: 'PECS_LemonadeAlpha', text: '맞아요. 그 아이는 제 예측 따위는 훨씬 넘어섰어요.' },
      { who: '3P_Alexandra', text: '모든 모의 데이터가 정리됐어요. VR 리그 서버도 정상으로 돌아왔군요. 수고했어요, 두 사람.' },
      { who: '3P_ConstantiaS2', text: '외전까지 완주라니, 정말 대단하구나. 이번 기록은 리그 명예의 전당에 올려 둘게.' },
      { who: 'PECS_Orangeade', text: '헤헤… 알파 님, 저 잘했죠?' },
      { who: 'PECS_LemonadeAlpha', text: '…네. 아주 잘했어요, 오렌지에이드.' },
    ],
    mid: { half: { who: 'IW_LemonadeOmega', text: '[모의 개체 레모네이드 오메가] 손상 확인. 그러나 오메가는 쓰러지지 않는다.' }, low: { who: 'IW_LemonadeOmega', text: '[모의 개체 레모네이드 오메가] 알파의 부하는 여기까지다.' } },
    lose: { who: 'IW_LemonadeOmega', text: '[모의 개체 레모네이드 오메가] 결과는 계산대로다. 다시 오너라, 알파의 부하.' },
  },
];

// 별 조건: win(승리), hp(남은 라이프), rounds(라운드 이내) 와 스테이지별 특수 임무
//   kills(적 전투원 처치 수), commands(작전 지시 사용 수), noSkill(지원 카드 없이), guards(보호기가 막아 낸 공격 수), units(배치한 전투원 수 이하)
// 스테이지 번호 표시: 0은 튜토리얼, EX는 외전
function stageLabel(s) { return s.no === '0' ? '튜토리얼' : s.no.startsWith('EX') ? `외전 ${s.no.slice(2)}장` : s.no === '7' ? '준결승' : s.no === '8' ? '결승' : `${s.no}장`; }
function starLabel(s) {
  if (s.type === 'win') return '승리';
  if (s.type === 'hp') return `라이프 ${s.v} 이상 남기고 승리`;
  if (s.type === 'rounds') return `${s.v}라운드 이내 승리`;
  if (s.type === 'kills') return `임무: 적 전투원 ${s.v}기 이상 처치하고 승리`;
  if (s.type === 'commands') return `임무: 작전 지시를 ${s.v}번 이상 쓰고 승리`;
  if (s.type === 'noSkill') return '임무: 지원 카드를 쓰지 않고 승리';
  if (s.type === 'guards') return `임무: 보호기로 공격을 ${s.v}번 이상 막고 승리`;
  if (s.type === 'units') return `임무: 전투원을 ${s.v}기 이하만 배치하고 승리`;
  return '';
}
function starMet(s, game, me) {
  const st = me.stats;
  switch (s.type) {
    case 'win': return true;
    case 'hp': return me.hp >= s.v;
    case 'rounds': return game.round() <= s.v;
    case 'kills': return st.kills >= s.v;
    case 'commands': return (st.commands || 0) >= s.v;
    case 'noSkill': return st.skillsUsed === 0;
    case 'guards': return (st.guards || 0) >= s.v;
    case 'units': return st.unitsPlayed <= s.v;
  }
  return false;
}
// 전투 중에 보여 줄 특수 임무 진행 상황 (임무가 없으면 null)
function missionProgress(stage, game, me) {
  const s = stage.stars.find(x => !['win', 'hp', 'rounds'].includes(x.type)); if (!s) return null;
  const st = me.stats;
  const cur = { kills: st.kills, commands: st.commands || 0, guards: st.guards || 0, units: st.unitsPlayed, noSkill: st.skillsUsed }[s.type];
  const ok = s.type === 'units' ? cur <= s.v : s.type === 'noSkill' ? cur === 0 : cur >= s.v;
  const c = Math.min(cur, s.v); // 목표를 넘겨도 '2/1'처럼 보이지 않게
  const label = { kills: `처치 ${c}/${s.v}`, commands: `작전 지시 ${c}/${s.v}`, guards: `보호 ${c}/${s.v}`, units: `배치 ${cur}/${s.v} 이하`, noSkill: cur ? '지원 카드 사용함' : '지원 카드 미사용' }[s.type];
  return { label, ok };
}
function evalStars(stage, game, me) {
  if (game.winner !== me) return [false, false, false];
  return stage.stars.map(s => starMet(s, game, me));
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
  ex1: ['SK_3P_Redeploy'],
  ex2: ['SK_AGS_Bulwark'],
  ex3: ['SK_DS_Flash'],
  ex4: ['SK_PECS_Omega'],
};
// 별 누적 보상: 철충 보스를 로비 캐릭터로 선택 가능
const STAR_REWARDS = [
  { stars: 9, secretary: 'IW_LemonadeZeta' },
  { stars: 18, secretary: 'IW_AzazelAlter' },
  { stars: 27, secretary: 'IW_LemonadeOmega' },
];
// 보급소 카드: 프리셋·튜토리얼 덱과 스토리 보상에 없는 A·S·SS 등급 카드. 보급 포인트로 하나씩 해금한다.
const SUPPLY_COST = { A: 6, S: 10, SS: 15 };
const SUPPLY_RANDOM_COST = 7; // 무작위 보급 (남은 보급 카드 중 하나)
const SUPPLY_CARDS = (() => {
  const keep = new Set([...PRESET_DECKS.flatMap(d => d.cards), ...CAMPAIGN[0].playerDeck, ...Object.values(STAGE_REWARDS).flat()]);
  return new Set(Object.values(CARDS).filter(c => !c.enemy && !c.token && c.id !== COMMAND_CARD.id && c.g !== 'B' && !keep.has(c.id)).map(c => c.id));
})();
const LOCKED = new Set([...Object.values(STAGE_REWARDS).flat(), ...SUPPLY_CARDS]);
const LOCKED_SECRETARIES = new Set(STAR_REWARDS.map(r => r.secretary));
function unlockSource(id) {
  const sid = Object.keys(STAGE_REWARDS).find(k => STAGE_REWARDS[k].includes(id));
  if (sid) { const s = CAMPAIGN.find(x => x.id === sid); return `스토리 ${stageLabel(s)} 「${s.title}」 승리`; }
  if (SUPPLY_CARDS.has(id)) return `보급소에서 해금 (보급 포인트 ${SUPPLY_COST[CARDS[id].g]})`;
  const r = STAR_REWARDS.find(x => x.secretary === id);
  return r ? `스토리 별 ${r.stars}개` : '';
}
