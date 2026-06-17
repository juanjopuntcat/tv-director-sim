import * as THREE from "three";

export function createPerson(color: number) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.75, 16),
    new THREE.MeshStandardMaterial({ color }),
  );
  body.position.y = 0.75;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffccaa }),
  );
  head.position.y = 1.25;

  group.add(body);
  group.add(head);

  return group;
}
