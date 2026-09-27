// Milestone 70, 70C: the Annual Accounting engine's filing model -- the one
// model behind three filing identities (Annual, Final and Trust; see
// src/core/filing/filing-registry.js's formEngine()). The blank row per
// schedule (emptyRowAnnual(), moved from legacy-app.js) and the blank filing
// (emptyDataAnnual(), moved from src/core/state.js). Pure data, loaded eagerly.

export function emptyRowAnnual(type){
  switch(type){
    case 'schA': return {payer:'',description:'',bank:'',accountNo:'',amount:''};
    case 'schB1': return {bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB2': return {bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB3': return {bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB4': return {bankAccountId:'',checkNo:'',datePaid:'',category:'',payee:'',amount:''};
    case 'schC':  return {description:'',date:'',gain:'',loss:''};
    case 'schD1': return {description:'',accountNo:'',restricted:'',type:'',fullAmount:'',wardPct:'',restrictedAmt:''};
    case 'schD2': return {description:'',residence:'',income:'',fullValue:'',wardPct:'',carryingValue:'',wardValue:''};
    case 'schD3': return {description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''};
    case 'schD4': return {description:'',restricted:'',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''};
    case 'schD5': return {description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''};
    case 'schE':  return {bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''};
    case 'schF1': return {description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''};
    case 'schF2': return {description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''};
    case 'trust': return {hasTrust:'',createdAfterGID:'',name:'',trustee:'',accountNo:'',dateCreated:'',trustType:'',wardPct:'',wardAmount:''};
    case 'remun': return {guardian:'',type:'',amount:'',description:''};
    default: return {};
  }
}

// Blank-ward data factory for the Annual Accounting feature (Milestone 7,
// Phase A) -- also used unchanged for the finalAccounting/trustAccounting
// aliases (formEngine() maps all three to 'annual' everywhere the app
// dispatches on type; there is no separate data shape for the aliases).
// Its three Part VIII trust rows are emptyRowAnnual('trust') above. (Until
// Milestone 70's 70C that function was a legacy-app.js global reached through
// window, with this literal row as a fallback for when it was missing; the two
// were the same row.)
export function emptyDataAnnual() {
  return {
    // Part I
    wardName:'', caseNumber:'', ucn:'', gid:'', periodFrom:'', periodTo:'',
    guardian:'', attorney:'', typeOfGuardianship:'', county:'',
    amendedForm:'', filingType:'Annual', relatedCaseNumbers:'',
    // Part II
    startingBalance:'',
    // Part III – guardians (up to 3)
    // isPreparer: Milestone 67A -- "This person prepared this filing"; at
    // most one guardian/attorney flag is true (src/core/form/preparer-flag.js).
    guardians:[{name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',signatureDate:'',signatureDateLabel:'',signatureState:'',signatureImage:'',isPreparer:false}],
    // Part IV – preparer
    preparer:{name:'',ssn:'',phone:'',street:'',cityStateZip:'',signatureDate:'',signatureState:'',signatureImage:''},
    // Part V – attorney
    attorney_bar:'', attorney_phone:'', attorney_email:'', attorney_street:'', attorney_cityStateZip:'',
    attorney_county:'', attorney_signatureDate:'',
    // Milestone 39-C
    attorney_signatureState:'', attorney_signatureImage:'',
    // Milestone 67A: the attorney's "This person prepared this filing" flag.
    attorney_isPreparer:false,
    // Schedules
    schA:[], schB1:[], schB2:[], schB3:[], schB4:[],
    // Schedule B-4's bank accounts. The court's workbook gives each one its
    // own block of check-register pages with the bank name and account
    // number printed on the block's first page, so a disbursement has to be
    // attributable to an account before it can be written. Each entry is
    // { id, bankName, accountNumber }; schB4[].bankAccountId points at one.
    // Ids are opaque and permanent -- never the array index, the bank name
    // or the account number, so renaming an account cannot orphan its
    // disbursements.
    schB4Accounts:[],
    schC:[], schD1:[], schD2:[], schD3:[], schD4:[], schD5:[],
    schE:[], schF1:[], schF2:[],
    // Parts VI & VII – reconciliation. Line 20 (net assets computed from the
    // accounting) and Line 30 (net assets from the Schedule D listings) are
    // both derived, so there is nothing to store for them. What IS stored is
    // the guardian's written explanation when the two do not agree — the
    // court needs the discrepancy documented, and export requires it.
    reconcileExplanation:'',
    // Part VIII – Trusts (up to 3)
    trusts:[
      emptyRowAnnual('trust'),
      emptyRowAnnual('trust'),
      emptyRowAnnual('trust')
    ],
    // Part IX – Bond
    guardianRelationship:'Professional Guardian',
    // bondDepositoryState (Milestone 67B): which arrangement applies --
    // restricted depository only, bond and depository, bond only, or bond
    // waived by court order; '' is unanswered and is never coerced. It
    // replaced the 57A restrictedDepository tri-state (inferred on load, see
    // core/filing/bond-depository.js). None of the bond fields is required.
    bondDepositoryState:'',
    restrictedDepositoryReceiptDate:'', bondWaivedDate:'',
    bondAmount:'', bondPeriodFrom:'', bondPeriodTo:'', bondingCompany:'',
    // Part X – Cert of Service
    certDate:'', certIndicator:'',
    certAttySignDate:'',
    // Milestone 39-C
    certAttySignatureState:'', certAttySignatureImage:'',
    // Milestone 57B: filer attestation that no one requires service.
    // Tri-state, never coerced (section 4): '' is unanswered, and an
    // empty recipient list must never infer 'Yes'. Asked only when no
    // recipient is listed (D16), and reset to '' by every filing
    // conversion (D7) -- it is this filer's assertion about this filing.
    certNoRecipients:'',
    certRecipients:[{name:'',line2:'',line3:'',line4:''},{name:'',line2:'',line3:'',line4:''},{name:'',line2:'',line3:'',line4:''},{name:'',line2:'',line3:'',line4:''}],
    // Part XI – Remuneration.
    //
    // Milestone 58D: starts EMPTY, not with one blank placeholder row. The
    // "I verify there are no remuneration entries to report" declaration only
    // renders while this array is empty, so seeding a placeholder hid the one
    // control that answers Part XI -- the filer had to delete a meaningless
    // empty row to reach it. Per 744.367(3)(a) the declaration is required, so
    // it cannot be the hardest thing on the page to find.
    remuneration:[]
  };
}

// The Annual Accounting engine (Annual, Final and Trust alike)'s pages, in sidebar order -- what the router and the sidebar
// accept and list for it. Moved from legacy-app.js's routing section.
export const PAGES_ANNUAL=[
  {id:'/',        label:'Part I'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'Part II'},
  {id:'/p3',   label:'Part III'},
  {id:'/p4',   label:'Part IV'},
  {id:'/p5',   label:'Part V'},
  {id:'/scha', label:'Sch A'},
  {id:'/schb1',label:'Sch B1'},
  {id:'/schb2',label:'Sch B2'},
  {id:'/schb3',label:'Sch B3'},
  {id:'/schb4',label:'Sch B4'},
  {id:'/schc', label:'Sch C'},
  {id:'/schd1',label:'Sch D1'},
  {id:'/schd2',label:'Sch D2'},
  {id:'/schd3',label:'Sch D3'},
  {id:'/schd4',label:'Sch D4'},
  {id:'/schd5',label:'Sch D5'},
  {id:'/sche', label:'Sch E'},
  {id:'/schf1',label:'Sch F1'},
  {id:'/schf2',label:'Sch F2'},
  {id:'/p67',  label:'Parts VI & VII'},
  {id:'/p8',   label:'Part VIII'},
  {id:'/p9',   label:'Part IX'},
  {id:'/p10',  label:'Part X'},
  {id:'/p11',  label:'Part XI'},
  {id:'/print',label:'Print Preview'},
];
