import * as THREE from "three";
import type { FeedId, OperatorCommand, OperatorTarget } from "../types";
import { INITIAL_CAMERA_FOVS, STUDIO_TARGET } from "../constants";

export function sendOperatorCommand(
  operatorCommands: Partial<Record<FeedId, OperatorCommand>>,
  feed: FeedId,
  target: OperatorTarget,
) {
  const desiredTarget =
    target === "host"
      ? new THREE.Vector3(0, 1.05, -0.35)
      : target === "guestA"
        ? new THREE.Vector3(-1.25, 1.05, -0.25)
        : target === "guestB"
          ? new THREE.Vector3(1.25, 1.05, -0.25)
          : STUDIO_TARGET.clone();

  const desiredFov =
    target === "wide" ? INITIAL_CAMERA_FOVS[feed] : feed === "cam1" ? 34 : 24;

  operatorCommands[feed] = {
    target,
    desiredTarget,
    desiredFov,
  };
}
