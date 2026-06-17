/**
 * @packageDocumentation
 *
 * Mobile orientation warning overlay.
 *
 * This module creates a DOM-based overlay that asks the player to rotate their
 * device when using the simulator on a touch-like device in portrait mode.
 *
 * @remarks
 *
 * The simulator UI is designed around a landscape control room layout with
 * multiple monitors, Preview, Programme and physical mixer controls. On a phone
 * in portrait orientation, the experience becomes too cramped to be practical,
 * so this overlay blocks the screen and asks the player to rotate the device.
 *
 * The overlay is intentionally implemented as regular HTML/CSS instead of a
 * Three.js object. This ensures it always covers the viewport regardless of the
 * current 3D camera, render size or scene state.
 *
 * @license AGPL-3.0
 */

/**
 * Public API for the orientation overlay.
 *
 * @remarks
 *
 * The overlay mostly manages itself by listening to browser resize and
 * orientation events. The returned API exposes {@link OrientationOverlayApi.update}
 * so the main application can force a refresh after renderer or layout changes.
 *
 * @public
 */
export type OrientationOverlayApi = {
  /**
   * Re-evaluates whether the overlay should be visible.
   *
   * @remarks
   *
   * The overlay is shown only when both conditions are true:
   *
   * - the viewport is in portrait orientation;
   * - the device appears to be touch-like.
   *
   * Calling this manually is useful after application-level resize handling.
   */
  update: () => void;
};

/**
 * Creates the orientation warning overlay and attaches it to the document body.
 *
 * @returns An {@link OrientationOverlayApi} that can be used to refresh the
 * overlay visibility state.
 *
 * @remarks
 *
 * The generated overlay uses the `orientation-overlay` ID and toggles the
 * `visible` CSS class depending on the current viewport/device conditions.
 * The visual styling lives in `style.css`.
 *
 * The device check intentionally uses two signals:
 *
 * - `matchMedia("(pointer: coarse)")`, which detects coarse pointer devices;
 * - `"ontouchstart" in window`, which catches additional touch-capable cases.
 *
 * This avoids showing the warning on a normal desktop browser window that is
 * merely taller than it is wide.
 *
 * @example
 *
 * ```ts
 * const orientationOverlay = createOrientationOverlay();
 *
 * window.addEventListener("resize", () => {
 *   renderer.setSize(window.innerWidth, window.innerHeight);
 *   orientationOverlay.update();
 * });
 * ```
 *
 * @public
 */
export function createOrientationOverlay(): OrientationOverlayApi {
  // Root overlay element. It is appended directly to the document body so it can
  // cover the whole viewport independently of the Three.js canvas.
  const overlay = document.createElement("div");

  // Stable ID used by CSS to position, style and hide/show the overlay.
  overlay.id = "orientation-overlay";

  // Static user-facing message. This is intentionally short because it is shown
  // on small screens where space is limited.
  overlay.innerHTML = `
    <div class="orientation-panel">
      <div class="orientation-icon">↻</div>
      <h2>Rotate your device</h2>
      <p>This simulator works best in landscape mode.</p>
      <p>Please turn your phone sideways to continue.</p>
    </div>
  `;

  // Attach the overlay outside the app canvas so it remains a normal DOM layer
  // above the simulator.
  document.body.appendChild(overlay);

  /**
   * Updates overlay visibility based on orientation and input type.
   *
   * @remarks
   *
   * Portrait is detected by comparing viewport height and width. This works
   * across modern browsers and also handles browser UI changes that affect the
   * viewport size.
   *
   * The touch-like check prevents the overlay from appearing on desktop when a
   * user resizes their browser window into a portrait-shaped layout.
   *
   * @internal
   */
  function update() {
    // A viewport is considered portrait when it is taller than it is wide.
    const isPortrait = window.innerHeight > window.innerWidth;

    // Detect mobile/tablet-style interaction. `pointer: coarse` is the modern
    // signal, while `ontouchstart` acts as a broad compatibility fallback.
    const isTouchLike =
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window;

    // The overlay is visible only when the simulator is likely being used on a
    // touch device in portrait orientation.
    overlay.classList.toggle("visible", isPortrait && isTouchLike);
  }

  // Refresh when the browser viewport changes size. This covers desktop
  // resizing, mobile browser chrome changes and many orientation changes.
  window.addEventListener("resize", update);

  // Refresh on explicit orientation changes where supported by the browser.
  window.addEventListener("orientationchange", update);

  // Set the correct initial visibility immediately after creating the overlay.
  update();

  // Return a minimal controller rather than exposing the DOM node. This keeps
  // the rest of the application decoupled from the overlay implementation.
  return {
    update,
  };
}
