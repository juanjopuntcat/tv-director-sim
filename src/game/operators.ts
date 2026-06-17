/**
 * @packageDocumentation
 *
 * Virtual camera operator command helpers.
 *
 * This module translates high-level operator instructions, such as “frame the
 * host” or “return to wide”, into concrete camera movement targets and desired
 * field-of-view values.
 *
 * @remarks
 *
 * The simulator lets the player either operate cameras manually or delegate
 * camera framing to virtual operators. Delegated operation is represented by an
 * {@link OperatorCommand}. The animation loop then consumes that command over
 * time by interpolating the active camera target and FOV towards the desired
 * values.
 *
 * This module does **not** move cameras directly. It only writes commands into
 * the shared command map. The render loop is responsible for applying those
 * commands smoothly.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import type { FeedId, OperatorCommand, OperatorTarget } from "../types";
import { INITIAL_CAMERA_FOVS, STUDIO_TARGET } from "../constants";

/**
 * World-space framing target for the host/presenter.
 *
 * @remarks
 *
 * This is currently a hard-coded MVP position matching the procedural studio
 * layout. Once the studio becomes more dynamic, this should likely be derived
 * from the host object's actual world position.
 *
 * @internal
 */
const HOST_TARGET = new THREE.Vector3(0, 1.05, -0.35);

/**
 * World-space framing target for Guest A.
 *
 * @remarks
 *
 * Guest A is currently placed on the left side of the desk from the studio's
 * point of view.
 *
 * @internal
 */
const GUEST_A_TARGET = new THREE.Vector3(-1.25, 1.05, -0.25);

/**
 * World-space framing target for Guest B.
 *
 * @remarks
 *
 * Guest B is currently placed on the right side of the desk from the studio's
 * point of view.
 *
 * @internal
 */
const GUEST_B_TARGET = new THREE.Vector3(1.25, 1.05, -0.25);

/**
 * Desired FOV for non-wide crane shots.
 *
 * @remarks
 *
 * CAM1 is a crane camera, so its “close” operator command is intentionally
 * less tight than the tripod detail cameras. This keeps crane movements more
 * elegant and avoids over-compressing the shot.
 *
 * Lower FOV values mean tighter shots.
 *
 * @internal
 */
const CRANE_DETAIL_FOV = 34;

/**
 * Desired FOV for non-wide tripod detail shots.
 *
 * @remarks
 *
 * This value is used for CAM2, CAM3 and CAM4 when framing a specific subject.
 * It gives a tighter shot than the initial wide/default FOV.
 *
 * Lower FOV values mean tighter shots.
 *
 * @internal
 */
const TRIPOD_DETAIL_FOV = 24;

/**
 * Resolves a high-level operator target into a concrete world-space look-at
 * position.
 *
 * @param target - Semantic operator target requested by the player.
 *
 * @returns A cloned {@link THREE.Vector3} that can safely be stored inside an
 * operator command.
 *
 * @remarks
 *
 * The returned vector is always a new instance. This prevents runtime command
 * interpolation from accidentally mutating shared constants such as
 * {@link STUDIO_TARGET}.
 *
 * @example
 *
 * ```ts
 * const desiredTarget = resolveOperatorTarget("host");
 * ```
 *
 * @internal
 */
function resolveOperatorTarget(target: OperatorTarget): THREE.Vector3 {
  // The presenter/host is centred behind the desk.
  if (target === "host") {
    return HOST_TARGET.clone();
  }

  // Guest A sits on the left side of the current procedural studio layout.
  if (target === "guestA") {
    return GUEST_A_TARGET.clone();
  }

  // Guest B sits on the right side of the current procedural studio layout.
  if (target === "guestB") {
    return GUEST_B_TARGET.clone();
  }

  // Wide shots return to the default centre of the studio.
  return STUDIO_TARGET.clone();
}

/**
 * Resolves the desired field of view for an operator command.
 *
 * @param feed - Camera/feed that will receive the command.
 * @param target - Semantic target requested by the player.
 *
 * @returns Desired camera field of view in degrees.
 *
 * @remarks
 *
 * Wide shots restore the camera's initial FOV. Subject-specific shots use a
 * tighter FOV, with a separate value for the crane camera so it remains less
 * aggressive than tripod cameras.
 *
 * @example
 *
 * ```ts
 * const desiredFov = resolveOperatorFov("cam3", "guestA");
 * ```
 *
 * @internal
 */
function resolveOperatorFov(feed: FeedId, target: OperatorTarget): number {
  // A wide command should restore the default FOV for that specific camera.
  if (target === "wide") {
    return INITIAL_CAMERA_FOVS[feed];
  }

  // The crane camera should stay slightly wider for elegant movement shots.
  if (feed === "cam1") {
    return CRANE_DETAIL_FOV;
  }

  // Tripod cameras can use a tighter FOV for presenter/guest detail shots.
  return TRIPOD_DETAIL_FOV;
}

/**
 * Sends a high-level framing command to a virtual camera operator.
 *
 * @param operatorCommands - Mutable command map shared with the animation loop.
 * @param feed - Camera/feed that should receive the command.
 * @param target - Semantic subject or shot type to frame.
 *
 * @remarks
 *
 * This function does not apply camera movement immediately. Instead, it stores
 * an {@link OperatorCommand} in the `operatorCommands` map. The animation loop
 * then picks up that command and gradually interpolates the camera's active
 * target and FOV towards the desired values.
 *
 * Calling this function for a feed that already has an active command replaces
 * the previous command. This matches the behaviour of a real director issuing a
 * new instruction to a camera operator.
 *
 * @example
 *
 * ```ts
 * sendOperatorCommand(operatorCommands, "cam3", "host");
 * ```
 *
 * @example
 *
 * ```ts
 * sendOperatorCommand(operatorCommands, previewFeed, "wide");
 * ```
 *
 * @public
 */
export function sendOperatorCommand(
  operatorCommands: Partial<Record<FeedId, OperatorCommand>>,
  feed: FeedId,
  target: OperatorTarget,
) {
  // Convert the high-level instruction into the concrete point the camera
  // should look at.
  const desiredTarget = resolveOperatorTarget(target);

  // Convert the high-level instruction into an appropriate FOV for the selected
  // camera. This is what makes “wide” and “detail” commands feel different.
  const desiredFov = resolveOperatorFov(feed, target);

  // Store or replace the pending command for this feed. The animation loop will
  // consume it over time.
  operatorCommands[feed] = {
    target,
    desiredTarget,
    desiredFov,
  };
}
