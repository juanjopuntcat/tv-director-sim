/**
 * @packageDocumentation
 *
 * Factory utility for creating simple procedural studio people.
 *
 * This module creates the placeholder human figures used in the MVP studio
 * scene. Each person is represented by a small Three.js group containing a body
 * and a head.
 *
 * @remarks
 *
 * The current implementation is intentionally minimal and asset-free. It avoids
 * external models, textures or animation rigs so the simulator can remain easy
 * to run, inspect and modify during early development.
 *
 * The returned object is a {@link THREE.Group}, which makes it easy for the
 * studio scene to position and animate the whole person as a single unit.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";

/**
 * Creates a simple stylised person for the procedural studio set.
 *
 * @param color - Hexadecimal material colour used for the person's body.
 *
 * @returns A {@link THREE.Group} containing the person's body and head meshes.
 *
 * @remarks
 *
 * The generated group contains two children:
 *
 * - `children[0]`: body mesh;
 * - `children[1]`: head mesh.
 *
 * The body colour is provided by the caller so the host and guests can be
 * visually distinguished from each other. The head uses a fixed skin-tone
 * placeholder material.
 *
 * This is not intended to be a realistic character model. It is a lightweight
 * visual marker that gives the virtual cameras something recognisable to frame.
 *
 * @example
 *
 * ```ts
 * const host = createPerson(0x3366ff);
 *
 * host.position.set(0, 0, -0.35);
 * studioScene.add(host);
 * ```
 *
 * @example
 *
 * ```ts
 * const guestA = createPerson(0xaa3333);
 * const guestB = createPerson(0x33aa66);
 *
 * guestA.position.x = -1.25;
 * guestB.position.x = 1.25;
 * ```
 *
 * @public
 */
export function createPerson(color: number) {
  // Root group for the full character. Moving or rotating this group affects
  // both the body and the head together.
  const group = new THREE.Group();

  // Simple tapered cylinder used as the body. The slight radius difference
  // gives the placeholder person a less boxy silhouette.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.75, 16),
    new THREE.MeshStandardMaterial({ color }),
  );

  // Raise the body so it sits naturally above the studio floor.
  body.position.y = 0.75;

  // Simple sphere used as the head. This keeps the placeholder readable from
  // all camera angles without needing any external character asset.
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffccaa }),
  );

  // Place the head above the body in the local coordinate space of the group.
  head.position.y = 1.25;

  // Add body first and head second. Some modules and debugging tools may rely
  // on this predictable child order when inspecting the generated object.
  group.add(body);
  group.add(head);

  return group;
}
