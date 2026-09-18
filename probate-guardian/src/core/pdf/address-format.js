// Canonical PDF display-address composition. Form state intentionally keeps
// street and city/state/ZIP as separate user-entered fields; this is the sole
// boundary that brings them together for PDF tables and signature details.
//
// composePdfAddressLines() is the primary form and returns ONE ENTRY PER
// STORED FIELD, which is what the renderers use to print an address in
// standard US form (delivery line, any secondary unit, then city/state/ZIP).
// The previous arrangement joined the fields into one comma-separated string
// and had the renderer reverse-engineer the line breaks back out of the
// commas. That round trip is lossy: a filer who typed "St. Petersburg FL
// 33704" with no comma got the whole address collapsed back onto one line,
// because the split had nothing to key on. Keeping the parts apart means the
// filer's punctuation cannot change the layout.
export function composePdfAddressLines(...parts) {
  return parts
    .flatMap((part) => String(part ?? '').split(/\r?\n/))
    .map((part) => part
      .trim()
      .replace(/\s*,\s*/g, ', ')
      .replace(/(?:,\s*){2,}/g, ', ')
      .replace(/^,\s*|,\s*$/g, ''))
    .filter(Boolean);
}

// There is deliberately no single-line composer. The joined form existed only
// so a renderer could split it apart again, and every call site now takes the
// lines directly.
