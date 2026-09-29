// Milestone 70, 70F: the Initial Inventory's binding engine -- its inputs'
// data-form-path writes (bindForms()), what each edit sets off (afterChange():
// the live totals, the sidebar marks and the save) and its computed fields.
// The other forms bind through src/form-events.js's delegated handler; this
// one serves only the Inventory, whose totals it imports. Moved from
// legacy-app.js's FORM BINDING ENGINE.
import { getFieldDraftDisplay } from '../../core/form/commit-coordinator.js';
import { filterCountyDropdown } from '../../core/form/county-autocomplete.js';
import { formatDisplayDate } from '../../core/form/date-parser.js';
import { applyZipLimit, displayDecimal, finalizeCaseNumber, formatAccountNumber, formatAddress, formatBarNumber, formatCaseNumber, formatCheckNumber, formatCityStateZip, formatName, formatPhone, formatSSN, parseStoredDecimal, runFieldWriteSideEffects, sanitizeDecimal, sanitizeNonNegativeDecimal, setPercentFeedback } from '../../core/form/form-contract.js';
import { percentProblem } from '../../core/validation/percent-range.js';
import { getPath, setPath } from '../../core/form/paths.js';
import { fmt } from '../../core/format/money.js';
import { getD } from '../../core/state.js';
import { calc } from './totals.js';

export function bindForms(){
  document.querySelectorAll('[data-bind]:not([data-bound])').forEach(el=>{
    el.setAttribute('data-bound','1');
    const path=el.dataset.bind;
    const cur=getPath(getD(),path);
    // Captured so a blur firing after a ward switch (see the caseNumber and
    // name/address blur listeners below) can tell its window.D has moved on
    // to a different ward entirely, not just been edited in place.
    const boundD=getD();

    if(el.type==='checkbox'){
      el.checked=!!cur;
      el.addEventListener('change',e=>{setPath(getD(),path,e.target.checked);afterChange(path);});
    } else if(el.type==='date'){
      if(cur){
        const s=typeof cur==='string'?cur:new Date(cur).toISOString();
        el.value=s.substring(0,10);
      }
      el.addEventListener('change',e=>{setPath(getD(),path,e.target.value||null);afterChange(path);});
    } else if(el.type==='number'){
      el.value=Math.max(0,parseFloat(cur)||0);
      el.addEventListener('keydown',e=>{if(e.key==='-'||e.key==='Subtract'){e.preventDefault();}});
      el.addEventListener('input',e=>{
        e.target.value=e.target.value.replace(/-/g,'');
        const v=Math.max(0,parseFloat(e.target.value)||0);
        setPath(getD(),path,v);afterChange(path);
      });
    } else if(el.tagName==='SELECT'){
      el.value=cur!=null?String(cur):'';
      el.addEventListener('change',e=>{
        let v=e.target.value;
        if(v==='true')v=true; else if(v==='false')v=false;
        setPath(getD(),path,v);afterChange(path);
      });
    } else {
      const inputType=el.dataset.inputType||'text';
      if(inputType==='date'||el.dataset.fieldKind==='date'){
        el.value=getFieldDraftDisplay(path,formatDisplayDate(cur||''))||formatDisplayDate(cur||'');
      }else if(inputType==='phone'){
        el.value=formatPhone(cur||'');
      }else if(inputType==='name'){
        el.value=formatName(cur||'');
      }else if(inputType==='address'){
        el.value=formatAddress(cur||'');
      }else if(inputType==='ssn'){
        el.value=formatSSN(cur||'');
      }else if(inputType==='caseNumber'){
        el.value=formatCaseNumber(cur||'');
      }else if(inputType==='barNumber'){
        el.value=formatBarNumber(cur||'');
      }else if(inputType==='accountNumber'){
        el.value=formatAccountNumber(cur||'');
      }else if(inputType==='checkNumber'){
        el.value=formatCheckNumber(cur||'');
      }else if(inputType==='zip'){
        el.value=formatCityStateZip(cur||'');
      }else if(inputType==='percent'){
        // Milestone 71C: a share draws what the model holds -- a real 0 stays
        // "0", a minus stays visible (displayDecimal()).
        el.value=displayDecimal(cur);
      }else if(inputType==='decimal'){
        el.value=sanitizeNonNegativeDecimal(cur||'');
      }else{
        el.value=cur||'';
      }
      el.addEventListener('input',e=>{
        if(el.dataset.fieldKind==='date'||inputType==='date'){
          // Date formatting is handled by form-events.js (writeDraftValue on input / finalizeFieldValue on blur).
          // Do not write raw unparsed text here to avoid non-canonical values in window.D.
          return;
        }
        let val=e.target.value;
        if(inputType==='percent'){
          // Milestone 71C: the Inventory's shares are written here, never by
          // form-contract.js (numInput() binds them with claimSharedWriteListener
          // false), so the percent kind is implemented here too: the minus is
          // kept and an empty box stores '' -- never the `|| 0` below, which
          // would record a cleared share as an entered 0%.
          val=sanitizeDecimal(val);
          e.target.value=val;
          setPath(getD(),path,parseStoredDecimal(val));
          afterChange(path);
          return;
        }
        if(inputType==='decimal'){
          val=sanitizeNonNegativeDecimal(val);
          e.target.value=val;
          setPath(getD(),path,parseFloat(val)||0);
          afterChange(path);
          return;
        }else if(inputType==='phone'){
          val=formatPhone(val);
          e.target.value=val;
        }else if(inputType==='ssn'){
          val=formatSSN(val);
          e.target.value=val;
        }else if(inputType==='caseNumber'){
          val=formatCaseNumber(val);
          e.target.value=val;
        }else if(inputType==='barNumber'){
          // Padding while a person is still typing would turn the first digit
          // into 0000000N and make the next digit land in the wrong place.
          // Keep only digits live; apply the fixed-width representation on blur.
          val=String(val??'').replace(/\D/g,'').slice(0,8);
          e.target.value=val;
        }else if(inputType==='accountNumber'){
          val=formatAccountNumber(val);
          e.target.value=val;
        }else if(inputType==='checkNumber'){
          val=formatCheckNumber(val);
          e.target.value=val;
        }else if(inputType==='zip'){
          // Digit-count limiting stays live (same as maxlength), but title
          // casing is finalize-only -- see the name/address blur listener
          // below for why: formatCityStateZip() has the same bare-2-letter-
          // word-reads-as-a-state-abbreviation defect as formatSafeTitleCase,
          // so typing "ph" toward "Philadelphia" would get force-uppercased
          // to "PH" before the city name is even finished.
          applyZipLimit(e.target);
          val=e.target.value;
        }else if(inputType==='county'){
          filterCountyDropdown(e.target);
        }
        // Prevent negative values in number inputs
        if(el.type==='number'){
          val=val.replace(/^-/,'');
          e.target.value=val;
        }
        setPath(getD(),path,val);afterChange(path);
      });
      // Case Number only fully resolves to YY-######-GD (padded sequence,
      // fixed GD suffix) on blur -- see finalizeCaseNumber()'s own comment
      // for why that can't happen on every keystroke like the other
      // inputType formatters above do.
      if(inputType==='caseNumber'){
        el.addEventListener('blur',()=>{
          // A ward switch (see switchWard()) reassigns window.D to a
          // different ward's object -- synchronously, well before that
          // ward's page actually finishes mounting -- so a blur that fires
          // late (mount is async; nothing here awaits it) can land after
          // window.D has already moved on. isConnected can't catch this: the
          // old page can still be sitting in the DOM at that moment. Compare
          // against the exact object this listener was bound to instead. The
          // raw value was already saved to the correct ward by the 'input'
          // listener above; skipping the format-only step below when the
          // ward has moved on costs nothing since re-mounting it re-binds
          // this field fresh from its own (already-correct) stored value.
          if(getD()!==boundD)return;
          el.value=finalizeCaseNumber(el.value);
          setPath(getD(),path,el.value);afterChange(path);
        });
      }
      if(inputType==='barNumber'){
        el.addEventListener('blur',()=>{
          if(getD()!==boundD)return;
          el.value=formatBarNumber(el.value);
          setPath(getD(),path,el.value);afterChange(path);
        });
      }
      // Milestone 71C: a share outside 0-100 is shown on the field as soon as
      // the filer leaves it (the validator reports it too), and again on
      // render so a reopened filing shows what is wrong.
      if(inputType==='percent'){
        setPercentFeedback(el,percentProblem(cur));
        el.addEventListener('blur',()=>{
          if(getD()!==boundD)return;
          setPercentFeedback(el,percentProblem(getPath(getD(),path)));
        });
      }
      // Name/address formatting is finalize-only, same reasoning as modal-events.js's
      // handleModalBlur: formatName()/formatAddress() title-case a complete value and
      // trim it, which reads a live "ga" mid-word as the state abbreviation "GA" and
      // eats a just-typed trailing space. Fields that also carry data-field-path
      // already get this once on blur from form-events.js's finalizeFieldValue; this
      // covers the few remaining data-bind-only fields (schedule description cells).
      if((inputType==='name'||inputType==='address')&&!el.dataset.fieldPath){
        el.addEventListener('blur',()=>{
          // See the caseNumber blur listener just above for why this checks
          // object identity rather than el.isConnected.
          if(getD()!==boundD)return;
          el.value=inputType==='name'?formatName(el.value):formatAddress(el.value);
          setPath(getD(),path,el.value);afterChange(path);
        });
      }
    }
  });
}

export function afterChange(path){
  // Guardian Inventory binds via bindForms()/data-bind rather than
  // data-form-path, so it never reaches form-contract.js's own write
  // functions; this is its single choke point and it calls the same shared
  // post-write tail the other eight filing types use (Milestone 42D:
  // county commit, Party write-through, autosave, nav dots, ward card, name
  // sync). Not optional-chained on purpose -- a missing bridge here would
  // silently stop autosaving, and should fail loudly instead.
  updateCalcFields();
  runFieldWriteSideEffects(path);
  // Update live summary displays
  const els={
    'totalA1':calc.totalA1(),'totalA2':calc.totalA2(),'netA':calc.netA(),
    'totalB1':calc.totalB1(),'totalB2':calc.totalB2(),'totalB3':calc.totalB3(),
    'totalB4':calc.totalB4(),'netB':calc.netB(),'totalInventory':calc.total(),
    'totalC1':calc.totalC1(),'totalC2':calc.totalC2(),'totalC3':calc.totalC3(),
    'totalC4':calc.totalC4(),'totalC5':calc.totalC5(),
    'restrictedCash':calc.restrictedCash(),'unrestrictedCash':calc.unrestrictedCash(),
    'restrictedIntang':calc.restrictedIntang(),'unrestrictedIntang':calc.unrestrictedIntang(),
    'bondRequired':calc.bondRequired(),'auditFee':calc.auditFee(),
  };
  for(const[id,val] of Object.entries(els)){
    const el=document.getElementById(id);
    if(el)el.textContent=fmt(val);
  }
  // Conditional SDB field
  const sdbContainer=document.getElementById('sdb-filed-row');
  if(sdbContainer)sdbContainer.style.display=(getD().hasSafeDepositBox==='Yes'||getD().hasSafeDepositBox===true)?'':'none';
  // The D-4 bond arrangement's reveals are re-rendered by their routed radio
  // (Milestone 67B, on 67F's mechanism); no live patch is needed here.
}

export function updateCalcFields(){
  // Update all readonly calculated fields in visible entry cards
  document.querySelectorAll('[data-calcbind]').forEach(el=>{
    const path=el.dataset.calcbind; // e.g. "scheduleA1.0.wardValue"
    const parts=path.split('.');
    const schedule=parts[0], idx=parseInt(parts[1]), field=parts[2];
    const entry=getD()[schedule]?.[idx];
    if(!entry)return;
    let val=0;
    if(field==='wardValue')val=calc.wardVal(entry);
    else if(field==='wardDebt')val=calc.wardDebt(entry);
    else if(field==='wardAmt')val=calc.wardAmt(entry);
    else if(field==='wardB2')val=calc.wardB2(entry);
    else if(field==='wardB3')val=calc.wardB3(entry);
    else if(field==='wardB4')val=calc.wardB4(entry);
    else if(field==='wardC1')val=calc.wardC1(entry);
    else if(field==='wardC2')val=calc.wardC2(entry);
    else if(field==='wardC3')val=calc.wardC3(entry);
    else if(field==='wardC4')val=calc.wardC4(entry);
    else if(field==='wardC5')val=calc.wardC5(entry);
    el.value=fmt(val);
  });
}
