/**
 * @packageDocumentation
 *
 * Virtual studio camera factory.
 *
 * This module creates the camera setup used to render the procedural studio
 * from multiple broadcast-style viewpoints. It defines the initial camera
 * targets, creates the crane camera rig for CAM1, and creates the remaining
 * tripod-style cameras.
 *
 * @remarks
 *
 * The simulator separates “where a camera is” from “what a camera is looking
 * at”. Each feed has a mutable target vector stored in `cameraTargets`. Manual
 * controls and operator commands modify those target vectors, and the cameras
 * are then pointed at them with `lookAt(...)`.
 *
 * CAM1 is different from the other cameras because it is attached to a
 * {@link THREE.Group | crane rig}. Moving the rig moves the whole crane camera
 * assembly while preserving the camera as a child object.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import type { FeedId } from "../types";
import {
  ASPECT,
  INITIAL_CRANE_POSITION,
  INITIAL_CAMERA_TARGETS,
  INITIAL_CAMERA_FOVS,
} from "../constants";

/**
 * Public API returned by {@link createStudioCameras}.
 *
 * @remarks
 *
 * The main application uses these references to:
 *
 * - render every studio feed into its own render target;
 * - apply manual camera control;
 * - apply virtual operator commands;
 * - reset cameras to their initial positions and framing.
 *
 * @public
 */
export type StudioCamerasApi = {
  /**
   * All virtual studio cameras, keyed by feed identifier.
   *
   * @remarks
   *
   * The keys match the feed identifiers used by the control room monitors and
   * Preview/Programme switching logic.
   */
  studioCameras: Record<FeedId, THREE.PerspectiveCamera>;

  /**
   * Mutable look-at targets for each studio camera.
   *
   * @remarks
   *
   * Camera controls should normally update these vectors rather than directly
   * rotating cameras. The animation loop then calls `camera.lookAt(target)` so
   * the visual framing follows the current target.
   */
  cameraTargets: Record<FeedId, THREE.Vector3>;

  /**
   * Direct reference to the CAM1 crane camera.
   *
   * @remarks
   *
   * CAM1 is also available through `studioCameras.cam1`, but this direct
   * reference is convenient because CAM1 has special crane behaviour.
   */
  cam1: THREE.PerspectiveCamera;

  /**
   * Group used as the movable crane rig for CAM1.
   *
   * @remarks
   *
   * CAM1 is added as a child of this group. Moving the rig changes the crane
   * camera's world position without needing to mutate the camera's local
   * transform directly.
   */
  craneRig: THREE.Group;

  /**
   * Initial crane rig position.
   *
   * @remarks
   *
   * This is a cloned vector that can be used by reset logic without mutating the
   * shared constant from `constants.ts`.
   */
  initialCranePosition: THREE.Vector3;
};

/**
 * Creates a single perspective camera for the studio.
 *
 * @param position - Initial camera position in studio world space.
 * @param target - Initial point the camera should look at.
 * @param fov - Initial field of view in degrees.
 *
 * @returns A configured {@link THREE.PerspectiveCamera}.
 *
 * @remarks
 *
 * This helper is used for the tripod-style cameras. CAM1 is created separately
 * because it is mounted inside a crane rig group.
 *
 * The camera uses the shared broadcast-style {@link ASPECT} ratio so all feeds
 * match the 16:9 monitor textures used in the control room.
 *
 * @example
 *
 * ```ts
 * const cam3 = createStudioCamera(
 *   new THREE.Vector3(-1.7, 1.25, 2.2),
 *   cameraTargets.cam3,
 *   INITIAL_CAMERA_FOVS.cam3,
 * );
 * ```
 *
 * @internal
 */
function createStudioCamera(
  position: THREE.Vector3,
  target: THREE.Vector3,
  fov = 35,
) {
  // Create a perspective camera with the same aspect ratio as the simulator's
  // render targets and control room monitors.
  const camera = new THREE.PerspectiveCamera(fov, ASPECT, 0.1, 100);

  // Copy the supplied position instead of keeping a reference to the input
  // vector. This prevents accidental external mutation of camera state.
  camera.position.copy(position);

  // Aim the camera at its initial target so the first rendered frame is already
  // correctly framed.
  camera.lookAt(target);

  return camera;
}

/**
 * Creates all virtual cameras used to render the studio feeds.
 *
 * @param studioScene - Studio scene where the crane rig should be inserted.
 *
 * @returns A {@link StudioCamerasApi} with cameras, targets and crane rig
 * references.
 *
 * @remarks
 *
 * Four feeds are currently created:
 *
 * - `cam1`: crane camera mounted on a movable rig;
 * - `cam2`: wide/general tripod camera;
 * - `cam3`: left/detail tripod camera;
 * - `cam4`: right/detail tripod camera.
 *
 * The crane rig is added to the studio scene because it is a visible transform
 * parent in the scene graph. The tripod cameras are not added to the scene,
 * because Three.js cameras do not need to be scene children in order to render
 * from them.
 *
 * @example
 *
 * ```ts
 * const {
 *   studioCameras,
 *   cameraTargets,
 *   craneRig,
 * } = createStudioCameras(studio.scene);
 *
 * renderer.setRenderTarget(renderTargets.cam1);
 * renderer.render(studio.scene, studioCameras.cam1);
 * ```
 *
 * @public
 */
export function createStudioCameras(
  studioScene: THREE.Scene,
): StudioCamerasApi {
  // Clone the initial targets so gameplay can freely mutate cameraTargets
  // without altering the shared defaults from constants.ts.
  const cameraTargets: Record<FeedId, THREE.Vector3> = {
    cam1: INITIAL_CAMERA_TARGETS.cam1.clone(),
    cam2: INITIAL_CAMERA_TARGETS.cam2.clone(),
    cam3: INITIAL_CAMERA_TARGETS.cam3.clone(),
    cam4: INITIAL_CAMERA_TARGETS.cam4.clone(),
  };

  // CAM1 is created manually because it is mounted on the crane rig rather than
  // being used as a standalone tripod camera.
  const cam1 = new THREE.PerspectiveCamera(
    INITIAL_CAMERA_FOVS.cam1,
    ASPECT,
    0.1,
    100,
  );

  // The crane rig is a movable parent object. The main input loop moves this
  // group to simulate crane movement.
  const craneRig = new THREE.Group();

  // Start the crane at its configured default position.
  craneRig.position.copy(INITIAL_CRANE_POSITION);

  // Attach CAM1 to the rig so moving the rig moves the crane camera.
  craneRig.add(cam1);

  // Add the rig to the studio scene graph. This ensures the camera inherits the
  // rig transform correctly.
  studioScene.add(craneRig);

  // Aim CAM1 at its initial target before the first render.
  cam1.lookAt(cameraTargets.cam1);

  // Create the full feed-to-camera map. CAM1 is the crane camera; the remaining
  // cameras are fixed-position tripod-style cameras.
  const studioCameras: Record<FeedId, THREE.PerspectiveCamera> = {
    cam1,

    // CAM2 acts as the safe wide/general shot of the studio.
    cam2: createStudioCamera(
      new THREE.Vector3(0, 1.35, 4.2),
      cameraTargets.cam2,
      INITIAL_CAMERA_FOVS.cam2,
    ),

    // CAM3 is positioned to the left and aimed for detail shots.
    cam3: createStudioCamera(
      new THREE.Vector3(-1.7, 1.25, 2.2),
      cameraTargets.cam3,
      INITIAL_CAMERA_FOVS.cam3,
    ),

    // CAM4 is positioned to the right and aimed for detail shots.
    cam4: createStudioCamera(
      new THREE.Vector3(1.7, 1.25, 2.2),
      cameraTargets.cam4,
      INITIAL_CAMERA_FOVS.cam4,
    ),
  };

  // Return direct references needed by the main loop and reset logic.
  return {
    studioCameras,
    cameraTargets,
    cam1,
    craneRig,
    initialCranePosition: INITIAL_CRANE_POSITION.clone(),
  };
}
