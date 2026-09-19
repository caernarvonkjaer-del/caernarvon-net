// Milestone 59C-2 (C3). One readable-stream-to-Buffer helper, replacing nine
// byte-identical private copies across the E2E specs.
//
// Every spec that inspects a generated court artifact starts the same way:
// Playwright hands back a Download, and the file has to be read off its
// stream before ExcelJS, pdf-lib or a raw parser can see it. That four-line
// loop had been pasted into excel-b4-multi-account, excel-blank-page-pruning,
// excel-defined-names, excel-form-field-placement, excel-pruned-roundtrip,
// filing-identity.contract, guardian-blank-page-pruning,
// output-semantics.artifact and simplified-part1-identity-cells.
//
// Seven of the nine used `Buffer.from(chunk)` and two used `chunk as Buffer`.
// This keeps `Buffer.from`: the assertion form is a compile-time claim that a
// chunk is already a Buffer, which is true for a file stream but silently
// wrong for any source that yields Uint8Array, and it buys nothing here.

/**
 * Drains a readable stream into a single Buffer.
 *
 * Typical use, reading a Playwright download:
 *
 *   const download = await page.waitForEvent('download');
 *   const bytes = await readAll(await download.createReadStream());
 */
export async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
