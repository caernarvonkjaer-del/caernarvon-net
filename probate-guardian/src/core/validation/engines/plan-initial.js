// @ts-nocheck -- in tsconfig.json's checked program only transitively (router.js -> nav-marks.js -> section-marks.js -> the
// export checks, Milestone 73F part 2); never written with JSDoc types (AGENTS.md section 2).
// Milestone 73F part 1: the Initial Guardianship Plan's export checks, moved unchanged from
// src/features/plan-initial/index.js's validatePlanInitial() but for taking the filing as
// an argument instead of reading the open one, so they load with the app and
// can judge any filing (73F part 2 uses that). validatePlanInitial() stays as a wrapper
// returning exactly what it did; tests/unit/validator-engines.spec.js holds it.
import { countyProblem, notFloridaCountyMessage } from '../county-rule.js';
import { INITIAL_ADLS } from '../../filing/models/plan-initial.js';
import { Q2_OPTIONS, Q4_OPTIONS, Q5_OPTIONS, anyChecked } from '../../filing/plan-initial-multiselect.js';
import { checkDateOrder } from '../date-rules.js';
import { checkSignatureState, inferLegacySignatureState, signaturePolicyOf } from '../signature-state.js';
import { isAffirmative } from '../../form/yes-no.js';
import { isPlanInitialAttorneyStarted } from '../attorney-block.js';
import { issueFactory } from '../validation-issue.js';
import { rowStarted } from '../row-started.js';

export function collectPlanInitialIssues(d){
  const errs=[];
  const T='planInitial';
  const issue=issueFactory(T);
  const req=(v,label,path)=>{if(v===''||v===null||v===undefined)errs.push(issue(label,path));};
  req(d.wardName,'Cover — Name of Ward is required','wardName');
  req(d.caseNumber,'Cover — Case Number is required','caseNumber');
  // Milestone 73F part 3 (73F-2): a Florida county, not only a non-blank one.
  {const county=countyProblem(d.county);if(county==='blank')errs.push(issue('Cover — County is required','county'));else if(county)errs.push(issue(notFloridaCountyMessage('Cover',county),'county'));}
  // Milestone 68B: the reporting period is required, as on the Annual and
  // Simplified Plans. There was no rule here at all -- an Initial Plan with
  // both dates blank exported a cover reading "For the period   through".
  req(d.periodFrom,'Cover — Reporting Period From is required','periodFrom');
  req(d.periodTo,'Cover — Reporting Period To is required','periodTo');
  errs.push(...checkDateOrder(d.periodFrom,d.periodTo,{
    sectionLabel:'Cover',earlierLabel:'Reporting Period From',laterLabel:'Reporting Period To',allowSameDay:false,
    filingType:T,laterPath:'periodTo',
  }));
  req(d.inceptionDate,'Cover — Guardianship Inception Date is required','inceptionDate');
  req(d.lettersSignedDate,'Cover — Date Letters Were Signed is required','lettersSignedDate');
  req(d.guardianNames,'Cover — Guardian Name(s) is required','guardianNames');
  req(d.wardLiving,'Cover — Where the ward is living is required','wardLiving');
  req(d.residenceAddress,'Cover — Address where ward resides is required','residenceAddress');
  req(d.residenceCityStateZip,'Cover — City/State/ZIP is required','residenceCityStateZip');

  // Milestone 68E: questions 2, 4 and 5 are checkbox lists -- at least one
  // box, and an explanation when Other (or, on 4, None) is ticked.
  if(!anyChecked(d,Q2_OPTIONS))errs.push(issue('2–3. Setting & Medical Care — Best-suited residential setting is required','q2ALF'));
  if(d.q2Other)req(d.q2Explain,'2–3. Setting & Medical Care — Explanation for "Other" residential setting is required','q2Explain');
  const anyMed=d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther;
  if(!anyMed)errs.push(issue('2–3. Setting & Medical Care — At least one medical service option is required','q3MedPrimary'));
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Setting & Medical Care — Specialist area of specialty is required','q3MedSpecialistArea');
  if(d.q3MedOther)req(d.q3MedExplain,'2–3. Setting & Medical Care — Explanation for "Other" medical service is required','q3MedExplain');

  if(!anyChecked(d,Q4_OPTIONS))errs.push(issue('4–5. Mental Health & Personal Care — Mental health service provision is required','q4Psych'));
  if(d.q4Other||d.q4None)req(d.q4Explain,'4–5. Mental Health & Personal Care — Explanation is required','q4Explain');
  if(!anyChecked(d,Q5_OPTIONS))errs.push(issue('4–5. Mental Health & Personal Care — Personal care provision is required','q5CareFacility'));
  if(d.q5Other)req(d.q5Explain,'4–5. Mental Health & Personal Care — Explanation for "Other" personal care is required','q5Explain');

  const anySocial=d.q6CareFacility||d.q6NursesAides||d.q6FamilyFriends||d.q6DayProgram||d.q6WardDecides||d.q6Other;
  if(!anySocial)errs.push(issue('6–7. Socialization & Benefits — At least one socialization/recreation option is required','q6CareFacility'));
  if(d.q6Other)req(d.q6Explain,'6–7. Socialization & Benefits — Explanation for "Other" socialization is required','q6Explain');
  // Milestone 40C-H: was `if(d.q7Trusts||d.q7PendingBenefits||d.q7Other)`.
  // Those first two are tri-state ('', 'Yes', 'No'), so the non-empty string
  // 'No' is truthy -- a filer who answered No to both was still required to
  // explain, blocking an otherwise complete filing. Unanswered stays
  // unanswered; this never treats a blank as No.
  if(isAffirmative(d.q7Trusts)||isAffirmative(d.q7PendingBenefits)||d.q7Other)req(d.q7Explain,'6–7. Socialization & Benefits — Explanation is required for Trusts, Pending Benefits, or Other','q7Explain');

  const q9provs=(d.q9Providers||[]).filter(r=>r&&r.name);
  if(!q9provs.length)errs.push(issue('9. Examining Providers — At least one provider must be listed','q9Providers.0.name'));
  (d.q9Providers||[]).forEach((r,i)=>{
    // Milestone 61B: was a hand-written field list that the next field
    // added to this row would not have been added to. The q9provs check
    // above still asks for one *named* provider; this asks whether the
    // filer started a row at all.
    if(rowStarted(r)&&!r.name)
      errs.push(issue(`9. Examining Providers — Row ${i+1}: Provider name is required`,`q9Providers.${i}.name`));
  });

  const missingAdlKeys=INITIAL_ADLS.filter(([k])=>!d.adls||!d.adls[k]).map(([k])=>k);
  if(missingAdlKeys.length>0)errs.push(issue(`10A. Daily Living — ${missingAdlKeys.length} of ${INITIAL_ADLS.length} activities not yet rated`,`adls.${missingAdlKeys[0]}`));

  const anyMental=d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther;
  if(!anyMental)errs.push(issue('10B–D. Disabilities & Devices — At least one mental disability option is required (or note none apply)','mentalAlzheimers'));
  if(d.mentalOther)req(d.mentalExplain,'10B–D. Disabilities & Devices — Explanation for "Other" mental disability is required','mentalExplain');
  const anyPhys=d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther;
  if(!anyPhys)errs.push(issue('10B–D. Disabilities & Devices — At least one physical disability option is required (or note none apply)','physMobility'));
  if(d.physOther)req(d.physExplain,'10B–D. Disabilities & Devices — Explanation for "Other" physical disability is required','physExplain');
  const anyUses=d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther;
  if(!anyUses)errs.push(issue('10B–D. Disabilities & Devices — Assistive devices currently used is required (or select None)','usesDentures'));
  if(d.usesOther)req(d.usesExplain,'10B–D. Disabilities & Devices — Explanation for "Other" device currently used is required','usesExplain');

  if(!!d.q11NoDirectives===!!d.q11Executed)errs.push(issue('11. Advance Directives — Select exactly one: no pre-existing directives, or directives were executed','q11NoDirectives'));
  if(d.q11ExecOther)req(d.q11ExecOtherText,'11. Advance Directives — Description of "Other" advance directive is required','q11ExecOtherText');
  const anyNeeds=d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther;
  if(!anyNeeds)errs.push(issue('11. Advance Directives — Assistive devices needed is required (or select None)','needsDentures'));
  if(d.needsOther)req(d.needsExplain,'11. Advance Directives — Explanation for "Other" device needed is required','needsExplain');
  req(d.committeeIncorporated,'11. Advance Directives — Whether examining-committee recommendations are incorporated is required','committeeIncorporated');
  if(d.committeeIncorporated==='No')req(d.committeeExplain,'11. Advance Directives — Explanation is required when recommendations are not incorporated','committeeExplain');

  const anyCert=d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare;
  if(!anyCert)errs.push(issue('Signatures — At least one certification statement must be checked','certIncapacitatedNoCopy'));
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian name is required','planGuardians.0.name');
  // Milestone 39-C: replaces the old unconditional req(g0.signatureDate,...)
  // -- Unsigned, "/s/" Signed, and Signature Stamp all now validate, same
  // rule as 39-B's Guardian pilot on Plan Simplified. name omitted: g0.name
  // is already unconditionally required immediately above.
  errs.push(...checkSignatureState({
    state: g0.signatureState,
    date: g0.signatureDate,
    image: g0.signatureImage,
    sectionLabel: 'Signatures', roleLabel: 'Guardian',
    filingType:T, statePath:'planGuardians.0.signatureState', datePath:'planGuardians.0.signatureDate', imagePath:'planGuardians.0.signatureImage',role:'guardian',policy:signaturePolicyOf(d),
  }));
  req(g0.street,'Signatures — Guardian street address is required','planGuardians.0.street');
  req(g0.phone,'Signatures — Guardian phone is required','planGuardians.0.phone');
  req(g0.ssn,'Signatures — Guardian SSN/EIN is required','planGuardians.0.ssn');
  // Milestone 74B: a co-guardian the filer has started (rowStarted(): anything
  // entered, a stamp or a signature choice included) is checked like the first
  // guardian -- the form asks every guardian for the same details. An untouched
  // co-guardian block is not checked. (Milestone 73A checked its signature only.)
  (d.planGuardians||[]).forEach((cg,i)=>{
    if(i===0||!rowStarted(cg))return;
    const who=`Co-Guardian ${i+1}`, at=`planGuardians.${i}`;
    req(cg.name,`Signatures — ${who} name is required`,`${at}.name`);
    errs.push(...checkSignatureState({state:cg.signatureState,date:cg.signatureDate,image:cg.signatureImage,sectionLabel:'Signatures',roleLabel:who,
      filingType:T,statePath:`${at}.signatureState`,datePath:`${at}.signatureDate`,imagePath:`${at}.signatureImage`,
      role:'guardian',policy:signaturePolicyOf(d)}));
    req(cg.street,`Signatures — ${who} street address is required`,`${at}.street`);
    req(cg.phone,`Signatures — ${who} phone is required`,`${at}.phone`);
    req(cg.ssn,`Signatures — ${who} SSN/EIN is required`,`${at}.ssn`);
  });

  // Milestone 35-3: pro se filers and Guardian Advocates (Ch. 393, exempt from
  // attorney representation under Fla. Prob. R. 5.030) must be able to export
  // without an attorney. Attorney fields are required only once the filer has
  // started entering one -- matching validatePlanAnnual/validatePlanSimplified's
  // existing non-blocking handling of the same fields. Milestone 39-C: an
  // explicit "/s/"/Stamp choice also counts as "started" (a filer who opens
  // the tri-state control and picks a real signature method has started,
  // even with every other attorney field still blank); an explicit or
  // default Unsigned choice does not, by itself, count as "started" --
  // preserving the pro se exemption.
  //
  // Milestone 58C: the condition moved to core/validation/attorney-block.js
  // and widened. It used to list only name, bar, signature date and a
  // non-Unsigned signature choice, so entering just the attorney's phone,
  // address, or email started nothing -- while Primary Email still showed a
  // required asterisk. The sidebar carried an identical copy of the same
  // narrow list; both now call the one predicate.
  if(isPlanInitialAttorneyStarted(d)){
    req(d.attorney_name,'Attorney Certification — Attorney name is required','attorney_name');
    // Milestone 55D: attorney_email already rendered a required asterisk
    // (inpS(...,true,'email')) with no matching rule anywhere -- confirmed
    // by grep. Added inside this same "started" gate, not a new,
    // separately-evaluated condition: attorney_bar alone (no name) already
    // trips this block, so keying email on a different test than name/date/
    // image would drift the moment either changes, and could narrow the
    // pro se/Guardian Advocate exemption above by accident.
    req(d.attorney_email,'Attorney Certification — Attorney email is required','attorney_email');
    errs.push(...checkSignatureState({
      state: inferLegacySignatureState(d.attorney_signatureState, d.attorney_signatureDate),
      date: d.attorney_signatureDate,
      image: d.attorney_signatureImage,
      sectionLabel: 'Attorney Certification', roleLabel: 'Attorney',
      filingType:T, datePath:'attorney_signatureDate', imagePath:'attorney_signatureImage',
    }));
  }

  return errs;
}
