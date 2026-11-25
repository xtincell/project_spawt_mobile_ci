import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  Scene,
  Shape,
  Vector3,
  WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Point = [number, number];
const north = (x: number) =>
  -3.8 + 3.4 * Math.sin(x * 0.079) + 1.9 * Math.cos(x * 0.13);
const south = (x: number) =>
  5.1 + 2.5 * Math.sin(x * 0.075 + 0.55) + 1.6 * Math.cos(x * 0.125);
const pins = {
  yopougon: new Vector3(-32, 1.6, -9),
  "in-concept": new Vector3(7, 1.6, -10),
  marcory: new Vector3(31, 1.6, 11),
};

function buildCity() {
  const pieces = new Map<number, BufferGeometry[]>();
  const paper = 0xf5ead5,
    lightPaper = 0xfff5e6,
    shade = 0xe2cfac;
  const pavement = 0xe8d9bc,
    road = 0xc3a878,
    glass = 0xd4bf9a;
  const group = new Group();
  function add(color: number, geometry: BufferGeometry) {
    const shapes = pieces.get(color) || [];
    shapes.push(geometry);
    pieces.set(color, shapes);
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number,
    turn = 0,
  ) {
    const shape = new BoxGeometry(w, h, d);
    shape.rotateY(turn);
    shape.translate(x, y, z);
    add(color, shape);
  }
  function plate(points: Point[], base: number, height: number, color: number) {
    const outline = new Shape();
    points.forEach(([x, z], i) =>
      i ? outline.lineTo(x, -z) : outline.moveTo(x, -z),
    );
    outline.closePath();
    const shape = new ExtrudeGeometry(outline, {
      depth: height,
      bevelEnabled: false,
      curveSegments: 1,
    });
    shape.rotateX(-Math.PI / 2);
    shape.translate(0, base, 0);
    add(color, shape);
  }
  function beam(a: Vector3, b: Vector3, radius: number, color: number) {
    const geom = new CylinderGeometry(
      radius,
      radius,
      a.distanceTo(b),
      5,
      1,
      false,
    );
    const unit = new Vector3(0, 1, 0);
    const transform = new Matrix4().makeRotationAxis(
      new Vector3()
        .crossVectors(unit, new Vector3().subVectors(b, a))
        .normalize(),
      unit.angleTo(new Vector3().subVectors(b, a)),
    );
    geom.applyMatrix4(transform);
    geom.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    add(color, geom);
  }
  const edge = Array.from({ length: 55 }, (_, i) => -51 + (i * 102) / 54);
  const back = (x: number) =>
    -19 - 1.9 * Math.sin(x * 0.14) - 1.6 * Math.cos(x * 0.07);
  const front = (x: number) =>
    17.1 + 2.2 * Math.cos(x * 0.11) + 1.75 * Math.sin(x * 0.12);
  const banks = [
    [
      ...edge.map((x) => [x, back(x)]),
      ...edge.map((x) => [x, north(x)]).reverse(),
    ] as Point[],
    [
      ...edge.map((x) => [x, south(x)]),
      ...edge.map((x) => [x, front(x)]).reverse(),
    ] as Point[],
  ];
  // The lagoon runs between two raised, die-cut paper shores.
  plate(
    [
      ...edge.map((x) => [x, back(x)]),
      ...edge.map((x) => [x, front(x)]).reverse(),
    ] as Point[],
    -0.8,
    0.85,
    0x214d3e,
  );
  for (const poly of banks) {
    plate(poly, 0.02, 0.44, shade);
    plate(poly, 0.46, 0.74, paper);
  }
  for (let i = 1; i < edge.length; i++)
    for (const coast of [north, south]) {
      const a = edge[i - 1],
        b = edge[i],
        inland = coast === north ? -1.1 : 1.1;
      beam(
        new Vector3(a, 1.24, coast(a) + inland),
        new Vector3(b, 1.24, coast(b) + inland),
        0.055,
        road,
      );
    }
  let seed = 3725;
  function rand() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let x = -47; x <= 47; x += 4.7)
    for (let z = -18; z < 19; z += 4) {
      if (
        (z > north(x) - 2.4 && z < south(x) + 2.2) ||
        z < back(x) + 2 ||
        z > front(x) - 2
      )
        continue;
      if (Math.abs(x - 3) < 8 && z > 3.3) continue;
      if (Object.values(pins).some((p) => Math.hypot(x - p.x, z - p.z) < 3.75))
        continue;
      if ([-23, 19].some((px) => Math.abs(x - px) < 2.4)) continue;
      const highDistrict =
        z < -10 && ((x > -13 && x < 11) || x < -31 || x > 36);
      const height = highDistrict ? 3.1 + rand() * 7.5 : 0.9 + rand() * 3.65;
      const width = 1.35 + rand() * 1.8,
        depth = 1.5 + rand() * 1.45;
      const color = rand() > 0.48 ? lightPaper : paper;
      box(x, 1.25, z, 4.35, 0.1, 3.65, pavement);
      box(x, 1.36 + height / 2, z, width, height, depth, color);
      box(x, 1.39 + height, z, width + 0.12, 0.13, depth + 0.12, lightPaper);
      if (height < 4 && rand() > 0.35)
        box(
          x - 0.2,
          1.5 + height,
          z + 0.17,
          width * 0.45,
          0.25,
          depth * 0.48,
          pavement,
        );
      if (height > 4) {
        box(x, 1.42 + height, z, width * 0.74, 0.22, depth * 0.72, shade);
        // Embossed facade windows on both outward faces.
        for (let y = 2; y < 1 + height; y += 1.08) {
          for (
            let dx = -width * 0.26;
            dx <= width * 0.27;
            dx += Math.max(0.62, width * 0.33)
          ) {
            box(x + dx, y, z + depth * 0.5 + 0.015, 0.26, 0.46, 0.035, glass);
          }
          box(x + width * 0.5 + 0.015, y, z, 0.035, 0.34, depth * 0.72, glass);
        }
      }
    }
  // Pylons, decks and suspension cables span the lagoon on independent meshes.
  for (const x of [-23, 19]) {
    const z1 = north(x) - 4,
      z2 = south(x) + 4,
      middle = (z1 + z2) / 2,
      length = z2 - z1;
    box(x, 1.94, middle, 2.35, 0.44, length, lightPaper);
    box(x, 2.19, middle, 0.075, 0.05, length, road);
    for (const side of [-1, 1]) {
      box(x + side * 1.16, 2.25, middle, 0.13, 0.4, length, shade);
      const px = x + side * 0.75;
      box(px, 4.5, middle, 0.33, 7.4, 0.52, paper);
      for (let i = 1; i <= 6; i++)
        for (const sign of [-1, 1]) {
          beam(
            new Vector3(px, 8.05 - i * 0.18, middle),
            new Vector3(
              x + side * 1.12,
              2.48,
              middle + (sign * i * length) / 13,
            ),
            0.045,
            lightPaper,
          );
        }
    }
  }
  // A folded-paper landmark sits on a low peninsula, like the sculptural centre in the reference.
  const plaza = new CylinderGeometry(5.2, 5.25, 0.38, 38);
  plaza.translate(3, 1.49, 8);
  add(lightPaper, plaza);
  const plinth = new CylinderGeometry(4.45, 4.6, 0.24, 38);
  plinth.translate(3, 1.77, 8);
  add(pavement, plinth);
  for (let k = 0; k < 6; k++) {
    const angle = (k * Math.PI) / 3;
    for (let part = 0; part < 10; part++) {
      const t = part / 10,
        t2 = (part + 1) / 10;
      const p = (f: number, across: number) =>
        new Vector3(
          3 +
            Math.cos(angle) * 4.2 * (1 - f) ** 2 +
            Math.cos(angle + Math.PI / 2) * across * (1 - f) * 0.55,
          1.89 + 8 * f,
          8 +
            Math.sin(angle) * 4.2 * (1 - f) ** 2 +
            Math.sin(angle + Math.PI / 2) * across * (1 - f) * 0.55,
        );
      const vertices = [
        p(t, -1),
        p(t, 1),
        p(t2, 1),
        p(t, -1),
        p(t2, 1),
        p(t2, -1),
      ];
      const face = new BufferGeometry().setFromPoints(vertices);
      face.computeVertexNormals();
      const plain = face;
      // Box meshes carry UVs, but the map uses matte materials only.
      add(part % 3 === 0 ? shade : paper, plain);
    }
  }
  const deck = [
    new Vector3(-3, 1.24, 9),
    new Vector3(-2, 1.24, 15),
    new Vector3(13, 1.24, 15),
  ];
  for (let i = 1; i < deck.length; i++) beam(deck[i - 1], deck[i], 0.16, road);
  for (const [color, geometries] of pieces) {
    const nonIndexed = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
    for (const part of nonIndexed) part.deleteAttribute("uv");
    const joined = mergeGeometries(nonIndexed, false);
    const mesh = new Mesh(
      joined,
      new MeshStandardMaterial({ color, roughness: 0.96, side: DoubleSide }),
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    new Set([...nonIndexed, ...geometries]).forEach((g) => g.dispose());
  }
  return group;
}

export function mountPaperAtlas(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  context: WebGL2RenderingContext,
) {
  const renderer = new WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  const scene = new Scene(),
    city = buildCity();
  scene.add(city, new AmbientLight(0xfffaf1, 1.6));
  const key = new DirectionalLight(0xfff6e6, 2.85);
  key.position.set(-45, 70, 30);
  key.castShadow = true;
  Object.assign(key.shadow.camera, {
    left: -75,
    right: 75,
    top: 62,
    bottom: -62,
    far: 200,
  });
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  scene.add(key);
  const camera = new OrthographicCamera(-56, 56, 20, -20, 1, 260);
  let frame = 0,
    target = 0,
    current = 0,
    disposed = false,
    lost = false;
  function request() {
    if (!frame && !disposed && !lost) frame = requestAnimationFrame(draw);
  }
  function draw() {
    frame = 0;
    if (disposed || lost) return;
    const w = stage.clientWidth,
      h = stage.clientHeight;
    if (!w || !h) return;
    current += (target - current) * 0.22;
    const half = 56;
    camera.left = -half;
    camera.right = half;
    camera.top = (half * h) / w;
    camera.bottom = -camera.top;
    camera.position.set(20 + current * 2.4, 65, 105);
    camera.lookAt(0, 3.7, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    renderer.render(scene, camera);
    for (const [id, world] of Object.entries(pins)) {
      const p = world.clone().project(camera);
      stage.style.setProperty(
        "--" + id + "-x",
        ((p.x + 1) * 50).toFixed(3) + "%",
      );
      stage.style.setProperty(
        "--" + id + "-y",
        ((1 - p.y) * 50).toFixed(3) + "%",
      );
    }
    if (!context.isContextLost()) stage.dataset.relief = "live";
    if (Math.abs(target - current) > 0.005) request();
  }
  function size() {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    request();
  }
  function point(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    target = Math.max(
      -1,
      Math.min(1, ((e.clientX - r.left) * 2) / r.width - 1),
    );
    request();
  }
  function rest() {
    target = 0;
    request();
  }
  function showPoster() {
    delete stage.dataset.relief;
    for (const id of Object.keys(pins)) {
      stage.style.removeProperty("--" + id + "-x");
      stage.style.removeProperty("--" + id + "-y");
    }
  }
  function onContextLoss(e: Event) {
    e.preventDefault();
    lost = true;
    showPoster();
  }
  function onContextRestore() {
    lost = false;
    request();
  }
  const resize = new ResizeObserver(size);
  resize.observe(stage);
  size();
  stage.addEventListener("pointermove", point);
  stage.addEventListener("pointerleave", rest);
  canvas.addEventListener("webglcontextlost", onContextLoss);
  canvas.addEventListener("webglcontextrestored", onContextRestore);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    resize.disconnect();
    stage.removeEventListener("pointermove", point);
    stage.removeEventListener("pointerleave", rest);
    canvas.removeEventListener("webglcontextlost", onContextLoss);
    canvas.removeEventListener("webglcontextrestored", onContextRestore);
    city.children.forEach((node) => {
      const mesh = node as Mesh<BufferGeometry, MeshStandardMaterial>;
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    key.shadow.dispose();
    renderer.dispose();
    showPoster();
  };
}
