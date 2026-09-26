// Milestone 70, 70F: which page a validation issue's section names -- the
// validation panel's jump links and the Inventory's completion marks use it.
// Moved from legacy-app.js's VALIDATION SUMMARY.
import { getActiveInventoryType } from '../state.js';

export const PLAN_SECTION_ROUTES = {
  planInitial: {
    'cover': '/',
    '2-3. setting & medical care': '/p2',
    'setting & medical care': '/p2',
    '4-5. mental health & personal care': '/p3',
    'mental health & personal care': '/p3',
    '6-7. socialization & benefits': '/p4',
    'socialization & benefits': '/p4',
    '9. examining providers': '/p5',
    'examining providers': '/p5',
    '10a. daily living': '/p6',
    '10a': '/p6',
    'daily living': '/p6',
    '10b-d. disabilities & devices': '/p7',
    '10b-d': '/p7',
    'disabilities & devices': '/p7',
    '11. advance directives': '/p8',
    'advance directives': '/p8',
    'signatures': '/p9',
    'attorney certification': '/p10',
  },
  planAnnual: {
    'cover': '/',
    '1. residences': '/p2',
    'residences': '/p2',
    '2-3. residence & care': '/p3',
    'residence & care': '/p3',
    '3g. insurance & benefits': '/p4',
    'insurance & benefits': '/p4',
    '4. medical treatment': '/p5',
    'medical treatment': '/p5',
    '5-7. skills & rights': '/p6',
    'skills & rights': '/p6',
    '8. daily living': '/p7',
    'daily living': '/p7',
    '9. disabilities & devices': '/p8',
    'disabilities & devices': '/p8',
    '10. advance directives': '/p9',
    'advance directives': '/p9',
    '11. remuneration': '/p10',
    'remuneration': '/p10',
    'signatures': '/p11',
  },
  planMinor: {
    'cover': '/',
    '2. prior residences': '/p2',
    'prior residences': '/p2',
    '3. treatment providers': '/p3',
    'treatment providers': '/p3',
    '4. medical services': '/p4',
    'medical services': '/p4',
    '5. education & social development': '/p5',
    'education & social development': '/p5',
    'guardian signatures': '/p6',
    'preparer & attorney': '/p7',
  },
  planSimplified: {
    'cover': '/',
    'the plan': '/p2',
    'plan': '/p2',
    'signatures': '/p3',
  },
};

export function errorRoute(section, filingType){
  const s=(section||'').trim();
  if(!s)return '/';
  if(/^Cover/i.test(s))return '/';
  const type = filingType || getActiveInventoryType();
  const norm = str => String(str||'').toLowerCase().replace(/[\u2013\u2014]/g, '-').replace(/\s+/g, ' ').trim();
  const sNorm = norm(s);

  if(type && PLAN_SECTION_ROUTES[type]){
    const hit = PLAN_SECTION_ROUTES[type][sNorm];
    if(hit) return hit;
    for(const [prefix, route] of Object.entries(PLAN_SECTION_ROUTES[type])){
      if(sNorm === prefix || sNorm.startsWith(prefix) || prefix.startsWith(sNorm)) return route;
    }
  }

  let m=s.match(/^Sch(?:edule)?\s*([A-Za-z])[-\s]?(\d*)/i);
  if(m)return '/sch'+m[1].toLowerCase()+(m[2]||'');
  m=s.match(/^([A-Za-z])-(\d+)/);
  if(m)return '/'+m[1].toLowerCase()+m[2];
  const R={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11};
  // Combined-part pages, e.g. Annual's "Parts VI & VII" -> /p67. Must be
  // tried before the single-part pattern, which would otherwise not match
  // at all ("Parts" breaks /^Part\s/).
  m=s.match(/^Parts?\s+([IVXLC]+)\s*(?:&|and)\s*([IVXLC]+)/i);
  if(m){
    const a=R[m[1].toUpperCase()],b=R[m[2].toUpperCase()];
    if(a&&b)return '/p'+a+b;
  }
  m=s.match(/^Part\s+([IVXLC]+)/i);
  if(m){
    const n=R[m[1].toUpperCase()];
    if(n)return n===1?'/':'/p'+n;
  }

  for(const planType of Object.keys(PLAN_SECTION_ROUTES)){
    const map = PLAN_SECTION_ROUTES[planType];
    const hit = map[sNorm];
    if(hit) return hit;
    for(const [prefix, route] of Object.entries(map)){
      if(sNorm === prefix || sNorm.startsWith(prefix) || prefix.startsWith(sNorm)) return route;
    }
  }

  return null;
}
