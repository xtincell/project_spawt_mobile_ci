import {
  BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial,
  OrthographicCamera, PlaneGeometry, Scene, ShapeUtils, SRGBColorSpace,
  Texture, Vector2, WebGLRenderer
} from "three";

const width = 1300;
const top = 200;
const height = 428;
type ScreenPoint = readonly [number, number];
type Vertex = readonly [number, number, number];

// Model in the coordinates of the art director's reference. The UVs project that
// artwork onto the paper faces. From the resting camera its texture aligns with the poster.
const groundDepth = (y: number) => (y - top) * .29;

function projectedFaces(material: MeshBasicMaterial) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  function face(points: Vertex[]) {
    const start = positions.length / 3;
    for (const [x, y, z] of points) {
      positions.push(x - width / 2, height / 2 + top - y, z);
      uvs.push(x / width, 1 - (y - top) / height);
    }
    for (const triangle of ShapeUtils.triangulateShape(points.map(([x, y]) => new Vector2(x, -y)), [])) {
      indices.push(...triangle.map(i => i + start));
    }
  }
  // The irregular pentagonal roofs and the two visible wall faces of the towers.
  function tower(roof: ScreenPoint[], baseY: number, relief: number) {
    const baseZ = groundDepth(baseY) + 2;
    face(roof.map(([x, y]) => [x, y, baseZ + relief]));
    for (let i = 0; i < roof.length - 1; i++) {
      const [ax, ay] = roof[i];
      const [bx, by] = roof[i + 1];
      const footA = baseY + (ay - roof[0][1]) * .2;
      const footB = baseY + (by - roof[0][1]) * .2;
      face([[ax, ay, baseZ + relief], [bx, by, baseZ + relief],
        [bx, footB, baseZ], [ax, footA, baseZ]]);
    }
  }
  tower([[21,254],[51,254],[70,249],[60,246]], 349, 32);
  tower([[4,293],[29,290],[42,294],[24,298]], 372, 19);
  tower([[95,288],[120,288],[135,284],[112,281]], 366, 23);
  tower([[196,345],[220,341],[238,335],[208,339]], 381, 11);
  tower([[550,305],[573,299],[592,304],[569,311]], 368, 21);
  tower([[655,258],[686,260],[701,255],[670,251]], 338, 31);
  tower([[700,274],[723,279],[742,276],[716,271]], 341, 20);
  tower([[747,300],[765,304],[789,294],[772,291]], 347, 17);
  tower([[857,277],[872,280],[890,271],[878,268]], 319, 15);
  tower([[996,331],[1015,335],[1031,329],[1012,325]], 383, 18);
  tower([[1100,325],[1124,330],[1143,326],[1115,319]], 370, 18);
  tower([[1206,285],[1220,287],[1237,280],[1218,276]], 364, 24);
  tower([[1251,316],[1274,319],[1294,309],[1268,306]], 372, 22);
  // Continuous bridge decks; each row has its own long and short edges.
  function deck(near: ScreenPoint[], far: ScreenPoint[], relief: number) {
    for (let i = 0; i < near.length - 1; i++) {
      face([near[i], near[i+1], far[i+1], far[i]].map(([x,y]) => [x,y,groundDepth(y) + relief]));
    }
  }
  deck([[142,409],[261,401],[410,406],[519,408]], [[142,401],[261,390],[410,392],[519,398]], 11);
  deck([[557,464],[679,477],[774,498],[893,534]], [[557,450],[679,461],[774,481],[893,519]], 10);
  deck([[848,335],[977,321],[1070,320],[1203,341]], [[848,329],[977,307],[1070,309],[1203,329]], 9);
  for (const [x, peak, foot, span] of [[320,317,406,80],[977,236,309,50],[1126,252,324,62]]) {
    const z = groundDepth(foot) + 15;
    face([[x-3,peak,z+10],[x+2,peak-1,z+10],[x+5,foot,z],[x-4,foot+1,z]]);
    for (let i=1; i<=6; i++) {
      const a = span * i/6;
      for (const sign of [-1,1]) {
        const end = x + sign*a;
        const y = foot - 8;
        face([[x,peak+4,z+10],[end,y,z],[end+1.3,y,z],[x+1,peak+4,z+10]]);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return new Mesh(geometry, material);
}

export function mountAbidjanRelief(stage: HTMLElement, canvas: HTMLCanvasElement, image: HTMLImageElement) {
  const renderer = new WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  const scene = new Scene();
  const camera = new OrthographicCamera(-width/2, width/2, height/2, -height/2, 1, 1800);
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const material = new MeshBasicMaterial({ map: texture, side: DoubleSide, toneMapped: false });
  const ground = new PlaneGeometry(width, height, 120, 44);
  const vertices = ground.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const y = top + height/2 - vertices.getY(i);
    vertices.setZ(i,groundDepth(y));
  }
  const facades = projectedFaces(material);
  scene.add(new Mesh(ground, material), facades);

  let frame = 0;
  let lost = false;
  let mouseX = 0;
  let mouseY = 0;
  let yaw = 0;
  let pitch = 0;
  function draw() {
    frame = 0;
    if (lost) return;
    const box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const travel = Math.max(-1, Math.min(1, (box.top + box.height/2 - window.innerHeight/2) / window.innerHeight));
    const targetY = mouseY * 12 + travel * 17;
    const targetX = mouseX * 33;
    yaw += (targetX - yaw) * .16;
    pitch += (targetY - pitch) * .16;
    camera.position.set(yaw, pitch, 1050);
    camera.lookAt(0, 0, 63);
    // A tiny overscan keeps the near shoreline continuous at extreme angles.
    camera.zoom = 1.012;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    canvas.style.opacity = "1";
    if (Math.abs(targetX-yaw) + Math.abs(targetY-pitch) > .16) requestFrame();
  }
  function requestFrame() {
    if (!frame && !lost) frame = requestAnimationFrame(draw);
  }
  function resize() {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    requestFrame();
  }
  function point(event: PointerEvent) {
    if (event.pointerType === "touch") return;
    const rect = stage.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    mouseY = (.5 - (event.clientY - rect.top) / rect.height) * 2;
    requestFrame();
  }
  function resetPointer() {
    mouseX = 0; mouseY = 0;
    requestFrame();
  }
  function contextLost(event: Event) {
    event.preventDefault();
    lost = true;
    canvas.style.opacity = "0";
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function contextRestored() {
    lost = false;
    texture.needsUpdate = true;
    resize();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();
  stage.addEventListener("pointermove", point, { passive: true });
  stage.addEventListener("pointerleave", resetPointer);
  window.addEventListener("scroll", requestFrame, { passive: true });
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  return () => {
    lost = true;
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", requestFrame);
    stage.removeEventListener("pointermove", point);
    stage.removeEventListener("pointerleave", resetPointer);
    canvas.removeEventListener("webglcontextlost", contextLost);
    canvas.removeEventListener("webglcontextrestored", contextRestored);
    ro.disconnect();
    ground.dispose();
    facades.geometry.dispose();
    material.dispose();
    texture.dispose();
    renderer.dispose();
    canvas.style.opacity = "0";
  };
}
