/* =====================================================================
 * varieties.js — 품종 데이터
 * ---------------------------------------------------------------------
 * ★ 품종을 추가하려면 아래 VARIETIES 배열에 항목 하나만 더하면 됩니다.
 *   화면의 품종 선택 메뉴, 계산, 설명이 모두 자동으로 따라와요.
 *
 * 항목 설명
 *   id        고유 이름 (영문)
 *   name      화면에 보이는 이름
 *   type      품종 유형 (가공용/완숙 대과/대추방울 등)
 *   ev        근거 수준: '실측' | '추정' | '가상'
 *   note      한 줄 소개
 *   base      기준 형질값 (아래 설명 참고)
 *   alleles   이 품종이 가진 대립유전자 { 유전자id: '설명' }
 *             genes.js의 유전자 카드에 "이 품종은 무엇을 가졌는지"로 표시돼요.
 *   ref,url   출처
 *
 * base 키 목록
 *   habit         'determinate'(단단성) | 'indeterminate'(무한신장)
 *   maxUnits      단단성일 때 줄기가 멈추기 전까지 만드는 화방 수
 *   leavesPerUnit 화방과 화방 사이의 잎 수
 *   internode     마디 길이 (cm)
 *   firstTrussGDD 첫 화방 개화까지의 적산온도 (°C·일)
 *   trussGDD      화방 하나가 더 생기는 데 걸리는 적산온도
 *   fruitGDD      개화부터 완숙까지의 적산온도
 *   fruitsPerTruss 화방당 착과 수 (잠재값)
 *   fruitWeight   과중 (g)
 *   shapeIdx      과형 지수 = 세로/가로 (1이면 완전한 구형)
 *   locules       심실 수 (과실 속 칸 수)
 *   brix          당도 (°Brix)
 *
 * 적산온도를 모를 때:  적산온도 = 일수 × (평균기온 − 10)
 *   예) 평균 21°C에서 정식 후 첫 수확까지 60일 → 60 × 11 = 660
 * ===================================================================== */

const VARIETIES = [
  {
    id:'redkhan', name:'레드칸 (RED KHAN)', type:'완숙 대과 · 유럽계', ev:'추정',
    note:'국내 스마트팜에서 많이 기르는 유럽계 완숙 대과 품종이에요. 과육이 단단해 저장성이 좋고, 잎곰팡이병·점무늬병에 강해요. 샐러드·햄버거용으로 쓰여요.',
    base:{
      habit:'indeterminate', maxUnits:30, leavesPerUnit:3, internode:7.2,
      firstTrussGDD:300, trussGDD:90, fruitGDD:620,
      fruitsPerTruss:5, fruitWeight:205, shapeIdx:0.93, locules:5, brix:4.5,
    },
    alleles:{
      SP:   'SP 기능형 — 무한신장이에요 (줄내림 재배)',
      FW22: 'fw2.2 재배형 — 과실이 커지는 쪽이에요',
      LC:   'lc 변이형 (추정) — 심실이 여러 개예요',
      FAS:  'FAS 기능형 (추정)',
      SUN:  'SUN 비중복형 (추정) — 둥근 편이에요',
      OVATE:'OVATE 기능형 (추정)',
      GLK2: 'u (기능 상실, 추정) — 고르게 착색돼요',
    },
    ref:'경북 봉화군 스마트팜 사례(정식 60일 첫 수확) · 공영홈쇼핑 규격(180~230 g) · 미후코 품종소개(경도·내병성)',
    url:'https://www.kyongbuk.co.kr/news/articleView.html?idxno=4046530',
  },
  {
    id:'nonari', name:'노나리', type:'대추방울 · 남농종묘', ev:'추정',
    note:'남농종묘가 개발한 대추방울토마토예요. 긴 타원형이고 껍질이 두꺼워 육질이 단단하고 저장성이 좋아요. 달면서 산미가 강하고, 고온기에 강한 품종으로 알려져 있어요.',
    base:{
      habit:'indeterminate', maxUnits:30, leavesPerUnit:3, internode:6.6,
      firstTrussGDD:290, trussGDD:85, fruitGDD:560,
      fruitsPerTruss:16, fruitWeight:23.5, shapeIdx:1.55, locules:2, brix:8.0,
    },
    alleles:{
      SP:   'SP 기능형 — 무한신장이에요 (줄내림, 만장 3 m 이상)',
      FW22: 'FW2.2 야생형에 가까움 (추정) — 과실이 작아요',
      LC:   'LC 기능형 (추정) — 심실이 2개예요',
      FAS:  'FAS 기능형 (추정)',
      SUN:  'SUN 중복형 (추정) — 긴 타원형의 원인일 수 있어요',
      OVATE:'OVATE 기능형 (추정)',
      GLK2: 'u (기능 상실, 추정)',
    },
    ref:'농업인신문 신품종 소개(과중 22~25 g, 긴 타원형, 고온기 강함) · 농사로 현장기술지원(평택, 만장 3.2 m)',
    url:'https://www.nongupin.co.kr/news/articleView.html?idxno=93934',
  },
  {
    id:'heinz1706', name:'하인즈 1706 (Heinz 1706)', type:'가공용 · 레퍼런스 게놈', ev:'추정',
    note:'토마토 레퍼런스 게놈 품종이에요. 케첩·소스용으로 육종된 가공용 품종이라 단단성(determinate)이고, 포기가 작고 과실이 고르게 익어요.',
    base:{
      habit:'determinate', maxUnits:6, leavesPerUnit:2, internode:3.3,
      firstTrussGDD:330, trussGDD:95, fruitGDD:580,
      fruitsPerTruss:7, fruitWeight:60, shapeIdx:1.15, locules:2.5, brix:4.8,
    },
    alleles:{
      SP:   'sp (기능 상실) — 단단성의 원인이에요',
      FW22: 'fw2.2 재배형 — 과실이 커지는 쪽이에요',
      LC:   'LC 기능형 (추정) — 심실 수가 적어요',
      FAS:  'FAS 기능형 (추정) — 심실 수가 적어요',
      SUN:  'SUN 비중복형 (추정) — 길쭉하지 않아요',
      OVATE:'OVATE 기능형 (추정) — 둥근 편이에요',
      GLK2: 'u (기능 상실, 추정) — 가공용 품종에서 흔한 균일 착색형이에요',
    },
    ref:'Tomato Genome Consortium 2012 · Su et al. 2021, BMC Genomics',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8672587',
  },
];
