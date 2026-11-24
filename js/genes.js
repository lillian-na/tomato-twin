/* =====================================================================
 * genes.js — 카테고리와 유전자 데이터
 * ---------------------------------------------------------------------
 * ★ 가장 자주 고칠 파일이에요.
 *
 * ① 카테고리를 늘리려면 CATEGORIES에 항목을 추가하세요.
 *    {id:'quality2', name:'저장성', color:'#7a5ba8'} 처럼요.
 *    유전자가 하나도 없는 카테고리는 "준비 중"으로 표시돼요.
 *
 * ② 유전자를 늘리려면 GENES에 항목을 추가하세요.
 *    화면 카드, 계산, 마우스 설명이 모두 자동으로 따라옵니다.
 *
 * GENES 항목 설명
 *   id       유전자 이름 (고유). varieties.js의 alleles 키와 맞추면
 *            "이 품종은 무엇을 가졌는지"가 카드에 함께 표시돼요.
 *   cat      카테고리 id
 *   type     'ko'  = 기능 상실시키기 (녹아웃·변이 도입)
 *            'add' = 기능형 대립유전자 도입하기
 *   role     카드에 보이는 한 줄 설명
 *   ev       근거 수준: '실측' | '대리값' | '추정' | '방향만'
 *   mech     작동 원리
 *   data     논문에서 보고된 결과
 *   effects  모델에 주는 효과 (아래 키 목록 참고)
 *   notes    3D에서 마우스를 올렸을 때 부위별 설명
 *              stem | leaf | truss | fruit
 *   ref,url  출처
 *
 * effects 키 목록  (×는 곱셈 계수, 1이면 변화 없음)
 *   habit          'indeterminate' | 'determinate' 로 생육 습성을 덮어씀
 *   maxUnits       단단성일 때 멈추기 전 화방 수 ×
 *   internode      마디 길이 ×            leavesPerUnit  화방 사이 잎 수 ×
 *   firstTrussGDD  첫 화방까지 적산온도 ×  trussGDD       화방 간격 적산온도 ×
 *   fruitGDD       개화→완숙 적산온도 ×
 *   fruitsPerTruss 화방당 착과 수 ×       fruitWeight    과중 ×
 *   shapeIdx       과형 지수(세로/가로) ×  locules        심실 수 ×
 *   brixAdd        당도에 더할 값 (°Brix)
 *   darkShoulder   true면 미숙과 어깨가 진한 녹색이 됨
 * ===================================================================== */

const CATEGORIES = [
  {id:'biotic',  name:'병해충 저항성',           color:'#b3472b'},
  {id:'abiotic', name:'비생물적 스트레스 내성',  color:'#2f6f9f'},
  {id:'yield',   name:'수량 및 초형',            color:'#3b7d3a'},
  {id:'quality', name:'미질 및 영양 성분',       color:'#b08a1f'},
];

const GENES = [
  // ───────────────────── 수량 및 초형 ─────────────────────
  {
    id:'SP', cat:'yield', type:'add', ev:'실측',
    role:'생육 습성: 기능형 SP 도입 → 무한신장',
    mech:'SP는 꽃을 피우라는 신호(플로리겐)에 맞서는 안티플로리겐이에요. 기능형 SP가 있으면 줄기가 화방을 만든 뒤에도 옆눈에서 계속 자라 끝없이 올라가요(무한신장). 기능을 잃은 sp 품종은 화방이 연달아 생기다가 줄기가 멈춥니다(단단성).',
    data:'야생형 무한신장 식물은 화방과 화방 사이에 영양 마디가 3개 있고, 열성 sp 대립유전자를 가지면 단단성이 돼요. sp-classic 변이는 아미노산 하나가 바뀐 것(P76L)이에요. sp는 기계 수확에 알맞은 단단성과 작은 키를 함께 가져와 가공용 품종에 도입됐어요.',
    effects:{habit:'indeterminate', leavesPerUnit:1.5, internode:1.6},
    notes:{stem:'+SP: 줄기가 멈추지 않고 올라가고, 화방 사이 잎이 2장에서 3장으로 늘며 마디도 길어졌어요.',
           truss:'+SP: 화방이 계속 새로 생겨서 수확 기간이 길어져요.'},
    ref:'Pnueli et al. 1998, Development · Carvalho et al. (sp 다면발현)',
    url:'https://cob.silverchair.com/dev/article-pdf/3138135/develop_125_11_1979.pdf'
  },
  {
    id:'SP5G', cat:'yield', type:'ko', ev:'실측',
    role:'조기 수확 (일장 반응 억제 유전자)',
    mech:'SP5G는 낮이 길 때 꽃 피는 것을 늦추는 억제자예요. 이걸 없애면 일장에 상관없이 일찍 꽃이 피어 수확이 당겨집니다.',
    data:'토마토가 일장 반응을 잃고 일장 중립이 된 데에는 플로리겐 유사 억제자 SP5G가 관여했어요. CRISPR로 만든 sp5g 변이를 단단성(sp) 배경에 넣으면 아주 작고 조기 수확하는 "이중 단단성" 식물이 돼요.',
    effects:{firstTrussGDD:0.82, trussGDD:0.92},
    notes:{truss:'sp5g: 첫 화방이 일찍 생겨 수확이 당겨졌어요.'},
    ref:'Soyk et al. 2017, Nat Genet',
    url:'https://www.nature.com/articles/ng.3733.pdf'
  },
  {
    id:'FW22', cat:'yield', type:'add', ev:'실측',
    role:'과중: 야생형 FW2.2 도입 → 과실이 작아짐',
    mech:'FW2.2는 세포 분열을 억제해 과실이 커지지 않게 하는 유전자예요. 재배 토마토는 억제가 약해진 재배형을 가지고 있어서 과실이 커요. 야생형을 다시 넣으면 억제가 살아나 과실이 작아집니다.',
    data:'FW2.2는 세포 수 조절 단백질(CNR)을 만들며, 발현이 높아지면 세포 분열이 줄어요. fw2.2는 과중 변이의 최대 30%를 설명하는, 위치 클로닝으로 밝혀진 첫 QTL 유전자예요. 계수(×0.72)는 그 설명력에서 잡은 추정값이에요.',
    effects:{fruitWeight:0.72},
    notes:{fruit:'+FW2.2(야생형): 세포 분열 억제가 돌아와 과실이 작아졌어요 (×0.72, 추정)'},
    ref:'Frary et al. 2000 · Muños et al. 2011 (리뷰: van der Knaap 2014)',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4034497'
  },
  {
    id:'LC', cat:'yield', type:'ko', ev:'방향만',
    role:'심실 수: lc 변이 도입 → 칸이 늘고 과실이 커짐',
    mech:'LC는 분열조직의 줄기세포를 유지하는 WUSCHEL 계열 유전자예요. 조절이 풀리면 꽃의 분열조직이 커져서 과실 속 칸(심실)이 늘고, 과실도 커지면서 조금 납작해져요.',
    data:'LC는 분열조직 크기와 심실 수를 조절하며, WUSCHEL 하류의 SNP 두 개가 원인으로 보고됐어요. 심실 수 변이의 대부분은 lc와 fas 두 QTL이 설명하고, 이 둘은 상위적으로 상호작용해요. 구체적 수치는 추정이에요.',
    effects:{locules:1.7, fruitWeight:1.25, shapeIdx:0.93},
    notes:{fruit:'lc: 심실(칸)이 늘고 과실이 커졌어요 (추정)'},
    ref:'Muños et al. 2011 · Chu et al. (심실 수 리뷰)',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/3149950'
  },
  {
    id:'FAS', cat:'yield', type:'ko', ev:'방향만',
    role:'심실 수: fas 변이 도입 → 다심실·편평한 대과',
    mech:'FAS는 YABBY 계열 유전자로, 역시 분열조직 크기를 조절해요. 기능을 잃으면 심실이 크게 늘어 납작하고 주름진 대형 과실(비프스테이크형)이 됩니다.',
    data:'fas는 심실 수와 과실 크기, 납작한 과형을 조절해요. 진화 모델에서는 lc 변이가 먼저 생기고 그 뒤에 fas 변이가 나타나 극단적인 다심실 표현형을 만든 것으로 봅니다. 구체적 수치는 추정이에요.',
    effects:{locules:2.4, fruitWeight:1.5, shapeIdx:0.82},
    notes:{fruit:'fas: 심실이 크게 늘어 납작한 대과가 됐어요 (추정)'},
    ref:'Cong et al. 2008 · Muños et al. 2011',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/3149950'
  },
  {
    id:'SUN', cat:'yield', type:'ko', ev:'방향만',
    role:'과형: SUN 중복 도입 → 길쭉한 과실',
    mech:'SUN은 칼모듈린과 결합하는 IQ67 계열 단백질을 만들어요. 염색체 7번에 24.7 kb짜리 삽입(중복)이 생겨 SUN 발현이 높아지면 과실이 길쭉해집니다. 대추형·플럼형 토마토의 원인이에요.',
    data:'SUN은 발현이 높아지면 과실이 길어지는 양성 조절자예요. 24.7 kb 삽입이 길쭉한 과형과 연관돼 있어요. 길이 증가율은 추정이에요.',
    effects:{shapeIdx:1.6, fruitWeight:0.95},
    notes:{fruit:'SUN 중복: 과실이 길쭉해졌어요 (추정)'},
    ref:'Xiao et al. 2008 · van der Knaap et al. 2014',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4034497'
  },
  {
    id:'OVATE', cat:'yield', type:'ko', ev:'방향만',
    role:'과형: ovate 변이 → 서양배 모양',
    mech:'OVATE는 전사 억제자로 보이는 OFP 계열 단백질이에요. 발현이 높으면 식물과 기관이 짧아지고, 기능을 잃으면 과실이 아래쪽이 불룩한 타원형이나 서양배 모양이 돼요.',
    data:'OVATE는 발현이 높아지면 식물과 기관이 짧아지며, 전사 억제자로 추정돼요. ovate 변이를 가진 품종은 난형·타원형 과실을 만들어요. 수치는 추정이에요.',
    effects:{shapeIdx:1.35, internode:1.05},
    notes:{fruit:'ovate: 아래가 불룩한 서양배 모양이 됐어요 (추정)'},
    ref:'Liu et al. 2002 · van der Knaap et al. 2014',
    url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC4034497'
  },

  // ───────────────────── 미질 및 영양 성분 ─────────────────────
  {
    id:'GLK2', cat:'quality', type:'add', ev:'실측',
    role:'당도·착색: 기능형 GLK2 도입 → 어깨가 진한 녹색, 당도 ↑',
    mech:'GLK2는 과실의 엽록체 발달을 조절하는 전사인자예요. 기능형이면 미숙과의 어깨 쪽이 진한 녹색이 되고, 과실이 스스로 광합성을 해서 익었을 때 당분과 카로티노이드가 늘어요. 현대 품종 대부분은 수확 시기를 판단하기 쉽도록 기능을 잃은 u형(균일 착색)을 선택해 왔어요.',
    data:'u/u 형질은 SlGLK2의 기능 상실 변이 때문이고, u/u 토마토에 애기장대 GLK2를 발현시키자 미숙과가 고르게 진한 녹색이 됐으며 익은 뒤 당 함량이 40% 증가했어요. GLK 과발현은 과실 광합성 유전자 발현과 엽록체 발달을 높여 익은 과실의 탄수화물과 카로티노이드를 늘렸어요. 모델에는 당도 +1.4 °Brix로 보수적으로 반영했어요.',
    effects:{brixAdd:1.4, darkShoulder:true},
    notes:{fruit:'+GLK2: 어깨가 진한 녹색이고, 익으면 당도가 높아요 (논문: 당 +40%)'},
    ref:'Powell et al. 2012, Science · Nat Genet 2012 리서치 하이라이트',
    url:'https://www.nature.com/articles/ng.2380'
  },

  // ───────────────────── 병해충 · 비생물적 스트레스 ─────────────────────
  // 다음 단계에서 추가할 예정이에요.
  // 예: Mi-1.2(뿌리혹선충), Tm-2a(ToMV), Ty-1(황화잎말림), Sw-5(TSWV),
  //     내염성·저온 내성 유전자 등
];
