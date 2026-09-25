// Milestone 70, 70C: the Verified Initial Inventory's filing model -- its blank
// filing, the blank row and party-card factories its +Add buttons and the
// Excel importer use (mk), and its page list. Moved from legacy-app.js; pure
// data, loaded eagerly so a filing can be created, hydrated and routed before
// the feature itself is ever imported.

export function emptyDataGuardian(){
  return {
    wardName:'',caseNumber:'',ucn:'',gid:null,county:'',guardianName:'',
    attorneyForGuardian:'',typeOfGuardianship:'',hasSafeDepositBox:'',
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
    guardians:[{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:'',isPreparer:false}],
    // Milestone 64A-2, item 2.5: asOfDate is the compilation statement's own
    // "as of" date (form PART IV H9), distinct from the signature date it
    // falls back to when blank.
    preparer:{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,asOfDate:null,signatureState:'',signatureImage:''},
    attorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null,signatureState:'',signatureImage:'',isPreparer:false},
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
    serviceRecipients:[{name:'',address:'',cityStateZip:''},{name:'',address:'',cityStateZip:''}],
    serviceDate:null,serviceAttorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureState:'',signatureImage:''},
    // Milestone 64A-2, item 2.4. Form PART VI J24/J25: 'Indicate if:' -- Ward
    // is totally incapacitated / Ward is under 14 years old / N/A. Required;
    // '' is unanswered and 'N/A' is a real, complete answer, not coerced.
    serviceIndicateIf:'',
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
export const mk = {
  // isPreparer: Milestone 67A, "This person prepared this filing" -- see
  // src/core/form/preparer-flag.js.
  guardian:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:'',isPreparer:false}),
  preparer:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,signatureState:'',signatureImage:''}),
  attorney:()=>({name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null,signatureState:'',signatureImage:''}),
  recipient:()=>({name:'',address:'',cityStateZip:''}),
  a1:()=>({propertyDescription:'',streetAddress:'',cityStateZip:'',notes:'',residence:'',income:'',fullAssetValue:0,wardPercent:100}),
  a2:()=>({lenderName:'',lenderAddress:'',lenderCityStateZip:'',accountNumber:'',notes:'',liabilityType:'Mortgage',fullDebtBalance:0,wardPercent:100}),
  b1:()=>({institutionName:'',restricted:'',accountType:'',accountNumber:'',streetAddress:'',cityStateZip:'',fullAssetAmount:0,wardPercent:100}),
  // Milestone 60K: no stored amountInSDB -- the workbook derives it from the
  // Yes/No answer and the ward share, and so does guardian-inventory/totals.js.
  b2:()=>({description:'',streetAddress:'',cityStateZip:'',valuationMethod:'',fullAssetValue:0,wardPercent:100,inSafeDepositBox:'',isVehicle:false,vehicleYear:'',vehicleMake:'',vehicleModel:'',vehicleVin:'',odometerMileage:''}),
  b3:()=>({description:'',streetAddress:'',cityStateZip:'',restricted:'',fullAssetValue:0,wardPercent:100,inSafeDepositBox:''}),
  b4:()=>({lenderName:'',relatedProperty:'',accountNumber:'',lenderAddress:'',liabilityType:'Loan',fullLiabilityBalance:0,wardPercent:100}),
  c1:()=>({payerName:'',payerAddress:'',payerCityStateZip:'',typeOfIncome:'',frequencyOfPayment:'Monthly',paymentBasis:'',annualIncomeAmount:0,wardPercent:100}),
  // Milestone 64A-2, item 3.4: claimantAttorney -- form C-2 C7 asks for the
  // claimant AND their attorney; optional, since not every claim has counsel
  // of record.
  c2:()=>({claimantName:'',claimantAttorney:'',lawsuitDescription:'',courtJurisdiction:'',caseNumber:'',claimantAddress:'',claimantCityStateZip:'',dateFiled:null,amountOfClaim:0,wardPercent:100}),
  c3:()=>({defendantName:'',actionDescription:'',status:'',courtJurisdiction:'',caseNumber:'',actionDate:null,estimatedSettlement:0,wardPercent:100}),
  c4:()=>({trustName:'',trusteeName:'',trusteeAddress:'',trusteeCityStateZip:'',dateCreated:null,accountNumber:'',trustType:'Pooled',trustAmount:0,wardPercent:100}),
  c5:()=>({assetDescription:'',ownerName:'',ownerAddress:'',ownerCityStateZip:'',relationshipToWard:'',totalAssetValue:0,jointOwnerPercent:50}),
};
