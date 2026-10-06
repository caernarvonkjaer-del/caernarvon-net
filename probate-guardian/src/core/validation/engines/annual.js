// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js -> nav-marks.js -> section-marks.js -> the
// export checks, Milestone 73F part 2); never written with JSDoc types (AGENTS.md section 2).
// Milestone 73F part 1: the Annual, Final and Trust Accountings's export checks, moved unchanged from
// src/features/annual-accounting/index.js's validateAnnual() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validateAnnual() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { RECIPIENTS_OR_ATTESTATION, serviceRecipientIssues } from '../service-recipients.js';
import { annualReconcileState } from '../../accounting/annual-totals.js';
import { certifyingCandidates, resolveServiceCertifier } from '../../filing/unrepresented-filing.js';
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState, signaturePolicyOf } from '../signature-state.js';
import { formatMoney } from '../../format/money.js';
import { getD } from '../../state.js';
import { guardianHasAnyData } from '../row-started.js';
import { hasIdentifiedPreparer } from '../../form/preparer-flag.js';
import { isAttorneyStarted } from '../attorney-block.js';
import { issueFactory } from '../validation-issue.js';
import { percentProblem } from '../percent-range.js';
import { resolveFilingDescriptor } from '../../filing/filing-descriptor.js';

export const RECIPIENT_STARTED_FIELDS = ['name', 'line2', 'line3', 'line4'];
export function annualDescriptor(data = getD()) {
  return resolveFilingDescriptor(data).descriptor;
}
export function fmtAnnual(v){if(v===''||v===null||v===undefined)return '';const x=parseFloat(v);if(isNaN(x))return '';return formatMoney(x,{style:'parens'});}

export function collectAnnualIssues(d){
  const errs=[];
  const T=annualDescriptor(d).inventoryType||'annual';
  const issue=issueFactory(T);
  const req=(v,label,path)=>{if(!v||!String(v).trim())errs.push(issue(label,path));};
  req(d.wardName,'Part I — Ward Name','wardName');
  req(d.caseNumber,'Part I — Case Number','caseNumber');
  req(d.guardian,'Part I — Guardian','guardian');
  req(d.periodFrom,'Part I — Accounting Period From','periodFrom');
  req(d.periodTo,'Part I — Accounting Period To','periodTo');
  req(d.gid,'Part I — Guardianship Inception Date (GID)','gid');
  req(d.county,'Part I — County','county');
  req(d.filingType,'Part I — Filing Type','filingType');
  req(d.amendedForm,'Part I — Amended Form?','amendedForm');
  // Milestone 71E: $0.00 is an answer. The shared req() reads a number 0 as
  // missing, and every edit stores a number, so a $0.00 Starting Balance --
  // typed, or carried from a prior filing with no net assets -- was reported
  // missing. Only an empty box is.
  if(d.startingBalance===''||d.startingBalance===null||d.startingBalance===undefined)errs.push(issue('Part II — Starting Balance','startingBalance'));
  // Milestone 67B (decided 2026-09-23): nothing in the Part IX bond block
  // gates export -- Milestone 57A's "restricted depository?" question and
  // its receipt-date blocker are gone, and so are the Bond Amount / Bonding
  // Company requirements further down, which the UI and the data model had
  // always called optional. The four-state arrangement question is asked by
  // the sidebar and what it still wants is said on the print preview
  // (src/core/filing/bond-depository.js), never here.
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Part I',earlierLabel:'Accounting Period From',laterLabel:'Accounting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  errs.push(...checkDateOrder(d.gid,d.periodFrom,{
    sectionLabel:'Part I',earlierLabel:'Guardianship Inception Date (GID)',laterLabel:'Accounting Period From',allowSameDay:true,
    filingType:T,laterPath:'periodFrom',
  }));
  d.guardians.forEach((g,i)=>{
    if(i>0&&!guardianHasAnyData(g))return;
    const p=`Part III — Guardian #${i+1}`;
    const k=`guardians.${i}`;
    req(g.name,`${p} — Name`,`${k}.name`);
    // Milestone 39-C: replaces the old unconditional req(g.signatureDate,...)
    // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
    // rule as 39-B's Guardian pilot. name omitted: g.name is already
    // unconditionally required immediately above.
    errs.push(...checkSignatureState({
      state: g.signatureState,
      date: g.signatureDate,
      image: g.signatureImage,
      sectionLabel: 'Part III', roleLabel: `Guardian #${i+1}`,
      filingType:T, statePath:`${k}.signatureState`, datePath:`${k}.signatureDate`, imagePath:`${k}.signatureImage`,role:'guardian',policy:signaturePolicyOf(d),
    }));
    req(g.ssn,`${p} — SSN/EIN`,`${k}.ssn`);
    req(g.phone,`${p} — Phone`,`${k}.phone`);
    req(g.mailingStreet,`${p} — Mailing Street`,`${k}.mailingStreet`);
    req(g.mailingCityStateZip,`${p} — Mailing City/State/Zip`,`${k}.mailingCityStateZip`);
    errs.push(...checkDateOrder(d.periodTo,g.signatureDate,{
      sectionLabel:p,earlierLabel:'Accounting Period To',laterLabel:'Signature Date',allowSameDay:true,
      filingType:T,laterPath:`${k}.signatureDate`,
    }));
  });
  // Milestone 67A: the outside-preparer block is required only while nobody
  // is identified as the preparer. The form itself tells a guardian,
  // co-guardian or guardian attorney "DO NOT SIGN HERE"; the Clerk accepts
  // the filing when one of them is named as the preparer instead
  // (src/core/form/preparer-flag.js). Part V below is unchanged.
  if(!hasIdentifiedPreparer(d)){
  req(d.preparer.name,'Part IV — Preparer Name','preparer.name');
  // Milestone 39-C: replaces the old unconditional
  // req(d.preparer.signatureDate,...) -- name omitted: d.preparer.name is
  // already unconditionally required immediately above.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.preparer.signatureState, d.preparer.signatureDate),
    date: d.preparer.signatureDate,
    image: d.preparer.signatureImage,
    sectionLabel: 'Part IV', roleLabel: 'Preparer',
    filingType:T, datePath:'preparer.signatureDate', imagePath:'preparer.signatureImage',
  }));
  req(d.preparer.ssn,'Part IV — Preparer SSN/EIN','preparer.ssn');
  req(d.preparer.phone,'Part IV — Preparer Phone','preparer.phone');
  req(d.preparer.street,'Part IV — Preparer Street','preparer.street');
  req(d.preparer.cityStateZip,'Part IV — Preparer City/State/Zip','preparer.cityStateZip');
  errs.push(...checkDateOrder(d.periodTo,d.preparer.signatureDate,{
    sectionLabel:'Part IV',earlierLabel:'Accounting Period To',laterLabel:'Preparer Signature Date',allowSameDay:true,
    filingType:T,laterPath:'preparer.signatureDate',
  }));
  }
  // Milestone 71B: Part V -- and the attorney's Part X signature below -- are
  // required only once the filer has started entering an attorney. A pro se
  // guardian, a guardian advocate (Rule 5.030(a)), a guardian whose
  // representation the court waived, or a guardian who is a Florida attorney
  // files with none; AGENTS.md section 4 keeps attorney certification off such
  // a filing's export gate. Why there is no attorney is asked on Part I and
  // noted on Preview & Export, never blocked on (unrepresented-filing.js).
  const attorneyStarted=isAttorneyStarted(d,'annual');
  if(attorneyStarted){
  req(d.attorney_bar,'Part V — Attorney Bar Number','attorney_bar');
  req(d.attorney_phone,'Part V — Attorney Phone','attorney_phone');
  // Milestone 55D: attorney_email already rendered a required asterisk
  // (inpD(...,true,'email')) with no matching rule here -- confirmed by
  // grep, zero requiredness of any kind on this field before this line.
  req(d.attorney_email,'Part V — Attorney Email','attorney_email');
  req(d.attorney_street,'Part V — Attorney Street','attorney_street');
  req(d.attorney_cityStateZip,'Part V — Attorney City/State/Zip','attorney_cityStateZip');
  // Milestone 72C (decided 2026-10-02): the attorney's name, once an attorney
  // is started, as the Inventory, the Simplified and the Plans require it. It
  // used to be asked only through the "/s/" check below, so a Bar number and
  // email could be filed under a blank name. The field is shared by Part I's
  // "Attorney for Guardian" and Part V's "Attorney Name (linked to Part I)";
  // the path is the one that check always used.
  req(d.attorney,'Part V — Attorney Name','attorney');
  // Milestone 39-C: replaces the old unconditional
  // req(d.attorney_signatureDate,...). Milestone 72C: the name is required
  // just above, so it is no longer passed here, where it would only repeat
  // that message (checkSignatureState()'s documented convention).
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
    date: d.attorney_signatureDate,
    image: d.attorney_signatureImage,
    sectionLabel: 'Part V', roleLabel: 'Attorney',
    filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
  }));
  errs.push(...checkDateOrder(d.periodTo,d.attorney_signatureDate,{
    sectionLabel:'Part V',earlierLabel:'Accounting Period To',laterLabel:'Attorney Signature Date',allowSameDay:true,
    filingType:T,laterPath:'attorney_signatureDate',
  }));
  }
  // Part IX's bond fields: nothing required (Milestone 67B; see the note above).
  req(d.certDate,'Part X — Certificate of Service Date','certDate');
  // Milestone 72G: the ward's status, the workbook's "Indicate if:" (K23),
  // required on all three accountings (the requester's decision, recorded as
  // Pinellas Clerk practice), in the Inventory's own message style.
  req(d.certWardStatus,'Part X — Indicate if Ward is:','certWardStatus');
  errs.push(...checkDateOrder(d.periodTo,d.certDate,{
    sectionLabel:'Part X',earlierLabel:'Accounting Period To',laterLabel:'Certificate of Service Date',allowSameDay:true,
    filingType:T,laterPath:'certDate',
  }));
  // Milestone 57B (D16/D17). One rule across all three families: Recipient 1
  // complete, cards 2+ optional but finished-or-cleared, and the attestation
  // asked only when nobody is listed. This used to check certRecipients[0].name
  // alone and never look at rows 2-4, so a second recipient with a name and no
  // address exported silently.
  {
    const rec=serviceRecipientIssues({
      rows:d.certRecipients,
      attestation:d.certNoRecipients,
      startedFields:RECIPIENT_STARTED_FIELDS,
      // Family-owned: the accountings' address lines are optional in
      // probate-guardian-data-model.csv, so a name is what completes a card.
      missingFields:(r)=>((r.name||'').trim()?[]:['Name']),
    });
    // Milestone 72J: say what to do, not the checkbox's caption; the path
    // still lands "Go to field" on the checkbox.
    if(rec.needsAttestation)req('',`Part X — ${RECIPIENTS_OR_ATTESTATION}`,'certNoRecipients');
    rec.firstRowMissing.forEach(f=>req('',`Part X — Recipient 1 ${f}`,'certRecipients.0.name'));
    rec.extraRows.forEach(({index,missing})=>missing.forEach(f=>
      req('',`Part X — Recipient ${index+1} ${f}`,`certRecipients.${index}.name`)));
  }
  // Milestone 39-C: certAttySignDate had no requiredness of any kind before
  // this -- not even order-check-only (confirmed during the 39-C inventory
  // audit). name is passed for the same reason as Part V above -- this
  // card's "Attorney Name" field is the same shared, never-independently-
  // required d.attorney field.
  if(attorneyStarted){
  // Milestone 72C: no name here either -- Part V requires it (above).
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.certAttySignatureState, d.certAttySignDate),
    date: d.certAttySignDate,
    image: d.certAttySignatureImage,
    sectionLabel: 'Part X', roleLabel: 'Attorney',
    filingType:T, datePath:'certAttySignDate', imagePath:'certAttySignatureImage',
  }));
  }else{
    // Milestone 71B: with no attorney the guardian who served the copies
    // signs (Rules 2.515(a), 2.516(a) and (f)). With co-guardians the filer
    // says which one -- never defaulted to Guardian #1.
    const certifier=resolveServiceCertifier(d);
    if(!certifier){
      const first=certifyingCandidates(d)[0];
      errs.push(issue('Part X — Tick the guardian who served the copies; that guardian signs the certificate of service',`guardians.${first?first.index:0}.certifiesService`));
    }else{
      errs.push(...checkSignatureState({
        state: d.certGuardianSignatureState,
        name: certifier.name,
        date: d.certGuardianSignDate,
        image: d.certGuardianSignatureImage,
        sectionLabel: 'Part X', roleLabel: 'Guardian',
        filingType:T, namePath:`guardians.${certifier.index}.name`, statePath:'certGuardianSignatureState', datePath:'certGuardianSignDate', imagePath:'certGuardianSignatureImage',role:'guardian',policy:signaturePolicyOf(d),
      }));
      errs.push(...checkDateOrder(d.periodTo,d.certGuardianSignDate,{
        sectionLabel:'Part X',earlierLabel:'Accounting Period To',laterLabel:'Guardian Certificate Signature Date',allowSameDay:true,
        filingType:T,laterPath:'certGuardianSignDate',
      }));
    }
  }

  const rowHasAnyData=r=>Object.values(r).some(v=>v!==''&&v!=null);
  const checkRows=(rows,fields,schedLabel,collection)=>{
    (rows||[]).forEach((r,i)=>{
      if(!rowHasAnyData(r))return;
      fields.forEach(([key,label])=>{
        if(r[key]===''||r[key]==null)errs.push(issue(`${schedLabel} — Line ${i+1} — ${label} is required`,`${collection}.${i}.${key}`));
      });
    });
  };
  checkRows(d.schA,[['payer','Income Source / Payer'],['description','Description'],['bank','Bank Name'],['accountNo','Account #'],['amount','Amount']],'Schedule A','schA');
  checkRows(d.schB1,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-1','schB1');
  checkRows(d.schB2,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-2','schB2');
  checkRows(d.schB3,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-3','schB3');
  checkRows(d.schB4,[['checkNo','Check #'],['datePaid','Date Paid'],['category','Category'],['payee','Payee'],['amount','Amount']],'Schedule B-4','schB4');
  checkRows(d.remuneration,[['guardian','Guardian Name'],['type','Type'],['amount','Amount']],'Part XI — Remuneration','remuneration');
  // Milestone 58D: Part XI must be answered one way or the other before this
  // filing leaves. Per 744.367(3)(a) the annual report "must include a
  // declaration of all remuneration received by the guardian from any source",
  // so a filing that never says either "here is what I received" or "I
  // received none" is missing something the statute requires -- and until now
  // it exported silently, because both the sidebar and this validator ignored
  // a schedule with no populated rows.
  //
  // This is a NEW requirement, not a parity repair: on Part XI the two sides
  // already agreed. See MILESTONE-58-PROPOSAL.md's correction in that section.
  if(!(d.scheduleNoItems&&d.scheduleNoItems.remuneration===true)
     &&!(d.remuneration||[]).some(r=>r&&(r.guardian||r.type||r.amount||r.description))){
    errs.push(issue('Part XI — Remuneration — declare the remuneration received, or verify there is none to report','scheduleNoItems.remuneration'));
  }
  checkRows(d.schC,[['description','Description'],['date','Date of Adjustment']],'Schedule C','schC');
  (d.schC||[]).forEach((r,i)=>{
    if(!rowHasAnyData(r))return;
    // Either field satisfies this; route to the first of the pair.
    if((r.gain===''||r.gain==null)&&(r.loss===''||r.loss==null))errs.push(issue(`Schedule C — Line ${i+1} — Gain or Loss amount is required`,`schC.${i}.gain`));
  });
  checkRows(d.schD1,[['description','Description'],['accountNo','Account #'],['restricted','Restricted?'],['type','Type'],['fullAmount','Full Asset Amount'],['wardPct',"Ward's %"]],'Schedule D-1','schD1');
  checkRows(d.schD2,[['description','Description'],['residence','Personal Residence?'],['income','Income Property?'],['fullValue','Full Value'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-2','schD2');
  checkRows(d.schD3,[['description','Description'],['fullAmount','Full Amount'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-3','schD3');
  checkRows(d.schD4,[['description','Description'],['restricted','Restricted?'],['fullAmount','Full Amount'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-4','schD4');
  checkRows(d.schD5,[['description','Description'],['loanNo','Loan #'],['loanType','Loan Type'],['fullDebt','Full Debt'],['wardPct',"Ward's %"]],'Schedule D-5','schD5');
  // Milestone 71C: a share is a percentage from 0 to 100 (percent-range.js);
  // out of range or unreadable is an ordinary, bypassable issue (D7). Blank
  // is checkRows()' business above. Part VIII's trust share gets the same.
  [['schD1','Schedule D-1'],['schD2','Schedule D-2'],['schD3','Schedule D-3'],['schD4','Schedule D-4'],['schD5','Schedule D-5']].forEach(([collection,label])=>{
    (d[collection]||[]).forEach((r,i)=>{
      if(!rowHasAnyData(r))return;
      const problem=percentProblem(r.wardPct);
      if(problem)errs.push(issue(`${label} — Line ${i+1} — Ward's % ${problem}`,`${collection}.${i}.wardPct`));
    });
  });
  (d.trusts||[]).forEach((tr,i)=>{
    const problem=percentProblem(tr&&tr.wardPct);
    if(problem)errs.push(issue(`Part VIII — Trust ${i+1} — Ward's % ${problem}`,`trusts.${i}.wardPct`));
  });
  checkRows(d.schE,[['bankName','Bank Name']],'Schedule E','schE');
  (d.schE||[]).forEach((r,i)=>{
    if(!rowHasAnyData(r))return;
    const hasIn=r.transferInDate!==''&&r.transferInDate!=null&&r.transferInAmt!==''&&r.transferInAmt!=null;
    const hasOut=r.transferOutDate!==''&&r.transferOutDate!=null&&r.transferOutAmt!==''&&r.transferOutAmt!=null;
    // Spans two field pairs; route to the first of them.
    if(!hasIn&&!hasOut)errs.push(issue(`Schedule E — Line ${i+1} — Transfer In (date+amount) or Transfer Out (date+amount) is required`,`schE.${i}.transferInDate`));
  });
  checkRows(d.schF1,[['description','Description'],['bank','Bank'],['accountNo','Account #'],['courtOrderDate','Court Order Date'],['salePrice','Sale Price']],'Schedule F-1','schF1');
  checkRows(d.schF2,[['description','Description'],['bank','Bank'],['accountNo','Account #'],['courtOrderDate','Court Order Date'],['salePrice','Sale Price']],'Schedule F-2','schF2');
  req(d.trusts?.[0]?.hasTrust,'Part VIII — Does the Ward have one or more Trusts?','trusts.0.hasTrust');
  if(d.trusts?.[0]?.hasTrust==='Yes'){
    const describesATrust=t=>Object.entries(t||{}).some(([key,value])=>key!=='hasTrust'&&value!==''&&value!=null);
    const described=(d.trusts||[]).filter(describesATrust);
    // Milestone 57E-1. Answering "#1. Does the Ward have one or more Trusts?"
    // with Yes and leaving every card blank used to export clean: the filter
    // above yields nothing, the loop never runs, and the filing tells the
    // Clerk the ward has trusts while naming none -- no trustee, no account
    // number, no value.
    //
    // The sidebar had been saying so all along. a-p8 requires a trust NAME, so
    // Part VIII showed incomplete while this validator found nothing wrong --
    // the readiness/export disagreement checklist-export-parity.spec.js exists
    // to catch, running in the direction that spec cannot see.
    //
    // Routed through the ordinary req() path on purpose. It becomes
    // annual.trusts.0.name.required, falls through to
    // validation.legacy-unmapped, and is therefore BYPASSABLE: per D9 this
    // offers a clearable acknowledgement at output rather than a hard block.
    // Adding a literal issue-registry.js key would make it unbypassable, which
    // is what 57A's other half needed and this one must not have.
    if(described.length===0)req(d.trusts?.[0]?.name,'Part VIII — Trust 1 — Name','trusts.0.name');
    described.forEach((t,i)=>{
      req(t.createdAfterGID,`Part VIII — Trust ${i+1} — Was created after the GID?`,`trusts.${i}.createdAfterGID`);
    });
  }

  // Reconciliation. Net assets are derived two independent ways: Line 20
  // (starting balance + income − disbursements ± gains/losses) and Line 30
  // (the sum of the Schedule D asset/liability listings). They must agree —
  // that equality IS the accounting, and it's the first thing the Clerk's
  // audit checks. Previously this was only a soft banner on Parts VI & VII,
  // so an accounting that didn't balance could still be exported and filed.
  // Only raised once the guardian has actually entered figures; an untouched
  // form trivially balances at 0 = 0 and shouldn't be flagged as an error.
  // Line 20 must equal Line 30. A difference no longer blocks export
  // outright — sometimes one is genuinely correct as filed — but it must be
  // explained in writing, and that explanation goes onto the document.
  // Kept short: these render as chips in the missing-fields panel, and the
  // Parts VI & VII page itself shows the full detail.
  // Milestone 73F part 1: this filing's, not the open one's (it read the open
  // filing when the checks could only judge that one).
  const _rec=annualReconcileState(null,d);
  if(_rec.outOfBalance&&!_rec.explained){
    errs.push(issue('Parts VI & VII — Net Assets from Changes and Net Assets from Balances don\'t match (off by '
      +fmtAnnual(_rec.diff)+'): correct the schedules or explain the difference','reconcileExplanation'));
  }

  return errs;
}
