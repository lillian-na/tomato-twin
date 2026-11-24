/* =====================================================================
 * greenhouse3d.js — 장면 (Three.js)
 * ---------------------------------------------------------------------
 * 1 unit = 10 cm
 * 식물이 주인공이 되도록 배경은 꼭 필요한 것만 둬요.
 *   · 밝은 바닥 (멀어지면 흰색으로 사라져요)
 *   · 배지(흙) 트레이 + 점적 호스
 *   · 유인 끈과 유인 와이어
 *   · 높이 눈금자
 * 색이나 크기를 바꾸려면 아래 GH 값을 고치면 돼요.
 * 식물 자체는 plant3d.js가 그립니다.
 * ===================================================================== */

const GH = {
  bg:0xffffff,        // 멀리 사라지는 색 (배경과 같게)
  floor:0xf0efea,     // 바닥
  tray:0xe2e0d8,      // 배지 트레이(겉)
  soil:0x6d5a46,      // 배지(흙·코코피트)
  hose:0x4f555b,      // 점적 호스
  wire:0xa8aeb2,      // 유인 와이어
  string:0xd9d6cd,    // 유인 끈
  ruler:0xc2c7c0,     // 눈금자
  WIRE_Y:26,          // 유인 와이어 높이 (2.6 m)
};

const Scene3D = (function(){
  const view = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  view.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // 바닥 끝만 배경색으로 사라지게 해요.
  // 안개 범위는 카메라 거리에 맞춰 tickCamera()가 계속 다시 맞춥니다.
  scene.fog = new THREE.Fog(GH.bg, 55, 170);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 600);
  camera.position.set(1, 13, 32);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.minDistance = 5;
  controls.maxDistance = 200;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfd2cb, 0.95));
  const key = new THREE.DirectionalLight(0xfffaf2, 0.66);
  key.position.set(12, 30, 18); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf1ff, 0.26);
  fill.position.set(-14, 14, -8); scene.add(fill);

  const mats = {
    floor:  new THREE.MeshStandardMaterial({color:GH.floor, roughness:0.96}),
    tray:   new THREE.MeshStandardMaterial({color:GH.tray, roughness:0.85}),
    soil:   new THREE.MeshStandardMaterial({color:GH.soil, roughness:1}),
    hose:   new THREE.MeshStandardMaterial({color:GH.hose, roughness:0.6}),
    wire:   new THREE.MeshStandardMaterial({color:GH.wire, roughness:0.35, metalness:0.65}),
    string: new THREE.MeshStandardMaterial({color:GH.string, roughness:0.9}),
  };

  // ── 바닥 ──
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 60), mats.floor);
  floor.rotation.x = -Math.PI/2; scene.add(floor);

  // 포기 아래 부드러운 그림자 (바닥에 붙여 두는 원형 자국)
  const shadowTex = (function(){
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d').createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(90,95,88,0.38)'); g.addColorStop(1, 'rgba(90,95,88,0)');
    const ctx = c.getContext('2d'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t;
  })();

  // ── 유인 와이어 (식물 키에 따라 위로 올라가요) ──
  let WIRE_Y = GH.WIRE_Y;
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 46, 8), mats.wire);
  wire.rotation.z = Math.PI/2; wire.position.y = WIRE_Y; scene.add(wire);

  // ── 높이 눈금자 (최대 12 m까지 미리 만들어 두고 필요한 만큼만 보여 줘요) ──
  const RULER_MAX = 120;
  const ruler = new THREE.Group();
  const rmat = new THREE.LineBasicMaterial({color:GH.ruler});
  const rulerLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)]), rmat);
  ruler.add(rulerLine);
  const ticks = [];
  for (let m = 1; m * 10 <= RULER_MAX; m++){
    const y = m * 10, g = new THREE.Group();
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(-0.4, y, 0), new THREE.Vector3(0.4, y, 0)]), rmat));
    const lb = makeLabel(m + ' m', 22, '#8d938c', false);
    lb.position.set(-1.6, y, 0); lb.scale.multiplyScalar(0.75); g.add(lb);
    g.userData.y = y; ticks.push(g); ruler.add(g);
  }
  scene.add(ruler);

  // 식물 꼭대기에 맞춰 와이어·유인 끈·눈금자 높이를 맞춰요
  const strings = [];
  let canopyTop = 14;                       // 지금 포기의 꼭대기 높이 (위아래 이동 범위에 써요)
  function setCanopy(topY){
    canopyTop = topY;
    WIRE_Y = Math.max(14, Math.ceil((topY + 2.5) / 5) * 5);
    wire.position.y = WIRE_Y;
    const len = WIRE_Y - 1.3;
    strings.forEach(s => { s.scale.y = len; s.position.y = 1.3 + len/2; });
    rulerLine.scale.y = WIRE_Y;
    ticks.forEach(t => t.visible = t.userData.y <= WIRE_Y);
  }

  // ── 배지(흙) 트레이 — 식물마다 하나 ──
  function makeSlab(){
    const g = new THREE.Group();
    // 그림자
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(13, 8),
      new THREE.MeshBasicMaterial({map:shadowTex, transparent:true, depthWrite:false}));
    sh.rotation.x = -Math.PI/2; sh.position.y = 0.02; g.add(sh);
    // 트레이
    const tray = new THREE.Mesh(new THREE.BoxGeometry(7.0, 1.0, 2.8), mats.tray);
    tray.position.y = 0.5; g.add(tray);
    // 흙(배지) — 트레이 위에 살짝 솟아 있어요
    const soil = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.45, 2.4), mats.soil);
    soil.position.y = 1.08; g.add(soil);
    // 점적 호스
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 7.0, 6), mats.hose);
    hose.rotation.z = Math.PI/2; hose.position.set(0, 1.35, 0.85); g.add(hose);
    scene.add(g);
    return g;
  }

  // ── 유인 끈 (setCanopy가 길이를 맞춰 줘요) ──
  const STRING_GEO = new THREE.CylinderGeometry(0.06, 0.06, 1, 5);
  function makeString(){
    const s = new THREE.Mesh(STRING_GEO, mats.string);
    s.scale.y = WIRE_Y - 1.3; s.position.y = 1.3 + (WIRE_Y - 1.3) / 2;
    strings.push(s); scene.add(s);
    return s;
  }

  // ── 카메라 조작 ──
  //   휠          : 위아래로 이동 (키가 큰 포기의 위·아래를 훑어볼 때)
  //   Ctrl(⌘)+휠  : 확대 / 축소
  //   드래그       : 회전
  //   더블클릭     : 자동 맞춤으로 되돌리기
  let userMoved = false, wantY = 5, wantD = 26;
  let panY = null;                          // 휠로 지정한 목표 높이 (부드럽게 따라가요)
  controls.enableZoom = false;              // 기본 휠 확대를 끄고 직접 처리해요
  controls.addEventListener('start', () => { userMoved = true; });

  renderer.domElement.addEventListener('wheel', e => {
    e.preventDefault();
    userMoved = true;
    const dist = camera.position.distanceTo(controls.target);
    if (e.ctrlKey || e.metaKey){                       // 확대 / 축소
      // 목표 거리만 바꾸고, 실제 이동은 tickCamera가 부드럽게 해요
      wantD = clamp(wantD * Math.exp(e.deltaY * 0.0012),
                    controls.minDistance, controls.maxDistance);
    } else {                                           // 위아래 이동
      if (panY === null) panY = controls.target.y;
      const step = e.deltaY * 0.0016 * dist;           // 멀리서 볼수록 크게 움직여요
      panY = clamp(panY - step, 0, canopyTop);
    }
  }, {passive:false});

  // 더블클릭하면 자동 맞춤으로 돌아가요
  renderer.domElement.addEventListener('dblclick', () => { userMoved = false; panY = null; });

  function frameTo(drawH, spread){          // drawH: unit 단위로 그려진 높이
    if (!userMoved){
      panY = null;
      wantY = clamp(drawH * 0.44, 3, 48);
      wantD = clamp(Math.max(drawH * 1.32, (spread || 0) * 2.8) + 8, 16, 150);
    }
    ruler.position.x = -((spread || 0) + 4.2);
  }

  function tickCamera(){
    if (!userMoved){
      // 자동 맞춤
      const dy = (wantY - controls.target.y) * 0.06;
      controls.target.y += dy;
      camera.position.y += dy;
      wantD_apply(0.06);
    } else {
      // 휠로 지정한 목표를 향해 부드럽게 (프레임마다 조금씩)
      if (panY !== null){
        const dy = (panY - controls.target.y) * 0.16;
        if (Math.abs(dy) > 1e-4){ controls.target.y += dy; camera.position.y += dy; }
      }
      wantD_apply(0.16);
    }
    // 안개는 보고 있는 거리에 맞춰요 — 얼마나 축소해도 식물은 또렷하게 보여요
    const d = camera.position.distanceTo(controls.target);
    scene.fog.near = d * 1.15;
    scene.fog.far  = d * 3.4 + 40;
  }

  // 카메라 거리를 목표(wantD)로 조금씩 당겨요
  function wantD_apply(k){
    const dir = camera.position.clone().sub(controls.target);
    const cur = dir.length();
    const nd = cur + (wantD - cur) * k;
    if (Math.abs(nd - cur) > 1e-4){
      dir.setLength(nd);
      camera.position.copy(controls.target).add(dir);
    }
  }

  function resize(){
    const w = view.clientWidth, h = view.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {view, renderer, scene, camera, controls, resize,
          makeSlab, makeString, setCanopy, mats, frameTo, tickCamera, ruler,
          get WIRE_Y(){ return WIRE_Y; }};
})();

// 화면에 떠 있는 이름표
function makeLabel(text, size = 28, color = '#1f2a22', bg = true){
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  ctx.font = `600 ${size}px "Noto Sans KR",sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + 30; c.width = w; c.height = size + 22;
  ctx.font = `600 ${size}px "Noto Sans KR",sans-serif`;
  if (bg){
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    const r = 12, h = c.height;
    ctx.beginPath(); ctx.moveTo(r,0); ctx.arcTo(w,0,w,h,r); ctx.arcTo(w,h,0,h,r);
    ctx.arcTo(0,h,0,0,r); ctx.arcTo(0,0,w,0,r); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, 15, c.height/2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, depthTest:false}));
  sp.scale.set(w/55, c.height/55, 1); sp.renderOrder = 20;
  return sp;
}
