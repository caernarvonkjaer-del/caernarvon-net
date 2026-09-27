// Milestone 70, 70F: supporting documents attached to a schedule -- upload,
// removal, the per-period slot, the comment, and their validation for the
// PDF appendix. Moved from legacy-app.js's SCHEDULE SUPPORTING DOCUMENTS.
import { esc } from './escape-html.js';
import { formatDisplayDate } from '../form/date-parser.js';
import * as SupplementalPdf from '../pdf/supplemental-pdf.js';
import { renderPage } from '../navigation/router.js';
import { monolith } from '../runtime/monolith.js';
import { getActiveInventoryType, getD, requestSave } from '../state.js';
import { alertModal } from '../ui/dialogs.js';
import { ic } from '../ui/icons.js';

// Every schedule (across all three inventory types) can carry uploaded
// supporting documents and a free-text comment. Guardianships are re-filed
// annually, so uploads/comments are kept in a dict keyed by the ward's
// current accounting period (periodFrom/periodTo) rather than flattened
// onto the schedule itself — starting next year's accounting (by changing
// those dates on the Cover page) leaves last year's uploads/comments
// archived under the old period key and opens a fresh, empty slot for the
// new one. The one-time Initial Inventory has no period, so it uses a
// single constant key instead.
export const SCHEDULE_DOC_MAX_FILE_BYTES=15*1024*1024;

// The supplemental-PDF tools, imported. In legacy-app.js they were handed over
// on window by form-events.js, with a fallback, import('./src/core/pdf/...'),
// that a classic script resolves against the page but a module resolves
// against itself (Milestone 70, 70F; tests/unit/schedule-docs.spec.js).
export async function getSupplementalPdfTools(){
  return SupplementalPdf;
}

export function scheduleDocPeriodKey(){
  // Guardian wards have no periodFrom/periodTo, so each year is
  // distinguished by activeYearKey instead (falls back to 'initial' for
  // wards saved before multi-year support existed, preserving their
  // existing uploads under the same bucket they were already using).
  if(getActiveInventoryType()==='guardian')return (getD()&&getD().activeYearKey)||'initial';
  const from=(getD()&&getD().periodFrom)||'';
  const to=(getD()&&getD().periodTo)||'';
  return `${from}__${to}`;
}

export function getScheduleDocSlot(scheduleKey){
  const d=getD();
  if(!d)return {comment:'',files:[]};
  d.scheduleDocs=d.scheduleDocs||{};
  d.scheduleDocs[scheduleKey]=d.scheduleDocs[scheduleKey]||{};
  const period=scheduleDocPeriodKey();
  d.scheduleDocs[scheduleKey][period]=d.scheduleDocs[scheduleKey][period]||{comment:'',files:[]};
  return d.scheduleDocs[scheduleKey][period];
}

export function fmtFileSize(bytes){
  if(bytes==null)return '';
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';
  return (bytes/(1024*1024)).toFixed(1)+' MB';
}

export async function handleScheduleDocUpload(scheduleKey,fileList){
  const slot=getScheduleDocSlot(scheduleKey);
  const files=Array.from(fileList||[]);
  const rejected=[];
  const added=[];
  const tools=await getSupplementalPdfTools();
  const readers=files.map(f=>new Promise(resolve=>{
    if(!tools.isPdfLikeFile(f)){rejected.push(`${f.name} (PDF files only)`);resolve(null);return;}
    if(f.size>SCHEDULE_DOC_MAX_FILE_BYTES){rejected.push(`${f.name} (${tools.formatSupplementalPdfLimit()} limit)`);resolve(null);return;}
    const reader=new FileReader();
    reader.onload=async()=>{
      try{
        const dataUrl=String(reader.result||'');
        const bytes=tools.dataUrlToBytes(dataUrl);
        if(!tools.isPdfBytes(bytes)){rejected.push(`${f.name} (not a readable PDF)`);resolve(null);return;}
        const digest=await tools.digestBytes(bytes);
        resolve({
          id:tools.createSupplementalFileId(),
          name:f.name,
          type:'application/pdf',
          size:bytes.length||f.size,
          dataUrl:dataUrl.startsWith('data:application/pdf')?dataUrl:dataUrl.replace(/^data:[^;]+;/,'data:application/pdf;'),
          contentDigest:digest,
          uploadedAt:new Date().toISOString(),
          pageCount:0,
          validationAttempt:1,
          technicalStatus:'checking',
          technicalWarnings:[]
        });
      }catch(e){
        rejected.push(`${f.name} (${e.message||'could not read file'})`);
        resolve(null);
      }
    };
    reader.onerror=()=>{rejected.push(f.name);resolve(null);};
    reader.readAsDataURL(f);
  }));
  const results=await Promise.all(readers);
  results.filter(Boolean).forEach(r=>{slot.files.push(r);added.push(r);});
  if(rejected.length)await alertModal(`Some supporting documents were not attached: ${rejected.join(', ')}`);
  if(!added.length){renderPage(monolith.getCurrentPage());return;}
  requestSave();
  renderPage(monolith.getCurrentPage());

  for(const record of added){
    const currentSlot=getScheduleDocSlot(scheduleKey);
    const current=currentSlot.files.find(f=>f&&f.id===record.id);
    if(!current||current.contentDigest!==record.contentDigest||current.validationAttempt!==record.validationAttempt)continue;
    try{
      const validation=await tools.validateSupplementalPdfRecord(current);
      const latest=currentSlot.files.find(f=>f&&f.id===record.id);
      if(!latest||latest.contentDigest!==record.contentDigest||latest.validationAttempt!==record.validationAttempt)continue;
      Object.assign(latest,validation);
    }catch(e){
      const latest=currentSlot.files.find(f=>f&&f.id===record.id);
      if(latest&&latest.contentDigest===record.contentDigest&&latest.validationAttempt===record.validationAttempt){
        Object.assign(latest,{
          technicalStatus:'blocked',
          technicalWarnings:[e.message||'The PDF could not be checked.'],
          pageCount:0,
          corrupt:true
        });
      }
    }
    requestSave();
    renderPage(monolith.getCurrentPage());
  }
}

export function removeScheduleDoc(scheduleKey,idx){
  const slot=getScheduleDocSlot(scheduleKey);
  slot.files.splice(idx,1);
  requestSave();
  renderPage(monolith.getCurrentPage());
}

export async function prepareScheduleDocForValidation(file,tools){
  if(!file||!file.dataUrl)return false;
  const bytes=tools.dataUrlToBytes(file.dataUrl);
  if(!tools.isPdfBytes(bytes)){
    Object.assign(file,{
      technicalStatus:'blocked',
      technicalWarnings:['The selected file is not a readable PDF.'],
      pageCount:0,
      corrupt:true
    });
    return false;
  }
  const digest=await tools.digestBytes(bytes);
  let changed=false;
  if(!file.id){file.id=tools.createSupplementalFileId();changed=true;}
  if(file.type!=='application/pdf'){file.type='application/pdf';changed=true;}
  if(file.size!==bytes.length){file.size=bytes.length;changed=true;}
  if(!String(file.dataUrl).startsWith('data:application/pdf')){
    file.dataUrl=String(file.dataUrl).replace(/^data:[^;]+;/,'data:application/pdf;');
    changed=true;
  }
  if(file.contentDigest!==digest){
    file.contentDigest=digest;
    changed=true;
  }
  if(!file.validationAttempt)file.validationAttempt=0;
  if(!['checking','ready','warning','blocked'].includes(file.technicalStatus)){
    file.technicalStatus='checking';
    changed=true;
  }
  if(file.technicalStatus==='checking'){
    file.validationAttempt+=1;
    file.technicalWarnings=[];
    changed=true;
  }
  return changed;
}

export function queueScheduleDocValidation(scheduleKey,slot){
  (slot.files||[]).forEach(file=>{
    if(!file||file.__validationQueued)return;
    const needsValidation=file.technicalStatus==='checking'||!file.technicalStatus||!file.contentDigest||!file.id||!file.pageCount;
    if(!needsValidation)return;
    file.__validationQueued=true;
    setTimeout(async()=>{
      try{
        const tools=await getSupplementalPdfTools();
        const prepared=await prepareScheduleDocForValidation(file,tools);
        if(prepared){requestSave();renderPage(monolith.getCurrentPage());}
        if(file.technicalStatus==='blocked'){file.__validationQueued=false;return;}
        const attempt=file.validationAttempt||1;
        const digest=file.contentDigest;
        const validation=await tools.validateSupplementalPdfRecord(file);
        const currentSlot=getScheduleDocSlot(scheduleKey);
        const latest=currentSlot.files.find(f=>f&&f.id===file.id);
        if(!latest||latest.contentDigest!==digest||(latest.validationAttempt||1)!==attempt)return;
        Object.assign(latest,validation);
        latest.__validationQueued=false;
        requestSave();
        renderPage(monolith.getCurrentPage());
      }catch(e){
        file.__validationQueued=false;
      }
    },0);
  });
}

export function queueAllScheduleDocValidations(){
  const docs=getD()&&getD().scheduleDocs;
  if(!docs||typeof docs!=='object')return;
  const period=scheduleDocPeriodKey();
  Object.entries(docs).forEach(([scheduleKey,value])=>{
    if(!value||typeof value!=='object')return;
    const slot=Array.isArray(value.files)||value.comment
      ? value
      : value[period]||value.initial;
    if(slot&&Array.isArray(slot.files))queueScheduleDocValidation(scheduleKey,slot);
  });
}

export function updateScheduleComment(scheduleKey,value){
  getScheduleDocSlot(scheduleKey).comment=value;
  requestSave();
}

export function renderScheduleDocsSection(scheduleKey){
  const slot=getScheduleDocSlot(scheduleKey);
  queueScheduleDocValidation(scheduleKey,slot);
  const period=scheduleDocPeriodKey();
  const [pf,pt]=period.split('__');
  const fmtPf=pf?formatDisplayDate(pf)||pf:'';
  const fmtPt=pt?formatDisplayDate(pt)||pt:'';
  // Milestone 68H: a plan looks forward over a reporting period (744.367(1),
  // 744.3675); only the accountings report on an accounting period. The
  // dashboard already says "reporting period" for the Plans.
  const periodWord=String(getActiveInventoryType()||'').startsWith('plan')?'reporting period':'accounting period';
  const periodNote=getActiveInventoryType()==='guardian'?''
    :(fmtPf||fmtPt?` — ${periodWord} ${fmtPf||'?'} to ${fmtPt||'?'}`:` — set the ${periodWord} on the Cover page to file these by year`);
  const filesHtml=slot.files.length?slot.files.map((f,i)=>{
    const status=f.technicalStatus||'pending';
    const warnings=Array.isArray(f.technicalWarnings)?f.technicalWarnings:[];
    const statusLabel=status==='checking'?'Checking'
      :status==='ready'?'Ready'
      :status==='warning'?'Warning - review recommended'
      :status==='blocked'?'Blocked':'Pending review';
    const statusColor=status==='blocked'?'var(--danger-text)':status==='warning'?'var(--warn-text)':status==='ready'?'var(--ok-text)':'var(--ink-3)';
    return `
    <div class="sched-doc-row">
      <span class="sched-doc-name">${ic('file',14)} ${esc(f.name)}</span>
      <span class="sched-doc-meta">${fmtFileSize(f.size)}${f.pageCount?` - ${f.pageCount} page${f.pageCount===1?'':'s'}`:''}</span>
      <span class="sched-doc-meta" style="color:${statusColor};">${esc(statusLabel)}</span>
      ${warnings.length?`<span class="sched-doc-meta" style="color:var(--warn-text);">${esc(warnings.join(' '))}</span>`:''}
      <a href="${f.dataUrl}" download="${esc(f.name)}" class="btn btn-sm btn-outline-secondary">Download</a>
      <button type="button" class="btn btn-sm btn-outline-danger" aria-label="Remove supporting document ${esc(f.name)}" data-form-action="remove-schedule-doc" data-schedule-key="${esc(scheduleKey)}" data-document-index="${i}">×</button>
    </div>`;}).join(''):`<div class="sched-doc-empty">No supporting documents uploaded${getActiveInventoryType()==='guardian'?'':' for this period'}.</div>`;
  const inputId=`sched-doc-input-${scheduleKey}`;
  return `<div class="schedule-docs-section no-print">
    <h2>Supporting Documents${periodNote}</h2>
    <p class="schedule-docs-hint">Upload PDF supplemental documents only. Supplemental PDFs are inserted as uploaded; Guardian Forms does not certify or remediate uploaded documents for accessibility. Stored on this device only, encrypted with the rest of this ward's data.</p>
    <input type="file" id="${inputId}" multiple accept="application/pdf,.pdf" aria-label="Upload PDF supporting documents for ${esc(scheduleKey)}" class="d-none" data-form-change="schedule-doc-upload" data-schedule-key="${esc(scheduleKey)}">
    <button type="button" class="btn btn-outline-primary btn-sm mb-2" data-form-action="choose-schedule-docs" data-input-id="${esc(inputId)}">+ Upload PDF(s)</button>
    <div class="sched-doc-list">${filesHtml}</div>
    <h2 class="mt">Comments</h2>
    <textarea class="form-control" rows="3" aria-label="Comments about ${esc(scheduleKey)}" placeholder="Notes about this schedule…" data-form-input="schedule-comment" data-schedule-key="${esc(scheduleKey)}">${esc(slot.comment)}</textarea>
  </div>`;
}
