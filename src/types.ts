/**
 * @packageDocumentation
 *
 * Shared domain types used across the 3D Television Production Simulator.
 *
 * This module intentionally contains only lightweight type definitions. It is
 * imported by scene builders, control room components and game logic modules so
 * they can agree on feed identifiers and camera operator command shapes without
 * creating circular dependencies.
 *
 * @remarks
 *
 * The simulator currently models four virtual studio feeds:
 *
 * - `cam1`: crane camera;
 * - `cam2`: wide/general tripod camera;
 * - `cam3`: detail tripod camera;
 * - `cam4`: detail tripod camera.
 *
 * These identifiers are used consistently as keys for render targets, studio
 * cameras, monitor state, Preview/Programme selection and operator commands.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";

/**
 * Identifier for a virtual camera feed.
 *
 * @remarks
 *
 * A feed represents both:
 *
 * - a virtual studio camera;
 * - the rendered texture shown on a control room monitor.
 *
 * The value is also used by the Preview/Programme switching logic.
 *
 * @example
 *
 * ```ts
 * let previewFeed: FeedId = "cam1";
 * previewFeed = "cam3";
 * ```
 *
 * @public
 */
export type FeedId = "cam1" | "cam2" | "cam3" | "cam4";

/**
 * High-level subject or shot target that can be requested from a virtual camera
 * operator.
 *
 * @remarks
 *
 * Operator targets are intentionally human-readable rather than low-level
 * camera coordinates. For example, the game logic can issue an order such as
 * “frame the host” and the operator module translates it into a target position
 * and desired field of view.
 *
 * @example
 *
 * ```ts
 * const target: OperatorTarget = "host";
 * ```
 *
 * @public
 */
export type OperatorTarget = "host" | "guestA" | "guestB" | "wide";

/**
 * A pending instruction sent to a virtual camera operator.
 *
 * @remarks
 *
 * Operator commands are consumed by the animation loop. Each frame, the
 * associated camera target and field of view are interpolated towards the
 * desired values until the command is considered complete.
 *
 * This allows camera movements to feel like an operator is adjusting a shot
 * instead of instantly teleporting the camera framing.
 *
 * @example
 *
 * ```ts
 * const command: OperatorCommand = {
 *   target: "guestA",
 *   desiredTarget: new THREE.Vector3(-1.25, 1.05, -0.25),
 *   desiredFov: 24,
 * };
 * ```
 *
 * @public
 */
export type OperatorCommand = {
  /**
   * Semantic target requested from the operator.
   *
   * @remarks
   *
   * This is the original high-level instruction, such as `host`, `guestA`,
   * `guestB` or `wide`. It can be used later for UI labels, operator status
   * indicators, scoring or debugging.
   */
  target: OperatorTarget;

  /**
   * World-space point the camera should look at.
   *
   * @remarks
   *
   * This value is usually derived from {@link OperatorTarget}. The animation
   * loop interpolates the current camera target towards this vector.
   */
  desiredTarget: THREE.Vector3;

  /**
   * Desired camera field of view, in degrees.
   *
   * @remarks
   *
   * Lower values create a tighter shot, similar to zooming in. Higher values
   * create a wider shot, similar to zooming out.
   */
  desiredFov: number;
};
