// Shared by src/core/signature/signature-pad.js (capture-time validation)
// and src/core/pdf/pdf-engine.js (render-time aspect-ratio-preserving
// sizing) so both read a PNG's real pixel dimensions the same way, straight
// out of its IHDR chunk (always the first chunk, at a fixed byte offset) --
// no Image()/decode round trip needed just to measure.

export function readPngDimensions(bytes) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
