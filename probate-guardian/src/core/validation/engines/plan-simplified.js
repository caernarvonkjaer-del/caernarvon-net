// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js -> nav-marks.js -> section-marks.js -> the
// export checks, Milestone 73F part 2); never written with JSDoc types (AGENTS.md section 2).
// Milestone 73F part 1: the Simplified Annual Guardianship Plan's export checks, moved unchanged from
// src/features/plan-simplified/index.js's validatePlanSimplified() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validatePlanSimplified() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { countyProblem, notFloridaCountyMessage } from '../county-rule.js';
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState, signaturePolicyOf } from '../signature-state.js';
import { issueFactory } from '../validation-issue.js';
import { rowStarted } from '../row-started.js';

export function collectPlanSimplifiedIssues(d){
  const errs=[];
  const T='planSimplified';
  const issue=issueFactory(T);
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined)errs.push(issue(label,path));};
  req(d.wardName,'Cover — Name of Ward is required','wardName');
  req(d.caseNumber,'Cover — Case Number is required','caseNumber');
  // Milestone 73F part 3 (73F-2): a Florida county, not only a non-blank one.
  {const county=countyProblem(d.county);if(county==='blank')errs.push(issue('Cover — County is required','county'));else if(county)errs.push(issue(notFloridaCountyMessage('Cover',county),'county'));}
  req(d.periodFrom,'Cover — Reporting Period From is required','periodFrom');
  req(d.periodTo,'Cover — Reporting Period To is required','periodTo');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Reporting Period From',laterLabel:'Reporting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  req(d.q1Residences,'The Plan — Question 1 (places resided) is required','q1Residences');
  req(d.q2BestPlacement,'The Plan — Question 2 (why this placement) is required','q2BestPlacement');
  req(d.q3MedicalTreatment,'The Plan — Question 3 (medical treatment) is required','q3MedicalTreatment');
  req(d.q4Diagnosis,'The Plan — Question 4 (diagnosis and conditions) is required','q4Diagnosis');
  req(d.q5SocialServices,'The Plan — Question 5 (personal and social services) is required','q5SocialServices');
  req(d.q6Interaction,'The Plan — Question 6 (interaction with others) is required','q6Interaction');
  req(d.q7RestoreRights,'The Plan — Question 7 (restore rights) must be answered','q7RestoreRights');
  if(d.q7RestoreRights==='Yes')req(d.q7RestoreExplain,'The Plan — Question 7 explanation is required when rights should be restored','q7RestoreExplain');
  // Q8 is a "check all that apply" list, but leaving every box blank means the
  // question was skipped rather than answered "none" — NONE is its own box.
  if(!(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other||d.q8None)){
    errs.push(issue('The Plan — Question 8 (advance directives) must have at least one box checked, or NONE','q8DNR'));
  }
  if(d.q8Other)req(d.q8OtherText,'The Plan — Question 8 requires a description when "Other Advance Directive" is checked','q8OtherText');
  if(d.q8None&&(d.q8DNR||d.q8LivingWill||d.q8Surrogate||d.q8POA||d.q8Other)){
    errs.push(issue('The Plan — Question 8 cannot be NONE and also list directives','q8None'));
  }
  req(d.q9Remuneration,'The Plan — Question 9 (remuneration) must be answered','q9Remuneration');
  if(d.q9Remuneration==='Yes')req(d.q9RemunerationExplain,'The Plan — Question 9 explanation is required when payment was received','q9RemunerationExplain');
  const g=(d.planGuardians||[])[0]||{};
  req(g.name,'Signatures — Guardian 1 printed name is required','planGuardians.0.name');
  // Milestone 39-B: replaces the old unconditional req(g.signatureDate,...)
  // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, per
  // MILESTONE-39-PROPOSAL.md's 39-B "a confirmed, deliberate change to
  // today's behavior." `name` is omitted from this call because g.name is
  // already unconditionally required immediately above, regardless of
  // signature state -- passing it here too would just duplicate that
  // message for the same blank field.
  errs.push(...checkSignatureState({
    state: g.signatureState,
    date: g.signatureDate,
    image: g.signatureImage,
    sectionLabel: 'Signatures', roleLabel: 'Guardian 1',
    filingType:T, statePath:'planGuardians.0.signatureState', datePath:'planGuardians.0.signatureDate', imagePath:'planGuardians.0.signatureImage',role:'guardian',policy:signaturePolicyOf(d),
  }));
  // Milestone 72C: Guardian 1's email no longer blocks export -- it warns,
  // and only when no attorney is entered (guardian-email.js), as on every form.
  req(g.phone,'Signatures — Guardian 1 phone is required','planGuardians.0.phone');
  req(g.mailingAddress,'Signatures — Guardian 1 mailing address is required','planGuardians.0.mailingAddress');
  // Milestone 74B: a co-guardian the filer has started (rowStarted(): anything
  // entered, a stamp or a signature choice included) is checked like the first
  // guardian -- the form asks every guardian for the same details. An untouched
  // co-guardian block is not checked. (Milestone 73A checked its signature only.)
  (d.planGuardians||[]).forEach((cg,i)=>{
    if(i===0||!rowStarted(cg))return;
    const who=`Guardian ${i+1}`, at=`planGuardians.${i}`;
    req(cg.name,`Signatures — ${who} printed name is required`,`${at}.name`);
    errs.push(...checkSignatureState({state:cg.signatureState,date:cg.signatureDate,image:cg.signatureImage,sectionLabel:'Signatures',roleLabel:who,
      filingType:T,statePath:`${at}.signatureState`,datePath:`${at}.signatureDate`,imagePath:`${at}.signatureImage`,
      role:'guardian',policy:signaturePolicyOf(d)}));
    req(cg.phone,`Signatures — ${who} phone is required`,`${at}.phone`);
    req(cg.mailingAddress,`Signatures — ${who} mailing address is required`,`${at}.mailingAddress`);
  });
  // Milestone 68A: no date order between the guardian's, preparer's or
  // attorney's signature and the reporting period -- a plan is written
  // before the period it plans for (see Plan Annual's note). This form
  // raised the rule three times, so a filer with a preparer and an attorney
  // had to post-date three signatures. checkSignatureState() still catches a
  // missing or malformed date.
  return errs;
}
