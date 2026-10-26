// ===== 라스트오리진 TCG 카드 데이터 =====
// 능력치는 프로토타입용 디자인 값 (원작 테이블과 무관)
// f: 제작사 (3P=삼안산업, PECS, BR=블랙리버, DS=덴세츠사, AGS)
// t: 병종 (L=경장, M=기동, H=중장)  r: 역할 (ATK=공격기, DEF=보호기, SUP=지원기)
// g: 등급 B/A/S/SS  c: 비용  a: 공격력  h: 체력  kw: 키워드  deploy/death: 효과 목록

const FACTIONS = {
  '3P':   { name: '삼안산업',  short: '삼안', color: '#ff9f2e', dark: '#7a4300' },
  'PECS': { name: 'PECS',     short: 'PECS', color: '#4fd66b', dark: '#1d5a2b' },
  'BR':   { name: '블랙리버',  short: 'BR',  color: '#ff4d5a', dark: '#6b141b' },
  'DS':   { name: '덴세츠사',  short: '덴세츠', color: '#b86bff', dark: '#4a2177' },
  'AGS':  { name: 'AGS',      short: 'AGS', color: '#4fb5ff', dark: '#174a6e' },
  'IW':   { name: '철충',      short: '철충', color: '#c9ced8', dark: '#3a1520', enemy: true },
};
const PLAYER_FACTIONS = ['3P', 'PECS', 'BR', 'DS', 'AGS'];

const TYPES = { L: '경장', M: '기동', H: '중장' };
const TYPE_BEATS = { L: 'M', M: 'H', H: 'L' }; // 경장>기동>중장>경장
const ROLES = { ATK: '공격기', DEF: '보호기', SUP: '지원기' };
const GRADE_COLOR = { B: '#9aa5b1', A: '#6fc3ff', S: '#ffd84d', SS: '#ff7ad9' };

const KEYWORD_HELP = {
  '돌격': '소환된 턴에도 공격할 수 있다.',
  '관통': '적 유닛을 처치하면 초과 피해가 상대 라이프에 들어간다.',
  '광역': '공격 시 모든 적 유닛에게 피해를 준다.',
  '회피': '다음 1회 피격을 무효화한다.',
  '방어막': '피해를 N까지 1회 흡수한다.',
  '재생': '내 턴 시작 시 체력을 N 회복한다.',
  '반격': '피격 시 공격자에게 공격력만큼 피해를 준다.',
  '보호': '양옆 레인을 노리는 공격을 대신 받고, 유닛 공격으로 받는 피해가 1 줄어든다(최소 1). (보호기 기본)',
  '공격기': '능력치가 높은 주력 화력. 관통 키워드가 있으면 초과 피해가 상대 라이프에 들어간다.',
  '지원': '양옆 레인 아군의 공격력 +1. (지원기 기본)',
  '둔화': '다음 공격 1회를 건너뛴다.',
};

// 효과 op: dmg, heal, buff, shield, evade, draw, res, destroyLowest, slow, healAll, buffAll, summon, debuff
// tgt: oppUnit(마주한 적), allEnemyUnits, enemyCmd, randomEnemyUnit, self, adjAllies, allAllies, myCmd, pickEnemyUnit, pickAllyUnit, pickAny
const UNITS = [
  // ---------- 삼안산업 ----------
  { id: '3P_Labiata', n: '라비아타 프로토타입', f: '3P', t: 'H', r: 'ATK', g: 'SS', c: 6, a: 6, h: 7, kw: ['광역'], deploy: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 2 }], text: '전개: 모든 적 유닛에게 2 피해.' },
  { id: '3P_ConstantiaS2', n: '콘스탄챠 S2', f: '3P', t: 'M', r: 'ATK', g: 'SS', c: 5, a: 6, h: 4, kw: ['돌격', '회피'], text: '' },
  { id: '3P_Titania', n: '티타니아', f: '3P', t: 'H', r: 'DEF', g: 'SS', c: 6, a: 3, h: 10, kw: ['방어막:3', '재생:2'], text: '' },
  { id: '3P_Hirume', n: '월하의 히루메', f: '3P', t: 'H', r: 'ATK', g: 'SS', c: 7, a: 8, h: 6, kw: ['관통'], deploy: [{ op: 'slow', tgt: 'allEnemyUnits' }], text: '전개: 모든 적 유닛 둔화.' },
  { id: '3P_BlackLilith', n: '블랙 리리스', f: '3P', t: 'L', r: 'ATK', g: 'S', c: 4, a: 5, h: 3, kw: ['돌격'], death: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '격파: 상대 라이프에 1 피해.' },
  { id: '3P_CSPerrault', n: 'C.S. 페로', f: '3P', t: 'M', r: 'SUP', g: 'S', c: 4, a: 3, h: 5, kw: [], deploy: [{ op: 'buff', tgt: 'adjAllies', a: 1, h: 1 }], text: '전개: 양옆 아군 +1/+1.' },
  { id: '3P_Daphne', n: '다프네', f: '3P', t: 'M', r: 'ATK', g: 'S', c: 4, a: 4, h: 5, kw: ['회피'], strike: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 1 }], text: '공격 후: 무작위 적 유닛에게 1 피해.' },
  { id: '3P_Fenrir', n: '펜릴', f: '3P', t: 'M', r: 'ATK', g: 'S', c: 5, a: 5, h: 5, kw: ['돌격'], strike: [{ op: 'buff', tgt: 'self', a: 1, h: 0 }], text: '공격 후: 자신의 공격력 +1.' },
  { id: '3P_BlackWyrm', n: '블랙 웜', f: '3P', t: 'H', r: 'ATK', g: 'S', c: 5, a: 4, h: 7, kw: ['반격'] },
  { id: '3P_Sowan', n: '소완', f: '3P', t: 'H', r: 'ATK', g: 'S', c: 5, a: 6, h: 6, kw: [] , deploy: [{ op: 'dmg', tgt: 'oppUnit', v: 2 }], text: '전개: 마주한 적 유닛에게 2 피해.' },
  { id: '3P_Ran', n: '란', f: '3P', t: 'M', r: 'SUP', g: 'S', c: 4, a: 2, h: 6, kw: [], deploy: [{ op: 'draw', v: 1 }], text: '전개: 카드 1장 드로우.' },
  { id: '3P_Alexandra', n: '알렉산드라', f: '3P', t: 'L', r: 'SUP', g: 'A', c: 3, a: 2, h: 4, kw: [], deploy: [{ op: 'heal', tgt: 'myCmd', v: 3 }], text: '전개: 내 라이프 3 회복.' },
  { id: '3P_Aqua', n: '아쿠아', f: '3P', t: 'M', r: 'DEF', g: 'A', c: 3, a: 3, h: 6, kw: ['회피'], death: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '격파: 양옆 아군에게 방어막 1.' },
  { id: '3P_Ajax', n: '에이젝스', f: '3P', t: 'L', r: 'DEF', g: 'A', c: 3, a: 3, h: 5, kw: ['반격'], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '전개: 양옆 아군에게 방어막 1.' },
  { id: '3P_Vanilla', n: '바닐라 A-1', f: '3P', t: 'M', r: 'SUP', g: 'A', c: 2, a: 1, h: 4, kw: [], deploy: [{ op: 'res', v: 1 }], text: '전개: 이번 턴 AP +1.' },
  { id: '3P_SnowFeather', n: '스노우 페더', f: '3P', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: [], deploy: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 1 }], text: '전개: 무작위 적 유닛에게 1 피해.' },
  { id: '3P_Rhea', n: '레아', f: '3P', t: 'H', r: 'DEF', g: 'A', c: 3, a: 1, h: 6, kw: ['방어막:1'], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '전개: 양옆 아군에게 방어막 1.' },
  { id: '3P_Merope', n: '메로페', f: '3P', t: 'H', r: 'DEF', g: 'A', c: 3, a: 2, h: 6, kw: ['방어막:1'], strike: [{ op: 'heal', tgt: 'myCmd', v: 1 }], text: '공격 후: 내 라이프 1 회복.' },
  { id: '3P_Alcyone', n: '알키오네', f: '3P', t: 'M', r: 'SUP', g: 'A', c: 2, a: 2, h: 4, kw: [], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '전개: 양옆 아군에게 방어막 1.' },
  { id: '3P_Alice', n: '앨리스', f: '3P', t: 'L', r: 'ATK', g: 'B', c: 2, a: 2, h: 3, kw: ['돌격'], death: [{ op: 'draw', v: 1 }], text: '격파: 카드 1장 드로우.' },
  { id: '3P_Hachiko', n: '하치코', f: '3P', t: 'L', r: 'DEF', g: 'B', c: 2, a: 2, h: 3, kw: [], death: [{ op: 'heal', tgt: 'myCmd', v: 2 }], text: '격파: 내 라이프 2 회복.' },
  { id: '3P_Poi', n: '피', f: '3P', t: 'M', r: 'ATK', g: 'B', c: 1, a: 2, h: 2, kw: [] },
  { id: '3P_Maria', n: '마리아', f: '3P', t: 'L', r: 'SUP', g: 'B', c: 1, a: 1, h: 2, kw: [], deploy: [{ op: 'heal', tgt: 'myCmd', v: 1 }], text: '전개: 내 라이프 1 회복.' },

  // ---------- PECS ----------
  { id: 'PECS_Empress', n: '엠프레스', f: 'PECS', t: 'H', r: 'DEF', g: 'SS', c: 7, a: 4, h: 11, kw: ['방어막:4', '반격'] },
  { id: 'PECS_Ignis', n: '이그니스', f: 'PECS', t: 'H', r: 'ATK', g: 'SS', c: 6, a: 6, h: 6, kw: ['광역'] },
  { id: 'PECS_Hathor', n: '하토르', f: 'PECS', t: 'M', r: 'SUP', g: 'S', c: 5, a: 2, h: 6, kw: [], deploy: [{ op: 'buffAll', a: 1, h: 1 }], text: '전개: 모든 아군 유닛 +1/+1.' },
  { id: 'PECS_BlindPrincess', n: '블라인드 프린세스', f: 'PECS', t: 'L', r: 'DEF', g: 'S', c: 4, a: 3, h: 7, kw: ['회피'] },
  { id: 'PECS_Azaz', n: '아자즈', f: 'PECS', t: 'M', r: 'ATK', g: 'S', c: 5, a: 5, h: 5, kw: ['회피'], strike: [{ op: 'heal', tgt: 'self', v: 2 }], text: '공격 후: 자신의 체력 2 회복.' },
  { id: 'PECS_HighElven', n: '하이엘븐', f: 'PECS', t: 'M', r: 'ATK', g: 'S', c: 5, a: 6, h: 4, kw: ['돌격'], strike: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 1 }], text: '공격 후: 무작위 적 유닛에게 1 피해.' },
  { id: 'PECS_DarkElf', n: '다크 엘프', f: 'PECS', t: 'M', r: 'ATK', g: 'S', c: 4, a: 5, h: 3, kw: ['회피'], strike: [{ op: 'slow', tgt: 'oppUnit' }], text: '공격 후: 마주한 적 유닛 둔화.' },
  { id: 'PECS_Lumberjane', n: '럼버 제인', f: 'PECS', t: 'H', r: 'ATK', g: 'S', c: 5, a: 6, h: 6, kw: ['반격'], strike: [{ op: 'debuff', tgt: 'oppUnit', a: 1 }], text: '공격 후: 마주한 적 유닛 공격력 -1.' },
  { id: 'PECS_Sekhmet', n: '세크메트', f: 'PECS', t: 'H', r: 'DEF', g: 'S', c: 5, a: 3, h: 9, kw: ['재생:2'], deploy: [{ op: 'healAll', v: 2 }], text: '전개: 모든 아군 유닛 2 회복.' },
  { id: 'PECS_Spartoia', n: '스파르토이아', f: 'PECS', t: 'H', r: 'DEF', g: 'S', c: 4, a: 3, h: 8, kw: ['방어막:3'] },
  { id: 'PECS_Triaina', n: '트리아이나', f: 'PECS', t: 'M', r: 'ATK', g: 'S', c: 4, a: 4, h: 5, kw: [], deploy: [{ op: 'heal', tgt: 'myCmd', v: 3 }], text: '전개: 내 라이프 3 회복.' },
  { id: 'PECS_Draculina', n: '드라큘리나', f: 'PECS', t: 'H', r: 'ATK', g: 'S', c: 5, a: 6, h: 6, kw: ['재생:2'] },
  { id: 'PECS_Orangeade', n: '오렌지에이드', f: 'PECS', t: 'M', r: 'SUP', g: 'S', c: 4, a: 3, h: 5, kw: [], deploy: [{ op: 'draw', v: 1 }, { op: 'buff', tgt: 'adjAllies', a: 1, h: 0 }], text: '전개: 카드 1장 드로우, 양옆 아군 공격력 +1.' },
  { id: 'PECS_Hestia', n: '헤스티아', f: 'PECS', t: 'M', r: 'DEF', g: 'A', c: 3, a: 2, h: 7, kw: ['재생:1'], strike: [{ op: 'heal', tgt: 'myCmd', v: 1 }], text: '공격 후: 내 라이프 1 회복.' },
  { id: 'PECS_LemonadeAlpha', n: '레모네이드 알파', f: 'PECS', t: 'L', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['관통'], deploy: [{ op: 'buff', tgt: 'adjAllies', a: 1, h: 0 }], text: '전개: 양옆 아군 공격력 +1.' },
  { id: 'PECS_LemonadeBeta', n: '레모네이드 베타', f: 'PECS', t: 'L', r: 'SUP', g: 'A', c: 2, a: 1, h: 4, kw: [], deploy: [{ op: 'heal', tgt: 'myCmd', v: 2 }], text: '전개: 내 라이프 2 회복.' },
  { id: 'PECS_LemonadeGamma', n: '레모네이드 감마', f: 'PECS', t: 'L', r: 'DEF', g: 'A', c: 3, a: 2, h: 6, kw: ['방어막:2'], strike: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '공격 후: 양옆 아군에게 방어막 1.' },
  { id: 'PECS_Fortune', n: '포츈', f: 'PECS', t: 'L', r: 'SUP', g: 'A', c: 3, a: 2, h: 6, kw: [], deploy: [{ op: 'draw', v: 1 }], text: '전개: 카드 1장 드로우.' },
  { id: 'PECS_ElvenForestmaker', n: '엘븐 포레스트메이커', f: 'PECS', t: 'L', r: 'SUP', g: 'A', c: 3, a: 3, h: 5, kw: [], deploy: [{ op: 'healAll', v: 2 }], text: '전개: 모든 아군 유닛 2 회복.' },
  { id: 'PECS_MightyR', n: '마이티 R', f: 'PECS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 3, kw: ['돌격'], strike: [{ op: 'buff', tgt: 'self', a: 1, h: 0 }], text: '공격 후: 자신의 공격력 +1.' },
  { id: 'PECS_Muse', n: '뮤즈', f: 'PECS', t: 'M', r: 'SUP', g: 'A', c: 2, a: 1, h: 5, kw: [], deploy: [{ op: 'healAll', v: 2 }], text: '전개: 모든 아군 유닛 2 회복.' },
  { id: 'PECS_Sonia', n: '소니아', f: 'PECS', t: 'L', r: 'ATK', g: 'A', c: 2, a: 3, h: 3, kw: [], death: [{ op: 'draw', v: 1 }], text: '격파: 카드 1장 드로우.' },
  { id: 'PECS_Hussar', n: '후사르', f: 'PECS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 3, h: 3, kw: ['돌격'], deploy: [{ op: 'buff', tgt: 'adjAllies', a: 1, h: 0 }], text: '전개: 양옆 아군 공격력 +1.' },
  { id: 'PECS_Cerberus', n: '케르베로스', f: 'PECS', t: 'M', r: 'ATK', g: 'B', c: 2, a: 2, h: 3, kw: ['돌격'], deploy: [{ op: 'dmg', tgt: 'oppUnit', v: 1 }], text: '전개: 마주한 적 유닛에게 1 피해.' },
  { id: 'PECS_MissSafety', n: '미스 세이프티', f: 'PECS', t: 'L', r: 'SUP', g: 'B', c: 1, a: 1, h: 3, kw: [], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '전개: 양옆 아군에게 방어막 1.' },
  { id: 'PECS_Express76', n: '익스프레스 76', f: 'PECS', t: 'M', r: 'SUP', g: 'B', c: 2, a: 1, h: 4, kw: [], deploy: [{ op: 'draw', v: 1 }], text: '전개: 카드 1장 드로우.' },
  { id: 'PECS_LRL', n: 'LRL', f: 'PECS', t: 'L', r: 'SUP', g: 'B', c: 2, a: 1, h: 3, kw: [], deploy: [{ op: 'buff', tgt: 'adjAllies', a: 1, h: 0 }], text: '전개: 양옆 아군 공격력 +1.' },

  // ---------- 블랙리버 ----------
  { id: 'BR_Khan', n: '신속의 칸', f: 'BR', t: 'H', r: 'DEF', g: 'SS', c: 7, a: 5, h: 10, kw: ['반격', '방어막:2'] },
  { id: 'BR_Phoenix', n: '피닉스', f: 'BR', t: 'H', r: 'ATK', g: 'SS', c: 6, a: 6, h: 6, kw: ['재생:3'], death: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 3 }], text: '격파: 모든 적 유닛에게 3 피해.' },
  { id: 'BR_RoyalArsenal', n: '로열 아스널', f: 'BR', t: 'H', r: 'ATK', g: 'SS', c: 7, a: 7, h: 7, kw: ['광역'] },
  { id: 'BR_Alvis', n: '알비스', f: 'BR', t: 'L', r: 'SUP', g: 'S', c: 4, a: 2, h: 5, kw: [], deploy: [{ op: 'buffAll', a: 1, h: 0 }], text: '전개: 모든 아군 유닛 공격력 +1.' },
  { id: 'BR_Andvari', n: '안드바리', f: 'BR', t: 'H', r: 'DEF', g: 'S', c: 5, a: 3, h: 9, kw: ['방어막:3'] },
  { id: 'BR_Brunhild', n: '브륀힐드', f: 'BR', t: 'H', r: 'ATK', g: 'S', c: 5, a: 6, h: 7, kw: ['관통'], strike: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '공격 후: 상대 라이프에 1 피해.' },
  { id: 'BR_Efreeti', n: '이프리트', f: 'BR', t: 'H', r: 'ATK', g: 'S', c: 5, a: 5, h: 5, kw: [], deploy: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 1 }], text: '전개: 모든 적 유닛에게 1 피해.' },
  { id: 'BR_HongRyun', n: '홍련', f: 'BR', t: 'M', r: 'ATK', g: 'S', c: 4, a: 5, h: 4, kw: ['돌격'] },
  { id: 'BR_Hraesvelgr', n: '흐레스벨그', f: 'BR', t: 'M', r: 'SUP', g: 'S', c: 4, a: 3, h: 5, kw: [], deploy: [{ op: 'dmg', tgt: 'enemyCmd', v: 3 }], text: '전개: 상대 라이프에 3 피해.' },
  { id: 'BR_Io', n: '이오', f: 'BR', t: 'M', r: 'ATK', g: 'S', c: 5, a: 5, h: 5, kw: ['돌격', '관통'] },
  { id: 'BR_May', n: '메이', f: 'BR', t: 'M', r: 'ATK', g: 'S', c: 4, a: 4, h: 4, kw: ['회피'], deploy: [{ op: 'dmg', tgt: 'oppUnit', v: 2 }], text: '전개: 마주한 적 유닛에게 2 피해.' },
  { id: 'BR_NightAngel', n: '나이트 엔젤', f: 'BR', t: 'L', r: 'ATK', g: 'S', c: 4, a: 5, h: 2, kw: ['돌격'] },
  { id: 'BR_Phantom', n: '팬텀', f: 'BR', t: 'L', r: 'ATK', g: 'S', c: 4, a: 4, h: 4, kw: ['회피'], death: [{ op: 'draw', v: 1 }], text: '격파: 카드 1장 드로우.' },
  { id: 'BR_Scathy', n: '스카디', f: 'BR', t: 'M', r: 'ATK', g: 'S', c: 5, a: 5, h: 6, kw: ['관통'], strike: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 2 }], text: '공격 후: 무작위 적 유닛에게 2 피해.' },
  { id: 'BR_Sleipnir', n: '슬레이프니르', f: 'BR', t: 'M', r: 'ATK', g: 'S', c: 5, a: 4, h: 6, kw: ['돌격'], deploy: [{ op: 'buff', tgt: 'adjAllies', a: 1, h: 0 }], text: '전개: 양옆 아군 공격력 +1.' },
  { id: 'BR_Tomoe', n: '토모', f: 'BR', t: 'M', r: 'ATK', g: 'S', c: 4, a: 5, h: 6, kw: ['관통'], strike: [{ op: 'buff', tgt: 'self', a: 1, h: 0 }], text: '공격 후: 자신의 공격력 +1.' },
  { id: 'BR_Valkyrie', n: '발키리', f: 'BR', t: 'H', r: 'ATK', g: 'S', c: 5, a: 6, h: 6, kw: ['반격'], death: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 1 }], text: '격파: 모든 적 유닛에게 1 피해.' },
  { id: 'BR_Thetis', n: '테티스', f: 'BR', t: 'H', r: 'DEF', g: 'S', c: 4, a: 2, h: 8, kw: ['반격'], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 2 }], text: '전개: 양옆 아군에게 방어막 2.' },
  { id: 'BR_Fafnir', n: '파프니르', f: 'BR', t: 'M', r: 'SUP', g: 'S', c: 4, a: 3, h: 6, kw: [], deploy: [{ op: 'res', v: 2 }], text: '전개: 이번 턴 AP +2.' },
  { id: 'BR_Banshee', n: '밴시', f: 'BR', t: 'H', r: 'ATK', g: 'A', c: 3, a: 5, h: 5, kw: [], deploy: [{ op: 'debuff', tgt: 'oppUnit', a: 1 }], text: '전개: 마주한 적 유닛 공격력 -1.' },
  { id: 'BR_BeastHunter', n: '비스트헌터', f: 'BR', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['관통'], deploy: [{ op: 'dmg', tgt: 'oppUnit', v: 1 }], text: '전개: 마주한 적 유닛에게 1 피해.' },
  { id: 'BR_Bulgasari', n: '불가사리', f: 'BR', t: 'H', r: 'DEF', g: 'A', c: 3, a: 2, h: 8, kw: ['방어막:1'] },
  { id: 'BR_Cheona', n: '천아', f: 'BR', t: 'L', r: 'ATK', g: 'A', c: 3, a: 4, h: 3, kw: ['돌격'], strike: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '공격 후: 상대 라이프에 1 피해.' },
  { id: 'BR_Emily', n: '에밀리', f: 'BR', t: 'M', r: 'ATK', g: 'A', c: 2, a: 3, h: 4, kw: [], death: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '격파: 상대 라이프에 1 피해.' },
  { id: 'BR_Gremlin', n: '그렘린', f: 'BR', t: 'M', r: 'ATK', g: 'A', c: 3, a: 3, h: 4, kw: [], deploy: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 2 }], text: '전개: 무작위 적 유닛에게 2 피해.' },
  { id: 'BR_Leona', n: '레오나', f: 'BR', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['회피'], strike: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '공격 후: 상대 라이프에 1 피해.' },
  { id: 'BR_Nashorn', n: '나스호른', f: 'BR', t: 'H', r: 'DEF', g: 'A', c: 3, a: 2, h: 7, kw: ['반격'] },
  { id: 'BR_RedHood', n: '레드후드', f: 'BR', t: 'L', r: 'ATK', g: 'A', c: 2, a: 3, h: 3, kw: ['관통'] },
  { id: 'BR_Shirayuri', n: '시라유리', f: 'BR', t: 'L', r: 'SUP', g: 'A', c: 2, a: 2, h: 4, kw: [], deploy: [{ op: 'debuff', tgt: 'oppUnit', a: 1 }], text: '전개: 마주한 적 유닛 공격력 -1.' },
  { id: 'BR_Sirene', n: '시렌', f: 'BR', t: 'H', r: 'DEF', g: 'A', c: 3, a: 3, h: 6, kw: ['방어막:1'], deploy: [{ op: 'slow', tgt: 'oppUnit' }], text: '전개: 마주한 적 유닛 둔화.' },
  { id: 'BR_Undine', n: '운디네', f: 'BR', t: 'L', r: 'SUP', g: 'A', c: 2, a: 2, h: 3, kw: [], deploy: [{ op: 'healAll', v: 3 }], text: '전개: 모든 아군 유닛 3 회복.' },
  { id: 'BR_Brownie', n: '브라우니', f: 'BR', t: 'L', r: 'DEF', g: 'B', c: 2, a: 2, h: 5, kw: [], death: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '격파: 상대 라이프에 1 피해.' },
  { id: 'BR_Harpy', n: '하피', f: 'BR', t: 'L', r: 'ATK', g: 'B', c: 1, a: 2, h: 2, kw: [], deploy: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 1 }], text: '전개: 무작위 적 유닛에게 1 피해.' },
  { id: 'BR_Impet', n: '임펫', f: 'BR', t: 'L', r: 'ATK', g: 'B', c: 2, a: 3, h: 1, kw: ['돌격'], death: [{ op: 'dmg', tgt: 'oppUnit', v: 2 }], text: '격파: 마주한 적 유닛에게 2 피해.' },
  { id: 'BR_Hyena', n: '하이에나', f: 'BR', t: 'H', r: 'DEF', g: 'B', c: 2, a: 2, h: 5, kw: ['반격'] },
  { id: 'BR_Pixie', n: '픽시', f: 'BR', t: 'L', r: 'SUP', g: 'B', c: 1, a: 1, h: 2, kw: [], deploy: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '전개: 상대 라이프에 1 피해.' },
  { id: 'BR_PoniesAnger', n: '포니', f: 'BR', t: 'L', r: 'ATK', g: 'B', c: 1, a: 2, h: 2, kw: ['돌격'], death: [{ op: 'dmg', tgt: 'enemyCmd', v: 1 }], text: '격파: 상대 라이프에 1 피해.' },

  // ---------- 덴세츠사 ----------
  { id: 'DS_Azazel', n: '아자젤', f: 'DS', t: 'L', r: 'ATK', g: 'SS', c: 6, a: 8, h: 4, kw: ['돌격', '회피'] },
  { id: 'DS_Saraqael', n: '사라콰엘', f: 'DS', t: 'H', r: 'ATK', g: 'SS', c: 7, a: 7, h: 7, kw: ['관통'], deploy: [{ op: 'destroyLowest', v: 4 }], text: '전개: 체력 4 이하인 적 유닛 중 가장 약한 하나를 처치.' },
  { id: 'DS_Sarena', n: '사레나', f: 'DS', t: 'H', r: 'DEF', g: 'SS', c: 6, a: 4, h: 10, kw: ['회피', '방어막:2'] },
  { id: 'DS_Arman', n: '아르망', f: 'DS', t: 'H', r: 'ATK', g: 'S', c: 5, a: 6, h: 5, kw: ['회피'], strike: [{ op: 'slow', tgt: 'oppUnit' }], text: '공격 후: 마주한 적 유닛 둔화.' },
  { id: 'DS_Atalanta', n: '아탈란테', f: 'DS', t: 'M', r: 'ATK', g: 'S', c: 4, a: 4, h: 3, kw: ['돌격', '회피'] },
  { id: 'DS_BunnySlayer', n: '버니 슬레이어', f: 'DS', t: 'M', r: 'ATK', g: 'S', c: 5, a: 5, h: 6, kw: ['회피'], strike: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 1 }], text: '공격 후: 무작위 적 유닛에게 1 피해.' },
  { id: 'DS_Charlotte', n: '샬럿', f: 'DS', t: 'H', r: 'DEF', g: 'S', c: 5, a: 3, h: 9, kw: ['회피'], deploy: [{ op: 'evade', tgt: 'adjAllies' }], text: '전개: 양옆 아군에게 회피 부여.' },
  { id: 'DS_KunoichiKaen', n: '쿠노이치 카엔', f: 'DS', t: 'H', r: 'ATK', g: 'S', c: 5, a: 5, h: 6, kw: [], deploy: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 1 }], text: '전개: 모든 적 유닛에게 1 피해.' },
  { id: 'DS_Ramiel', n: '라미엘', f: 'DS', t: 'M', r: 'ATK', g: 'S', c: 4, a: 4, h: 5, kw: ['회피'], deploy: [{ op: 'slow', tgt: 'oppUnit' }], text: '전개: 마주한 적 유닛 둔화.' },
  { id: 'DS_Baekto', n: '백토', f: 'DS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['회피'], death: [{ op: 'draw', v: 1 }], text: '격파: 카드 1장 드로우.' },
  { id: 'DS_Cloverace', n: '클로버 에이스', f: 'DS', t: 'L', r: 'ATK', g: 'A', c: 3, a: 3, h: 2, kw: ['돌격', '회피'], strike: [{ op: 'evade', tgt: 'self' }], text: '공격 후: 자신에게 회피 부여.' },
  { id: 'DS_Faucre', n: '포크레', f: 'DS', t: 'L', r: 'SUP', g: 'A', c: 2, a: 1, h: 4, kw: [], deploy: [{ op: 'evade', tgt: 'adjAllies' }], text: '전개: 양옆 아군에게 회피 부여.' },
  { id: 'DS_Johanna', n: '요한나', f: 'DS', t: 'H', r: 'SUP', g: 'A', c: 3, a: 2, h: 5, kw: [], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 2 }], text: '전개: 양옆 아군에게 방어막 2.' },
  { id: 'DS_KunoichiEnrai', n: '쿠노이치 엔라이', f: 'DS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['회피'] },
  { id: 'DS_KunoichiShiden', n: '쿠노이치 시덴', f: 'DS', t: 'L', r: 'ATK', g: 'A', c: 2, a: 3, h: 3, kw: ['돌격'] },
  { id: 'DS_KunoichiZero', n: '쿠노이치 제로', f: 'DS', t: 'L', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['관통'] },
  { id: 'DS_MoMo', n: '모모', f: 'DS', t: 'M', r: 'SUP', g: 'A', c: 2, a: 1, h: 4, kw: ['회피'] },
  { id: 'DS_Koyori', n: '코요리', f: 'DS', t: 'M', r: 'ATK', g: 'B', c: 2, a: 3, h: 2, kw: ['회피'], deploy: [{ op: 'debuff', tgt: 'oppUnit', a: 1 }], text: '전개: 마주한 적 유닛 공격력 -1.' },
  { id: 'DS_Angel', n: '엔젤', f: 'DS', t: 'M', r: 'ATK', g: 'B', c: 1, a: 2, h: 2, kw: ['회피'] },

  // ---------- AGS ----------
  { id: 'AGS_Goltarion', n: '골타리온', f: 'AGS', t: 'H', r: 'ATK', g: 'SS', c: 7, a: 7, h: 8, kw: ['광역', '방어막:2'] },
  { id: 'AGS_Tyrant', n: '타이런트', f: 'AGS', t: 'H', r: 'ATK', g: 'SS', c: 6, a: 7, h: 6, kw: ['관통', '반격'] },
  { id: 'AGS_Stronghold', n: '스트롱홀드', f: 'AGS', t: 'H', r: 'DEF', g: 'S', c: 5, a: 4, h: 10, kw: ['방어막:3'] },
  { id: 'AGS_Fortress', n: '포트리스', f: 'AGS', t: 'H', r: 'DEF', g: 'S', c: 5, a: 3, h: 9, kw: ['반격'], strike: [{ op: 'shield', tgt: 'self', v: 2 }], text: '공격 후: 자신에게 방어막 2.' },
  { id: 'AGS_Gigantes', n: '기간테스', f: 'AGS', t: 'H', r: 'ATK', g: 'S', c: 5, a: 7, h: 6, kw: ['방어막:2'] },
  { id: 'AGS_Albatross', n: '알바트로스', f: 'AGS', t: 'M', r: 'ATK', g: 'S', c: 4, a: 4, h: 4, kw: ['돌격'], deploy: [{ op: 'dmg', tgt: 'enemyCmd', v: 2 }], text: '전개: 상대 라이프에 2 피해.' },
  { id: 'AGS_Deathstalker', n: '데스스토커', f: 'AGS', t: 'M', r: 'ATK', g: 'S', c: 5, a: 5, h: 4, kw: ['돌격'], strike: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 2 }], text: '공격 후: 무작위 적 유닛에게 2 피해.' },
  { id: 'AGS_MrAlfred2', n: '미스터 알프레드', f: 'AGS', t: 'H', r: 'DEF', g: 'S', c: 4, a: 2, h: 8, kw: ['재생:2'] },
  { id: 'AGS_Rampart', n: '램파트', f: 'AGS', t: 'H', r: 'DEF', g: 'A', c: 3, a: 3, h: 7, kw: ['방어막:2'] },
  { id: 'AGS_RheinRitter', n: '라인리터', f: 'AGS', t: 'H', r: 'DEF', g: 'A', c: 3, a: 2, h: 6, kw: ['반격'], strike: [{ op: 'heal', tgt: 'myCmd', v: 1 }], text: '공격 후: 내 라이프 1 회복.' },
  { id: 'AGS_Roc', n: '로크', f: 'AGS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 3, h: 3, kw: ['돌격'], deploy: [{ op: 'shield', tgt: 'self', v: 2 }], text: '전개: 자신에게 방어막 2.' },
  { id: 'AGS_Seljuq', n: '셀주크', f: 'AGS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 3, h: 4, kw: ['돌격'], strike: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 1 }], text: '공격 후: 무작위 적 유닛에게 1 피해.' },
  { id: 'AGS_Shade', n: '셰이드', f: 'AGS', t: 'L', r: 'ATK', g: 'A', c: 2, a: 3, h: 2, kw: ['회피'], death: [{ op: 'dmg', tgt: 'enemyCmd', v: 2 }], text: '격파: 상대 라이프에 2 피해.' },
  { id: 'AGS_Arachne', n: '아라크네', f: 'AGS', t: 'L', r: 'SUP', g: 'A', c: 3, a: 1, h: 5, kw: [], deploy: [{ op: 'shield', tgt: 'allAllies', v: 1 }], text: '전개: 모든 아군 유닛 방어막 1.' },
  { id: 'AGS_Fallen', n: '폴른', f: 'AGS', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 5, kw: [], death: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 1 }], text: '격파: 모든 적 유닛에게 1 피해.' },
  { id: 'AGS_Aeda', n: '에이다 Type-G', f: 'AGS', t: 'M', r: 'SUP', g: 'A', c: 2, a: 1, h: 5, kw: [], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '전개: 양옆 아군에게 방어막 1.' },
  { id: 'AGS_Watcher', n: '와쳐', f: 'AGS', t: 'L', r: 'SUP', g: 'B', c: 1, a: 1, h: 3, kw: [], deploy: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '전개: 양옆 아군에게 방어막 1.' },
  { id: 'AGS_SpartanA', n: '스파르탄 캡틴', f: 'AGS', t: 'H', r: 'DEF', g: 'B', c: 2, a: 2, h: 5, kw: ['방어막:1'] },
  { id: 'AGS_SpartanB', n: '스파르탄 부머', f: 'AGS', t: 'H', r: 'ATK', g: 'B', c: 2, a: 3, h: 4, kw: [], death: [{ op: 'dmg', tgt: 'oppUnit', v: 2 }], text: '격파: 마주한 적 유닛에게 2 피해.' },
  { id: 'AGS_SpartanC', n: '스파르탄 어썰트', f: 'AGS', t: 'M', r: 'ATK', g: 'B', c: 1, a: 1, h: 2, kw: ['돌격'], death: [{ op: 'shield', tgt: 'adjAllies', v: 1 }], text: '격파: 양옆 아군에게 방어막 1.' },

  // ---------- 철충 (캠페인 적 전용) ----------
  { id: 'IW_NightChick', n: '나이트 칙', f: 'IW', t: 'L', r: 'ATK', g: 'B', c: 1, a: 2, h: 2, kw: [], enemy: true },
  { id: 'IW_Parasite', n: '메탈 패러사이트', f: 'IW', t: 'L', r: 'ATK', g: 'A', c: 2, a: 3, h: 2, kw: [], enemy: true, death: [{ op: 'dmg', tgt: 'enemyCmd', v: 2 }], text: '격파: 상대 라이프에 2 피해.' },
  { id: 'IW_Stalker', n: '스토커', f: 'IW', t: 'M', r: 'ATK', g: 'A', c: 3, a: 4, h: 4, kw: ['회피'], enemy: true },
  { id: 'IW_Speaker', n: '스피커', f: 'IW', t: 'M', r: 'SUP', g: 'A', c: 3, a: 1, h: 5, kw: [], enemy: true, deploy: [{ op: 'slow', tgt: 'oppUnit' }], text: '전개: 마주한 적 유닛 둔화.' },
  { id: 'IW_Kidnapper', n: '키드내퍼', f: 'IW', t: 'M', r: 'SUP', g: 'A', c: 3, a: 3, h: 4, kw: [], enemy: true, deploy: [{ op: 'debuff', tgt: 'oppUnit', a: 2 }], text: '전개: 마주한 적 유닛 공격력 -2.' },
  { id: 'IW_RocC', n: '침식된 로크', f: 'IW', t: 'M', r: 'ATK', g: 'S', c: 4, a: 5, h: 4, kw: ['돌격'], enemy: true },
  { id: 'IW_MetalGuard', n: '메탈 가드', f: 'IW', t: 'H', r: 'DEF', g: 'S', c: 4, a: 3, h: 8, kw: ['반격'], enemy: true },
  { id: 'IW_Robert', n: '로버트', f: 'IW', t: 'H', r: 'DEF', g: 'S', c: 5, a: 4, h: 9, kw: ['방어막:2'], enemy: true },
  { id: 'IW_IronPrince', n: '아이언 프린스', f: 'IW', t: 'H', r: 'ATK', g: 'SS', c: 7, a: 5, h: 9, kw: ['광역'], enemy: true },
  { id: 'IW_AzazelAlter', n: '타락한 아자젤', f: 'IW', t: 'L', r: 'ATK', g: 'SS', c: 7, a: 8, h: 6, kw: ['돌격', '관통'], enemy: true, deploy: [{ op: 'slow', tgt: 'allEnemyUnits' }], text: '전개: 모든 적 유닛 둔화.' },
  { id: 'IW_LemonadeZeta', n: '레모네이드 제타', f: 'IW', t: 'M', r: 'ATK', g: 'SS', c: 6, a: 7, h: 6, kw: ['돌격', '회피'], enemy: true },
  { id: 'IW_LemonadeOmega', n: '레모네이드 오메가', f: 'IW', t: 'H', r: 'SUP', g: 'SS', c: 8, a: 5, h: 12, kw: ['방어막:3', '재생:2'], enemy: true, deploy: [{ op: 'buffAll', a: 2, h: 2 }], text: '전개: 모든 아군 유닛 +2/+2.' },
];

// 토큰 (덱에 넣을 수 없음)
const TOKENS = [
  { id: 'TK_Spartan', art: 'AGS_SpartanA', n: '스파르탄 증원기', f: 'AGS', t: 'H', r: 'DEF', g: 'B', c: 0, a: 1, h: 4, kw: [], token: true },
  { id: 'TK_NightChick', art: 'IW_NightChick', n: '나이트 칙 유충', f: 'IW', t: 'L', r: 'ATK', g: 'B', c: 0, a: 1, h: 1, kw: [], enemy: true, token: true },
];

// 지원 카드 (스킬) — tgt에 pick* 이 있으면 플레이어가 대상을 선택
const SKILLS = [
  { id: 'SK_3P_Barrage', icon: 'MultiMissile', art: '3P_Labiata', n: '오르카호 함포 지원', f: '3P', g: 'S', c: 5, fx: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 3 }], text: '모든 적 유닛에게 3 피해.' },
  { id: 'SK_3P_Command', icon: 'TeamAtkBuff', art: '3P_ConstantiaS2', n: '작전 지휘', f: '3P', g: 'A', c: 6, fx: [{ op: 'buffAll', a: 1, h: 1 }], text: '모든 아군 유닛 +1/+1.' },
  { id: 'SK_3P_Supply', icon: 'ExpUp', art: '3P_Vanilla', n: '긴급 보급', f: '3P', g: 'B', c: 2, fx: [{ op: 'draw', v: 2 }], text: '카드 2장 드로우.' },
  { id: 'SK_PECS_Repair', icon: 'SelfDefBuff', art: 'PECS_LemonadeBeta', n: '긴급 수리', f: 'PECS', g: 'B', c: 2, fx: [{ op: 'heal', tgt: 'myCmd', v: 5 }], text: '내 라이프 5 회복.' },
  { id: 'SK_PECS_Blessing', icon: 'Particle', art: 'PECS_ElvenForestmaker', n: '엘븐 숲의 축복', f: 'PECS', g: 'A', c: 3, fx: [{ op: 'healAll', v: 3 }, { op: 'buffAll', a: 0, h: 1 }], text: '모든 아군 유닛 3 회복 및 체력 +1.' },
  { id: 'SK_PECS_Marketing', icon: 'Charm', art: 'PECS_Fortune', n: 'PECS 프로모션', f: 'PECS', g: 'A', c: 2, fx: [{ op: 'res', v: 2 }, { op: 'draw', v: 1 }], text: '이번 턴 AP +2, 카드 1장 드로우.' },
  { id: 'SK_BR_Strike', icon: 'Chargeshot', art: 'BR_Brunhild', n: '집중 포화', f: 'BR', g: 'A', c: 3, fx: [{ op: 'dmg', tgt: 'pickEnemyUnit', v: 5 }], text: '적 유닛 하나에게 5 피해.' },
  { id: 'SK_BR_Flame', icon: 'WideFireShot', art: 'BR_Efreeti', n: '이프리트의 화염', f: 'BR', g: 'A', c: 3, fx: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 2 }], text: '모든 적 유닛에게 2 피해.' },
  { id: 'SK_BR_Snipe', icon: 'Snipe', art: 'BR_NightAngel', n: '저격', f: 'BR', g: 'B', c: 2, fx: [{ op: 'dmg', tgt: 'pickAny', v: 3 }], text: '적 유닛 또는 상대 라이프에 3 피해.' },
  { id: 'SK_DS_Smoke', icon: 'Haze', art: 'DS_KunoichiEnrai', n: '연막탄', f: 'DS', g: 'A', c: 4, fx: [{ op: 'evade', tgt: 'allAllies' }], text: '모든 아군 유닛에게 회피 부여.' },
  { id: 'SK_DS_Assassinate', icon: 'SwordAttk', art: 'DS_KunoichiZero', n: '암살 지령', f: 'DS', g: 'S', c: 5, fx: [{ op: 'destroyLowest', v: 5 }], text: '체력 5 이하인 적 유닛 중 가장 약한 하나를 처치.' },
  { id: 'SK_DS_Shuriken', icon: 'SlowShot', art: 'DS_KunoichiShiden', n: '수리검 투척', f: 'DS', g: 'B', c: 2, fx: [{ op: 'dmg', tgt: 'pickEnemyUnit', v: 2 }, { op: 'slow', tgt: 'pickEnemyUnit' }], text: '적 유닛 하나에게 2 피해 및 둔화.' },
  { id: 'SK_AGS_Protocol', icon: 'Scan', art: 'AGS_MrAlfred2', n: 'AGS 수리 프로토콜', f: 'AGS', g: 'A', c: 3, fx: [{ op: 'healFull', tgt: 'pickAllyUnit' }, { op: 'shield', tgt: 'pickAllyUnit', v: 2 }], text: '아군 유닛 하나를 완전 회복하고 방어막 2.' },
  { id: 'SK_AGS_Barrier', icon: 'ShieldWall', art: 'AGS_Stronghold', n: '방어 결계', f: 'AGS', g: 'B', c: 2, fx: [{ op: 'shield', tgt: 'allAllies', v: 2 }], text: '모든 아군 유닛에게 방어막 2.' },
  { id: 'SK_3P_Formation', icon: 'TeamDefBuff', art: '3P_Merope', n: '진형 재편', f: '3P', g: 'B', c: 1, fx: [{ op: 'shield', tgt: 'allAllies', v: 1 }, { op: 'draw', v: 1 }], text: '모든 아군 유닛에게 방어막 1, 카드 1장 드로우.' },
  { id: 'SK_3P_Rally', icon: 'Command', art: '3P_Titania', n: '오르카 결전', f: '3P', g: 'S', c: 6, fx: [{ op: 'buffAll', a: 2, h: 0 }], text: '모든 아군 유닛 공격력 +2.' },
  { id: 'SK_PECS_Overtime', icon: 'Music', art: 'PECS_Muse', n: '특근 수당', f: 'PECS', g: 'B', c: 1, fx: [{ op: 'draw', v: 1 }, { op: 'res', v: 2 }], text: '카드 1장 드로우, 이번 턴 AP +2.' },
  { id: 'SK_PECS_Medic', icon: 'Wave', art: 'PECS_Hestia', n: '야전 의료', f: 'PECS', g: 'A', c: 2, fx: [{ op: 'healFull', tgt: 'pickAllyUnit' }, { op: 'heal', tgt: 'myCmd', v: 2 }], text: '아군 유닛 하나를 완전 회복하고, 내 라이프 2 회복.' },
  { id: 'SK_BR_Airstrike', icon: 'AirStrike', art: 'BR_Hraesvelgr', n: '공중 폭격', f: 'BR', g: 'S', c: 5, fx: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 2 }, { op: 'dmg', tgt: 'enemyCmd', v: 2 }], text: '모든 적 유닛과 상대 라이프에 2 피해.' },
  { id: 'SK_BR_Rush', icon: 'AssaultAttack', art: 'BR_HongRyun', n: '총공세', f: 'BR', g: 'A', c: 2, fx: [{ op: 'buffAll', a: 1, h: 0 }], text: '모든 아군 유닛 공격력 +1.' },
  { id: 'SK_DS_Mark', icon: 'EnemyDetect', art: 'DS_Ramiel', n: '표적 지정', f: 'DS', g: 'B', c: 1, fx: [{ op: 'slow', tgt: 'pickEnemyUnit' }, { op: 'debuff', tgt: 'pickEnemyUnit', a: 1 }], text: '적 유닛 하나를 둔화시키고 공격력 -1.' },
  { id: 'SK_DS_Ambush', icon: 'Shock', art: 'DS_Atalanta', n: '기습', f: 'DS', g: 'A', c: 3, fx: [{ op: 'dmg', tgt: 'randomEnemyUnit', v: 3 }, { op: 'dmg', tgt: 'randomEnemyUnit', v: 2 }], text: '무작위 적 유닛에게 3 피해, 다시 무작위 적 유닛에게 2 피해.' },
  { id: 'SK_AGS_Reinforce', icon: 'SetTurret', art: 'AGS_SpartanA', n: '긴급 증원', f: 'AGS', g: 'A', c: 3, fx: [{ op: 'summon', card: 'TK_Spartan' }], text: '비어 있는 모든 아군 레인에 스파르탄 증원기(1/3 중장 보호기)를 소환.' },
  { id: 'SK_AGS_EMP', icon: 'WideLightning', art: 'AGS_Arachne', n: 'EMP 충격파', f: 'AGS', g: 'B', c: 2, fx: [{ op: 'slow', tgt: 'allEnemyUnits' }], text: '모든 적 유닛 둔화.' },
  { id: 'SK_IW_Swarm', icon: 'Vortex', art: 'IW_NightChick', n: '철충 무리', f: 'IW', g: 'A', c: 3, enemy: true, fx: [{ op: 'summon', card: 'TK_NightChick' }], text: '비어 있는 모든 아군 레인에 나이트 칙 유충(1/1)을 소환.' },
  { id: 'SK_IW_Corrode', icon: 'Swamp', art: 'IW_Kidnapper', n: '부식', f: 'IW', g: 'B', c: 2, enemy: true, fx: [{ op: 'dmg', tgt: 'pickEnemyUnit', v: 2 }, { op: 'debuff', tgt: 'pickEnemyUnit', a: 1 }], text: '적 유닛 하나에게 2 피해, 공격력 -1.' },
  { id: 'SK_AGS_Overload', icon: 'SuiceideBomb', art: 'AGS_Seljuq', n: '과부하 자폭', f: 'AGS', g: 'S', c: 4, fx: [{ op: 'sacrificeBlast', tgt: 'pickAllyUnit' }], text: '아군 유닛 하나를 희생하고, 그 공격력만큼 모든 적 유닛에게 피해.' },
  // 외전 보상 카드
  { id: 'SK_3P_Redeploy', icon: 'Haze', art: '3P_Vanilla', n: '긴급 재배치', f: '3P', g: 'A', c: 2, fx: [{ op: 'shield', tgt: 'pickAllyUnit', v: 3 }, { op: 'evade', tgt: 'pickAllyUnit' }], text: '아군 유닛 하나에게 방어막 3과 회피 부여.' },
  { id: 'SK_AGS_Bulwark', icon: 'ShieldWall', art: 'AGS_Goltarion', n: '강철 장벽', f: 'AGS', g: 'S', c: 4, fx: [{ op: 'shield', tgt: 'allAllies', v: 3 }, { op: 'healAll', v: 2 }], text: '모든 아군 유닛에게 방어막 3, 체력 2 회복.' },
  { id: 'SK_DS_Flash', icon: 'SwordAttk', art: 'DS_Azazel', n: '그림자 일섬', f: 'DS', g: 'A', c: 3, fx: [{ op: 'dmg', tgt: 'pickEnemyUnit', v: 4 }], text: '적 유닛 하나에게 4 피해.' },
  { id: 'SK_PECS_Omega', icon: 'WideLightning', art: 'PECS_LemonadeAlpha', n: '오메가 프로토콜', f: 'PECS', g: 'SS', c: 6, fx: [{ op: 'dmg', tgt: 'allEnemyUnits', v: 2 }, { op: 'dmg', tgt: 'enemyCmd', v: 3 }], text: '모든 적 유닛에게 2 피해, 상대 라이프에 3 피해.' },
];

const CARDS = {};
UNITS.forEach(u => { u.kind = 'unit'; CARDS[u.id] = u; });
TOKENS.forEach(u => { u.kind = 'unit'; CARDS[u.id] = u; });
SKILLS.forEach(s => { s.kind = 'skill'; CARDS[s.id] = s; });
// 덱 편성에 쓸 수 있는 카드 (적 전용·토큰 제외)
const POOL = Object.values(CARDS).filter(c => !c.enemy && !c.token);
const ART_VER = 5; // 아트를 다시 빌드하면 올려서 브라우저 캐시를 갱신한다
function artOf(card) { return `assets/art/${card.art || card.id}.webp?v=${ART_VER}`; }
function iconOf(card) { return card.icon ? `assets/skill/${card.icon}.png` : null; }
function fullOf(card) { return `assets/full/${card.art || card.id}.webp?v=${ART_VER}`; }

// 프리셋 덱 (12장, 최대 3제작사)
const PRESET_DECKS = [
  { name: '오르카호 정예 (삼안+PECS)', desc: '밸런스형. 회복과 범위 피해로 장기전을 노린다.',
    cards: ['3P_Labiata', '3P_ConstantiaS2', '3P_Sowan', '3P_Alice', '3P_Daphne', '3P_CSPerrault', '3P_Ajax', '3P_Aqua', 'PECS_Triaina', 'PECS_BlindPrincess', '3P_Hachiko', 'SK_3P_Barrage'] },
  { name: '블랙리버 화력전 (BR+DS)', desc: '공격형. 돌격과 관통으로 빠르게 상대 라이프를 노린다.',
    cards: ['BR_Phoenix', 'BR_Io', 'BR_HongRyun', 'BR_NightAngel', 'BR_Cheona', 'BR_RedHood', 'BR_PoniesAnger', 'DS_Azazel', 'DS_Atalanta', 'DS_KunoichiShiden', 'SK_BR_Strike', 'SK_BR_Snipe'] },
  { name: 'AGS 철벽 (AGS+PECS)', desc: '방어형. 방어막과 보호기로 버티며 중장 공격기로 마무리.',
    cards: ['AGS_Goltarion', 'AGS_Stronghold', 'AGS_Rampart', 'AGS_RheinRitter', 'AGS_Arachne', 'AGS_Albatross', 'AGS_SpartanA', 'PECS_Empress', 'PECS_Sekhmet', 'PECS_LemonadeBeta', 'SK_AGS_Barrier', 'SK_AGS_Protocol'] },
  { name: '덴세츠 그림자 (DS+3P)', desc: '회피와 암살. 적 유닛을 제거하며 경장 공격기로 찌른다.',
    cards: ['DS_Saraqael', 'DS_Sarena', 'DS_BunnySlayer', 'DS_Ramiel', 'DS_Baekto', 'DS_Faucre', 'DS_KunoichiZero', 'DS_Angel', '3P_Hirume', '3P_Daphne', 'SK_DS_Smoke', 'SK_DS_Assassinate'] },
  { name: '월하 결전 (삼안+PECS)', desc: '히루메와 블랙 웜을 축으로 버티다가 후반에 몰아친다.',
    cards: ['3P_Ran', '3P_Daphne', 'PECS_Hestia', '3P_Hirume', '3P_BlackLilith', 'PECS_HighElven', 'PECS_LemonadeBeta', '3P_BlackWyrm', '3P_Alexandra', '3P_Ajax', 'SK_3P_Barrage', '3P_Aqua'] },
  { name: '블랙리버 기동대 (BR+AGS)', desc: '돌격 전투원과 AGS 보호기로 앞줄을 지키며 밀어붙인다.',
    cards: ['BR_PoniesAnger', 'BR_HongRyun', 'AGS_Albatross', 'AGS_Stronghold', 'BR_NightAngel', 'SK_AGS_Reinforce', 'BR_Phoenix', 'AGS_Goltarion', 'BR_Leona', 'SK_AGS_Overload', 'BR_May', 'AGS_SpartanB'] },
];

const RULES = {
  CMD_HP: 25,
  DECK_SIZE: 12,
  MAX_FACTIONS: 3,
  HAND_MAX: 7,
  START_HAND: 4,          // 시작 패 (선공·후공 모두 이 장수로 교체 단계를 시작한다)
  MULLIGAN_MAX: 3,        // 시작 패에서 교체할 수 있는 최대 장수
  MAX_AP: 10,             // AP 최대치 (매 턴 +1)
  START_AP: 1,           // 첫 턴 AP 최대치
  AP_CARRY: 2,           // 다음 턴으로 넘길 수 있는 남은 AP
  LANES: 3,
  TYPE_BONUS: 1,
  SECOND_EXTRA_CARDS: 1, // 후공 보정: 교체를 마친 뒤 추가로 뽑는 장수
  SECOND_AP_BONUS: 1,    // 후공 첫 턴 추가 AP
  SECOND_HP_BONUS: 3,    // 후공 라이프 보정 (작전 지시가 선공에게 더 유리해서 넣었다. 3 → 1 → 2 → 3으로 재조정)
  REPLACE: true,         // 교체 배치: 이번 턴에 낸 것이 아닌 내 전투원 위에 새 전투원을 내면 원래 전투원은 철수(묘지로, 격파 효과 없음)
  REPLACE_COST: 1,       // 교체 배치 추가 AP (남발해 판이 늘어지거나 약한 전투원을 공짜로 갈아 끼우지 않게)
  ATK_ROLE_PIERCE: 0,    // 공격기 역할이 기본으로 관통을 가짐
  DEF_ROLE_ARMOR: 1,     // 보호기 역할: 유닛 공격으로 받는 피해 감소량 (최소 1)
  ATK_ROLE_TYPE_BONUS: 0, // 공격기 역할: 상성 유리 시 추가 피해
  COMMAND: { cost: 4, dmg: 2 }, // 작전 지시(포격 지원): 턴당 1회, AP를 써서 적 유닛 또는 상대 라이프에 피해
  OVERTIME_ROUND: 14,    // 작전 시간 초과: 이 라운드부터 턴을 시작하는 쪽이 1, 2, 3… 피해 (0이면 끔)
};

// 작전 지시를 화면에서 카드처럼 다루기 위한 가짜 카드 (덱·도감에는 없다)
const COMMAND_CARD = { id: '__command', icon: 'AirStrike', art: '3P_Labiata', n: '포격 지원', kind: 'skill', f: '3P', g: 'S', c: RULES.COMMAND.cost,
  fx: [{ op: 'dmg', tgt: 'pickAny', v: RULES.COMMAND.dmg }], text: `작전 지시 — 턴당 1회. 적 유닛 또는 상대 라이프에 ${RULES.COMMAND.dmg} 피해.` };
