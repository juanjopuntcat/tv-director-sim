import * as THREE from "three";
import type { FeedId } from "../types";
import {
  ASPECT,
  INITIAL_CRANE_POSITION,
  INITIAL_CAMERA_TARGETS,
  INITIAL_CAMERA_FOVS,
} from "../constants";

export type StudioCamerasApi = {
  studioCameras: Record<FeedId, THREE.PerspectiveCamera>;
  cameraTargets: Record<FeedId, THREE.Vector3>;
  cam1: THREE.PerspectiveCamera;
  craneRig: THREE.Group;
  initialCranePosition: THREE.Vector3;
};

function createStudioCamera(
  position: THREE.Vector3,
  target: THREE.Vector3,
  fov = 35,
) {
  const camera = new THREE.PerspectiveCamera(fov, ASPECT, 0.1, 100);
  camera.position.copy(position);
  camera.lookAt(target);
  return camera;
}

export function createStudioCameras(
  studioScene: THREE.Scene,
): StudioCamerasApi {
  const cameraTargets: Record<FeedId, THREE.Vector3> = {
    cam1: INITIAL_CAMERA_TARGETS.cam1.clone(),
    cam2: INITIAL_CAMERA_TARGETS.cam2.clone(),
    cam3: INITIAL_CAMERA_TARGETS.cam3.clone(),
    cam4: INITIAL_CAMERA_TARGETS.cam4.clone(),
  };

  const cam1 = new THREE.PerspectiveCamera(
    INITIAL_CAMERA_FOVS.cam1,
    ASPECT,
    0.1,
    100,
  );

  const craneRig = new THREE.Group();
  craneRig.position.copy(INITIAL_CRANE_POSITION);
  craneRig.add(cam1);
  studioScene.add(craneRig);

  cam1.lookAt(cameraTargets.cam1);

  const studioCameras: Record<FeedId, THREE.PerspectiveCamera> = {
    cam1,
    cam2: createStudioCamera(
      new THREE.Vector3(0, 1.35, 4.2),
      cameraTargets.cam2,
      INITIAL_CAMERA_FOVS.cam2,
    ),
    cam3: createStudioCamera(
      new THREE.Vector3(-1.7, 1.25, 2.2),
      cameraTargets.cam3,
      INITIAL_CAMERA_FOVS.cam3,
    ),
    cam4: createStudioCamera(
      new THREE.Vector3(1.7, 1.25, 2.2),
      cameraTargets.cam4,
      INITIAL_CAMERA_FOVS.cam4,
    ),
  };

  return {
    studioCameras,
    cameraTargets,
    cam1,
    craneRig,
    initialCranePosition: INITIAL_CRANE_POSITION.clone(),
  };
}
