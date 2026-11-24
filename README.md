# 🍅 온실 토마토 디지털 트윈 · 유전자 설계 시뮬레이터

스마트팜 온실에서 토마토 품종을 고르고 유전자를 설계해 키워 보는 교육용 시뮬레이터예요.
생육 모델이 날마다 상태를 계산하고, 3D로 보여 주고, 줄기·잎·화방·과실에 마우스를 올리면 설명이 나옵니다.

## 실행하기

빌드 도구가 필요 없어요. `index.html`을 브라우저로 열면 바로 실행됩니다.
(Three.js를 CDN에서 불러오기 때문에 인터넷 연결이 필요해요.)

## 폴더 구조

```
tomato-twin/
├── index.html            화면 뼈대
├── css/style.css         디자인
├── js/varieties.js       ★ 품종 데이터
├── js/genes.js           ★ 카테고리 + 유전자 데이터
├── js/model.js           생육 모델 (계산식)
├── js/greenhouse3d.js    온실 장면 (구조물, 배경, 카메라)
├── js/plant3d.js         토마토 식물 3D
├── js/fruit2d.js         과실 모양·단면 그림
└── js/ui.js              버튼·표·그래프·툴팁
```

★ 표시된 두 파일만 고치면 품종과 유전자를 계속 늘릴 수 있어요.

---

## 1. 품종 추가하기 — `js/varieties.js`

`VARIETIES` 배열에 항목 하나를 더하면 품종 선택 메뉴에 자동으로 나타나요.

```js
{
  id:'momotaro', name:'모모타로', type:'완숙 대과', ev:'실측',
  note:'일본 완숙 토마토 품종이에요. (한 줄 소개)',
  base:{
    habit:'indeterminate',   // 'determinate' = 단단성
    maxUnits:30,             // 단단성일 때 멈추기 전 화방 수
    leavesPerUnit:3,         // 화방 사이 잎 수
    internode:7.0,           // 마디 길이 (cm)
    firstTrussGDD:310,       // 첫 화방까지 적산온도 (°C·일)
    trussGDD:92,             // 화방 하나가 더 생기는 적산온도
    fruitGDD:600,            // 개화 → 완숙 적산온도
    fruitsPerTruss:5,        // 화방당 착과 수
    fruitWeight:200,         // 과중 (g)
    shapeIdx:0.95,           // 과형 = 세로/가로 (1이면 구형)
    locules:5,               // 심실 수
    brix:5.0,                // 당도 (°Brix)
  },
  alleles:{ SP:'SP 기능형 — 무한신장이에요', /* ... */ },
  ref:'출처', url:'https://...',
}
```

`alleles`는 "이 품종이 어떤 대립유전자를 가졌는지"예요. 유전자 카드에 함께 표시돼서,
**이미 기능을 잃은 유전자는 녹아웃이 아니라 기능형 도입 카드로 만들어야 한다**는 걸 알려 줘요.
(예: 하인즈는 이미 `sp` 변이를 가지고 있어서, SP는 "기능형 도입" 카드예요.)

### 적산온도 값을 모를 때

품종 자료에 "정식 후 며칠"만 있다면 이렇게 바꿔 쓰면 돼요.

```
적산온도 = 일수 × (평균기온 − 10)
```
예: 평균 21°C에서 첫 수확까지 80일 → 80 × 11 = 880 = `firstTrussGDD + fruitGDD`

---

## 2. 카테고리 추가하기 — `js/genes.js`

`CATEGORIES`에 한 줄 더하면 돼요. 유전자가 없는 카테고리는 "준비 중"으로 표시됩니다.

```js
const CATEGORIES = [
  {id:'biotic',  name:'병해충 저항성',          color:'#b3472b'},
  {id:'abiotic', name:'비생물적 스트레스 내성', color:'#2f6f9f'},
  {id:'yield',   name:'수량 및 초형',           color:'#3b7d3a'},
  {id:'quality', name:'미질 및 영양 성분',      color:'#b08a1f'},
  {id:'storage', name:'저장성·수확 후 관리',    color:'#7a5ba8'},   // ← 새로 추가
];
```

## 3. 유전자 추가하기 — `js/genes.js`

`GENES` 배열에 항목을 더하면 카드·계산·설명이 모두 자동으로 따라와요.

```js
{
  id:'RIN', cat:'storage', type:'ko', ev:'실측',
  role:'숙성: rin 변이 → 저장 기간이 길어짐',
  mech:'작동 원리를 설명해요.',
  data:'논문에서 보고된 결과를 적어요.',
  effects:{fruitGDD:1.4},                    // 아래 키 목록 참고
  notes:{fruit:'rin: 숙성이 느려 오래 보관할 수 있어요'},
  ref:'저자 연도, 학술지', url:'https://...',
}
```

`effects`에 쓸 수 있는 키

| 키 | 뜻 |
|---|---|
| `habit` | `'indeterminate'` / `'determinate'` 로 생육 습성을 덮어씀 |
| `maxUnits`, `internode`, `leavesPerUnit` | 초형 관련 (×) |
| `firstTrussGDD`, `trussGDD`, `fruitGDD` | 발달 속도 (×, 작을수록 빠름) |
| `fruitsPerTruss`, `fruitWeight` | 수량 구성 요소 (×) |
| `shapeIdx`, `locules` | 과형과 심실 수 (×) |
| `brixAdd` | 당도에 더할 값 (°Brix) |
| `darkShoulder` | `true`면 미숙과 어깨가 진한 녹색 |

**새로운 종류의 효과**(예: 병 저항성, 내염성)를 넣으려면 `model.js`의
`collectEffects`에 키를 추가하고, 계산식에도 반영해야 해요. 그때는 환경 조절 항목
(예: 병원균 밀도, 염분 농도)도 `index.html`과 `ui.js`에 같이 추가하면 됩니다.

---

## 4. 기준 품종: 하인즈 1706

토마토 레퍼런스 게놈(SL4.0 / SLT1.0) 품종이에요. 케첩·소스용 가공 품종이라 단단성입니다.
형질값은 가공용 토마토의 일반적인 범위에서 잡은 추정값이고, 실측 자료를 구하면 `base`를 고쳐 쓰면 돼요.

| 형질 | 값 |
|---|---|
| 생육 습성 | 단단성 (sp 변이) |
| 초장 | 약 0.8 m |
| 화방 수 | 6개 |
| 화방당 착과 | 7개 |
| 과중 | 60 g |
| 심실 수 | 2~3개 |
| 당도 | 4.8 °Brix |

## 5. 모델이 계산하는 것

1. **적산온도** — 토마토 기준 온도 10°C. 하루 GDD = `min(기온,30) − 10`
2. **화방 발생** — 일정 적산온도마다 화방이 하나씩
3. **착과** — 온도(28°C 초과·15°C 미만에서 저하), 광량(DLI), EC
4. **과실 발달** — 개화 → 비대 → 변색 → 완숙
5. **동화산물 한계(source–sink)** — 공급 = `광량 × CO₂ 계수`. 과실 요구량이 넘으면 과중이 줄어요
6. **당도** — 기본값 + 유전자 + EC − 과실 크기에 따른 희석

## 6. GitHub Pages로 사이트 만들기

1. GitHub에서 새 저장소를 만들어요 (예: `tomato-twin`). **Public**으로 하세요.
2. 이 폴더 **안의 내용물**(index.html, README.md, css, js)을 올려요. 폴더째 올리면 주소가 꼬여요.
3. **Settings → Pages**에서 Source `Deploy from a branch`, Branch `main` / `(root)` 저장
4. 1~2분 뒤 `https://아이디.github.io/tomato-twin/` 에서 열려요.

## 진행 상황

- [x] 기준 품종: 하인즈 1706 + 품종 추가 구조
- [x] 수량 및 초형: SP, SP5G, FW2.2, LC, FAS, SUN, OVATE
- [x] 미질 및 영양: GLK2
- [ ] 병해충 저항성 (Mi-1.2, Tm-2a, Ty-1, Sw-5 등)
- [ ] 비생물적 스트레스 내성 (내염성, 저온 내성 등)
- [ ] 실제 온실 데이터로 모델 보정

## 주의

교육용 규칙 기반 모델이에요. 유전자 효과의 **방향**은 각 카드의 논문에 근거했지만,
계수와 온실 환경 반응식은 실제 포장 데이터로 보정한 값이 아닙니다. 유전자 조합은 단순 곱셈으로 가정했어요.
