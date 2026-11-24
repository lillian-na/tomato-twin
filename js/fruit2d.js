/* =====================================================================
 * fruit2d.js — 과실 모양·단면 비교 그림
 * ---------------------------------------------------------------------
 * 위: 측면 모양 (과형 지수 반영, 실제 비율)
 * 아래: 가로 단면 (심실 수와 씨앗)
 * ===================================================================== */

// 과중(g)으로 지름을 구해요. 토마토 밀도는 약 0.95 g/cm³.
function fruitSizeCm(sim){
  const V = Math.max(2, sim.fruitWeight) / 0.95;          // cm³
  const d = 2 * Math.cbrt(3 * V / (4 * Math.PI));          // 구일 때 지름
  return {w: d / Math.cbrt(sim.shapeIdx), h: d * Math.pow(sim.shapeIdx, 2/3)};
}

function drawFruits(canvas, A, B, labels){
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const c = canvas.getContext('2d'); c.scale(dpr, dpr);
  c.clearRect(0, 0, w, h);

  const items = [[A, labels[0], '#8a918c'], [B, labels[1], '#c2512f']];
  const maxW = Math.max(...items.map(i => fruitSizeCm(i[0]).w));
  const maxH = Math.max(...items.map(i => fruitSizeCm(i[0]).h));
  const rowH = (h - 26) / 2;
  const px = Math.min((w * 0.33) / Math.max(maxW, 1), (rowH - 18) / Math.max(maxH, 1), 26);

  // 1 cm 격자
  c.strokeStyle = '#efede6'; c.lineWidth = 1;
  for (let x = 0; x < w; x += px){ c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h - 14); c.stroke(); }
  for (let y = 0; y < h - 14; y += px){ c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.strokeStyle = '#d9d6cc';
  c.beginPath(); c.moveTo(0, rowH); c.lineTo(w, rowH); c.stroke();

  items.forEach(([sim, label, col], i) => {
    const cx = w * (i === 0 ? 0.27 : 0.73);
    const s = fruitSizeCm(sim);
    const rw = s.w * px / 2, rh = s.h * px / 2;

    // ── 측면 모양 ──
    const cy = rowH * 0.52;
    c.save(); c.translate(cx, cy);
    const grad = c.createRadialGradient(-rw*0.3, -rh*0.35, rw*0.1, 0, 0, rw*1.25);
    grad.addColorStop(0, '#e8604a'); grad.addColorStop(0.65, '#cf3a22'); grad.addColorStop(1, '#a62a16');
    c.fillStyle = grad; c.strokeStyle = '#8e2412'; c.lineWidth = 1.2;
    // 서양배형(shapeIdx 큼)은 아래가 불룩하게
    const pear = clamp((sim.shapeIdx - 1.2) * 1.2, 0, 0.5);
    c.beginPath();
    c.moveTo(0, -rh);
    c.bezierCurveTo(rw*(1.3 - pear*0.5), -rh*0.55, rw*1.18, rh*0.45, 0, rh);
    c.bezierCurveTo(-rw*1.18, rh*0.45, -rw*(1.3 - pear*0.5), -rh*0.55, 0, -rh);
    c.fill(); c.stroke();
    // 심실에 따른 세로 골
    const L = Math.round(sim.locules);
    if (L > 3){
      c.strokeStyle = 'rgba(120,30,16,0.35)'; c.lineWidth = 1;
      for (let k = -1; k <= 1; k++){
        const f = k * 0.42;
        c.beginPath(); c.moveTo(rw*f, -rh*0.82);
        c.quadraticCurveTo(rw*f*1.35, 0, rw*f, rh*0.82); c.stroke();
      }
    }
    // 꼭지
    c.fillStyle = '#4e7a33';
    for (let k = 0; k < 5; k++){
      const a = -Math.PI/2 + (k - 2) * 0.46;
      c.beginPath(); c.moveTo(0, -rh*0.92);
      c.lineTo(Math.cos(a) * rw * 0.62, -rh*0.92 + Math.sin(a) * rh * 0.3 + rh*0.16);
      c.lineTo(Math.cos(a + 0.2) * rw * 0.3, -rh*0.82); c.closePath(); c.fill();
    }
    c.restore();

    // ── 가로 단면 ──
    const cy2 = rowH + rowH * 0.5;
    c.save(); c.translate(cx, cy2);
    const r = rw;
    c.fillStyle = '#d4442c'; c.strokeStyle = '#8e2412'; c.lineWidth = 1.2;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI*2); c.fill(); c.stroke();
    c.fillStyle = '#f0ddc6';                       // 과육(격벽)
    c.beginPath(); c.arc(0, 0, r * 0.88, 0, Math.PI*2); c.fill();
    const n = clamp(Math.round(sim.locules), 2, 10);
    for (let k = 0; k < n; k++){
      const a0 = (k / n) * Math.PI * 2 - Math.PI/2, a1 = ((k + 0.86) / n) * Math.PI * 2 - Math.PI/2;
      c.fillStyle = '#b9d47a';                     // 젤리 부분(태좌)
      c.beginPath(); c.moveTo(0, 0);
      c.arc(0, 0, r * 0.74, a0, a1); c.closePath(); c.fill();
      // 씨앗
      c.fillStyle = '#efe3b4';
      const seeds = Math.max(2, Math.round(14 / n));
      for (let m = 0; m < seeds; m++){
        const a = a0 + (a1 - a0) * (0.2 + 0.6 * (m / Math.max(1, seeds - 1)));
        const rr = r * (0.34 + (m % 2) * 0.2);
        c.beginPath(); c.ellipse(Math.cos(a)*rr, Math.sin(a)*rr, r*0.07, r*0.05, a, 0, Math.PI*2); c.fill();
      }
    }
    c.fillStyle = '#e9d9bb';                       // 중심 축
    c.beginPath(); c.arc(0, 0, r * 0.14, 0, Math.PI*2); c.fill();
    c.restore();

    c.fillStyle = col; c.font = '600 12px "Noto Sans KR",sans-serif'; c.textAlign = 'center';
    c.fillText(label, cx, h - 3);
  });

  c.fillStyle = '#7b837d'; c.font = '10px "Noto Sans KR",sans-serif'; c.textAlign = 'left';
  c.fillText('측면', 6, 13);
  c.fillText('가로 단면', 6, rowH + 13);
  c.fillRect(w - 10 - px, 8, px, 2);
  c.textAlign = 'right'; c.fillText('1 cm', w - 8, 22);
}
