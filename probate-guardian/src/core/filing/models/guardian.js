// Milestone 70, 70C: the Verified Initial Inventory's filing model -- its blank
// filing, the blank row and party-card factories its +Add buttons and the
// Excel importer use (mk), and its page list. Moved from legacy-app.js; pure
// data, loaded eagerly so a filing can be created, hydrated and routed before
// the feature itself is ever imported.
import { emptyRecipient } from '../recipient-shape.js';

export function emptyDataGuardian(){
  return {
    wardName:'',caseNumber:'',ucn:'',gid:null,county:'',guardianName:'',
    attorneyForGuardian:'',typeOfGuardianship:'',hasSafeDepositBox:'',
    // Milestone 71B: why there is no attorney (src/core/filing/unrepresented-filing.js).
    attorneyWaiverBasis:'',attorneyWaiverOrderDate:null,
    safeDepositBoxFiled:'',amendedForm:'',
    scheduleA1:[],scheduleA2:[],scheduleB1:[],scheduleB2:[],scheduleB3:[],
    scheduleB4:[],scheduleC1:[],scheduleC2:[],scheduleC3:[],scheduleC4:[],scheduleC5:[],
    // Per-schedule "I verify there are no items of this type" checkbox --
    // missing keys read as false, so a .sav saved before this existed just
    // treats every schedule as unconfirmed (matches its actual pre-existing
    // state: not yet reviewed), never as falsely confirmed empty.
    scheduleNoItems:{},
    // isPreparer on the guardian and attorney: Milestone 67A, "This person
    // prepared this filing" -- see src/core/form/preparer-flag.js.
    // Milestone 72C: email, as mk.guardian() gives every added co-guardian.
    guardians:[{name:'',ssnEin:'',phone:'',email:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:'',isPreparer:false,certifiesService:false}],
    // Milestone 64A-2, item 2.5: asOfDate is the compilation statement's own
    // "as of" date (form PART IV H9), distinct from the signature date it
    // falls back to when blank.
    preparer:{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,asOfDate:null,signatureState:'',signatureImage:''},
    // Milestone 72B: D-2 has always collected both emails; the model now names them.
    attorney:{name:'',barNumber:'',phone:'',email:'',secondaryEmail:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null,signatureState:'',signatureImage:'',isPreparer:false},
    // bondDepositoryState (Milestone 67B): which arrangement applies --
    // restricted depository only, bond and depository, bond only, or bond
    // waived by court order; '' is unanswered and is never coerced. It
    // replaced the 57A bondWaived tri-state (inferred on load, see
    // core/filing/bond-depository.js). None of the bond fields is required.
    bondAmount:'',bondPeriodFrom:null,bondPeriodTo:null,bondingCompany:'',bondDepositoryState:'',bondWaivedDate:'',restrictedDepositoryReceiptDate:'',
    // Milestone 57B: filer attestation that no one requires service.
    // Tri-state, never coerced (section 4): '' is unanswered, and an
    // empty recipient list must never infer 'Yes'. Asked only when no
    // recipient is listed (D16), and reset to '' by every filing
    // conversion (D7) -- it is this filer's assertion about this filing.
    serviceNoRecipients:'',
    // Milestone 73O part 2: a name and four address lines, as on every certificate (recipient-shape.js).
    serviceRecipients:[emptyRecipient(),emptyRecipient()],
    // Milestone 72H: the certificate's attorney is D-2's; serviceAttorney's
    // name and contact fields only hold details typed on D-5 before, until the
    // filer discards them. certAttorneyMigrated marks the once-only fill of
    // D-2's blanks from them (certificate-migrations.js).
    serviceDate:null,serviceAttorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureState:'',signatureImage:''},
    certAttorneyMigrated:false,
    // Milestone 71B: the guardian's certificate-of-service signature, used when no attorney is started.
    serviceGuardian:{signatureDate:null,signatureState:'',signatureImage:''},
    // Milestone 64A-2, item 2.4. Form PART VI J24/J25: 'Indicate if:' -- Ward
    // is totally incapacitated / Ward is under 14 years old / N/A. Required;
    // '' is unanswered and 'N/A' is a real, complete answer, not coerced.
    serviceIndicateIf:'',
    // Milestone 72G: how the copies were served -- the PDF's method line; never
    // written to the workbook, whose "Indicate if:" is the ward's status.
    serviceMethod:'',
    // Witnesses present during the physical inventory of the ward's personal
    // effects. Optional (not export-blocking) -- the Cover page reminder
    // states the requirement, but not every inventory necessarily has a
    // witness present, and the app shouldn't second-guess that on its own.
    witnesses:[]
  };
}

export const PAGES_GUARDIAN=[
  {id:'/',    label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/a1',  label:'Schedule A-1: Real Estate'},
  {id:'/a2',  label:'Schedule A-2: RE Liabilities'},
  {id:'/b1',  label:'Schedule B-1: Cash'},
  {id:'/b2',  label:'Schedule B-2: Personal Property'},
  {id:'/b3',  label:'Schedule B-3: Intangibles'},
  {id:'/b4',  label:'Schedule B-4: PP Liabilities'},
  {id:'/c1',  label:'Schedule C-1: Income'},
  {id:'/c2',  label:'Schedule C-2: Lawsuits Against'},
  {id:'/c3',  label:'Schedule C-3: Lawsuits By Ward'},
  {id:'/c4',  label:'Schedule C-4: Trusts'},
  {id:'/c5',  label:'Schedule C-5: Joint Owners'},
  {id:'/d1',  label:'D-1: Guardian Attestation'},
  {id:'/d2',  label:'D-2: Preparer & Attorney'},
  {id:'/d3',  label:'D-3: Audit Fee & Safe Deposit'},
  {id:'/d4',  label:'D-4: Bond & Surety Info'},
  {id:'/d5',  label:'D-5: Certificate of Service'},
  {id:'/print',label:'Print Preview'},
];

// The Inventory's blank party cards and schedule rows, as its +Add buttons,
// the Excel importer and the blank-card clean-up
// (src/core/form/prune-cards.js) build them.
//
// Milestone 73B (decisions 73B-3, 73B-4): a new row carries no answer the
// filer didn't give. Shares start blank, as the Clerk's workbook's share cells
// are (they used to start at 100%, C-5's joint owner's at 50% -- the
// workbook's printed example row), and so do A-2's and B-4's Type, C-1's
// Frequency and C-4's Type of Trust (they used to start at the first item of
// each Clerk list: Mortgage, Loan, Monthly, Pooled). A blank share is listed
// as missing (Milestone 72B) and its row's ward amount shows $0 until
// entered; the four are required on a row (73B-N1). Rows saved with the old
// defaults and nothing else are still untouched (blank-rows.js).
export const mk = {
  // isPreparer: Milestone 67A, "This person prepared this filing" -- see
  // src/core/form/preparer-flag.js.
  // Milestone 72C: email -- the signer's address for service (Rule 2.515(c)); warned when blank with no attorney.
  guardian:()=>({name:'',ssnEin:'',phone:'',email:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:'',isPreparer:false,certifiesService:false}),
  preparer:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:''}),
  attorney:()=>({name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null,signatureState:'',signatureImage:''}),
  recipient:()=>emptyRecipient(),
  a1:()=>({propertyDescription:'',streetAddress:'',cityStateZip:'',notes:'',residence:'',income:'',fullAssetValue:0,wardPercent:''}),
  a2:()=>({lenderName:'',lenderAddress:'',lenderCityStateZip:'',accountNumber:'',notes:'',liabilityType:'',fullDebtBalance:0,wardPercent:''}),
  b1:()=>({institutionName:'',restricted:'',accountType:'',accountNumber:'',streetAddress:'',cityStateZip:'',fullAssetAmount:0,wardPercent:''}),
  // Milestone 60K: no stored amountInSDB -- the workbook derives it from the
  // Yes/No answer and the ward share, and so does guardian-inventory/totals.js.
  b2:()=>({description:'',streetAddress:'',cityStateZip:'',valuationMethod:'',fullAssetValue:0,wardPercent:'',inSafeDepositBox:'',isVehicle:false,vehicleYear:'',vehicleMake:'',vehicleModel:'',vehicleVin:'',odometerMileage:''}),
  b3:()=>({description:'',streetAddress:'',cityStateZip:'',restricted:'',fullAssetValue:0,wardPercent:'',inSafeDepositBox:''}),
  b4:()=>({lenderName:'',relatedProperty:'',accountNumber:'',lenderAddress:'',liabilityType:'',fullLiabilityBalance:0,wardPercent:''}),
  c1:()=>({payerName:'',payerAddress:'',payerCityStateZip:'',typeOfIncome:'',frequencyOfPayment:'',paymentBasis:'',annualIncomeAmount:0,wardPercent:''}),
  // Milestone 64A-2, item 3.4: claimantAttorney -- form C-2 C7 asks for the
  // claimant AND their attorney; optional, since not every claim has counsel
  // of record.
  c2:()=>({claimantName:'',claimantAttorney:'',lawsuitDescription:'',courtJurisdiction:'',caseNumber:'',claimantAddress:'',claimantCityStateZip:'',dateFiled:null,amountOfClaim:0,wardPercent:''}),
  c3:()=>({defendantName:'',actionDescription:'',status:'',courtJurisdiction:'',caseNumber:'',actionDate:null,estimatedSettlement:0,wardPercent:''}),
  c4:()=>({trustName:'',trusteeName:'',trusteeAddress:'',trusteeCityStateZip:'',dateCreated:null,accountNumber:'',trustType:'',trustAmount:0,wardPercent:''}),
  c5:()=>({assetDescription:'',ownerName:'',ownerAddress:'',ownerCityStateZip:'',relationshipToWard:'',totalAssetValue:0,jointOwnerPercent:''}),
};

// Milestone 73D: a Schedule B-2 vehicle's description, built from its Year,
// Make, Model, VIN and mileage where it is filed -- the PDF, the workbook and
// conversion to the Annual family's Schedule D-3. The page used to copy these
// over the filer's own Description on every keystroke, so ticking and
// unticking "This item is a vehicle" emptied it (or left "2019" in it). The
// filer's Description is now never written by the vehicle fields and comes
// back when the box is unticked (AGENTS.md section 4). Same wording as before.
export function vehicleDescription(e){
  const parts=[e?.vehicleYear,e?.vehicleMake,e?.vehicleModel].filter(Boolean).join(' ');
  let desc=parts+(e?.vehicleVin?(parts?' — VIN: ':'VIN: ')+e.vehicleVin:'');
  if(e?.odometerMileage)desc+=(desc?' — ':'')+'Odometer: '+e.odometerMileage+' mi';
  return desc;
}
/** What a B-2 row files as its description: a vehicle's own, else the filer's. */
export function b2ItemDescription(e){
  return e?.isVehicle?vehicleDescription(e):(e?.description||'');
}

// Milestone 74B: whether a D-1 co-guardian card is "entered" is the one rule
// every form uses, src/core/validation/row-started.js's rowStarted(): anything
// the filer entered counts, a stamp and a signature choice included. The
// field list that decided it here (guardianHasData()) retired.

// The Inventory's eleven schedule pages, by route key: the pages whose Next
// button a missing schedule disables, and the keys the sidebar's schedule
// marks use. (Moved from legacy-app.js by Milestone 70's 70D, with the
// completion evaluators that read it.)
export const SCHEDULE_NAV_KEYS=['a1','a2','b1','b2','b3','b4','c1','c2','c3','c4','c5'];
