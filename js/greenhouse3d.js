/* =====================================================================
 * greenhouse3d.js — 장면 (Three.js)
 * ---------------------------------------------------------------------
 * 1 unit = 10 cm
 * 식물이 잘 보이도록 배경은 최소한으로만 둬요.
 *   · 바닥, 배지(슬라브), 유인 끈, 유인 와이어, 높이 눈금자
 * 식물 자체는 plant3d.js가 그립니다.
 * ===================================================================== */

const GH = {
  floor:0xe7e8e2,   // 바닥
  slab:0xd8d2c4,    // 배지(암면 슬라브)
  wire:0x9aa0a4,    // 유인 와이어
  string:0xdedbd2,  // 유인 끈
};

const Scene3D = (function(){
  const view = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  view.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xeef0ec, 60, 150);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  camera.position.set(1, 13, 32);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.minDistance = 5;
  controls.maxDistance = 90;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fa29a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff6ea, 0.72);
  sun.position.set(10, 34, 16); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.22);
  fill.position.set(-12, 16, -10); scene.add(fill);

  const mats = {
    floor: new THREE.MeshStandardMaterial({color:GH.floor, roughness:0.95}),
    slab:  new THREE.MeshStandardMaterial({color:GH.slab, roughness:0.9}),
    wire:  new THREE.MeshStandardMaterial({color:GH.wire, roughness:0.35, metalness:0.6}),
    string:new THREE.MeshStandardMaterial({color:GH.string, roughness:0.9}),
    hose:  new THREE.MeshStandardMaterial({color:0x4b5157, roughness:0.6}),
  };

  // 바닥
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 56), mats.floor);
  floor.rotation.x = -Math.PI/2; scene.add(floor);

  // 유인 와이어 (식물을 매다는 가로줄)
  const WIRE_Y = 26;
  const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 60, 6), mats.wire);
  wire.rotation.z = Math.PI/2; wire.position.y = WIRE_Y; scene.add(wire);

  // 높이 눈금자 (1 unit = 10 cm)
  const ruler = new THREE.Group();
  const rmat = new THREE.LineBasicMaterial({color:0x8c938d});
  ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(0,0,0), new THREE.Vector3(0, WIRE_Y, 0)]), rmat));
  for (let m = 1; m * 10 <= WIRE_Y; m++){
    const y = m * 10;
    ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(-0.35, y, 0), new THREE.Vector3(0.35, y, 0)]), rmat));
    const s = makeLabel(m + ' m', 22, '#6b726c', false);
    s.position.set(-1.5, y, 0); s.scale.multiplyScalar(0.75); ruler.add(s);
  }
  scene.add(ruler);

  // 배지(슬라브) + 점적 호스 — 식물마다 하나
  function makeSlab(){
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.0, 2.4), mats.slab);
    slab.position.y = 0.5; g.add(slab);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.5, 6), mats.hose);
    hose.rotation.z = Math.PI/2; hose.position.set(0, 1.08, 0.7); g.add(hose);
    scene.add(g);
    return g;
  }
  // 유인 끈
  function makeString(){
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, WIRE_Y, 5), mats.string);
    s.position.y = WIRE_Y/2;
    scene.add(s);
    return s;
  }

  // 식물 키에 맞춰 카메라를 부드럽게 맞춰요. 사용자가 직접 돌리면 거리는 그대로 둡니다.
  let userMoved = false, wantY = 5, wantD = 26;
  controls.addEventListener('start', () => { userMoved = true; });
  function frameTo(drawH, spread){        // drawH: unit 단위로 그려진 높이
    wantY = clamp(drawH * 0.45 + 1.5, 4, 14);
    const d = clamp(Math.max(drawH * 1.35, (spread||0) * 2.4) + 13, 17, 60);
    if (!userMoved) wantD = d;
    ruler.position.x = -((spread || 0) + 3.4);
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
    if (!w || !h) return;
    renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {view, renderer, scene, camera, controls, resize, makeSlab, makeString,
          WIRE_Y, mats, frameTo, tickCamera, ruler};
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
