/* =====================================================================
 * varieties.js — 품종 데이터
 * ---------------------------------------------------------------------
 * ★ 품종을 추가하려면 아래 VARIETIES 배열에 항목 하나만 더하면 됩니다.
 *   화면의 품종 선택 메뉴, 계산, 설명이 모두 자동으로 따라와요.
 *
 * 항목 설명
 *   id        고유 이름 (영문)
 *   name      화면에 보이는 이름
 *   type      품종 유형 (가공용/완숙용/방울 등)
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
 * ===================================================================== */

const VARIETIES = [
  {
    id:'heinz1706', name:'하인즈 1706 (Heinz 1706)', type:'가공용', ev:'추정',
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
  {
    id:'gh_beefsteak', name:'온실 대과종 (가상 예시)', type:'완숙 대과', ev:'가상',
    note:'실제 품종이 아니라, 품종을 추가하는 방법을 보여 주기 위한 예시예요. 네덜란드식 온실에서 기르는 무한신장 대과종을 가정했어요. 실제 품종 자료를 구하면 이 항목을 바꿔 쓰면 됩니다.',
    base:{
      habit:'indeterminate', maxUnits:30, leavesPerUnit:3, internode:7.5,
      firstTrussGDD:300, trussGDD:90, fruitGDD:620,
      fruitsPerTruss:5, fruitWeight:180, shapeIdx:0.88, locules:6, brix:4.2,
    },
    alleles:{
      SP:   'SP 기능형 — 무한신장이에요',
      FW22: 'fw2.2 재배형',
      LC:   'lc 변이형 — 심실이 많아요',
      FAS:  'fas 변이형 — 심실이 많아요',
      SUN:  'SUN 비중복형',
      OVATE:'OVATE 기능형',
      GLK2: 'GLK2 기능형 — 어깨가 진한 녹색이에요',
    },
    ref:'가상 예시 (출처 없음)',
    url:'',
  },
];
