// Milestone 70, 70D: section completion -- the sidebar's check marks and the
// dashboard's filing progress -- as one pure evaluator per form engine. Each
// takes the filing and what it cannot import, and returns the same
// { checks, incomplete } map legacy-app.js's computeNavChecks() built from
// window.D and the monolith's own activeInventoryType; that function's seven
// branches were moved here as text (tests/unit/completion-parity.spec.js
// proves every map and percentage equal to the pre-move functions' on every
// fixture). src/core/filing/filing-registry.js hangs each evaluator on its
// filing identities and dispatches (computeCompletion(), filingProgress()),
// so an unopened filing's progress needs no feature pack.
//
// What each evaluator is handed rather than importing, because it lives in a
// feature or in the monolith: the Initial Inventory's validator and
// errorRoute() (its marks are bucketed from the export validator's own
// issues, so the two cannot disagree), and the Annual engine's totals and
// reconciliation (src/features/annual-accounting/totals.js). A missing
// validator returns null, never a fabricated pass -- see guardianCompletion.
//
// AGENTS.md section 4: the marks here are deliberately stricter than the
// export gate on the fourteen Annual schedules ("I verify there are no items
// to report" is asked for, never demanded for export), and Part XI is the one
// schedule where both agree because section 744.367(3)(a) names it.
import { SCHEDULE_NAV_KEYS } from '../filing/models/guardian.js';
import { PLAN_RIGHTS, PLAN_ADLS, PLAN_BENEFITS } from '../filing/models/plan-annual.js';
import { INITIAL_ADLS } from '../filing/models/plan-initial.js';
import { guardianHasAnyData, startedRows } from '../validation/row-started.js';
import { serviceRecipientIssues } from '../validation/service-recipients.js';
import { isSignatureComplete } from '../validation/signature-state.js';
import { isPlanInitialAttorneyStarted } from '../validation/attorney-block.js';
import { resolvePreparer } from '../form/preparer-flag.js';
import { certificateStarted as planCertificateStarted } from '../filing/plan-certificate-of-service.js';

// Milestone 57B: the same rule the validators use, imported rather than
// restated here. A second reading of the same data is
// exactly how Milestone 57's Simplified signature gap and 58C's attorney
// predicate drifted from their validators.
const recipientsSettled=(rows,attestation)=>{
  const rec=serviceRecipientIssues({
    rows,attestation,
    startedFields:['name','line2','line3','line4'],
    missingFields:(r)=>((r.name||'').trim()?[]:['Name']),
  });
  return !rec.needsAttestation&&rec.firstRowMissing.length===0&&rec.extraRows.length===0;
};
// Milestone 55B: mirrors checkDateOrder()'s own tolerance (src/core/
// validation/date-rules.js) -- a blank date on either side is the
// presence check's problem, not this one's, so it reports "in order"
// rather than manufacturing a second, redundant failure. That
// blank-tolerance is also what makes it safe to attach to a key that
// does not otherwise track the specific date's presence at all (see the
// "Borrowed" sites below): a role with no data yet never flips this false.
const datesOrdered=(earlier,later,allowSameDay=true)=>
  !earlier||!later||(allowSameDay?later>=earlier:later>earlier);

/** guardian engine. */
export function guardianCompletion(D, deps = {}) {
  // Milestone 40H-A: the Inventory's validator (deps.validateGuardian) exists
  // only once the Guardian Inventory feature bundle lazy-loads, so this branch can run
  // before it exists -- on the very first dashboard paint of a session
  // with a guardian-type ward and no prior guardian-feature navigation.
  // validate() used to call window.validateGuardian() unguarded, throwing
  // a TypeError getWardProgress()'s try/catch silently swallowed into a
  // console.warn on every such render. Returning null here (rather than
  // an empty error array) matters: an empty array would leave every
  // trackedKeys entry at its initialized `true`, reporting 100% complete
  // to a ward nothing has actually validated -- a false "Ready to file"
  // reading, worse than the crash it would replace. null propagates
  // through filingProgress() exactly like the old caught exception did,
  // so the dashboard's displayed progress keeps meaning "actually
  // computed," never a fabricated pass.
  if(typeof deps.validateGuardian!=='function')return null;
  // Single source of truth: every section's ✓/− here comes from the SAME
  // errors validate() produces and Print Preview's export gate checks --
  // not a second, separately-maintained set of looser rules. That older
  // approach let a schedule row with e.g. $0 for a required dollar amount,
  // or a D-2/D-4/D-5 page with only some of its required fields filled,
  // show a green ✓ in the sidebar while validate() still listed it as
  // missing on Print Preview, with no way to know the two disagreed until
  // export was blocked there. errorRoute() already turns each error's
  // "<Section> — <field>" prefix into a route ("A-1 row 2"->"/a1", "D-2
  // Preparer"->"/d2", "Cover"->"/") for the validation panel's own "Go to
  // section" links -- reused here to bucket every error onto the same key
  // the sidebar and Next-button gating use, so the two can't drift apart.
  const trackedKeys=['cover',...SCHEDULE_NAV_KEYS,'d1','d2','d3','d4','d5'];
  const checks={};
  trackedKeys.forEach(k=>checks[k]=true);
  deps.validateGuardian(D).forEach(e=>{
    // Milestone 42F: issues are objects with .message (and a toString()
    // that returns it); read the message explicitly rather than rely on it.
    const str=e&&typeof e==='object'?String(e.message??e):String(e);
    const i=str.indexOf(' — ');
    const section=i>-1?str.slice(0,i).trim():'';
    const route=deps.errorRoute(section,'guardian');
    const key=route==='/'?'cover':route?route.slice(1):null;
    if(key&&key in checks)checks[key]=false;
  });
  // Milestone 67B: D-4's bond / restricted-depository arrangement is asked,
  // never demanded -- nothing in that block gates export, so no validator
  // issue exists for it and the sidebar asks here. section-guidance-
  // policy.js's sidebarOnlyWants() is what explains the mark on the page.
  if(!D.bondDepositoryState)checks.d4=false;
  return {checks,incomplete:{}};
}

/** simplified engine. */
export function simplifiedCompletion(D, deps = {}) {
  const filled=v=>v!==''&&v!==null&&v!==undefined;
  const hasAny=(...vals)=>vals.some(v=>filled(v));
  const rowHasAnyData=r=>Object.entries(r||{}).some(([key,v])=>key!=='id'&&v!==''&&v!=null);
  const guardianComplete=g=>filled(g.name)&&filled(g.signatureDate)&&filled(g.ssn)&&filled(g.phone)&&filled(g.email)&&filled(g.mailingStreet)&&filled(g.mailingCityStateZip)&&filled(g.residenceStreet)&&filled(g.residenceCityStateZip);
  // Milestone 57, Simplified parity gap. The same rule validateSimplified()
  // applies, not a second reading of it: a boolean reimplementation of the
  // signature states is how the sidebar and the export gate drifted apart
  // here in the first place. Neither call passes a name, matching the
  // validator -- the attorney's printed name is required at Cover, and
  // duplicating it here would report the same blank field twice.
  const sigComplete=(state,date,image)=>isSignatureComplete({state,date,image});
  const checks={
    's-cover':D.eligDepository==='Yes'&&D.eligOnlyTransactions==='Yes'&&filled(D.wardName)&&filled(D.caseNumber)&&filled(D.ssn)&&filled(D.gid)&&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.attorney)&&filled(D.typeOfGuardianship)&&filled(D.county)&&filled(D.amendedForm)
      &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
    's-p2':filled(D.startingBalance)&&filled(D.interestIncome)&&filled(D.depositsSettlement)&&filled(D.serviceCharges)&&filled(D.federalIncomeTax),
    's-p3':filled(D.periodFrom)&&filled(D.periodTo)
      &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
    's-p4':guardianComplete(D.guardians[0]||{})&&D.guardians.every((g,i)=>i===0||!guardianHasAnyData(g)||guardianComplete(g))
      &&D.guardians.every(g=>datesOrdered(D.periodTo,g.signatureDate,true)),
    's-p5':filled(D.attorney_barNumber)&&filled(D.attorney_phone)&&filled(D.attorney_email)&&filled(D.attorney_street)&&filled(D.attorney_cityStateZip)
      &&datesOrdered(D.periodTo,D.attorney_signatureDate,true)
      &&sigComplete(D.attorney_signatureState,D.attorney_signatureDate,D.attorney_signatureImage),
    's-p6':filled(D.certServiceDate)&&filled(D.certIndicator)&&recipientsSettled(D.certRecipients,D.certNoRecipients)
      &&datesOrdered(D.periodTo,D.certServiceDate,true)
      &&sigComplete(D.certAttySignatureState,D.certAttySignDate,D.certAttySignatureImage),
    // Milestone 60J: Part VII is complete when every populated row is
    // complete AND the part has been answered -- entries, or the "none to
    // report" declaration. Matches Annual's 'a-p11' and validateSimplified().
    's-p7':(!!(D.scheduleNoItems&&D.scheduleNoItems.remuneration)||(D.remuneration||[]).some(r=>hasAny(r.guardian,r.type,r.amount,r.description)))
      &&(D.remuneration||[]).every(r=>!rowHasAnyData(r)||(filled(r.guardian)&&filled(r.type))),
  };
  const incomplete={
    's-cover':!checks['s-cover']&&hasAny(D.wardName,D.caseNumber,D.ssn,D.gid,D.periodFrom,D.periodTo,D.guardian,D.attorney,D.typeOfGuardianship,D.county),
    's-p2':!checks['s-p2']&&hasAny(D.startingBalance,D.interestIncome,D.depositsSettlement,D.serviceCharges,D.federalIncomeTax),
    's-p3':!checks['s-p3']&&hasAny(D.periodFrom,D.periodTo),
    's-p4':!checks['s-p4']&&(D.guardians.length>0||guardianHasAnyData(D.guardians[0]||{})),
    's-p5':!checks['s-p5']&&hasAny(D.attorney_barNumber,D.attorney_phone,D.attorney_street,D.attorney_cityStateZip),
    's-p6':!checks['s-p6']&&hasAny(D.certServiceDate,D.certIndicator,D.certRecipients?.[0]?.name),
    's-p7':!checks['s-p7']&&D.remuneration.some(r=>hasAny(r.guardian,r.type)),
  };
  return {checks,incomplete};
}

/** annual engine. */
export function annualCompletion(D, deps = {}) {
  const filled=v=>v!==''&&v!==null&&v!==undefined;
  const hasAny=(...vals)=>vals.some(v=>filled(v));
  const guardianComplete=g=>filled(g.name)&&filled(g.signatureDate)&&filled(g.ssn)&&filled(g.phone)&&filled(g.mailingStreet)&&filled(g.mailingCityStateZip);
  const rowHasAnyData=r=>Object.entries(r||{}).some(([key,v])=>key!=='id'&&v!==''&&v!=null);
  // "I verify there are no X to report" (scheduleEmptyHTMLAnnual()) is an
  // affirmative answer, not a blank -- an empty schedule the guardian has
  // explicitly confirmed is complete, exactly as it already is for
  // Guardian Inventory (whose validate() skips its empty-schedule error
  // for a confirmed key). Without this, checking the box wrote state
  // nothing read: the section could never go green and the filing could
  // never reach 100%, with no way for the user to tell why.
  const verifiedEmpty=k=>!!(D.scheduleNoItems&&D.scheduleNoItems[k]);
  const rowsComplete=(rows,fields,noItemsKey)=>verifiedEmpty(noItemsKey)||((rows||[]).length>0&&(rows||[]).every(r=>rowHasAnyData(r)&&fields.every(f=>filled(r[f]))));
  const rowsStarted=(rows,fields)=>(rows||[]).some(r=>rowHasAnyData(r));
  const t=deps.calcTotalsAnnual(D);
  const checks={
    'a-p1':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.gid)&&filled(D.guardian)&&filled(D.county)&&filled(D.filingType)
      &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
    'a-p2':filled(D.startingBalance),
    'a-p3':guardianComplete(D.guardians[0]||{})&&D.guardians.every((g,i)=>i===0||!guardianHasAnyData(g)||guardianComplete(g))
      &&D.guardians.every(g=>datesOrdered(D.periodTo,g.signatureDate,true)),
    // Milestone 67A: Part IV is complete without an outside preparer once
    // a guardian or the attorney is identified as the preparer -- the same
    // rule validateAnnual() applies (resolvePreparer(), imported).
    'a-p4':!!resolvePreparer(D)
      ||(filled(D.preparer.name)&&filled(D.preparer.signatureDate)&&filled(D.preparer.ssn)&&filled(D.preparer.phone)&&filled(D.preparer.street)&&filled(D.preparer.cityStateZip)
      &&datesOrdered(D.periodTo,D.preparer.signatureDate,true)),
    'a-p5':filled(D.attorney_bar)&&filled(D.attorney_phone)&&filled(D.attorney_email)&&filled(D.attorney_street)&&filled(D.attorney_cityStateZip)&&filled(D.attorney_signatureDate)
      &&datesOrdered(D.periodTo,D.attorney_signatureDate,true),
    // Complete when the two lines agree, or the difference is explained.
    'a-p67':(()=>{const r=deps.annualReconcileState(t,D);return !r.outOfBalance||r.explained;})(),
    // Part VIII is satisfied either by naming a trust or by certifying there
    // are none, matching the verifiedEmpty pattern the other Annual checks use.
    'a-p8':verifiedEmpty('a-p8')||verifiedEmpty('p8')||(D.trusts||[]).some(t=>t.name),
    // Milestone 67B: the sidebar asks which bond / restricted-depository
    // arrangement applies; nothing in the block gates export, so this is
    // the one sidebar-only rule on the page (section-guidance-policy.js's
    // sidebarOnlyWants() explains the mark). AGENTS.md section 4: the
    // sidebar asks "have you finished?", the gate asks "does this satisfy
    // the court?", and they are allowed to differ.
    'a-p9':filled(D.bondDepositoryState),
    'a-p10':filled(D.certDate)&&recipientsSettled(D.certRecipients,D.certNoRecipients)
      &&datesOrdered(D.periodTo,D.certDate,true),
    // Milestone 58D: Part XI is complete once it is ANSWERED -- either the
    // no-items declaration is ticked, or there is at least one populated row
    // and every populated row is complete. Previously an untouched Part XI
    // counted as complete, so the sidebar reported a filing ready that the
    // statute says is missing its remuneration declaration. Matches
    // validateAnnual()'s rule exactly; both changed together.
    'a-p11':verifiedEmpty('remuneration')
      ||((D.remuneration||[]).some(r=>rowHasAnyData(r))
         &&(D.remuneration||[]).every(r=>!rowHasAnyData(r)||(filled(r.guardian)&&filled(r.type)&&filled(r.amount)))),
    'a-scha':rowsComplete(D.schA,['payer','description','bank','accountNo','amount'],'scha'),
    'a-schb1':rowsComplete(D.schB1,['bankAcct','checkNo','datePaid','payee','amount'],'schb1'),
    'a-schb2':rowsComplete(D.schB2,['bankAcct','checkNo','datePaid','payee','amount'],'schb2'),
    'a-schb3':rowsComplete(D.schB3,['bankAcct','checkNo','datePaid','payee','amount'],'schb3'),
    'a-schb4':rowsComplete(D.schB4,['checkNo','datePaid','category','payee','amount'],'schb4'),
    'a-schc':verifiedEmpty('schc')||((D.schC||[]).length>0&&(D.schC||[]).every(r=>rowHasAnyData(r)&&filled(r.description)&&filled(r.date)&&(filled(r.gain)||filled(r.loss)))),
    'a-schd1':rowsComplete(D.schD1,['description','accountNo','restricted','type','fullAmount','wardPct'],'schd1'),
    'a-schd2':rowsComplete(D.schD2,['description','residence','income','fullValue','wardPct','carryingValue'],'schd2'),
    'a-schd3':rowsComplete(D.schD3,['description','fullAmount','wardPct','carryingValue'],'schd3'),
    'a-schd4':rowsComplete(D.schD4,['description','restricted','fullAmount','wardPct','carryingValue'],'schd4'),
    'a-schd5':rowsComplete(D.schD5,['description','loanNo','loanType','fullDebt','wardPct'],'schd5'),
    'a-sche':verifiedEmpty('sche')||((D.schE||[]).length>0&&(D.schE||[]).every(r=>rowHasAnyData(r)&&filled(r.bankName)&&((filled(r.transferInDate)&&filled(r.transferInAmt))||(filled(r.transferOutDate)&&filled(r.transferOutAmt))))),
    'a-schf1':rowsComplete(D.schF1,['description','bank','accountNo','courtOrderDate','salePrice'],'schf1'),
    'a-schf2':rowsComplete(D.schF2,['description','bank','accountNo','courtOrderDate','salePrice'],'schf2'),
  };
  const incomplete={
    'a-p1':!checks['a-p1'],
    'a-p2':!checks['a-p2']&&filled(D.startingBalance),
    'a-p3':!checks['a-p3']&&(D.guardians.length>0||guardianHasAnyData(D.guardians[0]||{})),
    'a-p4':!checks['a-p4'],
    'a-p5':!checks['a-p5'],
    'a-scha':!checks['a-scha']&&rowsStarted(D.schA,['payer','description','bank','accountNo','amount']),
    'a-schb1':!checks['a-schb1']&&rowsStarted(D.schB1,['bankAcct','checkNo','datePaid','payee','amount']),
    'a-schb2':!checks['a-schb2']&&rowsStarted(D.schB2,['bankAcct','checkNo','datePaid','payee','amount']),
    'a-schb3':!checks['a-schb3']&&rowsStarted(D.schB3,['bankAcct','checkNo','datePaid','payee','amount']),
    'a-schb4':!checks['a-schb4']&&rowsStarted(D.schB4,['checkNo','datePaid','category','payee','amount']),
    'a-schc':!checks['a-schc']&&(D.schC||[]).length>0,
    'a-schd1':!checks['a-schd1']&&rowsStarted(D.schD1,['description','accountNo','restricted','type','fullAmount','wardPct']),
    'a-schd2':!checks['a-schd2']&&rowsStarted(D.schD2,['description','residence','income','fullValue','wardPct','carryingValue']),
    'a-schd3':!checks['a-schd3']&&rowsStarted(D.schD3,['description','fullAmount','wardPct','carryingValue']),
    'a-schd4':!checks['a-schd4']&&rowsStarted(D.schD4,['description','restricted','fullAmount','wardPct','carryingValue']),
    'a-schd5':!checks['a-schd5']&&rowsStarted(D.schD5,['description','loanNo','loanType','fullDebt','wardPct']),
    'a-sche':!checks['a-sche']&&(D.schE||[]).length>0,
    'a-schf1':!checks['a-schf1']&&rowsStarted(D.schF1,['description','bank','accountNo','courtOrderDate','salePrice']),
    'a-schf2':!checks['a-schf2']&&rowsStarted(D.schF2,['description','bank','accountNo','courtOrderDate','salePrice']),
  };
  return {checks,incomplete};
}

/** planSimplified engine. */
export function planSimplifiedCompletion(D, deps = {}) {
  const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
  const hasAny=(...vals)=>vals.some(v=>filled(v));
  const g0=(D.planGuardians||[])[0]||{};
  // Anything entered on the (optional) Certificate of Service: the shared
  // rule in plan-certificate-of-service.js, imported like serviceRecipientIssues.
  const certStarted=planCertificateStarted(D);
  // Q8 is answered once ANY box is ticked (NONE is itself a box), so a
  // boolean-or is the completion test rather than a filled() on each.
  const q8Answered=!!(D.q8DNR||D.q8LivingWill||D.q8Surrogate||D.q8POA||D.q8Other||D.q8None)
    &&(!D.q8Other||filled(D.q8OtherText))
    &&!(D.q8None&&(D.q8DNR||D.q8LivingWill||D.q8Surrogate||D.q8POA||D.q8Other));
  const checks={
    'ps-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.periodFrom)&&filled(D.periodTo)
      &&datesOrdered(D.periodFrom,D.periodTo,false),
    'ps-p2':filled(D.q1Residences)&&filled(D.q2BestPlacement)&&filled(D.q3MedicalTreatment)&&filled(D.q4Diagnosis)
      &&filled(D.q5SocialServices)&&filled(D.q6Interaction)
      &&filled(D.q7RestoreRights)&&(D.q7RestoreRights!=='Yes'||filled(D.q7RestoreExplain))
      &&q8Answered
      &&filled(D.q9Remuneration)&&(D.q9Remuneration!=='Yes'||filled(D.q9RemunerationExplain)),
    // Milestone 55B attached date-order checks here (the guardian's as an
    // exact fit, the preparer's and attorney's "Borrowed" onto this key);
    // Milestone 68A removed them with the validator's rule -- a plan is
    // written before the period it plans for, so a signature is not
    // ordered against it. Presence only, matching validatePlanSimplified().
    'ps-p3':filled(g0.name)&&filled(g0.signatureDate),
    // Milestone 68C: the Certificate of Service. The sidebar asks (someone
    // listed, or "no recipients are required" answered Yes -- the
    // accountings' rule, the same import); export never demands.
    // Follow-up, 2026-09-24: this form's certificate is not required (the
    // Clerk's own Simplified Plan checklist), so until the filer starts it
    // the page counts as finished -- no mark, no guidance, and its Preview
    // & Export button stays open. Once started, it is asked like any Plan's.
    'ps-p4':!certStarted||recipientsSettled(D.certRecipients,D.certNoRecipients),
  };
  const incomplete={
    'ps-cover':!checks['ps-cover']&&hasAny(D.wardName,D.caseNumber,D.periodFrom,D.periodTo),
    'ps-p2':!checks['ps-p2']&&hasAny(D.q1Residences,D.q2BestPlacement,D.q3MedicalTreatment,D.q4Diagnosis,D.q5SocialServices,D.q6Interaction,D.q7RestoreRights,D.q9Remuneration,D.q8DNR,D.q8LivingWill,D.q8Surrogate,D.q8POA,D.q8Other,D.q8None),
    'ps-p3':!checks['ps-p3']&&hasAny(g0.name,g0.signatureDate,g0.email,g0.phone,g0.mailingAddress),
    'ps-p4':!checks['ps-p4']&&certStarted,
  };
  return {checks,incomplete};
}

/** planAnnual engine. */
export function planAnnualCompletion(D, deps = {}) {
  const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
  const hasAny=(...vals)=>vals.some(v=>filled(v));
  const anyOf=(...vals)=>vals.some(v=>!!v);
  const g0=(D.planGuardians||[])[0]||{};
  // Milestone 61B: the same started-row rule the PDF model and the export
  // validator use (core/validation/row-started.js).
  // These three lists used to be a fourth hand-written copy that disagreed
  // with both, so a phone-only residence was invisible on every surface.
  const res=startedRows(D.q1Residences);
  const provs=startedRows(D.q4Providers);
  const rights=D.rights||{}, adls=D.adls||{};
  const b=D.benefits||{};
  const anyBenefit=PLAN_BENEFITS.some(([k])=>(b[k]||{}).eligible||(b[k]||{}).appliedFor);
  const checks={
    'pa-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.gid)
      &&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.wardLiving)
      &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip)
      &&datesOrdered(D.periodFrom,D.periodTo,false)&&datesOrdered(D.gid,D.periodFrom,true),
    'pa-p2':res.length>0&&res.every(r=>filled(r.name)),
    'pa-p3':anyOf(D.q2NoMove,D.q2WithinCounty,D.q2WithinCircuit,D.q2OutsideApproved,D.q2OutsideVenuePetition)
      &&anyOf(D.q3SettingALF,D.q3SettingGroupHome,D.q3SettingIntermediate,D.q3SettingPrivate,
              D.q3SettingSkilled,D.q3SettingSpecialized,D.q3SettingStateHospital,D.q3SettingOther)
      &&(!D.q3SettingOther||filled(D.q3SettingExplain))
      &&(!D.q3MedSpecialist||filled(D.q3MedSpecialistArea)),
    // Benefits is "check all that apply" — answered once any benefit row
    // is ticked, or the explicit None box is.
    'pa-p4':anyBenefit||!!D.q3BenefitsNone||!!D.q3BenefitsOther,
    // Milestone 40C-E: was `provs.every(...)` alone, which .every() makes
    // TRUE for an empty table -- so the sidebar called this section complete
    // while validatePlanAnnual() blocked export with "at least one provider
    // must be listed" (plan-annual/index.js:676), and the readiness panel
    // agreed with the validator. The comment here used to assert that an
    // empty table was a valid answer, which contradicted both. All three now
    // require at least one row, matching pi-p5's Initial Plan rule.
    'pa-p5':provs.length>0&&provs.every(r=>filled(r.name)),
    'pa-p6':filled(D.q5SocialSkills)&&filled(D.q5Activities)
      &&PLAN_RIGHTS.every(([k])=>filled(rights[k])),
    'pa-p7':PLAN_ADLS.every(([k])=>filled(adls[k])),
    'pa-p8':anyOf(D.q9MentalNone,D.q9MentalDementia,D.q9MentalAlzheimers,D.q9MentalAutism,D.q9MentalHeadInjury,
                  D.q9MentalDevelopmental,D.q9MentalIntellectual,D.q9MentalSchizophrenia,D.q9MentalDepression,
                  D.q9MentalSubstance,D.q9MentalOther)
      &&anyOf(D.q9PhysNone,D.q9PhysMobility,D.q9PhysBlindness,D.q9PhysDeafness,D.q9PhysDiabetic,
              D.q9PhysParkinsons,D.q9PhysArthritis,D.q9PhysOther)
      &&(!D.q9MentalOther||filled(D.q9MentalExplain))
      &&(!D.q9PhysOther||filled(D.q9PhysExplain)),
    'pa-p9':(!!D.q10NoDirectives!==!!D.q10Executed)&&(!D.q10ExecOther||filled(D.q10ExecOtherText)),
    'pa-p10':D.q11NoRemuneration?filled(D.q11NoRemunerationName)
                                :hasAny(D.q11ReceivedName,D.q11Amount,D.q11From),
    // Milestone 55B attached the guardian's and (Borrowed) the attorney's
    // date-order checks here; Milestone 68A removed them with the
    // validator's rule -- "Guardian date signed must be on or after
    // Reporting Period To" was the reported defect, and a plan is written
    // before the period it plans for. Presence only now, matching
    // validatePlanAnnual().
    // Milestone 55D: attorney email requiredness is gated on the same
    // bare `D.attorney` truthiness the validator uses -- a blank
    // attorney card is unaffected, matching validatePlanAnnual()'s
    // `if(d.attorney)req(d.attorney_email,...)`.
    'pa-p11':filled(g0.name)&&filled(g0.signatureDate)
      &&(!D.attorney||filled(D.attorney_email)),
    // Milestone 68C: the Certificate of Service -- see Plan Simplified's ps-p4.
    'pa-p12':recipientsSettled(D.certRecipients,D.certNoRecipients),
  };
  const incomplete={
    'pa-cover':!checks['pa-cover']&&hasAny(D.wardName,D.caseNumber,D.gid,D.periodFrom,D.periodTo,D.guardian,D.wardLiving,D.residenceAddress),
    'pa-p2':!checks['pa-p2']&&(D.q1Residences||[]).some(r=>r&&hasAny(r.name,r.street,r.cityStateZip,r.phone,r.facilityType,r.from,r.to)),
    'pa-p3':!checks['pa-p3']&&anyOf(D.q2NoMove,D.q2WithinCounty,D.q2WithinCircuit,D.q2OutsideApproved,D.q2OutsideVenuePetition,
            D.q3SettingALF,D.q3SettingGroupHome,D.q3SettingIntermediate,D.q3SettingPrivate,D.q3SettingSkilled,
            D.q3SettingSpecialized,D.q3SettingStateHospital,D.q3SettingOther,D.q3MedPrimary,D.q3MentalPsych,D.q3PersonalFacility,D.q3SocialFacility),
    'pa-p4':!checks['pa-p4']&&false,
    'pa-p5':!checks['pa-p5']&&(D.q4Providers||[]).some(r=>r&&hasAny(r.name,r.providerType,r.visits,r.street,r.cityStateZip,r.phone)),
    'pa-p6':!checks['pa-p6']&&(hasAny(D.q5SocialSkills,D.q5Activities)||PLAN_RIGHTS.some(([k])=>filled(rights[k]))),
    'pa-p7':!checks['pa-p7']&&PLAN_ADLS.some(([k])=>filled(adls[k])),
    'pa-p8':!checks['pa-p8']&&anyOf(D.q9MentalDementia,D.q9MentalAlzheimers,D.q9PhysMobility,D.q9UsesGlasses,D.q9NeedsGlasses,D.q9MentalNone,D.q9PhysNone),
    'pa-p9':!checks['pa-p9']&&anyOf(D.q10NoDirectives,D.q10Executed),
    'pa-p10':!checks['pa-p10']&&anyOf(D.q11NoRemuneration,D.q11ReceivedName,D.q11Amount,D.q11From),
    'pa-p11':!checks['pa-p11']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.email,g0.ssn),
    'pa-p12':!checks['pa-p12']&&((D.certRecipients||[]).some(r=>r&&hasAny(r.name,r.line2,r.line3,r.line4))||filled(D.certNoRecipients)||filled(D.certDate)),
  };
  return {checks,incomplete};
}

/** planInitial engine. */
export function planInitialCompletion(D, deps = {}) {
  const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
  const hasAny=(...vals)=>vals.some(v=>filled(v));
  const anyOf=(...vals)=>vals.some(v=>!!v);
  // Milestone 40C-H: Q7's Trusts/Pending Benefits are tri-state ('', 'Yes',
  // 'No') on new wards and legacy booleans on old ones, so a bare truthiness
  // test counts the string 'No' as a yes. Mirrors isAffirmative() in
  // core/form/form-contract.js (kept local, as it was in the classic script
  // it moved from); it must agree with validatePlanInitial() exactly or
  // the sidebar and the export blocker disagree about the same question.
  const isYes=v=>v===true||String(v??'').trim().toLowerCase()==='yes';
  const g0=(D.planGuardians||[])[0]||{};
  // Milestone 61B: shared started-row rule -- see the Plan Annual note.
  const provs=startedRows(D.q9Providers);
  const adls=D.adls||{};
  const directives=startedRows(D.q11Directives);
  const checks={
    // Milestone 68B: the reporting period is required and ordered, as on
    // the other Plans' covers -- mirroring validatePlanInitial().
    'pi-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.inceptionDate)
      &&filled(D.lettersSignedDate)&&filled(D.periodFrom)&&filled(D.periodTo)
      &&datesOrdered(D.periodFrom,D.periodTo,false)
      &&filled(D.guardianNames)&&filled(D.wardLiving)
      &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip),
    // Milestone 68E: questions 2, 4 and 5 are checkbox lists, mirroring validatePlanInitial().
    'pi-p2':anyOf(D.q2ALF,D.q2GroupHome,D.q2Intermediate,D.q2PrivateResidence,D.q2SkilledNursing,D.q2Specialized,D.q2StateHospital,D.q2Other)&&(!D.q2Other||filled(D.q2Explain))
      &&anyOf(D.q3MedPrimary,D.q3MedDentist,D.q3MedOphthalmologist,D.q3MedSpecialist,D.q3MedPT,
              D.q3MedST,D.q3MedOT,D.q3MedWardDecides,D.q3MedOther)
      &&(!D.q3MedSpecialist||filled(D.q3MedSpecialistArea))
      &&(!D.q3MedOther||filled(D.q3MedExplain)),
    'pi-p3':anyOf(D.q4Psych,D.q4Outpatient,D.q4Inpatient,D.q4None,D.q4Other)&&(!(D.q4Other||D.q4None)||filled(D.q4Explain))
      &&anyOf(D.q5CareFacility,D.q5NursesAides,D.q5FamilyFriends,D.q5Other)&&(!D.q5Other||filled(D.q5Explain)),
    'pi-p4':anyOf(D.q6CareFacility,D.q6NursesAides,D.q6FamilyFriends,D.q6DayProgram,D.q6WardDecides,D.q6Other)
      &&(!D.q6Other||filled(D.q6Explain))
      &&(anyOf(D.q7SocialSecurity,D.q7Ssdi,D.q7Hmo,D.q7Ssi,D.q7StateSupplement,D.q7InstitutionalCare,
               D.q7SupplementalIns,D.q7Pension,D.q7Medicare,D.q7Medicaid,D.q7Va,D.q7Trusts,
               D.q7PendingBenefits,D.q7Other)||filled(D.q7Explain))
      // Milestone 40C-H: this used to require the explanation for q7Other
      // only, while validatePlanInitial() required it for Trusts and Pending
      // Benefits as well -- so export could block on a section the sidebar
      // called complete. Both now read the same three conditions.
      &&(!(isYes(D.q7Trusts)||isYes(D.q7PendingBenefits)||D.q7Other)||filled(D.q7Explain)),
    // Unlike pa-p5's Annual Plan (see its comment), the Initial Plan's
    // Examining Providers exists because an examination already happened
    // to establish the guardianship -- an empty table isn't a valid
    // answer here, and a brand-new ward starts with exactly one blank row
    // (see emptyInitialProvider()), which .every() on its own would call
    // complete before anything is filled in.
    'pi-p5':provs.length>0&&provs.every(r=>filled(r.name)),
    'pi-p6':INITIAL_ADLS.every(([k])=>filled(adls[k])),
    'pi-p7':anyOf(D.mentalAlzheimers,D.mentalAutism,D.mentalClosedHeadInjury,D.mentalDementia,
                  D.mentalDepression,D.mentalDevelopmental,D.mentalSubstance,D.mentalSchizophrenia,D.mentalOther)
      &&anyOf(D.physMobility,D.physBlindness,D.physDeafness,D.physDiabetic,D.physParkinsons,D.physArthritis,D.physOther)
      &&anyOf(D.usesDentures,D.usesHearingAid,D.usesWheelchair,D.usesWalker,D.usesCrutches,
              D.usesProsthetics,D.usesGlasses,D.usesNone,D.usesOther)
      &&(!D.mentalOther||filled(D.mentalExplain))
      &&(!D.physOther||filled(D.physExplain))
      &&(!D.usesOther||filled(D.usesExplain)),
    'pi-p8':(!!D.q11NoDirectives!==!!D.q11Executed)
      &&(!D.q11ExecOther||filled(D.q11ExecOtherText))
      &&anyOf(D.needsDentures,D.needsHearingAid,D.needsWheelchair,D.needsWalker,D.needsCrutches,
              D.needsProsthetics,D.needsGlasses,D.needsNone,D.needsOther)
      &&(!D.needsOther||filled(D.needsExplain))
      &&filled(D.committeeIncorporated)&&(D.committeeIncorporated!=='No'||filled(D.committeeExplain)),
    'pi-p9':anyOf(D.certIncapacitatedNoCopy,D.certMinorNoCopy,D.certConsulted,D.certRecognizeRights,D.certNoRestriction,D.certProvidesCare)
      &&filled(g0.name)&&filled(g0.signatureDate),
    // Milestone 55D (Error 4): this key was unconditional -- a completely
    // blank attorney card (the pro se/Guardian Advocate exemption
    // Milestone 35-3 protects) already showed incomplete here, directly
    // contradicting validatePlanInitial(), which requires nothing until
    // its own "started" predicate trips. Replaced outright, not merely
    // extended with an email condition, which would have kept the
    // pre-existing bug: gated on the identical "started" predicate the
    // validator uses (attorney_bar alone, no name, already counts), with
    // name, the new email requirement, and a signature date all inside
    // that one gate -- matching the same presence-only approximation of
    // signature completeness every other nav-check key in this file
    // uses (full tri-state completeness is the validator's job via
    // checkSignatureState(), not this sidebar's).
    // Milestone 58C: "has an attorney been started?" is one shared rule now
    // (core/validation/attorney-block.js), not a copy of the validator's
    // four-field list. "Not started" is the pro se-safe answer: no attorney
    // requirement is asserted against a filing that may not have one.
    'pi-p10':!isPlanInitialAttorneyStarted(D)
      ||(filled(D.attorney_name)&&filled(D.attorney_email)&&filled(D.attorney_signatureDate)),
    // Milestone 68C: the Certificate of Service -- see Plan Simplified's ps-p4.
    'pi-p11':recipientsSettled(D.certRecipients,D.certNoRecipients),
  };
  const incomplete={
    'pi-cover':!checks['pi-cover']&&hasAny(D.wardName,D.caseNumber,D.inceptionDate,D.lettersSignedDate,D.periodFrom,D.periodTo,D.guardianNames,D.wardLiving,D.residenceAddress),
    'pi-p2':!checks['pi-p2']&&hasAny(D.q2ALF,D.q2GroupHome,D.q2Intermediate,D.q2PrivateResidence,D.q2SkilledNursing,D.q2Specialized,D.q2StateHospital,D.q2Other,D.q3MedPrimary,D.q3MedDentist,D.q3MedOphthalmologist,D.q3MedSpecialist,D.q3MedPT,D.q3MedST,D.q3MedOT,D.q3MedWardDecides,D.q3MedOther),
    'pi-p3':!checks['pi-p3']&&hasAny(D.q4Psych,D.q4Outpatient,D.q4Inpatient,D.q4None,D.q4Other,D.q5CareFacility,D.q5NursesAides,D.q5FamilyFriends,D.q5Other),
    'pi-p4':!checks['pi-p4']&&anyOf(D.q6CareFacility,D.q6NursesAides,D.q6FamilyFriends,D.q6DayProgram,D.q6WardDecides,D.q6Other,
            D.q7SocialSecurity,D.q7Ssdi,D.q7Hmo,D.q7Ssi,D.q7Medicare,D.q7Medicaid,D.q7Va,D.q7Trusts),
    'pi-p5':!checks['pi-p5']&&(D.q9Providers||[]).some(r=>r&&hasAny(r.name,r.providerType,r.examDate,r.street,r.cityStateZip,r.phone)),
    'pi-p6':!checks['pi-p6']&&INITIAL_ADLS.some(([k])=>filled(adls[k])),
    'pi-p7':!checks['pi-p7']&&anyOf(D.mentalAlzheimers,D.physMobility,D.usesGlasses,D.mentalNone,D.physNone),
    'pi-p8':!checks['pi-p8']&&anyOf(D.q11NoDirectives,D.q11Executed,D.committeeIncorporated,D.needsGlasses,D.needsNone),
    'pi-p9':!checks['pi-p9']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.ssn),
    // Milestone 58C: same predicate as the check above, not a third list.
    'pi-p10':!checks['pi-p10']&&isPlanInitialAttorneyStarted(D),
    'pi-p11':!checks['pi-p11']&&((D.certRecipients||[]).some(r=>r&&hasAny(r.name,r.line2,r.line3,r.line4))||filled(D.certNoRecipients)||filled(D.certDate)),
  };
  return {checks,incomplete};
}

/** planMinor engine. */
export function planMinorCompletion(D, deps = {}) {
  const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
  const hasAny=(...vals)=>vals.some(v=>filled(v));
  const anyOf=(...vals)=>vals.some(v=>!!v);
  // Milestone 40C-E: "answered" for a tri-state question means an explicit
  // Yes or No -- blank is unanswered, and no value is ever coerced to No.
  // Mirrors isTriStateAnswer() in core/form/form-contract.js.
  const isAnswered=v=>{
    if(v===true||v===false)return true;
    const s=String(v??'').trim().toLowerCase();
    return s==='yes'||s==='no';
  };
  const g0=(D.planGuardians||[])[0]||{};
  // Milestone 61B: shared started-row rule -- see the Plan Annual note.
  const provs=startedRows(D.q3Providers);
  const checks={
    // Milestone 40C-E: two of validatePlanMinor()'s own Cover requirements
    // were missing here, so the sidebar could call the Cover complete while
    // export blocked on it. Case identity is `ucn || ref` (:423 -- either
    // satisfies it, this form has both fields), and "Amended Form?" must be
    // ANSWERED (:414), which means Yes or No, not merely non-blank; when it
    // is Yes the version is required too (:427). isAnswered mirrors
    // isTriStateAnswer() from core/form/form-contract.js (inlined, as it was
    // in the classic script it moved from).
    'pm-cover':filled(D.wardName)&&filled(D.county)&&filled(D.periodFrom)&&filled(D.periodTo)
      &&filled(D.guardianName)&&filled(D.q1ResidenceName)&&filled(D.q1Street)
      &&(filled(D.ucn)||filled(D.ref))
      &&isAnswered(D.amendedForm)
      &&(String(D.amendedForm??'').trim().toLowerCase()!=='yes'||filled(D.amendedVersion))
      &&datesOrdered(D.periodFrom,D.periodTo,false),
    'pm-p2':true,
    // Same fix as pi-p5 above: an empty table shouldn't read as complete
    // before any provider has actually been entered.
    'pm-p3':provs.length>0&&provs.every(r=>filled(r.last)),
    'pm-p4':anyOf(D.q4Primary,D.q4Dentist,D.q4Specialist,D.q4PT,D.q4ST,D.q4OT,D.q4MinorDecides,D.q4Other)
      &&(!D.q4Other||filled(D.q4Explain)),
    'pm-p5':filled(D.q5SchoolProgress)&&filled(D.q5SocialDevelopment)&&filled(D.q5Communicates)&&filled(D.q5Interpersonal)
      &&anyOf(D.q5NoUnmetNeeds,D.q5DoesNotCareToSocialize,D.q5UnmetNeeds,D.q5Other)
      &&(!D.q5Other||filled(D.q5Explain)),
    // Milestone 55B ordered the guardian's, preparer's and attorney's
    // signature dates against the reporting period on pm-p6/pm-p7;
    // Milestone 68A removed those checks with the validator's rule -- a
    // plan is written before the period it plans for. Presence only now,
    // matching validatePlanMinor().
    'pm-p6':anyOf(D.certIncapacitated,D.certMinor,D.certConsulted,D.certNoRestriction,D.certProvidesCare,D.certPhysicianAttached)
      &&filled(g0.name)&&filled(g0.signatureDate),
    'pm-p7':filled(D.preparer_name)&&filled(D.attorney_name)&&filled(D.attorney_signatureDate),
    // Milestone 68C: the Certificate of Service -- see Plan Simplified's ps-p4.
    'pm-p8':recipientsSettled(D.certRecipients,D.certNoRecipients),
  };
  const incomplete={
    'pm-cover':!checks['pm-cover']&&hasAny(D.wardName,D.county,D.periodFrom,D.periodTo,D.guardianName,D.q1ResidenceName),
    'pm-p2':false,
    'pm-p3':!checks['pm-p3']&&(D.q3Providers||[]).some(r=>r&&hasAny(r.first,r.last,r.providerType,r.street,r.cityStateZip,r.phone)),
    'pm-p4':!checks['pm-p4']&&anyOf(D.q4Primary,D.q4Dentist,D.q4Specialist,D.q4PT,D.q4ST,D.q4OT),
    'pm-p5':!checks['pm-p5']&&hasAny(D.q5SchoolProgress,D.q5SocialDevelopment,D.q5Communicates,D.q5Interpersonal),
    'pm-p6':!checks['pm-p6']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.tin),
    'pm-p7':!checks['pm-p7']&&hasAny(D.preparer_name,D.attorney_name,D.attorney_signatureDate),
    'pm-p8':!checks['pm-p8']&&((D.certRecipients||[]).some(r=>r&&hasAny(r.name,r.line2,r.line3,r.line4))||filled(D.certNoRecipients)||filled(D.certDate)),
  };
  return {checks,incomplete};
}

/** Each engine's evaluator, for the registry (Final and Trust take the Annual one). */
export const COMPLETION_BY_ENGINE = Object.freeze({
  guardian: guardianCompletion,
  simplified: simplifiedCompletion,
  annual: annualCompletion,
  planSimplified: planSimplifiedCompletion,
  planAnnual: planAnnualCompletion,
  planInitial: planInitialCompletion,
  planMinor: planMinorCompletion,
});
