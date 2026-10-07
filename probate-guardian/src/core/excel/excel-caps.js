// Milestone 73F part 1: how many rows each repeating list can carry into the
// court's workbook, per form -- moved unchanged from each feature's excel.js
// (which re-exports its own), so the shared export checks
// (src/core/validation/engines/) can report an Excel capacity problem the way
// Save as Excel does.
import { rowStarted } from '../validation/row-started.js';

// Each cap is the total row count across that schedule's template pages
// (e.g. A-1 spans 3 pages holding 4 + 8 + 8). Initial Inventory overflows
// differently from the other two types: its fillScheduleXX() helpers walk
// a fixed list of template pages, and once the slots run out pageIdx runs
// past the end of pages[], so `pages[pageIdx].name` throws. The export
// then dies in its catch block and prints the raw TypeError into a status
// line that clears itself after three seconds — no file, no usable
// explanation. This cap guard turns that into a clear, actionable message.
export const GUARDIAN_EXCEL_CAPS={
  scheduleA1:{cap:20,label:'Schedule A-1 — Real Estate',route:'/a1'},
  scheduleA2:{cap:24,label:'Schedule A-2 — Real Estate Liabilities',route:'/a2'},
  scheduleB1:{cap:36,label:'Schedule B-1 — Cash / Cash Equivalents',route:'/b1'},
  scheduleB2:{cap:39,label:'Schedule B-2 — Personal Property',route:'/b2'},
  scheduleB3:{cap:20,label:'Schedule B-3 — Intangible Assets',route:'/b3'},
  scheduleB4:{cap:33,label:'Schedule B-4 — Personal Property Liabilities',route:'/b4'},
  scheduleC1:{cap:23,label:'Schedule C-1 — Income',route:'/c1'},
  scheduleC2:{cap:13,label:'Schedule C-2 — Lawsuits Against Ward',route:'/c2'},
  scheduleC3:{cap:14,label:'Schedule C-3 — Lawsuits By Ward',route:'/c3'},
  scheduleC4:{cap:16,label:'Schedule C-4 — Trusts',route:'/c4'},
  // 23 = page 1's 7 slots + 8 each on pages 2 and 3, matching the form's own
  // pre-printed Line # 1-23. Was 15 until D10, because the page map stopped at
  // page 2 (see core/excel/guardian-inventory-pages.js).
  scheduleC5:{cap:23,label:'Schedule C-5 — Joint Owners',route:'/c5'},
};

export const ANNUAL_EXCEL_CAPS={
  schA:{cap:50,label:'Schedule A — Income',route:'/scha'}, // 20 on p1 + 30 on p2 (SCH A INCOME p2)
  schB1:{cap:24,label:'Schedule B-1 — Attorney Fees',route:'/schb1'},
  schB2:{cap:24,label:'Schedule B-2 — Guardian Fees',route:'/schb2'},
  schB3:{cap:24,label:'Schedule B-3 — Other Court-Ordered Disbursements',route:'/schb3'},
  // Backstop only. Schedule B-4's real limit is per bank account and is
  // decided by planSchB4Export(); 1382 is the workbook's total across all
  // twelve account blocks, so this catches only an absurd row count.
  schB4:{cap:1382,label:'Schedule B-4 — All Other Disbursements',route:'/schb4'},
  schC:{cap:6,label:'Schedule C — Capital Adjustments',route:'/schc'},
  schD1:{cap:11,label:'Schedule D-1 — Cash Assets',route:'/schd1'},
  schD2:{cap:8,label:'Schedule D-2 — Real Estate',route:'/schd2'},
  schD3:{cap:4,label:'Schedule D-3 — Personal Property',route:'/schd3'},
  schD4:{cap:9,label:'Schedule D-4 — Intangible Assets',route:'/schd4'},
  schD5:{cap:7,label:'Schedule D-5 — Mortgages / Loans / Liabilities',route:'/schd5'},
  schE:{cap:27,label:'Schedule E — Bank Transfers',route:'/sche'},
  schF1:{cap:8,label:'Schedule F-1 — Sales of Real Property',route:'/schf1'},
  schF2:{cap:11,label:'Schedule F-2 — Sales of Personal Property',route:'/schf2'},
  // Milestone 73T part 3 (decision 73T-2): one entry per line on PART XI's 27
  // lines (A6:A32), as the Simplified writes its PART VII. Milestone 58D had
  // made this cap 0, reading the sheet as having no entry area at all.
  remuneration:{cap:27,label:'Part XI — Remuneration',route:'/p11'},
  // Milestone 73T part 3 (row 8): PART X holds four recipients; a fifth used to
  // be left out of the workbook with no word. Counted as the export writes
  // them: the started ones, in order.
  certRecipients:{cap:4,label:'Part X — Certificate of Service recipients',route:'/p10',isPopulated:rowStarted},
};

export const SIMPLIFIED_EXCEL_CAPS={
  guardians:{cap:3,label:'Part IV - Guardians',route:'/p4',isPopulated:rowStarted},
  remuneration:{cap:27,label:'Part VII — Remuneration',route:'/p7'},
  // Milestone 73T part 4 (row 8): PARTS V, VI holds four recipients, counted as
  // the export writes them -- the started ones, in order.
  certRecipients:{cap:4,label:'Part VI — Certificate of Service recipients',route:'/p6',isPopulated:rowStarted},
};
