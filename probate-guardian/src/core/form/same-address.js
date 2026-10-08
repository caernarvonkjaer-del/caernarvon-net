// Milestone 74P (decision 74P-3): "Same as" for an address typed twice (QA
// report UX-24). Two pairs:
//
//   - the ward's mailing address and residence, on the Initial and Annual
//     Plans' covers (mailingSameAsResidence);
//   - each guardian's residence / office address and mailing address, on the
//     Annual, Final and Trust Accounting's Part III and the Annual Plan's
//     Signatures (officeSameAsMailing, on the guardian's row).
//
// Ticked, the second address is hidden on the page and filed as the first --
// on the PDF and the Annual's workbook. What was typed in the second address
// stays in the filing and comes back when the box is unticked (AGENTS.md
// section 4). A checkbox, not a tri-state: unticked (false or absent) is the
// default, never an answer someone must give.

const isTicked = (v) => v === true;

/**
 * The filing as it is filed: a copy in which every ticked pair's second
 * address is the first, or the filing itself when nothing is ticked. The
 * stored values are never changed.
 * @template {Record<string, any>} T
 * @param {T} filing
 * @returns {T}
 */
export function withSameAddresses(filing) {
  if (!filing || typeof filing !== 'object') return filing;
  let out = filing;
  const copy = () => { if (out === filing) out = { ...filing }; return out; };
  if (isTicked(filing.mailingSameAsResidence)) {
    copy().mailingAddress = filing.residenceAddress ?? '';
    out.mailingCityStateZip = filing.residenceCityStateZip ?? '';
  }
  for (const list of ['guardians', 'planGuardians']) {
    const rows = filing[list];
    if (!Array.isArray(rows) || !rows.some((r) => isTicked(r?.officeSameAsMailing))) continue;
    copy()[list] = rows.map((r) => (isTicked(r?.officeSameAsMailing)
      ? { ...r, officeStreet: r.mailingStreet ?? '', officeCityStateZip: r.mailingCityStateZip ?? '' }
      : r));
  }
  return out;
}

/** A guardian row's residence / office address as filed. */
export function filedOffice(row) {
  return isTicked(row?.officeSameAsMailing)
    ? { street: row?.mailingStreet ?? '', cityStateZip: row?.mailingCityStateZip ?? '' }
    : { street: row?.officeStreet ?? '', cityStateZip: row?.officeCityStateZip ?? '' };
}
