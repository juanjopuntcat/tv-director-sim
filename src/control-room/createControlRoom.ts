/**
 * @packageDocumentation
 *
 * Creates and manages the procedural 3D control room scene.
 *
 * This module owns the control room world: monitor wall, Preview and Programme
 * monitors, physical mixer buttons, tally lights, raycast-based interaction and
 * viewport resizing.
 *
 * @remarks
 *
 * The control room is intentionally separated from the studio scene. The studio
 * scene is rendered into {@link THREE.WebGLRenderTarget | render targets}, and
 * this module maps those render target textures onto monitor meshes.
 *
 * The module does not own the global game state. Instead, it receives the
 * current Preview and Programme feeds as initial values, exposes setters to
 * update the visual state, and calls callbacks when the player interacts with
 * control room buttons.
 *
 * The game output uses a fixed 16:9 aspect ratio. The browser canvas may be
 * letterboxed or pillarboxed inside the page, so click handling must calculate
 * pointer coordinates relative to the actual canvas rectangle rather than the
 * full browser window.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import type { FeedId } from "../types";
import { FEEDS } from "../constants";
import { createMonitor } from "./createMonitor";
import { createButton } from "./createButton";

/**
 * Fixed aspect ratio used by the final control room camera.
 *
 * @remarks
 *
 * The final game canvas is rendered internally at 1920x1080, so the control
 * room camera must also use a 16:9 projection. The browser viewport can have a
 * different shape, but the canvas is scaled externally with letterbox or
 * pillarbox bars.
 *
 * @internal
 */
const CONTROL_ROOM_ASPECT_RATIO = 16 / 9;

/**
 * Configuration required to create a control room instance.
 *
 * @remarks
 *
 * The control room needs access to the render targets created by the main
 * application because their textures are used as the live monitor feeds.
 *
 * Interaction callbacks are provided by the main application so this module can
 * remain focused on the visual and input representation of the control room
 * instead of owning the full game state.
 *
 * @public
 */
type ControlRoomOptions = {
  /**
   * Render targets containing the latest rendered image for each studio feed.
   *
   * @remarks
   *
   * Each render target texture is mapped onto a corresponding monitor in the
   * control room.
   */
  renderTargets: Record<FeedId, THREE.WebGLRenderTarget>;

  /**
   * Feed initially shown on the Preview monitor.
   */
  previewFeed: FeedId;

  /**
   * Feed initially shown on the Programme monitor.
   */
  programFeed: FeedId;

  /**
   * Called when the player presses a camera selection button.
   *
   * @param feed - Feed selected for Preview.
   */
  onSelectPreview: (feed: FeedId) => void;

  /**
   * Called when the player presses the CUT button.
   */
  onCut: () => void;
};

/**
 * Public API returned by {@link createControlRoom}.
 *
 * @remarks
 *
 * The main application uses this API to render the control room, update its
 * Preview/Programme state, forward mouse clicks and keep the camera projection
 * in sync with the fixed game aspect ratio.
 *
 * @public
 */
export type ControlRoomApi = {
  /**
   * Three.js scene containing all control room objects.
   */
  scene: THREE.Scene;

  /**
   * Camera used to render the control room to the browser canvas.
   */
  camera: THREE.PerspectiveCamera;

  /**
   * Updates the Preview monitor to show a different feed.
   *
   * @param feed - Feed to display in Preview.
   */
  setPreviewFeed: (feed: FeedId) => void;

  /**
   * Updates the Programme monitor to show a different feed.
   *
   * @param feed - Feed to display in Programme.
   */
  setProgramFeed: (feed: FeedId) => void;

  /**
   * Handles a mouse click against the control room scene.
   *
   * @param event - Browser mouse event to convert into a Three.js raycast.
   * @param canvas - Renderer canvas currently displaying the game.
   *
   * @remarks
   *
   * The canvas may not cover the whole browser window because the game uses
   * letterboxing or pillarboxing. The canvas parameter is therefore required so
   * pointer coordinates can be calculated relative to the visible game area.
   */
  handleClick: (event: MouseEvent, canvas: HTMLCanvasElement) => void;

  /**
   * Recalculates the control room camera projection after viewport changes.
   */
  resize: () => void;
};

/**
 * Creates a complete procedural control room.
 *
 * @param options - Initial state, feed textures and interaction callbacks.
 *
 * @returns A {@link ControlRoomApi} used by the main application loop.
 *
 * @remarks
 *
 * The generated control room contains:
 *
 * - four source feed monitors;
 * - a Preview monitor;
 * - a Programme monitor;
 * - physical buttons for feed selection;
 * - a CUT button;
 * - red/green tally state;
 * - a simple desk surface;
 * - a camera and lights.
 *
 * The control room is self-contained visually, but it deliberately delegates
 * game-state changes through callbacks.
 *
 * @example
 *
 * ```ts
 * const controlRoom = createControlRoom({
 *   renderTargets,
 *   previewFeed: "cam1",
 *   programFeed: "cam2",
 *   onSelectPreview: (feed) => selectPreview(feed),
 *   onCut: () => cutToProgram(),
 * });
 *
 * renderer.render(controlRoom.scene, controlRoom.camera);
 * ```
 *
 * @public
 */
export function createControlRoom(options: ControlRoomOptions): ControlRoomApi {
  /**
   * Local copy of the feed currently displayed in Preview.
   *
   * @remarks
   *
   * This value mirrors the external game state. It is updated through
   * {@link ControlRoomApi.setPreviewFeed}.
   */
  let previewFeed = options.previewFeed;

  /**
   * Local copy of the feed currently displayed in Programme.
   *
   * @remarks
   *
   * This value mirrors the external game state. It is updated through
   * {@link ControlRoomApi.setProgramFeed}.
   */
  let programFeed = options.programFeed;

  // Root scene for the control room. This is the final scene rendered to the
  // browser canvas after all studio feed textures have been updated.
  const scene = new THREE.Scene();

  // Dark background matching the control room aesthetic and blending with the
  // page-level letterbox/pillarbox bars.
  scene.background = new THREE.Color(0x08080c);

  // Soft ambient light so monitors, desk and buttons remain visible.
  const controlAmbient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(controlAmbient);

  // Main practical light for the control room. This gives the desk and buttons
  // simple three-dimensional definition.
  const controlLight = new THREE.PointLight(0xffffff, 1.2, 10);
  controlLight.position.set(0, 3, 2);
  scene.add(controlLight);

  // Camera used for the final control room render. It uses a fixed 16:9 aspect
  // ratio because the game canvas is letterboxed/pillarboxed externally.
  const camera = new THREE.PerspectiveCamera(
    45,
    CONTROL_ROOM_ASPECT_RATIO,
    0.1,
    100,
  );

  // Position the camera in front of the monitor wall, looking slightly upwards
  // towards the main control room display area.
  camera.position.set(0, 2.2, 6.5);
  camera.lookAt(0, 1.25, 0);

  /**
   * Objects that can be hit by the control room raycaster.
   *
   * @remarks
   *
   * Buttons expose a specific mesh as their clickable object. Only those meshes
   * are registered here, not the full button groups.
   */
  const clickableObjects: THREE.Object3D[] = [];

  /**
   * Action associated with each clickable raycast object.
   *
   * @remarks
   *
   * The raycaster returns a Three.js object. This map translates that object
   * back into a game action such as selecting a Preview feed or cutting to
   * Programme.
   */
  const objectActions = new Map<THREE.Object3D, () => void>();

  // Raycaster used to turn mouse clicks into interactions with 3D mixer buttons.
  const raycaster = new THREE.Raycaster();

  // Normalised device coordinates used by the raycaster.
  const mouse = new THREE.Vector2();

  // Default inactive monitor frame material.
  const frameDefaultMaterial = new THREE.MeshStandardMaterial({
    color: 0x111111,
  });

  // Green tally material used for Preview.
  const framePreviewMaterial = new THREE.MeshStandardMaterial({
    color: 0x00aa44,
    emissive: 0x003311,
  });

  // Red tally material used for Programme.
  const frameProgramMaterial = new THREE.MeshStandardMaterial({
    color: 0xaa0000,
    emissive: 0x330000,
  });

  /**
   * Monitor frame meshes keyed by feed or special monitor name.
   *
   * @remarks
   *
   * Frames are stored separately so their material can be swapped to show tally
   * state without rebuilding the monitors.
   */
  const monitorFrames: Record<FeedId | "preview" | "program", THREE.Mesh> =
    {} as Record<FeedId | "preview" | "program", THREE.Mesh>;

  /**
   * Registers a 3D button with the control room scene and click handling map.
   *
   * @param button - Full visual button group to add to the scene.
   * @param clickableObject - Mesh to use for raycast hit detection.
   * @param action - Function executed when the clickable object is hit.
   *
   * @remarks
   *
   * This helper keeps button scene insertion and interaction registration in one
   * place. Button factories do not need to know what action they perform.
   *
   * @internal
   */
  function registerButton(
    button: THREE.Group,
    clickableObject: THREE.Object3D,
    action: () => void,
  ) {
    // Store the mesh that should be tested by the raycaster.
    clickableObjects.push(clickableObject);

    // Associate the raycast target with the action it should trigger.
    objectActions.set(clickableObject, action);

    // Add the full visual button group to the control room scene.
    scene.add(button);
  }

  // Create the four source feed monitors along the top row.
  FEEDS.forEach((feed, index) => {
    const monitor = createMonitor(
      feed.toUpperCase(),
      options.renderTargets[feed].texture,
      1.35,
      0.76,
      frameDefaultMaterial,
    );

    // Spread monitors horizontally across the upper monitor wall.
    monitor.position.set(-2.55 + index * 1.7, 2.15, -1.5);
    scene.add(monitor);

    // Store the frame mesh so tally materials can be updated later.
    monitorFrames[feed] = monitor.children[0] as THREE.Mesh;
  });

  // Create the larger Preview monitor.
  const previewMonitor = createMonitor(
    "PREVIEW",
    options.renderTargets[previewFeed].texture,
    2.2,
    1.24,
    frameDefaultMaterial,
  );

  // Place Preview on the lower-left side of the monitor wall.
  previewMonitor.position.set(-1.35, 0.95, -1.5);
  scene.add(previewMonitor);

  // Store the Preview frame for fixed green tally styling.
  monitorFrames.preview = previewMonitor.children[0] as THREE.Mesh;

  // Create the larger Programme monitor.
  const programMonitor = createMonitor(
    "PROGRAM",
    options.renderTargets[programFeed].texture,
    2.2,
    1.24,
    frameDefaultMaterial,
  );

  // Place Programme on the lower-right side of the monitor wall.
  programMonitor.position.set(1.35, 0.95, -1.5);
  scene.add(programMonitor);

  // Store the Programme frame for fixed red tally styling.
  monitorFrames.program = programMonitor.children[0] as THREE.Mesh;

  // Basic control desk surface. This gives the buttons a physical base and
  // makes the room feel like a real production gallery.
  const deskRoom = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.35, 1.4),
    new THREE.MeshStandardMaterial({ color: 0x181820 }),
  );
  deskRoom.position.set(0, -0.15, 0.35);
  scene.add(deskRoom);

  // Create numbered camera selection buttons.
  FEEDS.forEach((feed, index) => {
    const { group: button, clickableObject } = createButton(String(index + 1));

    // Arrange camera buttons in a row on the desk.
    button.position.set(-1.65 + index * 0.75, 0.12, 0.35);

    // Selecting a camera sends that feed to Preview.
    registerButton(button, clickableObject, () => {
      options.onSelectPreview(feed);
    });
  });

  // Create the CUT button separately because it triggers Programme switching
  // rather than selecting a Preview source.
  const { group: cutButton, clickableObject: cutClickableObject } =
    createButton("CUT");

  // Place the CUT button to the right of the camera selection buttons.
  cutButton.position.set(1.9, 0.12, 0.35);

  // Cutting sends the current Preview feed to Programme.
  registerButton(cutButton, cutClickableObject, () => {
    options.onCut();
  });

  /**
   * Updates the textures shown on the Preview and Programme monitors.
   *
   * @remarks
   *
   * Source monitors always display their corresponding render target texture.
   * Preview and Programme are dynamic views and need to be refreshed whenever
   * the selected feed changes.
   *
   * @internal
   */
  function updatePreviewProgramMaterials() {
    // The monitor factory returns children in a fixed order:
    // 0 = frame, 1 = screen, 2 = label.
    const previewScreen = previewMonitor.children[1] as THREE.Mesh;
    const programScreen = programMonitor.children[1] as THREE.Mesh;

    // Preview and Programme screens use MeshBasicMaterial because they display
    // render target textures directly.
    const previewMaterial = previewScreen.material as THREE.MeshBasicMaterial;
    const programMaterial = programScreen.material as THREE.MeshBasicMaterial;

    // Swap the textures to the currently selected feeds.
    previewMaterial.map = options.renderTargets[previewFeed].texture;
    programMaterial.map = options.renderTargets[programFeed].texture;

    // Mark both materials as needing an update so Three.js refreshes the maps.
    previewMaterial.needsUpdate = true;
    programMaterial.needsUpdate = true;

    // Updating the displayed feeds may also change which source monitor gets
    // the green or red tally frame.
    updateTallies();
  }

  /**
   * Updates monitor frame tally colours.
   *
   * @remarks
   *
   * Tally convention used by the simulator:
   *
   * - red: feed is live on Programme;
   * - green: feed is selected in Preview;
   * - dark/default: feed is neither Preview nor Programme.
   *
   * The dedicated Preview and Programme monitors are always shown with their
   * fixed tally colours.
   *
   * @internal
   */
  function updateTallies() {
    // Update the tally state on the four source feed monitors.
    for (const feed of FEEDS) {
      const frame = monitorFrames[feed];

      // Defensive guard in case monitor creation changes later.
      if (!frame) continue;

      if (feed === programFeed) {
        // Programme has priority if a feed is both Preview and Programme.
        frame.material = frameProgramMaterial;
      } else if (feed === previewFeed) {
        frame.material = framePreviewMaterial;
      } else {
        frame.material = frameDefaultMaterial;
      }
    }

    // Dedicated Preview monitor always has a green frame.
    if (monitorFrames.preview) {
      monitorFrames.preview.material = framePreviewMaterial;
    }

    // Dedicated Programme monitor always has a red frame.
    if (monitorFrames.program) {
      monitorFrames.program.material = frameProgramMaterial;
    }
  }

  /**
   * Sets the feed displayed on the Preview monitor.
   *
   * @param feed - Feed to display in Preview.
   *
   * @remarks
   *
   * This updates the control room's local Preview state and refreshes both the
   * Preview texture and tally frames.
   */
  function setPreviewFeed(feed: FeedId) {
    previewFeed = feed;
    updatePreviewProgramMaterials();
  }

  /**
   * Sets the feed displayed on the Programme monitor.
   *
   * @param feed - Feed to display in Programme.
   *
   * @remarks
   *
   * This updates the control room's local Programme state and refreshes both the
   * Programme texture and tally frames.
   */
  function setProgramFeed(feed: FeedId) {
    programFeed = feed;
    updatePreviewProgramMaterials();
  }

  /**
   * Processes a browser mouse click as a control room interaction.
   *
   * @param event - Mouse event received from the browser window.
   * @param canvas - Renderer canvas currently displaying the game.
   *
   * @remarks
   *
   * The game canvas may be letterboxed or pillarboxed inside the browser
   * viewport. Because of that, pointer coordinates must be calculated relative
   * to the canvas rectangle instead of the full window.
   *
   * Clicks that land inside the black bars are ignored.
   */
  function handleClick(event: MouseEvent, canvas: HTMLCanvasElement) {
    // Get the visible canvas rectangle in browser viewport coordinates.
    const rect = canvas.getBoundingClientRect();

    // Ignore clicks that fall outside the actual game canvas. These are clicks
    // on letterbox or pillarbox bars.
    const isOutsideCanvas =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom;

    if (isOutsideCanvas) {
      return;
    }

    // Convert mouse position from browser coordinates into normalised device
    // coordinates relative to the canvas.
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Cast a ray through the control room camera into the 3D scene.
    raycaster.setFromCamera(mouse, camera);

    // Check only registered clickable button meshes.
    const hits = raycaster.intersectObjects(clickableObjects);

    // Trigger the action associated with the nearest hit object.
    if (hits.length > 0) {
      const action = objectActions.get(hits[0].object);
      action?.();
    }
  }

  /**
   * Updates the control room render camera after a viewport resize.
   *
   * @remarks
   *
   * The game uses a fixed 16:9 internal render aspect ratio. The browser
   * viewport may be wider or taller, but the canvas is letterboxed or
   * pillarboxed externally by CSS sizing in `main.ts`.
   *
   * This function intentionally does not read `window.innerWidth` or
   * `window.innerHeight`, because doing so would distort the control room
   * projection on non-16:9 windows.
   */
  function resize() {
    camera.aspect = CONTROL_ROOM_ASPECT_RATIO;
    camera.updateProjectionMatrix();
  }

  // Apply the initial tally state before returning the API.
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
