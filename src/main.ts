/**
 * @packageDocumentation
 *
 * Main application entry point for the 3D Television Production Simulator.
 *
 * This module bootstraps the browser application, creates the Three.js renderer,
 * wires the studio and control room scenes together, registers global input
 * handlers, and runs the animation loop.
 *
 * @remarks
 *
 * The simulator renders two different 3D worlds:
 *
 * - the studio scene, rendered once per virtual camera feed;
 * - the control room scene, rendered once to the final browser canvas.
 *
 * The studio camera feeds are first rendered into WebGL render targets. Those
 * render target textures are then displayed on the monitors inside the control
 * room.
 *
 * The final game output is rendered internally at a fixed 1920x1080 resolution.
 * The canvas is then scaled with CSS while preserving 16:9 aspect ratio. This
 * creates letterbox or pillarbox bars when the browser window does not match
 * the game aspect ratio.
 *
 * @license AGPL-3.0
 */

import "./style.css";
import * as THREE from "three";

import type { FeedId, OperatorCommand } from "./types";
import {
  FEEDS,
  INITIAL_CAMERA_FOVS,
  INITIAL_CAMERA_TARGETS,
} from "./constants";
import { createHelpOverlay } from "./ui/helpOverlay";
import { createOrientationOverlay } from "./ui/orientationOverlay";
import { createStudio } from "./studio/createStudio";
import { createStudioCameras } from "./studio/createStudioCameras";
import { sendOperatorCommand } from "./game/operators";
import { createControlRoom } from "./control-room/createControlRoom";

/**
 * Internal render width for the final game output.
 *
 * @remarks
 *
 * This is the real WebGL drawing buffer width used for the control room render.
 * The canvas can still be displayed at a different CSS size depending on the
 * browser viewport.
 */
const GAME_RENDER_WIDTH = 1920;

/**
 * Internal render height for the final game output.
 *
 * @remarks
 *
 * Together with {@link GAME_RENDER_WIDTH}, this defines a Full HD 16:9 final
 * render target for the game canvas.
 */
const GAME_RENDER_HEIGHT = 1080;

/**
 * Fixed aspect ratio for the final game canvas.
 *
 * @remarks
 *
 * The simulator is designed around a 16:9 television/control room layout. The
 * browser window may be wider or taller, but the rendered game area should keep
 * this aspect ratio to avoid stretching the scene.
 */
const GAME_ASPECT_RATIO = GAME_RENDER_WIDTH / GAME_RENDER_HEIGHT;

/**
 * Internal render width for each virtual studio camera feed.
 *
 * @remarks
 *
 * These render targets are used as textures on the control room monitors.
 * Keeping them at Full HD makes the monitor feeds sharper.
 */
const FEED_RENDER_WIDTH = 1920;

/**
 * Internal render height for each virtual studio camera feed.
 *
 * @remarks
 *
 * Together with {@link FEED_RENDER_WIDTH}, this gives each studio camera feed a
 * 16:9 Full HD render target.
 */
const FEED_RENDER_HEIGHT = 1080;

/**
 * Root DOM element used as the application mount point.
 *
 * @remarks
 *
 * Vite's default HTML template contains an element matching `#app`. The WebGL
 * canvas is appended directly to this element.
 */
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App container not found");
}

/**
 * Main WebGL renderer used for all render passes.
 *
 * @remarks
 *
 * The same renderer is reused to:
 *
 * 1. render every studio camera feed into its own render target;
 * 2. render the control room scene to the browser canvas.
 */
const renderer = new THREE.WebGLRenderer({ antialias: true });

// The final game output is always rendered internally at 1920x1080.
renderer.setSize(GAME_RENDER_WIDTH, GAME_RENDER_HEIGHT, false);

// Keep the drawing buffer exactly at the configured Full HD resolution. This
// avoids accidentally rendering at 4K on high-DPI displays.
renderer.setPixelRatio(1);

// The CSS size is managed manually so the canvas can be letterboxed or
// pillarboxed while preserving the fixed 16:9 game aspect ratio.
renderer.domElement.style.display = "block";

app.appendChild(renderer.domElement);

/**
 * Updates the displayed CSS size of the canvas while preserving 16:9.
 *
 * @remarks
 *
 * This function does not change the internal WebGL render resolution. It only
 * changes how large the canvas appears inside the browser window.
 *
 * Behaviour:
 *
 * - if the viewport is wider than 16:9, the canvas uses full height and gets
 *   pillarbox bars on the sides;
 * - if the viewport is taller than 16:9, the canvas uses full width and gets
 *   letterbox bars at the top and bottom.
 */
function updateCanvasDisplaySize() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const viewportAspectRatio = viewportWidth / viewportHeight;

  let canvasWidth: number;
  let canvasHeight: number;

  if (viewportAspectRatio > GAME_ASPECT_RATIO) {
    // Viewport is wider than the game. Fit by height and leave side bars.
    canvasHeight = viewportHeight;
    canvasWidth = canvasHeight * GAME_ASPECT_RATIO;
  } else {
    // Viewport is taller than the game. Fit by width and leave top/bottom bars.
    canvasWidth = viewportWidth;
    canvasHeight = canvasWidth / GAME_ASPECT_RATIO;
  }

  renderer.domElement.style.width = `${canvasWidth}px`;
  renderer.domElement.style.height = `${canvasHeight}px`;
}

// Set the initial CSS display size immediately after the renderer is mounted.
updateCanvasDisplaySize();

/**
 * Help overlay containing the keyboard and mouse control reference.
 *
 * @see createHelpOverlay
 */
const helpOverlay = createHelpOverlay();

/**
 * Orientation overlay shown on touch devices when the viewport is portrait.
 *
 * @see createOrientationOverlay
 */
const orientationOverlay = createOrientationOverlay();

/**
 * Feed currently loaded into the Preview monitor.
 *
 * @remarks
 *
 * Preview is the camera/feed the player is preparing before cutting it to
 * Programme.
 */
let previewFeed: FeedId = "cam1";

/**
 * Feed currently visible on the Programme monitor.
 *
 * @remarks
 *
 * Programme represents the live output currently being broadcast.
 */
let programFeed: FeedId = "cam2";

/**
 * Active virtual operator commands, keyed by feed identifier.
 *
 * @remarks
 *
 * A command represents an instruction sent to a virtual camera operator. During
 * the animation loop, the relevant camera target and FOV are interpolated
 * towards the command's desired framing.
 */
const operatorCommands: Partial<Record<FeedId, OperatorCommand>> = {};

/**
 * Set of currently pressed keyboard keys.
 *
 * @remarks
 *
 * Continuous inputs such as crane movement and tripod pan/tilt are stored here
 * on `keydown`, removed on `keyup`, and applied every animation frame.
 */
const pressedKeys = new Set<string>();

/**
 * Procedural studio scene and subject references.
 *
 * @see createStudio
 */
const studio = createStudio();

/**
 * Three.js scene containing the studio set.
 */
const studioScene = studio.scene;

/**
 * Main procedural studio subjects.
 *
 * @remarks
 *
 * These groups currently receive simple placeholder animation in the main loop.
 */
const { host, guestA, guestB } = studio;

/**
 * Virtual studio cameras, mutable camera targets and crane rig.
 *
 * @see createStudioCameras
 */
const studioCameraApi = createStudioCameras(studioScene);

/**
 * References used by rendering, camera controls and reset logic.
 */
const { studioCameras, cameraTargets, cam1, craneRig } = studioCameraApi;

/**
 * Render targets used to generate the live texture for each studio camera feed.
 *
 * @remarks
 *
 * Each virtual camera renders the same studio scene from a different viewpoint.
 * The resulting texture is mapped onto a monitor in the control room.
 */
const renderTargets: Record<FeedId, THREE.WebGLRenderTarget> = {
  cam1: new THREE.WebGLRenderTarget(FEED_RENDER_WIDTH, FEED_RENDER_HEIGHT),
  cam2: new THREE.WebGLRenderTarget(FEED_RENDER_WIDTH, FEED_RENDER_HEIGHT),
  cam3: new THREE.WebGLRenderTarget(FEED_RENDER_WIDTH, FEED_RENDER_HEIGHT),
  cam4: new THREE.WebGLRenderTarget(FEED_RENDER_WIDTH, FEED_RENDER_HEIGHT),
};

/**
 * Control room API.
 *
 * @remarks
 *
 * This variable is declared before initialisation because the control room
 * receives callbacks that call helper functions which reference the control
 * room API.
 */
let controlRoom: ReturnType<typeof createControlRoom>;

/**
 * Selects a feed as the current Preview source.
 *
 * @param feed - Feed to place in Preview.
 *
 * @remarks
 *
 * This updates both the local game state and the visual Preview monitor inside
 * the control room.
 */
function selectPreview(feed: FeedId) {
  previewFeed = feed;
  controlRoom.setPreviewFeed(feed);
}

/**
 * Cuts the current Preview feed to Programme.
 *
 * @remarks
 *
 * This emulates a basic vision mixer CUT operation: the source currently loaded
 * in Preview becomes the live Programme output.
 */
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

/**
 * Resets the specified camera to its initial framing.
 *
 * @param feed - Feed/camera to reset.
 *
 * @remarks
 *
 * Resetting restores:
 *
 * - the camera target;
 * - the camera field of view;
 * - the crane rig position, when resetting CAM1;
 * - any active operator command for that feed.
 */
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

/**
 * Handles mouse clicks on the control room scene.
 *
 * @remarks
 *
 * Clicks are ignored while the help overlay is open. Otherwise, the event is
 * delegated to the control room module.
 *
 * The renderer canvas is passed to the control room so raycasting can calculate
 * mouse coordinates relative to the real canvas rectangle. This is necessary
 * because the page may contain letterbox or pillarbox bars.
 */
window.addEventListener("click", (event) => {
  if (helpOverlay.isOpen()) {
    return;
  }

  controlRoom.handleClick(event, renderer.domElement);
});

/**
 * Handles global keyboard input.
 *
 * @remarks
 *
 * Discrete actions such as selecting Preview, cutting to Programme, resetting a
 * camera, opening help and sending operator commands are handled immediately.
 *
 * Continuous actions such as crane movement and tripod pan/tilt are stored in
 * {@link pressedKeys} and applied during the animation loop.
 */
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

/**
 * Removes released keys from the continuous input state.
 */
window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
});

/**
 * Handles zooming for the current Preview camera.
 *
 * @remarks
 *
 * The mouse wheel adjusts the camera field of view. Lower FOV values create a
 * tighter shot, while higher FOV values create a wider shot.
 *
 * Manual zooming cancels any active operator command for the Preview camera
 * because the player is taking direct control.
 */
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

/**
 * Elapsed simulation time in seconds.
 *
 * @remarks
 *
 * Currently used only for simple placeholder character animation.
 */
let time = 0;

/**
 * Main animation and render loop.
 *
 * @remarks
 *
 * Every frame performs the following steps:
 *
 * 1. update simple studio character animation;
 * 2. apply manual camera controls;
 * 3. apply active virtual operator commands;
 * 4. render each studio camera feed into its render target;
 * 5. render the control room to the browser canvas.
 */
function animate() {
  requestAnimationFrame(animate);

  const delta = 0.016;

  time += delta;

  // Subtle placeholder subject animation. This makes the studio feel alive even
  // before proper character animation exists.
  host.rotation.y = Math.sin(time * 2) * 0.08;
  guestA.rotation.y = Math.sin(time * 1.4 + 1) * 0.06;
  guestB.rotation.y = Math.sin(time * 1.7 + 2) * 0.06;

  // Manual crane control for CAM1.
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

  // CAM1 is mounted on the crane rig, so it is re-aimed every frame after the
  // rig may have moved.
  cam1.lookAt(cameraTargets.cam1);

  // Manual pan/tilt control for tripod cameras.
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

  // Apply active virtual operator commands.
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

  // Render all studio camera feeds into their monitor textures.
  for (const feed of FEEDS) {
    renderer.setRenderTarget(renderTargets[feed]);
    renderer.render(studioScene, studioCameras[feed]);
  }

  // Render final control room scene to the browser canvas.
  renderer.setRenderTarget(null);
  renderer.render(controlRoom.scene, controlRoom.camera);
}

animate();

/**
 * Keeps the canvas display size, control room camera and orientation overlay in
 * sync with the browser viewport.
 *
 * @remarks
 *
 * The internal render resolution stays fixed at 1920x1080. Only the CSS display
 * size of the canvas changes on resize.
 */
window.addEventListener("resize", () => {
  controlRoom.resize();
  updateCanvasDisplaySize();
  orientationOverlay.update();
});
