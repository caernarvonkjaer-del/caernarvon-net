// Canonical PDF display-address composition. Form state intentionally keeps
// street and city/state/ZIP as user-entered fields; this is the sole boundary
// that joins them for PDF tables and signature details.
export function composePdfAddress(...parts) {
  return parts
    .flatMap((part) => String(part ?? '').split(/\r?\n/))
    .map((part) => part.trim().replace(/\s*,\s*/g, ', '))
    .filter(Boolean)
    .join(', ')
    .replace(/(?:,\s*){2,}/g, ', ')
    .replace(/^,\s*|,\s*$/g, '');
}
