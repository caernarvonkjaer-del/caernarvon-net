// Canonical SSN/EIN/TIN display masking for PDF models, print preview, and exports.
// Masks all but the last 4 digits (replacing the first 5 digits with ***-**-)
// so unmasked SSN digits 1-5 are NEVER passed to print, save, or preview outputs.
export function maskSSN(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (!str) return '';
  if (/^\*+-\*+-/.test(str) || /^\*+/.test(str)) return str;

  const digits = str.replace(/\D/g, '');
  if (!digits) return str;

  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `***-**-${last4}`;
  }
  return `***-**-${digits}`;
}
