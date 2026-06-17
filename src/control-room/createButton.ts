/**
 * @packageDocumentation
 *
 * Factory utilities for creating clickable 3D control room buttons.
 *
 * This module provides the primitive button used by the vision mixer panel in
 * the control room. Buttons are built procedurally with Three.js geometry and
 * receive their visible label through a generated canvas texture.
 *
 * @remarks
 *
 * The returned button is split into two parts:
 *
 * - `group`: the full visual object that should be added to the scene;
 * - `clickableObject`: the mesh that should be registered for raycasting.
 *
 * Keeping the clickable object explicit allows the control room module to
 * centralise interaction handling without coupling this factory to any specific
 * action or input system.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import { createCanvasLabel } from "../utils/createCanvasLabel";

/**
 * A procedural 3D button ready to be placed inside the control room scene.
 *
 * @remarks
 *
 * The visual group contains both the physical button base and the label plane.
 * The clickable object is the base mesh, because it has volume and is easier to
 * hit with a raycaster than the flat label plane.
 *
 * @public
 */
export type ControlRoomButton = {
  /**
   * Complete visual button object.
   *
   * @remarks
   *
   * Add this group to the control room scene. Moving, rotating or scaling this
   * group affects the whole button.
   */
  group: THREE.Group;

  /**
   * Mesh used for pointer/raycast interaction.
   *
   * @remarks
   *
   * Register this object in the control room click handling system and associate
   * it with the desired action.
   */
  clickableObject: THREE.Mesh;
};

/**
 * Creates a labelled 3D button for the control room panel.
 *
 * @param labelText - Text displayed on the top face of the button.
 *
 * @returns A {@link ControlRoomButton} containing the visual group and the mesh
 * used for click detection.
 *
 * @remarks
 *
 * The button is intentionally simple and procedural:
 *
 * - the base is a small cuboid;
 * - the label is a flat plane placed on top;
 * - the label texture is generated at runtime with
 *   {@link createCanvasLabel}.
 *
 * This avoids requiring external 3D assets or texture files for the MVP.
 *
 * @example
 *
 * ```ts
 * const { group, clickableObject } = createButton("CUT");
 *
 * group.position.set(1.9, 0.12, 0.35);
 * scene.add(group);
 *
 * clickableObjects.push(clickableObject);
 * objectActions.set(clickableObject, () => {
 *   cutToProgram();
 * });
 * ```
 *
 * @public
 */
export function createButton(labelText: string): ControlRoomButton {
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
