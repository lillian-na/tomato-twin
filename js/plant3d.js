/* =====================================================================
 * plant3d.js — 토마토 식물 3D 만들기
 * ---------------------------------------------------------------------
 * model.js가 계산한 상태(마디 수, 초장, 화방별 나이)를 받아
 * 줄기·겹잎·화방·과실을 그려요. 1 unit = 10 cm
 *
 * 온실 재배 관행도 반영했어요
 *   · 수확이 끝난 아래쪽 화방과 잎은 제거해요(적엽).
 *   · 키가 와이어보다 커지면 줄기를 내려 유인해요(내림). 아랫부분은
 *     잎이 없는 맨 줄기로 그려요.
 * ===================================================================== */

const DRAW_CAP = 24;          // 그릴 수 있는 최대 높이 (24 unit = 240 cm)
const C_STEM   = new THREE.Color(0x6f8f4a);
const C_LEAF   = new THREE.Color(0x4a7a32);
const C_LEAF_O = new THREE.Color(0x6d8b3e);
const C_PED    = new THREE.Color(0x6d9044);
const C_GREEN  = new THREE.Color(0x76a24b);
const C_BREAK  = new THREE.Color(0xe0a63a);
const C_RED    = new THREE.Color(0xc3341f);
const C_DARK   = new THREE.Color(0x3c6228);

const CALYX = new THREE.ConeGeometry(1, 1, 6); CALYX.__shared = true;
const SHOULDER = new THREE.SphereGeometry(1, 16, 7, 0, Math.PI*2, 0, Math.PI*0.42);
SHOULDER.__shared = true;
const _matCache = new Map();
function mat(color, opts){
  const k = color.getHexString() + (opts ? JSON.stringify(opts) : '');
  if (!_matCache.has(k)) _matCache.set(k, new THREE.MeshStandardMaterial(
    Object.assign({color:color.clone(), roughness:0.72, side:THREE.DoubleSide}, opts||{})));
  return _matCache.get(k);
}
function rng(seed){
  return function(){ seed|=0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed>>>15, 1|seed);
    t = t + Math.imul(t ^ t>>>7, 61|t) ^ t;
    return ((t ^ t>>>14) >>> 0) / 4294967296; };
}
function fruitColor(ripe){
  return ripe < 0.5 ? C_GREEN.clone().lerp(C_BREAK, ripe/0.5)
                    : C_BREAK.clone().lerp(C_RED, (ripe-0.5)/0.5);
}

// 심실 수에 따라 세로 골이 생기는 과실 모양
const _fruitGeos = new Map();
function fruitGeo(locules){
  const L = clamp(Math.round(locules), 2, 10);
  if (_fruitGeos.has(L)) return _fruitGeos.get(L);
  const g = new THREE.SphereGeometry(1, 18, 13);
  g.__shared = true;
  const p = g.attributes.position, amp = clamp((L - 2) * 0.014, 0, 0.055);
  for (let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const phi = Math.atan2(z, x);
    const s = 1 + amp * Math.cos(L * phi) * (1 - Math.abs(y) ** 2);
    p.setX(i, x * s); p.setZ(i, z * s);
  }
  g.computeVertexNormals();
  _fruitGeos.set(L, g);
  return g;
}

// 타원 잎조각 하나를 기존 버텍스 배열에 추가해요.
function addLeaflet(pos, idx, c, right, up, rx, ry){
  const base = pos.length / 3, SEG = 9;
  pos.push(c.x, c.y, c.z);
  for (let i = 0; i <= SEG; i++){
    const a = (i / SEG) * Math.PI * 2;
    const dx = Math.cos(a) * rx, dy = Math.sin(a) * ry * (Math.cos(a) > 0 ? 1 : 0.82);
    pos.push(c.x + right.x*dx + up.x*dy, c.y + right.y*dx + up.y*dy, c.z + right.z*dx + up.z*dy);
    if (i < SEG) idx.push(base, base + 1 + i, base + 2 + i);
  }
}

// 겹잎 하나 (중앙 잎줄기 + 잎조각들)를 하나의 geometry로
function compoundLeafGeo(origin, dir, len, droop, seedR){
  const pos = [], idx = [];
  const up = new THREE.Vector3(0,1,0);
  const side = new THREE.Vector3().crossVectors(dir, up).normalize();
  const nPair = 3;
  const path = [];
  for (let i = 0; i <= 10; i++){
    const t = i/10;
    path.push(origin.clone()
      .addScaledVector(dir, len * t)
      .addScaledVector(up, -droop * len * t * t));
  }
  // 잎줄기 (가는 띠)
  for (let i = 0; i < path.length - 1; i++){
    const a = path[i], b = path[i+1], w = 0.035;
    const base = pos.length/3;
    pos.push(a.x - side.x*w, a.y, a.z - side.z*w, a.x + side.x*w, a.y, a.z + side.z*w,
             b.x - side.x*w, b.y, b.z - side.z*w, b.x + side.x*w, b.y, b.z + side.z*w);
    idx.push(base, base+1, base+2, base+1, base+3, base+2);
  }
  // 좌우 잎조각 + 끝 잎조각
  for (let i = 1; i <= nPair; i++){
    const t = 0.22 + (i / (nPair + 0.6)) * 0.66;
    const p = path[Math.round(t * 10)];
    const tangent = path[Math.min(10, Math.round(t*10)+1)].clone().sub(p).normalize();
    const lsize = len * (0.3 - i * 0.03) * (0.85 + seedR() * 0.3);
    [1, -1].forEach(s => {
      const out = side.clone().multiplyScalar(s);
      const c = p.clone().addScaledVector(out, lsize * 0.95);
      const planeUp = tangent.clone().multiplyScalar(0.55)
        .add(new THREE.Vector3(0, -0.35, 0)).normalize();
      addLeaflet(pos, idx, c, out, planeUp, lsize, lsize * 0.62);
    });
  }
  const tip = path[10], tdir = tip.clone().sub(path[9]).normalize();
  const tsize = len * 0.26;
  addLeaflet(pos, idx, tip.clone().addScaledVector(tdir, tsize * 0.9),
    tdir, side.clone(), tsize, tsize * 0.7);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* sim: makeSim 결과, gdd: 적산온도, who: 'base' | 'design' */
function buildPlant(sim, gdd, seed, who){
  const grp = new THREE.Group();
  const R = rng(seed);
  const st = sim.state(gdd);
  grp.userData = {who, sim, st};

  const perUnit = Math.max(1, Math.round(sim.leavesPerUnit)) + 1;  // 잎 + 화방
  const inter = sim.internode / 10;                                 // unit 단위 마디 길이
  const totalH = st.height / 10;
  const drawH = Math.min(totalH, DRAW_CAP);
  const lowered = totalH > DRAW_CAP;
  grp.userData.lowered = lowered;

  // 그릴 마디 범위 — 키가 넘치면 위쪽만 보여요(아래는 내려 유인된 것)
  const nNodes = Math.max(1, Math.round(st.nodes));
  const firstNode = lowered ? Math.max(0, nNodes - Math.floor(DRAW_CAP / inter)) : 0;

  // 보이는 화방: 수확이 지난 지 오래된 건 제거(적엽·수확)
  const visTruss = st.trusses.filter(t => t.f < 1.3);
  const lowestVisUnit = visTruss.length ? visTruss[0].k : 0;

  // ── 줄기 경로 (화방마다 살짝 지그재그) ──
  const pts = [];
  for (let n = firstNode; n <= nNodes; n++){
    const y = (n - firstNode) * inter;
    const zig = Math.sin(n / perUnit * Math.PI * 2) * 0.13;
    pts.push(new THREE.Vector3(zig, y, Math.cos(n / perUnit * Math.PI) * 0.1));
  }
  if (pts.length < 2) pts.push(new THREE.Vector3(0, inter, 0));
  const curve = new THREE.CatmullRomCurve3(pts);
  const stem = new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(8, pts.length * 2), 0.09, 7, false),
    mat(C_STEM));
  stem.userData = {part:'stem', height:st.height, lowered};
  grp.add(stem);

  // 맨 아래 바닥까지 이어지는 짧은 밑동
  if (!lowered){
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 1.1, 7), mat(C_STEM));
    foot.position.y = -0.4; grp.add(foot);
  }

  const nodeAt = n => {
    const t = clamp((n - firstNode) / Math.max(1, (nNodes - firstNode)), 0, 1);
    return curve.getPoint(t);
  };

  // ── 잎 ──
  for (let n = firstNode + 1; n <= nNodes; n++){
    const unit = Math.floor(n / perUnit);
    if (n % perUnit === 0) continue;                 // 화방 자리
    if (unit < lowestVisUnit) continue;              // 적엽된 아래쪽
    const age = nNodes - n;
    const p0 = nodeAt(n);
    const ang = n * 2.3 + R() * 0.3;
    const dir = new THREE.Vector3(Math.cos(ang), 0.22, Math.sin(ang)).normalize();
    const grow = clamp((age + 1) / 3, 0.35, 1);
    const len = (2.6 + Math.min(age, 6) * 0.14) * grow;
    const col = C_LEAF.clone().lerp(C_LEAF_O, clamp(age / 16, 0, 0.75));
    const leaf = new THREE.Mesh(compoundLeafGeo(p0, dir, len, 0.42 + R()*0.1, R), mat(col));
    leaf.userData = {part:'leaf', node:n, age, len:len*10, young:age < 3};
    grp.add(leaf);
  }

  // ── 화방과 과실 ──
  visTruss.forEach(t => {
    const n = Math.min(nNodes, (t.k + 1) * perUnit);
    const p0 = nodeAt(n);
    const ang = t.k * 1.9 + 0.6;
    const out = new THREE.Vector3(Math.cos(ang) * 0.75, 0, Math.sin(ang) * 0.75 + 0.45).normalize();
    const nFruit = Math.max(1, t.n);
    const load = t.size * clamp(sim.fruitWeight / 90, 0.35, 1.5);
    const pLen = 1.1 + nFruit * 0.2;

    // 화방 줄기: 과실 무게로 아래로 휘어요
    const path = [];
    for (let i = 0; i <= 8; i++){
      const u = i/8;
      path.push(p0.clone()
        .addScaledVector(out, pLen * u)
        .add(new THREE.Vector3(0, -(0.25 + load * 1.5) * u * u, 0)));
    }
    const ped = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 10, 0.035, 5, false), mat(C_PED));
    ped.userData = {part:'truss', truss:t};
    grp.add(ped);

    // 과실: 과형 지수(세로/가로)와 심실 수를 반영
    const geo = fruitGeo(sim.locules);
    const fmat = mat(fruitColor(t.ripe));
    // 과중(g)에서 지름을 구해요. 밀도 0.95 g/cm³, 1 unit = 10 cm
    const dia = 2 * Math.cbrt(3 * (Math.max(3, sim.fruitWeight) / 0.95) / (4 * Math.PI)) / 10;
    const grow = Math.max(0.12, t.size);
    const rx = dia / 2 / Math.cbrt(sim.shapeIdx) * grow;
    const ry = dia / 2 * Math.pow(sim.shapeIdx, 2/3) * grow;
    for (let j = 0; j < nFruit; j++){
      const u = 0.28 + 0.72 * (j / Math.max(1, nFruit - 1));
      const fi = u * 8, i0 = Math.floor(fi);
      const base = path[i0].clone().lerp(path[Math.min(8, i0+1)], fi - i0);
      const side = new THREE.Vector3(-out.z, 0, out.x);
      base.addScaledVector(side, (j % 2 ? 1 : -1) * rx * 0.85 * (0.7 + R()*0.5));
      base.y -= ry * 0.85;
      const f = new THREE.Mesh(geo, fmat);
      f.scale.set(rx, ry, rx);
      f.position.copy(base);
      f.rotation.y = R() * 3;
      f.userData = {part:'fruit', truss:t, idx:j};
      grp.add(f);
      // 꽃받침(꼭지)
      const cal = new THREE.Mesh(CALYX, mat(C_PED));
      cal.scale.set(rx*0.5, ry*0.4, rx*0.5);
      cal.position.copy(base); cal.position.y += ry * 0.9;
      grp.add(cal);
      // GLK2 기능형: 미숙과 어깨가 진한 녹색
      if (sim.darkShoulder && t.ripe < 0.4){
        const sh = new THREE.Mesh(SHOULDER,
          mat(C_DARK.clone().lerp(fruitColor(t.ripe), t.ripe / 0.4)));
        sh.scale.set(rx * 1.015, ry * 1.015, rx * 1.015);
        sh.position.copy(base); sh.rotation.copy(f.rotation);
        sh.userData = {part:'fruit', truss:t, idx:j};
        grp.add(sh);
      }
    }
  });

  // ── 생장점 (줄기가 멈추지 않았을 때) ──
  if (!st.terminated){
    const top = nodeAt(nNodes);
    for (let i = 0; i < 3; i++){
      const a = i * 2.1;
      const d = new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a)).normalize();
      const tipLeaf = new THREE.Mesh(compoundLeafGeo(top, d, 0.9, 0.2, R), mat(C_LEAF));
      tipLeaf.userData = {part:'leaf', node:nNodes, age:0, len:9, young:true};
      grp.add(tipLeaf);
    }
  }

  return grp;
}

function disposeGroup(g){
  if (!g) return;
  Scene3D.scene.remove(g);
  g.traverse(o => { if (o.geometry && !o.geometry.__shared) o.geometry.dispose(); });
}
