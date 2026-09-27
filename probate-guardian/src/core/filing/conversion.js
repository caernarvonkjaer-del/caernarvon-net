// @ts-nocheck -- in tsconfig.json's checked program only transitively (filing-lifecycle.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70G, never written with JSDoc types.
// Milestone 70, 70G: converting a filing into another form type -- what
// carries over, how the Inventory's schedules become the accounting's, and
// the conversion itself. Moved from legacy-app.js's CONVERT EXISTING WARD.
import { getOrCreateCaseForWard } from '../case-resolver.js';
import { carryOverFields, carrySourcesFor } from './carry-over.js';
import { formEngine, initializeEmptyData, INVENTORY_TYPES } from './filing-registry.js';
import { emptyRowAnnual } from './models/annual.js';
import { navigate } from '../navigation/router.js';
import { activateWard, createWardId } from '../navigation/ward-lifecycle.js';
import { saveWardToState, setDirtySinceExport, updateLastSavedIndicator } from '../persistence/case-file.js';
import { monolith } from '../runtime/monolith.js';
import { getCaseFile } from '../state.js';
import { alertModal } from '../ui/dialogs.js';

// One human-readable description per source→target pair, shown before
// converting and reused in the confirmation alert afterward — so the
// explanation of what will/won't carry over is never out of sync with what
// the code actually does below.
export function describeConversion(srcType,destType){
  if(srcType==='guardian'&&formEngine(destType)==='annual'){
    return 'Real estate, cash accounts, personal property, intangible assets, debts, income sources, and trusts are carried into the matching schedules, along with the attorney block and certificate of service. Review each schedule afterward — carrying values and this year\'s actual activity still need to be confirmed.';
  }
  if(srcType==='guardian'&&destType==='simplified'){
    return 'The Initial Inventory\'s total Ward\'s Value becomes the Starting Balance, and the attorney block and certificate of service recipients are carried over too. Simplified Accounting has no asset schedules, so itemised assets collapse into that single figure rather than transferring line by line.';
  }
  if(formEngine(srcType)==='annual'&&destType==='simplified'){
    return 'The Annual Accounting\'s net asset total becomes the Starting Balance, and the reporting period, attorney block, certificate of service and any remuneration are carried over too. Simplified Accounting has no asset schedules, so itemised schedule data collapses into that single figure rather than transferring line by line.';
  }
  if(srcType==='simplified'&&formEngine(destType)==='annual'){
    return 'The Simplified Accounting\'s Ending Balance becomes the Starting Balance, and the reporting period, attorney block, certificate of service and any remuneration are carried over too. Since Simplified Accounting doesn\'t track itemized assets, the new Annual Accounting\'s schedules start blank for you to complete.';
  }
  // Milestone 40H-I: same-family accounting-to-accounting (e.g. Annual ->
  // Final/Trust) -- checked ahead of the generic fallback below, which would
  // otherwise claim county carries "exactly as entered" (it's restored from
  // the ward's Party record, which can in principle differ from this
  // filing's own snapshot) and that "everything specific to this new filing
  // ... starts blank," which stopped being true for starting balance and
  // cert recipients once carryOverAccountingToAccounting() started carrying
  // them for this exact pair.
  if(formEngine(srcType)==='annual'&&formEngine(destType)==='annual'&&srcType!==destType){
    return `The ward's name, case number, guardian, and attorney details are carried over. Starting Balance is set to this filing's ending net assets, and certificate-of-service recipients are carried too. County is restored from this ward's case record rather than copied from this filing. The accounting period and every schedule start blank for you to complete.`;
  }
  if(carrySourcesFor(destType).includes(srcType)){
    return `This creates a new ${INVENTORY_TYPES[destType].name} for the same ward. The ward's name, case number, county, and guardian contact details are carried over exactly as entered — nothing is renamed. Everything specific to this new filing (residence and care details, schedules, signatures, etc.) starts blank for you to complete.`;
  }
  return 'Only case, guardian, and attorney information will be carried over. An Initial Inventory is a point-in-time snapshot of assets as of the Guardianship Inception Date, which can\'t be derived from an accounting period record — asset schedules will need to be completed manually.';
}

// Header fields exist on all three types but under different names in a few
// spots (e.g. guardianName vs guardian) — this copies whichever fields the
// source and target actually have in common.
export function mapConvertedHeaderFields(src,srcType,dest,destType){
  dest.wardName=src.wardName?`${src.wardName} (Converted)`:dest.wardName;
  dest.caseNumber=src.caseNumber||dest.caseNumber;
  // Milestone 63E: the UCN carries as the UCN on every conversion path.
  if('ucn' in dest)dest.ucn=src.ucn||dest.ucn;
  if('gid' in dest)dest.gid=src.gid||dest.gid;
  dest.county=src.county||dest.county;
  dest.typeOfGuardianship=src.typeOfGuardianship||dest.typeOfGuardianship;

  const srcGuardianName=srcType==='guardian'?src.guardianName:src.guardian;
  const srcAttorneyName=srcType==='guardian'?src.attorneyForGuardian:src.attorney;
  if(formEngine(destType)==='guardian'){
    dest.guardianName=srcGuardianName||dest.guardianName;
    dest.attorneyForGuardian=srcAttorneyName||dest.attorneyForGuardian;
  }else{
    dest.guardian=srcGuardianName||dest.guardian;
    dest.attorney=srcAttorneyName||dest.attorney;
  }
}

// Initial Inventory → Annual Accounting: maps each schedule to its closest
// real-world equivalent. Carrying value defaults to full value (the normal
// starting assumption before any market change is recorded), and this
// year's actual income/activity is left for the user to confirm rather than
// silently assumed from the inventory's projected figures.
export function convertGuardianSchedulesToAnnual(src,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  // Canonical tri-state fields are preferred, with a fallback for callers
  // holding pre-normalization legacy booleans. Normal setD() loading migrates
  // those aliases to canonical values and clears the old keys first.
  dest.schD1=(src.scheduleB1||[]).map(r=>({
    description:[r.institutionName,r.accountType].filter(Boolean).join(' — '),
    accountNo:r.accountNumber||'', restricted:(r.restricted==='Yes'||r.isRestricted===true)?'Yes':'No', type:r.accountType||'',
    fullAmount:r.fullAssetAmount||'', wardPct:r.wardPercent||'', restrictedAmt:''
  }));
  dest.schD2=(src.scheduleA1||[]).map(r=>({
    description:r.propertyDescription||'', residence:(r.residence==='Yes'||r.isPersonalResidence===true)?'Yes':'No', income:(r.income==='Yes'||r.isIncomeProperty===true)?'Yes':'No',
    fullValue:r.fullAssetValue||'', wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardValue:''
  }));
  dest.schD3=(src.scheduleB2||[]).map(r=>({
    description:r.description||'', fullAmount:r.fullAssetValue||'', wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardAmount:''
  }));
  dest.schD4=(src.scheduleB3||[]).map(r=>({
    description:r.description||'', restricted:(r.restricted==='Yes'||r.isRestricted===true)?'Yes':'No', fullAmount:r.fullAssetValue||'',
    wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardValue:'', restrictedAmt:''
  }));
  dest.schD5=[
    ...(src.scheduleA2||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:r.fullDebtBalance||'',wardPct:r.wardPercent||'',wardBalance:''})),
    ...(src.scheduleB4||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:r.fullLiabilityBalance||'',wardPct:r.wardPercent||'',wardBalance:''}))
  ];
  dest.schA=(src.scheduleC1||[]).map(r=>({payer:r.payerName||'',description:r.typeOfIncome||'',bank:'',accountNo:'',amount:r.annualIncomeAmount||''}));
  const trustRows=(src.scheduleC4||[]).map(r=>({
    hasTrust:'Yes', createdAfterGID:'No', name:r.trustName||'', trustee:r.trusteeName||'',
    accountNo:r.accountNumber||'', dateCreated:r.dateCreated||'', trustType:r.trustType||'',
    wardPct:r.wardPercent||'', wardAmount:''
  }));
  while(trustRows.length<3)trustRows.push(emptyRowAnnual('trust'));
  dest.trusts=trustRows.slice(0,3);
}

// Non-schedule fields that move from an Initial Inventory into an Annual
// (or Final/Trust) Accounting: the attorney block and the certificate of
// service. Signature dates are never carried — the new filing is signed and
// served on its own date.
export function convertGuardianExtrasToAnnual(src,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  const a=src.attorney||{}, sa=src.serviceAttorney||{};
  dest.attorney_bar=a.barNumber||'';
  dest.attorney_phone=a.phone||'';
  dest.attorney_street=a.streetAddress||'';
  dest.attorney_cityStateZip=a.cityStateZip||'';
  // Milestone 40C-A item 3: attorney_county is a SEPARATE field from the
  // filing's county and must never be populated from the ward's county, nor
  // silently defaulted to Pinellas. It carries over only an existing
  // attorney_county, and otherwise stays blank for the filer to supply.
  dest.attorney_county=dest.attorney_county||src.attorney_county||'';
  // Initial Inventory recipients are name / address / cityStateZip; the
  // Annual form gives each recipient four lines, so they map straight over
  // with the fourth left free.
  (src.serviceRecipients||[]).slice(0,4).forEach((r,i)=>{
    if(!dest.certRecipients[i])dest.certRecipients[i]={name:'',line2:'',line3:'',line4:''};
    dest.certRecipients[i]={name:r.name||'',line2:r.address||'',line3:r.cityStateZip||'',line4:''};
  });
  if(sa.barNumber&&!dest.attorney_bar)dest.attorney_bar=sa.barNumber;
}

// Everything that has a genuine counterpart on the Simplified Accounting.
// The Simplified form carries no itemised asset schedules, so the assets
// themselves collapse into the Starting Balance; what else can move is the
// attorney block, the certificate of service, the reporting period, and any
// remuneration disclosure.
export function convertToSimplified(src,srcType,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  const total=monolith.getWardHeadlineTotal(src);
  dest.startingBalance=total!=null?String(total):'';

  if(srcType==='guardian'){
    const a=src.attorney||{}, sa=src.serviceAttorney||{};
    dest.attorney_barNumber=a.barNumber||'';
    dest.attorney_phone=a.phone||'';
    dest.attorney_street=a.streetAddress||'';
    dest.attorney_cityStateZip=a.cityStateZip||'';
    dest.certAttyBarNumber=sa.barNumber||a.barNumber||'';
    dest.certAttyPhone=sa.phone||a.phone||'';
    dest.certAttyStreet=sa.streetAddress||a.streetAddress||'';
    dest.certAttyCityStateZip=sa.cityStateZip||a.cityStateZip||'';
    dest.certServiceDate=src.serviceDate||'';
    (src.serviceRecipients||[]).slice(0,4).forEach((r,i)=>{
      dest.certRecipients[i]={name:r.name||'',line2:r.address||'',line3:r.cityStateZip||''};
    });
    return;
  }

  // Annual family -> Simplified. Same ward, same period, smaller form.
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'';
  dest.attorney_barNumber=src.attorney_bar||'';
  dest.attorney_phone=src.attorney_phone||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  dest.attorney_signatureDate=src.attorney_signatureDate||'';
  dest.certServiceDate=src.certDate||'';
  dest.certIndicator=src.certIndicator||'';
  dest.certAttySignDate=src.certAttySignDate||'';
  dest.certAttyBarNumber=src.attorney_bar||'';
  dest.certAttyPhone=src.attorney_phone||'';
  dest.certAttyStreet=src.attorney_street||'';
  dest.certAttyCityStateZip=src.attorney_cityStateZip||'';
  // The Annual gives each recipient a 4th line the Simplified form lacks —
  // fold it onto line 3 rather than silently dropping an address line.
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={
      name:r.name||'', line2:r.line2||'',
      line3:[r.line3,r.line4].filter(Boolean).join(', ')
    };
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:r.amount||'',description:r.description||''}));
  }
}

// Simplified -> Annual family: the mirror of convertToSimplified()'s second
// half. The Simplified form has no schedules to expand, so its ending
// balance becomes the new Starting Balance and the schedules start blank.
export function convertSimplifiedToAnnual(src,dest){
  // Milestone 57B (D7): the attestation never survives a conversion. It is
  // THIS filer's assertion about THIS filing -- that nobody required service
  // on it -- and a new filing has its own recipients and its own answer. It
  // is reset to '' (unanswered, never 'No'), and serviceNoRecipients never
  // maps to certNoRecipients or the reverse.
  //
  // Inside each mapper on purpose, not in the dispatcher: a caller-side
  // reset is the shape that earned the first attempt's "incomplete/unsafe"
  // verdict, because a fifth conversion path added later would inherit
  // nothing. Recipient address cards keep migrating exactly as before -- it
  // is the assertion that is dropped, never the data.
  dest.certNoRecipients='';
  dest.serviceNoRecipients='';
  const total=monolith.getWardHeadlineTotal(src);
  dest.startingBalance=total!=null?String(total):'';
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'';
  dest.attorney_bar=src.attorney_barNumber||'';
  dest.attorney_phone=src.attorney_phone||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  dest.attorney_signatureDate=src.attorney_signatureDate||'';
  // Milestone 40C-A item 3: attorney_county is a SEPARATE field from the
  // filing's county and must never be populated from the ward's county, nor
  // silently defaulted to Pinellas. It carries over only an existing
  // attorney_county, and otherwise stays blank for the filer to supply.
  dest.attorney_county=dest.attorney_county||src.attorney_county||'';
  dest.certDate=src.certServiceDate||'';
  dest.certIndicator=src.certIndicator||'';
  dest.certAttySignDate=src.certAttySignDate||'';
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={name:r.name||'',line2:r.line2||'',line3:r.line3||'',line4:''};
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:r.amount||'',description:r.description||''}));
  }
}

export async function convertExistingWard(sourceWardId,targetType){
  const sourceWard=getCaseFile().wards.find(w=>w.wardId===sourceWardId);
  if(!sourceWard)return;
  const srcType=sourceWard.inventoryType;
  if(srcType===targetType){await alertModal('Please choose a different inventory type to convert to.');return;}

  const wardId=createWardId();
  const newWard={
    wardId,
    inventoryType:targetType,
    createdDate:new Date().toISOString().split('T')[0],
    ...initializeEmptyData(targetType)
  };
  // Identity and contact details first, whichever direction this is.
  if(carrySourcesFor(targetType).includes(srcType)){
    Object.assign(newWard,carryOverFields(sourceWard,targetType));
  }else{
    mapConvertedHeaderFields(sourceWard,srcType,newWard,targetType);
  }

  // Then the financial mapping, for the pairs whose schedules genuinely
  // correspond. This MUST run after the identity carry above: that carry
  // returns blank schedules by design, so running it second would wipe
  // everything mapped here. (Regression guard — that is exactly what
  // happened once the Initial Inventory became a valid carry source.)
  if(srcType==='guardian'&&formEngine(targetType)==='annual'){
    convertGuardianSchedulesToAnnual(sourceWard,newWard);
    convertGuardianExtrasToAnnual(sourceWard,newWard);
  }else if(targetType==='simplified'){
    convertToSimplified(sourceWard,srcType,newWard);
  }else if(srcType==='simplified'&&formEngine(targetType)==='annual'){
    convertSimplifiedToAnnual(sourceWard,newWard);
  }
  // annual->guardian and simplified->guardian: header fields only (mapped
  // above) — an Initial Inventory has no accounting-period equivalent to
  // derive asset schedules from, so those stay blank for manual entry.

  // Same explicit "this belongs with that one" reasoning as Add Ward's
  // carry-source picker -- see src/core/case-resolver.js.
  newWard.caseId=getOrCreateCaseForWard(sourceWard).id;

  getCaseFile().wards.push(newWard);
  await saveWardToState(newWard);

  await activateWard(newWard);
  setDirtySinceExport(true);
  updateLastSavedIndicator();
  navigate('/');
  await alertModal(`Converted "${sourceWard.wardName}" into a new ${INVENTORY_TYPES[targetType].name} form.\n\n${describeConversion(srcType,targetType)}`);
}
