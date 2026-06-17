import "./style.css";
import * as THREE from "three";

import type { FeedId, OperatorCommand } from "./types";
import {
  FEEDS,
  INITIAL_CAMERA_FOVS,
  INITIAL_CAMERA_TARGETS,
} from "./constants";
import { createHelpOverlay } from "./ui/helpOverlay";
import { createStudio } from "./studio/createStudio";
import { createStudioCameras } from "./studio/createStudioCameras";
import { sendOperatorCommand } from "./game/operators";
import { createControlRoom } from "./control-room/createControlRoom";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container not found");
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

// ---------- Help overlay ----------

const helpOverlay = createHelpOverlay();

// ---------- Shared state ----------

let previewFeed: FeedId = "cam1";
let programFeed: FeedId = "cam2";

const operatorCommands: Partial<Record<FeedId, OperatorCommand>> = {};

const pressedKeys = new Set<string>();

// ---------- Studio ----------

const studio = createStudio();

const studioScene = studio.scene;
const { host, guestA, guestB } = studio;

const studioCameraApi = createStudioCameras(studioScene);

const { studioCameras, cameraTargets, cam1, craneRig } = studioCameraApi;

// ---------- Render targets ----------

const renderTargets: Record<FeedId, THREE.WebGLRenderTarget> = {
  cam1: new THREE.WebGLRenderTarget(640, 360),
  cam2: new THREE.WebGLRenderTarget(640, 360),
  cam3: new THREE.WebGLRenderTarget(640, 360),
  cam4: new THREE.WebGLRenderTarget(640, 360),
};

// ---------- Control room ----------

let controlRoom: ReturnType<typeof createControlRoom>;

function selectPreview(feed: FeedId) {
  previewFeed = feed;
  controlRoom.setPreviewFeed(feed);
}

function cutToProgram() {
  programFeed = previewFeed;
  controlRoom.setProgramFeed(programFeed);
}

controlRoom = createControlRoom({
  renderTargets,
  previewFeed,
  programFeed,
  onSelectPreview: selectPreview,
  onCut: cutToProgram,
});

// ---------- Camera helpers ----------

function resetCamera(feed: FeedId) {
  cameraTargets[feed].copy(INITIAL_CAMERA_TARGETS[feed]);

  const camera = studioCameras[feed];
  camera.fov = INITIAL_CAMERA_FOVS[feed];
  camera.updateProjectionMatrix();

  if (feed === "cam1") {
    craneRig.position.copy(studioCameraApi.initialCranePosition);
    cam1.lookAt(cameraTargets.cam1);
  } else {
    camera.lookAt(cameraTargets[feed]);
  }

  delete operatorCommands[feed];
}

// ---------- Mouse interaction ----------

window.addEventListener("click", (event) => {
  if (helpOverlay.isOpen()) {
    return;
  }

  controlRoom.handleClick(event);
});

// ---------- Keyboard interaction ----------

window.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" ||
    event.code === "ArrowLeft" ||
    event.code === "ArrowRight" ||
    event.code === "ArrowUp" ||
    event.code === "ArrowDown" ||
    event.code === "KeyA" ||
    event.code === "KeyD" ||
    event.code === "KeyW" ||
    event.code === "KeyS" ||
    event.code === "KeyR" ||
    event.code === "KeyH" ||
    event.code === "KeyJ" ||
    event.code === "KeyK" ||
    event.code === "KeyG" ||
    event.code === "F1" ||
    event.code === "Slash" ||
    event.code === "Escape"
  ) {
    event.preventDefault();
  }

  if (event.code === "F1" || event.key === "?") {
    helpOverlay.toggle();
    return;
  }

  if (event.code === "Escape") {
    helpOverlay.setOpen(false);
    return;
  }

  if (helpOverlay.isOpen()) {
    return;
  }

  pressedKeys.add(event.code);

  if (event.key === "1") {
    selectPreview("cam1");
  }

  if (event.key === "2") {
    selectPreview("cam2");
  }

  if (event.key === "3") {
    selectPreview("cam3");
  }

  if (event.key === "4") {
    selectPreview("cam4");
  }

  if (event.code === "Space") {
    cutToProgram();
  }

  if (event.code === "KeyR") {
    resetCamera(previewFeed);
  }

  if (event.code === "KeyH") {
    sendOperatorCommand(operatorCommands, previewFeed, "host");
  }

  if (event.code === "KeyJ") {
    sendOperatorCommand(operatorCommands, previewFeed, "guestA");
  }

  if (event.code === "KeyK") {
    sendOperatorCommand(operatorCommands, previewFeed, "guestB");
  }

  if (event.code === "KeyG") {
    sendOperatorCommand(operatorCommands, previewFeed, "wide");
  }
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});

window.addEventListener("wheel", (event) => {
  if (helpOverlay.isOpen()) {
    return;
  }

  const camera = studioCameras[previewFeed];

  const zoomDirection = event.deltaY > 0 ? 1 : -1;

  camera.fov += zoomDirection * 2;
  camera.fov = THREE.MathUtils.clamp(camera.fov, 18, 60);
  camera.updateProjectionMatrix();

  delete operatorCommands[previewFeed];
});

// ---------- Animation ----------

let time = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = 0.016;

  time += delta;

  host.rotation.y = Math.sin(time * 2) * 0.08;
  guestA.rotation.y = Math.sin(time * 1.4 + 1) * 0.06;
  guestB.rotation.y = Math.sin(time * 1.7 + 2) * 0.06;

  // Manual crane control for CAM1
  if (previewFeed === "cam1") {
    const craneSpeed = 1.6;

    const isManualCraneInput =
      pressedKeys.has("KeyA") ||
      pressedKeys.has("KeyD") ||
      pressedKeys.has("KeyW") ||
      pressedKeys.has("KeyS");

    if (isManualCraneInput) {
      delete operatorCommands.cam1;
    }

    if (pressedKeys.has("KeyA")) craneRig.position.x -= craneSpeed * delta;
    if (pressedKeys.has("KeyD")) craneRig.position.x += craneSpeed * delta;
    if (pressedKeys.has("KeyW")) craneRig.position.y += craneSpeed * delta;
    if (pressedKeys.has("KeyS")) craneRig.position.y -= craneSpeed * delta;

    craneRig.position.x = THREE.MathUtils.clamp(craneRig.position.x, -4, 4);
    craneRig.position.y = THREE.MathUtils.clamp(craneRig.position.y, 1.2, 4);
  }

  cam1.lookAt(cameraTargets.cam1);

  // Manual pan/tilt control for tripod cameras
  if (previewFeed !== "cam1") {
    const activeTarget = cameraTargets[previewFeed];
    const panTiltSpeed = 1.2;

    const isManualTripodInput =
      pressedKeys.has("ArrowLeft") ||
      pressedKeys.has("ArrowRight") ||
      pressedKeys.has("ArrowUp") ||
      pressedKeys.has("ArrowDown");

    if (isManualTripodInput) {
      delete operatorCommands[previewFeed];
    }

    if (pressedKeys.has("ArrowLeft")) activeTarget.x -= panTiltSpeed * delta;
    if (pressedKeys.has("ArrowRight")) activeTarget.x += panTiltSpeed * delta;
    if (pressedKeys.has("ArrowUp")) activeTarget.y += panTiltSpeed * delta;
    if (pressedKeys.has("ArrowDown")) activeTarget.y -= panTiltSpeed * delta;

    activeTarget.x = THREE.MathUtils.clamp(activeTarget.x, -2.5, 2.5);
    activeTarget.y = THREE.MathUtils.clamp(activeTarget.y, 0.5, 2.2);

    studioCameras[previewFeed].lookAt(activeTarget);
  }

  // Apply operator commands
  for (const feed of FEEDS) {
    const command = operatorCommands[feed];

    if (!command) continue;

    const camera = studioCameras[feed];
    const target = cameraTargets[feed];

    target.lerp(command.desiredTarget, 0.04);

    camera.fov = THREE.MathUtils.lerp(camera.fov, command.desiredFov, 0.04);
    camera.updateProjectionMatrix();

    camera.lookAt(target);

    const targetDistance = target.distanceTo(command.desiredTarget);
    const fovDistance = Math.abs(camera.fov - command.desiredFov);

    if (targetDistance < 0.02 && fovDistance < 0.2) {
      delete operatorCommands[feed];
    }
  }

  // Render studio feeds
  for (const feed of FEEDS) {
    renderer.setRenderTarget(renderTargets[feed]);
    renderer.render(studioScene, studioCameras[feed]);
  }

  // Render control room
  renderer.setRenderTarget(null);
  renderer.render(controlRoom.scene, controlRoom.camera);
}

animate();

// ---------- Resize ----------

window.addEventListener("resize", () => {
  controlRoom.resize();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
