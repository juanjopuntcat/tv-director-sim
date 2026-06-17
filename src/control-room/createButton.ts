import * as THREE from "three";
import { createCanvasLabel } from "../utils/createCanvasLabel";

export function createButton(labelText: string) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.14, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x30303a }),
  );
  group.add(base);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.22),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel(labelText, 256, 128),
      transparent: true,
    }),
  );
  label.rotation.x = -Math.PI / 2;
  label.position.y = 0.076;
  group.add(label);

  return {
    group,
    clickableObject: base,
  };
}
