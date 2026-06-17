/**
 * @packageDocumentation
 *
 * Factory utilities for creating procedural 3D control room monitors.
 *
 * This module creates the monitor object used throughout the control room:
 * source feed monitors, the Preview monitor and the Programme monitor. Each
 * monitor is built entirely with Three.js primitives and uses a texture for the
 * screen content.
 *
 * @remarks
 *
 * A monitor is returned as a {@link THREE.Group} containing three children in a
 * fixed order:
 *
 * 1. frame mesh;
 * 2. screen mesh;
 * 3. label mesh.
 *
 * The control room currently relies on this ordering to access the frame and
 * screen meshes when updating tally state and Preview/Programme textures.
 *
 * The label texture is generated with the same aspect ratio as the label plane.
 * This is important because otherwise text such as `PREVIEW`, `PROGRAM` or
 * `CAM1` becomes stretched when mapped onto the 3D geometry.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";
import { createCanvasLabel } from "../utils/createCanvasLabel";

/**
 * Height of the monitor label bar in Three.js world units.
 *
 * @remarks
 *
 * The label width changes depending on the monitor size, but the label height
 * remains fixed so all monitor captions look visually consistent.
 *
 * @internal
 */
const LABEL_HEIGHT = 0.22;

/**
 * Canvas texture height used for monitor label textures.
 *
 * @remarks
 *
 * The texture width is calculated dynamically from the label plane aspect
 * ratio. Keeping the height fixed and deriving the width ensures the generated
 * canvas matches the 3D plane proportions exactly.
 *
 * A value of `512` gives crisp text without being excessive for the current MVP.
 *
 * @internal
 */
const LABEL_TEXTURE_HEIGHT = 512;

/**
 * Creates a labelled 3D monitor for the control room.
 *
 * @param name - Human-readable monitor name displayed below the screen.
 * @param texture - Texture shown on the monitor screen.
 * @param width - Screen width in Three.js world units.
 * @param height - Screen height in Three.js world units.
 * @param frameMaterial - Base material used for the monitor frame.
 *
 * @returns A {@link THREE.Group} containing the monitor frame, screen and label.
 *
 * @remarks
 *
 * The returned group contains the following children:
 *
 * - `children[0]`: frame mesh;
 * - `children[1]`: screen mesh;
 * - `children[2]`: label mesh.
 *
 * The frame material is cloned so each monitor can later have its own tally
 * colour without mutating the original material shared by other monitors.
 *
 * The screen is a simple plane using the supplied texture. For source monitors,
 * this texture is usually a {@link THREE.WebGLRenderTarget.texture}; for
 * Preview and Programme monitors, the texture can be swapped at runtime.
 *
 * The label canvas is generated with the same aspect ratio as the label plane.
 * This prevents text from being horizontally or vertically stretched.
 *
 * @example
 *
 * ```ts
 * const monitor = createMonitor(
 *   "CAM1",
 *   renderTargets.cam1.texture,
 *   1.35,
 *   0.76,
 *   frameDefaultMaterial,
 * );
 *
 * monitor.position.set(-2.55, 2.15, -1.5);
 * scene.add(monitor);
 * ```
 *
 * @public
 */
export function createMonitor(
  name: string,
  texture: THREE.Texture,
  width: number,
  height: number,
  frameMaterial: THREE.Material,
) {
  // Root group for the full monitor. Moving this group moves the frame, screen
  // and label together.
  const group = new THREE.Group();

  // The frame is slightly larger than the screen so it appears as a visible
  // border around the live feed.
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.12, height + 0.12, 0.08),
    frameMaterial.clone(),
  );

  // Move the frame slightly behind the screen so the screen plane sits in front
  // and remains visible.
  frame.position.z = -0.03;

  // Give the frame a predictable name for debugging and scene inspection.
  frame.name = `${name}_FRAME`;

  // The frame is intentionally added first. Other modules expect it at
  // `children[0]` when updating tally colours.
  group.add(frame);

  // The actual monitor screen. This receives either a source feed texture or a
  // dynamic Preview/Programme texture.
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,

      // Monitor screens should display the render target texture directly
      // without being affected by lighting or tone mapping.
      toneMapped: false,
    }),
  );

  // Place the screen just in front of the frame.
  screen.position.z = 0.025;

  // Give the screen a predictable name for debugging and scene inspection.
  screen.name = `${name}_SCREEN`;

  // The screen is intentionally added second. Other modules expect it at
  // `children[1]` when swapping Preview and Programme textures.
  group.add(screen);

  // The label plane has the same width as the monitor screen and a fixed height.
  const labelWidth = width;
  const labelHeight = LABEL_HEIGHT;

  // Calculate the texture width from the actual 3D plane aspect ratio. This is
  // what prevents label text from being stretched.
  const labelTextureWidth = Math.round(
    LABEL_TEXTURE_HEIGHT * (labelWidth / labelHeight),
  );

  // Create the label mesh with a canvas texture that matches its exact aspect
  // ratio.
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(labelWidth, labelHeight),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel(name, labelTextureWidth, LABEL_TEXTURE_HEIGHT),
      transparent: true,

      // UI text should stay crisp and bright, independent from scene lighting.
      toneMapped: false,
    }),
  );

  // Position the label below the monitor screen with a small visual gap.
  label.position.set(0, -height / 2 - LABEL_HEIGHT, 0.03);

  // Give the label a predictable name for debugging and scene inspection.
  label.name = `${name}_LABEL`;

  // The label is intentionally added third.
  group.add(label);

  return group;
}
