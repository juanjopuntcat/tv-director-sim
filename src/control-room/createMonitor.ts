import * as THREE from "three";
import { createCanvasLabel } from "../utils/createCanvasLabel";

export function createMonitor(
  name: string,
  texture: THREE.Texture,
  width: number,
  height: number,
  frameMaterial: THREE.Material,
) {
  const group = new THREE.Group();

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.08),
    frameMaterial.clone(),
  );
  frame.position.z = -0.03;
  frame.name = `${name}_FRAME`;
  group.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  screen.position.z = 0.025;
  screen.name = `${name}_SCREEN`;
  group.add(screen);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.22),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel(name),
      transparent: true,
    }),
  );
  label.position.set(0, -height / 2 - 0.22, 0.03);
  group.add(label);

  return group;
}
