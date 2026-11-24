/* =====================================================================
 * model.js — 온실 토마토 생육 모델
 * ---------------------------------------------------------------------
 * 품종 기본값(varieties.js) + 유전자 효과(genes.js) + 온실 환경을 받아
 * 날마다의 상태를 계산해요.
 *
 * 모델 구조
 *   1. 적산온도로 발달 단계를 정해요 (기준 온도 10°C).
 *   2. 화방이 일정 적산온도마다 하나씩 생겨요.
 *   3. 각 화방은 개화 → 비대 → 변색 → 완숙 순서로 나이를 먹어요.
 *   4. 빛(DLI)과 CO2로 하루에 만들 수 있는 동화산물을 계산해요.
 *   5. 과실이 요구하는 양이 공급보다 많으면 과중이 줄어요 (source-sink).
 * ===================================================================== */

const MAXDAY = 180;          // 타임라인 길이 (일)
const TBASE = 10;            // 토마토 생육 기준 온도 (°C)
const clamp = (x,a,b) => Math.max(a, Math.min(b,x));

// 환경 기본값: 온도(°C), 일적산광량 DLI(mol/m²/일), CO2(ppm), 양액 EC(dS/m)
const ENV_DEFAULT = {T:21, DLI:18, CO2:800, EC:3.0};

// 켜진 유전자들의 효과를 모두 합쳐요.
function collectEffects(geno){
  const E = {
    habit:null, maxUnits:1, internode:1, leavesPerUnit:1,
    firstTrussGDD:1, trussGDD:1, fruitGDD:1,
    fruitsPerTruss:1, fruitWeight:1, shapeIdx:1, locules:1,
    brixAdd:0, darkShoulder:false, active:[],
  };
  for (const g of GENES){
    if (!geno[g.id]) continue;
    E.active.push(g);
    for (const [k,v] of Object.entries(g.effects||{})){
      if (k === 'habit') E.habit = v;
      else if (k === 'brixAdd') E.brixAdd += v;
      else if (k === 'darkShoulder') E.darkShoulder = E.darkShoulder || v;
      else if (typeof v === 'number' && k in E) E[k] *= v;
    }
  }
  return E;
}

function makeSim(variety, geno, env){
  const V = variety.base;
  const E = collectEffects(geno);
  const p = {variety, geno, E};

  // ── 발달 속도 ──
  p.dGDD = Math.max(0, Math.min(env.T, 30) - TBASE);     // 하루 적산온도
  p.habit = E.habit || V.habit;
  p.indet = p.habit === 'indeterminate';
  p.maxUnits = p.indet ? 40 : Math.max(2, Math.round(V.maxUnits * E.maxUnits));
  p.leavesPerUnit = V.leavesPerUnit * E.leavesPerUnit;
  p.firstTrussGDD = V.firstTrussGDD * E.firstTrussGDD;
  p.trussGDD = V.trussGDD * E.trussGDD;
  p.fruitGDD = V.fruitGDD * E.fruitGDD;

  // ── 환경 계수 ──
  // 착과: 저온(<13°C)과 고온(>28°C)에서 꽃가루가 제대로 기능하지 못해 착과가 떨어져요.
  let setT = 1;
  if (env.T > 28) setT -= (env.T - 28) * 0.13;
  if (env.T < 15) setT -= (15 - env.T) * 0.10;
  p.setT = clamp(setT, 0.15, 1);
  // 빛이 모자라면 화방이 유산(abortion)돼요.
  p.setL = clamp(0.45 + env.DLI / 24, 0.3, 1);
  p.setEC = clamp(1 - Math.max(0, env.EC - 3.5) * 0.04, 0.7, 1);
  p.fruitsPerTruss = V.fruitsPerTruss * E.fruitsPerTruss * p.setT * p.setL * p.setEC;

  // 동화산물 공급: 빛 × CO2 (포화 곡선) — 하루에 만들 수 있는 건물량의 대리값
  p.co2F = clamp(0.62 + 0.38 * (env.CO2 - 400) / 500, 0.6, 1.35);
  p.supply = env.DLI * 3.1 * p.co2F;    // g 건물/주/일 규모의 상대값

  // 과중: 잠재값 × EC(높으면 작아짐) × 온도(높으면 비대 기간이 짧아 작아짐)
  p.ecSize = clamp(1 - Math.max(0, env.EC - 2.5) * 0.045, 0.75, 1.05);
  p.tSize  = clamp(1 - Math.max(0, env.T - 21) * 0.022, 0.8, 1.08);
  p.fruitWeightPot = V.fruitWeight * E.fruitWeight * p.ecSize * p.tSize;

  p.shapeIdx = V.shapeIdx * E.shapeIdx;
  p.locules = Math.max(2, V.locules * E.locules);
  p.internode = V.internode * E.internode * clamp(1 + (env.T - 21) * 0.02 - (env.DLI - 18) * 0.008, 0.75, 1.3);
  p.darkShoulder = E.darkShoulder;

  // 당도: 기본 + 유전자 + EC(높을수록 농축) − 과실이 클수록 희석
  p.brix = V.brix + E.brixAdd + Math.max(0, env.EC - 2.5) * 0.35
           - Math.max(0, p.fruitWeightPot / V.fruitWeight - 1) * 0.5
           + (env.DLI - 18) * 0.03;

  // ── 날짜별 상태 ──
  // 화방 k(0부터)의 개화 적산온도
  p.trussGDDat = k => p.firstTrussGDD + k * p.trussGDD;

  p.state = function(g){
    // 지금까지 개화한 화방 수
    let nT = 0;
    while (nT < p.maxUnits && g >= p.trussGDDat(nT)) nT++;
    const terminated = !p.indet && nT >= p.maxUnits;

    // 줄기 마디 수 — 단단성은 마지막 화방에서 멈춰요.
    const unitsGrown = p.indet
      ? Math.max(0, (g - p.firstTrussGDD * 0.45) / p.trussGDD)
      : Math.min(p.maxUnits, Math.max(0, (g - p.firstTrussGDD * 0.45) / p.trussGDD));
    const nodes = 7 + unitsGrown * (p.leavesPerUnit + 1);
    const height = nodes * p.internode;
    const leaves = Math.max(2, Math.round(nodes * 0.8));

    // 화방별 상태
    const trusses = [];
    for (let k = 0; k < nT; k++){
      const age = g - p.trussGDDat(k);          // 개화 후 적산온도
      const f = clamp(age / p.fruitGDD, 0, 1);  // 0 개화 → 1 완숙
      let stage, ripe;
      if (f < 0.04){ stage = '개화'; ripe = 0; }
      else if (f < 0.62){ stage = '비대'; ripe = 0; }
      else if (f < 0.78){ stage = '변색기'; ripe = (f - 0.62) / 0.16 * 0.5; }
      else if (f < 1){ stage = '착색'; ripe = 0.5 + (f - 0.78) / 0.22 * 0.5; }
      else { stage = '완숙'; ripe = 1; }
      // 과실 부피: 개화 후 S자 곡선으로 커지고, 변색 이후에는 거의 멈춰요.
      const size = clamp(1 / (1 + Math.exp(-(f - 0.3) / 0.11)), 0, 1) * clamp(f / 0.62, 0, 1) ** 0.15;
      trusses.push({k, f, stage, ripe, size, n: Math.round(p.fruitsPerTruss)});
    }

    let phase;
    if (g < p.firstTrussGDD * 0.5) phase = '정식·활착기';
    else if (nT === 0) phase = '영양생장기';
    else if (trusses[0].f < 0.62) phase = '착과·비대기';
    else if (trusses[0].f < 1) phase = '착색기';
    else phase = '수확기';
    if (terminated && phase === '수확기') phase = '수확기 (줄기 생장 종료)';

    return {g, nT, trusses, height, nodes, leaves, phase, terminated, unitsGrown};
  };

  // ── 수량 ──
  const fin = p.state(MAXDAY * p.dGDD);
  p.harvested = fin.trusses.filter(t => t.f >= 1).length;
  p.totalTrusses = fin.nT;
  p.fruitsTotal = Math.round(p.fruitsPerTruss) * p.harvested;
  p.potential = p.fruitsTotal * p.fruitWeightPot / 1000;   // kg/주
  p.yield = p.potential; p.sinkLimited = false; p.fruitWeight = p.fruitWeightPot;
  p.finalHeight = fin.height;
  p.firstHarvestDay = p.dGDD > 0 ? (p.firstTrussGDD + p.fruitGDD) / p.dGDD : Infinity;

  // 타임라인용 시계열
  p.series = {h:[], y:[]};
  for (let d = 0; d <= MAXDAY; d++){
    const s = p.state(d * p.dGDD);
    p.series.h.push(s.height);
    p.series.y.push(s.trusses.filter(t => t.f >= 1).length * Math.round(p.fruitsPerTruss) * p.fruitWeightPot / 1000);
  }
  return p;
}

/* 동화산물(source) 한계
 * 잎이 만들 수 있는 탄수화물보다 많은 과실을 채울 수는 없어요.
 * 공급 능력 = 하루 공급량 × 수확까지의 기간 × 과실 분배율
 * 넘치면 과중이 줄고, 당도는 조금 올라가요(과실이 작아 농축).            */
function applySourceLimit(p, env){
  // 화방 하나가 자라는 동안(= 화방 간격 기간) 만들어지는 동화산물이
  // 그 화방을 채우는 데 쓰인다고 봐요.
  // 계수 0.0028은 광량이 넉넉한 온실(DLI 18 이상)에서 대과 품종이
  // 제 과중을 내고, 겨울철 저광량에서는 과중이 줄도록 맞춘 값이에요.
  const daysPerTruss = p.trussGDD / Math.max(0.5, p.dGDD);
  const cap = p.supply * daysPerTruss * p.harvested * 0.0028;   // kg/주
  p.sourceCap = cap;
  if (p.harvested > 0 && p.potential > cap){
    p.sinkLimited = true;
    p.yield = cap;
    const r = cap / p.potential;
    p.fruitWeight = p.fruitWeightPot * r;
    p.brix += (1 - r) * 0.6;
  }
}

// 과형 지수로 모양 이름을 붙여요.
function fruitShapeName(idx, locules){
  if (idx >= 1.45) return '장과형 (플럼·대추형)';
  if (idx >= 1.18) return '난형 (계란형)';
  if (idx >= 0.95) return '구형';
  if (locules >= 6) return '편구형 (비프스테이크형)';
  return '편구형 (납작한 형)';
}
