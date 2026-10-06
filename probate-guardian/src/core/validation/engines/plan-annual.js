// Milestone 73F part 1: the Annual Guardianship Plan's export checks, moved unchanged from
// src/features/plan-annual/index.js's validatePlanAnnual() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validatePlanAnnual() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { PLAN_ADLS, PLAN_RIGHTS } from '../../filing/models/plan-annual.js';
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState } from '../signature-state.js';
import { isAttorneyStarted } from '../attorney-block.js';
import { issueFactory } from '../validation-issue.js';
import { startedRows } from '../row-started.js';

export function collectPlanAnnualIssues(d){
  const errs=[];
  const T='planAnnual';
  const issue=issueFactory(T);
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined)errs.push(issue(label,path));};
  req(d.wardName,'Cover — Name of Ward is required','wardName');
  req(d.caseNumber,'Cover — Case Number is required','caseNumber');
  req(d.county,'Cover — County is required','county');
  req(d.gid,'Cover — Guardianship Inception Date is required','gid');
  req(d.periodFrom,'Cover — Reporting Period From is required','periodFrom');
  req(d.periodTo,'Cover — Reporting Period To is required','periodTo');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Reporting Period From',laterLabel:'Reporting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  errs.push(...checkDateOrder(d.gid,d.periodFrom,{
    sectionLabel:'Cover',earlierLabel:'Guardianship Inception Date',laterLabel:'Reporting Period From',allowSameDay:true,
    filingType:T,laterPath:'periodFrom',
  }));
  req(d.guardian,'Cover — Guardian Name(s) is required','guardian');
  req(d.wardLiving,'Cover — where the ward is living must be answered','wardLiving');
  req(d.residenceAddress,'Cover — address where the ward resides is required','residenceAddress');
  req(d.residenceCityStateZip,'Cover — city/state/ZIP where the ward resides is required','residenceCityStateZip');

  // Row numbers index the filtered (non-blank) rows, as they always have --
  // a pre-existing modeling gap noted in the adapter; the path uses the
  // same index so the two stay consistent with each other.
  // Milestone 61B: same started-row rule as the PDF model, so a residence
  // that prints is a residence this validator can see. The old
  // name/street/cityStateZip list let a phone-only row through silently --
  // no error, and nothing on the filed plan either.
  const res=startedRows(d.q1Residences);
  if(!res.length)errs.push(issue('1. Residences — at least one residence must be listed','q1Residences.0.name'));
  res.forEach((r,i)=>{if(!r.name)errs.push(issue(`1. Residences — row ${i+1} needs a facility or owner name`,`q1Residences.${i}.name`));});

  if(!(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition)){
    errs.push(issue('2–3. Residence & Care — question 2 (address change) must have at least one box checked','q2NoMove'));
  }
  if(!(d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate
     ||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther)){
    errs.push(issue('2–3. Residence & Care — a best-suited residential setting must be selected','q3SettingALF'));
  }
  if(d.q3SettingOther)req(d.q3SettingExplain,'2–3. Residence & Care — explain the "Other" residential setting','q3SettingExplain');
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Residence & Care — area of specialty is required','q3MedSpecialistArea');

  // Milestone 61B: see the Q1 note above.
  const provs=startedRows(d.q4Providers);
  if(!provs.length)errs.push(issue('4. Medical Treatment — at least one provider must be listed','q4Providers.0.name'));
  provs.forEach((r,i)=>{if(!r.name)errs.push(issue(`4. Medical Treatment — row ${i+1} needs a provider name`,`q4Providers.${i}.name`));});

  req(d.q5SocialSkills,'5–7. Skills & Rights — question 5 (social skills) is required','q5SocialSkills');
  req(d.q5Activities,'5–7. Skills & Rights — question 5 (capacity-building activities) is required','q5Activities');
  const rights=d.rights||{};
  const unanswered=PLAN_RIGHTS.filter(([k])=>!rights[k]);
  if(unanswered.length){
    errs.push(issue(`5–7. Skills & Rights — ${unanswered.length} right${unanswered.length===1?'':'s'} still unanswered in question 6`,`rights.${unanswered[0][0]}`));
  }
  const adls=d.adls||{};
  const unrated=PLAN_ADLS.filter(([k])=>!adls[k]);
  if(unrated.length){
    errs.push(issue(`8. Daily Living — ${unrated.length} activit${unrated.length===1?'y is':'ies are'} still unrated`,`adls.${unrated[0][0]}`));
  }

  if(!(d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury
     ||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression
     ||d.q9MentalSubstance||d.q9MentalOther)){
    errs.push(issue('9. Disabilities & Devices — mental disabilities must be answered, or "no mental disabilities" checked','q9MentalNone'));
  }
  if(!(d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic
     ||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther)){
    errs.push(issue('9. Disabilities & Devices — physical disabilities must be answered, or "no physical disabilities" checked','q9PhysNone'));
  }
  if(d.q9MentalOther)req(d.q9MentalExplain,'9. Disabilities & Devices — explain the "Other" mental disability','q9MentalExplain');
  if(d.q9PhysOther)req(d.q9PhysExplain,'9. Disabilities & Devices — explain the "Other" physical disability','q9PhysExplain');

  if(!(d.q10NoDirectives||d.q10Executed)){
    errs.push(issue('10. Advance Directives — answer whether directives exist','q10NoDirectives'));
  }
  if(d.q10NoDirectives&&d.q10Executed){
    errs.push(issue('10. Advance Directives — cannot both have no directives and list executed directives','q10NoDirectives'));
  }
  if(d.q10ExecOther)req(d.q10ExecOtherText,'10. Advance Directives — describe the "Other" directive','q10ExecOtherText');

  if(d.q11NoRemuneration)req(d.q11NoRemunerationName,"11. Remuneration — declaring guardian's name is required",'q11NoRemunerationName');
  else if(!(d.q11ReceivedName||d.q11Amount||d.q11From)){
    errs.push(issue('11. Remuneration — either declare no remuneration, or record what was received','q11NoRemuneration'));
  }

  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian printed name is required','planGuardians.0.name');
  // Milestone 39-C: replaces the old unconditional req(g0.signatureDate,...)
  // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
  // rule as 39-B's Guardian pilot on Plan Simplified. name omitted: g0.name
  // is already unconditionally required immediately above.
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(g0.signatureState, g0.signatureDate),
    date: g0.signatureDate,
    image: g0.signatureImage,
    sectionLabel: 'Signatures', roleLabel: 'Guardian',
    filingType:T, datePath:'planGuardians.0.signatureDate', imagePath:'planGuardians.0.signatureImage',
  }));
  req(g0.mailingStreet,'Signatures — Guardian mailing street address is required','planGuardians.0.mailingStreet');
  req(g0.phone,'Signatures — Guardian phone number is required','planGuardians.0.phone');
  req(g0.ssn,'Signatures — Guardian SSN/EIN is required','planGuardians.0.ssn');
  // Milestone 68A: no date order between a signature and the reporting
  // period. A plan is written BEFORE the period it plans for, so the rule
  // the accountings correctly keep ("sign after the period you report on")
  // had no honest remedy here -- the only way past it was a post-dated
  // signature on a sworn filing. checkSignatureState() above still catches a
  // missing or malformed date.
  // Milestone 39-C: the attorney card has never had any requiredness of its
  // own ("Leave blank if no attorney is involved") -- name is passed here
  // (unlike Guardian's omission above) because nothing else in this
  // validator makes attorney name required, so an explicit "/s/"/Stamp
  // choice with no typed name would otherwise pass silently.
  // Milestone 42F: namePath is the bare `attorney` scalar; the pre-42F
  // adapter sent this message to the guardian's name field.
  // Milestone 72C: the name is required below once an attorney is started,
  // so it is no longer passed here, where it would repeat that message (the
  // convention checkSignatureState() documents; the guardian's call follows it).
  errs.push(...checkSignatureState({
    state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
    date: d.attorney_signatureDate,
    image: d.attorney_signatureImage,
    sectionLabel: 'Signatures', roleLabel: 'Attorney',
    filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
  }));
  // Milestone 55D: attorney_email already rendered a required asterisk
  // (inpS(...,true,'email')) with no matching rule here. Unlike bar/phone/
  // street/cityStateZip (never required, per the comment above), this is a
  // new requirement -- gated on bare `d.attorney` truthiness, co-existing
  // with (not replacing) checkSignatureState()'s own signature-state-keyed
  // name requirement just above. A blank attorney card is unaffected.
  // Milestone 72C (decided 2026-10-02): once any attorney field is entered
  // (attorney-block.js, the shared definition), the attorney's name and
  // primary email are both required, as on the other Plans and the
  // accountings. This used to test only d.attorney, so a Bar number alone was
  // "no attorney", and the name was asked only through "/s/".
  if(isAttorneyStarted(d,'planAnnual')){
    req(d.attorney,'Signatures — Attorney name is required','attorney');
    req(d.attorney_email,'Signatures — Attorney email is required','attorney_email');
  }
  return errs;
}
