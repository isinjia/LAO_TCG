# 라스트오리진 택티컬 카드 게임

마비노기 듀얼의 핵심 구조(12장 순환 덱, 3레인 자동 전투)에 라스트오리진의 제작사·병종 상성·역할 체계를 입힌 웹 카드 게임입니다. 자원은 하스스톤식 AP(매 턴 자동 +1, 최대 10, 남은 AP 2까지 이월)이고, 전투 화면도 하스스톤 배치를 따릅니다. 빌드 과정 없이 브라우저에서 바로 실행됩니다.

## 실행

프로젝트 폴더의 `게임 실행.bat`을 더블클릭하면 서버가 켜지고 브라우저에서 게임이 열립니다. 서버 창을 닫으면 서버가 종료됩니다. 서버가 이미 켜져 있으면 게임만 엽니다. Python 3이 필요합니다.

직접 실행하려면 프로젝트 폴더에서 아래 명령을 쓴 뒤 http://localhost:8765 에 접속합니다. 이 서버는 캐시를 꺼 두어 수정한 파일이 바로 반영됩니다.

```bash
python tools/serve.py 8765
```

`file://`로 직접 열면 일부 브라우저에서 이미지·음악이 막힐 수 있으니 서버로 여는 것을 권장합니다.

## 게임 모드

| 모드 | 내용 |
|---|---|
| 스토리 | 오렌지에이드가 오르카호 카드 리그에서 최고의 카드 마스터를 목표로 도전하는 이야기. 첫 카드 수업(튜토리얼) + 리그 8대국(준결승은 같은 부대 상관인 레모네이드 알파, 결승은 챔피언 라비아타). 대사, 선배치 유닛, 별 3개 목표, 난이도 |
| 자유 대국 | 내 덱 vs 프리셋 덱, AI 난이도·선후공·배경 선택 |
| 덱 편성 | 덱 여러 개 저장(자동 저장), 비용 곡선, 필터·검색·정렬, 자동 채우기 |
| 카드 도감 | 전 카드 일러스트·상세 정보, 적 전용 카드 포함 보기 |
| 진행 보상 | 작전 첫 클리어 시 카드 해금(17장), 별 9·18·27개마다 철충 보스 부관 해금 |
| 이어하기 | 내 턴 시작마다 자동 저장. 새로고침·종료 후 로비에서 "전투 이어하기" |

## 전투 조작

- 손패 카드를 레인이나 대상으로 **끌어다 놓기**, 또는 **클릭 → 레인/대상 클릭**
- 카드·유닛에 마우스를 올리면 왼쪽에 큰 카드와 키워드 설명이 표시됩니다
- 내 턴에는 이번 전투의 **예상 피해**(빨강)와 다음 적 턴 **위협**(주황)이 표시되고, 턴 종료 버튼에 마우스를 올리면 **공격 경로 화살표**가 나옵니다
- 단축키: `Space` 턴 종료 · `Esc` 취소/닫기 · `1~7` 손패 선택 · `L` 전투 기록
- 대상이 필요 없는 지원 카드는 한 번 더 클릭하거나 전장 중앙의 사용 버튼을 누르면 사용됩니다
- 설정의 **전술 팁**을 켜 두면 매 턴 상황에 맞는 조언이 표시됩니다
- 오른쪽 위에서 전투 속도(x1~x3), 기록, 규칙, 설정, 항복

## 폴더 구조

```
index.html            진입점 (1920x1080 고정 스테이지를 화면에 맞춰 스케일)
css/style.css         전체 스타일
css/lo_skin.css       원작 UI 스킨 (원작 아틀라스 조각·글꼴로 겉모습을 덮어씀)
js/data.js            카드·제작사·키워드·프리셋 덱·규칙 상수
js/engine.js          규칙 엔진 (UI와 분리, 이벤트 기반, clone/forecast 지원)
js/ai.js              AI (쉬움/보통/어려움 — 어려움은 복제 상태 탐색)
js/campaign.js        캠페인 스테이지·대사·별 조건
js/store.js           localStorage 저장 (덱, 진행도, 전적, 설정)
js/audio.js           BGM 크로스페이드·효과음
js/ui_*.js            화면별 UI (공통/로비/덱/캠페인/전투)
js/tutorial.js        튜토리얼 코치
tools/test.js         자동 테스트 (node tools/test.js)
tools/sim.js          AI 대전 밸런스 시뮬레이터
tools/campaign_sim.js 캠페인 난이도 시뮬레이터
tools/uibot.js        브라우저용 UI 자동 플레이 봇 (실제 화면 입력으로 전투 진행)
tools/ui_test.js      헤드리스 Chrome UI 통합 테스트
tools/build_art.py    원작 일러스트 → 카드 초상/전신 이미지
tools/build_assets.py 원작 배경·BGM·효과음·스킬 아이콘 복사
tools/build_ui.py     원작 아틀라스에서 카드 테두리·버튼·팝업·역할 아이콘과 글꼴(고도체·Exo 2) 추출
tools/unity_render/   2D 모델 프리팹을 Unity 배치 모드로 렌더링 (기본 일러스트 복원)
DESIGN.md             게임 디자인 문서
```

## 개발 도구

```bash
node tools/test.js
```

```bash
node tools/ui_test.js
```

`tools/ui_test.js`는 설치된 Chrome/Edge를 헤드리스로 띄워 실제 화면에서 튜토리얼 완주·보상 해금, 재도전 경쟁 상태, 새로고침 후 이어하기, 덱 편성 잠금을 자동으로 검사합니다 (추가 설치 불필요).

```bash
node tools/sim.js 300 --verbose --cards
```

```bash
node tools/campaign_sim.js 40
```

`tools/sim.js`는 `--set=규칙=값`, `--eval=JS`, `--ai=hard --vs=normal` 옵션으로 규칙·카드 수치를 바꿔 가며 승률을 비교할 수 있습니다. 브라우저에서 `?dev`를 붙여 열면 시작 화면 클릭을 건너뜁니다. 콘솔에서 `tools/uibot.js`를 불러오면 `await uiBot(60000)`으로 실제 화면 입력을 사용해 전투를 끝까지 자동 진행합니다.

에셋은 원작 Unity 프로젝트(`E:\LAO\Google_QA`)에서 가져왔습니다. 다시 만들려면 아래 두 스크립트를 실행합니다 (Pillow, numpy 필요).

```bash
python tools/build_assets.py
```

```bash
python tools/build_art.py
```

화면 구성 조각(카드 등급 테두리, 노란 작전 버튼, 대화창·팝업 틀, 역할·등급 아이콘, 별)과 원작 글꼴은 원작 프로젝트(`E:\LAO_Google_QA`)의 아틀라스에서 이름으로 잘라 `assets/ui`, `assets/font`에 저장합니다.

```bash
python tools/build_ui.py
```

기본(N) 일러스트가 원본 폴더에 완성된 한 장으로 없고 로비 애니메이션용 2D 모델(스프라이트 + 스키닝 메시)로만 있는 카드는, 설치된 Unity로 그 모델을 직접 렌더링해 씁니다. 원본 프로젝트는 건드리지 않고, 필요한 프리팹과 의존 파일만 복사한 임시 프로젝트에서 배치 모드로 렌더링합니다. 결과는 `tools/unity_render/renders`에 저장되고 `build_art.py`가 최우선으로 사용합니다.

```bash
python tools/unity_render/prepare.py E:/LAO_WEB_GAME/_lao_render_tmp 3P_ConstantiaS2
```

```bash
"C:/Program Files/Unity/Hub/Editor/6000.0.58f2/Editor/Unity.exe" -batchmode -projectPath E:/LAO_WEB_GAME/_lao_render_tmp -executeMethod LaoRender.Run -list E:/LAO_WEB_GAME/_lao_render_tmp/list.txt -logFile E:/LAO_WEB_GAME/_lao_render_tmp/unity.log
```

## 참고

- 카드 능력치는 원작 데이터 테이블이 없어 게임 디자인용으로 새로 정한 값입니다.
- 철충 세력 카드명 일부는 원작 공식 표기와 다를 수 있습니다.
