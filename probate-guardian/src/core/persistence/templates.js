// Embedded official court Excel templates (.xlsx base64 strings).
import annualTemplate from '../../../templates/annual-template.js';
import simplifiedTemplate from '../../../templates/simplified-template.js';
import guardianTemplate from '../../../templates/guardian-template.js';
import { getTemplateCache, requestSave } from '../state.js';

const TEMPLATES = {
  annual: annualTemplate,
  simplified: simplifiedTemplate,
  guardian: guardianTemplate,
};

// The embedded workbook for a type, or null. (Until Milestone 70's 70K each
// template module put its workbook on window.EMBEDDED_TEMPLATES, exported it
// back from there, and this read it there as a fallback; each exports it
// directly now, and nothing is on window.)
export function embeddedTemplate(type) {
  return TEMPLATES[type] || null;
}

export { annualTemplate, simplifiedTemplate, guardianTemplate };

export async function saveTemplate(type,b64){
  getTemplateCache()[type]=b64;
  requestSave();
  return true;
}

export async function loadTemplate(type){
  return getTemplateCache()[type]||null;
}

export const TEMPLATE_FILES={
  simplified:'SimplifiedAccounting.xlsx',
  annual:'Annual Accounting 080123.xlsx',
  guardian:'a_InitialInventory (3).xlsx',
};

export function isValidXlsxB64(b64) {
  return typeof b64 === 'string' && (b64.startsWith('UEsDB') || b64.startsWith('UEsBA'));
}

export async function fetchAndCacheTemplate(type,filename){
  if(location.protocol==='file:')return null;
  try{
    console.log(`Fetching ${filename}...`);
    const resp=await fetch(filename);
    if(!resp.ok){console.warn(`Template fetch failed for ${type}, status:`,resp.status);return null;}
    const blob=await resp.blob();
    console.log(`Converting ${type} to base64...`);
    return await new Promise((resolve)=>{
      const reader=new FileReader();
      reader.onload=async(e)=>{
        try{
          const b64=/** @type {string} */ (e.target.result).split(',')[1];
          if(!isValidXlsxB64(b64)){
            console.warn(`Fetched template for ${type} is not a valid XLSX zip file. Skipping cache.`);
            resolve(null);
            return;
          }
          console.log(`Caching ${type} template...`);
          await saveTemplate(type,b64);
          console.log(`${type} template auto-loaded successfully`);
          resolve(b64);
        }catch(err){console.warn(`Failed to save ${type}:`,err);resolve(null);}
      };
      reader.onerror=()=>{console.warn(`FileReader error for ${type}`);resolve(null);};
      reader.readAsDataURL(blob);
    });
  }catch(e){console.warn(`Failed to auto-load ${type} template:`,e);return null;}
}

// Imported spreadsheets are parsed and discarded. Only bundled blank
// templates enter the in-memory template cache and subsequent .sav writes.
export async function ensureTemplate(type){
  const bundled=embeddedTemplate(type);
  if(bundled&&isValidXlsxB64(bundled))return bundled;

  const existing=await loadTemplate(type);
  if(existing&&isValidXlsxB64(existing))return existing;

  const fetched=await fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
  if(fetched&&isValidXlsxB64(fetched))return fetched;

  return (bundled&&typeof bundled==='string')?bundled:null;
}

export async function autoLoadTemplates(){
  if(location.protocol==='file:'){console.log('Skipping auto-load on file:// protocol');return;}
  for(const type of Object.keys(TEMPLATE_FILES)){
    console.log(`Checking for existing ${type} template...`);
    const existing=await loadTemplate(type);
    if(existing){console.log(`${type} template already exists`);continue;}
    if(embeddedTemplate(type)){
      // Bundled with the app — no fetch needed. ensureTemplate() will pick
      // it up and cache it on first export.
      console.log(`${type} template is bundled with the app`);
      continue;
    }
    await fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
  }
}
