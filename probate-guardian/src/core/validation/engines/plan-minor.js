// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js -> nav-marks.js -> section-marks.js -> the
// export checks, Milestone 73F part 2); never written with JSDoc types (AGENTS.md section 2).
// Milestone 73F part 1: the Annual Guardianship Plan for a minor's export checks, moved unchanged from
// src/features/plan-minor/index.js's validatePlanMinor() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validatePlanMinor() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState, signaturePolicyOf } from '../signature-state.js';
import { isAttorneyStarted } from '../attorney-block.js';
import { isTriStateAnswer } from '../../form/yes-no.js';
import { issueFactory } from '../validation-issue.js';
import { rowStarted } from '../row-started.js';

export function planMinorPreparerStarted(d) {
  return !!(d && (d.preparer_name || d.preparer_signatureDate || (d.preparer_signatureState && d.preparer_signatureState !== 'none')));
}

export function collectPlanMinorIssues(d){
  const errs=[];
  const T='planMinor';
  const issue=issueFactory(T);
  if(!isTriStateAnswer(d.amendedForm)) errs.push(issue('Cover — Amended Form? must be answered','amendedForm'));
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined||v===false)errs.push(issue(label,path));};
  req(d.wardName,"Cover — Minor's Name is required",'wardName');
  req(d.county,'Cover — County is required','county');
  req(d.periodFrom,'Cover — Reporting Period From is required','periodFrom');
  req(d.periodTo,'Cover — Reporting Period To is required','periodTo');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Reporting Period From',laterLabel:'Reporting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  req(d.ucn||d.ref,'Cover — Case Number is required','ucn');
  req(d.guardianName,'Cover — Guardian Name(s) is required','guardianName');
  req(d.q1ResidenceName,'Cover — Current Residence Name is required','q1ResidenceName');
  req(d.q1Street,'Cover — Current Residence Street Address is required','q1Street');
  if(d.amendedForm==='Yes')req(d.amendedVersion,'Cover — Amended Form version is required','amendedVersion');

  const q3provs=(d.q3Providers||[]).filter(r=>r&&r.last);
  if(!q3provs.length)errs.push(issue('3. Treatment Providers — At least one provider must be listed','q3Providers.0.last'));
  (d.q3Providers||[]).forEach((r,i)=>{
    // Milestone 61B: see plan-initial's equivalent -- the old list omitted
    // state, ZIP and visits, so a row carrying only those raised nothing.
    if(rowStarted(r)&&!r.last)
      errs.push(issue(`3. Treatment Providers — Row ${i+1}: Provider last name is required`,`q3Providers.${i}.last`));
  });

  const anyMed=d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other;
  if(!anyMed)errs.push(issue('4. Medical Services — At least one medical service option is required','q4Primary'));
  if(d.q4Other)req(d.q4Explain,'4. Medical Services — Explanation for "Other" is required','q4Explain');

  req(d.q5SchoolProgress,"5. Education & Social Development — School progress summary is required",'q5SchoolProgress');
  req(d.q5SocialDevelopment,"5. Education & Social Development — Social development description is required",'q5SocialDevelopment');
  req(d.q5Communicates,"5. Education & Social Development — Communication statement is required",'q5Communicates');
  req(d.q5Interpersonal,"5. Education & Social Development — Interpersonal relationships statement is required",'q5Interpersonal');
  const anyUnmet=d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other;
  if(!anyUnmet)errs.push(issue('5. Education & Social Development — Unmet social needs option is required','q5NoUnmetNeeds'));
  if(d.q5Other)req(d.q5Explain,'5. Education & Social Development — Explanation for "Other" unmet needs is required','q5Explain');

  const anyCert=d.certIncapacitated||d.certMinor||d.certConsulted||d.certNoRestriction||d.certProvidesCare||d.certPhysicianAttached;
  if(!anyCert)errs.push(issue('Guardian Signatures — At least one certification statement must be checked','certIncapacitated'));
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Guardian Signatures — Guardian name is required','planGuardians.0.name');
  // Milestone 39-C: replaces the old unconditional req(g0.signatureDate,...)
  // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
  // rule as 39-B's Guardian pilot on Plan Simplified. name omitted: g0.name
  // is already unconditionally required immediately above.
  errs.push(...checkSignatureState({
    state: g0.signatureState,
    date: g0.signatureDate,
    image: g0.signatureImage,
    sectionLabel: 'Guardian Signatures', roleLabel: 'Guardian',
    filingType:T, statePath:'planGuardians.0.signatureState', datePath:'planGuardians.0.signatureDate', imagePath:'planGuardians.0.signatureImage',role:'guardian',policy:signaturePolicyOf(d),
  }));
  req(g0.mailingStreet,'Guardian Signatures — Guardian mailing street address is required','planGuardians.0.mailingStreet');
  req(g0.phone,'Guardian Signatures — Guardian phone is required','planGuardians.0.phone');
  req(g0.tin,'Guardian Signatures — Guardian SSN/EIN is required','planGuardians.0.tin');
  // Milestone 74B: a co-guardian the filer has started (rowStarted(): anything
  // entered, a stamp or a signature choice included) is checked like the first
  // guardian -- the form asks every guardian for the same details. An untouched
  // co-guardian block is not checked. (Milestone 73A checked its signature only.)
  (d.planGuardians||[]).forEach((cg,i)=>{
    if(i===0||!rowStarted(cg))return;
    const who=`Co-Guardian ${i+1}`, at=`planGuardians.${i}`;
    req(cg.name,`Guardian Signatures — ${who} name is required`,`${at}.name`);
    errs.push(...checkSignatureState({state:cg.signatureState,date:cg.signatureDate,image:cg.signatureImage,sectionLabel:'Guardian Signatures',roleLabel:who,
      filingType:T,statePath:`${at}.signatureState`,datePath:`${at}.signatureDate`,imagePath:`${at}.signatureImage`,
      role:'guardian',policy:signaturePolicyOf(d)}));
    req(cg.mailingStreet,`Guardian Signatures — ${who} mailing street address is required`,`${at}.mailingStreet`);
    req(cg.phone,`Guardian Signatures — ${who} phone is required`,`${at}.phone`);
    req(cg.tin,`Guardian Signatures — ${who} SSN/EIN is required`,`${at}.tin`);
  });
  // Milestone 68A: no date order between any signature and the reporting
  // period -- a plan is written before the period it plans for (see Plan
  // Annual's note). checkSignatureState() still catches a missing or
  // malformed date; the same applies to the preparer and attorney below.

  // Milestone 35-3: preparer and attorney are optional roles (pro se filers
  // and Guardian Advocates need neither) -- required only once the filer has
  // started entering one, same reasoning as Plan Initial's attorney fields.
  // Milestone 39-C: an explicit "/s/"/Stamp choice also counts as "started"
  // (see Plan Initial's identical comment); an explicit or default Unsigned
  // choice does not, preserving the pro se exemption.
  if(planMinorPreparerStarted(d)){
    req(d.preparer_name,'Preparer & Attorney — Preparer name is required','preparer_name');
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(d.preparer_signatureState, d.preparer_signatureDate),
      date: d.preparer_signatureDate,
      image: d.preparer_signatureImage,
      sectionLabel: 'Preparer & Attorney', roleLabel: 'Preparer',
      filingType:T, datePath:'preparer_signatureDate', imagePath:'preparer_signatureImage',
    }));
  }
  // Milestone 72C: "an attorney is started" is the shared definition
  // (attorney-block.js) -- any attorney field, not only the name, signature
  // date or state -- and the attorney's email, which this form prints, is then
  // required, as on the Annual and Initial Plans.
  if(isAttorneyStarted(d,'planMinor')){
    req(d.attorney_name,'Preparer & Attorney — Attorney name is required','attorney_name');
    req(d.attorney_email,'Preparer & Attorney — Attorney email is required','attorney_email');
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Preparer & Attorney', roleLabel: 'Attorney',
      filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
    }));
  }

  return errs;
}
