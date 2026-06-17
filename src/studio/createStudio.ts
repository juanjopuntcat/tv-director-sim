/**
 * @packageDocumentation
 *
 * Procedural studio scene factory.
 *
 * This module creates the main 3D television studio used as the source scene
 * for all virtual camera feeds. It builds a complete but lightweight set using
 * only Three.js primitives: floor, back wall, LED screen, presenter desk and
 * three placeholder people.
 *
 * @remarks
 *
 * The studio scene is rendered multiple times per animation frame from
 * different virtual cameras. Those renders are written into render targets and
 * later displayed on the monitors inside the control room.
 *
 * The current studio is intentionally simple and asset-free. This keeps the MVP
 * easy to run in the browser and makes the camera/director mechanics the main
 * focus of the project.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import { createPerson } from "./createPerson";

/**
 * Public API returned by {@link createStudio}.
 *
 * @remarks
 *
 * The main application needs direct references to the studio scene and the
 * three visible subjects so it can:
 *
 * - render the scene from multiple cameras;
 * - apply simple placeholder animation to the people;
 * - later use these references for scoring, framing and production logic.
 *
 * @public
 */
export type StudioApi = {
  /**
   * Three.js scene containing the full procedural television studio.
   *
   * @remarks
   *
   * This scene is not rendered directly to the browser canvas. Instead, it is
   * rendered into one render target per virtual studio camera.
   */
  scene: THREE.Scene;

  /**
   * Presenter/host character placed near the centre of the desk.
   *
   * @remarks
   *
   * The host is currently represented by a simple procedural placeholder person.
   * The animation loop applies a subtle rotation to this group to make the shot
   * feel less static.
   */
  host: THREE.Group;

  /**
   * First guest character, positioned to the left of the host.
   *
   * @remarks
   *
   * This object is used by the operator command system when the player requests
   * a shot of `guestA`.
   */
  guestA: THREE.Group;

  /**
   * Second guest character, positioned to the right of the host.
   *
   * @remarks
   *
   * This object is used by the operator command system when the player requests
   * a shot of `guestB`.
   */
  guestB: THREE.Group;
};

/**
 * Creates the procedural television studio scene.
 *
 * @returns A {@link StudioApi} containing the scene and the main studio
 * subjects.
 *
 * @remarks
 *
 * The generated scene contains:
 *
 * - a dark studio background;
 * - ambient fill light;
 * - a directional key light;
 * - a floor platform;
 * - a back wall;
 * - a simple LED screen;
 * - a presenter desk;
 * - one host;
 * - two guests.
 *
 * All objects are created procedurally, so the scene does not depend on any
 * external 3D model or texture assets.
 *
 * @example
 *
 * ```ts
 * const studio = createStudio();
 *
 * renderer.setRenderTarget(renderTargets.cam1);
 * renderer.render(studio.scene, studioCameras.cam1);
 * ```
 *
 * @public
 */
export function createStudio(): StudioApi {
  // Root studio scene. This scene represents the live set and is rendered by
  // the virtual studio cameras, not directly by the user's main view.
  const scene = new THREE.Scene();

  // Dark neutral background colour. This gives the studio a broadcast/control
  // room feel while keeping the MVP visually readable.
  scene.background = new THREE.Color(0x15151c);

  // Soft ambient light so shadowed areas are still visible from all camera
  // angles. This is useful for a prototype where no complex lighting rig exists.
  const studioAmbient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(studioAmbient);

  // Main key light for the studio. Positioned high and to the side so people,
  // desk and wall receive clearer 3D definition.
  const studioKey = new THREE.DirectionalLight(0xffffff, 1.1);
  studioKey.position.set(4, 7, 5);
  scene.add(studioKey);

  // Simple rectangular floor platform. A very small height is used instead of a
  // plane so the set has some physical thickness in angled shots.
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x2d2d35 }),
  );

  // Lower the floor slightly so its top surface sits around world Y = 0.
  floor.position.y = -0.05;
  scene.add(floor);

  // Back wall behind the desk. This provides visual depth and a surface for the
  // LED screen.
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(8, 3, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x20202a }),
  );

  // Place the wall behind the presenter desk and raise it so it rests on the
  // floor.
  backWall.position.set(0, 1.5, -2.5);
  scene.add(backWall);

  // Simplified LED screen on the back wall. It is currently a flat coloured
  // plane, but can later be replaced with video, graphics or dynamic textures.
  const ledScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x223366 }),
  );

  // Place the LED screen just in front of the back wall to avoid z-fighting.
  ledScreen.position.set(0, 1.7, -2.41);
  scene.add(ledScreen);

  // Presenter desk. This gives the studio a clear talk-show/news-programme
  // layout and provides a visual anchor for the virtual cameras.
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.35, 1),
    new THREE.MeshStandardMaterial({ color: 0x33333d }),
  );

  // Desk is centred horizontally and placed slightly in front of the back wall.
  desk.position.set(0, 0.45, -0.3);
  scene.add(desk);

  // Central host/presenter placeholder. Blue body colour makes the host easy to
  // distinguish from the guests in the monitor feeds.
  const host = createPerson(0x3355ff);

  // Place the host near the centre of the desk.
  host.position.set(0, 0, -0.35);
  scene.add(host);

  // Guest A placeholder. Warm body colour helps visually separate this guest
  // from the host and Guest B.
  const guestA = createPerson(0xdd8844);

  // Place Guest A to the left of the host from the viewer/camera perspective.
  guestA.position.set(-1.25, 0, -0.25);
  scene.add(guestA);

  // Guest B placeholder. Green body colour helps visually separate this guest
  // from the host and Guest A.
  const guestB = createPerson(0x55aa66);

  // Place Guest B to the right of the host from the viewer/camera perspective.
  guestB.position.set(1.25, 0, -0.25);
  scene.add(guestB);

  // Return the scene and direct references to the main studio subjects. The
  // animation loop and future gameplay systems can use these references without
  // needing to search the scene graph.
  return {
    scene,
    host,
    guestA,
    guestB,
  };
}
