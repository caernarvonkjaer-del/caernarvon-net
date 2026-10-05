// @ts-nocheck -- in tsconfig.json's checked program only transitively (filing-lifecycle.js imports it); moved
// as text from legacy-app.js in Milestone 70's 70G, never written with JSDoc types.
// Milestone 70, 70G: converting a filing into another form type -- what
// carries over, how the Inventory's schedules become the accounting's, and
// the conversion itself. Moved from legacy-app.js's CONVERT EXISTING WARD.
import { getOrCreateCaseForWard } from '../case-resolver.js';
import { carryOverFields, carrySourcesFor } from './carry-over.js';
import { formEngine, initializeEmptyData, INVENTORY_TYPES } from './filing-registry.js';
import { emptyRowAnnual } from './models/annual.js';
import { b2ItemDescription } from './models/guardian.js';
import { navigate } from '../navigation/router.js';
import { activateWard, createWardId } from '../navigation/ward-lifecycle.js';
import { saveWardToState, setDirtySinceExport, updateLastSavedIndicator } from '../persistence/case-file.js';
import { applyCarriedStartingBalance, crossesTrustBoundary as crossesTrust } from './starting-balance-carry.js';
import { withOldCertificateFilled, wardStatusAsMigrated } from './certificate-migrations.js';
import { getCaseFile } from '../state.js';
import { alertModal } from '../ui/dialogs.js';

// One human-readable description per source→target pair, shown before
// converting and reused in the confirmation alert afterward — so the
// explanation of what will/won't carry over is never out of sync with what
// the code actually does below.
// Milestone 71E: a Trust Accounting never takes a Starting Balance from a
// guardianship filing, nor gives one to it (starting-balance-carry.js); the
// dialog says so rather than promising a figure that does not arrive.
const TRUST_NO_CARRY=' Starting Balance is left blank: a trust accounting does not start from the guardianship\'s net assets (the Clerk compares a first trust accounting with the amount the annual accounting disbursed into the trust), so enter it yourself.';

export function describeConversion(srcType,destType){
  if(srcType==='guardian'&&formEngine(destType)==='annual'){
    return 'Real estate, cash accounts, personal property, intangible assets, debts, income sources, and trusts are carried into the matching schedules, along with the attorney block and the certificate of service\'s recipients. Review each schedule afterward — carrying values and this year\'s actual activity still need to be confirmed.'
      +(crossesTrust(srcType,destType)?TRUST_NO_CARRY:' The Initial Inventory\'s total becomes the Starting Balance, rounded to cents.');
  }
  if(srcType==='guardian'&&destType==='simplified'){
    return 'The Initial Inventory\'s total Ward\'s Value becomes the Starting Balance, and the attorney block and certificate of service recipients are carried over too. Simplified Accounting has no asset schedules, so itemised assets collapse into that single figure rather than transferring line by line.';
  }
  if(formEngine(srcType)==='annual'&&destType==='simplified'){
    return (crossesTrust(srcType,destType)
      ?'The reporting period, attorney block, certificate-of-service recipients and the ward\'s status, and any remuneration are carried over. Starting Balance is left blank: a trust accounting\'s ending balance is not the guardianship\'s, so enter it yourself.'
      :'The Annual Accounting\'s net asset total becomes the Starting Balance, and the reporting period, attorney block, certificate-of-service recipients and the ward\'s status, and any remuneration are carried over too.')
      +' Simplified Accounting has no asset schedules, so itemised schedule data collapses into that single figure rather than transferring line by line.';
  }
  if(srcType==='simplified'&&formEngine(destType)==='annual'){
    return (crossesTrust(srcType,destType)
      ?'The reporting period, attorney block, certificate-of-service recipients and the ward\'s status, and any remuneration are carried over.'+TRUST_NO_CARRY
      :'The Simplified Accounting\'s Ending Balance becomes the Starting Balance, and the reporting period, attorney block, certificate-of-service recipients and the ward\'s status, and any remuneration are carried over too.')
      +' Since Simplified Accounting doesn\'t track itemized assets, the new Annual Accounting\'s schedules start blank for you to complete.';
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
    const balance=crossesTrust(srcType,destType)
      ?`Starting Balance is left blank: a trust accounting and a guardianship accounting do not share an ending balance, so enter it yourself.`
      :`Starting Balance is set to this filing's ending net assets (Line 30, or Line 20 if it has no Schedule D figures), rounded to cents.`;
    return `The ward's name, case number, guardian, and attorney details are carried over. ${balance} Certificate-of-service recipients are carried too. County is restored from this ward's case record rather than copied from this filing. The accounting period and every schedule start blank for you to complete.`;
  }
  if(carrySourcesFor(destType).includes(srcType)){
    return `This creates a new ${INVENTORY_TYPES[destType].name} for the same ward. The ward's name, case number, county, guardian contact details and the attorney's details are carried over exactly as entered — nothing is renamed. Everything specific to this new filing (residence and care details, schedules, signatures, etc.) starts blank for you to complete.`;
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
// Milestone 72B: an answer is carried as given. keep() leaves 0 as 0 and a
// blank blank -- `x||''` turned a 0% share or a $0 value into a blank, which
// the Annual then reported as missing. tri() carries Yes, No or unanswered:
// an unanswered Restricted?/Residence?/Income? used to arrive as an
// affirmative 'No', which AGENTS.md section 4 forbids at any stage.
const keep=(v)=>(v===''||v==null)?'':v;
const tri=(v,legacy)=>(v==='Yes'||legacy===true)?'Yes':((v==='No'||legacy===false)?'No':'');

export function convertGuardianSchedulesToAnnual(src,dest){
  // Milestone 71E: an Initial Inventory converted into its first Annual now
  // carries its Summary I total as the Starting Balance -- Rule 5.696(b)(1):
  // "the ending balance of the preceding accounting, or if none, the value of
  // assets on the inventory". It carried nothing before (Milestone 40H-I's
  // comment in carry-over.js says this mapper set it; it did not). Nothing is
  // carried into a Trust Accounting (starting-balance-carry.js).
  applyCarriedStartingBalance(dest,src,dest.inventoryType);
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
  // holding pre-normalization legacy booleans. Opening a filing
  // (setActiveFiling()) migrates those aliases to canonical values and clears
  // the old keys first.
  dest.schD1=(src.scheduleB1||[]).map(r=>({
    description:[r.institutionName,r.accountType].filter(Boolean).join(' — '),
    accountNo:r.accountNumber||'', restricted:tri(r.restricted,r.isRestricted), type:r.accountType||'',
    fullAmount:keep(r.fullAssetAmount), wardPct:keep(r.wardPercent), restrictedAmt:''
  }));
  dest.schD2=(src.scheduleA1||[]).map(r=>({
    description:r.propertyDescription||'', residence:tri(r.residence,r.isPersonalResidence), income:tri(r.income,r.isIncomeProperty),
    fullValue:keep(r.fullAssetValue), wardPct:keep(r.wardPercent), carryingValue:keep(r.fullAssetValue), wardValue:''
  }));
  // Milestone 73D: a vehicle carries its own description, as it is filed.
  dest.schD3=(src.scheduleB2||[]).map(r=>({
    description:b2ItemDescription(r), fullAmount:keep(r.fullAssetValue), wardPct:keep(r.wardPercent), carryingValue:keep(r.fullAssetValue), wardAmount:''
  }));
  dest.schD4=(src.scheduleB3||[]).map(r=>({
    description:r.description||'', restricted:tri(r.restricted,r.isRestricted), fullAmount:keep(r.fullAssetValue),
    wardPct:keep(r.wardPercent), carryingValue:keep(r.fullAssetValue), wardValue:'', restrictedAmt:''
  }));
  dest.schD5=[
    ...(src.scheduleA2||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:keep(r.fullDebtBalance),wardPct:keep(r.wardPercent),wardBalance:''})),
    ...(src.scheduleB4||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:keep(r.fullLiabilityBalance),wardPct:keep(r.wardPercent),wardBalance:''}))
  ];
  dest.schA=(src.scheduleC1||[]).map(r=>({payer:r.payerName||'',description:r.typeOfIncome||'',bank:'',accountNo:'',amount:keep(r.annualIncomeAmount)}));
  const trustRows=(src.scheduleC4||[]).map(r=>({
    hasTrust:'Yes', createdAfterGID:'No', name:r.trustName||'', trustee:r.trusteeName||'',
    accountNo:r.accountNumber||'', dateCreated:r.dateCreated||'', trustType:r.trustType||'',
    wardPct:keep(r.wardPercent), wardAmount:''
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
  // Milestone 72H: D-2's attorney only. A blank D-2 Bar number used to be
  // filled here from D-5's; convertWard() now hands every mapper the source
  // as the once-only fill would leave it (withOldCertificateFilled()), which
  // covers all four details in every direction.
  const a=src.attorney||{};
  dest.attorney_bar=a.barNumber||'';
  dest.attorney_phone=a.phone||'';
  // Milestone 72B: both of D-2's emails, which were dropped here.
  dest.attorney_email=a.email||'';
  dest.attorney_secondaryEmail=a.secondaryEmail||'';
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
  // Milestone 71E: the one carry (starting-balance-carry.js), rounded to cents
  // by the workbook's rule; nothing across the trust boundary.
  applyCarriedStartingBalance(dest,src,'simplified');

  if(srcType==='guardian'){
    const a=src.attorney||{};
    dest.attorney_barNumber=a.barNumber||'';
    dest.attorney_phone=a.phone||'';
    // Milestone 72B: both of D-2's emails, which were dropped here.
    dest.attorney_email=a.email||'';
    dest.attorney_secondaryEmail=a.secondaryEmail||'';
    dest.attorney_street=a.streetAddress||'';
    dest.attorney_cityStateZip=a.cityStateZip||'';
    // Milestone 72H: no certAtty... details -- the certificate's attorney is
    // Part V's, so a converted filing starts with nothing to note.
    // Milestone 72G: a later filing -- only the recipients carry; the
    // service date, method and ward's status start blank.
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
  // Milestone 72B: both emails, beside the rest of the attorney's details.
  dest.attorney_email=src.attorney_email||'';
  dest.attorney_secondaryEmail=src.attorney_secondaryEmail||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  // Milestone 72G (decided 2026-10-02): a certificate describes one filing
  // being served. A same-period conversion carries the recipients and the
  // ward's status -- for a source not opened since 72G, as its once-only move
  // would leave it (wardStatusAsMigrated(), read-only) -- and starts the date,
  // the method, every certificate signature and the attorney's own Part V
  // signature date blank: the new filing is signed and served on its own date.
  dest.certWardStatus=wardStatusAsMigrated(src);
  // Milestone 72H: no certAtty... details (Part V's attorney is the
  // certificate's).
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
      amount:keep(r.amount),description:r.description||''}));
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
  // Milestone 71E: the one carry (starting-balance-carry.js), rounded to cents
  // by the workbook's rule; nothing across the trust boundary.
  applyCarriedStartingBalance(dest,src,dest.inventoryType);
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'';
  dest.attorney_bar=src.attorney_barNumber||'';
  dest.attorney_phone=src.attorney_phone||'';
  // Milestone 72B: both emails, beside the rest of the attorney's details.
  dest.attorney_email=src.attorney_email||'';
  dest.attorney_secondaryEmail=src.attorney_secondaryEmail||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  // Milestone 40C-A item 3: attorney_county is a SEPARATE field from the
  // filing's county and must never be populated from the ward's county, nor
  // silently defaulted to Pinellas. It carries over only an existing
  // attorney_county, and otherwise stays blank for the filer to supply.
  dest.attorney_county=dest.attorney_county||src.attorney_county||'';
  // Milestone 72G (decided 2026-10-02): a certificate describes one filing
  // being served. A same-period conversion carries the recipients and the
  // ward's status -- for a source not opened since 72G, as its once-only move
  // would leave it (wardStatusAsMigrated(), read-only) -- and starts the date,
  // the method, every certificate signature and the attorney's own Part V
  // signature date blank: the new filing is signed and served on its own date.
  dest.certWardStatus=wardStatusAsMigrated(src);
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={name:r.name||'',line2:r.line2||'',line3:r.line3||'',line4:''};
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:keep(r.amount),description:r.description||''}));
  }
}

export async function convertExistingWard(sourceWardId,targetType){
  const sourceWard=getCaseFile().wards.find(w=>w.wardId===sourceWardId);
  if(!sourceWard)return;
  const srcType=sourceWard.inventoryType;
  if(srcType===targetType){await alertModal('Please choose a different inventory type to convert to.');return;}

  // Milestone 72H (decided at the Antigravity review): a source not opened
  // since 72H has not had its once-only certificate fill, so every mapper
  // below reads it as that fill would leave it -- the filing attorney's blank
  // fields taken from the old certificate's details. The source itself is
  // not changed (withOldCertificateFilled() returns a copy).
  const source=withOldCertificateFilled(sourceWard,formEngine(srcType));
  const wardId=createWardId();
  const newWard={
    wardId,
    inventoryType:targetType,
    createdDate:new Date().toISOString().split('T')[0],
    ...initializeEmptyData(targetType)
  };
  // Identity and contact details first, whichever direction this is.
  if(carrySourcesFor(targetType).includes(srcType)){
    Object.assign(newWard,carryOverFields(source,targetType));
  }else{
    mapConvertedHeaderFields(source,srcType,newWard,targetType);
  }

  // Then the financial mapping, for the pairs whose schedules genuinely
  // correspond. This MUST run after the identity carry above: that carry
  // returns blank schedules by design, so running it second would wipe
  // everything mapped here. (Regression guard — that is exactly what
  // happened once the Initial Inventory became a valid carry source.)
  if(srcType==='guardian'&&formEngine(targetType)==='annual'){
    convertGuardianSchedulesToAnnual(source,newWard);
    convertGuardianExtrasToAnnual(source,newWard);
  }else if(targetType==='simplified'){
    convertToSimplified(source,srcType,newWard);
  }else if(srcType==='simplified'&&formEngine(targetType)==='annual'){
    convertSimplifiedToAnnual(source,newWard);
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
