import { createCanvas, Image as NativeImage, type Canvas } from '@napi-rs/canvas';
import { vi } from 'vitest';
const canvases = new WeakMap<HTMLCanvasElement, Canvas>();
const blobs = new Map<string, Blob>();
function canvasFor(element: HTMLCanvasElement) {
  let canvas = canvases.get(element);
  if (!canvas || canvas.width !== element.width || canvas.height !== element.height) {
    canvas = createCanvas(element.width, element.height); canvases.set(element, canvas);
  }
  return canvas;
}
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { configurable: true, value: function(this: HTMLCanvasElement) { return canvasFor(this).getContext('2d'); } });
Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', { configurable: true, value: function(this: HTMLCanvasElement, callback: (blob: Blob | null) => void) { callback(new Blob([new Uint8Array(canvasFor(this).toBuffer('image/png'))], { type: 'image/png' })); } });
vi.stubGlobal('Image', function() {
  const image = new NativeImage();
  const descriptor = Object.getOwnPropertyDescriptor(NativeImage.prototype, 'src')!;
  Object.defineProperty(image, 'src', { set(value: string | Uint8Array) {
    const blob = typeof value === 'string' ? blobs.get(value) : null;
    if (blob) {
      const reader = new FileReader();
      reader.onload = () => descriptor.set!.call(image, new Uint8Array(reader.result as ArrayBuffer));
      reader.readAsArrayBuffer(blob);
    } else descriptor.set!.call(image, value);
  } });
  return image;
});
URL.createObjectURL = (blob: Blob) => { const url = `blob:test-${blobs.size}-${Math.random()}`; blobs.set(url, blob); return url; };
URL.revokeObjectURL = (url: string) => { blobs.delete(url); };
