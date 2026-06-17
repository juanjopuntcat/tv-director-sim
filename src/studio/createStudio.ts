import * as THREE from "three";
import { createPerson } from "./createPerson";

export type StudioApi = {
  scene: THREE.Scene;
  host: THREE.Group;
  guestA: THREE.Group;
  guestB: THREE.Group;
};

export function createStudio(): StudioApi {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x15151c);

  const studioAmbient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(studioAmbient);

  const studioKey = new THREE.DirectionalLight(0xffffff, 1.1);
  studioKey.position.set(4, 7, 5);
  scene.add(studioKey);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.1, 6),
    new THREE.MeshStandardMaterial({ color: 0x2d2d35 }),
  );
  floor.position.y = -0.05;
  scene.add(floor);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(8, 3, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x20202a }),
  );
  backWall.position.set(0, 1.5, -2.5);
  scene.add(backWall);

  const ledScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.4),
    new THREE.MeshBasicMaterial({ color: 0x223366 }),
  );
  ledScreen.position.set(0, 1.7, -2.41);
  scene.add(ledScreen);

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 0.35, 1),
    new THREE.MeshStandardMaterial({ color: 0x33333d }),
  );
  desk.position.set(0, 0.45, -0.3);
  scene.add(desk);

  const host = createPerson(0x3355ff);
  host.position.set(0, 0, -0.35);
  scene.add(host);

  const guestA = createPerson(0xdd8844);
  guestA.position.set(-1.25, 0, -0.25);
  scene.add(guestA);

  const guestB = createPerson(0x55aa66);
  guestB.position.set(1.25, 0, -0.25);
  scene.add(guestB);

  return {
    scene,
    host,
    guestA,
    guestB,
  };
}
