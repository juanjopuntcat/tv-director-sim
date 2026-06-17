/**
 * @packageDocumentation
 *
 * Help overlay UI for the simulator controls reference.
 *
 * This module creates the in-browser help panel shown when the player presses
 * <kbd>F1</kbd> or <kbd>?</kbd>. The overlay explains the current keyboard and
 * mouse controls for camera selection, cutting, manual camera operation and
 * virtual operator commands.
 *
 * @remarks
 *
 * The help overlay is regular DOM/CSS, not part of the Three.js scene. This is
 * deliberate: the panel is interface documentation rather than an in-world
 * object, and it should remain readable regardless of the 3D camera position,
 * render resolution or scene state.
 *
 * The module exposes a small API so the main application can query whether the
 * overlay is open and block gameplay input while the help panel is visible.
 *
 * @license AGPL-3.0
 */

/**
 * Public API for controlling the help overlay.
 *
 * @remarks
 *
 * The main application keeps a reference to this API and uses it to:
 *
 * - open or close the overlay from keyboard shortcuts;
 * - toggle the overlay from <kbd>F1</kbd> or <kbd>?</kbd>;
 * - ignore gameplay clicks and keyboard controls while the overlay is visible.
 *
 * @public
 */
export type HelpOverlayApi = {
  /**
   * Returns whether the help overlay is currently visible.
   *
   * @returns `true` when the overlay is open, otherwise `false`.
   *
   * @remarks
   *
   * This is used by input handlers to prevent camera controls and control room
   * clicks from being processed while the player is reading the help panel.
   */
  isOpen: () => boolean;

  /**
   * Opens or closes the help overlay.
   *
   * @param open - `true` to show the overlay, `false` to hide it.
   *
   * @remarks
   *
   * This method is the single source of truth for synchronising the internal
   * open state with the CSS class applied to the overlay DOM element.
   */
  setOpen: (open: boolean) => void;

  /**
   * Toggles the help overlay between open and closed states.
   *
   * @remarks
   *
   * The main keyboard handler uses this for the <kbd>F1</kbd> and <kbd>?</kbd>
   * shortcuts.
   */
  toggle: () => void;
};

/**
 * Creates the controls help overlay and attaches it to the document body.
 *
 * @returns A {@link HelpOverlayApi} for controlling the overlay after creation.
 *
 * @remarks
 *
 * The generated overlay contains four sections:
 *
 * - production/director controls;
 * - manual camera operation;
 * - virtual operator commands;
 * - help panel shortcuts.
 *
 * Visibility is controlled through the `visible` CSS class on the root overlay
 * element. The visual styling lives in `style.css`.
 *
 * @example
 *
 * ```ts
 * const helpOverlay = createHelpOverlay();
 *
 * window.addEventListener("keydown", (event) => {
 *   if (event.code === "F1" || event.key === "?") {
 *     helpOverlay.toggle();
 *   }
 * });
 * ```
 *
 * @public
 */
export function createHelpOverlay(): HelpOverlayApi {
  // Root overlay element. It covers the viewport when visible and contains the
  // full help panel markup.
  const helpOverlay = document.createElement("div");

  // Stable ID used by CSS to style and show/hide the overlay.
  helpOverlay.id = "help-overlay";

  // Static help content. The controls are written directly here because they
  // are part of the game UI and should stay close to the overlay implementation.
  helpOverlay.innerHTML = `
    <div class="help-panel">
      <div class="help-header">
        <h2>Controls</h2>
        <button id="help-close-button">×</button>
      </div>

      <div class="help-section">
        <h3>Realització</h3>
        <p><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> Seleccionar càmera a Preview</p>
        <p><kbd>Space</kbd> CUT: enviar Preview a Program</p>
      </div>

      <div class="help-section">
        <h3>Operació manual</h3>
        <p><kbd>Mouse wheel</kbd> Zoom in / zoom out de la càmera en Preview</p>
        <p><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> Moure la grua si Preview és CAM1</p>
        <p><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> Pan / tilt si Preview és CAM2, CAM3 o CAM4</p>
        <p><kbd>R</kbd> Reset de la càmera en Preview</p>
      </div>

      <div class="help-section">
        <h3>Ordres a operador</h3>
        <p><kbd>H</kbd> Enquadrar presentador</p>
        <p><kbd>J</kbd> Enquadrar convidat A</p>
        <p><kbd>K</kbd> Enquadrar convidat B</p>
        <p><kbd>G</kbd> Tornar a pla general / wide</p>
      </div>

      <div class="help-section">
        <h3>Ajuda</h3>
        <p><kbd>F1</kbd> o <kbd>?</kbd> Obrir / tancar aquesta ajuda</p>
        <p><kbd>Esc</kbd> Tancar ajuda</p>
      </div>
    </div>
  `;

  // Attach the overlay to the document so it exists independently of the
  // Three.js canvas and can cover the full viewport.
  document.body.appendChild(helpOverlay);

  // Close button inside the overlay header. Optional chaining is used below so
  // the module fails gracefully if the markup is changed accidentally.
  const helpCloseButton =
    document.querySelector<HTMLButtonElement>("#help-close-button");

  // Internal state mirrored by the root element's CSS class.
  let isHelpOpen = false;

  /**
   * Sets the overlay visibility state.
   *
   * @param open - Whether the help overlay should be visible.
   *
   * @remarks
   *
   * This helper updates both the JavaScript state and the DOM class used by CSS
   * to display the overlay.
   *
   * @internal
   */
  function setOpen(open: boolean) {
    // Keep the internal state in sync with the requested visibility.
    isHelpOpen = open;

    // The CSS decides how `.visible` is rendered. TypeScript only toggles the
    // state class.
    helpOverlay.classList.toggle("visible", isHelpOpen);
  }

  /**
   * Toggles the overlay visibility state.
   *
   * @remarks
   *
   * This is intentionally implemented through {@link setOpen} so all state and
   * CSS updates remain centralised in one place.
   *
   * @internal
   */
  function toggle() {
    setOpen(!isHelpOpen);
  }

  // Let the player close the overlay with the header button.
  helpCloseButton?.addEventListener("click", () => {
    setOpen(false);
  });

  // Return a tiny controller object instead of exposing DOM internals. This
  // keeps the rest of the application decoupled from the overlay markup.
  return {
    isOpen: () => isHelpOpen,
    setOpen,
    toggle,
  };
}
