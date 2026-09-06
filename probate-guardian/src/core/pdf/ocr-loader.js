import Tesseract from '../../../lib/tesseract/tesseract.esm.min.js';

let workerPromise = null;

function assetUrl(path) {
  const configuredBase = typeof import.meta.env === 'undefined' ? null : import.meta.env.BASE_URL;
  const base = configuredBase || new URL('./', window.location.href).pathname;
  return new URL(`${base}${path}`, window.location.origin).href;
}

async function getWorker() {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng', 1, {
      workerPath: assetUrl('lib/tesseract/worker.min.js'),
      corePath: assetUrl('lib/tesseract/core/tesseract-core-lstm.wasm.js'),
      langPath: assetUrl('lib/tesseract/lang/eng'),
      cacheMethod: 'none',
      workerBlobURL: false,
      logger: () => {},
    });
  }
  return workerPromise;
}

export async function recognizeSupportingDocument(source) {
  const worker = await getWorker();
  const result = await worker.recognize(source);
  return String(result?.data?.text || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}