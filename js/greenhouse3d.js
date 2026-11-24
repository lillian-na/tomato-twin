/* =====================================================================
 * greenhouse3d.js — 스마트팜 온실 장면 (Three.js)
 * ---------------------------------------------------------------------
 * 1 unit = 10 cm
 * 온실 구조물(지붕, 기둥, 유인 와이어, 난방 배관, 배지, LED 조명)과
 * 뒤쪽 재배 줄을 그려요. 식물 자체는 plant3d.js가 그립니다.
 * 색이나 구조를 바꾸려면 아래 GH 설정값을 고치면 돼요.
 * ===================================================================== */

const GH = {
  floor:0xe8e9e4,      // 바닥 방초 시트(흰색 비닐)
  slab:0xd8d2c4,       // 배지(암면 슬라브)
  pipe:0xb9bcc0,       // 난방 배관
  frame:0xcfd4d8,      // 구조 프레임
  glass:0xdceaf2,      // 유리 지붕
  wire:0x8d9499,       // 유인 와이어
  string:0xdedbd2,     // 유인 끈
  lampBody:0x5a6066,   // 조명 몸체
  lampGlow:0xffd9a8,   // 조명 빛
  bgPlant:0x5d7c41,    // 뒤쪽 줄 식물
  rowZ:[-13, -25, -37, -49], // 뒤쪽 재배 줄 위치
};

const Scene3D = (function(){
  const view = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  view.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe6ecef, 30, 95);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  camera.position.set(1, 13, 32);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minDistance = 6;
  controls.maxDistance = 80;

  // 조명: 지붕으로 들어오는 자연광 + 보광등 느낌
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9d94, 0.95));
  const sun = new THREE.DirectionalLight(0xfff4e2, 0.7);
  sun.position.set(10, 34, 14); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.25);
  fill.position.set(-12, 16, -10); scene.add(fill);

  const mats = {
    floor: new THREE.MeshStandardMaterial({color:GH.floor, roughness:0.95}),
    slab:  new THREE.MeshStandardMaterial({color:GH.slab, roughness:0.9}),
    pipe:  new THREE.MeshStandardMaterial({color:GH.pipe, roughness:0.35, metalness:0.6}),
    frame: new THREE.MeshStandardMaterial({color:GH.frame, roughness:0.4, metalness:0.5}),
    glass: new THREE.MeshStandardMaterial({color:GH.glass, roughness:0.1, metalness:0.1,
             transparent:true, opacity:0.22, side:THREE.DoubleSide}),
    wire:  new THREE.MeshStandardMaterial({color:GH.wire, roughness:0.3, metalness:0.8}),
    string:new THREE.MeshStandardMaterial({color:GH.string, roughness:0.9}),
    lamp:  new THREE.MeshStandardMaterial({color:GH.lampBody, roughness:0.5, metalness:0.4}),
    glow:  new THREE.MeshBasicMaterial({color:GH.lampGlow}),
    bg:    new THREE.MeshStandardMaterial({color:GH.bgPlant, roughness:0.85}),
  };

  const house = new THREE.Group();
  scene.add(house);

  // ── 바닥 ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 140), mats.floor);
  floor.rotation.x = -Math.PI/2; house.add(floor);

  // ── 난방 배관 (재배 줄마다 2개) ──
  function heatPipes(z){
    [-1.5, 1.5].forEach(dx => {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 120, 10), mats.pipe);
      pipe.rotation.z = Math.PI/2; pipe.position.set(dx, 0.5, z);
      house.add(pipe);
    });
  }

  // ── 기둥과 지붕 ──
  const ROOF_Y = 46;
  for (const x of [-37, -13, 13, 37]){
    for (let z = -52; z <= 16; z += 17){
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, ROOF_Y, 0.55), mats.frame);
      post.position.set(x, ROOF_Y/2, z); house.add(post);
    }
  }
  for (let z = -40; z <= 20; z += 10){
    const beam = new THREE.Mesh(new THREE.BoxGeometry(100, 0.5, 0.5), mats.frame);
    beam.position.set(0, ROOF_Y, z); house.add(beam);
    // 박공 지붕 유리
    [-1, 1].forEach(s => {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(100, 8.5), mats.glass);
      pane.position.set(0, ROOF_Y + 2.6, z + s * 4.1);
      pane.rotation.x = -Math.PI/2 + s * 0.62;
      house.add(pane);
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(100, 0.3, 0.3), mats.frame);
      rafter.position.set(0, ROOF_Y + 5.1, z);
      house.add(rafter);
    });
  }

  // ── 유인 와이어 (식물을 매다는 가로줄) ──
  const WIRE_Y = 26;
  function wireAt(z){
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 110, 6), mats.wire);
    w.rotation.z = Math.PI/2; w.position.set(0, WIRE_Y, z); house.add(w);
  }

  // ── LED 보광등 ──
  function lampAt(x, z){
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 1.1), mats.lamp);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.16, 0.8), mats.glow);
    glow.position.y = -0.36; g.add(body, glow);
    const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7, 5), mats.wire);
    hang.position.y = 3.5; g.add(hang);
    g.position.set(x, 32, z); house.add(g);
  }

  // ── 앞줄(주인공 줄) 구조물 ──
  heatPipes(0); wireAt(0);
  [-11, 0, 11].forEach(x => lampAt(x, 0));

  // ── 뒤쪽 재배 줄: 단순한 식물로 깊이감만 ──
  const blobGeo = new THREE.SphereGeometry(1, 6, 4);
  function backRow(z, depth){
    heatPipes(z); wireAt(z);
    lampAt(-10, z); lampAt(10, z);
    // 멀수록 안개색에 가깝게 — 깊이감을 줘요
    const col = new THREE.Color(GH.bgPlant).lerp(new THREE.Color(0xe6ecef), depth * 0.5);
    const m = new THREE.MeshStandardMaterial({color:col, roughness:0.9});
    for (let i = 0; i < 13; i++){
      const x = -42 + i * 7 + (i % 2) * 1.1;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.8, 2.0), mats.slab);
      slab.position.set(x, 0.4, z); house.add(slab);
      const h = 19 + (i % 3) * 2;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, h, 5), m);
      stem.position.set(x, h/2 + 0.8, z); house.add(stem);
      for (let j = 0; j < 11; j++){
        const blob = new THREE.Mesh(blobGeo, m);
        const r = 0.85 + (j % 3) * 0.22;
        blob.scale.set(r * 1.5, r * 0.55, r * 1.1);
        blob.position.set(x + (j % 2 ? 1.1 : -1.1), 2.2 + j * (h - 3) / 11, z + (j % 3 - 1) * 0.7);
        blob.rotation.y = j * 1.3;
        house.add(blob);
      }
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, WIRE_Y, 4), mats.string);
      str.position.set(x + 0.35, WIRE_Y/2, z); house.add(str);
    }
  }
  GH.rowZ.forEach((z, i) => backRow(z, (i + 1) / GH.rowZ.length));

  // ── 앞줄 배지(슬라브) — 식물 위치에 맞춰 ui.js가 옮겨요 ──
  function makeSlab(){
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 2.4), mats.slab);
    slab.position.y = 0.5; g.add(slab);
    // 점적 호스
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5, 6),
      new THREE.MeshStandardMaterial({color:0x4b5157, roughness:0.6}));
    hose.rotation.z = Math.PI/2; hose.position.set(0, 1.08, 0.7); g.add(hose);
    house.add(g);
    return g;
  }

  // ── 유인 끈 (식물마다 하나) ──
  function makeString(){
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, WIRE_Y, 5), mats.string);
    s.position.y = WIRE_Y/2;
    house.add(s);
    return s;
  }

  // 식물 키에 맞춰 카메라를 부드럽게 맞춰요. 사용자가 직접 돌리면 거리는 그대로 둡니다.
  let userMoved = false, wantY = 5, wantD = 26;
  controls.addEventListener('start', () => { userMoved = true; });
  function frameTo(drawH){            // drawH: unit 단위로 그려진 높이
    wantY = clamp(drawH * 0.45 + 1.5, 4, 14);
    const d = clamp(drawH * 1.35 + 13, 17, 52);
    if (!userMoved) wantD = d;
  }
  function tickCamera(){
    controls.target.y += (wantY - controls.target.y) * 0.06;
    if (!userMoved){
      const dir = camera.position.clone().sub(controls.target);
      const cur = dir.length();
      dir.setLength(cur + (wantD - cur) * 0.06);
      camera.position.copy(controls.target).add(dir);
    }
  }

  function resize(){
    const w = view.clientWidth, h = view.clientHeight;
    renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {view, renderer, scene, camera, controls, resize, makeSlab, makeString, WIRE_Y, mats, frameTo, tickCamera};
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
