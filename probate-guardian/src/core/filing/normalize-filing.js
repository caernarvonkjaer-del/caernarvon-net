// Milestone 70, 70C: the idempotent normalizer every filing passes through
// when it is loaded or activated (src/core/state.js's setD() runs it): it
// migrates older stored shapes -- legacy booleans to the 'Yes'/'No'/'' tri-state,
// the Part XI placeholder row, the retired amountInSDB copy -- and never
// deletes a value the filer entered. Moved from legacy-app.js, where setD()
// reached it through window. Running it twice gives the same filing as once
// (tests/unit/filing-registry.spec.js).
import { normalizeScheduleDocsAck } from './schedule-doc-ack.js';

export function normalizeWardData(d){
  if(!d||typeof d!=='object'||Object.keys(d).length===0)return d;
  // Milestone 57C-R: give every loaded ward a well-formed scheduleDocsAck.
  // A .sav written before 57C-R has none at all; an unexpected shape must not
  // read as "already acknowledged", since that would silently retire a prompt
  // the filer never saw.
  try{ normalizeScheduleDocsAck(d); }catch(e){}
  // Milestone 58D: reconcile Part XI's two ways of saying "nothing to report".
  //
  // A .sav written before 58D carries the seeded blank placeholder row, which
  // hides the no-items declaration behind deleting it. Normalising an array
  // whose rows are ALL blank to [] exposes that control without touching a
  // filing that has real entries. Nothing is ever deleted here: a row with any
  // content survives untouched.
  //
  // And if a stale `no items` flag sits beside real rows -- ticked, then rows
  // added later by another path -- the rows win and the flag is cleared. The
  // entered data is the stronger statement of intent, and leaving both set
  // would file a declaration contradicting the schedule printed beside it.
  try{
    if(Array.isArray(d.remuneration)){
      const populated=d.remuneration.filter(r=>r&&(r.guardian||r.type||r.amount||r.description));
      if(populated.length===0&&d.remuneration.length>0)d.remuneration=[];
      if(populated.length>0&&d.scheduleNoItems&&d.scheduleNoItems.remuneration)d.scheduleNoItems.remuneration=false;
    }
  }catch(e){}
  const migrateBoolean=(obj,field,legacyField=null)=>{
    if(!obj||typeof obj!=='object')return;
    const current=obj[field];
    if(current===true)obj[field]='Yes';
    else if(current===false)obj[field]='No';
    else if(current==null||current===''){
      if(legacyField&&obj[legacyField]===true)obj[field]='Yes';
      else if(legacyField&&obj[legacyField]===false)obj[field]='No';
      else obj[field]='';
    }
    if(legacyField)delete obj[legacyField];
  };
  (d.scheduleA1||[]).forEach(r=>{
    migrateBoolean(r,'residence','isPersonalResidence');
    migrateBoolean(r,'income','isIncomeProperty');
  });
  (d.scheduleB1||[]).forEach(r=>migrateBoolean(r,'restricted','isRestricted'));
  // Milestone 60K: a .sav written before 60K carries amountInSDB on B-2/B-3
  // rows -- a stored copy of a figure the workbook derives, always 0 from the
  // importer and never maintained by the UI. Drop it so nothing can ever read
  // a stale value; the PDF and totals derive it from inSafeDepositBox.
  (d.scheduleB2||[]).forEach(r=>{migrateBoolean(r,'inSafeDepositBox');if(r&&typeof r==='object')delete r.amountInSDB;});
  (d.scheduleB3||[]).forEach(r=>{
    migrateBoolean(r,'restricted','isRestricted');
    migrateBoolean(r,'inSafeDepositBox');
    if(r&&typeof r==='object')delete r.amountInSDB;
  });
  migrateBoolean(d,'hasSafeDepositBox');
  migrateBoolean(d,'safeDepositBoxFiled');
  migrateBoolean(d,'amendedForm','isAmended');
  if(d.benefits&&typeof d.benefits==='object'){
    Object.keys(d.benefits).forEach(k=>{
      const b=d.benefits[k];
      if(b&&typeof b==='object'){
        migrateBoolean(b,'eligible');
        migrateBoolean(b,'appliedFor');
      }
    });
  }
  const q7Keys=['q7SocialSecurity','q7Ssdi','q7Hmo','q7Ssi','q7StateSupplement','q7InstitutionalCare','q7SupplementalIns','q7Pension','q7Medicare','q7Medicaid','q7Va','q7Trusts','q7PendingBenefits'];
  q7Keys.forEach(k=>migrateBoolean(d,k));
  return d;
}
