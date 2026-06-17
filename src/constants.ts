/**
 * @packageDocumentation
 *
 * Shared configuration constants for the 3D Television Production Simulator.
 *
 * This module centralises values that need to be reused by multiple parts of
 * the application, such as feed ordering, camera aspect ratio, default camera
 * targets and initial fields of view.
 *
 * @remarks
 *
 * Keeping these values in one place avoids subtle mismatches between the studio
 * scene, the virtual camera setup, the control room monitor layout and the game
 * logic.
 *
 * The values in this file describe the current MVP camera layout:
 *
 * - `cam1`: crane camera;
 * - `cam2`: wide/general tripod camera;
 * - `cam3`: detail tripod camera;
 * - `cam4`: detail tripod camera.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import type { FeedId } from "./types";

/**
 * Default aspect ratio used by virtual studio cameras.
 *
 * @remarks
 *
 * Broadcast and web video feeds are represented as 16:9 render targets. This
 * value is used when creating {@link THREE.PerspectiveCamera} instances for the
 * studio feeds.
 *
 * @example
 *
 * ```ts
 * const camera = new THREE.PerspectiveCamera(35, ASPECT, 0.1, 100);
 * ```
 *
 * @public
 */
export const ASPECT = 16 / 9;

/**
 * Ordered list of available camera feeds.
 *
 * @remarks
 *
 * The order is used when creating render targets, monitor layouts, keyboard
 * mappings and control room buttons. Keeping it centralised ensures that all
 * systems refer to the same feed order.
 *
 * @example
 *
 * ```ts
 * for (const feed of FEEDS) {
 *   renderer.render(studioScene, studioCameras[feed]);
 * }
 * ```
 *
 * @public
 */
export const FEEDS: FeedId[] = ["cam1", "cam2", "cam3", "cam4"];

/**
 * Default central target point for the studio.
 *
 * @remarks
 *
 * This point roughly represents the centre of the presenter desk area. It is
 * used as the default look-at target for wide shots and as the base target for
 * CAM1 and CAM2.
 *
 * Coordinates are expressed in Three.js world space.
 *
 * @public
 */
export const STUDIO_TARGET = new THREE.Vector3(0, 0.9, -0.3);

/**
 * Initial position of the crane rig used by CAM1.
 *
 * @remarks
 *
 * The crane camera itself is attached to a rig group. Moving the rig allows the
 * simulator to represent crane movement without directly mutating the camera's
 * local transform.
 *
 * This value is also used by the reset logic to restore CAM1 to its default
 * position.
 *
 * @public
 */
export const INITIAL_CRANE_POSITION = new THREE.Vector3(-2.8, 2.6, 3.4);

/**
 * Initial look-at targets for each virtual studio camera.
 *
 * @remarks
 *
 * Each camera stores and mutates its own target during gameplay. These values
 * are cloned when camera state is initialised so that runtime movement does not
 * modify the original defaults.
 *
 * The reset logic copies these targets back into the active camera target map.
 *
 * @example
 *
 * ```ts
 * cameraTargets.cam3.copy(INITIAL_CAMERA_TARGETS.cam3);
 * studioCameras.cam3.lookAt(cameraTargets.cam3);
 * ```
 *
 * @public
 */
export const INITIAL_CAMERA_TARGETS: Record<FeedId, THREE.Vector3> = {
  /**
   * Default crane target.
   *
   * @remarks
   *
   * The crane starts by looking towards the centre of the studio.
   */
  cam1: STUDIO_TARGET.clone(),

  /**
   * Default wide tripod camera target.
   *
   * @remarks
   *
   * CAM2 starts as the safe wide/general studio shot.
   */
  cam2: STUDIO_TARGET.clone(),

  /**
   * Default left-side/detail target.
   *
   * @remarks
   *
   * CAM3 starts aimed towards the left side of the presenter desk area.
   */
  cam3: new THREE.Vector3(-0.8, 1, -0.25),

  /**
   * Default right-side/detail target.
   *
   * @remarks
   *
   * CAM4 starts aimed towards the right side of the presenter desk area.
   */
  cam4: new THREE.Vector3(0.8, 1, -0.25),
};

/**
 * Initial field-of-view values for each virtual studio camera.
 *
 * @remarks
 *
 * In this simulator, zoom is represented by changing camera FOV:
 *
 * - lower FOV means a tighter shot;
 * - higher FOV means a wider shot.
 *
 * These values are restored when resetting a camera.
 *
 * @example
 *
 * ```ts
 * studioCameras.cam4.fov = INITIAL_CAMERA_FOVS.cam4;
 * studioCameras.cam4.updateProjectionMatrix();
 * ```
 *
 * @public
 */
export const INITIAL_CAMERA_FOVS: Record<FeedId, number> = {
  /**
   * Default crane camera FOV.
   *
   * @remarks
   *
   * Slightly wide, suitable for establishing and movement shots.
   */
  cam1: 38,

  /**
   * Default wide/general tripod camera FOV.
   *
   * @remarks
   *
   * Wider than the detail cameras so CAM2 can work as a safe fallback shot.
   */
  cam2: 42,

  /**
   * Default left/detail tripod camera FOV.
   *
   * @remarks
   *
   * Tighter than the wide camera, suitable for presenter or guest detail shots.
   */
  cam3: 30,

  /**
   * Default right/detail tripod camera FOV.
   *
   * @remarks
   *
   * Tighter than the wide camera, suitable for presenter or guest detail shots.
   */
  cam4: 30,
};
