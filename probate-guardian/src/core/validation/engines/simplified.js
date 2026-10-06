// Milestone 73F part 1: the Simplified Accounting's export checks, moved unchanged from
// src/features/simplified-accounting/index.js's validateSimplified() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validateSimplified() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { RECIPIENTS_OR_ATTESTATION, serviceRecipientIssues } from '../service-recipients.js';
import { certifyingCandidates, resolveServiceCertifier } from '../../filing/unrepresented-filing.js';
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState } from '../signature-state.js';
import { createIssue } from '../issue-registry.js';
import { getSimplifiedGuardianAddressConflicts } from '../../filing/models/simplified.js';
import { guardianHasAnyData } from '../row-started.js';
import { isAttorneyStarted } from '../attorney-block.js';
import { issueFactory } from '../validation-issue.js';

export const RECIPIENT_STARTED_FIELDS = ['name', 'line2', 'line3', 'line4'];

export function collectSimplifiedIssues(d){
  const errs=[];
  const T='simplified';
  const issue=issueFactory(T);
  getSimplifiedGuardianAddressConflicts(d).forEach(conflict => {
    errs.push(createIssue('simplified.guardian.address-conflict', {
      section: 'Part IV',
      label: `Guardian #${conflict.rowIndex + 1} address conflict`,
      path: `guardians.${conflict.rowIndex}.residenceStreet`,
      route: '/p4',
      message: `Part IV — Guardian #${conflict.rowIndex + 1} — resolve conflicting residence address before export`
    }));
  });
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined)errs.push(issue(label,path));};
  const reqYes=(v,label,path)=>{if(v!=='Yes')errs.push(issue(label,path));};
  reqYes(d.eligDepository,'Cover — Eligibility: all estate property must be held in a designated depository under § 69.031 — otherwise use the standard Annual Accounting','eligDepository');
  reqYes(d.eligOnlyTransactions,'Cover — Eligibility: only interest accrual, settlement deposits, and financial institution service charges may occur in the account — otherwise use the standard Annual Accounting','eligOnlyTransactions');
  req(d.wardName,'Cover — Name of Ward','wardName');
  req(d.caseNumber,'Cover — Case Number','caseNumber');
  req(d.ssn,'Cover — Social Security Number','ssn');
  req(d.gid,'Cover — Guardianship Inception Date (GID)','gid');
  req(d.periodFrom,'Cover — Accounting Period From','periodFrom');
  req(d.periodTo,'Cover — Accounting Period To','periodTo');
  req(d.guardian,'Cover — Guardian','guardian');
  // Milestone 71B: section 744.3679(3) -- "The guardian need not be
  // represented by an attorney in order to file the annual accounting allowed
  // by subsection (1)." Every attorney requirement below applies only once the
  // filer has started entering an attorney (attorney-block.js).
  const attorneyStarted=isAttorneyStarted(d,'simplified');
  if(attorneyStarted)req(d.attorney,'Cover — Attorney for Guardian','attorney');
  req(d.typeOfGuardianship,'Cover — Type of Guardianship','typeOfGuardianship');
  req(d.county,'Cover — County','county');
  req(d.amendedForm,'Cover — Amended Form?','amendedForm');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Accounting Period From',laterLabel:'Accounting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  errs.push(...checkDateOrder(d.gid,d.periodFrom,{
    sectionLabel:'Cover',earlierLabel:'Guardianship Inception Date (GID)',laterLabel:'Accounting Period From',allowSameDay:true,
    filingType:T,laterPath:'periodFrom',
  }));
  req(d.startingBalance,'Part II — Starting Balance (Line 1)','startingBalance');
  req(d.interestIncome,'Part II — Interest Income (Line 2)','interestIncome');
  req(d.depositsSettlement,'Part II — Deposits Pursuant to Settlement (Line 3)','depositsSettlement');
  req(d.serviceCharges,'Part II — Financial Institution Service Charges (Line 5)','serviceCharges');
  req(d.federalIncomeTax,'Part II — Federal Income Tax (Line 6)','federalIncomeTax');
  const gLabel=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  d.guardians.forEach((g,i)=>{
    if(i>0&&!guardianHasAnyData(g))return;
    const p=gLabel[i];
    const gp=`guardians.${i}`;
    req(g.name,`Part IV — ${p} — Name`,`${gp}.name`);
    // Milestone 39-C: replaces the old unconditional req(g.signatureDate,...)
    // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
    // rule as 39-B's Guardian pilot. name omitted: g.name is already
    // unconditionally required immediately above.
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(g.signatureState, g.signatureDate),
      date: g.signatureDate,
      image: g.signatureImage,
      sectionLabel: 'Part IV', roleLabel: p,
      filingType:T, datePath:`${gp}.signatureDate`, imagePath:`${gp}.signatureImage`,
    }));
    req(g.ssn,`Part IV — ${p} — SSN/EIN`,`${gp}.ssn`);
    req(g.phone,`Part IV — ${p} — Phone Number`,`${gp}.phone`);
    // Milestone 72C: a guardian's email no longer blocks export -- it warns,
    // and only when no attorney is entered (guardian-email.js), the same rule
    // on all seven forms (Pinellas Clerk practice, 2026-10-01/02).
    req(g.mailingStreet,`Part IV — ${p} — Mailing Street Address`,`${gp}.mailingStreet`);
    req(g.mailingCityStateZip,`Part IV — ${p} — Mailing City/State/Zip`,`${gp}.mailingCityStateZip`);
    req(g.residenceStreet,`Part IV — ${p} — Residence Street Address`,`${gp}.residenceStreet`);
    req(g.residenceCityStateZip,`Part IV — ${p} — Residence City/State/Zip`,`${gp}.residenceCityStateZip`);
    errs.push(...checkDateOrder(d.periodTo,g.signatureDate,{
      sectionLabel:`Part IV — ${p}`,earlierLabel:'Accounting Period To',laterLabel:'Signature Date',allowSameDay:true,
      filingType:T,laterPath:`${gp}.signatureDate`,
    }));
  });
  if(attorneyStarted){
  req(d.attorney_barNumber,'Part V — Attorney Bar Number','attorney_barNumber');
  req(d.attorney_phone,'Part V — Attorney Phone Number','attorney_phone');
  // Milestone 55D: attorney_email already rendered a required asterisk
  // (inpS(...,true,'email')) with no matching rule here -- confirmed by
  // grep, zero requiredness of any kind on this field before this line.
  req(d.attorney_email,'Part V — Attorney Email','attorney_email');
  req(d.attorney_street,'Part V — Attorney Street Address','attorney_street');
  req(d.attorney_cityStateZip,'Part V — Attorney City/State/Zip','attorney_cityStateZip');
  errs.push(...checkDateOrder(d.periodTo,d.attorney_signatureDate,{
    sectionLabel:'Part V',earlierLabel:'Accounting Period To',laterLabel:'Signature Date',allowSameDay:true,
    filingType:T,laterPath:'attorney_signatureDate',
  }));
  // Milestone 39-C: attorney_name (d.attorney) is already independently,
  // unconditionally required at Cover ("Cover — Attorney for Guardian"
  // above) -- name omitted here to avoid a duplicate message for the same
  // blank field.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
    date: d.attorney_signatureDate,
    image: d.attorney_signatureImage,
    sectionLabel: 'Part V', roleLabel: 'Attorney',
    filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
  }));
  }
  req(d.certServiceDate,'Part VI — Date of Service','certServiceDate');
  errs.push(...checkDateOrder(d.periodTo,d.certServiceDate,{
    sectionLabel:'Part VI',earlierLabel:'Accounting Period To',laterLabel:'Date of Service',allowSameDay:true,
    filingType:T,laterPath:'certServiceDate',
  }));
  // Milestone 72G: the method of service (certIndicator) no longer blocks --
  // a missing one is a Preview & Export warning (service-method.js). The
  // ward's status is the workbook's "Indicate if:" box, required on all three
  // accountings (the requester's decision, recorded as Pinellas Clerk
  // practice), in the Inventory's own message style.
  req(d.certWardStatus,'Part VI — Indicate if Ward is:','certWardStatus');
  // Milestone 57B (D16/D17): same rule as the Annual family and the Inventory.
  {
    const rec=serviceRecipientIssues({
      rows:d.certRecipients,
      attestation:d.certNoRecipients,
      startedFields:RECIPIENT_STARTED_FIELDS,
      missingFields:(r)=>((r.name||'').trim()?[]:['Name and Address']),
    });
    // Milestone 72J: say what to do, not the checkbox's caption; the path
    // still lands "Go to field" on the checkbox.
    if(rec.needsAttestation)req('',`Part VI — ${RECIPIENTS_OR_ATTESTATION}`,'certNoRecipients');
    rec.firstRowMissing.forEach(f=>req('',`Part VI — Recipient 1 — ${f}`,'certRecipients.0.name'));
    rec.extraRows.forEach(({index,missing})=>missing.forEach(f=>
      req('',`Part VI — Recipient ${index+1} — ${f}`,`certRecipients.${index}.name`)));
  }
  // Milestone 39-C: certAttySignDate had no requiredness of any kind before
  // this -- not even order-check-only (confirmed during the 39-C inventory
  // audit). The attorney name here is the same shared `d.attorney` field
  // Part V uses (already required at Cover), so name is omitted for the
  // same reason as Part V's own check above.
  if(attorneyStarted){
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.certAttySignatureState, d.certAttySignDate),
    date: d.certAttySignDate,
    image: d.certAttySignatureImage,
    sectionLabel: 'Part VI', roleLabel: 'Attorney',
    filingType:T, datePath:'certAttySignDate', imagePath:'certAttySignatureImage',
  }));
  }else{
    // Milestone 71B: with no attorney the guardian who served the copies
    // signs; with co-guardians the filer says which one, never defaulted.
    const certifier=resolveServiceCertifier(d);
    if(!certifier){
      const first=certifyingCandidates(d)[0];
      errs.push(issue('Part VI — Tick the guardian who served the copies; that guardian signs the certificate of service',`guardians.${first?first.index:0}.certifiesService`));
    }else{
      errs.push(...checkSignatureState({
        state: inferLegacySignatureState(d.certGuardianSignatureState, d.certGuardianSignDate),
        name: certifier.name,
        date: d.certGuardianSignDate,
        image: d.certGuardianSignatureImage,
        sectionLabel: 'Part VI', roleLabel: 'Guardian',
        filingType:T, namePath:`guardians.${certifier.index}.name`, datePath:'certGuardianSignDate', imagePath:'certGuardianSignatureImage',
      }));
      errs.push(...checkDateOrder(d.periodTo,d.certGuardianSignDate,{
        sectionLabel:'Part VI',earlierLabel:'Accounting Period To',laterLabel:'Guardian Certificate Signature Date',allowSameDay:true,
        filingType:T,laterPath:'certGuardianSignDate',
      }));
    }
  }
  (d.remuneration || []).forEach((r, i) => {
    if (!r || (!r.guardian && !r.type && !r.amount && !r.description)) return;
    req(r.guardian, `Part VII — Line ${i + 1} — Guardian Name`, `remuneration.${i}.guardian`);
    req(r.type, `Part VII — Line ${i + 1} — Type`, `remuneration.${i}.type`);
  });
  // Milestone 60J, mirroring Annual's Milestone 58D. Part VII must be answered
  // one way or the other before this filing leaves: 744.367(3)(a) requires the
  // report to "include a declaration of all remuneration received", so a
  // filing that says neither "here is what I received" nor "I received none"
  // is missing something the statute requires -- and it used to export
  // silently, because the sidebar and this validator both ignored a schedule
  // with no populated rows.
  //
  // AGENTS.md section 4 note: this is NOT the "no items to report" affordance
  // the sidebar asks about for other schedules, which export must never
  // demand. Part VII is the one place a statute names the declaration itself,
  // which is exactly why 58D gated Annual's Part XI and why this matches it.
  if (!(d.scheduleNoItems && d.scheduleNoItems.remuneration === true)
    && !(d.remuneration || []).some(r => r && (r.guardian || r.type || r.amount || r.description))) {
    errs.push(issue('Part VII — Remuneration — declare the remuneration received, or verify there is none to report', 'scheduleNoItems.remuneration'));
  }
  return errs;
}
