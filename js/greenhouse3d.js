/* =====================================================================
 * greenhouse3d.js — 장면 (Three.js)
 * ---------------------------------------------------------------------
 * 1 unit = 10 cm
 * 배경은 흰색으로 비워 두고, 식물과 높이 눈금자만 보여 줘요.
 * (바닥·배지·유인 끈 같은 구조물을 다시 넣고 싶으면 아래 주석을 참고하세요)
 * 식물 자체는 plant3d.js가 그립니다.
 * ===================================================================== */

const Scene3D = (function(){
  const view = document.getElementById('view');
  const renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  view.appendChild(renderer.domElement);

  const scene = new THREE.Scene();          // 배경 없음 — CSS의 흰색이 그대로 보여요

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  camera.position.set(1, 13, 32);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 9, 0);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.62;
  controls.minDistance = 5;
  controls.maxDistance = 90;

  // 조명만 남겨요 (면 색을 살리기 위해 세 방향에서)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdcdfd8, 1.0));
  const key = new THREE.DirectionalLight(0xfffaf2, 0.62);
  key.position.set(10, 30, 18); scene.add(key);
  const fill = new THREE.DirectionalLight(0xeaf1ff, 0.28);
  fill.position.set(-14, 14, -8); scene.add(fill);

  // ── 높이 눈금자 (1 unit = 10 cm) ──
  const WIRE_Y = 26;                        // 눈금자 높이 (식물 유인 높이와 같은 값)
  const ruler = new THREE.Group();
  const rmat = new THREE.LineBasicMaterial({color:0xc2c7c0});
  ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, WIRE_Y, 0)]), rmat));
  for (let m = 0; m * 10 <= WIRE_Y; m++){
    const y = m * 10;
    ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(-0.35, y, 0), new THREE.Vector3(0.35, y, 0)]), rmat));
    if (m === 0) continue;
    const s = makeLabel(m + ' m', 22, '#9aa09a', false);
    s.position.set(-1.5, y, 0); s.scale.multiplyScalar(0.75); ruler.add(s);
  }
  scene.add(ruler);

  // 구조물을 쓰지 않지만, 다시 넣고 싶을 때를 위해 비워 둔 자리예요.
  // (ui.js가 호출하므로 함수는 남겨 둡니다)
  function makeSlab(){ const g = new THREE.Group(); scene.add(g); return g; }
  function makeString(){ const g = new THREE.Group(); scene.add(g); return g; }

  // 식물 키에 맞춰 카메라를 부드럽게 맞춰요. 사용자가 직접 돌리면 거리는 그대로 둡니다.
  let userMoved = false, wantY = 5, wantD = 26;
  controls.addEventListener('start', () => { userMoved = true; });
  function frameTo(drawH, spread){          // drawH: unit 단위로 그려진 높이
    wantY = clamp(drawH * 0.45 - 0.5, 2.5, 13);
    const d = clamp(Math.max(drawH * 1.3, (spread || 0) * 2.4) + 12, 16, 60);
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

  return {view, renderer, scene, camera, controls, resize,
          makeSlab, makeString, WIRE_Y, frameTo, tickCamera, ruler};
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
