import * as THREE from "three";
import { paintCoverCanvas, paintSwarmCanvas, loadImage, type CoverInput } from "@/studio/covers";
import { buildLogo } from "@/studio/glyphs";
import { isFilled, type GameSlot } from "@/studio/slots";

export type Phase = "intro" | "gallery";

export type EngineHandle = {
  sync: (slots: GameSlot[]) => void;
  setSelected: (id: string | null) => void;
  skip: () => void;
  replay: () => void;
  dispose: () => void;
};

type EngineOptions = {
  canvas: HTMLCanvasElement;
  slots: GameSlot[];
  reduced: boolean;
  onPhase: (phase: Phase) => void;
  onProgress: (value: number) => void;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onFail: () => void;
};

const T_FORM0 = 0.65;
const T_FORM1 = 4.55;
const T_HOLD = 6.25;
const T_END = 8.2;
const CARD_W = 3.2;
const CARD_H = 4;

type Tile = {
  scatter: THREE.Vector3;
  target: THREE.Vector3;
  rot: THREE.Euler;
  scatterScale: number;
  atmo: boolean;
  index: number;
};

type Bay = {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  frame: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  id: string;
  base: THREE.Vector3;
  rotY: number;
  lift: number;
  tiltX: number;
  tiltY: number;
  glow: number;
  token: number;
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function ease(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function coverInput(slot: GameSlot): CoverInput {
  return { bay: slot.bay, title: slot.title, filled: isFilled(slot) };
}

function stampSlots(slots: GameSlot[]): string {
  return JSON.stringify(
    slots.map((slot) => [
      slot.id,
      slot.title,
      slot.imageUrl,
      slot.playUrl,
      slot.videoUrl,
      slot.description,
    ]),
  );
}

export function createEngine(options: EngineOptions): EngineHandle {
  const { canvas } = options;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });
  } catch {
    options.onFail();
    return { sync() {}, setSelected() {}, skip() {}, replay() {}, dispose() {} };
  }

  if (!renderer.getContext()) {
    options.onFail();
    renderer.dispose();
    return { sync() {}, setSelected() {}, skip() {}, replay() {}, dispose() {} };
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x07080b, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 400);
  const logo = buildLogo();

  scene.add(new THREE.HemisphereLight(0xc8c2b4, 0x14120f, 0.72));
  const key = new THREE.DirectionalLight(0xfff6ee, 2.4);
  key.position.set(-6, 9, 12);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe85d2c, 0.85);
  rim.position.set(7, 2, -6);
  scene.add(rim);
  const core = new THREE.PointLight(0xe85d2c, 0, 48);
  core.position.set(0, 0.2, 3.2);
  scene.add(core);

  const rand = mulberry(20261010);
  const tiles: Tile[] = [];
  const startZ = 5.7;

  const scatterFor = (atmo: boolean): { pos: THREE.Vector3; rot: THREE.Euler; scale: number } => {
    const z = -0.4 + rand() * 3.5;
    const dist = Math.max(0.9, startZ - z);
    const halfH = Math.tan(THREE.MathUtils.degToRad(14)) * dist * (atmo ? 1.15 : 0.96);
    const halfW = halfH * 1.35;
    return {
      pos: new THREE.Vector3((rand() * 2 - 1) * halfW, (rand() * 2 - 1) * halfH, z),
      rot: new THREE.Euler((rand() - 0.5) * 0.8, (rand() - 0.5) * 0.9, (rand() - 0.5) * 0.7),
      scale: 0.85 + rand() * 0.7,
    };
  };

  for (const point of logo.points) {
    const scatter = scatterFor(false);
    tiles.push({
      scatter: scatter.pos,
      target: new THREE.Vector3(point.x, point.y, 0),
      rot: scatter.rot,
      scatterScale: scatter.scale,
      atmo: false,
      index: 0,
    });
  }
  for (let i = 0; i < 36; i++) {
    const scatter = scatterFor(true);
    const fly = scatter.pos.clone().multiplyScalar(4.2);
    fly.z -= 6;
    tiles.push({
      scatter: scatter.pos,
      target: fly,
      rot: scatter.rot,
      scatterScale: scatter.scale,
      atmo: true,
      index: 0,
    });
  }

  const swarmGeo = new THREE.PlaneGeometry(1, 1.25);
  const buckets: { mesh: THREE.InstancedMesh; tiles: Tile[]; mat: THREE.MeshStandardMaterial }[] = [];
  for (let v = 0; v < 4; v++) {
    const mine = tiles.filter((_, index) => index % 4 === v);
    mine.forEach((tile, index) => {
      tile.index = index;
    });
    const map = new THREE.CanvasTexture(paintSwarmCanvas(v));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    const mat = new THREE.MeshStandardMaterial({
      map,
      roughness: 0.46,
      metalness: 0.22,
      transparent: false,
    });
    const mesh = new THREE.InstancedMesh(swarmGeo, mat, mine.length);
    mesh.frustumCulled = false;
    const color = new THREE.Color();
    mine.forEach((tile, index) => {
      color.set("#ffffff").lerp(new THREE.Color("#f3d2c3"), (index % 5) * 0.06);
      mesh.setColorAt(index, color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    scene.add(mesh);
    buckets.push({ mesh, tiles: mine, mat });
  }

  const wall = new THREE.Group();
  scene.add(wall);
  const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const frameGeo = new THREE.PlaneGeometry(CARD_W * 1.045, CARD_H * 1.04);
  const bays: Bay[] = [];
  const cols = 4;
  const rows = Math.ceil(options.slots.length / cols);
  const gapX = CARD_W + 0.42;
  const gapY = CARD_H + 0.48;

  options.slots.forEach((slot, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col - (cols - 1) / 2) * gapX;
    const y = ((rows - 1) / 2 - row) * gapY;
    const rotY = (col - (cols - 1) / 2) * 0.06;
    const z = -Math.abs(col - (cols - 1) / 2) * 0.34;
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.42,
      metalness: 0.28,
      color: 0xffffff,
      emissive: new THREE.Color("#e85d2c"),
      emissiveIntensity: 0.05,
      transparent: true,
      opacity: 0,
    });
    const mesh = new THREE.Mesh(cardGeo, mat);
    mesh.userData.id = slot.id;
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1815,
      roughness: 0.32,
      metalness: 0.78,
      transparent: true,
      opacity: 0,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.z = -0.04;
    mesh.add(frame);
    mesh.visible = false;
    wall.add(mesh);
    bays.push({
      mesh,
      frame,
      id: slot.id,
      base: new THREE.Vector3(x, y, z),
      rotY,
      lift: 0,
      tiltX: 0,
      tiltY: 0,
      glow: 0.05,
      token: 0,
    });
  });

  const dustCount = 140;
  const dustArray = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustArray[i * 3] = (rand() - 0.5) * 48;
    dustArray[i * 3 + 1] = (rand() - 0.5) * 28;
    dustArray[i * 3 + 2] = (rand() - 0.5) * 24;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustArray, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xc8c2b4,
      size: 0.045,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  scene.add(dust);

  const dummy = new THREE.Object3D();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const introPos = new THREE.Vector3();
  const galleryPos = new THREE.Vector3();
  const introLook = new THREE.Vector3();
  const galleryLook = new THREE.Vector3();
  const look = new THREE.Vector3();

  const state = {
    t: options.reduced ? T_END : 0,
    skip: false,
    running: true,
    phase: (options.reduced ? "gallery" : "intro") as Phase,
    progress: options.reduced ? 100 : -1,
    selected: null as string | null,
    hover: null as string | null,
    panX: 0,
    panY: 0,
    velX: 0,
    velY: 0,
    ndcX: 0,
    ndcY: 0,
    dragging: false,
    moved: false,
    px: 0,
    py: 0,
    stamp: "",
    aspect: 1,
    fov: 28,
    dist: 16,
    limitX: 1,
    limitY: 1,
  };

  let raf = 0;

  const applyTexture = async (bay: Bay, slot: GameSlot) => {
    const token = ++bay.token;
    let image: HTMLImageElement | null = null;
    if (slot.imageUrl) {
      try {
        image = await loadImage(slot.imageUrl);
      } catch {
        image = null;
      }
    }
    if (!state.running || bay.token !== token) return;
    const canvasTex = new THREE.CanvasTexture(paintCoverCanvas(coverInput(slot), image));
    canvasTex.colorSpace = THREE.SRGBColorSpace;
    canvasTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const previous = bay.mesh.material.map;
    bay.mesh.material.map = canvasTex;
    bay.mesh.material.needsUpdate = true;
    previous?.dispose();
  };

  let latestSlots = options.slots;

  const sync = (slots: GameSlot[], force = false) => {
    latestSlots = slots;
    const next = stampSlots(slots);
    if (!force && next === state.stamp) return;
    state.stamp = next;
    slots.forEach((slot) => {
      const bay = bays.find((item) => item.id === slot.id);
      if (!bay) return;
      bay.mesh.userData.id = slot.id;
      void applyTexture(bay, slot);
    });
  };

  sync(options.slots, true);
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => {
      if (state.running) sync(latestSlots, true);
    });
  }

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return;
    state.aspect = w / h;
    state.fov = state.aspect < 1 ? 32 : 28;
    camera.fov = state.fov;
    camera.aspect = state.aspect;
    camera.updateProjectionMatrix();
    const dprCap = state.aspect < 1 ? 1.6 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
    renderer.setSize(w, h, false);

    const vTan = Math.tan(THREE.MathUtils.degToRad(state.fov / 2));
    const wallW = (cols - 1) * gapX + CARD_W;
    const wallH = (rows - 1) * gapY + CARD_H;
    if (state.aspect >= 1.05) {
      const distY = (wallH * 1.16) / (2 * vTan);
      const distX = (wallW * 1.1) / (2 * vTan * state.aspect);
      state.dist = Math.max(distY, distX);
    } else {
      state.dist = (CARD_H * 1.45) / (2 * vTan);
    }
    const viewH = vTan * state.dist;
    const viewW = viewH * state.aspect;
    state.limitX = Math.max(0.4, wallW / 2 - viewW + CARD_W * 0.2);
    state.limitY = Math.max(0.3, wallH / 2 - viewH + CARD_H * 0.15);
  };

  const observer = new ResizeObserver(() => resize());
  observer.observe(canvas);
  resize();

  const logoDistance = () => {
    const vTan = Math.tan(THREE.MathUtils.degToRad(state.fov / 2));
    const hTan = vTan * Math.max(0.38, state.aspect);
    const distW = (logo.width * 0.58) / hTan;
    const distH = (logo.height * 1.15) / vTan;
    return Math.max(distW, distH, 12);
  };

  const setPhase = (phase: Phase) => {
    if (state.phase === phase) return;
    state.phase = phase;
    options.onPhase(phase);
  };

  const hitBay = (clientX: number, clientY: number): string | null => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(
      bays.map((bay) => bay.mesh),
      false,
    );
    const id = hits[0]?.object.userData.id;
    return typeof id === "string" ? id : null;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    state.dragging = true;
    state.moved = false;
    state.px = event.clientX;
    state.py = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    state.ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.ndcY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    if (!state.dragging) {
      if (state.phase !== "gallery") return;
      const id = hitBay(event.clientX, event.clientY);
      if (id !== state.hover) {
        state.hover = id;
        options.onHover(id);
      }
      return;
    }
    const dx = event.clientX - state.px;
    const dy = event.clientY - state.py;
    if (Math.hypot(dx, dy) > 5) state.moved = true;
    state.px = event.clientX;
    state.py = event.clientY;
    if (state.phase !== "gallery") return;
    const sens = state.dist * 0.00115;
    state.panX = THREE.MathUtils.clamp(state.panX - dx * sens, -state.limitX, state.limitX);
    state.panY = THREE.MathUtils.clamp(state.panY + dy * sens, -state.limitY, state.limitY);
    state.velX = -dx * sens;
    state.velY = dy * sens;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!state.dragging) return;
    state.dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (state.moved || state.t < T_HOLD + (T_END - T_HOLD) * 0.72) return;
    const id = hitBay(event.clientX, event.clientY);
    options.onSelect(id);
  };

  const onWheel = (event: WheelEvent) => {
    if (state.phase !== "gallery") return;
    event.preventDefault();
    state.panY = THREE.MathUtils.clamp(state.panY + event.deltaY * 0.004, -state.limitY, state.limitY);
    state.panX = THREE.MathUtils.clamp(state.panX + event.deltaX * 0.004, -state.limitX, state.limitX);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });

  const tileScale = logo.pitch * 0.9;

  const animate = (now: number) => {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    state.t += dt * (state.skip ? 7.2 : 1);
    if (state.t > T_END) state.t = T_END;

    const u = ease(clamp01((state.t - T_FORM0) / (T_FORM1 - T_FORM0)));
    const g = ease(clamp01((state.t - T_HOLD) / (T_END - T_HOLD)));
    const progress = Math.round((state.t / T_END) * 100);
    if (progress !== state.progress) {
      state.progress = progress;
      options.onProgress(progress);
    }
    setPhase(g > 0.62 ? "gallery" : "intro");

    const far = logoDistance();
    introPos.set(Math.sin(state.t * 0.15) * 0.15, 0.25, lerp(startZ, far, u));
    if (!state.dragging) {
      state.panX = THREE.MathUtils.clamp(state.panX + state.velX, -state.limitX, state.limitX);
      state.panY = THREE.MathUtils.clamp(state.panY + state.velY, -state.limitY, state.limitY);
      state.velX *= Math.exp(-2.6 * dt);
      state.velY *= Math.exp(-2.6 * dt);
    }
    galleryPos.set(
      state.panX + state.ndcX * 0.28 * g,
      state.panY + 0.05 + state.ndcY * 0.16 * g,
      state.dist,
    );
    introLook.set(0, 0.15, 0);
    galleryLook.set(state.panX, state.panY, 0);
    camera.position.lerpVectors(introPos, galleryPos, g);
    look.lerpVectors(introLook, galleryLook, g);
    camera.lookAt(look);
    core.intensity = (0.4 + u * 7.5) * (1 - g);

    const swarmOpacity = 1 - g;
    const showSwarm = swarmOpacity > 0.02;
    for (const bucket of buckets) {
      bucket.mesh.visible = showSwarm;
      if (!showSwarm) continue;
      for (const tile of bucket.tiles) {
        const form = tile.atmo ? Math.min(1, u * 1.15) : u;
        dummy.position.lerpVectors(tile.scatter, tile.target, form);
        dummy.rotation.set(tile.rot.x * (1 - form), tile.rot.y * (1 - form), tile.rot.z * (1 - form));
        const endScale = tile.atmo ? 0.02 : tileScale;
        dummy.scale.setScalar(lerp(tile.scatterScale, endScale, form));
        dummy.updateMatrix();
        bucket.mesh.setMatrixAt(tile.index, dummy.matrix);
      }
      bucket.mesh.instanceMatrix.needsUpdate = true;
      const fading = swarmOpacity < 0.995;
      if (bucket.mat.transparent !== fading) {
        bucket.mat.transparent = fading;
        bucket.mat.depthWrite = !fading;
        bucket.mat.needsUpdate = true;
      }
      bucket.mat.opacity = swarmOpacity;
    }

    const pointerHover = state.hover;
    for (const bay of bays) {
      const appear = g;
      bay.mesh.visible = appear > 0.03;
      const hot = bay.id === state.selected || bay.id === pointerHover;
      const targetLift = bay.id === state.selected ? 0.62 : bay.id === pointerHover ? 0.34 : 0;
      bay.lift = damp(bay.lift, targetLift, 8, dt);
      bay.glow = damp(bay.glow, hot ? 0.22 : 0.045, 8, dt);
      if (bay.id !== pointerHover) {
        bay.tiltX = damp(bay.tiltX, 0, 8, dt);
        bay.tiltY = damp(bay.tiltY, 0, 8, dt);
      }
      const a = ease(appear);
      bay.mesh.scale.setScalar(Math.max(0.001, a));
      bay.mesh.position.set(bay.base.x * a, bay.base.y * a, bay.base.z * a + bay.lift);
      bay.mesh.rotation.set(bay.tiltX, bay.rotY + bay.tiltY, 0);
      const dim = state.selected && bay.id !== state.selected ? 0.32 : 1;
      const opacity = dim * Math.min(1, a * 1.15);
      bay.mesh.material.opacity = opacity;
      bay.frame.material.opacity = opacity;
      bay.mesh.material.emissiveIntensity = bay.glow;
      bay.mesh.renderOrder = hot ? 3 : 1;
    }

    if (state.phase === "gallery" && state.hover) {
      const bay = bays.find((item) => item.id === state.hover);
      if (bay) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = state.ndcX;
        pointer.y = state.ndcY;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObject(bay.mesh, false);
        const uv = hits[0]?.uv;
        if (uv) {
          bay.tiltY = damp(bay.tiltY, (uv.x - 0.5) * 0.22, 10, dt);
          bay.tiltX = damp(bay.tiltX, (0.5 - uv.y) * 0.16, 10, dt);
        }
      }
    }

    const positions = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      let y = positions.getY(i) + dt * 0.08;
      if (y > 14) y = -14;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  };

  let last = performance.now();
  raf = requestAnimationFrame(animate);
  if (options.reduced) {
    options.onPhase("gallery");
    options.onProgress(100);
  }

  return {
    sync: (slots) => sync(slots),
    setSelected: (id) => {
      state.selected = id;
    },
    skip: () => {
      state.skip = true;
    },
    replay: () => {
      state.t = 0;
      state.skip = false;
      state.panX = 0;
      state.panY = 0;
      state.velX = 0;
      state.velY = 0;
      state.progress = -1;
      state.phase = "gallery";
      setPhase("intro");
      options.onProgress(0);
    },
    dispose: () => {
      state.running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      swarmGeo.dispose();
      cardGeo.dispose();
      frameGeo.dispose();
      dustGeo.dispose();
      (dust.material as THREE.Material).dispose();
      for (const bucket of buckets) {
        bucket.mat.map?.dispose();
        bucket.mat.dispose();
      }
      for (const bay of bays) {
        bay.mesh.material.map?.dispose();
        bay.mesh.material.dispose();
        bay.frame.material.dispose();
      }
      renderer.dispose();
    },
  };
}
