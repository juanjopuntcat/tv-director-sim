export type HelpOverlayApi = {
  isOpen: () => boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export function createHelpOverlay(): HelpOverlayApi {
  const helpOverlay = document.createElement("div");
  helpOverlay.id = "help-overlay";
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

  document.body.appendChild(helpOverlay);

  const helpCloseButton =
    document.querySelector<HTMLButtonElement>("#help-close-button");

  let isHelpOpen = false;

  function setOpen(open: boolean) {
    isHelpOpen = open;
    helpOverlay.classList.toggle("visible", isHelpOpen);
  }

  function toggle() {
    setOpen(!isHelpOpen);
  }

  helpCloseButton?.addEventListener("click", () => {
    setOpen(false);
  });

  return {
    isOpen: () => isHelpOpen,
    setOpen,
    toggle,
  };
}
