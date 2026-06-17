import * as THREE from "three";

export function createCanvasLabel(text: string, width = 512, height = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 46px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  return new THREE.CanvasTexture(canvas);
}
