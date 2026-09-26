// Milestone 70, 70H: the user guide -- where it is, the section for each page,
// and opening it there. Moved from legacy-app.js's HELP SYSTEM.
import { monolith } from '../runtime/monolith.js';
import { getActiveInventoryType } from '../state.js';

// The standalone help page, deep-linked
// from the "?" button (in a filing) and the Help panel's "View User Guide"
// button (on the dashboard). Anchors below match the id attributes actually
// present in that file -- see its own h2/h3 headings. Guardian Inventory,
// Simplified Accounting and Annual/Final/Trust Accounting have per-schedule-
// group h3 anchors (the finest granularity the manual's own prose supports,
// since it's written per schedule group, not per exact page); the four Plan
// types have no h3 breakdown at all, so every one of their pages maps to the
// same h2 section -- there simply isn't finer content to jump to yet.
export const USER_GUIDE_URL='help/';

export const USER_GUIDE_ANCHORS={
  guardian:{
    '/':'inventory-cover', '/summary':'inventory-summary',
    '/a1':'inventory-a', '/a2':'inventory-a',
    '/b1':'inventory-b', '/b2':'inventory-b', '/b3':'inventory-b', '/b4':'inventory-b',
    '/c1':'inventory-c', '/c2':'inventory-c', '/c3':'inventory-c', '/c4':'inventory-c', '/c5':'inventory-c',
    '/d1':'inventory-d', '/d2':'inventory-d', '/d3':'inventory-d', '/d4':'inventory-d', '/d5':'inventory-d',
    '/print':'preview',
  },
  simplified:{
    '/':'simplified-accounting-p1', '/summary':'simplified-accounting-p2', '/p2':'simplified-accounting-p2',
    '/p3':'simplified-accounting-p3-7', '/p4':'simplified-accounting-p3-7', '/p5':'simplified-accounting-p3-7',
    '/p6':'simplified-accounting-p3-7', '/p7':'simplified-accounting-p3-7',
    '/print':'preview',
  },
  annual:{
    '/':'annual-accounting-p1', '/summary':'annual-accounting-p67', '/p2':'annual-accounting-p2',
    '/p3':'annual-accounting-p345', '/p4':'annual-accounting-p345', '/p5':'annual-accounting-p345',
    '/scha':'annual-accounting-schedules', '/schb1':'annual-accounting-schedules', '/schb2':'annual-accounting-schedules',
    '/schb3':'annual-accounting-schedules', '/schb4':'annual-accounting-schedules', '/schc':'annual-accounting-schedules',
    '/schd1':'annual-accounting-schedules', '/schd2':'annual-accounting-schedules', '/schd3':'annual-accounting-schedules',
    '/schd4':'annual-accounting-schedules', '/schd5':'annual-accounting-schedules', '/sche':'annual-accounting-schedules',
    '/schf1':'annual-accounting-schedules', '/schf2':'annual-accounting-schedules',
    '/p67':'annual-accounting-p67',
    '/p8':'annual-accounting-p8-11', '/p9':'annual-accounting-p8-11', '/p10':'annual-accounting-p8-11', '/p11':'annual-accounting-p8-11',
    '/print':'preview',
  },
  planSimplified:{default:'simplified-plan', '/print':'preview'},
  planAnnual:{default:'annual-plan', '/print':'preview'},
  planInitial:{default:'initial-plan', '/print':'preview'},
  planMinor:{default:'minor-plan', '/print':'preview'},
};

export function userGuideAnchorFor(inventoryType,route){
  let key=inventoryType;
  if(key==='finalAccounting'||key==='trustAccounting')key='annual';
  const map=USER_GUIDE_ANCHORS[key];
  if(!map)return null;
  return map[route]||map.default||null;
}

export function openUserGuide(anchor){
  const url=anchor?`${USER_GUIDE_URL}#${anchor}`:USER_GUIDE_URL;
  window.open(url,'_blank','noopener');
}

export function openUserGuideForCurrentPage(){
  const route=window.location.hash.replace('#','')||monolith.getCurrentPage()||'/';
  openUserGuide(userGuideAnchorFor(getActiveInventoryType(),route));
}
