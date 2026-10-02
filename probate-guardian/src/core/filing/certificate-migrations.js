// Milestone 72: once-only changes to a saved filing's certificate of service,
// for certificates whose printed signer or details a 72 change would otherwise
// move. Pure: each takes the active filing, changes it in place, and returns
// true when anything changed so the caller can save. Called from the affected
// form's mount() once the filing is active (the bond migration's pattern), so
// a filing nobody reopens is never touched.

const text = (v) => String(v ?? '').trim();

/**
 * Milestone 72C, the Simplified Plan. Its certificate used to look for the
 * attorney under `attorney`, a field this form does not have (its attorney is
 * `attorney_name`), so a blank signer choice always resolved to Guardian 1.
 * Now that it finds the attorney, a blank choice resolves to the attorney
 * whenever one is named -- which would put a signature the guardian already
 * applied under the attorney's printed name.
 *
 * So, once, a blank `certSigner` on a certificate carrying any signature (a
 * date, an applied signature state, or an image) is saved as 'guardian': what
 * it printed. The `certSignerMigrated` marker is set either way, so a
 * certificate the attorney signs later, under the new default, is never pinned
 * to the guardian. An unsigned certificate is left to the default.
 */
export function pinPlanSimplifiedCertSigner(filing) {
  if (!filing || typeof filing !== 'object' || filing.certSignerMigrated === true) return false;
  const state = text(filing.certSignatureState);
  const signed = text(filing.certSignatureDate) !== ''
    || (state !== '' && state !== 'none')
    || text(filing.certSignatureImage) !== '';
  if (signed && text(filing.certSigner) === '') filing.certSigner = 'guardian';
  filing.certSignerMigrated = true;
  return true;
}
