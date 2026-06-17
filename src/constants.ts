import * as THREE from "three";
import type { FeedId } from "./types";

export const ASPECT = 16 / 9;

export const FEEDS: FeedId[] = ["cam1", "cam2", "cam3", "cam4"];

export const STUDIO_TARGET = new THREE.Vector3(0, 0.9, -0.3);

export const INITIAL_CRANE_POSITION = new THREE.Vector3(-2.8, 2.6, 3.4);

export const INITIAL_CAMERA_TARGETS: Record<FeedId, THREE.Vector3> = {
  cam1: STUDIO_TARGET.clone(),
  cam2: STUDIO_TARGET.clone(),
  cam3: new THREE.Vector3(-0.8, 1, -0.25),
  cam4: new THREE.Vector3(0.8, 1, -0.25),
};

export const INITIAL_CAMERA_FOVS: Record<FeedId, number> = {
  cam1: 38,
  cam2: 42,
  cam3: 30,
  cam4: 30,
};
