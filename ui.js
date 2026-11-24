/* =====================================================================
 * ui.js — 화면 조작, 결과 표, 그래프, 설명, 마우스 설명, 애니메이션
 * ===================================================================== */

const $ = id => document.getElementById(id);
const geno = {}; GENES.forEach(g => geno[g.id] = false);
const env = Object.assign({}, ENV_DEFAULT);
let variety = VARIETIES[0];
let day = 0, playing = false, compare = true, simA, simB, dirty = true;
let plantA = null, plantB = null, labelA = null, labelB = null;
let slabA = null, slabB = null, strA = null, strB = null;

const activeGenes = () => GENES.filter(g => geno[g.id]);
const geneTag = g => g.type === 'ko' ? g.id.toLowerCase() + ' 변이' : '+' + g.id;
const DX = 4.6;

function recompute(){
  simA = makeSim(variety, {}, env);      applySourceLimit(simA, env);
  simB = makeSim(variety, geno, env);    applySourceLimit(simB, env);
  dirty = true;
  updatePanels();
}

// ───────────── 품종 선택 ─────────────
function buildVarietySelect(){
  const sel = $('variety');
  sel.innerHTML = VARIETIES.map(v =>
    `<option value="${v.id}">${v.name}${v.ev === '가상' ? ' · 가상' : ''}</option>`).join('');
  sel.onchange = () => {
    variety = VARIETIES.find(v => v.id === sel.value) || VARIETIES[0];
    GENES.forEach(g => geno[g.id] = false);
    document.querySelectorAll('.gene').forEach(d => d.classList.remove('on'));
    buildGeneCards();
    recompute();
  };
  updateVarietyNote();
}
function updateVarietyNote(){
  $('varietyNote').innerHTML = `${variety.note}` +
    (variety.url ? ` <a href="${variety.url}" target="_blank" rel="noopener">출처</a>` : '');
}

// ───────────── 유전자 카드 (카테고리별) ─────────────
function buildGeneCards(){
  const box = $('categories'); box.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const genes = GENES.filter(g => g.cat === cat.id);
    const sec = document.createElement('div'); sec.className = 'cat';
    sec.innerHTML = `<div class="cat-h" style="--c:${cat.color}"><span class="dot"></span>${cat.name}
      <small>${genes.length ? genes.length + '개' : '준비 중'}</small></div>`;
    const grid = document.createElement('div'); grid.className = 'genes';
    if (!genes.length) grid.innerHTML = '<div class="empty">다음 단계에서 추가할 예정이에요.</div>';
    genes.forEach(g => {
      const d = document.createElement('div');
      d.className = 'gene' + (geno[g.id] ? ' on' : '');
      d.style.setProperty('--c', cat.color);
      const own = variety.alleles && variety.alleles[g.id];
      d.innerHTML = `<div class="gn">${g.id}<i>${g.type === 'ko' ? '변이' : '도입'}</i></div>
        <div class="gr">${g.role}</div>
        ${own ? `<div class="ba">${variety.name.split(' ')[0]}: ${own}</div>` : ''}
        <div class="ev ev-${g.ev}">${g.ev}</div>`;
      d.onclick = () => { geno[g.id] = !geno[g.id]; d.classList.toggle('on', geno[g.id]); recompute(); };
      grid.appendChild(d);
    });
    sec.appendChild(grid); box.appendChild(sec);
  });
  updateVarietyNote();
}

// ───────────── 환경 조절 ─────────────
function bindControls(){
  const bind = (id, key, fmt) => {
    $(id).oninput = e => { env[key] = +e.target.value; $(id + 'V').textContent = fmt(env[key]); recompute(); };
    $(id + 'V').textContent = fmt(env[key]);
  };
  bind('temp', 'T',   v => v.toFixed(1) + ' °C');
  bind('dli',  'DLI', v => v.toFixed(0) + ' mol/m²·일');
  bind('co2',  'CO2', v => v.toFixed(0) + ' ppm');
  bind('ec',   'EC',  v => v.toFixed(1) + ' dS/m');
  $('compare').onchange = e => { compare = e.target.checked; dirty = true; };
  $('day').oninput = e => { day = +e.target.value; dirty = true; updateHud(); drawCharts(); };
  $('play').onclick = () => {
    if (!playing && day >= MAXDAY) day = 0;
    playing = !playing; $('play').textContent = playing ? '❚❚' : '▶';
  };
}

// ───────────── 결과 패널 ─────────────
const pct = (a, b) => {
  if (!b) return '';
  const v = (a / b - 1) * 100;
  if (Math.abs(v) < 0.5) return '<span>±0%</span>';
  return `<span class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v.toFixed(0)}%</span>`;
};
const fmtDay = d => isFinite(d) && d < 9999 ? Math.round(d) + '일' : '—';

function updatePanels(){
  const A = simA, B = simB;
  const habit = s => s.indet ? '무한신장' : `단단성 (화방 ${s.maxUnits}개)`;
  const rows = [
    ['생육 습성', habit(A), habit(B), ''],
    ['초장', (A.finalHeight/100).toFixed(2) + ' m', (B.finalHeight/100).toFixed(2) + ' m', pct(B.finalHeight, A.finalHeight)],
    ['총 화방 수', A.totalTrusses + ' 개', B.totalTrusses + ' 개', pct(B.totalTrusses, A.totalTrusses)],
    ['수확 화방 수', A.harvested + ' 개', B.harvested + ' 개', pct(B.harvested, A.harvested)],
    ['화방당 착과', A.fruitsPerTruss.toFixed(1) + ' 개', B.fruitsPerTruss.toFixed(1) + ' 개', pct(B.fruitsPerTruss, A.fruitsPerTruss)],
    ['과중', A.fruitWeight.toFixed(0) + ' g', B.fruitWeight.toFixed(0) + ' g', pct(B.fruitWeight, A.fruitWeight)],
    ['과형 (세로/가로)', A.shapeIdx.toFixed(2), B.shapeIdx.toFixed(2), ''],
    ['심실 수', A.locules.toFixed(1) + ' 개', B.locules.toFixed(1) + ' 개', ''],
    ['당도', A.brix.toFixed(1) + ' °Bx', B.brix.toFixed(1) + ' °Bx', pct(B.brix, A.brix)],
    ['첫 수확일', fmtDay(A.firstHarvestDay), fmtDay(B.firstHarvestDay), ''],
    ['<b style="color:var(--ink)">예상 수량 / 주</b>',
      '<b>' + A.yield.toFixed(2) + ' kg</b>',
      '<b>' + B.yield.toFixed(2) + ' kg</b>' + (B.sinkLimited ? ' ⚠' : ''),
      pct(B.yield, A.yield)],
  ];
  $('results').innerHTML =
    `<tr><th></th><th>${variety.name.split(' ')[0]} 기준</th><th style="color:var(--ko)">설계 계통</th><th></th></tr>` +
    rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td class="d">${r[3]}</td></tr>`).join('');

  // 타임라인 마커
  const mk = [];
  if (B.firstTrussGDD / B.dGDD <= MAXDAY) mk.push([B.firstTrussGDD / B.dGDD, '첫 개화']);
  if (B.firstHarvestDay <= MAXDAY) mk.push([B.firstHarvestDay, '첫 수확']);
  $('markers').innerHTML = mk.map(m =>
    `<span style="left:${clamp(m[0]/MAXDAY*100, 2, 97)}%">${m[1]}</span>`).join('');

  // 과실 패널
  drawFruits($('fruitCanvas'), A, B, [variety.name.split(' ')[0], '설계']);
  $('fruitInfo').innerHTML =
    `<div><b style="color:#8a918c">기준</b> ${fruitShapeName(A.shapeIdx, A.locules)} · 심실 ${A.locules.toFixed(1)}개 · ${A.fruitWeight.toFixed(0)} g</div>
     <div><b style="color:var(--ko)">설계</b> ${fruitShapeName(B.shapeIdx, B.locules)} · 심실 ${B.locules.toFixed(1)}개 · ${B.fruitWeight.toFixed(0)} g</div>`;

  // 해석
  const act = activeGenes();
  let html = '';
  if (!act.length) html = '<div class="note">위에서 유전자를 골라 보세요. 지금은 두 포기의 유전형이 같아서 똑같이 자랍니다.</div>';
  act.forEach(g => {
    const cat = CATEGORIES.find(c => c.id === g.cat);
    const own = variety.alleles && variety.alleles[g.id];
    html += `<div class="card" style="--c:${cat.color}"><b>${g.id}</b>
      <span class="tag">${geneTag(g)}</span> <span class="ev ev-${g.ev}">${g.ev}</span><br>${g.mech}
      ${own ? `<div class="m"><b>${variety.name.split(' ')[0]}가 가진 대립유전자:</b> ${own}</div>` : ''}
      <div class="m"><b>논문 결과:</b> ${g.data}</div>
      <div class="m"><b>모델 반영:</b> ${Object.entries(g.effects).map(([k, v]) =>
        typeof v === 'number' ? `${k} ×${v}` : `${k} = ${v}`).join(', ')}</div>
      <div class="m">출처: <a href="${g.url}" target="_blank" rel="noopener">${g.ref}</a></div></div>`;
  });

  const notes = [];
  if (B.sinkLimited) notes.push(`⚠ <b>동화산물 한계</b>: 과실이 요구하는 양이 잎이 만들 수 있는 탄수화물(${B.sourceCap.toFixed(2)} kg/주)보다 많아요. 그래서 과중이 ${B.fruitWeightPot.toFixed(0)} g에서 ${B.fruitWeight.toFixed(0)} g으로 줄었어요. 그릇(sink)을 키워도 채울 재료(source)가 모자라면 수량이 그만큼 늘지 않는 source–sink 원리예요. 광량이나 CO2를 올리면 한계가 풀립니다.`);
  if (env.T > 28) notes.push(`기온 ${env.T}°C: 고온에서 꽃가루 기능이 떨어져 착과율이 ${(B.setT*100).toFixed(0)}%로 낮아졌어요.`);
  if (env.T < 15) notes.push(`기온 ${env.T}°C: 저온이라 발달이 느리고 착과도 잘 안 돼요.`);
  if (env.DLI < 12) notes.push(`광량 ${env.DLI} mol/m²·일은 겨울철 수준이에요. 빛이 모자라면 화방이 유산되고 착과 수가 줄어요. 보광등을 켜는 상황을 보려면 광량을 올려 보세요.`);
  if (env.EC > 4.5) notes.push(`EC ${env.EC} dS/m는 높은 편이에요. 과실이 작아지는 대신 당도가 올라가요. 고당도 재배에서 쓰는 방법이지만 배꼽썩음병 위험도 커져요(이 모델에는 아직 없어요).`);
  if (B.indet && !A.indet) notes.push(`무한신장으로 바뀌어 줄기가 멈추지 않아요. 실제 온실에서는 줄기를 내려 유인(lowering)하면서 6개월 이상 수확해요. 3D에서는 위쪽 2.4 m만 보여 주고 아래쪽은 잎을 제거한 맨 줄기로 그렸어요.`);
  if (act.length) notes.push(`종합: 설계 계통의 예상 수량은 기준보다 <b>${pct(B.yield, A.yield).replace(/<[^>]+>/g, '')}</b>, 당도는 <b>${(B.brix - A.brix >= 0 ? '+' : '') + (B.brix - A.brix).toFixed(1)} °Bx</b>예요.`);
  html += notes.map(n => `<div class="note">${n}</div>`).join('');
  $('expl').innerHTML = html;

  updateHud(); drawCharts();
}

function updateHud(){
  const sB = simB.state(day * simB.dGDD), sA = simA.state(day * simA.dGDD);
  const ripe = sB.trusses.filter(t => t.f >= 1).length;
  $('hudDay').textContent = Math.floor(day) + '일차';
  $('hudStage').textContent = sB.phase;
  $('hudSub').innerHTML =
    `적산온도 ${(day * simB.dGDD).toFixed(0)} °C·일<br>` +
    `설계: 초장 ${(sB.height/100).toFixed(2)} m · 화방 ${sB.nT}개 · 수확 ${ripe}개` +
    (compare ? `<br><span style="color:#8a918c">기준: 초장 ${(sA.height/100).toFixed(2)} m · 화방 ${sA.nT}개</span>` : '');
}

function drawChart(cv, a, b, title, unit){
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const L = 38, R = 8, T = 20, B = 20, pw = w - L - R, ph = h - T - B;
  const ymax = Math.max(...a, ...b) * 1.12 || 1;
  c.font = '12px "Noto Sans KR",sans-serif'; c.fillStyle = '#1f2a22'; c.fillText(title, L, 13);
  c.strokeStyle = '#e8e6de'; c.fillStyle = '#7b837d'; c.font = '10px "Noto Sans KR",sans-serif'; c.lineWidth = 1;
  for (let i = 0; i <= 3; i++){
    const y = T + ph - ph * i / 3;
    c.beginPath(); c.moveTo(L, y); c.lineTo(L + pw, y); c.stroke();
    c.fillText((ymax * i / 3).toFixed(ymax < 10 ? 1 : 0), 4, y + 3);
  }
  for (let d = 0; d <= MAXDAY; d += 45) c.fillText(d + '일', L + pw * d / MAXDAY - 8, h - 5);
  const X = d => L + pw * d / MAXDAY, Y = v => T + ph - ph * v / ymax;
  const line = (arr, col, dash) => {
    c.beginPath(); c.setLineDash(dash); c.strokeStyle = col; c.lineWidth = 2;
    arr.forEach((v, d) => d ? c.lineTo(X(d), Y(v)) : c.moveTo(X(d), Y(v)));
    c.stroke(); c.setLineDash([]);
  };
  line(a, '#8a918c', [5, 4]); line(b, '#c2512f', []);
  c.strokeStyle = '#3b7d3a'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(X(day), T); c.lineTo(X(day), T + ph); c.stroke();
  c.fillStyle = '#7b837d'; c.textAlign = 'right'; c.fillText(unit, L + pw, T + 10); c.textAlign = 'left';
}
function drawCharts(){
  drawChart($('chH'), simA.series.h, simB.series.h, '초장', 'cm');
  drawChart($('chY'), simA.series.y, simB.series.y, '누적 수량', 'kg/주');
}

// ───────────── 3D 다시 그리기 ─────────────
function rebuild(){
  const S = Scene3D.scene;
  disposeGroup(plantA); disposeGroup(plantB); plantA = plantB = null;
  [labelA, labelB].forEach(l => { if (l){ S.remove(l); l.material.map.dispose(); } });
  labelA = labelB = null;
  if (!slabA){ slabA = Scene3D.makeSlab(); slabB = Scene3D.makeSlab();
               strA = Scene3D.makeString(); strB = Scene3D.makeString(); }

  const dx = compare ? DX : 0;
  plantB = buildPlant(simB, day * simB.dGDD, 7, 'design');
  plantB.position.set(dx, 1.0, 0); S.add(plantB);
  slabB.position.set(dx, 0, 0); strB.position.set(dx + 0.45, Scene3D.WIRE_Y/2, 0);
  const act = activeGenes();
  labelB = makeLabel(act.length ? '설계: ' + act.map(geneTag).join(' · ') : '설계 계통 (변화 없음)',
    28, act.length ? '#c2512f' : '#555');
  labelB.position.set(dx, -1.4, 2.6); S.add(labelB);

  slabA.visible = strA.visible = compare;
  if (compare){
    plantA = buildPlant(simA, day * simA.dGDD, 7, 'base');
    plantA.position.set(-dx, 1.0, 0); S.add(plantA);
    slabA.position.set(-dx, 0, 0); strA.position.set(-dx + 0.45, Scene3D.WIRE_Y/2, 0);
    labelA = makeLabel(variety.name.split(' ')[0] + ' (기준)', 28, '#555');
    labelA.position.set(-dx, -1.4, 2.6); S.add(labelA);
  }
  // 카메라를 식물 키에 맞춰요
  const drawH = Math.min(DRAW_CAP, Math.max(
    simB.state(day * simB.dGDD).height / 10,
    compare ? simA.state(day * simA.dGDD).height / 10 : 0));
  Scene3D.frameTo(drawH, compare ? DX : 0);
  dirty = false;
}

// ───────────── 마우스 설명 ─────────────
const tip = $('tip'), ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
let pointer = null, hovered = null, hoverOrig = null;
Scene3D.renderer.domElement.addEventListener('pointermove', e => {
  const r = Scene3D.renderer.domElement.getBoundingClientRect();
  pointer = {x:e.clientX - r.left, y:e.clientY - r.top, w:r.width, h:r.height, drag:e.buttons > 0};
  pick();
});
Scene3D.renderer.domElement.addEventListener('pointerleave', () => { pointer = null; clearHover(); });

function clearHover(){
  if (hovered && hoverOrig){ hovered.material = hoverOrig; }
  hovered = null; hoverOrig = null; tip.style.display = 'none';
}
function pick(){
  if (!pointer || pointer.drag){ clearHover(); return; }
  mouse.set(pointer.x / pointer.w * 2 - 1, -(pointer.y / pointer.h) * 2 + 1);
  ray.setFromCamera(mouse, Scene3D.camera);
  const hit = ray.intersectObjects([plantB, plantA].filter(Boolean), true)
    .find(h => h.object.userData && h.object.userData.part);
  if (!hit){ clearHover(); return; }
  const obj = hit.object;
  if (obj !== hovered){
    clearHover(); hovered = obj; hoverOrig = obj.material;
    const m = obj.material.clone(); m.emissive = new THREE.Color(0x6b4a10); obj.material = m;
  }
  let grp = obj; while (grp && !grp.userData.who) grp = grp.parent;
  if (!grp){ clearHover(); return; }
  tip.innerHTML = describe(obj.userData, grp.userData);
  tip.style.display = 'block';
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = pointer.x + 16, y = pointer.y + 14;
  if (x + tw > pointer.w - 8) x = pointer.x - tw - 16;
  if (y + th > pointer.h - 8) y = pointer.h - th - 8;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}

function describe(u, G){
  const {who, sim, st} = G, isB = who === 'design';
  const act = isB ? sim.E.active : [];
  const whoTxt = isB ? (act.length ? '설계 계통 (' + act.map(geneTag).join(' · ') + ')' : '설계 계통')
                     : variety.name.split(' ')[0] + ' (기준)';
  const gnotes = key => act.map(g => g.notes && g.notes[key]).filter(Boolean);
  const P = v => Math.round(v * 100) + '%';
  let title = '', body = '', gn = [];

  if (u.part === 'stem'){
    title = '줄기';
    body = `초장 ${(u.height/100).toFixed(2)} m · 마디 ${Math.round(st.nodes)}개<br>`;
    body += sim.indet
      ? '무한신장이라 끝눈이 화방이 된 뒤에도 바로 아래 곁눈이 줄기를 이어받아 계속 올라가요(가축분지, sympodial).'
      : `단단성이에요. 화방이 ${sim.maxUnits}개쯤 생기면 줄기 끝이 화방으로 끝나면서 생장이 멈춰요.`;
    if (u.lowered) body += '<br>와이어보다 키가 커져서 줄기를 내려 유인했어요. 아래쪽은 잎을 제거한 맨 줄기예요.';
    if (st.terminated) body += '<br>지금은 줄기 끝이 화방으로 끝나 더 자라지 않아요.';
    gn = gnotes('stem');
  }
  else if (u.part === 'leaf'){
    title = '잎 (겹잎)';
    body = `길이 ${u.len.toFixed(0)} cm<br>`;
    body += u.young ? '새로 나오는 어린 잎이에요. 아직 광합성보다 자라는 데 더 많이 써요.'
      : u.age < 8 ? '한창 광합성하는 잎이에요. 바로 위아래 화방으로 탄수화물을 보내요.'
      : '아래쪽 오래된 잎이에요. 그늘이 져서 광합성이 줄고, 온실에서는 이런 잎부터 제거해요(적엽).';
    body += `<br>토마토 잎은 작은 잎조각 여러 장이 모인 겹잎이에요.`;
    gn = gnotes('leaf');
  }
  else if (u.part === 'truss'){
    const t = u.truss;
    title = `${t.k + 1}번째 화방`;
    body = `단계: ${t.stage} · 착과 ${t.n}개 · 발달 ${P(t.f)}<br>`;
    body += t.f < 0.04 ? '막 꽃이 핀 상태예요. 이때 온도가 너무 높거나 낮으면 꽃가루가 제대로 기능하지 못해 착과가 떨어져요.'
      : t.f < 0.62 ? '과실이 빠르게 커지는 비대기예요. 이 시기에 잎이 보내 주는 탄수화물의 양이 과중을 좌우해요.'
      : t.f < 1 ? '색이 변하는 중이에요. 이 단계부터는 크기가 거의 늘지 않고 당분과 색소가 쌓여요.'
      : '다 익어서 수확할 수 있어요.';
    gn = gnotes('truss');
    if (isB && sim.sinkLimited) gn.push(`⚠ 동화산물이 모자라 과중이 ${sim.fruitWeight.toFixed(0)} g로 줄었어요`);
  }
  else if (u.part === 'fruit'){
    const t = u.truss, s = fruitSizeCm(sim);
    title = '과실';
    body = `${t.stage} · 발달 ${P(t.f)}<br>` +
      `완숙 크기 ${s.w.toFixed(1)} × ${s.h.toFixed(1)} cm · ${sim.fruitWeight.toFixed(0)} g · 심실 ${sim.locules.toFixed(1)}개<br>` +
      `당도 ${sim.brix.toFixed(1)} °Bx · ${fruitShapeName(sim.shapeIdx, sim.locules)}`;
    gn = gnotes('fruit');
    if (isB && sim.darkShoulder && t.ripe < 0.35) gn.push('어깨가 진한 녹색이에요. 과실이 스스로 광합성을 해요.');
  }
  return `<div class="t">${title}</div><div class="w">${whoTxt} · ${Math.floor(day)}일차 · ${st.phase}</div>` +
    `<div>${body}</div>` + (gn.length ? `<div class="g">${gn.join('<br>')}</div>` : '');
}

// ───────────── 화면 너비 조절 ─────────────
(function(){
  const rz = $('resizer'), side = document.querySelector('.side');
  if (!rz) return;
  const MIN = 300, MAXR = 0.68;      // 패널 최소 폭 / 전체의 최대 비율
  let dragging = false;

  const apply = w => {
    side.style.width = w + 'px';
    Scene3D.resize(); drawCharts();
    drawFruits($('fruitCanvas'), simA, simB, [variety.name.split(' ')[0], '설계']);
  };
  rz.addEventListener('pointerdown', e => {
    dragging = true; rz.setPointerCapture(e.pointerId);
    rz.classList.add('on'); document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  rz.addEventListener('pointermove', e => {
    if (!dragging) return;
    const w = clamp(window.innerWidth - e.clientX, MIN, window.innerWidth * MAXR);
    apply(w);
  });
  const stop = e => {
    if (!dragging) return;
    dragging = false; rz.classList.remove('on'); document.body.style.cursor = '';
    try { rz.releasePointerCapture(e.pointerId); } catch(_){}
    localStorage.setItem('tt-side-w', side.offsetWidth);
  };
  rz.addEventListener('pointerup', stop);
  rz.addEventListener('pointercancel', stop);
  // 더블클릭하면 기본 너비로
  rz.addEventListener('dblclick', () => { side.style.width = ''; Scene3D.resize(); drawCharts(); });
  // 지난번에 조절한 너비를 기억해요
  const saved = +localStorage.getItem('tt-side-w');
  if (saved >= MIN && saved <= window.innerWidth * MAXR) side.style.width = saved + 'px';
})();

// ───────────── 시작 ─────────────
buildVarietySelect(); buildGeneCards(); bindControls(); recompute(); Scene3D.resize();
day = 110; $('day').value = day; updateHud(); drawCharts(); dirty = true;
window.addEventListener('resize', () => {
  drawCharts(); drawFruits($('fruitCanvas'), simA, simB, [variety.name.split(' ')[0], '설계']);
});

let last = performance.now();
function loop(t){
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (playing){
    day = Math.min(MAXDAY, day + dt * 11); $('day').value = day;
    if (day >= MAXDAY){ playing = false; $('play').textContent = '▶'; }
    dirty = true; updateHud(); drawCharts();
  }
  if (dirty){ clearHover(); rebuild(); if (pointer) pick(); }
  Scene3D.tickCamera();
  Scene3D.controls.update();
  Scene3D.renderer.render(Scene3D.scene, Scene3D.camera);
}
requestAnimationFrame(loop);
