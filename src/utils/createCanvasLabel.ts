/**
 * @packageDocumentation
 *
 * Canvas-based text label texture factory.
 *
 * This module creates high-resolution text label textures for procedural 3D UI
 * elements in the control room, such as monitor captions and mixer button
 * labels.
 *
 * @remarks
 *
 * Text in the simulator is not rendered as HTML inside the 3D scene. Instead,
 * it is drawn into an off-screen HTML canvas and converted into a
 * {@link THREE.CanvasTexture}. That texture is then applied to a Three.js plane.
 *
 * This keeps the MVP asset-free while still allowing labelled 3D controls.
 *
 * A key detail is that the canvas should use the same aspect ratio as the plane
 * where the texture will be displayed. Otherwise, the text will appear stretched
 * or squeezed. The caller is responsible for passing a matching `width` and
 * `height`.
 *
 * @license AGPL-3.0
 */

import * as THREE from "three";

/**
 * Default canvas width used when no explicit texture size is provided.
 *
 * @remarks
 *
 * This default is suitable for wide labels, but most 3D UI components should
 * pass their own calculated size so the canvas aspect ratio matches the
 * geometry aspect ratio.
 *
 * @internal
 */
const DEFAULT_LABEL_WIDTH = 2048;

/**
 * Default canvas height used when no explicit texture size is provided.
 *
 * @remarks
 *
 * A height of `512` gives enough pixel density for crisp in-world UI labels
 * while remaining reasonable for a small number of generated textures.
 *
 * @internal
 */
const DEFAULT_LABEL_HEIGHT = 512;

/**
 * Horizontal padding ratio used when fitting text into the canvas.
 *
 * @remarks
 *
 * The text fitting loop keeps the measured text width below this fraction of
 * the full canvas width. This avoids labels touching the edges of their
 * background rectangle.
 *
 * @internal
 */
const TEXT_WIDTH_RATIO = 0.82;

/**
 * Maximum font size as a fraction of the canvas height.
 *
 * @remarks
 *
 * This is the starting point for the automatic font fitting loop.
 *
 * @internal
 */
const MAX_FONT_SIZE_RATIO = 0.48;

/**
 * Minimum font size as a fraction of the canvas height.
 *
 * @remarks
 *
 * The automatic fitting loop will not shrink text below this value. If a label
 * is still too long, it may overflow visually, but this prevents unreadably tiny
 * text.
 *
 * @internal
 */
const MIN_FONT_SIZE_RATIO = 0.22;

/**
 * Font size decrement used by the automatic fitting loop.
 *
 * @remarks
 *
 * Smaller values give more precise fitting but perform more measurement steps.
 * Since labels are generated only occasionally, `2` pixels is a good compromise.
 *
 * @internal
 */
const FONT_SIZE_STEP = 2;

/**
 * Creates a Three.js texture containing centred text rendered on a canvas.
 *
 * @param text - Text to render into the label texture.
 * @param width - Canvas width in pixels.
 * @param height - Canvas height in pixels.
 *
 * @returns A {@link THREE.CanvasTexture} that can be assigned to a material map.
 *
 * @remarks
 *
 * The generated texture uses:
 *
 * - a dark background;
 * - white bold text;
 * - automatic font-size fitting;
 * - centred horizontal and vertical alignment;
 * - disabled mipmaps to avoid blurred small text;
 * - sRGB colour space for correct colour handling.
 *
 * The caller should pass a canvas `width` and `height` matching the aspect ratio
 * of the 3D plane that will display the texture. For example, if the plane is
 * `2.2 / 0.22 = 10`, the texture should also use a 10:1 aspect ratio, such as
 * `5120x512`.
 *
 * @example
 *
 * ```ts
 * const labelTexture = createCanvasLabel("PREVIEW", 5120, 512);
 *
 * const label = new THREE.Mesh(
 *   new THREE.PlaneGeometry(2.2, 0.22),
 *   new THREE.MeshBasicMaterial({
 *     map: labelTexture,
 *     transparent: true,
 *     toneMapped: false,
 *   }),
 * );
 * ```
 *
 * @example
 *
 * ```ts
 * const buttonTexture = createCanvasLabel("CUT", 1280, 512);
 * ```
 *
 * @public
 */
export function createCanvasLabel(
  text: string,
  width = DEFAULT_LABEL_WIDTH,
  height = DEFAULT_LABEL_HEIGHT,
) {
  // Create an off-screen canvas. It is never inserted into the DOM; it is only
  // used as a drawing surface for the generated texture.
  const canvas = document.createElement("canvas");

  // Set the backing resolution of the canvas. Higher values produce sharper
  // textures once mapped onto 3D geometry.
  canvas.width = width;
  canvas.height = height;

  // Get the 2D drawing context used to paint the background and text.
  const ctx = canvas.getContext("2d");

  // Browsers should normally provide a 2D context, but throwing here makes the
  // failure explicit if the environment does not support canvas rendering.
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  // Draw the dark label background first. This ensures text remains readable
  // regardless of what is behind the 3D label in the control room.
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width, height);

  // Calculate the allowed font size range based on the canvas height. This
  // makes the function scale correctly for different texture resolutions.
  const maxFontSize = Math.floor(height * MAX_FONT_SIZE_RATIO);
  const minFontSize = Math.floor(height * MIN_FONT_SIZE_RATIO);

  // Start with the largest allowed font size and shrink only if the text does
  // not fit within the desired width.
  let fontSize = maxFontSize;

  // Configure common text style before the fitting loop. The font itself is set
  // inside the loop because the size changes until the text fits.
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Reduce the font size until the text fits comfortably within the canvas.
  do {
    ctx.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
    fontSize -= FONT_SIZE_STEP;
  } while (
    ctx.measureText(text).width > width * TEXT_WIDTH_RATIO &&
    fontSize > minFontSize
  );

  // The loop decrements once after setting the final font. Add the step back so
  // the vertical correction below uses the actual font size that was applied.
  const fittedFontSize = fontSize + FONT_SIZE_STEP;

  // Ensure the context still uses the final fitted font size.
  ctx.font = `900 ${fittedFontSize}px Arial, Helvetica, sans-serif`;

  // Draw the text in the centre of the canvas. The small vertical correction
  // compensates for fonts that visually sit slightly high with `middle`
  // baseline alignment.
  ctx.fillText(text, width / 2, height / 2 + fittedFontSize * 0.04);

  // Convert the finished canvas into a Three.js texture.
  const texture = new THREE.CanvasTexture(canvas);

  // Mipmaps can make small UI text look soft when the label is seen at a
  // distance or an angle, so they are disabled for sharper in-world UI.
  texture.generateMipmaps = false;

  // Linear filtering keeps the text smooth without introducing the stronger
  // blur caused by mipmap levels.
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  // Use sRGB colour space so the white text and dark background display as
  // expected in modern Three.js colour management.
  texture.colorSpace = THREE.SRGBColorSpace;

  // Explicitly mark the generated texture as ready for upload to the GPU.
  texture.needsUpdate = true;

  return texture;
}
