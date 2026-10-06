// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js -> nav-marks.js -> section-marks.js -> the
// export checks, Milestone 73F part 2); never written with JSDoc types (AGENTS.md section 2).
// Milestone 73F part 1: the Verified Initial Inventory's export checks, moved unchanged from
// src/features/guardian-inventory/index.js's validateGuardian() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validateGuardian() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { RECIPIENTS_OR_ATTESTATION, serviceRecipientIssues } from '../service-recipients.js';
import { SCHEDULE_NAV_KEYS } from '../../filing/models/guardian.js';
import { rowStarted } from '../row-started.js';
import { certifyingCandidates, resolveServiceCertifier } from '../../filing/unrepresented-filing.js';
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState, signaturePolicyOf } from '../signature-state.js';
import { hasIdentifiedPreparer } from '../../form/preparer-flag.js';
import { isAttorneyStarted } from '../attorney-block.js';
import { issueFactory } from '../validation-issue.js';
import { percentProblem } from '../percent-range.js';

export const INVENTORY_SHARE_FIELDS = [
  ['scheduleA1', 'A-1', 'wardPercent', "Ward's %"], ['scheduleA2', 'A-2', 'wardPercent', "Ward's %"],
  ['scheduleB1', 'B-1', 'wardPercent', "Ward's %"], ['scheduleB2', 'B-2', 'wardPercent', "Ward's %"],
  ['scheduleB3', 'B-3', 'wardPercent', "Ward's %"], ['scheduleB4', 'B-4', 'wardPercent', "Ward's %"],
  ['scheduleC1', 'C-1', 'wardPercent', "Ward's %"], ['scheduleC2', 'C-2', 'wardPercent', "Ward's %"],
  ['scheduleC3', 'C-3', 'wardPercent', "Ward's %"], ['scheduleC4', 'C-4', 'wardPercent', "Ward's %"],
  ['scheduleC5', 'C-5', 'jointOwnerPercent', "Joint Owner's %"],
];
export const RECIPIENT_STARTED_FIELDS = ['name', 'address', 'cityStateZip'];
export const sdbIsYes = (v) => v === true || v === 'Yes';
export const sdbIsNo = (v) => v === false || v === 'No';
export const sdbAnswered = (v) => sdbIsYes(v) || sdbIsNo(v);

export function collectGuardianIssues(d){
  const errors=[];
  const issue=issueFactory('guardian');
  const T='guardian';
  function req(v,label,path){if(!v||!String(v).trim())errors.push(issue(label,path));}
  const push=(label,path)=>errors.push(issue(label,path));
  req(d.wardName,'Cover — Name of Ward is required.','wardName');
  req(d.caseNumber,'Cover — Case Number is required.','caseNumber');
  if(!d.gid)push('Cover — Guardianship Inception Date (GID) is required.','gid');
  req(d.county,'Cover — County is required.','county');
  req(d.guardianName,'Cover — Guardian Name(s) is required.','guardianName');
  // Milestone 71B: every attorney requirement applies only once the filer has
  // started entering an attorney. A guardian advocate (Rule 5.030(a)), a
  // guardian whose representation the court waived, or a guardian who is a
  // Florida attorney files with none; AGENTS.md section 4 keeps attorney
  // certification off such a filing's export gate. Why there is no attorney is
  // asked on the Cover and noted on Preview & Export (unrepresented-filing.js).
  const attorneyStarted=isAttorneyStarted(d,'guardian');
  if(attorneyStarted)req(d.attorneyForGuardian,'Cover — Attorney for Guardian is required.','attorneyForGuardian');
  req(d.typeOfGuardianship,'Cover — Type of Guardianship is required.','typeOfGuardianship');
  // A schedule left totally untouched -- no rows, and the "I verify there
  // are no X to report" checkbox (scheduleEmptyHTML()/setScheduleNoItems())
  // never checked -- produced NO validate() errors before this, since every
  // per-row check below is inside a .forEach() that simply never runs on an
  // empty array. That's what let a schedule sit blank-and-unconfirmed while
  // still showing 100% complete in the sidebar (computeNavChecks() derives
  // its checks from these same errors) and passing Print Preview's export
  // gate. Mirrors the same "row or checkbox" rule the schedule's own Next
  // button already enforces (isScheduleIncomplete()), so there's exactly
  // one definition of "done" for a schedule, not two that can disagree.
  SCHEDULE_NAV_KEYS.forEach(key=>{
    const dataKey='schedule'+key[0].toUpperCase()+key.slice(1);
    if((d[dataKey]||[]).length===0&&!(d.scheduleNoItems&&d.scheduleNoItems[key])){
      const route=key[0].toUpperCase()+'-'+key.slice(1);
      push(`${route} — Add at least one entry, or check the box verifying there are none, before this schedule counts as complete.`,`scheduleNoItems.${key}`);
    }
  });
  // Row paths: `<collection>.<index>.<field>`. Schedule B-2's vehicle
  // sub-fields are raw inputs with no data-bind -- their only focusable
  // selector is the literal element id (see renderB2Fields()).
  d.scheduleA1.forEach((e,i)=>{const p=`A-1 row ${i+1}`,k=`scheduleA1.${i}`;req(e.propertyDescription,`${p} — Property Description`,`${k}.propertyDescription`);req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);if(e.fullAssetValue<=0)push(`${p} — Full Asset Value must be > 0.`,`${k}.fullAssetValue`);if(e.wardPercent<=0)push(`${p} — Ward's % must be > 0.`,`${k}.wardPercent`);});
  d.scheduleA2.forEach((e,i)=>{const p=`A-2 row ${i+1}`,k=`scheduleA2.${i}`;req(e.lenderName,`${p} — Lender Name`,`${k}.lenderName`);req(e.lenderAddress,`${p} — Lender Address`,`${k}.lenderAddress`);req(e.lenderCityStateZip,`${p} — Lender City/State/Zip`,`${k}.lenderCityStateZip`);if(e.fullDebtBalance<=0)push(`${p} — Full Debt Balance must be > 0.`,`${k}.fullDebtBalance`);});
  d.scheduleB1.forEach((e,i)=>{const p=`B-1 row ${i+1}`,k=`scheduleB1.${i}`;req(e.institutionName,`${p} — Institution Name`,`${k}.institutionName`);req(e.accountType,`${p} — Account Type`,`${k}.accountType`);req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);if(e.fullAssetAmount<=0)push(`${p} — Full Asset Amount must be > 0.`,`${k}.fullAssetAmount`);});
  d.scheduleB2.forEach((e,i)=>{const p=`B-2 row ${i+1}`,k=`scheduleB2.${i}`;
    if(e.isVehicle){
      req(e.vehicleYear,`${p} — Year`,`b2-vehicle-year-${i}`);req(e.vehicleMake,`${p} — Make`,`b2-vehicle-make-${i}`);req(e.vehicleModel,`${p} — Model`,`b2-vehicle-model-${i}`);req(e.vehicleVin,`${p} — VIN`,`b2-vehicle-vin-${i}`);req(e.odometerMileage,`${p} — Odometer Mileage`,`b2-vehicle-mileage-${i}`);
    }else{
      req(e.description,`${p} — Description`,`${k}.description`);
    }
    req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);req(e.valuationMethod,`${p} — Valuation Method`,`${k}.valuationMethod`);if(e.fullAssetValue<=0)push(`${p} — Full Asset Value must be > 0.`,`${k}.fullAssetValue`);});
  d.scheduleB3.forEach((e,i)=>{const p=`B-3 row ${i+1}`,k=`scheduleB3.${i}`;req(e.description,`${p} — Description`,`${k}.description`);req(e.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(e.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);if(e.fullAssetValue<=0)push(`${p} — Full Asset Value must be > 0.`,`${k}.fullAssetValue`);});
  // Milestone 64A-1, item 3.2. Form B-4 (C6/C7) lists unsecured debts --
  // credit cards, medical/facility bills, notes, tax and judgment liens --
  // and secured ones separately; the form never requires every B-4 entry to
  // name a related asset, so relatedProperty is optional. Print shows
  // "Unsecured" when it's blank (pdf-model.js).
  d.scheduleB4.forEach((e,i)=>{const p=`B-4 row ${i+1}`,k=`scheduleB4.${i}`;req(e.lenderName,`${p} — Lender Name`,`${k}.lenderName`);req(e.lenderAddress,`${p} — Lender Address`,`${k}.lenderAddress`);if(e.fullLiabilityBalance<=0)push(`${p} — Full Liability Balance must be > 0.`,`${k}.fullLiabilityBalance`);});
  d.scheduleC1.forEach((e,i)=>{const p=`C-1 row ${i+1}`,k=`scheduleC1.${i}`;req(e.payerName,`${p} — Payer Name`,`${k}.payerName`);req(e.typeOfIncome,`${p} — Type of Income`,`${k}.typeOfIncome`);req(e.payerAddress,`${p} — Payer Address`,`${k}.payerAddress`);req(e.paymentBasis,`${p} — Basis for Payment`,`${k}.paymentBasis`);if(e.annualIncomeAmount<=0)push(`${p} — Annual Income Amount must be > 0.`,`${k}.annualIncomeAmount`);});
  d.scheduleC2.forEach((e,i)=>{const p=`C-2 row ${i+1}`,k=`scheduleC2.${i}`;req(e.claimantName,`${p} — Claimant Name`,`${k}.claimantName`);req(e.lawsuitDescription,`${p} — Lawsuit Description`,`${k}.lawsuitDescription`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`,`${k}.courtJurisdiction`);req(e.caseNumber,`${p} — Case Number`,`${k}.caseNumber`);if(!e.dateFiled)push(`${p} — Date Filed is required.`,`${k}.dateFiled`);if(e.amountOfClaim<=0)push(`${p} — Amount of Claim must be > 0.`,`${k}.amountOfClaim`);});
  // Milestone 64A-1, item 3.1. Form C-3 (C6) includes lawsuits "intended to
  // be brought, even if not yet filed", and C8/C11 ask for the Action Date
  // and Case Number only "if filed" -- so a not-yet-filed action, which the
  // form explicitly anticipates, has neither. Both are optional; print shows
  // "Not yet filed" for a blank Action Date (pdf-model.js).
  d.scheduleC3.forEach((e,i)=>{const p=`C-3 row ${i+1}`,k=`scheduleC3.${i}`;req(e.defendantName,`${p} — Defendant Name`,`${k}.defendantName`);req(e.actionDescription,`${p} — Action Description`,`${k}.actionDescription`);req(e.status,`${p} — Status`,`${k}.status`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`,`${k}.courtJurisdiction`);if(e.estimatedSettlement<=0)push(`${p} — Estimated Settlement must be > 0.`,`${k}.estimatedSettlement`);});
  d.scheduleC4.forEach((e,i)=>{const p=`C-4 row ${i+1}`,k=`scheduleC4.${i}`;req(e.trustName,`${p} — Trust Name`,`${k}.trustName`);req(e.trusteeName,`${p} — Trustee Name`,`${k}.trusteeName`);req(e.trusteeAddress,`${p} — Trustee Address`,`${k}.trusteeAddress`);req(e.trusteeCityStateZip,`${p} — Trustee City/State/Zip`,`${k}.trusteeCityStateZip`);if(!e.dateCreated)push(`${p} — Date Created is required.`,`${k}.dateCreated`);if(e.trustAmount<=0)push(`${p} — Trust Amount must be > 0.`,`${k}.trustAmount`);});
  d.scheduleC5.forEach((e,i)=>{const p=`C-5 row ${i+1}`,k=`scheduleC5.${i}`;req(e.assetDescription,`${p} — Asset Description`,`${k}.assetDescription`);req(e.ownerName,`${p} — Owner Name`,`${k}.ownerName`);req(e.ownerAddress,`${p} — Owner Address`,`${k}.ownerAddress`);req(e.ownerCityStateZip,`${p} — Owner City/State/Zip`,`${k}.ownerCityStateZip`);req(e.relationshipToWard,`${p} — Relationship to Ward`,`${k}.relationshipToWard`);if(e.totalAssetValue<=0)push(`${p} — Total Asset Value must be > 0.`,`${k}.totalAssetValue`);});
  // Milestone 71C: every share is a percentage from 0 to 100 (percent-range.js).
  // An out-of-range or unreadable share is an ordinary, bypassable issue (D7).
  // A-1's own "must be > 0" above already speaks for a blank, zero or negative
  // share there, so this adds only what it does not: over 100, or unreadable.
  // Milestone 72B: a blank share on A-2 to C-5 is reported, as the Annual's
  // Schedule D reports one (decided 2026-10-01). It used to pass: a blank
  // counts as 0% in wardShare() and in the Clerk's workbook (full x share), so
  // that asset silently dropped out of the ward's totals, the bond and the
  // audit-fee base. 0 is an answer -- the filer saying the ward owns none of
  // it -- and is not reported. Inventory required issues name the field
  // ("D-2 Attorney — Name"), so this one reads "B-1 row 2 — Ward's %".
  INVENTORY_SHARE_FIELDS.forEach(([collection,route,field,label])=>{
    (d[collection]||[]).forEach((e,i)=>{
      const v=e&&e[field];
      if(collection!=='scheduleA1'&&(v===''||v==null)){push(`${route} row ${i+1} — ${label}`,`${collection}.${i}.${field}`);return;}
      if(collection==='scheduleA1'&&!(Number(v)>0)&&percentProblem(v)!=='must be a number from 0 to 100')return;
      const problem=percentProblem(v);
      if(problem)push(`${route} row ${i+1} — ${label} ${problem}.`,`${collection}.${i}.${field}`);
    });
  });
  // Guardian #1 (index 0) is required and always validated, matching
  // pageD1()'s own always-show-index-0 rule -- only co-guardians (index>0)
  // are optional and skipped when entirely blank. Using the ORIGINAL index
  // for the "Guardian #N" label (not a post-filter index) also fixes a
  // mislabeling bug this filter/forEach split previously had: a co-guardian
  // with data would be mislabeled "Guardian #1" whenever guardian #1 itself
  // was still blank.
  // Milestone 74B: a started card -- rowStarted(), a signature choice included -- is checked.
  d.guardians.forEach((g,i)=>{if(i>0&&!rowStarted(g))return;const p=`D-1 Guardian #${i+1}`,k=`guardians.${i}`;req(g.name,`${p} — Name`,`${k}.name`);errors.push(...checkSignatureState({state:g.signatureState,date:g.signatureDate,image:g.signatureImage,sectionLabel:p,roleLabel:'',filingType:T,statePath:`${k}.signatureState`,datePath:`${k}.signatureDate`,imagePath:`${k}.signatureImage`,role:'guardian',policy:signaturePolicyOf(d)}));req(g.ssnEin,`${p} — SSN/EIN`,`${k}.ssnEin`);req(g.phone,`${p} — Phone`,`${k}.phone`);req(g.streetAddress,`${p} — Street Address`,`${k}.streetAddress`);req(g.cityStateZip,`${p} — City/State/Zip`,`${k}.cityStateZip`);});
  // Milestone 67A: the outside-preparer block is required only while nobody
  // is identified as the preparer. The form itself tells a guardian,
  // co-guardian or guardian attorney "DO NOT SIGN HERE"; the Clerk accepts
  // the filing when one of them is named as the preparer instead
  // (src/core/form/preparer-flag.js). The attorney block below is unchanged.
  if(!hasIdentifiedPreparer(d)){
  req(d.preparer.name,'D-2 Preparer — Name','preparer.name');errors.push(...checkSignatureState({state:inferLegacySignatureState(d.preparer.signatureState,d.preparer.signatureDate),date:d.preparer.signatureDate,image:d.preparer.signatureImage,sectionLabel:'D-2 Preparer',roleLabel:'',filingType:T,datePath:'preparer.signatureDate',imagePath:'preparer.signatureImage'}));req(d.preparer.ssnEin,'D-2 Preparer — SSN/EIN','preparer.ssnEin');req(d.preparer.phone,'D-2 Preparer — Phone','preparer.phone');req(d.preparer.streetAddress,'D-2 Preparer — Street Address','preparer.streetAddress');req(d.preparer.cityStateZip,'D-2 Preparer — City/State/Zip','preparer.cityStateZip');
  }
  // Milestone 72B: the primary email joins the rest once an attorney is
  // started, as on the Annual and the Simplified; D-2 always marked it required.
  if(attorneyStarted){req(d.attorney.name,'D-2 Attorney — Name','attorney.name');errors.push(...checkSignatureState({state:inferLegacySignatureState(d.attorney.signatureState,d.attorney.signatureDate),date:d.attorney.signatureDate,image:d.attorney.signatureImage,sectionLabel:'D-2 Attorney',roleLabel:'',filingType:T,datePath:'attorney.signatureDate',imagePath:'attorney.signatureImage'}));if(!d.attorney.filingDate)push('D-2 Attorney — Filing Date is required.','attorney.filingDate');req(d.attorney.barNumber,'D-2 Attorney — Bar Number','attorney.barNumber');req(d.attorney.phone,'D-2 Attorney — Phone','attorney.phone');req(d.attorney.email,'D-2 Attorney — Primary Email','attorney.email');req(d.attorney.streetAddress,'D-2 Attorney — Street Address','attorney.streetAddress');req(d.attorney.cityStateZip,'D-2 Attorney — City/State/Zip','attorney.cityStateZip');}
  // "Unanswered" is anything other than Yes or No. New filings start with
  // '', and both explicit strings satisfy the parent answer; the filed
  // question is required only when the parent is Yes.
  if (!sdbAnswered(d.hasSafeDepositBox)) {
    push('D-3 — Safe Deposit Box question must be answered (Yes or No).','hasSafeDepositBox');
  } else if (sdbIsYes(d.hasSafeDepositBox) && !sdbAnswered(d.safeDepositBoxFiled)) {
    push('D-3 — Please indicate whether the Safe Deposit Box inventory has been filed (Yes or No).','safeDepositBoxFiled');
  }
  // Milestone 67B (decided 2026-09-23): nothing in the D-4 bond block gates
  // export. Milestone 57A's Yes/No waiver question and its order-date
  // blocker, and 64A-1 D16's four bond-field requirements, are gone -- the
  // court's form asks for the bond details where they apply, which is not
  // the court refusing a filing without them, and the requester's rule is
  // that blocking should be rare and a warning is enough here. The
  // four-state arrangement question is asked by the sidebar (section-
  // guidance-policy.js) and what it still wants is said on the print preview
  // (src/core/filing/bond-depository.js), never here. The bond-period
  // ordering check below stays: a reversed range is an error, not a blank.
  // Milestone 40C-C. Guardian Inventory was deliberately excluded from
  // Milestone 34-1A's date-ordering work because it has no accounting period,
  // but it does have a bond period, and that pair had no order check at all --
  // only the presence checks above. The removed enforceDateRanges() swap was
  // the sole thing touching it, and it "handled" a reversed range by silently
  // rewriting an endpoint rather than reporting it, so the filer never knew
  // either way. checkDateOrder() is now the one reporter here too.
  errors.push(...checkDateOrder(d.bondPeriodFrom,d.bondPeriodTo,{
    sectionLabel:'D-4',
    earlierLabel:'Bond Period From',
    laterLabel:'Bond Period To',
    filingType:T,laterPath:'bondPeriodTo',
  }));
  // Milestone 57B (D16/D17). This used to require name + address +
  // cityStateZip on EVERY row, so clicking "+ Add Recipient" by accident
  // blocked export until the empty card was filled in or removed. Cards 2+ are
  // now optional -- untouched ones are ignored, started ones must be finished
  // or cleared -- and a filer with nobody to serve can say so.
  //
  // No nav edit is needed here: the Inventory derives its nav state from
  // validate() through errorRoute(), and a section beginning "D-5" buckets onto
  // /d5 automatically.
  {
    const RECIPIENT_FIELDS=[['name','Name'],['address','Address'],['cityStateZip','City/State/Zip']];
    const rec=serviceRecipientIssues({
      rows:d.serviceRecipients,
      attestation:d.serviceNoRecipients,
      startedFields:RECIPIENT_STARTED_FIELDS,
      missingFields:(r)=>RECIPIENT_FIELDS.filter(([k])=>!String(r[k]||'').trim()).map(([,label])=>label),
    });
    // Milestone 72J: say what to do, not the checkbox's caption; the path
    // still lands "Go to field" on the checkbox.
    if(rec.needsAttestation)req('',`D-5 — ${RECIPIENTS_OR_ATTESTATION}`,'serviceNoRecipients');
    rec.firstRowMissing.forEach(f=>req('',`D-5 Recipient 1 — ${f}`,`serviceRecipients.0.${f==='Name'?'name':f==='Address'?'address':'cityStateZip'}`));
    rec.extraRows.forEach(({index,missing})=>missing.forEach(f=>
      req('',`D-5 Recipient ${index+1} — ${f}`,`serviceRecipients.${index}.${f==='Name'?'name':f==='Address'?'address':'cityStateZip'}`)));
  }
  if(!d.serviceDate)push('D-5 — Service Date is required.','serviceDate');
  // Milestone 64A-2, item 2.4. Form PART VI J24/J25: 'Indicate if:' Ward is
  // totally incapacitated / Ward is under 14 years old / N/A. 'N/A' is a
  // real, complete answer -- not a stand-in for unanswered -- so req()'s
  // truthy check is exactly right: it only flags the empty string.
  req(d.serviceIndicateIf,'D-5 — Indicate if Ward is:','serviceIndicateIf');
  if(attorneyStarted){
  // Milestone 72H: the certificate's attorney is D-2's, which D-2 already
  // requires; only the certificate's own signature is checked here.
  errors.push(...checkSignatureState({state:inferLegacySignatureState(d.serviceAttorney.signatureState,d.serviceAttorney.signatureDate),date:d.serviceAttorney.signatureDate,image:d.serviceAttorney.signatureImage,sectionLabel:'D-5 Attorney',roleLabel:'',filingType:T,datePath:'serviceAttorney.signatureDate',imagePath:'serviceAttorney.signatureImage'}));
  }else{
    // Milestone 71B: with no attorney the guardian who served the copies
    // signs; with co-guardians the filer says which one, never defaulted.
    const certifier=resolveServiceCertifier(d);
    if(!certifier){
      const first=certifyingCandidates(d)[0];
      push('D-5 — Tick the guardian who served the copies; that guardian signs the certificate of service',`guardians.${first?first.index:0}.certifiesService`);
    }else{
      const sg=d.serviceGuardian||{};
      errors.push(...checkSignatureState({state:sg.signatureState,name:certifier.name,date:sg.signatureDate,image:sg.signatureImage,sectionLabel:'D-5 Guardian',roleLabel:'',filingType:T,namePath:`guardians.${certifier.index}.name`,statePath:'serviceGuardian.signatureState',datePath:'serviceGuardian.signatureDate',imagePath:'serviceGuardian.signatureImage',role:'guardian',policy:signaturePolicyOf(d)}));
    }
  }
  return errors;
}
