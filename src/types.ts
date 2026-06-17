import * as THREE from "three";

export type FeedId = "cam1" | "cam2" | "cam3" | "cam4";

export type OperatorTarget = "host" | "guestA" | "guestB" | "wide";

export type OperatorCommand = {
  target: OperatorTarget;
  desiredTarget: THREE.Vector3;
  desiredFov: number;
};
