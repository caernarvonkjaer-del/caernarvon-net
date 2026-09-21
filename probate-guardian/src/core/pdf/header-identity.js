// Milestone 63E. The text of the case-identity lines in a filing's printed header:
// the Case # that has always been there, plus the Uniform Case Number (UCN) when
// the filing has one.
//
// The header has two draw sites in pdf-engine.js -- the pleading block on page 1
// (bold 10 pt, centred) and the running header's right cell on every later page
// (8 pt, right-aligned, two lines of room). This module decides only WHAT they say,
// once, so the label wording, the omit-when-blank rule and the line order cannot
// drift between them; the engine keeps drawing them in the existing Case # style,
// which is the requirement ("same line and formatting as Case #").
//
//   Page 1            one line: "UCN: <ucn>   CASE #: <case>". The two together
//                     measure ~284 pt in bold 10 pt against 468 pt of room.
//   Later pages       two lines in the right cell: "UCN: <ucn>" then "Case #:
//                     <case>". On ONE line they measure 209-222 pt at 8 pt against a
//                     146 pt cell -- they do not fit (measured with the embedded
//                     Liberation Sans) -- while each alone does (133 pt and 83-115 pt).
//
// D8: the UCN is optional and omitted when blank -- no "Pending" placeholder, unlike
// Case # -- so a filing without one prints exactly as it always did, and an old .sav
// (which has no `ucn` key at all on Guardian, Annual and Simplified) is unchanged.
// Case # keeps its "Pending" fallback.

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * @param {{ caseNumber?: string, ucn?: string|null }} identity
 * @returns {{ firstPage: string, continuation: string[] }}
 */
export function headerIdentityLines({ caseNumber, ucn } = {}) {
  const caseText = clean(caseNumber) || 'Pending';
  const ucnText = clean(ucn);
  if (!ucnText) {
    return { firstPage: `CASE #: ${caseText}`, continuation: [`Case #: ${caseText}`] };
  }
  return {
    firstPage: `UCN: ${ucnText}   CASE #: ${caseText}`,
    continuation: [`UCN: ${ucnText}`, `Case #: ${caseText}`],
  };
}
