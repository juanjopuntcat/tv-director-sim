import * as THREE from "three";
import type { FeedId } from "../types";
import { FEEDS } from "../constants";
import { createMonitor } from "./createMonitor";
import { createButton } from "./createButton";

type ControlRoomOptions = {
  renderTargets: Record<FeedId, THREE.WebGLRenderTarget>;
  previewFeed: FeedId;
  programFeed: FeedId;
  onSelectPreview: (feed: FeedId) => void;
  onCut: () => void;
};

export type ControlRoomApi = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  setPreviewFeed: (feed: FeedId) => void;
  setProgramFeed: (feed: FeedId) => void;
  handleClick: (event: MouseEvent) => void;
  resize: () => void;
};

export function createControlRoom(options: ControlRoomOptions): ControlRoomApi {
  let previewFeed = options.previewFeed;
  let programFeed = options.programFeed;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08080c);

  const controlAmbient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(controlAmbient);

  const controlLight = new THREE.PointLight(0xffffff, 1.2, 10);
  controlLight.position.set(0, 3, 2);
  scene.add(controlLight);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 2.2, 6.5);
  camera.lookAt(0, 1.25, 0);

  const clickableObjects: THREE.Object3D[] = [];
  const objectActions = new Map<THREE.Object3D, () => void>();

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const frameDefaultMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
  });

  const framePreviewMaterial = new THREE.MeshStandardMaterial({
    color: 0x00aa44,
    emissive: 0x003311,
  });

  const frameProgramMaterial = new THREE.MeshStandardMaterial({
    color: 0xaa0000,
    emissive: 0x330000,
  });

  const monitorFrames: Record<FeedId | "preview" | "program", THREE.Mesh> =
    {} as Record<FeedId | "preview" | "program", THREE.Mesh>;

  function registerButton(
    button: THREE.Group,
    clickableObject: THREE.Object3D,
    action: () => void,
  ) {
    clickableObjects.push(clickableObject);
    objectActions.set(clickableObject, action);
    scene.add(button);
  }

  FEEDS.forEach((feed, index) => {
    const monitor = createMonitor(
      feed.toUpperCase(),
      options.renderTargets[feed].texture,
      1.35,
      0.76,
      frameDefaultMaterial,
    );

    monitor.position.set(-2.55 + index * 1.7, 2.15, -1.5);
    scene.add(monitor);

    monitorFrames[feed] = monitor.children[0] as THREE.Mesh;
  });

  const previewMonitor = createMonitor(
    "PREVIEW",
    options.renderTargets[previewFeed].texture,
    2.2,
    1.24,
    frameDefaultMaterial,
  );
  previewMonitor.position.set(-1.35, 0.95, -1.5);
  scene.add(previewMonitor);
  monitorFrames.preview = previewMonitor.children[0] as THREE.Mesh;

  const programMonitor = createMonitor(
    "PROGRAM",
    options.renderTargets[programFeed].texture,
    2.2,
    1.24,
    frameDefaultMaterial,
  );
  programMonitor.position.set(1.35, 0.95, -1.5);
  scene.add(programMonitor);
  monitorFrames.program = programMonitor.children[0] as THREE.Mesh;

  const deskRoom = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.35, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x181820 }),
  );
  deskRoom.position.set(0, -0.15, 0.35);
  scene.add(deskRoom);

  FEEDS.forEach((feed, index) => {
    const { group: button, clickableObject } = createButton(String(index + 1));

    button.position.set(-1.65 + index * 0.75, 0.12, 0.35);

    registerButton(button, clickableObject, () => {
      options.onSelectPreview(feed);
    });
  });

  const { group: cutButton, clickableObject: cutClickableObject } =
    createButton("CUT");

  cutButton.position.set(1.9, 0.12, 0.35);

  registerButton(cutButton, cutClickableObject, () => {
    options.onCut();
  });

  function updatePreviewProgramMaterials() {
    const previewScreen = previewMonitor.children[1] as THREE.Mesh;
    const programScreen = programMonitor.children[1] as THREE.Mesh;

    const previewMaterial = previewScreen.material as THREE.MeshBasicMaterial;
    const programMaterial = programScreen.material as THREE.MeshBasicMaterial;

    previewMaterial.map = options.renderTargets[previewFeed].texture;
    programMaterial.map = options.renderTargets[programFeed].texture;

    previewMaterial.needsUpdate = true;
    programMaterial.needsUpdate = true;

    updateTallies();
  }

  function updateTallies() {
    for (const feed of FEEDS) {
      const frame = monitorFrames[feed];

      if (!frame) continue;

      if (feed === programFeed) {
        frame.material = frameProgramMaterial;
      } else if (feed === previewFeed) {
        frame.material = framePreviewMaterial;
      } else {
        frame.material = frameDefaultMaterial;
      }
    }

    if (monitorFrames.preview) {
      monitorFrames.preview.material = framePreviewMaterial;
    }

    if (monitorFrames.program) {
      monitorFrames.program.material = frameProgramMaterial;
    }
  }

  function setPreviewFeed(feed: FeedId) {
    previewFeed = feed;
    updatePreviewProgramMaterials();
  }

  function setProgramFeed(feed: FeedId) {
    programFeed = feed;
    updatePreviewProgramMaterials();
  }

  function handleClick(event: MouseEvent) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const hits = raycaster.intersectObjects(clickableObjects);

    if (hits.length > 0) {
      const action = objectActions.get(hits[0].object);
      action?.();
    }
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  updateTallies();

  return {
    scene,
    camera,
    setPreviewFeed,
    setProgramFeed,
    handleClick,
    resize,
  };
}
