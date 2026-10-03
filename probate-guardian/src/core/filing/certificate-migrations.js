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

// ── Milestone 72H: the certificate's attorney is the filing's attorney ──────
//
// The Clerk's workbooks tie the certificate of service to the filing's
// attorney: its name is a formula linked to the Cover, and on the Annual its
// Bar number and address are linked too. The Inventory's D-5 and the
// Simplified's Part VI asked for the name, Bar number, phone and address again,
// so a typo or a later correction left the certificate printing a different
// attorney's details. They now print the filing attorney's (D-2; Part V).
//
// What a filer typed on the old certificate is never thrown away unasked
// (AGENTS.md section 4): on the first open after 72H each old detail fills the
// matching filing-attorney field where that one is blank; anything that still
// differs is listed on the certificate page with a "Discard old details"
// button, until discarded or made to match.

/** Each engine's old certificate fields, the filing-attorney field each fills, and its label. */
const CERT_ATTORNEY_FIELDS = Object.freeze({
  guardian: Object.freeze([
    Object.freeze({ old: 'serviceAttorney.name', current: 'attorney.name', label: "Attorney's Name" }),
    Object.freeze({ old: 'serviceAttorney.barNumber', current: 'attorney.barNumber', label: 'Florida Bar #' }),
    Object.freeze({ old: 'serviceAttorney.phone', current: 'attorney.phone', label: 'Phone' }),
    Object.freeze({ old: 'serviceAttorney.streetAddress', current: 'attorney.streetAddress', label: 'Street Address' }),
    Object.freeze({ old: 'serviceAttorney.cityStateZip', current: 'attorney.cityStateZip', label: 'City / State / Zip' }),
  ]),
  simplified: Object.freeze([
    Object.freeze({ old: 'certAttyBarNumber', current: 'attorney_barNumber', label: 'Florida Bar #' }),
    Object.freeze({ old: 'certAttyPhone', current: 'attorney_phone', label: 'Phone' }),
    Object.freeze({ old: 'certAttyStreet', current: 'attorney_street', label: 'Street Address' }),
    Object.freeze({ old: 'certAttyCityStateZip', current: 'attorney_cityStateZip', label: 'City / State / Zip' }),
  ]),
});

/** Where each engine's filing attorney is entered, for the page's wording. */
export const CERT_ATTORNEY_SOURCE = Object.freeze({ guardian: 'D-2', simplified: 'Part V' });

const readPath = (o, path) => path.split('.').reduce((v, k) => (v == null ? undefined : v[k]), o);
function writePath(o, path, value) {
  const keys = path.split('.');
  let t = o;
  for (const k of keys.slice(0, -1)) {
    if (!t[k] || typeof t[k] !== 'object') t[k] = {};
    t = t[k];
  }
  t[keys[keys.length - 1]] = value;
}

/**
 * Once per filing: each old certificate detail fills the matching
 * filing-attorney field where that one is blank. Sets `certAttorneyMigrated`
 * either way, so a field the filer clears later is never refilled. Returns
 * the labels of the fields filled (possibly none), or null when it did not
 * run (already done, or not an engine with an old certificate).
 */
export function fillAttorneyFromOldCertificate(filing, engineId) {
  const fields = CERT_ATTORNEY_FIELDS[engineId];
  if (!filing || typeof filing !== 'object' || !fields || filing.certAttorneyMigrated === true) return null;
  const filled = [];
  for (const f of fields) {
    const old = readPath(filing, f.old);
    if (text(old) && !text(readPath(filing, f.current))) {
      writePath(filing, f.current, old);
      filled.push(f.label);
    }
  }
  filing.certAttorneyMigrated = true;
  return filled;
}

/**
 * The same fill, read-only, for a filing being converted without being
 * opened (decided at the Antigravity review): the source is left untouched
 * and a copy with the filing attorney as the fill would leave it is returned.
 * A filing already opened since 72H is returned as it is.
 */
export function withOldCertificateFilled(filing, engineId) {
  if (!filing || filing.certAttorneyMigrated === true || !CERT_ATTORNEY_FIELDS[engineId]) return filing;
  const copy = { ...filing };
  if (filing.attorney && typeof filing.attorney === 'object') copy.attorney = { ...filing.attorney };
  fillAttorneyFromOldCertificate(copy, engineId);
  return copy;
}

/** The old certificate details that still differ from the filing attorney's (trimmed). */
export function oldCertificateDetails(filing, engineId) {
  const fields = CERT_ATTORNEY_FIELDS[engineId];
  if (!filing || !fields) return [];
  return fields
    .map((f) => ({ ...f, oldValue: text(readPath(filing, f.old)), currentValue: text(readPath(filing, f.current)) }))
    .filter((f) => f.oldValue && f.oldValue !== f.currentValue)
    .map(({ label, old, oldValue, currentValue }) => ({ label, path: old, old: oldValue, current: currentValue }));
}

/** "Discard old details": the filer's explicit deletion. Returns how many were cleared. */
export function discardOldCertificateDetails(filing, engineId) {
  const fields = CERT_ATTORNEY_FIELDS[engineId];
  if (!filing || !fields) return 0;
  let cleared = 0;
  for (const f of fields) {
    if (text(readPath(filing, f.old))) {
      writePath(filing, f.old, '');
      cleared++;
    }
  }
  return cleared;
}

/**
 * Importing a workbook (72H step 8). For each detail the workbook holds twice
 * -- the filing attorney's box and the certificate's -- compared after
 * trimming spaces and nothing else: the same, or the certificate's blank,
 * keeps nothing for the certificate; the filing attorney's blank fills it from
 * the certificate's; both filled and different keeps the certificate's as an
 * old detail, shown on the certificate page.
 * @param {Record<string, string>} attorney the filing attorney's boxes, by key
 * @param {Record<string, string>} certificate the certificate's boxes, same keys
 * @returns {{ attorney: Record<string, string>, old: Record<string, string> }}
 */
export function compareImportedCertificate(attorney, certificate) {
  const out = { attorney: { ...attorney }, old: {} };
  for (const key of Object.keys(certificate)) {
    const a = text(attorney[key]);
    const c = text(certificate[key]);
    if (!c || c === a) { out.old[key] = ''; continue; }
    if (!a) { out.attorney[key] = certificate[key]; out.old[key] = ''; continue; }
    out.old[key] = certificate[key];
  }
  return out;
}
