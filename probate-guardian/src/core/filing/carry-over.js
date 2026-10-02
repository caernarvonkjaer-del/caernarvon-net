// Milestone 70, 70G: carrying a prior accounting's figures into a new one,
// and the source picker that chooses it. Moved from legacy-app.js's WARD
// MANAGEMENT; the carry tables and per-family builders (ACCOUNTING_FORM_TYPES
// through carryOverFieldsForAccounting()) came from
// src/core/navigation/ward-lifecycle.js, so every carry-over rule is here.
//
// Milestone 40C-A item 3: every carry-over/conversion builder below emits
// `county: ''`. Each used to read `src.county || 'Pinellas'`, which was wrong
// twice over -- it injected Pinellas when the source had no county, and it took
// the county from an arbitrary SOURCE FILING even when that filing was an older
// one filed in a county the ward has since left. County is now supplied from the
// canonical ward Party after the destination is linked to it. When the Party has
// no county the destination stays blank and the Cover asks -- which is the point
// of the decision.
//
// Milestone 51B corrected this comment. It used to name
// core/navigation/ward-county.js's linkDestinationToSourceWardParty() as the
// single entry point that legacy-app.js's carryOverFields() called. That was
// never true -- legacy-app.js never referenced that function -- and the stale
// pointer outlived the thing it pointed at until the function was deleted as
// dead code. The real single entry point is carryOverFields() below
// (legacy-app.js's until Milestone 70's 70G), which does this work inline
// (blanks county, carries wardPartyId, reconciles a filing-shaped probe against
// the Party, then sets county from the resolved Party). Every carry-over surface -- Add Ward, Convert Ward, in-place Load Ward
// Info, and new-year creation -- routes through it.
import { esc } from './escape-html.js';
import { formEngine, INVENTORY_TYPES } from './filing-registry.js';
import { normalizeCountyName } from '../navigation/ward-county.js';
import { reconcileSlotWithParty, resolveParty } from '../party-resolver.js';
import { getCaseFile } from '../state.js';
import { applyCarriedStartingBalance } from './starting-balance-carry.js';

export const ACCOUNTING_FORM_TYPES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];
export const PRIOR_ACCOUNTING_SOURCES = ['guardian', 'simplified', 'annual', 'finalAccounting', 'trustAccounting'];

// Which existing filings may seed a new one at creation time. Every filing for
// the same ward carries the same identity and contact block, so any type is a
// valid source for any other; the picker used to list one counterpart only and
// silently omitted the ward's other filings (Milestone 36-7 item 17).
export const CARRY_SOURCE_TYPE = {
  planInitial: ['guardian', 'annual', 'simplified', 'finalAccounting', 'trustAccounting', 'planInitial', 'planAnnual', 'planSimplified', 'planMinor'],
  planSimplified: ['simplified', 'guardian', 'annual', 'finalAccounting', 'trustAccounting', 'planSimplified', 'planInitial', 'planAnnual', 'planMinor'],
  planAnnual: ['annual', 'guardian', 'simplified', 'finalAccounting', 'trustAccounting', 'planAnnual', 'planInitial', 'planSimplified', 'planMinor'],
  planMinor: ['guardian', 'annual', 'simplified', 'finalAccounting', 'trustAccounting', 'planMinor', 'planInitial', 'planAnnual', 'planSimplified'],
  guardian: ['planInitial', 'annual', 'simplified', 'finalAccounting', 'trustAccounting', 'planAnnual', 'planSimplified', 'planMinor'],
  simplified: ['planSimplified', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'simplified'), 'planInitial', 'planAnnual', 'planMinor'],
  annual: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'annual'), 'planInitial', 'planSimplified', 'planMinor'],
  finalAccounting: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'finalAccounting'), 'planInitial', 'planSimplified', 'planMinor'],
  trustAccounting: ['planAnnual', ...PRIOR_ACCOUNTING_SOURCES.filter((t) => t !== 'trustAccounting'), 'planInitial', 'planSimplified', 'planMinor'],
};

export function carrySourcesFor(type) {
  return CARRY_SOURCE_TYPE[type] || [];
}

export function carryWardsFor(type, excludeWardId) {
  const srcs = carrySourcesFor(type);
  const caseFile = getCaseFile();
  return srcs.flatMap((st) => (caseFile.wards || []).filter((w) => w.inventoryType === st && w.wardId !== excludeWardId));
}

// Milestone 40C-F item 2. A Guardian Inventory source keeps attorney details
// NESTED at src.attorney.{name,barNumber,phone,streetAddress,cityStateZip}
// (see emptyDataGuardian()); every other source type stores them flat. The
// chains below read both. attyName has a second defect fixed the same way:
// a bare `src.attorney` fallback would, for a Guardian source with a blank
// attorneyForGuardian, resolve to the nested OBJECT and get assigned into a
// destination string field -- reading atty.name explicitly avoids that.
//
// Milestone 52F Decision 6: attyName's fallback order used to differ between
// carryOverFieldsForPlan() and carryOverFieldsForAccounting() -- the Plan
// version checked the cosmetic attorneyForGuardian before the authoritative
// atty.name; the Accounting version checked the cosmetic attorneyName before
// the authoritative attorney_name. probate-guardian-data-model.csv's own
// field descriptions (guardian_inventory rows 158/284, plan_initial rows
// 806/836) call one of each pair a cover/cosmetic field and the other
// validated/certification -- neither function actually implemented a
// consistent policy once that's known. Resolved: the authoritative field
// wins. See MILESTONE-52-PROPOSAL.md's 52F section for the full reasoning.
//
// gName's fallback order also differed (guardianName-then-guardianNames vs.
// the reverse; guardians[]-then-planGuardians[] vs. the reverse) but,
// unlike attyName, this was verified harmless before unifying it:
// guardianName belongs to guardian_inventory/plan_minor and guardianNames
// to plan_initial alone (per the same CSV), so a source ward never has both
// populated; guardians[] and planGuardians[] are likewise exclusive to the
// Accounting and Plan families respectively. Check order therefore never
// changes the result for any real ward shape. caseNum and the other four
// atty* fields (Bar, Phone, Email, Street, CityStateZip) already matched
// exactly between the two functions -- nothing to resolve there.
export function extractCarryIdentity(sourceWard) {
  const src = sourceWard || {};
  // Milestone 63E. The Uniform Case Number is its own number, so the two are carried
  // separately: `caseNum` is the Case # (caseNumber on every type; `ref` on a Minor plan,
  // whose cover has both a UCN and a Case #), and `ucn` is the UCN. This used to fold
  // caseNumber || ucn || ref into one value, and the Minor branch wrote it into `ucn` --
  // so a Case # carried into a Minor plan became its UCN, and a Minor plan's UCN carried
  // out as its Case #. Neither is ever written into the other now. (A source saved before
  // 63E has no `ucn` key on any type but Plan Minor; it reads as blank.) The dashboard's
  // identity rule, caseNumberOf() = ucn || ref for Minor, is separate and unchanged.
  const caseNum = src.caseNumber || src.ref || '';
  const ucn = src.ucn || '';
  const gName = src.guardianName || src.guardianNames || src.guardian
    || (src.guardians && src.guardians[0]?.name) || (src.planGuardians && src.planGuardians[0]?.name) || '';
  const atty = (src.attorney && typeof src.attorney === 'object') ? src.attorney : {};
  const attyFlat = typeof src.attorney === 'string' ? src.attorney : '';
  const attyName = src.attorney_name || atty.name || src.attorneyForGuardian || src.attorneyName || attyFlat || '';
  // Milestone 72B: the Simplified keeps its Bar number as attorney_barNumber,
  // which this chain never read, so a carry out of a Simplified lost it.
  const attyBar = src.attorneyBar || src.attorney_bar || src.attorney_barNumber || atty.barNumber || '';
  const attyPhone = src.attorneyPhone || src.attorney_phone || atty.phone || '';
  const attyEmail = src.attorneyEmail || src.attorney_email || atty.email || '';
  // Milestone 72B: the secondary email, under each form's spelling -- the
  // Inventory's attorney.secondaryEmail, attorney_secondaryEmail (Annual
  // family, Simplified, Initial Plan), attorney_secondary_email (Annual Plan,
  // Plan for Minors, Simplified Plan). It was never carried.
  const attySecondaryEmail = src.attorney_secondaryEmail || src.attorney_secondary_email || atty.secondaryEmail || '';
  const attyStreet = src.attorneyAddress || src.attorney_street || atty.streetAddress || '';
  const attyCityStateZip = src.attorneyCityStateZip || src.attorney_cityStateZip || atty.cityStateZip || '';
  return { caseNum, ucn, gName, attyName, attyBar, attyPhone, attyEmail, attySecondaryEmail, attyStreet, attyCityStateZip };
}

/**
 * Milestone 72B. The attorney a new filing starts with, under the destination
 * form's own field names -- every form now receives the name, Bar number,
 * phone, both emails and address. Before, the destinations disagreed: Plan ->
 * Annual wrote attorneyBar/attorneyPhone/attorneyEmail, keys the Annual never
 * reads (it reads attorney_bar ...), so all three were dropped; Plan ->
 * Simplified and -> Annual Plan carried only the name; the Simplified Plan
 * received no attorney at all; and no destination received the secondary
 * email, and several not even the primary. Signatures never carry: the new
 * filing is signed on its own date.
 * @param {string} type the destination inventoryType (the Annual family as 'annual')
 * @param {ReturnType<typeof extractCarryIdentity>} id
 */
export function attorneyCarryFields(type, id) {
  const { attyName, attyBar, attyPhone, attyEmail, attySecondaryEmail, attyStreet, attyCityStateZip } = id;
  switch (formEngine(type)) {
    case 'guardian':
      return {
        attorneyForGuardian: attyName,
        attorney: {
          name: attyName, barNumber: attyBar, phone: attyPhone, email: attyEmail, secondaryEmail: attySecondaryEmail,
          streetAddress: attyStreet, cityStateZip: attyCityStateZip,
          signatureDate: null, filingDate: null, signatureState: '', signatureImage: '',
        },
      };
    case 'annual':
      return { attorney: attyName, attorney_bar: attyBar, attorney_phone: attyPhone, attorney_email: attyEmail, attorney_secondaryEmail: attySecondaryEmail, attorney_street: attyStreet, attorney_cityStateZip: attyCityStateZip };
    case 'simplified':
      return { attorney: attyName, attorney_barNumber: attyBar, attorney_phone: attyPhone, attorney_email: attyEmail, attorney_secondaryEmail: attySecondaryEmail, attorney_street: attyStreet, attorney_cityStateZip: attyCityStateZip };
    case 'planAnnual':
      return { attorney: attyName, attorney_bar: attyBar, attorney_phone: attyPhone, attorney_email: attyEmail, attorney_secondary_email: attySecondaryEmail, attorney_street: attyStreet, attorney_cityStateZip: attyCityStateZip };
    case 'planInitial':
      return { attorneyName: attyName, attorney_name: attyName, attorney_bar: attyBar, attorney_phone: attyPhone, attorney_email: attyEmail, attorney_secondaryEmail: attySecondaryEmail, attorney_street: attyStreet, attorney_cityStateZip: attyCityStateZip };
    case 'planMinor':
    case 'planSimplified':
      return { attorney_name: attyName, attorney_bar: attyBar, attorney_phone: attyPhone, attorney_email: attyEmail, attorney_secondary_email: attySecondaryEmail, attorney_street: attyStreet, attorney_cityStateZip: attyCityStateZip };
    default:
      return {};
  }
}

export function carryOverFieldsForPlan(sourceWard, planType) {
  const src = sourceWard || {};
  const identity = extractCarryIdentity(sourceWard);
  const { caseNum, ucn, gName } = identity;
  const attorney = attorneyCarryFields(planType, identity);
  const gs = (src.guardians && src.guardians.length ? src.guardians : src.planGuardians) || [];

  if (planType === 'planInitial') {
    const g = gs[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      inceptionDate: src.gid || src.inceptionDate || '',
      guardianNames: gName,
      ...attorney,
      planGuardians: [
        {
          name: g.name || gName || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          street: g.streetAddress || g.street || g.mailingStreet || '',
          phone: g.phone || '',
          // Milestone 72C: the Initial Plan's guardian has an email now.
          email: g.email || '',
          cityStateZip: g.cityStateZip || g.mailingCityStateZip || '',
          signatureDate: '',
          relationship: g.relationship || '',
        },
        { name: '', ssn: '', street: '', phone: '', email: '', cityStateZip: '', signatureDate: '', relationship: '' },
        { name: '', ssn: '', street: '', phone: '', email: '', cityStateZip: '', signatureDate: '', relationship: '' },
        { name: '', ssn: '', street: '', phone: '', email: '', cityStateZip: '', signatureDate: '', relationship: '' },
      ],
    };
  }
  if (planType === 'planSimplified') {
    const mail = (g) => [g.mailingStreet || g.streetAddress || g.street, g.mailingCityStateZip || g.cityStateZip].filter(Boolean).join(', ');
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      ...attorney,
      planGuardians: [0, 1].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          signatureDate: '',
          email: g.email || '',
          phone: g.phone || '',
          mailingAddress: mail(g),
        };
      }),
    };
  }
  if (planType === 'planAnnual') {
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      gid: src.gid || src.inceptionDate || '',
      guardian: gName,
      ...attorney,
      planGuardians: [0, 1, 2].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          email: g.email || '',
          signatureDate: '',
          mailingStreet: g.mailingStreet || g.streetAddress || g.street || '',
          mailingCityStateZip: g.mailingCityStateZip || g.cityStateZip || '',
          officeStreet: g.officeStreet || '',
          officeCityStateZip: g.officeCityStateZip || '',
          relationship: g.relationship || '',
        };
      }),
    };
  }
  if (planType === 'planMinor') {
    return {
      wardName: src.wardName || '',
      county: '',
      // Milestone 58B-2: the facility or home the minor lives in. It rarely
      // changes year to year and was the one cover field the carry dropped,
      // so each new year reopened with it blank. `|| ''` deliberately: a
      // source without the field yields a blank for the filer to complete,
      // never an invented facility name carried in from somewhere else.
      q1ResidenceName: src.q1ResidenceName || '',
      ucn,
      ref: caseNum,
      guardianName: gName,
      ...attorney,
      planGuardians: [0, 1].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          tin: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          mailingStreet: g.mailingStreet || g.streetAddress || g.street || '',
          mailingCityStateZip: g.mailingCityStateZip || g.cityStateZip || '',
          relationship: g.relationship || '',
          email: g.email || '',
          signatureDate: '',
        };
      }),
    };
  }
  return {};
}

export function carryOverFieldsForAccounting(sourceWard, accountingType) {
  const src = sourceWard || {};
  const identity = extractCarryIdentity(sourceWard);
  const { caseNum, ucn, gName } = identity;
  const attorney = attorneyCarryFields(accountingType, identity);
  const gs = src.planGuardians || src.guardians || [];

  if (accountingType === 'guardian') {
    const g = gs[0] || {};
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      gid: src.inceptionDate || src.gid || '',
      guardianName: gName,
      // Milestone 40H-J: the Inventory's attorney is nested (attorney{...}),
      // which is what validateGuardian()/pdf-model.js read. Milestone 72B: it
      // has both emails too -- D-2 always collected them; the note that it
      // had "no email field" was wrong (attorneyCarryFields()).
      ...attorney,
      guardians: [
        {
          name: g.name || gName || '',
          ssnEin: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          // Milestone 72C: the Inventory's guardian has an email now.
          email: g.email || '',
          streetAddress: g.street || g.streetAddress || g.mailingStreet || '',
          cityStateZip: g.cityStateZip || g.mailingCityStateZip || '',
          signatureDate: null,
        },
      ],
    };
  }
  if (accountingType === 'simplified') {
    const split = (addr) => {
      const s = String(addr || '');
      const i = s.indexOf(', ');
      return i === -1 ? { street: s, cityStateZip: '' } : { street: s.slice(0, i), cityStateZip: s.slice(i + 2) };
    };
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      gid: src.gid || src.inceptionDate || '',
      guardian: gName,
      ...attorney,
      guardians: [0, 1, 2].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        const addr = g.mailingStreet ? { street: g.mailingStreet, cityStateZip: g.mailingCityStateZip || '' } : split(g.mailingAddress || g.streetAddress || g.street);
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          email: g.email || '',
          mailingStreet: addr.street || '',
          mailingCityStateZip: addr.cityStateZip || '',
          residenceStreet: '',
          residenceCityStateZip: '',
          signatureDate: '',
        };
      }),
    };
  }
  if (accountingType === 'annual') {
    return {
      wardName: src.wardName || '',
      caseNumber: caseNum,
      ucn,
      county: '',
      gid: src.gid || src.inceptionDate || '',
      guardian: gName,
      ...attorney,
      guardians: [0, 1, 2].map((i) => {
        const g = gs[i] || (i === 0 ? { name: gName } : {});
        return {
          name: g.name || (i === 0 ? gName : '') || '',
          ssn: g.ssn || g.ssnEin || g.tin || '',
          phone: g.phone || '',
          email: g.email || '',
          mailingStreet: g.mailingStreet || g.streetAddress || g.street || '',
          mailingCityStateZip: g.mailingCityStateZip || g.cityStateZip || '',
          officeStreet: g.officeStreet || '',
          officeCityStateZip: g.officeCityStateZip || '',
          signatureDate: '',
          signatureDateLabel: '',
        };
      }),
    };
  }
  return {};
}

// Accounting -> Accounting carry (e.g. Initial Inventory into a new Annual
// Accounting, or last period's Annual into this one). Only identity and
// contact details move; schedules, period dates, signatures and balances are
// deliberately left blank because they belong to the new filing period.
// Guardian rows use different field names per form, so each is read with a
// fallback across both conventions.
export function carryOverAccountingToAccounting(src,targetType){
  const gs=src.guardians||[];
  const engine=formEngine(targetType);
  const base={
    wardName:src.wardName||'',
    caseNumber:src.caseNumber||'',
    // Milestone 63E: the UCN is its own number and carries as the UCN (never into the Case #).
    ucn:src.ucn||'',
    // Milestone 40C-A item 3: blank here; carryOverFields() below supplies it
    // from the canonical ward Party. Unlike the two builders above this one,
    // THIS function is live (the others are shadowed by
    // core/navigation/ward-lifecycle.js's module versions), so this is the
    // legacy site that actually mattered.
    county:'',
    typeOfGuardianship:src.typeOfGuardianship||''
  };
  // Whoever the guardian/attorney are is stored under different keys on the
  // Initial Inventory than on the accountings.
  //
  // Milestone 40C-F item 2, third instance of the same defect (fixed the
  // same way as the other two, core/navigation/ward-lifecycle.js's
  // carryOverFieldsForPlan/carryOverFieldsForAccounting -- see that file's
  // extractCarryIdentity() for the full history): a Guardian Inventory
  // keeps attorney details NESTED at src.attorney.{name,...}, and Guardian
  // Inventory is in ACCOUNTING_FORM_TYPES, so this accounting-to-accounting
  // path handles guardian -> annual/simplified and used to hit the object
  // directly -- `src.attorneyForGuardian||src.attorney` assigned the whole
  // nested OBJECT into the destination's flat `attorney` string field
  // whenever attorneyForGuardian was blank. Caught by
  // carryover-workflow.spec.ts.
  //
  // Milestone 52F Decision 6: this function's own attorneyName order
  // (attorneyForGuardian||srcAttyFlat||srcAtty.name, and it never checked
  // the flat attorney_name/attorneyName fields at all) was a FOURTH order,
  // not a copy of either ward-lifecycle.js function's -- confirmed while
  // investigating whether this function could share extractCarryIdentity()
  // at all. It can, for the guardian-name and attorney fields: gName's
  // chain there is a strict superset of this function's own bare
  // `src.guardianName||src.guardian` (more fallbacks, never fewer), and
  // attyName now gets Decision 6's resolved authoritative-field-wins order
  // like the other two carry-over directions. caseNumber above is left as
  // its own simple src.caseNumber||'' -- extractCarryIdentity()'s caseNum
  // adds ucn/ref fallbacks that matter for Plan Minor sources, which never
  // reach this accounting-to-accounting-only function.
  const identity=extractCarryIdentity(src);
  const { gName: guardianName } = identity;
  // Milestone 72B: the attorney under the destination's own names, both
  // emails included -- none of these three branches carried an email.
  const attorney=attorneyCarryFields(engine,identity);

  if(engine==='guardian'){
    return {...base, gid:src.gid||'', guardianName, ...attorney,
      guardians:gs.slice(0,1).map(g=>({
        name:g.name||'', ssnEin:g.ssnEin||g.ssn||'', phone:g.phone||'',
        // Milestone 72C: the Inventory's guardian has an email now.
        email:g.email||'',
        streetAddress:g.streetAddress||g.mailingStreet||'',
        cityStateZip:g.cityStateZip||g.mailingCityStateZip||'', signatureDate:null
      }))};
  }
  if(engine==='simplified'){
    return {...base, gid:src.gid||'', guardian:guardianName, ...attorney,
      guardians:[0,1,2].map(i=>{
        const g=gs[i]||{};
        return {name:g.name||'', ssn:g.ssn||g.ssnEin||'', phone:g.phone||'', email:g.email||'',
          mailingStreet:g.mailingStreet||g.streetAddress||'',
          mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
          residenceStreet:'', residenceCityStateZip:'', signatureDate:''};
      })};
  }
  // annual family (annual / finalAccounting / trustAccounting)
  //
  // Milestone 40H-I: guardian->annual and simplified->annual sources already
  // get startingBalance/certRecipients from their own dedicated financial
  // mappers (convertGuardianSchedulesToAnnual()/convertSimplifiedToAnnual(),
  // which run after this identity carry and would just overwrite anything
  // set here). The gap was specifically an annual-family source (e.g. Annual
  // -> Final/Trust) converting to another annual-family target: no financial
  // mapper exists for that pair at all, so neither field ever carried --
  // starting balance should equal the prior filing's ending net assets (the
  // actual statutory continuity), and certificate-of-service recipients are
  // typically the same interested parties across a ward's filings. Guarded
  // to that one source/target combination so it can't shadow or race the
  // two dedicated mappers' own values for the other two paths.
  const carryingFinancials = formEngine(src.inventoryType)==='annual';
  // Milestone 71E: the one carry (starting-balance-carry.js) -- Line 30, or
  // Line 20 when the source has no Schedule D figure (this used to carry Line
  // 30 even when it was a meaningless $0), rounded to cents by the workbook's
  // rule, nothing across the trust boundary, and a provenance record the
  // Starting Balance notes read.
  const carried={};
  if(carryingFinancials)applyCarriedStartingBalance(carried,src,targetType);
  return {...base, gid:src.gid||'', guardian:guardianName, ...attorney,
    ...(carryingFinancials ? {
      ...carried,
      certRecipients:(src.certRecipients||[]).map(r=>({...r})),
    } : {}),
    guardians:[0,1,2].map(i=>{
      const g=gs[i]||{};
      return {name:g.name||'', ssn:g.ssn||g.ssnEin||'', phone:g.phone||'', email:g.email||'',
        mailingStreet:g.mailingStreet||g.streetAddress||'',
        mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
        officeStreet:g.officeStreet||'', officeCityStateZip:g.officeCityStateZip||'',
        signatureDate:'', signatureDateLabel:''};
    })};
}

// Single entry point used by every carry-over surface (Add Ward, Convert
// Ward, in-place Load Ward Info) — picks the right-direction mapper based on
// the source AND target types, so callers don't need to know which direction
// they're going.
export function carryOverFields(sourceWard,targetType){
  const srcIsAccounting=ACCOUNTING_FORM_TYPES.includes(sourceWard.inventoryType);
  const targetIsAccounting=ACCOUNTING_FORM_TYPES.includes(targetType);
  const fields=/** @type {Record<string, any>} */ (targetIsAccounting
    ? (srcIsAccounting
        ? carryOverAccountingToAccounting(sourceWard,targetType)
        : carryOverFieldsForAccounting(sourceWard,formEngine(targetType)))
    : carryOverFieldsForPlan(sourceWard,targetType));
  // Milestone 40C-A item 3 / 40C-F item 3. Every builder above now leaves
  // `county` blank; this is the one place that fills it, and it takes the value
  // from the source's canonical ward PARTY rather than from the source filing's
  // own snapshot. The distinction matters: a source filing is a historical
  // record that may name a county the ward has since moved away from, and the
  // decision forbids obtaining county from an arbitrary source filing.
  //
  // Linking the destination to the same ward Party is what makes this ward's
  // later filings hydrate without re-asking. `wardPartyId` rides along in the
  // returned fields, so it lands on the destination wherever the caller merges
  // them (Add Ward, Convert Ward, and in-place Load Ward Info all route here).
  const wardPartyId=sourceWard&&sourceWard.wardPartyId;
  fields.county='';
  if(wardPartyId){
    fields.wardPartyId=wardPartyId;
    // Milestone 49B: the ward's identity (residence, SSN, ...) comes from the
    // Party -- the current record -- with the source's copy filling any gap.
    // The destination doesn't exist yet, so reconcile a filing-shaped probe
    // and carry its fields along.
    const probe={...fields,inventoryType:targetType};
    if(reconcileSlotWithParty(probe,'ward',0)){
      for(const k of Object.keys(probe))if(k!=='inventoryType')fields[k]=probe[k];
    }
    const party=resolveParty(wardPartyId);
    const canonical=normalizeCountyName(party&&party.county);
    if(canonical)fields.county=canonical;
  }
  return fields;
}

// Populates the "Load Ward Info From" picker in the Add Ward modal based on
// the currently-selected Inventory Type, showing it only when that type has
// a carry-over source AND at least one matching ward already exists.
// Populates a "Load Ward Info From" <select> with existing wards eligible to
// pre-fill a new form of `type`. When the typed name exactly matches a name
// already on file, the list narrows to just that person's other filings —
// the usual case, pulling forward the SAME ward's earlier form — and
// auto-selects when there's exactly one such match, so picking an existing
// name is enough to auto-fill the new form without a second, separate pick.
// Every eligible source stays available (via "Start Blank" being the only
// other default) whenever the name doesn't narrow things down, so the user
// can still choose from any previously filled-out form manually.
export function refreshCarrySourceSelect(sel,wrap,type,name,autonoteEl){
  const allMatches=carryWardsFor(type);
  // Always shown, even with nothing to offer yet. Hiding it entirely made
  // the feature look like it didn't exist on a fresh install; a disabled
  // control that says why is discoverable instead.
  wrap.style.display='block';
  if(!allMatches.length){
    sel.innerHTML='<option value="">— No other forms yet to pull from —</option>';
    sel.disabled=true;
    if(autonoteEl)autonoteEl.style.display='none';
    return;
  }
  const q=(name||'').trim().toLowerCase();
  const namedMatches=q?allMatches.filter(w=>(w.wardName||'').trim().toLowerCase()===q):[];
  const list=namedMatches.length?namedMatches:allMatches;
  sel.disabled=false;
  sel.innerHTML='<option value="">— Start Blank —</option>'
    +list.map(w=>`<option value="${w.wardId}">${esc(w.wardName)}${w.caseNumber?' — '+esc(w.caseNumber):''} (${esc(INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType)})</option>`).join('');
  if(namedMatches.length===1){
    sel.value=namedMatches[0].wardId;
    if(autonoteEl){
      autonoteEl.textContent=`Auto-filling from ${namedMatches[0].wardName}'s ${INVENTORY_TYPES[namedMatches[0].inventoryType]?.name||namedMatches[0].inventoryType} — change the picker above to use a different form instead.`;
      autonoteEl.style.display='block';
    }
  }else{
    sel.value='';
    if(autonoteEl)autonoteEl.style.display='none';
  }
}

export function updateCarrySourcePicker(){
  const type=/** @type {HTMLSelectElement} */ (document.getElementById('new-ward-type')).value;
  const name=/** @type {HTMLInputElement} */ (document.getElementById('new-ward-name')).value;
  refreshCarrySourceSelect(document.getElementById('carry-source-ward'),document.getElementById('carry-source-wrap'),type,name,document.getElementById('carry-source-autonote'));
}

// Auto-fills the ward-name field to match the selected source ward, without
// overriding a name the user has already started typing differently.
export function onCarrySourceChange(){
  const sourceId=/** @type {HTMLSelectElement} */ (document.getElementById('carry-source-ward')).value;
  if(!sourceId)return;
  const src=getCaseFile().wards.find(w=>w.wardId===sourceId);
  if(!src)return;
  const nameEl=/** @type {HTMLInputElement} */ (document.getElementById('new-ward-name'));
  if(!nameEl.value.trim())nameEl.value=src.wardName||'';
}
