// ═══════════════════════════════════════════════════════
// ICON SET
// Emoji were replaced with these because they render as a different
// picture on every OS, sit at inconsistent weights beside text, and read
// as informal in a document a court receives. These are one stroke
// weight, inherit currentColor, and align to the same 24px grid.
// Inlined as literal <svg> (never <use>) so they survive html2canvas,
// which is what rasterises the app for print preview.
// ═══════════════════════════════════════════════════════
const ICONS={
  home:'<path d="M3.2 10.6 12 3.6l8.8 7"/><path d="M5.7 9.3v11.1h12.6V9.3"/>',
  pencil:'<path d="M4 20h4.2L19.4 8.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8Z"/><path d="M14.5 5.9 18.1 9.5"/>',
  trash:'<path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/>',
  download:'<path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/>',
  upload:'<path d="M12 14.4V3.6"/><path d="m8.2 7.4 3.8-3.8 3.8 3.8"/><path d="M4.4 19.9h15.2"/>',
  lock:'<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.8"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
  unlock:'<rect x="4.6" y="10.4" width="14.8" height="9.6" rx="1.8"/><path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 6.9-2.2"/>',
  file:'<path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/>',
  chart:'<path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/>',
  trending:'<path d="m4.2 15.8 5-5 3 3 6.4-6.4"/><path d="M14.6 7.4h4.6V12"/>',
  printer:'<path d="M7.2 9.2V3.6h9.6v5.6"/><rect x="4" y="9.2" width="16" height="6.6" rx="1.6"/><path d="M7.2 14.6h9.6v5.8H7.2Z"/>',
  search:'<circle cx="10.8" cy="10.8" r="6.2"/><path d="m19.6 19.6-4.4-4.4"/>',
  swap:'<path d="M4.4 8.6h13.2"/><path d="m14.4 5.4 3.2 3.2-3.2 3.2"/><path d="M19.6 15.4H6.4"/><path d="m9.6 12.2-3.2 3.2 3.2 3.2"/>',
  folder:'<path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/>',
  folderOpen:'<path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/>',
  list:'<path d="M4.4 7h15.2M4.4 12h15.2M4.4 17h15.2"/>',
  grid:'<rect x="4.2" y="4.2" width="6.4" height="6.4" rx="1.2"/><rect x="13.4" y="4.2" width="6.4" height="6.4" rx="1.2"/><rect x="4.2" y="13.4" width="6.4" height="6.4" rx="1.2"/><rect x="13.4" y="13.4" width="6.4" height="6.4" rx="1.2"/>',
  archive:'<rect x="3.6" y="4.2" width="16.8" height="4.4" rx="1.2"/><path d="M5.4 8.6V19h13.2V8.6"/><path d="M10 12.4h4"/>',
  undo:'<path d="M4.4 9.4h10a5.2 5.2 0 1 1 0 10.4H7.6"/><path d="m8 5.4-3.6 4 3.6 4"/>',
  clipboard:'<path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/>',
  copy:'<rect x="8.6" y="8.6" width="11.4" height="11.4" rx="1.8"/><path d="M15.4 5.4H5.8a1.8 1.8 0 0 0-1.8 1.8v9.6"/>',
  receipt:'<path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/>',
  inbox:'<path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/>',
  alert:'<path d="M12 4.2 21 19.8H3Z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.4" r=".9" fill="currentColor" stroke="none"/>',
  external:'<path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/>',
  check:'<path d="m4.8 12.4 4.8 4.8L19.2 7.6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  shield:'<path d="M12 3.2 20 6v6.1c0 4.6-3.3 7.5-8 8.7-4.7-1.2-8-4.1-8-8.7V6Z"/>',
  sun:'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2.6M12 18.6v2.6M4.2 12H1.6M22.4 12h-2.6M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
  moon:'<path d="M20.2 14.3A8.3 8.3 0 0 1 9.7 3.8a8.3 8.3 0 1 0 10.5 10.5Z"/>',
};
function ic(n,size){
  return '<svg class="ic" width="'+(size||16)+'" height="'+(size||16)+'" viewBox="0 0 24 24" '
    +'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
    +'stroke-linejoin="round" aria-hidden="true" focusable="false">'+(ICONS[n]||'')+'</svg>';
}
// ═══════════════════════════════════════════════════════
// THEME (light / dark)
// The synchronous head script sets the OS preference before first paint.
// This block handles runtime changes and restores the saved .sav setting.
// Court-document and PDF styles remain hardcoded for light output.
// ═══════════════════════════════════════════════════════
function currentTheme(){
  return document.documentElement.getAttribute('data-theme')==='dark' ? 'dark' : 'light';
}
function applyTheme(theme,persist){
  document.documentElement.setAttribute('data-theme',theme);
  if(persist){
    saveAppState('theme',theme); // lands in the .sav file's appState section on the next write
  }
  const btn=document.getElementById('theme-toggle-btn');
  if(btn){
    const isDark=theme==='dark';
    btn.innerHTML=ic(isDark?'sun':'moon',16);
    btn.setAttribute('aria-pressed',String(isDark));
    btn.setAttribute('aria-label','Switch to '+(isDark?'light':'dark')+' theme');
  }
}
function toggleTheme(){
  applyTheme(currentTheme()==='dark' ? 'light' : 'dark', true);
}
// The pre-paint script in <head> already set data-theme on <html> before
// first render (so there's no flash of the wrong theme) — this just brings
// the toggle button's icon/aria state into agreement with that decision.
// The button is static markup, already in the DOM by the time this
// (inline, non-deferred) script runs.
applyTheme(currentTheme(),false);
// ═══════════════════════════════════════════════════════
// GLOBAL STATE & CONFIG
// ═══════════════════════════════════════════════════════
const INVENTORY_TYPES = {
  guardian: {
    name: 'Initial Inventory',
    label: 'Verified Initial Inventory',
    description: 'Initial inventory of assets as of Guardianship Inception Date'
  },
  simplified: {
    name: 'Simplified Annual Accounting',
    label: 'Simplified Annual Accounting',
    description: 'Simplified annual accounting for guardianship'
  },
  annual: {
    name: 'Annual Accounting',
    label: 'Annual Accounting',
    description: 'Full annual accounting with detailed schedules'
  },
  // Final and Trust accountings use the SAME form, schedules, totals and
  // validation as the Annual Accounting — they differ only in what the
  // filing is called on screen and on the finished document. See
  // ANNUAL_FORM_ALIASES / formEngine() below: every behavioural lookup
  // resolves these back to 'annual', so there is one implementation to
  // maintain rather than three copies that could drift apart.
  finalAccounting: {
    name: 'Final Accounting',
    label: 'Final Accounting',
    description: 'Closing accounting filed when the guardianship ends, using the full annual schedules'
  },
  trustAccounting: {
    name: 'Trust Accounting',
    label: 'Trust Accounting',
    description: 'Accounting for a trust, using the full annual schedules'
  },
  // Plans report on the ward's PERSON (where they live, their care, their
  // rights) — a separate court filing from the Inventory/Accountings above,
  // which report on their PROPERTY. A guardian of both person and property
  // files one of each.
  planSimplified: {
    name: 'Simplified Annual Plan',
    label: 'Simplified Annual Plan',
    description: "Short annual report on the ward's residence, care, and wellbeing"
  },
  planAnnual: {
    name: 'Annual Guardianship Plan',
    label: 'Annual Guardianship Plan',
    description: "Full annual report on the ward's residence, care, rights, and abilities"
  },
  planInitial: {
    name: 'Initial Guardianship Plan',
    label: 'Initial Guardianship Plan',
    description: "The first plan filed after Letters of Guardianship are signed, due within 60 days"
  },
  planMinor: {
    name: 'Annual Plan — Minors',
    label: 'Annual Plan — Minors',
    description: "Annual report for a minor ward, covering residence, care, education, and social development"
  }
};

// Ward types that are the Annual Accounting form under a different filing
// name. Kept as their own inventoryType so the dashboard, the ward picker
// and the finished document all say the right thing, but resolved through
// formEngine() wherever behaviour is chosen — pages, nav, empty data,
// totals, validation, export — so they cannot drift from Annual.
const ANNUAL_FORM_ALIASES = ['finalAccounting','trustAccounting'];

// Cells on the court template's "PART VI, VII " sheet for the two
// reconciliation totals and the explanation of any difference between them.
// DELIBERATELY null until confirmed against the official workbook: writing a
// total into the wrong cell of a filed accounting is worse than not writing
// it, so the export skips any address left null. Fill these in once the
// template is on hand (only the addresses change; no other code does).
const ANNUAL_P67_CELLS = {
  line20: null,      // e.g. 'I20' — net assets computed from the accounting
  line30: null,      // e.g. 'I30' — net assets from the Schedule D listings
  explanation: null  // cell for the written explanation of a difference
};

// Maps a ward's inventoryType to the form engine that drives it. Use this
// for behaviour; use the raw inventoryType for naming/identity.
function formEngine(type){
  return ANNUAL_FORM_ALIASES.includes(type) ? 'annual' : type;
}

// The filing's display name, e.g. "Final Accounting" — used in headings and
// on the exported document so an alias never shows as "Annual Accounting".
function formDisplayName(type){
  return (INVENTORY_TYPES[type] && INVENTORY_TYPES[type].name) || 'Accounting';
}

// Guardian-level data structure
let guardianData = {
  guardianName: '',
  guardianEmail: '',
  wards: [],
  activeWardId: null
};

// ═══════════════════════════════════════════════════════
// HELP SYSTEM
// ═══════════════════════════════════════════════════════
let helpPanelOpen = false;
let currentHelpContext = 'dashboard';

const HELP_CONTENT = {
  'default': {
    title: 'Welcome to Probate Guardian',
    content: `<p><strong>Probate Guardian</strong> helps you prepare court-required guardianship documents for Florida probate court.</p>
    <div class="help-section-title">Getting Started</div>
    <p>1. Create a new form using the <strong>+ New Form</strong> button</p>
    <p>2. Choose your inventory type (Initial, Simplified, or Annual)</p>
    <p>3. Fill out each section using the sidebar navigation</p>
    <p>4. Look for the <strong>green checkmarks</strong> — they indicate completed sections</p>
    <p>5. Export to PDF or Excel when ready to file</p>
    <div class="help-section-title">Along the Way</div>
    <p><strong>Filing progress:</strong> The bar near the top of the sidebar tracks how much of the current ward's filing is complete, with a "Jump to…" link straight to the next incomplete section.</p>
    <p><strong>Light &amp; dark mode:</strong> Use the sun/moon button in the sidebar to switch appearance. It's remembered per device.</p>
    <p><strong>Activity Log:</strong> Every unlock and backup on this device is recorded — open it from the link at the bottom of this help panel.</p>`
  },
  'inventory-select': {
    title: 'Choose Inventory Type',
    content: `<div class="help-section-title">Three Types of Inventory</div>
    <h4><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/></svg> Initial Inventory</h4>
    <p>Filed at the start of guardianship. Lists all assets as of the "Guardianship Inception Date".</p>
    <h4><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/></svg> Simplified Annual Accounting</h4>
    <p>For cases where estate property is held in a <strong>designated depository</strong> and transactions are limited to interest, settlement deposits, and service charges. Much simpler than full accounting.</p>
    <h4><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Annual Accounting (Full)</h4>
    <p>Complete annual accounting showing all income, expenses, assets, and liabilities. Required when simplified criteria aren't met.</p>`
  },
  'guardian-inventory': {
    title: 'Initial Inventory Guide',
    content: `<div class="help-section-title">What is an Initial Inventory?</div>
    <p>A detailed list of all the ward's assets at the time guardianship began. Includes real estate, personal property, cash, bank accounts, and liabilities.</p>
    <div class="help-section-title">Completing Each Section</div>
    <h4>Schedule A: Real Estate</h4>
    <p>List all properties the ward owns, including value and description.</p>
    <h4>Schedule B: Personal Property</h4>
    <p>Cash, cars, jewelry, equipment, investments, and other items not real estate.</p>
    <h4>Schedule C: Other Information</h4>
    <p>Income sources, lawsuits, trusts, and other assets.</p>
    <h4>Schedule D: Guardian Info</h4>
    <p>Your information, preparer details, and court filing information.</p>
    <div class="help-section-title">Completion Indicator</div>
    <p>A <strong>green checkmark</strong> appears next to a schedule when all required fields are filled. A <strong>red warning</strong> means you started entering data but didn't finish.</p>
    <p>The <strong>filing progress bar</strong> in the sidebar tracks all of this for you, with a "Jump to…" link to the next incomplete section.</p>`
  },
  'simplified-accounting': {
    title: 'Simplified Accounting Guide',
    content: `<div class="help-section-title">Eligibility Requirements</div>
    <p>Simplified accounting is only available when:</p>
    <ul>
    <li><strong>All</strong> estate property is in a designated depository (bank or financial institution)</li>
    <li><strong>Only</strong> these transactions occur: interest, settlement deposits, and service charges</li>
    </ul>
    <div class="help-section-title">Key Fields</div>
    <h4>Starting Balance</h4>
    <p>The account balance at the start of the accounting period.</p>
    <h4>Income</h4>
    <p>Interest earned and settlement deposits received.</p>
    <h4>Disbursements</h4>
    <p>Service charges and federal income taxes paid.</p>
    <div class="help-section-title">Key Term: Depository</div>
    <p>A bank or financial institution that holds the ward's money. The ward's account must be in the depository's name with the guardian listed as account holder.</p>
    <p>The <strong>filing progress bar</strong> in the sidebar tracks completion for you, with a "Jump to…" link to the next incomplete section.</p>`
  },
  'annual-accounting': {
    title: 'Annual Accounting Guide',
    content: `<div class="help-section-title">What is Annual Accounting?</div>
    <p>A complete financial report for the guardianship showing beginning balances, all income and expenses, asset values, and ending balances for the accounting period.</p>
    <div class="help-section-title">Schedules</div>
    <ul>
    <li><strong>Schedule A:</strong> Income (salary, interest, etc.)</li>
    <li><strong>Schedule B:</strong> Disbursements (expenses)</li>
    <li><strong>Schedule C:</strong> Gains/Losses from sales</li>
    <li><strong>Schedule D:</strong> Assets listed by type</li>
    <li><strong>Schedule E:</strong> Transfers in/out</li>
    <li><strong>Schedule F:</strong> Sale details</li>
    </ul>
    <div class="help-section-title">Important Notes</div>
    <p>All values should be rounded to nearest dollar. Beginning balance must equal prior year ending balance.</p>
    <p>The <strong>filing progress bar</strong> in the sidebar tracks completion for you, with a "Jump to…" link to the next incomplete section. Parts VI &amp; VII also check that your accounting's net assets reconcile with your Schedule D listings before you can export.</p>`
  },
  'plan-simplified': {
    title: 'Simplified Annual Plan Guide',
    content: `<div class="help-section-title">Plan vs. Accounting</div>
    <p>A <strong>Plan</strong> reports on the ward as a person — where they live, the care they receive, how they are doing. An <strong>Accounting</strong> reports on their money and property. These are two separate court filings.</p>
    <p>If you are guardian of both the person and the property, you file one of each. Create a separate form for each filing and give both the same case number — the dashboard will group them together.</p>
    <div class="help-section-title">What This Form Covers</div>
    <p>Nine questions about the past year: where the ward lived and why that placement suits them, the medical and mental-health treatment they received, their current diagnosis, the social activities provided, how they interact with others, whether any rights should be restored, any advance directives executed, and any payment you received for caring for them.</p>
    <div class="help-section-title">Answering the Questions</div>
    <p>Write plainly and specifically. "Saw Dr. Alvarez for a check-up in March and a follow-up in September" is far more useful to the court than "routine care."</p>
    <div class="help-section-title">Before You File</div>
    <p>Print Preview includes a <strong>readiness check</strong> that mirrors what the Clerk of Court looks for when reviewing a plan — plus reminders for the steps the app can't verify, like serving copies on interested persons.</p>
    <p>Export as PDF when you're done. This form has no Excel version.</p>`
  },
  'plan-annual': {
    title: 'Annual Guardianship Plan Guide',
    content: `<div class="help-section-title">Plan vs. Accounting</div>
    <p>A <strong>Plan</strong> reports on the ward as a person — where they live, the care they receive, their abilities and rights. An <strong>Accounting</strong> reports on their money and property. These are two separate court filings.</p>
    <p>If you are guardian of both the person and the property, you file one of each. Create a separate form for each and give both the same case number — the dashboard will group them together.</p>
    <div class="help-section-title">Filed With the Physician's Report</div>
    <p>This plan is only half of the Annual Report of the Guardian of the Person. A physician who examined the ward no more than 90 days before the reporting period began must file a separate report at the same time. <strong>The app does not produce that report</strong> — you obtain it from the physician.</p>
    <div class="help-section-title">When It's Due</div>
    <p>Within 90 days after the last day of the anniversary month in which the Letters of Guardianship were signed (F.S. 744.367).</p>
    <div class="help-section-title">Rights and Restoration</div>
    <p>Question 6 asks whether the ward could now have removed rights restored. If you mark a right as capable of restoration — and the physician's report agrees — you must file a <strong>separate petition to restore that right</strong>. This plan alone does not restore anything.</p>
    <div class="help-section-title">Activities of Daily Living</div>
    <p>Rate all sixteen honestly, including the ones that haven't changed. The court compares these year over year to see whether the ward's independence is improving or declining.</p>
    <div class="help-section-title">Before You File</div>
    <p>Print Preview includes a <strong>readiness check</strong> mirroring what the Clerk of Court looks for, plus reminders for steps the app can't verify. Export as PDF when done; this form has no Excel version.</p>`
  },
  'plan-initial': {
    title: 'Initial Guardianship Plan Guide',
    content: `<div class="help-section-title">Plan vs. Accounting</div>
    <p>A <strong>Plan</strong> reports on the ward as a person — where they live, the care they receive, their abilities. An <strong>Accounting</strong> reports on their money and property. These are two separate court filings.</p>
    <p>If you are guardian of both the person and the property, you file one of each. Create a separate form for each and give both the same case number — the dashboard will group them together.</p>
    <div class="help-section-title">When It's Due</div>
    <p>Within <strong>60 days</strong> after the Letters of Guardianship are signed (F.S. 744.632) — this is a shorter deadline than the Annual Plan's 90 days. This is the very first person-side filing after a guardianship of the person is established, and it remains in effect until it's amended or replaced by an Annual Guardianship Plan.</p>
    <div class="help-section-title">Don't Forget the Disaster Plan</div>
    <p>Per Administrative Order 2019-005, a separate <strong>Disaster Plan</strong> must be filed alongside every initial guardianship plan, covering how the ward's needs will be met if the guardian or ward must relocate in an emergency. <strong>The app does not produce that document</strong> — you file it separately.</p>
    <div class="help-section-title">Activities of Daily Living</div>
    <p>Rate all fifteen honestly. These become the baseline the court compares future Annual Plans against.</p>
    <div class="help-section-title">Advance Directives</div>
    <p>Either confirm there are none — and describe the steps you took to verify that (searching the ward's residence, checking their safe deposit box, etc.) — or record each one the ward executed, including whether a court has suspended or revoked it.</p>
    <div class="help-section-title">Before You File</div>
    <p>Print Preview includes a <strong>readiness check</strong> mirroring what the Clerk of Court looks for, plus reminders for steps the app can't verify. Export as PDF when done; this form has no Excel version.</p>`
  },
  'plan-minor': {
    title: 'Annual Plan — Minors Guide',
    content: `<div class="help-section-title">Plan vs. Accounting</div>
    <p>A <strong>Plan</strong> reports on the minor as a person — where they live, the care they receive, their education and social development. An <strong>Accounting</strong> reports on their money and property. These are two separate court filings.</p>
    <p>If you are guardian of both the person and the property, you file one of each. Create a separate form for each and give both the same case number — the dashboard will group them together.</p>
    <div class="help-section-title">Why This Form Is Different</div>
    <p>This is the Annual Guardianship Plan used specifically for a <strong>minor</strong> ward. It has no rights-restoration table and no activities-of-daily-living ratings — instead it focuses on the minor's residence, medical/mental-health care, and — uniquely — their <strong>education and social development</strong>.</p>
    <div class="help-section-title">The Preparer Certification</div>
    <p>Unlike the other Plans, this form has a separate <strong>Preparer certification</strong> block in addition to the guardian and attorney certifications — fill it in with whoever actually prepared the filing (which may or may not be the guardian).</p>
    <div class="help-section-title">Before You File</div>
    <p>Print Preview includes a <strong>readiness check</strong> — a general filing checklist, since this form's official Clerk's Review checklist was not available to build the check against. Export as PDF when done; this form has no Excel version.</p>`
  },
  'cover': {
    title: 'Cover & Summary Page',
    content: `<div class="help-section-title">Ward Information</div>
    <p>Basic information about the ward (the person for whom you are guardian) and the guardianship case.</p>
    <h4>Key Fields:</h4>
    <ul>
    <li><strong>Ward Name:</strong> Full legal name</li>
    <li><strong>Case Number:</strong> From the court order appointing you guardian</li>
    <li><strong>Guardianship Inception Date:</strong> When the guardianship was established</li>
    <li><strong>County:</strong> Where the court case is filed</li>
    </ul>
    <div class="help-section-title">Summary Section</div>
    <p>A preview of your accounting totals. Review to ensure amounts are correct before filing.</p>`
  },
  'field-help': {
    title: 'Common Field Definitions',
    content: `<div class="help-section-title">Ward's %</div>
    <p>The percentage of an asset that belongs to the ward. For example, if the ward owns 50% of a property, enter 50.</p>
    <div class="help-section-title">Restricted Assets</div>
    <p>Assets that cannot be used without court permission (e.g., real estate that must be sold through court process).</p>
    <div class="help-section-title">Carrying Value</div>
    <p>The depreciated value of an asset for accounting purposes (not necessarily the market value).</p>
    <div class="help-section-title">Personal Residence</div>
    <p>The primary home where the ward lives. Required to mark for asset classification.</p>
    <div class="help-section-title">SSN / EIN</div>
    <p><strong>SSN:</strong> Social Security Number (for individuals). <strong>EIN:</strong> Employer Identification Number (for businesses/trusts).</p>`
  },
  'saving': {
    title: 'Backup & Saving',
    content: `<div class="help-section-title">How Saving Works</div>
    <p>Your data is saved automatically to this device as you type. You can see the save status in the sidebar.</p>
    <div class="help-section-title">Creating a Backup</div>
    <p>Use the <strong>Save Data File (.sav)</strong> button to download an encrypted backup. Store this file safely—it's your safeguard if your device is lost or damaged.</p>
    <div class="help-section-title">Auto-Save</div>
    <p>Adjust the Auto-Save interval (5 min, 10 min, 30 min, or Off) to control how often backups are created.</p>
    <div class="help-section-title">Restoring from Backup</div>
    <p>Use <strong>Open Data File (.sav)</strong> to restore from a backup file you previously saved.</p>
    <div class="help-section-title">Activity Log</div>
    <p>Every unlock and backup made on this device is recorded in the Activity Log, linked at the bottom of this help panel — useful for confirming a backup actually ran.</p>`
  }
};

function toggleHelpPanel(){
  helpPanelOpen=!helpPanelOpen;
  const panel=document.getElementById('help-panel');
  const btn=document.getElementById('help-toggle-btn');
  panel.style.display=helpPanelOpen?'flex':'none';
  if(btn)btn.setAttribute('aria-expanded',String(helpPanelOpen));
  if(helpPanelOpen){
    updateHelpContext();
    showContextualHelp();
    // Move focus into the panel so a keyboard/screen-reader user lands
    // somewhere meaningful, not stranded on a now off-screen-adjacent button.
    const closeBtn=document.querySelector('.help-panel-close');
    if(closeBtn)closeBtn.focus();
  }else if(btn){
    // Closing (via the close button, Escape, or toggling the "?" again)
    // returns focus to the control that opened it, so keyboard users don't
    // lose their place in the page.
    btn.focus();
  }
}
// Escape closes the help panel from anywhere inside it, and returns focus
// to the toggle button — the standard behavior for a disclosure panel.
document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'&&helpPanelOpen&&document.getElementById('help-panel')?.contains(document.activeElement)){
    toggleHelpPanel();
  }
});

function showContextualHelp(){
  const content=HELP_CONTENT[currentHelpContext]||HELP_CONTENT['default'];
  const panel=document.getElementById('help-panel-content');
  panel.innerHTML=`<h3>${content.title}</h3>${content.content}`;
  panel.scrollTop=0;
}

function updateHelpContext(){
  // Auto-detect the correct help context based on current state
  if(!guardianData.activeWardId){
    // At dashboard or no ward yet
    currentHelpContext='default';
  }else if(activeInventoryType==='guardian'){
    currentHelpContext='guardian-inventory';
  }else if(activeInventoryType==='simplified'){
    currentHelpContext='simplified-accounting';
  }else if(formEngine(activeInventoryType)==='annual'){
    currentHelpContext='annual-accounting';
  }else if(activeInventoryType==='planSimplified'){
    currentHelpContext='plan-simplified';
  }else if(activeInventoryType==='planAnnual'){
    currentHelpContext='plan-annual';
  }else if(activeInventoryType==='planInitial'){
    currentHelpContext='plan-initial';
  }else if(activeInventoryType==='planMinor'){
    currentHelpContext='plan-minor';
  }else{
    currentHelpContext='default';
  }
  if(helpPanelOpen)showContextualHelp();
}

// ═══════════════════════════════════════════════════════
// TOOLTIP SYSTEM
// ═══════════════════════════════════════════════════════
const TOOLTIPS = {
  'ward_percent': "The percentage of this asset that belongs to the ward. For example, if the ward owns 50% of a property, enter 50.",
  'restricted': "Assets that cannot be used without court permission, such as real estate that must be sold through a court approval process.",
  'carrying_value': "The depreciated value of an asset for accounting purposes. This may differ from current market value.",
  'personal_residence': "The primary home where the ward currently lives. This is reported separately from investment properties.",
  'income_property': "A property that generates rental income or other returns. Mark this if the property is held for income purposes.",
  'depository': "A bank or financial institution where the ward's money is held. For simplified accounting, ALL estate property must be in a designated depository.",
  'ssn_ein': "SSN: Social Security Number (for individuals). EIN: Employer Identification Number (for businesses, trusts, or entities).",
  'signature_date': "The date this document was signed. Must be within the accounting period or filing timeframe.",
  'inception_date': "The date when the guardianship was officially established by court order.",
  'ward_pct': "The percentage of this asset that belongs to the ward. Enter 0-100.",
  'case_number': "The case number from the court order appointing you as guardian. Found on the letters of guardianship.",
  'full_amount': "The total value of this asset before accounting for the ward's percentage.",
  'full_debt': "The total amount owed on this liability.",
  'full_value': "The current market value of this property.",
  'annualized_income': "If income is not for the full year, annualize it. For example, 6 months of $100/month = $200 annualized."
};

function tooltip(key){
  const text=TOOLTIPS[key]||'';
  if(!text)return '';
  return `<span class="tooltip-icon" title="${esc(text)}">?<div class="tooltip-popup">${esc(text)}</div></span>`;
}

// ═══════════════════════════════════════════════════════
// WALKTHROUGH SYSTEM (Phase 4) - Type-Specific Tours
// ═══════════════════════════════════════════════════════
const WALKTHROUGH_GUARDIAN=[
  {element:'#help-toggle-btn',title:'1. Help Button',text:'Click the "?" button anytime for in-app help, tips, a downloadable user guide, and an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Your Active Ward',text:'This dropdown shows your current ward. You can switch between multiple guardianship cases here, and each one saves independently.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Light & Dark Mode',text:'Switch between light and dark appearance here. Your choice is remembered, and the app opens in light mode until you choose otherwise.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Tracks how many sections of this ward\'s filing are complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next incomplete section.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover Page',text:'Start here. This is where you enter basic case information: Ward name, Case Number, Guardianship Inception Date, County, and Guardian details. The Summary page next to it totals every schedule once you\'ve filled them in.',position:'bottom'},
  {element:'[data-nav="a1"]',title:'6. Schedule A-1: Real Estate Assets',text:'List all real estate owned by or with the ward\'s interest. Include properties, residences, and land. Enter the ward\'s percentage ownership.',position:'right'},
  {element:'[data-nav="a2"]',title:'7. Schedule A-2: Real Estate Liabilities',text:'List mortgages, liens, and debts against real estate. The app calculates net real estate value automatically.',position:'right'},
  {element:'[data-nav="b1"]',title:'8. Schedule B-1: Cash Assets',text:'List all bank accounts, savings, checking, CDs, money market accounts. Include each account separately with the ward\'s percentage. If several accounts are nearly identical, use the "Duplicate" button on an entry instead of re-typing it.',position:'right'},
  {element:'[data-nav="b2"]',title:'9. Schedule B-2: Personal Property',text:'Vehicles, jewelry, furniture, art, collections. Everything of value that isn\'t real estate or cash. Provide carrying value (depreciated worth).',position:'right'},
  {element:'[data-nav="b3"]',title:'10. Schedule B-3: Intangible Assets',text:'Stocks, bonds, mutual funds, business interests, patents, copyrights. List each security or intangible asset with current value.',position:'right'},
  {element:'[data-nav="b4"]',title:'11. Schedule B-4: Personal Property Liabilities',text:'Debts against personal property: car loans, credit card debt, personal loans. These reduce your total asset value.',position:'right'},
  {element:'[data-nav="c1"]',title:'12. Schedule C-1: Income',text:'Annual income to the ward: interest, dividends, rental income, Social Security. Enter annualized amounts.',position:'right'},
  {element:'[data-nav="c2"]',title:'13. Schedule C-2: Lawsuits Against Ward',text:'Any pending lawsuits where the ward is being sued. Include case number and claimed damages.',position:'right'},
  {element:'[data-nav="c3"]',title:'14. Schedule C-3: Lawsuits by Ward',text:'Any lawsuits where the ward is suing someone else. Include case number and claimed recovery amount.',position:'right'},
  {element:'[data-nav="c4"]',title:'15. Schedule C-4: Trusts',text:'Any trusts where the ward is a beneficiary. List trustee, trust property, and the ward\'s interest percentage.',position:'right'},
  {element:'[data-nav="c5"]',title:'16. Schedule C-5: Joint Owners',text:'Properties or accounts owned jointly with others. List the co-owner and the ward\'s percentage of the total.',position:'right'},
  {element:'[data-nav="d1"]',title:'17. Part III: Guardian Attestation',text:'Guardian signs and dates here under oath that the inventory is true and complete. One guardian must sign.',position:'bottom'},
  {element:'[data-nav="d2"]',title:'18. Part IV: Preparer Information',text:'If someone else prepared this form (paralegal, accountant), their contact info and signature goes here.',position:'bottom'},
  {element:'[data-nav="d3"]',title:'19. Part V: Attorney & Audit Fee',text:'Your attorney signs and dates here. Audit fee is calculated based on total estate value per state law.',position:'bottom'},
  {element:'[data-nav="d4"]',title:'20. Part VI: Bond & Surety Info',text:'Information about your guardianship bond. This section may not apply to all guardianships.',position:'bottom'},
  {element:'[data-nav="d5"]',title:'21. Part VII: Certificate of Service',text:'Proof that you served copies of the inventory on required parties: attorney, beneficiaries, etc.',position:'bottom'},
  {element:'[data-page="/print"]',title:'22. Print Preview & Export',text:'When complete, click here to review your entire form and export as PDF (best for courts) or Excel for filing. Anything still missing is listed here, grouped by section, with a link straight to it.',position:'left'},
];

const WALKTHROUGH_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Help Resources',text:'Stuck? Click "?" anytime for explanations, tips, downloadable guides designed specifically for Simplified Accounting, and an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Your Ward',text:'Switch between wards here. Each guardianship case is tracked separately, with its own income/expense summary.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Light & Dark Mode',text:'Switch between light and dark appearance here. Your choice is remembered, and the app opens in light mode until you choose otherwise.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Tracks how many sections of this ward\'s filing are complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next incomplete section.',position:'right'},
  {element:'[data-page="/"]',title:'5. Cover Page',text:'Enter basic case information: Ward name, Case Number, dates, and county. This auto-populates all schedule headers.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'6. Accounting Summary',text:'This is the heart of Simplified Accounting. You only report: Starting Balance, Income (interest/settlements/taxes), Expenses, and Remaining Balance.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'7. Guardian Signature',text:'Sign and date here, certifying under oath that this accounting is true and complete. This is your sworn statement.',position:'bottom'},
  {element:'[data-page="/print"]',title:'8. Export & File',text:'Click Print Preview to review your complete form. Simplified Accounting is much shorter—perfect for courts that accept it. Anything still missing is listed here, with a link straight to it.',position:'left'},
];

// Rewritten — every selector below was previously wrong (missing the "a-"
// prefix buildNavAnnual() actually uses on data-nav, e.g. "a-scha" not
// "scha"), so 8 of the original 12 steps silently failed to resolve and the
// tour skipped straight from Part III to Print Preview. The schedule
// descriptions were also inaccurate: Annual Accounting has no "beginning of
// year" / "end of year" asset schedules — it's Income (A), Disbursements
// (B1-B4), Capital Adjustments (C), Assets & Liabilities (D1-D5), Transfers
// (E), and Sales (F1-F2). Text below is drawn from each schedule's own
// on-page instructions, not reconstructed from memory.
const WALKTHROUGH_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for help, contextual tips, a downloadable guide for Annual Accounting, and an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Use this dropdown to switch between guardianship cases. Each has its own annual accounting records.',position:'right'},
  {element:'#theme-toggle-btn',title:'3. Light & Dark Mode',text:'Switch between light and dark appearance here. Your choice is remembered, and the app opens in light mode until you choose otherwise.',position:'left'},
  {element:'.ward-progress',title:'4. Filing Progress',text:'Tracks how many sections of this accounting are complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next incomplete section.',position:'right'},
  {element:'[data-page="/p2"]',title:'5. Part II: Guardian Certification',text:'Guardian certifies they have receipts for all spending and will keep records for 3 years. Read this carefully—it\'s a legal requirement.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'6. Part III: Guardian Signatures',text:'Guardian signs here under oath that this accounting is correct. Can have multiple guardians sign.',position:'bottom'},
  {element:'[data-nav="a-scha"]',title:'7. Schedule A: Income',text:'All income received during the period: SSI, retirement, disability benefits, interest, or rental income. Don\'t include proceeds from selling an asset — those belong in Schedule C.',position:'right'},
  {element:'[data-nav="a-schb4"]',title:'8. Schedule B-4: All Other Disbursements',text:'The catch-all disbursement schedule most guardians use most — list payments in check-number order. Schedules B-1 through B-3 have their own pages for attorney fees, guardian fees, and other court-ordered payments. If several disbursements are nearly identical, use "Duplicate" on an entry instead of re-typing it.',position:'right'},
  {element:'[data-nav="a-schc"]',title:'9. Schedule C: Capital Adjustments',text:'Gains or losses in asset values, newly discovered assets, and purchases during the period. Enter losses as negative numbers.',position:'right'},
  {element:'[data-nav="a-schd1"]',title:'10. Schedule D-1: Cash Assets',text:'Every liquid account as of the end of the period — checking, savings, CDs, money market, trust accounts. List each one separately. Schedules D-2 through D-5 cover real estate, personal property, intangible assets, and liabilities.',position:'right'},
  {element:'[data-nav="a-p67"]',title:'11. Parts VI & VII: Reconciliation',text:'The app checks that net assets computed from the accounting activity (income, disbursements, gains/losses) match net assets computed from the Schedule D asset/liability listings. These must agree. If they don\'t, correct the schedules — or, if the difference is right as filed, write an explanation on that page; it is required before export and is printed on the finished document.',position:'bottom'},
  {element:'[data-page="/print"]',title:'12. Print Preview & Export',text:'Review your complete annual accounting and export as PDF (recommended) or Excel. Anything still missing — including an unbalanced accounting — is listed here, grouped by section, with a link straight to it.',position:'left'},
];

const WALKTHROUGH_PLAN_SIMPLIFIED=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually written. Use "Jump to…" to go straight to the next unanswered section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'Case number, ward name, and the reporting period this plan covers.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'5. The Plan',text:'The heart of the form — nine questions about the past year: where the ward lived, their medical care, their diagnosis, social activities, how they interact with others, whether any rights should be restored, advance directives, and any payment you received.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'6. Signatures',text:'Each guardian or guardian advocate signs under penalty of perjury, with their contact details. At least one signature is required.',position:'bottom'},
  {element:'[data-page="/print"]',title:'7. Review & File',text:'Print Preview lists anything still missing, and adds a readiness check mirroring what the Clerk of Court looks for — including reminders for steps the app can\'t verify, like serving copies. Export as PDF when ready; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_PLAN_ANNUAL=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next unfinished section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'Case number, ward name, reporting period, and where the ward currently lives.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'5. Residences',text:'Every place the ward lived during the past 12 months. Add a row for each — the court checks this against the address on file.',position:'right'},
  {element:'[data-page="/p3"]',title:'6. Residence & Care Plan',text:'Whether the ward moved, the residential setting best suited to them, and how you plan to provide medical, mental-health, personal, and social care.',position:'right'},
  {element:'[data-page="/p5"]',title:'7. Medical Treatment',text:'Each provider who treated the ward during the year, with their address and how many visits. Add a row per provider.',position:'right'},
  {element:'[data-page="/p6"]',title:'8. Skills & Rights',text:'The ward\'s social abilities, what you did to build their capacity, and — importantly — whether any removed rights could now be restored. Saying a right could be restored means filing a separate petition.',position:'right'},
  {element:'[data-page="/p7"]',title:'9. Daily Living',text:'Rate the ward on sixteen activities of daily living. These ratings tell the court how the ward\'s independence is changing year to year.',position:'right'},
  {element:'[data-page="/p11"]',title:'10. Signatures',text:'Each guardian signs under penalty of perjury with full contact details, then the attorney certifies the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'11. Review & File',text:'Print Preview lists anything still missing and adds a readiness check mirroring what the Clerk of Court reviews — including the separately-filed physician\'s report. Export as PDF; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_PLAN_INITIAL=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next unfinished section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'Case number, ward name, Guardianship Inception Date, the date Letters were signed, and where the ward currently lives. This report is due within 60 days after the Letters of Guardianship are signed.',position:'bottom'},
  {element:'[data-page="/p2"]',title:'5. Residential Setting & Medical Care',text:'The residential setting best suited to the ward, and the medical services you propose providing during the plan period.',position:'right'},
  {element:'[data-page="/p5"]',title:'6. Examining Providers',text:'Every physical or mental examination you\'ve secured or plan to secure, with each provider\'s address and the approximate exam date. Add a row per provider.',position:'right'},
  {element:'[data-page="/p6"]',title:'7. Daily Living',text:'Rate the ward on fifteen activities of daily living — this tells the court how much support the ward needs.',position:'right'},
  {element:'[data-page="/p8"]',title:'8. Advance Directives',text:'Either confirm there are no pre-existing advance directives (and how you verified that), or record the ones the ward executed, including whether a court has suspended or revoked them.',position:'right'},
  {element:'[data-page="/p9"]',title:'9. Signatures',text:'Each guardian signs under penalty of perjury, certifying the plan reflects the ward\'s wishes and rights. Up to four guardians can sign.',position:'right'},
  {element:'[data-page="/print"]',title:'10. Review & File',text:'Print Preview lists anything still missing and adds a readiness check. Remember: a separate Disaster Plan must also be filed alongside this report per Administrative Order 2019-005. Export as PDF; this form has no Excel version.',position:'left'},
];

const WALKTHROUGH_PLAN_MINOR=[
  {element:'#help-toggle-btn',title:'1. Get Help Anytime',text:'Click "?" for guidance on this form, plus an Activity Log of every unlock and backup on this device.',position:'left'},
  {element:'.ward-picker-select',title:'2. Select Your Ward',text:'Switch between cases here. A Plan reports on the ward as a person; an Accounting reports on their money. If you file both, give each record the same case number and the dashboard will group them together.',position:'right'},
  {element:'.ward-progress',title:'3. Filing Progress',text:'Tracks how much of this plan is complete, computed live from what you\'ve actually entered. Use "Jump to…" to go straight to the next unfinished section.',position:'right'},
  {element:'[data-page="/"]',title:'4. Cover',text:'UCN, REF #, reporting period, and whether this filing is amended, professional, or public guardianship. This is the annual plan used specifically when the ward is a minor.',position:'bottom'},
  {element:'[data-page="/p3"]',title:'5. Treatment Providers',text:'Every medical or mental-health provider who treated the minor during the past year, with their address and number of visits.',position:'right'},
  {element:'[data-page="/p5"]',title:'6. Education & Social Development',text:'A summary of the minor\'s school progress, social development, how they communicate, their interpersonal relationships, and any unmet social needs.',position:'right'},
  {element:'[data-page="/p6"]',title:'7. Guardian Signatures',text:'Each guardian signs under penalty of perjury, certifying the plan reflects the minor\'s wishes and rights.',position:'right'},
  {element:'[data-page="/p7"]',title:'8. Preparer & Attorney',text:'This form has its own Preparer certification, separate from the attorney certification — fill in whoever actually prepared the filing.',position:'right'},
  {element:'[data-page="/print"]',title:'9. Review & File',text:'Print Preview lists anything still missing and adds a readiness check. Export as PDF; this form has no Excel version.',position:'left'},
];

let WALKTHROUGH_STEPS=[];
let currentWalkthroughStep=0;
let walkthroughActive=false;
let _walkthroughAutoTriggered=false;

function startWalkthrough(){
  if(!activeInventoryType)return;
  walkthroughActive=true;
  currentWalkthroughStep=0;
  if(activeInventoryType==='guardian')WALKTHROUGH_STEPS=WALKTHROUGH_GUARDIAN;
  else if(activeInventoryType==='simplified')WALKTHROUGH_STEPS=WALKTHROUGH_SIMPLIFIED;
  else if(formEngine(activeInventoryType)==='annual')WALKTHROUGH_STEPS=WALKTHROUGH_ANNUAL;
  else if(activeInventoryType==='planSimplified')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_SIMPLIFIED;
  else if(activeInventoryType==='planAnnual')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_ANNUAL;
  else if(activeInventoryType==='planInitial')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_INITIAL;
  else if(activeInventoryType==='planMinor')WALKTHROUGH_STEPS=WALKTHROUGH_PLAN_MINOR;
  document.getElementById('walkthrough-overlay').classList.add('active');
  showWalkthroughStep();
}

function showWalkthroughStep(){
  if(currentWalkthroughStep>=WALKTHROUGH_STEPS.length){
    endWalkthrough();
    return;
  }
  const step=WALKTHROUGH_STEPS[currentWalkthroughStep];
  const el=document.querySelector(step.element);
  if(!el){currentWalkthroughStep++;showWalkthroughStep();return;}

  // Scroll element into view, centered
  el.scrollIntoView({behavior:'smooth',block:'center'});

  // Re-get rect after scroll
  setTimeout(()=>{
    const rect=el.getBoundingClientRect();
    const tooltip=document.getElementById('walkthrough-tooltip');
    const overlay=document.getElementById('walkthrough-overlay');
    if(!overlay.querySelector('.walkthrough-highlight')){
      const highlight=document.createElement('div');
      highlight.className='walkthrough-highlight';
      overlay.appendChild(highlight);
    }
    const highlight=overlay.querySelector('.walkthrough-highlight');
    highlight.style.left=(rect.left-6)+'px';
    highlight.style.top=(rect.top-6)+'px';
    highlight.style.width=(rect.width+12)+'px';
    highlight.style.height=(rect.height+12)+'px';

    // Update progress
    const progress=currentWalkthroughStep+1;
    const total=WALKTHROUGH_STEPS.length;
    const progressPct=(progress/total)*100;
    document.getElementById('walkthrough-title').textContent=step.title;
    document.getElementById('walkthrough-text').textContent=step.text;
    document.getElementById('walkthrough-progress').textContent=`${progress}/${total}`;
    const progressBar=document.querySelector('#walkthrough-progress-bar div');
    if(progressBar)progressBar.style.width=progressPct+'%';

    tooltip.style.display='block';
    // Shrinks on narrow screens so the tooltip never exceeds the viewport —
    // matches the CSS max-width:calc(100vw - 32px) on .walkthrough-tooltip.
    const tooltipW=Math.min(360,window.innerWidth-2*20), tooltipH=200, pad=20, gap=25;
    // Only reserve room for the sidebar where it's actually taking up
    // screen space. Below the mobile breakpoint the sidebar is an
    // off-canvas drawer (closed by default) reporting itself off-screen, so
    // this naturally collapses to 0 there instead of forcing the tooltip
    // past the right edge of a narrow viewport.
    const sidebarRectNow=document.getElementById('sidebar').getBoundingClientRect();
    const sidebarW=Math.max(0,Math.min(sidebarRectNow.right,window.innerWidth-tooltipW-pad));

    // Prefer right positioning (away from sidebar), then bottom, top, left
    const positions=[
      {name:'right',top:rect.top-tooltipH/2+rect.height/2,left:rect.right+gap},
      {name:'bottom',top:rect.bottom+gap,left:rect.left-tooltipW/2+rect.width/2},
      {name:'top',top:rect.top-tooltipH-gap,left:rect.left-tooltipW/2+rect.width/2},
      {name:'left',top:rect.top-tooltipH/2+rect.height/2,left:rect.left-tooltipW-gap}
    ];

    let best=positions[0];
    for(const pos of positions){
      const clampedLeft=Math.max(pad, Math.min(pos.left, window.innerWidth-tooltipW-pad));
      const clampedTop=Math.max(pad, Math.min(pos.top, window.innerHeight-tooltipH-pad));

      // Check if tooltip would overlap with sidebar or highlighted element
      const tooltipRect={left:clampedLeft,top:clampedTop,right:clampedLeft+tooltipW,bottom:clampedTop+tooltipH};
      const elemRect={left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};
      const sidebarRect={left:0,top:0,right:sidebarW,bottom:window.innerHeight};

      // Check collision with element and sidebar
      const overlapElement=!(tooltipRect.right<elemRect.left||tooltipRect.left>elemRect.right||tooltipRect.bottom<elemRect.top||tooltipRect.top>elemRect.bottom);
      const overlapSidebar=!(tooltipRect.right<sidebarRect.left||tooltipRect.left>sidebarRect.right||tooltipRect.bottom<sidebarRect.top||tooltipRect.top>sidebarRect.bottom);

      if(!overlapElement && !overlapSidebar){
        best=pos;
        break;
      }
    }

    let top=Math.max(pad, Math.min(best.top, window.innerHeight-tooltipH-pad));
    // minLeft is capped at the same maxLeft used below so the two can never
    // cross — on a screen too narrow to both clear the sidebar AND fit the
    // tooltip, fitting inside the viewport wins over clearing the sidebar.
    const maxLeft=window.innerWidth-tooltipW-pad;
    const minLeft=Math.min(sidebarW+pad,maxLeft);
    let left=Math.max(minLeft, Math.min(best.left, maxLeft));
    tooltip.style.top=top+'px';
    tooltip.style.left=left+'px';
  },300);
}

function nextWalkthroughStep(){currentWalkthroughStep++;showWalkthroughStep();}
function skipWalkthrough(){endWalkthrough();}
function endWalkthrough(){
  walkthroughActive=false;
  document.getElementById('walkthrough-overlay').classList.remove('active');
  document.getElementById('walkthrough-tooltip').style.display='none';
  if(_walkthroughAutoTriggered)saveAppState('walkthroughCompleted','true');
}

// ═══════════════════════════════════════════════════════
// PDF GUIDE EXPORT (Phase 5)
// ═══════════════════════════════════════════════════════
async function exportHelpGuideAsPDF(){
  const VER='1.5.30';
  const stamp=new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const guide=`
    <style>
      /* NOTE — this stylesheet is rendered by html2canvas, not a print engine.
         Three rules learned the hard way, do not undo them:
           · no background fills behind body text (they clip in export)
           · no CSS counters — every number here is hardcoded in the markup
           · light background only; dark themes rasterise badly
         Ink ramp is deliberately short: #111 headings, #262626 body,
         #3f3f3f secondary, #6b6b6b muted (the lightest tone that still
         holds up in print). */
      *{margin:0;padding:0;box-sizing:border-box;}
      .g{font-family:Georgia,'Times New Roman',serif;color:#262626;font-size:10.5pt;line-height:1.48;}
      .g .sans{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;}

      /* Masthead */
      .cover{padding:0 0 10pt 0;margin:0 0 14pt 0;border-bottom:2pt solid #820024;page-break-inside:avoid;page-break-after:avoid;}
      .kicker{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:8pt;letter-spacing:.24em;font-weight:700;color:#820024;text-transform:uppercase;margin-bottom:7pt;}
      .cover h1{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:26pt;font-weight:700;letter-spacing:-.022em;color:#111;line-height:1.03;}
      /* 29em is chosen, not guessed: the subtitle measures 27.64em up to the
         em-dash and 30.03em including the next word, so this is the only band
         that turns the line after the dash rather than before it. */
      .cover .sub{font-size:11.5pt;color:#3f3f3f;margin-top:7pt;max-width:29em;line-height:1.42;}
      .cover .meta{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:8.5pt;color:#6b6b6b;margin-top:10pt;letter-spacing:.04em;}

      /* Contents — number column is a fixed width so the labels align into a
         true second column, and matches the .sn width used by section titles. */
      .toc{margin:0 0 14pt 0;page-break-inside:avoid;}
      .eyebrow{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:#820024;font-weight:700;margin-bottom:8pt;}
      .toc-row{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:10.5pt;color:#262626;padding:3.5pt 0;border-bottom:.75pt solid #ececec;}
      .toc-row:last-child{border-bottom:none;}
      .toc-row .tn{color:#820024;font-weight:700;display:inline-block;width:26pt;}

      /* Sections. html2pdf's break engine honours page-break-inside but not
         page-break-after, so a heading alone can strand at the foot of a page.
         .keep binds each title to its opening paragraph as one unbreakable
         unit — the keep-with-next every typesetter expects. */
      .keep{page-break-inside:avoid;}
      .sec{margin:0 0 13pt 0;}
      .sec h2{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:14.5pt;font-weight:700;color:#111;letter-spacing:-.014em;padding-bottom:5.5pt;margin-bottom:8pt;border-bottom:.75pt solid #dcdcdc;page-break-after:avoid;page-break-inside:avoid;}
      .sec h2 .sn{color:#820024;display:inline-block;width:26pt;}
      .sec h3{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:10.5pt;font-weight:700;color:#111;letter-spacing:.005em;margin:9pt 0 2.5pt;page-break-after:avoid;page-break-inside:avoid;}
      .sec p{margin:0 0 5.5pt;}
      .lead{color:#3f3f3f;font-size:11pt;}

      /* Definitions */
      .defs{margin:3pt 0 0;}
      .defs .row{margin:0 0 6.5pt;page-break-inside:avoid;}
      .defs .t{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-weight:700;font-size:10pt;color:#820024;letter-spacing:.008em;}
      .defs .d{color:#333;margin-top:1.5pt;}

      /* Steps — the numeral badge is the one filled element that survives
         html2canvas cleanly, because no body text sits on top of it. */
      .steps{margin:3pt 0;}
      .steps .step{position:relative;padding-left:25pt;margin:0 0 6pt;page-break-inside:avoid;}
      .steps .num{position:absolute;left:0;top:1.5pt;font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:8pt;font-weight:700;color:#fff;background:#820024;width:15pt;height:15pt;border-radius:7.5pt;text-align:center;line-height:15pt;}

      /* Notes — left rule, never a filled panel. */
      .note{border-left:2pt solid #820024;padding:1pt 0 1pt 11pt;margin:8pt 0;color:#333;page-break-inside:avoid;}
      .note .nl{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-size:7.5pt;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#820024;display:block;margin-bottom:1.5pt;}

      /* Q&A */
      .qa{margin:0 0 6.5pt;page-break-inside:avoid;}
      .qa .q{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-weight:700;font-size:10.5pt;color:#111;}
      .qa .a{color:#333;margin-top:1.5pt;}

      .k{font-family:'Helvetica Neue','Segoe UI',Arial,sans-serif;font-weight:700;color:#820024;}

      .closing{margin-top:13pt;padding-top:7pt;border-top:.75pt solid #dcdcdc;font-size:10pt;color:#3f3f3f;page-break-inside:avoid;}
    </style>
    <div class="g">

      <div class="cover">
        <div class="kicker">User Guide</div>
        <h1>Probate Guardian</h1>
        <div class="sub">Preparing Florida guardianship inventories and accountings — from first launch to a court-ready file.</div>
        <div class="meta">Version ${VER}&nbsp;&nbsp;·&nbsp;&nbsp;Updated ${stamp}</div>
      </div>

      <div class="toc">
        <div class="eyebrow">Contents</div>
        <div class="toc-row"><span class="tn">01</span>Getting started</div>
        <div class="toc-row"><span class="tn">02</span>Choosing an inventory type</div>
        <div class="toc-row"><span class="tn">03</span>Filling out your forms</div>
        <div class="toc-row"><span class="tn">04</span>Key terms</div>
        <div class="toc-row"><span class="tn">05</span>Saving &amp; backups</div>
        <div class="toc-row"><span class="tn">06</span>Exporting for court</div>
        <div class="toc-row"><span class="tn">07</span>Troubleshooting</div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">01</span>Getting started</h2>
        <p class="lead">Probate Guardian prepares court-required guardianship documents entirely on your device. There is no account and no cloud — your data never leaves the computer.</p>
        </div>
        <h3>At first launch</h3>
        <div class="steps">
          <div class="step"><span class="num">1</span>Choose a data-protection level. <span class="k">Encrypted</span> locks everything behind a master password; <span class="k">No Password</span> opens instantly but stores data as plain text. This choice is permanent.</div>
          <div class="step"><span class="num">2</span>Click <span class="k">+ New Form</span> and pick the inventory type that matches your filing.</div>
          <div class="step"><span class="num">3</span>Work down the sidebar. A green check marks a finished section; an amber warning means it was started but left incomplete.</div>
        </div>
        <div class="note"><span class="nl">Tip</span>Save a backup the moment your first form exists. See <em>Saving &amp; backups</em>.</div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">02</span>Choosing an inventory type</h2>
        <p>Select the form that matches your filing requirement.</p>
        </div>
        <div class="defs">
          <div class="row"><div class="t">Initial Inventory</div><div class="d">Every asset as of the guardianship’s inception date. The most detailed form; filed when the guardianship begins.</div></div>
          <div class="row"><div class="t">Simplified Annual Accounting</div><div class="d">A short income-and-expense summary. Allowed only when all estate property sits in a court-designated depository and activity is limited to interest, settlement deposits, and service charges.</div></div>
          <div class="row"><div class="t">Annual Accounting</div><div class="d">A full yearly report of income, expenses, assets, and reconciliation. Used when the simplified criteria are not met.</div></div>
        </div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">03</span>Filling out your forms</h2>
        <h3>Initial Inventory</h3>
        <p>Complete Schedules A through D, then Parts III–VI (signatures and attestations). Each schedule shows its status in the sidebar.</p>
        </div>
        <h3>Simplified Annual Accounting</h3>
        <p>Enter the starting balance, income, and disbursements across Parts I–VI. Totals reconcile automatically.</p>
        <h3>Annual Accounting</h3>
        <p>Begin with the certification and signatures, then complete the asset schedules. The app verifies that beginning balance + income − expenses = ending balance.</p>
        <div class="note"><span class="nl">Tip</span>Hover the “?” beside any field for an instant, plain-English definition.</div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">04</span>Key terms</h2>
        <p>Wording that appears throughout the schedules, in plain English.</p>
        </div>
        <div class="defs">
          <div class="row"><div class="t">Ward’s %</div><div class="d">The share of an asset the ward owns. Enter whole numbers — <span class="k">50</span>, not <span class="k">0.50</span>.</div></div>
          <div class="row"><div class="t">Restricted asset</div><div class="d">Property that cannot be sold or used without a court order. Mark <em>Yes</em> only when a court restricts it.</div></div>
          <div class="row"><div class="t">Carrying value</div><div class="d">An asset’s book value for accounting, which may differ from current market value.</div></div>
          <div class="row"><div class="t">Personal residence</div><div class="d">The ward’s primary home — not investment or vacation property.</div></div>
          <div class="row"><div class="t">Depository</div><div class="d">The bank or institution holding the ward’s funds. Simplified accounting requires all property to be held in a court-designated depository.</div></div>
          <div class="row"><div class="t">SSN / EIN</div><div class="d">Social Security Number for individuals; Employer Identification Number for businesses or trusts.</div></div>
        </div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">05</span>Saving &amp; backups</h2>
        <p>Your data lives on this device only, so backups are your safety net.</p>
        </div>
        <div class="defs">
          <div class="row"><div class="t">Create a backup</div><div class="d">Click <span class="k">Save Data File (.sav)</span> and store it somewhere separate — an external drive, a synced folder, or emailed to yourself.</div></div>
          <div class="row"><div class="t">Restore a backup</div><div class="d">Click <span class="k">Open Data File (.sav)</span> and choose your file. Everything returns at once.</div></div>
        </div>
        <div class="note"><span class="nl">Important</span>If you forget your master password and lose every backup, the data cannot be recovered. Keep at least two copies in different places.</div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">06</span>Exporting for court</h2>
        <p>When a ward is complete, open <span class="k">Print Preview</span> to review every form. Any field highlighted in red must be filled before export.</p>
        </div>
        <div class="defs">
          <div class="row"><div class="t">PDF</div><div class="d">Recommended for most filings — easy to read and sign.</div></div>
          <div class="row"><div class="t">Excel</div><div class="d">Use when your county requires its own template: import the template, then export your data into it.</div></div>
        </div>
      </div>

      <div class="sec">
        <div class="keep">
        <h2><span class="sn">07</span>Troubleshooting</h2>
        <p>Answers to the questions that come up most often.</p>
        </div>
        <div class="qa"><div class="q">Changes are not saving.</div><div class="a">Check the sidebar status. If it reads “needs one manual save first,” click <span class="k">Save Data File</span> once to enable auto-save.</div></div>
        <div class="qa"><div class="q">A form will not export.</div><div class="a">Run Print Preview and complete any field highlighted in red.</div></div>
        <div class="qa"><div class="q">I forgot my password.</div><div class="a">It cannot be reset or recovered. Restore from a backup, or start again in No Password mode.</div></div>
        <div class="qa"><div class="q">The app is slow to open.</div><div class="a">Large files with many wards take longer. Archive wards you no longer need.</div></div>
      </div>

      <div class="closing">In-app help is always a click away — press <span class="k">?</span> in the sidebar for guidance on whichever section you have open.</div>

    </div>
  `;
  const element=document.createElement('div');
  element.innerHTML=guide;
  const opt={
    // Letter, not A4 — this is a US probate tool and the guide gets printed
    // on US paper. A4 content on a Letter tray scales and shifts the margins.
    margin:[16,18,21,18],
    filename:'Probate-Guardian-User-Guide.pdf',
    image:{type:'jpeg',quality:.98},
    html2canvas:{scale:2,backgroundColor:'#ffffff'},
    jsPDF:{orientation:'portrait',unit:'mm',format:'letter',compress:true},
    pagebreak:{mode:['css','legacy']}
  };
  // The footer is drawn with jsPDF's own text API rather than being part of
  // the flowed HTML: html2canvas rasterises the body, so anything in the flow
  // can only appear once, at the end. Drawing per page keeps the rule and the
  // page numbers crisp vector text at any zoom.
  try{
    await html2pdf().set(opt).from(element).toPdf().get('pdf').then(function(pdf){
      const total=pdf.internal.getNumberOfPages();
      const w=pdf.internal.pageSize.getWidth();
      const h=pdf.internal.pageSize.getHeight();
      for(let i=1;i<=total;i++){
        pdf.setPage(i);
        pdf.setDrawColor(220,220,220);
        pdf.setLineWidth(.2);
        pdf.line(18,h-14,w-18,h-14);
        pdf.setFont('helvetica','normal');
        pdf.setFontSize(8);
        pdf.setTextColor(107,107,107);
        pdf.text('Probate Guardian — User Guide',18,h-9.5);
        pdf.text('Page '+i+' of '+total,w-18,h-9.5,{align:'right'});
      }
    }).save();
  }catch(e){
    console.error('PDF guide export failed',e);
    alert('Sorry — the PDF guide could not be generated. Please try again.');
  }
}

let activeInventoryType = null;
window.D = {}; // Current active ward's data
let _saveTimer = null;
let currentPage = '/';
// A bare top-level `let`, like activeInventoryType above, isn't reachable
// from an ES module (see src/core/state.js's file header) -- this tiny
// accessor (a function declaration, so it's a real window property) is
// what the Simplified Accounting feature module reaches for after an Excel
// import, to re-render whichever page was already open.
function getCurrentPage(){return currentPage;}
let _visitedPages = new Set(); // Track which pages user has visited
let _dirtySinceExport = false; // true once data changes after the last .sav export
let _autoExportTimer = null;
let _lastSavedTickTimer = null;
let _autoExportIntervalMinutes = 10; // 0 means Off; loaded from/saved to appState
let _lastExportAt = null; // ms epoch of last successful export, or null if never

// ═══════════════════════════════════════════════════════
// STORAGE STRATEGY — canonical .sav file plus temporary recovery
// ═══════════════════════════════════════════════════════
//
// Live case data is held in guardianData and the containers below. A .sav
// file is the authoritative durable record and receives full-state writes.
//
// Browser storage has two current, limited uses:
//   - pg-session-cache holds a temporary full-state recovery snapshot while
//     changes are unsaved. It uses the case's encrypted-or-plain mode and is
//     cleared after a successful .sav save.
//   - pg-launch-pref holds a has-opened flag and, where supported, the last
//     FileSystemFileHandle. It never stores the file's contents.
//
// runLegacyBrowserStorageMigrationIfNeeded() separately reads and removes
// data left by older versions in ProbateGuardian/localStorage/sessionStorage.
// The Tauri build also maintains an encrypted best-effort file backup.
// ═══════════════════════════════════════════════════════

let _appState = {};        // key -> value; replaces the old `appState` IDB store
let _templateCache = {};   // type -> base64; replaces the old `templates` IDB store
let _auditLogEntries = []; // {id, timestamp, eventType, details, success}; replaces `auditLog`
let _auditLogNextId = 1;

// Read-only identifiers for migrating storage created by older releases.
const LEGACY_DB_NAME = 'ProbateGuardian';
const LEGACY_DB_VERSION = 3;
const LEGACY_STORES = { wards:'wards', appState:'appState', templates:'templates', auditLog:'auditLog' };
const LEGACY_KEYS = {
  guardian: 'guardianInventory_v2',
  simplified: 'simplifiedAccounting_v1',
  annual: 'annualAccounting_v1',
  migrationComplete: 'probateGuardian_migrationDone',
  guardianTemplate: '_guardianTemplateB64',
  simplifiedTemplate: '_simplifiedTemplateB64',
  annualTemplate: '_annualTemplateB64'
};

// ═══════════════════════════════════════════════════════
// COMMON HELPERS
// ═══════════════════════════════════════════════════════
const r2=(v)=>Math.round(v*100)/100;
const fmt=(v)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v||0);
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function fmtDate(s){return s?String(s).substring(0,10):'';}
// Dashboard-card-only variant: treats an implausible year (e.g. the
// "0002-05-10" a native <input type="date"> would happily store if a
// user typed "2" into the year segment and tabbed away -- see the
// document-level 'change' guard further down that now blocks this going
// forward) the same as a missing date, so a summary card degrades to
// "?" instead of displaying obvious garbage. Left as its own function
// rather than changed in fmtDate() itself, which prints elsewhere
// (forms, print preview, exports) where a bad value should stay visible
// so the filer notices and fixes it before filing, not get hidden.
function fmtDateCard(s){
  const d=fmtDate(s);
  const y=+d.slice(0,4);
  return (d&&(y<1900||y>new Date().getFullYear()+30))?'':d;
}

// Neutralizes formula/CSV injection: a cell value starting with =, +, -, or @
// would otherwise be interpreted as a formula by Excel/Sheets when the
// exported file is opened. Only applied at export time — never affects the
// live in-app values stored in window.D or how they render on screen.
function sanitizeForExcel(s){
  return /^[=+\-@]/.test(s) ? "'"+s : s;
}

// A co-guardian slot counts as "in use" if any field is filled, not just Name —
// otherwise partially-filled co-guardian rows silently vanish from export/validation/checkmarks.
function guardianHasAnyData(g){
  return !!(g&&(g.name||g.ssn||g.phone||g.email||g.mailingStreet||g.mailingCityStateZip||g.residenceStreet||g.residenceCityStateZip||g.signatureDate));
}

// ── SECURITY VALIDATION ──────────────────────────────
// Detect and block SQL injection patterns
function detectSQLInjection(s){
  const sqlPatterns=[/(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\bdrop\b|\binsert\b|\bupdate\b|\bdelete\b|\bexec\b|\bscript\b|--|\/\*|\*\/|xp_|sp_)/i];
  return sqlPatterns.some(p=>p.test(String(s||'')));
}

// Detect and block XSS/HTML injection
function detectXSSPayload(s){
  const xssPatterns=[/<script[^>]*>|javascript:|on\w+\s*=|<iframe|<object|<embed|<img[^>]+onerror|<svg[^>]+on|<body[^>]+on|eval\(|expression\(|vbscript:/i];
  return xssPatterns.some(p=>p.test(String(s||'')));
}

// Detect and block path traversal attempts
function detectPathTraversal(s){
  const pathPatterns=[/\.\.\//,/\.\.\\/,/^\/etc\//,/\/etc\//i,/^[a-z]:\\/i];
  return pathPatterns.some(p=>p.test(String(s||'')));
}

// Sanitize input: remove dangerous characters but preserve legitimate data
function sanitizeInput(s){
  if(!s)return s;
  let cleaned=String(s);
  cleaned=cleaned.replace(/[<>\"'`]/g,'');
  cleaned=cleaned.replace(/javascript:/gi,'');
  cleaned=cleaned.replace(/on\w+=/gi,'');
  return cleaned;
}

// Strip everything except digits and a single decimal point — used for
// amount/percent fields instead of type="number" so we fully own character
// filtering (native number inputs allow '-' inconsistently across WebView
// versions, and their spinner buttons don't fire keydown so keydown-based
// minus-blocking can't catch them).
function sanitizeNonNegativeDecimal(s){
  let v=String(s||'').replace(/[^0-9.]/g,'');
  const firstDot=v.indexOf('.');
  if(firstDot!==-1){
    v=v.slice(0,firstDot+1)+v.slice(firstDot+1).replace(/\./g,'');
  }
  return v;
}
// Same as sanitizeNonNegativeDecimal but keeps a single leading '-' -- for
// the couple of fields (Annual Schedule C's Loss/Reduction, Schedule E's
// Transfer Out Amt) that are explicitly entered as negative. Those used to
// be native type="number" instead, which is exactly the pattern the
// comment above sanitizeNonNegativeDecimal explains this app moved away
// from app-wide (inconsistent '-' handling and no keydown events from the
// spinner buttons across WebView versions) -- these two were simply never
// migrated when the rest of the app was.
function sanitizeDecimal(s){
  const str=String(s||'');
  const neg=str.trim().startsWith('-');
  const digits=sanitizeNonNegativeDecimal(str);
  // Keep a lone '-' even before any digits are typed (a valid, if
  // incomplete, intermediate state) -- requiring digits first would wipe
  // the sign the instant it's typed, before the digits that are supposed
  // to follow it exist yet.
  return neg?'-'+digits:digits;
}

// Validate field value for security and format
function validateSecurityInput(fieldName,value){
  const v=String(value||'');
  if(detectSQLInjection(v)||detectXSSPayload(v)||detectPathTraversal(v)){
    console.warn(`Security: Blocked dangerous input in ${fieldName}`);
    return '';
  }
  return sanitizeInput(v);
}

// ── IMPORTED FILE HARDENING ──────────────────────────
// Every import entry point (the three Excel importers, their drag-and-drop
// equivalent, and the .sav/.zip picker) hands this module a file chosen by
// whoever is sitting at the browser — including a guardian who was emailed
// a "fixed" template by someone else. Nothing here assumes the extension
// matches the content, or that the content is well-formed.
const IMPORT_SIZE_LIMITS={
  xlsx:10*1024*1024,  // court templates run well under 1MB; 10MB is generous headroom
  sav:50*1024*1024    // a .sav can bundle many wards plus attachments (15MB cap each, see SCHEDULE_DOC_MAX_FILE_BYTES)
};
const ZIP_MAGIC=[0x50,0x4B,0x03,0x04]; // local-file-header signature 'PK\x03\x04' — every .xlsx and .sav is a ZIP container

// Rejects a file before it ever reaches ExcelJS/JSZip: empty, over the size
// ceiling for its kind, or not actually a ZIP (accept=".xlsx" is only a
// filename hint — the browser does not enforce it, and a court-issued
// template you were emailed could be anything with that extension slapped
// on). Checking the first 4 bytes rather than trusting file.name/file.type
// means a renamed non-ZIP file fails fast with a clear message instead of
// reaching the parser at all.
async function validateImportFile(file,kind){
  if(!file)return{ok:false,message:'No file was selected.'};
  if(file.size===0)return{ok:false,message:'That file is empty.'};
  const limit=IMPORT_SIZE_LIMITS[kind]||IMPORT_SIZE_LIMITS.xlsx;
  if(file.size>limit){
    return{ok:false,message:`That file is ${(file.size/1024/1024).toFixed(1)} MB, which is over the ${(limit/1024/1024)|0} MB limit for this kind of import.`};
  }
  let head;
  try{
    head=new Uint8Array(await file.slice(0,4).arrayBuffer());
  }catch(e){
    return{ok:false,message:'That file could not be read.'};
  }
  if(head.length<4||!ZIP_MAGIC.every((b,i)=>head[i]===b)){
    return{ok:false,message:'That file is not a valid Excel/.sav file (its contents do not match a ZIP archive, regardless of its name).'};
  }
  return{ok:true};
}

// Several pages embed their own copy of an import zone, each with its own
// #import-progress(-simplified|-annual) div sitting next to the file input
// (see pageCover/pageSimplified/pageAnnual) — walk up from the input that
// actually fired rather than assuming a single global id, or status text
// meant for one copy of the zone can silently land in a different one (or
// nowhere, if this page happens not to render the first id at all).
function getImportProgressEl(input){
  const scope=input&&input.closest?input.closest('.accordion-body'):null;
  return (scope&&scope.querySelector('[id^="import-progress"]'))||document.getElementById('import-progress');
}

// Defense-in-depth after a workbook otherwise passes the size/magic-byte
// gate above: a small ZIP can still decompress into a workbook with an
// enormous used range (a "sheet with a huge used range" — the case this
// guards against). This app's own readers only ever touch a fixed, known
// set of cell addresses per template — they were never the unbounded
// `sheet.rowCount`/`eachRow` loops that would normally need capping here —
// so the real risk is ExcelJS itself materializing that whole range during
// .load(). This can't stop that first pass (see the accompanying report for
// why: it would need the parse moved into a Worker), but it does stop this
// app from doing anything further with a workbook shaped nothing like a
// Clerk of Court template, with a plain-language reason instead of it just
// silently working through something enormous.
const EXCEL_IMPORT_LIMITS={maxSheets:60,maxRowsPerSheet:5000};
function assertWorkbookWithinLimits(workbook){
  const sheets=workbook.worksheets||[];
  if(sheets.length>EXCEL_IMPORT_LIMITS.maxSheets){
    throw new Error(`This file has ${sheets.length} sheets — far more than a Clerk of Court template ever has. It was not imported.`);
  }
  for(const ws of sheets){
    const n=ws.actualRowCount||ws.rowCount||0;
    if(n>EXCEL_IMPORT_LIMITS.maxRowsPerSheet){
      throw new Error(`Sheet "${ws.name}" has ${n} rows — far more than a Clerk of Court template ever has. It was not imported.`);
    }
  }
}

// Resolves a raw ExcelJS cell value down to a plain scalar or Date,
// unwrapping every non-literal shape ExcelJS hands back: {formula,result}
// (a formula cell — prefer the computed result), {richText:[...]} (join the
// runs' text), {text,hyperlink} (the link's display text), and {error}
// (a cell showing #REF!/#DIV0!/etc — nothing sensible to import). A formula
// result can itself be any of these shapes, so this recurses once on
// .result. Returns null instead of ever handing back a raw object — a
// shape this doesn't recognize should import as blank, not as "[object
// Object]" in a case number or a ward's name.
function unwrapCellValue(v){
  if(v==null)return null;
  if(v instanceof Date)return v;
  if(typeof v!=='object')return v;
  if('error' in v)return null;
  if('result' in v)return unwrapCellValue(v.result);
  if(Array.isArray(v.richText))return v.richText.map(r=>r&&r.text||'').join('');
  if('hyperlink' in v){
    const t=v.text;
    return Array.isArray(t)?t.map(r=>r&&r.text||'').join(''):t;
  }
  return null;
}

// Text form of an ExcelJS cell — the replacement for the `const gc=addr=>
// {const c=ws.getCell(addr);return c.value!=null?String(c.value).trim()
// :'';}` pattern that used to be redefined at every import site. That
// pattern printed the literal string "[object Object]" into whatever field
// it fed whenever the cell held a formula, rich text, a hyperlink, or an
// error — all of which a real court-issued template can contain. Dates are
// normalized through the app's own fmtDate (YYYY-MM-DD) instead of a
// locale/timezone-dependent Date#toString().
function readCellText(cell){
  const v=unwrapCellValue(cell?cell.value:null);
  if(v==null)return '';
  if(v instanceof Date)return fmtDate(v.toISOString());
  return String(v).trim();
}

// Recursively sanitize all string fields in an object (for loaded data)
function sanitizeObjectData(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(Array.isArray(obj))return obj.map(sanitizeObjectData);
  const sanitized={};
  for(const key in obj){
    const val=obj[key];
    if(typeof val==='string'){
      sanitized[key]=sanitizeInput(val);
    }else if(typeof val==='object'){
      sanitized[key]=sanitizeObjectData(val);
    }else{
      sanitized[key]=val;
    }
  }
  return sanitized;
}

// In-place counterpart to sanitizeObjectData, for a caller holding a live
// reference that must keep its identity — window.D during an Excel import
// is literally the object sitting in guardianData.wards, and sanitizeObjectData
// returning a NEW object would silently detach window.D from that array
// entry, so the next saveData() would persist the OLD, un-sanitized ward.
// importExcelFile builds a fresh object and can use sanitizeObjectData
// before ever touching window.D; importExcelSimplified/importExcelAnnual
// write straight onto window.D field-by-field across the whole function, so
// this mutates it afterward instead.
function sanitizeObjectDataInPlace(obj){
  if(!obj||typeof obj!=='object')return obj;
  if(Array.isArray(obj)){
    for(let i=0;i<obj.length;i++){
      if(typeof obj[i]==='string')obj[i]=sanitizeInput(obj[i]);
      else if(obj[i]&&typeof obj[i]==='object')sanitizeObjectDataInPlace(obj[i]);
    }
    return obj;
  }
  for(const key of Object.keys(obj)){
    const val=obj[key];
    if(typeof val==='string')obj[key]=sanitizeInput(val);
    else if(val&&typeof val==='object')sanitizeObjectDataInPlace(val);
  }
  return obj;
}

// Format phone as (123) 456-7890 — accepts only digits, pads/truncates to 10
function formatPhone(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,10);
  if(digits.length===0)return '';
  if(digits.length<=3)return `(${digits}`;
  if(digits.length<=6)return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// Format SSN/EIN as XXX-XX-XXXX — accepts only digits, pads/truncates to 9
function formatSSN(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,9);
  if(digits.length===0)return '';
  if(digits.length<=3)return digits;
  if(digits.length<=5)return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,5)}-${digits.slice(5)}`;
}

// Case Number format is YY-######-GD: a 2-digit year, a sequentially
// issued 6-digit case number, and "GD" for Guardianship -- the only case
// type this app produces, so it's never something the guardian types
// themselves. Typing-time only inserts the dash after the year and caps
// input at 8 digits (2 + 6); it deliberately does NOT pad the sequence or
// append "-GD" here, so the field doesn't jump to "12-000000-GD" while
// the guardian is still in the middle of typing the sequence. That
// happens once in finalizeCaseNumber() below, on blur.
function formatCaseNumber(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,8);
  if(digits.length<=2)return digits;
  return `${digits.slice(0,2)}-${digits.slice(2)}`;
}

// Blur-time finalization: left-pads the sequence to 6 digits and appends
// the fixed "-GD" suffix, so "3-14-GD" from a guardian who typed "3145"
// becomes the properly formed "03-000145-GD". Only a bare year (0-2
// digits, nothing typed for the sequence yet) is left alone -- forcing a
// dangling "03--GD" onto a case number with no sequence at all would be
// worse than just leaving it incomplete for the required-field check to
// catch.
function finalizeCaseNumber(s){
  const digits=String(s||'').replace(/\D/g,'').slice(0,8);
  if(digits.length<=2)return digits;
  const year=digits.slice(0,2);
  const seq=digits.slice(2).padStart(6,'0');
  return `${year}-${seq}-GD`;
}

// ═══════════════════════════════════════════════════════
// COUNTY AUTOCOMPLETE — every County field, previously a <select> hardcoded
// to just Pinellas/Pasco, is now a free-text input with a filtered dropdown
// of Florida's 67 counties (never more than 4 shown, narrowing as the
// guardian types), so the app isn't limited to those two counties anymore.
// Deliberately permissive rather than a locked-down <select>, matching the
// sidebar's own "type or select a ward" combobox elsewhere in the app: a
// suggestion list, not a hard constraint, since a guardian who knows their
// county correctly (the overwhelmingly common case) shouldn't be blocked
// by an autocomplete that doesn't yet match what they've typed so far.
// ═══════════════════════════════════════════════════════
const FL_COUNTIES=['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','St. Johns','St. Lucie','Santa Rosa','Sarasota','Seminole','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];

// ═══════════════════════════════════════════════════════
// COUNTY → CIRCUIT — every printed court caption used to hardcode "SIXTH
// JUDICIAL CIRCUIT" (and, on several form types, omitted the county
// entirely), which was accurate only while the app was scoped to
// Pinellas/Pasco -- both Sixth Circuit. Once the County field above was
// opened up to all 67 counties, that stopped being true: a case filed for,
// say, Orange County would print a caption naming the wrong circuit court
// altogether. This maps each county to its real Florida judicial circuit
// (1-20, per the official circuit map) so every doc-header function below
// can print the caption that actually matches whatever county was chosen.
// ═══════════════════════════════════════════════════════
const FL_COUNTY_CIRCUIT={
  Escambia:1,Okaloosa:1,'Santa Rosa':1,Walton:1,
  Franklin:2,Gadsden:2,Jefferson:2,Leon:2,Liberty:2,Wakulla:2,
  Columbia:3,Dixie:3,Hamilton:3,Lafayette:3,Madison:3,Suwannee:3,Taylor:3,
  Clay:4,Duval:4,Nassau:4,
  Citrus:5,Hernando:5,Lake:5,Marion:5,Sumter:5,
  Pasco:6,Pinellas:6,
  Flagler:7,Putnam:7,'St. Johns':7,Volusia:7,
  Alachua:8,Baker:8,Bradford:8,Gilchrist:8,Levy:8,Union:8,
  Orange:9,Osceola:9,
  Hardee:10,Highlands:10,Polk:10,
  'Miami-Dade':11,
  DeSoto:12,Manatee:12,Sarasota:12,
  Hillsborough:13,
  Bay:14,Calhoun:14,Gulf:14,Holmes:14,Jackson:14,Washington:14,
  'Palm Beach':15,
  Monroe:16,
  Broward:17,
  Brevard:18,Seminole:18,
  'Indian River':19,Martin:19,Okeechobee:19,'St. Lucie':19,
  Charlotte:20,Collier:20,Glades:20,Hendry:20,Lee:20
};
const CIRCUIT_ORDINALS=['','First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth','Thirteenth','Fourteenth','Fifteenth','Sixteenth','Seventeenth','Eighteenth','Nineteenth','Twentieth'];
// Falls back to Sixth (Pinellas/Pasco) for a blank or unrecognized county --
// this app's original two-county scope -- so an unfinished Cover page still
// prints a real circuit name rather than an empty one.
function circuitForCounty(county){
  return FL_COUNTY_CIRCUIT[(county||'').trim()]||6;
}
// The shared court-caption line every doc-header function below prints,
// e.g. "IN THE CIRCUIT COURT OF THE NINTH JUDICIAL CIRCUIT<br>IN AND FOR
// ORANGE COUNTY, FLORIDA". `probateDivision` appends ", PROBATE DIVISION"
// for the form types whose caption already included it. Written already
// upper-cased (matching every other literal caption string in this file)
// rather than relying on .court-title's CSS text-transform, since this
// same markup is also rasterized by html2canvas for PDF export.
function circuitCourtCaption(county,probateDivision){
  const c=(county||'Pinellas').trim()||'Pinellas';
  const ord=(CIRCUIT_ORDINALS[circuitForCounty(c)]||'Sixth').toUpperCase();
  return `IN THE CIRCUIT COURT OF THE ${ord} JUDICIAL CIRCUIT<br>IN AND FOR ${esc(c.toUpperCase())} COUNTY, FLORIDA${probateDivision?', PROBATE DIVISION':''}`;
}

// Shared markup: a plain text input plus an initially-empty dropdown right
// after it, both wrapped so the dropdown can be absolutely positioned
// against the input (see .ward-combobox-wrap, reused as-is here — the
// positioning rule was never ward-specific). `writeExpr` is whatever this
// particular field's own data-write convention is (D['field']=this.value,
// a custom setter string, or nothing at all for data-bind fields, which
// wire their own listener in bindForms() instead) — this function only
// ever concerns itself with the dropdown, never how the value gets saved.
function countyAutocompleteHTML(id,val,writeExpr){
  const filterCall=`filterCountyDropdown(this)`;
  const oninput=writeExpr?`${writeExpr};${filterCall}`:filterCall;
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${id}" autocomplete="off" value="${esc(val||'')}"
      oninput="${oninput}" onfocus="${filterCall}" onblur="setTimeout(()=>hideCountyDropdown('${id}'),150)">
    <div class="county-combobox-dropdown" id="${id}-dropdown"></div>
  </div>`;
}
// Up to 4 counties whose name starts with what's typed so far (case-
// insensitive); with nothing typed yet, the first 4 alphabetically, so
// focusing an empty field isn't just a dead dropdown.
function filterCountyDropdown(inp){
  const dd=document.getElementById(inp.id+'-dropdown');
  if(!dd)return;
  const q=inp.value.trim().toLowerCase();
  const matches=(q?FL_COUNTIES.filter(c=>c.toLowerCase().startsWith(q)):FL_COUNTIES).slice(0,4);
  if(!matches.length){dd.classList.remove('show');dd.innerHTML='';return;}
  dd.innerHTML=matches.map(c=>`<button type="button" class="county-combobox-item" onmousedown="event.preventDefault();selectCountyOption('${inp.id}','${c.replace(/'/g,"\\'")}')">${esc(c)}</button>`).join('');
  dd.classList.add('show');
}
function hideCountyDropdown(id){
  const dd=document.getElementById(id+'-dropdown');
  if(dd)dd.classList.remove('show');
}
// onmousedown+preventDefault on each item (above) stops the input's blur
// from firing before the click registers, the standard combobox trick —
// dispatching a real 'input' event here re-runs whatever write-expr this
// field was wired with in countyAutocompleteHTML() rather than duplicating
// that logic, and also re-triggers filterCountyDropdown(), which
// hideCountyDropdown() right after this correctly closes back up.
function selectCountyOption(id,county){
  const inp=document.getElementById(id);
  if(!inp)return;
  inp.value=county;
  inp.dispatchEvent(new Event('input',{bubbles:true}));
  hideCountyDropdown(id);
}

// Format Florida Bar Number — digits only, max 6 (Fla. Bar member numbers are 6-digit numeric IDs)
function formatBarNumber(s){
  return String(s||'').replace(/\D/g,'').slice(0,6);
}

// Format bank account number — digits only, max 17 (longest standard US bank account length)
function formatAccountNumber(s){
  return String(s||'').replace(/\D/g,'').slice(0,17);
}

// Format check number — digits only, max 10 (checks don't carry letters/dashes)
function formatCheckNumber(s){
  return String(s||'').replace(/\D/g,'').slice(0,10);
}

// Validate/format zip code to 5 digits (for combined City/State/Zip fields, extracts and validates zip)
// Capitalize first letter of each word (title case)
// Don't trim while typing — preserve spaces as user enters them
function formatName(s){
  const sanitized=validateSecurityInput('name',s);
  return sanitized.split(/(\s+)/).map(w=>w.match(/\s/) ? w : (w.charAt(0).toUpperCase()+w.slice(1).toLowerCase())).join('');
}

// Same as formatName for addresses/streets
function formatAddress(s){
  return formatName(s);
}

// Combined "City, State Zip" fields: capitalize city words, uppercase a
// 2-letter state abbreviation, and leave the zip digits untouched.
function formatCityStateZip(s){
  return String(s||'').split(/(\s+)/).map(w=>{
    if(w.match(/\s/)||w==='')return w;
    if(/^\d+$/.test(w))return w;
    if(/^[A-Za-z]{2}$/.test(w))return w.toUpperCase();
    return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();
  }).join('');
}

// Excel imports can carry all-lowercase (or all-caps) text. Walk the parsed
// data and apply the exact same per-field capitalization that manual typing
// already gets (see inpD/inpS/bindForms), keyed off the field name instead
// of a form label, so imported values match what typing them would produce.
function capitalizeImportedFields(obj){
  if(Array.isArray(obj)){
    obj.forEach(capitalizeImportedFields);
    return obj;
  }
  if(obj&&typeof obj==='object'){
    for(const k of Object.keys(obj)){
      const v=obj[k];
      if(typeof v!=='string'||!v){continue;}
      const kl=k.toLowerCase();
      if(kl.includes('email')){
        // leave as-is
      }else if(kl.includes('citystatezip')){
        obj[k]=formatCityStateZip(v);
      }else if(kl.includes('street')||(kl.includes('address'))){
        obj[k]=formatAddress(v);
      }else if(['name','payer','payee','lender','creditor','institution','guardian','attorney','trustee','claimant','description','bonding','company','trust'].some(w=>kl.includes(w))){
        obj[k]=formatName(v);
      }
    }
    for(const k of Object.keys(obj)){
      if(obj[k]&&typeof obj[k]==='object')capitalizeImportedFields(obj[k]);
    }
  }
  return obj;
}

// Limit digits in a City/State/Zip field to 9 (a 5-digit ZIP, or a full
// ZIP+4) -- was capped at 5, which silently mangled any ZIP+4 entry
// ("33756-4321" loses its last 4 digits mid-keystroke instead of just
// rejecting the extra ones cleanly).
function applyZipLimit(el){
  const digitCount=(el.value.match(/\d/g)||[]).length;
  if(digitCount>9){
    const arr=el.value.split('');
    let removed=0;
    for(let i=arr.length-1;i>=0&&removed<digitCount-9;i--){
      if(/\d/.test(arr[i])){arr.splice(i,1);removed++;}
    }
    el.value=arr.join('');
  }
}

// Update an input field with formatted phone, keeping user experience smooth
// Highlight form fields that have validation errors with red borders
// ═══════════════════════════════════════════════════════
// VALIDATION SUMMARY
// Every message from validate() reads "<Section> — <Field>", so it can be
// grouped instead of listed flat. Section prefixes map to wizard routes
// ("Cover"→/, "B-1 row 3"→/b1, "Part IV"→/p4, "Sch D2"→/schd2), which is
// what lets each group offer a jump link.
// ═══════════════════════════════════════════════════════
function errorRoute(section){
  const s=(section||'').trim();
  if(/^Cover/i.test(s))return '/';
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
  return null;
}
function validationPanel(errors,opts){
  opts=opts||{};
  const groups=new Map();
  errors.forEach(e=>{
    const str=String(e);
    const i=str.indexOf(' — ');
    const section=i>-1?str.slice(0,i).trim():'Other';
    let field=i>-1?str.slice(i+3).trim():str;
    field=field.replace(/\s+is required\.?$/i,'').replace(/\.$/,'');
    if(!groups.has(section))groups.set(section,[]);
    groups.get(section).push(field);
  });
  // Only offer a jump link when the route is a real page in this wizard.
  const valid=new Set((PAGES[activeInventoryType]||PAGES_GUARDIAN||[]).map(p=>p.id));
  const rows=[...groups.entries()].map(([section,fields])=>{
    const route=errorRoute(section);
    const go=(route&&valid.has(route))
      ? `<button type="button" class="validation-go" onclick="navigate('${route}')">Go to section ${ic('external',13)}</button>`
      : '';
    return `<div class="validation-group">
      <div class="validation-group-head">
        <span class="validation-group-name">${esc(section)}</span>
        <span class="validation-count">${fields.length}</span>
        ${go}
      </div>
      <div class="validation-fields">${fields.map(f=>`<span class="validation-field">${esc(f)}</span>`).join('')}</div>
    </div>`;
  }).join('');
  const n=errors.length;
  return `<div class="validation-panel no-print">
    <div class="validation-head">
      ${ic('alert',17)}
      <div>
        <div class="validation-title">${n} required field${n===1?'':'s'} still missing</div>
        <div class="validation-sub">${opts.subtitle||`Across ${groups.size} section${groups.size===1?'':'s'}, listed below. These must be completed before this ward can be exported.`}</div>
      </div>
    </div>
    <div class="validation-groups">${rows}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// PRINT-PREVIEW PAGER
// Shows one filing page at a time instead of a continuous scroll of all of
// them. Purely a viewing filter: exports and printing always operate on the
// complete set (see the !important rules under @media print and
// .pdf-export-mode, plus pvShowAll() called before every export).
// Labels are read back out of each page's own court header, so this works
// for all three inventory types without touching the three builders.
// ═══════════════════════════════════════════════════════
let _pvSelection='1'; // '1'-based page number, or 'all'

function pvPages(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return [];
  return [...cont.children].filter(el=>el.classList&&el.classList.contains('doc-page'));
}
function pvLabelFor(page,i){
  // docHeader() puts "<Schedule> — Page <n>" in the middle cell of .doc-meta.
  const meta=page.querySelector('.doc-meta');
  if(meta){
    const spans=meta.querySelectorAll('span');
    if(spans.length>=2){
      const t=spans[1].textContent.replace(/\s+/g,' ').trim();
      if(t)return t;
    }
  }
  const title=page.querySelector('.doc-schedule-title');
  if(title){
    const t=title.textContent.replace(/\s+/g,' ').trim();
    if(t)return t;
  }
  return 'Page '+(i+1);
}
// Drop the viewing filter so every page is in the layout. Called before any
// export or print, and by the "All pages" option.
function pvShowAll(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  cont.classList.remove('pv-single');
  pvPages().forEach(p=>p.classList.remove('pv-show'));
}
function pvApply(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  const pages=pvPages();
  if(_pvSelection==='all'||pages.length<2){pvShowAll();}
  else{
    let idx=parseInt(_pvSelection,10)-1;
    if(!(idx>=0&&idx<pages.length))idx=0;
    cont.classList.add('pv-single');
    pages.forEach((p,i)=>p.classList.toggle('pv-show',i===idx));
  }
  const sel=document.getElementById('pv-select');
  if(sel&&sel.value!==_pvSelection)sel.value=_pvSelection;
  const count=document.getElementById('pv-count');
  if(count){
    count.textContent=_pvSelection==='all'
      ? `All ${pages.length} pages`
      : `Page ${parseInt(_pvSelection,10)} of ${pages.length}`;
  }
  const prev=document.getElementById('pv-prev'),next=document.getElementById('pv-next');
  const n=parseInt(_pvSelection,10);
  if(prev)prev.disabled=(_pvSelection==='all'||n<=1);
  if(next)next.disabled=(_pvSelection==='all'||n>=pages.length);
}
function pvSelect(v){
  _pvSelection=v;
  pvApply();
  // .pv-bar is sticky (position:sticky;top), so it never has to be scrolled
  // into view — it's pinned at a fixed screen position no matter how tall
  // the page below it is, which is what makes Next/Prev clickable repeatedly
  // without moving the mouse. This just scrolls the new page's own content
  // to the top; #print-doc-container's scroll-margin-top keeps that top
  // edge from landing underneath the sticky bar.
  const cont=document.getElementById('print-doc-container');
  if(cont&&cont.scrollIntoView)cont.scrollIntoView({block:'start',behavior:'smooth'});
}
function pvStep(delta){
  const pages=pvPages();
  if(_pvSelection==='all')return;
  let n=parseInt(_pvSelection,10)+delta;
  n=Math.max(1,Math.min(pages.length,n));
  pvSelect(String(n));
}
function initPrintPager(){
  const cont=document.getElementById('print-doc-container');
  if(!cont)return;
  const pages=pvPages();
  if(pages.length<2)return;                       // nothing to page through
  if(document.getElementById('pv-bar'))return;    // already built this render
  if(!(_pvSelection==='all'||(parseInt(_pvSelection,10)>=1&&parseInt(_pvSelection,10)<=pages.length))){
    _pvSelection='1';
  }
  const opts=pages.map((p,i)=>
    `<option value="${i+1}">${i+1}. ${esc(pvLabelFor(p,i))}</option>`).join('');
  const bar=document.createElement('div');
  bar.id='pv-bar';
  bar.className='pv-bar no-print';
  bar.innerHTML=`
    <span class="pv-label">Viewing</span>
    <select id="pv-select" class="form-select form-select-sm pv-select"
            aria-label="Choose which page of the filing to preview"
            onchange="pvSelect(this.value)">
      ${opts}
      <option value="all">All pages (continuous)</option>
    </select>
    <span class="pv-count" id="pv-count"></span>
    <span class="pv-nav">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-prev" onclick="pvStep(-1)">← Prev</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-next" onclick="pvStep(1)">Next →</button>
    </span>`;
  cont.parentNode.insertBefore(bar,cont);
  pvApply();
}

function highlightErrors(errorMessages){
  // First, clear all previous error highlights
  document.querySelectorAll('.validation-error-field').forEach(el=>{
    el.classList.remove('validation-error-field');
  });

  // Then highlight fields matching each error message
  errorMessages.forEach(err=>{
    // Extract field name from error message (e.g., "Ward Name" from "Ward Name is required")
    const match=err.match(/^([^(]+?)\s+(?:is required|must be|cannot)/i);
    if(!match)return;
    const fieldName=match[1].toLowerCase().trim();

    // Find all labels and inputs that mention this field
    document.querySelectorAll('label, input, select, textarea').forEach(el=>{
      const text=el.textContent||el.placeholder||el.id||'';
      if(text.toLowerCase().includes(fieldName)){
        let target=el;
        if(el.tagName==='LABEL'){
          // Find the input associated with this label
          const labelFor=el.getAttribute('for');
          if(labelFor){
            target=document.getElementById(labelFor);
          }else{
            target=el.querySelector('input, select, textarea')||el.parentElement.querySelector('input, select, textarea');
          }
        }
        if(target&&['INPUT','SELECT','TEXTAREA'].includes(target.tagName)){
          target.classList.add('validation-error-field');
        }
      }
    });
  });
}

// Prevent negative values in number inputs (amount fields)
function enforceNonNegative(input) {
  if (input.type === 'number') {
    let val = input.value;
    // Remove any minus signs
    val = val.replace(/^-/, '');
    input.value = val;
  }
}

// Apply no-negative enforcement to all amount inputs
function setupAmountFieldValidation() {
  document.querySelectorAll('input[type="number"]').forEach(input => {
    const id = input.id || '';
    const name = input.name || '';
    const isAmountField = id.includes('amount') || id.includes('balance') || id.includes('price') ||
                          id.includes('starting') || id.includes('income') || id.includes('charge') ||
                          id.includes('tax') || id.includes('settlement') ||
                          name.includes('amount') || name.includes('balance') || name.includes('price');

    if (isAmountField) {
      input.min = '0';
      // Real-time validation as user types
      input.addEventListener('input', function() { enforceNonNegative(this); });
      input.addEventListener('change', function() { enforceNonNegative(this); });
      input.addEventListener('blur', function() { enforceNonNegative(this); });
    }
  });
}

// ═══════════════════════════════════════════════════════
// SECURITY: HMAC, VALIDATION, AUDIT LOGGING
// ═══════════════════════════════════════════════════════

// Compute HMAC-SHA256 of data using Web Crypto API
async function computeHMAC(data, key) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(typeof data === 'string' ? data : JSON.stringify(data));
  const keyBuffer = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify HMAC matches (returns true if valid, false otherwise)
// Audit logging wrapper — sends audit events to Rust backend
async function auditLog(eventType, details, success = true) {
  const invoke = tauriInvoke();
  if (invoke) {
    try {
      await invoke('audit_log', {event_type: eventType, details, success});
      return;
    } catch (e) {
      console.warn('Tauri audit_log failed, falling back to local log:', e);
    }
  }
  // Not running under Tauri (or the Tauri call failed) — log locally instead
  // of silently dropping the event, so DATA_EXPORT/DATA_IMPORT/UNLOCK_* etc.
  // are still recorded when running as a plain web app.
  try {
    await appendAuditLogEntry({timestamp: new Date().toISOString(), eventType, details, success});
  } catch (e) {
    console.warn('Audit log fallback failed:', e);
  }
}

// Strict input validation rules — rejects invalid inputs before save
// Validate date range: ensure from <= to
// ═══════════════════════════════════════════════════════
// ENCRYPTION AT REST (AES-256-GCM via the Web Crypto API)
// ═══════════════════════════════════════════════════════
// Every ward, and the guardian's own name/email, are encrypted before they
// touch disk — the .sav file and the Tauri filesystem autosave backup both
// only ever see ciphertext. The AES key is derived from a user-chosen master
// password via PBKDF2 and lives ONLY in memory for the session (`_cryptoKey`
// below); it is never written anywhere by default. Closing the app or
// clicking "Lock" forgets it, so the password must be re-entered next time.
//
// Optional recovery (desktop app only): the user may opt in to having the
// master password saved in the OS-level credential store (Windows Credential
// Manager, via the `keyring` Rust crate exposed as Tauri commands). That
// store is already gated by the OS login, so this doesn't introduce a new
// secret to protect — it ties recovery to the same security boundary that
// already protects the machine. If the user opts out, there is no recovery
// path if the password is lost — that's the deliberate fallback.
const PBKDF2_ITERATIONS=210000;
const CRYPTO_VERIFIER_PLAINTEXT='PG_VERIFIER_V1';
let _cryptoKey=null; // CryptoKey, set after unlock/create, cleared on lock

function _b64FromBytes(bytes){
  let bin='';
  bytes.forEach(b=>{bin+=String.fromCharCode(b);});
  return btoa(bin);
}
function _bytesFromB64(b64){
  const bin=atob(b64);
  const bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
  return bytes;
}

function generateSaltB64(){
  return _b64FromBytes(crypto.getRandomValues(new Uint8Array(16)));
}

// ── OS keychain (Tauri desktop only) ─────────────────────────────────────
// Wraps the `keychain_save` / `keychain_load` / `keychain_delete` Tauri
// commands (src-tauri/src/lib.rs), which store/retrieve the master password
// via the `keyring` crate — Windows Credential Manager on Windows, Keychain
// on macOS, Secret Service on Linux. Not available in the browser build.
function tauriInvoke(){
  return (window.__TAURI__&&window.__TAURI__.core&&window.__TAURI__.core.invoke)||null;
}
function hasKeychainSupport(){
  return !!tauriInvoke();
}
async function keychainSave(password){
  const invoke=tauriInvoke();
  if(!invoke)return false;
  try{await invoke('keychain_save',{password});return true;}
  catch(e){console.warn('keychain_save failed',e);return false;}
}
async function keychainLoad(){
  const invoke=tauriInvoke();
  if(!invoke)return null;
  try{return await invoke('keychain_load');}
  catch(e){console.warn('keychain_load failed',e);return null;}
}
async function keychainDelete(){
  const invoke=tauriInvoke();
  if(!invoke)return false;
  try{await invoke('keychain_delete');return true;}
  catch(e){console.warn('keychain_delete failed',e);return false;}
}

async function deriveKeyFromPassword(password,saltB64){
  const enc=new TextEncoder();
  const salt=_bytesFromB64(saltB64);
  const baseKey=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey(
    {name:'PBKDF2',salt,iterations:PBKDF2_ITERATIONS,hash:'SHA-256'},
    baseKey,
    {name:'AES-GCM',length:256},
    false,
    ['encrypt','decrypt']
  );
}

// Whether this install encrypts data at all — chosen once, at first setup,
// via promptChooseSecurityMode(). 'encrypted' (default/recommended) uses
// AES-256-GCM as below; 'none' stores plain JSON with no password gate.
// Loaded from appState at startup; see ensureUnlocked().
let _securityMode='encrypted'; // 'encrypted' | 'none'
const PLAIN_MODE_PREFIX='PLAIN:'; // self-describing tag, never produced by the
// iv:ciphertext base64 format below, so decrypt can tell the two apart
// unambiguously even if an archive mixes entries from both modes.

// Packs to a single transportable string: base64(iv) + ':' + base64(ciphertext).
// A fresh random IV is generated per call — required for AES-GCM safety (an IV
// must never be reused with the same key) — so identical plaintext encrypts
// differently every time this runs.
// In 'none' mode, skips encryption entirely and just tags the plain JSON —
// see the module-level comment on _securityMode above for why.
async function encryptJSON(value){
  if(_securityMode==='none')return PLAIN_MODE_PREFIX+JSON.stringify(value);
  if(!_cryptoKey)throw new Error('App is locked — no encryption key available');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const plaintext=new TextEncoder().encode(JSON.stringify(value));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},_cryptoKey,plaintext);
  return `${_b64FromBytes(iv)}:${_b64FromBytes(new Uint8Array(ciphertext))}`;
}

async function decryptJSON(packed){
  const s=String(packed);
  if(s.startsWith(PLAIN_MODE_PREFIX))return JSON.parse(s.slice(PLAIN_MODE_PREFIX.length));
  if(!_cryptoKey)throw new Error('App is locked — no encryption key available');
  const [ivB64,ctB64]=s.split(':');
  const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:_bytesFromB64(ivB64)},_cryptoKey,_bytesFromB64(ctB64));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// Legacy plaintext wards are handled by
// runLegacyBrowserStorageMigrationIfNeeded() before this unlock flow. The
// current recovery and launch-preference databases use separate names.

// Decides whether the user needs to create a master password (fresh install,
// or an existing pre-encryption install with plaintext wards) or unlock with
// one that's already set up, then blocks until a valid key is in memory.
// On the desktop build, if the password was previously saved to the OS
// keychain, this tries a silent auto-unlock before showing any UI at all —
// but only on app launch. A manual Lock click passes skipAutoUnlock=true so
// that locking always re-shows the prompt; otherwise, with "remember this
// password" on, Lock would silently re-unlock itself and appear to do
// nothing, defeating the point of a manual lock.
async function ensureUnlocked(skipAutoUnlock){
  if(!window.crypto||!window.crypto.subtle){
    document.getElementById('main-content').innerHTML=
      '<div style="max-width:520px;margin:3rem auto;text-align:center;color:var(--danger-text);">'
      +'<h2>Secure context required</h2>'
      +'<p>Encryption requires a secure context. Open this file directly (double-click '
      +'<code>index.html</code>) in Chrome or Edge, or serve it via <code>localhost</code> '
      +'(not a LAN IP) — a network address like <code>192.168.x.x</code> does not qualify.</p></div>';
    document.getElementById('sidebar').style.display='none';
    throw new Error('window.crypto.subtle unavailable (insecure context)');
  }
  // promptOpenOrStartAtLaunch() already ran by this point. If the user
  // opened an existing case file, loadCaseFileAtLaunch() already asked for
  // (and verified) its password — _launchStateResolved says so, and this
  // is skipped entirely rather than asking a second time. If they started
  // a new case instead, nothing was resolved and this proceeds exactly as
  // it always has for a fresh install.
  if(_launchStateResolved){
    _launchStateResolved=false; // consume once — a later lockApp() must go through the normal flow below
    updateLockButtonVisibility();
    resetAutoLockTimer();
    return;
  }
  const storedMode=await loadAppState('securityMode');
  const salt=await loadAppState('cryptoSalt');
  const verifier=await loadAppState('cryptoVerifier');

  if(!storedMode&&!(salt&&verifier)){
    // No mode has been selected. A ward can already be present only when an
    // older .sav file omitted securityMode; otherwise this is a new case.
    _securityMode=await promptChooseSecurityMode();
    await saveAppState('securityMode',_securityMode); // stored in the
    // clear, like cryptoSalt — must be readable before any password exists
    if(_securityMode==='none'){
      updateLockButtonVisibility();
      return; // no password, no encryption key, nothing further to do
    }
    await promptCreatePassword(guardianData.wards.length>0);
    updateLockButtonVisibility();
    return;
  }

  // Mode already chosen previously — or this is a pre-existing encrypted
  // install from before this feature existed (salt+verifier present with no
  // explicit mode saved yet): treat that case as 'encrypted' for backward
  // compatibility rather than re-asking.
  _securityMode=storedMode||(salt&&verifier?'encrypted':'none');
  updateLockButtonVisibility();

  if(_securityMode==='none')return; // no password gate at all

  if(salt&&verifier){
    if(!skipAutoUnlock&&hasKeychainSupport()){
      const savedPw=await keychainLoad();
      if(savedPw){
        try{
          const key=await deriveKeyFromPassword(savedPw,salt);
          _cryptoKey=key;
          const decoded=await decryptJSON(verifier);
          if(decoded===CRYPTO_VERIFIER_PLAINTEXT){resetAutoLockTimer();return;} // silent auto-unlock succeeded
        }catch(e){/* fall through to manual prompt */}
        _cryptoKey=null;
      }
    }
    await promptUnlock(salt,verifier);
    return;
  }
  await promptCreatePassword(guardianData.wards.length>0);
}

let _securityChoiceResolve=null;
function promptChooseSecurityMode(){
  return new Promise((resolve)=>{
    _securityChoiceResolve=resolve;
    document.getElementById('security-choice-overlay').classList.add('show');
  });
}
function selectSecurityMode(mode){
  document.getElementById('security-choice-overlay').classList.remove('show');
  const resolve=_securityChoiceResolve;_securityChoiceResolve=null;
  if(resolve)resolve(mode);
}

// The Lock button is meaningless with no password to re-enter — hide it in
// 'none' mode so users can't confuse themselves clicking it.
function updateLockButtonVisibility(){
  const btn=document.getElementById('lock-app-btn');
  if(btn)btn.style.display=_securityMode==='none'?'none':'';
}

let _unlockResolve=null;
let _unlockMode=null; // 'create' | 'unlock'

async function promptUnlock(saltB64,verifierPacked){
  const keychainAvailable=hasKeychainSupport();
  const hasSavedPw=keychainAvailable&&!!(await keychainLoad());
  return new Promise((resolve)=>{
    _unlockMode='unlock';
    _unlockResolve=resolve;
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent='Unlock Probate Guardian';
    document.getElementById('unlock-subtitle').textContent='Enter your master password to decrypt your case data.';
    document.getElementById('unlock-confirm-row').style.display='none';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-error').style.display='none';
    const rememberRow=document.getElementById('unlock-remember-row');
    rememberRow.style.display=keychainAvailable?'block':'none';
    document.getElementById('unlock-remember-checkbox').checked=hasSavedPw;
    overlay.dataset.salt=saltB64;
    overlay.dataset.verifier=verifierPacked;
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

// Same overlay, a different question: not "unlock THIS device's data" but
// "what's the password for the file you just picked". Kept separate from
// promptUnlock() rather than reusing its verifier-equality check, because a
// version-1 .sav file has no dedicated verifier field to compare
// against — see deriveAndVerifyKey(), which this delegates the actual
// check to via the 'openFile' branch of submitUnlockForm(). remember-me/
// keychain is hidden: this password belongs to the file, not necessarily
// to this device's own install.
let _pendingOpenManifest=null,_pendingOpenZip=null;
function promptPasswordForFile(manifest,zip){
  return new Promise((resolve)=>{
    _unlockMode='openFile';
    _unlockResolve=resolve;
    _pendingOpenManifest=manifest;
    _pendingOpenZip=zip;
    // This can fire while #startup-choice-overlay is still up (its own
    // z-index is higher, since it's normally hidden by the time any later
    // overlay shows) -- opening a file is the one path where that hasn't
    // happened yet, since _resolveStartupChoice() only runs once
    // loadCaseFileAtLaunch() fully succeeds, i.e. after this password is
    // entered. Left showing, it would sit on top and silently swallow every
    // click meant for the password field below. Hiding it here is safe: this
    // flow has no "go back" from an in-progress file open.
    document.getElementById('startup-choice-overlay').classList.remove('show');
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent='Enter Password';
    document.getElementById('unlock-subtitle').textContent='This case file is encrypted. Enter the master password it was saved under.';
    document.getElementById('unlock-confirm-row').style.display='none';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-error').style.display='none';
    document.getElementById('unlock-remember-row').style.display='none';
    overlay.dataset.salt=manifest.salt||'';
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

function promptCreatePassword(hasExistingData){
  return new Promise((resolve)=>{
    _unlockMode='create';
    _unlockResolve=resolve;
    const overlay=document.getElementById('unlock-overlay');
    document.getElementById('unlock-title').textContent=hasExistingData?'Secure Your Existing Data':'Create a Master Password';
    document.getElementById('unlock-subtitle').textContent=hasExistingData
      ?'This app now encrypts case data at rest. Choose a master password — your existing wards will be encrypted with it.'
      :'Choose a master password to encrypt all case data stored on this device.';
    document.getElementById('unlock-confirm-row').style.display='';
    document.getElementById('unlock-password').value='';
    document.getElementById('unlock-password-confirm').value='';
    document.getElementById('unlock-error').style.display='none';
    const rememberRow=document.getElementById('unlock-remember-row');
    rememberRow.style.display=hasKeychainSupport()?'block':'none';
    document.getElementById('unlock-remember-checkbox').checked=false;
    overlay.classList.add('show');
    document.getElementById('unlock-password').focus();
  });
}

function showUnlockError(msg){
  const el=document.getElementById('unlock-error');
  el.textContent=msg;
  el.style.display='block';
}

// Rate-limits guesses at the unlock screen itself. This doesn't stop an
// offline attacker who copies the encrypted files and brute-forces them
// outside the app (PBKDF2's 210k iterations is the only defense against
// that) — it stops someone with physical access to a locked screen from
// just sitting there trying passwords one after another through the UI.
// The counter lives in _appState and is included in the next .sav write or
// temporary recovery snapshot.
const UNLOCK_FAIL_THRESHOLD=5;
const UNLOCK_LOCKOUT_BASE_MS=30*1000;
const UNLOCK_LOCKOUT_MAX_MS=5*60*1000;

async function getUnlockFailState(){
  const state=await loadAppState('unlockFailState');
  return state||{count:0,lockoutUntil:0};
}
async function saveUnlockFailState(state){
  await saveAppState('unlockFailState',state);
}
function formatLockoutRemaining(ms){
  const s=Math.ceil(ms/1000);
  return s>=60?`${Math.ceil(s/60)} minute${s>=120?'s':''}`:`${s} second${s===1?'':'s'}`;
}

async function submitUnlockForm(){
  const btn=document.getElementById('unlock-submit-btn');
  const pw=document.getElementById('unlock-password').value;
  const remember=document.getElementById('unlock-remember-checkbox').checked;
  btn.disabled=true;
  try{
    if(_unlockMode==='create'){
      const confirmPw=document.getElementById('unlock-password-confirm').value;
      if(!pw||pw.length<8){showUnlockError('Password must be at least 8 characters.');return;}
      if(pw!==confirmPw){showUnlockError('Passwords do not match.');return;}
      const saltB64=generateSaltB64();
      _cryptoKey=await deriveKeyFromPassword(pw,saltB64);
      const verifier=await encryptJSON(CRYPTO_VERIFIER_PLAINTEXT);
      await saveAppState('cryptoSalt',saltB64);
      await saveAppState('cryptoVerifier',verifier);
      await auditLog('PASSWORD_CREATED', 'Master password created', true);
      if(remember){await keychainSave(pw);}else{await keychainDelete();}
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='unlock'){
      const overlay=document.getElementById('unlock-overlay');
      const saltB64=overlay.dataset.salt;
      const verifierPacked=overlay.dataset.verifier;
      if(!pw){showUnlockError('Please enter your password.');return;}

      const failState=await getUnlockFailState();
      const now=Date.now();
      if(failState.lockoutUntil>now){
        showUnlockError(`Too many incorrect attempts. Try again in ${formatLockoutRemaining(failState.lockoutUntil-now)}.`);
        return;
      }

      try{
        _cryptoKey=await deriveKeyFromPassword(pw,saltB64);
        const decoded=await decryptJSON(verifierPacked);
        if(decoded!==CRYPTO_VERIFIER_PLAINTEXT)throw new Error('verifier mismatch');
      }catch(e){
        _cryptoKey=null;
        const newCount=failState.count+1;
        let lockoutUntil=0;
        await auditLog('UNLOCK_FAILED', `Incorrect password attempt ${newCount}`, false);
        if(newCount>=UNLOCK_FAIL_THRESHOLD){
          const backoffMs=Math.min(UNLOCK_LOCKOUT_BASE_MS*Math.pow(2,newCount-UNLOCK_FAIL_THRESHOLD),UNLOCK_LOCKOUT_MAX_MS);
          lockoutUntil=now+backoffMs;
          await saveUnlockFailState({count:newCount,lockoutUntil});
          await auditLog('UNLOCK_LOCKOUT', `Account locked after ${newCount} failed attempts`, false);
          showUnlockError(`Incorrect password. Too many attempts — try again in ${formatLockoutRemaining(backoffMs)}.`);
        }else{
          await saveUnlockFailState({count:newCount,lockoutUntil:0});
          showUnlockError('Incorrect password. Please try again.');
        }
        return;
      }

      await saveUnlockFailState({count:0,lockoutUntil:0});
      await auditLog('UNLOCK_SUCCESS', 'User successfully unlocked the application', true);
      if(remember){await keychainSave(pw);}else{await keychainDelete();}
      resetAutoLockTimer();
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }else if(_unlockMode==='openFile'){
      if(!pw){showUnlockError('Please enter your password.');return;}
      try{
        _cryptoKey=await deriveAndVerifyKey(pw,_pendingOpenManifest,_pendingOpenZip);
      }catch(e){
        _cryptoKey=null;
        showUnlockError('Incorrect password for this file.');
        return;
      }
      _pendingOpenManifest=null;_pendingOpenZip=null;
      document.getElementById('unlock-overlay').classList.remove('show');
      const resolve=_unlockResolve;_unlockResolve=null;
      resolve();
    }
  }finally{
    btn.disabled=false;
  }
}

document.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'&&document.getElementById('unlock-overlay')?.classList.contains('show')){
    e.preventDefault();
    submitUnlockForm();
  }
});

// Flushes pending work, clears the key and decrypted case data from memory,
// then requires the password again. After unlock, this flow reloads from the
// open .sav handle; with no handle yet, it falls back to the temporary
// session-recovery cache flushPendingSave() just wrote (same password means
// same derived key, so it decrypts with the key ensureUnlocked() produces).
async function lockApp(){
  if(_autoLockTimer){clearTimeout(_autoLockTimer);_autoLockTimer=null;}
  await flushPendingSave();
  const handle=_zipFileHandle; // read again after re-unlocking, once _cryptoKey exists again
  _cryptoKey=null;
  guardianData={guardianName:'',guardianEmail:'',wards:[],activeWardId:null};
  window.D={};
  activeInventoryType=null;
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main-content').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);">Locked</div>';
  await ensureUnlocked(true);
  if(handle){
    // Rebuild memory from the open .sav file now that the key is available.
    try{
      const file=await handle.getFile();
      const zip=await JSZip.loadAsync(file);
      const manifestEntry=zip.file('manifest.json');
      if(manifestEntry){
        const manifest=JSON.parse(await manifestEntry.async('string'));
        await loadStateFromSavZip(zip,manifest,_cryptoKey);
      }
    }catch(e){console.error('Could not reload case data after unlocking',e);}
  }else{
    // No .sav has ever been saved for this case, so the only place this
    // data can come from is the recovery cache saved just above.
    try{
      const cache=await _sessionCacheGet();
      if(cache&&Array.isArray(cache.wards)&&cache.wards.length){
        const restoredWards=[];
        for(const w of cache.wards){
          const ward=sanitizeObjectData(await decryptJSONWithKey(w.enc,_cryptoKey));
          if(ward&&ward.wardId)restoredWards.push(ward);
        }
        if(restoredWards.length){
          const g=await decryptJSONWithKey(cache.guardian,_cryptoKey);
          guardianData.wards=restoredWards;
          guardianData.guardianName=(g&&g.guardianName)||'';
          guardianData.guardianEmail=(g&&g.guardianEmail)||'';
          guardianData.activeWardId=cache.activeWardId||restoredWards[0].wardId;
        }
      }
    }catch(e){console.error('Could not reload case data from the recovery cache after unlocking',e);}
  }
  await loadGuardianData();
  const activeWard=getActiveWard();
  if(activeWard){
    window.D=activeWard;
    activeInventoryType=activeWard.inventoryType;
  }
  updateSidebar();
  handleHash();
}

// Auto-lock after inactivity: an unattended-but-unlocked app is the
// weakest point in encryption-at-rest, since "remember password" now makes
// it easy to leave the app open indefinitely. Any of the listed activity
// events pushes the timeout back out; if none occur for AUTO_LOCK_MS while
// unlocked, the app locks itself exactly as if the user clicked Lock.
const AUTO_LOCK_MS=15*60*1000;
let _autoLockTimer=null;
function resetAutoLockTimer(){
  if(_autoLockTimer)clearTimeout(_autoLockTimer);
  if(!_cryptoKey)return;
  _autoLockTimer=setTimeout(()=>{if(_cryptoKey)lockApp();},AUTO_LOCK_MS);
}
['mousemove','mousedown','keydown','scroll','touchstart'].forEach(evt=>{
  document.addEventListener(evt,resetAutoLockTimer,{passive:true});
});

// ═══════════════════════════════════════════════════════
// IN-MEMORY STATE OPERATIONS
// Compatibility facade for the former IndexedDB store API. Wards, settings,
// templates, and audit entries remain in memory here; saveData() writes the
// authoritative .sav file and manages the separate recovery snapshot.
// ═══════════════════════════════════════════════════════

async function saveWardToState(ward){
  if(!ward)return false;
  ward.lastModified=new Date().toISOString();
  // The ward is already live in guardianData; schedule persistence.
  autoSave();
  return true;
}

async function loadWardsFromState(){
  // Opening or restoring a case populates this in-memory collection.
  return guardianData.wards;
}

async function deleteWardFromState(wardId){
  // deleteWard() already updates the live array; schedule persistence.
  autoSave();
  return true;
}

async function saveAppState(key,value){
  _appState[key]=value;
  autoSave();
  return true;
}

async function loadAppState(key){
  return (key in _appState)?_appState[key]:null;
}

async function saveTemplate(type,b64){
  _templateCache[type]=b64;
  autoSave();
  return true;
}

async function loadTemplate(type){
  return _templateCache[type]||null;
}

// In memory, entries are kept unencrypted, on purpose, the same way the old
// IDB store held them: a failed-unlock attempt has to be logged before any
// password has been verified, so no encryption key can be assumed to exist
// yet. That's only true of memory, though — by the time any of this reaches
// a .sav file, a real save is happening, which (see saveData()'s own guard)
// cannot happen at all in 'encrypted' mode without _cryptoKey already set.
// buildExportZipBlob() encrypts the whole log at that point, same as
// appState, rather than leaving ward names and other case details sitting
// in plaintext inside a file this app actively encourages emailing and
// copying around. Deliberately does NOT call autoSave() itself:
// writeArchiveToHandle() logs its own DATA_EXPORT entry as part of every
// save, and having that schedule another save would loop forever, one save
// always triggering the next. An entry logged for any other reason rides
// along in whatever save happens next instead — exactly as independent of
// the ward-edit debounce as the old IDB store's own audit log always was.
async function appendAuditLogEntry(entry){
  entry.id=_auditLogNextId++;
  _auditLogEntries.push(entry);
  return true;
}

async function loadAuditLogEntries(){
  return _auditLogEntries;
}

// ═══════════════════════════════════════════════════════
// ACTIVITY LOG — VIEWER
// auditLog()/appendAuditLogEntry() have recorded every unlock, backup, and
// restore since the app's earliest versions, but nothing ever displayed the
// result — it was write-only. This is the read side: a page a guardian can
// open to answer "did my backup actually save?" or to show a record of
// diligence if their recordkeeping is ever questioned.
// ═══════════════════════════════════════════════════════
const ACTIVITY_EVENT_META={
  PASSWORD_CREATED: {label:'Master password created', iconName:'shield'},
  UNLOCK_SUCCESS:   {label:'Unlocked',                 iconName:'unlock'},
  UNLOCK_FAILED:    {label:'Failed unlock attempt',    iconName:'lock'},
  UNLOCK_LOCKOUT:   {label:'Locked out after repeated failures', iconName:'lock'},
  DATA_EXPORT:      {label:'Backup saved',             iconName:'download'},
  DATA_IMPORT:      {label:'Backup restored',          iconName:'upload'},
};
let _activityLogEntries=[]; // newest-first, loaded once per page visit
const ACTIVITY_LOG_RENDER_CAP=300; // safety cap on DOM rows, not on what's exported

async function loadAndRenderActivityLog(){
  const raw=await loadAuditLogEntries();
  // Sort by the in-memory monotonic id; timestamps can collide within one
  // millisecond and are therefore not a reliable ordering key.
  _activityLogEntries=raw.slice().sort((a,b)=>(b.id||0)-(a.id||0));
  renderActivityLogList();
  renderStorageReadout();
}

// Reports the authoritative .sav file and last-save status. Temporary
// recovery storage is intentionally not presented as a durable backup.
async function renderStorageReadout(){
  const host=document.getElementById('storage-usage-readout');
  if(!host)return;
  if(!_zipFileHandle){
    host.textContent='No case file is open this session. Use "Open Data File (.sav)" to resume auto-save, or "Save Data File (.sav)" to start one.';
    return;
  }
  const fileName=_zipFileHandle.name||'your .sav file';
  const savedNote=_lastExportAt
    ? `last saved ${formatRelativeTime(_lastExportAt)}`
    : 'not saved yet this session';
  host.innerHTML=`${ic('chart',14)} <strong>${esc(fileName)}</strong> — ${_autoSaveArmed?'auto-save is on':'auto-save needs one manual save to re-arm'}, ${esc(savedNote)}.`;
}

function activityLogFiltered(){
  const q=(document.getElementById('activity-log-search')?.value||'').trim().toLowerCase();
  const status=document.getElementById('activity-log-status')?.value||'all';
  const type=document.getElementById('activity-log-type')?.value||'all';
  return _activityLogEntries.filter(e=>{
    if(status==='success'&&!e.success)return false;
    if(status==='failed'&&e.success)return false;
    if(type!=='all'&&e.eventType!==type)return false;
    if(q&&!(String(e.details||'').toLowerCase().includes(q)||String(e.eventType||'').toLowerCase().includes(q)))return false;
    return true;
  });
}

function renderActivityLogList(){
  const host=document.getElementById('activity-log-rows');
  const countEl=document.getElementById('activity-log-count');
  if(!host)return;
  const filtered=activityLogFiltered();
  if(countEl){
    countEl.textContent=filtered.length===_activityLogEntries.length
      ? `${_activityLogEntries.length} event${_activityLogEntries.length===1?'':'s'}`
      : `${filtered.length} of ${_activityLogEntries.length} events`;
  }
  if(!filtered.length){
    host.innerHTML=`<div class="dashboard-empty-inline">${_activityLogEntries.length?'No events match this filter.':'No activity recorded yet.'}</div>`;
    return;
  }
  const shown=filtered.slice(0,ACTIVITY_LOG_RENDER_CAP);
  host.innerHTML=shown.map(e=>{
    const meta=ACTIVITY_EVENT_META[e.eventType]||{label:e.eventType||'Event',iconName:'file'};
    const when=formatActivityTimestamp(e.timestamp);
    return `<div class="activity-row${e.success?'':' activity-row-failed'}">
      <span class="activity-row-icon">${ic(meta.iconName,16)}</span>
      <div class="activity-row-body">
        <div class="activity-row-head">
          <span class="activity-row-label">${esc(meta.label)}</span>
          <span class="activity-row-time">${esc(when)}</span>
        </div>
        <div class="activity-row-details">${esc(e.details||'')}</div>
      </div>
    </div>`;
  }).join('');
  if(filtered.length>ACTIVITY_LOG_RENDER_CAP){
    host.innerHTML+=`<div class="activity-log-truncated">Showing the most recent ${ACTIVITY_LOG_RENDER_CAP} of ${filtered.length} matching events. Narrow the filter above, or use "Save as text file" to export all of them.</div>`;
  }
}

function formatActivityTimestamp(iso){
  const d=new Date(iso);
  if(isNaN(d))return iso||'';
  return d.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
}

// Exports whatever the current filter shows, not always the full log — the
// file's own header states the filter that was applied, so a partial export
// can't be mistaken for the complete record.
async function exportActivityLog(){
  const filtered=activityLogFiltered();
  const status=document.getElementById('activity-log-status')?.value||'all';
  const type=document.getElementById('activity-log-type')?.value||'all';
  const q=(document.getElementById('activity-log-search')?.value||'').trim();
  const filterParts=[];
  if(status!=='all')filterParts.push('status='+status);
  if(type!=='all')filterParts.push('event='+type);
  if(q)filterParts.push('search="'+q+'"');
  const lines=[
    'Probate Guardian — Activity Log',
    'Exported: '+new Date().toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}),
    'Filter: '+(filterParts.length?filterParts.join(', '):'none (all events)'),
    'Events: '+filtered.length,
    '',
  ];
  filtered.forEach(e=>{
    const meta=ACTIVITY_EVENT_META[e.eventType]||{label:e.eventType||'Event'};
    lines.push(`[${formatActivityTimestamp(e.timestamp)}] ${e.success?'OK':'FAILED'} — ${meta.label} — ${e.details||''}`);
  });
  const blob=new Blob([lines.join('\n')],{type:'text/plain'});
  try{
    await saveBlobAs(blob,'ProbateGuardian_ActivityLog_'+new Date().toISOString().slice(0,10)+'.txt');
  }catch(e){
    if(e&&e.name==='AbortError')return;
    console.error('Activity log export failed',e);
    alert('Export failed: '+(e&&e.message||e));
  }
}

function pageActivityLog(){
  const typeOptions=Object.keys(ACTIVITY_EVENT_META).map(k=>
    `<option value="${k}">${esc(ACTIVITY_EVENT_META[k].label)}</option>`).join('');
  return `<div class="schedule-page">
    <h1>Activity Log</h1>
    <div class="schedule-instructions">A record of security-relevant events on this device — unlocks, failed password attempts, and every backup saved or restored. Nothing here is transmitted anywhere; it's stored the same way your case data is, on this device only.</div>
    <div id="storage-usage-readout" class="storage-readout">Checking storage…</div>
    <div class="activity-log-toolbar">
      <span class="dashboard-search-wrap activity-log-search-wrap">${ic('search',15)}<input type="text" id="activity-log-search" class="form-control form-control-sm dashboard-search-input" placeholder="Search details…" oninput="renderActivityLogList()"></span>
      <select id="activity-log-status" class="form-select form-select-sm activity-log-select" onchange="renderActivityLogList()">
        <option value="all">All results</option>
        <option value="success">Successful only</option>
        <option value="failed">Failed only</option>
      </select>
      <select id="activity-log-type" class="form-select form-select-sm activity-log-select" onchange="renderActivityLogList()">
        <option value="all">All event types</option>
        ${typeOptions}
      </select>
      <button class="btn btn-sm btn-outline-primary" onclick="exportActivityLog()">${ic('download',14)} Save as text file</button>
    </div>
    <div class="activity-log-count" id="activity-log-count"></div>
    <div id="activity-log-rows" class="activity-log-rows"><div class="dashboard-empty-inline">Loading…</div></div>
  </div>`;
}

async function autoSave(){
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  if(_saveTimer)clearTimeout(_saveTimer);
  _saveTimer=setTimeout(()=>{_saveTimer=null;saveData();},1000);
}

// Cancels any pending debounced save and saves the CURRENTLY active ward
// immediately. Must be called before reassigning activeWardId/window.D —
// otherwise a save scheduled for the old ward fires after the switch and
// silently writes the new ward's data instead, losing the old edit.
async function flushPendingSave(){
  if(_saveTimer){
    clearTimeout(_saveTimer);
    _saveTimer=null;
  }
  await saveData();
}

function showSaveError(){
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='block';
}
function hideSaveError(){
  const el=document.getElementById('save-error-banner');
  if(el)el.style.display='none';
}

// Show the error banner only after consecutive failures; a single file or
// permission error may be transient.
let _consecutiveSaveFailures=0;
const SAVE_FAILURE_THRESHOLD=2;

// Captures dirty state in the temporary recovery cache, then rewrites the
// complete .sav archive when a writable handle is available. No open handle
// is a normal pre-save state, not an error.
async function saveData(){
  // Nothing should be persisted while the app is locked — there's no
  // encryption key to write with. This isn't a failure (e.g. autoSave()
  // debounced from an edit made right before auto-lock kicked in), so it
  // must not trip the save-error banner the way an actual write problem would.
  if(_securityMode==='encrypted'&&!_cryptoKey)return;
  const activeWard=getActiveWard();
  if(activeWard){
    activeWard.lastModified=new Date().toISOString();
    autosaveWardToFile(activeWard); // Tauri-only best-effort backup; no-op in the browser build
  }
  // Best-effort recovery snapshot for dirty data; successful .sav writes
  // clear it. See SESSION-RESTORE CACHE. Awaited so callers that depend on
  // it having landed before acting further (lockApp() wiping memory,
  // beforeunload) aren't racing an in-flight IndexedDB write.
  if(_dirtySinceExport)await saveSessionRestoreCache();
  const handle=_zipFileHandle;
  if(!handle)return; // nothing open to write to yet — see the function comment above
  try{
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){
      refreshAutoSaveArmedStatus(); // needs a user gesture to re-grant; surfaced, not fatal
      return;
    }
    await writeArchiveToHandle(handle,true);
    _consecutiveSaveFailures=0;
    hideSaveError();
  }catch(e){
    console.error('save failed',e);
    _consecutiveSaveFailures++;
    if(_consecutiveSaveFailures>=SAVE_FAILURE_THRESHOLD)showSaveError();
  }
}

// State is already populated by .sav load, session recovery, or new-case
// defaults. Retained as an async compatibility check for initApp().
async function loadGuardianData(){
  return guardianData.wards.length>0||!!guardianData.guardianName;
}

function getActiveWard(){
  if(!guardianData.activeWardId)return null;
  return guardianData.wards.find(w=>w.wardId===guardianData.activeWardId);
}

// ═══════════════════════════════════════════════════════
// EXPORT / IMPORT — guardianshipwarddata.sav
// One portable archive holding the guardian info plus every ward. The file
// is actually a ZIP under the hood (same trick as .docx/.xlsx), just saved
// with a .sav extension instead of .zip.
// The ZIP container itself is NOT password-protected (ZipCrypto is weak);
// instead each entry is AES-256-GCM ciphertext, so opening the zip in any
// tool shows only unreadable .enc entries, and GCM's auth tag makes any
// outside edit (accidental or otherwise) fail loudly on import instead of
// loading corrupted data.
// ═══════════════════════════════════════════════════════

// decryptJSON() uses the in-memory key; this variant takes an explicit key so
// an archive exported under a DIFFERENT install (different salt) can still be
// opened by re-deriving its key from that archive's password + embedded salt.
async function decryptJSONWithKey(packed,key){
  const s=String(packed);
  if(s.startsWith(PLAIN_MODE_PREFIX))return JSON.parse(s.slice(PLAIN_MODE_PREFIX.length));
  const [ivB64,ctB64]=s.split(':');
  const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:_bytesFromB64(ivB64)},key,_bytesFromB64(ctB64));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// Save As dialog where supported (Chrome/Edge); plain Downloads-folder
// download elsewhere (Firefox/Safari have no showSaveFilePicker).
// Returns the FileSystemFileHandle used (so it can be remembered for silent
// re-writes later), or null when falling back to a plain Downloads-folder
// download (no handle exists in that path).
async function saveBlobAs(blob,suggestedName){
  if(window.showSaveFilePicker){
    try{
      const handle=await showSaveFilePicker({
        suggestedName,
        types:[{description:'Probate Guardian data file',accept:{'application/octet-stream':['.sav']}}]
      });
      const writable=await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle;
    }catch(e){
      if(e&&e.name==='AbortError')throw e; // user cancelled the Save As dialog
      // Some embedded/webview browser contexts (e.g. VS Code's Simple Browser)
      // let showSaveFilePicker resolve but then refuse createWritable's actual
      // write permission. Fall back to a plain Downloads-folder download
      // instead of failing the export outright.
      console.warn('showSaveFilePicker/createWritable unavailable in this context, falling back to download link',e);
    }
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=suggestedName;
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  return null;
}

// The active handle lives in memory and is also saved in pg-launch-pref when
// supported. A later launch may reuse it if the browser still grants access;
// write permission can still require a fresh user gesture.
let _zipFileHandle=null;
async function rememberZipHandle(handle){
  _zipFileHandle=handle;
  savePersistedZipHandle(handle); // best-effort; a failed write just means next launch shows the picker again
  refreshAutoSaveArmedStatus();
}
async function loadZipHandle(){
  return _zipFileHandle;
}

// True when a background write can happen with no user interaction: a file
// handle is known AND the browser still grants write permission on it.
let _autoSaveArmed=false;
async function refreshAutoSaveArmedStatus(){
  let armed=false;
  try{
    const handle=await loadZipHandle();
    if(handle&&handle.queryPermission){
      armed=(await handle.queryPermission({mode:'readwrite'}))==='granted';
    }
  }catch(e){/* treat as not armed */}
  _autoSaveArmed=armed;
  const el=document.getElementById('auto-save-armed-indicator');
  if(el){
    const fileName=_zipFileHandle&&_zipFileHandle.name;
    if(armed){
      el.textContent=fileName?`Auto-save: ready ✓ (${fileName})`:'Auto-save: ready ✓';
      el.style.color='var(--ok-text)';
    }else if(_zipFileHandle){
      el.textContent=`Auto-save: click Save Backup once to re-enable (${fileName})`;
      el.style.color='var(--warn-text)';
    }else if(window.showSaveFilePicker){
      el.textContent='Auto-save: needs one manual save first';
      el.style.color='var(--ink-3)';
    }else{
      // Firefox/Safari: there is no writable handle this browser can grant at
      // all, ever — say so plainly instead of implying one manual save away.
      el.textContent='Auto-save: not available in this browser — use Save/Export before closing this tab';
      el.style.color='var(--warn-text)';
    }
  }
}

// FORMAT_VERSION 2: the .sav file grew from "wards + guardian name/email"
// into the app's only persistence, so it now also carries everything that
// used to be its own IndexedDB store (appState, cached templates, the
// audit log) plus what it takes to unlock the file without any other state
// already in memory (securityMode, salt, verifier — see
// loadStateFromSavZip()). Reading stays backward-compatible with a version-1
// file: those fields are simply absent, and every reader below treats an
// absent field as "not set" rather than failing. version bumps again the
// next time the shape of this manifest changes in a way a reader needs to
// know about going in, before it's touched a single byte of the ward data.
const SAV_FORMAT_VERSION=2;

async function buildExportZipBlob(){
  // Cancel (not flush) any pending debounce: guardianData/_appState/etc. are
  // already the live, current, in-memory state by the time this runs — there
  // is nothing separate to flush INTO memory the way there was when
  // IndexedDB lagged behind it. flushPendingSave() would call saveData(),
  // which calls writeArchiveToHandle(), which calls back into this very
  // function — an infinite loop. Clearing the timer directly just avoids a
  // redundant follow-up write of the same state a moment later.
  if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
  // The salt is embedded so the archive is portable to a fresh install: it's
  // needed (along with the password) to re-derive the key there. A salt is
  // not a secret — 'none'-mode installs never generate one, hence the null.
  const salt=(await loadAppState('cryptoSalt'))||null;
  const verifier=(await loadAppState('cryptoVerifier'))||null;
  const zip=new JSZip();
  const wardIndex=[];
  for(const ward of guardianData.wards){
    const file=`wards/${ward.wardId}.enc`;
    zip.file(file,await encryptJSON(ward));
    wardIndex.push({wardId:ward.wardId,file});
  }
  // Everything appState used to hold except the three fields above (which
  // need to be readable before any password is entered) and the guardian's
  // own name/email (kept as their own top-level `guardian` field, matching
  // the version-1 shape exactly, since existing readers already expect it
  // there). zipFileHandle is deliberately excluded — a FileSystemFileHandle
  // isn't JSON-serializable and re-opening this very file is what would
  // reconstruct it anyway.
  const appStateBlob={
    activeWardId:guardianData.activeWardId,
    theme:await loadAppState('theme'),
    walkthroughCompleted:await loadAppState('walkthroughCompleted'),
    firstLaunchSeen:await loadAppState('firstLaunchSeen'),
    continuePromptShown:await loadAppState('continuePromptShown'),
    recentWards:await loadAppState('recentWards'),
    autoExportIntervalMinutes:_autoExportIntervalMinutes,
    lastExportAt:_lastExportAt,
    unlockFailState:await loadAppState('unlockFailState')
  };
  const templateTypes=Object.keys(_templateCache).filter(t=>_templateCache[t]);
  for(const type of templateTypes){
    zip.file(`templates/${type}.b64`,_templateCache[type]);
  }
  // Encrypted here even though it's kept plain in memory (see
  // appendAuditLogEntry()'s comment) — this app actively encourages emailing
  // and copying the .sav file around, and entries can carry a ward's real
  // name (exportSingleWardZip's own DATA_EXPORT message, for one). A key is
  // always available by the time a real save reaches this point (or
  // securityMode is 'none', in which case encryptJSON's PLAIN: prefix
  // applies here exactly as it does to every other field).
  zip.file('auditLog.enc',await encryptJSON(_auditLogEntries));
  zip.file('manifest.json',JSON.stringify({
    format:'probate-guardian-export',
    version:SAV_FORMAT_VERSION,
    exportedAt:new Date().toISOString(),
    securityMode:_securityMode,
    salt,
    verifier,
    guardian:await encryptJSON({guardianName:guardianData.guardianName,guardianEmail:guardianData.guardianEmail}),
    appState:await encryptJSON(appStateBlob),
    templates:templateTypes,
    wards:wardIndex
  },null,2));
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  return {blob,count:wardIndex.length};
}

// "3 minutes ago" / "2 hours ago" / "5 days ago" style relative timestamp.
function formatRelativeTime(ts){
  const diffMin=Math.floor((Date.now()-ts)/60000);
  if(diffMin<1)return 'just now';
  if(diffMin<60)return `${diffMin} minute${diffMin===1?'':'s'} ago`;
  const diffHr=Math.floor(diffMin/60);
  if(diffHr<24)return `${diffHr} hour${diffHr===1?'':'s'} ago`;
  const diffDay=Math.floor(diffHr/24);
  return `${diffDay} day${diffDay===1?'':'s'} ago`;
}

function updateLastSavedIndicator(){
  const el=document.getElementById('last-saved-indicator');
  if(!el)return;
  if(_dirtySinceExport){
    el.textContent='● Unsaved changes';
    el.style.color='var(--warn-text)';
  }else if(_lastExportAt){
    el.textContent=`✓ Last backup: ${formatRelativeTime(_lastExportAt)}`;
    el.style.color='var(--ok-text)';
  }else{
    el.textContent='No backup saved yet';
    el.style.color='var(--ink-3)';
  }
}

// Records this save's timestamp and audit entry BEFORE the save itself
// happens, so the file this save produces contains its own record of
// itself — not only the previous save's. Recording afterward (as this used
// to) meant a session that saved once and then closed had recorded that
// save nowhere at all: the in-memory update happened, but the file already
// written a moment earlier never got it, and there was no session left to
// write it in a later save. Returns a rollback closure, used if the write
// that follows fails, so a failed save is never recorded as having succeeded.
async function beginRecordingExport(message){
  const previousLastExportAt=_lastExportAt;
  const auditLenBefore=_auditLogEntries.length;
  _lastExportAt=Date.now();
  _appState.lastExportAt=_lastExportAt;
  await auditLog('DATA_EXPORT',message,true);
  return function rollback(){
    _lastExportAt=previousLastExportAt;
    _appState.lastExportAt=previousLastExportAt;
    _auditLogEntries.length=auditLenBefore; // no-op if auditLog() went to Tauri instead of the local array
  };
}

async function exportGuardianDataZip(){
  let rollback=null;
  try{
    if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot export.');return;}
    const count=guardianData.wards.length;
    rollback=await beginRecordingExport(`Exported ${count} form(s) to archive`);
    const {blob}=await buildExportZipBlob();
    const handle=await saveBlobAs(blob,'guardianshipwarddata.sav');
    if(handle)await rememberZipHandle(handle);
    _dirtySinceExport=false;
    clearSessionRestoreCache(); // this state is now safely in a .sav file
    hideAutoExportReminder();
    updateLastSavedIndicator();
    markCaseOpenedBefore(); // a real .sav now exists — next launch offers the fast-path Open screen
    alert(`Export complete: ${count} form(s) saved to guardianshipwarddata.sav`);
  }catch(e){
    if(rollback)rollback();
    if(e&&e.name==='AbortError')return; // user cancelled the Save As dialog
    console.error('export failed',e);
    auditLog('DATA_EXPORT',String(e&&e.message||e),false);
    alert('Export failed: '+(e&&e.message||e));
  }
}

// Writes the full archive to an already-authorized handle. Shared by the
// background timer and the banner's Save Backup Now button.
async function writeArchiveToHandle(handle,viaTimer){
  const count=guardianData.wards.length;
  const message=viaTimer?`Auto-saved ${count} form(s) in the background`:`Saved ${count} form(s) to existing backup file`;
  const rollback=await beginRecordingExport(message);
  try{
    const {blob}=await buildExportZipBlob();
    const writable=await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }catch(e){
    rollback();
    throw e;
  }
  _dirtySinceExport=false;
  clearSessionRestoreCache(); // this state is now safely in a .sav file
  hideAutoExportReminder();
  refreshAutoSaveArmedStatus();
  updateLastSavedIndicator();
  return count;
}

// Tries to silently re-write the remembered file handle from a previous
// manual export — no dialog, no user gesture needed, as long as the browser
// still grants write permission on that handle. Returns false (without
// showing an error) whenever silent writing isn't possible, so the caller
// can fall back to the on-screen reminder banner instead.
async function silentAutoExport(){
  try{
    if(typeof JSZip==='undefined')return false;
    const handle=await loadZipHandle();
    if(!handle)return false;
    const perm=await handle.queryPermission({mode:'readwrite'});
    if(perm!=='granted'){refreshAutoSaveArmedStatus();return false;} // needs a user gesture to (re)grant
    await writeArchiveToHandle(handle,true);
    return true;
  }catch(e){
    console.warn('Silent auto-export failed, will show reminder instead',e);
    refreshAutoSaveArmedStatus();
    return false;
  }
}

// The banner's Save Backup Now button. Runs inside a click, so a user
// gesture is available: if we already know the backup file but the browser
// downgraded its permission (it reverts to 'prompt' after every reload),
// requestPermission() re-authorizes the SAME file with one small prompt —
// no Save As dialog, no re-picking the location. Only when no handle exists
// at all does this fall back to the full export flow.
async function saveBackupNow(){
  try{
    const handle=await loadZipHandle();
    if(handle&&handle.requestPermission){
      const perm=await handle.requestPermission({mode:'readwrite'});
      if(perm==='granted'){
        const count=await writeArchiveToHandle(handle,false);
        alert(`Backup saved: ${count} form(s) written to your backup file.`);
        return;
      }
    }
  }catch(e){
    console.warn('Reusing remembered backup file failed, falling back to Save As',e);
  }
  await exportGuardianDataZip();
}

function showAutoExportReminder(firstTime){
  const el=document.getElementById('auto-export-reminder');
  const titleEl=document.getElementById('auto-export-reminder-title');
  const textEl=document.getElementById('auto-export-reminder-text');
  if(titleEl&&textEl){
    if(firstTime){
      titleEl.textContent='Save Your First Backup';
      textEl.textContent="It only takes a moment, and protects this ward's data if something happens to this browser.";
    }else{
      titleEl.textContent='Unsaved Changes';
      textEl.textContent='You have changes since your last backup file.';
    }
  }
  if(el)el.style.display='flex';
}
function hideAutoExportReminder(){
  const el=document.getElementById('auto-export-reminder');
  if(el)el.style.display='none';
}

async function loadAutoExportPrefs(){
  try{
    const savedMinutes=await loadAppState('autoExportIntervalMinutes');
    _autoExportIntervalMinutes=(savedMinutes===null||savedMinutes===undefined)?10:Number(savedMinutes);
    const savedLast=await loadAppState('lastExportAt');
    _lastExportAt=savedLast?Number(savedLast):null;
  }catch(e){console.warn('Could not load auto-export preferences',e);}
  const sel=document.getElementById('auto-export-interval-select');
  if(sel)sel.value=String(_autoExportIntervalMinutes);
  updateLastSavedIndicator();
  refreshAutoSaveArmedStatus();
}

async function saveAutoExportIntervalPref(minutes){
  _autoExportIntervalMinutes=minutes;
  try{await saveAppState('autoExportIntervalMinutes',minutes);}catch(e){/* non-critical */}
  setupAutoExportTimer();
}

function setupAutoExportTimer(){
  if(_autoExportTimer){clearInterval(_autoExportTimer);_autoExportTimer=null;}
  if(!_autoExportIntervalMinutes)return; // 0 = user turned auto-save off
  _autoExportTimer=setInterval(async()=>{
    if(!_dirtySinceExport)return;
    const savedSilently=await silentAutoExport();
    if(!savedSilently)showAutoExportReminder();
  },_autoExportIntervalMinutes*60*1000);
}

function setupLastSavedTicker(){
  if(_lastSavedTickTimer)clearInterval(_lastSavedTickTimer);
  _lastSavedTickTimer=setInterval(updateLastSavedIndicator,30*1000);
}

// Browsers without writable file handles cannot background-save a .sav file,
// so show a stronger reminder every 15 minutes while changes are dirty.
let _fallbackReminderTimer=null;
function showFallbackSaveModal(){showModal('fallbackSaveModal');}
function setupFallbackSaveReminder(){
  if(window.showSaveFilePicker)return; // Chrome/Edge — real autosave covers this
  if(_fallbackReminderTimer)clearInterval(_fallbackReminderTimer);
  _fallbackReminderTimer=setInterval(()=>{
    if(_dirtySinceExport)showFallbackSaveModal();
  },15*60*1000);
}

function triggerImportZip(){
  const inp=document.getElementById('zip-import-input');
  if(inp){inp.value='';inp.click();}
}

async function importGuardianDataZip(file){
  try{
    if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot import.');return;}
    const check=await validateImportFile(file,'sav');
    if(!check.ok){alert(check.message);return;}
    if(_securityMode==='encrypted'&&!_cryptoKey){alert('Please unlock the app before importing a data file.');return;}
    const zip=await JSZip.loadAsync(file);
    const manifestEntry=zip.file('manifest.json');
    if(!manifestEntry)throw new Error('Not a Probate Guardian archive (no manifest.json inside).');
    const manifest=JSON.parse(await manifestEntry.async('string'));
    if(manifest.format!=='probate-guardian-export')throw new Error('Not a Probate Guardian archive.');

    // Same install (same salt) → current key works. Different install →
    // ask for the password the archive was exported under and re-derive.
    // A 'none'-mode archive has no salt and no password to ask for at all —
    // checking securityMode first (rather than comparing salts alone) keeps
    // that case from prompting for a password that doesn't exist, matching
    // how loadCaseFileAtLaunch() decides the same thing.
    const currentSalt=await loadAppState('cryptoSalt');
    let key=_cryptoKey;
    if(manifest.securityMode!=='none'&&manifest.salt!==currentSalt){
      const pw=prompt('This archive came from a different installation.\nEnter the master password that was in use when it was exported:');
      if(!pw)return;
      key=await deriveKeyFromPassword(pw,manifest.salt);
    }

    let guardianInfo=null;
    try{
      guardianInfo=manifest.guardian?await decryptJSONWithKey(manifest.guardian,key):null;
    }catch(e){
      throw new Error('Wrong password for this archive, or the file has been modified/corrupted.');
    }

    const imported=[];
    for(const entry of (Array.isArray(manifest.wards)?manifest.wards:[])){
      const f=zip.file(entry.file);
      if(!f){console.warn('Archive entry missing:',entry.file);continue;}
      // GCM decryption doubles as the integrity check: any outside edit to
      // this entry makes decrypt throw rather than load corrupted data.
      let ward;
      try{
        ward=sanitizeObjectData(await decryptJSONWithKey(await f.async('string'),key));
      }catch(err){
        throw new Error(`The archive's data for "${entry.file}" has been modified or corrupted since it was saved — nothing was imported.`);
      }
      if(ward&&ward.wardId)imported.push(ward);
    }
    if(!imported.length&&!guardianInfo)throw new Error('Archive contained no readable data.');

    const replacing=imported.filter(w=>guardianData.wards.some(x=>x.wardId===w.wardId)).length;
    const adding=imported.length-replacing;
    if(!confirm(`Import ${imported.length} form(s) from "${file.name}"?\n\n• ${adding} new form(s)\n• ${replacing} will replace existing form(s) with the same ID`))return;

    // Flush BEFORE swapping array entries so in-progress edits save under the
    // old objects and can't overwrite freshly imported data afterwards.
    await flushPendingSave();
    for(const ward of imported){
      const idx=guardianData.wards.findIndex(x=>x.wardId===ward.wardId);
      if(idx>=0)guardianData.wards[idx]=ward;else guardianData.wards.push(ward);
      await saveWardToState(ward); // schedules a write of the merged state to the .sav file
    }
    if(guardianInfo&&guardianInfo.guardianName)guardianData.guardianName=guardianInfo.guardianName;
    if(guardianInfo&&guardianInfo.guardianEmail)guardianData.guardianEmail=guardianInfo.guardianEmail;
    await saveData();

    // window.D references an object in guardianData.wards; if the active ward
    // was just replaced, rebind it (switchWard re-renders too).
    if(guardianData.activeWardId&&guardianData.wards.some(w=>w.wardId===guardianData.activeWardId)){
      await switchWard(guardianData.activeWardId);
    }else if(guardianData.wards.length){
      await switchWard(guardianData.wards[0].wardId);
    }else{
      updateSidebar();
    }
    auditLog('DATA_IMPORT',`Imported ${imported.length} form(s) from archive`,true);
    alert(`Import complete: ${imported.length} form(s) loaded.`);
  }catch(e){
    console.error('import failed',e);
    auditLog('DATA_IMPORT',String(e&&e.message||e),false);
    alert('Import failed: '+(e&&e.message||e));
  }
}

// ═══════════════════════════════════════════════════════
// SESSION-RESTORE CACHE (crash recovery)
// ═══════════════════════════════════════════════════════
// Stores a temporary full-case snapshot in pg-session-cache while changes
// are not yet in a .sav file. Encrypted mode uses AES-256-GCM; none mode uses
// the PLAIN format. A successful .sav save clears the snapshot, and startup
// offers any remaining snapshot before the normal Open/Start flow.
const SESSION_CACHE_DB='pg-session-cache', SESSION_CACHE_STORE='snapshot';
function _sessionCacheDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(SESSION_CACHE_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(SESSION_CACHE_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function _sessionCacheGet(){
  try{
    const db=await _sessionCacheDb();
    return await new Promise(resolve=>{
      const req=db.transaction(SESSION_CACHE_STORE,'readonly').objectStore(SESSION_CACHE_STORE).get('current');
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>resolve(null);
    });
  }catch(e){return null;}
}
async function _sessionCachePut(val){
  try{
    const db=await _sessionCacheDb();
    await new Promise(resolve=>{
      const tx=db.transaction(SESSION_CACHE_STORE,'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).put(val,'current');
      tx.oncomplete=resolve;tx.onerror=resolve;
    });
  }catch(e){/* non-critical -- see saveSessionRestoreCache()'s own catch */}
}
async function _sessionCacheClear(){
  try{
    const db=await _sessionCacheDb();
    await new Promise(resolve=>{
      const tx=db.transaction(SESSION_CACHE_STORE,'readwrite');
      tx.objectStore(SESSION_CACHE_STORE).delete('current');
      tx.oncomplete=resolve;tx.onerror=resolve;
    });
  }catch(e){/* non-critical */}
}

// Snapshot the current case without ZIP wrapping. saveData() calls this only
// for dirty state.
async function saveSessionRestoreCache(){
  if(_securityMode==='encrypted'&&!_cryptoKey)return;
  if(!guardianData.wards.length)return; // nothing worth recovering yet
  try{
    const salt=await loadAppState('cryptoSalt');
    const verifier=await loadAppState('cryptoVerifier');
    const wards=[];
    for(const ward of guardianData.wards)wards.push({wardId:ward.wardId,enc:await encryptJSON(ward)});
    const guardian=await encryptJSON({guardianName:guardianData.guardianName,guardianEmail:guardianData.guardianEmail});
    await _sessionCachePut({
      savedAt:Date.now(),securityMode:_securityMode,salt:salt||null,verifier:verifier||null,
      guardian,wards,activeWardId:guardianData.activeWardId||null
    });
  }catch(e){console.warn('session-restore cache write failed',e);}
}
async function clearSessionRestoreCache(){await _sessionCacheClear();}

// Check before Open/Start so unsaved work is not bypassed. Return true only
// after a successful restore.
async function checkSessionRestoreCacheAtLaunch(){
  let cache;
  try{cache=await _sessionCacheGet();}catch(e){return false;}
  if(!cache||!Array.isArray(cache.wards)||!cache.wards.length)return false;
  const proceed=confirm(
    `This browser has unsaved work from a previous session (last changed ${formatRelativeTime(cache.savedAt)}) that was never saved to a .sav file — most likely because the tab was closed or crashed before a backup was made.\n\n`+
    'Click OK to restore that work now, or Cancel to discard it and start fresh.'
  );
  if(!proceed){await clearSessionRestoreCache();return false;}
  try{
    let key=null;
    if(cache.securityMode==='encrypted'){
      const pw=prompt('Enter the master password to restore this session:');
      if(!pw)return false; // leave the cache in place -- ask again next launch
      key=await deriveAndVerifyKey(pw,{salt:cache.salt,verifier:cache.verifier,guardian:cache.guardian},null);
    }
    const restoredWards=[];
    for(const w of cache.wards){
      const ward=sanitizeObjectData(await decryptJSONWithKey(w.enc,key));
      if(ward&&ward.wardId)restoredWards.push(ward);
    }
    if(!restoredWards.length)throw new Error('Archive contained no readable data.');
    const g=await decryptJSONWithKey(cache.guardian,key);
    guardianData.wards=restoredWards;
    guardianData.guardianName=(g&&g.guardianName)||'';
    guardianData.guardianEmail=(g&&g.guardianEmail)||'';
    guardianData.activeWardId=cache.activeWardId||restoredWards[0].wardId;
    _securityMode=cache.securityMode;
    _cryptoKey=key;
    _appState.securityMode=cache.securityMode;
    _appState.cryptoSalt=cache.salt;
    _appState.cryptoVerifier=cache.verifier;
    _launchStateResolved=true;
    _openedFileAtLaunch=true;
    _dirtySinceExport=true; // this state has never actually landed in a .sav file
    updateLastSavedIndicator();
    alert(`Restored ${restoredWards.length} form(s) from your last unsaved session. Please save a backup file now.`);
    return true;
  }catch(e){
    console.error('session restore failed',e);
    alert('Could not restore the previous session (wrong password, or the cached data is corrupted). It has been left in place; you can try again next time the app opens.');
    return false;
  }
}

// ═══════════════════════════════════════════════════════
// OPEN / START AT LAUNCH
// After session recovery is checked, try the remembered handle or ask the
// user to open a .sav file or start a new case. Opening a file hydrates state
// and resolves its security mode before ensureUnlocked().
// ═══════════════════════════════════════════════════════

// pg-launch-pref stores a has-opened flag and the last FileSystemFileHandle.
// A valid remembered grant permits silent reopen; an expired grant needs a
// user click, and a missing or stale handle falls back to the file picker.
const LAUNCH_PREF_DB='pg-launch-pref', LAUNCH_PREF_STORE='flags';
const LAUNCH_PREF_KEY_OPENED='hasOpenedBefore', LAUNCH_PREF_KEY_HANDLE='zipFileHandle';
function _launchPrefDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(LAUNCH_PREF_DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(LAUNCH_PREF_STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function _launchPrefGet(key){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const req=db.transaction(LAUNCH_PREF_STORE,'readonly').objectStore(LAUNCH_PREF_STORE).get(key);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>resolve(undefined);
  });
}
async function _launchPrefPut(key,value){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const tx=db.transaction(LAUNCH_PREF_STORE,'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).put(value,key);
    tx.oncomplete=resolve;
    tx.onerror=resolve; // non-critical either way — next launch just falls back
  });
}
async function hasOpenedCaseBefore(){
  try{return (await _launchPrefGet(LAUNCH_PREF_KEY_OPENED))===true;}
  catch(e){return false;} // IndexedDB unavailable (private browsing, etc.) — fall back to the full choice screen
}
async function markCaseOpenedBefore(){
  try{await _launchPrefPut(LAUNCH_PREF_KEY_OPENED,true);}catch(e){/* non-critical */}
}
async function savePersistedZipHandle(handle){
  try{await _launchPrefPut(LAUNCH_PREF_KEY_HANDLE,handle);}catch(e){/* non-critical */}
}
async function loadPersistedZipHandle(){
  try{return (await _launchPrefGet(LAUNCH_PREF_KEY_HANDLE))||null;}
  catch(e){return null;}
}

// Case 1 above: a remembered handle whose read permission the browser
// still honors with no prompt at all. Runs before the startup screen even
// shows, so this is the only path that can be truly zero-click; everywhere
// else still needs the gesture openCaseFileAtLaunch() provides.
async function trySilentReopen(){
  try{
    const handle=await loadPersistedZipHandle();
    if(!handle||!handle.queryPermission)return false;
    if((await handle.queryPermission({mode:'read'}))!=='granted')return false;
    const file=await handle.getFile();
    const ok=await loadCaseFileAtLaunch(file);
    if(ok)await rememberZipHandle(handle);
    return ok;
  }catch(e){
    console.warn('Silent reopen of remembered file failed, falling back to the startup screen',e);
    return false;
  }
}

let _launchStateResolved=false;
let _openedFileAtLaunch=false; // set by loadCaseFileAtLaunch() on success; initApp() lands on the dashboard instead of the default page when this is true
let _startupChoiceResolve=null;
async function promptOpenOrStartAtLaunch(){
  if(await trySilentReopen())return;
  const fastPath=await hasOpenedCaseBefore();
  document.getElementById('startup-newcase-btn').style.display=fastPath?'none':'';
  document.getElementById('startup-newcase-link').style.display=fastPath?'':'none';
  return new Promise((resolve)=>{
    _startupChoiceResolve=resolve;
    document.getElementById('startup-choice-overlay').classList.add('show');
  });
}
function _resolveStartupChoice(){
  document.getElementById('startup-choice-overlay').classList.remove('show');
  const resolve=_startupChoiceResolve;_startupChoiceResolve=null;
  if(resolve)resolve();
}
function startNewCaseAtLaunch(){
  _resolveStartupChoice();
}

// Chrome/Edge: showOpenFilePicker() returns a handle that supports
// createWritable(), so opening a file arms silent auto-save immediately.
// Firefox/Safari implement neither picker — fall back to a plain
// <input type=file>, which can only ever hand back a read-only File.
// Those browsers can open a case file but can never auto-save it (see
// refreshAutoSaveArmedStatus() and the note on _zipFileHandle above); that
// is stated on screen once the file is open, not hidden.
//
// trySilentReopen() already tried the fully-silent path with no prompt at
// all before this screen ever showed; reaching here means that either
// failed or was never possible (this is a first visit, a different
// browser, or the earlier grant lapsed). This click is still a real user
// gesture, so it can re-request permission on that SAME remembered
// handle — a small native "Allow?" prompt, not the full picker — before
// falling back to showOpenFilePicker() itself.
async function openCaseFileAtLaunch(){
  const remembered=await loadPersistedZipHandle();
  if(remembered&&remembered.requestPermission){
    try{
      if((await remembered.requestPermission({mode:'read'}))==='granted'){
        const file=await remembered.getFile();
        const ok=await loadCaseFileAtLaunch(file);
        if(ok){
          await rememberZipHandle(remembered);
          _resolveStartupChoice();
          return;
        }
      }
    }catch(e){
      console.warn('Could not reuse remembered file handle, falling back to the file picker',e);
    }
  }
  if(window.showOpenFilePicker){
    try{
      const [handle]=await window.showOpenFilePicker({
        types:[{description:'Probate Guardian data file',accept:{'application/octet-stream':['.sav']}}]
      });
      const file=await handle.getFile();
      const ok=await loadCaseFileAtLaunch(file);
      if(ok){
        await rememberZipHandle(handle);
        _resolveStartupChoice();
      }
    }catch(e){
      if(e&&e.name==='AbortError')return; // user cancelled the picker — leave the choice screen up
      console.error('Open case file failed',e);
      alert('Could not open that file: '+(e&&e.message||e));
    }
    return;
  }
  document.getElementById('startup-open-input').click();
}
async function handleStartupOpenInputChange(input){
  const file=input.files[0];
  input.value='';
  if(!file)return;
  // No handle to remember here — a plain <input> never yields a writable
  // one. loadCaseFileAtLaunch() -> refreshAutoSaveArmedStatus() already
  // says so on screen once this resolves.
  const ok=await loadCaseFileAtLaunch(file);
  if(ok)_resolveStartupChoice();
}

// Shared by both pickers above: validate, parse, ask for a password if the
// file is encrypted, then hand off to loadStateFromSavZip(). Returns true
// on success (state is now populated and _cryptoKey is set if needed) or
// false (already reported to the user; the startup choice screen stays up
// so they can try again or start a new case instead).
async function loadCaseFileAtLaunch(file){
  try{
    const check=await validateImportFile(file,'sav');
    if(!check.ok){alert(check.message);return false;}
    if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot open this file.');return false;}
    const zip=await JSZip.loadAsync(file);
    const manifestEntry=zip.file('manifest.json');
    if(!manifestEntry){alert('Not a Probate Guardian data file (no manifest.json inside).');return false;}
    const manifest=JSON.parse(await manifestEntry.async('string'));
    if(manifest.format!=='probate-guardian-export'){alert('Not a Probate Guardian data file.');return false;}
    _securityMode=manifest.securityMode||(manifest.salt?'encrypted':'none');
    if(_securityMode==='encrypted'){
      await promptPasswordForFile(manifest,zip); // sets _cryptoKey; only resolves on a verified password
    }else{
      _cryptoKey=null;
    }
    // Hydrate _appState directly (not via saveAppState()) so ensureUnlocked()
    // finds securityMode/cryptoSalt/cryptoVerifier already in place without
    // this counting as an edit that needs writing straight back out.
    _appState.securityMode=_securityMode;
    _appState.cryptoSalt=manifest.salt||null;
    _appState.cryptoVerifier=manifest.verifier||null;
    await loadStateFromSavZip(zip,manifest,_cryptoKey);
    if(_appState.theme)applyTheme(_appState.theme,false); // false: already the file's own saved choice, nothing new to persist
    _launchStateResolved=true;
    _openedFileAtLaunch=true;
    markCaseOpenedBefore();
    refreshAutoSaveArmedStatus(); // covers the plain-<input> path too, where no handle was ever remembered
    return true;
  }catch(e){
    console.error('Failed to open case file',e);
    alert('Could not open that file: '+(e&&e.message||e));
    return false;
  }
}

// The counterpart to buildExportZipBlob(): reads wards, guardian info,
// appState, cached templates, and the audit log out of an already-parsed
// .sav zip into memory. `key` may be null in 'none' mode — decryptJSONWithKey
// checks for the PLAIN: prefix before ever touching it. Tolerates a
// version-1 file (no appState/templates/auditLog sections, no verifier)
// by treating each absent piece as simply not set, per SAV_FORMAT_VERSION's
// own comment.
async function loadStateFromSavZip(zip,manifest,key){
  guardianData.wards=[];
  for(const entry of (Array.isArray(manifest.wards)?manifest.wards:[])){
    const f=zip.file(entry.file);
    if(!f){console.warn('Archive entry missing:',entry.file);continue;}
    try{
      const ward=sanitizeObjectData(await decryptJSONWithKey(await f.async('string'),key));
      if(ward&&ward.wardId)guardianData.wards.push(ward);
    }catch(e){console.warn('Skipping unreadable ward in .sav file',entry.file,e);}
  }
  guardianData.guardianName='';
  guardianData.guardianEmail='';
  if(manifest.guardian){
    try{
      const g=await decryptJSONWithKey(manifest.guardian,key);
      guardianData.guardianName=g.guardianName||'';
      guardianData.guardianEmail=g.guardianEmail||'';
    }catch(e){console.warn('Could not read guardian info from .sav file',e);}
  }
  _appState.activeWardId=null;
  _autoExportIntervalMinutes=10;
  _lastExportAt=null;
  if(manifest.appState){
    try{
      const a=await decryptJSONWithKey(manifest.appState,key);
      guardianData.activeWardId=a.activeWardId||null;
      _appState.theme=a.theme;
      _appState.walkthroughCompleted=a.walkthroughCompleted;
      _appState.firstLaunchSeen=a.firstLaunchSeen;
      _appState.continuePromptShown=a.continuePromptShown;
      _appState.recentWards=a.recentWards;
      _appState.unlockFailState=a.unlockFailState;
      _autoExportIntervalMinutes=(a.autoExportIntervalMinutes==null)?10:Number(a.autoExportIntervalMinutes);
      _lastExportAt=a.lastExportAt||null;
    }catch(e){console.warn('Could not read app preferences from .sav file',e);}
  }else{
    // Version-1 file: activeWardId was never in the export at all (it lived
    // only in IndexedDB) — default to the first ward rather than none.
    guardianData.activeWardId=(guardianData.wards[0]&&guardianData.wards[0].wardId)||null;
  }
  _templateCache={};
  for(const type of (Array.isArray(manifest.templates)?manifest.templates:[])){
    const f=zip.file(`templates/${type}.b64`);
    if(f)_templateCache[type]=await f.async('string');
  }
  _auditLogEntries=[];
  _auditLogNextId=1;
  const auditFile=zip.file('auditLog.enc');
  if(auditFile){
    try{
      const entries=await decryptJSONWithKey(await auditFile.async('string'),key);
      if(Array.isArray(entries)){
        _auditLogEntries=entries;
        _auditLogNextId=entries.reduce((m,e)=>Math.max(m,(e&&e.id)||0),0)+1;
      }
    }catch(e){console.warn('Could not read audit log from .sav file',e);}
  }
}

// Derives a key from a candidate password and confirms it's the right one
// for this manifest before returning it. A version-2+ file carries its own
// verifier (the same PG_VERIFIER_V1 trick ensureUnlocked() uses); a
// version-1 file has none, so the guardian-info blob — or, failing that,
// the first ward — doubles as the check instead: GCM's auth tag fails
// decryption for any wrong key, exactly what importGuardianDataZip() has
// always relied on for the same reason.
async function deriveAndVerifyKey(password,manifest,zip){
  const key=await deriveKeyFromPassword(password,manifest.salt);
  if(manifest.verifier){
    const decoded=await decryptJSONWithKey(manifest.verifier,key);
    if(decoded!==CRYPTO_VERIFIER_PLAINTEXT)throw new Error('Incorrect password.');
  }else if(manifest.guardian){
    await decryptJSONWithKey(manifest.guardian,key);
  }else if(Array.isArray(manifest.wards)&&manifest.wards.length){
    const f=zip.file(manifest.wards[0].file);
    if(f)await decryptJSONWithKey(await f.async('string'),key);
  }
  return key;
}

// Lets a user drag a .zip data file straight onto the app window instead of
// clicking through the file picker. dragCounter (rather than a boolean)
// correctly tracks enter/leave across child elements — dragenter/dragleave
// fire once per element boundary crossed, not just once for the window.
function setupDragAndDropImport(){
  let dragCounter=0;
  // #dropzone-overlay lives in the lazy 'common-modals' fragment, not yet
  // in the DOM when this runs at startup -- a reference captured once here
  // would stay null forever. Look it up fresh each time instead, after
  // ensureFragment() (idempotent) confirms it exists.
  const isFileDrag=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
  window.addEventListener('dragenter',async e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter++;
    await ensureFragment('common-modals');
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='flex';
  });
  window.addEventListener('dragover',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
  });
  window.addEventListener('dragleave',e=>{
    if(!isFileDrag(e))return;
    e.preventDefault();
    dragCounter=Math.max(0,dragCounter-1);
    const overlay=document.getElementById('dropzone-overlay');
    if(dragCounter===0&&overlay)overlay.style.display='none';
  });
  window.addEventListener('drop',async e=>{
    if(!isFileDrag(e)){return;}
    e.preventDefault();
    dragCounter=0;
    const overlay=document.getElementById('dropzone-overlay');
    if(overlay)overlay.style.display='none';
    const files=Array.from(e.dataTransfer.files||[]);
    const zipFile=files.find(f=>{const n=f.name.toLowerCase();return n.endsWith('.sav')||n.endsWith('.zip');});
    if(!zipFile){
      if(files.length)alert('Please drop a Probate Guardian .sav case data file.');
      return;
    }
    await importGuardianDataZip(zipFile);
  });
}

function clearAllData(){
  if(!confirm('Clear all data for current form? This cannot be undone.'))return;
  const ward=getActiveWard();
  if(!ward)return;
  const {wardId,wardName,inventoryType,createdDate}=ward;
  Object.assign(ward,initializeEmptyData(ward.inventoryType));
  Object.assign(ward,{wardId,wardName,inventoryType,createdDate});
  saveData();
  updateSidebar();
  navigate('/');
}

// ═══════════════════════════════════════════════════════
// FILESYSTEM AUTOSAVE (Tauri desktop only — no-op when run in a plain browser)
// ═══════════════════════════════════════════════════════
// Backs up each ward to its own JSON file at Documents/ProbateGuardian/<wardId>.json,
// alongside the .sav file, so a case survives even between .sav saves on the
// desktop build specifically. The .sav file remains the single source of
// truth for everything the UI reads and edits — this is a best-effort backup
// only. Every function here fails soft: errors are logged to the console,
// never surfaced as a blocking alert, and never prevent the real save from
// completing. See capabilities/default.json for the (deliberately narrow) fs scope.
const AUTOSAVE_DIR='ProbateGuardian';
let _autosaveDirPath=null;

function autosaveWarn(context,err){console.warn('autosave:',context,err);}

function tauriFs(){return (window.__TAURI__&&window.__TAURI__.fs)||null;}
function tauriPath(){return (window.__TAURI__&&window.__TAURI__.path)||null;}

async function getAutosaveDirPath(){
  if(_autosaveDirPath)return _autosaveDirPath;
  const path=tauriPath();
  if(!path)return null;
  _autosaveDirPath=await path.join(await path.documentDir(),AUTOSAVE_DIR);
  return _autosaveDirPath;
}

async function ensureAutosaveDir(){
  const fs=tauriFs();
  const dir=await getAutosaveDirPath();
  if(!fs){autosaveWarn('ensureAutosaveDir: window.__TAURI__.fs is missing',new Error('fs module not found on window.__TAURI__'));return false;}
  if(!dir){autosaveWarn('ensureAutosaveDir: could not resolve dir (path module missing?)',new Error('path.documentDir/join unavailable'));return false;}
  try{
    if(!(await fs.exists(dir))){
      await fs.mkdir(dir,{recursive:true});
    }
    return true;
  }catch(e){autosaveWarn('ensureAutosaveDir failed',e);return false;}
}

async function autosaveWardToFile(ward){
  const fs=tauriFs();
  if(!fs||!ward)return;
  try{
    if(!(await ensureAutosaveDir()))return;
    const path=tauriPath();
    const filePath=await path.join(await getAutosaveDirPath(),`${ward.wardId}.json`);
    // Same AES-256-GCM encryption as the .sav file — this file sits as a
    // plain visible .json in the user's Documents folder, so it's actually the
    // more exposed of the two at-rest copies if left in plaintext.
    await fs.writeTextFile(filePath,await encryptJSON(ward));
  }catch(e){autosaveWarn('autosaveWardToFile failed (the .sav save was not affected)',e);}
}

async function deleteAutosaveFile(wardId){
  const fs=tauriFs();
  if(!fs)return;
  try{
    const dir=await getAutosaveDirPath();
    if(!dir)return;
    const path=tauriPath();
    const filePath=await path.join(dir,`${wardId}.json`);
    if(await fs.exists(filePath)){
      await fs.remove(filePath);
    }
  }catch(e){autosaveWarn('failed to remove backup file for deleted ward',e);}
}

// Only runs when the current session has no wards at all (a brand-new case,
// or the desktop app's data directory was cleared) — recovers whatever
// backup files are on disk. Never overwrites wards already in memory, so it
// can't clobber a case already in progress or one just loaded from a .sav file.
async function restoreFromFileBackupIfEmpty(){
  if(guardianData.wards.length>0)return;
  const fs=tauriFs();
  const dir=await getAutosaveDirPath();
  if(!fs||!dir)return;
  try{
    if(!(await fs.exists(dir)))return;
    const entries=await fs.readDir(dir);
    const path=tauriPath();
    for(const entry of entries){
      if(!entry.name||!entry.name.endsWith('.json'))continue;
      try{
        const filePath=await path.join(dir,entry.name);
        const raw=await fs.readTextFile(filePath);
        let ward;
        try{ward=await decryptJSON(raw);}
        catch{ward=JSON.parse(raw);} // legacy plaintext backup from before encryption existed
        if(ward&&ward.wardId&&ward.inventoryType){
          guardianData.wards.push(ward);
          await saveWardToState(ward); // re-saves it encrypted going forward
        }
      }catch(e){console.warn('skipping unreadable backup file',entry.name,e);}
    }
    if(guardianData.wards.length>0){
      guardianData.activeWardId=guardianData.wards[0].wardId;
      await saveAppState('activeWardId',guardianData.activeWardId);
      console.info(`Restored ${guardianData.wards.length} ward(s) from on-disk backup.`);
    }
  }catch(e){console.warn('restore-from-backup failed',e);}
}

// ═══════════════════════════════════════════════════════
// WARD MANAGEMENT
// ═══════════════════════════════════════════════════════
function createWardId(){
  return 'w_'+Date.now()+'_'+Math.random().toString(36).slice(2,9);
}

// Pairs each Guardianship Plan type with the Accounting type a guardian
// typically files alongside it for the same person — guardian<->planInitial,
// simplified<->planSimplified, annual<->planAnnual — so ward identity and
// guardian contact info can be carried over in EITHER direction instead of
// retyped, whichever filing gets created first. Symmetric on purpose: a
// single lookup (by whichever type you're about to create) tells you what
// to carry from. Annual Plan — Minors has no natural Accounting counterpart
// (a minor's plan isn't paired with a specific accounting type) so it's
// intentionally left out of both directions.
// Every ward type that can populate a NEW ward of the given type, most
// closely-related first (the picker lists them in this order).
//
// Two kinds of relationship are represented:
//   * Accounting <-> its matching Plan — the original pairing, symmetric.
//   * Accounting <- an earlier Accounting for the same ward. An Annual is
//     normally prepared from the Initial Inventory or from the previous
//     period's filing, so those are offered as sources too; this is what
//     lets an Initial Inventory feed a new Annual Accounting.
// Final/Trust Accounting share the Annual form, so they accept and are
// accepted by the same set.
const ACCOUNTING_FORM_TYPES=['guardian','simplified','annual','finalAccounting','trustAccounting'];
const PRIOR_ACCOUNTING_SOURCES=['guardian','simplified','annual','finalAccounting','trustAccounting'];
const CARRY_SOURCE_TYPE={
  planInitial:['guardian'], planSimplified:['simplified'], planAnnual:['annual'],
  guardian:['planInitial'],
  simplified:['planSimplified',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='simplified')],
  annual:['planAnnual',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='annual')],
  finalAccounting:['planAnnual',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='finalAccounting')],
  trustAccounting:['planAnnual',...PRIOR_ACCOUNTING_SOURCES.filter(t=>t!=='trustAccounting')]
};

// Source types allowed for a target type (always an array).
function carrySourcesFor(type){return CARRY_SOURCE_TYPE[type]||[];}

// Existing wards that could populate a new ward of `type`, ordered to match
// carrySourcesFor() so the closest counterpart appears first.
function carryWardsFor(type,excludeWardId){
  const srcs=carrySourcesFor(type);
  return srcs.flatMap(st=>guardianData.wards.filter(w=>w.inventoryType===st&&w.wardId!==excludeWardId));
}

// Builds a partial data object to merge onto a freshly-created Plan ward,
// carrying over only shared identity/contact fields — never signature dates,
// financial data, or anything specific to the Accounting filing itself.
function carryOverFieldsForPlan(sourceWard,planType){
  const src=sourceWard;
  if(planType==='planInitial'){
    const g=(src.guardians||[])[0]||{};
    return {
      wardName:src.wardName||'', caseNumber:src.caseNumber||'', county:src.county||'Pinellas',
      inceptionDate:src.gid||'', guardianNames:src.guardianName||'', attorneyName:src.attorneyForGuardian||'',
      planGuardians:[
        {name:g.name||'',ssn:g.ssnEin||'',street:g.streetAddress||'',phone:g.phone||'',cityStateZip:g.cityStateZip||'',signatureDate:'',relationship:''},
        {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
        {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
        {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''}
      ]
    };
  }
  if(planType==='planSimplified'){
    const gs=src.guardians||[];
    const mail=g=>[g.mailingStreet,g.mailingCityStateZip].filter(Boolean).join(', ');
    return {
      wardName:src.wardName||'', caseNumber:src.caseNumber||'', county:src.county||'Pinellas',
      planGuardians:[0,1].map(i=>{
        const g=gs[i]||{};
        return {name:g.name||'',signatureDate:'',email:g.email||'',phone:g.phone||'',mailingAddress:mail(g)};
      })
    };
  }
  if(planType==='planAnnual'){
    const gs=src.guardians||[];
    return {
      wardName:src.wardName||'', caseNumber:src.caseNumber||'', county:src.county||'Pinellas',
      gid:src.gid||'', guardian:src.guardian||'', attorney:src.attorney||'',
      planGuardians:[0,1,2].map(i=>{
        const g=gs[i]||{};
        return {
          name:g.name||'',ssn:g.ssn||'',phone:g.phone||'',email:g.email||'',signatureDate:'',
          mailingStreet:g.mailingStreet||'',mailingCityStateZip:g.mailingCityStateZip||'',
          officeStreet:g.officeStreet||'',officeCityStateZip:g.officeCityStateZip||'',relationship:''
        };
      })
    };
  }
  if(planType==='planMinor'){
    const gs=src.guardians||[];
    // A source ward may be an Initial Inventory (ssnEin/streetAddress/
    // cityStateZip) or an accounting (ssn/mailingStreet/mailingCityStateZip),
    // so each field falls back across both naming conventions.
    return {
      wardName:src.wardName||'', county:src.county||'Pinellas',
      ucn:src.caseNumber||'', // planMinor stores the case number as "ucn"
      guardianName:src.guardianName||src.guardian||'',
      attorney_name:src.attorneyForGuardian||src.attorney||'',
      planGuardians:[0,1].map(i=>{
        const g=gs[i]||{};
        return {
          name:g.name||'', tin:g.ssn||g.ssnEin||'', phone:g.phone||'',
          mailingStreet:g.mailingStreet||g.streetAddress||'',
          mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
          relationship:'', email:g.email||'', signatureDate:''
        };
      })
    };
  }
  return {};
}

// The reverse direction: builds a partial data object to merge onto a
// freshly-created (or existing) Accounting ward, carrying identity/contact
// fields FROM its matching Plan ward. Mirrors carryOverFieldsForPlan's three
// pairings exactly, just with source and target swapped.
function carryOverFieldsForAccounting(sourceWard,accountingType){
  const src=sourceWard;
  if(accountingType==='guardian'){
    const g=(src.planGuardians||[])[0]||{};
    return {
      wardName:src.wardName||'', caseNumber:src.caseNumber||'', county:src.county||'Pinellas',
      gid:src.inceptionDate||'', guardianName:src.guardianNames||'', attorneyForGuardian:src.attorneyName||'',
      guardians:[{name:g.name||'',ssnEin:g.ssn||'',phone:g.phone||'',streetAddress:g.street||'',cityStateZip:g.cityStateZip||'',signatureDate:null}]
    };
  }
  if(accountingType==='simplified'){
    const gs=src.planGuardians||[];
    // mailingAddress was joined as "street, cityStateZip" on the way out —
    // split on the first comma to reverse it. Best-effort for addresses
    // typed directly on the Plan rather than carried over originally.
    const split=addr=>{
      const s=String(addr||'');
      const i=s.indexOf(', ');
      return i===-1?{street:s,cityStateZip:''}:{street:s.slice(0,i),cityStateZip:s.slice(i+2)};
    };
    return {
      wardName:src.wardName||'', caseNumber:src.caseNumber||'', county:src.county||'Pinellas',
      guardians:[0,1,2].map(i=>{
        const g=gs[i]||{};
        const {street,cityStateZip}=split(g.mailingAddress);
        return {name:g.name||'',ssn:'',phone:g.phone||'',email:g.email||'',mailingStreet:street,mailingCityStateZip:cityStateZip,residenceStreet:'',residenceCityStateZip:'',signatureDate:''};
      })
    };
  }
  if(accountingType==='annual'){
    const gs=src.planGuardians||[];
    return {
      wardName:src.wardName||'', caseNumber:src.caseNumber||'', county:src.county||'Pinellas',
      gid:src.gid||'', guardian:src.guardian||'', attorney:src.attorney||'',
      guardians:[0,1,2].map(i=>{
        const g=gs[i]||{};
        return {
          name:g.name||'',ssn:g.ssn||'',phone:g.phone||'',email:g.email||'',
          mailingStreet:g.mailingStreet||'',mailingCityStateZip:g.mailingCityStateZip||'',
          officeStreet:g.officeStreet||'',officeCityStateZip:g.officeCityStateZip||'',signatureDate:'',signatureDateLabel:''
        };
      })
    };
  }
  return {};
}

// Accounting -> Accounting carry (e.g. Initial Inventory into a new Annual
// Accounting, or last period's Annual into this one). Only identity and
// contact details move; schedules, period dates, signatures and balances are
// deliberately left blank because they belong to the new filing period.
// Guardian rows use different field names per form, so each is read with a
// fallback across both conventions.
function carryOverAccountingToAccounting(src,targetType){
  const gs=src.guardians||[];
  const engine=formEngine(targetType);
  const base={
    wardName:src.wardName||'',
    caseNumber:src.caseNumber||'',
    county:src.county||'Pinellas',
    typeOfGuardianship:src.typeOfGuardianship||''
  };
  // Whoever the guardian/attorney are is stored under different keys on the
  // Initial Inventory than on the accountings.
  const guardianName=src.guardianName||src.guardian||'';
  const attorneyName=src.attorneyForGuardian||src.attorney||'';

  if(engine==='guardian'){
    return {...base, gid:src.gid||'', guardianName, attorneyForGuardian:attorneyName,
      guardians:gs.slice(0,1).map(g=>({
        name:g.name||'', ssnEin:g.ssnEin||g.ssn||'', phone:g.phone||'',
        streetAddress:g.streetAddress||g.mailingStreet||'',
        cityStateZip:g.cityStateZip||g.mailingCityStateZip||'', signatureDate:null
      }))};
  }
  if(engine==='simplified'){
    return {...base, gid:src.gid||'', guardian:guardianName, attorney:attorneyName,
      guardians:[0,1,2].map(i=>{
        const g=gs[i]||{};
        return {name:g.name||'', ssn:g.ssn||g.ssnEin||'', phone:g.phone||'', email:g.email||'',
          mailingStreet:g.mailingStreet||g.streetAddress||'',
          mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
          residenceStreet:'', residenceCityStateZip:'', signatureDate:''};
      })};
  }
  // annual family (annual / finalAccounting / trustAccounting)
  return {...base, gid:src.gid||'', guardian:guardianName, attorney:attorneyName,
    guardians:[0,1,2].map(i=>{
      const g=gs[i]||{};
      return {name:g.name||'', ssn:g.ssn||g.ssnEin||'', phone:g.phone||'', email:g.email||'',
        mailingStreet:g.mailingStreet||g.streetAddress||'',
        mailingCityStateZip:g.mailingCityStateZip||g.cityStateZip||'',
        officeStreet:g.officeStreet||'', officeCityStateZip:g.officeCityStateZip||'',
        signatureDate:'', signatureDateLabel:''};
    })};
}

// Single entry point used by every carry-over surface (Add Ward, Convert
// Ward, in-place Load Ward Info) — picks the right-direction mapper based on
// the source AND target types, so callers don't need to know which direction
// they're going.
function carryOverFields(sourceWard,targetType){
  const srcIsAccounting=ACCOUNTING_FORM_TYPES.includes(sourceWard.inventoryType);
  const targetIsAccounting=ACCOUNTING_FORM_TYPES.includes(targetType);
  if(targetIsAccounting){
    return srcIsAccounting
      ? carryOverAccountingToAccounting(sourceWard,targetType)
      : carryOverFieldsForAccounting(sourceWard,formEngine(targetType));
  }
  return carryOverFieldsForPlan(sourceWard,targetType);
}

// Populates the "Load Ward Info From" picker in the Add Ward modal based on
// the currently-selected Inventory Type, showing it only when that type has
// a carry-over source AND at least one matching ward already exists.
// Populates a "Load Ward Info From" <select> with existing wards eligible to
// pre-fill a new form of `type`. When the typed name exactly matches a name
// already on file, the list narrows to just that person's other filings —
// the usual case, pulling forward the SAME ward's earlier form — and
// auto-selects when there's exactly one such match, so picking an existing
// name is enough to auto-fill the new form without a second, separate pick.
// Every eligible source stays available (via "Start Blank" being the only
// other default) whenever the name doesn't narrow things down, so the user
// can still choose from any previously filled-out form manually.
function refreshCarrySourceSelect(sel,wrap,type,name,autonoteEl){
  const allMatches=carryWardsFor(type);
  // Always shown, even with nothing to offer yet. Hiding it entirely made
  // the feature look like it didn't exist on a fresh install; a disabled
  // control that says why is discoverable instead.
  wrap.style.display='block';
  if(!allMatches.length){
    sel.innerHTML='<option value="">— No other forms yet to pull from —</option>';
    sel.disabled=true;
    if(autonoteEl)autonoteEl.style.display='none';
    return;
  }
  const q=(name||'').trim().toLowerCase();
  const namedMatches=q?allMatches.filter(w=>(w.wardName||'').trim().toLowerCase()===q):[];
  const list=namedMatches.length?namedMatches:allMatches;
  sel.disabled=false;
  sel.innerHTML='<option value="">— Start Blank —</option>'
    +list.map(w=>`<option value="${w.wardId}">${esc(w.wardName)}${w.caseNumber?' — '+esc(w.caseNumber):''} (${esc(INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType)})</option>`).join('');
  if(namedMatches.length===1){
    sel.value=namedMatches[0].wardId;
    if(autonoteEl){
      autonoteEl.textContent=`Auto-filling from ${namedMatches[0].wardName}'s ${INVENTORY_TYPES[namedMatches[0].inventoryType]?.name||namedMatches[0].inventoryType} — change the picker above to use a different form instead.`;
      autonoteEl.style.display='block';
    }
  }else{
    sel.value='';
    if(autonoteEl)autonoteEl.style.display='none';
  }
}

function updateCarrySourcePicker(){
  const type=document.getElementById('new-ward-type').value;
  const name=document.getElementById('new-ward-name').value;
  refreshCarrySourceSelect(document.getElementById('carry-source-ward'),document.getElementById('carry-source-wrap'),type,name,document.getElementById('carry-source-autonote'));
}

// Auto-fills the ward-name field to match the selected source ward, without
// overriding a name the user has already started typing differently.
function onCarrySourceChange(){
  const sourceId=document.getElementById('carry-source-ward').value;
  if(!sourceId)return;
  const src=guardianData.wards.find(w=>w.wardId===sourceId);
  if(!src)return;
  const nameEl=document.getElementById('new-ward-name');
  if(!nameEl.value.trim())nameEl.value=src.wardName||'';
}

// In-place counterpart to the Add Ward "Load Ward Info From" picker and
// Convert Ward — for when the ward already exists (created blank, or before
// this feature shipped) rather than being created fresh. Carries the same
// identity/contact fields directly onto the ACTIVE ward instead of creating
// a new one. Works for both directions (Accounting<->Plan).
async function showLoadWardInfoModal(){
  await ensureFragment('common-modals');
  const sourceType=carrySourcesFor(activeInventoryType)[0];
  const matches=carryWardsFor(activeInventoryType,guardianData.activeWardId);
  if(!matches.length){
    alert(sourceType
      ? `No ${INVENTORY_TYPES[sourceType].name} ward found to load info from. Create one first, then come back here.`
      : 'This ward type has no matching type to load info from.');
    return;
  }
  document.getElementById('load-ward-info-target-name').textContent=window.D.wardName?`"${window.D.wardName}"`:'this ward';
  const sel=document.getElementById('load-ward-info-source');
  sel.innerHTML=matches.map(w=>`<option value="${w.wardId}">${esc(w.wardName)}${w.caseNumber?' — '+esc(w.caseNumber):''}</option>`).join('');
  showModal('loadWardInfoModal');
}

async function doLoadWardInfo(){
  const sourceId=document.getElementById('load-ward-info-source').value;
  if(!sourceId)return;
  const src=guardianData.wards.find(w=>w.wardId===sourceId);
  if(!src)return;
  closeModal('loadWardInfoModal');
  Object.assign(window.D,carryOverFields(src,activeInventoryType));
  autoSave();
  await saveWardToState(window.D);
  renderPage(currentPage);
  updateSidebar();
  updateNavDots();
}

// Small banner shown at the top of a Cover page (Plan or Accounting), only
// when a matching ward of the other type exists to load from — kept out of
// the way otherwise.
function loadWardInfoBanner(){
  const sourceType=carrySourcesFor(activeInventoryType)[0];
  if(!sourceType)return '';
  const hasSource=carryWardsFor(activeInventoryType,guardianData.activeWardId).length>0;
  if(!hasSource)return '';
  return `<div class="inventory-convert-banner mb-3" onclick="showLoadWardInfoModal()" role="button" tabindex="0" aria-label="Load ward info from an existing ${esc(INVENTORY_TYPES[sourceType].name)} ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showLoadWardInfoModal();}">
    <span class="inventory-convert-icon"><svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.4 8.6h13.2"/><path d="m14.4 5.4 3.2 3.2-3.2 3.2"/><path d="M19.6 15.4H6.4"/><path d="m9.6 12.2-3.2 3.2 3.2 3.2"/></svg></span>
    <div class="inventory-convert-text">
      <div class="inventory-convert-title">Load Ward Info</div>
      <div class="inventory-convert-desc">Carry the ward's name, case number, county, and guardian contact details from an existing ${esc(INVENTORY_TYPES[sourceType].name)} ward instead of retyping them.</div>
    </div>
    <span class="btn btn-outline-primary btn-sm" aria-hidden="true">Load Info</span>
  </div>`;
}

// Puts a Cover page's "Import Excel" accordion and "Load Ward Info" banner
// side by side, same two-column treatment as the dashboard's Upcoming
// Deadlines / Convert Ward row — one fewer stacked block at the top of the
// page. Falls back to a single column (accordion only, full width) when
// there's no matching ward to load from, computed here at build time since
// these page functions are rebuilt fresh on every render rather than
// patched in place like the dashboard's live containers.
function pageIntroRow(accordionHTML){
  const banner=loadWardInfoBanner();
  return `<div class="dashboard-top-row${banner?'':' single-col'}" style="margin-bottom:1.25rem;">${accordionHTML}${banner}</div>`;
}

// Most-recently-used ward list stored in the .sav file's appState section.
const RECENT_WARDS_MAX=5;

function loadRecentlyOpenedWards(){
  const list=_appState.recentWards;
  return Array.isArray(list)?list:[];
}

function saveRecentlyOpenedWards(list){
  _appState.recentWards=list;
  saveAppState('recentWards',list);
}

function addToRecentlyOpened(ward){
  if(!ward)return;
  const list=loadRecentlyOpenedWards().filter(r=>r.wardId!==ward.wardId);
  list.unshift({wardId:ward.wardId,wardName:ward.wardName,inventoryType:ward.inventoryType,timestamp:Date.now()});
  saveRecentlyOpenedWards(list.slice(0,RECENT_WARDS_MAX));
}

// Re-derives name/type from the live ward record (in case it was renamed
// or converted since being logged) and drops entries for wards that no
// longer exist, rather than trusting the stale snapshot in appState.
function getRecentlyOpenedWards(){
  return loadRecentlyOpenedWards()
    .map(r=>{
      const ward=guardianData.wards.find(w=>w.wardId===r.wardId);
      return ward?{wardId:ward.wardId,wardName:ward.wardName,inventoryType:ward.inventoryType,timestamp:r.timestamp,archived:!!ward.archived}:null;
    })
    .filter(Boolean);
}

async function addWard(wardName,inventoryType){
  await flushPendingSave();
  const wardId=createWardId();
  const isFirstWardEver=guardianData.wards.length===0;
  const newWard={
    wardId,
    inventoryType,
    createdDate:new Date().toISOString().split('T')[0],
    ...initializeEmptyData(inventoryType),
    wardName
  };
  guardianData.wards.push(newWard);
  guardianData.activeWardId=wardId;
  activeInventoryType=inventoryType;
  window.D=newWard;
  _visitedPages.clear();
  addToRecentlyOpened(newWard);
  await saveWardToState(newWard);
  await saveAppState('activeWardId',wardId);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  updateSidebar();
  navigate('/');
  // Nudge a brand-new user to make their first backup right away, rather
  // than waiting for the auto-export timer's next tick (up to N minutes).
  if(isFirstWardEver&&!_lastExportAt)showAutoExportReminder(true);
  return wardId;
}

// The sidebar's "Switch Ward" button acts on whatever the dropdown is
// currently set to. If that's already the active ward, switchWard() would
// be a no-op with zero visible feedback — clicking the button would just
// silently do nothing, which reads as broken. Offer a picker instead.
// Generic searchable combobox: renders `items` ({label, sub?, ...}) into
// `dropdownEl`, filtered against `query` by case-insensitive substring match
// on label, calling `onPick(item)` when one is clicked.
function comboboxFilterItems(items,query){
  const q=(query||'').trim().toLowerCase();
  if(!q)return items;
  return items.filter(it=>it.label.toLowerCase().includes(q));
}
function comboboxRenderDropdown(dropdownEl,items,onPick){
  if(!dropdownEl)return;
  if(!items.length){
    dropdownEl.innerHTML='<div class="ward-combobox-empty">No matches</div>';
  }else{
    dropdownEl.innerHTML=items.map((it,i)=>`<div class="ward-combobox-item" data-idx="${i}" role="option">
        <span class="ward-combobox-item-name">${esc(it.label)}</span>
        ${it.sub?`<span class="ward-combobox-item-type">${esc(it.sub)}</span>`:''}
      </div>`).join('');
    [...dropdownEl.children].forEach((el,i)=>{
      if(el.classList.contains('ward-combobox-item'))el.addEventListener('mousedown',ev=>{ev.preventDefault();onPick(items[i]);});
    });
  }
  dropdownEl.style.display='block';
}
function comboboxHide(dropdownEl){
  if(dropdownEl)dropdownEl.style.display='none';
}

// Active Ward combobox: lets you type a ward's name to filter/select it, or
// click into the field to see every ward as a dropdown — same as the plain
// picker before it, just also typeable.
function wardSelectorItems(){
  return guardianData.wards.map(w=>({
    wardId:w.wardId,
    label:w.wardName||'(unnamed)',
    sub:INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType
  }));
}
function wardSelectorShowDropdown(query){
  const input=document.getElementById('ward-selector');
  const dropdown=document.getElementById('ward-selector-dropdown');
  comboboxRenderDropdown(dropdown,comboboxFilterItems(wardSelectorItems(),query),item=>{
    input.value=item.label;
    input.dataset.wardId=item.wardId;
    comboboxHide(dropdown);
  });
}
function onWardSelectorInput(){
  document.getElementById('ward-selector').dataset.wardId='';
  wardSelectorShowDropdown(document.getElementById('ward-selector').value);
}
function onWardSelectorFocus(){
  // Focusing (rather than typing) shows every ward, even though the field
  // is pre-filled with the current ward's name — that text isn't a filter
  // yet, it's just what's active.
  wardSelectorShowDropdown('');
}
function onWardSelectorKeydown(e){
  const dropdown=document.getElementById('ward-selector-dropdown');
  if(e.key==='Escape'){comboboxHide(dropdown);}
  else if(e.key==='Enter'){e.preventDefault();comboboxHide(dropdown);handleSwitchWardClick();}
}
document.addEventListener('click',e=>{
  const wrap=document.getElementById('ward-selector-wrap');
  if(wrap&&!wrap.contains(e.target))comboboxHide(document.getElementById('ward-selector-dropdown'));
});

function handleSwitchWardClick(){
  const input=document.getElementById('ward-selector');
  if(!input)return;
  let wardId=input.dataset.wardId||'';
  if(!wardId&&input.value.trim()){
    // Typed a name without picking from the dropdown — resolve it directly
    // if exactly one ward matches; otherwise show the dropdown to disambiguate.
    const q=input.value.trim().toLowerCase();
    const matches=guardianData.wards.filter(w=>(w.wardName||'').trim().toLowerCase()===q);
    if(matches.length===1){
      wardId=matches[0].wardId;
    }else{
      wardSelectorShowDropdown(input.value);
      return;
    }
  }
  if(!wardId)return;
  if(wardId===guardianData.activeWardId){
    showSwitchWardPickerModal();
    return;
  }
  switchWard(wardId);
}

async function showSwitchWardPickerModal(){
  await ensureFragment('common-modals');
  const current=guardianData.wards.find(w=>w.wardId===guardianData.activeWardId);
  const nameEl=document.getElementById('switch-ward-picker-current-name');
  if(nameEl)nameEl.textContent=current&&current.wardName?`"${current.wardName}"`:'This ward';
  const listEl=document.getElementById('switch-ward-picker-list');
  const others=guardianData.wards.filter(w=>w.wardId!==guardianData.activeWardId);
  if(!others.length){
    listEl.innerHTML='<div class="dashboard-empty-inline">You only have one ward — nothing to switch to yet.</div>';
  }else{
    listEl.innerHTML=others.map(w=>{
      const typeLabel=INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType;
      return `<button type="button" class="recent-ward-item" onclick="closeModal('switchWardPickerModal');switchWard('${w.wardId}')">
        <span class="recent-ward-icon">${typeIcon(w.inventoryType,16)}</span>
        <span class="recent-ward-info">
          <span class="recent-ward-name">${esc(w.wardName||'(unnamed)')}${w.archived?' <span class="badge bg-secondary ward-card-badge">Closed</span>':''}</span>
          <span class="recent-ward-type">${esc(typeLabel)}</span>
        </span>
      </button>`;
    }).join('');
  }
  showModal('switchWardPickerModal');
}

async function switchWard(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;

  // Flush before switching
  await flushPendingSave();

  // Reset visited pages tracking for this ward
  _visitedPages.clear();

  addToRecentlyOpened(ward);

  // Update state
  guardianData.activeWardId=wardId;
  activeInventoryType=ward.inventoryType;
  window.D=ward;

  try{
    await saveAppState('activeWardId',wardId);
  }catch(e){
    console.error('switchWard save failed',e);
    showSaveError();
  }

  // Update UI in correct order
  updateSidebar();
  currentPage='/';
  window.location.hash='';
  const el=document.getElementById('main-content');
  switch(formEngine(activeInventoryType)){
    case 'guardian': renderPageGuardian('/');break;
    case 'simplified': mountSimplifiedFeature('/');break;
    case 'annual': renderPageAnnual('/');break;
    case 'planSimplified': mountPlanSimplifiedFeature('/');break;
    case 'planAnnual': renderPagePlanAnnual('/');break;
    case 'planInitial': renderPagePlanInitial('/');break;
    case 'planMinor': renderPagePlanMinor('/');break;
  }
  linkLabelsToInputs();
  updateNavDots();
  updateHelpContext();
  closeMobileSidebar();
}

async function deleteWard(wardId){
  const idx=guardianData.wards.findIndex(w=>w.wardId===wardId);
  if(idx===-1)return;
  guardianData.wards.splice(idx,1);
  await deleteWardFromState(wardId);
  deleteAutosaveFile(wardId);

  if(guardianData.activeWardId===wardId){
    guardianData.activeWardId=guardianData.wards.length>0?guardianData.wards[0].wardId:null;
  }
  if(guardianData.activeWardId){
    window.D=getActiveWard();
    activeInventoryType=getActiveWard().inventoryType;
    await saveAppState('activeWardId',guardianData.activeWardId);
  }else{
    window.D={};
    activeInventoryType=null;
    await saveAppState('activeWardId',null);
  }
  updateSidebar();
  navigate('/');
}

async function renameWard(wardId,newName){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  ward.wardName=newName;
  await saveWardToState(ward);
  updateSidebar();
}

// ═══════════════════════════════════════════════════════
// INVENTORY TYPE MANAGEMENT
// ═══════════════════════════════════════════════════════

function emptyRowAnnual(type){
  switch(type){
    case 'schA': return {payer:'',description:'',bank:'',accountNo:'',amount:''};
    case 'schB1': return {bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB2': return {bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB3': return {bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''};
    case 'schB4': return {checkNo:'',datePaid:'',category:'',payee:'',amount:''};
    case 'schC':  return {description:'',date:'',gain:'',loss:''};
    case 'schD1': return {description:'',accountNo:'',restricted:'No',type:'',fullAmount:'',wardPct:'',restrictedAmt:''};
    case 'schD2': return {description:'',residence:'No',income:'No',fullValue:'',wardPct:'',carryingValue:'',wardValue:''};
    case 'schD3': return {description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''};
    case 'schD4': return {description:'',restricted:'No',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''};
    case 'schD5': return {description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''};
    case 'schE':  return {bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''};
    case 'schF1': return {description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''};
    case 'schF2': return {description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''};
    case 'trust': return {hasTrust:'No',createdAfterGID:'No',name:'',trustee:'',accountNo:'',dateCreated:'',trustType:'',wardPct:'',wardAmount:''};
    case 'remun': return {guardian:'',type:'',amount:'',description:''};
    default: return {};
  }
}

// Simplified Annual Plan — the person-side counterpart to the accountings.
// emptyDataPlanSimplified() moved to src/core/state.js (Milestone 3, Phase
// B), reached via window.emptyDataPlanSimplified() from
// initializeEmptyData() below -- pure data, needed synchronously at
// ward-creation time, before the lazily-imported feature module loads.

// ── Annual Guardianship Plan ─────────────────────────────
// The court form's 11 numbered questions, in its own order. Two of them
// are repeating tables (residences, medical providers) and are modelled as
// arrays exactly like the Annual Accounting schedules; the rest are
// checkbox groups, narrative text, or fixed-length rating grids.
//
// The rights and ADL lists are declared once as constants and reused by
// the page renderer, the validator, and the print builder, so the three
// can't drift out of order — the printed court document has to list them
// in exactly the sequence the form does.
const PLAN_RIGHTS=[
  ['marry','Right to marry'],
  ['vote','Right to vote'],
  ['govBenefits','Right to personally apply for government benefits'],
  ['driver',"Right to have a driver's license"],
  ['travel','Right to travel'],
  ['employment','Right to seek or retain employment'],
  ['contract','Right to contract'],
  ['sue','Right to sue and be sued'],
  ['property','Right to manage property or to make any gift or disposition'],
  ['residence','Right to determine residence'],
  ['medical','Right to consent to medical treatment'],
  ['social','Right to make decisions about social environment or other aspects of social life'],
];
const PLAN_RIGHT_STATES=['Not removed','Needs to be restored','Capable of restoration'];
const PLAN_ADLS=[
  ['eating','Eating'],['prepareMeals','Prepare meals'],
  ['heavyChores','Heavy chores (e.g. vacuuming)'],['lightHousekeeping','Light housekeeping'],
  ['managingMoney','Managing money'],['dressing','Dressing'],
  ['transportation','Transportation ability'],['walking','Walking / mobility'],
  ['toileting','Toileting'],['stairs','Climbing stairs'],
  ['transferring','Transferring (wheelchair to chair/bed)'],['laundry','Doing laundry'],
  ['shopping','Shopping'],['bathing','Bathing'],
  ['grooming','Grooming'],['medication','Administration of medication'],
];
const PLAN_ADL_RATINGS=['','Ward needs no help','Ward needs assistance','Ward cannot do at all'];
const PLAN_BENEFITS=[
  ['socialSecurity','Social Security'],['ssdi','Social Security Disability Income (SSDI)'],
  ['hmo','Health Maintenance Organization (HMO)'],['ssi','Supplemental Security Income (SSI)'],
  ['stateSupplement','Optional State Supplement'],['institutionalCare','Institutional Care Program'],
  ['supplementalIns','Supplemental Insurance'],['pension','Pension'],
  ['medicare','Medicare'],['medicaid','Medicaid'],['trusts','Trusts'],
];

function emptyPlanResidence(){return {name:'',street:'',cityStateZip:'',phone:'',facilityType:'',from:'',to:''};}
function emptyPlanProvider(){return {name:'',street:'',cityStateZip:'',phone:'',providerType:'',visits:''};}
function emptyPlanDirective(){return {title:'',dateSigned:'',signedBy:'',agents:'',alternates:'',relationship:'',contact:'',courtRevoked:'',orderDate:'',orderCounty:''};}

function emptyDataPlanAnnual(){
  const rights={}; PLAN_RIGHTS.forEach(([k])=>rights[k]='');
  const adls={};   PLAN_ADLS.forEach(([k])=>adls[k]='');
  const benefits={}; PLAN_BENEFITS.forEach(([k])=>benefits[k]={eligible:false,appliedFor:false});
  return {
    // Cover
    wardName:'', caseNumber:'', ssn:'', county:'Pinellas',
    periodFrom:'', periodTo:'', gid:'', guardian:'', attorney:'',
    wardLiving:'', residenceAddress:'', residenceCityStateZip:'', residencePhone:'',
    mailingAddress:'', mailingCityStateZip:'',
    // Q1 — places resided in the prior 12 months
    q1Residences:[emptyPlanResidence()],
    // Q2 — address change since last plan
    q2NoMove:false, q2WithinCounty:false, q2WithinCircuit:false,
    q2OutsideApproved:false, q2OutsideVenuePetition:false,
    // Q3 — residential setting + care provisions
    q3SettingALF:false, q3SettingGroupHome:false, q3SettingIntermediate:false,
    q3SettingPrivate:false, q3SettingSkilled:false, q3SettingSpecialized:false,
    q3SettingStateHospital:false, q3SettingOther:false, q3SettingExplain:'',
    q3EnsureAssessing:false, q3EnsureWardDecides:false, q3EnsureNoChange:false,
    q3MedPrimary:false, q3MedDentist:false, q3MedOphthalmologist:false,
    q3MedSpecialist:false, q3MedSpecialistArea:'', q3MedPhysicalTherapy:false,
    q3MedSpeechTherapy:false, q3MedOccupationalTherapy:false,
    q3MedWardDecides:false, q3MedNone:false, q3MedOther:false, q3MedExplain:'',
    q3MentalPsych:false, q3MentalWardDecides:false, q3MentalOutpatient:false,
    q3MentalInpatient:false, q3MentalNone:false, q3MentalOther:false, q3MentalExplain:'',
    q3PersonalFacility:false, q3PersonalNurses:false, q3PersonalFamily:false,
    q3PersonalWithout:false, q3PersonalNone:false, q3PersonalOther:false, q3PersonalExplain:'',
    q3SocialFacility:false, q3SocialNurses:false, q3SocialFamily:false,
    q3SocialWardDecides:false, q3SocialNone:false, q3SocialOther:false, q3SocialExplain:'',
    // Q3G — insurance and benefits
    benefits, q3BenefitsNone:false, q3BenefitsOther:false, q3BenefitsExplain:'',
    // Q4 — professional medical treatment during the period
    q4Providers:[emptyPlanProvider()],
    // Q5 — social skills and capacity-building activities
    q5SocialSkills:'', q5Activities:'',
    // Q6/Q7 — rights
    rights, q7RightsExplain:'',
    // Q8 — activities of daily living
    adls,
    // Q9 — disabilities and assistive devices
    q9MentalDementia:false, q9MentalAutism:false, q9MentalHeadInjury:false,
    q9MentalDevelopmental:false, q9MentalSchizophrenia:false, q9MentalDepression:false,
    q9MentalIntellectual:false, q9MentalSubstance:false, q9MentalAlzheimers:false,
    q9MentalNone:false, q9MentalOther:false, q9MentalExplain:'',
    q9PhysMobility:false, q9PhysBlindness:false, q9PhysDeafness:false,
    q9PhysDiabetic:false, q9PhysParkinsons:false, q9PhysArthritis:false,
    q9PhysNone:false, q9PhysOther:false, q9PhysExplain:'',
    q9UsesDentures:false, q9UsesHearingAid:false, q9UsesWheelchair:false,
    q9UsesWalker:false, q9UsesCrutches:false, q9UsesProsthetics:false,
    q9UsesGlasses:false, q9UsesNone:false, q9UsesOther:false, q9UsesExplain:'',
    q9NeedsDentures:false, q9NeedsHearingAid:false, q9NeedsWheelchair:false,
    q9NeedsWalker:false, q9NeedsCrutches:false, q9NeedsProsthetics:false,
    q9NeedsGlasses:false, q9NeedsNone:false, q9NeedsOther:false, q9NeedsExplain:'',
    // Q10 — advance directives
    q10NoDirectives:false, q10StepResidence:false, q10StepSafeDeposit:false,
    q10StepInterviewed:false, q10StepMedicalProviders:false, q10StepAttorney:false,
    q10Executed:false, q10ExecDNR:false, q10ExecHealthcare:false,
    q10ExecPOA:false, q10ExecOther:false, q10ExecOtherText:'',
    q10Directives:[emptyPlanDirective()],
    // Q11 — remuneration
    q11NoRemuneration:false, q11NoRemunerationName:'',
    q11ReceivedName:'', q11Amount:'', q11From:'', q11SubmittedToCourt:false,
    // Certification — the seven "check all that apply" statements
    certIncapacitatedNoCopy:false, certMinorNoCopy:false, certConsulted:false,
    certNoRestriction:false, certProvidesMedical:false, certPhysicianAttached:false,
    certRecognizeRights:false, certRightsChangedExplain:'',
    // Guardians (form provides three signature blocks) + attorney
    planGuardians:[
      {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:''},
      {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:''},
      {name:'',ssn:'',phone:'',email:'',signatureDate:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',relationship:''}
    ],
    attorney_signatureDate:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:''
  };
}

const INITIAL_ADLS=[
  ['lightHousekeeping','Light Housekeeping'],['medication','Administration of Medication'],
  ['managingMoney','Managing Money'],['bathing','Bathing'],
  ['prepareMeals','Prepare Meals'],['stairs','Climbing Stairs'],
  ['shopping','Shopping'],['laundry','Doing Laundry'],
  ['toileting','Toileting'],['dressing','Dressing'],
  ['transferring','Transferring (from wheelchair to chair/bed)'],['eating','Eating'],
  ['walking','Walking / Mobility'],['grooming','Grooming'],
  ['heavyChores','Heavy Chores'],
];
const INITIAL_ADL_RATINGS=['','Ward needs no help','Ward needs some assistance','Ward cannot do at all'];

function emptyInitialProvider(){return {name:'',providerType:'',examDate:'',street:'',cityStateZip:'',phone:''};}

function emptyDataPlanInitial(){
  const adls={}; INITIAL_ADLS.forEach(([k])=>adls[k]='');
  return {
    // Cover
    wardName:'', caseNumber:'', county:'Pinellas', periodFrom:'', periodTo:'',
    inceptionDate:'', lettersSignedDate:'', successorGuardianship:'',
    guardianNames:'', attorneyName:'',
    wardLiving:'', residenceAddress:'', residenceCityStateZip:'', residencePhone:'',
    mailingAddress:'', mailingCityStateZip:'',
    q1PreexistingDirectives:'',
    // Q2 — residential setting best suited to the ward
    q2Setting:'', q2Explain:'',
    // Q3 — medical services
    q3MedPrimary:false, q3MedDentist:false, q3MedOphthalmologist:false,
    q3MedSpecialist:false, q3MedSpecialistArea:'', q3MedPT:false,
    q3MedST:false, q3MedOT:false, q3MedWardDecides:false, q3MedOther:false, q3MedExplain:'',
    // Q4 — mental health services
    q4Mental:'', q4Explain:'',
    // Q5 — personal care
    q5Personal:'', q5Explain:'',
    // Q6 — socialization / recreation
    q6CareFacility:false, q6NursesAides:false, q6FamilyFriends:false, q6DayProgram:false,
    q6WardDecides:false, q6Other:false, q6Explain:'',
    // Q7 — insurance / benefits
    q7SocialSecurity:false, q7Ssdi:false, q7Hmo:false, q7Ssi:false,
    q7StateSupplement:false, q7InstitutionalCare:false, q7SupplementalIns:false,
    q7Pension:false, q7Medicare:false, q7Medicaid:false, q7Va:false,
    q7Trusts:false, q7PendingBenefits:false, q7Other:false, q7Explain:'',
    // Q9 — examining physicians/providers
    q9Providers:[emptyInitialProvider()],
    // Q10A — activities of daily living
    adls,
    // Q10B/C — disabilities
    mentalAlzheimers:false, mentalAutism:false, mentalClosedHeadInjury:false,
    mentalDementia:false, mentalDepression:false, mentalDevelopmental:false,
    mentalSubstance:false, mentalSchizophrenia:false, mentalOther:false, mentalExplain:'',
    physMobility:false, physBlindness:false, physDeafness:false, physDiabetic:false,
    physParkinsons:false, physArthritis:false, physOther:false, physExplain:'',
    // Q10D — assistive devices currently used
    usesDentures:false, usesHearingAid:false, usesWheelchair:false, usesWalker:false,
    usesCrutches:false, usesProsthetics:false, usesGlasses:false, usesNone:false,
    usesOther:false, usesExplain:'',
    // Q10E — assistive devices needed
    needsDentures:false, needsHearingAid:false, needsWheelchair:false, needsWalker:false,
    needsCrutches:false, needsProsthetics:false, needsGlasses:false, needsNone:false,
    needsOther:false, needsExplain:'',
    // Q10F — examining committee recommendations
    committeeIncorporated:'', committeeExplain:'',
    // Q11 — pre-existing DNR / advance directives verification
    q11NoDirectives:false, q11StepResidence:false, q11StepSafeDeposit:false,
    q11StepInterviewed:false, q11StepMedicalProviders:false, q11StepAttorney:false,
    q11Executed:false, q11ExecDNR:false, q11ExecHealthcare:false,
    q11ExecPOA:false, q11ExecOther:false, q11ExecOtherText:'',
    q11Directives:[emptyPlanDirective(),emptyPlanDirective()],
    // Certification — six "check all that apply" statements
    certIncapacitatedNoCopy:false, certMinorNoCopy:false, certConsulted:false,
    certRecognizeRights:false, certNoRestriction:false, certProvidesCare:false,
    // Guardians (form provides up to four signature blocks) + attorney
    planGuardians:[
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''},
      {name:'',ssn:'',street:'',phone:'',cityStateZip:'',signatureDate:'',relationship:''}
    ],
    attorney_name:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:'', attorney_signatureDate:''
  };
}

function emptyMinorResidence(){return {name:'',street:'',city:'',state:'',zip:'',phone:''};}
function emptyMinorProvider(){return {first:'',mi:'',last:'',street:'',city:'',state:'',zip:'',phone:'',providerType:'',visits:''};}
function emptyMinorGuardianSig(){return {name:'',tin:'',phone:'',mailingStreet:'',mailingCityStateZip:'',relationship:'',email:'',signatureDate:''};}

function emptyDataPlanMinor(){
  return {
    // Cover
    wardName:'', county:'Pinellas', ucn:'', ref:'', periodFrom:'', periodTo:'',
    amendedForm:'', amendedVersion:'', professionalGuardian:'', publicGuardian:'',
    guardianName:'',
    // Q1 — current residence
    q1ResidenceName:'', q1Street:'', q1City:'', q1State:'', q1Zip:'', q1Phone:'',
    // Q2 — residences during the preceding 12 months
    q2Residences:[emptyMinorResidence()],
    // Q3 — medical/mental health treatment providers
    q3Providers:[emptyMinorProvider()],
    // Q4 — provision of medical services for the plan period
    q4Primary:false, q4PrimaryFreq:'', q4Dentist:false, q4DentistFreq:'',
    q4Specialist:false, q4SpecialistFreq:'',
    q4PT:false, q4ST:false, q4OT:false, q4MinorDecides:false, q4Other:false, q4Explain:'',
    // Q5 — education and social development
    q5SchoolProgress:'', q5SocialDevelopment:'', q5Communicates:'', q5Interpersonal:'',
    q5NoUnmetNeeds:false, q5DoesNotCareToSocialize:false, q5UnmetNeeds:false, q5Other:false, q5Explain:'',
    // Certification — six "check all that apply" statements
    certIncapacitated:false, certMinor:false, certConsulted:false,
    certNoRestriction:false, certProvidesCare:false, certPhysicianAttached:false,
    // Guardian + Co-Guardian signature blocks
    planGuardians:[emptyMinorGuardianSig(),emptyMinorGuardianSig()],
    // Preparer certification
    preparer_name:'', preparer_tin:'', preparer_phone:'',
    preparer_mailingStreet:'', preparer_cityStateZip:'', preparer_email:'', preparer_signatureDate:'',
    // Attorney certification
    attorney_name:'', attorney_bar:'', attorney_phone:'',
    attorney_street:'', attorney_cityStateZip:'', attorney_email:'', attorney_signatureDate:''
  };
}

function emptyDataAnnual(){
  return {
    // Part I
    wardName:'', caseNumber:'', gid:'', periodFrom:'', periodTo:'',
    guardian:'', attorney:'', typeOfGuardianship:'', county:'Pinellas',
    amendedForm:'No', filingType:'Annual', relatedCaseNumbers:'',
    // Part II
    startingBalance:'',
    // Part III – guardians (up to 3)
    guardians:[
      {name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',signatureDate:'',signatureDateLabel:''},
      {name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',signatureDate:'',signatureDateLabel:''},
      {name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',signatureDate:'',signatureDateLabel:''}
    ],
    // Part IV – preparer
    preparer:{name:'',ssn:'',phone:'',street:'',cityStateZip:'',signatureDate:''},
    // Part V – attorney
    attorney_bar:'', attorney_phone:'', attorney_street:'', attorney_cityStateZip:'',
    attorney_county:'Pinellas', attorney_signatureDate:'',
    // Schedules
    schA:[], schB1:[], schB2:[], schB3:[], schB4:[],
    schC:[], schD1:[], schD2:[], schD3:[], schD4:[], schD5:[],
    schE:[], schF1:[], schF2:[],
    // Parts VI & VII – reconciliation. Line 20 (net assets computed from the
    // accounting) and Line 30 (net assets from the Schedule D listings) are
    // both derived, so there is nothing to store for them. What IS stored is
    // the guardian's written explanation when the two do not agree — the
    // court needs the discrepancy documented, and export requires it.
    reconcileExplanation:'',
    // Part VIII – Trusts (up to 3)
    trusts:[emptyRowAnnual('trust'),emptyRowAnnual('trust'),emptyRowAnnual('trust')],
    // Part IX – Bond
    guardianRelationship:'Professional Guardian',
    restrictedDepositoryReceiptDate:'',
    bondAmount:'', bondPeriodFrom:'', bondPeriodTo:'', bondingCompany:'',
    // Part X – Cert of Service
    certDate:'', certIndicator:'',
    certAttySignDate:'',
    certRecipients:[{name:'',line2:'',line3:'',line4:''},{name:'',line2:'',line3:'',line4:''},{name:'',line2:'',line3:'',line4:''},{name:'',line2:'',line3:'',line4:''}],
    // Part XI – Remuneration
    remuneration:[emptyRowAnnual('remun')]
  };
}

function initializeEmptyData(type){
  switch(formEngine(type)){
    case 'guardian': return emptyDataGuardian();
    // emptyDataSimplified() moved to src/core/state.js (an ES module) --
    // pure data, needed at ward-creation time, before this ward's feature
    // module is ever mounted. window.emptyDataSimplified is assigned there
    // (loaded via a <script type="module"> tag in index.html) the same way
    // fragment-loader.js exposes loadFragment; see that file's own comment
    // for why this bridge is temporary/necessary.
    case 'simplified': return window.emptyDataSimplified();
    case 'annual': return emptyDataAnnual();
    case 'planSimplified': return window.emptyDataPlanSimplified();
    case 'planAnnual': return emptyDataPlanAnnual();
    case 'planInitial': return emptyDataPlanInitial();
    case 'planMinor': return emptyDataPlanMinor();
    default: return emptyDataGuardian();
  }
}

// ═══════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════
function closeModal(modalId){
  document.getElementById(modalId).classList.remove('show');
}

// Every modal showModal() is ever called with lives in the lazy
// 'common-modals' fragment (src/fragment-loader.js) -- the three overlays
// needed on every session (startup-choice, security-choice, unlock) are
// shown via direct classList manipulation elsewhere, never through this
// function. Fetched and appended into #lazy-fragment-host on first use only;
// _fragmentAppended memoizes so a repeat open doesn't re-fetch or re-append.
const _fragmentAppended={};
async function ensureFragment(name){
  if(_fragmentAppended[name])return;
  const content=await window.loadFragment(name);
  document.getElementById('lazy-fragment-host').appendChild(content);
  _fragmentAppended[name]=true;
}

async function showModal(modalId){
  await ensureFragment('common-modals');
  document.getElementById(modalId).classList.add('show');
}

// Fills a ward-name <datalist> with the distinct names already on file, so
// typing offers them as autocomplete. A ward routinely has several forms
// (Inventory, Annual, Plan...) under one name, hence the de-duplication —
// and matching an existing name exactly is what groups the filings together
// on the dashboard, so suggesting them guards against near-miss typos.
function populateWardNameSuggestions(datalistId){
  const dl=document.getElementById(datalistId);
  if(!dl)return;
  const names=[...new Set(guardianData.wards.map(w=>(w.wardName||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  dl.innerHTML=names.map(n=>`<option value="${esc(n)}"></option>`).join('');
}

// Ward-name combobox for "Add Ward" / eligibility name fields: typing filters
// the existing ward names, and focusing the (still-empty) field shows all of
// them as a dropdown — picking one, rather than retyping, is what makes a new
// form group with an existing ward on the dashboard.
function wardNameComboItems(){
  const names=[...new Set(guardianData.wards.map(w=>(w.wardName||'').trim()).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b));
  return names.map(n=>({label:n}));
}
// onPick(name) fires after every change to the field's value — a click on a
// dropdown item, or a keystroke — so a caller can keep something else (e.g.
// the "Load Ward Info From" picker) in sync with whatever name is now typed.
function initWardNameCombobox(inputId,dropdownId,onPick){
  const input=document.getElementById(inputId);
  const dropdown=document.getElementById(dropdownId);
  if(!input||!dropdown||input.dataset.comboInit)return;
  input.dataset.comboInit='1';
  const show=()=>comboboxRenderDropdown(dropdown,comboboxFilterItems(wardNameComboItems(),input.value),item=>{
    input.value=item.label;
    comboboxHide(dropdown);
    if(onPick)onPick(input.value);
  });
  input.addEventListener('focus',show);
  input.addEventListener('input',()=>{show();if(onPick)onPick(input.value);});
  input.addEventListener('keydown',e=>{if(e.key==='Escape')comboboxHide(dropdown);});
  document.addEventListener('click',e=>{
    if(!input.contains(e.target)&&!dropdown.contains(e.target))comboboxHide(dropdown);
  });
}

async function showAddWardModal(){
  await ensureFragment('common-modals');
  document.getElementById('new-ward-name').value='';
  populateWardNameSuggestions('ward-name-suggestions');
  initWardNameCombobox('new-ward-name','new-ward-name-dropdown',()=>updateCarrySourcePicker());
  document.getElementById('new-ward-type').value='guardian';
  updateCarrySourcePicker();
  showModal('addWardModal');
}

async function doAddWard(){
  const name=document.getElementById('new-ward-name').value.trim();
  const type=document.getElementById('new-ward-type').value;
  const carrySourceId=document.getElementById('carry-source-ward').value;
  console.log('doAddWard - name:',name,'type:',type,'carrySourceId:',carrySourceId);
  if(!name){alert('Please enter a ward name');return;}
  if(type==='simplified'){
    closeModal('addWardModal');
    showSimplifiedEligibilityModal(name,carrySourceId);
    return;
  }
  try{
    const wardId=await addWard(name,type);
    if(carrySourceId){
      const src=guardianData.wards.find(w=>w.wardId===carrySourceId);
      const ward=guardianData.wards.find(w=>w.wardId===wardId);
      if(src&&ward){
        Object.assign(ward,carryOverFields(src,type));
        if(ward.wardName!==name)ward.wardName=name;
        window.D=ward;
        await saveWardToState(ward);
        renderPage('/');
        updateSidebar();
      }
    }
    closeModal('addWardModal');
  }catch(e){
    console.error('Failed to add ward',e);
    alert('Failed to add form. Check console.');
  }
}

// carrySourceId lets doAddWard() hand off a carry-source selection already
// made in the main Add Ward modal; the picker inside this modal covers the
// other entry point, where the "Simplified Accounting" card skips that
// modal entirely and lands here directly.
function refreshEligCarrySource(){
  const name=document.getElementById('elig-ward-name').value;
  refreshCarrySourceSelect(document.getElementById('elig-carry-source-ward'),document.getElementById('elig-carry-source-wrap'),'simplified',name,document.getElementById('elig-carry-source-autonote'));
}

async function showSimplifiedEligibilityModal(name,carrySourceId){
  await ensureFragment('common-modals');
  document.getElementById('elig-ward-name').value=name||'';
  populateWardNameSuggestions('elig-ward-name-suggestions');
  initWardNameCombobox('elig-ward-name','elig-ward-name-dropdown',()=>refreshEligCarrySource());
  document.getElementById('elig-depository').value='';
  document.getElementById('elig-only-transactions').value='';
  // Same source list the Add Ward picker uses — the matching Plan plus any
  // earlier accounting for this ward (Initial Inventory, a prior Annual,
  // etc). Previously hardcoded to planSimplified only, which meant an
  // Initial Inventory could never populate a Simplified Accounting.
  refreshEligCarrySource();
  // Explicit hand-off from the main Add Ward modal (the "Simplified
  // Accounting" card skips that modal and lands here directly) wins over
  // whatever refreshEligCarrySource() auto-selected from the name alone.
  if(carrySourceId)document.getElementById('elig-carry-source-ward').value=carrySourceId;
  showModal('simplifiedEligibilityModal');
  document.getElementById('elig-ward-name').focus();
}

async function doConfirmSimplifiedEligibility(){
  const name=document.getElementById('elig-ward-name').value.trim();
  const dep=document.getElementById('elig-depository').value;
  const txn=document.getElementById('elig-only-transactions').value;
  const carrySourceId=document.getElementById('elig-carry-source-ward').value;
  if(!name){alert('Please enter a ward name');return;}
  if(!dep||!txn){alert('Please answer both eligibility questions');return;}
  const qualifies=dep==='Yes'&&txn==='Yes';
  try{
    if(qualifies){
      const wardId=await addWard(name,'simplified');
      window.D.eligDepository='Yes';
      window.D.eligOnlyTransactions='Yes';
      if(carrySourceId){
        const src=guardianData.wards.find(w=>w.wardId===carrySourceId);
        if(src){
          Object.assign(window.D,carryOverFields(src,'simplified'));
          if(window.D.wardName!==name)window.D.wardName=name;
        }
      }
      await saveWardToState(window.D);
    }else{
      await addWard(name,'annual');
      // Carry over to the Annual too — the guardian picked a source ward
      // before answering the eligibility questions, and that choice still
      // applies to the form they actually end up with.
      if(carrySourceId){
        const src=guardianData.wards.find(w=>w.wardId===carrySourceId);
        if(src){
          Object.assign(window.D,carryOverFields(src,'annual'));
          if(window.D.wardName!==name)window.D.wardName=name;
          await saveWardToState(window.D);
        }
      }
      alert('This guardianship does not qualify for the simplified form under § 744.3679, so a standard Annual Accounting was created instead.');
    }
    closeModal('simplifiedEligibilityModal');
  }catch(e){
    console.error('Failed to add ward',e);
    alert('Failed to add form. Check console.');
  }
}

async function showRenameWardModal(){
  const ward=getActiveWard();
  if(!ward)return;
  await ensureFragment('common-modals');
  document.getElementById('rename-ward-input').value=ward.wardName;
  showModal('renameWardModal');
}

async function doRenameWard(){
  const newName=document.getElementById('rename-ward-input').value.trim();
  if(!newName){alert('Please enter a ward name');return;}
  try{
    await renameWard(guardianData.activeWardId,newName);
    closeModal('renameWardModal');
  }catch(e){
    console.error('Failed to rename ward',e);
    alert('Failed to rename ward. Check console.');
  }
}

let _pendingDeleteWardId=null;

// wardId is optional so the existing sidebar "Delete" button (which only
// ever acts on the currently active ward) keeps working unchanged, while
// the dashboard card's own Delete button can target any ward regardless
// of which one is currently active.
async function confirmDeleteWard(wardId){
  const ward=wardId?guardianData.wards.find(w=>w.wardId===wardId):getActiveWard();
  if(!ward)return;
  await ensureFragment('common-modals');
  _pendingDeleteWardId=ward.wardId;
  const yearNote=(ward.years&&ward.years.length)?` This will also permanently delete ${ward.years.length} prior year${ward.years.length===1?'':'s'} of saved accounting for this form.`:'';
  document.getElementById('delete-ward-msg').textContent=`Are you sure you want to delete "${ward.wardName}"?${yearNote} This action cannot be undone.`;
  showModal('deleteWardModal');
}

async function doDeleteWard(){
  const wardId=_pendingDeleteWardId||guardianData.activeWardId;
  const wasOnDashboard=currentPage==='/dashboard';
  try{
    await deleteWard(wardId);
    closeModal('deleteWardModal');
    if(wasOnDashboard)navigate('/dashboard');
  }catch(e){
    console.error('Failed to delete ward',e);
    alert('Failed to delete form. Check console.');
  }
}

async function doGuardianSetup(){
  const name=document.getElementById('setup-guardian-name').value.trim();
  if(!name){alert('Please enter your name');return;}
  guardianData.guardianName=name;
  guardianData.guardianEmail=document.getElementById('setup-guardian-email').value.trim();
  await saveData();
  updateSidebar();
  closeModal('guardianSetupModal');
}

// ═══════════════════════════════════════════════════════
// LEGACY BROWSER-STORAGE MIGRATION
// Older releases stored case data in ProbateGuardian IndexedDB and several
// local/session-storage keys. Before normal startup, offer to export that
// data to .sav, then remove only those legacy stores. Current recovery and
// launch-preference databases use different names and are not migrated.
//
// Browsers without indexedDB.databases() cannot safely probe for the legacy
// database without creating it, so only legacy local/session keys are checked.
async function legacyIndexedDBExists(){
  try{
    if(!indexedDB.databases)return null;
    const dbs=await indexedDB.databases();
    return dbs.some(d=>d.name===LEGACY_DB_NAME);
  }catch(e){return null;}
}
function openLegacyIDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(LEGACY_DB_NAME,LEGACY_DB_VERSION);
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>resolve(req.result);
    // Only reachable if legacyIndexedDBExists() said yes but the database
    // turned out not to actually have this store — leaving this empty
    // means nothing gets fabricated here; the getAll() calls below just
    // see whatever object stores genuinely exist.
    req.onupgradeneeded=()=>{};
  });
}
function legacyIDBGetAll(db,storeName){
  return new Promise((resolve)=>{
    if(!db.objectStoreNames.contains(storeName)){resolve([]);return;}
    const tx=db.transaction([storeName],'readonly');
    const req=tx.objectStore(storeName).getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>resolve([]);
  });
}

async function runLegacyBrowserStorageMigrationIfNeeded(){
  const legacyLocalStorageKeys=[
    LEGACY_KEYS.guardian,LEGACY_KEYS.simplified,LEGACY_KEYS.annual,
    LEGACY_KEYS.migrationComplete,LEGACY_KEYS.guardianTemplate,
    LEGACY_KEYS.simplifiedTemplate,LEGACY_KEYS.annualTemplate,
    'pg-theme','walkthroughCompleted','firstLaunchSeen','pg-recent-wards'
  ];
  let hasLegacyLocalStorage=false;
  try{hasLegacyLocalStorage=legacyLocalStorageKeys.some(k=>localStorage.getItem(k)!=null);}
  catch(e){/* localStorage unavailable — nothing to migrate from it */}

  let legacyDb=null;
  let legacyWardRows=[],legacyAppStateRows=[],legacyTemplateRows=[],legacyAuditRows=[];
  try{
    if(await legacyIndexedDBExists()){
      legacyDb=await openLegacyIDB();
      legacyWardRows=await legacyIDBGetAll(legacyDb,LEGACY_STORES.wards);
      legacyAppStateRows=await legacyIDBGetAll(legacyDb,LEGACY_STORES.appState);
      legacyTemplateRows=await legacyIDBGetAll(legacyDb,LEGACY_STORES.templates);
      legacyAuditRows=await legacyIDBGetAll(legacyDb,LEGACY_STORES.auditLog);
    }
  }catch(e){console.warn('Could not inspect legacy IndexedDB',e);}

  const hasLegacyIDB=legacyWardRows.length>0||legacyAppStateRows.length>0||legacyTemplateRows.length>0||legacyAuditRows.length>0;
  if(!hasLegacyIDB&&!hasLegacyLocalStorage){
    if(legacyDb)legacyDb.close();
    return; // the common case for any install that has been through this once, and every fresh one
  }

  const proceed=confirm(
    'This browser has case data saved by an earlier version of Probate Guardian.\n\n'+
    'This version only keeps a full copy of your data in a .sav file you control. It also keeps a temporary recovery snapshot in this browser until you save one, but that snapshot is not a substitute for a .sav backup.\n\n'+
    'Click OK to save that existing data as a .sav file now (recommended), or Cancel to discard it and start fresh.'
  );

  if(proceed){
    try{
      const appStateMap={};
      for(const row of legacyAppStateRows)appStateMap[row.key]=row.value;

      // Borrows the OLD app's own crypto scheme rather than re-implementing
      // it: a plaintext row decodes via encryptJSON's 'none'-mode PLAIN:
      // prefix regardless of key, so only an actually-encrypted install
      // needs a password prompt here at all.
      const legacySecurityMode=appStateMap.securityMode||(appStateMap.cryptoSalt&&appStateMap.cryptoVerifier?'encrypted':'none');
      let legacyKey=null;
      if(legacySecurityMode==='encrypted'){
        const pw=prompt('Enter the master password this data was encrypted with, to save it as a .sav file:');
        if(!pw){if(legacyDb)legacyDb.close();return;} // backed out — leave the old data in place, ask again next launch
        legacyKey=await deriveKeyFromPassword(pw,appStateMap.cryptoSalt);
        if(appStateMap.cryptoVerifier){
          try{
            const decoded=await decryptJSONWithKey(appStateMap.cryptoVerifier,legacyKey);
            if(decoded!==CRYPTO_VERIFIER_PLAINTEXT)throw new Error('wrong password');
          }catch(e){
            alert('Incorrect password — could not export the existing data. It has been left in place; you will be asked again next time the app opens.');
            if(legacyDb)legacyDb.close();
            return;
          }
        }
      }

      // Reuses buildExportZipBlob()'s exact zip-building logic rather than
      // duplicating it, by temporarily pointing the globals it reads from
      // at the legacy data. This session's real state is still at its
      // empty startup default at this point (promptOpenOrStartAtLaunch()
      // hasn't run yet) — restored in `finally` regardless.
      const saved={guardianData,appState:_appState,templateCache:_templateCache,
        auditLog:_auditLogEntries,auditNextId:_auditLogNextId,securityMode:_securityMode,key:_cryptoKey};
      let exportedHandle=null,exportedCount=0;
      try{
        guardianData={guardianName:'',guardianEmail:'',wards:[],activeWardId:appStateMap.activeWardId||null};
        for(const row of legacyWardRows){
          try{
            const ward=row&&row.enc?await decryptJSONWithKey(row.enc,legacyKey):row;
            if(ward&&ward.wardId)guardianData.wards.push(ward);
          }catch(e){console.warn('Skipping unreadable legacy ward',row&&row.wardId,e);}
        }
        if(appStateMap.guardianName){
          try{guardianData.guardianName=await decryptJSONWithKey(appStateMap.guardianName,legacyKey);}catch(e){}
        }
        if(appStateMap.guardianEmail){
          try{guardianData.guardianEmail=await decryptJSONWithKey(appStateMap.guardianEmail,legacyKey);}catch(e){}
        }
        _appState={cryptoSalt:appStateMap.cryptoSalt||null,cryptoVerifier:appStateMap.cryptoVerifier||null};
        try{_appState.theme=localStorage.getItem('pg-theme')||null;}catch(e){}
        try{_appState.walkthroughCompleted=localStorage.getItem('walkthroughCompleted')||null;}catch(e){}
        try{const raw=localStorage.getItem('pg-recent-wards');_appState.recentWards=raw?JSON.parse(raw):null;}catch(e){}
        _templateCache={};
        for(const row of legacyTemplateRows)if(row&&row.type)_templateCache[row.type]=row.b64;
        _auditLogEntries=legacyAuditRows;
        _auditLogNextId=legacyAuditRows.reduce((m,e)=>Math.max(m,(e&&e.id)||0),0)+1;
        _securityMode=legacySecurityMode;
        _cryptoKey=legacyKey;

        const {blob,count}=await buildExportZipBlob();
        exportedHandle=await saveBlobAs(blob,'guardianshipwarddata.sav');
        exportedCount=count;
      }finally{
        guardianData=saved.guardianData;_appState=saved.appState;_templateCache=saved.templateCache;
        _auditLogEntries=saved.auditLog;_auditLogNextId=saved.auditNextId;_securityMode=saved.securityMode;_cryptoKey=saved.key;
      }
      if(!exportedHandle){
        // No showSaveFilePicker on this browser — saveBlobAs() fell back to
        // a plain download, which this page has no way to confirm actually
        // reached disk (a blocked pop-up, a cancelled "Save As", a full
        // disk all look identical to a successful click from here). Deleting
        // the only other copy on an unconfirmed download is exactly the
        // silent data loss this whole routine exists to prevent, so this
        // asks outright instead of assuming.
        const confirmedDownload=confirm(
          `A download of "guardianshipwarddata.sav" (${exportedCount} form(s)) should have just started.\n\n`+
          'Please check your Downloads folder and confirm the file is actually there before continuing.\n\n'+
          'Click OK once you have verified it downloaded successfully, or Cancel to leave your old data in place and try again later.'
        );
        if(!confirmedDownload){
          alert('Your existing data has been left in place. You will be asked again next time the app opens.');
          if(legacyDb)legacyDb.close();
          return;
        }
      }
      alert(`Saved ${exportedCount} form(s) from your previous version to guardianshipwarddata.sav.`);
    }catch(e){
      console.error('Legacy data export failed',e);
      alert('Could not export the existing data ('+(e&&e.message||e)+'). It has been left in place; you will be asked again next time the app opens.');
      if(legacyDb)legacyDb.close();
      return; // do not clear anything if the export failed
    }
  }

  if(legacyDb){
    legacyDb.close();
    try{
      await new Promise((resolve)=>{
        const req=indexedDB.deleteDatabase(LEGACY_DB_NAME);
        req.onsuccess=resolve;req.onerror=resolve;req.onblocked=resolve;
      });
    }catch(e){console.warn('Could not delete legacy IndexedDB database',e);}
  }
  try{
    for(const k of legacyLocalStorageKeys)localStorage.removeItem(k);
    sessionStorage.removeItem('pg-continue-prompt-shown');
  }catch(e){/* localStorage/sessionStorage unavailable — nothing to clear */}
}

// ═══════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════
function navigate(page){
  // Only when actually leaving the page, not when a +Add button's own
  // onclick calls navigate() back to the SAME page to render the row it
  // just pushed — see pruneBlankScheduleEntries().
  if(page!==currentPage)pruneBlankScheduleEntries();
  currentPage=page;
  window.location.hash=page;
  renderPage(page);
  closeMobileSidebar(); // no-op on desktop widths — the drawer only opens on mobile/tablet
}

// Off-canvas sidebar drawer, used only below the responsive breakpoint (see
// the max-width:900px rules). On wider screens the sidebar is always
// visible and these are harmless no-ops.
function toggleMobileSidebar(){
  const sidebar=document.getElementById('sidebar');
  if(!sidebar)return;
  const open=!sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open',open);
  const backdrop=document.getElementById('sidebar-backdrop');
  if(backdrop)backdrop.classList.toggle('active',open);
  const btn=document.getElementById('mobile-menu-btn');
  if(btn)btn.setAttribute('aria-expanded',String(open));
}
function closeMobileSidebar(){
  const sidebar=document.getElementById('sidebar');
  if(sidebar)sidebar.classList.remove('mobile-open');
  const backdrop=document.getElementById('sidebar-backdrop');
  if(backdrop)backdrop.classList.remove('active');
  const btn=document.getElementById('mobile-menu-btn');
  if(btn)btn.setAttribute('aria-expanded','false');
}

// Computes each ward's headline "total" using its own inventory type's
// existing, already-correct totals logic — by briefly pointing window.D at
// that ward, reading the result, then restoring the real active ward.
// Safe because this all runs synchronously with no awaits in between, so no
// other code can observe window.D pointing at the wrong ward mid-computation.
function getWardHeadlineTotal(ward){
  const previousD=window.D;
  window.D=ward;
  let total=null;
  try{
    if(ward.inventoryType==='guardian')total=calc.total();
    else if(ward.inventoryType==='simplified')total=calcTotals().remaining;
    else if(formEngine(ward.inventoryType)==='annual')total=calcTotalsAnnual().netAssetsFromD;
  }catch(e){console.warn('Dashboard: could not compute total for ward',ward.wardId,e);}
  finally{window.D=previousD;}
  return total;
}

// accent is a fixed hex — used for the ward-card stripe / left-border,
// where it's a decorative fill and doesn't need to react to theme.
// accentText is the SAME colour family but as a var() reference, used
// everywhere this accent sits on top of a surface as plain text — those
// three raw hex values read fine on white (light mode) but fail badly as
// text on a dark surface (as low as 1.9:1), same problem --brand/--accent/
// --ok had, same fix: route through the *-text token instead.
// financial:false marks a document that reports on the ward's PERSON (care,
// residence, medical treatment) rather than their property. Those have no
// money total at all, so anywhere a dollar headline would normally render,
// the filing-progress percentage is shown instead — a "$0.00" or a bare "—"
// under a "Total" label reads as a real figure and is actively misleading.
const INVENTORY_TYPE_META={
  guardian:   {iconName:'clipboard', accent:'#1e5799', accentText:'var(--accent-text)', totalLabel:"Ward's Value",  financial:true},
  simplified: {iconName:'receipt',   accent:'#1f7a3d', accentText:'var(--ok-text)',     totalLabel:'Ending Balance', financial:true},
  annual:     {iconName:'chart',     accent:'#820024', accentText:'var(--brand-text)',  totalLabel:'Net Assets',     financial:true},
  planSimplified:{iconName:'shield', accent:'#6b3fa0', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planAnnual:{iconName:'shield',     accent:'#4a3f9e', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planInitial:{iconName:'shield',    accent:'#2f6e8c', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
  planMinor:  {iconName:'shield',    accent:'#8a5a1e', accentText:'var(--accent-text)', totalLabel:'Filing Progress', financial:false},
};
function typeIcon(type,size){
  return ic((INVENTORY_TYPE_META[type]||{}).iconName||'folder',size||16);
}

function formatDashboardCurrency(v){
  if(v===null||v===undefined)return '—';
  const abs=Math.abs(v);
  const str=abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return v<0?`($${str})`:`$${str}`;
}

let _dashboardSearch='';
let _dashboardSort='lastModified'; // 'lastModified' | 'name' | 'total'
let _archivedSectionOpen=false;
let _dashboardGroupMode='type'; // 'type' | 'case' | 'flat'
// Type/case sections start collapsed — with several types or cases on file,
// showing every ward's full card by default is mostly whitespace. Keyed by
// 'type:<type>' or 'case:<mapKey>' so both grouping modes share one set
// without colliding; session-only, resets on reload like the group mode
// selection itself does.
let _dashboardExpandedSections=new Set();
function toggleDashboardSection(key){
  if(_dashboardExpandedSections.has(key))_dashboardExpandedSections.delete(key);
  else _dashboardExpandedSections.add(key);
  renderDashboardGrid();
}
const DASHBOARD_TYPE_ORDER=['guardian','simplified','annual','planInitial','planSimplified','planAnnual','planMinor'];

function getFilteredSortedWards(wards){
  const q=_dashboardSearch.trim().toLowerCase();
  let list=wards.filter(w=>!q||String(w.wardName||'').toLowerCase().includes(q));
  if(_dashboardSort==='name'){
    list=list.slice().sort((a,b)=>String(a.wardName||'').localeCompare(String(b.wardName||'')));
  }else if(_dashboardSort==='total'){
    list=list.slice().sort((a,b)=>(getWardHeadlineTotal(b)||0)-(getWardHeadlineTotal(a)||0));
  }else{
    list=list.slice().sort((a,b)=>new Date(b.lastModified||0)-new Date(a.lastModified||0));
  }
  return list;
}

// One deadline rule per inventory type, derived from a date field the
// guardian has already entered on that ward — never a separate "due date"
// input, so there's nothing extra to keep in sync. Each offset matches the
// statute cited in that type's own in-app help content. Returns dueDate:null
// when the underlying date field is still blank, so nothing is shown until
// there's real data to compute from.
function getWardDeadline(ward){
  const addDays=(dateStr,days)=>{
    if(!dateStr)return null;
    const d=new Date(String(dateStr).slice(0,10)+'T00:00:00');
    if(isNaN(d.getTime()))return null;
    d.setDate(d.getDate()+days);
    return d;
  };
  switch(formEngine(ward.inventoryType)){
    case 'guardian':
      return {dueDate:addDays(ward.gid,60),basis:'60 days after the Guardianship Inception Date (F.S. 744.365)'};
    case 'simplified':
    case 'annual':
      return {dueDate:addDays(ward.periodTo,90),basis:'90 days after the end of the accounting period (F.S. 744.367)'};
    case 'planInitial':
      return {dueDate:addDays(ward.lettersSignedDate,60),basis:'60 days after the Letters of Guardianship were signed (F.S. 744.632)'};
    case 'planAnnual':
    case 'planSimplified':
    case 'planMinor':
      return {dueDate:addDays(ward.periodTo,90),basis:'90 days after the end of the reporting period (F.S. 744.367)'};
    default:
      return {dueDate:null,basis:''};
  }
}

// Small badge shown on a ward card: overdue (red), due within two weeks
// (amber), or a plain future date (muted) — closed/archived cases never show
// one, since a deadline on a case that's already done is just noise.
function formatDeadlineBadge(ward){
  if(ward.archived)return '';
  const {dueDate,basis}=getWardDeadline(ward);
  if(!dueDate)return '';
  const today=new Date();today.setHours(0,0,0,0);
  const diffDays=Math.round((dueDate-today)/86400000);
  let cls,text;
  if(diffDays<0){cls='deadline-overdue';text=`${ic('alert',12)} ${Math.abs(diffDays)} day${Math.abs(diffDays)===1?'':'s'} overdue`;}
  else if(diffDays===0){cls='deadline-soon';text=`${ic('alert',12)} Due today`;}
  else if(diffDays<=14){cls='deadline-soon';text=`${ic('alert',12)} Due in ${diffDays} day${diffDays===1?'':'s'}`;}
  else{cls='deadline-ok';text=`Due ${dueDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;}
  return `<div class="ward-card-deadline ${cls}" title="${esc(basis)}">${text}</div>`;
}

function wardCardHTML(ward){
  const headline=getWardHeadlineTotal(ward);
  const meta=INVENTORY_TYPE_META[ward.inventoryType]||{iconName:'folder',accent:'#525d6e',accentText:'var(--ink-3)',totalLabel:'Total'};
  const typeLabel=INVENTORY_TYPES[ward.inventoryType]?.label||ward.inventoryType;
  const lastMod=ward.lastModified?formatRelativeTime(new Date(ward.lastModified).getTime()):'never saved';
  const isActive=ward.wardId===guardianData.activeWardId;
  const hasPeriod=ward.inventoryType!=='guardian'&&(ward.periodFrom||ward.periodTo);
  const hasGid=ward.inventoryType==='guardian'&&ward.gid;
  const periodHTML=hasPeriod?`<div class="ward-card-period">FY ${esc(fmtDateCard(ward.periodFrom)||'?')} – ${esc(fmtDateCard(ward.periodTo)||'?')}</div>`
    :hasGid?`<div class="ward-card-period">GID: ${esc(fmtDateCard(ward.gid)||'?')}</div>`:'';
  // A Plan holds no money, so a dollar headline would be meaningless (and a
  // bare "—" under a "Total" label reads as a real, zero figure). Show how
  // much of the filing is done instead.
  const isFinancial=meta.financial!==false;
  const prog=isFinancial?null:getWardProgress(ward);
  const headlineHTML=isFinancial
    ? `<div class="ward-card-total-label">${esc(meta.totalLabel)}</div>
       <div class="ward-card-total">${formatDashboardCurrency(headline)}</div>`
    : `<div class="ward-card-total-label">${esc(meta.totalLabel)}</div>
       <div class="ward-card-total">${prog?prog.pct:0}<span style="font-size:1rem;font-weight:600;">%</span></div>
       ${prog?`<div class="ward-card-modified">${prog.complete} of ${prog.total} sections complete</div>`:''}`;
  return `<div class="ward-card${isActive?' ward-card-active':''}${ward.archived?' ward-card-archived':''}" style="--card-accent:${meta.accent}">
    <div class="ward-card-header">
      <span class="ward-card-icon">${typeIcon(ward.inventoryType,20)}</span>
      <div class="ward-card-title">
        <div class="ward-card-name">${esc(ward.wardName||'(unnamed)')}</div>
        <div class="ward-card-type">${esc(typeLabel)}</div>
        ${periodHTML}
        ${formatDeadlineBadge(ward)}
      </div>
      ${isActive?'<span class="badge bg-primary ward-card-badge">Active</span>':ward.archived?'<span class="badge bg-secondary ward-card-badge">Closed</span>':''}
    </div>
    <div class="ward-card-body">
      ${headlineHTML}
      <div class="ward-card-modified">Last modified: ${esc(lastMod)}</div>
      ${(ward.years&&ward.years.length)?`<button type="button" class="btn btn-link ward-card-prior-years-link" onclick="showPriorYearsModal('${ward.wardId}')">${ward.years.length} prior year${ward.years.length===1?'':'s'} ▸</button>`:''}
    </div>
    <div class="ward-card-quick-actions">
      <button class="btn btn-sm btn-outline-secondary" title="Save an encrypted backup of just this ward" onclick="exportSingleWardZip('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.6v10.8"/><path d="m8.2 10.8 3.8 3.8 3.8-3.8"/><path d="M4.4 19.9h15.2"/></svg> Backup</button>
      <button class="btn btn-sm btn-outline-secondary" title="Open Print Preview to export a PDF" onclick="quickExportPdf('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> PDF</button>
      <button class="btn btn-sm btn-outline-secondary" title="Archive this year and open a new one" onclick="showStartNewYearModal('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5.6v12.8M5.6 12h12.8"/></svg> New Year</button>
      <button class="btn btn-sm btn-outline-secondary" title="${ward.archived?'Move back to active caseload':'Mark this case as closed'}" onclick="toggleWardArchived('${ward.wardId}')" aria-pressed="${!!ward.archived}">${ward.archived?ic('undo',14)+' Restore':ic('archive',14)+' Archive'}</button>
      <button class="btn btn-sm btn-outline-danger" title="Permanently delete this form" onclick="confirmDeleteWard('${ward.wardId}')"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.5 6.8h15"/><path d="M9.3 6.8V4.4h5.4v2.4"/><path d="M6.6 6.8 7.7 20h8.6l1.1-13.2"/></svg> Delete</button>
    </div>
    <div class="ward-card-footer">
      <button class="btn btn-sm btn-primary w-100" onclick="switchWard('${ward.wardId}')">${isActive?'Continue Editing →':'Open Ward →'}</button>
    </div>
  </div>`;
}

function renderDashboardSummary(){
  const container=document.getElementById('dashboard-summary-strip-container');
  if(!container)return;
  const activeWards=guardianData.wards.filter(w=>!w.archived);
  const combinedTotal=activeWards.reduce((s,w)=>s+(getWardHeadlineTotal(w)||0),0);
  const typeCounts=activeWards.reduce((acc,w)=>{acc[w.inventoryType]=(acc[w.inventoryType]||0)+1;return acc;},{});
  const typeChipsStr=Object.keys(typeCounts).map(t=>{
    const label=INVENTORY_TYPES[t]?.name||t;
    return `<span class="dashboard-type-chip" title="${esc(label)}">${typeIcon(t,13)}<span>${typeCounts[t]}</span></span>`;
  }).join('');
  const today=new Date();today.setHours(0,0,0,0);
  const dueSoonCount=activeWards.filter(w=>{
    const {dueDate}=getWardDeadline(w);
    if(!dueDate)return false;
    return Math.round((dueDate-today)/86400000)<=14;
  }).length;
  const dueSoonHTML=dueSoonCount>0
    ? `<div class="dashboard-stat"><div class="dashboard-stat-num" style="color:var(--warn-text);">${dueSoonCount}</div><div class="dashboard-stat-label">Due Within 14 Days</div></div>`
    : '';
  container.innerHTML=`<div class="dashboard-summary-strip">
    <div class="dashboard-stat"><div class="dashboard-stat-num">${activeWards.length}</div><div class="dashboard-stat-label">Active Wards</div></div>
    <div class="dashboard-stat"><div class="dashboard-stat-num">${formatDashboardCurrency(activeWards.length?combinedTotal:null)}</div><div class="dashboard-stat-label">Combined Total</div></div>
    ${dueSoonHTML}
    <div class="dashboard-stat dashboard-stat-wide"><div class="dashboard-type-chips">${typeChipsStr||'—'}</div><div class="dashboard-stat-label">By Inventory Type</div></div>
  </div>`;
}

// Shows a one-time "Continue where you left off" banner when the app
// resumes on a different ward than the one most recently worked on — e.g.
// it reopened to whatever was active last save, but that's not necessarily
// what was being edited right before closing. Gated on _appState.
// continuePromptShown (part of the .sav file now, not sessionStorage) so
// it doesn't reappear every time the dashboard re-renders.
function showContinuePromptIfNeeded(){
  const container=document.getElementById('continue-prompt-container');
  if(!container)return;
  container.innerHTML='';
  if(_appState.continuePromptShown)return;
  const recent=getRecentlyOpenedWards().filter(r=>!r.archived);
  const last=recent[0];
  if(!last||last.wardId===guardianData.activeWardId)return;
  _appState.continuePromptShown=true;
  saveAppState('continuePromptShown',true);
  const typeLabel=INVENTORY_TYPES[last.inventoryType]?.name||last.inventoryType;
  container.innerHTML=`<div class="continue-prompt-banner" id="continue-prompt-banner">
    <div class="continue-prompt-content">
      <span class="continue-prompt-icon">${typeIcon(last.inventoryType,20)}</span>
      <div class="continue-prompt-text">
        <div class="continue-prompt-label">Continue where you left off</div>
        <div class="continue-prompt-ward-name">${esc(last.wardName||'(unnamed)')}</div>
        <div class="continue-prompt-meta">${esc(typeLabel)} · ${formatRelativeTime(last.timestamp)}</div>
      </div>
      <button type="button" class="continue-prompt-btn" onclick="switchWard('${last.wardId}')">Open</button>
      <button type="button" class="continue-prompt-dismiss" onclick="document.getElementById('continue-prompt-container').innerHTML=''" aria-label="Dismiss">&times;</button>
    </div>
  </div>`;
}

function getDashboardDeadlineRows(){
  return guardianData.wards
    .filter(w=>!w.archived)
    .map(w=>({ward:w,...getWardDeadline(w)}))
    .filter(r=>r.dueDate)
    .sort((a,b)=>a.dueDate-b.dueDate);
}

// "Upcoming Deadlines" and "Recently Opened" used to be two separate boxes
// stacked on the dashboard — same information, but it read as clutter.
// They're merged into one panel with a tab switcher instead: same two
// lists, one card. Defaults to whichever tab actually has something to
// show (deadlines first, since that's the more actionable one) until the
// user picks a tab themselves, which sticks for the rest of the session.
let _dashboardWorklistTab=null; // null = auto-pick; else 'deadlines' | 'recent'
function setDashboardWorklistTab(tab){
  _dashboardWorklistTab=tab;
  renderDashboardWorklist();
}

function renderDashboardWorklist(){
  const container=document.getElementById('dashboard-worklist-container');
  if(!container)return;
  const topRow=document.getElementById('dashboard-top-row');
  const deadlineRows=getDashboardDeadlineRows();
  const recentRows=getRecentlyOpenedWards();
  if(!deadlineRows.length&&!recentRows.length){
    container.innerHTML='';
    if(topRow)topRow.classList.add('single-col');
    return;
  }
  if(topRow)topRow.classList.remove('single-col');
  const tab=_dashboardWorklistTab||(deadlineRows.length?'deadlines':'recent');
  const today=new Date();today.setHours(0,0,0,0);
  const SHOWN=8;

  const deadlineRowHTML=(r)=>{
    const diffDays=Math.round((r.dueDate-today)/86400000);
    const typeLabel=INVENTORY_TYPES[r.ward.inventoryType]?.name||r.ward.inventoryType;
    let cls,text;
    if(diffDays<0){cls='deadline-overdue';text=`${Math.abs(diffDays)} day${Math.abs(diffDays)===1?'':'s'} overdue`;}
    else if(diffDays===0){cls='deadline-soon';text='Due today';}
    else if(diffDays<=14){cls='deadline-soon';text=`Due in ${diffDays} day${diffDays===1?'':'s'}`;}
    else{cls='deadline-ok';text=`Due ${r.dueDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;}
    return `<button type="button" class="dashboard-deadline-row" onclick="switchWard('${r.ward.wardId}')" title="${esc(r.basis)}">
      <span class="dashboard-deadline-icon">${typeIcon(r.ward.inventoryType,16)}</span>
      <span class="dashboard-deadline-name">${esc(r.ward.wardName||'(unnamed)')}<span class="dashboard-deadline-type">${esc(typeLabel)}</span></span>
      <span class="ward-card-deadline ${cls}">${text}</span>
    </button>`;
  };
  const recentRowHTML=(r)=>{
    const isActive=r.wardId===guardianData.activeWardId;
    const typeLabel=INVENTORY_TYPES[r.inventoryType]?.name||r.inventoryType;
    return `<button type="button" class="recent-ward-item${isActive?' recent-active':''}" onclick="switchWard('${r.wardId}')">
      <span class="recent-ward-icon">${typeIcon(r.inventoryType,16)}</span>
      <span class="recent-ward-info">
        <span class="recent-ward-name">${esc(r.wardName||'(unnamed)')}${isActive?' <span class="badge bg-primary ward-card-badge">Active</span>':''}</span>
        <span class="recent-ward-type">${esc(typeLabel)}${r.archived?' · Closed':''}</span>
      </span>
      <span class="recent-ward-time">${formatRelativeTime(r.timestamp)}</span>
    </button>`;
  };

  let bodyHTML;
  if(tab==='deadlines'){
    const shown=deadlineRows.slice(0,SHOWN);
    const overflow=deadlineRows.length-shown.length;
    bodyHTML=shown.length
      ?`<div class="dashboard-deadlines-list">${shown.map(deadlineRowHTML).join('')}</div>${overflow>0?`<div class="dashboard-deadlines-more">+${overflow} more, sorted by due date</div>`:''}`
      :`<div class="dashboard-empty-inline">No upcoming deadlines yet.</div>`;
  }else{
    bodyHTML=recentRows.length
      ?`<div class="recently-opened-list">${recentRows.map(recentRowHTML).join('')}</div>`
      :`<div class="dashboard-empty-inline">Nothing opened yet.</div>`;
  }

  const tabBtn=(key,label,count)=>`<button type="button" class="dashboard-worklist-tab${tab===key?' active':''}" onclick="setDashboardWorklistTab('${key}')">${esc(label)}${count?` <span class="dashboard-worklist-tab-count">${count}</span>`:''}</button>`;

  container.innerHTML=`<div class="dashboard-deadlines-panel">
    <div class="dashboard-worklist-tabs">
      ${tabBtn('deadlines','Deadlines',deadlineRows.length)}
      ${tabBtn('recent','Recent',recentRows.length)}
    </div>
    ${bodyHTML}
  </div>`;
}

function renderGroupedWardSections(wards){
  if(!wards.length)return '<div class="dashboard-empty-inline">No matching active wards.</div>';
  const known=new Set(DASHBOARD_TYPE_ORDER);
  const groups=DASHBOARD_TYPE_ORDER.map(t=>({type:t,wards:wards.filter(w=>w.inventoryType===t)}))
    .concat([{type:null,wards:wards.filter(w=>!known.has(w.inventoryType))}])
    .filter(g=>g.wards.length);
  return groups.map(g=>{
    const meta=INVENTORY_TYPE_META[g.type]||{iconName:'folder',accent:'#525d6e',accentText:'var(--ink-3)'};
    const typeName=g.type?(INVENTORY_TYPES[g.type]?.name||g.type):'Other';
    // Summing a group of Plans would print a bold "$0.00" beside the
    // heading, which reads as a real balance rather than "not applicable" —
    // so non-financial groups get no subtotal at all.
    const subtotal=g.wards.reduce((s,w)=>s+(getWardHeadlineTotal(w)||0),0);
    const subtotalHTML=meta.financial===false?''
      :`<span class="dashboard-type-header-subtotal" style="color:${meta.accentText}">${formatDashboardCurrency(subtotal)}</span>`;
    const key=`type:${g.type||'other'}`;
    const isOpen=_dashboardExpandedSections.has(key);
    return `<div class="dashboard-type-section${isOpen?'':' is-collapsed'}">
      <button type="button" class="dashboard-type-header" style="border-left-color:${meta.accent}" onclick="toggleDashboardSection('${key}')" aria-expanded="${isOpen}">
        <span class="dashboard-type-header-chevron">${isOpen?'▾':'▸'}</span>
        <span class="dashboard-type-header-icon" style="color:${meta.accentText}">${typeIcon(g.type,17)}</span>
        <span class="dashboard-type-header-name">${esc(typeName)}</span>
        <span class="dashboard-type-header-count">${g.wards.length} ward${g.wards.length===1?'':'s'}</span>
        ${subtotalHTML}
      </button>
      ${isOpen?`<div class="dashboard-grid">${g.wards.map(wardCardHTML).join('')}</div>`:''}
    </div>`;
  }).join('');
}

// Three modes rather than a boolean. "By Case" exists because one person can
// require several filings at once — a guardian of both person and property
// files an Accounting AND a Plan — and those live as separate ward records
// sharing a case number. Grouping by case puts that person back together.
const DASHBOARD_GROUP_MODES=['type','case','flat'];
function dashboardGroupLabel(mode){
  return mode==='type'?ic('list',15)+' Grouped by Type'
    :mode==='case'?ic('folder',15)+' Grouped by Case'
    :ic('grid',15)+' Flat Grid';
}
function toggleDashboardGrouping(){
  const i=DASHBOARD_GROUP_MODES.indexOf(_dashboardGroupMode);
  _dashboardGroupMode=DASHBOARD_GROUP_MODES[(i+1)%DASHBOARD_GROUP_MODES.length];
  const btn=document.getElementById('dashboard-group-toggle');
  if(btn){
    btn.innerHTML=dashboardGroupLabel(_dashboardGroupMode);
    btn.className=`btn btn-sm ${_dashboardGroupMode==='flat'?'btn-outline-secondary':'btn-secondary'}`;
    btn.setAttribute('aria-pressed',String(_dashboardGroupMode!=='flat'));
  }
  renderDashboardGrid();
}

// Groups by case number so every filing for one person sits together.
// Wards with no case number yet can't be matched to anything, so they are
// listed individually rather than lumped into a misleading shared group.
function renderCaseWardSections(wards){
  if(!wards.length)return '<div class="dashboard-empty-inline">No matching active wards.</div>';
  const groups=new Map();
  wards.forEach(w=>{
    const c=String(w.caseNumber||'').trim();
    const key=c||`__nocase__${w.wardId}`;
    if(!groups.has(key))groups.set(key,{mapKey:key,caseNumber:c,wards:[]});
    groups.get(key).wards.push(w);
  });
  return [...groups.values()].map(g=>{
    const names=[...new Set(g.wards.map(w=>String(w.wardName||'').trim()).filter(Boolean))];
    const title=names.length?names.join(' / '):'(unnamed)';
    const sub=g.caseNumber?esc(g.caseNumber):'No case number yet';
    const sectionKey=`case:${g.mapKey}`;
    const isOpen=_dashboardExpandedSections.has(sectionKey);
    // g.mapKey is user-typed case number text (or a safe internal wardId
    // fallback) — escape quotes/backslashes so it can't break out of the
    // inline onclick string.
    const jsKey=sectionKey.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `<div class="dashboard-type-section${isOpen?'':' is-collapsed'}">
      <button type="button" class="dashboard-type-header" style="border-left-color:var(--accent)" onclick="toggleDashboardSection('${jsKey}')" aria-expanded="${isOpen}">
        <span class="dashboard-type-header-chevron">${isOpen?'▾':'▸'}</span>
        <span class="dashboard-type-header-icon" style="color:var(--accent-text)">${ic('folder',17)}</span>
        <span class="dashboard-type-header-name">${esc(title)}</span>
        <span class="dashboard-type-header-count">${sub}</span>
        <span class="dashboard-type-header-count">${g.wards.length} filing${g.wards.length===1?'':'s'}</span>
      </button>
      ${isOpen?`<div class="dashboard-grid">${g.wards.map(wardCardHTML).join('')}</div>`:''}
    </div>`;
  }).join('');
}

function renderDashboardGrid(){
  const container=document.getElementById('dashboard-grid-container');
  if(!container)return;
  const allWards=guardianData.wards;
  if(!allWards.length){
    container.innerHTML=`<div class="dashboard-empty">
      <div style="color:var(--ink-4);margin-bottom:.4rem;"><svg class="ic" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h9.6V19H3.4Z"/></svg></div>
      <p class="text-muted">No wards yet.</p>
      <button class="btn btn-primary btn-sm" onclick="showAddWardModal()">+ Add Your First Ward</button>
    </div>`;
    return;
  }
  const filtered=getFilteredSortedWards(allWards);
  const active=filtered.filter(w=>!w.archived);
  const archived=filtered.filter(w=>w.archived);
  const totalArchivedCount=allWards.filter(w=>w.archived).length;

  let html=_dashboardGroupMode==='type'
    ? renderGroupedWardSections(active)
    : _dashboardGroupMode==='case'
    ? renderCaseWardSections(active)
    : `<div class="dashboard-grid">${active.map(wardCardHTML).join('')||'<div class="dashboard-empty-inline">No matching active wards.</div>'}</div>`;

  if(totalArchivedCount>0){
    html+=`<div class="dashboard-section-divider">
      <button class="btn btn-sm btn-outline-secondary" onclick="toggleArchivedSection()" aria-expanded="${_archivedSectionOpen}" aria-controls="archived-wards-grid">${_archivedSectionOpen?'▾':'▸'} Archived / Closed Wards (${totalArchivedCount})</button>
    </div>`;
    if(_archivedSectionOpen){
      html+=`<div class="dashboard-grid dashboard-grid-archived" id="archived-wards-grid">${archived.map(wardCardHTML).join('')||'<div class="dashboard-empty-inline">No matching archived wards.</div>'}</div>`;
    }
  }
  container.innerHTML=html;
}

function toggleArchivedSection(){
  _archivedSectionOpen=!_archivedSectionOpen;
  renderDashboardGrid();
}

async function toggleWardArchived(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  ward.archived=!ward.archived;
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  renderDashboardSummary();
  renderDashboardWorklist();
  renderDashboardGrid();
}

async function quickExportPdf(wardId){
  await switchWard(wardId);
  navigate('/print');
}

async function exportSingleWardZip(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  try{
    if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot export.');return;}
    if(ward.wardId===guardianData.activeWardId)await flushPendingSave();
    const salt=await loadAppState('cryptoSalt');
    const zip=new JSZip();
    const file=`wards/${ward.wardId}.enc`;
    zip.file(file,await encryptJSON(ward));
    zip.file('manifest.json',JSON.stringify({
      format:'probate-guardian-export',
      version:1,
      exportedAt:new Date().toISOString(),
      salt,
      guardian:await encryptJSON({guardianName:guardianData.guardianName,guardianEmail:guardianData.guardianEmail}),
      wards:[{wardId:ward.wardId,file}]
    },null,2));
    const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
    const stem=(ward.wardName||'ward').trim().replace(/\s+/g,'_')||'ward';
    await saveBlobAs(blob,`${stem}_backup.sav`);
    auditLog('DATA_EXPORT',`Exported single ward "${ward.wardName}" to archive`,true);
    alert(`Backup saved for ${ward.wardName||'this ward'}.`);
  }catch(e){
    if(e&&e.name==='AbortError')return;
    console.error('single ward export failed',e);
    auditLog('DATA_EXPORT',String(e&&e.message||e),false);
    alert('Export failed: '+(e&&e.message||e));
  }
}

function pageDashboard(){
  return `<div class="schedule-page">
    <div id="continue-prompt-container"></div>
    <h1>All Wards — Dashboard</h1>
    <div class="dashboard-toolbar">
      <span class="dashboard-search-wrap">${ic('search',15)}<input type="text" id="dashboard-search" class="form-control form-control-sm dashboard-search-input" placeholder="Search wards by name…" aria-label="Search wards by name" value="${esc(_dashboardSearch)}" oninput="_dashboardSearch=this.value;renderDashboardGrid();"></span>
      <select id="dashboard-sort" class="form-select form-select-sm dashboard-sort-select" aria-label="Sort wards by" onchange="_dashboardSort=this.value;renderDashboardGrid();">
        <option value="lastModified"${_dashboardSort==='lastModified'?' selected':''}>Sort: Last Modified</option>
        <option value="name"${_dashboardSort==='name'?' selected':''}>Sort: Name (A–Z)</option>
        <option value="total"${_dashboardSort==='total'?' selected':''}>Sort: Total (High–Low)</option>
      </select>
      <button id="dashboard-group-toggle" class="btn btn-sm ${_dashboardGroupMode==='flat'?'btn-outline-secondary':'btn-secondary'}" onclick="toggleDashboardGrouping()" aria-pressed="${_dashboardGroupMode!=='flat'}" title="Cycle between grouping wards by type, by case number, and a flat grid">${dashboardGroupLabel(_dashboardGroupMode)}</button>
    </div>
    <div id="dashboard-summary-strip-container"></div>
    <div class="dashboard-top-row" id="dashboard-top-row">
      <div id="dashboard-worklist-container"></div>
      <div class="inventory-convert-banner" onclick="showConvertWardModal()" role="button" tabindex="0" aria-label="Select an existing ward to create a new form for" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showConvertWardModal();}">
        <span class="inventory-convert-icon"><svg class="ic" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.4 8.6h13.2"/><path d="m14.4 5.4 3.2 3.2-3.2 3.2"/><path d="M19.6 15.4H6.4"/><path d="m9.6 12.2-3.2 3.2 3.2 3.2"/></svg></span>
        <div class="inventory-convert-text">
          <div class="inventory-convert-title">Select an Existing Ward</div>
          <div class="inventory-convert-desc">Select any ward below to create a new form of a different inventory type — e.g. Initial Inventory → Annual Accounting — and carry its data over instead of starting from scratch.</div>
        </div>
        <span class="btn btn-outline-primary btn-sm" aria-hidden="true">Select Ward</span>
      </div>
    </div>
    <div id="dashboard-grid-container"></div>
  </div>`;
}

function renderPage(page){
  const el=document.getElementById('main-content');

  if(page==='/dashboard'){
    updateHelpContext('default');
    // Redirect to inventory selector if no wards exist
    if(guardianData.wards.length===0){
      currentPage='/inventory-select';
      window.location.hash='/inventory-select';
      updateHelpContext('inventory-select');
      el.innerHTML=pageInventorySelector();
      linkLabelsToInputs();
      return;
    }
    el.innerHTML=pageDashboard();
    showContinuePromptIfNeeded();
    renderDashboardSummary();
    renderDashboardWorklist();
    renderDashboardGrid();
    return;
  }

  if(page==='/inventory-select'){
    updateHelpContext('inventory-select');
    el.innerHTML=pageInventorySelector();
    linkLabelsToInputs();
    return;
  }

  if(page==='/activity-log'){
    updateHelpContext('default');
    el.innerHTML=pageActivityLog();
    loadAndRenderActivityLog();
    return;
  }

  if(!activeInventoryType){
    currentPage='/inventory-select';
    window.location.hash='/inventory-select';
    updateHelpContext('inventory-select');
    el.innerHTML=pageInventorySelector();
    linkLabelsToInputs();
    return;
  }

  // Update help context based on inventory type. updateHelpContext() takes
  // no arguments and re-derives the context from activeInventoryType
  // itself (see its definition) -- every branch below was passing it a
  // string it silently ignored, a duplicate of logic that already lives in
  // that one function. Found while extracting Plan Simplified (Milestone 3,
  // Phase B); fixed for all types, not just that one, since the same
  // ignored-argument pattern applied to every branch here.
  updateHelpContext();

  // Track this page as visited
  const pageKey=getCurrentPageKey();
  if(pageKey)_visitedPages.add(pageKey);

  switch(formEngine(activeInventoryType)){
    case 'guardian': renderPageGuardian(page);break;
    case 'simplified': mountSimplifiedFeature(page);break;
    case 'annual': renderPageAnnual(page);break;
    case 'planSimplified': mountPlanSimplifiedFeature(page);break;
    case 'planAnnual': renderPagePlanAnnual(page);break;
    case 'planInitial': renderPagePlanInitial(page);break;
    case 'planMinor': renderPagePlanMinor(page);break;
  }
  linkLabelsToInputs();
  enforceDateRanges();
  setupAmountFieldValidation();
  updateNavDots();
  initPrintPager(); // no-ops unless the rendered page is a print preview
}

// Populates the sidebar's active-ward info card (icon, type, live headline
// total) from the currently active ward. Shared by updateSidebar() (on load
// / ward switch) and afterChange() (on every Initial Inventory field edit,
// so the headline total there updates live as the user types) — a single
// function so both call sites can't drift into showing different content.
// The "Name of Ward" field on Cover & Summary writes D.wardName directly --
// the same object reference guardianData.wards holds, so the underlying
// data is always correct -- but the sidebar's Active Ward selector only
// gets its displayed text from the last full updateSidebar() render, which
// typing in that field never triggers. A full re-render on every keystroke
// would be a lot of needless DOM work (rebuilds the whole nav list) just to
// keep one text input in sync, so this only touches that one input.
function syncActiveWardNameDisplay(){
  const inp=document.getElementById('ward-selector');
  if(inp&&window.D)inp.value=window.D.wardName||'';
}

// The header's "Guardian: —" line used to show only guardianData.guardianName
// -- the app-level "your name" entered once at setup, never anything about
// the CURRENT form. Every form type's Cover page has its own field for the
// guardian actually identified on THIS filing (named differently per type:
// guardian, guardianName, or guardianNames -- see each emptyDataXxx()), so
// that's tried first, in the order it's most likely to already be filled
// in (the simple Cover-page field, before the more detailed guardians[]
// signature-page array some types also have); the app-level name is still
// the fallback for a form with nothing entered yet, or the rare type
// (Simplified Plan) that never asks for a guardian name at all.
function getPrimaryGuardianDisplayName(){
  const d=window.D;
  if(!d)return guardianData.guardianName||'';
  return d.guardian||d.guardianName||d.guardianNames
    ||(Array.isArray(d.guardians)&&d.guardians[0]&&d.guardians[0].name)
    ||guardianData.guardianName||'';
}
// Same "sync just this one element" reasoning as syncActiveWardNameDisplay()
// above -- typing in a guardian-name field never triggers a full
// updateSidebar() rebuild, so this is wired into every place one of those
// fields can actually be edited instead.
function syncGuardianNameDisplay(){
  const el=document.getElementById('guardian-name-display');
  if(el)el.textContent=`Guardian: ${getPrimaryGuardianDisplayName()||'—'}`;
}

function refreshWardInfoCard(){
  const wardInfo=document.getElementById('ward-info-display');
  if(!wardInfo)return;
  const ward=getActiveWard();
  if(!ward){
    wardInfo.style.display='none';
    wardInfo.innerHTML='';
    return;
  }
  const meta=INVENTORY_TYPE_META[ward.inventoryType]||{iconName:'folder',accent:'#525d6e',accentText:'var(--ink-3)',totalLabel:'Total'};
  const headline=getWardHeadlineTotal(ward);
  wardInfo.style.display='block';
  wardInfo.style.borderLeftColor=meta.accent;
  // ?. guard: an unregistered type here would throw and blank the sidebar.
  const typeName=INVENTORY_TYPES[ward.inventoryType]?.name||ward.inventoryType;
  // Non-financial types (Plans) have no total worth showing — the progress
  // bar rendered just below already is the meaningful headline, so the
  // dollar lines are dropped rather than shown as an empty "—".
  const totalHTML=meta.financial===false?''
    :`<div class="ward-info-total-label">${esc(meta.totalLabel)}</div>
      <div class="ward-info-total">${formatDashboardCurrency(headline)}</div>`;
  wardInfo.innerHTML=`<div class="ward-info-head">
      <span class="ward-info-icon" style="color:${meta.accentText}">${typeIcon(ward.inventoryType,16)}</span>
      <span class="ward-info-type" style="color:${meta.accentText}">${esc(typeName)}</span>
    </div>
    ${totalHTML}
    <div class="ward-progress" id="ward-progress"></div>`;
  updateNavDots(); // populates #ward-progress from the same completion check as the nav ✓/⚠ marks
}

// Ward-management controls (the whole topnav row -- All Wards, theme,
// help -- plus Switch Ward / +New Form / Rename+Delete -- everything tagged
// .ward-collapsible) collapse automatically the first time a form becomes
// active, to give the
// schedule/certification/output list below more room while it's actually
// being filled out. _wardControlsUserToggled latches once the user clicks
// the toggle so their choice sticks for the rest of the session, including
// across switching to a different ward, instead of silently re-collapsing
// under them every time updateSidebar() runs.
let _wardControlsCollapsed=false;
let _wardControlsUserToggled=false;
function applyWardControlsCollapsedState(){
  document.querySelectorAll('.ward-collapsible').forEach(el=>{
    el.style.display=_wardControlsCollapsed?'none':'';
  });
  const btn=document.getElementById('ward-controls-toggle-btn');
  if(!btn)return;
  btn.textContent=_wardControlsCollapsed?'Show ward controls ▾':'Hide ward controls ▴';
  btn.setAttribute('aria-expanded',String(!_wardControlsCollapsed));
}
function toggleWardControls(){
  _wardControlsCollapsed=!_wardControlsCollapsed;
  _wardControlsUserToggled=true;
  applyWardControlsCollapsedState();
}

// Same pattern as the ward controls above, for the backup/auto-save block
// at the bottom of the sidebar: collapses automatically once a form is
// active, leaving just the two status lines (last-saved / auto-save-armed)
// visible, so the schedule list gets the room back at both ends of the
// sidebar rather than just the top. #save-controls-body is one plain div
// toggled as a unit -- see the HTML comment above it for why not per-child.
let _saveControlsCollapsed=false;
let _saveControlsUserToggled=false;
function applySaveControlsCollapsedState(){
  const body=document.getElementById('save-controls-body');
  if(body)body.style.display=_saveControlsCollapsed?'none':'';
  const btn=document.getElementById('save-controls-toggle-btn');
  if(!btn)return;
  btn.textContent=_saveControlsCollapsed?'Show save controls ▾':'Hide save controls ▴';
  btn.setAttribute('aria-expanded',String(!_saveControlsCollapsed));
}
function toggleSaveControls(){
  _saveControlsCollapsed=!_saveControlsCollapsed;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}

function updateSidebar(){
  const sidebar=document.getElementById('sidebar');
  if(guardianData.wards.length===0){
    sidebar.style.display='none';
    return;
  }
  sidebar.style.display='';

  // Update guardian name
  syncGuardianNameDisplay();

  // Update ward selector
  const selector=document.getElementById('ward-selector');
  const activeWardId=guardianData.activeWardId;
  const activeWard=guardianData.wards.find(w=>w.wardId===activeWardId);
  selector.value=activeWard?activeWard.wardName:'';
  selector.dataset.wardId=activeWardId||'';

  // Show ward info if active
  refreshWardInfoCard();
  const renameBtn=document.getElementById('rename-ward-btn');
  const deleteBtn=document.getElementById('delete-ward-btn');

  if(activeWardId){
    renameBtn.style.display='block';
    deleteBtn.style.display='block';
  }else{
    renameBtn.style.display='none';
    deleteBtn.style.display='none';
  }

  // The toggle itself only makes sense once there's something to toggle --
  // hidden on a fresh install with no ward selected yet.
  const toggleBtn=document.getElementById('ward-controls-toggle-btn');
  if(toggleBtn)toggleBtn.style.display=activeWardId?'block':'none';
  if(activeInventoryType&&!_wardControlsUserToggled)_wardControlsCollapsed=true;
  applyWardControlsCollapsedState();

  const saveToggleBtn=document.getElementById('save-controls-toggle-btn');
  if(saveToggleBtn)saveToggleBtn.style.display=activeWardId?'block':'none';
  if(activeInventoryType&&!_saveControlsUserToggled)_saveControlsCollapsed=true;
  applySaveControlsCollapsedState();

  if(!activeInventoryType)return;
  const typeConfig=INVENTORY_TYPES[activeInventoryType];
  // The header keeps the product name; the active form type gets its own
  // strip beneath it so the app is always identifiable.
  const ctx=document.getElementById('sidebar-context');
  if(ctx){
    ctx.style.display='flex';
    document.getElementById('sidebar-context-icon').innerHTML=
      typeIcon(activeInventoryType,13);
    document.getElementById('sidebar-context-label').textContent=typeConfig.name;
  }
  const navContainer=document.getElementById('nav-sections');

  switch(formEngine(activeInventoryType)){
    case 'guardian': buildNavGuardian(navContainer);break;
    case 'simplified': mountSimplifiedNav(navContainer);break;
    case 'annual': buildNavAnnual(navContainer);break;
    case 'planSimplified': mountPlanSimplifiedNav(navContainer);break;
    case 'planAnnual': buildNavPlanAnnual(navContainer);break;
    case 'planInitial': buildNavPlanInitial(navContainer);break;
    case 'planMinor': buildNavPlanMinor(navContainer);break;
  }
}

// ═══════════════════════════════════════════════════════
// CONVERT EXISTING WARD — creates a new ward of a different inventory type,
// carrying over header info always, and schedule/asset data wherever the
// source and target types have a genuine real-world equivalent. See the
// per-pair functions below for exactly what maps where and why.
// ═══════════════════════════════════════════════════════

// "Ward" combobox on this modal — same typeable + click-to-browse pattern as
// the sidebar's Active Ward picker, applied here to picking a source ward.
function convertSourceItems(){
  return guardianData.wards.map(w=>({
    wardId:w.wardId,
    label:w.wardName||'(unnamed)',
    sub:INVENTORY_TYPES[w.inventoryType]?.name||w.inventoryType
  }));
}
function convertSourceShowDropdown(query){
  const input=document.getElementById('convert-source-ward');
  const dropdown=document.getElementById('convert-source-ward-dropdown');
  comboboxRenderDropdown(dropdown,comboboxFilterItems(convertSourceItems(),query),item=>{
    input.value=item.label;
    input.dataset.wardId=item.wardId;
    comboboxHide(dropdown);
    updateConvertTargetOptions();
  });
}
function onConvertSourceInput(){
  document.getElementById('convert-source-ward').dataset.wardId='';
  convertSourceShowDropdown(document.getElementById('convert-source-ward').value);
}
function onConvertSourceFocus(){
  // Focusing (rather than typing) shows every ward, even though the field
  // may already be pre-filled with a ward's name.
  convertSourceShowDropdown('');
}
function onConvertSourceKeydown(e){
  const dropdown=document.getElementById('convert-source-ward-dropdown');
  if(e.key==='Escape')comboboxHide(dropdown);
  else if(e.key==='Enter')e.preventDefault();
}
document.addEventListener('click',e=>{
  const wrap=document.getElementById('convert-source-ward-wrap');
  if(wrap&&!wrap.contains(e.target))comboboxHide(document.getElementById('convert-source-ward-dropdown'));
});

async function showConvertWardModal(){
  if(!guardianData.wards.length){
    alert('You don\'t have any existing forms yet to convert. Create a form first using one of the options above, then come back here to convert it later if needed.');
    return;
  }
  await ensureFragment('common-modals');
  const first=guardianData.wards[0];
  const input=document.getElementById('convert-source-ward');
  input.value=first.wardName||'(unnamed)';
  input.dataset.wardId=first.wardId;
  updateConvertTargetOptions();
  showModal('convertWardModal');
}

// The Accounting types (guardian/simplified/annual) can convert freely
// among themselves — that has worked since before Plans existed. Plans only
// support one additional, well-defined direction EACH WAY: an Accounting
// type into its own matching Plan type, or that Plan type back into its
// Accounting type (guardian<->planInitial, etc — the same pairing
// CARRY_SOURCE_TYPE uses for the Add Ward picker, since it's symmetric).
// Every other Plan-related pair (Plan->Plan, Accounting->non-matching Plan,
// anything with planMinor, which has no Accounting counterpart) is left out
// rather than shown with field mapping that doesn't actually apply.
function convertTargetsFor(srcType){
  // Any target that names this source as a valid carry source, minus the
  // source's own type. Derived from CARRY_SOURCE_TYPE so the two stay in
  // step — adding a new accounting type only has to be declared there.
  return Object.keys(CARRY_SOURCE_TYPE)
    .filter(target=>target!==srcType&&carrySourcesFor(target).includes(srcType));
}

function updateConvertTargetOptions(){
  const wardId=document.getElementById('convert-source-ward').dataset.wardId||'';
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  const targetSel=document.getElementById('convert-target-type');
  const noteEl=document.getElementById('convert-note');
  if(!ward){targetSel.innerHTML='';noteEl.textContent='';return;}
  const others=convertTargetsFor(ward.inventoryType);
  if(!others.length){
    targetSel.innerHTML='';
    noteEl.textContent=`${INVENTORY_TYPES[ward.inventoryType].name} wards can't be converted to another type.`;
    return;
  }
  targetSel.innerHTML=others.map(t=>`<option value="${t}">${esc(INVENTORY_TYPES[t].name)}</option>`).join('');
  targetSel.onchange=()=>updateConvertNotePreview(ward.inventoryType,targetSel.value);
  updateConvertNotePreview(ward.inventoryType,targetSel.value);
}

function updateConvertNotePreview(srcType,destType){
  const noteEl=document.getElementById('convert-note');
  noteEl.textContent=describeConversion(srcType,destType);
}

// One human-readable description per source→target pair, shown before
// converting and reused in the confirmation alert afterward — so the
// explanation of what will/won't carry over is never out of sync with what
// the code actually does below.
function describeConversion(srcType,destType){
  if(srcType==='guardian'&&formEngine(destType)==='annual'){
    return 'Real estate, cash accounts, personal property, intangible assets, debts, income sources, and trusts are carried into the matching schedules, along with the attorney block and certificate of service. Review each schedule afterward — carrying values and this year\'s actual activity still need to be confirmed.';
  }
  if(srcType==='guardian'&&destType==='simplified'){
    return 'The Initial Inventory\'s total Ward\'s Value becomes the Starting Balance, and the attorney block and certificate of service recipients are carried over too. Simplified Accounting has no asset schedules, so itemised assets collapse into that single figure rather than transferring line by line.';
  }
  if(formEngine(srcType)==='annual'&&destType==='simplified'){
    return 'The Annual Accounting\'s net asset total becomes the Starting Balance, and the reporting period, attorney block, certificate of service and any remuneration are carried over too. Simplified Accounting has no asset schedules, so itemised schedule data collapses into that single figure rather than transferring line by line.';
  }
  if(srcType==='simplified'&&formEngine(destType)==='annual'){
    return 'The Simplified Accounting\'s Ending Balance becomes the Starting Balance, and the reporting period, attorney block, certificate of service and any remuneration are carried over too. Since Simplified Accounting doesn\'t track itemized assets, the new Annual Accounting\'s schedules start blank for you to complete.';
  }
  if(carrySourcesFor(destType).includes(srcType)){
    return `This creates a new ${INVENTORY_TYPES[destType].name} for the same ward. The ward's name, case number, county, and guardian contact details are carried over exactly as entered — nothing is renamed. Everything specific to this new filing (residence and care details, schedules, signatures, etc.) starts blank for you to complete.`;
  }
  return 'Only case, guardian, and attorney information will be carried over. An Initial Inventory is a point-in-time snapshot of assets as of the Guardianship Inception Date, which can\'t be derived from an accounting period record — asset schedules will need to be completed manually.';
}

// Header fields exist on all three types but under different names in a few
// spots (e.g. guardianName vs guardian) — this copies whichever fields the
// source and target actually have in common.
function mapConvertedHeaderFields(src,srcType,dest,destType){
  dest.wardName=src.wardName?`${src.wardName} (Converted)`:dest.wardName;
  dest.caseNumber=src.caseNumber||dest.caseNumber;
  if('gid' in dest)dest.gid=src.gid||dest.gid;
  dest.county=src.county||dest.county;
  dest.typeOfGuardianship=src.typeOfGuardianship||dest.typeOfGuardianship;

  const srcGuardianName=srcType==='guardian'?src.guardianName:src.guardian;
  const srcAttorneyName=srcType==='guardian'?src.attorneyForGuardian:src.attorney;
  if(formEngine(destType)==='guardian'){
    dest.guardianName=srcGuardianName||dest.guardianName;
    dest.attorneyForGuardian=srcAttorneyName||dest.attorneyForGuardian;
  }else{
    dest.guardian=srcGuardianName||dest.guardian;
    dest.attorney=srcAttorneyName||dest.attorney;
  }
}

// Initial Inventory → Annual Accounting: maps each schedule to its closest
// real-world equivalent. Carrying value defaults to full value (the normal
// starting assumption before any market change is recorded), and this
// year's actual income/activity is left for the user to confirm rather than
// silently assumed from the inventory's projected figures.
function convertGuardianSchedulesToAnnual(src,dest){
  dest.schD1=(src.scheduleB1||[]).map(r=>({
    description:[r.institutionName,r.accountType].filter(Boolean).join(' — '),
    accountNo:r.accountNumber||'', restricted:r.isRestricted?'Yes':'No', type:r.accountType||'',
    fullAmount:r.fullAssetAmount||'', wardPct:r.wardPercent||'', restrictedAmt:''
  }));
  dest.schD2=(src.scheduleA1||[]).map(r=>({
    description:r.propertyDescription||'', residence:r.isPersonalResidence?'Yes':'No', income:r.isIncomeProperty?'Yes':'No',
    fullValue:r.fullAssetValue||'', wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardValue:''
  }));
  dest.schD3=(src.scheduleB2||[]).map(r=>({
    description:r.description||'', fullAmount:r.fullAssetValue||'', wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardAmount:''
  }));
  dest.schD4=(src.scheduleB3||[]).map(r=>({
    description:r.description||'', restricted:r.isRestricted?'Yes':'No', fullAmount:r.fullAssetValue||'',
    wardPct:r.wardPercent||'', carryingValue:r.fullAssetValue||'', wardValue:'', restrictedAmt:''
  }));
  dest.schD5=[
    ...(src.scheduleA2||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:r.fullDebtBalance||'',wardPct:r.wardPercent||'',wardBalance:''})),
    ...(src.scheduleB4||[]).map(r=>({description:r.lenderName||'',loanNo:r.accountNumber||'',loanType:r.liabilityType||'',fullDebt:r.fullLiabilityBalance||'',wardPct:r.wardPercent||'',wardBalance:''}))
  ];
  dest.schA=(src.scheduleC1||[]).map(r=>({payer:r.payerName||'',description:r.typeOfIncome||'',bank:'',accountNo:'',amount:r.annualIncomeAmount||''}));
  const trustRows=(src.scheduleC4||[]).map(r=>({
    hasTrust:'Yes', createdAfterGID:'No', name:r.trustName||'', trustee:r.trusteeName||'',
    accountNo:r.accountNumber||'', dateCreated:r.dateCreated||'', trustType:r.trustType||'',
    wardPct:r.wardPercent||'', wardAmount:''
  }));
  while(trustRows.length<3)trustRows.push(emptyRowAnnual('trust'));
  dest.trusts=trustRows.slice(0,3);
}

// Non-schedule fields that move from an Initial Inventory into an Annual
// (or Final/Trust) Accounting: the attorney block and the certificate of
// service. Signature dates are never carried — the new filing is signed and
// served on its own date.
function convertGuardianExtrasToAnnual(src,dest){
  const a=src.attorney||{}, sa=src.serviceAttorney||{};
  dest.attorney_bar=a.barNumber||'';
  dest.attorney_phone=a.phone||'';
  dest.attorney_street=a.streetAddress||'';
  dest.attorney_cityStateZip=a.cityStateZip||'';
  dest.attorney_county=src.county||dest.attorney_county||'Pinellas';
  // Initial Inventory recipients are name / address / cityStateZip; the
  // Annual form gives each recipient four lines, so they map straight over
  // with the fourth left free.
  (src.serviceRecipients||[]).slice(0,4).forEach((r,i)=>{
    if(!dest.certRecipients[i])dest.certRecipients[i]={name:'',line2:'',line3:'',line4:''};
    dest.certRecipients[i]={name:r.name||'',line2:r.address||'',line3:r.cityStateZip||'',line4:''};
  });
  if(sa.barNumber&&!dest.attorney_bar)dest.attorney_bar=sa.barNumber;
}

// Everything that has a genuine counterpart on the Simplified Accounting.
// The Simplified form carries no itemised asset schedules, so the assets
// themselves collapse into the Starting Balance; what else can move is the
// attorney block, the certificate of service, the reporting period, and any
// remuneration disclosure.
function convertToSimplified(src,srcType,dest){
  const total=getWardHeadlineTotal(src);
  dest.startingBalance=total!=null?String(total):'';

  if(srcType==='guardian'){
    const a=src.attorney||{}, sa=src.serviceAttorney||{};
    dest.attorney_barNumber=a.barNumber||'';
    dest.attorney_phone=a.phone||'';
    dest.attorney_street=a.streetAddress||'';
    dest.attorney_cityStateZip=a.cityStateZip||'';
    dest.certAttyBarNumber=sa.barNumber||a.barNumber||'';
    dest.certAttyPhone=sa.phone||a.phone||'';
    dest.certAttyStreet=sa.streetAddress||a.streetAddress||'';
    dest.certAttyCityStateZip=sa.cityStateZip||a.cityStateZip||'';
    dest.certServiceDate=src.serviceDate||'';
    (src.serviceRecipients||[]).slice(0,4).forEach((r,i)=>{
      dest.certRecipients[i]={name:r.name||'',line2:r.address||'',line3:r.cityStateZip||''};
    });
    return;
  }

  // Annual family -> Simplified. Same ward, same period, smaller form.
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'No';
  dest.attorney_barNumber=src.attorney_bar||'';
  dest.attorney_phone=src.attorney_phone||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  dest.attorney_signatureDate=src.attorney_signatureDate||'';
  dest.certServiceDate=src.certDate||'';
  dest.certIndicator=src.certIndicator||'';
  dest.certAttySignDate=src.certAttySignDate||'';
  dest.certAttyBarNumber=src.attorney_bar||'';
  dest.certAttyPhone=src.attorney_phone||'';
  dest.certAttyStreet=src.attorney_street||'';
  dest.certAttyCityStateZip=src.attorney_cityStateZip||'';
  // The Annual gives each recipient a 4th line the Simplified form lacks —
  // fold it onto line 3 rather than silently dropping an address line.
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={
      name:r.name||'', line2:r.line2||'',
      line3:[r.line3,r.line4].filter(Boolean).join(', ')
    };
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:r.amount||'',description:r.description||''}));
  }
}

// Simplified -> Annual family: the mirror of convertToSimplified()'s second
// half. The Simplified form has no schedules to expand, so its ending
// balance becomes the new Starting Balance and the schedules start blank.
function convertSimplifiedToAnnual(src,dest){
  const total=getWardHeadlineTotal(src);
  dest.startingBalance=total!=null?String(total):'';
  dest.periodFrom=src.periodFrom||'';
  dest.periodTo=src.periodTo||'';
  dest.amendedForm=src.amendedForm||'No';
  dest.attorney_bar=src.attorney_barNumber||'';
  dest.attorney_phone=src.attorney_phone||'';
  dest.attorney_street=src.attorney_street||'';
  dest.attorney_cityStateZip=src.attorney_cityStateZip||'';
  dest.attorney_signatureDate=src.attorney_signatureDate||'';
  dest.attorney_county=src.county||dest.attorney_county||'Pinellas';
  dest.certDate=src.certServiceDate||'';
  dest.certIndicator=src.certIndicator||'';
  dest.certAttySignDate=src.certAttySignDate||'';
  (src.certRecipients||[]).slice(0,4).forEach((r,i)=>{
    dest.certRecipients[i]={name:r.name||'',line2:r.line2||'',line3:r.line3||'',line4:''};
  });
  const rem=(src.remuneration||[]).filter(r=>r.guardian||r.type||r.description||r.amount);
  if(rem.length){
    dest.remuneration=rem.map(r=>({guardian:r.guardian||'',type:r.type||'',
      amount:r.amount||'',description:r.description||''}));
  }
}

async function convertExistingWard(sourceWardId,targetType){
  const sourceWard=guardianData.wards.find(w=>w.wardId===sourceWardId);
  if(!sourceWard)return;
  const srcType=sourceWard.inventoryType;
  if(srcType===targetType){alert('Please choose a different inventory type to convert to.');return;}

  await flushPendingSave();
  const wardId=createWardId();
  const newWard={
    wardId,
    inventoryType:targetType,
    createdDate:new Date().toISOString().split('T')[0],
    ...initializeEmptyData(targetType)
  };
  // Identity and contact details first, whichever direction this is.
  if(carrySourcesFor(targetType).includes(srcType)){
    Object.assign(newWard,carryOverFields(sourceWard,targetType));
  }else{
    mapConvertedHeaderFields(sourceWard,srcType,newWard,targetType);
  }

  // Then the financial mapping, for the pairs whose schedules genuinely
  // correspond. This MUST run after the identity carry above: that carry
  // returns blank schedules by design, so running it second would wipe
  // everything mapped here. (Regression guard — that is exactly what
  // happened once the Initial Inventory became a valid carry source.)
  if(srcType==='guardian'&&formEngine(targetType)==='annual'){
    convertGuardianSchedulesToAnnual(sourceWard,newWard);
    convertGuardianExtrasToAnnual(sourceWard,newWard);
  }else if(targetType==='simplified'){
    convertToSimplified(sourceWard,srcType,newWard);
  }else if(srcType==='simplified'&&formEngine(targetType)==='annual'){
    convertSimplifiedToAnnual(sourceWard,newWard);
  }
  // annual->guardian and simplified->guardian: header fields only (mapped
  // above) — an Initial Inventory has no accounting-period equivalent to
  // derive asset schedules from, so those stay blank for manual entry.

  guardianData.wards.push(newWard);
  guardianData.activeWardId=wardId;
  activeInventoryType=targetType;
  window.D=newWard;
  await saveWardToState(newWard);
  await saveAppState('activeWardId',wardId);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  updateSidebar();
  navigate('/');
  alert(`Converted "${sourceWard.wardName}" into a new ${INVENTORY_TYPES[targetType].name} form.\n\n${describeConversion(srcType,targetType)}`);
}

async function doConvertWard(){
  const sourceWardId=document.getElementById('convert-source-ward').dataset.wardId||'';
  const targetType=document.getElementById('convert-target-type').value;
  if(!sourceWardId||!targetType)return;
  closeModal('convertWardModal');
  await convertExistingWard(sourceWardId,targetType);
}

// ═══════════════════════════════════════════════════════
// MULTI-YEAR ACCOUNTING (save / switch / edit by year)
// ═══════════════════════════════════════════════════════
// A ward's flat top-level fields (schedules, balances, signatures, etc.)
// always represent whichever year is currently "active" — every existing
// render/print/export/validation function reads and writes through
// window.D exactly as before, with no awareness that years exist at all.
// Prior years are simply snapshotted off those same fields into
// ward.years[] and swapped back in on request. These keys are the only
// ones that are NOT part of a year's data.
const WARD_SYSTEM_KEYS=['wardId','inventoryType','createdDate','lastModified','archived','scheduleDocs','years','activeYearKey','yearCounter'];

function snapshotCurrentYearData(ward){
  const data={};
  for(const k in ward){
    if(!WARD_SYSTEM_KEYS.includes(k))data[k]=ward[k];
  }
  return JSON.parse(JSON.stringify(data));
}

function applyYearData(ward,data){
  for(const k of Object.keys(ward)){
    if(!WARD_SYSTEM_KEYS.includes(k))delete ward[k];
  }
  Object.assign(ward,JSON.parse(JSON.stringify(data)));
}

// Resets the fields that must be blank/empty for a fresh, unsigned filing
// of a new period. Names, addresses, eligibility answers, and (for
// Guardian) the asset schedules all carry forward as-is from the year
// being archived — re-typing mostly-unchanged case information every year
// would be far more work than editing down what actually changed. What
// DOES reset differs by type:
//  - Signatures/dates: always cleared, this is an unsigned new filing.
//  - Annual/Simplified period dates + amended flag: cleared, set on Cover.
//  - Remuneration: a fresh declaration each year, not a running total.
//  - Annual's income/disbursement/capital-adjustment/transfer/sale
//    schedules (schA, schB1-4, schC, schE, schF1-2): these describe
//    transactions THAT happened during one specific period, so they reset
//    empty. Schedule D (assets/liabilities as of period end) is instead
//    carried forward, becoming next period's starting holdings — exactly
//    the schedule-level equivalent of Simplified's starting balance.
//  - Simplified's Interest/Deposits/Service Charges/Federal Tax: reset —
//    each is a specific period's transactions, not a standing balance.
function resetYearlyFieldsForNewYear(data,type){
  const clearDate=obj=>{if(obj&&('signatureDate' in obj))obj.signatureDate='';};
  if(Array.isArray(data.guardians)){
    data.guardians.forEach(g=>{clearDate(g);if(g&&('signatureDateLabel' in g))g.signatureDateLabel='';});
  }
  if(type==='guardian'){
    clearDate(data.preparer);
    if(data.attorney){data.attorney.signatureDate=null;data.attorney.filingDate=null;}
    data.serviceDate=null;
    data.isAmended=false;
  }else if(type==='simplified'){
    data.attorney_signatureDate='';
    data.certServiceDate='';
    data.certAttySignDate='';
    data.periodFrom='';data.periodTo='';
    data.amendedForm='No';
    data.interestIncome='';data.depositsSettlement='';data.serviceCharges='';data.federalIncomeTax='';
  }else if(formEngine(type)==='annual'){
    clearDate(data.preparer);
    data.attorney_signatureDate='';
    data.certDate='';
    data.certAttySignDate='';
    data.periodFrom='';data.periodTo='';
    data.amendedForm='No';
    data.schA=[];data.schB1=[];data.schB2=[];data.schB3=[];data.schB4=[];
    data.schC=[];data.schE=[];data.schF1=[];data.schF2=[];
  }else if(type==='planSimplified'){
    // Every answer on a Plan describes one specific year ("during the
    // preceding year", "in the past year"), so ALL of them reset — unlike
    // the accountings, nothing here is a carried-forward balance. Only the
    // ward's identity and the guardians' contact details survive.
    data.periodFrom='';data.periodTo='';
    data.q1Residences='';data.q2BestPlacement='';data.q3MedicalTreatment='';data.q4Diagnosis='';
    data.q5SocialServices='';data.q6Interaction='';
    data.q7RestoreRights='';data.q7RestoreExplain='';
    data.q8DNR=false;data.q8LivingWill=false;data.q8Surrogate=false;data.q8POA=false;
    data.q8Other=false;data.q8OtherText='';data.q8None=false;
    data.q9Remuneration='';data.q9RemunerationExplain='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planAnnual'){
    // Same reasoning as the Simplified Plan: every answer describes one
    // specific reporting year. The two repeating tables reset to a single
    // blank row rather than being emptied, so the page isn't a bare
    // "no entries" state when the guardian opens it.
    data.periodFrom='';data.periodTo='';
    data.q1Residences=[emptyPlanResidence()];
    data.q4Providers=[emptyPlanProvider()];
    data.q2NoMove=false;data.q2WithinCounty=false;data.q2WithinCircuit=false;
    data.q2OutsideApproved=false;data.q2OutsideVenuePetition=false;
    data.q5SocialSkills='';data.q5Activities='';data.q7RightsExplain='';
    // Rights and ADL ratings are a fresh assessment each year — carrying
    // last year's forward would defeat the purpose of the annual review.
    if(data.rights)Object.keys(data.rights).forEach(k=>data.rights[k]='');
    if(data.adls)Object.keys(data.adls).forEach(k=>data.adls[k]='');
    data.q10Directives=[emptyPlanDirective()];
    data.q11NoRemuneration=false;data.q11NoRemunerationName='';
    data.q11ReceivedName='';data.q11Amount='';data.q11From='';data.q11SubmittedToCourt=false;
    data.certIncapacitatedNoCopy=false;data.certMinorNoCopy=false;data.certConsulted=false;
    data.certNoRestriction=false;data.certProvidesMedical=false;
    data.certPhysicianAttached=false;data.certRecognizeRights=false;
    data.certRightsChangedExplain='';
    data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planInitial'){
    // The Initial Plan is normally a one-time filing, but if a guardian
    // needs to amend or refile it, every answer describes conditions as of
    // filing — nothing here is a carried balance. Only ward identity and
    // guardian contact details survive.
    data.periodFrom='';data.periodTo='';
    data.inceptionDate='';data.lettersSignedDate='';data.successorGuardianship='';
    data.wardLiving='';data.residenceAddress='';data.residenceCityStateZip='';data.residencePhone='';
    data.mailingAddress='';data.mailingCityStateZip='';data.q1PreexistingDirectives='';
    data.q2Setting='';data.q2Explain='';
    data.q3MedPrimary=false;data.q3MedDentist=false;data.q3MedOphthalmologist=false;
    data.q3MedSpecialist=false;data.q3MedSpecialistArea='';data.q3MedPT=false;
    data.q3MedST=false;data.q3MedOT=false;data.q3MedWardDecides=false;
    data.q3MedOther=false;data.q3MedExplain='';
    data.q4Mental='';data.q4Explain='';
    data.q5Personal='';data.q5Explain='';
    data.q6CareFacility=false;data.q6NursesAides=false;data.q6FamilyFriends=false;
    data.q6DayProgram=false;data.q6WardDecides=false;data.q6Other=false;data.q6Explain='';
    data.q7SocialSecurity=false;data.q7Ssdi=false;data.q7Hmo=false;data.q7Ssi=false;
    data.q7StateSupplement=false;data.q7InstitutionalCare=false;data.q7SupplementalIns=false;
    data.q7Pension=false;data.q7Medicare=false;data.q7Medicaid=false;data.q7Va=false;
    data.q7Trusts=false;data.q7PendingBenefits=false;data.q7Other=false;data.q7Explain='';
    data.q9Providers=[emptyInitialProvider()];
    if(data.adls)Object.keys(data.adls).forEach(k=>data.adls[k]='');
    data.mentalAlzheimers=false;data.mentalAutism=false;data.mentalClosedHeadInjury=false;
    data.mentalDementia=false;data.mentalDepression=false;data.mentalDevelopmental=false;
    data.mentalSubstance=false;data.mentalSchizophrenia=false;data.mentalOther=false;data.mentalExplain='';
    data.physMobility=false;data.physBlindness=false;data.physDeafness=false;data.physDiabetic=false;
    data.physParkinsons=false;data.physArthritis=false;data.physOther=false;data.physExplain='';
    data.usesDentures=false;data.usesHearingAid=false;data.usesWheelchair=false;data.usesWalker=false;
    data.usesCrutches=false;data.usesProsthetics=false;data.usesGlasses=false;data.usesNone=false;
    data.usesOther=false;data.usesExplain='';
    data.needsDentures=false;data.needsHearingAid=false;data.needsWheelchair=false;data.needsWalker=false;
    data.needsCrutches=false;data.needsProsthetics=false;data.needsGlasses=false;data.needsNone=false;
    data.needsOther=false;data.needsExplain='';
    data.committeeIncorporated='';data.committeeExplain='';
    data.q11NoDirectives=false;data.q11StepResidence=false;data.q11StepSafeDeposit=false;
    data.q11StepInterviewed=false;data.q11StepMedicalProviders=false;data.q11StepAttorney=false;
    data.q11Executed=false;data.q11ExecDNR=false;data.q11ExecHealthcare=false;
    data.q11ExecPOA=false;data.q11ExecOther=false;data.q11ExecOtherText='';
    data.q11Directives=[emptyPlanDirective(),emptyPlanDirective()];
    data.certIncapacitatedNoCopy=false;data.certMinorNoCopy=false;data.certConsulted=false;
    data.certRecognizeRights=false;data.certNoRestriction=false;data.certProvidesCare=false;
    data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }else if(type==='planMinor'){
    // Filed annually like the Annual Guardianship Plan — every answer
    // describes one specific reporting year. Only the minor's identity and
    // guardian contact details survive; residences/providers reset to a
    // single blank row.
    data.periodFrom='';data.periodTo='';
    data.amendedForm='';data.amendedVersion='';
    data.q1ResidenceName='';data.q1Street='';data.q1City='';data.q1State='';data.q1Zip='';data.q1Phone='';
    data.q2Residences=[emptyMinorResidence()];
    data.q3Providers=[emptyMinorProvider()];
    data.q4Primary=false;data.q4PrimaryFreq='';data.q4Dentist=false;data.q4DentistFreq='';
    data.q4Specialist=false;data.q4SpecialistFreq='';
    data.q4PT=false;data.q4ST=false;data.q4OT=false;data.q4MinorDecides=false;
    data.q4Other=false;data.q4Explain='';
    data.q5SchoolProgress='';data.q5SocialDevelopment='';data.q5Communicates='';data.q5Interpersonal='';
    data.q5NoUnmetNeeds=false;data.q5DoesNotCareToSocialize=false;data.q5UnmetNeeds=false;
    data.q5Other=false;data.q5Explain='';
    data.certIncapacitated=false;data.certMinor=false;data.certConsulted=false;
    data.certNoRestriction=false;data.certProvidesCare=false;data.certPhysicianAttached=false;
    data.preparer_signatureDate='';data.attorney_signatureDate='';
    if(Array.isArray(data.planGuardians)){
      data.planGuardians.forEach(g=>{if(g)g.signatureDate='';});
    }
  }
  // Remuneration is a fresh declaration each year, not a running total.
  if(Array.isArray(data.remuneration)){
    data.remuneration=data.remuneration.map(()=>formEngine(type)==='annual'?emptyRowAnnual('remun'):({guardian:'',type:'',description:''}));
  }
}

// Guardianship annual/simplified accounting periods commonly span two
// calendar years (they run from one anniversary of the case to the next,
// not Jan-Dec), so "2025-2026" reads far more like a real filing period
// than an abstract "Year 2" ever would. Falls back to the internal
// key only when no period has been entered yet (e.g. right after
// starting a new year, before its dates are filled in on the Cover page).
function describeYearLabel(ward,data,archivedAt){
  const key=ward.activeYearKey||'Year 1';
  if(ward.inventoryType!=='guardian'){
    const fromYear=data.periodFrom?String(data.periodFrom).slice(0,4):'';
    const toYear=data.periodTo?String(data.periodTo).slice(0,4):'';
    if(fromYear&&toYear)return fromYear===toYear?fromYear:`${fromYear}-${toYear}`;
    if(fromYear||toYear)return fromYear||toYear;
    return key;
  }
  // Initial Inventory has no accounting period, and its GID never changes
  // across re-inventory years, so it can't distinguish Year 1 from Year 2.
  // Label by the calendar year this particular snapshot was recorded in.
  return String(new Date(archivedAt||Date.now()).getFullYear());
}

// Snapshots whatever is currently loaded on the ward into its slot in
// ward.years[], keyed by the year it's leaving. Shared by switchWardYear
// (moving to an existing year) and startNewWardYear (moving to a new one)
// so a year's data is never lost no matter which direction triggered it.
function checkInActiveYear(ward){
  ward.years=ward.years||[];
  ward.yearCounter=ward.yearCounter||1;
  ward.activeYearKey=ward.activeYearKey||('Year '+ward.yearCounter);
  const data=snapshotCurrentYearData(ward);
  const archivedAt=new Date().toISOString();
  const label=describeYearLabel(ward,data,archivedAt);
  const existing=ward.years.find(y=>y.key===ward.activeYearKey);
  if(existing){existing.data=data;existing.label=label;existing.archivedAt=archivedAt;}
  else ward.years.push({key:ward.activeYearKey,label,archivedAt,data});
}

async function switchWardYear(wardId,targetKey){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await flushPendingSave();
  checkInActiveYear(ward);
  const idx=ward.years.findIndex(y=>y.key===targetKey);
  if(idx===-1)return;
  const target=ward.years[idx];
  ward.years.splice(idx,1);
  applyYearData(ward,target.data);
  ward.activeYearKey=target.key;
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
}

// Archives the current year (carrying forward everything by default) and
// opens a fresh one: ending net total becomes next year's starting balance
// for Annual/Simplified, and Initial Inventory's schedules carry forward
// unchanged so the guardian edits down what's changed instead of
// re-entering the whole asset list.
async function startNewWardYear(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await flushPendingSave();
  const priorTotal=getWardHeadlineTotal(ward);
  checkInActiveYear(ward);
  const seed=snapshotCurrentYearData(ward);
  resetYearlyFieldsForNewYear(seed,ward.inventoryType);
  if((formEngine(ward.inventoryType)==='annual'||ward.inventoryType==='simplified')&&priorTotal!=null){
    seed.startingBalance=String(priorTotal);
  }
  applyYearData(ward,seed);
  ward.yearCounter=(ward.yearCounter||1)+1;
  ward.activeYearKey='Year '+ward.yearCounter;
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
}

let _yearModalWardId=null;

async function showStartNewYearModal(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await ensureFragment('common-modals');
  _yearModalWardId=wardId;
  const note=ward.inventoryType==='guardian'
    ?"The new year opens with a copy of this year's schedules (A-1 through C-5) so you can edit down what's changed, instead of re-entering everything. Signatures and dates are cleared for the new filing."
    :"The new year opens with Starting Balance pre-filled from this year's ending total. Schedule entries, signatures, and the accounting period are cleared for the new filing.";
  document.getElementById('new-year-ward-name').textContent=ward.wardName||'(unnamed ward)';
  document.getElementById('new-year-note').textContent=note;
  showModal('startNewYearModal');
}

async function confirmStartNewYear(){
  const wardId=_yearModalWardId;
  if(!wardId)return;
  closeModal('startNewYearModal');
  await switchWard(wardId);
  await startNewWardYear(wardId);
  navigate('/');
}

function renderPriorYearsList(ward){
  const activeLabel=describeYearLabel(ward,ward);
  const rows=[`<div class="prior-year-row prior-year-current"><span>${esc(activeLabel)} — currently open</span></div>`]
    .concat((ward.years||[]).slice().reverse().map(y=>`
      <div class="prior-year-row">
        <span>${esc(y.label)}</span>
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="editPriorYear('${ward.wardId}','${esc(y.key)}')">Edit this year</button>
          <button type="button" class="btn btn-sm btn-outline-danger" onclick="confirmDeleteWardYear('${ward.wardId}','${esc(y.key)}')" title="Permanently delete this year">${ic('trash',13)}</button>
        </div>
      </div>`));
  document.getElementById('prior-years-list').innerHTML=rows.join('');
}

async function showPriorYearsModal(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  await ensureFragment('common-modals');
  _yearModalWardId=wardId;
  document.getElementById('prior-years-ward-name').textContent=ward.wardName||'(unnamed ward)';
  renderPriorYearsList(ward);
  showModal('priorYearsModal');
}

async function editPriorYear(wardId,key){
  closeModal('priorYearsModal');
  await switchWard(wardId);
  await switchWardYear(wardId,key);
  navigate('/');
}

// The period key a given archived year's supporting-document uploads and
// comments were filed under, so deleting the year can clean those up too
// instead of leaving them orphaned. Mirrors scheduleDocPeriodKey(), but
// against an arbitrary snapshot rather than the live active ward.
function periodKeyForYearData(ward,yearEntry){
  if(ward.inventoryType==='guardian')return yearEntry.key;
  const d=yearEntry.data||{};
  return `${d.periodFrom||''}__${d.periodTo||''}`;
}

async function deleteWardYear(wardId,yearKey){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward||!ward.years)return;
  const idx=ward.years.findIndex(y=>y.key===yearKey);
  if(idx===-1)return;
  const periodKey=periodKeyForYearData(ward,ward.years[idx]);
  if(ward.scheduleDocs){
    for(const scheduleKey of Object.keys(ward.scheduleDocs)){
      delete ward.scheduleDocs[scheduleKey][periodKey];
    }
  }
  ward.years.splice(idx,1);
  await saveWardToState(ward);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
}

let _pendingDeleteYear=null;

async function confirmDeleteWardYear(wardId,yearKey){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  const entry=ward&&ward.years&&ward.years.find(y=>y.key===yearKey);
  if(!ward||!entry)return;
  await ensureFragment('common-modals');
  _pendingDeleteYear={wardId,yearKey};
  document.getElementById('delete-year-msg').textContent=`Are you sure you want to delete the ${entry.label} accounting for "${ward.wardName}"? Any supporting documents or comments uploaded for that year will be deleted too. This action cannot be undone.`;
  showModal('deleteYearModal');
}

async function doDeleteWardYear(){
  if(!_pendingDeleteYear)return;
  const {wardId,yearKey}=_pendingDeleteYear;
  try{
    await deleteWardYear(wardId,yearKey);
    closeModal('deleteYearModal');
    const ward=guardianData.wards.find(w=>w.wardId===wardId);
    if(ward)renderPriorYearsList(ward);
    if(currentPage==='/dashboard')renderDashboardGrid();
  }catch(e){
    console.error('Failed to delete year',e);
    alert('Failed to delete year. Check console.');
  }
}

// ═══════════════════════════════════════════════════════
// INVENTORY TYPE SELECTOR PAGE
// ═══════════════════════════════════════════════════════
function pageInventorySelector(){
  return `<div style="max-width:900px;margin:0 auto;">
  <h1 style="font-size:1.8rem;color:var(--ink);margin-bottom:2rem;text-align:center;">Start New Form</h1>
  <p style="text-align:center;color:var(--ink-3);margin-bottom:2rem;font-size:.95rem;">Select the form type for a ward. You can manage multiple wards of different types.</p>
  <div class="inventory-selector">
    <div class="inventory-card" onclick="showAddWardModalForType('guardian')" role="button" tabindex="0" aria-label="Create Initial Inventory ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('guardian');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/></svg> Initial Inventory</h2>
      <p>${INVENTORY_TYPES.guardian.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('simplified')" role="button" tabindex="0" aria-label="Create Simplified Accounting ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('simplified');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/></svg> Simplified Accounting</h2>
      <p>${INVENTORY_TYPES.simplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('annual')" role="button" tabindex="0" aria-label="Create Annual Accounting ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('annual');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Annual Accounting</h2>
      <p>${INVENTORY_TYPES.annual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('finalAccounting')" role="button" tabindex="0" aria-label="Create Final Accounting ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('finalAccounting');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/><path d="m15.8 4.4 1.7 1.7 3.1-3.2"/></svg> Final Accounting</h2>
      <p>${INVENTORY_TYPES.finalAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('trustAccounting')" role="button" tabindex="0" aria-label="Create Trust Accounting ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('trustAccounting');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.6 9.4 12 4.2l7.4 5.2"/><path d="M6.6 10.8v7.4M11 10.8v7.4M15.4 10.8v7.4M19.8 10.8v7.4"/><path d="M4.2 20.2h15.6"/></svg> Trust Accounting</h2>
      <p>${INVENTORY_TYPES.trustAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('planInitial')" role="button" tabindex="0" aria-label="Create Initial Guardianship Plan ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('planInitial');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M12 8v5.4M12 16.4v.1"/></svg> Initial Guardianship Plan</h2>
      <p>${INVENTORY_TYPES.planInitial.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('planSimplified')" role="button" tabindex="0" aria-label="Create Simplified Annual Plan ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('planSimplified');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="m9.4 12.1 1.9 1.9 3.4-3.6"/></svg> Simplified Annual Plan</h2>
      <p>${INVENTORY_TYPES.planSimplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('planAnnual')" role="button" tabindex="0" aria-label="Create Annual Guardianship Plan ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('planAnnual');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M9.2 10.6h5.6M9.2 13.6h5.6"/></svg> Annual Guardianship Plan</h2>
      <p>${INVENTORY_TYPES.planAnnual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" onclick="showAddWardModalForType('planMinor')" role="button" tabindex="0" aria-label="Create Annual Plan — Minors ward" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showAddWardModalForType('planMinor');}">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><circle cx="12" cy="9.8" r="1.6"/><path d="M9.4 15.2c0-1.6 1.2-2.6 2.6-2.6s2.6 1 2.6 2.6"/></svg> Annual Plan — Minors</h2>
      <p>${INVENTORY_TYPES.planMinor.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
  </div>

  <div class="summary-box mt-4">
    <h2 class="subsection-heading">About Probate Guardian</h2>
    <p style="font-size:.88rem;color:var(--ink-2);line-height:1.5;">Probate Guardian helps guardians — and the attorneys who assist them — prepare the court-required filings for guardianship cases in Pinellas and Pasco County, Florida. It walks you through each required field, calculates totals automatically, and produces a filing-ready PDF or the official Clerk of Court Excel template.</p>

    <h2 class="subsection-heading mt-3">Who Should Use This</h2>
    <p style="font-size:.88rem;color:var(--ink-2);line-height:1.5;">Guardians of the <strong>property</strong>, who file an <strong>Initial Inventory</strong>, a <strong>Simplified Annual Accounting</strong>, or a full <strong>Annual Accounting</strong> — and guardians of the <strong>person</strong>, who file a <strong>Plan</strong> reporting on the ward's residence, care, and wellbeing. If you are guardian of both, you file one of each; create a separate form for each filing and give them the same case number, and the dashboard will keep them together.</p>

    <h2 class="subsection-heading mt-3">Which Type Do I Need?</h2>
    <ul style="font-size:.88rem;color:var(--ink-2);line-height:1.6;padding-left:1.2rem;">
      <li><strong>Initial Inventory</strong> — the initial inventory of the ward's assets, filed as of the Guardianship Inception Date. Every new guardianship of property starts here.</li>
      <li><strong>Simplified Annual Accounting</strong> — a short-form yearly accounting, but only when <strong>all</strong> estate property is held in a designated depository under Fla. Stat. § 69.031 and the <strong>only</strong> account activity is interest accrual, settlement deposits, or service charges. The app asks two qualifying questions when you create this type of form and will route you to a standard Annual Accounting automatically if the guardianship doesn't qualify.</li>
      <li><strong>Annual Accounting</strong> — the full yearly accounting with detailed schedules, required whenever the simplified form doesn't apply.</li>
      <li><strong>Simplified Annual Plan</strong> — the short yearly report on the ward as a person: where they have lived, the medical care they received, their diagnosis, social activities, and whether any rights should be restored. This is a <em>separate filing</em> from the accountings above and reports on care rather than money.</li>
    </ul>

    <h2 class="subsection-heading mt-3">Getting Started</h2>
    <ol style="font-size:.88rem;color:var(--ink-2);line-height:1.6;padding-left:1.2rem;">
      <li>Click <strong>Create Form for a Ward</strong> above and choose the correct type for what you're filing.</li>
      <li>Work through each section using the sidebar — required fields are marked with a red <span class="req">*</span> and a checkmark appears next to each section once it's complete.</li>
      <li>Use <strong>Preview &amp; Export</strong> to review the filing-ready document, then save it as a PDF or Excel file.</li>
      <li>You can manage multiple wards at once and switch between them from the sidebar at any time.</li>
    </ol>

    <p style="font-size:.8rem;color:var(--ink-3);margin-top:1rem;margin-bottom:0;">Your work is saved automatically on this device as you go. Nothing is uploaded to a server.</p>
  </div>
  </div>`;
}

async function showAddWardModalForType(type){
  if(type==='simplified'){
    showSimplifiedEligibilityModal('');
    return;
  }
  await ensureFragment('common-modals');
  document.getElementById('new-ward-name').value='';
  populateWardNameSuggestions('ward-name-suggestions');
  initWardNameCombobox('new-ward-name','new-ward-name-dropdown',()=>updateCarrySourcePicker());
  document.getElementById('new-ward-type').value=type;
  updateCarrySourcePicker();
  document.getElementById('new-ward-name').focus();
  showModal('addWardModal');
}

// ═══════════════════════════════════════════════════════
// WIZARD: GUARDIAN INVENTORY
// ═══════════════════════════════════════════════════════

function emptyDataGuardian(){
  return {
    wardName:'',caseNumber:'',gid:null,county:'Pinellas',guardianName:'',
    attorneyForGuardian:'',typeOfGuardianship:'',hasSafeDepositBox:false,
    safeDepositBoxFiled:false,isAmended:false,
    scheduleA1:[],scheduleA2:[],scheduleB1:[],scheduleB2:[],scheduleB3:[],
    scheduleB4:[],scheduleC1:[],scheduleC2:[],scheduleC3:[],scheduleC4:[],scheduleC5:[],
    // Per-schedule "I verify there are no items of this type" checkbox --
    // missing keys read as false, so a .sav saved before this existed just
    // treats every schedule as unconfirmed (matches its actual pre-existing
    // state: not yet reviewed), never as falsely confirmed empty.
    scheduleNoItems:{},
    guardians:[{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null}],
    preparer:{name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null},
    attorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null},
    bondAmount:'',bondPeriodFrom:null,bondPeriodTo:null,bondingCompany:'',bondWaivedDate:'',
    serviceRecipients:[{name:'',address:'',cityStateZip:''},{name:'',address:'',cityStateZip:''}],
    serviceDate:null,serviceAttorney:{name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:''},
    // Witnesses present during the physical inventory of the ward's personal
    // effects. Optional (not export-blocking) -- the Cover page reminder
    // states the requirement, but not every inventory necessarily has a
    // witness present, and the app shouldn't second-guess that on its own.
    witnesses:[]
  };
}

const PAGES_GUARDIAN=[
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

// Simplified Accounting is extracted into src/features/simplified-accounting/
// (Milestone 2, Phase D) -- these two bridges dynamically import it, cache
// the module, and delegate. See src/features/simplified-accounting/index.js
// for the module itself; see the Milestone 2 plan's "Problem 2" (and the
// Milestone 3 plan's "Problem 2", which generalized this into
// window.createFeatureBridge once a second feature proved the shape was
// genuinely duplicated) for why this hand-rolled bridge exists instead of
// INDEX-SPLIT-PLAN.md's full staging-host router (that router arbitrates
// between several *concurrently competing* lazy features -- this app never
// mounts two features racing for the same container, since switchWard()
// always fully changes the active ward before any render happens).
//
// Routed through window.loadSimplifiedFeature (src/features-loader.js)
// rather than a direct import() here -- this file is an opaque classic-
// script static passthrough Vite never processes, so a dynamic import()
// written directly in this file would be invisible to Vite's build and the
// target files would simply be missing from dist/web and dist/portable. See
// features-loader.js's own comment for the full reasoning, including why
// dist/portable specifically needs this.
//
// window.createFeatureBridge() itself must NOT be called at this file's top
// level: legacy-app.js is a classic, parser-blocking <script src> that runs
// synchronously as the parser reaches it, while `<script type="module">`
// tags (core/feature-bridge.js included) are implicitly deferred and don't
// execute until after the whole document has finished parsing -- strictly
// AFTER this file's top-level code runs, even though they appear earlier in
// index.html. window.createFeatureBridge is not yet a function at that
// point. Constructing the bridge lazily, on first actual call (which only
// happens later, in response to user navigation, long after the deferred
// module scripts have run), sidesteps this ordering entirely -- the same
// safe pattern window.loadFragment/window.emptyDataSimplified already use.
let _simplifiedFeatureBridge=null;
function getSimplifiedFeatureBridge(){
  return _simplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadSimplifiedFeature());
}
async function mountSimplifiedFeature(page){
  await getSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountSimplifiedNav(container){
  await getSimplifiedFeatureBridge().mountNav(container);
}

function buildNavAnnual(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">${esc(formDisplayName(activeInventoryType))}</div>
      <button class="nav-link-item" data-page="/" data-nav="a-p1" onclick="navigate('/')">Part I — Case Info</button>
      <button class="nav-link-item" data-page="/p2" data-nav="a-p2" onclick="navigate('/p2')">Part II — Accounting</button>
      <button class="nav-link-item" data-page="/p3" data-nav="a-p3" onclick="navigate('/p3')">Part III — Guardians</button>
      <button class="nav-link-item" data-page="/p4" data-nav="a-p4" onclick="navigate('/p4')">Part IV — Preparer</button>
      <button class="nav-link-item" data-page="/p5" data-nav="a-p5" onclick="navigate('/p5')">Part V — Attorney</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedules</div>
      <button class="nav-link-item" data-page="/scha" data-nav="a-scha" onclick="navigate('/scha')">Sch A — Income</button>
      <button class="nav-link-item" data-page="/schb1" data-nav="a-schb1" onclick="navigate('/schb1')">Sch B1 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb2" data-nav="a-schb2" onclick="navigate('/schb2')">Sch B2 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb3" data-nav="a-schb3" onclick="navigate('/schb3')">Sch B3 — Disbursements</button>
      <button class="nav-link-item" data-page="/schb4" data-nav="a-schb4" onclick="navigate('/schb4')">Sch B4 — Disbursements</button>
      <button class="nav-link-item" data-page="/schc" data-nav="a-schc" onclick="navigate('/schc')">Sch C — Gains/Losses</button>
      <button class="nav-link-item" data-page="/schd1" data-nav="a-schd1" onclick="navigate('/schd1')">Sch D1 — Assets</button>
      <button class="nav-link-item" data-page="/schd2" data-nav="a-schd2" onclick="navigate('/schd2')">Sch D2 — Real Property</button>
      <button class="nav-link-item" data-page="/schd3" data-nav="a-schd3" onclick="navigate('/schd3')">Sch D3 — Other Assets</button>
      <button class="nav-link-item" data-page="/schd4" data-nav="a-schd4" onclick="navigate('/schd4')">Sch D4 — Restricted Assets</button>
      <button class="nav-link-item" data-page="/schd5" data-nav="a-schd5" onclick="navigate('/schd5')">Sch D5 — Liabilities</button>
      <button class="nav-link-item" data-page="/sche" data-nav="a-sche" onclick="navigate('/sche')">Sch E — Transfers</button>
      <button class="nav-link-item" data-page="/schf1" data-nav="a-schf1" onclick="navigate('/schf1')">Sch F1 — Sales</button>
      <button class="nav-link-item" data-page="/schf2" data-nav="a-schf2" onclick="navigate('/schf2')">Sch F2 — Sales</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Certification</div>
      <button class="nav-link-item" data-page="/p67" data-nav="a-p67" onclick="navigate('/p67')">Parts VI &amp; VII</button>
      <button class="nav-link-item" data-page="/p8" data-nav="a-p8" onclick="navigate('/p8')">Part VIII — Trusts</button>
      <button class="nav-link-item" data-page="/p9" data-nav="a-p9" onclick="navigate('/p9')">Part IX — Bond</button>
      <button class="nav-link-item" data-page="/p10" data-nav="a-p10" onclick="navigate('/p10')">Part X — Cert. of Service</button>
      <button class="nav-link-item" data-page="/p11" data-nav="a-p11" onclick="navigate('/p11')">Part XI — Remuneration</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" onclick="navigate('/print')"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function buildNavGuardian(container){
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Case Info</div>
      <button class="nav-link-item" data-page="/" data-nav="cover" onclick="navigate('/')">Cover</button>
      <button class="nav-link-item" data-page="/summary" data-nav="summary" onclick="navigate('/summary')">Summary</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule A — Real Estate</div>
      <button class="nav-link-item" data-page="/a1" data-nav="a1" onclick="navigate('/a1')">A-1&nbsp;&nbsp;Real Estate Assets</button>
      <button class="nav-link-item" data-page="/a2" data-nav="a2" onclick="navigate('/a2')">A-2&nbsp;&nbsp;Real Estate Liabilities</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule B — Personal &amp; Cash</div>
      <button class="nav-link-item" data-page="/b1" data-nav="b1" onclick="navigate('/b1')">B-1&nbsp;&nbsp;Cash / Cash Equivalents</button>
      <button class="nav-link-item" data-page="/b2" data-nav="b2" onclick="navigate('/b2')">B-2&nbsp;&nbsp;Personal Property</button>
      <button class="nav-link-item" data-page="/b3" data-nav="b3" onclick="navigate('/b3')">B-3&nbsp;&nbsp;Intangible Assets</button>
      <button class="nav-link-item" data-page="/b4" data-nav="b4" onclick="navigate('/b4')">B-4&nbsp;&nbsp;Pers. Prop. Liabilities</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Schedule C — Other Info</div>
      <button class="nav-link-item" data-page="/c1" data-nav="c1" onclick="navigate('/c1')">C-1&nbsp;&nbsp;Income (Annualized)</button>
      <button class="nav-link-item" data-page="/c2" data-nav="c2" onclick="navigate('/c2')">C-2&nbsp;&nbsp;Lawsuits Against Ward</button>
      <button class="nav-link-item" data-page="/c3" data-nav="c3" onclick="navigate('/c3')">C-3&nbsp;&nbsp;Lawsuits by Ward</button>
      <button class="nav-link-item" data-page="/c4" data-nav="c4" onclick="navigate('/c4')">C-4&nbsp;&nbsp;Trusts</button>
      <button class="nav-link-item" data-page="/c5" data-nav="c5" onclick="navigate('/c5')">C-5&nbsp;&nbsp;Joint Owners</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Attestations &amp; Filings</div>
      <button class="nav-link-item" data-page="/d1" data-nav="d1" onclick="navigate('/d1')">D-1&nbsp;&nbsp;Guardian Attestation</button>
      <button class="nav-link-item" data-page="/d2" data-nav="d2" onclick="navigate('/d2')">D-2&nbsp;&nbsp;Preparer &amp; Attorney</button>
      <button class="nav-link-item" data-page="/d3" data-nav="d3" onclick="navigate('/d3')">D-3&nbsp;&nbsp;Audit Fee &amp; Safe Deposit</button>
      <button class="nav-link-item" data-page="/d4" data-nav="d4" onclick="navigate('/d4')">D-4&nbsp;&nbsp;Bond &amp; Surety Info</button>
      <button class="nav-link-item" data-page="/d5" data-nav="d5" onclick="navigate('/d5')">D-5&nbsp;&nbsp;Certificate of Service</button>
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" onclick="navigate('/print')"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function inpS(id,label,val,req=false,type='text'){
  let oninput=type==='text'?`this.value=validateSecurityInput('${id}',this.value);D['${id}']=this.value;autoSave();updateNavDots()`:`D['${id}']=this.value;autoSave();updateNavDots()`;
  let onblur='';
  const isEmail=label.toLowerCase().includes('email');
  const isPhone=!isEmail&&label.toLowerCase().includes('phone');
  const isName=!isEmail&&(label.toLowerCase().includes('name')||label.toLowerCase().includes('payer')||label.toLowerCase().includes('payee')||label.toLowerCase().includes('lender')||label.toLowerCase().includes('creditor')||label.toLowerCase().includes('institution')||label.toLowerCase().includes('guardian')||label.toLowerCase().includes('attorney')||label.toLowerCase().includes('trustee')||label.toLowerCase().includes('claimant')||label.toLowerCase().includes('description')||label.toLowerCase().includes('bonding')||label.toLowerCase().includes('company')||label.toLowerCase().includes('trust'));
  const isZip=!isEmail&&label.toLowerCase().includes('zip');
  const isAddress=!isEmail&&!isZip&&(label.toLowerCase().includes('street')||label.toLowerCase().includes('address')||label.toLowerCase().includes('city'));
  const isSSN=!isEmail&&(label.toLowerCase().includes('ssn')||label.toLowerCase().includes('ein')||label.toLowerCase().includes('social security')||label.toLowerCase().includes('taxpayer id')||/\btin\b/i.test(label));
  const isCaseNumber=!isEmail&&label.toLowerCase().includes('case number')&&!label.toLowerCase().includes('related');
  const isBarNumber=!isEmail&&label.toLowerCase().includes('bar number');
  const isAmountField=type==='number';
  if(isAmountField){
    oninput=`this.value=sanitizeNonNegativeDecimal(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }else if(isPhone){
    oninput=`this.value=formatPhone(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }else if(isName){
    const guardianSync=(id==='guardian'||id==='guardianName'||id==='guardianNames')?';syncGuardianNameDisplay()':'';
    oninput=`this.value=formatName(this.value);D['${id}']=this.value;autoSave();updateNavDots()${id==='wardName'?';syncActiveWardNameDisplay()':''}${guardianSync}`;
  }else if(isZip){
    oninput=`applyZipLimit(this);this.value=formatCityStateZip(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }else if(isAddress){
    oninput=`this.value=formatAddress(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }else if(isSSN){
    oninput=`this.value=formatSSN(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }else if(isCaseNumber){
    oninput=`this.value=formatCaseNumber(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
    onblur=`this.value=finalizeCaseNumber(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }else if(isBarNumber){
    oninput=`this.value=formatBarNumber(this.value);D['${id}']=this.value;autoSave();updateNavDots()`;
  }
  const formatted=isPhone?formatPhone(val):isName?formatName(val):isZip?formatCityStateZip(val):isAddress?formatAddress(val):isSSN?formatSSN(val):isCaseNumber?formatCaseNumber(val):isBarNumber?formatBarNumber(val):val||'';
  const inputType=isAmountField?'text':isSSN?'password':type;
  const inputMode=isAmountField?' inputmode="decimal"':'';
  const cleanedValue=isAmountField?sanitizeNonNegativeDecimal(formatted):formatted;
  const isPercentField=isAmountField&&(label.toLowerCase().includes('%')||label.toLowerCase().includes('percent'));
  const isDollarField=isAmountField&&!isPercentField;
  const inputHtml=`<input type="${inputType}" class="form-control" id="${id}" autocomplete="off"${inputMode} value="${String(cleanedValue).replace(/"/g,'&quot;')}" oninput="${oninput}"${onblur?` onblur="${onblur}"`:''}>`;
  const wrappedInput=isDollarField?`<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`:isPercentField?`<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`:isSSN?`<div class="ssn-mask-wrap">${inputHtml}<button type="button" class="ssn-reveal-btn" aria-label="Show ${esc(label)}" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div>`:inputHtml;
  return `<div class="mb-2"><label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>${wrappedInput}</div>`;
}
// Filtered-autocomplete text input for county fields, using the same
// D['id']=this.value write convention as the other Simplified/Plan field helpers.
function countyInputS(id,label,val,req=false){
  const writeExpr=`D['${id}']=this.value;autoSave();updateNavDots()`;
  return `<div class="mb-2"><label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>${countyAutocompleteHTML(id,val,writeExpr)}</div>`;
}
// ── Plan form controls ───────────────────────────────────
// The Guardianship Plans are narrative documents — long free-text answers,
// checkbox lists, and Yes/No questions — where the accountings are grids of
// numbers. Nothing in the app covered those controls (the only textarea was
// the schedule-comments box; the only checkbox was the unlock dialog), so
// these three are the shared foundation for all four Plan types.
//
// They follow the same convention as inpS above: write straight to
// D['id'] inline, then autoSave() and refresh the completion checkmarks.
// Values are escaped on the way out; free text is deliberately NOT run
// through formatName/formatAddress the way inpS guesses by label, because
// these are sentences and paragraphs, not names or addresses.
function txtP(id,label,val,rows=4,req=false,hint=''){
  return `<div class="mb-3">
    <label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>
    ${hint?`<div class="plan-field-hint">${hint}</div>`:''}
    <textarea class="form-control" id="${id}" rows="${rows}" oninput="D['${id}']=this.value;autoSave();updateNavDots()">${esc(val||'')}</textarea>
  </div>`;
}

function chkP(id,label,checked){
  return `<div class="form-check plan-check">
    <input class="form-check-input" type="checkbox" id="${id}" ${checked?'checked':''} onchange="D['${id}']=this.checked;autoSave();updateNavDots()">
    <label class="form-check-label" for="${id}">${label}</label>
  </div>`;
}
// Yes/No fields that were a 2-option select or radio pair, now a single
// checkbox -- but unlike chkP() above, these keep writing the literal
// 'Yes'/'No' STRING the rest of the app already reads everywhere (required-
// field checks, d.field==='Yes' conditionals gating other rendered
// content, PDF/Excel export cells expecting that exact text) rather than
// switching to a JS boolean, so nothing downstream needs to change to
// match. `writeExpr` takes a literal "%V%" placeholder standing in for
// whichever of 'Yes'/'No' the checkbox resolves to; the two wrappers below
// cover this app's two setter conventions (a fixed D['id']=, or a custom
// setter string) the same way countyInputS()/countyInputD() do for county.
function yesNoCheckboxHTML(id,label,val,writeExpr,req){
  const onchange=writeExpr.replace(/%V%/g,`(this.checked?'Yes':'No')`);
  return `<div class="form-check plan-check">
    <input class="form-check-input" type="checkbox" id="${id}" ${val==='Yes'?'checked':''} onchange="${onchange}">
    <label class="form-check-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>
  </div>`;
}
function yesNoCheckboxS(id,label,val,req=false){
  return yesNoCheckboxHTML(id,label,val,`D['${id}']=%V%;autoSave();updateNavDots()`,req);
}
function yesNoCheckboxD(label,val,setter,req=false){
  const id='chk_'+Math.random().toString(36).slice(2,9);
  return yesNoCheckboxHTML(id,label,val,`${setter.replace(/this\.value/g,'%V%')};autoSave();updateNavDots()`,req);
}

// Inline radio group. Also used later for the Annual/Initial plans' 3-way
// ADL ratings ("no help" / "some assistance" / "cannot do at all"), which is
// why the options are a parameter rather than hardcoded Yes/No.
function radioP(id,label,val,options=['Yes','No'],req=false,hint=''){
  const name=`radio_${id}`;
  const btns=options.map((o,i)=>`
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="radio" name="${name}" id="${id}_${i}" value="${esc(o)}" ${val===o?'checked':''} onchange="D['${id}']=this.value;autoSave();updateNavDots()">
      <label class="form-check-label" for="${id}_${i}">${esc(o)}</label>
    </div>`).join('');
  return `<div class="mb-3">
    <label class="form-label">${label}${req?'<span class="req">*</span>':''}</label>
    ${hint?`<div class="plan-field-hint">${hint}</div>`:''}
    <div class="plan-radio-row">${btns}</div>
  </div>`;
}

function pageNavS(prev,next){
  return `<div class="page-nav d-flex justify-content-between">
    ${prev?`<button class="btn btn-outline-primary btn-sm" onclick="navigate('${prev}')">← Back</button>`:'<span></span>'}
    ${next?`<button class="btn btn-primary btn-sm" onclick="navigate('${next}')">Next →</button>`:`<button class="btn btn-primary btn-sm" onclick="navigate('/print')">Preview & Export →</button>`}
  </div>`;
}

function calcTotals(){
  const d=window.D;
  const n=v=>parseFloat(v)||0;
  const starting=n(d.startingBalance);
  const interest=n(d.interestIncome);
  const deposits=n(d.depositsSettlement);
  const totalIncome=interest+deposits;
  const serviceCharges=n(d.serviceCharges);
  const fedTax=n(d.federalIncomeTax);
  const totalDisbursements=serviceCharges+fedTax;
  const remaining=starting+totalIncome-totalDisbursements;
  return {starting,interest,deposits,totalIncome,serviceCharges,fedTax,totalDisbursements,remaining};
}

// Still used by Plan Annual's print builder (a not-yet-extracted feature) --
// stays here rather than moving into features/simplified-accounting/print.js.
function tdSig(label,val){return td(label,val);}


// ═══════════════════════════════════════════════════════
// Simplified Annual Plan is extracted into src/features/plan-simplified/
// (Milestone 3, Phases B and C -- data/validation/pages, and print/PDF
// export). See src/features/simplified-accounting/index.js's header
// comment and the Milestone 3 plan for the pattern and reasoning. txtP/
// chkP/yesNoCheckboxS/radioP/pageNavS above stay here because they're
// shared with the three not-yet-extracted Plan types (Problem 3).
// ═══════════════════════════════════════════════════════
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment above for why
// (module <script> tags are deferred and run after this classic script's
// top-level code, so window.createFeatureBridge isn't a function yet then).
let _planSimplifiedFeatureBridge=null;
function getPlanSimplifiedFeatureBridge(){
  return _planSimplifiedFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanSimplifiedFeature());
}
async function mountPlanSimplifiedFeature(page){
  await getPlanSimplifiedFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanSimplifiedNav(container){
  await getPlanSimplifiedFeatureBridge().mountNav(container);
}

// ═══════════════════════════════════════════════════════
// ANNUAL GUARDIANSHIP PLAN
// ═══════════════════════════════════════════════════════
// The court form runs 13 pages across 11 numbered questions. Those are
// regrouped here into 11 wizard pages that keep the form's own numbering,
// so a guardian working from the paper form can find any question by its
// number. Two questions are repeating tables (residences, providers) and
// reuse the same add/remove-row pattern as the Annual Accounting schedules.

function buildNavPlanAnnual(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" onclick="navigate('${route}')">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Annual Guardianship Plan</div>
      ${item('/','pa-cover','Cover')}
      ${item('/p2','pa-p2','1&nbsp;&nbsp;Residences')}
      ${item('/p3','pa-p3','2–3&nbsp;&nbsp;Residence &amp; Care')}
      ${item('/p4','pa-p4','3G&nbsp;&nbsp;Insurance &amp; Benefits')}
      ${item('/p5','pa-p5','4&nbsp;&nbsp;Medical Treatment')}
      ${item('/p6','pa-p6','5–7&nbsp;&nbsp;Skills &amp; Rights')}
      ${item('/p7','pa-p7','8&nbsp;&nbsp;Daily Living')}
      ${item('/p8','pa-p8','9&nbsp;&nbsp;Disabilities &amp; Devices')}
      ${item('/p9','pa-p9','10&nbsp;&nbsp;Advance Directives')}
      ${item('/p10','pa-p10','11&nbsp;&nbsp;Remuneration')}
      ${item('/p11','pa-p11','Signatures')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" onclick="navigate('/print')"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function renderPagePlanAnnual(page){
  const el=document.getElementById('main-content');
  switch(page){
    case '/':      el.innerHTML=pagePlanACover();break;
    case '/p2':    el.innerHTML=pagePlanAResidences();break;
    case '/p3':    el.innerHTML=pagePlanACarePlan();break;
    case '/p4':    el.innerHTML=pagePlanABenefits();break;
    case '/p5':    el.innerHTML=pagePlanAProviders();break;
    case '/p6':    el.innerHTML=pagePlanARights();break;
    case '/p7':    el.innerHTML=pagePlanAADLs();break;
    case '/p8':    el.innerHTML=pagePlanADisabilities();break;
    case '/p9':    el.innerHTML=pagePlanADirectives();break;
    case '/p10':   el.innerHTML=pagePlanARemuneration();break;
    case '/p11':   el.innerHTML=pagePlanASignatures();break;
    case '/print': el.innerHTML=pagePrintPlanAnnual();break;
    default:       el.innerHTML=pagePlanACover();
  }
  el.scrollTop=0;
}

// Shared section wrapper, mirroring the Simplified Plan's q() helper.
function planQ(num,title,body,intro){
  return `<div class="plan-question">
    <div class="plan-question-num">Question ${num}</div>
    <h3 style="font-size:.95rem;font-weight:650;color:var(--ink);margin-bottom:.7rem;line-height:1.45;">${title}</h3>
    ${intro?`<div class="plan-field-hint" style="margin-bottom:.7rem;">${intro}</div>`:''}
    ${body}
  </div>`;
}
// "Check all that apply" group with an optional free-text explanation that
// only appears once a box requiring one is ticked.
function planCheckGroup(label,boxes,explainId,explainVal,explainWhen,hint){
  return `<div class="mb-3">
    <label class="form-label">${label}</label>
    ${hint?`<div class="plan-field-hint">${hint}</div>`:''}
    <div class="plan-check-grid">${boxes}</div>
    ${explainWhen?`<div class="plan-conditional mt-2">${txtP(explainId,'Explanation',explainVal,3)}</div>`:''}
  </div>`;
}

function pagePlanACover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Annual Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This plan reports on the ward as a person: where they live, the care they receive, their abilities and their rights. It is a separate filing from any accounting, which reports on their money and property. <strong>A physician's report must be filed separately at the same time</strong> — the app does not produce it.</div>
    ${loadWardInfoBanner()}
    <div class="row g-3">
      <div class="col-md-6">${inpS('wardName','Name of Ward',d.wardName,true)}</div>
      <div class="col-md-6">${inpS('caseNumber','Case Number',d.caseNumber,true)}</div>
      <div class="col-md-4">${inpS('ssn','Social Security Number',d.ssn)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-4">${inpS('gid','Guardianship Inception Date',d.gid,true,'date')}</div>
      <div class="col-md-6">${inpS('periodFrom','Reporting Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','Reporting Period To',d.periodTo,true,'date')}</div>
      <div class="col-md-6">${inpS('guardian','Guardian Name(s)',d.guardian,true)}</div>
      <div class="col-md-6">${inpS('attorney','Attorney Name',d.attorney)}</div>
    </div>
    <h2 class="subsection-heading mt-4">Where the Ward Currently Lives</h2>
    ${radioP('wardLiving','The ward is living:',d.wardLiving,[
      'In a private residence leased or owned by them',
      'In a private residence not leased or owned by them',
      'In a facility (skilled nursing, assisted living, etc.)'],true)}
    <div class="row g-3">
      <div class="col-12">${inpS('residenceAddress','Address Where Ward Resides',d.residenceAddress,true)}</div>
      <div class="col-md-8">${inpS('residenceCityStateZip','City / State / ZIP',d.residenceCityStateZip,true)}</div>
      <div class="col-md-4">${inpS('residencePhone','Phone',d.residencePhone)}</div>
      <div class="col-12">${inpS('mailingAddress','Mailing Address (if different)',d.mailingAddress)}</div>
      <div class="col-md-8">${inpS('mailingCityStateZip','Mailing City / State / ZIP',d.mailingCityStateZip)}</div>
    </div>
    ${renderScheduleDocsSection('planACover')}
    ${pageNavS(null,'/p2')}
  </div>`;
}

function pagePlanAResidences(){
  const d=window.D;
  const rows=(d.q1Residences||[]).map((r,i)=>{
    const set=f=>`D.q1Residences[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Residence ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q1Residences',${i},'/p2')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q1Residences',${i},'/p2')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Facility name, or owner of the private residence<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" oninput="${set('name')}"></div>
        <div class="col-md-6"><label class="form-label">Type of facility</label><input type="text" class="form-control" placeholder="e.g. Assisted Living, Private Residence" value="${esc(r.facilityType||'')}" oninput="${set('facilityType')}"></div>
        <div class="col-md-6"><label class="form-label">Street address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-6"><label class="form-label">City, State and ZIP</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" oninput="${set('cityStateZip')}"></div>
        <div class="col-md-4"><label class="form-label">Phone number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
        <div class="col-md-4"><label class="form-label">Resided from</label><input type="date" class="form-control" value="${esc(r.from||'')}" oninput="${set('from')}"></div>
        <div class="col-md-4"><label class="form-label">Resided to</label><input type="date" class="form-control" value="${esc(r.to||'')}" oninput="${set('to')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>1. Places the Ward Has Lived</h1>
    <div class="schedule-instructions">List every place the ward resided during the prior 12 months, earliest first. The court checks this against the address on file — if the ward moved, question 2 on the next page asks how that move was handled.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No residences listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q1Residences','residence','/p2')">+ Add Residence</button>
    ${renderScheduleDocsSection('planAResidences')}
    ${pageNavS('/','/p3')}
  </div>`;
}

function pagePlanACarePlan(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>2–3. Residence Change &amp; Care Plan</h1>
    ${planQ(2,"If the ward's address has changed since the last plan was filed",
      `<div class="plan-check-grid">
        ${cb('q2NoMove','N/A — the ward has not moved since the last plan was filed')}
        ${cb('q2WithinCounty','The move was within this county and a change of address was provided to the court')}
        ${cb('q2WithinCircuit','The move was within this Circuit and notice was provided to the court within 15 days')}
        ${cb('q2OutsideApproved','The move was outside this Circuit and prior court approval was obtained')}
        ${cb('q2OutsideVenuePetition','The move was outside this Circuit and a petition to change venue is filed with this plan')}
      </div>`,'Check all that apply.')}
    ${planQ(3,'For the best welfare of the ward, the guardian plans as follows',
      planCheckGroup("The residential setting best suited to the ward's needs is:",
        [cb('q3SettingALF','Assisted Living (ALF)'),cb('q3SettingGroupHome','Group Home'),
         cb('q3SettingIntermediate','Intermediate'),cb('q3SettingPrivate','Private Residence'),
         cb('q3SettingSkilled','Skilled Nursing'),cb('q3SettingSpecialized','Specialized'),
         cb('q3SettingStateHospital','State Hospital'),cb('q3SettingOther','Other')].join(''),
        'q3SettingExplain',d.q3SettingExplain,d.q3SettingOther)
      +planCheckGroup('The guardian will ensure this remains the best setting by:',
        [cb('q3EnsureAssessing','Periodically assessing needs'),
         cb('q3EnsureWardDecides','The ward retains the right to decide'),
         cb('q3EnsureNoChange','No change, unless required by medical condition')].join(''),'','',false)
      +planCheckGroup('Provision for medical care services:',
        [cb('q3MedPrimary','Routine examination by primary care physician'),
         cb('q3MedDentist','Routine examination by dentist'),
         cb('q3MedOphthalmologist','Routine examination by ophthalmologist'),
         cb('q3MedSpecialist','Routine examination by specialist'),
         cb('q3MedPhysicalTherapy','Physical therapy'),cb('q3MedSpeechTherapy','Speech therapy'),
         cb('q3MedOccupationalTherapy','Occupational therapy'),
         cb('q3MedWardDecides','The ward retains the right to make their own decision'),
         cb('q3MedNone','None'),cb('q3MedOther','Other')].join(''),
        'q3MedExplain',d.q3MedExplain,d.q3MedOther||d.q3MedNone)
      +(d.q3MedSpecialist?`<div class="plan-conditional mb-3">${inpS('q3MedSpecialistArea','Area of specialty',d.q3MedSpecialistArea,true)}</div>`:'')
      +planCheckGroup('Provision for mental health services:',
        [cb('q3MentalPsych','Routine examination by psychiatrist / psychologist'),
         cb('q3MentalWardDecides','Ward retains the right to make own decisions'),
         cb('q3MentalOutpatient','Ongoing treatment — outpatient'),
         cb('q3MentalInpatient','Ongoing treatment — inpatient'),
         cb('q3MentalNone','None'),cb('q3MentalOther','Other')].join(''),
        'q3MentalExplain',d.q3MentalExplain,d.q3MentalOther||d.q3MentalNone)
      +planCheckGroup('Provision for personal care (bathing, grooming, feeding):',
        [cb('q3PersonalFacility','Care facility'),cb('q3PersonalNurses','Nurses and aides'),
         cb('q3PersonalFamily','Family and friends'),cb('q3PersonalWithout','Ward does without assistance'),
         cb('q3PersonalNone','None; ward can provide own personal care'),cb('q3PersonalOther','Other')].join(''),
        'q3PersonalExplain',d.q3PersonalExplain,d.q3PersonalOther||d.q3PersonalNone)
      +planCheckGroup('Provision for socialization and recreational activities:',
        [cb('q3SocialFacility','Care facility'),cb('q3SocialNurses','Nurses and aides'),
         cb('q3SocialFamily','Family and friends'),
         cb('q3SocialWardDecides','The ward retains the right to make their own decision'),
         cb('q3SocialNone','None'),cb('q3SocialOther','Other')].join(''),
        'q3SocialExplain',d.q3SocialExplain,d.q3SocialOther||d.q3SocialNone))}
    ${renderScheduleDocsSection('planACarePlan')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanABenefits(){
  const d=window.D;
  const b=d.benefits||{};
  const rows=PLAN_BENEFITS.map(([k,label])=>{
    const v=b[k]||{};
    const set=f=>`D.benefits['${k}'].${f}=this.checked;autoSave();updateNavDots()`;
    return `<tr>
      <td>${label}</td>
      <td class="text-center"><input class="form-check-input" type="checkbox" ${v.eligible?'checked':''} onchange="${set('eligible')}" aria-label="${esc(label)} — eligible"></td>
      <td class="text-center"><input class="form-check-input" type="checkbox" ${v.appliedFor?'checked':''} onchange="${set('appliedFor')}" aria-label="${esc(label)} — applied for"></td>
    </tr>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>3G. Insurance &amp; Benefits</h1>
    <div class="schedule-instructions">Health and accident insurance, and any private or governmental benefits the ward receives toward the cost of medical, mental health or related services. Mark whether the ward is <strong>eligible</strong> for each, and whether you have <strong>applied</strong> for it.</div>
    <table class="table plan-benefits-table">
      <thead><tr><th>Benefit</th><th class="text-center" style="width:7rem">Eligible</th><th class="text-center" style="width:7rem">Applied for</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="plan-check-grid mt-3">
      ${chkP('q3BenefitsNone','None of the above',d.q3BenefitsNone)}
      ${chkP('q3BenefitsOther','Other (explain below)',d.q3BenefitsOther)}
    </div>
    ${(d.q3BenefitsOther||d.q3BenefitsNone)?`<div class="plan-conditional mt-2">${txtP('q3BenefitsExplain','Explanation',d.q3BenefitsExplain,3)}</div>`:''}
    ${renderScheduleDocsSection('planABenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanAProviders(){
  const d=window.D;
  const rows=(d.q4Providers||[]).map((r,i)=>{
    const set=f=>`D.q4Providers[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Provider ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q4Providers',${i},'/p5')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q4Providers',${i},'/p5')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Provider's first name, last name, middle initial<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" oninput="${set('name')}"></div>
        <div class="col-md-3"><label class="form-label">Type of provider</label><input type="text" class="form-control" placeholder="e.g. Primary Care Physician" value="${esc(r.providerType||'')}" oninput="${set('providerType')}"></div>
        <div class="col-md-3"><label class="form-label">Number of visits</label><input type="text" class="form-control" value="${esc(r.visits||'')}" oninput="${set('visits')}"></div>
        <div class="col-md-6"><label class="form-label">Street address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-4"><label class="form-label">City, State and ZIP</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" oninput="${set('cityStateZip')}"></div>
        <div class="col-md-2"><label class="form-label">Phone</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>4. Professional Medical Treatment</h1>
    <div class="schedule-instructions">Every professional who treated the ward during the prior 12 months — physicians, dentists, therapists, mental health providers. Include how many visits there were; the court uses this to see whether the ward is actually receiving the care the plan promises.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q4Providers','provider','/p5')">+ Add Provider</button>
    ${renderScheduleDocsSection('planAProviders')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanARights(){
  const d=window.D;
  const r=d.rights||{};
  const rows=PLAN_RIGHTS.map(([k,label])=>{
    const cells=PLAN_RIGHT_STATES.map(s=>
      `<td class="text-center"><input class="form-check-input" type="radio" name="right_${k}" ${r[k]===s?'checked':''} onchange="D.rights['${k}']='${s}';autoSave();updateNavDots()" aria-label="${esc(label)} — ${esc(s)}"></td>`).join('');
    return `<tr><td>${label}</td>${cells}</tr>`;
  }).join('');
  const anyRestorable=PLAN_RIGHTS.some(([k])=>r[k]==='Capable of restoration');
  return `<div class="schedule-page">
    <h1>5–7. Social Skills &amp; Rights</h1>
    ${planQ(5,'Social skills, abilities and activities of the ward',
      txtP('q5SocialSkills',"Describe the ward's social skills and abilities",d.q5SocialSkills,4,true,
        'For example: the ward communicates well; communicates with gestures; cannot communicate at all. Also describe any change from the previous plan period.')
      +txtP('q5Activities',"Activities undertaken to increase the ward's capacity",d.q5Activities,4,true,
        'For example: encouragement, physical or mental therapy, rehabilitative services. Say whether these activities were effective.'))}
    ${planQ(6,'Is the ward now capable of having any of these rights restored?',
      `<table class="table plan-rights-table">
        <thead><tr><th>Right</th>${PLAN_RIGHT_STATES.map(s=>`<th class="text-center" style="width:9rem">${s}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`,
      'Mark each right with its current status. <strong>"Capable of restoration" is a formal statement</strong> — if the physician\'s report agrees, you must file a separate petition to restore that right. This plan does not restore anything on its own.')}
    ${planQ(7,"Disagreement with the physician's report",
      txtP('q7RightsExplain','Explanation',d.q7RightsExplain,4,false,
        "Required only if you marked a right as capable of restoration but disagree with what the physician's report says about it."),
      anyRestorable?"You marked at least one right as capable of restoration. If the physician's report does not agree, explain here."
                   :"Leave blank unless you disagree with the physician's report.")}
    ${renderScheduleDocsSection('planARights')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanAADLs(){
  const d=window.D;
  const a=d.adls||{};
  const rows=PLAN_ADLS.map(([k,label])=>
    `<tr><td>${label}</td><td style="width:16rem">
      <select class="form-select form-select-sm" onchange="D.adls['${k}']=this.value;autoSave();updateNavDots()" aria-label="${esc(label)}">
        ${PLAN_ADL_RATINGS.map(o=>`<option value="${esc(o)}" ${a[k]===o?'selected':''}>${o||'— select —'}</option>`).join('')}
      </select></td></tr>`).join('');
  return `<div class="schedule-page">
    <h1>8. Activities of Daily Living</h1>
    <div class="schedule-instructions">Rate all sixteen honestly, including the ones that haven't changed. The court compares these year over year to see whether the ward's independence is improving or declining, so a blank row is a gap in the record rather than a neutral answer.</div>
    <table class="table plan-adl-table">
      <thead><tr><th>Activity</th><th>Rating</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${renderScheduleDocsSection('planAADLs')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

function pagePlanADisabilities(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const devices=(prefix)=>[
    cb(prefix+'Dentures','Dentures'),cb(prefix+'HearingAid','Hearing aid'),
    cb(prefix+'Wheelchair','Wheelchair'),cb(prefix+'Walker','Walker / cane'),
    cb(prefix+'Crutches','Crutches'),cb(prefix+'Prosthetics','Prosthetics'),
    cb(prefix+'Glasses','Glasses'),cb(prefix+'None','None'),cb(prefix+'Other','Other')].join('');
  return `<div class="schedule-page">
    <h1>9. Disabilities &amp; Assistive Devices</h1>
    ${planQ(9,'Disabilities and assistive devices',
      planCheckGroup('The mental disabilities of the ward are:',
        [cb('q9MentalDementia','Dementia'),cb('q9MentalAlzheimers',"Alzheimer's type of dementia"),
         cb('q9MentalAutism','Autism spectrum disorders'),cb('q9MentalHeadInjury','Closed head injury'),
         cb('q9MentalDevelopmental','Developmental disabilities'),cb('q9MentalIntellectual','Intellectual disability'),
         cb('q9MentalSchizophrenia','Schizophrenia or related disorders'),cb('q9MentalDepression','Depression'),
         cb('q9MentalSubstance','Induced by substance abuse'),
         cb('q9MentalNone','Ward has no mental disabilities'),cb('q9MentalOther','Other')].join(''),
        'q9MentalExplain',d.q9MentalExplain,d.q9MentalOther)
      +planCheckGroup('The physical disabilities of the ward are:',
        [cb('q9PhysMobility','Mobility'),cb('q9PhysBlindness','Blindness'),
         cb('q9PhysDeafness','Deafness'),cb('q9PhysDiabetic','Diabetic'),
         cb('q9PhysParkinsons',"Parkinson's disease"),cb('q9PhysArthritis','Severe arthritis'),
         cb('q9PhysNone','Ward has no physical disabilities'),cb('q9PhysOther','Other')].join(''),
        'q9PhysExplain',d.q9PhysExplain,d.q9PhysOther)
      +planCheckGroup('Assistive devices the ward currently uses:',devices('q9Uses'),
        'q9UsesExplain',d.q9UsesExplain,d.q9UsesOther)
      +planCheckGroup('Assistive devices the ward needs but does not yet have:',devices('q9Needs'),
        'q9NeedsExplain',d.q9NeedsExplain,d.q9NeedsOther))}
    ${renderScheduleDocsSection('planADisabilities')}
    ${pageNavS('/p7','/p9')}
  </div>`;
}

function pagePlanADirectives(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const blocks=(d.q10Directives||[]).map((r,i)=>{
    const set=f=>`D.q10Directives[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Directive ${i+1}
        <button class="btn btn-sm btn-outline-danger ms-auto" onclick="removePlanRow('q10Directives',${i},'/p9')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Title of the order or directive</label><input type="text" class="form-control" value="${esc(r.title||'')}" oninput="${set('title')}"></div>
        <div class="col-md-3"><label class="form-label">Date executed / signed</label><input type="date" class="form-control" value="${esc(r.dateSigned||'')}" oninput="${set('dateSigned')}"></div>
        <div class="col-md-3"><label class="form-label">Name of person who signed</label><input type="text" class="form-control" value="${esc(r.signedBy||'')}" oninput="${set('signedBy')}"></div>
        <div class="col-md-6"><label class="form-label">Designated agent(s) or surrogate(s)</label><input type="text" class="form-control" value="${esc(r.agents||'')}" oninput="${set('agents')}"></div>
        <div class="col-md-6"><label class="form-label">Alternate agent(s) or surrogate(s)</label><input type="text" class="form-control" value="${esc(r.alternates||'')}" oninput="${set('alternates')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship of agent(s) to the ward</label><input type="text" class="form-control" value="${esc(r.relationship||'')}" oninput="${set('relationship')}"></div>
        <div class="col-md-6"><label class="form-label">Contact information for agent(s)</label><input type="text" class="form-control" value="${esc(r.contact||'')}" oninput="${set('contact')}"></div>
        <div class="col-md-4"><label class="form-label">Has a court suspended or revoked it?</label>
          <select class="form-select" onchange="${set('courtRevoked')}">
            <option value="" ${!r.courtRevoked?'selected':''}>— select —</option>
            <option value="No" ${r.courtRevoked==='No'?'selected':''}>No</option>
            <option value="Yes" ${r.courtRevoked==='Yes'?'selected':''}>Yes</option>
          </select></div>
        ${r.courtRevoked==='Yes'?`
        <div class="col-md-4"><label class="form-label">Date of order</label><input type="date" class="form-control" value="${esc(r.orderDate||'')}" oninput="${set('orderDate')}"></div>
        <div class="col-md-4"><label class="form-label">Entered in (county / state)</label><input type="text" class="form-control" value="${esc(r.orderCounty||'')}" oninput="${set('orderCounty')}"></div>`:''}
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>10. Advance Directives</h1>
    ${planQ(10,'Pre-existing orders and advance directives',
      `<div class="plan-check-grid">${cb('q10NoDirectives','There are NO pre-existing DNR orders or other advance directives')}</div>
      ${d.q10NoDirectives?`<div class="plan-conditional mt-2 mb-3">
        <label class="form-label">Steps taken to verify there are none:</label>
        <div class="plan-check-grid">
          ${cb('q10StepResidence',"Search of ward's prior and current residence")}
          ${cb('q10StepSafeDeposit',"Inventory of ward's safe deposit box")}
          ${cb('q10StepInterviewed','Interviewed family and friends')}
          ${cb('q10StepMedicalProviders',"Requested documents from the ward's medical providers")}
          ${cb('q10StepAttorney',"Requested documents from the ward's attorney")}
        </div></div>`:''}
      <div class="plan-check-grid mt-2">${cb('q10Executed','The ward executed the following advance directives')}</div>
      ${d.q10Executed?`<div class="plan-conditional mt-2">
        <div class="plan-check-grid">
          ${cb('q10ExecDNR','Order Not to Resuscitate (DNR), F.S. 401.45(3)')}
          ${cb('q10ExecHealthcare','Advance Directive for Healthcare (surrogate, living will, anatomical gift)')}
          ${cb('q10ExecPOA','Durable Power of Attorney, F.S. Chapter 709')}
          ${cb('q10ExecOther','Other')}
        </div>
        ${d.q10ExecOther?`<div class="mt-2">${inpS('q10ExecOtherText','Describe the other directive',d.q10ExecOtherText,true)}</div>`:''}
        <h3 style="font-size:.85rem;font-weight:650;margin:1rem 0 .5rem;">Details for each directive</h3>
        ${blocks}
        <button class="btn btn-outline-primary btn-sm" onclick="addPlanRow('q10Directives','directive','/p9')">+ Add Directive</button>
      </div>`:''}`,
      'If there are no directives, check the first box and record the steps you took to verify that. If the ward did execute directives, check the second box and describe each one.')}
    ${renderScheduleDocsSection('planADirectives')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanARemuneration(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>11. Remuneration</h1>
    ${planQ(11,'Declaration of remuneration',
      `<div class="plan-check-grid">${chkP('q11NoRemuneration','I have received NO remuneration from any source for services rendered to or on behalf of the ward',d.q11NoRemuneration)}</div>
      ${d.q11NoRemuneration
        ? `<div class="plan-conditional mt-2">${inpS('q11NoRemunerationName',"Declaring guardian's name",d.q11NoRemunerationName,true)}</div>`
        : `<div class="plan-conditional mt-2">
            <div class="row g-2">
              <div class="col-md-4">${inpS('q11ReceivedName',"Declaring guardian's name",d.q11ReceivedName)}</div>
              <div class="col-md-4">${inpS('q11Amount','Amount received',d.q11Amount,false,'number')}</div>
              <div class="col-md-4">${inpS('q11From','Received from (person or company)',d.q11From)}</div>
            </div>
            <div class="plan-check-grid mt-2">${chkP('q11SubmittedToCourt','All requests for reimbursement or fees have been submitted to the court for review and approval',d.q11SubmittedToCourt)}</div>
          </div>`}`,
      'Remuneration means any payment or benefit made directly or indirectly, overtly or covertly, in cash or in kind, to the guardian — F.S. 744.367(3)(a). If you received nothing, check the box; otherwise fill in the details below it.')}
    ${renderScheduleDocsSection('planARemuneration')}
    ${pageNavS('/p9','/p11')}
  </div>`;
}

function pagePlanASignatures(){
  const d=window.D;
  const g=d.planGuardians||[];
  const cb=(id,label)=>chkP(id,label,d[id]);
  const block=(i,label)=>{
    const p=g[i]||{};
    const set=f=>`D.planGuardians[${i}].${f}=this.value;autoSave();updateNavDots()`;
    const reqMark=i===0?'<span class="req">*</span>':'';
    return `<div class="plan-sig-block">
      <h3>${label}</h3>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Printed Name${reqMark}</label><input type="text" class="form-control" value="${esc(formatName(p.name||''))}" oninput="this.value=formatName(this.value);${set('name')}"></div>
        <div class="col-md-3"><label class="form-label">Date Signed${reqMark}</label><input type="date" class="form-control" value="${esc(p.signatureDate||'')}" oninput="${set('signatureDate')}"></div>
        <div class="col-md-3"><label class="form-label">SSN / EIN</label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(formatSSN(p.ssn||''))}" oninput="this.value=formatSSN(this.value);${set('ssn')}"><button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(formatPhone(p.phone||''))}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
        <div class="col-md-8"><label class="form-label">Email Address</label><input type="text" class="form-control" value="${esc(p.email||'')}" oninput="${set('email')}"></div>
        <div class="col-md-6"><label class="form-label">Mailing Street Address</label><input type="text" class="form-control" value="${esc(formatAddress(p.mailingStreet||''))}" oninput="this.value=formatAddress(this.value);${set('mailingStreet')}"></div>
        <div class="col-md-6"><label class="form-label">Mailing City / State / ZIP</label><input type="text" class="form-control" value="${esc(p.mailingCityStateZip||'')}" oninput="${set('mailingCityStateZip')}"></div>
        <div class="col-md-6"><label class="form-label">Residence or Office Street Address</label><input type="text" class="form-control" value="${esc(formatAddress(p.officeStreet||''))}" oninput="this.value=formatAddress(this.value);${set('officeStreet')}"></div>
        <div class="col-md-6"><label class="form-label">Residence or Office City / State / ZIP</label><input type="text" class="form-control" value="${esc(p.officeCityStateZip||'')}" oninput="${set('officeCityStateZip')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship to Ward</label><input type="text" class="form-control" value="${esc(p.relationship||'')}" oninput="${set('relationship')}"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Signatures</h1>
    <h2 class="subsection-heading">Certification of Guardian(s)</h2>
    <div class="schedule-instructions">Check each statement that applies. If the ward's ability to exercise rights has changed since the order appointing you, you must either file a petition to remove or restore rights, or explain below why no change should be made.</div>
    <div class="plan-check-grid mb-3">
      ${cb('certIncapacitatedNoCopy','The ward was declared totally incapacitated and has not been given a copy of this plan')}
      ${cb('certMinorNoCopy','The ward is a minor and has not been given a copy of this plan')}
      ${cb('certConsulted',"The guardian has consulted with the ward, honored their wishes, and the plan accords with them to the maximum extent possible")}
      ${cb('certNoRestriction',"The plan does not restrict the ward's physical liberty except as necessary to prevent serious injury, illness or disease")}
      ${cb('certProvidesMedical',"The plan provides for the ward's medical care and mental health treatment")}
      ${cb('certPhysicianAttached',"The physician's statement of an examination within 90 days before the plan period is attached")}
      ${cb('certRecognizeRights','In exercising their powers, the guardian recognizes any rights retained by the ward (F.S. 744.363(6))')}
    </div>
    ${txtP('certRightsChangedExplain','If rights have changed and no petition is being filed, explain why',d.certRightsChangedExplain,3)}
    <div class="attestation-text">Under penalties of perjury, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
    ${block(0,'Guardian')}
    ${block(1,'Co-Guardian (if any)')}
    ${block(2,'Co-Guardian (if any)')}
    <h2 class="subsection-heading mt-4">Certification of Guardian's Attorney</h2>
    <div class="schedule-instructions">The attorney notifies the court of this filing and represents that the plan conforms to Florida Guardianship Law. Leave blank if no attorney is involved.</div>
    <div class="row g-2">
      <div class="col-md-6">${inpS('attorney','Attorney Name',d.attorney)}</div>
      <div class="col-md-3">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,false,'date')}</div>
      <div class="col-md-3">${inpS('attorney_bar','Bar Number',d.attorney_bar)}</div>
      <div class="col-md-4">${inpS('attorney_phone','Phone Number',d.attorney_phone)}</div>
      <div class="col-md-8">${inpS('attorney_street','Street Address',d.attorney_street)}</div>
      <div class="col-md-12">${inpS('attorney_cityStateZip','City / State / ZIP',d.attorney_cityStateZip)}</div>
    </div>
    ${renderScheduleDocsSection('planASignatures')}
    ${pageNavS('/p10',null)}
  </div>`;
}

// Row add/remove/duplicate for the Plan's repeating tables. Generic over the
// array name so residences, providers and directives all share it.
function planEmptyRow(kind){
  if(kind==='residence')return emptyPlanResidence();
  if(kind==='provider')return emptyPlanProvider();
  if(kind==='directive')return emptyPlanDirective();
  if(kind==='initialProvider')return emptyInitialProvider();
  if(kind==='minorResidence')return emptyMinorResidence();
  if(kind==='minorProvider')return emptyMinorProvider();
  return {};
}
function addPlanRow(arrName,kind,route){
  window.D[arrName]=window.D[arrName]||[];
  window.D[arrName].push(planEmptyRow(kind));
  autoSave();navigate(route);
}
function removePlanRow(arrName,idx,route){
  const list=window.D[arrName];
  if(!list||!list[idx])return;
  list.splice(idx,1);
  autoSave();navigate(route);
}
function duplicatePlanRow(arrName,idx,route){
  const list=window.D[arrName];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  autoSave();navigate(route);
}

function validatePlanAnnual(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined)errs.push(label);};
  req(d.wardName,'Cover — Name of Ward is required');
  req(d.caseNumber,'Cover — Case Number is required');
  req(d.county,'Cover — County is required');
  req(d.gid,'Cover — Guardianship Inception Date is required');
  req(d.periodFrom,'Cover — Reporting Period From is required');
  req(d.periodTo,'Cover — Reporting Period To is required');
  req(d.guardian,'Cover — Guardian Name(s) is required');
  req(d.wardLiving,'Cover — where the ward is living must be answered');
  req(d.residenceAddress,'Cover — address where the ward resides is required');
  req(d.residenceCityStateZip,'Cover — city/state/ZIP where the ward resides is required');

  const res=(d.q1Residences||[]).filter(r=>r&&(r.name||r.street||r.cityStateZip));
  if(!res.length)errs.push('1. Residences — at least one residence must be listed');
  res.forEach((r,i)=>{if(!r.name)errs.push(`1. Residences — row ${i+1} needs a facility or owner name`);});

  if(!(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition)){
    errs.push('2–3. Residence & Care — question 2 (address change) must have at least one box checked');
  }
  if(!(d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate
     ||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther)){
    errs.push('2–3. Residence & Care — a best-suited residential setting must be selected');
  }
  if(d.q3SettingOther)req(d.q3SettingExplain,'2–3. Residence & Care — explain the "Other" residential setting');
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Residence & Care — area of specialty is required');

  const provs=(d.q4Providers||[]).filter(r=>r&&(r.name||r.providerType||r.visits));
  provs.forEach((r,i)=>{if(!r.name)errs.push(`4. Medical Treatment — row ${i+1} needs a provider name`);});

  req(d.q5SocialSkills,'5–7. Skills & Rights — question 5 (social skills) is required');
  req(d.q5Activities,'5–7. Skills & Rights — question 5 (capacity-building activities) is required');
  const rights=d.rights||{};
  const unanswered=PLAN_RIGHTS.filter(([k])=>!rights[k]);
  if(unanswered.length){
    errs.push(`5–7. Skills & Rights — ${unanswered.length} right${unanswered.length===1?'':'s'} still unanswered in question 6`);
  }
  const adls=d.adls||{};
  const unrated=PLAN_ADLS.filter(([k])=>!adls[k]);
  if(unrated.length){
    errs.push(`8. Daily Living — ${unrated.length} activit${unrated.length===1?'y is':'ies are'} still unrated`);
  }

  if(!(d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury
     ||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression
     ||d.q9MentalSubstance||d.q9MentalOther)){
    errs.push('9. Disabilities & Devices — mental disabilities must be answered, or "no mental disabilities" checked');
  }
  if(!(d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic
     ||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther)){
    errs.push('9. Disabilities & Devices — physical disabilities must be answered, or "no physical disabilities" checked');
  }
  if(d.q9MentalOther)req(d.q9MentalExplain,'9. Disabilities & Devices — explain the "Other" mental disability');
  if(d.q9PhysOther)req(d.q9PhysExplain,'9. Disabilities & Devices — explain the "Other" physical disability');

  if(!(d.q10NoDirectives||d.q10Executed)){
    errs.push('10. Advance Directives — answer whether directives exist');
  }
  if(d.q10NoDirectives&&d.q10Executed){
    errs.push('10. Advance Directives — cannot both have no directives and list executed directives');
  }
  if(d.q10ExecOther)req(d.q10ExecOtherText,'10. Advance Directives — describe the "Other" directive');

  if(d.q11NoRemuneration)req(d.q11NoRemunerationName,"11. Remuneration — declaring guardian's name is required");
  else if(!(d.q11ReceivedName||d.q11Amount||d.q11From)){
    errs.push('11. Remuneration — either declare no remuneration, or record what was received');
  }

  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian printed name is required');
  req(g0.signatureDate,'Signatures — Guardian date signed is required');
  return errs;
}

// docHeaderPlanSimplified()/buildPrintHTMLPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// ── Pre-filing readiness check ───────────────────────────
// Derived from the Clerk of Court's own review checklists (the
// "Clerk's Review of Annual Guardianship Plan" forms). Deliberately split
// in two: items the app can actually verify from the ward's data, and
// items that depend on the clerk's internal systems or on steps taken
// outside the app. The second group is shown as reminders, never as
// pass/fail, so the app never implies it has checked something it hasn't.
// Dispatches to the right checklist for the plan type being previewed.
// Each plan has its own Clerk's Review form with its own required items,
// so the lists genuinely differ rather than being one shared set.
function planReadinessChecks(){
  // planReadinessChecksSimplified() moved to
  // src/features/plan-simplified/print.js (Milestone 3, Phase C), reached
  // via window since this dispatcher is shared with the three
  // not-yet-extracted Plan types and can't import it directly.
  return activeInventoryType==='planAnnual'  ? planReadinessChecksAnnual()
    : activeInventoryType==='planInitial'    ? planReadinessChecksInitial()
    : activeInventoryType==='planMinor'      ? planReadinessChecksMinor()
    : window.planReadinessChecksSimplified();
}

function planReadinessPanel(){
  const {auto,manual}=planReadinessChecks();
  const pending=auto.filter(a=>!a.ok).length;
  const rows=auto.map(a=>`<div class="readiness-row">
      <span class="readiness-mark ${a.ok?'ok':'pending'}">${a.ok?'✓':'⚠'}</span>
      <span>${esc(a.label)}</span>
    </div>`).join('');
  return `<div class="validation-panel readiness-panel no-print">
    <div class="validation-head">
      ${ic('shield',17)}
      <div>
        <div class="validation-title">Clerk's review readiness${pending?` — ${pending} item${pending===1?'':'s'} outstanding`:' — all checks pass'}</div>
        <div class="validation-sub">Mirrors what the Clerk of Court looks for when reviewing a plan. Passing every check does not guarantee approval.</div>
      </div>
    </div>
    <div class="validation-group">
      <div class="validation-group-head"><span class="validation-group-name">Checked from your plan</span></div>
      <div class="readiness-list">${rows}</div>
    </div>
    <div class="validation-group">
      <div class="validation-group-head"><span class="validation-group-name">Before you file — the app can't verify these</span></div>
      <div class="readiness-list">${manual.map(m=>`<div class="readiness-row"><span class="readiness-mark manual">•</span><span>${esc(m)}</span></div>`).join('')}</div>
    </div>
  </div>`;
}

// pagePrintPlanSimplified()/doSavePdfPlanSimplified() moved to
// src/features/plan-simplified/print.js (Milestone 3, Phase C). The lazy
// module bridge in that feature's index.js exposes doSavePdfPlanSimplified
// on window so the print page's onclick="doSavePdfPlanSimplified()" still
// resolves.

// ── Annual Guardianship Plan: readiness, print and PDF ───
// The checklist items mirror the Clerk's Review of Annual Guardianship
// Plan form (F.S. 744.3675 & 744.368), which is what court staff actually
// fill in when auditing a filed plan.
function planReadinessChecksAnnual(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const res=(d.q1Residences||[]).filter(r=>r&&r.name);
  const provs=(d.q4Providers||[]).filter(r=>r&&r.name);
  const rights=d.rights||{}, adls=d.adls||{};
  const auto=[
    {label:'Reporting period is stated',ok:has(d.periodFrom)&&has(d.periodTo)},
    {label:'Ward name, case number and inception date are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.gid)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and SSN/EIN provided',ok:has(g0.mailingStreet)&&has(g0.phone)&&has(g0.ssn)},
    {label:"Ward's current residence and living arrangement stated",ok:has(d.wardLiving)&&has(d.residenceAddress)},
    {label:`Residences for the year listed (${res.length})`,ok:res.length>0},
    {label:'Question 2 — address change addressed',ok:!!(d.q2NoMove||d.q2WithinCounty||d.q2WithinCircuit||d.q2OutsideApproved||d.q2OutsideVenuePetition)},
    {label:'Question 3 — residential setting and care provisions selected',ok:!!(d.q3SettingALF||d.q3SettingGroupHome||d.q3SettingIntermediate||d.q3SettingPrivate||d.q3SettingSkilled||d.q3SettingSpecialized||d.q3SettingStateHospital||d.q3SettingOther)},
    {label:`Question 4 — professional medical treatment listed (${provs.length})`,ok:provs.length>0},
    {label:'Question 5 — social skills and capacity-building activities described',ok:has(d.q5SocialSkills)&&has(d.q5Activities)},
    {label:'Question 6 — all twelve rights assessed',ok:PLAN_RIGHTS.every(([k])=>has(rights[k]))},
    {label:'Question 8 — all sixteen activities of daily living rated',ok:PLAN_ADLS.every(([k])=>has(adls[k]))},
    {label:'Question 9 — mental and physical disabilities answered',ok:!!((d.q9MentalNone||d.q9MentalDementia||d.q9MentalAlzheimers||d.q9MentalAutism||d.q9MentalHeadInjury||d.q9MentalDevelopmental||d.q9MentalIntellectual||d.q9MentalSchizophrenia||d.q9MentalDepression||d.q9MentalSubstance||d.q9MentalOther)&&(d.q9PhysNone||d.q9PhysMobility||d.q9PhysBlindness||d.q9PhysDeafness||d.q9PhysDiabetic||d.q9PhysParkinsons||d.q9PhysArthritis||d.q9PhysOther))},
    {label:'Question 10 — advance directives answered',ok:!!d.q10NoDirectives!==!!d.q10Executed},
    {label:'Question 11 — remuneration declared',ok:d.q11NoRemuneration?has(d.q11NoRemunerationName):!!(d.q11ReceivedName||d.q11Amount||d.q11From)},
    {label:"Physician's report confirmed attached (certification box)",ok:!!d.certPhysicianAttached},
  ];
  const manual=[
    "File the physician's report separately, at the same time as this plan. The app does not produce it.",
    'File within 90 days after the last day of the anniversary month the Letters were signed (F.S. 744.367).',
    'Serve a copy on all interested persons and file the certificate of service.',
    'If you marked any right as capable of restoration, file the separate petition to restore it — this plan does not restore rights.',
    'If the ward changed residence or a new guardian was appointed, file an updated Disaster Plan (Administrative Order 2019-005).',
    'Attach copies of any advance directives listed in Question 10 unless already filed with the court.',
    'If you are a professional guardian, confirm your OPPG registration is current.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
  ];
  return {auto,manual};
}

function buildNavPlanInitial(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" onclick="navigate('${route}')">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Initial Guardianship Plan</div>
      ${item('/','pi-cover','Cover')}
      ${item('/p2','pi-p2','2–3&nbsp;&nbsp;Setting &amp; Medical Care')}
      ${item('/p3','pi-p3','4–5&nbsp;&nbsp;Mental Health &amp; Personal Care')}
      ${item('/p4','pi-p4','6–7&nbsp;&nbsp;Socialization &amp; Benefits')}
      ${item('/p5','pi-p5','9&nbsp;&nbsp;Examining Providers')}
      ${item('/p6','pi-p6','10A&nbsp;&nbsp;Daily Living')}
      ${item('/p7','pi-p7','10B–D&nbsp;&nbsp;Disabilities &amp; Devices')}
      ${item('/p8','pi-p8','11&nbsp;&nbsp;Advance Directives')}
      ${item('/p9','pi-p9','Signatures')}
      ${item('/p10','pi-p10','Attorney Certification')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" onclick="navigate('/print')"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function renderPagePlanInitial(page){
  const el=document.getElementById('main-content');
  switch(page){
    case '/':      el.innerHTML=pagePlanICover();break;
    case '/p2':    el.innerHTML=pagePlanISettingMedical();break;
    case '/p3':    el.innerHTML=pagePlanIMentalPersonal();break;
    case '/p4':    el.innerHTML=pagePlanISocialBenefits();break;
    case '/p5':    el.innerHTML=pagePlanIProviders();break;
    case '/p6':    el.innerHTML=pagePlanIADLs();break;
    case '/p7':    el.innerHTML=pagePlanIDisabilities();break;
    case '/p8':    el.innerHTML=pagePlanIDirectives();break;
    case '/p9':    el.innerHTML=pagePlanISignatures();break;
    case '/p10':   el.innerHTML=pagePlanIAttorney();break;
    case '/print': el.innerHTML=pagePrintPlanInitial();break;
    default:       el.innerHTML=pagePlanICover();
  }
  el.scrollTop=0;
}

function pagePlanICover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Initial Guardianship Plan — Cover</h1>
    <div class="schedule-instructions">This report, with original signatures, is due within <strong>60 days</strong> after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan. Per Administrative Order 2019-005, a separate Disaster Plan must also be filed — the app does not produce that document.</div>
    ${loadWardInfoBanner()}
    <div class="row g-3">
      <div class="col-md-8">${inpS('wardName','Name of Ward',d.wardName,true)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-6">${inpS('caseNumber','Case Number',d.caseNumber,true)}</div>
      <div class="col-md-6">${inpS('successorGuardianship','Successor Guardianship? (if applicable)',d.successorGuardianship)}</div>
      <div class="col-md-6">${inpS('inceptionDate','Guardianship Inception Date',d.inceptionDate,true,'date')}</div>
      <div class="col-md-6">${inpS('lettersSignedDate','Date Letters Were Signed',d.lettersSignedDate,true,'date')}</div>
      <div class="col-md-6">${inpS('periodFrom','For the Period From',d.periodFrom,false,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','Through',d.periodTo,false,'date')}</div>
      <div class="col-md-6">${inpS('guardianNames','Guardian Name(s)',d.guardianNames,true)}</div>
      <div class="col-md-6">${inpS('attorneyName','Attorney Name',d.attorneyName)}</div>
    </div>
    <h2 class="subsection-heading mt-4">Where the Ward Currently Lives</h2>
    ${radioP('wardLiving','The ward is living:',d.wardLiving,[
      'In a private residence leased or owned by them (house, condo or apartment)',
      'In a private residence not leased or owned by them (such as family member)',
      'In a facility (Skilled Nursing, Assisted Living, etc.)'],true)}
    <div class="row g-3">
      <div class="col-12">${inpS('residenceAddress','Address Where Ward Is Currently Residing',d.residenceAddress,true)}</div>
      <div class="col-md-8">${inpS('residenceCityStateZip','City / State / ZIP',d.residenceCityStateZip,true)}</div>
      <div class="col-md-4">${inpS('residencePhone','Phone',d.residencePhone)}</div>
      <div class="col-12">${inpS('mailingAddress','Mailing Address for Ward (if different from above)',d.mailingAddress)}</div>
      <div class="col-md-8">${inpS('mailingCityStateZip','Mailing City / State / ZIP',d.mailingCityStateZip)}</div>
    </div>
    ${txtP('q1PreexistingDirectives','List any preexisting orders not to resuscitate or preexisting advance directives, the date signed, whether suspended by the court, and the steps taken to identify and locate them. Attach a copy of any directives to the plan.',d.q1PreexistingDirectives,5)}
    ${renderScheduleDocsSection('planICover')}
    ${pageNavS(null,'/p2')}
  </div>`;
}

function pagePlanISettingMedical(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>2–3. Residential Setting &amp; Medical Services</h1>
    ${planQ('2','The guardian states the place and kind of residential setting best suited for the needs of the Ward is:',
      radioP('q2Setting','',d.q2Setting,['Assisted Living (ALF)','Group Home','Intermediate','Private Residence','Skilled Nursing','Specialized','State Hospital','Other'])
      +(d.q2Setting==='Other'?`<div class="plan-conditional mt-2">${txtP('q2Explain','Explanation',d.q2Explain,3)}</div>`:''))}
    ${planQ('3','For the plan period, the guardian proposes the following as to the provision of medical services for the Ward:',
      planCheckGroup('',
        cb('q3MedPrimary','Routine examination by primary care physician')
        +cb('q3MedDentist','Routine examination by dentist')
        +cb('q3MedOphthalmologist','Routine examination by Ophthalmologist')
        +cb('q3MedSpecialist','Routine examination by Specialist')
        +cb('q3MedPT','Physical Therapy')
        +cb('q3MedST','Speech Therapy')
        +cb('q3MedOT','Occupational Therapy')
        +cb('q3MedWardDecides','The ward retains the right to make their own decision')
        +cb('q3MedOther','Other'),
        'q3MedExplain',d.q3MedExplain,d.q3MedOther)
      +(d.q3MedSpecialist?`<div class="plan-conditional mt-2">${inpS('q3MedSpecialistArea','Specialist — area of specialty',d.q3MedSpecialistArea)}</div>`:''))}
    ${renderScheduleDocsSection('planISettingMedical')}
    ${pageNavS('/','/p3')}
  </div>`;
}

function pagePlanIMentalPersonal(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>4–5. Mental Health &amp; Personal Care</h1>
    ${planQ('4','For the plan period, the guardian proposes the following as to the provision of mental health services for the Ward:',
      radioP('q4Mental','',d.q4Mental,['Routine examination by Psychiatrist/Psychologist','Ongoing Treatment Outpatient','Ongoing Treatment Inpatient','None','Other'])
      +((d.q4Mental==='Other'||d.q4Mental==='None')?`<div class="plan-conditional mt-2">${txtP('q4Explain','Explanation',d.q4Explain,3)}</div>`:''))}
    ${planQ('5','For the plan period, the guardian proposes the following as to the provision of personal care of the ward, such as bathing, grooming and feeding:',
      radioP('q5Personal','',d.q5Personal,['Care Facility','Nurses and Aides','Family and Friends','Other'])
      +(d.q5Personal==='Other'?`<div class="plan-conditional mt-2">${txtP('q5Explain','Explanation',d.q5Explain,3)}</div>`:''))}
    ${renderScheduleDocsSection('planIMentalPersonal')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanISocialBenefits(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>6–7. Socialization &amp; Benefits</h1>
    ${planQ('6','For the plan period, the guardian proposes the following to provide for socialization and/or recreational services for the Ward (e.g.: arranging friends and family to visit, encourage participation in facility or day program activities):',
      planCheckGroup('',
        cb('q6CareFacility','Care Facility')
        +cb('q6NursesAides','Nurses and Aides')
        +cb('q6FamilyFriends','Family and Friends')
        +cb('q6DayProgram','Day Program')
        +cb('q6WardDecides','The Ward retains the right to make their own decision')
        +cb('q6Other','Other'),
        'q6Explain',d.q6Explain,d.q6Other))}
    ${planQ('7','The Ward has the following health insurance, accident insurance, private benefits, or governmental benefits received to meet any part of the costs of medical, mental health or related services:',
      planCheckGroup('',
        cb('q7SocialSecurity','Social Security')
        +cb('q7Ssdi','Social Security Disability Income (SSDI)')
        +cb('q7Hmo','Health Maintenance Organization (HMO)')
        +cb('q7Ssi','Supplemental Security Income (SSI)')
        +cb('q7StateSupplement','Optional State Supplement')
        +cb('q7InstitutionalCare','Institutional Care Program')
        +cb('q7SupplementalIns','Supplemental Insurance')
        +cb('q7Pension','Pension')
        +cb('q7Medicare','Medicare')
        +cb('q7Medicaid','Medicaid')
        +cb('q7Va','VA')
        +cb('q7Trusts','Trusts (explain type and how it covers costs below)')
        +cb('q7PendingBenefits','Pending Benefits (explain why not yet receiving, or date applied, below)')
        +cb('q7Other','Other'),
        'q7Explain',d.q7Explain,d.q7Trusts||d.q7PendingBenefits||d.q7Other,
        'If Trusts or Pending Benefits is checked, explain below.'))}
    ${renderScheduleDocsSection('planISocialBenefits')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanIProviders(){
  const d=window.D;
  const rows=(d.q9Providers||[]).map((r,i)=>{
    const set=f=>`D.q9Providers[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Provider ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q9Providers',${i},'/p5')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q9Providers',${i},'/p5')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Provider's first name, last name, and middle initial<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.name||'')}" oninput="${set('name')}"></div>
        <div class="col-md-3"><label class="form-label">Type of Provider</label><input type="text" class="form-control" value="${esc(r.providerType||'')}" oninput="${set('providerType')}"></div>
        <div class="col-md-3"><label class="form-label">Approximate Date of Exam</label><input type="date" class="form-control" value="${esc(r.examDate||'')}" oninput="${set('examDate')}"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-6"><label class="form-label">City, State and Zip Code</label><input type="text" class="form-control" value="${esc(r.cityStateZip||'')}" oninput="${set('cityStateZip')}"></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>9. Examinations to Determine Treatment Needs</h1>
    <div class="schedule-instructions">List every physical and/or mental examination the guardian will secure or has secured to determine the Ward's medical and mental health treatment needs.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q9Providers','initialProvider','/p5')">+ Add Provider</button>
    ${renderScheduleDocsSection('planIProviders')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanIADLs(){
  const d=window.D;
  const adls=d.adls||{};
  const ratings=INITIAL_ADL_RATINGS.slice(1);
  const rows=INITIAL_ADLS.map(([k,label])=>{
    const btns=ratings.map((o,i)=>`
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="radio" name="radio_adl_${k}" id="adl_${k}_${i}" value="${esc(o)}" ${adls[k]===o?'checked':''} onchange="D.adls['${k}']=this.value;autoSave();updateNavDots()">
        <label class="form-check-label" for="adl_${k}_${i}">${esc(o)}</label>
      </div>`).join('');
    return `<tr><td>${esc(label)}</td><td><div class="plan-radio-row">${btns}</div></td></tr>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>10A. Activities of Daily Living</h1>
    <div class="schedule-instructions">To assist the Court with review of the initial plan, rate the ability of the Ward to engage in each activity of daily living honestly — these ratings become the baseline that future Annual Plans are compared against.</div>
    <div class="table-responsive"><table class="table plan-adl-table"><thead><tr><th style="width:45%;">Activity</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${renderScheduleDocsSection('planIADLs')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanIDisabilities(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>10B–D. Disabilities &amp; Assistive Devices</h1>
    ${planQ('B','The mental disabilities of the Ward are:',
      planCheckGroup('',
        cb('mentalAlzheimers',"Alzheimer's type of dementia")
        +cb('mentalAutism','Autism Spectrum Disorders')
        +cb('mentalClosedHeadInjury','Closed Head Injury')
        +cb('mentalDementia','Dementia')
        +cb('mentalDepression','Depression')
        +cb('mentalDevelopmental','Developmental Disabilities')
        +cb('mentalSubstance','Induced by substance abuse')
        +cb('mentalSchizophrenia','Schizophrenia or related disorders')
        +cb('mentalOther','Other'),
        'mentalExplain',d.mentalExplain,d.mentalOther))}
    ${planQ('C','The physical disabilities of the Ward are:',
      planCheckGroup('',
        cb('physMobility','Mobility')
        +cb('physBlindness','Blindness')
        +cb('physDeafness','Deafness')
        +cb('physDiabetic','Diabetic')
        +cb('physParkinsons',"Parkinson's disease")
        +cb('physArthritis','Severe arthritis')
        +cb('physOther','Other'),
        'physExplain',d.physExplain,d.physOther))}
    ${planQ('D','The assistive devices currently used by the Ward are:',
      planCheckGroup('',
        cb('usesDentures','Dentures')
        +cb('usesHearingAid','Hearing Aid')
        +cb('usesWheelchair','Wheelchair')
        +cb('usesWalker','Walker/Cane')
        +cb('usesCrutches','Crutches')
        +cb('usesProsthetics','Prosthetics')
        +cb('usesGlasses','Glasses')
        +cb('usesNone','None')
        +cb('usesOther','Other'),
        'usesExplain',d.usesExplain,d.usesOther))}
    ${renderScheduleDocsSection('planIDisabilities')}
    ${pageNavS('/p6','/p8')}
  </div>`;
}

function pagePlanIDirectives(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const dirs=(d.q11Directives||[]).map((r,i)=>{
    const set=f=>`D.q11Directives[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Advance Directive ${i+1}</div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Title of the order or directive</label><input type="text" class="form-control" value="${esc(r.title||'')}" oninput="${set('title')}"></div>
        <div class="col-md-6"><label class="form-label">Date executed/signed</label><input type="date" class="form-control" value="${esc(r.dateSigned||'')}" oninput="${set('dateSigned')}"></div>
        <div class="col-md-6"><label class="form-label">Name of person who signed</label><input type="text" class="form-control" value="${esc(r.signedBy||'')}" oninput="${set('signedBy')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship of Agent(s)/Surrogate(s) to the Ward</label><input type="text" class="form-control" value="${esc(r.relationship||'')}" oninput="${set('relationship')}"></div>
        <div class="col-md-6"><label class="form-label">Name of Designated Agent(s) or Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.agents||'')}" oninput="${set('agents')}"></div>
        <div class="col-md-6"><label class="form-label">Name of any Alternate Agent(s) or Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.alternates||'')}" oninput="${set('alternates')}"></div>
        <div class="col-md-6"><label class="form-label">Contact information for Agent(s)/Surrogate(s)</label><input type="text" class="form-control" value="${esc(r.contact||'')}" oninput="${set('contact')}"></div>
        <div class="col-md-6"><label class="form-label" for="q11dir_${i}_revoked">Has a Court suspended or revoked the Order/Directive?</label>
          <div class="form-check"><input class="form-check-input" type="checkbox" id="q11dir_${i}_revoked" ${r.courtRevoked==='Yes'?'checked':''} onchange="D.q11Directives[${i}].courtRevoked=(this.checked?'Yes':'No');autoSave();updateNavDots()"></div>
        </div>
        <div class="col-md-6"><label class="form-label">Date of Order</label><input type="date" class="form-control" value="${esc(r.orderDate||'')}" oninput="${set('orderDate')}"></div>
        <div class="col-md-6"><label class="form-label">County/State entered</label><input type="text" class="form-control" value="${esc(r.orderCounty||'')}" oninput="${set('orderCounty')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>11. Advance Directives</h1>
    ${planQ('11a','There are NO pre-existing orders Not To Resuscitate ("DNR") or any other advance directive, and I have taken the following steps to verify there are none:',
      chkP('q11NoDirectives','There are no pre-existing orders or advance directives',d.q11NoDirectives)
      +planCheckGroup('',
        cb('q11StepResidence',"Search of ward's prior and current residence")
        +cb('q11StepSafeDeposit',"Inventory of ward's safe deposit box")
        +cb('q11StepInterviewed','Interviewed family and friends')
        +cb('q11StepMedicalProviders',"Requested documents from the ward's medical providers")
        +cb('q11StepAttorney',"Requested documents from the ward's attorney"),
        null,null,false))}
    ${planQ('11b','The ward executed the following advance directives:',
      chkP('q11Executed','The ward executed advance directives (complete below)',d.q11Executed)
      +planCheckGroup('',
        cb('q11ExecDNR','Order Not to Resuscitate, F.S. 401.45(3) ("DNR")')
        +cb('q11ExecHealthcare','Advance Directive for Healthcare (healthcare surrogate, living will, or anatomical gift)')
        +cb('q11ExecPOA','Durable Power of Attorney, F.S. Chapter 709')
        +cb('q11ExecOther','Other'),
        'q11ExecOtherText',d.q11ExecOtherText,d.q11ExecOther,'Describe the "Other" directive.')
      +dirs)}
    ${planQ('E','The assistive devices needed by the Ward (devices needed but not currently owned) are:',
      planCheckGroup('',
        cb('needsDentures','Dentures')
        +cb('needsHearingAid','Hearing Aid')
        +cb('needsWheelchair','Wheelchair')
        +cb('needsWalker','Walker/Cane')
        +cb('needsCrutches','Crutches')
        +cb('needsProsthetics','Prosthetics')
        +cb('needsGlasses','Glasses')
        +cb('needsNone','None')
        +cb('needsOther','Other'),
        'needsExplain',d.needsExplain,d.needsOther))}
    ${planQ('F','Are the recommendations of the examining committee incorporated into this plan?',
      yesNoCheckboxS('committeeIncorporated','',d.committeeIncorporated)
      +(d.committeeIncorporated==='No'?`<div class="plan-conditional mt-2">${txtP('committeeExplain','Explanation',d.committeeExplain,3)}</div>`:''))}
    ${renderScheduleDocsSection('planIDirectives')}
    ${pageNavS('/p7','/p9')}
  </div>`;
}

function pagePlanISignatures(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const g=(i,title)=>{
    const gd=(d.planGuardians||[])[i]||{};
    const set=f=>`D.planGuardians[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="plan-sig-block">
      <h3>${title}</h3>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Name</label><input type="text" class="form-control" value="${esc(gd.name||'')}" oninput="this.value=formatName(this.value);${set('name')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship to Ward</label><input type="text" class="form-control" value="${esc(gd.relationship||'')}" oninput="${set('relationship')}"></div>
        <div class="col-md-4"><label class="form-label">SSN/EIN</label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(gd.ssn||'')}" oninput="${set('ssn')}"><button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(gd.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
        <div class="col-md-4"><label class="form-label">Date Signed</label><input type="date" class="form-control" value="${esc(gd.signatureDate||'')}" oninput="${set('signatureDate')}"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(gd.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-6"><label class="form-label">City/State/Zip</label><input type="text" class="form-control" value="${esc(gd.cityStateZip||'')}" oninput="${set('cityStateZip')}"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian(s)</h1>
    <div class="schedule-instructions">If the Ward's ability to exercise rights has changed since the Order Determining Capacity and Appointing Guardian, the guardian must file a Petition to Remove or Petition to Restore Rights, as appropriate.</div>
    ${planCheckGroup('Check all that apply:',
      cb('certIncapacitatedNoCopy','The Ward was declared totally incapacitated and has not been given a copy of this plan')
      +cb('certMinorNoCopy','The Ward is a minor under the age of 14 and has not been given a copy of this plan')
      +cb('certConsulted',"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward")
      +cb('certRecognizeRights','In exercising his or her powers, the guardian shall recognize any rights retained by the ward (F.S. 744.363(6))')
      +cb('certNoRestriction','The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease')
      +cb('certProvidesCare',"The plan provides for the Ward's medical care and mental health treatment"),
      null,null,false)}
    <p style="font-size:.85rem;color:var(--ink-3);margin:.5rem 0 1rem;">Under penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.</p>
    ${g(0,'Guardian')}
    ${g(1,'Co-Guardian')}
    ${g(2,'Co-Guardian')}
    ${g(3,'Co-Guardian')}
    <div class="schedule-instructions mt-2">All guardians of the person must sign and provide their most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.</div>
    ${renderScheduleDocsSection('planISignatures')}
    ${pageNavS('/p8','/p10')}
  </div>`;
}

function pagePlanIAttorney(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian's Attorney</h1>
    <div class="schedule-instructions">The undersigned notifies the Court of the filing of the initial guardianship plan for the stated period. This is the representation of the guardian; the attorney has not audited the accompanying plan, but represents that they have examined its contents and that it conforms to the requirements of Florida Guardianship Law and the standards for plans in the selected county.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('attorney_name','Attorney Name',d.attorney_name)}</div>
      <div class="col-md-6">${inpS('attorney_bar','Attorney Bar Number',d.attorney_bar)}</div>
      <div class="col-12">${inpS('attorney_street','Attorney Address',d.attorney_street)}</div>
      <div class="col-md-8">${inpS('attorney_cityStateZip','Attorney City/State/Zip',d.attorney_cityStateZip)}</div>
      <div class="col-md-4">${inpS('attorney_phone','Attorney Phone Number',d.attorney_phone)}</div>
      <div class="col-md-6">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,false,'date')}</div>
    </div>
    ${renderScheduleDocsSection('planIAttorney')}
    ${pageNavS('/p9','/print')}
  </div>`;
}

function validatePlanInitial(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined||v===false)errs.push(label);};
  req(d.wardName,'Cover — Name of Ward is required');
  req(d.caseNumber,'Cover — Case Number is required');
  req(d.county,'Cover — County is required');
  req(d.inceptionDate,'Cover — Guardianship Inception Date is required');
  req(d.lettersSignedDate,'Cover — Date Letters Were Signed is required');
  req(d.guardianNames,'Cover — Guardian Name(s) is required');
  req(d.wardLiving,'Cover — Where the ward is living is required');
  req(d.residenceAddress,'Cover — Address where ward resides is required');
  req(d.residenceCityStateZip,'Cover — City/State/ZIP is required');

  req(d.q2Setting,'2–3. Setting & Medical Care — Best-suited residential setting is required');
  if(d.q2Setting==='Other')req(d.q2Explain,'2–3. Setting & Medical Care — Explanation for "Other" residential setting is required');
  const anyMed=d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther;
  if(!anyMed)errs.push('2–3. Setting & Medical Care — At least one medical service option is required');
  if(d.q3MedSpecialist)req(d.q3MedSpecialistArea,'2–3. Setting & Medical Care — Specialist area of specialty is required');
  if(d.q3MedOther)req(d.q3MedExplain,'2–3. Setting & Medical Care — Explanation for "Other" medical service is required');

  req(d.q4Mental,'4–5. Mental Health & Personal Care — Mental health service provision is required');
  if(d.q4Mental==='Other'||d.q4Mental==='None')req(d.q4Explain,'4–5. Mental Health & Personal Care — Explanation is required');
  req(d.q5Personal,'4–5. Mental Health & Personal Care — Personal care provision is required');
  if(d.q5Personal==='Other')req(d.q5Explain,'4–5. Mental Health & Personal Care — Explanation for "Other" personal care is required');

  const anySocial=d.q6CareFacility||d.q6NursesAides||d.q6FamilyFriends||d.q6DayProgram||d.q6WardDecides||d.q6Other;
  if(!anySocial)errs.push('6–7. Socialization & Benefits — At least one socialization/recreation option is required');
  if(d.q6Other)req(d.q6Explain,'6–7. Socialization & Benefits — Explanation for "Other" socialization is required');
  if(d.q7Trusts||d.q7PendingBenefits||d.q7Other)req(d.q7Explain,'6–7. Socialization & Benefits — Explanation is required for Trusts, Pending Benefits, or Other');

  (d.q9Providers||[]).forEach((r,i)=>{
    if(r&&(r.providerType||r.examDate||r.street||r.cityStateZip||r.phone)&&!r.name)
      errs.push(`9. Examining Providers — Row ${i+1}: Provider name is required`);
  });

  const missingAdls=INITIAL_ADLS.filter(([k])=>!d.adls||!d.adls[k]).length;
  if(missingAdls>0)errs.push(`10A. Daily Living — ${missingAdls} of ${INITIAL_ADLS.length} activities not yet rated`);

  const anyMental=d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther;
  if(!anyMental)errs.push('10B–D. Disabilities & Devices — At least one mental disability option is required (or note none apply)');
  if(d.mentalOther)req(d.mentalExplain,'10B–D. Disabilities & Devices — Explanation for "Other" mental disability is required');
  const anyPhys=d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther;
  if(!anyPhys)errs.push('10B–D. Disabilities & Devices — At least one physical disability option is required (or note none apply)');
  if(d.physOther)req(d.physExplain,'10B–D. Disabilities & Devices — Explanation for "Other" physical disability is required');
  const anyUses=d.usesDentures||d.usesHearingAid||d.usesWheelchair||d.usesWalker||d.usesCrutches||d.usesProsthetics||d.usesGlasses||d.usesNone||d.usesOther;
  if(!anyUses)errs.push('10B–D. Disabilities & Devices — Assistive devices currently used is required (or select None)');
  if(d.usesOther)req(d.usesExplain,'10B–D. Disabilities & Devices — Explanation for "Other" device currently used is required');

  if(!!d.q11NoDirectives===!!d.q11Executed)errs.push('11. Advance Directives — Select exactly one: no pre-existing directives, or directives were executed');
  if(d.q11ExecOther)req(d.q11ExecOtherText,'11. Advance Directives — Description of "Other" advance directive is required');
  const anyNeeds=d.needsDentures||d.needsHearingAid||d.needsWheelchair||d.needsWalker||d.needsCrutches||d.needsProsthetics||d.needsGlasses||d.needsNone||d.needsOther;
  if(!anyNeeds)errs.push('11. Advance Directives — Assistive devices needed is required (or select None)');
  if(d.needsOther)req(d.needsExplain,'11. Advance Directives — Explanation for "Other" device needed is required');
  req(d.committeeIncorporated,'11. Advance Directives — Whether examining-committee recommendations are incorporated is required');
  if(d.committeeIncorporated==='No')req(d.committeeExplain,'11. Advance Directives — Explanation is required when recommendations are not incorporated');

  const anyCert=d.certIncapacitatedNoCopy||d.certMinorNoCopy||d.certConsulted||d.certRecognizeRights||d.certNoRestriction||d.certProvidesCare;
  if(!anyCert)errs.push('Signatures — At least one certification statement must be checked');
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Signatures — Guardian name is required');
  req(g0.signatureDate,'Signatures — Guardian signature date is required');

  req(d.attorney_name,'Attorney Certification — Attorney name is required');
  req(d.attorney_signatureDate,'Attorney Certification — Attorney signature date is required');

  return errs;
}

function buildNavPlanMinor(container){
  const item=(route,nav,label)=>`<button class="nav-link-item" data-page="${route}" data-nav="${nav}" onclick="navigate('${route}')">${label}</button>`;
  container.innerHTML=`
    <div class="nav-section">
      <div class="nav-section-label">Annual Plan — Minors</div>
      ${item('/','pm-cover','Cover')}
      ${item('/p2','pm-p2','2&nbsp;&nbsp;Prior Residences')}
      ${item('/p3','pm-p3','3&nbsp;&nbsp;Treatment Providers')}
      ${item('/p4','pm-p4','4&nbsp;&nbsp;Medical Services')}
      ${item('/p5','pm-p5','5&nbsp;&nbsp;Education &amp; Social Development')}
      ${item('/p6','pm-p6','Guardian Signatures')}
      ${item('/p7','pm-p7','Preparer &amp; Attorney')}
    </div>
    <div class="nav-section">
      <div class="nav-section-label">Output</div>
      <button class="nav-link-item" data-page="/print" onclick="navigate('/print')"><span class="nav-link-label">${ic('file',15)}&nbsp; Print Preview</span></button>
    </div>
  `;
}

function renderPagePlanMinor(page){
  const el=document.getElementById('main-content');
  switch(page){
    case '/':      el.innerHTML=pagePlanMCover();break;
    case '/p2':    el.innerHTML=pagePlanMResidences();break;
    case '/p3':    el.innerHTML=pagePlanMProviders();break;
    case '/p4':    el.innerHTML=pagePlanMMedical();break;
    case '/p5':    el.innerHTML=pagePlanMEducation();break;
    case '/p6':    el.innerHTML=pagePlanMSignatures();break;
    case '/p7':    el.innerHTML=pagePlanMPreparerAttorney();break;
    case '/print': el.innerHTML=pagePrintPlanMinor();break;
    default:       el.innerHTML=pagePlanMCover();
  }
  el.scrollTop=0;
}

function pagePlanMCover(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Annual Plan — Minors — Cover</h1>
    <div class="schedule-instructions">This is the Annual Guardianship Plan used when the ward is a <strong>minor</strong>. It has no rights-restoration table or ADL ratings — instead it covers residence, medical care, and the minor's education and social development.</div>
    <div class="row g-3">
      <div class="col-md-8">${inpS('wardName',"Minor's Name",d.wardName,true)}</div>
      <div class="col-md-4">${countyInputS('county','County',d.county,true)}</div>
      <div class="col-md-6">${inpS('ucn','UCN',d.ucn)}</div>
      <div class="col-md-6">${inpS('ref','REF #',d.ref)}</div>
      <div class="col-md-6">${inpS('periodFrom','For the Period From',d.periodFrom,true,'date')}</div>
      <div class="col-md-6">${inpS('periodTo','To',d.periodTo,true,'date')}</div>
      <div class="col-md-6">${inpS('guardianName','Guardian Name(s)',d.guardianName,true)}</div>
    </div>
    <div class="row g-3 mt-1">
      <div class="col-md-4">${yesNoCheckboxS('amendedForm','Amended Form?',d.amendedForm)}</div>
      <div class="col-md-4">${d.amendedForm==='Yes'?radioP('amendedVersion','Version',d.amendedVersion,['1st','2nd','3rd']):''}</div>
    </div>
    <div class="row g-3">
      <div class="col-md-6">${yesNoCheckboxS('professionalGuardian','Professional Guardian?',d.professionalGuardian)}</div>
      <div class="col-md-6">${yesNoCheckboxS('publicGuardian','Public Guardian?',d.publicGuardian)}</div>
    </div>
    <h2 class="subsection-heading mt-4">1. Where the Minor Presently Resides</h2>
    <div class="row g-3">
      <div class="col-md-6">${inpS('q1ResidenceName','Residence Name',d.q1ResidenceName,true)}</div>
      <div class="col-md-6">${inpS('q1Street','Street Address',d.q1Street,true)}</div>
      <div class="col-md-5">${inpS('q1City','City',d.q1City)}</div>
      <div class="col-md-3">${inpS('q1State','State',d.q1State)}</div>
      <div class="col-md-4">${inpS('q1Zip','Zip',d.q1Zip)}</div>
      <div class="col-md-6">${inpS('q1Phone','Phone Number',d.q1Phone)}</div>
    </div>
    ${renderScheduleDocsSection('planMCover')}
    ${pageNavS(null,'/p2')}
  </div>`;
}

function pagePlanMResidences(){
  const d=window.D;
  const rows=(d.q2Residences||[]).map((r,i)=>{
    const set=f=>`D.q2Residences[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Residence ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q2Residences',${i},'/p2')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q2Residences',${i},'/p2')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6"><label class="form-label">Residence Name</label><input type="text" class="form-control" value="${esc(r.name||'')}" oninput="${set('name')}"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-5"><label class="form-label">City</label><input type="text" class="form-control" value="${esc(r.city||'')}" oninput="${set('city')}"></div>
        <div class="col-md-3"><label class="form-label">State</label><input type="text" class="form-control" value="${esc(r.state||'')}" oninput="${set('state')}"></div>
        <div class="col-md-4"><label class="form-label">Zip</label><input type="text" class="form-control" value="${esc(r.zip||'')}" oninput="${set('zip')}"></div>
        <div class="col-md-6"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>2. Residences During the Preceding 12 Months</h1>
    <div class="schedule-instructions">List every place the minor resided during the prior 12 months, if different from the current residence on the cover page. Leave blank if the minor has not moved.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No prior residences listed.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q2Residences','minorResidence','/p2')">+ Add Residence</button>
    ${renderScheduleDocsSection('planMResidences')}
    ${pageNavS('/','/p3')}
  </div>`;
}

function pagePlanMProviders(){
  const d=window.D;
  const rows=(d.q3Providers||[]).map((r,i)=>{
    const set=f=>`D.q3Providers[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Provider ${i+1}
        <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this row below" onclick="duplicatePlanRow('q3Providers',${i},'/p3')">${ic('copy',13)}</button>
        <button class="btn btn-sm btn-outline-danger" onclick="removePlanRow('q3Providers',${i},'/p3')">×</button>
      </div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4"><label class="form-label">First Name</label><input type="text" class="form-control" value="${esc(r.first||'')}" oninput="${set('first')}"></div>
        <div class="col-md-2"><label class="form-label">MI</label><input type="text" class="form-control" value="${esc(r.mi||'')}" oninput="${set('mi')}"></div>
        <div class="col-md-6"><label class="form-label">Last Name<span class="req">*</span></label><input type="text" class="form-control" value="${esc(r.last||'')}" oninput="${set('last')}"></div>
        <div class="col-md-6"><label class="form-label">Type of Provider</label><input type="text" class="form-control" placeholder="e.g. Primary Care Physician" value="${esc(r.providerType||'')}" oninput="${set('providerType')}"></div>
        <div class="col-md-6"><label class="form-label">Number of Visits</label><input type="text" class="form-control" value="${esc(r.visits||'')}" oninput="${set('visits')}"></div>
        <div class="col-md-6"><label class="form-label">Street Address</label><input type="text" class="form-control" value="${esc(r.street||'')}" oninput="${set('street')}"></div>
        <div class="col-md-3"><label class="form-label">City</label><input type="text" class="form-control" value="${esc(r.city||'')}" oninput="${set('city')}"></div>
        <div class="col-md-2"><label class="form-label">State</label><input type="text" class="form-control" value="${esc(r.state||'')}" oninput="${set('state')}"></div>
        <div class="col-md-3"><label class="form-label">Zip</label><input type="text" class="form-control" value="${esc(r.zip||'')}" oninput="${set('zip')}"></div>
        <div class="col-md-4"><label class="form-label">Phone Number</label><input type="text" class="form-control" value="${esc(r.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
      </div></div>
    </div>`;
  }).join('');
  return `<div class="schedule-page">
    <h1>3. Medical &amp; Mental Health Treatment Providers</h1>
    <div class="schedule-instructions">Every provider who treated the minor during the preceding 12 months.</div>
    ${rows||`<div class="schedule-empty">${ic('folder',17)}<span>No providers listed yet.</span></div>`}
    <button class="btn btn-outline-primary btn-sm mb-2" onclick="addPlanRow('q3Providers','minorProvider','/p3')">+ Add Provider</button>
    ${renderScheduleDocsSection('planMProviders')}
    ${pageNavS('/p2','/p4')}
  </div>`;
}

function pagePlanMMedical(){
  const d=window.D;
  const freq=(id,val)=>radioP(id,'Frequency',val,['Weekly','Monthly','Annually']);
  return `<div class="schedule-page">
    <h1>4. Provision of Medical Services</h1>
    <div class="schedule-instructions">For the plan period, the guardian proposes the following as to the provision of medical services for the Minor.</div>
    <div class="plan-check-grid">
      ${chkP('q4Primary','Routine examination by primary care physician',d.q4Primary)}
    </div>
    ${d.q4Primary?freq('q4PrimaryFreq',d.q4PrimaryFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4Dentist','Routine examination by dentist',d.q4Dentist)}
    </div>
    ${d.q4Dentist?freq('q4DentistFreq',d.q4DentistFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4Specialist','Routine examination by specialist',d.q4Specialist)}
    </div>
    ${d.q4Specialist?freq('q4SpecialistFreq',d.q4SpecialistFreq):''}
    <div class="plan-check-grid mt-2">
      ${chkP('q4PT','Physical Therapy',d.q4PT)}
      ${chkP('q4ST','Speech Therapy',d.q4ST)}
      ${chkP('q4OT','Occupational Therapy',d.q4OT)}
      ${chkP('q4MinorDecides','The Minor retains the right to make his or her own decision',d.q4MinorDecides)}
      ${chkP('q4Other','Other',d.q4Other)}
    </div>
    ${d.q4Other?`<div class="plan-conditional mt-2">${txtP('q4Explain','Explanation (required if "Other" checked)',d.q4Explain,3)}</div>`:''}
    ${renderScheduleDocsSection('planMMedical')}
    ${pageNavS('/p3','/p5')}
  </div>`;
}

function pagePlanMEducation(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  return `<div class="schedule-page">
    <h1>5. Education &amp; Social Development</h1>
    ${txtP('q5SchoolProgress',"A. Summary of the Minor's school progress report",d.q5SchoolProgress,4)}
    ${txtP('q5SocialDevelopment',"B. Description of the social development of the Minor",d.q5SocialDevelopment,4)}
    ${txtP('q5Communicates',"C. Statement of how well the Minor communicates with others",d.q5Communicates,4)}
    ${txtP('q5Interpersonal',"D. Statement of how well the Minor maintains interpersonal relationships",d.q5Interpersonal,4)}
    ${planQ('E','Description of the unmet social needs of the Minor:',
      planCheckGroup('',
        cb('q5NoUnmetNeeds','No Unmet Needs')
        +cb('q5DoesNotCareToSocialize','The Minor does not care to socialize')
        +cb('q5UnmetNeeds','Unmet Needs')
        +cb('q5Other','Other'),
        'q5Explain',d.q5Explain,d.q5Other))}
    ${renderScheduleDocsSection('planMEducation')}
    ${pageNavS('/p4','/p6')}
  </div>`;
}

function pagePlanMSignatures(){
  const d=window.D;
  const cb=(id,label)=>chkP(id,label,d[id]);
  const g=(i,title)=>{
    const gd=(d.planGuardians||[])[i]||{};
    const set=f=>`D.planGuardians[${i}].${f}=this.value;autoSave();updateNavDots()`;
    return `<div class="plan-sig-block">
      <h3>${title}</h3>
      <div class="row g-2">
        <div class="col-md-6"><label class="form-label">Name</label><input type="text" class="form-control" value="${esc(gd.name||'')}" oninput="this.value=formatName(this.value);${set('name')}"></div>
        <div class="col-md-6"><label class="form-label">Relationship to Ward</label><input type="text" class="form-control" value="${esc(gd.relationship||'')}" oninput="${set('relationship')}"></div>
        <div class="col-md-4"><label class="form-label">Taxpayer ID #</label><div class="ssn-mask-wrap"><input type="password" autocomplete="off" class="form-control" value="${esc(gd.tin||'')}" oninput="${set('tin')}"><button type="button" class="ssn-reveal-btn" aria-label="Show Taxpayer ID" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div></div>
        <div class="col-md-4"><label class="form-label">Telephone #</label><input type="text" class="form-control" value="${esc(gd.phone||'')}" oninput="this.value=formatPhone(this.value);${set('phone')}"></div>
        <div class="col-md-4"><label class="form-label">Date Signed</label><input type="date" class="form-control" value="${esc(gd.signatureDate||'')}" oninput="${set('signatureDate')}"></div>
        <div class="col-md-6"><label class="form-label">Mailing Address</label><input type="text" class="form-control" value="${esc(gd.mailingStreet||'')}" oninput="${set('mailingStreet')}"></div>
        <div class="col-md-6"><label class="form-label">City/State/Zip</label><input type="text" class="form-control" value="${esc(gd.mailingCityStateZip||'')}" oninput="${set('mailingCityStateZip')}"></div>
        <div class="col-md-6"><label class="form-label">Email Address</label><input type="email" class="form-control" value="${esc(gd.email||'')}" oninput="${set('email')}"></div>
      </div>
    </div>`;
  };
  return `<div class="schedule-page">
    <h1>Certification and Signature of Guardian(s)</h1>
    ${planCheckGroup('Check all that apply:',
      cb('certIncapacitated','The Ward was declared totally incapacitated.')
      +cb('certMinor','The Ward is a minor.')
      +cb('certConsulted',"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward.")
      +cb('certNoRestriction',"The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.")
      +cb('certProvidesCare',"The plan provides for the Ward's medical care and mental health treatment.")
      +cb('certPhysicianAttached',"The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached."),
      null,null,false)}
    <p style="font-size:.85rem;color:var(--ink-3);margin:.5rem 0 1rem;">Under penalties of perjury, each signing guardian declares they have read and examined the foregoing plan, and the facts alleged are true, to the best of their knowledge and belief.</p>
    ${g(0,'Guardian')}
    ${g(1,'Co-Guardian')}
    ${renderScheduleDocsSection('planMSignatures')}
    ${pageNavS('/p5','/p7')}
  </div>`;
}

function pagePlanMPreparerAttorney(){
  const d=window.D;
  return `<div class="schedule-page">
    <h1>Certification of Preparer &amp; Attorney</h1>
    <h2 class="subsection-heading">Certification and Signature of Preparer</h2>
    <div class="schedule-instructions">The preparation of this form is based upon the information provided by the guardian(s) and/or attorney with no independent verification. The preparer has not audited or reviewed the guardianship plan or supporting documents.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('preparer_name','Preparer Name',d.preparer_name,true)}</div>
      <div class="col-md-6">${inpS('preparer_tin','Preparer Taxpayer ID #',d.preparer_tin)}</div>
      <div class="col-md-6">${inpS('preparer_phone','Preparer Telephone #',d.preparer_phone)}</div>
      <div class="col-md-6">${inpS('preparer_signatureDate','Date Signed',d.preparer_signatureDate,false,'date')}</div>
      <div class="col-12">${inpS('preparer_mailingStreet','Preparer Mailing Address',d.preparer_mailingStreet)}</div>
      <div class="col-md-8">${inpS('preparer_cityStateZip','Preparer City / State / Zip',d.preparer_cityStateZip)}</div>
      <div class="col-md-4">${inpS('preparer_email','Preparer Email Address',d.preparer_email)}</div>
    </div>
    <h2 class="subsection-heading mt-4">Certification and Signature of Guardian's Attorney</h2>
    <div class="schedule-instructions">The undersigned notifies the Court of the filing of this plan. This is the representation of the guardian; the attorney has not audited the accompanying plan, but represents that they have examined its contents and that it conforms to the requirements of Florida Guardianship Law.</div>
    <div class="row g-3">
      <div class="col-md-6">${inpS('attorney_name','Attorney Name',d.attorney_name,true)}</div>
      <div class="col-md-6">${inpS('attorney_bar','Attorney Florida Bar Number',d.attorney_bar)}</div>
      <div class="col-12">${inpS('attorney_street','Attorney Mailing Address',d.attorney_street)}</div>
      <div class="col-md-6">${inpS('attorney_cityStateZip','Attorney City / State / Zip',d.attorney_cityStateZip)}</div>
      <div class="col-md-3">${inpS('attorney_phone','Attorney Telephone #',d.attorney_phone)}</div>
      <div class="col-md-3">${inpS('attorney_signatureDate','Date Signed',d.attorney_signatureDate,true,'date')}</div>
      <div class="col-12">${inpS('attorney_email',"Guardian's Attorney Email Address",d.attorney_email)}</div>
    </div>
    ${renderScheduleDocsSection('planMPreparerAttorney')}
    ${pageNavS('/p6','/print')}
  </div>`;
}

function validatePlanMinor(){
  const d=window.D;
  const errs=[];
  const req=(v,label)=>{if(v===''||v===null||v===undefined||v===false)errs.push(label);};
  req(d.wardName,"Cover — Minor's Name is required");
  req(d.county,'Cover — County is required');
  req(d.periodFrom,'Cover — Reporting Period From is required');
  req(d.periodTo,'Cover — Reporting Period To is required');
  req(d.guardianName,'Cover — Guardian Name(s) is required');
  req(d.q1ResidenceName,'Cover — Current Residence Name is required');
  req(d.q1Street,'Cover — Current Residence Street Address is required');
  if(d.amendedForm==='Yes')req(d.amendedVersion,'Cover — Amended Form version is required');

  (d.q3Providers||[]).forEach((r,i)=>{
    if(r&&(r.first||r.providerType||r.street||r.city||r.phone)&&!r.last)
      errs.push(`3. Treatment Providers — Row ${i+1}: Provider last name is required`);
  });

  const anyMed=d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other;
  if(!anyMed)errs.push('4. Medical Services — At least one medical service option is required');
  if(d.q4Other)req(d.q4Explain,'4. Medical Services — Explanation for "Other" is required');

  req(d.q5SchoolProgress,"5. Education & Social Development — School progress summary is required");
  req(d.q5SocialDevelopment,"5. Education & Social Development — Social development description is required");
  req(d.q5Communicates,"5. Education & Social Development — Communication statement is required");
  req(d.q5Interpersonal,"5. Education & Social Development — Interpersonal relationships statement is required");
  const anyUnmet=d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other;
  if(!anyUnmet)errs.push('5. Education & Social Development — Unmet social needs option is required');
  if(d.q5Other)req(d.q5Explain,'5. Education & Social Development — Explanation for "Other" unmet needs is required');

  const anyCert=d.certIncapacitated||d.certMinor||d.certConsulted||d.certNoRestriction||d.certProvidesCare||d.certPhysicianAttached;
  if(!anyCert)errs.push('Guardian Signatures — At least one certification statement must be checked');
  const g0=(d.planGuardians||[])[0]||{};
  req(g0.name,'Guardian Signatures — Guardian name is required');
  req(g0.signatureDate,'Guardian Signatures — Guardian signature date is required');

  req(d.preparer_name,'Preparer & Attorney — Preparer name is required');
  req(d.attorney_name,'Preparer & Attorney — Attorney name is required');
  req(d.attorney_signatureDate,'Preparer & Attorney — Attorney signature date is required');

  return errs;
}

function docHeaderPlanAnnual(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">ANNUAL GUARDIANSHIP PLAN</div>
    <div class="doc-meta">
      <span>IN RE: GUARDIANSHIP OF <strong>${ward}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanAnnual(){
  const d=window.D;
  const ward=esc(d.wardName||'');
  const caseNo=esc(d.caseNumber||'');
  const H=docHeaderPlanAnnual;
  const y=v=>v?'☒':'☐';
  const line=v=>`<div class="doc-answer">${esc(v||'')||'&nbsp;'}</div>`;
  const fld=(label,val)=>`<div class="doc-field-label">${label}</div><div class="doc-signature-line">${esc(val||'')}</div>`;
  // Only render a checkbox row if it is ticked OR nothing in its group is,
  // so the printed document reads as a set of answers rather than a wall of
  // empty boxes — matching how a completed paper form looks.
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  let html='';

  // ── Page 1: cover ─────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Cover','1')}
  <p style="font-size:.76rem;margin-bottom:.6rem;">Pursuant to F.S. 744.367, this report with original signatures is due within 90 days after the last day of the anniversary month that the letters of guardianship were signed.</p>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Social Security Number</div><div class="td">${esc(d.ssn||'')}</div></div>
    <div class="tr"><div class="td">Guardianship Inception Date</div><div class="td">${fmtDate(d.gid)||''}</div></div>
    <div class="tr"><div class="td">For the period</div><div class="td">${fmtDate(d.periodFrom)||''} through ${fmtDate(d.periodTo)||''}</div></div>
    <div class="tr"><div class="td">Guardian Name(s)</div><div class="td">${esc(d.guardian||'')}</div></div>
    <div class="tr"><div class="td">Attorney Name</div><div class="td">${esc(d.attorney||'')}</div></div>
  </div></div>
  <div class="doc-schedule-title">The Ward Is Living</div>
  ${boxes([
    [d.wardLiving==='In a private residence leased or owned by them','In a private residence leased or owned by them (house, condo, apartment).'],
    [d.wardLiving==='In a private residence not leased or owned by them','In a private residence not leased or owned by them (such as a family member).'],
    [d.wardLiving==='In a facility (skilled nursing, assisted living, etc.)','In a facility (skilled nursing, assisted living, etc.).'],
  ])}
  <div class="doc-schedule-title">Address Where Ward Currently Resides</div>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Address</div><div class="td">${esc(d.residenceAddress||'')}</div></div>
    <div class="tr"><div class="td">City, State, ZIP</div><div class="td">${esc(d.residenceCityStateZip||'')}</div></div>
    <div class="tr"><div class="td">Phone</div><div class="td">${esc(d.residencePhone||'')}</div></div>
    <div class="tr"><div class="td">Mailing Address (if different)</div><div class="td">${esc(d.mailingAddress||'')}</div></div>
    <div class="tr"><div class="td">Mailing City, State, ZIP</div><div class="td">${esc(d.mailingCityStateZip||'')}</div></div>
  </div></div>
  <p style="font-size:.74rem;margin-top:.6rem;font-style:italic;">Filed separately is the Annual Physician's Report. Together these are the Annual Report of the Guardian of the Person.</p>
  </div>`;

  // ── Page 2: Q1 residences ─────────────────────────────
  const resRows=(d.q1Residences||[]).filter(r=>r&&(r.name||r.street||r.cityStateZip));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 1','2')}
  <div class="doc-schedule-title">1. Places the Ward Has Resided During the Prior 12 Months</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Facility / Residence</th><th>Type</th><th>From</th><th>To</th></tr></thead>
    <tbody>${resRows.length?resRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}${r.cityStateZip?'<br>'+esc(r.cityStateZip):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.facilityType||'')}</td>
      <td>${fmtDate(r.from)||''}</td>
      <td>${fmtDate(r.to)||''}</td></tr>`).join('')
      :'<tr><td colspan="5" style="text-align:center;font-style:italic">No residences listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 3: Q2 + Q3 ───────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 2–3','3')}
  <div class="doc-schedule-title">2. If the Ward's Address Has Changed Since the Last Plan</div>
  ${boxes([
    [d.q2NoMove,'N/A — the ward has not moved since the last plan was filed.'],
    [d.q2WithinCounty,'The move was within this county and a change of address was provided to the court.'],
    [d.q2WithinCircuit,'The move was within this Circuit and notice was provided to the court within 15 days.'],
    [d.q2OutsideApproved,'The move was not within this Circuit and prior court approval was obtained.'],
    [d.q2OutsideVenuePetition,'The move was not within this Circuit and a petition to change venue is filed with this plan.'],
  ])}
  <div class="doc-schedule-title">3. Plan for the Best Welfare of the Ward</div>
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Residential setting best suited to the ward's needs:</p>
  ${boxes([
    [d.q3SettingALF,'Assisted Living (ALF)'],[d.q3SettingGroupHome,'Group Home'],
    [d.q3SettingIntermediate,'Intermediate'],[d.q3SettingPrivate,'Private Residence'],
    [d.q3SettingSkilled,'Skilled Nursing'],[d.q3SettingSpecialized,'Specialized'],
    [d.q3SettingStateHospital,'State Hospital'],[d.q3SettingOther,'Other'],
  ])}
  ${d.q3SettingExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3SettingExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">The guardian will ensure this remains the best setting by:</p>
  ${boxes([
    [d.q3EnsureAssessing,'Periodically assessing needs'],
    [d.q3EnsureWardDecides,'The ward retains the right to decide'],
    [d.q3EnsureNoChange,'No change, unless required by medical condition'],
  ])}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Provision for medical care services:</p>
  ${boxes([
    [d.q3MedPrimary,'Routine examination by primary care physician'],
    [d.q3MedDentist,'Routine examination by dentist'],
    [d.q3MedOphthalmologist,'Routine examination by ophthalmologist'],
    [d.q3MedSpecialist,'Routine examination by specialist'+(d.q3MedSpecialistArea?' — '+d.q3MedSpecialistArea:'')],
    [d.q3MedPhysicalTherapy,'Physical therapy'],[d.q3MedSpeechTherapy,'Speech therapy'],
    [d.q3MedOccupationalTherapy,'Occupational therapy'],
    [d.q3MedWardDecides,'The ward retains the right to make their own decision'],
    [d.q3MedNone,'None'],[d.q3MedOther,'Other'],
  ])}
  ${d.q3MedExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3MedExplain)}</p>`:''}
  </div>`;

  html+=`<div class="doc-page">${H(ward,caseNo,'Question 3 (cont.)','4')}
  <p style="font-size:.76rem;font-weight:650;margin:.2rem 0 .2rem;">Provision for mental health services:</p>
  ${boxes([
    [d.q3MentalPsych,'Routine examination by psychiatrist / psychologist'],
    [d.q3MentalWardDecides,'Ward retains the right to make own decisions'],
    [d.q3MentalOutpatient,'Ongoing treatment — outpatient'],
    [d.q3MentalInpatient,'Ongoing treatment — inpatient'],
    [d.q3MentalNone,'None'],[d.q3MentalOther,'Other'],
  ])}
  ${d.q3MentalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3MentalExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Provision for personal care (bathing, grooming, feeding):</p>
  ${boxes([
    [d.q3PersonalFacility,'Care facility'],[d.q3PersonalNurses,'Nurses and aides'],
    [d.q3PersonalFamily,'Family and friends'],[d.q3PersonalWithout,'Ward does without assistance'],
    [d.q3PersonalNone,'None; ward can provide own personal care'],[d.q3PersonalOther,'Other'],
  ])}
  ${d.q3PersonalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3PersonalExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Provision for socialization and recreational activities:</p>
  ${boxes([
    [d.q3SocialFacility,'Care facility'],[d.q3SocialNurses,'Nurses and aides'],
    [d.q3SocialFamily,'Family and friends'],
    [d.q3SocialWardDecides,'The ward retains the right to make their own decision'],
    [d.q3SocialNone,'None'],[d.q3SocialOther,'Other'],
  ])}
  ${d.q3SocialExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3SocialExplain)}</p>`:''}
  </div>`;

  // ── Page 5: benefits ──────────────────────────────────
  const b=d.benefits||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 3G','5')}
  <div class="doc-schedule-title">3G. Insurance and Benefits</div>
  <p style="font-size:.76rem;margin-bottom:.4rem;">Health and accident insurance and other private or governmental benefits the ward receives toward the cost of medical, mental health or related services.</p>
  <table class="doc-table">
    <thead><tr><th>Benefit</th><th style="width:6rem;text-align:center">Eligible</th><th style="width:7rem;text-align:center">Applied for</th></tr></thead>
    <tbody>${PLAN_BENEFITS.map(([k,label])=>{const v=b[k]||{};
      return `<tr><td>${esc(label)}</td><td style="text-align:center">${y(v.eligible)}</td><td style="text-align:center">${y(v.appliedFor)}</td></tr>`;}).join('')}
    </tbody>
  </table>
  ${boxes([[d.q3BenefitsNone,'None of the above'],[d.q3BenefitsOther,'Other']])}
  ${d.q3BenefitsExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3BenefitsExplain)}</p>`:''}
  </div>`;

  // ── Page 6: Q4 providers ──────────────────────────────
  const provRows=(d.q4Providers||[]).filter(r=>r&&(r.name||r.providerType||r.visits));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 4','6')}
  <div class="doc-schedule-title">4. Professional Medical Treatment During the Prior 12 Months</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Provider</th><th>Type</th><th style="width:5rem">Visits</th></tr></thead>
    <tbody>${provRows.length?provRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}${r.cityStateZip?'<br>'+esc(r.cityStateZip):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.providerType||'')}</td>
      <td>${esc(r.visits||'')}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No providers listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 7: Q5–Q7 ─────────────────────────────────────
  const rights=d.rights||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 5–7','7')}
  <div class="doc-schedule-title">5. Social Skills, Abilities and Activities</div>
  <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Social skills and abilities of the ward:</p>
  ${line(d.q5SocialSkills)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Activities undertaken to increase the ward's capacity, and their effectiveness:</p>
  ${line(d.q5Activities)}
  <div class="doc-schedule-title">6. Rights Assessment</div>
  <table class="doc-table">
    <thead><tr><th>Right</th>${PLAN_RIGHT_STATES.map(s=>`<th style="width:7rem;text-align:center">${esc(s)}</th>`).join('')}</tr></thead>
    <tbody>${PLAN_RIGHTS.map(([k,label])=>`<tr><td>${esc(label)}</td>${PLAN_RIGHT_STATES.map(s=>`<td style="text-align:center">${y(rights[k]===s)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <div class="doc-schedule-title">7. Disagreement With the Physician's Report</div>
  ${line(d.q7RightsExplain)}
  </div>`;

  // ── Page 8: Q8 ADLs ───────────────────────────────────
  const adls=d.adls||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 8','8')}
  <div class="doc-schedule-title">8. Activities of Daily Living</div>
  <table class="doc-table">
    <thead><tr><th>Activity</th><th style="width:14rem">Rating</th></tr></thead>
    <tbody>${PLAN_ADLS.map(([k,label])=>`<tr><td>${esc(label)}</td><td>${esc(adls[k]||'')}</td></tr>`).join('')}</tbody>
  </table>
  </div>`;

  // ── Page 9: Q9 disabilities ───────────────────────────
  const devRows=(pfx)=>boxes([
    [d[pfx+'Dentures'],'Dentures'],[d[pfx+'HearingAid'],'Hearing aid'],
    [d[pfx+'Wheelchair'],'Wheelchair'],[d[pfx+'Walker'],'Walker / cane'],
    [d[pfx+'Crutches'],'Crutches'],[d[pfx+'Prosthetics'],'Prosthetics'],
    [d[pfx+'Glasses'],'Glasses'],[d[pfx+'None'],'None'],[d[pfx+'Other'],'Other'],
  ]);
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 9','9')}
  <div class="doc-schedule-title">9. Disabilities and Assistive Devices</div>
  <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Mental disabilities of the ward:</p>
  ${boxes([
    [d.q9MentalDementia,'Dementia'],[d.q9MentalAlzheimers,"Alzheimer's type of dementia"],
    [d.q9MentalAutism,'Autism spectrum disorders'],[d.q9MentalHeadInjury,'Closed head injury'],
    [d.q9MentalDevelopmental,'Developmental disabilities'],[d.q9MentalIntellectual,'Intellectual disability'],
    [d.q9MentalSchizophrenia,'Schizophrenia or related disorders'],[d.q9MentalDepression,'Depression'],
    [d.q9MentalSubstance,'Induced by substance abuse'],
    [d.q9MentalNone,'Ward has no mental disabilities'],[d.q9MentalOther,'Other'],
  ])}
  ${d.q9MentalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9MentalExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Physical disabilities of the ward:</p>
  ${boxes([
    [d.q9PhysMobility,'Mobility'],[d.q9PhysBlindness,'Blindness'],
    [d.q9PhysDeafness,'Deafness'],[d.q9PhysDiabetic,'Diabetic'],
    [d.q9PhysParkinsons,"Parkinson's disease"],[d.q9PhysArthritis,'Severe arthritis'],
    [d.q9PhysNone,'Ward has no physical disabilities'],[d.q9PhysOther,'Other'],
  ])}
  ${d.q9PhysExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9PhysExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Assistive devices currently used:</p>
  ${devRows('q9Uses')}
  ${d.q9UsesExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9UsesExplain)}</p>`:''}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">Assistive devices needed but not yet obtained:</p>
  ${devRows('q9Needs')}
  ${d.q9NeedsExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q9NeedsExplain)}</p>`:''}
  </div>`;

  // ── Page 10: Q10 directives ───────────────────────────
  const dirs=(d.q10Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 10','10')}
  <div class="doc-schedule-title">10. Advance Directives</div>
  ${boxes([[d.q10NoDirectives,'There are NO pre-existing DNR orders or other advance directives.']])}
  ${d.q10NoDirectives?`<p style="font-size:.76rem;font-weight:650;margin:.4rem 0 .2rem;">Steps taken to verify:</p>${boxes([
    [d.q10StepResidence,"Search of ward's prior and current residence"],
    [d.q10StepSafeDeposit,"Inventory of ward's safe deposit box"],
    [d.q10StepInterviewed,'Interviewed family and friends'],
    [d.q10StepMedicalProviders,"Requested documents from the ward's medical providers"],
    [d.q10StepAttorney,"Requested documents from the ward's attorney"],
  ])}`:''}
  ${boxes([[d.q10Executed,'The ward executed the following advance directives:']])}
  ${d.q10Executed?boxes([
    [d.q10ExecDNR,'Order Not to Resuscitate (DNR), F.S. 401.45(3)'],
    [d.q10ExecHealthcare,'Advance Directive for Healthcare (surrogate, living will, anatomical gift)'],
    [d.q10ExecPOA,'Durable Power of Attorney, F.S. Chapter 709'],
    [d.q10ExecOther,'Other'+(d.q10ExecOtherText?' — '+d.q10ExecOtherText:'')],
  ]):''}
  ${dirs.map((r,i)=>`<div class="doc-section-block" style="margin-top:.6rem">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Directive ${i+1}</p>
    <div class="doc-table-div"><div class="tbl">
      <div class="tr"><div class="td">Title of order or directive</div><div class="td">${esc(r.title||'')}</div></div>
      <div class="tr"><div class="td">Date executed / signed</div><div class="td">${fmtDate(r.dateSigned)||''}</div></div>
      <div class="tr"><div class="td">Name of person who signed</div><div class="td">${esc(r.signedBy||'')}</div></div>
      <div class="tr"><div class="td">Designated agent(s) / surrogate(s)</div><div class="td">${esc(r.agents||'')}</div></div>
      <div class="tr"><div class="td">Alternate agent(s) / surrogate(s)</div><div class="td">${esc(r.alternates||'')}</div></div>
      <div class="tr"><div class="td">Relationship to the ward</div><div class="td">${esc(r.relationship||'')}</div></div>
      <div class="tr"><div class="td">Contact information</div><div class="td">${esc(r.contact||'')}</div></div>
      <div class="tr"><div class="td">Suspended or revoked by a court?</div><div class="td">${esc(r.courtRevoked||'')}${r.orderDate?' — '+fmtDate(r.orderDate):''}${r.orderCounty?', '+esc(r.orderCounty):''}</div></div>
    </div></div>
  </div>`).join('')}
  </div>`;

  // ── Page 11: Q11 remuneration ─────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 11','11')}
  <div class="doc-schedule-title">11. Declaration of Remuneration</div>
  <p style="font-size:.75rem;margin-bottom:.5rem;">Each guardian must declare any remuneration from any source for services rendered to or on behalf of the ward. Remuneration means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian. F.S. 744.367(3)(a).</p>
  ${d.q11NoRemuneration
    ? `<p style="font-size:.8rem;">I, <strong>${esc(d.q11NoRemunerationName||'')}</strong>, declare that I have received NO remuneration from any source for services rendered to or on behalf of the ward.</p>`
    : `<p style="font-size:.8rem;">I, <strong>${esc(d.q11ReceivedName||'')}</strong>, declare that I have received the monies <strong>${esc(d.q11Amount||'')}</strong> from <strong>${esc(d.q11From||'')}</strong> for services rendered on behalf of the ward.</p>
       ${boxes([[d.q11SubmittedToCourt,'All requests for reimbursement or fees have been submitted to the court for review and approval.']])}`}
  </div>`;

  // ── Page 12: certification + guardian signatures ──────
  const g=d.planGuardians||[];
  const sigBlock=(p,label)=>`<div class="doc-signature-block">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.3rem;">${label}</p>
    <div class="row">
      <div class="col-6">${fld('Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(p.signatureDate))}</div>
      <div class="col-3">${fld('Printed Name',p.name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('SSN / EIN',p.ssn)}</div>
      <div class="col-4">${fld('Phone Number',p.phone)}</div>
      <div class="col-4">${fld('Email Address',p.email)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Street Address',p.mailingStreet)}</div>
      <div class="col-6">${fld('Mailing City / State / ZIP',p.mailingCityStateZip)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Residence or Office Street Address',p.officeStreet)}</div>
      <div class="col-6">${fld('Residence or Office City / State / ZIP',p.officeCityStateZip)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Relationship to Ward',p.relationship)}</div>
    </div>
  </div>`;
  html+=`<div class="doc-page">${H(ward,caseNo,'Certification','12')}
  <div class="doc-schedule-title">Certification and Signature of Guardian(s)</div>
  ${boxes([
    [d.certIncapacitatedNoCopy,'The ward was declared totally incapacitated and has not been given a copy of this plan.'],
    [d.certMinorNoCopy,'The ward is a minor and has not been given a copy of this plan.'],
    [d.certConsulted,"The guardian has consulted with the ward, to the extent reasonable, has honored the ward's wishes, and to the maximum extent possible the plan is in accordance with them."],
    [d.certNoRestriction,'The plan does not restrict the physical liberty of the ward except as necessary to protect the ward and others from serious physical injury, illness, or disease.'],
    [d.certProvidesMedical,"The plan provides for the ward's medical care and mental health treatment."],
    [d.certPhysicianAttached,"The physician's statement of an examination of the ward no more than 90 days before the beginning of the plan period is attached."],
    [d.certRecognizeRights,'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [F.S. 744.363(6)].'],
  ])}
  ${d.certRightsChangedExplain?`<p style="font-size:.76rem;margin-top:.4rem;"><em>Explanation for no change in rights:</em> ${esc(d.certRightsChangedExplain)}</p>`:''}
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${sigBlock(g[0]||{},'Guardian')}
  </div>`;

  const extras=(g||[]).slice(1).filter(p=>p&&(p.name||p.signatureDate));
  if(extras.length){
    html+=`<div class="doc-page">${H(ward,caseNo,'Certification (cont.)','13')}
    <div class="doc-schedule-title">Additional Guardian Signatures</div>
    ${extras.map((p,i)=>sigBlock(p,`Co-Guardian ${i+2}`)).join('')}
    </div>`;
  }

  // ── Final page: attorney certification ────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Attorney Certification',String(extras.length?14:13))}
  <div class="doc-schedule-title">Certification and Signature of Guardian's Attorney</div>
  <p style="font-size:.76rem;">The undersigned hereby notifies the court of the filing of the annual guardianship plan for the period <strong>${fmtDate(d.periodFrom)||''}</strong> through <strong>${fmtDate(d.periodTo)||''}</strong>.</p>
  <p style="font-size:.76rem;">This annual guardianship plan is the representation of the guardian. I have not audited the accompanying annual plan. The undersigned attorney represents that he/she has examined the contents of the annual guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for plans in ${esc(d.county||'')} County.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Attorney Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.attorney_signatureDate))}</div>
      <div class="col-3">${fld('Attorney Name',d.attorney)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Bar Number',d.attorney_bar)}</div>
      <div class="col-4">${fld('Phone Number',d.attorney_phone)}</div>
      <div class="col-4">${fld('Street Address',d.attorney_street)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('City / State / ZIP',d.attorney_cityStateZip)}</div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Annual Guardianship Plan)</p>
  </div>
  </div>`;

  return html;
}

function pagePrintPlanAnnual(){
  const errors=validatePlanAnnual();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" onclick="doSavePdfPlanAnnual()" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="pvShowAll();window.print()">Print</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="openFloridaCourtPortal()" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container">${buildPrintHTMLPlanAnnual()}</div>
  </div>`;
}

async function doSavePdfPlanAnnual(){
  const errors=validatePlanAnnual();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  pvShowAll();
  document.body.classList.add('pdf-export-mode');
  const container=document.getElementById('print-doc-container');
  const ward=(window.D.wardName||'AnnualGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    await html2pdf().set({
      margin:0,filename:`${ward}_AnnualGuardianshipPlan.pdf`,
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,logging:false},
      jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
      pagebreak:{mode:'avoid-all',before:'.doc-page:not(:first-of-type)'}
    }).from(container).save();
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{
    document.body.classList.remove('pdf-export-mode');
  }
}

function planReadinessChecksInitial(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const provs=(d.q9Providers||[]).filter(r=>r&&r.name);
  const adls=d.adls||{};
  const directives=(d.q11Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
  const auto=[
    {label:'Ward name, case number and county are on the plan',ok:has(d.wardName)&&has(d.caseNumber)&&has(d.county)},
    {label:'Guardianship Inception Date and date Letters were signed are stated',ok:has(d.inceptionDate)&&has(d.lettersSignedDate)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and SSN/EIN provided',ok:has(g0.street)&&has(g0.phone)&&has(g0.ssn)},
    {label:"Ward's current living arrangement and address stated",ok:has(d.wardLiving)&&has(d.residenceAddress)},
    {label:'Question 2 — best-suited residential setting selected',ok:has(d.q2Setting)},
    {label:'Question 3 — medical service provisions selected',ok:!!(d.q3MedPrimary||d.q3MedDentist||d.q3MedOphthalmologist||d.q3MedSpecialist||d.q3MedPT||d.q3MedST||d.q3MedOT||d.q3MedWardDecides||d.q3MedOther)},
    {label:'Question 4 — mental health service provision selected',ok:has(d.q4Mental)},
    {label:'Question 5 — personal care provision selected',ok:has(d.q5Personal)},
    {label:`Question 9 — examining providers listed (${provs.length})`,ok:provs.length>0},
    {label:`Question 10A — all fifteen activities of daily living rated`,ok:INITIAL_ADLS.every(([k])=>has(adls[k]))},
    {label:'Question 10B/C — mental and physical disabilities answered',ok:!!((d.mentalAlzheimers||d.mentalAutism||d.mentalClosedHeadInjury||d.mentalDementia||d.mentalDepression||d.mentalDevelopmental||d.mentalSubstance||d.mentalSchizophrenia||d.mentalOther)&&(d.physMobility||d.physBlindness||d.physDeafness||d.physDiabetic||d.physParkinsons||d.physArthritis||d.physOther))},
    {label:'Question 11 — advance directives answered (none, or executed directives listed)',ok:!!d.q11NoDirectives!==!!d.q11Executed},
    {label:'Question 10F — examining committee recommendation question answered',ok:has(d.committeeIncorporated)},
    {label:'Attorney certification signed and dated',ok:has(d.attorney_name)&&has(d.attorney_signatureDate)},
  ];
  const manual=[
    'File within 60 days after the Letters of Guardianship are signed (F.S. 744.632).',
    'File a separate Disaster Plan alongside this report, per Administrative Order 2019-005.',
    'Serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor under 14 (see the certification checkboxes).',
    'Attach a copy of any pre-existing advance directive described in the Question 1 narrative.',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    'If you are a professional guardian, confirm your OPPG registration is current.',
    'Only reports with original signatures will be audited by the Clerk of Court.',
  ];
  return {auto,manual};
}

function docHeaderPlanInitial(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">INITIAL GUARDIANSHIP PLAN</div>
    <div class="doc-meta">
      <span>IN RE: GUARDIANSHIP OF <strong>${ward}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanInitial(){
  const d=window.D;
  const ward=esc(d.wardName||'');
  const caseNo=esc(d.caseNumber||'');
  const H=docHeaderPlanInitial;
  const y=v=>v?'☒':'☐';
  const line=v=>`<div class="doc-answer">${esc(v||'')||'&nbsp;'}</div>`;
  const fld=(label,val)=>`<div class="doc-field-label">${label}</div><div class="doc-signature-line">${esc(val||'')}</div>`;
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  let html='';

  // ── Page 1: cover ─────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Cover','1')}
  <p style="font-size:.76rem;margin-bottom:.6rem;">Pursuant to F.S. 744.632, this report with original signatures is due within 60 days after the Letters of Guardianship are signed, and remains in effect until amended or replaced by the approval of an Annual Guardianship Plan.</p>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Case Number</div><div class="td">${caseNo}</div></div>
    <div class="tr"><div class="td">Successor Guardianship</div><div class="td">${esc(d.successorGuardianship||'')}</div></div>
    <div class="tr"><div class="td">Guardianship Inception Date</div><div class="td">${fmtDate(d.inceptionDate)||''}</div></div>
    <div class="tr"><div class="td">Date Letters Were Signed</div><div class="td">${fmtDate(d.lettersSignedDate)||''}</div></div>
    <div class="tr"><div class="td">For the period</div><div class="td">${fmtDate(d.periodFrom)||''} through ${fmtDate(d.periodTo)||''}</div></div>
    <div class="tr"><div class="td">Guardian Name(s)</div><div class="td">${esc(d.guardianNames||'')}</div></div>
    <div class="tr"><div class="td">Attorney Name</div><div class="td">${esc(d.attorneyName||'')}</div></div>
  </div></div>
  <div class="doc-schedule-title">The Ward Is Living</div>
  ${boxes([
    [d.wardLiving==='In a private residence leased or owned by them (house, condo or apartment)','In a private residence leased or owned by them (house, condo or apartment).'],
    [d.wardLiving==='In a private residence not leased or owned by them (such as family member)','In a private residence not leased or owned by them (such as family member).'],
    [d.wardLiving==='In a facility (Skilled Nursing, Assisted Living, etc.)','In a facility (Skilled Nursing, Assisted Living, etc.).'],
  ])}
  <div class="doc-schedule-title">Address Where Ward Currently Resides</div>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Address</div><div class="td">${esc(d.residenceAddress||'')}</div></div>
    <div class="tr"><div class="td">City, State, ZIP</div><div class="td">${esc(d.residenceCityStateZip||'')}</div></div>
    <div class="tr"><div class="td">Phone</div><div class="td">${esc(d.residencePhone||'')}</div></div>
    <div class="tr"><div class="td">Mailing Address (if different)</div><div class="td">${esc(d.mailingAddress||'')}</div></div>
    <div class="tr"><div class="td">Mailing City, State, ZIP</div><div class="td">${esc(d.mailingCityStateZip||'')}</div></div>
  </div></div>
  <div class="doc-schedule-title">Pre-existing Orders Not to Resuscitate / Advance Directives</div>
  ${line(d.q1PreexistingDirectives)}
  </div>`;

  // ── Page 2: Q2–Q5 ──────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 2–5','2')}
  <div class="doc-schedule-title">2. Residential Setting Best Suited to the Ward's Needs</div>
  ${boxes([
    [d.q2Setting==='Assisted Living (ALF)','Assisted Living (ALF)'],[d.q2Setting==='Group Home','Group Home'],
    [d.q2Setting==='Intermediate','Intermediate'],[d.q2Setting==='Private Residence','Private Residence'],
    [d.q2Setting==='Skilled Nursing','Skilled Nursing'],[d.q2Setting==='Specialized','Specialized'],
    [d.q2Setting==='State Hospital','State Hospital'],[d.q2Setting==='Other','Other'],
  ])}
  ${d.q2Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q2Explain)}</p>`:''}
  <div class="doc-schedule-title">3. Provision of Medical Services</div>
  ${boxes([
    [d.q3MedPrimary,'Routine examination by primary care physician'],
    [d.q3MedDentist,'Routine examination by dentist'],
    [d.q3MedOphthalmologist,'Routine examination by Ophthalmologist'],
    [d.q3MedSpecialist,'Routine examination by specialist'+(d.q3MedSpecialistArea?' — '+d.q3MedSpecialistArea:'')],
    [d.q3MedPT,'Physical Therapy'],[d.q3MedST,'Speech Therapy'],[d.q3MedOT,'Occupational Therapy'],
    [d.q3MedWardDecides,'The ward retains the right to make their own decision'],
    [d.q3MedOther,'Other'],
  ])}
  ${d.q3MedExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q3MedExplain)}</p>`:''}
  <div class="doc-schedule-title">4. Provision of Mental Health Services</div>
  ${boxes([
    [d.q4Mental==='Routine examination by Psychiatrist/Psychologist','Routine examination by Psychiatrist/Psychologist'],
    [d.q4Mental==='Ongoing Treatment Outpatient','Ongoing Treatment Outpatient'],
    [d.q4Mental==='Ongoing Treatment Inpatient','Ongoing Treatment Inpatient'],
    [d.q4Mental==='None','None'],[d.q4Mental==='Other','Other'],
  ])}
  ${d.q4Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q4Explain)}</p>`:''}
  <div class="doc-schedule-title">5. Provision of Personal Care</div>
  ${boxes([
    [d.q5Personal==='Care Facility','Care Facility'],[d.q5Personal==='Nurses and Aides','Nurses and Aides'],
    [d.q5Personal==='Family and Friends','Family and Friends'],[d.q5Personal==='Other','Other'],
  ])}
  ${d.q5Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q5Explain)}</p>`:''}
  </div>`;

  // ── Page 3: Q6–Q7 ──────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 6–7','3')}
  <div class="doc-schedule-title">6. Socialization / Recreational Services</div>
  ${boxes([
    [d.q6CareFacility,'Care Facility'],[d.q6NursesAides,'Nurses and Aides'],
    [d.q6FamilyFriends,'Family and Friends'],[d.q6DayProgram,'Day Program'],
    [d.q6WardDecides,'The Ward retains the right to make their own decision'],[d.q6Other,'Other'],
  ])}
  ${d.q6Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q6Explain)}</p>`:''}
  <div class="doc-schedule-title">7. Insurance / Governmental Benefits</div>
  ${boxes([
    [d.q7SocialSecurity,'Social Security'],[d.q7Ssdi,'Social Security Disability Income (SSDI)'],
    [d.q7Hmo,'Health Maintenance Organization (HMO)'],[d.q7Ssi,'Supplemental Security Income (SSI)'],
    [d.q7StateSupplement,'Optional State Supplement'],[d.q7InstitutionalCare,'Institutional Care Program'],
    [d.q7SupplementalIns,'Supplemental Insurance'],[d.q7Pension,'Pension'],
    [d.q7Medicare,'Medicare'],[d.q7Medicaid,'Medicaid'],[d.q7Va,'VA'],
    [d.q7Trusts,'Trusts'],[d.q7PendingBenefits,'Pending Benefits'],[d.q7Other,'Other'],
  ])}
  ${d.q7Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q7Explain)}</p>`:''}
  </div>`;

  // ── Page 4: Q9 providers ───────────────────────────────
  const provRows=(d.q9Providers||[]).filter(r=>r&&(r.name||r.providerType||r.examDate));
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 9','4')}
  <div class="doc-schedule-title">9. Examinations to Determine Treatment Needs</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Provider</th><th>Type</th><th style="width:6rem">Exam Date</th></tr></thead>
    <tbody>${provRows.length?provRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}${r.cityStateZip?'<br>'+esc(r.cityStateZip):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.providerType||'')}</td>
      <td>${fmtDate(r.examDate)||''}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No providers listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 5: Q10A ADLs ──────────────────────────────────
  const adls=d.adls||{};
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 10A','5')}
  <div class="doc-schedule-title">10A. Activities of Daily Living</div>
  <table class="doc-table">
    <thead><tr><th>Activity</th><th style="width:14rem">Rating</th></tr></thead>
    <tbody>${INITIAL_ADLS.map(([k,label])=>`<tr><td>${esc(label)}</td><td>${esc(adls[k]||'')}</td></tr>`).join('')}</tbody>
  </table>
  </div>`;

  // ── Page 6: Q10B–D disabilities & current devices ─────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 10B–D','6')}
  <div class="doc-schedule-title">B. Mental Disabilities of the Ward</div>
  ${boxes([
    [d.mentalAlzheimers,"Alzheimer's type of dementia"],[d.mentalAutism,'Autism Spectrum Disorders'],
    [d.mentalClosedHeadInjury,'Closed Head Injury'],[d.mentalDementia,'Dementia'],
    [d.mentalDepression,'Depression'],[d.mentalDevelopmental,'Developmental Disabilities'],
    [d.mentalSubstance,'Induced by substance abuse'],[d.mentalSchizophrenia,'Schizophrenia or related disorders'],
    [d.mentalOther,'Other'],
  ])}
  ${d.mentalExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.mentalExplain)}</p>`:''}
  <div class="doc-schedule-title">C. Physical Disabilities of the Ward</div>
  ${boxes([
    [d.physMobility,'Mobility'],[d.physBlindness,'Blindness'],[d.physDeafness,'Deafness'],
    [d.physDiabetic,'Diabetic'],[d.physParkinsons,"Parkinson's disease"],[d.physArthritis,'Severe arthritis'],
    [d.physOther,'Other'],
  ])}
  ${d.physExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.physExplain)}</p>`:''}
  <div class="doc-schedule-title">D. Assistive Devices Currently Used</div>
  ${boxes([
    [d.usesDentures,'Dentures'],[d.usesHearingAid,'Hearing Aid'],[d.usesWheelchair,'Wheelchair'],
    [d.usesWalker,'Walker/Cane'],[d.usesCrutches,'Crutches'],[d.usesProsthetics,'Prosthetics'],
    [d.usesGlasses,'Glasses'],[d.usesNone,'None'],[d.usesOther,'Other'],
  ])}
  ${d.usesExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.usesExplain)}</p>`:''}
  </div>`;

  // ── Page 7: Q11 (no-directives / executed) + Q10E/F ────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 11 & 10E–F','7')}
  <div class="doc-schedule-title">11. Pre-existing Orders / Advance Directives</div>
  ${boxes([[d.q11NoDirectives,'There are NO pre-existing orders Not To Resuscitate (DNR) or any other advance directive, and I have taken the following steps to verify there are none:']])}
  ${d.q11NoDirectives?boxes([
    [d.q11StepResidence,"Search of ward's prior and current residence"],
    [d.q11StepSafeDeposit,"Inventory of ward's safe deposit box"],
    [d.q11StepInterviewed,'Interviewed family and friends'],
    [d.q11StepMedicalProviders,"Requested documents from the ward's medical providers"],
    [d.q11StepAttorney,"Requested documents from the ward's attorney"],
  ]):''}
  ${boxes([[d.q11Executed,'The ward executed the following advance directives:']])}
  ${d.q11Executed?boxes([
    [d.q11ExecDNR,'Order Not to Resuscitate (DNR), F.S. 401.45(3)'],
    [d.q11ExecHealthcare,'Advance Directive for Healthcare (surrogate, living will, anatomical gift)'],
    [d.q11ExecPOA,'Durable Power of Attorney, F.S. Chapter 709'],
    [d.q11ExecOther,'Other'+(d.q11ExecOtherText?' — '+d.q11ExecOtherText:'')],
  ]):''}
  <div class="doc-schedule-title">E. Assistive Devices Needed But Not Currently Owned</div>
  ${boxes([
    [d.needsDentures,'Dentures'],[d.needsHearingAid,'Hearing Aid'],[d.needsWheelchair,'Wheelchair'],
    [d.needsWalker,'Walker/Cane'],[d.needsCrutches,'Crutches'],[d.needsProsthetics,'Prosthetics'],
    [d.needsGlasses,'Glasses'],[d.needsNone,'None'],[d.needsOther,'Other'],
  ])}
  ${d.needsExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.needsExplain)}</p>`:''}
  <div class="doc-schedule-title">F. Examining Committee Recommendations Incorporated?</div>
  ${boxes([[d.committeeIncorporated==='Yes','Yes'],[d.committeeIncorporated==='No','No']])}
  ${d.committeeExplain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.committeeExplain)}</p>`:''}
  </div>`;

  // ── Page 8: advance directive detail slots ─────────────
  const dirs=(d.q11Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
  html+=`<div class="doc-page">${H(ward,caseNo,'Advance Directive Detail','8')}
  <div class="doc-schedule-title">Advance Directive Detail (for any directive listed on the prior page)</div>
  ${dirs.length?dirs.map((r,i)=>`<div class="doc-section-block" style="margin-top:.6rem">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">Directive ${i+1}</p>
    <div class="doc-table-div"><div class="tbl">
      <div class="tr"><div class="td">Title of order or directive</div><div class="td">${esc(r.title||'')}</div></div>
      <div class="tr"><div class="td">Date executed / signed</div><div class="td">${fmtDate(r.dateSigned)||''}</div></div>
      <div class="tr"><div class="td">Name of person who signed</div><div class="td">${esc(r.signedBy||'')}</div></div>
      <div class="tr"><div class="td">Designated agent(s) / surrogate(s)</div><div class="td">${esc(r.agents||'')}</div></div>
      <div class="tr"><div class="td">Alternate agent(s) / surrogate(s)</div><div class="td">${esc(r.alternates||'')}</div></div>
      <div class="tr"><div class="td">Relationship to the ward</div><div class="td">${esc(r.relationship||'')}</div></div>
      <div class="tr"><div class="td">Contact information</div><div class="td">${esc(r.contact||'')}</div></div>
      <div class="tr"><div class="td">Suspended or revoked by a court?</div><div class="td">${esc(r.courtRevoked||'')}${r.orderDate?' — '+fmtDate(r.orderDate):''}${r.orderCounty?', '+esc(r.orderCounty):''}</div></div>
    </div></div>
  </div>`).join(''):'<p style="font-size:.76rem;font-style:italic;">No advance directives on file.</p>'}
  </div>`;

  // ── Page 9: certification + guardian signature ─────────
  const g=d.planGuardians||[];
  const sigBlock=(p,label)=>`<div class="doc-signature-block">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.3rem;">${label}</p>
    <div class="row">
      <div class="col-6">${fld('Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(p.signatureDate))}</div>
      <div class="col-3">${fld('Printed Name',p.name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('SSN / EIN',p.ssn)}</div>
      <div class="col-4">${fld('Phone Number',p.phone)}</div>
      <div class="col-4">${fld('Relationship to Ward',p.relationship)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Street Address',p.street)}</div>
      <div class="col-6">${fld('City / State / ZIP',p.cityStateZip)}</div>
    </div>
  </div>`;
  html+=`<div class="doc-page">${H(ward,caseNo,'Certification','9')}
  <div class="doc-schedule-title">Certification and Signature of Guardian(s)</div>
  ${boxes([
    [d.certIncapacitatedNoCopy,'The Ward was declared totally incapacitated and has not been given a copy of this plan.'],
    [d.certMinorNoCopy,'The Ward is a minor under the age of 14 and has not been given a copy of this plan.'],
    [d.certConsulted,"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with them."],
    [d.certRecognizeRights,'In exercising his or her powers, the guardian shall recognize any rights retained by the ward [F.S. 744.363(6)].'],
    [d.certNoRestriction,'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.'],
    [d.certProvidesCare,"The plan provides for the Ward's medical care and mental health treatment."],
  ])}
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${sigBlock(g[0]||{},'Guardian')}
  ${sigBlock(g[1]||{},'Co-Guardian')}
  </div>`;

  // ── Page 10: additional co-guardian signatures ─────────
  const extras=(g||[]).slice(2).filter(p=>p&&(p.name||p.signatureDate));
  if(extras.length){
    html+=`<div class="doc-page">${H(ward,caseNo,'Certification (cont.)','10')}
    <div class="doc-schedule-title">Additional Guardian Signatures</div>
    ${extras.map((p,i)=>sigBlock(p,`Co-Guardian ${i+3}`)).join('')}
    <p style="font-size:.74rem;margin-top:.6rem;font-style:italic;">All guardians of person must sign and provide the most current address, telephone number, and SSN. Only reports with original signatures will be audited by the Clerk of the Court.</p>
    </div>`;
  }

  // ── Final page: attorney certification ─────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Attorney Certification',String(extras.length?11:10))}
  <div class="doc-schedule-title">Certification and Signature of Guardian's Attorney</div>
  <p style="font-size:.76rem;">The undersigned hereby notifies the court of the filing of the initial guardianship plan for the period <strong>${fmtDate(d.periodFrom)||''}</strong> through <strong>${fmtDate(d.periodTo)||''}</strong>.</p>
  <p style="font-size:.76rem;">This initial guardianship plan is the representation of the guardian. I have not audited the accompanying initial plan. The undersigned attorney represents that he/she has examined the contents of the initial guardianship plan and that it conforms to the requirements of the Florida Guardianship Law and the standards for the plans in ${esc(d.county||'')} County.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Attorney Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.attorney_signatureDate))}</div>
      <div class="col-3">${fld('Attorney Name',d.attorney_name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Bar Number',d.attorney_bar)}</div>
      <div class="col-4">${fld('Phone Number',d.attorney_phone)}</div>
      <div class="col-4">${fld('Street Address',d.attorney_street)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('City / State / ZIP',d.attorney_cityStateZip)}</div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Initial Guardianship Plan)</p>
  </div>
  </div>`;

  return html;
}

function pagePrintPlanInitial(){
  const errors=validatePlanInitial();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" onclick="doSavePdfPlanInitial()" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="pvShowAll();window.print()">Print</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="openFloridaCourtPortal()" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container">${buildPrintHTMLPlanInitial()}</div>
  </div>`;
}

async function doSavePdfPlanInitial(){
  const errors=validatePlanInitial();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  pvShowAll();
  document.body.classList.add('pdf-export-mode');
  const container=document.getElementById('print-doc-container');
  const ward=(window.D.wardName||'InitialGuardianshipPlan').replace(/[^a-z0-9]/gi,'_');
  try{
    await html2pdf().set({
      margin:0,filename:`${ward}_InitialGuardianshipPlan.pdf`,
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,logging:false},
      jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
      pagebreak:{mode:'avoid-all',before:'.doc-page:not(:first-of-type)'}
    }).from(container).save();
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{
    document.body.classList.remove('pdf-export-mode');
  }
}

function planReadinessChecksMinor(){
  const d=window.D;
  const has=v=>!!(v!==''&&v!==null&&v!==undefined);
  const g0=(d.planGuardians||[])[0]||{};
  const provs=(d.q3Providers||[]).filter(r=>r&&r.last);
  const auto=[
    {label:"Minor's name, county, and reporting period are on the plan",ok:has(d.wardName)&&has(d.county)&&has(d.periodFrom)&&has(d.periodTo)},
    {label:'Current residence and address stated',ok:has(d.q1ResidenceName)&&has(d.q1Street)},
    {label:'Signed and dated by a guardian',ok:has(g0.name)&&has(g0.signatureDate)},
    {label:'Guardian address, phone and taxpayer ID provided',ok:has(g0.mailingStreet)&&has(g0.phone)&&has(g0.tin)},
    {label:'Question 4 — provision of medical services selected',ok:!!(d.q4Primary||d.q4Dentist||d.q4Specialist||d.q4PT||d.q4ST||d.q4OT||d.q4MinorDecides||d.q4Other)},
    {label:"Question 5 — school progress, social development, communication, and interpersonal statements completed",ok:has(d.q5SchoolProgress)&&has(d.q5SocialDevelopment)&&has(d.q5Communicates)&&has(d.q5Interpersonal)},
    {label:'Question 5E — unmet social needs answered',ok:!!(d.q5NoUnmetNeeds||d.q5DoesNotCareToSocialize||d.q5UnmetNeeds||d.q5Other)},
    {label:'Preparer certification completed',ok:has(d.preparer_name)&&has(d.preparer_signatureDate)},
    {label:'Attorney certification signed and dated',ok:has(d.attorney_name)&&has(d.attorney_signatureDate)},
    {label:`Treatment providers listed (${provs.length})`,ok:provs.length>0},
  ];
  const manual=[
    "Attach the physician's statement of an examination of the ward no more than 90 days before the beginning of the plan period, if the certification box for it is checked.",
    'Serve a copy on all interested persons and file the certificate of service, unless the ward was declared totally incapacitated or is a minor (see the certification checkboxes).',
    'Confirm the guardian address on file with the Clerk matches the address on this plan.',
    'If you are a professional or public guardian, confirm the corresponding registration is current.',
    'This general checklist is not derived from an official Clerk\'s Review form for this document — confirm current local filing requirements before submitting.',
  ];
  return {auto,manual};
}

function docHeaderPlanMinor(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county,true)}</div>
    <div class="doc-title">ANNUAL GUARDIANSHIP PLAN — MINOR</div>
    <div class="doc-meta">
      <span>IN RE: THE GUARDIANSHIP OF <strong>${ward}</strong> (MINOR)</span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>UCN/REF: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTMLPlanMinor(){
  const d=window.D;
  const ward=esc(d.wardName||'');
  const caseNo=esc(`${d.ucn||''} ${d.ref||''}`.trim());
  const H=docHeaderPlanMinor;
  const y=v=>v?'☒':'☐';
  const line=v=>`<div class="doc-answer">${esc(v||'')||'&nbsp;'}</div>`;
  const fld=(label,val)=>`<div class="doc-field-label">${label}</div><div class="doc-signature-line">${esc(val||'')}</div>`;
  const boxes=(items)=>`<div class="doc-checklist">${items.map(([on,label])=>`<div class="doc-check-row">${y(on)} ${esc(label)}</div>`).join('')}</div>`;
  let html='';

  // ── Page 1: cover ─────────────────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Cover','1')}
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">UCN</div><div class="td">${esc(d.ucn||'')}</div></div>
    <div class="tr"><div class="td">REF #</div><div class="td">${esc(d.ref||'')}</div></div>
    <div class="tr"><div class="td">For the period</div><div class="td">${fmtDate(d.periodFrom)||''} to ${fmtDate(d.periodTo)||''}</div></div>
    <div class="tr"><div class="td">Guardian Name(s)</div><div class="td">${esc(d.guardianName||'')}</div></div>
  </div></div>
  ${boxes([[d.amendedForm==='Yes','Amended Form'],[d.professionalGuardian==='Yes','Professional Guardian'],[d.publicGuardian==='Yes','Public Guardian']])}
  ${d.amendedForm==='Yes'&&d.amendedVersion?`<p style="font-size:.76rem;">Amended version: <strong>${esc(d.amendedVersion)}</strong></p>`:''}
  <div class="doc-schedule-title">1. Where the Minor Presently Resides</div>
  <div class="doc-table-div"><div class="tbl">
    <div class="tr"><div class="td">Residence Name</div><div class="td">${esc(d.q1ResidenceName||'')}</div></div>
    <div class="tr"><div class="td">Street Address</div><div class="td">${esc(d.q1Street||'')}</div></div>
    <div class="tr"><div class="td">City / State / Zip</div><div class="td">${esc(d.q1City||'')} ${esc(d.q1State||'')} ${esc(d.q1Zip||'')}</div></div>
    <div class="tr"><div class="td">Phone</div><div class="td">${esc(d.q1Phone||'')}</div></div>
  </div></div>
  </div>`;

  // ── Page 2: Q2 residences + Q3 providers ──────────────
  const resRows=(d.q2Residences||[]).filter(r=>r&&(r.name||r.street||r.city));
  const provRows=(d.q3Providers||[]).filter(r=>r&&(r.first||r.last||r.providerType));
  html+=`<div class="doc-page">${H(ward,caseNo,'Questions 2–3','2')}
  <div class="doc-schedule-title">2. Residences During the Preceding 12 Months</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Residence</th><th>City/State/Zip</th><th>Phone</th></tr></thead>
    <tbody>${resRows.length?resRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc(r.name||'')}${r.street?'<br>'+esc(r.street):''}</td>
      <td>${esc(r.city||'')} ${esc(r.state||'')} ${esc(r.zip||'')}</td>
      <td>${esc(r.phone||'')}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No prior residences listed</td></tr>'}
    </tbody>
  </table>
  <div class="doc-schedule-title">3. Medical &amp; Mental Health Treatment Providers</div>
  <table class="doc-table">
    <thead><tr><th style="width:2rem">#</th><th>Provider</th><th>Type</th><th style="width:5rem">Visits</th></tr></thead>
    <tbody>${provRows.length?provRows.map((r,i)=>`<tr>
      <td>${i+1}</td>
      <td>${esc([r.first,r.mi,r.last].filter(Boolean).join(' '))}${r.street?'<br>'+esc(r.street):''}${(r.city||r.state||r.zip)?'<br>'+esc([r.city,r.state,r.zip].filter(Boolean).join(' ')):''}${r.phone?'<br>'+esc(r.phone):''}</td>
      <td>${esc(r.providerType||'')}</td>
      <td>${esc(r.visits||'')}</td></tr>`).join('')
      :'<tr><td colspan="4" style="text-align:center;font-style:italic">No providers listed</td></tr>'}
    </tbody>
  </table>
  </div>`;

  // ── Page 3: Q4 medical services ────────────────────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 4','3')}
  <div class="doc-schedule-title">4. Provision of Medical Services for the Plan Period</div>
  ${boxes([[d.q4Primary,'Routine examination by primary care physician'+(d.q4PrimaryFreq?' — '+d.q4PrimaryFreq:'')]])}
  ${boxes([[d.q4Dentist,'Routine examination by dentist'+(d.q4DentistFreq?' — '+d.q4DentistFreq:'')]])}
  ${boxes([[d.q4Specialist,'Routine examination by specialist'+(d.q4SpecialistFreq?' — '+d.q4SpecialistFreq:'')]])}
  ${boxes([
    [d.q4PT,'Physical Therapy'],[d.q4ST,'Speech Therapy'],[d.q4OT,'Occupational Therapy'],
    [d.q4MinorDecides,'The Minor retains the right to make his or her own decision'],
    [d.q4Other,'Other'],
  ])}
  ${d.q4Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q4Explain)}</p>`:''}
  </div>`;

  // ── Page 4: Q5 education & social development ─────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Question 5','4')}
  <div class="doc-schedule-title">5. Education of the Minor</div>
  <p style="font-size:.76rem;font-weight:650;margin-bottom:.2rem;">A. School progress report summary:</p>
  ${line(d.q5SchoolProgress)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">B. Social development:</p>
  ${line(d.q5SocialDevelopment)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">C. How well the Minor communicates with others:</p>
  ${line(d.q5Communicates)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">D. How well the Minor maintains interpersonal relationships:</p>
  ${line(d.q5Interpersonal)}
  <p style="font-size:.76rem;font-weight:650;margin:.5rem 0 .2rem;">E. Unmet social needs of the Minor:</p>
  ${boxes([
    [d.q5NoUnmetNeeds,'No Unmet Needs'],
    [d.q5DoesNotCareToSocialize,'The Minor does not care to socialize'],
    [d.q5UnmetNeeds,'Unmet Needs'],
    [d.q5Other,'Other'],
  ])}
  ${d.q5Explain?`<p style="font-size:.76rem;"><em>Explanation:</em> ${esc(d.q5Explain)}</p>`:''}
  </div>`;

  // ── Page 5: certification + guardian signatures ────────
  const g=d.planGuardians||[];
  const sigBlock=(p,label)=>`<div class="doc-signature-block">
    <p style="font-size:.76rem;font-weight:650;margin-bottom:.3rem;">${label}</p>
    <div class="row">
      <div class="col-6">${fld('Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(p.signatureDate))}</div>
      <div class="col-3">${fld('Printed Name',p.name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Taxpayer ID #',p.tin)}</div>
      <div class="col-4">${fld('Telephone #',p.phone)}</div>
      <div class="col-4">${fld('Relationship to Ward',p.relationship)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Address',p.mailingStreet)}</div>
      <div class="col-6">${fld('City / State / Zip',p.mailingCityStateZip)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Email Address',p.email)}</div>
    </div>
  </div>`;
  html+=`<div class="doc-page">${H(ward,caseNo,'Certification','5')}
  <div class="doc-schedule-title">Certification and Signature of Guardian(s)</div>
  ${boxes([
    [d.certIncapacitated,'The Ward was declared totally incapacitated.'],
    [d.certMinor,'The Ward is a minor.'],
    [d.certConsulted,"The guardian has consulted with the Ward, to the extent reasonable, has honored the Ward's wishes, and to the maximum extent possible the plan is in accordance with the Ward's wishes or consistent with the rights retained by the Ward."],
    [d.certNoRestriction,'The plan does not restrict the physical liberty of the Ward except as necessary to protect the Ward and others from serious physical injury, illness, or disease.'],
    [d.certProvidesCare,"The plan provides for the Ward's medical care and mental health treatment."],
    [d.certPhysicianAttached,"The physician's statement of an examination of the Ward no more than 90 days before the beginning of the plan period is attached."],
  ])}
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing plan, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${sigBlock(g[0]||{},'Guardian')}
  ${sigBlock(g[1]||{},'Co-Guardian')}
  </div>`;

  // ── Page 6: preparer + attorney certification ──────────
  html+=`<div class="doc-page">${H(ward,caseNo,'Preparer & Attorney',String(6))}
  <div class="doc-schedule-title">Certification and Signature of Preparer</div>
  <p style="font-size:.75rem;margin-bottom:.5rem;">The preparation of this form is based upon the information provided by the guardian(s) and/or attorney with no independent verification of the information contained herein. I have not audited or reviewed the guardianship plan or documents supporting its preparation, and accordingly do not express an opinion or any other form of assurance as to the accuracy of the information contained in the plan.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Preparer Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.preparer_signatureDate))}</div>
      <div class="col-3">${fld('Preparer Name',d.preparer_name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Taxpayer ID #',d.preparer_tin)}</div>
      <div class="col-4">${fld('Telephone #',d.preparer_phone)}</div>
      <div class="col-4">${fld('Email Address',d.preparer_email)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Address',d.preparer_mailingStreet)}</div>
      <div class="col-6">${fld('City / State / Zip',d.preparer_cityStateZip)}</div>
    </div>
  </div>
  <div class="doc-schedule-title mt-3">Certification and Signature of Guardian's Attorney</div>
  <p style="font-size:.76rem;">The undersigned hereby notifies the Court of the filing of this Annual Guardianship Plan. This plan is the representation of the guardian. I have not audited the accompanying plan. The undersigned attorney represents that he/she has examined the contents of this plan and that it conforms to the requirements of the Florida Guardianship Law.</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6">${fld('Attorney Signature','')}</div>
      <div class="col-3">${fld('Date Signed',fmtDate(d.attorney_signatureDate))}</div>
      <div class="col-3">${fld('Attorney Name',d.attorney_name)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-4">${fld('Bar Number',d.attorney_bar)}</div>
      <div class="col-4">${fld('Phone Number',d.attorney_phone)}</div>
      <div class="col-4">${fld('Email Address',d.attorney_email)}</div>
    </div>
    <div class="row mt-2">
      <div class="col-6">${fld('Mailing Address',d.attorney_street)}</div>
      <div class="col-6">${fld('City / State / Zip',d.attorney_cityStateZip)}</div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Annual Plan — Minors)</p>
  </div>
  </div>`;

  return html;
}

function pagePrintPlanMinor(){
  const errors=validatePlanMinor();
  highlightErrors(errors);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" onclick="doSavePdfPlanMinor()" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="pvShowAll();window.print()">Print</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="openFloridaCourtPortal()" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${planReadinessPanel()}
    <div id="print-doc-container">${buildPrintHTMLPlanMinor()}</div>
  </div>`;
}

async function doSavePdfPlanMinor(){
  const errors=validatePlanMinor();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  pvShowAll();
  document.body.classList.add('pdf-export-mode');
  const container=document.getElementById('print-doc-container');
  const ward=(window.D.wardName||'AnnualPlanMinors').replace(/[^a-z0-9]/gi,'_');
  try{
    await html2pdf().set({
      margin:0,filename:`${ward}_AnnualPlanMinors.pdf`,
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,logging:false},
      jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
      pagebreak:{mode:'avoid-all',before:'.doc-page:not(:first-of-type)'}
    }).from(container).save();
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{
    document.body.classList.remove('pdf-export-mode');
  }
}

function sanitizeNegativeAmounts(){
  const amountFields=['fullAmount','wardPct','restrictedAmt','fullValue','carryingValue','wardPercent','wardB2','wardB3','fullAssetValue','fullDebtBalance','fullAssetAmount','wardValue','wardAmt','income','charge','tax','balance','price'];
  const cleanValue=v=>{const n=parseFloat(v);return isNaN(n)?v:Math.max(0,n)};
  if(window.D){
    if(Array.isArray(window.D.schD1)){window.D.schD1.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(window.D.schD2)){window.D.schD2.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(window.D.schD3)){window.D.schD3.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    if(Array.isArray(window.D.schD4)){window.D.schD4.forEach(r=>{amountFields.forEach(f=>{if(f in r)r[f]=cleanValue(r[f])});})}
    ['startingBalance','interestIncome','depositsSettlement','serviceCharges','federalIncomeTax'].forEach(f=>{if(f in window.D)window.D[f]=cleanValue(window.D[f])});
    // Simplified's remuneration rows no longer have an amount field, but Annual's still do.
    if(Array.isArray(window.D.remuneration)){window.D.remuneration.forEach(r=>{if('amount' in r)r.amount=cleanValue(r.amount);})}
  }
}
function renderPageAnnual(page){
  const el=document.getElementById('main-content');
  sanitizeNegativeAmounts();
  switch(page){
    case '/':      el.innerHTML=pagePart1Annual();break;
    case '/p2':    el.innerHTML=pagePart2Annual();break;
    case '/p3':    el.innerHTML=pagePart3Annual();break;
    case '/p4':    el.innerHTML=pagePart4Annual();break;
    case '/p5':    el.innerHTML=pagePart5Annual();break;
    case '/scha':  el.innerHTML=pageSchAAnnual();break;
    case '/schb1': el.innerHTML=pageSchB1Annual();break;
    case '/schb2': el.innerHTML=pageSchB2Annual();break;
    case '/schb3': el.innerHTML=pageSchB3Annual();break;
    case '/schb4': el.innerHTML=pageSchB4Annual();break;
    case '/schc':  el.innerHTML=pageSchCAnnual();break;
    case '/schd1': el.innerHTML=pageSchD1Annual();break;
    case '/schd2': el.innerHTML=pageSchD2Annual();break;
    case '/schd3': el.innerHTML=pageSchD3Annual();break;
    case '/schd4': el.innerHTML=pageSchD4Annual();break;
    case '/schd5': el.innerHTML=pageSchD5Annual();break;
    case '/sche':  el.innerHTML=pageSchEAnnual();break;
    case '/schf1': el.innerHTML=pageSchF1Annual();break;
    case '/schf2': el.innerHTML=pageSchF2Annual();break;
    case '/p67':   el.innerHTML=pagePart67Annual();break;
    case '/p8':    el.innerHTML=pagePart8Annual();break;
    case '/p9':    el.innerHTML=pagePart9Annual();break;
    case '/p10':   el.innerHTML=pagePart10Annual();break;
    case '/p11':   el.innerHTML=pagePart11Annual();break;
    case '/print': el.innerHTML=pagePrintAnnual();break;
    default:       el.innerHTML=pagePart1Annual();
  }
  el.scrollTop=0;
}

// ═══════════════════════════════════════════════════════
// WIZARD: ANNUAL ACCOUNTING - PAGE RENDERERS
// (Using app shell helper functions: esc, autoSave, navigate)
// ═══════════════════════════════════════════════════════
function n(v){return parseFloat(v)||0;}
function pct(v){const p=parseFloat(v);return isNaN(p)?0:p>1?p/100:p;}

function calcTotalsAnnual(){
  const d=window.D;
  const schA  = d.schA.reduce((s,r)=>s+n(r.amount),0);
  const schB1 = d.schB1.reduce((s,r)=>s+n(r.amount),0);
  const schB2 = d.schB2.reduce((s,r)=>s+n(r.amount),0);
  const schB3 = d.schB3.reduce((s,r)=>s+n(r.amount),0);
  const schB4 = d.schB4.reduce((s,r)=>s+n(r.amount),0);
  const totalDisb = schB1+schB2+schB3+schB4;
  const schC_gains = d.schC.reduce((s,r)=>s+n(r.gain),0);
  const schC_losses = d.schC.reduce((s,r)=>s+n(r.loss),0);
  const schC_net = schC_gains+schC_losses; // losses entered as negative
  const netAssets = n(d.startingBalance)+schA-totalDisb+schC_net;

  // Schedule D totals
  const schD1_restricted = d.schD1.reduce((s,r)=>s+(r.restricted==='Yes'?n(r.fullAmount)*pct(r.wardPct):0),0);
  const schD1_total = d.schD1.reduce((s,r)=>s+n(r.fullAmount)*pct(r.wardPct),0);
  const schD2_carrying = d.schD2.reduce((s,r)=>s+n(r.carryingValue)*pct(r.wardPct),0);
  const schD2_ward = d.schD2.reduce((s,r)=>s+n(r.fullValue)*pct(r.wardPct),0);
  const schD3_carrying = d.schD3.reduce((s,r)=>s+n(r.carryingValue)*pct(r.wardPct),0);
  const schD3_ward = d.schD3.reduce((s,r)=>s+n(r.fullAmount)*pct(r.wardPct),0);
  const schD4_restricted = d.schD4.reduce((s,r)=>s+(r.restricted==='Yes'?n(r.carryingValue)*pct(r.wardPct):0),0);
  const schD4_carrying = d.schD4.reduce((s,r)=>s+n(r.carryingValue)*pct(r.wardPct),0);
  const schD4_ward = d.schD4.reduce((s,r)=>s+n(r.fullAmount)*pct(r.wardPct),0);
  const schD5_total = d.schD5.reduce((s,r)=>s+n(r.fullDebt)*pct(r.wardPct),0);
  const netAssetsFromD = schD1_total+schD2_ward+schD3_ward+schD4_ward-schD5_total;

  // Bond calc
  const bondReq = (schD1_total-schD1_restricted)+schD3_ward+(schD4_ward-schD4_restricted);

  // Audit fee
  let auditFee=0;
  if(netAssetsFromD>500000) auditFee=250;
  else if(netAssetsFromD>100000) auditFee=170;
  else if(netAssetsFromD>25000) auditFee=85;
  else auditFee=20;

  return {
    schA,schB1,schB2,schB3,schB4,totalDisb,
    schC_gains,schC_losses,schC_net,netAssets,
    schD1_restricted,schD1_total,
    schD2_carrying,schD2_ward,
    schD3_carrying,schD3_ward,
    schD4_restricted,schD4_carrying,schD4_ward,
    schD5_total,netAssetsFromD,bondReq,auditFee
  };
}


function fmtAnnual(v){if(v===''||v===null||v===undefined)return '';const x=parseFloat(v);if(isNaN(x))return '';return x<0?`(${Math.abs(x).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})})`:`${x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;}
function fmtD(s){return s?String(s).substring(0,10):'';}
function inp(field,label,val,path,req=false,type='text'){
  const id=`fi_${Math.random().toString(36).slice(2)}`;
  const setter=path?`${path}='${field}']=this.value`:`D['${field}']=this.value`;
  return `<div class="mb-2"><label class="form-label">${label}${req?'<span class="req">*</span>':''}</label><input type="${type}" class="form-control" value="${esc(val)}" oninput="${path?path.replace(/\['/,'[\'').replace(/'$/,"'")+`['${field}']=this.value`:(`D['${field}']=this.value`)};autoSave();updateNavDots()"></div>`;
}
function inpD(label,val,setter,req=false,type='text'){
  const inputId='inp_'+Math.random().toString(36).slice(2,9);
  let oninput=type==='text'?`this.value=validateSecurityInput('${label}',this.value);${setter};autoSave();updateNavDots()`:`${setter};autoSave();updateNavDots()`;
  let onblur='';
  const isEmail=label.toLowerCase().includes('email');
  const isPhone=!isEmail&&label.toLowerCase().includes('phone');
  const isName=!isEmail&&(label.toLowerCase().includes('name')||label.toLowerCase().includes('payer')||label.toLowerCase().includes('payee')||label.toLowerCase().includes('lender')||label.toLowerCase().includes('creditor')||label.toLowerCase().includes('institution')||label.toLowerCase().includes('guardian')||label.toLowerCase().includes('attorney')||label.toLowerCase().includes('trustee')||label.toLowerCase().includes('claimant')||label.toLowerCase().includes('description')||label.toLowerCase().includes('bonding')||label.toLowerCase().includes('company')||label.toLowerCase().includes('trust'));
  const isZip=!isEmail&&label.toLowerCase().includes('zip');
  const isAddress=!isEmail&&!isZip&&(label.toLowerCase().includes('street')||label.toLowerCase().includes('address')||label.toLowerCase().includes('city'));
  const isSSN=!isEmail&&(label.toLowerCase().includes('ssn')||label.toLowerCase().includes('ein')||label.toLowerCase().includes('social security')||label.toLowerCase().includes('taxpayer id')||/\btin\b/i.test(label));
  const isCaseNumber=!isEmail&&label.toLowerCase().includes('case number')&&!label.toLowerCase().includes('related');
  const isBarNumber=!isEmail&&label.toLowerCase().includes('bar number');
  const isAccountNumber=!isEmail&&!label.toLowerCase().includes('bank name')&&!label.toLowerCase().includes('loan')&&(label.toLowerCase().includes('account number')||label.toLowerCase().includes('account #')||label.toLowerCase().includes('bank account'));
  const isCheckNumber=!isEmail&&label.toLowerCase().includes('check #');
  const isAmountField=type==='number';
  if(isSSN){
    oninput=`this.value=formatSSN(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isCaseNumber){
    oninput=`this.value=formatCaseNumber(this.value);${setter};autoSave();updateNavDots()`;
    onblur=`this.value=finalizeCaseNumber(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isBarNumber){
    oninput=`this.value=formatBarNumber(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isAccountNumber){
    oninput=`this.value=formatAccountNumber(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isCheckNumber){
    oninput=`this.value=formatCheckNumber(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isAmountField){
    oninput=`this.value=sanitizeNonNegativeDecimal(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isPhone){
    oninput=`this.value=formatPhone(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isName){
    const isWardNameField=/\bwardName\b/.test(setter);
    const isGuardianField=/D\.guardian(Name|Names)?=/.test(setter)||/D\.guardians\[0\]\.name=/.test(setter);
    oninput=`this.value=formatName(this.value);${setter};autoSave();updateNavDots()${isWardNameField?';syncActiveWardNameDisplay()':''}${isGuardianField?';syncGuardianNameDisplay()':''}`;
  }else if(isZip){
    oninput=`applyZipLimit(this);this.value=formatCityStateZip(this.value);${setter};autoSave();updateNavDots()`;
  }else if(isAddress){
    oninput=`this.value=formatAddress(this.value);${setter};autoSave();updateNavDots()`;
  }
  const formatted=isSSN?formatSSN(val):isCaseNumber?formatCaseNumber(val):isBarNumber?formatBarNumber(val):isAccountNumber?formatAccountNumber(val):isCheckNumber?formatCheckNumber(val):isPhone?formatPhone(val):isName?formatName(val):isZip?formatCityStateZip(val):isAddress?formatAddress(val):val||'';
  const inputType=isAmountField?'text':isSSN?'password':type;
  const inputMode=isAmountField?' inputmode="decimal"':'';
  const cleanedValue=isAmountField?sanitizeNonNegativeDecimal(formatted):formatted;
  const isPercentField=isAmountField&&(label.toLowerCase().includes('%')||label.toLowerCase().includes('percent'));
  const isDollarField=isAmountField&&!isPercentField;
  const inputHtml=`<input type="${inputType}" class="form-control" id="${inputId}" autocomplete="off"${inputMode} value="${esc(cleanedValue)}" oninput="${oninput}"${onblur?` onblur="${onblur}"`:''}>`;
  const wrappedInput=isDollarField?`<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`:isPercentField?`<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`:isSSN?`<div class="ssn-mask-wrap">${inputHtml}<button type="button" class="ssn-reveal-btn" aria-label="Show ${esc(label)}" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div>`:inputHtml;
  return `<div class="mb-2"><label class="form-label" for="${inputId}">${label}${req?'<span class="req">*</span>':''}</label>${wrappedInput}</div>`;
}
function selD(label,val,setter,opts){
  const selectId='sel_'+Math.random().toString(36).slice(2,9);
  return `<div class="mb-2"><label class="form-label" for="${selectId}">${label}</label><select class="form-select" id="${selectId}" onchange="${setter};autoSave();updateNavDots()"><option value="">— select —</option>${opts.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
}
// County-field counterpart to selD() -- same custom-setter-string
// convention, but a filtered-autocomplete text input instead of a <select>.
function countyInputD(label,val,setter){
  const inputId='cty_'+Math.random().toString(36).slice(2,9);
  const writeExpr=`${setter};autoSave();updateNavDots()`;
  return `<div class="mb-2"><label class="form-label" for="${inputId}">${label}</label>${countyAutocompleteHTML(inputId,val,writeExpr)}</div>`;
}
function inpDWithTooltip(label,tooltipKey,val,setter,req=false,type='text'){
  const html=inpD(label,val,setter,req,type);
  const tooltipHtml=tooltip(tooltipKey);
  if(!tooltipHtml)return html;
  const escapedLabel=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return html.replace(new RegExp(`(>)(${escapedLabel})(<span class="req">\\*</span>)?(<\/label>)`),`$1$2${tooltipHtml}$3$4`);
}
function pageNavAnnual(prev,next){
  return `<div class="page-nav d-flex justify-content-between">
    ${prev?`<button class="btn btn-outline-primary btn-sm" onclick="navigate('${prev}')">← Back</button>`:'<span></span>'}
    ${next?`<button class="btn btn-primary btn-sm" onclick="navigate('${next}')">Next →</button>`:`<button class="btn btn-primary btn-sm" onclick="navigate('/print')">Preview & Export →</button>`}
  </div>`;
}
const DISB_CATS=['Accounting','Bank Service Charges','Care Facility','Clothing / Personal Needs','Entertainment / Travel','Food / Meals','Insurance: Automobile / Property','Insurance: Health / Life','Medical / Pharmacy','Mortgage','Nurse / Care Giver / Employer Tax','Other Legal Expenses','Rent','Repairs / Maintenance','Taxes: Income','Taxes: Intangible','Utilities','Other'];
const LIAB_TYPES=['Mortgage','Note','Loan','Other'];
const GUARDIAN_REL=['Professional Guardian','Family/Non-Professional Guardian','Other/Non-Professional Guardian'];

function pagePart1Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Part I — Required Information</h1>
  ${browserRecommendationNotice()}
  <div class="schedule-instructions">Fields marked <span class="req">*</span> are required before export. Ward Name and Case Number auto-populate all schedule headers.</div>
  ${pageIntroRow(`<div class="accordion mb-0">
    <div class="accordion-item">
      <h2 class="accordion-header">
        <button class="accordion-button py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZonePart1" aria-expanded="true">
          <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing annual accounting template)
        </button>
      </h2>
      <div id="importZonePart1" class="accordion-collapse collapse show">
        <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
          <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
            <input type="file" accept=".xlsx" style="display:none" onchange="importExcelAnnual(this)">
          </label>
          <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the previously exported Annual Accounting Excel file</p>
          <div id="import-progress" style="margin-top:.5rem;font-size:.8rem;"></div>
        </div>
      </div>
    </div>
  </div>`)}
  <div class="row g-2">
    <div class="col-md-5">${inpD('Name of Ward',d.wardName,"D.wardName=this.value")}</div>
    <div class="col-md-4">${inpDWithTooltip('Case Number','case_number',d.caseNumber,"D.caseNumber=this.value")}</div>
    <div class="col-md-3">${inpD('Guardianship Inception Date (GID)',d.gid,"D.gid=this.value",false,'date')}</div>
    <div class="col-md-3">${inpD('Period From',d.periodFrom,"D.periodFrom=this.value",false,'date')}</div>
    <div class="col-md-3">${inpD('Period To',d.periodTo,"D.periodTo=this.value",false,'date')}</div>
    <div class="col-md-3">${selD('Filing Type',d.filingType,"D.filingType=this.value",['Annual','Final','Trust'])}</div>
    <div class="col-md-3">${yesNoCheckboxD('Amended Form?',d.amendedForm,"D.amendedForm=this.value")}</div>
    <div class="col-md-5">${inpD('Guardian',d.guardian,"D.guardian=this.value")}</div>
    <div class="col-md-5">${inpD('Attorney for Guardian',d.attorney,"D.attorney=this.value")}</div>
    <div class="col-md-2">${countyInputD('County',d.county,"D.county=this.value")}</div>
    <div class="col-md-6">${inpD('Type of Guardianship',d.typeOfGuardianship,"D.typeOfGuardianship=this.value")}</div>
    <div class="col-md-6">${inpD('Related Case Numbers (siblings/relatives with guardianships)',d.relatedCaseNumbers,"D.relatedCaseNumbers=this.value")}</div>
  </div>
  <div class="summary-box mt-3">
    <h2 class="subsection-heading">Quick Summary (auto-calculated)</h2>
    <div class="summary-line"><span>Starting Balance</span><span>${fmtAnnual(d.startingBalance)||'—'}</span></div>
    <div class="summary-line"><span>Sch A — Income</span><span>${fmtAnnual(t.schA)}</span></div>
    <div class="summary-line"><span>Total Disbursements (B-1 thru B-4)</span><span>${fmtAnnual(t.totalDisb)}</span></div>
    <div class="summary-line"><span>Sch C — Capital Adj. Net</span><span>${fmtAnnual(t.schC_net)}</span></div>
    <div class="summary-line total"><span>Net Assets at End of Period</span><span>${fmtAnnual(t.netAssets)}</span></div>
    <div class="summary-line" style="margin-top:.35rem;"><span>Net Assets from Sch D (should match above)</span><span>${fmtAnnual(t.netAssetsFromD)}</span></div>
  </div>
  ${pageNavAnnual(null,'/p2')}
  </div>`;
}

// ── Part II ──────────────────────────────────────────────
function pagePart2Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  const fee=t.auditFee;
  return `<div class="schedule-page">
  <h1>Part II — Guardian Certification &amp; Audit Fee</h1>
  <div class="attestation-text">The undersigned guardian certifies that said guardian has obtained a receipt or canceled check for all expenditures and disbursements made on behalf of the ward, which said guardian will preserve along with other substantiating papers for a three (3) year period after discharge and will upon request make available for inspection as the court may order. (As per F.S. 744.3678 (3).)</div>
  <div class="summary-box">
    <h2 class="subsection-heading">Audit Fee Schedule — Annual Accountings per FS 744.3678</h2>
    <div class="summary-line"><span>Estates with value of $25,000 or less</span><span>$20.00</span></div>
    <div class="summary-line"><span>From $25,000.01 up to and including $100,000</span><span>$85.00</span></div>
    <div class="summary-line"><span>From $100,000.01 up to and including $500,000</span><span>$170.00</span></div>
    <div class="summary-line"><span>In excess of $500,000</span><span>$250.00</span></div>
    <div class="summary-line total"><span>Applicable Fee (based on total assets ${fmtAnnual(t.netAssetsFromD)})</span><span><strong>${fee.toFixed(2)}</strong></span></div>
  </div>
  <div class="row g-2">
    <div class="col-md-4">${inpD('Starting Balance (Net Assets per Prior Report)',d.startingBalance,"D.startingBalance=this.value",false,'number')}</div>
  </div>
  ${pageNavAnnual('/p2','/p3')}
  </div>`;
}

// ── Part III ─────────────────────────────────────────────
function pagePart3Annual(){
  const d=window.D;
  const labels=['Guardian #1','Co-Guardian #2','Co-Guardian #3'];
  let html=`<div class="schedule-page">
  <h1>Part III — Guardian(s) Signature &amp; Declaration</h1>
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and any disbursements by me from <strong>${fmtD(d.periodFrom)||'[from date]'}</strong> through <strong>${fmtD(d.periodTo)||'[to date]'}</strong>.</div>`;
  d.guardians.forEach((g,i)=>{
    html+=`<div class="entry-card mb-2">
      <div class="entry-card-header">${labels[i]}</div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-5">${inpD(`${labels[i]}'s Name`,g.name,`D.guardians[${i}].name=this.value`)}</div>
          <div class="col-md-3">${inpDWithTooltip('Signature Date','signature_date',g.signatureDate,`D.guardians[${i}].signatureDate=this.value`,true,'date')}</div>
          <div class="col-md-4">${inpDWithTooltip('SSN / EIN','ssn_ein',g.ssn,`D.guardians[${i}].ssn=this.value`,true)}</div>
          <div class="col-md-4">${inpD('Phone Number',g.phone,`D.guardians[${i}].phone=this.value`,true)}</div>
          <div class="col-md-8">${inpD('Email Address',g.email,`D.guardians[${i}].email=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Mailing Street Address',g.mailingStreet,`D.guardians[${i}].mailingStreet=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Mailing City / State / Zip',g.mailingCityStateZip,`D.guardians[${i}].mailingCityStateZip=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Residence / Office Street Address',g.officeStreet,`D.guardians[${i}].officeStreet=this.value`,true)}</div>
          <div class="col-md-6">${inpD('Residence / Office City / State / Zip',g.officeCityStateZip,`D.guardians[${i}].officeCityStateZip=this.value`,true)}</div>
        </div>
      </div>
    </div>`;
  });
  html+=`${pageNavAnnual('/p2','/p4')}</div>`;
  return html;
}

// ── Part IV ──────────────────────────────────────────────
function pagePart4Annual(){
  const d=window.D; const p=d.preparer;
  return `<div class="schedule-page">
  <h1>Part IV — Preparer Attestation</h1>
  <div class="attestation-text">I have compiled the accompanying Annual Accounting of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of <strong>${esc(d.wardName)||'[ward]'}</strong> for the period <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>. This compilation is limited to presenting information in the form of an Annual Accounting and is the representation of the guardian. I have not audited or reviewed the accompanying guardianship accounting and, accordingly, do not express an opinion or any other form of assurance on it.</div>
  <div style="color:var(--brand-text);font-size:.8rem;font-weight:700;margin-bottom:.75rem;">*** If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE. ***</div>
  <div class="row g-2">
    <div class="col-md-5">${inpD("Preparer's Name ",p.name,"D.preparer.name=this.value")}</div>
    <div class="col-md-3">${inpDWithTooltip("Signature Date ",'signature_date',p.signatureDate,"D.preparer.signatureDate=this.value",true,'date')}</div>
    <div class="col-md-4">${inpDWithTooltip("Preparer's SSN / EIN ",'ssn_ein',p.ssn,"D.preparer.ssn=this.value")}</div>
    <div class="col-md-4">${inpD("Preparer's Phone Number ",p.phone,"D.preparer.phone=this.value")}</div>
    <div class="col-md-8">${inpD("Preparer's Street Address ",p.street,"D.preparer.street=this.value")}</div>
    <div class="col-md-12">${inpD("Preparer's City / State / Zip Code ",p.cityStateZip,"D.preparer.cityStateZip=this.value")}</div>
  </div>
  ${pageNavAnnual('/p3','/p5')}
  </div>`;
}

// ── Part V ───────────────────────────────────────────────
function pagePart5Annual(){
  const d=window.D;
  return `<div class="schedule-page">
  <h1>Part V — Guardian Attorney Signature</h1>
  <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the annual guardianship accounting of the Guardian <strong>${esc(d.wardName)||'[ward]'}</strong> for the period <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>. This annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in <strong>${d.attorney_county||d.county||'[county]'}</strong> County, Florida.</div>
  <div class="row g-2">
    <div class="col-md-5">${inpD("Attorney Name (linked to Part I)",d.attorney,"D.attorney=this.value")}</div>
    <div class="col-md-3">${inpDWithTooltip("Signature Date ",'signature_date',d.attorney_signatureDate,"D.attorney_signatureDate=this.value",true,'date')}</div>
    <div class="col-md-4">${inpD("Bar Number ",d.attorney_bar,"D.attorney_bar=this.value")}</div>
    <div class="col-md-4">${inpD("Phone Number ",d.attorney_phone,"D.attorney_phone=this.value")}</div>
    <div class="col-md-8">${inpD("Street Address ",d.attorney_street,"D.attorney_street=this.value")}</div>
    <div class="col-md-10">${inpD("City / State / Zip Code ",d.attorney_cityStateZip,"D.attorney_cityStateZip=this.value")}</div>
    <div class="col-md-2">${countyInputD("County",d.attorney_county,"D.attorney_county=this.value")}</div>
  </div>
  ${pageNavAnnual('/p4','/scha')}
  </div>`;
}

// ── Schedule A — Income ──────────────────────────────────
function pageSchAAnnual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schA.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schA',${i},'/scha')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schA.splice(${i},1);autoSave();navigate('/scha')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Income Source / Payer',r.payer,`D.schA[${i}].payer=this.value`,true)}</div>
        <div class="col-md-4">${inpD('Description',r.description,`D.schA[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank Name',r.bank,`D.schA[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schA[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-3">${inpD("Ward's Income Amount ",r.amount,`D.schA[${i}].amount=this.value;document.getElementById('schA_total').textContent=fmtAnnual(calcTotalsAnnual().schA)`,false,'number')}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule A — Income Received During Period</h1>
  <div class="schedule-instructions">Include all types of income such as SSI, Retirement, Disability benefits, interest or rental income. Do NOT include receipts from sale/disposal of principal assets (those go in Schedule C).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schA.push({payer:'',description:'',bank:'',accountNo:'',amount:''});autoSave();navigate('/scha')">+ Add Income Line</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule A Total — Income/Receipts Received During Period</div><div class="td" id="schA_total">${fmtAnnual(t.schA)}</div></div></div></div>
  ${renderScheduleDocsSection('schA')}
  ${pageNavAnnual('/p5','/schb1')}
  </div>`;
}

// ── Schedule B-1 — Attorney Fees ─────────────────────────
function pageSchB1Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schB1.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schB1',${i},'/schb1')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schB1.splice(${i},1);autoSave();navigate('/schb1')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB1[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB1[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Period From',r.periodFrom,`D.schB1[${i}].periodFrom=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Period To',r.periodTo,`D.schB1[${i}].periodTo=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB1[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-4">${inpD('Payee',r.payee,`D.schB1[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB1[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB1[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule B-1 — Attorney Fees and Costs</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schB1.push({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''});autoSave();navigate('/schb1')">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-1 Total — Attorney Fees and Costs</div><div class="td">${fmtAnnual(t.schB1)}</div></div></div></div>
  ${renderScheduleDocsSection('schB1')}
  ${pageNavAnnual('/scha','/schb2')}
  </div>`;
}

// ── Schedule B-2 — Guardian Fees ─────────────────────────
function pageSchB2Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schB2.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schB2',${i},'/schb2')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schB2.splice(${i},1);autoSave();navigate('/schb2')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB2[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB2[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Period From',r.periodFrom,`D.schB2[${i}].periodFrom=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Period To',r.periodTo,`D.schB2[${i}].periodTo=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB2[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-4">${inpD('Payee',r.payee,`D.schB2[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB2[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB2[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule B-2 — Guardian Fees and Costs</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schB2.push({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''});autoSave();navigate('/schb2')">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-2 Total — Guardian Fees and Costs</div><div class="td">${fmtAnnual(t.schB2)}</div></div></div></div>
  ${renderScheduleDocsSection('schB2')}
  ${pageNavAnnual('/schb1','/schb3')}
  </div>`;
}

// ── Schedule B-3 — Other Court-Ordered Disbursements ─────
function pageSchB3Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schB3.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schB3',${i},'/schb3')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schB3.splice(${i},1);autoSave();navigate('/schb3')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Bank Account #',r.bankAcct,`D.schB3[${i}].bankAcct=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB3[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB3[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-5">${inpD('Payee',r.payee,`D.schB3[${i}].payee=this.value`,true)}</div>
        <div class="col-md-3">${inpD('Court Order Date',r.courtOrderDate,`D.schB3[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-3">${inpD('Amount',r.amount,`D.schB3[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule B-3 — Other Court-Ordered Disbursements</h1>
  <div class="schedule-instructions">Bank Account Number = The Financial Institution's Account Number (NOT its Routing Number).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schB3.push({bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''});autoSave();navigate('/schb3')">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule B-3 Total — Other Court-Ordered Disbursements</div><div class="td">${fmtAnnual(t.schB3)}</div></div></div></div>
  ${renderScheduleDocsSection('schB3')}
  ${pageNavAnnual('/schb2','/schb4')}
  </div>`;
}

// ── Schedule B-4 — Other Disbursements ───────────────────
function pageSchB4Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  // Category summary
  const cats={};
  DISB_CATS.forEach(c=>cats[c]=0);
  d.schB4.forEach(r=>{if(r.category&&cats[r.category]!==undefined)cats[r.category]+=n(r.amount);});
  let rows='';
  d.schB4.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schB4',${i},'/schb4')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schB4.splice(${i},1);autoSave();navigate('/schb4')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-2">${inpD('Check #',r.checkNo,`D.schB4[${i}].checkNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date Paid',r.datePaid,`D.schB4[${i}].datePaid=this.value`,true,'date')}</div>
        <div class="col-md-3"><label class="form-label" for="schB4_category_${i}">Category <span class="req">*</span></label><select class="form-select" id="schB4_category_${i}" onchange="D.schB4[${i}].category=this.value;autoSave()"><option value="">— select —</option>${DISB_CATS.map(c=>`<option value="${c}" ${r.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="col-md-3">${inpD('Payee',r.payee,`D.schB4[${i}].payee=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Amount',r.amount,`D.schB4[${i}].amount=this.value`,true,'number')}</div>
      </div></div>
    </div>`;
  });
  let catSummary='<table class="doc-table mt-2"><thead><tr><th>#</th><th>Category</th><th class="right">Amount</th></tr></thead><tbody>';
  let cNum=1;
  DISB_CATS.forEach(c=>{catSummary+=`<tr><td>${cNum++}</td><td>${c}</td><td class="right">${cats[c]>0?fmtAnnual(cats[c]):'—'}</td></tr>`;});
  catSummary+=`</tbody></table>`;
  return `<div class="schedule-page">
  <h1>Schedule B-4 — All Other Disbursements</h1>
  <div class="schedule-instructions">Receipts, checks, and substantiating papers need not be filed with the court but shall be made available for inspection. List disbursements in check number order. If category is "Other," provide details in payee field.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schB4.push({checkNo:'',datePaid:'',category:'',payee:'',amount:''});autoSave();navigate('/schb4')">+ Add Entry</button>
  <div class="schedule-totals mb-2"><div class="tbl"><div class="tr"><div class="td">Schedule B-4 Total — All Other Disbursements</div><div class="td">${fmtAnnual(t.schB4)}</div></div></div></div>
  <div class="summary-box"><h2 class="subsection-heading">Category Summary</h2>${catSummary}</div>
  ${renderScheduleDocsSection('schB4')}
  ${pageNavAnnual('/schb3','/schc')}
  </div>`;
}

// ── Schedule C — Capital Adjustments ─────────────────────
function pageSchCAnnual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schC.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schC',${i},'/schc')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schC.splice(${i},1);autoSave();navigate('/schc')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Full Description and Identification',r.description,`D.schC[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Date of Adjustment',r.date,`D.schC[${i}].date=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Gain / Addition',r.gain,`D.schC[${i}].gain=this.value`,true,'number')}</div>
        <div class="col-md-3"><label class="form-label">Loss / Reduction <span class="req">*</span> <small>(enter as negative)</small></label><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" value="${esc(sanitizeDecimal(r.loss))}" oninput="this.value=sanitizeDecimal(this.value);D.schC[${i}].loss=this.value;autoSave()"></div></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule C — Capital Adjustments During Period</h1>
  <div class="schedule-instructions">Include gains/losses in asset values, newly discovered assets, purchases of real estate/personal/intangible assets. Losses must be entered as negative numbers. Real estate sales should also appear in Schedule F-1.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schC.push({description:'',date:'',gain:'',loss:''});autoSave();navigate('/schc')">+ Add Entry</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Total Gains / Additions</div><div class="td">${fmtAnnual(t.schC_gains)}</div></div>
    <div class="tr"><div class="td">Total Losses / Reductions</div><div class="td">${fmtAnnual(t.schC_losses)}</div></div>
    <div class="tr"><div class="td"><strong>Net Capital Adjustments</strong></div><div class="td"><strong>${fmtAnnual(t.schC_net)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schC')}
  ${pageNavAnnual('/schb4','/schd1')}
  </div>`;
}

// ── Schedule D-1 — Cash Assets ───────────────────────────
function pageSchD1Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schD1.forEach((r,i)=>{
    const wardAmt=n(r.fullAmount)*pct(r.wardPct);
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} — ${r.description||'(no description)'} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schD1',${i},'/schd1')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schD1.splice(${i},1);autoSave();navigate('/schd1')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Description (Bank, account type)',r.description,`D.schD1[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schD1[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2"><label class="form-label" for="schD1_restricted_${i}">Restricted? <span class="req">*</span>${tooltip('restricted')}</label><input class="form-check-input" type="checkbox" id="schD1_restricted_${i}" ${r.restricted==='Yes'?'checked':''} onchange="D.schD1[${i}].restricted=(this.checked?'Yes':'No');autoSave()"></div>
        <div class="col-md-2">${inpD('Type (CD, Checking…)',r.type,`D.schD1[${i}].type=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD1[${i}].fullAmount=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD1[${i}].wardPct=this.value`,false,'number')}</div>
        <div class="col-md-2"><label class="form-label">Ward's Amount</label><input class="form-control" readonly value="${fmtAnnual(wardAmt)}"></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule D-1 — Cash Assets</h1>
  <div class="schedule-instructions">Include all liquid assets: cash on hand, savings, checking, CDs, money market, attorney trust, patient trust, burial savings. List each account separately. Enter Ward's % as decimal (e.g., 1 for 100%, 0.5 for 50%) or as a percentage (e.g., 100, 50).</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schD1.push({description:'',accountNo:'',restricted:'No',type:'',fullAmount:'',wardPct:'',restrictedAmt:''});autoSave();navigate('/schd1')">+ Add Account</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Cash Assets in Restricted Depository</div><div class="td">${fmtAnnual(t.schD1_restricted)}</div></div>
    <div class="tr"><div class="td"><strong>Total Cash Assets (Ward's Amount)</strong></div><div class="td"><strong>${fmtAnnual(t.schD1_total)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD1')}
  ${pageNavAnnual('/schc','/schd2')}
  </div>`;
}

// ── Schedule D-2 — Real Estate ───────────────────────────
function pageSchD2Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schD2.forEach((r,i)=>{
    const wardVal=n(r.fullValue)*pct(r.wardPct);
    const carryWard=n(r.carryingValue)*pct(r.wardPct);
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schD2',${i},'/schd2')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schD2.splice(${i},1);autoSave();navigate('/schd2')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6">${inpD('Description / Address / Owners',r.description,`D.schD2[${i}].description=this.value`,true)}</div>
        <div class="col-md-2"><label class="form-label" for="schD2_residence_${i}">Personal Residence? <span class="req">*</span>${tooltip('personal_residence')}</label><input class="form-check-input" type="checkbox" id="schD2_residence_${i}" ${r.residence==='Yes'?'checked':''} onchange="D.schD2[${i}].residence=(this.checked?'Yes':'No');autoSave()"></div>
        <div class="col-md-2"><label class="form-label" for="schD2_income_${i}">Income Property? <span class="req">*</span>${tooltip('income_property')}</label><input class="form-check-input" type="checkbox" id="schD2_income_${i}" ${r.income==='Yes'?'checked':''} onchange="D.schD2[${i}].income=(this.checked?'Yes':'No');autoSave()"></div>
        <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD2[${i}].wardPct=this.value`,false,'number')}</div>
        <div class="col-md-3">${inpD('Full Asset Value',r.fullValue,`D.schD2[${i}].fullValue=this.value`,true,'number')}</div>
        <div class="col-md-3">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD2[${i}].carryingValue=this.value`,true,'number')}</div>
        <div class="col-md-3"><label class="form-label">Ward's Value</label><input class="form-control" readonly value="${fmtAnnual(wardVal)}"></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule D-2 — Real Estate and Real Property Assets</h1>
  <div class="schedule-instructions">Include full description, address, all other owners and their relationship to the ward. Values must be as of Ward's Fiscal Year-End.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schD2.push({description:'',residence:'No',income:'No',fullValue:'',wardPct:'',carryingValue:'',wardValue:''});autoSave();navigate('/schd2')">+ Add Property</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td">${fmtAnnual(t.schD2_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Value Total</strong></div><div class="td"><strong>${fmtAnnual(t.schD2_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD2')}
  ${pageNavAnnual('/schd1','/schd3')}
  </div>`;
}

// ── Schedule D-3 — Personal Property ─────────────────────
function pageSchD3Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schD3.forEach((r,i)=>{
    const wardAmt=n(r.fullAmount)*pct(r.wardPct);
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schD3',${i},'/schd3')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schD3.splice(${i},1);autoSave();navigate('/schd3')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-6">${inpD('Description / Location / Owners',r.description,`D.schD3[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD3[${i}].fullAmount=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD3[${i}].wardPct=this.value`,false,'number')}</div>
        <div class="col-md-2">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD3[${i}].carryingValue=this.value`,true,'number')}</div>
        <div class="col-md-2"><label class="form-label">Ward's Amount</label><input class="form-control" readonly value="${fmtAnnual(wardAmt)}"></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule D-3 — Personal Property Assets</h1>
  <div class="schedule-instructions">Include vehicles, clothing, furniture, electronics, jewelry, burial/cemetery plot. All values must be Fair Market Value as of end of Reporting Period. If no personal property, attach explanation.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schD3.push({description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''});autoSave();navigate('/schd3')">+ Add Property</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td">${fmtAnnual(t.schD3_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Amount Total</strong></div><div class="td"><strong>${fmtAnnual(t.schD3_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD3')}
  ${pageNavAnnual('/schd2','/schd4')}
  </div>`;
}

// ── Schedule D-4 — Intangible Assets ─────────────────────
function pageSchD4Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schD4.forEach((r,i)=>{
    const wardVal=n(r.fullAmount)*pct(r.wardPct);
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schD4',${i},'/schd4')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schD4.splice(${i},1);autoSave();navigate('/schd4')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description (stocks, annuities, policies, notes…)',r.description,`D.schD4[${i}].description=this.value`,true)}</div>
        <div class="col-md-2"><label class="form-label" for="schD4_restricted_${i}">Restricted? <span class="req">*</span>${tooltip('restricted')}</label><input class="form-check-input" type="checkbox" id="schD4_restricted_${i}" ${r.restricted==='Yes'?'checked':''} onchange="D.schD4[${i}].restricted=(this.checked?'Yes':'No');autoSave()"></div>
        <div class="col-md-2">${inpD('Full Asset Amount',r.fullAmount,`D.schD4[${i}].fullAmount=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpDWithTooltip("Ward's % ",'ward_pct',r.wardPct,`D.schD4[${i}].wardPct=this.value`,false,'number')}</div>
        <div class="col-md-2">${inpDWithTooltip('Carrying Value','carrying_value',r.carryingValue,`D.schD4[${i}].carryingValue=this.value`,true,'number')}</div>
        <div class="col-md-2"><label class="form-label">Ward's Value</label><input class="form-control" readonly value="${fmtAnnual(wardVal)}"></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule D-4 — Intangible Assets</h1>
  <div class="schedule-instructions">Intangibles are assets not physical and not liquid without a Court Order: brokerage accounts, stocks, annuities, prepaid funeral contracts, insurance policies that add value, promissory notes owed to the ward. Attach copies of all statements.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schD4.push({description:'',restricted:'No',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''});autoSave();navigate('/schd4')">+ Add Asset</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Restricted Intangible Assets</div><div class="td">${fmtAnnual(t.schD4_restricted)}</div></div>
    <div class="tr"><div class="td">Carrying Value Total</div><div class="td">${fmtAnnual(t.schD4_carrying)}</div></div>
    <div class="tr"><div class="td"><strong>Ward's Value Total</strong></div><div class="td"><strong>${fmtAnnual(t.schD4_ward)}</strong></div></div>
  </div></div>
  ${renderScheduleDocsSection('schD4')}
  ${pageNavAnnual('/schd3','/schd5')}
  </div>`;
}

// ── Schedule D-5 — Liabilities ───────────────────────────
function pageSchD5Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  let rows='';
  d.schD5.forEach((r,i)=>{
    const wardBal=n(r.fullDebt)*pct(r.wardPct);
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schD5',${i},'/schd5')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schD5.splice(${i},1);autoSave();navigate('/schd5')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Description / Lender / Related Asset',r.description,`D.schD5[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Loan / Account #',r.loanNo,`D.schD5[${i}].loanNo=this.value`,true)}</div>
        <div class="col-md-2"><label class="form-label" for="schD5_loanType_${i}">Type (M/N/L/O) <span class="req">*</span></label><select class="form-select" id="schD5_loanType_${i}" onchange="D.schD5[${i}].loanType=this.value;autoSave()"><option value="">—</option>${LIAB_TYPES.map(lt=>`<option value="${lt}" ${r.loanType===lt?'selected':''}>${lt}</option>`).join('')}</select></div>
        <div class="col-md-2">${inpDWithTooltip('Full Debt Amount','full_debt',r.fullDebt,`D.schD5[${i}].fullDebt=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpDWithTooltip("Ward's %",'ward_pct',r.wardPct,`D.schD5[${i}].wardPct=this.value`,true,'number')}</div>
        <div class="col-md-2"><label class="form-label">Ward's Balance Due</label><input class="form-control" readonly value="${fmtAnnual(wardBal)}"></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule D-5 — Mortgages / Loans / Notes / Other Liabilities</h1>
  <div class="schedule-instructions">Include mortgages, second mortgages, judgment liens, tax liens, credit cards, vehicle loans, unpaid medical/facility bills, promissory notes. Type: M=Mortgage, N=Note, L=Loan, O=Other.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schD5.push({description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''});autoSave();navigate('/schd5')">+ Add Liability</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td"><strong>Schedule D-5 Total — Ward's Balance Due</strong></div><div class="td"><strong>${fmtAnnual(t.schD5_total)}</strong></div></div></div></div>
  ${renderScheduleDocsSection('schD5')}
  ${pageNavAnnual('/schd4','/sche')}
  </div>`;
}

// ── Schedule E — Bank Transfers ──────────────────────────
function pageSchEAnnual(){
  const d=window.D;
  const totalIn=d.schE.reduce((s,r)=>s+n(r.transferInAmt),0);
  const totalOut=d.schE.reduce((s,r)=>s+n(r.transferOutAmt),0);
  let rows='';
  d.schE.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Line ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schE',${i},'/sche')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schE.splice(${i},1);autoSave();navigate('/sche')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-4">${inpD('Bank Name / Account #',r.bankName,`D.schE[${i}].bankName=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Transfer In Date',r.transferInDate,`D.schE[${i}].transferInDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Transfer In Amount',r.transferInAmt,`D.schE[${i}].transferInAmt=this.value`,true,'number')}</div>
        <div class="col-md-2">${inpD('Transfer Out Date',r.transferOutDate,`D.schE[${i}].transferOutDate=this.value`,true,'date')}</div>
        <div class="col-md-2"><label class="form-label">Transfer Out Amt (negative)</label><div class="input-group"><span class="input-group-text">$</span><input type="text" inputmode="decimal" class="form-control" value="${esc(sanitizeDecimal(r.transferOutAmt))}" oninput="this.value=sanitizeDecimal(this.value);D.schE[${i}].transferOutAmt=this.value;autoSave()"></div></div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule E — Bank Transfers During Period</h1>
  <div class="schedule-instructions">Each transfer should be listed twice — once going out and again going into another account. Transfers out should be entered as negative numbers.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schE.push({bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''});autoSave();navigate('/sche')">+ Add Transfer</button>
  <div class="schedule-totals"><div class="tbl">
    <div class="tr"><div class="td">Total Transfers In</div><div class="td">${fmtAnnual(totalIn)}</div></div>
    <div class="tr"><div class="td">Total Transfers Out</div><div class="td">${fmtAnnual(totalOut)}</div></div>
  </div></div>
  ${renderScheduleDocsSection('schE')}
  ${pageNavAnnual('/schd5','/schf1')}
  </div>`;
}

// ── Schedule F-1 — Sales of Real Property ────────────────
function pageSchF1Annual(){
  const d=window.D;
  const total=d.schF1.reduce((s,r)=>s+n(r.salePrice),0);
  let rows='';
  d.schF1.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Sale ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schF1',${i},'/schf1')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schF1.splice(${i},1);autoSave();navigate('/schf1')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description of Sale / Address / Parties',r.description,`D.schF1[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank',r.bank,`D.schF1[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schF1[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Court Order Date',r.courtOrderDate,`D.schF1[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Sale Price',r.salePrice,`D.schF1[${i}].salePrice=this.value`,true,'number')}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule F-1 — Sales of Real Property During Period</h1>
  <div class="schedule-instructions">Attach a copy of the closing statement. Gains or losses from the sale should also be noted in Schedule C. Provide the court order date approving the sale.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schF1.push({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''});autoSave();navigate('/schf1')">+ Add Sale</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule F-1 Total — Sales of Real Property</div><div class="td">${fmtAnnual(total)}</div></div></div></div>
  ${renderScheduleDocsSection('schF1')}
  ${pageNavAnnual('/sche','/schf2')}
  </div>`;
}

// ── Schedule F-2 — Sales of Personal Property ────────────
function pageSchF2Annual(){
  const d=window.D;
  const total=d.schF2.reduce((s,r)=>s+n(r.salePrice),0);
  let rows='';
  d.schF2.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Sale ${i+1} <button class="btn btn-sm btn-outline-secondary ms-auto" title="Add a copy of this line below" onclick="duplicateAnnualRow('schF2',${i},'/schf2')">${ic('copy',13)}</button><button class="btn btn-sm btn-outline-danger" onclick="D.schF2.splice(${i},1);autoSave();navigate('/schf2')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-5">${inpD('Description of Sale / Purchaser / Agent',r.description,`D.schF2[${i}].description=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Bank',r.bank,`D.schF2[${i}].bank=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Account #',r.accountNo,`D.schF2[${i}].accountNo=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Court Order Date',r.courtOrderDate,`D.schF2[${i}].courtOrderDate=this.value`,true,'date')}</div>
        <div class="col-md-2">${inpD('Sale Price',r.salePrice,`D.schF2[${i}].salePrice=this.value`,true,'number')}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Schedule F-2 — Sales of Personal Property During Period</h1>
  <div class="schedule-instructions">Gains or losses from the sale of personal property should also be noted in Schedule C. Attach proof of proceeds deposited.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-2" onclick="D.schF2.push({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''});autoSave();navigate('/schf2')">+ Add Sale</button>
  <div class="schedule-totals"><div class="tbl"><div class="tr"><div class="td">Schedule F-2 Total — Sales of Personal Property</div><div class="td">${fmtAnnual(total)}</div></div></div></div>
  ${renderScheduleDocsSection('schF2')}
  ${pageNavAnnual('/schf1','/p67')}
  </div>`;
}

// ── Parts VI & VII — Summary ──────────────────────────────
function pagePart67Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Parts VI &amp; VII — Summary</h1>
  <div class="schedule-instructions">This page is auto-calculated from all schedules. Net Assets from Changes (Part VI, below) should equal Net Assets from Balances (Part VII, below). If they differ, verify individual schedules.</div>
  <div class="summary-box">
    <h2 class="subsection-heading">Part VI — Changes in Net Assets</h2>
    <div class="summary-line"><span>Starting Balance (Net Assets per Prior Report)</span><span>${fmtAnnual(d.startingBalance)}</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/scha');return false">Schedule A — Income/Receipts</a></span><span>${fmtAnnual(t.schA)}</span></div>
    <div style="padding:.1rem 0;font-size:.7rem;color:var(--ink-3);font-style:italic;">Disbursements:</div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schb1');return false">Schedule B-1 — Attorney Fees</a></span><span>(${fmtAnnual(t.schB1)})</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schb2');return false">Schedule B-2 — Guardian Fees</a></span><span>(${fmtAnnual(t.schB2)})</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schb3');return false">Schedule B-3 — Court-Ordered Disb.</a></span><span>(${fmtAnnual(t.schB3)})</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schb4');return false">Schedule B-4 — All Other Disb.</a></span><span>(${fmtAnnual(t.schB4)})</span></div>
    <div class="summary-line total"><span>Total Disbursements</span><span>(${fmtAnnual(t.totalDisb)})</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schc');return false">Schedule C — Capital Adj. Net</a></span><span>${fmtAnnual(t.schC_net)}</span></div>
    <div class="summary-line grand"><span>Line 20 — Net Assets at End of Period</span><span>${fmtAnnual(t.netAssets)}</span></div>
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Part VII — Assets &amp; Liabilities at End of Period</h2>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schd1');return false">Schedule D-1 — Cash Assets</a></span><span>${fmtAnnual(t.schD1_total)}</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schd2');return false">Schedule D-2 — Real Estate (Ward's Value)</a></span><span>${fmtAnnual(t.schD2_ward)}</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schd3');return false">Schedule D-3 — Personal Property (Ward's Amount)</a></span><span>${fmtAnnual(t.schD3_ward)}</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schd4');return false">Schedule D-4 — Intangibles (Ward's Value)</a></span><span>${fmtAnnual(t.schD4_ward)}</span></div>
    <div class="summary-line"><span><a href="#" onclick="navigate('/schd5');return false">Schedule D-5 — Liabilities (Ward's Balance)</a></span><span>(${fmtAnnual(t.schD5_total)})</span></div>
    <div class="summary-line grand"><span>Line 30 — Net Assets at End of Period</span><span>${fmtAnnual(t.netAssetsFromD)}</span></div>
  </div>
  ${reconcileBlockAnnual(t)}
  ${pageNavAnnual('/schf2','/p8')}
  </div>`;
}

// Line 20 must equal Line 30. Returns true once the guardian has actually
// entered figures and the two disagree by more than a cent — an untouched
// form balances trivially at 0 = 0 and is not a discrepancy.
function annualReconcileState(t){
  const totals=t||calcTotalsAnnual();
  const diff=totals.netAssets-totals.netAssetsFromD;
  const hasFigures=[totals.netAssets,totals.netAssetsFromD].some(v=>Math.abs(v)>0.005);
  const outOfBalance=hasFigures&&Math.abs(diff)>0.01;
  const explanation=String((window.D&&window.D.reconcileExplanation)||'').trim();
  return {diff,outOfBalance,explanation,explained:outOfBalance&&explanation.length>0};
}

// The reconciliation panel on Parts VI & VII. When the two lines agree it
// simply confirms that. When they don't, it states the difference and
// requires a written explanation — that text is carried onto the exported
// document, so the discrepancy is disclosed rather than hidden.
function reconcileBlockAnnual(t){
  const st=annualReconcileState(t);
  if(!st.outOfBalance){
    return `<div class="alert alert-success mt-2" style="font-size:.8rem;">&#10003; Net Assets from Changes (${fmtAnnual(t.netAssets)}) equals Net Assets from Balances (${fmtAnnual(t.netAssetsFromD)}) — the accounting balances.</div>`;
  }
  return `<div class="alert alert-warning mt-2" style="font-size:.8rem;">
    &#9888; <strong>Net Assets from Changes (${fmtAnnual(t.netAssets)}) does not equal Net Assets from Balances (${fmtAnnual(t.netAssetsFromD)}).</strong>
    Difference: ${fmtAnnual(st.diff)}.
    Check your schedules first — most differences are a missing or mistyped entry.
    If the difference is correct as filed, explain it below; an explanation is required before you can export.
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Explanation of Difference<span class="req">*</span></h2>
    <textarea class="form-control" rows="4" id="reconcile-explanation"
      placeholder="Explain why Net Assets from Changes and Net Assets from Balances differ (for example: a correcting entry from a prior period, or an asset discovered after the period closed)."
      oninput="D.reconcileExplanation=this.value;autoSave();updateNavDots();"
      >${esc(st.explanation)}</textarea>
    <div style="font-size:.78rem;color:var(--ink-3);margin-top:.35rem;">This explanation is included on the exported document.</div>
  </div>`;
}

// ── Part VIII — Trusts ────────────────────────────────────
function pagePart8Annual(){
  const d=window.D;
  const hasTrusts=d.trusts[0]&&d.trusts[0].hasTrust==='Yes';
  let html=`<div class="schedule-page">
  <h1>Part VIII — Trust Information</h1>
  <div class="schedule-instructions">If a trust was created after the Guardianship Inception Date, you MUST file a separate trust accounting for that trust.</div>
  <div class="row g-2 mb-3">
    <div class="col-md-4">${yesNoCheckboxD('#1. Does the Ward have one or more Trusts?',d.trusts[0]&&d.trusts[0].hasTrust||'No',"D.trusts[0].hasTrust=this.value;autoSave();navigate('/p8')")}</div>
  </div>`;
  ['Trust 1','Trust 2','Trust 3'].forEach((label,i)=>{
    const t=d.trusts[i];
    html+=`<div class="entry-card mb-2">
      <div class="entry-card-header">${label}</div>
      <div class="entry-card-body">
        <div class="row g-2">
          <div class="col-md-4">${yesNoCheckboxD(`Was ${label} created after the GID?`,t.createdAfterGID,`D.trusts[${i}].createdAfterGID=this.value;autoSave()`)}</div>
          <div class="col-md-4">${inpD('Name of the Trust',t.name,`D.trusts[${i}].name=this.value`,true)}</div>
          <div class="col-md-4">${inpD('Name of the Trustee',t.trustee,`D.trusts[${i}].trustee=this.value`,true)}</div>
          <div class="col-md-3">${inpD('Trustee Account Number',t.accountNo,`D.trusts[${i}].accountNo=this.value`,true)}</div>
          <div class="col-md-3">${inpD('Date Trust Created',t.dateCreated,`D.trusts[${i}].dateCreated=this.value`,true,'date')}</div>
          <div class="col-md-3">${inpD('Type of Trust',t.trustType,`D.trusts[${i}].trustType=this.value`,true)}</div>
          <div class="col-md-1">${inpDWithTooltip("Ward's %",'ward_pct',t.wardPct,`D.trusts[${i}].wardPct=this.value`,false,'number')}</div>
          <div class="col-md-2">${inpD('Amount (Ward\'s Interest)',t.wardAmount,`D.trusts[${i}].wardAmount=this.value`,false,'number')}</div>
        </div>
      </div>
    </div>`;
  });
  html+=`${pageNavAnnual('/p67','/p9')}</div>`;
  return html;
}

// ── Part IX — Other Info / Bond ───────────────────────────
function pagePart9Annual(){
  const d=window.D; const t=calcTotalsAnnual();
  return `<div class="schedule-page">
  <h1>Part IX — Other Information &amp; Bond Calculation</h1>
  <div class="row g-2 mb-3">
    <div class="col-md-5">${selD("Guardian's Relationship to the Ward",d.guardianRelationship,"D.guardianRelationship=this.value",GUARDIAN_REL)}</div>
    <div class="col-md-4">${inpD('Date of Most Recent Restricted Depository Receipt',d.restrictedDepositoryReceiptDate,"D.restrictedDepositoryReceiptDate=this.value",false,'date')}</div>
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Bond Calculation (auto-calculated)</h2>
    <div class="summary-line"><span>Sch D-1 — Cash Assets in Restricted Depository</span><span>${fmtAnnual(t.schD1_restricted)}</span></div>
    <div class="summary-line"><span>Sch D-4 — Intangible Assets RESTRICTED</span><span>${fmtAnnual(t.schD4_restricted)}</span></div>
    <div class="summary-line"><span>Sch D-1 — Cash Assets NOT in Restricted Depository</span><span>${fmtAnnual(t.schD1_total-t.schD1_restricted)}</span></div>
    <div class="summary-line"><span>Sch D-3 — Personal Property Assets</span><span>${fmtAnnual(t.schD3_ward)}</span></div>
    <div class="summary-line"><span>Sch D-4 — Intangible Assets (Unrestricted)</span><span>${fmtAnnual(t.schD4_ward-t.schD4_restricted)}</span></div>
    <div class="summary-line total"><span>Total for BOND REQUIREMENT</span><span>${fmtAnnual(t.bondReq)}</span></div>
  </div>
  <div class="row g-2 mt-2">
    <div class="col-md-3">${inpD('Bond Amount',d.bondAmount,"D.bondAmount=this.value",false,'number')}</div>
    <div class="col-md-3">${inpD('Bond Period From',d.bondPeriodFrom,"D.bondPeriodFrom=this.value",false,'date')}</div>
    <div class="col-md-3">${inpD('Bond Period To',d.bondPeriodTo,"D.bondPeriodTo=this.value",false,'date')}</div>
    <div class="col-md-3">${inpD('Name of Bonding Company',d.bondingCompany,"D.bondingCompany=this.value")}</div>
  </div>
  ${pageNavAnnual('/p8','/p10')}
  </div>`;
}

// ── Part X — Certificate of Service ──────────────────────
function pagePart10Annual(){
  const d=window.D;
  function recipCard(i){
    const r=d.certRecipients[i];
    return `<div class="entry-card mb-2">
      <div class="entry-card-header">Recipient ${i+1}</div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-12">${inpD('Name',r.name,`D.certRecipients[${i}].name=this.value`,true)}</div>
        <div class="col-12">${inpD('Line 2',r.line2,`D.certRecipients[${i}].line2=this.value`,true)}</div>
        <div class="col-12">${inpD('Line 3',r.line3,`D.certRecipients[${i}].line3=this.value`,true)}</div>
        <div class="col-12">${inpD('Line 4',r.line4,`D.certRecipients[${i}].line4=this.value`,true)}</div>
      </div></div>
    </div>`;
  }
  return `<div class="schedule-page">
  <h1>Part X — Guardian Attorney Certificate of Service</h1>
  <div class="schedule-instructions">Pursuant to Florida Statute 744.367(4), I hereby certify that a copy of this accounting has been furnished to the recipients listed below.</div>
  <div class="row g-2 mb-3">
    <div class="col-md-4">${inpD('Date of Service',d.certDate,"D.certDate=this.value",false,'date')}</div>
    <div class="col-md-6">${inpD('Indicate if (e.g. hand-delivered, mailed)',d.certIndicator,"D.certIndicator=this.value")}</div>
    <div class="col-12"><div style="color:var(--danger-text);font-size:.75rem;font-weight:600;margin-top:.25rem;">* Recipient 1 name is required</div></div>
  </div>
  <div class="row g-2">
    <div class="col-md-6">${recipCard(0)}</div>
    <div class="col-md-6">${recipCard(1)}</div>
    <div class="col-md-6">${recipCard(2)}</div>
    <div class="col-md-6">${recipCard(3)}</div>
  </div>
  <h2 class="mt-3" style="font-size:.8rem;font-weight:700;">Attorney Signature</h2>
  <div class="row g-2">
    <div class="col-md-5">${inpD('Attorney Name',d.attorney,"D.attorney=this.value")}</div>
    <div class="col-md-3">${inpDWithTooltip('Signature Date','signature_date',d.certAttySignDate,"D.certAttySignDate=this.value",false,'date')}</div>
    <div class="col-md-4">${inpD('Bar Number',d.attorney_bar,"D.attorney_bar=this.value")}</div>
    <div class="col-md-4">${inpD('Phone Number',d.attorney_phone,"D.attorney_phone=this.value")}</div>
    <div class="col-md-8">${inpD('Street Address',d.attorney_street,"D.attorney_street=this.value")}</div>
    <div class="col-12">${inpD('City / State / Zip Code',d.attorney_cityStateZip,"D.attorney_cityStateZip=this.value")}</div>
  </div>
  ${pageNavAnnual('/p9','/p11')}
  </div>`;
}

// ── Part XI — Remuneration ────────────────────────────────
function pagePart11Annual(){
  const d=window.D;
  let rows='';
  d.remuneration.forEach((r,i)=>{
    rows+=`<div class="entry-card mb-2">
      <div class="entry-card-header">Entry ${i+1} <button class="btn btn-sm btn-outline-danger ms-auto" onclick="D.remuneration.splice(${i},1);autoSave();navigate('/p11')">×</button></div>
      <div class="entry-card-body"><div class="row g-2">
        <div class="col-md-3">${inpD('Guardian Name',r.guardian,`D.remuneration[${i}].guardian=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Type',r.type,`D.remuneration[${i}].type=this.value`,true)}</div>
        <div class="col-md-2">${inpD('Amount',r.amount,`D.remuneration[${i}].amount=this.value`,true,'number')}</div>
        <div class="col-md-5">${inpD('Description',r.description,`D.remuneration[${i}].description=this.value`,true)}</div>
      </div></div>
    </div>`;
  });
  return `<div class="schedule-page">
  <h1>Part XI — Guardian(s) Declaration of Remuneration</h1>
  <div class="schedule-instructions">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward. "Remuneration" means any payment or other benefit made directly or indirectly, overtly or covertly, or in cash or in kind to the guardian.</div>
  ${rows}
  <button class="btn btn-outline-primary btn-sm mb-3" onclick="D.remuneration.push({guardian:'',type:'',amount:'',description:''});autoSave();navigate('/p11')">+ Add Entry</button>
  ${pageNavAnnual('/p10','/print')}
  </div>`;
}


function docHdr(ward,caseNo,section,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county)}</div>
    <div class="doc-title">${esc(formDisplayName(window.D.inventoryType||activeInventoryType).toUpperCase())}</div>
    <div class="doc-meta">
      <span>Name of Ward: <strong>${esc(ward)}</strong></span>
      <span>${section}${page?' — Page '+page:''}</span>
      <span>Case Number: <strong>${esc(caseNo)}</strong></span>
    </div>
  </div>`;
}
function sl(label,val){return td(label,val);}
function slR(label,val){return tdR(label,val);}

function buildPrintHTMLAnnual(){
  const d=window.D; const t=calcTotalsAnnual();
  const W=esc(d.wardName); const CN=esc(d.caseNumber);
  let html='';

  // ── Page 1: Parts I & II ──────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Summary','1')}
  <div class="doc-schedule-title">Part I — REQUIRED INFORMATION</div>
  <div class="doc-table-div mb-2">
    ${sl('IN RE: GUARDIANSHIP OF',esc(d.wardName))} ${sl('Case Number',esc(d.caseNumber))}
    ${sl('For the Period',`From: ${fmtD(d.periodFrom)} &nbsp;&nbsp; To: ${fmtD(d.periodTo)}`)}
    ${sl('Guardian',esc(d.guardian))} ${sl('Attorney for Guardian',esc(d.attorney))}
    ${sl('Type of Guardianship',esc(d.typeOfGuardianship))} ${sl('County',esc(d.county))}
    ${sl('Filing Type',esc(d.filingType))} ${sl('Amended Form?',esc(d.amendedForm))}
    ${d.relatedCaseNumbers?sl('Related Case Numbers',esc(d.relatedCaseNumbers)):''}
  </div>
  <div class="doc-schedule-title">Part II — GUARDIAN CERTIFICATION &amp; AUDIT FEE</div>
  <p style="font-size:.75rem;font-style:italic;margin-bottom:.4rem">The undersigned guardian certifies that said guardian has obtained a receipt or canceled check for all expenditures and disbursements made on behalf of the ward, which said guardian will preserve along with other substantiating papers for a three (3) year period after discharge.</p>
  <div class="doc-table-div mb-2">
    ${slR('Annual Accounting Estates with value of $25,000 or less','$20.00')}
    ${slR('From $25,000.01 up to and including $100,000','$85.00')}
    ${slR('From $100,000.01 up to and including $500,000','$170.00')}
    ${slR('In excess of $500,000','$250.00')}
    <div class="tr total-row"><div class="td">Applicable Audit Fee (total assets: ${fmtAnnual(t.netAssetsFromD)})</div><div class="td right"><strong>${t.auditFee.toFixed(2)}</strong></div></div>
  </div>
  </div>`;

  // ── Page 2: Parts VI & VII Summary ───────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Summary','2')}
  <div class="doc-schedule-title">Part VI — Changes in Net Assets</div>
  <div class="doc-table-div mb-2">
    ${slR('Starting Balance [Net Assets per Prior Report]',fmtAnnual(d.startingBalance))}
    ${slR('Schedule A — Income/Receipts',fmtAnnual(t.schA))}
    ${slR('Schedule B-1 — Attorney Fees and Costs',`(${fmtAnnual(t.schB1)})`)}
    ${slR('Schedule B-2 — Guardian Fees and Costs',`(${fmtAnnual(t.schB2)})`)}
    ${slR('Schedule B-3 — Other Court-Ordered Disbursements',`(${fmtAnnual(t.schB3)})`)}
    ${slR('Schedule B-4 — All Other Disbursements',`(${fmtAnnual(t.schB4)})`)}
    <div class="tr total-row"><div class="td">Total Disbursements</div><div class="td right">(${fmtAnnual(t.totalDisb)})</div></div>
    ${slR('Schedule C — Capital Adjustments Net',fmtAnnual(t.schC_net))}
    <div class="tr total-row"><div class="td">Line 20 — Net Assets at End of Accounting Period</div><div class="td right">${fmtAnnual(t.netAssets)}</div></div>
  </div>
  <div class="doc-schedule-title">Part VII — Assets &amp; Liabilities at End of Period</div>
  <div class="doc-table-div">
    ${slR('Schedule D-1 — Cash Assets',fmtAnnual(t.schD1_total))}
    ${slR('Schedule D-2 — Real Estate (Carrying / Ward Value)',`${fmtAnnual(t.schD2_carrying)} / ${fmtAnnual(t.schD2_ward)}`)}
    ${slR('Schedule D-3 — Personal Property (Carrying / Ward Amt)',`${fmtAnnual(t.schD3_carrying)} / ${fmtAnnual(t.schD3_ward)}`)}
    ${slR('Schedule D-4 — Intangible Assets (Carrying / Ward Value)',`${fmtAnnual(t.schD4_carrying)} / ${fmtAnnual(t.schD4_ward)}`)}
    ${slR('Schedule D-5 — Mortgages / Liabilities',`(${fmtAnnual(t.schD5_total)})`)}
    <div class="tr total-row"><div class="td">Line 30 — Net Assets at End of Accounting Period</div><div class="td right">${fmtAnnual(t.netAssetsFromD)}</div></div>
  </div>
  ${(()=>{const r=annualReconcileState(t);
    if(!r.outOfBalance)return '';
    // Disclose the difference on the filed document rather than printing two
    // totals that silently disagree.
    return `<div class="doc-section-block" style="margin-top:.5rem;">
      <div class="doc-schedule-title">Explanation of Difference Between Line 20 and Line 30</div>
      <div style="font-size:.75rem;">Difference: ${fmtAnnual(r.diff)}</div>
      <div style="font-size:.75rem;white-space:pre-wrap;margin-top:.2rem;">${esc(r.explanation)}</div>
    </div>`;})()}
  </div>`;

  // ── Page 3: Part III — Guardian Declarations ──────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part III','3')}
  <div class="doc-schedule-title">Part III — GUARDIAN(S) SIGNATURE &amp; DECLARATION</div>
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read and examined the foregoing return and that, to the best of my knowledge and belief, it constitutes a full and correct account of all the ward's property of which this guardian has control, and is a complete report of all cash and property transactions and of all receipts and any disbursements by me from <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>.</div>
  ${d.guardians.filter(g=>g.name).map((g,i)=>{const gLabel=['Guardian #1','Co-Guardian #2','Co-Guardian #3'][i];return `
    <div class="doc-signature-block mb-4">
      <div class="row">
        <div class="col-6"><div class="doc-field-label">${gLabel}'s Signature</div><div class="doc-signature-line"></div></div>
        <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(g.signatureDate)}</div></div>
        <div class="col-3"><div class="doc-field-label">${gLabel}'s Name</div><div class="doc-signature-line">${esc(g.name)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(g.ssn)}</div></div>
        <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(g.phone)}</div></div>
        <div class="col-4"><div class="doc-field-label">Mailing Street</div><div class="doc-signature-line">${esc(g.mailingStreet)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Email</div><div class="doc-signature-line">${esc(g.email)}</div></div>
        <div class="col-6"><div class="doc-field-label">Mailing City / State / Zip</div><div class="doc-signature-line">${esc(g.mailingCityStateZip)}</div></div>
      </div>
      <div class="row mt-2">
        <div class="col-6"><div class="doc-field-label">Residence / Office Street</div><div class="doc-signature-line">${esc(g.officeStreet)}</div></div>
        <div class="col-6"><div class="doc-field-label">Residence / Office City / State / Zip</div><div class="doc-signature-line">${esc(g.officeCityStateZip)}</div></div>
      </div>
    </div>`;}).join('')}
  </div>`;

  // ── Page 4: Parts IV & V ──────────────────────────────
  const p=d.preparer;
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part IV','4')}
  <div class="doc-schedule-title">Part IV — PREPARER ATTESTATION</div>
  <div class="attestation-text">I have compiled the accompanying Annual Accounting of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of <strong>${W}</strong> for the period <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>. This compilation is limited to presenting information in the form of an Annual Accounting and is the representation of the guardian. I have not audited or reviewed the accompanying guardianship accounting and, accordingly, do not express an opinion or any other form of assurance on it.</div>
  <p style="font-size:.76rem;color:var(--danger-text);font-weight:700;margin-bottom:.75rem;">If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.</p>
  <div class="doc-signature-block mb-4">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Preparer's Signature</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(p.signatureDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">Preparer's Name</div><div class="doc-signature-line">${esc(p.name)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(p.ssn)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(p.phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(p.street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(p.cityStateZip)}</div></div>
    </div>
  </div>
  <div class="doc-schedule-title">Part V — GUARDIAN ATTORNEY SIGNATURE</div>
  <div class="attestation-text">The undersigned Attorney hereby notifies the Court of the filing of the annual guardianship accounting of the Guardian <strong>${W}</strong> for the period <strong>${fmtD(d.periodFrom)}</strong> through <strong>${fmtD(d.periodTo)}</strong>. This annual accounting is the representation of the guardian. The undersigned attorney represents that he/she has examined the contents of the accounting and that it conforms to the requirements of the Florida Guardianship Law and the standards for accountings in <strong>${esc(d.attorney_county||d.county)}</strong> County, Florida.</div>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(d.attorney_signatureDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(d.attorney)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(d.attorney_bar)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(d.attorney_phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(d.attorney_street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(d.attorney_cityStateZip)}</div></div>
    </div>
  </div>
  </div>`;

  // ── Schedule A ────────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule A','1')}
  <div class="doc-schedule-title">SCHEDULE A: Income Received During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule A: Income Received During Period</caption>
    <thead><tr><th>#</th><th>Income Source / Payer</th><th>Description</th><th>Bank</th><th>Account #</th><th class="right">Ward's Income Amount</th></tr></thead>
    <tbody>${d.schA.length?d.schA.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.payer)}</td><td>${esc(r.description)}</td><td>${esc(r.bank)}</td><td>${esc(r.accountNo)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--ink-3);font-style:italic">No income entries</td></tr>'}
    <tr class="total-row"><td colspan="5">Schedule A Total — Income/Receipts Received During Period</td><td class="right">${fmtAnnual(t.schA)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule B-1 ──────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule B-1','1')}
  <div class="doc-schedule-title">SCHEDULE B-1: Attorney Fees and Costs During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-1: Attorney Fees and Costs During Period</caption>
    <thead><tr><th>#</th><th>Bank Acct #</th><th>Check #</th><th>Period From</th><th>Period To</th><th>Date Paid</th><th>Payee</th><th>Court Order</th><th class="right">Amount</th></tr></thead>
    <tbody>${d.schB1.length?d.schB1.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankAcct)}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.periodFrom)}</td><td>${fmtD(r.periodTo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.payee)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="9" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="8">Schedule B-1 Total</td><td class="right">${fmtAnnual(t.schB1)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-2: Guardian Fees and Costs During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-2: Guardian Fees and Costs During Period</caption>
    <thead><tr><th>#</th><th>Bank Acct #</th><th>Check #</th><th>Period From</th><th>Period To</th><th>Date Paid</th><th>Payee</th><th>Court Order</th><th class="right">Amount</th></tr></thead>
    <tbody>${d.schB2.length?d.schB2.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankAcct)}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.periodFrom)}</td><td>${fmtD(r.periodTo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.payee)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="9" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="8">Schedule B-2 Total</td><td class="right">${fmtAnnual(t.schB2)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-3: Other Court-Ordered Disbursements During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-3: Other Court-Ordered Disbursements During Period</caption>
    <thead><tr><th>#</th><th>Bank Acct #</th><th>Check #</th><th>Date Paid</th><th>Payee</th><th>Court Order Date</th><th class="right">Amount</th></tr></thead>
    <tbody>${d.schB3.length?d.schB3.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankAcct)}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.payee)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Schedule B-3 Total</td><td class="right">${fmtAnnual(t.schB3)}</td></tr>
    </tbody>
  </table>
  ${(()=>{const cats={};DISB_CATS.forEach(c=>cats[c]=0);d.schB4.forEach(r=>{if(r.category&&cats[r.category]!==undefined)cats[r.category]+=n(r.amount);});window._b4cats=cats;return'';})()}
  <div class="doc-schedule-title mt-3">SCHEDULE B-4: All Other Disbursements — Summary by Category</div>
  <table class="doc-table mb-2">
    <caption class="visually-hidden">Schedule B-4: All Other Disbursements — Summary by Category</caption>
    <thead><tr><th>#</th><th>Category</th><th class="right">Amount</th></tr></thead>
    <tbody>${DISB_CATS.map((c,i)=>`<tr><td>${i+1}</td><td>${c}</td><td class="right">${window._b4cats[c]>0?fmtAnnual(window._b4cats[c]):'—'}</td></tr>`).join('')}
    <tr class="total-row"><td colspan="2">All Other Disbursements Total</td><td class="right">${fmtAnnual(t.schB4)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule B-4 Detail ───────────────────────────────
  if(d.schB4.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule B-4','2')}
    <div class="doc-schedule-title">SCHEDULE B-4: All Other Disbursements — Check Register</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule B-4: All Other Disbursements — Check Register</caption>
      <thead><tr><th>#</th><th>Check #</th><th>Date Paid</th><th>Category</th><th>Payee</th><th class="right">Amount</th></tr></thead>
      <tbody>${d.schB4.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.checkNo)}</td><td>${fmtD(r.datePaid)}</td><td>${esc(r.category)}</td><td>${esc(r.payee)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="5">Schedule B-4 Total</td><td class="right">${fmtAnnual(t.schB4)}</td></tr>
      </tbody>
    </table>
    </div>`;
  }

  // ── Schedule C ────────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule C','1')}
  <div class="doc-schedule-title">SCHEDULE C: Capital Adjustments During Period</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C: Capital Adjustments During Period</caption>
    <thead><tr><th>#</th><th>Description</th><th>Date</th><th class="right">Gain / Addition</th><th class="right">Loss / Reduction</th></tr></thead>
    <tbody>${d.schC.length?d.schC.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${fmtD(r.date)}</td><td class="right">${r.gain?fmtAnnual(r.gain):'—'}</td><td class="right" style="color:${n(r.loss)<0?'var(--danger-text)':''}">${r.loss?fmtAnnual(r.loss):'—'}</td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="3">Capital Adjustments Net (Gains + Losses)</td><td class="right">${fmtAnnual(t.schC_gains)}</td><td class="right" style="color:${t.schC_losses<0?'var(--danger-text)':''}">${fmtAnnual(t.schC_losses)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule D-1 ──────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule D-1','1')}
  <div class="doc-schedule-title">SCHEDULE D-1: Cash Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-1: Cash Assets</caption>
    <thead><tr><th>#</th><th>Description</th><th>Account #</th><th>Restricted?</th><th>Type</th><th class="right">Full Amount</th><th class="right">Ward's %</th><th class="right">Ward's Amount</th></tr></thead>
    <tbody>${d.schD1.length?d.schD1.map((r,i)=>{const wa=n(r.fullAmount)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.accountNo)}</td><td>${esc(r.restricted)}</td><td>${esc(r.type)}</td><td class="right">${fmtAnnual(r.fullAmount)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(wa)}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Cash Assets — Restricted Depository</td><td colspan="2" style="text-align:right">${fmtAnnual(t.schD1_restricted)}</td></tr>
    <tr class="total-row"><td colspan="6">Cash Assets Total (Ward's Amount)</td><td colspan="2" style="text-align:right">${fmtAnnual(t.schD1_total)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-2: Real Estate and Real Property Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-2: Real Estate and Real Property Assets</caption>
    <thead><tr><th>#</th><th>Description / Address</th><th>Residence?</th><th>Income?</th><th class="right">Full Value</th><th class="right">Ward's %</th><th class="right">Carrying Value</th><th class="right">Ward's Value</th></tr></thead>
    <tbody>${d.schD2.length?d.schD2.map((r,i)=>{const wv=n(r.fullValue)*pct(r.wardPct);const cv=n(r.carryingValue)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.residence)}</td><td>${esc(r.income)}</td><td class="right">${fmtAnnual(r.fullValue)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(cv)}</td><td class="right">${fmtAnnual(wv)}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Totals</td><td class="right">${fmtAnnual(t.schD2_carrying)}</td><td class="right">${fmtAnnual(t.schD2_ward)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-3: Personal Property Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-3: Personal Property Assets</caption>
    <thead><tr><th>#</th><th>Description / Location</th><th class="right">Full Amount</th><th class="right">Ward's %</th><th class="right">Carrying Value</th><th class="right">Ward's Amount</th></tr></thead>
    <tbody>${d.schD3.length?d.schD3.map((r,i)=>{const wa=n(r.fullAmount)*pct(r.wardPct);const cv=n(r.carryingValue)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td class="right">${fmtAnnual(r.fullAmount)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(cv)}</td><td class="right">${fmtAnnual(wa)}</td></tr>`;}).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="4">Totals</td><td class="right">${fmtAnnual(t.schD3_carrying)}</td><td class="right">${fmtAnnual(t.schD3_ward)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-4: Intangible Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-4: Intangible Assets</caption>
    <thead><tr><th>#</th><th>Description</th><th>Restricted?</th><th class="right">Full Amount</th><th class="right">Ward's %</th><th class="right">Carrying Value</th><th class="right">Ward's Value</th><th class="right">Restricted Amt</th></tr></thead>
    <tbody>${d.schD4.length?d.schD4.map((r,i)=>{const wv=n(r.fullAmount)*pct(r.wardPct);const cv=n(r.carryingValue)*pct(r.wardPct);const ra=r.restricted==='Yes'?cv:0;return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.restricted)}</td><td class="right">${fmtAnnual(r.fullAmount)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(cv)}</td><td class="right">${fmtAnnual(wv)}</td><td class="right">${ra>0?fmtAnnual(ra):'—'}</td></tr>`;}).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="5">Totals</td><td class="right">${fmtAnnual(t.schD4_carrying)}</td><td class="right">${fmtAnnual(t.schD4_ward)}</td><td class="right">${fmtAnnual(t.schD4_restricted)}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE D-5: Mortgages / Loans / Notes / Other Liabilities</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule D-5: Mortgages / Loans / Notes / Other Liabilities</caption>
    <thead><tr><th>#</th><th>Description / Lender</th><th>Loan/Acct #</th><th>Type</th><th class="right">Full Debt</th><th class="right">Ward's %</th><th class="right">Ward's Balance</th></tr></thead>
    <tbody>${d.schD5.length?d.schD5.map((r,i)=>{const wb=n(r.fullDebt)*pct(r.wardPct);return`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.loanNo)}</td><td>${esc(r.loanType)}</td><td class="right">${fmtAnnual(r.fullDebt)}</td><td class="right">${r.wardPct}</td><td class="right">${fmtAnnual(wb)}</td></tr>`;}).join(''):'<tr><td colspan="7" style="text-align:center;color:var(--ink-3);font-style:italic">No entries</td></tr>'}
    <tr class="total-row"><td colspan="6">Schedule D-5 Total — Ward's Balance Due</td><td class="right">${fmtAnnual(t.schD5_total)}</td></tr>
    </tbody>
  </table>
  </div>`;

  // ── Schedule E ────────────────────────────────────────
  if(d.schE.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule E','1')}
    <div class="doc-schedule-title">SCHEDULE E: Bank Transfers During Period</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule E: Bank Transfers During Period</caption>
      <thead><tr><th>#</th><th>Bank Name / Account #</th><th>Transfer In Date</th><th class="right">Transfer In Amt</th><th>Transfer Out Date</th><th class="right">Transfer Out Amt</th></tr></thead>
      <tbody>${d.schE.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.bankName)}</td><td>${fmtD(r.transferInDate)}</td><td class="right">${r.transferInAmt?fmtAnnual(r.transferInAmt):'—'}</td><td>${fmtD(r.transferOutDate)}</td><td class="right">${r.transferOutAmt?fmtAnnual(r.transferOutAmt):'—'}</td></tr>`).join('')}
      </tbody>
    </table>
    </div>`;
  }

  // ── Schedule F-1 ──────────────────────────────────────
  if(d.schF1.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule F-1','1')}
    <div class="doc-schedule-title">SCHEDULE F-1: Sales of Real Property During Period</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule F-1: Sales of Real Property During Period</caption>
      <thead><tr><th>#</th><th>Description</th><th>Bank</th><th>Account #</th><th>Court Order Date</th><th class="right">Sale Price</th></tr></thead>
      <tbody>${d.schF1.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.bank)}</td><td>${esc(r.accountNo)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.salePrice)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="5">Schedule F-1 Total</td><td class="right">${fmtAnnual(d.schF1.reduce((s,r)=>s+n(r.salePrice),0))}</td></tr>
      </tbody>
    </table>
    </div>`;
  }

  // ── Schedule F-2 ──────────────────────────────────────
  if(d.schF2.length>0){
    html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Schedule F-2','1')}
    <div class="doc-schedule-title">SCHEDULE F-2: Sales of Personal Property During Period</div>
    <table class="doc-table">
      <caption class="visually-hidden">Schedule F-2: Sales of Personal Property During Period</caption>
      <thead><tr><th>#</th><th>Description</th><th>Bank</th><th>Account #</th><th>Court Order Date</th><th class="right">Sale Price</th></tr></thead>
      <tbody>${d.schF2.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.description)}</td><td>${esc(r.bank)}</td><td>${esc(r.accountNo)}</td><td>${fmtD(r.courtOrderDate)}</td><td class="right">${fmtAnnual(r.salePrice)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="5">Schedule F-2 Total</td><td class="right">${fmtAnnual(d.schF2.reduce((s,r)=>s+n(r.salePrice),0))}</td></tr>
      </tbody>
    </table>
    </div>`;
  }

  // ── Parts VIII, IX ────────────────────────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part VIII','5')}
  <div class="doc-schedule-title">Part VIII — TRUST INFORMATION</div>
  <div class="doc-table-div mb-2">
    ${sl('#1. Does the Ward have one or more Trusts?',d.trusts[0]&&d.trusts[0].hasTrust||'No')}
  </div>
  ${d.trusts.filter(t=>t.name).map((t,i)=>`
  <div class="doc-schedule-title" style="font-size:.76rem">Trust ${i+1}</div>
  <div class="doc-table-div mb-2">
    ${sl('#2. Created after GID?',esc(t.createdAfterGID))} ${sl('Name of Trust',esc(t.name))} ${sl('Trustee',esc(t.trustee))}
    ${sl('Account Number',esc(t.accountNo))} ${sl('Date Created',fmtD(t.dateCreated))} ${sl('Type',esc(t.trustType))}
    ${sl("Ward's % Interest",esc(t.wardPct))} ${sl("Amount (Ward's Interest)",fmtAnnual(t.wardAmount))}
  </div>`).join('')}
  <div class="doc-schedule-title mt-2">Part IX — OTHER INFORMATION &amp; BOND CALCULATION</div>
  <div class="doc-table-div mb-1">
    ${sl("Guardian's Relationship to Ward",d.guardianRelationship)}
    ${sl('Date of Most Recent Restricted Depository Receipt',fmtD(d.restrictedDepositoryReceiptDate))}
  </div>
  <div class="doc-schedule-title" style="font-size:.76rem">Bond Calculation</div>
  <div class="doc-table-div mb-1">
    ${slR('Sch D-1 — Cash Assets in RESTRICTED Depository',fmtAnnual(t.schD1_restricted))}
    ${slR('Sch D-4 — Intangible Assets RESTRICTED',fmtAnnual(t.schD4_restricted))}
    ${slR('Sch D-1 — Cash Assets NOT in Restricted Depository',fmtAnnual(t.schD1_total-t.schD1_restricted))}
    ${slR('Sch D-3 — Personal Property Assets',fmtAnnual(t.schD3_ward))}
    ${slR('Sch D-4 — Intangible Assets (Unrestricted)',fmtAnnual(t.schD4_ward-t.schD4_restricted))}
    <div class="tr total-row"><div class="td">Total for BOND REQUIREMENT</div><div class="td right">${fmtAnnual(t.bondReq)}</div></div>
  </div>
  <div class="doc-table-div">
    ${sl('Bond Amount',fmtAnnual(d.bondAmount))}
    ${sl('Bond Period',`From: ${fmtD(d.bondPeriodFrom)} &nbsp;&nbsp; To: ${fmtD(d.bondPeriodTo)}`)}
    ${sl('Name of Bonding Company',d.bondingCompany)}
  </div>
  </div>`;

  // ── Part X — Certificate of Service ───────────────────
  html+=`<div class="schedule-page doc-page">${docHdr(W,CN,'Part X','6')}
  <div class="doc-schedule-title">Part X — GUARDIAN ATTORNEY CERTIFICATE OF SERVICE</div>
  <p style="font-size:.75rem;margin-bottom:.5rem">Pursuant to Florida Statute 744.367(4), I hereby certify that a copy of this accounting has been furnished to:</p>
  <div class="row mb-3">
    ${d.certRecipients.slice(0,2).map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Recipient ${i+1}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.line2)}</div><div class="doc-signature-line">${esc(r.line3)}</div><div class="doc-signature-line">${esc(r.line4)}</div></div>`).join('')}
  </div>
  <div class="row mb-3">
    ${d.certRecipients.slice(2,4).map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Recipient ${i+3}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.line2)}</div><div class="doc-signature-line">${esc(r.line3)}</div><div class="doc-signature-line">${esc(r.line4)}</div></div>`).join('')}
  </div>
  <p style="font-size:.78rem;">on this date: ${fmtD(d.certDate)}${d.certIndicator?` &nbsp;|&nbsp; ${esc(d.certIndicator)}`:''}</p>
  <div class="doc-signature-block">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtD(d.certAttySignDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(d.attorney)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(d.attorney_bar)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(d.attorney_phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(d.attorney_street)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(d.attorney_cityStateZip)}</div></div>
    </div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Annual Accounting)</p>
  </div>
  </div>`;

  // ── Part XI — Remuneration ────────────────────────────
  if(d.remuneration.some(r=>r.amount||r.guardian)){
    html+=`<div class="doc-page">${docHdr(W,CN,"Summary (Cont'd)",'7')}
    <div class="doc-schedule-title">Part XI — GUARDIAN(S) DECLARATION OF REMUNERATION</div>
    <p style="font-size:.75rem;margin-bottom:.4rem">Per 744.367(3)(a), the annual guardianship report must include a declaration of all remuneration received by the guardian from any source for services rendered to or on behalf of the ward.</p>
    <table class="doc-table">
      <caption class="visually-hidden">Part XI — Guardian(s) Declaration of Remuneration</caption>
      <thead><tr><th>#</th><th>Guardian Name</th><th>Type</th><th>Description</th><th class="right">Amount</th></tr></thead>
      <tbody>${d.remuneration.filter(r=>r.amount||r.guardian).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.guardian)}</td><td>${esc(r.type)}</td><td>${esc(r.description)}</td><td class="right">${fmtAnnual(r.amount)}</td></tr>`).join('')}
      </tbody>
    </table>
    </div>`;
  }

  return html;
}


// ═══════════════════════════════════════════════════════
// EXCEL TEMPLATE CAPACITY
// ═══════════════════════════════════════════════════════
// The official court .xlsx templates have a FIXED number of pre-formatted
// rows per schedule, and the export writes into those rows by position.
// Anything beyond the last row has nowhere to go — the export code simply
// skips it (`if(i<20){…}` with no else), which previously meant entries
// could vanish silently from a document filed with the court.
//
// These numbers mirror the guards in doSaveExcelAnnual()/…Simplified()
// exactly; if a template is ever swapped for one with more rows, update
// BOTH the export guard and the matching number here.
//
// Note this is an Excel-only limit: the PDF/print path renders every entry
// no matter how many there are, so overflow blocks the Excel button only
// and deliberately leaves PDF export available.
const ANNUAL_EXCEL_CAPS={
  schA:{cap:50,label:'Schedule A — Income',route:'/scha'}, // 20 on p1 + 30 on p2 (SCH A INCOME p2)
  schB1:{cap:24,label:'Schedule B-1 — Attorney Fees',route:'/schb1'},
  schB2:{cap:24,label:'Schedule B-2 — Guardian Fees',route:'/schb2'},
  schB3:{cap:24,label:'Schedule B-3 — Other Court-Ordered Disbursements',route:'/schb3'},
  schB4:{cap:25,label:'Schedule B-4 — All Other Disbursements',route:'/schb4'},
  schC:{cap:6,label:'Schedule C — Capital Adjustments',route:'/schc'},
  schD1:{cap:11,label:'Schedule D-1 — Cash Assets',route:'/schd1'},
  schD2:{cap:8,label:'Schedule D-2 — Real Estate',route:'/schd2'},
  schD3:{cap:4,label:'Schedule D-3 — Personal Property',route:'/schd3'},
  schD4:{cap:9,label:'Schedule D-4 — Intangible Assets',route:'/schd4'},
  schD5:{cap:7,label:'Schedule D-5 — Mortgages / Loans / Liabilities',route:'/schd5'},
  schE:{cap:27,label:'Schedule E — Bank Transfers',route:'/sche'},
  schF1:{cap:8,label:'Schedule F-1 — Sales of Real Property',route:'/schf1'},
  schF2:{cap:11,label:'Schedule F-2 — Sales of Personal Property',route:'/schf2'},
  remuneration:{cap:25,label:'Part XI — Remuneration',route:'/p11'},
};
// Initial Inventory overflows differently from the other two types: its
// fillScheduleXX() helpers walk a fixed list of template pages, and once
// the slots run out pageIdx runs past the end of pages[], so
// `pages[pageIdx].name` throws. The export then dies in its catch block
// and prints the raw TypeError into a status line that clears itself
// after three seconds — no file, no usable explanation. Same guard as the
// other types turns that into a clear, actionable message.
// Each cap is the total row count across that schedule's template pages
// (e.g. A-1 spans 3 pages holding 4 + 8 + 8).
const GUARDIAN_EXCEL_CAPS={
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
  scheduleC5:{cap:15,label:'Schedule C-5 — Joint Owners',route:'/c5'},
};

function checkExcelCapacity(caps){
  const d=window.D;
  const over=[];
  if(!d)return over;
  for(const key of Object.keys(caps)){
    const info=caps[key];
    const list=Array.isArray(d[key])?d[key]:[];
    // Remuneration is filtered before writing, so only rows with content
    // actually consume a slot. Every other schedule writes each array
    // element positionally, blank or not.
    const count=key==='remuneration'
      ? list.filter(r=>r&&(r.guardian||r.type||r.amount||r.description)).length
      : list.length;
    if(count>info.cap)over.push({label:info.label,route:info.route,cap:info.cap,count:count});
  }
  return over;
}

function excelCapacityPanel(over){
  const rows=over.map(o=>`<div class="validation-group">
      <div class="validation-group-head">
        <span class="validation-group-name">${esc(o.label)}</span>
        <span class="validation-count">${o.count} of ${o.cap}</span>
        <button type="button" class="validation-go" onclick="navigate('${o.route}')">Go to section ${ic('external',13)}</button>
      </div>
      <div class="validation-fields"><span class="validation-field">${o.count-o.cap} entr${o.count-o.cap===1?'y':'ies'} would be left out of the Excel file</span></div>
    </div>`).join('');
  return `<div class="validation-panel excel-cap-panel no-print">
    <div class="validation-head">
      ${ic('alert',17)}
      <div>
        <div class="validation-title">Too many entries for the Excel template</div>
        <div class="validation-sub">The court's Excel form has a fixed number of rows per schedule, and these have more entries than will fit. <strong>Save as PDF instead</strong> — the PDF includes every entry. To use Excel, reduce these schedules or file the extras on a continuation sheet.</div>
      </div>
    </div>
    ${rows}
  </div>`;
}

function pagePrintAnnual(){
  const errors=validateAnnual();
  highlightErrors(errors);
  const capOver=checkExcelCapacity(ANNUAL_EXCEL_CAPS);
  return `<div>
    <h1 class="visually-hidden">Print Preview</h1>
    <div class="print-preview-banner no-print">
      <div><strong>Preview &amp; Export</strong> ${errors.length?`<span style="color:var(--danger-text)"> — ${errors.length} issue(s)</span>`:capOver.length?`<span style="color:var(--danger-text)"> — too many entries for Excel; use PDF</span>`:' — Ready to export'}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-primary btn-sm" onclick="doSavePdfAnnual()" ${errors.length?'disabled':''}>Save as PDF</button>
        <button class="btn btn-primary btn-sm" onclick="doSaveExcelAnnual()" ${errors.length||capOver.length?'disabled':''} ${capOver.length?'title="Some schedules have more entries than the Excel template can hold — save as PDF instead"':''}>Save as Excel</button>
        <button class="btn btn-outline-secondary btn-sm" onclick="openFloridaCourtPortal()" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
      </div>
    </div>
    <div class="accordion mb-3 no-print">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZoneAnnual">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing annual accounting template)
          </button>
        </h2>
        <div id="importZoneAnnual" class="accordion-collapse collapse">
          <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" style="display:none" onchange="importExcelAnnual(this)">
            </label>
            <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the previously exported Annual Accounting Excel file</p>
            <div id="import-progress-annual" style="margin-top:.5rem;font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
    </div>
    ${errors.length?validationPanel(errors):''}
    ${capOver.length?excelCapacityPanel(capOver):''}
    <div id="print-doc-container">${buildPrintHTMLAnnual()}</div>
  </div>`;
}


function validateAnnual(){
  const d=window.D; const errs=[];
  const req=(v,label)=>{if(!v||!String(v).trim())errs.push(label);};
  req(d.wardName,'Part I — Ward Name');
  req(d.caseNumber,'Part I — Case Number');
  req(d.guardian,'Part I — Guardian');
  req(d.periodFrom,'Part I — Accounting Period From');
  req(d.periodTo,'Part I — Accounting Period To');
  req(d.gid,'Part I — Guardianship Inception Date (GID)');
  req(d.county,'Part I — County');
  req(d.filingType,'Part I — Filing Type');
  req(d.startingBalance,'Part II — Starting Balance');
  d.guardians.forEach((g,i)=>{
    if(i>0&&!guardianHasAnyData(g))return;
    const p=`Part III — Guardian #${i+1}`;
    req(g.name,`${p} — Name`);
    req(g.signatureDate,`${p} — Signature Date`);
    req(g.ssn,`${p} — SSN/EIN`);
    req(g.phone,`${p} — Phone`);
    req(g.mailingStreet,`${p} — Mailing Street`);
    req(g.mailingCityStateZip,`${p} — Mailing City/State/Zip`);
  });
  req(d.preparer.name,'Part IV — Preparer Name');
  req(d.preparer.signatureDate,'Part IV — Preparer Signature Date');
  req(d.preparer.ssn,'Part IV — Preparer SSN/EIN');
  req(d.preparer.phone,'Part IV — Preparer Phone');
  req(d.preparer.street,'Part IV — Preparer Street');
  req(d.preparer.cityStateZip,'Part IV — Preparer City/State/Zip');
  req(d.attorney_bar,'Part V — Attorney Bar Number');
  req(d.attorney_phone,'Part V — Attorney Phone');
  req(d.attorney_street,'Part V — Attorney Street');
  req(d.attorney_cityStateZip,'Part V — Attorney City/State/Zip');
  req(d.attorney_signatureDate,'Part V — Attorney Signature Date');
  req(d.bondAmount,'Part IX — Bond Amount');
  req(d.bondingCompany,'Part IX — Bonding Company');
  req(d.certDate,'Part X — Certificate of Service Date');
  req(d.certRecipients[0].name,'Part X — Recipient 1 Name');

  const rowHasAnyData=r=>Object.values(r).some(v=>v!==''&&v!=null);
  const checkRows=(rows,fields,schedLabel)=>{
    (rows||[]).forEach((r,i)=>{
      if(!rowHasAnyData(r))return;
      fields.forEach(([key,label])=>{
        if(r[key]===''||r[key]==null)errs.push(`${schedLabel} — Line ${i+1} — ${label} is required`);
      });
    });
  };
  checkRows(d.schA,[['payer','Income Source / Payer'],['description','Description'],['bank','Bank Name'],['accountNo','Account #'],['amount','Amount']],'Schedule A');
  checkRows(d.schB1,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-1');
  checkRows(d.schB2,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-2');
  checkRows(d.schB3,[['bankAcct','Bank Account #'],['checkNo','Check #'],['datePaid','Date Paid'],['payee','Payee'],['amount','Amount']],'Schedule B-3');
  checkRows(d.schB4,[['checkNo','Check #'],['datePaid','Date Paid'],['category','Category'],['payee','Payee'],['amount','Amount']],'Schedule B-4');
  checkRows(d.schC,[['description','Description'],['date','Date of Adjustment']],'Schedule C');
  (d.schC||[]).forEach((r,i)=>{
    if(!rowHasAnyData(r))return;
    if((r.gain===''||r.gain==null)&&(r.loss===''||r.loss==null))errs.push(`Schedule C — Line ${i+1} — Gain or Loss amount is required`);
  });
  checkRows(d.schD1,[['description','Description'],['accountNo','Account #'],['restricted','Restricted?'],['type','Type'],['fullAmount','Full Asset Amount'],['wardPct',"Ward's %"]],'Schedule D-1');
  checkRows(d.schD2,[['description','Description'],['residence','Personal Residence?'],['income','Income Property?'],['fullValue','Full Value'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-2');
  checkRows(d.schD3,[['description','Description'],['fullAmount','Full Amount'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-3');
  checkRows(d.schD4,[['description','Description'],['restricted','Restricted?'],['fullAmount','Full Amount'],['wardPct',"Ward's %"],['carryingValue','Carrying Value']],'Schedule D-4');
  checkRows(d.schD5,[['description','Description'],['loanNo','Loan #'],['loanType','Loan Type'],['fullDebt','Full Debt'],['wardPct',"Ward's %"]],'Schedule D-5');
  checkRows(d.schE,[['bankName','Bank Name']],'Schedule E');
  (d.schE||[]).forEach((r,i)=>{
    if(!rowHasAnyData(r))return;
    const hasIn=r.transferInDate!==''&&r.transferInDate!=null&&r.transferInAmt!==''&&r.transferInAmt!=null;
    const hasOut=r.transferOutDate!==''&&r.transferOutDate!=null&&r.transferOutAmt!==''&&r.transferOutAmt!=null;
    if(!hasIn&&!hasOut)errs.push(`Schedule E — Line ${i+1} — Transfer In (date+amount) or Transfer Out (date+amount) is required`);
  });
  checkRows(d.schF1,[['description','Description'],['bank','Bank'],['accountNo','Account #'],['courtOrderDate','Court Order Date'],['salePrice','Sale Price']],'Schedule F-1');
  checkRows(d.schF2,[['description','Description'],['bank','Bank'],['accountNo','Account #'],['courtOrderDate','Court Order Date'],['salePrice','Sale Price']],'Schedule F-2');

  // Reconciliation. Net assets are derived two independent ways: Line 20
  // (starting balance + income − disbursements ± gains/losses) and Line 30
  // (the sum of the Schedule D asset/liability listings). They must agree —
  // that equality IS the accounting, and it's the first thing the Clerk's
  // audit checks. Previously this was only a soft banner on Parts VI & VII,
  // so an accounting that didn't balance could still be exported and filed.
  // Only raised once the guardian has actually entered figures; an untouched
  // form trivially balances at 0 = 0 and shouldn't be flagged as an error.
  // Line 20 must equal Line 30. A difference no longer blocks export
  // outright — sometimes one is genuinely correct as filed — but it must be
  // explained in writing, and that explanation goes onto the document.
  // Kept short: these render as chips in the missing-fields panel, and the
  // Parts VI & VII page itself shows the full detail.
  const _rec=annualReconcileState();
  if(_rec.outOfBalance&&!_rec.explained){
    errs.push('Parts VI & VII — Net Assets from Changes and Net Assets from Balances don\'t match (off by '
      +fmtAnnual(_rec.diff)+'): correct the schedules or explain the difference');
  }

  return errs;
}


// html2pdf picks page breaks by walking every element and inserting a spacer
// <div> before any one that straddles a page edge. That walk is destructive
// inside a table: a <table> whose top lands a few pixels above the edge is
// pushed down by its own spacer, lands a sub-pixel amount past the next edge,
// and the walk carries on into it — inserting a div into the <table>, into the
// <thead>, and once before every <th>. Those stray divs become anonymous table
// cells, so the header row grows a phantom column in front of each real one and
// stops lining up with the body underneath. That is what scrambled the Schedule
// B-4 header in filed accountings.
//
// Wrapping each schedule title together with its table in one block that
// carries page-break-inside:avoid makes the whole schedule the thing that
// moves, so the break lands between schedules and the walk never reaches into
// a table. It also stops a title stranding alone at the foot of a page.
// Returns a function that puts the DOM back the way it was.
function groupScheduleBlocksForPdf(container){
  const wrappers=[];
  container.querySelectorAll('.doc-page').forEach(page=>{
    let block=null;
    [...page.children].forEach(child=>{
      if(child.classList.contains('doc-schedule-title')){
        block=document.createElement('div');
        block.className='doc-block';
        page.insertBefore(block,child);
        wrappers.push(block);
      }
      // Everything after a title belongs to that schedule until the next one.
      if(block)block.appendChild(child);
    });
  });
  return function ungroup(){
    wrappers.forEach(block=>{
      const parent=block.parentNode;
      if(!parent)return;
      while(block.firstChild)parent.insertBefore(block.firstChild,block);
      parent.removeChild(block);
    });
  };
}

async function doSavePdfAnnual(){
  const errors=validateAnnual();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  pvShowAll(); // never export a filtered preview
  document.body.classList.add('pdf-export-mode');
  const container=document.getElementById('print-doc-container');
  const ward=(window.D.wardName||'Accounting').replace(/[^a-z0-9]/gi,'_');
  const formSlug=formDisplayName(window.D.inventoryType||activeInventoryType).replace(/[^a-z0-9]/gi,'');
  const ungroup=groupScheduleBlocksForPdf(container);
  try{
    await html2pdf().set({
      margin:0, filename:`${ward}_${formSlug}.pdf`,
      image:{type:'jpeg',quality:0.98},
      html2canvas:{scale:2,useCORS:true,logging:false},
      jsPDF:{unit:'in',format:'letter',orientation:'portrait'},
      // Not 'avoid-all': that makes every element a break candidate, table
      // internals included, which is what wrecked the Schedule B-4 header.
      // The elements that may carry a break are the ones the .pdf-export-mode
      // stylesheet marks page-break-inside:avoid, all of them block-level.
      pagebreak:{mode:['css','legacy'],before:'.schedule-page:not(:first-of-type)'}
    }).from(container).save();
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{ungroup();document.body.classList.remove('pdf-export-mode');}
}


async function doSaveExcelAnnual(){
  const errors=validateAnnual(); if(errors.length){renderPage('/print');return;}
  // Backstop for the disabled Save-as-Excel button: silently dropping
  // entries from a court filing is bad enough that it's worth refusing
  // here too, in case this is ever reached by another path.
  const capOver=checkExcelCapacity(ANNUAL_EXCEL_CAPS);
  if(capOver.length){
    alert('Cannot export to Excel — these schedules have more entries than the court\'s Excel template can hold:\n\n'
      +capOver.map(o=>`• ${o.label}: ${o.count} entries (template holds ${o.cap})`).join('\n')
      +'\n\nSave as PDF instead — the PDF includes every entry.');
    renderPage('/print');
    return;
  }
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('annual');
    if(!templateB64){alert('Template not loaded. Please import the Excel template first.');return;}

    const setCell=(sheet,addr,v)=>{const c=sheet.getCell(addr);if(v==null||v===''){c.value=null;}else if(typeof v==='number'){c.value=v;}else{c.value=sanitizeForExcel(String(v));}};
    const fD=s=>(s&&String(s).length>=10)?String(s).substring(0,10):(s||'');
    const nv=v=>parseFloat(v)||0;
    const pv=v=>{const p=parseFloat(v);return isNaN(p)?0:p>1?p/100:p;};

    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    // PART I
    const p1=workbook.getWorksheet('PART I');
    if(p1){
      setCell(p1,'C5',inv.wardName); setCell(p1,'I5',inv.caseNumber);
      setCell(p1,'F5',fD(inv.gid));
      setCell(p1,'E18',fD(inv.periodFrom)); setCell(p1,'H18',fD(inv.periodTo));
      setCell(p1,'D20',inv.guardian); setCell(p1,'D21',inv.attorney);
      setCell(p1,'D22',inv.typeOfGuardianship);
      setCell(p1,'J6',inv.amendedForm); setCell(p1,'H4',inv.filingType);
      setCell(p1,'I12',inv.relatedCaseNumbers);
      setCell(p1,'D23',inv.county||'');
    }

    // PART II, III
    const p23=workbook.getWorksheet('PART II, III');
    if(p23){
      // Starting balance goes in Part VI/VII but Part II doesn't have a cell for it in the template
      const g1=inv.guardians[0]||{};
      const g2=inv.guardians[1]||{};
      const g3=inv.guardians[2]||{};
      setCell(p23,'C22',fD(inv.periodFrom)); setCell(p23,'F22',fD(inv.periodTo));
      // Guardian 1
      setCell(p23,'D25',fD(g1.signatureDate)); setCell(p23,'F25',g1.name||'');
      setCell(p23,'B27',g1.ssn||''); setCell(p23,'B29',g1.phone||''); setCell(p23,'B31',g1.email||'');
      setCell(p23,'F27',g1.mailingStreet||''); setCell(p23,'F29',g1.mailingCityStateZip||'');
      setCell(p23,'F31',g1.officeStreet||''); setCell(p23,'F33',g1.officeCityStateZip||'');
      // Guardian 2
      if(guardianHasAnyData(g2)){
        setCell(p23,'D35',fD(g2.signatureDate)); setCell(p23,'F35',g2.name||'');
        setCell(p23,'B37',g2.ssn||''); setCell(p23,'B39',g2.phone||''); setCell(p23,'B41',g2.email||'');
        setCell(p23,'F37',g2.mailingStreet||''); setCell(p23,'F39',g2.mailingCityStateZip||'');
        setCell(p23,'F41',g2.officeStreet||''); setCell(p23,'F43',g2.officeCityStateZip||'');
      }
      // Guardian 3
      if(guardianHasAnyData(g3)){
        setCell(p23,'D45',fD(g3.signatureDate)); setCell(p23,'F45',g3.name||'');
        setCell(p23,'B47',g3.ssn||''); setCell(p23,'B49',g3.phone||''); setCell(p23,'B51',g3.email||'');
        setCell(p23,'F47',g3.mailingStreet||''); setCell(p23,'F49',g3.mailingCityStateZip||'');
        setCell(p23,'F51',g3.officeStreet||''); setCell(p23,'F53',g3.officeCityStateZip||'');
      }
    }

    // PART IV, V
    const p45=workbook.getWorksheet('PART IV, V');
    if(p45){
      const p=inv.preparer;
      setCell(p45,'D11',fD(inv.periodFrom)); setCell(p45,'J11',fD(inv.periodTo));
      // Signature date columns: D is inside the merged "Preparer's/Attorney
      // Signature" label cell (B:G); the real Date value lives at H.
      setCell(p45,'J15',p.name||''); setCell(p45,'H15',fD(p.signatureDate));
      setCell(p45,'B17',p.ssn||''); setCell(p45,'B19',p.phone||'');
      setCell(p45,'J17',p.street||''); setCell(p45,'J19',p.cityStateZip||'');
      setCell(p45,'D26',fD(inv.periodFrom)); setCell(p45,'J26',fD(inv.periodTo));
      setCell(p45,'H31',fD(inv.attorney_signatureDate));
      setCell(p45,'B33',inv.attorney_bar||''); setCell(p45,'B35',inv.attorney_phone||'');
      setCell(p45,'J33',inv.attorney_street||''); setCell(p45,'J35',inv.attorney_cityStateZip||'');
    }

    // PART VI, VII — Starting balance
    const p67=workbook.getWorksheet('PART VI, VII ');
    if(p67){
      setCell(p67,'I8',nv(inv.startingBalance));
      // Line 20 / Line 30 are computed by this app but the court's own
      // template also has cells for them, and they must agree. Addresses
      // live in ANNUAL_P67_CELLS so they can be set from the real template
      // rather than guessed; any left null is simply skipped, so an unknown
      // address can never write a total into the wrong cell of a filing.
      const t67=calcTotalsAnnual();
      if(ANNUAL_P67_CELLS.line20) setCell(p67,ANNUAL_P67_CELLS.line20,nv(t67.netAssets));
      if(ANNUAL_P67_CELLS.line30) setCell(p67,ANNUAL_P67_CELLS.line30,nv(t67.netAssetsFromD));
      const rec67=annualReconcileState(t67);
      if(ANNUAL_P67_CELLS.explanation&&rec67.outOfBalance){
        setCell(p67,ANNUAL_P67_CELLS.explanation,rec67.explanation);
      }
    }

    // Schedule A — income rows
    // Real template header (SCH A INCOME p1, row17): C/D=Income Source
    // (Payer) [merged], E=Description, F=Bank Deposited, G=Account #,
    // H=Ward's Income Amount. description/bank/accountNo were previously
    // one column left of where they belong (description landed in the
    // merged payer cell D; bank/account# were swapped into E/F).
    const schA=workbook.getWorksheet('SCH A INCOME p1');
    if(schA){
      inv.schA.forEach((r,i)=>{
        if(i<20){const row=21+i; setCell(schA,`C${row}`,r.payer||''); setCell(schA,`E${row}`,r.description||''); setCell(schA,`F${row}`,r.bank||''); setCell(schA,`G${row}`,r.accountNo||''); setCell(schA,`H${row}`,nv(r.amount));}
      });
    }
    const schA2=workbook.getWorksheet('SCH A INCOME p2');
    if(schA2){
      inv.schA.forEach((r,i)=>{
        if(i>=20&&i<50){const row=8+(i-20); setCell(schA2,`C${row}`,r.payer||''); setCell(schA2,`E${row}`,r.description||''); setCell(schA2,`F${row}`,r.bank||''); setCell(schA2,`G${row}`,r.accountNo||''); setCell(schA2,`H${row}`,nv(r.amount));}
      });
    }

    // Schedule B-1 — attorney fees. Real header (row8): C/D=Bank Account #
    // [merged], E=Check #, F=Period From, G=Period To, H=Date Paid,
    // I=Payee, J=Court Order Date, K=Amount. Every field from checkNo
    // onward was previously one column left of where it belongs.
    const sb1=workbook.getWorksheet('SCH B-1 ATTORNEY FEES');
    if(sb1){
      inv.schB1.forEach((r,i)=>{
        if(i<24){const row=10+i; setCell(sb1,`C${row}`,r.bankAcct||''); setCell(sb1,`E${row}`,r.checkNo||''); setCell(sb1,`F${row}`,fD(r.periodFrom)); setCell(sb1,`G${row}`,fD(r.periodTo)); setCell(sb1,`H${row}`,fD(r.datePaid)); setCell(sb1,`I${row}`,r.payee||''); setCell(sb1,`J${row}`,fD(r.courtOrderDate)); setCell(sb1,`K${row}`,nv(r.amount));}
      });
    }

    // Schedule B-2 — guardian fees (same layout as B-1)
    const sb2=workbook.getWorksheet('SCH B-2 GUARDIAN FEES');
    if(sb2){
      inv.schB2.forEach((r,i)=>{
        if(i<24){const row=10+i; setCell(sb2,`C${row}`,r.bankAcct||''); setCell(sb2,`E${row}`,r.checkNo||''); setCell(sb2,`F${row}`,fD(r.periodFrom)); setCell(sb2,`G${row}`,fD(r.periodTo)); setCell(sb2,`H${row}`,fD(r.datePaid)); setCell(sb2,`I${row}`,r.payee||''); setCell(sb2,`J${row}`,fD(r.courtOrderDate)); setCell(sb2,`K${row}`,nv(r.amount));}
      });
    }

    // Schedule B-3 — court-ordered. Real header: C/D=Bank Account # [merged],
    // E=Check #, F=Date Paid, G=Payee, H=Court Order Date, I=Amount.
    const sb3=workbook.getWorksheet('SCH B-3 OTHER CO DISB');
    if(sb3){
      inv.schB3.forEach((r,i)=>{
        if(i<24){const row=10+i; setCell(sb3,`C${row}`,r.bankAcct||''); setCell(sb3,`E${row}`,r.checkNo||''); setCell(sb3,`F${row}`,fD(r.datePaid)); setCell(sb3,`G${row}`,r.payee||''); setCell(sb3,`H${row}`,fD(r.courtOrderDate)); setCell(sb3,`I${row}`,nv(r.amount));}
      });
    }

    // Schedule B-4 — other disbursements (write to pages p2-p3 only)
    const sb4p2=workbook.getWorksheet('SCH B-4 OTHER DISB p2');
    if(sb4p2){
      inv.schB4.forEach((r,i)=>{
        if(i<25){const row=20+i; setCell(sb4p2,`C${row}`,r.checkNo||''); setCell(sb4p2,`D${row}`,fD(r.datePaid)); setCell(sb4p2,`E${row}`,r.category||''); setCell(sb4p2,`G${row}`,r.payee||''); setCell(sb4p2,`I${row}`,nv(r.amount));}
      });
    }

    // Schedule C — capital adjustments
    const scC=workbook.getWorksheet('SCH C CAPITAL ADJ p1');
    if(scC){
      inv.schC.forEach((r,i)=>{
        if(i<6){const row=31+(i*4); setCell(scC,`C${row}`,r.description||''); setCell(scC,`E${row}`,fD(r.date)); setCell(scC,`F${row}`,nv(r.gain)); setCell(scC,`G${row}`,nv(r.loss));}
      });
    }

    // Schedule D-1 — cash assets. Real header: C/D=Asset Description
    // [merged], E=Account #, F=Restricted?, G=Type?, H=Full Asset Amount,
    // I=Ward's %. accountNo previously landed in D, inside the merged
    // description cell, so it was never actually visible in the export.
    const sd1=workbook.getWorksheet('SCH D-1 CASH p1');
    if(sd1){
      inv.schD1.forEach((r,i)=>{
        if(i<11){const row=25+(i*3); setCell(sd1,`C${row}`,r.description||''); setCell(sd1,`E${row}`,r.accountNo||''); setCell(sd1,`F${row}`,r.restricted||'No'); setCell(sd1,`G${row}`,r.type||''); setCell(sd1,`H${row}`,nv(r.fullAmount)); setCell(sd1,`I${row}`,pv(r.wardPct));}
      });
    }

    // Schedule D-2 — real estate
    const sd2=workbook.getWorksheet('SCH D-2 REAL ESTATE p1');
    if(sd2){
      inv.schD2.forEach((r,i)=>{
        if(i<8){const row=20+(i*4); setCell(sd2,`C${row}`,r.description||''); setCell(sd2,`E${row}`,r.residence||'No'); setCell(sd2,`F${row}`,r.income||'No'); setCell(sd2,`G${row}`,nv(r.fullValue)); setCell(sd2,`H${row}`,pv(r.wardPct)); setCell(sd2,`I${row}`,nv(r.carryingValue));}
      });
    }

    // Schedule D-3 — personal property
    const sd3=workbook.getWorksheet('SCH D-3 PERSONAL PROP p1');
    if(sd3){
      inv.schD3.forEach((r,i)=>{
        if(i<4){const row=31+(i*4); setCell(sd3,`C${row}`,r.description||''); setCell(sd3,`F${row}`,nv(r.fullAmount)); setCell(sd3,`G${row}`,pv(r.wardPct)); setCell(sd3,`H${row}`,nv(r.carryingValue));}
      });
    }

    // Schedule D-4 — intangibles
    const sd4=workbook.getWorksheet('SCH D-4 INTANGIBLE p1 ');
    if(sd4){
      inv.schD4.forEach((r,i)=>{
        if(i<9){const row=18+(i*4); setCell(sd4,`C${row}`,r.description||''); setCell(sd4,`F${row}`,r.restricted||'No'); setCell(sd4,`G${row}`,nv(r.fullAmount)); setCell(sd4,`H${row}`,pv(r.wardPct)); setCell(sd4,`I${row}`,nv(r.carryingValue));}
      });
    }

    // Schedule D-5 — liabilities. Real header: C/D=Description [merged],
    // E=Loan or Account #, F=Type?, G=Full Debt Amount, H=Ward's %.
    const sd5=workbook.getWorksheet('SCH D-5 MORTGAGES p1');
    if(sd5){
      inv.schD5.forEach((r,i)=>{
        if(i<7){const row=23+(i*4); setCell(sd5,`C${row}`,r.description||''); setCell(sd5,`E${row}`,r.loanNo||''); setCell(sd5,`F${row}`,r.loanType||''); setCell(sd5,`G${row}`,nv(r.fullDebt)); setCell(sd5,`H${row}`,pv(r.wardPct));}
      });
    }

    // Schedule E — bank transfers. Real header: C/D=Bank Name/Account #
    // [merged], E=Transfer In Date, F=Transfer In Amount, G=Transfer Out
    // Date, H=Transfer Out Amount. transferInDate previously landed in D,
    // inside the merged bank-name cell, so it never actually appeared.
    const seE=workbook.getWorksheet('SCH E BANK TRANS p1');
    if(seE){
      inv.schE.forEach((r,i)=>{
        if(i<27){const row=14+i; setCell(seE,`C${row}`,r.bankName||''); setCell(seE,`E${row}`,fD(r.transferInDate)); setCell(seE,`F${row}`,nv(r.transferInAmt)); setCell(seE,`G${row}`,fD(r.transferOutDate)); setCell(seE,`H${row}`,nv(r.transferOutAmt));}
      });
    }

    // Schedule F-1 — sales real property. Real header: C/D/E=Description of
    // Sale [merged], F=Bank, G=Account #, H=Court Order Date, I=Sale Price.
    // bank/accountNo/courtOrderDate were previously each one column left
    // (bank landed inside the merged description cell E).
    const sf1=workbook.getWorksheet('SCH F-1 SALES REAL PROP p1');
    if(sf1){
      inv.schF1.forEach((r,i)=>{
        if(i<8){const row=19+(i*5); setCell(sf1,`C${row}`,r.description||''); setCell(sf1,`F${row}`,r.bank||''); setCell(sf1,`G${row}`,r.accountNo||''); setCell(sf1,`H${row}`,fD(r.courtOrderDate)); setCell(sf1,`I${row}`,nv(r.salePrice));}
      });
    }

    // Schedule F-2 — sales personal property (same layout as F-1)
    const sf2=workbook.getWorksheet('SCH F-2 SALES PERSONAL PROP p1');
    if(sf2){
      inv.schF2.forEach((r,i)=>{
        if(i<11){const row=17+(i*4); setCell(sf2,`C${row}`,r.description||''); setCell(sf2,`F${row}`,r.bank||''); setCell(sf2,`G${row}`,r.accountNo||''); setCell(sf2,`H${row}`,fD(r.courtOrderDate)); setCell(sf2,`I${row}`,nv(r.salePrice));}
      });
    }

    // Part VIII — trusts. Real layout (confirmed via the template's own
    // merge ranges): "does the ward have any trust" is a single GLOBAL
    // question at D8 (merged D:G) — not one cell per trust. Each trust's
    // own fields (name/trustee/account/date/type/%/amount) are merged
    // D:H (or D:G) ranges, so the value belongs at the D anchor, not H —
    // writing to H previously landed inside the merged cell and never
    // showed. createdAfterGID is the one field that really does live at H
    // (confirmed via its Yes/No data-validation list attached to H10/20/30).
    const p8=workbook.getWorksheet('PART VIII');
    if(p8){
      setCell(p8,'D8',(inv.trusts.some(t=>t.hasTrust==='Yes'))?'Yes':'No');
      const trustRows=[[10,12,13,14,15,16,17,18],[20,22,23,24,25,26,27,28],[30,32,33,34,35,36,37,38]];
      inv.trusts.forEach((t,i)=>{
        const rows=trustRows[i];
        setCell(p8,`H${rows[0]}`,t.createdAfterGID||'No');
        setCell(p8,`D${rows[1]}`,t.name||'');
        setCell(p8,`D${rows[2]}`,t.trustee||'');
        setCell(p8,`D${rows[3]}`,t.accountNo||'');
        setCell(p8,`D${rows[4]}`,fD(t.dateCreated));
        setCell(p8,`D${rows[5]}`,t.trustType||'');
        setCell(p8,`D${rows[6]}`,t.wardPct||'');
        setCell(p8,`D${rows[7]}`,nv(t.wardAmount));
      });
    }

    // Part IX — bond. Real header merges: G8:H8 (Guardian's Relationship
    // value, anchor G), G9:H9 (Restricted Depository Receipt Date, anchor
    // G), B20:G20 label / H20 value (Bond Amount, already correct),
    // "From:"/E21 value / "To:"/G21 value (Bond Period), D22:H22
    // (Bonding Company, anchor D).
    const p9=workbook.getWorksheet('PART IX ');
    if(p9){
      setCell(p9,'G8',inv.guardianRelationship||'');
      setCell(p9,'G9',fD(inv.restrictedDepositoryReceiptDate));
      setCell(p9,'H20',nv(inv.bondAmount));
      setCell(p9,'E21',fD(inv.bondPeriodFrom));
      setCell(p9,'G21',fD(inv.bondPeriodTo));
      setCell(p9,'D22',inv.bondingCompany||'');
    }

    // Part X — cert of service. Recipients (B/I column anchors, rows
    // 11-14/17-20) were already correctly mapped. certDate/certIndicator/
    // certAttySignDate were not: the "Date"/"Indicate if:" labels sit one
    // row ABOVE their merged value cells (G23:I23 and K23:L23 respectively,
    // confirmed via the template's merge ranges), and certAttySignDate's
    // real value cell is G25 (anchor of G25:I25), not H25.
    const p10=workbook.getWorksheet('PART X');
    if(p10){
      const r=inv.certRecipients;
      setCell(p10,'B11',r[0]&&r[0].name||''); setCell(p10,'B12',r[0]&&r[0].line2||''); setCell(p10,'B13',r[0]&&r[0].line3||''); setCell(p10,'B14',r[0]&&r[0].line4||'');
      setCell(p10,'I11',r[1]&&r[1].name||''); setCell(p10,'I12',r[1]&&r[1].line2||''); setCell(p10,'I13',r[1]&&r[1].line3||''); setCell(p10,'I14',r[1]&&r[1].line4||'');
      setCell(p10,'B17',r[2]&&r[2].name||''); setCell(p10,'B18',r[2]&&r[2].line2||''); setCell(p10,'B19',r[2]&&r[2].line3||''); setCell(p10,'B20',r[2]&&r[2].line4||'');
      setCell(p10,'I17',r[3]&&r[3].name||''); setCell(p10,'I18',r[3]&&r[3].line2||''); setCell(p10,'I19',r[3]&&r[3].line3||''); setCell(p10,'I20',r[3]&&r[3].line4||'');
      setCell(p10,'G23',fD(inv.certDate));
      setCell(p10,'K23',inv.certIndicator||'');
      setCell(p10,'G25',fD(inv.certAttySignDate));
    }

    // Part XI — remuneration
    const p11=workbook.getWorksheet('PART XI');
    if(p11){
      const entries=(inv.remuneration||[]).filter(r=>r.guardian||r.type||r.amount||r.description);
      entries.forEach((r,i)=>{
        const row=16+i;
        if(row>40)return;
        setCell(p11,`B${row}`,r.guardian||'');
        setCell(p11,`D${row}`,r.type||'');
        setCell(p11,`F${row}`,r.description||'');
        setCell(p11,`I${row}`,nv(r.amount));
      });
    }

    const wardFile=(inv.wardName||'Accounting').replace(/[^a-z0-9]/gi,'_');
    const formSlug=formDisplayName(inv.inventoryType||activeInventoryType).replace(/[^a-z0-9]/gi,'');
    try{workbook.definedNames.model=[];}catch(e){}
    const outBuf=await workbook.xlsx.writeBuffer();
    const blob=new Blob([outBuf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`${wardFile}_${formSlug}.xlsx`;a.click();
    URL.revokeObjectURL(url);
  }catch(err){
    console.error('Excel export failed:',err);
    alert('Excel export failed: '+err.message);
  }
}


async function importExcelAnnual(input){
  const file=input.files[0]; if(!file)return;
  const prog=getImportProgressEl(input);
  if(prog)prog.textContent='Checking file…';
  const check=await validateImportFile(file,'xlsx');
  if(!check.ok){
    if(prog)prog.textContent='✗ '+check.message;
    input.value='';
    return;
  }
  const reader=new FileReader();
  reader.onerror=()=>{
    if(prog)prog.textContent='✗ That file could not be read.';
    input.value='';
  };
  reader.onload=async(e)=>{
    if(prog)prog.textContent='Parsing Excel…';
    try{
      // No template-cache write here — an imported file is extracted and
      // discarded, never retained (see the note above ensureTemplate()).
      const workbook=new ExcelJS.Workbook();
      await workbook.xlsx.load(e.target.result);
      assertWorkbookWithinLimits(workbook);

      // Cell readers. Court templates aren't all filled the same way —
      // a date cell may come back as a real Date (typed into Excel
      // natively), an ISO string, or US-format text (a form typed by
      // hand, or copied between templates) — so dates are normalized to
      // this app's internal YYYY-MM-DD rather than assumed to be one
      // format. Plain gcv()/gcStr() intentionally do NOT do this
      // normalization: only fields the app treats as dates should have
      // it applied. gcv resolves formula/richtext/hyperlink/error shapes
      // via unwrapCellValue (see IMPORTED FILE HARDENING above) rather
      // than only unwrapping {formula,result} the way this used to.
      const gcv=(ws,addr)=>ws?unwrapCellValue(ws.getCell(addr).value):null;
      const gcStr=(ws,addr)=>ws?readCellText(ws.getCell(addr)):'';
      const gcDate=(ws,addr)=>{
        const v=gcv(ws,addr);
        if(v==null||v==='')return '';
        if(v instanceof Date)return v.toISOString().slice(0,10);
        const s=String(v).trim();
        let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m)return `${m[1]}-${m[2]}-${m[3]}`;
        m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m)return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
        m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/); if(m){const yy=+m[3];return `${yy<50?2000+yy:1900+yy}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;}
        return '';
      };
      const gcNum=(ws,addr)=>{const v=gcv(ws,addr);if(v==null||v==='')return '';const n=typeof v==='number'?v:parseFloat(v);return isNaN(n)?'':n;};
      // Inverse of the export's pv(): a percentage cell holds a decimal
      // fraction (1 = 100%) when typed as a real Excel percentage, so
      // values <=1 are scaled back up to match this app's convention of
      // storing wardPct as a plain number (50, not 0.5).
      const gcPct=(ws,addr)=>{const v=gcv(ws,addr);if(v==null||v==='')return '';const n=typeof v==='number'?v:parseFloat(v);if(isNaN(n))return '';return n<=1?String(r2(n*100)):String(n);};
      const rowHasData=(...vals)=>vals.some(v=>v!=null&&String(v).trim()!=='');

      const D=window.D;

      // PART I — cover
      const p1=workbook.getWorksheet('PART I');
      if(p1){
        D.wardName=gcStr(p1,'C5');
        D.caseNumber=gcStr(p1,'I5');
        D.gid=gcDate(p1,'F5');
        D.periodFrom=gcDate(p1,'E18');
        D.periodTo=gcDate(p1,'H18');
        D.guardian=gcStr(p1,'D20');
        D.attorney=gcStr(p1,'D21');
        D.typeOfGuardianship=gcStr(p1,'D22');
        D.amendedForm=gcStr(p1,'J6')||'No';
        D.filingType=gcStr(p1,'H4')||'Annual';
        D.county=gcStr(p1,'D23')||'Pinellas';
        D.relatedCaseNumbers=gcStr(p1,'I12');
      }

      // PART II, III — starting balance carries no cell of its own here
      // (it's on Part VI/VII), but the up-to-3 guardians do.
      const p23=workbook.getWorksheet('PART II, III');
      if(p23){
        const guardianRows=[[25,27,29,31,33],[35,37,39,41,43],[45,47,49,51,53]];
        D.guardians=guardianRows.map(rows=>{
          const [sigRow,ssnRow,phoneRow,emailRow,streetRow]=rows;
          return {
            name:gcStr(p23,`F${sigRow}`), signatureDate:gcDate(p23,`D${sigRow}`),
            ssn:gcStr(p23,`B${ssnRow}`), mailingStreet:gcStr(p23,`F${ssnRow}`),
            phone:gcStr(p23,`B${phoneRow}`), mailingCityStateZip:gcStr(p23,`F${phoneRow}`),
            email:gcStr(p23,`B${emailRow}`), officeStreet:gcStr(p23,`F${emailRow}`),
            officeCityStateZip:gcStr(p23,`F${streetRow}`), signatureDateLabel:''
          };
        }).filter((g,i)=>i===0||guardianHasAnyData(g));
        while(D.guardians.length<1)D.guardians.push({name:'',ssn:'',phone:'',email:'',mailingStreet:'',mailingCityStateZip:'',officeStreet:'',officeCityStateZip:'',signatureDate:'',signatureDateLabel:''});
      }

      // PART IV, V — preparer and attorney
      const p45=workbook.getWorksheet('PART IV, V');
      if(p45){
        D.preparer={
          name:gcStr(p45,'J15'), signatureDate:gcDate(p45,'H15'),
          ssn:gcStr(p45,'B17'), phone:gcStr(p45,'B19'),
          street:gcStr(p45,'J17'), cityStateZip:gcStr(p45,'J19')
        };
        D.attorney_signatureDate=gcDate(p45,'H31');
        D.attorney_bar=gcStr(p45,'B33'); D.attorney_phone=gcStr(p45,'B35');
        D.attorney_street=gcStr(p45,'J33'); D.attorney_cityStateZip=gcStr(p45,'J35');
      }

      // PART VI, VII — only the starting balance is a real input; every
      // other cell on this sheet is a formula computed FROM the schedules.
      const p67=workbook.getWorksheet('PART VI, VII ');
      if(p67) D.startingBalance=gcNum(p67,'I8');

      // Schedule A — income (p1: rows 21-40, p2: rows 8-37)
      const schA=workbook.getWorksheet('SCH A INCOME p1');
      const schA2=workbook.getWorksheet('SCH A INCOME p2');
      if(schA){
        D.schA=[];
        for(let row=21;row<=40;row++){
          const payer=gcStr(schA,`C${row}`),desc=gcStr(schA,`E${row}`),bank=gcStr(schA,`F${row}`),acct=gcStr(schA,`G${row}`),amt=gcNum(schA,`H${row}`);
          if(rowHasData(payer,desc,amt))D.schA.push({payer,description:desc,bank,accountNo:acct,amount:amt});
        }
        if(schA2)for(let row=8;row<=37;row++){
          const payer=gcStr(schA2,`C${row}`),desc=gcStr(schA2,`E${row}`),bank=gcStr(schA2,`F${row}`),acct=gcStr(schA2,`G${row}`),amt=gcNum(schA2,`H${row}`);
          if(rowHasData(payer,desc,amt))D.schA.push({payer,description:desc,bank,accountNo:acct,amount:amt});
        }
      }

      // Schedule B-1 / B-2 — attorney/guardian fees (same layout)
      const importFeeSchedule=(ws)=>{
        const rows=[];
        if(!ws)return rows;
        for(let row=10;row<=33;row++){
          const bankAcct=gcStr(ws,`C${row}`),checkNo=gcStr(ws,`E${row}`),payee=gcStr(ws,`I${row}`),amt=gcNum(ws,`H${row}`);
          if(rowHasData(bankAcct,checkNo,payee,amt))rows.push({
            bankAcct,checkNo,periodFrom:gcDate(ws,`F${row}`),periodTo:gcDate(ws,`G${row}`),
            datePaid:gcDate(ws,`H${row}`),payee,courtOrderDate:gcDate(ws,`J${row}`),amount:gcNum(ws,`K${row}`)
          });
        }
        return rows;
      };
      D.schB1=importFeeSchedule(workbook.getWorksheet('SCH B-1 ATTORNEY FEES'));
      D.schB2=importFeeSchedule(workbook.getWorksheet('SCH B-2 GUARDIAN FEES'));

      // Schedule B-3 — other court-ordered disbursements
      const sb3=workbook.getWorksheet('SCH B-3 OTHER CO DISB');
      D.schB3=[];
      if(sb3)for(let row=10;row<=33;row++){
        const bankAcct=gcStr(sb3,`C${row}`),checkNo=gcStr(sb3,`E${row}`),payee=gcStr(sb3,`G${row}`),amt=gcNum(sb3,`I${row}`);
        if(rowHasData(bankAcct,checkNo,payee,amt))D.schB3.push({bankAcct,checkNo,datePaid:gcDate(sb3,`F${row}`),payee,courtOrderDate:gcDate(sb3,`H${row}`),amount:amt});
      }

      // Schedule B-4 — the check-register page (p2) is this app's only
      // input surface for it; pages 3+ exist in the real template for
      // overflow beyond 25 entries, matching ANNUAL_EXCEL_CAPS.schB4.
      const sb4=workbook.getWorksheet('SCH B-4 OTHER DISB p2');
      D.schB4=[];
      if(sb4)for(let row=20;row<=44;row++){
        const checkNo=gcStr(sb4,`C${row}`),payee=gcStr(sb4,`G${row}`),amt=gcNum(sb4,`I${row}`);
        if(rowHasData(checkNo,payee,amt))D.schB4.push({checkNo,datePaid:gcDate(sb4,`D${row}`),category:gcStr(sb4,`E${row}`),payee,amount:amt});
      }

      // Schedule C — capital adjustments
      const scC=workbook.getWorksheet('SCH C CAPITAL ADJ p1');
      D.schC=[];
      if(scC)for(let i=0;i<6;i++){
        const row=31+(i*4);
        const desc=gcStr(scC,`C${row}`),gain=gcNum(scC,`F${row}`),loss=gcNum(scC,`G${row}`);
        if(rowHasData(desc,gain,loss))D.schC.push({description:desc,date:gcDate(scC,`E${row}`),gain,loss});
      }

      // Schedule D-1 — cash assets
      const sd1=workbook.getWorksheet('SCH D-1 CASH p1');
      D.schD1=[];
      if(sd1)for(let i=0;i<11;i++){
        const row=25+(i*3);
        const desc=gcStr(sd1,`C${row}`),amt=gcNum(sd1,`H${row}`);
        if(rowHasData(desc,amt))D.schD1.push({description:desc,accountNo:gcStr(sd1,`E${row}`),restricted:gcStr(sd1,`F${row}`)||'No',type:gcStr(sd1,`G${row}`),fullAmount:amt,wardPct:gcPct(sd1,`I${row}`),restrictedAmt:''});
      }

      // Schedule D-2 — real estate
      const sd2=workbook.getWorksheet('SCH D-2 REAL ESTATE p1');
      D.schD2=[];
      if(sd2)for(let i=0;i<8;i++){
        const row=20+(i*4);
        const desc=gcStr(sd2,`C${row}`),val=gcNum(sd2,`G${row}`);
        if(rowHasData(desc,val))D.schD2.push({description:desc,residence:gcStr(sd2,`E${row}`)||'No',income:gcStr(sd2,`F${row}`)||'No',fullValue:val,wardPct:gcPct(sd2,`H${row}`),carryingValue:gcNum(sd2,`I${row}`),wardValue:''});
      }

      // Schedule D-3 — personal property
      const sd3=workbook.getWorksheet('SCH D-3 PERSONAL PROP p1');
      D.schD3=[];
      if(sd3)for(let i=0;i<4;i++){
        const row=31+(i*4);
        const desc=gcStr(sd3,`C${row}`),amt=gcNum(sd3,`F${row}`);
        if(rowHasData(desc,amt))D.schD3.push({description:desc,fullAmount:amt,wardPct:gcPct(sd3,`G${row}`),carryingValue:gcNum(sd3,`H${row}`),wardAmount:''});
      }

      // Schedule D-4 — intangibles
      const sd4=workbook.getWorksheet('SCH D-4 INTANGIBLE p1 ');
      D.schD4=[];
      if(sd4)for(let i=0;i<9;i++){
        const row=18+(i*4);
        const desc=gcStr(sd4,`C${row}`),amt=gcNum(sd4,`G${row}`);
        if(rowHasData(desc,amt))D.schD4.push({description:desc,restricted:gcStr(sd4,`F${row}`)||'No',fullAmount:amt,wardPct:gcPct(sd4,`H${row}`),carryingValue:gcNum(sd4,`I${row}`),wardValue:'',restrictedAmt:''});
      }

      // Schedule D-5 — mortgages / liabilities
      const sd5=workbook.getWorksheet('SCH D-5 MORTGAGES p1');
      D.schD5=[];
      if(sd5)for(let i=0;i<7;i++){
        const row=23+(i*4);
        const desc=gcStr(sd5,`C${row}`),debt=gcNum(sd5,`G${row}`);
        if(rowHasData(desc,debt))D.schD5.push({description:desc,loanNo:gcStr(sd5,`E${row}`),loanType:gcStr(sd5,`F${row}`),fullDebt:debt,wardPct:gcPct(sd5,`H${row}`),wardBalance:''});
      }

      // Schedule E — bank transfers
      const seE=workbook.getWorksheet('SCH E BANK TRANS p1');
      D.schE=[];
      if(seE)for(let row=14;row<=40;row++){
        const bankName=gcStr(seE,`C${row}`),inAmt=gcNum(seE,`F${row}`),outAmt=gcNum(seE,`H${row}`);
        if(rowHasData(bankName,inAmt,outAmt))D.schE.push({bankName,transferInDate:gcDate(seE,`E${row}`),transferInAmt:inAmt,transferOutDate:gcDate(seE,`G${row}`),transferOutAmt:outAmt});
      }

      // Schedule F-1 / F-2 — sales (same layout)
      const importSalesSchedule=(ws,startRow,step,maxCount)=>{
        const rows=[];
        if(!ws)return rows;
        for(let i=0;i<maxCount;i++){
          const row=startRow+(i*step);
          const desc=gcStr(ws,`C${row}`),price=gcNum(ws,`I${row}`);
          if(rowHasData(desc,price))rows.push({description:desc,bank:gcStr(ws,`F${row}`),accountNo:gcStr(ws,`G${row}`),courtOrderDate:gcDate(ws,`H${row}`),salePrice:price});
        }
        return rows;
      };
      D.schF1=importSalesSchedule(workbook.getWorksheet('SCH F-1 SALES REAL PROP p1'),19,5,8);
      D.schF2=importSalesSchedule(workbook.getWorksheet('SCH F-2 SALES PERSONAL PROP p1'),17,4,11);

      // Part VIII — trusts. "Has any trust" is a single global answer;
      // per-trust fields live at the D-anchor of each merged range.
      const p8=workbook.getWorksheet('PART VIII');
      if(p8){
        const trustRows=[[10,12,13,14,15,16,17,18],[20,22,23,24,25,26,27,28],[30,32,33,34,35,36,37,38]];
        const hasAnyTrust=gcStr(p8,'D8')==='Yes';
        D.trusts=trustRows.map(rows=>{
          const [gidRow,nameRow,trusteeRow,acctRow,dateRow,typeRow,pctRow,amtRow]=rows;
          return {
            hasTrust:hasAnyTrust?'Yes':'No', createdAfterGID:gcStr(p8,`H${gidRow}`)||'No',
            name:gcStr(p8,`D${nameRow}`), trustee:gcStr(p8,`D${trusteeRow}`),
            accountNo:gcStr(p8,`D${acctRow}`), dateCreated:gcDate(p8,`D${dateRow}`),
            trustType:gcStr(p8,`D${typeRow}`), wardPct:gcStr(p8,`D${pctRow}`), wardAmount:gcNum(p8,`D${amtRow}`)
          };
        });
      }

      // Part IX — bond
      const p9=workbook.getWorksheet('PART IX ');
      if(p9){
        D.guardianRelationship=gcStr(p9,'G8')||D.guardianRelationship;
        D.restrictedDepositoryReceiptDate=gcDate(p9,'G9');
        D.bondAmount=gcNum(p9,'H20');
        D.bondPeriodFrom=gcDate(p9,'E21');
        D.bondPeriodTo=gcDate(p9,'G21');
        D.bondingCompany=gcStr(p9,'D22');
      }

      // Part X — certificate of service
      const p10=workbook.getWorksheet('PART X');
      if(p10){
        D.certRecipients=[
          {name:gcStr(p10,'B11'),line2:gcStr(p10,'B12'),line3:gcStr(p10,'B13'),line4:gcStr(p10,'B14')},
          {name:gcStr(p10,'I11'),line2:gcStr(p10,'I12'),line3:gcStr(p10,'I13'),line4:gcStr(p10,'I14')},
          {name:gcStr(p10,'B17'),line2:gcStr(p10,'B18'),line3:gcStr(p10,'B19'),line4:gcStr(p10,'B20')},
          {name:gcStr(p10,'I17'),line2:gcStr(p10,'I18'),line3:gcStr(p10,'I19'),line4:gcStr(p10,'I20')}
        ];
        D.certDate=gcDate(p10,'G23');
        D.certIndicator=gcStr(p10,'K23');
        D.certAttySignDate=gcDate(p10,'G25');
      }

      // Part XI — remuneration is deliberately NOT imported. Both the
      // guardian-filled file and the blank 2022 official template show
      // this sheet holding only the declaratory paragraph (single A:G
      // merges) with no actual entry grid anywhere in it — there is no
      // reliable cell range to read entries back from.

      capitalizeImportedFields(D);
      // See the matching note in importExcelSimplified: capitalizeImportedFields
      // only reaches name/address-shaped fields, so this closes the gap for
      // caseNumber, county, filingType, amendedForm, the trust fields, and
      // the D-1/D-2/D-4 restricted/residence/income columns — none of which
      // that keyword list matches. In-place because D is window.D itself.
      sanitizeObjectDataInPlace(D);
      autoSave();
      if(prog)prog.textContent='✓ Template loaded and data imported successfully.';
      setTimeout(()=>{if(prog)prog.textContent='';},3000);
      renderPage(currentPage);
    }catch(err){
      console.error('Annual Accounting import failed:',err);
      if(prog)prog.textContent='✗ Import failed: '+(err&&err.message?err.message:'the file could not be parsed.');
    }finally{
      input.value='';
    }
  };
  reader.readAsArrayBuffer(file);
}

// ═══════════════════════════════════════════════════════
// WIZARD: GUARDIAN INVENTORY - FULL IMPLEMENTATION
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// DATA MODEL
// ═══════════════════════════════════════════════════════
const mk = {
  guardian:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null}),
  preparer:()=>({name:'',ssnEin:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null}),
  attorney:()=>({name:'',barNumber:'',phone:'',streetAddress:'',cityStateZip:'',signatureDate:null,filingDate:null}),
  recipient:()=>({name:'',address:'',cityStateZip:''}),
  a1:()=>({propertyDescription:'',streetAddress:'',cityStateZip:'',notes:'',isPersonalResidence:false,isIncomeProperty:false,fullAssetValue:0,wardPercent:100}),
  a2:()=>({lenderName:'',lenderAddress:'',lenderCityStateZip:'',accountNumber:'',notes:'',liabilityType:'Mortgage',fullDebtBalance:0,wardPercent:100}),
  b1:()=>({institutionName:'',isRestricted:false,accountType:'',accountNumber:'',streetAddress:'',cityStateZip:'',fullAssetAmount:0,wardPercent:100}),
  b2:()=>({description:'',streetAddress:'',cityStateZip:'',valuationMethod:'',fullAssetValue:0,wardPercent:100,inSafeDepositBox:false,amountInSDB:0,isVehicle:false,vehicleYear:'',vehicleMake:'',vehicleModel:'',vehicleVin:'',odometerMileage:''}),
  b3:()=>({description:'',streetAddress:'',cityStateZip:'',isRestricted:false,fullAssetValue:0,wardPercent:100,inSafeDepositBox:false,amountInSDB:0}),
  b4:()=>({lenderName:'',relatedProperty:'',accountNumber:'',lenderAddress:'',liabilityType:'Loan',fullLiabilityBalance:0,wardPercent:100}),
  c1:()=>({payerName:'',payerAddress:'',payerCityStateZip:'',typeOfIncome:'',frequencyOfPayment:'Monthly',paymentBasis:'',annualIncomeAmount:0,wardPercent:100}),
  c2:()=>({claimantName:'',lawsuitDescription:'',courtJurisdiction:'',caseNumber:'',claimantAddress:'',dateFiled:null,amountOfClaim:0,wardPercent:100}),
  c3:()=>({defendantName:'',actionDescription:'',status:'',courtJurisdiction:'',caseNumber:'',actionDate:null,estimatedSettlement:0,wardPercent:100}),
  c4:()=>({trustName:'',trusteeName:'',trusteeAddress:'',trusteeCityStateZip:'',dateCreated:null,accountNumber:'',trustType:'Pooled',trustAmount:0,wardPercent:100}),
  c5:()=>({assetDescription:'',ownerName:'',ownerAddress:'',ownerCityStateZip:'',relationshipToWard:'',totalAssetValue:0,jointOwnerPercent:50}),
};

// Schedules covered by pruneBlankScheduleEntries() (see navigate()): the
// repeatable financial line-item schedules only, keyed by their property on
// D, each mapped to the exact blank object its own +Add button pushes.
// Deliberately NOT the guardian/preparer/attorney/recipient "party" arrays
// (guardians, serviceRecipients) -- several pages assume those always hold
// at least one entry, and pruning one to empty risks breaking that, not
// just tidying an unused row. Also deliberately not `remuneration`, which
// two different form engines push a different shape into (Plan forms:
// guardian/type/description; Annual Accounting: +amount) -- one template
// can't safely match both.
const BLANK_SCHEDULE_ENTRY = {
  // Guardian form (Initial Inventory) -- same factory addEntry() already uses.
  scheduleA1:mk.a1, scheduleA2:mk.a2, scheduleB1:mk.b1, scheduleB2:mk.b2, scheduleB3:mk.b3,
  scheduleB4:mk.b4, scheduleC1:mk.c1, scheduleC2:mk.c2, scheduleC3:mk.c3, scheduleC4:mk.c4, scheduleC5:mk.c5,
  // Annual Accounting -- copied verbatim from each schedule's own +Add button.
  schA:()=>({payer:'',description:'',bank:'',accountNo:'',amount:''}),
  schB1:()=>({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB2:()=>({bankAcct:'',checkNo:'',periodFrom:'',periodTo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB3:()=>({bankAcct:'',checkNo:'',datePaid:'',payee:'',courtOrderDate:'',amount:''}),
  schB4:()=>({checkNo:'',datePaid:'',category:'',payee:'',amount:''}),
  schC:()=>({description:'',date:'',gain:'',loss:''}),
  schD1:()=>({description:'',accountNo:'',restricted:'No',type:'',fullAmount:'',wardPct:'',restrictedAmt:''}),
  schD2:()=>({description:'',residence:'No',income:'No',fullValue:'',wardPct:'',carryingValue:'',wardValue:''}),
  schD3:()=>({description:'',fullAmount:'',wardPct:'',carryingValue:'',wardAmount:''}),
  schD4:()=>({description:'',restricted:'No',fullAmount:'',wardPct:'',carryingValue:'',wardValue:'',restrictedAmt:''}),
  schD5:()=>({description:'',loanNo:'',loanType:'',fullDebt:'',wardPct:'',wardBalance:''}),
  schE:()=>({bankName:'',transferInDate:'',transferInAmt:'',transferOutDate:'',transferOutAmt:''}),
  schF1:()=>({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''}),
  schF2:()=>({description:'',bank:'',accountNo:'',courtOrderDate:'',salePrice:''}),
};

// Deep-equals the schedule's own blank-entry template above -- not a
// generic "is this value empty" guess, since several schedules default a
// field to something other than '' (Guardian's wardPercent starts at 100,
// several Annual Yes/No fields start at 'No') and a generic check would
// never recognize those as untouched.
function isBlankScheduleEntry(key,entry){
  const template=BLANK_SCHEDULE_ENTRY[key];
  if(!template||!entry||typeof entry!=='object')return false;
  const blank=template();
  for(const k of new Set([...Object.keys(blank),...Object.keys(entry)])){
    if(entry[k]!==blank[k])return false;
  }
  return true;
}

// Removes any entry in a covered schedule that's still exactly what +Add
// left it as. Without this, clicking +Add and then navigating to another
// tab without typing anything left that row permanently counted against
// the schedule -- a false "started but incomplete" warning in the sidebar
// forever, and (had the guardian not noticed) an empty numbered line item
// in the PDF/Excel export. Called from navigate() only when actually
// leaving the current page, never when a +Add button's own onclick
// re-navigates to the SAME page to show the row it just added.
function pruneBlankScheduleEntries(){
  if(!window.D)return;
  let changed=false;
  for(const key of Object.keys(BLANK_SCHEDULE_ENTRY)){
    const arr=window.D[key];
    if(!Array.isArray(arr)||!arr.length)continue;
    const kept=arr.filter(e=>!isBlankScheduleEntry(key,e));
    if(kept.length!==arr.length){
      window.D[key]=kept;
      changed=true;
    }
  }
  if(changed)autoSave();
}

// ═══════════════════════════════════════════════════════
// CALCULATIONS
// ═══════════════════════════════════════════════════════
const calc={
  wardVal:(e)=>r2((e.fullAssetValue||0)*((e.wardPercent||0)/100)),
  wardDebt:(e)=>r2((e.fullDebtBalance||0)*((e.wardPercent||0)/100)),
  wardAmt:(e)=>r2((e.fullAssetAmount||0)*((e.wardPercent||0)/100)),
  wardB2:(e)=>r2((e.fullAssetValue||0)*((e.wardPercent||0)/100)),
  wardB3:(e)=>r2((e.fullAssetValue||0)*((e.wardPercent||0)/100)),
  wardB4:(e)=>r2((e.fullLiabilityBalance||0)*((e.wardPercent||0)/100)),
  wardC1:(e)=>r2((e.annualIncomeAmount||0)*((e.wardPercent||0)/100)),
  wardC2:(e)=>r2((e.amountOfClaim||0)*((e.wardPercent||0)/100)),
  wardC3:(e)=>r2((e.estimatedSettlement||0)*((e.wardPercent||0)/100)),
  wardC4:(e)=>r2((e.trustAmount||0)*((e.wardPercent||0)/100)),
  wardC5:(e)=>r2((e.totalAssetValue||0)*((e.jointOwnerPercent||0)/100)),
  totalA1:()=>r2(D.scheduleA1.reduce((s,e)=>s+calc.wardVal(e),0)),
  totalA2:()=>r2(D.scheduleA2.reduce((s,e)=>s+calc.wardDebt(e),0)),
  netA:()=>calc.totalA1()-calc.totalA2(),
  totalB1:()=>r2(D.scheduleB1.reduce((s,e)=>s+calc.wardAmt(e),0)),
  totalB2:()=>r2(D.scheduleB2.reduce((s,e)=>s+calc.wardB2(e),0)),
  totalB3:()=>r2(D.scheduleB3.reduce((s,e)=>s+calc.wardB3(e),0)),
  totalB4:()=>r2(D.scheduleB4.reduce((s,e)=>s+calc.wardB4(e),0)),
  netB:()=>calc.totalB1()+calc.totalB2()+calc.totalB3()-calc.totalB4(),
  total:()=>calc.netA()+calc.netB(),
  totalC1:()=>r2(D.scheduleC1.reduce((s,e)=>s+calc.wardC1(e),0)),
  totalC2:()=>r2(D.scheduleC2.reduce((s,e)=>s+calc.wardC2(e),0)),
  totalC3:()=>r2(D.scheduleC3.reduce((s,e)=>s+calc.wardC3(e),0)),
  totalC4:()=>r2(D.scheduleC4.reduce((s,e)=>s+calc.wardC4(e),0)),
  totalC5:()=>r2(D.scheduleC5.reduce((s,e)=>s+calc.wardC5(e),0)),
  restrictedCash:()=>r2(D.scheduleB1.filter(e=>e.isRestricted).reduce((s,e)=>s+calc.wardAmt(e),0)),
  unrestrictedCash:()=>r2(D.scheduleB1.filter(e=>!e.isRestricted).reduce((s,e)=>s+calc.wardAmt(e),0)),
  restrictedIntang:()=>r2(D.scheduleB3.filter(e=>e.isRestricted).reduce((s,e)=>s+calc.wardB3(e),0)),
  unrestrictedIntang:()=>r2(D.scheduleB3.filter(e=>!e.isRestricted).reduce((s,e)=>s+calc.wardB3(e),0)),
  bondRequired:()=>calc.unrestrictedCash()+calc.totalB2()+calc.unrestrictedIntang(),
  auditFee:()=>calc.total()>25000?85:0,
};

// ═══════════════════════════════════════════════════════
// Page navigation helper (used by Guardian page renderers). Reuses
// PAGES_GUARDIAN (defined alongside emptyDataGuardian()) rather than its
// own copy of the same list -- this used to keep two hardcoded route
// lists in sync by hand.
const SCHEDULE_NAV_KEYS=['a1','a2','b1','b2','b3','b4','c1','c2','c3','c4','c5'];
// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox
// -- see scheduleComplete() there). Only gates the 11 schedule pages;
// Cover, Summary, D-1..D-5, and Print are never gated this way.
function isScheduleIncomplete(route){
  const key=route.startsWith('/')?route.slice(1):route;
  if(!SCHEDULE_NAV_KEYS.includes(key))return false;
  const r=computeNavChecks();
  return !!(r&&!r.checks[key]);
}
function pageNav(current){
  const PAGES=PAGES_GUARDIAN;
  const idx=PAGES.findIndex(p=>p.id===current);
  const prev=idx>0?PAGES[idx-1]:null;
  const next=idx<PAGES.length-1?PAGES[idx+1]:null;
  const nextDisabled=isScheduleIncomplete(current);
  return `<div class="page-nav no-print d-flex justify-content-between align-items-center">
    <div>${prev?`<button class="btn btn-outline-primary btn-sm" onclick="navigate('${prev.id}')">← Previous: ${prev.label}</button>`:'&nbsp;'}</div>
    <small style="color:var(--ink-3);">Page ${idx+1} of ${PAGES.length}</small>
    <div>${next?`<button id="page-next-btn" class="btn btn-primary btn-sm" ${nextDisabled?'disabled title="Add at least one item, or check the box verifying there are none, before continuing."':''} onclick="navigate('${next.id}')">Next: ${next.label} →</button>`:'&nbsp;'}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// FORM BINDING ENGINE
// ═══════════════════════════════════════════════════════
function getPath(obj,path){
  return path.split('.').reduce((o,k)=>o==null?undefined:o[k],obj);
}
function setPath(obj,path,val){
  const keys=path.split('.');
  let cur=obj;
  for(let i=0;i<keys.length-1;i++){
    if(cur[keys[i]]==null)cur[keys[i]]={};
    cur=cur[keys[i]];
  }
  cur[keys[keys.length-1]]=val;
}

function bindForms(){
  document.querySelectorAll('[data-bind]:not([data-bound])').forEach(el=>{
    el.setAttribute('data-bound','1');
    const path=el.dataset.bind;
    const cur=getPath(window.D,path);

    if(el.type==='checkbox'){
      el.checked=!!cur;
      el.addEventListener('change',e=>{setPath(window.D,path,e.target.checked);afterChange(path);});
    } else if(el.type==='date'){
      if(cur){
        const s=typeof cur==='string'?cur:new Date(cur).toISOString();
        el.value=s.substring(0,10);
      }
      el.addEventListener('change',e=>{setPath(window.D,path,e.target.value||null);afterChange(path);});
    } else if(el.type==='number'){
      el.value=Math.max(0,parseFloat(cur)||0);
      el.addEventListener('keydown',e=>{if(e.key==='-'||e.key==='Subtract'){e.preventDefault();}});
      el.addEventListener('input',e=>{
        e.target.value=e.target.value.replace(/-/g,'');
        const v=Math.max(0,parseFloat(e.target.value)||0);
        setPath(window.D,path,v);afterChange(path);
      });
    } else if(el.tagName==='SELECT'){
      el.value=cur!=null?String(cur):'';
      el.addEventListener('change',e=>{
        let v=e.target.value;
        if(v==='true')v=true; else if(v==='false')v=false;
        setPath(window.D,path,v);afterChange(path);
      });
    } else {
      const inputType=el.dataset.inputType||'text';
      if(inputType==='phone'){
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
      }else if(inputType==='decimal'){
        el.value=sanitizeNonNegativeDecimal(cur||'');
      }else{
        el.value=cur||'';
      }
      el.addEventListener('input',e=>{
        let val=e.target.value;
        if(inputType==='decimal'){
          val=sanitizeNonNegativeDecimal(val);
          e.target.value=val;
          setPath(window.D,path,parseFloat(val)||0);
          afterChange(path);
          return;
        }else if(inputType==='phone'){
          val=formatPhone(val);
          e.target.value=val;
        }else if(inputType==='name'){
          val=formatName(val);
          e.target.value=val;
        }else if(inputType==='address'){
          val=formatAddress(val);
          e.target.value=val;
        }else if(inputType==='ssn'){
          val=formatSSN(val);
          e.target.value=val;
        }else if(inputType==='caseNumber'){
          val=formatCaseNumber(val);
          e.target.value=val;
        }else if(inputType==='barNumber'){
          val=formatBarNumber(val);
          e.target.value=val;
        }else if(inputType==='accountNumber'){
          val=formatAccountNumber(val);
          e.target.value=val;
        }else if(inputType==='checkNumber'){
          val=formatCheckNumber(val);
          e.target.value=val;
        }else if(inputType==='zip'){
          applyZipLimit(e.target);
          e.target.value=formatCityStateZip(e.target.value);
          val=e.target.value;
        }else if(inputType==='county'){
          filterCountyDropdown(e.target);
        }
        // Prevent negative values in number inputs
        if(el.type==='number'){
          val=val.replace(/^-/,'');
          e.target.value=val;
        }
        setPath(window.D,path,val);afterChange(path);
      });
      // Case Number only fully resolves to YY-######-GD (padded sequence,
      // fixed GD suffix) on blur -- see finalizeCaseNumber()'s own comment
      // for why that can't happen on every keystroke like the other
      // inputType formatters above do.
      if(inputType==='caseNumber'){
        el.addEventListener('blur',()=>{
          el.value=finalizeCaseNumber(el.value);
          setPath(window.D,path,el.value);afterChange(path);
        });
      }
    }
  });
}

// Splits cleanly in two: computeNavChecks() is pure (reads window.D, returns
// the per-section completion map) and updateNavDots() applies it to the DOM.
// The split exists so the dashboard can compute a ward's filing progress
// WITHOUT that ward being the active one — see getWardProgress().
function computeNavChecks(){
  if(activeInventoryType==='guardian'){
    // Single source of truth: every section's ✓/− here comes from the SAME
    // errors validate() produces and Print Preview's export gate checks --
    // not a second, separately-maintained set of looser rules. That older
    // approach let a schedule row with e.g. $0 for a required dollar amount,
    // or a D-2/D-4/D-5 page with only some of its required fields filled,
    // show a green ✓ in the sidebar while validate() still listed it as
    // missing on Print Preview, with no way to know the two disagreed until
    // export was blocked there. errorRoute() already turns each error's
    // "<Section> — <field>" prefix into a route ("A-1 row 2"->"/a1", "D-2
    // Preparer"->"/d2", "Cover"->"/") for the validation panel's own "Go to
    // section" links -- reused here to bucket every error onto the same key
    // the sidebar and Next-button gating use, so the two can't drift apart.
    const trackedKeys=['cover',...SCHEDULE_NAV_KEYS,'d1','d2','d3','d4','d5'];
    const checks={};
    trackedKeys.forEach(k=>checks[k]=true);
    validate().forEach(e=>{
      const str=String(e);
      const i=str.indexOf(' — ');
      const section=i>-1?str.slice(0,i).trim():'';
      const route=errorRoute(section);
      const key=route==='/'?'cover':route?route.slice(1):null;
      if(key&&key in checks)checks[key]=false;
    });
    return {checks,incomplete:{}};
  } else if(activeInventoryType==='simplified'){
    const filled=v=>v!==''&&v!==null&&v!==undefined;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const guardianComplete=g=>filled(g.name)&&filled(g.signatureDate)&&filled(g.ssn)&&filled(g.phone)&&filled(g.email)&&filled(g.mailingStreet)&&filled(g.mailingCityStateZip)&&filled(g.residenceStreet)&&filled(g.residenceCityStateZip);
    const checks={
      's-cover':D.eligDepository==='Yes'&&D.eligOnlyTransactions==='Yes'&&filled(D.wardName)&&filled(D.caseNumber)&&filled(D.ssn)&&filled(D.gid)&&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.attorney)&&filled(D.typeOfGuardianship)&&filled(D.county)&&filled(D.amendedForm),
      's-p2':filled(D.startingBalance)&&filled(D.interestIncome)&&filled(D.depositsSettlement)&&filled(D.serviceCharges)&&filled(D.federalIncomeTax),
      's-p3':filled(D.periodFrom)&&filled(D.periodTo),
      's-p4':guardianComplete(D.guardians[0]||{})&&D.guardians.every((g,i)=>i===0||!guardianHasAnyData(g)||guardianComplete(g)),
      's-p5':filled(D.attorney_barNumber)&&filled(D.attorney_phone)&&filled(D.attorney_street)&&filled(D.attorney_cityStateZip),
      's-p6':filled(D.certServiceDate)&&filled(D.certIndicator)&&filled(D.certRecipients[0].name)&&filled(D.certRecipients[2].name),
      's-p7':D.remuneration.some(r=>filled(r.guardian)&&filled(r.type)),
    };
    const incomplete={
      's-cover':!checks['s-cover']&&hasAny(D.wardName,D.caseNumber,D.ssn,D.gid,D.periodFrom,D.periodTo,D.guardian,D.attorney,D.typeOfGuardianship,D.county),
      's-p2':!checks['s-p2']&&hasAny(D.startingBalance,D.interestIncome,D.depositsSettlement,D.serviceCharges,D.federalIncomeTax),
      's-p3':!checks['s-p3']&&hasAny(D.periodFrom,D.periodTo),
      's-p4':!checks['s-p4']&&(D.guardians.length>0||guardianHasAnyData(D.guardians[0]||{})),
      's-p5':!checks['s-p5']&&hasAny(D.attorney_barNumber,D.attorney_phone,D.attorney_street,D.attorney_cityStateZip),
      's-p6':!checks['s-p6']&&hasAny(D.certServiceDate,D.certIndicator,D.certRecipients[0]?.name,D.certRecipients[2]?.name),
      's-p7':!checks['s-p7']&&D.remuneration.some(r=>hasAny(r.guardian,r.type)),
    };
    return {checks,incomplete};
  } else if(formEngine(activeInventoryType)==='annual'){
    const filled=v=>v!==''&&v!==null&&v!==undefined;
    const guardianComplete=g=>filled(g.name)&&filled(g.signatureDate)&&filled(g.ssn)&&filled(g.phone)&&filled(g.mailingStreet)&&filled(g.mailingCityStateZip);
    const rowHasAnyData=r=>Object.values(r).some(v=>v!==''&&v!=null);
    const rowsComplete=(rows,fields)=>(rows||[]).length>0&&(rows||[]).every(r=>rowHasAnyData(r)&&fields.every(f=>filled(r[f])));
    const rowsStarted=(rows,fields)=>(rows||[]).some(r=>rowHasAnyData(r));
    const t=calcTotalsAnnual();
    const checks={
      'a-p1':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.gid)&&filled(D.guardian)&&filled(D.county)&&filled(D.filingType),
      'a-p2':filled(D.startingBalance),
      'a-p3':guardianComplete(D.guardians[0]||{})&&D.guardians.every((g,i)=>i===0||!guardianHasAnyData(g)||guardianComplete(g)),
      'a-p4':filled(D.preparer.name)&&filled(D.preparer.signatureDate)&&filled(D.preparer.ssn)&&filled(D.preparer.phone)&&filled(D.preparer.street)&&filled(D.preparer.cityStateZip),
      'a-p5':filled(D.attorney_bar)&&filled(D.attorney_phone)&&filled(D.attorney_street)&&filled(D.attorney_cityStateZip)&&filled(D.attorney_signatureDate),
      // Complete when the two lines agree, or the difference is explained.
      'a-p67':(()=>{const r=annualReconcileState(t);return !r.outOfBalance||r.explained;})(),
      'a-p8':D.trusts.some(t=>t.name),
      'a-p9':filled(D.bondAmount)&&filled(D.bondingCompany),
      'a-p10':filled(D.certDate)&&filled(D.certRecipients[0].name),
      'a-p11':D.remuneration.some(r=>r.guardian||r.type||r.amount),
      'a-scha':rowsComplete(D.schA,['payer','description','bank','accountNo','amount']),
      'a-schb1':rowsComplete(D.schB1,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb2':rowsComplete(D.schB2,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb3':rowsComplete(D.schB3,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb4':rowsComplete(D.schB4,['checkNo','datePaid','category','payee','amount']),
      'a-schc':(D.schC||[]).length>0&&(D.schC||[]).every(r=>rowHasAnyData(r)&&filled(r.description)&&filled(r.date)&&(filled(r.gain)||filled(r.loss))),
      'a-schd1':rowsComplete(D.schD1,['description','accountNo','restricted','type','fullAmount','wardPct']),
      'a-schd2':rowsComplete(D.schD2,['description','residence','income','fullValue','wardPct','carryingValue']),
      'a-schd3':rowsComplete(D.schD3,['description','fullAmount','wardPct','carryingValue']),
      'a-schd4':rowsComplete(D.schD4,['description','restricted','fullAmount','wardPct','carryingValue']),
      'a-schd5':rowsComplete(D.schD5,['description','loanNo','loanType','fullDebt','wardPct']),
      'a-sche':(D.schE||[]).length>0&&(D.schE||[]).every(r=>rowHasAnyData(r)&&filled(r.bankName)&&((filled(r.transferInDate)&&filled(r.transferInAmt))||(filled(r.transferOutDate)&&filled(r.transferOutAmt)))),
      'a-schf1':rowsComplete(D.schF1,['description','bank','accountNo','courtOrderDate','salePrice']),
      'a-schf2':rowsComplete(D.schF2,['description','bank','accountNo','courtOrderDate','salePrice']),
    };
    const incomplete={
      'a-p1':!checks['a-p1'],
      'a-p2':!checks['a-p2']&&filled(D.startingBalance),
      'a-p3':!checks['a-p3']&&(D.guardians.length>0||guardianHasAnyData(D.guardians[0]||{})),
      'a-p4':!checks['a-p4'],
      'a-p5':!checks['a-p5'],
      'a-scha':!checks['a-scha']&&rowsStarted(D.schA,['payer','description','bank','accountNo','amount']),
      'a-schb1':!checks['a-schb1']&&rowsStarted(D.schB1,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb2':!checks['a-schb2']&&rowsStarted(D.schB2,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb3':!checks['a-schb3']&&rowsStarted(D.schB3,['bankAcct','checkNo','datePaid','payee','amount']),
      'a-schb4':!checks['a-schb4']&&rowsStarted(D.schB4,['checkNo','datePaid','category','payee','amount']),
      'a-schc':!checks['a-schc']&&(D.schC||[]).length>0,
      'a-schd1':!checks['a-schd1']&&rowsStarted(D.schD1,['description','accountNo','restricted','type','fullAmount','wardPct']),
      'a-schd2':!checks['a-schd2']&&rowsStarted(D.schD2,['description','residence','income','fullValue','wardPct','carryingValue']),
      'a-schd3':!checks['a-schd3']&&rowsStarted(D.schD3,['description','fullAmount','wardPct','carryingValue']),
      'a-schd4':!checks['a-schd4']&&rowsStarted(D.schD4,['description','restricted','fullAmount','wardPct','carryingValue']),
      'a-schd5':!checks['a-schd5']&&rowsStarted(D.schD5,['description','loanNo','loanType','fullDebt','wardPct']),
      'a-sche':!checks['a-sche']&&(D.schE||[]).length>0,
      'a-schf1':!checks['a-schf1']&&rowsStarted(D.schF1,['description','bank','accountNo','courtOrderDate','salePrice']),
      'a-schf2':!checks['a-schf2']&&rowsStarted(D.schF2,['description','bank','accountNo','courtOrderDate','salePrice']),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planSimplified'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const g0=(D.planGuardians||[])[0]||{};
    // Q8 is answered once ANY box is ticked (NONE is itself a box), so a
    // boolean-or is the completion test rather than a filled() on each.
    const q8Answered=!!(D.q8DNR||D.q8LivingWill||D.q8Surrogate||D.q8POA||D.q8Other||D.q8None)
      &&(!D.q8Other||filled(D.q8OtherText))
      &&!(D.q8None&&(D.q8DNR||D.q8LivingWill||D.q8Surrogate||D.q8POA||D.q8Other));
    const checks={
      'ps-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.periodFrom)&&filled(D.periodTo),
      'ps-p2':filled(D.q1Residences)&&filled(D.q2BestPlacement)&&filled(D.q3MedicalTreatment)&&filled(D.q4Diagnosis)
        &&filled(D.q5SocialServices)&&filled(D.q6Interaction)
        &&filled(D.q7RestoreRights)&&(D.q7RestoreRights!=='Yes'||filled(D.q7RestoreExplain))
        &&q8Answered
        &&filled(D.q9Remuneration)&&(D.q9Remuneration!=='Yes'||filled(D.q9RemunerationExplain)),
      'ps-p3':filled(g0.name)&&filled(g0.signatureDate),
    };
    const incomplete={
      'ps-cover':!checks['ps-cover']&&hasAny(D.wardName,D.caseNumber,D.periodFrom,D.periodTo),
      'ps-p2':!checks['ps-p2']&&hasAny(D.q1Residences,D.q2BestPlacement,D.q3MedicalTreatment,D.q4Diagnosis,D.q5SocialServices,D.q6Interaction,D.q7RestoreRights,D.q9Remuneration,D.q8DNR,D.q8LivingWill,D.q8Surrogate,D.q8POA,D.q8Other,D.q8None),
      'ps-p3':!checks['ps-p3']&&hasAny(g0.name,g0.signatureDate,g0.email,g0.phone,g0.mailingAddress),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planAnnual'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const anyOf=(...vals)=>vals.some(v=>!!v);
    const g0=(D.planGuardians||[])[0]||{};
    const res=(D.q1Residences||[]).filter(r=>r&&(r.name||r.street||r.cityStateZip));
    const provs=(D.q4Providers||[]).filter(r=>r&&(r.name||r.providerType||r.visits));
    const rights=D.rights||{}, adls=D.adls||{};
    const b=D.benefits||{};
    const anyBenefit=PLAN_BENEFITS.some(([k])=>(b[k]||{}).eligible||(b[k]||{}).appliedFor);
    const checks={
      'pa-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.gid)
        &&filled(D.periodFrom)&&filled(D.periodTo)&&filled(D.guardian)&&filled(D.wardLiving)
        &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip),
      'pa-p2':res.length>0&&res.every(r=>filled(r.name)),
      'pa-p3':anyOf(D.q2NoMove,D.q2WithinCounty,D.q2WithinCircuit,D.q2OutsideApproved,D.q2OutsideVenuePetition)
        &&anyOf(D.q3SettingALF,D.q3SettingGroupHome,D.q3SettingIntermediate,D.q3SettingPrivate,
                D.q3SettingSkilled,D.q3SettingSpecialized,D.q3SettingStateHospital,D.q3SettingOther)
        &&(!D.q3SettingOther||filled(D.q3SettingExplain))
        &&(!D.q3MedSpecialist||filled(D.q3MedSpecialistArea)),
      // Benefits is "check all that apply" — answered once any benefit row
      // is ticked, or the explicit None box is.
      'pa-p4':anyBenefit||!!D.q3BenefitsNone||!!D.q3BenefitsOther,
      // The form allows a ward to have had no professional treatment at
      // all, so an empty table is complete; only half-filled rows aren't.
      'pa-p5':provs.every(r=>filled(r.name)),
      'pa-p6':filled(D.q5SocialSkills)&&filled(D.q5Activities)
        &&PLAN_RIGHTS.every(([k])=>filled(rights[k])),
      'pa-p7':PLAN_ADLS.every(([k])=>filled(adls[k])),
      'pa-p8':anyOf(D.q9MentalNone,D.q9MentalDementia,D.q9MentalAlzheimers,D.q9MentalAutism,D.q9MentalHeadInjury,
                    D.q9MentalDevelopmental,D.q9MentalIntellectual,D.q9MentalSchizophrenia,D.q9MentalDepression,
                    D.q9MentalSubstance,D.q9MentalOther)
        &&anyOf(D.q9PhysNone,D.q9PhysMobility,D.q9PhysBlindness,D.q9PhysDeafness,D.q9PhysDiabetic,
                D.q9PhysParkinsons,D.q9PhysArthritis,D.q9PhysOther)
        &&(!D.q9MentalOther||filled(D.q9MentalExplain))
        &&(!D.q9PhysOther||filled(D.q9PhysExplain)),
      'pa-p9':(!!D.q10NoDirectives!==!!D.q10Executed)&&(!D.q10ExecOther||filled(D.q10ExecOtherText)),
      'pa-p10':D.q11NoRemuneration?filled(D.q11NoRemunerationName)
                                  :hasAny(D.q11ReceivedName,D.q11Amount,D.q11From),
      'pa-p11':filled(g0.name)&&filled(g0.signatureDate),
    };
    const incomplete={
      'pa-cover':!checks['pa-cover']&&hasAny(D.wardName,D.caseNumber,D.gid,D.periodFrom,D.periodTo,D.guardian,D.wardLiving,D.residenceAddress),
      'pa-p2':!checks['pa-p2']&&(D.q1Residences||[]).some(r=>r&&hasAny(r.name,r.street,r.cityStateZip,r.phone,r.facilityType,r.from,r.to)),
      'pa-p3':!checks['pa-p3']&&anyOf(D.q2NoMove,D.q2WithinCounty,D.q2WithinCircuit,D.q2OutsideApproved,D.q2OutsideVenuePetition,
              D.q3SettingALF,D.q3SettingGroupHome,D.q3SettingIntermediate,D.q3SettingPrivate,D.q3SettingSkilled,
              D.q3SettingSpecialized,D.q3SettingStateHospital,D.q3SettingOther,D.q3MedPrimary,D.q3MentalPsych,D.q3PersonalFacility,D.q3SocialFacility),
      'pa-p4':!checks['pa-p4']&&false,
      'pa-p5':!checks['pa-p5']&&(D.q4Providers||[]).some(r=>r&&hasAny(r.name,r.providerType,r.visits,r.street,r.cityStateZip,r.phone)),
      'pa-p6':!checks['pa-p6']&&(hasAny(D.q5SocialSkills,D.q5Activities)||PLAN_RIGHTS.some(([k])=>filled(rights[k]))),
      'pa-p7':!checks['pa-p7']&&PLAN_ADLS.some(([k])=>filled(adls[k])),
      'pa-p8':!checks['pa-p8']&&anyOf(D.q9MentalDementia,D.q9MentalAlzheimers,D.q9PhysMobility,D.q9UsesGlasses,D.q9NeedsGlasses,D.q9MentalNone,D.q9PhysNone),
      'pa-p9':!checks['pa-p9']&&anyOf(D.q10NoDirectives,D.q10Executed),
      'pa-p10':!checks['pa-p10']&&anyOf(D.q11NoRemuneration,D.q11ReceivedName,D.q11Amount,D.q11From),
      'pa-p11':!checks['pa-p11']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.email,g0.ssn),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planInitial'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const anyOf=(...vals)=>vals.some(v=>!!v);
    const g0=(D.planGuardians||[])[0]||{};
    const provs=(D.q9Providers||[]).filter(r=>r&&(r.name||r.providerType||r.examDate));
    const adls=D.adls||{};
    const directives=(D.q11Directives||[]).filter(r=>r&&(r.title||r.dateSigned||r.signedBy));
    const checks={
      'pi-cover':filled(D.wardName)&&filled(D.caseNumber)&&filled(D.county)&&filled(D.inceptionDate)
        &&filled(D.lettersSignedDate)&&filled(D.guardianNames)&&filled(D.wardLiving)
        &&filled(D.residenceAddress)&&filled(D.residenceCityStateZip),
      'pi-p2':filled(D.q2Setting)&&(D.q2Setting!=='Other'||filled(D.q2Explain))
        &&anyOf(D.q3MedPrimary,D.q3MedDentist,D.q3MedOphthalmologist,D.q3MedSpecialist,D.q3MedPT,
                D.q3MedST,D.q3MedOT,D.q3MedWardDecides,D.q3MedOther)
        &&(!D.q3MedSpecialist||filled(D.q3MedSpecialistArea))
        &&(!D.q3MedOther||filled(D.q3MedExplain)),
      'pi-p3':filled(D.q4Mental)&&(D.q4Mental!=='Other'&&D.q4Mental!=='None'||filled(D.q4Explain))
        &&filled(D.q5Personal)&&(D.q5Personal!=='Other'||filled(D.q5Explain)),
      'pi-p4':anyOf(D.q6CareFacility,D.q6NursesAides,D.q6FamilyFriends,D.q6DayProgram,D.q6WardDecides,D.q6Other)
        &&(!D.q6Other||filled(D.q6Explain))
        &&(anyOf(D.q7SocialSecurity,D.q7Ssdi,D.q7Hmo,D.q7Ssi,D.q7StateSupplement,D.q7InstitutionalCare,
                 D.q7SupplementalIns,D.q7Pension,D.q7Medicare,D.q7Medicaid,D.q7Va,D.q7Trusts,
                 D.q7PendingBenefits,D.q7Other)||filled(D.q7Explain))
        &&(!D.q7Other||filled(D.q7Explain)),
      'pi-p5':provs.every(r=>filled(r.name)),
      'pi-p6':INITIAL_ADLS.every(([k])=>filled(adls[k])),
      'pi-p7':anyOf(D.mentalAlzheimers,D.mentalAutism,D.mentalClosedHeadInjury,D.mentalDementia,
                    D.mentalDepression,D.mentalDevelopmental,D.mentalSubstance,D.mentalSchizophrenia,D.mentalOther)
        &&anyOf(D.physMobility,D.physBlindness,D.physDeafness,D.physDiabetic,D.physParkinsons,D.physArthritis,D.physOther)
        &&anyOf(D.usesDentures,D.usesHearingAid,D.usesWheelchair,D.usesWalker,D.usesCrutches,
                D.usesProsthetics,D.usesGlasses,D.usesNone,D.usesOther)
        &&(!D.mentalOther||filled(D.mentalExplain))
        &&(!D.physOther||filled(D.physExplain))
        &&(!D.usesOther||filled(D.usesExplain)),
      'pi-p8':(!!D.q11NoDirectives!==!!D.q11Executed)
        &&(!D.q11ExecOther||filled(D.q11ExecOtherText))
        &&anyOf(D.needsDentures,D.needsHearingAid,D.needsWheelchair,D.needsWalker,D.needsCrutches,
                D.needsProsthetics,D.needsGlasses,D.needsNone,D.needsOther)
        &&(!D.needsOther||filled(D.needsExplain))
        &&filled(D.committeeIncorporated)&&(D.committeeIncorporated!=='No'||filled(D.committeeExplain)),
      'pi-p9':anyOf(D.certIncapacitatedNoCopy,D.certMinorNoCopy,D.certConsulted,D.certRecognizeRights,D.certNoRestriction,D.certProvidesCare)
        &&filled(g0.name)&&filled(g0.signatureDate),
      'pi-p10':filled(D.attorney_name)&&filled(D.attorney_signatureDate),
    };
    const incomplete={
      'pi-cover':!checks['pi-cover']&&hasAny(D.wardName,D.caseNumber,D.inceptionDate,D.lettersSignedDate,D.guardianNames,D.wardLiving,D.residenceAddress),
      'pi-p2':!checks['pi-p2']&&hasAny(D.q2Setting,D.q3MedPrimary,D.q3MedDentist,D.q3MedOphthalmologist,D.q3MedSpecialist,D.q3MedPT,D.q3MedST,D.q3MedOT,D.q3MedWardDecides,D.q3MedOther),
      'pi-p3':!checks['pi-p3']&&hasAny(D.q4Mental,D.q5Personal),
      'pi-p4':!checks['pi-p4']&&anyOf(D.q6CareFacility,D.q6NursesAides,D.q6FamilyFriends,D.q6DayProgram,D.q6WardDecides,D.q6Other,
              D.q7SocialSecurity,D.q7Ssdi,D.q7Hmo,D.q7Ssi,D.q7Medicare,D.q7Medicaid,D.q7Va,D.q7Trusts),
      'pi-p5':!checks['pi-p5']&&(D.q9Providers||[]).some(r=>r&&hasAny(r.name,r.providerType,r.examDate,r.street,r.cityStateZip,r.phone)),
      'pi-p6':!checks['pi-p6']&&INITIAL_ADLS.some(([k])=>filled(adls[k])),
      'pi-p7':!checks['pi-p7']&&anyOf(D.mentalAlzheimers,D.physMobility,D.usesGlasses,D.mentalNone,D.physNone),
      'pi-p8':!checks['pi-p8']&&anyOf(D.q11NoDirectives,D.q11Executed,D.committeeIncorporated,D.needsGlasses,D.needsNone),
      'pi-p9':!checks['pi-p9']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.ssn),
      'pi-p10':!checks['pi-p10']&&hasAny(D.attorney_name,D.attorney_signatureDate,D.attorney_bar),
    };
    return {checks,incomplete};
  } else if(activeInventoryType==='planMinor'){
    const filled=v=>v!==''&&v!==null&&v!==undefined&&v!==false;
    const hasAny=(...vals)=>vals.some(v=>filled(v));
    const anyOf=(...vals)=>vals.some(v=>!!v);
    const g0=(D.planGuardians||[])[0]||{};
    const provs=(D.q3Providers||[]).filter(r=>r&&(r.first||r.last||r.providerType));
    const checks={
      'pm-cover':filled(D.wardName)&&filled(D.county)&&filled(D.periodFrom)&&filled(D.periodTo)
        &&filled(D.guardianName)&&filled(D.q1ResidenceName)&&filled(D.q1Street),
      'pm-p2':true,
      'pm-p3':provs.every(r=>filled(r.last)),
      'pm-p4':anyOf(D.q4Primary,D.q4Dentist,D.q4Specialist,D.q4PT,D.q4ST,D.q4OT,D.q4MinorDecides,D.q4Other)
        &&(!D.q4Other||filled(D.q4Explain)),
      'pm-p5':filled(D.q5SchoolProgress)&&filled(D.q5SocialDevelopment)&&filled(D.q5Communicates)&&filled(D.q5Interpersonal)
        &&anyOf(D.q5NoUnmetNeeds,D.q5DoesNotCareToSocialize,D.q5UnmetNeeds,D.q5Other)
        &&(!D.q5Other||filled(D.q5Explain)),
      'pm-p6':anyOf(D.certIncapacitated,D.certMinor,D.certConsulted,D.certNoRestriction,D.certProvidesCare,D.certPhysicianAttached)
        &&filled(g0.name)&&filled(g0.signatureDate),
      'pm-p7':filled(D.preparer_name)&&filled(D.attorney_name)&&filled(D.attorney_signatureDate),
    };
    const incomplete={
      'pm-cover':!checks['pm-cover']&&hasAny(D.wardName,D.county,D.periodFrom,D.periodTo,D.guardianName,D.q1ResidenceName),
      'pm-p2':false,
      'pm-p3':!checks['pm-p3']&&(D.q3Providers||[]).some(r=>r&&hasAny(r.first,r.last,r.providerType,r.street,r.cityStateZip,r.phone)),
      'pm-p4':!checks['pm-p4']&&anyOf(D.q4Primary,D.q4Dentist,D.q4Specialist,D.q4PT,D.q4ST,D.q4OT),
      'pm-p5':!checks['pm-p5']&&hasAny(D.q5SchoolProgress,D.q5SocialDevelopment,D.q5Communicates,D.q5Interpersonal),
      'pm-p6':!checks['pm-p6']&&hasAny(g0.name,g0.signatureDate,g0.phone,g0.tin),
      'pm-p7':!checks['pm-p7']&&hasAny(D.preparer_name,D.attorney_name,D.attorney_signatureDate),
    };
    return {checks,incomplete};
  }
}

function updateNavDots(){
  const r=computeNavChecks();
  if(r)applyNavChecks(r.checks,r.incomplete);
  updateCurrentScheduleNextButton();
}
// Live-patches the current page's own "Next" button (see pageNav())
// without a full re-render -- needed because checking a schedule's "no
// items" checkbox (setScheduleNoItems()) and editing a row's fields both
// go through afterChange()->updateNavDots() rather than renderPage(), so
// the button rendered at page-load time would otherwise go stale until
// the next full navigation.
function updateCurrentScheduleNextButton(){
  const btn=document.getElementById('page-next-btn');
  if(!btn)return;
  const disabled=isScheduleIncomplete(currentPage.split('?')[0]);
  btn.disabled=disabled;
  btn.title=disabled?'Add at least one item, or check the box verifying there are none, before continuing.':'';
}

// Filing progress for ANY ward, active or not. Same window.D swap trick
// getWardHeadlineTotal() uses: synchronous, with no awaits in between, so
// nothing can observe D pointing at the wrong ward mid-computation.
function getWardProgress(ward){
  const prevD=window.D, prevType=activeInventoryType;
  window.D=ward; activeInventoryType=ward.inventoryType;
  let res=null;
  try{
    const r=computeNavChecks();
    if(r){
      const keys=Object.keys(r.checks);
      const complete=keys.filter(k=>r.checks[k]).length;
      res={complete,total:keys.length,pct:keys.length?Math.round(complete/keys.length*100):0};
    }
  }catch(e){console.warn('progress calc failed for ward',ward.wardId,e);}
  finally{window.D=prevD;activeInventoryType=prevType;}
  return res;
}

function applyNavChecks(checks,incomplete={}){
  // Every tracked item shows a mark by default now -- red − until its own
  // schedule/section is complete, then green ✓ -- rather than staying
  // blank until visited-and-started. `incomplete` is kept as a parameter
  // for callers/back-compat but no longer changes what renders here.
  for(const[k,v] of Object.entries(checks)){
    const el=document.querySelector(`[data-nav="${k}"]`);
    if(!el)continue;
    el.innerHTML=el.innerHTML.replace(/\s*<span class="nav-check.*?<\/span>/,'');
    el.innerHTML+=v?` <span class="nav-check complete">✓</span>`:` <span class="nav-check incomplete">−</span>`;
  }
  applyNavSectionCollapse(checks);
  renderProgressSummary(checks);
}

// Session-only memory of which fully-complete nav sections the user has
// manually re-opened (keyed by ward + section label, so one ward's choice
// doesn't leak onto another's identically-labeled section) -- mirrors
// _dashboardExpandedSections' pattern but inverted: a complete section
// defaults to COLLAPSED, and membership here means "force it back open".
let _navSectionExpanded=new Set();
function toggleNavSection(key){
  if(_navSectionExpanded.has(key))_navSectionExpanded.delete(key);
  else _navSectionExpanded.add(key);
  updateNavDots();
}
// Collapses a sidebar nav-section into a single green ✓ once every one of
// its data-nav children is complete, so a finished Schedule A/B/C block
// stops eating vertical space. Reads DOM structure only (no hardcoded
// per-form-type section map) -- works for every buildNav*() sidebar as
// long as it follows the existing .nav-section > .nav-section-label +
// [data-nav] buttons shape. An incomplete section stays plain (not
// collapsible -- only a fully-complete section becomes a toggleable
// accordion) and gets NO badge: each of its child items already shows
// its own red −/green ✓ (applyNavChecks() above), so a section-level −
// on top of those would just be a redundant second mark for the same
// information. The green ✓ is the exception -- it's the only indicator
// left once the section collapses and hides those child marks.
function applyNavSectionCollapse(checks){
  const container=document.getElementById('nav-sections');
  if(!container)return;
  // If the page currently on screen belongs to this section, it stays
  // expanded regardless of the completed/collapsed default -- otherwise
  // navigating (e.g. the page footer's own Next button) into a finished
  // section's next schedule would land you on a page with no visible
  // highlight in the sidebar. Deliberately NOT recorded in
  // _navSectionExpanded: it's not a manual choice, so leaving that page
  // lets the section collapse again on its own, same as if it had never
  // been opened.
  const currentKey=getCurrentPageKey();
  container.querySelectorAll('.nav-section').forEach(section=>{
    const label=section.querySelector(':scope > .nav-section-label');
    if(!label)return;
    if(label.dataset.origHtml===undefined)label.dataset.origHtml=label.innerHTML;
    const navKeys=[...section.querySelectorAll('[data-nav]')].map(el=>el.dataset.nav).filter(k=>k in checks);
    const plain=()=>{
      section.classList.remove('collapsed');
      label.classList.remove('nav-section-toggle');
      label.removeAttribute('role');label.removeAttribute('tabindex');label.removeAttribute('aria-expanded');
      label.onclick=null;label.onkeydown=null;
      label.innerHTML=`<span class="nav-section-label-text">${label.dataset.origHtml}</span>`;
    };
    if(!navKeys.length){plain();return;}
    const allComplete=navKeys.every(k=>checks[k]);
    const sectionKey=`${guardianData.activeWardId||''}:${label.dataset.origHtml}`;
    if(!allComplete){
      _navSectionExpanded.delete(sectionKey);
      plain();
      return;
    }
    const expanded=_navSectionExpanded.has(sectionKey)||navKeys.includes(currentKey);
    section.classList.toggle('collapsed',!expanded);
    label.classList.add('nav-section-toggle');
    label.setAttribute('role','button');
    label.setAttribute('tabindex','0');
    label.setAttribute('aria-expanded',String(expanded));
    label.innerHTML=`<span class="nav-section-chevron">${expanded?'▾':'▸'}</span>`
      +`<span class="nav-section-label-text">${label.dataset.origHtml}</span>`
      +(expanded?'':'<span class="nav-section-check complete">✓</span>');
    label.onclick=()=>toggleNavSection(sectionKey);
    label.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleNavSection(sectionKey);}};
  });
}

// Filing-progress summary in the ward-info card. Reuses `checks` — the same
// per-section completion map that just drove the nav ✓ marks above — as the
// single source of truth, so this can't disagree with the sidebar or drift
// out of sync the way a separately-stored "progress" value could.
function renderProgressSummary(checks){
  const host=document.getElementById('ward-progress');
  if(!host)return;
  const keys=Object.keys(checks);
  const total=keys.length;
  if(!total){host.innerHTML='';return;}
  const complete=keys.filter(k=>checks[k]).length;
  const pct=Math.round(complete/total*100);
  const done=complete===total;
  const nextKey=keys.find(k=>!checks[k]);
  const nextEl=nextKey&&document.querySelector(`[data-nav="${nextKey}"]`);
  const nextRoute=nextEl&&nextEl.dataset.page;
  const jumpLabel=nextEl?nextEl.textContent.replace(/[✓⚠]/g,'').trim():'';
  host.innerHTML=`
    <div class="ward-progress-head">
      <span class="ward-progress-label">Filing Progress</span>
      <span class="ward-progress-pct">${pct}%</span>
    </div>
    <div class="ward-progress-bar" role="progressbar" aria-label="Filing progress: ${complete} of ${total} sections complete"
         aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
      <div class="ward-progress-fill${done?' ward-progress-done':''}" style="width:${pct}%"></div>
    </div>
    <div class="ward-progress-count">${complete} of ${total} sections complete</div>
    ${nextRoute?`<button type="button" class="ward-progress-jump" onclick="navigate('${nextRoute}')">${ic('external',13)} Jump to ${esc(jumpLabel)}</button>`:''}`;
}

function getCurrentPageKey(){
  const page=currentPage.split('?')[0];
  if(activeInventoryType==='guardian'){
    // Guardian nav keys are unprefixed and match the page path directly (e.g. '/a1' -> 'a1').
    // '/' and '/summary' both map to 'cover' -- Summary has no required fields
    // of its own (it's a read-only rollup of the other pages), so it isn't
    // separately tracked in computeNavChecks(), but should still count as
    // "inside" the Case Info section for the sidebar's active-page auto-expand.
    if(page==='/'||page==='/summary')return 'cover';
    const guardianPages=['/a1','/a2','/b1','/b2','/b3','/b4','/c1','/c2','/c3','/c4','/c5','/d1','/d2','/d3','/d4','/d5'];
    return guardianPages.includes(page)?page.slice(1):'';
  }
  // Each type needs its OWN prefix. An unrecognised type falling back to ''
  // would produce bare keys like 'cover'/'p2' that collide with the Guardian
  // type's unprefixed nav keys above, silently corrupting its checkmarks.
  const prefix=activeInventoryType==='simplified'?'s-'
    :formEngine(activeInventoryType)==='annual'?'a-'
    :activeInventoryType==='planSimplified'?'ps-'
    :activeInventoryType==='planAnnual'?'pa-'
    :activeInventoryType==='planInitial'?'pi-'
    :activeInventoryType==='planMinor'?'pm-'
    :'';
  if(!prefix)return '';
  const pageMap={
    '/':'cover', '/p2':'p2', '/p3':'p3', '/p4':'p4', '/p5':'p5', '/p6':'p6', '/p7':'p7',
    '/p8':'p8', '/p9':'p9', '/p10':'p10', '/p11':'p11',
    '/scha':'scha', '/schb1':'schb1', '/schb2':'schb2', '/schb3':'schb3', '/schb4':'schb4',
    '/schc':'schc', '/schd1':'schd1', '/schd2':'schd2', '/schd3':'schd3', '/schd4':'schd4', '/schd5':'schd5',
    '/sche':'sche', '/schf1':'schf1', '/schf2':'schf2', '/schf3':'schf3', '/schf4':'schf4', '/schf5':'schf5'
  };
  const pageKey=pageMap[page];
  if(!pageKey)return '';
  return prefix+pageKey;
}

function afterChange(path){
  autoSave();
  updateCalcFields();
  updateNavDots();
  refreshWardInfoCard();
  if(path==='wardName')syncActiveWardNameDisplay();
  if(path==='guardianName'||path==='guardians.0.name')syncGuardianNameDisplay();
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
  if(sdbContainer)sdbContainer.style.display=D.hasSafeDepositBox?'':'none';
}

function updateCalcFields(){
  // Update all readonly calculated fields in visible entry cards
  document.querySelectorAll('[data-calcbind]').forEach(el=>{
    const path=el.dataset.calcbind; // e.g. "scheduleA1.0.wardValue"
    const parts=path.split('.');
    const schedule=parts[0], idx=parseInt(parts[1]), field=parts[2];
    const entry=window.D[schedule]?.[idx];
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

// ═══════════════════════════════════════════════════════
// PAGE RENDERERS - GUARDIAN INVENTORY
// ═══════════════════════════════════════════════════════
function renderPageGuardian(page){
  const el=document.getElementById('main-content');
  sanitizeNegativeAmounts();
  switch(page){
    case '/':     el.innerHTML=pageHome();break;
    case '/summary':el.innerHTML=pageSummary();break;
    case '/a1':   el.innerHTML=pageScheduleA1();break;
    case '/a2':   el.innerHTML=pageScheduleA2();break;
    case '/b1':   el.innerHTML=pageScheduleB1();break;
    case '/b2':   el.innerHTML=pageScheduleB2();break;
    case '/b3':   el.innerHTML=pageScheduleB3();break;
    case '/b4':   el.innerHTML=pageScheduleB4();break;
    case '/c1':   el.innerHTML=pageScheduleC1();break;
    case '/c2':   el.innerHTML=pageScheduleC2();break;
    case '/c3':   el.innerHTML=pageScheduleC3();break;
    case '/c4':   el.innerHTML=pageScheduleC4();break;
    case '/c5':   el.innerHTML=pageScheduleC5();break;
    case '/d1':   el.innerHTML=pageD1();break;
    case '/d2':   el.innerHTML=pageD2();break;
    case '/d3':   el.innerHTML=pageD3();break;
    case '/d4':   el.innerHTML=pageD4();break;
    case '/d5':   el.innerHTML=pageD5();break;
    case '/print':el.innerHTML=pagePrint();break;
    default:      el.innerHTML='<p>Page not found</p>';
  }
  bindForms();
  afterChange('');
  el.scrollTop=0;
  if(page==='/')linkAccordions('instructionsZone','importZone');
}

// Keeps two Bootstrap accordion panels showing/hiding together -- built for
// Cover & Summary's "General Instructions" and "Import Excel File" panels,
// which the user wants to always open and close as a pair rather than
// independently. Listens on Bootstrap's pre-transition show/hide events
// (not shown/hidden) so both panels start animating together instead of
// the second one waiting for the first's transition to finish; also
// catches a panel being toggled programmatically, not just by click.
// The `syncing` flag is load-bearing, not decorative: Collapse.show()
// fires its 'show.bs.collapse' event BEFORE marking itself as shown/
// transitioning, so without this guard elA's handler opening elB
// re-enters elB's handler opening elA while elA's own show() call is
// still on the stack and hasn't set its own guard yet -- an infinite
// mutual recursion (confirmed with Playwright: "Maximum call stack size
// exceeded" without this flag). One shared flag blocks the re-entrant
// leg while still letting the first hop's side effect (starting the
// other panel's transition) happen exactly once.
function linkAccordions(idA,idB){
  const elA=document.getElementById(idA),elB=document.getElementById(idB);
  if(!elA||!elB||elA.dataset.linked)return;
  elA.dataset.linked='1';elB.dataset.linked='1';
  let syncing=false;
  const mirror=(target,open)=>{
    if(syncing)return;
    syncing=true;
    try{
      const inst=bootstrap.Collapse.getOrCreateInstance(target,{toggle:false});
      if(open)inst.show();else inst.hide();
    }finally{syncing=false;}
  };
  elA.addEventListener('show.bs.collapse',()=>mirror(elB,true));
  elA.addEventListener('hide.bs.collapse',()=>mirror(elB,false));
  elB.addEventListener('show.bs.collapse',()=>mirror(elA,true));
  elB.addEventListener('hide.bs.collapse',()=>mirror(elA,false));
}

// ── helpers ────────────────────────────────────────────
// Chrome and Edge support writable file handles for background .sav updates.
// Other browsers require deliberate exports, so show this notice on every
// form's Case Info or Cover page.
function browserRecommendationNotice(){
  return `<div class="schedule-instructions" style="margin-bottom:1rem;">${ic('alert',15)} <strong>Chrome or Microsoft Edge is recommended</strong> for the best experience — only those browsers support automatically saving your work in the background as you go. Firefox and Safari work fine too, but you'll need to save a backup file (.sav) manually and more often.</div>`;
}
function reqLabel(text){return `<label class="form-label"><strong>${text}</strong><span class="req">*</span></label>`;}
function optLabel(text){return `<label class="form-label">${text}</label>`;}
function formRow(...cols){
  return `<div class="row g-2 mb-1">${cols.join('')}</div>`;
}
function col(n,html){return `<div class="col-md-${n}">${html}</div>`;}
function textInput(bind,placeholder='',type=''){
  const inputId='txt_'+Math.random().toString(36).slice(2,9);
  const dataType=type?` data-input-type="${type}"`:' data-input-type="text"';
  // SSN/EIN is real PII -- masked by default (type="password" only hides
  // the rendering; .value, oninput/data-bind, and formatSSN()'s live
  // dash-insertion all keep working exactly as for a text input) with a
  // lock/unlock toggle button to reveal it on demand. See toggleSsnReveal().
  if(type==='ssn'){
    return `<div class="ssn-mask-wrap"><input class="form-control" id="${inputId}" type="password" autocomplete="off" data-bind="${bind}" placeholder="${placeholder}"${dataType}>`
      +`<button type="button" class="ssn-reveal-btn" aria-label="Show SSN/EIN" onclick="toggleSsnReveal(this)">${ic('lock',14)}</button></div>`;
  }
  return `<input class="form-control" id="${inputId}" data-bind="${bind}" placeholder="${placeholder}"${dataType}>`;
}
function toggleSsnReveal(btn){
  const input=btn.previousElementSibling;
  const revealing=input.type==='password';
  input.type=revealing?'text':'password';
  btn.setAttribute('aria-label',revealing?'Hide SSN/EIN':'Show SSN/EIN');
  btn.innerHTML=ic(revealing?'unlock':'lock',14);
}
function numInput(bind){
  const isPercent=/Percent$/i.test(bind);
  const inputHtml=`<input type="text" inputmode="decimal" class="form-control" data-bind="${bind}" data-input-type="decimal">`;
  return isPercent?`<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`:`<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`;
}
function dateInput(bind){
  return `<input type="date" class="form-control" data-bind="${bind}">`;
}
function calcInput(calcbind){
  return `<input class="form-control" readonly data-calcbind="${calcbind}" style="background:var(--accent-050);font-weight:600;">`;
}
// currentVal is optional -- pass the field's live D value when the option
// list is a fixed/curated set (as opposed to grown organically from user
// entries) so a .sav file saved before that list existed, or before a
// free-text field was converted to this dropdown, doesn't silently show a
// blank/wrong selection: bindForms() sets select.value=String(cur), and a
// value with no matching <option> leaves the control showing nothing
// selected even though the real data is still intact underneath. Injecting
// the stored value as its own selected option keeps the display honest
// until the user actively picks one of the real choices.
function selectInput(bind,opts,currentVal){
  let list=opts;
  if(currentVal!==undefined&&currentVal!==null&&currentVal!==''&&!opts.some(([v])=>v===currentVal)){
    list=[[currentVal,currentVal],...opts];
  }
  const options=list.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');
  return `<select class="custom-select form-select" data-bind="${bind}">${options}</select>`;
}
// Checkbox counterpart to selectInput() for a true/false field -- the
// Guardian form's own schedule flags (isPersonalResidence, isRestricted,
// inSafeDepositBox, etc.) already store a real JS boolean, never a 'Yes'/
// 'No' string, so bindForms()'s existing native checkbox handling
// (el.type==='checkbox' -> setPath(...,e.target.checked)) is already the
// exact right fit -- this only needed the HTML, not a new bindForms branch.
// Every call site already has its own reqLabel()/optLabel() heading right
// above it (the Guardian form's grid puts a label over every field, checkbox
// or not), so this renders a bare checkbox -- `label` becomes an aria-label
// for accessibility, not a second visible label repeating the same text.
function checkboxInput(bind,label){
  const inputId='chk_'+Math.random().toString(36).slice(2,9);
  // <label>, not <div>, wrapping the input as a descendant -- clicking
  // anywhere in its padded area (see .form-check's min-height/touch
  // padding) toggles the checkbox even though there's no visible text,
  // not just the tiny native checkbox square itself. Standard technique
  // for meeting the 44x44 touch-target minimum without visually
  // enlarging the checkbox.
  return `<label class="form-check"><input class="form-check-input" type="checkbox" id="${inputId}" data-bind="${bind}" aria-label="${esc(label)}"></label>`;
}
// County-field counterpart to selectInput() -- data-bind driven like every
// other Guardian-form field (bindForms() below wires the actual read/write
// via data-input-type="county"), but a filtered-autocomplete text input
// instead of a <select>. No initial value or write-expr here: bindForms()
// sets the starting value itself from window.D, same as every other bound
// field, and dispatching 'input' on selectCountyOption() reaches its
// listener exactly like typing would.
function countyInputBind(bind){
  const inputId='cty_'+Math.random().toString(36).slice(2,9);
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${inputId}" data-bind="${bind}" data-input-type="county" autocomplete="off"
      onfocus="filterCountyDropdown(this)" onblur="setTimeout(()=>hideCountyDropdown('${inputId}'),150)">
    <div class="county-combobox-dropdown" id="${inputId}-dropdown"></div>
  </div>`;
}
function entryCard(title,idx,schedule,bodyHtml,footerHtml=''){
  return `<div class="entry-card mb-2">
    <div class="entry-card-header">
      <span>${title}</span>
      <span class="entry-card-actions">
        <button class="btn btn-sm btn-outline-secondary no-print" title="Add a copy of this entry below" onclick="duplicateEntry('${schedule}',${idx})">${ic('copy',14)} Duplicate</button>
        <button class="btn btn-sm btn-outline-danger no-print" onclick="removeEntry('${schedule}',${idx})">✕ Remove</button>
      </span>
    </div>
    <div class="entry-card-body">${bodyHtml}</div>
    ${footerHtml?`<div class="entry-card-footer">${footerHtml}</div>`:''}
  </div>`;
}
function addBtn(schedule,label){
  return `<button class="btn btn-primary btn-sm mb-3 no-print" onclick="addEntry('${schedule}')">+ Add ${label}</button>`;
}
function totalsBox(rows){
  const trs=rows.map(([label,id])=>`<div class="tr"><div class="td">${label}</div><div class="td" id="${id}">${fmt(0)}</div></div>`).join('');
  return `<div class="schedule-totals"><div class="tbl">${trs}</div></div>`;
}

// ── Entry add/remove ───────────────────────────────────
function addEntry(schedule){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  window.D[key].push(mk[schedule]());
  renderPage(currentPage);
}
function removeEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  window.D[key].splice(idx,1);
  autoSave();
  renderPage(currentPage);
}
// Empty-state for a schedule with zero rows: a checkbox the filer checks
// to affirmatively state there's nothing to report, replacing the old
// folder-icon placeholder. Checking it satisfies computeNavChecks()'s
// scheduleComplete() the same as adding a real row would (see there),
// which is what ungates that schedule's own "Next" button and turns its
// sidebar/section checkmark green -- and prints a verification sentence
// in place of the schedule's table on the final printout (printEmptyRow()).
function scheduleEmptyHTML(key,noun){
  const checked=!!(D.scheduleNoItems&&D.scheduleNoItems[key]);
  return `<div class="schedule-empty">
    <label class="schedule-empty-check">
      <input type="checkbox" ${checked?'checked':''} onchange="setScheduleNoItems('${key}',this.checked)">
      <span>I verify there are no ${noun} to report for this schedule.</span>
    </label>
  </div>`;
}
function setScheduleNoItems(key,val){
  if(!D.scheduleNoItems)D.scheduleNoItems={};
  D.scheduleNoItems[key]=val;
  autoSave();
  afterChange(`scheduleNoItems.${key}`);
}
// Copies an entry and inserts the copy directly beneath the original.
// Real filings are full of near-identical rows — twelve monthly
// disbursements to the same payee differing only in date and check number —
// and re-entering the shared fields by hand for each was the single most
// repetitive part of preparing an accounting.
// Deliberately a full copy including amounts: the guardian edits down what
// differs, which is less work than re-typing what doesn't. Values are plain
// strings/numbers, so a JSON round-trip is a safe deep copy and can't leave
// the copy sharing a reference with the original.
function duplicateEntry(schedule,idx){
  const map={
    a1:'scheduleA1',a2:'scheduleA2',b1:'scheduleB1',b2:'scheduleB2',b3:'scheduleB3',
    b4:'scheduleB4',c1:'scheduleC1',c2:'scheduleC2',c3:'scheduleC3',c4:'scheduleC4',c5:'scheduleC5'
  };
  const key=map[schedule];
  const list=window.D[key];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  autoSave();
  renderPage(currentPage);
}
// Same idea for the Annual Accounting schedules, which store their rows in
// D.schA / D.schB1 / … and are rendered inline rather than through
// entryCard(). Takes the array name so one function serves all 14.
function duplicateAnnualRow(arrName,idx,route){
  const list=window.D&&window.D[arrName];
  if(!list||!list[idx])return;
  list.splice(idx+1,0,JSON.parse(JSON.stringify(list[idx])));
  autoSave();
  navigate(route);
}
// ═══════════════════════════════════════════════════════
// SCHEDULE SUPPORTING DOCUMENTS & COMMENTS
// ═══════════════════════════════════════════════════════
// Every schedule (across all three inventory types) can carry uploaded
// supporting documents and a free-text comment. Guardianships are re-filed
// annually, so uploads/comments are kept in a dict keyed by the ward's
// current accounting period (periodFrom/periodTo) rather than flattened
// onto the schedule itself — starting next year's accounting (by changing
// those dates on the Cover page) leaves last year's uploads/comments
// archived under the old period key and opens a fresh, empty slot for the
// new one. The one-time Initial Inventory has no period, so it uses a
// single constant key instead.
const SCHEDULE_DOC_MAX_FILE_BYTES=15*1024*1024; // 15MB/file — base64 inflates ~33% in storage and the .sav backup

function scheduleDocPeriodKey(){
  // Guardian wards have no periodFrom/periodTo, so each year is
  // distinguished by activeYearKey instead (falls back to 'initial' for
  // wards saved before multi-year support existed, preserving their
  // existing uploads under the same bucket they were already using).
  if(activeInventoryType==='guardian')return (window.D&&window.D.activeYearKey)||'initial';
  const from=(window.D&&window.D.periodFrom)||'';
  const to=(window.D&&window.D.periodTo)||'';
  return `${from}__${to}`;
}

function getScheduleDocSlot(scheduleKey){
  const d=window.D;
  if(!d)return {comment:'',files:[]};
  d.scheduleDocs=d.scheduleDocs||{};
  d.scheduleDocs[scheduleKey]=d.scheduleDocs[scheduleKey]||{};
  const period=scheduleDocPeriodKey();
  d.scheduleDocs[scheduleKey][period]=d.scheduleDocs[scheduleKey][period]||{comment:'',files:[]};
  return d.scheduleDocs[scheduleKey][period];
}

function fmtFileSize(bytes){
  if(bytes==null)return '';
  if(bytes<1024)return bytes+' B';
  if(bytes<1024*1024)return (bytes/1024).toFixed(1)+' KB';
  return (bytes/(1024*1024)).toFixed(1)+' MB';
}

function handleScheduleDocUpload(scheduleKey,fileList){
  const slot=getScheduleDocSlot(scheduleKey);
  const files=Array.from(fileList||[]);
  const rejected=[];
  const readers=files.map(f=>new Promise(resolve=>{
    if(f.size>SCHEDULE_DOC_MAX_FILE_BYTES){rejected.push(f.name);resolve(null);return;}
    const reader=new FileReader();
    reader.onload=()=>resolve({name:f.name,type:f.type||'application/octet-stream',size:f.size,dataUrl:reader.result,uploadedAt:new Date().toISOString()});
    reader.onerror=()=>{rejected.push(f.name);resolve(null);};
    reader.readAsDataURL(f);
  }));
  Promise.all(readers).then(results=>{
    results.filter(Boolean).forEach(r=>slot.files.push(r));
    if(rejected.length)alert(`Too large to attach (15MB limit each): ${rejected.join(', ')}`);
    autoSave();
    renderPage(currentPage);
  });
}

function removeScheduleDoc(scheduleKey,idx){
  const slot=getScheduleDocSlot(scheduleKey);
  slot.files.splice(idx,1);
  autoSave();
  renderPage(currentPage);
}

function updateScheduleComment(scheduleKey,value){
  getScheduleDocSlot(scheduleKey).comment=value;
  autoSave();
}

function renderScheduleDocsSection(scheduleKey){
  const slot=getScheduleDocSlot(scheduleKey);
  const period=scheduleDocPeriodKey();
  const [pf,pt]=period.split('__');
  const periodNote=activeInventoryType==='guardian'?''
    :(pf||pt?` — accounting period ${pf||'?'} to ${pt||'?'}`:' — set the accounting period on the Cover page to file these by year');
  const filesHtml=slot.files.length?slot.files.map((f,i)=>`
    <div class="sched-doc-row">
      <span class="sched-doc-name">${ic('file',14)} ${esc(f.name)}</span>
      <span class="sched-doc-meta">${fmtFileSize(f.size)}</span>
      <a href="${f.dataUrl}" download="${esc(f.name)}" class="btn btn-sm btn-outline-secondary">Download</a>
      <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeScheduleDoc('${scheduleKey}',${i})">×</button>
    </div>`).join(''):`<div class="sched-doc-empty">No supporting documents uploaded${activeInventoryType==='guardian'?'':' for this period'}.</div>`;
  const inputId=`sched-doc-input-${scheduleKey}`;
  return `<div class="schedule-docs-section no-print">
    <h4>Supporting Documents${periodNote}</h4>
    <p class="schedule-docs-hint">Attach receipts, statements, or other records supporting this schedule. Stored on this device only, encrypted with the rest of this ward's data.</p>
    <input type="file" id="${inputId}" multiple style="display:none" onchange="handleScheduleDocUpload('${scheduleKey}',this.files);this.value=''">
    <button type="button" class="btn btn-outline-primary btn-sm mb-2" onclick="document.getElementById('${inputId}').click()">+ Upload File(s)</button>
    <div class="sched-doc-list">${filesHtml}</div>
    <h4 class="mt">Comments</h4>
    <textarea class="form-control" rows="3" placeholder="Notes about this schedule…" oninput="updateScheduleComment('${scheduleKey}',this.value)">${esc(slot.comment)}</textarea>
  </div>`;
}

function addGuardian(){D.guardians.push(mk.guardian());renderPage('/d1');}
function removeGuardian(i){D.guardians.splice(i,1);autoSave();renderPage('/d1');}
function addRecipient(){D.serviceRecipients.push(mk.recipient());renderPage('/d5');}
function removeRecipient(i){D.serviceRecipients.splice(i,1);autoSave();renderPage('/d5');}

// Witnesses present during the physical inventory of the ward's personal
// effects (Cover page reminder). Kept separate from the entryCard()/
// addEntry()/removeEntry() machinery used by the 11 numbered schedules --
// witnesses aren't a "schedule" in that sense (no dollar total, not part
// of the schedule/route map those helpers key off of).
function mkWitness(){return {name:'',address:'',occupation:''};}
function addWitness(){D.witnesses=D.witnesses||[];D.witnesses.push(mkWitness());autoSave();renderPage('/');}
function removeWitness(i){if(!D.witnesses)return;D.witnesses.splice(i,1);autoSave();renderPage('/');}
function witnessCardsHTML(){
  const list=D.witnesses||[];
  return list.map((w,i)=>`<div class="entry-card mb-2">
    <div class="entry-card-header">
      <span>Inventory Witness ${i+1}</span>
      <span class="entry-card-actions">
        <button class="btn btn-sm btn-outline-danger no-print" onclick="removeWitness(${i})">✕ Remove</button>
      </span>
    </div>
    <div class="entry-card-body">
      ${formRow(
        col(5,reqLabel('Name')+`<input class="form-control" value="${esc(w.name)}" oninput="this.value=formatName(this.value);D.witnesses[${i}].name=this.value;autoSave()">`),
        col(4,reqLabel('Address')+`<input class="form-control" value="${esc(w.address)}" oninput="this.value=formatAddress(this.value);D.witnesses[${i}].address=this.value;autoSave()">`),
        col(3,reqLabel('Occupation')+`<input class="form-control" value="${esc(w.occupation)}" oninput="D.witnesses[${i}].occupation=this.value;autoSave()">`)
      )}
    </div>
  </div>`).join('');
}

// ═══════════════════════════════════════════════════════
// PAGE: HOME / COVER
// ═══════════════════════════════════════════════════════
function pageHome(){
  const sdbFiledRow=D.hasSafeDepositBox?'':'display:none;';
  return `<div class="schedule-page">
  <h1>Verified Initial Inventory — Case Information</h1>
  ${browserRecommendationNotice()}
  <div class="instructions-import-row">
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#instructionsZone" aria-expanded="false">
            ${ic('clipboard',15)} General Instructions
          </button>
        </h2>
        <div id="instructionsZone" class="accordion-collapse collapse">
          <div class="accordion-body" style="padding:1rem 1.25rem;">
            <ul style="margin:0;padding-left:1.4rem;font-size:.8rem;">
              <li>All values must be as of the <strong>Guardianship Inception Date (GID)</strong>.</li>
              <li><strong style="color:var(--danger-text);">CAUTION on Ward's % fields:</strong> Enter percentages as plain digits (70, not 0.70).</li>
              <li>Complete all Required Information fields (Ward Name, Case Number, GID, Guardian, Attorney, County).</li>
              <li>Work through Schedules A-1 through C-5, then complete Parts III–VI (Attestations &amp; Filings).</li>
              <li>Use Print Preview to save as PDF or Excel for filing.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    <div class="accordion mb-0">
      <div class="accordion-item">
        <h2 class="accordion-header">
          <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse" data-bs-target="#importZone" aria-expanded="false">
            <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 13.6 6.2 4.6h11.6L20 13.6v5.8H4Z"/><path d="M4 13.6h4.2l1.2 2.4h5.2l1.2-2.4H20"/></svg> Import Excel File (existing guardian inventory template)
          </button>
        </h2>
        <div id="importZone" class="accordion-collapse collapse">
          <div class="accordion-body" style="border:2px dashed var(--brand);border-top:none;border-radius:0 0 8px 8px;background:var(--surface-2);text-align:center;padding:1.5rem;">
            <label class="btn btn-outline-primary btn-sm" style="cursor:pointer;">
              <svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3.4 6.4h5.6l2 2.2h7.6v2.2"/><path d="M3.4 8.6 5.6 19h13.2l2.2-8.2H5.6Z"/></svg> Select File
              <input type="file" accept=".xlsx" style="display:none" onchange="importExcelFile(this)">
            </label>
            <p style="color:var(--ink-3);font-size:.8rem;margin:.5rem 0 0;">Select the court-issued Initial Inventory Excel template</p>
            <div id="import-progress" style="margin-top:.5rem;font-size:.8rem;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  ${loadWardInfoBanner()}
  <div class="row g-3 mb-3 cover-info-row">
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Required Information</h2>
        ${formRow(col(12,reqLabel('Name of Ward')+textInput('wardName','Full legal name of ward','name')))}
        ${formRow(col(12,reqLabel('Case Number')+textInput('caseNumber','','caseNumber')))}
        ${formRow(col(12,reqLabel('Guardianship Inception Date (GID)')+dateInput('gid')))}
        ${formRow(col(6,reqLabel('County')+countyInputBind('county')))}
      </div>
    </div>
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Guardian &amp; Attorney</h2>
        ${formRow(col(12,reqLabel('Guardian Name(s)')+textInput('guardianName','','name')))}
        ${formRow(col(12,reqLabel('Attorney for Guardian')+textInput('attorneyForGuardian','','name')))}
        ${formRow(col(12,reqLabel('Type of Guardianship')+selectInput('typeOfGuardianship',[['Plenary','Plenary'],['Limited','Limited'],['Voluntary','Voluntary'],['Minor - Person','Minor - Person'],['Minor - Property','Minor - Property'],['Minor - Person - Property','Minor - Person - Property']],D.typeOfGuardianship)))}
        ${formRow(col(6,optLabel('Safe Deposit Box?')+checkboxInput('hasSafeDepositBox','Safe Deposit Box?')),col(6,optLabel('Amended Form?')+checkboxInput('isAmended','Amended Form?')))}
        <div id="sdb-filed-row" style="${sdbFiledRow}">
          ${formRow(col(6,optLabel('SDB Inventory Filed?')+checkboxInput('safeDepositBoxFiled','SDB Inventory Filed?')))}
        </div>
      </div>
    </div>
  </div>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Inventory Witnesses</h2>
    <div class="schedule-instructions">A personal property inventory must include the names, addresses, and occupations of witnesses present during the physical inventory of the ward's personal effects.</div>
    ${witnessCardsHTML()}
    <button class="btn btn-outline-primary btn-sm no-print" onclick="addWitness()">+ Add Witness</button>
  </div>
  <div class="mb-3">
    ${pageNav('/')}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════
// PAGE: SUMMARY
// ═══════════════════════════════════════════════════════
function pageSummary(){
  const hasAttest=D.guardians.some(g=>g.name);
  const hasPreparer=!!(D.preparer.name||D.attorney.name);
  const hasBond=!!(D.bondAmount||D.bondWaivedDate);
  const hasService=D.serviceRecipients.some(r=>r.name);
  function status(v){return v?`<span style="color:var(--ok-text);font-weight:600;">✓ Entered</span>`:`<span style="color:var(--danger-text);font-weight:600;">Incomplete</span>`;}
  return `<div class="schedule-page">
  <h1>Verified Initial Inventory — Summary</h1>
  <!-- Summary I -->
  <div class="row g-3">
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Summary I — Schedule A: Real Estate</h2>
        <div class="summary-line"><a href="#" onclick="navigate('/a1');return false;">Schedule A-1 — Real Estate Assets</a><span id="totalA1">${fmt(calc.totalA1())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/a2');return false;">Schedule A-2 — Real Estate Liabilities</a><span id="totalA2">${fmt(calc.totalA2())}</span></div>
        <div class="summary-line total"><span>Real Estate, Net of Liabilities</span><span id="netA">${fmt(calc.netA())}</span></div>
      </div>
      <div class="summary-box">
        <h2 class="subsection-heading">Summary I — Schedule B: Cash / Personal Property</h2>
        <div class="summary-line"><a href="#" onclick="navigate('/b1');return false;">Schedule B-1 — Cash &amp; Cash Equivalents</a><span id="totalB1">${fmt(calc.totalB1())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/b2');return false;">Schedule B-2 — Personal Property Assets</a><span id="totalB2">${fmt(calc.totalB2())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/b3');return false;">Schedule B-3 — Intangible Assets</a><span id="totalB3">${fmt(calc.totalB3())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/b4');return false;">Schedule B-4 — Personal Property Liabilities</a><span id="totalB4">${fmt(calc.totalB4())}</span></div>
        <div class="summary-line total"><span>Cash / Pers. Property, Net of Liabilities</span><span id="netB">${fmt(calc.netB())}</span></div>
      </div>
      <div class="summary-box">
        <h2 class="subsection-heading">Summary II — Schedule C: Other Financial Information</h2>
        <div class="summary-line"><a href="#" onclick="navigate('/c1');return false;">Schedule C-1 — Income (Annualized)</a><span id="totalC1">${fmt(calc.totalC1())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/c2');return false;">Schedule C-2 — Lawsuits Against Ward</a><span id="totalC2">${fmt(calc.totalC2())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/c3');return false;">Schedule C-3 — Lawsuits by Ward</a><span id="totalC3">${fmt(calc.totalC3())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/c4');return false;">Schedule C-4 — Trusts</a><span id="totalC4">${fmt(calc.totalC4())}</span></div>
        <div class="summary-line"><a href="#" onclick="navigate('/c5');return false;">Schedule C-5 — Joint Owners</a><span id="totalC5">${fmt(calc.totalC5())}</span></div>
      </div>
    </div>
    <div class="col-md-6">
      <div class="summary-box">
        <h2 class="subsection-heading">Part V — Audit Fee &amp; Bond Calculation</h2>
        <div class="summary-line"><span>Audit Fee (inventory &gt; $25,000)</span><span id="auditFee">${fmt(calc.auditFee())}</span></div>
        <div class="summary-line"><span>Restricted Cash (B-1)</span><span id="restrictedCash">${fmt(calc.restrictedCash())}</span></div>
        <div class="summary-line"><span>Restricted Intangibles (B-3)</span><span id="restrictedIntang">${fmt(calc.restrictedIntang())}</span></div>
        <div class="summary-line"><span>Unrestricted Cash (B-1)</span><span id="unrestrictedCash">${fmt(calc.unrestrictedCash())}</span></div>
        <div class="summary-line"><span>Personal Property (B-2)</span><span></span></div>
        <div class="summary-line"><span>Unrestricted Intangibles (B-3)</span><span id="unrestrictedIntang">${fmt(calc.unrestrictedIntang())}</span></div>
        <div class="summary-line total"><span>Bond Requirement (liquid, unrestricted)</span><span id="bondRequired">${fmt(calc.bondRequired())}</span></div>
        <div style="margin-top:.5rem;font-size:.78rem;"><a href="#" onclick="navigate('/d4');return false;">→ Complete Bond &amp; Surety Info (D-4)</a></div>
      </div>
      <div class="summary-box">
        <h2 class="subsection-heading">Attestations &amp; Filings Completion</h2>
        <div class="summary-line"><a href="#" onclick="navigate('/d1');return false;">D-1 — Guardian Attestation</a>${status(hasAttest)}</div>
        <div class="summary-line"><a href="#" onclick="navigate('/d2');return false;">D-2 — Preparer &amp; Attorney</a>${status(hasPreparer)}</div>
        <div class="summary-line"><a href="#" onclick="navigate('/d3');return false;">D-3 — Audit Fee &amp; Safe Deposit</a>${status(D.hasSafeDepositBox!==undefined?true:false)}</div>
        <div class="summary-line"><a href="#" onclick="navigate('/d4');return false;">D-4 — Bond &amp; Surety Info</a>${status(hasBond)}</div>
        <div class="summary-line"><a href="#" onclick="navigate('/d5');return false;">D-5 — Certificate of Service</a>${status(hasService)}</div>
      </div>
      <div class="summary-box summary-inventory-total" style="background:#820024;color:#fff;">
        <div class="summary-line total" style="color:#fff;border-color:rgba(255,255,255,.2);">
          <span>VERIFIED INITIAL INVENTORY TOTAL</span>
          <span id="totalInventory" style="font-size:1.05rem;">${fmt(calc.total())}</span>
        </div>
      </div>
    </div>
  </div>
  <div class="mb-3 mt-3">
    ${pageNav('/summary')}
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════
// SCHEDULE PAGES
// ═══════════════════════════════════════════════════════
function pageScheduleA1(){
  const entries=D.scheduleA1.map((e,i)=>entryCard(`Property ${i+1}`,i,'a1',`
    ${formRow(col(6,reqLabel('Property Description')+textInput(`scheduleA1.${i}.propertyDescription`,'e.g., Single Family Home','name')),col(3,optLabel('Personal Residence?')+checkboxInput(`scheduleA1.${i}.isPersonalResidence`,'Personal Residence?')),col(3,optLabel('Income Property?')+checkboxInput(`scheduleA1.${i}.isIncomeProperty`,'Income Property?')))}
    ${formRow(col(12,reqLabel('Street Address')+textInput(`scheduleA1.${i}.streetAddress`,'','address')))}
    ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`scheduleA1.${i}.cityStateZip`,'','zip')),col(6,optLabel('Notes (joint ownership, etc.)')+textInput(`scheduleA1.${i}.notes`)))}
    ${formRow(col(4,reqLabel('Full Asset Value as of GID ($)')+numInput(`scheduleA1.${i}.fullAssetValue`)),col(4,reqLabel("Ward's Ownership % (0-100)")+numInput(`scheduleA1.${i}.wardPercent`)),col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleA1.${i}.wardValue`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule A-1: Real Estate / Real Property</h1>
  <div class="schedule-instructions">List all real property owned by the ward as of the GID. Attach Property Appraiser records. Ward's Value = Full Asset Value × Ward's % / 100.</div>
  ${addBtn('a1','Property')}${entries||scheduleEmptyHTML('a1','real estate properties')}
  ${totalsBox([["Schedule A-1 Total (Ward's Value)",'totalA1']])}
  ${renderScheduleDocsSection('a1')}
  ${pageNav('/a1')}</div>`;
}

function pageScheduleA2(){
  const entries=D.scheduleA2.map((e,i)=>entryCard(`Liability ${i+1}`,i,'a2',`
    ${formRow(col(6,reqLabel('Lending Institution / Private Lender')+textInput(`scheduleA2.${i}.lenderName`,'','name')),col(3,reqLabel('Type')+selectInput(`scheduleA2.${i}.liabilityType`,[['Mortgage','Mortgage'],['Note','Note'],['Loan','Loan'],['Other Debt','Other Debt']])),col(3,optLabel('Account Number')+textInput(`scheduleA2.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(6,reqLabel('Lender Street Address')+textInput(`scheduleA2.${i}.lenderAddress`,'','address')),col(6,reqLabel('Lender City / State / Zip')+textInput(`scheduleA2.${i}.lenderCityStateZip`,'','zip')))}
    ${formRow(col(6,optLabel('Notes (related property, etc.)')+textInput(`scheduleA2.${i}.notes`)))}
    ${formRow(col(4,reqLabel('Full Debt Balance as of GID ($)')+numInput(`scheduleA2.${i}.fullDebtBalance`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleA2.${i}.wardPercent`)),col(4,optLabel("Ward's Debt Balance (calculated)")+calcInput(`scheduleA2.${i}.wardDebt`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</h1>
  <div class="schedule-instructions">List in the same order as Schedule A-1. Attach mortgage statement or deed for each.</div>
  ${addBtn('a2','Liability')}${entries||scheduleEmptyHTML('a2','real estate liabilities')}
  ${totalsBox([["Schedule A-2 Total (Ward's Debt)",'totalA2']])}
  ${renderScheduleDocsSection('a2')}
  ${pageNav('/a2')}</div>`;
}

function pageScheduleB1(){
  const entries=D.scheduleB1.map((e,i)=>entryCard(`Account ${i+1}`,i,'b1',`
    ${formRow(col(5,reqLabel('Financial Institution / Description')+textInput(`scheduleB1.${i}.institutionName`,'','name')),col(3,reqLabel('Account Type')+textInput(`scheduleB1.${i}.accountType`,'Checking, Savings, CD…','name')),col(2,optLabel('Restricted?')+checkboxInput(`scheduleB1.${i}.isRestricted`,'Restricted')),col(2,optLabel('Account #')+textInput(`scheduleB1.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(6,reqLabel('Street Address of Institution')+textInput(`scheduleB1.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB1.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(4,reqLabel('Full Asset Amount ($)')+numInput(`scheduleB1.${i}.fullAssetAmount`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB1.${i}.wardPercent`)),col(4,optLabel("Ward's Amount (calculated)")+calcInput(`scheduleB1.${i}.wardAmt`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-1: Cash Assets / Cash Equivalent Assets</h1>
  <div class="schedule-instructions">Mark Restricted if funds are in a court-supervised restricted depository. This affects the bond calculation.</div>
  ${addBtn('b1','Account')}${entries||scheduleEmptyHTML('b1','cash accounts')}
  ${totalsBox([["Schedule B-1 Total (Ward's Amount)",'totalB1'],['— of which Restricted','restrictedCash'],['— of which Unrestricted','unrestrictedCash']])}
  ${renderScheduleDocsSection('b1')}
  ${pageNav('/b1')}</div>`;
}

// Recomposes the free-text `description` field (still the field every
// other consumer of B-2 -- validate(), the print document, the Excel
// export -- reads) from the structured vehicle fields, so splitting Year/
// Make/Model/VIN into their own inputs didn't require touching any of
// those downstream readers.
function syncB2VehicleDescription(i){
  const e=D.scheduleB2[i];
  if(!e)return;
  const parts=[e.vehicleYear,e.vehicleMake,e.vehicleModel].filter(Boolean).join(' ');
  let desc=parts+(e.vehicleVin?(parts?' — VIN: ':'VIN: ')+e.vehicleVin:'');
  if(e.odometerMileage)desc+=(desc?' — ':'')+'Odometer: '+e.odometerMileage+' mi';
  e.description=desc;
}
// Bespoke handler (not data-bind) because checking this box must trigger a
// full re-render to swap the free-text Description field for the Year/
// Make/Model/VIN fields -- bindForms()'s generic checkbox wiring only
// calls afterChange(), which never re-renders the page.
// Deliberately does NOT call syncB2VehicleDescription() here: on an
// existing row the vehicle fields start blank, so syncing immediately
// would overwrite (and silently lose) whatever free-text description was
// already there before any Year/Make/Model/VIN has been typed. Syncing
// only on those fields' own oninput (see pageScheduleB2()) means
// description is only touched once the guardian has actually entered
// replacement data -- unchecking the box before then leaves the original
// description untouched.
function toggleB2Vehicle(i,checked){
  D.scheduleB2[i].isVehicle=checked;
  autoSave();
  renderPage(currentPage);
}
function pageScheduleB2(){
  const entries=D.scheduleB2.map((e,i)=>{
    const vehicleFields=e.isVehicle?`
    ${formRow(
      col(3,reqLabel('Year')+`<input class="form-control" inputmode="numeric" maxlength="4" value="${esc(e.vehicleYear)}" oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,4);D.scheduleB2[${i}].vehicleYear=this.value;syncB2VehicleDescription(${i});autoSave()">`),
      col(3,reqLabel('Make')+`<input class="form-control" value="${esc(e.vehicleMake)}" oninput="D.scheduleB2[${i}].vehicleMake=this.value;syncB2VehicleDescription(${i});autoSave()">`),
      col(3,reqLabel('Model')+`<input class="form-control" value="${esc(e.vehicleModel)}" oninput="D.scheduleB2[${i}].vehicleModel=this.value;syncB2VehicleDescription(${i});autoSave()">`),
      col(3,reqLabel('VIN')+`<input class="form-control" maxlength="17" style="text-transform:uppercase;" value="${esc(e.vehicleVin)}" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,17);D.scheduleB2[${i}].vehicleVin=this.value;syncB2VehicleDescription(${i});autoSave()">`)
    )}
    ${formRow(col(4,reqLabel('Odometer Mileage')+`<input class="form-control" inputmode="numeric" value="${esc(e.odometerMileage)}" oninput="this.value=this.value.replace(/[^0-9,]/g,'');D.scheduleB2[${i}].odometerMileage=this.value;syncB2VehicleDescription(${i});autoSave()">`))}
    <div class="vehicle-value-links">Look up a value at <a href="https://www.kbb.com/" target="_blank" rel="noopener noreferrer">Kelley Blue Book</a> or <a href="https://www.carfax.com/" target="_blank" rel="noopener noreferrer">Carfax</a> — both are non-affiliated commercial sites, offered only as a convenience; either generally provides an acceptable value. Print or save the page showing the final value you used and upload it below under Supporting Documents.</div>
    `:`
    ${formRow(col(12,reqLabel('Description (include model/serial number for non-vehicle items)')+`<input class="form-control" data-bind="scheduleB2.${i}.description" data-input-type="name">`))}
    `;
    return entryCard(`Item ${i+1}`,i,'b2',`
    ${formRow(col(12,`<label class="form-check"><input class="form-check-input" type="checkbox" ${e.isVehicle?'checked':''} aria-label="This item is a vehicle" onchange="toggleB2Vehicle(${i},this.checked)"><span class="form-check-label">This item is a vehicle (car, truck, motorcycle, boat, RV, etc.)</span></label>`))}
    ${vehicleFields}
    ${formRow(col(6,reqLabel('Location – Street Address')+textInput(`scheduleB2.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB2.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(6,reqLabel('Valuation Method &amp; Condition')+textInput(`scheduleB2.${i}.valuationMethod`,'e.g., Kelly Blue Book — fair condition')))}
    ${formRow(col(3,reqLabel('Full Asset Value ($)')+numInput(`scheduleB2.${i}.fullAssetValue`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleB2.${i}.wardPercent`)),col(3,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB2.${i}.wardB2`)),col(3,optLabel('In Safe Deposit Box?')+checkboxInput(`scheduleB2.${i}.inSafeDepositBox`,'In Safe Deposit Box?')))}
  `);
  }).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-2: Personal Property Assets</h1>
  <div class="schedule-instructions">List household goods, vehicles, jewelry, etc. Include items in safe deposit boxes (also list separately on SDB inventory).</div>
  ${addBtn('b2','Item')}${entries||scheduleEmptyHTML('b2','personal property items')}
  ${totalsBox([["Schedule B-2 Total (Ward's Value)",'totalB2']])}
  ${renderScheduleDocsSection('b2')}
  ${pageNav('/b2')}</div>`;
}

function pageScheduleB3(){
  const entries=D.scheduleB3.map((e,i)=>entryCard(`Asset ${i+1}`,i,'b3',`
    ${formRow(col(12,reqLabel('Description (include account, policy, or certificate number)')+`<input class="form-control" data-bind="scheduleB3.${i}.description" data-input-type="name">`))}
    ${formRow(col(6,reqLabel('Street Address / Custodian Address')+textInput(`scheduleB3.${i}.streetAddress`,'','address')),col(6,reqLabel('City / State / Zip')+textInput(`scheduleB3.${i}.cityStateZip`,'','zip')))}
    ${formRow(col(3,optLabel('Restricted?')+checkboxInput(`scheduleB3.${i}.isRestricted`,'Restricted')),col(3,optLabel('In Safe Deposit Box?')+checkboxInput(`scheduleB3.${i}.inSafeDepositBox`,'In Safe Deposit Box?')))}
    ${formRow(col(4,reqLabel('Full Asset Value ($)')+numInput(`scheduleB3.${i}.fullAssetValue`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB3.${i}.wardPercent`)),col(4,optLabel("Ward's Value (calculated)")+calcInput(`scheduleB3.${i}.wardB3`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-3: Intangible Assets</h1>
  <div class="schedule-instructions">List stocks, bonds, IRAs, insurance policies, etc. Mark Restricted if in a court-supervised account.</div>
  ${addBtn('b3','Asset')}${entries||scheduleEmptyHTML('b3','intangible assets')}
  ${totalsBox([["Schedule B-3 Total (Ward's Value)",'totalB3'],['— of which Restricted','restrictedIntang'],['— of which Unrestricted','unrestrictedIntang']])}
  ${renderScheduleDocsSection('b3')}
  ${pageNav('/b3')}</div>`;
}

function pageScheduleB4(){
  const entries=D.scheduleB4.map((e,i)=>entryCard(`Liability ${i+1}`,i,'b4',`
    ${formRow(col(5,reqLabel('Lending Institution / Creditor')+textInput(`scheduleB4.${i}.lenderName`,'','name')),col(3,reqLabel('Type')+selectInput(`scheduleB4.${i}.liabilityType`,[['Loan','Loan'],['Note','Note'],['Other Debt','Other Debt']])),col(4,optLabel('Account Number')+textInput(`scheduleB4.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(12,reqLabel('Related Personal Property Asset (if secured)')+textInput(`scheduleB4.${i}.relatedProperty`,'e.g., 1992 Toyota Corolla (B-2, Item 2)')))}
    ${formRow(col(12,reqLabel('Lender Street Address / City / State / Zip')+textInput(`scheduleB4.${i}.lenderAddress`,'','address')))}
    ${formRow(col(4,reqLabel('Full Liability Balance ($)')+numInput(`scheduleB4.${i}.fullLiabilityBalance`)),col(4,reqLabel("Ward's % (0-100)")+numInput(`scheduleB4.${i}.wardPercent`)),col(4,optLabel("Ward's Liability Balance (calculated)")+calcInput(`scheduleB4.${i}.wardB4`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</h1>
  <div class="schedule-instructions">List personal property liabilities only. Real estate liabilities go on Schedule A-2.</div>
  ${addBtn('b4','Liability')}${entries||scheduleEmptyHTML('b4','personal property liabilities')}
  ${totalsBox([["Schedule B-4 Total (Ward's Liability)",'totalB4']])}
  ${renderScheduleDocsSection('b4')}
  ${pageNav('/b4')}</div>`;
}

function pageScheduleC1(){
  const entries=D.scheduleC1.map((e,i)=>entryCard(`Income Source ${i+1}`,i,'c1',`
    ${formRow(col(5,reqLabel('Payer Name')+textInput(`scheduleC1.${i}.payerName`,'e.g., Social Security Administration','name')),col(3,reqLabel('Type of Income')+textInput(`scheduleC1.${i}.typeOfIncome`,'SSI, SSD, Pension…')),col(4,reqLabel('Frequency')+selectInput(`scheduleC1.${i}.frequencyOfPayment`,[['Monthly','Monthly'],['Quarterly','Quarterly'],['Semi-Annually','Semi-Annually'],['Annually','Annually'],['Other','Other']])))}
    ${formRow(col(6,reqLabel('Payer Street Address')+textInput(`scheduleC1.${i}.payerAddress`,'','address')),col(6,reqLabel('Payer City / State / Zip')+textInput(`scheduleC1.${i}.payerCityStateZip`,'','zip')))}
    ${formRow(col(4,reqLabel('Basis for Payment')+textInput(`scheduleC1.${i}.paymentBasis`,'e.g., $600/month')))}
    ${formRow(col(3,reqLabel('Annual Income Amount ($)')+numInput(`scheduleC1.${i}.annualIncomeAmount`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC1.${i}.wardPercent`)),col(3,optLabel("Ward's Annual Income (calculated)")+calcInput(`scheduleC1.${i}.wardC1`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-1: Income (Annualized)</h1>
  <div class="schedule-instructions">Annualize all amounts. Example: $600/month × 12 = $7,200/year.</div>
  ${addBtn('c1','Income Source')}${entries||scheduleEmptyHTML('c1','income sources')}
  ${totalsBox([["Schedule C-1 Total Annualized Income (Ward's Share)",'totalC1']])}
  ${renderScheduleDocsSection('c1')}
  ${pageNav('/c1')}</div>`;
}

function pageScheduleC2(){
  const entries=D.scheduleC2.map((e,i)=>entryCard(`Lawsuit ${i+1}`,i,'c2',`
    ${formRow(col(6,reqLabel('Claimant / Petitioner Name')+textInput(`scheduleC2.${i}.claimantName`,'','name')),col(6,reqLabel('Type of Lawsuit / Description')+textInput(`scheduleC2.${i}.lawsuitDescription`,'e.g., Mortgage Foreclosure','name')))}
    ${formRow(col(6,reqLabel('Court / Jurisdiction')+textInput(`scheduleC2.${i}.courtJurisdiction`,'e.g., 6th Judicial / Pinellas')),col(6,reqLabel('Case Number')+textInput(`scheduleC2.${i}.caseNumber`)))}
    ${formRow(col(12,reqLabel('Claimant / Attorney Address')+textInput(`scheduleC2.${i}.claimantAddress`,'','address')))}
    ${formRow(col(3,reqLabel('Date Filed')+dateInput(`scheduleC2.${i}.dateFiled`)),col(3,reqLabel('Amount of Claim ($)')+numInput(`scheduleC2.${i}.amountOfClaim`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC2.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC2.${i}.wardC2`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-2: Lawsuits Pending Against the Ward</h1>
  ${addBtn('c2','Lawsuit')}${entries||scheduleEmptyHTML('c2','lawsuits pending against the ward')}
  ${totalsBox([["Schedule C-2 Total (Ward's Share of Claims)",'totalC2']])}
  ${renderScheduleDocsSection('c2')}
  ${pageNav('/c2')}</div>`;
}

function pageScheduleC3(){
  const entries=D.scheduleC3.map((e,i)=>entryCard(`Action ${i+1}`,i,'c3',`
    ${formRow(col(6,reqLabel('Defendant / Entity Name')+textInput(`scheduleC3.${i}.defendantName`,'','name')),col(6,reqLabel('Type of Pending Legal Action')+textInput(`scheduleC3.${i}.actionDescription`,'e.g., Negligence, Personal Injury','name')))}
    ${formRow(col(12,reqLabel('Status of Action')+textInput(`scheduleC3.${i}.status`,'e.g., Mediation scheduled for…')))}
    ${formRow(col(6,reqLabel('Court / Jurisdiction / Attorney of Record')+textInput(`scheduleC3.${i}.courtJurisdiction`)),col(6,reqLabel('Case Number')+textInput(`scheduleC3.${i}.caseNumber`)))}
    ${formRow(col(3,reqLabel('Action Date')+dateInput(`scheduleC3.${i}.actionDate`)),col(3,reqLabel('Estimated Settlement ($)')+numInput(`scheduleC3.${i}.estimatedSettlement`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC3.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC3.${i}.wardC3`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-3: Lawsuits Pending by the Ward</h1>
  ${addBtn('c3','Action')}${entries||scheduleEmptyHTML('c3','lawsuits pending by the ward')}
  ${totalsBox([["Schedule C-3 Total (Ward's Estimated Share)",'totalC3']])}
  ${renderScheduleDocsSection('c3')}
  ${pageNav('/c3')}</div>`;
}

function pageScheduleC4(){
  const entries=D.scheduleC4.map((e,i)=>entryCard(`Trust ${i+1}`,i,'c4',`
    ${formRow(col(5,reqLabel('Trust Name')+textInput(`scheduleC4.${i}.trustName`)),col(4,reqLabel('Trustee Name')+textInput(`scheduleC4.${i}.trusteeName`)),col(3,reqLabel('Type of Trust')+textInput(`scheduleC4.${i}.trustType`,'Pooled, Special Needs, Living…')))}
    ${formRow(col(6,reqLabel('Trustee Street Address')+textInput(`scheduleC4.${i}.trusteeAddress`,'','address')),col(6,reqLabel('Trustee City / State / Zip')+textInput(`scheduleC4.${i}.trusteeCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Date Created')+dateInput(`scheduleC4.${i}.dateCreated`)),col(3,optLabel('Account Number')+textInput(`scheduleC4.${i}.accountNumber`,'','accountNumber')))}
    ${formRow(col(3,reqLabel('Trust Amount ($)')+numInput(`scheduleC4.${i}.trustAmount`)),col(3,reqLabel("Ward's % (0-100)")+numInput(`scheduleC4.${i}.wardPercent`)),col(3,optLabel("Ward's Share (calculated)")+calcInput(`scheduleC4.${i}.wardC4`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-4: Value of Trusts for the Ward</h1>
  ${addBtn('c4','Trust')}${entries||scheduleEmptyHTML('c4','trusts')}
  ${totalsBox([["Schedule C-4 Total (Ward's Share of Trusts)",'totalC4']])}
  ${renderScheduleDocsSection('c4')}
  ${pageNav('/c4')}</div>`;
}

function pageScheduleC5(){
  const entries=D.scheduleC5.map((e,i)=>entryCard(`Joint Owner ${i+1}`,i,'c5',`
    ${formRow(col(12,reqLabel('Asset Description (cross-ref schedule + item)')+textInput(`scheduleC5.${i}.assetDescription`,'e.g., Single Family Home — Schedule A-1, Item 1','name')))}
    ${formRow(col(6,reqLabel("Joint Owner's Name")+textInput(`scheduleC5.${i}.ownerName`)),col(6,reqLabel('Relationship to Ward')+textInput(`scheduleC5.${i}.relationshipToWard`,'e.g., Spouse, Child')))}
    ${formRow(col(6,reqLabel("Joint Owner's Street Address")+textInput(`scheduleC5.${i}.ownerAddress`,'','address')),col(6,reqLabel("Joint Owner's City / State / Zip")+textInput(`scheduleC5.${i}.ownerCityStateZip`,'','zip')))}
    ${formRow(col(3,reqLabel('Total Asset Value ($)')+numInput(`scheduleC5.${i}.totalAssetValue`)),col(3,reqLabel("Joint Owner's % (0-100)")+numInput(`scheduleC5.${i}.jointOwnerPercent`)),col(3,optLabel("Joint Owner's Value (calculated)")+calcInput(`scheduleC5.${i}.wardC5`)))}
  `)).join('');
  return `<div class="schedule-page">
  <h1>Schedule C-5: Joint Owners of Ward's Assets</h1>
  <div class="schedule-instructions">Cross-reference each asset to the schedule and item number where it appears.</div>
  ${addBtn('c5','Joint Owner')}${entries||scheduleEmptyHTML('c5','joint ownership entries')}
  ${totalsBox([["Schedule C-5 Total (Joint Owners' Combined Value)",'totalC5']])}
  ${renderScheduleDocsSection('c5')}
  ${pageNav('/c5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// ATTESTATION & FILING PAGES (D1–D5)
// ═══════════════════════════════════════════════════════
function pageD1(){
  const cards=D.guardians.map((g,i)=>{
    const isFirst=i===0;
    const title=isFirst?'Guardian #1':`Co-Guardian #${i+1}`;
    const removeBtn=isFirst?'':`<button class="btn btn-sm btn-outline-danger no-print" onclick="removeGuardian(${i})">✕ Remove</button>`;
    return `<div class="entry-card mb-3">
      <div class="entry-card-header"><span>${title}</span>${removeBtn}</div>
      <div class="entry-card-body">
        ${formRow(col(5,reqLabel("Guardian's Full Name")+textInput(`guardians.${i}.name`,'','name')),col(3,reqLabel('Signature Date')+dateInput(`guardians.${i}.signatureDate`)),col(4,reqLabel('SSN / EIN')+textInput(`guardians.${i}.ssnEin`,'','ssn')))}
        ${formRow(col(4,reqLabel('Phone Number')+textInput(`guardians.${i}.phone`,'','phone')),col(8,reqLabel('Street Address')+textInput(`guardians.${i}.streetAddress`,'','address')))}
        ${formRow(col(6,reqLabel('City / State / Zip')+textInput(`guardians.${i}.cityStateZip`,'','zip')))}
      </div>
    </div>`;
  }).join('');
  const addCoBtn=D.guardians.length<3?`<button class="btn btn-outline-secondary btn-sm mb-3 no-print" onclick="addGuardian()">+ Add Co-Guardian</button>`:'';
  return `<div class="schedule-page">
  <h1>Part III: Guardian(s) Attestation</h1>
  <div class="schedule-instructions">
    UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing, and the facts alleged are true, to the best of my knowledge and belief.
  </div>
  ${cards}${addCoBtn}
  ${pageNav('/d1')}</div>`;
}

function pageD2(){
  return `<div class="schedule-page">
  <h1>Part IV: Preparer &amp; Guardian Attorney Attestations</h1>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Preparer Signature</h2>
  <p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">
    If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.
  </p>
  <div class="entry-card mb-4">
    <div class="entry-card-body">
      ${formRow(col(5,reqLabel("Preparer's Name")+textInput('preparer.name','','name')),col(3,reqLabel('Date')+dateInput('preparer.signatureDate')),col(4,reqLabel('SSN / EIN')+textInput('preparer.ssnEin','','ssn')))}
      ${formRow(col(4,reqLabel('Phone Number')+textInput('preparer.phone','','phone')),col(8,reqLabel('Street Address')+textInput('preparer.streetAddress','','address')))}
      ${formRow(col(6,reqLabel('City / State / Zip')+textInput('preparer.cityStateZip','','zip')))}
    </div>
  </div>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Guardian Attorney Signature</h2>
  <p style="font-size:.78rem;font-style:italic;color:var(--ink-3);">The attorney may use an electronic signature "/s/".</p>
  <div class="entry-card">
    <div class="entry-card-body">
      ${formRow(col(5,reqLabel("Attorney's Name")+textInput('attorney.name','','name')),col(3,reqLabel('Signature Date')+dateInput('attorney.signatureDate')),col(4,reqLabel('Filing Date (as of)')+dateInput('attorney.filingDate')))}
      ${formRow(col(4,reqLabel('Florida Bar Number')+textInput('attorney.barNumber','','barNumber')),col(4,reqLabel('Phone Number')+textInput('attorney.phone','','phone')))}
      ${formRow(col(8,reqLabel('Street Address')+textInput('attorney.streetAddress','','address')),col(6,reqLabel('City / State / Zip')+textInput('attorney.cityStateZip','','zip')))}
    </div>
  </div>
  ${pageNav('/d2')}</div>`;
}

function pageD3(){
  return `<div class="schedule-page">
  <h1>Part V: Audit Fee &amp; Safe Deposit Box</h1>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Audit Fee Schedule (Initial Inventories Only)</h2>
    <p style="font-size:.83rem;margin-bottom:.5rem;">
      Inventories with total property value exceeding $25,000: <strong>$85.00</strong><br>
      Inventories with total property value at or below $25,000: <strong>$0.00</strong>
    </p>
    <div class="summary-line total">
      <span>Calculated Audit Fee (based on total inventory of <strong id="auditFeeBase">${fmt(calc.total())}</strong>)</span>
      <span id="auditFee">${fmt(calc.auditFee())}</span>
    </div>
  </div>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Safe Deposit Box</h2>
    <p style="font-size:.83rem;margin:0 0 .5rem;">Does the ward have a safe deposit box or the right to enter a box registered in joint names or in another's name? (FS 744.365(4))</p>
    ${formRow(col(4,optLabel('Safe Deposit Box?')+checkboxInput('hasSafeDepositBox','Safe Deposit Box?')))}
    <div id="sdb-filed-row" style="${D.hasSafeDepositBox?'':'display:none;'}">
      ${formRow(col(4,optLabel('SDB Inventory Filed?')+checkboxInput('safeDepositBoxFiled','SDB Inventory Filed?')))}
    </div>
  </div>
  ${pageNav('/d3')}</div>`;
}

function pageD4(){
  return `<div class="schedule-page">
  <h1>Part V: Surety Bond &amp; Bond Calculation</h1>
  <div class="summary-box mb-3">
    <h2 class="subsection-heading">Bond Calculation</h2>
    <p style="font-size:.8rem;margin-bottom:.6rem;">Bond amount = all liquid assets less those in a restricted depository. Only real property is excluded.</p>
    <div class="summary-line"><span>B-1 — Cash in Restricted Depository</span><span id="restrictedCash">${fmt(calc.restrictedCash())}</span></div>
    <div class="summary-line"><span>B-3 — Intangible Assets (Restricted)</span><span id="restrictedIntang">${fmt(calc.restrictedIntang())}</span></div>
    <div class="summary-line"><span>B-1 — Cash NOT in Restricted Depository</span><span id="unrestrictedCash">${fmt(calc.unrestrictedCash())}</span></div>
    <div class="summary-line"><span>B-2 — Personal Property Assets</span><span id="totalB2">${fmt(calc.totalB2())}</span></div>
    <div class="summary-line"><span>B-3 — Intangible Assets (Unrestricted)</span><span id="unrestrictedIntang">${fmt(calc.unrestrictedIntang())}</span></div>
    <div class="summary-line total"><span>Total for Bond Requirement (calculated)</span><span id="bondRequired">${fmt(calc.bondRequired())}</span></div>
  </div>
  <div class="summary-box">
    <h2 class="subsection-heading">Surety Bond Details</h2>
    ${formRow(col(4,reqLabel('Bond Amount')+textInput('bondAmount','e.g., $50,000')),col(3,reqLabel('Bond Period – From')+dateInput('bondPeriodFrom')),col(3,reqLabel('Bond Period – To')+dateInput('bondPeriodTo')))}
    ${formRow(col(6,reqLabel('Name of Bonding Company')+textInput('bondingCompany','','name')),col(6,optLabel('If bond waived – date of order')+textInput('bondWaivedDate')))}
  </div>
  ${pageNav('/d4')}</div>`;
}

function pageD5(){
  const cards=D.serviceRecipients.map((r,i)=>{
    const removeBtn=D.serviceRecipients.length>1?`<button class="btn btn-sm btn-outline-danger no-print" onclick="removeRecipient(${i})">✕ Remove</button>`:'';
    return `<div class="entry-card mb-2">
      <div class="entry-card-header"><span>Recipient ${i+1}</span>${removeBtn}</div>
      <div class="entry-card-body">
        ${formRow(col(5,reqLabel('Name')+textInput(`serviceRecipients.${i}.name`,'','name')),col(4,reqLabel('Street Address')+textInput(`serviceRecipients.${i}.address`,'','address')),col(3,reqLabel('City / State / Zip')+textInput(`serviceRecipients.${i}.cityStateZip`,'','zip')))}
      </div>
    </div>`;
  }).join('');
  const addBtn2=D.serviceRecipients.length<4?`<button class="btn btn-outline-secondary btn-sm mb-4 no-print" onclick="addRecipient()">+ Add Recipient</button>`:'';
  return `<div class="schedule-page">
  <h1>Part VI: Certificate of Service</h1>
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Recipients</h2>
  ${cards}${addBtn2}
  <h2 style="color:var(--ink);margin:.75rem 0 .4rem;font-size:.95rem;">Attorney Certification</h2>
  <div class="entry-card">
    <div class="entry-card-body">
      ${formRow(col(4,reqLabel('Service Date (on this date)')+dateInput('serviceDate')))}
      ${formRow(col(5,reqLabel("Attorney's Name")+textInput('serviceAttorney.name','','name')),col(3,reqLabel('Signature Date')+dateInput('serviceAttorney.signatureDate')),col(4,reqLabel('Florida Bar Number')+textInput('serviceAttorney.barNumber','','barNumber')))}
      ${formRow(col(4,reqLabel('Phone')+textInput('serviceAttorney.phone','','phone')),col(8,reqLabel('Street Address')+textInput('serviceAttorney.streetAddress','','address')))}
      ${formRow(col(6,reqLabel('City / State / Zip')+textInput('serviceAttorney.cityStateZip','','zip')))}
    </div>
  </div>
  ${pageNav('/d5')}</div>`;
}

// ═══════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════
function validate(){
  const errors=[];
  const d=window.D;
  function req(v,label){if(!v||!String(v).trim())errors.push(label);}
  req(d.wardName,'Cover — Name of Ward is required.');
  req(d.caseNumber,'Cover — Case Number is required.');
  if(!d.gid)errors.push('Cover — Guardianship Inception Date (GID) is required.');
  req(d.county,'Cover — County is required.');
  req(d.guardianName,'Cover — Guardian Name(s) is required.');
  req(d.attorneyForGuardian,'Cover — Attorney for Guardian is required.');
  req(d.typeOfGuardianship,'Cover — Type of Guardianship is required.');
  // A schedule left totally untouched -- no rows, and the "I verify there
  // are no X to report" checkbox (scheduleEmptyHTML()/setScheduleNoItems())
  // never checked -- produced NO validate() errors before this, since every
  // per-row check below is inside a .forEach() that simply never runs on an
  // empty array. That's what let a schedule sit blank-and-unconfirmed while
  // still showing 100% complete in the sidebar (computeNavChecks() derives
  // its checks from these same errors) and passing Print Preview's export
  // gate. Mirrors the same "row or checkbox" rule the schedule's own Next
  // button already enforces (isScheduleIncomplete()), so there's exactly
  // one definition of "done" for a schedule, not two that can disagree.
  SCHEDULE_NAV_KEYS.forEach(key=>{
    const dataKey='schedule'+key[0].toUpperCase()+key.slice(1);
    if((d[dataKey]||[]).length===0&&!(d.scheduleNoItems&&d.scheduleNoItems[key])){
      const route=key[0].toUpperCase()+'-'+key.slice(1);
      errors.push(`${route} — Add at least one entry, or check the box verifying there are none, before this schedule counts as complete.`);
    }
  });
  d.scheduleA1.forEach((e,i)=>{const p=`A-1 row ${i+1}`;req(e.propertyDescription,`${p} — Property Description`);req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);if(e.fullAssetValue<=0)errors.push(`${p} — Full Asset Value must be > 0.`);if(e.wardPercent<=0)errors.push(`${p} — Ward's % must be > 0.`);});
  d.scheduleA2.forEach((e,i)=>{const p=`A-2 row ${i+1}`;req(e.lenderName,`${p} — Lender Name`);req(e.lenderAddress,`${p} — Lender Address`);req(e.lenderCityStateZip,`${p} — Lender City/State/Zip`);if(e.fullDebtBalance<=0)errors.push(`${p} — Full Debt Balance must be > 0.`);});
  d.scheduleB1.forEach((e,i)=>{const p=`B-1 row ${i+1}`;req(e.institutionName,`${p} — Institution Name`);req(e.accountType,`${p} — Account Type`);req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);if(e.fullAssetAmount<=0)errors.push(`${p} — Full Asset Amount must be > 0.`);});
  d.scheduleB2.forEach((e,i)=>{const p=`B-2 row ${i+1}`;
    if(e.isVehicle){
      req(e.vehicleYear,`${p} — Year`);req(e.vehicleMake,`${p} — Make`);req(e.vehicleModel,`${p} — Model`);req(e.vehicleVin,`${p} — VIN`);req(e.odometerMileage,`${p} — Odometer Mileage`);
    }else{
      req(e.description,`${p} — Description`);
    }
    req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);req(e.valuationMethod,`${p} — Valuation Method`);if(e.fullAssetValue<=0)errors.push(`${p} — Full Asset Value must be > 0.`);});
  d.scheduleB3.forEach((e,i)=>{const p=`B-3 row ${i+1}`;req(e.description,`${p} — Description`);req(e.streetAddress,`${p} — Street Address`);req(e.cityStateZip,`${p} — City/State/Zip`);if(e.fullAssetValue<=0)errors.push(`${p} — Full Asset Value must be > 0.`);});
  d.scheduleB4.forEach((e,i)=>{const p=`B-4 row ${i+1}`;req(e.lenderName,`${p} — Lender Name`);req(e.relatedProperty,`${p} — Related Property`);req(e.lenderAddress,`${p} — Lender Address`);if(e.fullLiabilityBalance<=0)errors.push(`${p} — Full Liability Balance must be > 0.`);});
  d.scheduleC1.forEach((e,i)=>{const p=`C-1 row ${i+1}`;req(e.payerName,`${p} — Payer Name`);req(e.typeOfIncome,`${p} — Type of Income`);req(e.payerAddress,`${p} — Payer Address`);req(e.paymentBasis,`${p} — Basis for Payment`);if(e.annualIncomeAmount<=0)errors.push(`${p} — Annual Income Amount must be > 0.`);});
  d.scheduleC2.forEach((e,i)=>{const p=`C-2 row ${i+1}`;req(e.claimantName,`${p} — Claimant Name`);req(e.lawsuitDescription,`${p} — Lawsuit Description`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`);req(e.caseNumber,`${p} — Case Number`);if(!e.dateFiled)errors.push(`${p} — Date Filed is required.`);if(e.amountOfClaim<=0)errors.push(`${p} — Amount of Claim must be > 0.`);});
  d.scheduleC3.forEach((e,i)=>{const p=`C-3 row ${i+1}`;req(e.defendantName,`${p} — Defendant Name`);req(e.actionDescription,`${p} — Action Description`);req(e.status,`${p} — Status`);req(e.courtJurisdiction,`${p} — Court/Jurisdiction`);if(!e.actionDate)errors.push(`${p} — Action Date is required.`);if(e.estimatedSettlement<=0)errors.push(`${p} — Estimated Settlement must be > 0.`);});
  d.scheduleC4.forEach((e,i)=>{const p=`C-4 row ${i+1}`;req(e.trustName,`${p} — Trust Name`);req(e.trusteeName,`${p} — Trustee Name`);req(e.trusteeAddress,`${p} — Trustee Address`);req(e.trusteeCityStateZip,`${p} — Trustee City/State/Zip`);if(!e.dateCreated)errors.push(`${p} — Date Created is required.`);if(e.trustAmount<=0)errors.push(`${p} — Trust Amount must be > 0.`);});
  d.scheduleC5.forEach((e,i)=>{const p=`C-5 row ${i+1}`;req(e.assetDescription,`${p} — Asset Description`);req(e.ownerName,`${p} — Owner Name`);req(e.ownerAddress,`${p} — Owner Address`);req(e.ownerCityStateZip,`${p} — Owner City/State/Zip`);req(e.relationshipToWard,`${p} — Relationship to Ward`);if(e.totalAssetValue<=0)errors.push(`${p} — Total Asset Value must be > 0.`);});
  d.guardians.forEach((g,i)=>{const p=`D-1 Guardian #${i+1}`;req(g.name,`${p} — Name`);if(!g.signatureDate)errors.push(`${p} — Signature Date is required.`);req(g.ssnEin,`${p} — SSN/EIN`);req(g.phone,`${p} — Phone`);req(g.streetAddress,`${p} — Street Address`);req(g.cityStateZip,`${p} — City/State/Zip`);});
  req(d.preparer.name,'D-2 Preparer — Name');if(!d.preparer.signatureDate)errors.push('D-2 Preparer — Date is required.');req(d.preparer.ssnEin,'D-2 Preparer — SSN/EIN');req(d.preparer.phone,'D-2 Preparer — Phone');req(d.preparer.streetAddress,'D-2 Preparer — Street Address');req(d.preparer.cityStateZip,'D-2 Preparer — City/State/Zip');
  req(d.attorney.name,'D-2 Attorney — Name');if(!d.attorney.signatureDate)errors.push('D-2 Attorney — Signature Date is required.');if(!d.attorney.filingDate)errors.push('D-2 Attorney — Filing Date is required.');req(d.attorney.barNumber,'D-2 Attorney — Bar Number');req(d.attorney.phone,'D-2 Attorney — Phone');req(d.attorney.streetAddress,'D-2 Attorney — Street Address');req(d.attorney.cityStateZip,'D-2 Attorney — City/State/Zip');
  req(d.bondAmount,'D-4 — Bond Amount');if(!d.bondPeriodFrom)errors.push('D-4 — Bond Period From is required.');if(!d.bondPeriodTo)errors.push('D-4 — Bond Period To is required.');req(d.bondingCompany,'D-4 — Bonding Company');
  d.serviceRecipients.forEach((r,i)=>{const p=`D-5 Recipient ${i+1}`;req(r.name,`${p} — Name`);req(r.address,`${p} — Address`);req(r.cityStateZip,`${p} — City/State/Zip`);});
  if(!d.serviceDate)errors.push('D-5 — Service Date is required.');
  req(d.serviceAttorney.name,'D-5 Attorney — Name');if(!d.serviceAttorney.signatureDate)errors.push('D-5 Attorney — Signature Date is required.');req(d.serviceAttorney.barNumber,'D-5 Attorney — Bar Number');req(d.serviceAttorney.phone,'D-5 Attorney — Phone');req(d.serviceAttorney.streetAddress,'D-5 Attorney — Street Address');req(d.serviceAttorney.cityStateZip,'D-5 Attorney — City/State/Zip');
  return errors;
}

// ═══════════════════════════════════════════════════════
// PRINT VIEW
// ═══════════════════════════════════════════════════════
function th(...cols){return `<tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>`;}
// td()/tdR() emit display:table-row divs (not real <table> markup) — used only
// for the key-value "layout" blocks (Required Info, schedule totals, audit
// fee, etc). display:table-row/table-cell renders pixel-identical to a real
// table, but isn't flagged by accessibility tools as a misused layout table.
function td(...cols){return `<div class="tr">${cols.map(c=>`<div class="td">${c||''}</div>`).join('')}</div>`;}
function tdR(...cols){// last col right-aligned
  const all=cols.map((c,i)=>i===cols.length-1?`<div class="td right">${c||''}</div>`:`<div class="td">${c||''}</div>`);
  return `<div class="tr">${all.join('')}</div>`;
}
function totRow(label,val,span){return `<tr class="total-row"><td colspan="${span}">${label}</td><td class="right">${fmt(val)}</td></tr>`;}
// Print-time counterpart to the Cover-page checkbox verifying a schedule
// has no items (see scheduleEmptyHTML()) -- an empty schedule the filer
// has confirmed prints a plain-language verification statement instead of
// the bare "No entries" placeholder, so the filed document itself reflects
// that the blank schedule was reviewed, not just skipped.
function printEmptyRow(key,colspan,noun){
  const confirmed=window.D.scheduleNoItems&&window.D.scheduleNoItems[key];
  const text=confirmed?`The filer verifies there are no ${noun} to report for this schedule.`:'No entries';
  return `<tr class="doc-empty-row"><td colspan="${colspan}">${text}</td></tr>`;
}
function docHeader(ward,caseNo,schedule,page){
  return `<div class="doc-header">
    <div class="court-title">${circuitCourtCaption(window.D.county)}</div>
    <div class="doc-title">VERIFIED INITIAL INVENTORY</div>
    <div class="doc-meta">
      <span>Name of Ward: <strong>${ward}</strong></span>
      <span>${schedule} — Page ${page}</span>
      <span>Case Number: <strong>${caseNo}</strong></span>
    </div>
  </div>`;
}

function buildPrintHTML(){
  const d=window.D;
  const ward=esc(d.wardName);
  const caseNo=esc(d.caseNumber);
  const county=esc(d.county);
  const c=calc;
  let html='';

  // SECTION 1: Summary I & II
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Summary','1')}
  <div class="doc-schedule-title">Part I — REQUIRED INFORMATION</div>
  <div class="doc-table-div mb-2" style="font-size:.76rem;">
    ${td('Name of Ward',`<strong>${ward}</strong>`)}
    ${td('Case Number',`<strong>${caseNo}</strong>`)}
    ${td('Guardianship Inception Date (GID)',fmtDate(d.gid))}
    ${td('County',county)}
    ${td('Guardian',esc(d.guardianName))}
    ${td('Attorney for Guardian',esc(d.attorneyForGuardian))}
    ${td('Type of Guardianship',esc(d.typeOfGuardianship))}
    ${td('Safe Deposit Box?',d.hasSafeDepositBox?'Yes — Inventory Filed: '+(d.safeDepositBoxFiled?'Yes':'No'):'No')}
    ${td('Amended Form?',d.isAmended?'Yes':'No')}
  </div>
  ${(d.witnesses||[]).length?`<div class="doc-schedule-title">Inventory Witnesses</div>
  <table class="doc-table">
    <caption class="visually-hidden">Inventory Witnesses</caption>
    <thead>${th('#','Name','Address','Occupation')}</thead>
    <tbody>${d.witnesses.map((w,i)=>`<tr><td>${i+1}</td><td>${esc(w.name)}</td><td>${esc(w.address)}</td><td>${esc(w.occupation)}</td></tr>`).join('')}</tbody>
  </table>`:''}
  <div class="doc-schedule-title mt-2">Part II — SUMMARY I</div>
  <div class="doc-schedule-title">SCHEDULE A: Real Estate Assets / Liabilities</div>
  <div class="doc-table-div mb-2">
    ${tdR('Schedule A-1 — Real Estate / Real Property',fmt(c.totalA1()))}
    ${tdR('Schedule A-2 — Real Estate Liabilities','('+fmt(c.totalA2())+')')}
    <div class="tr total-row"><div class="td">Real Estate Assets, Net of Liabilities</div><div class="td right">${fmt(c.netA())}</div></div>
  </div>
  <div class="doc-schedule-title">SCHEDULE B: Cash / Personal Property / Intangible Assets / Liabilities</div>
  <div class="doc-table-div mb-2">
    ${tdR('Schedule B-1 — Cash Assets / Cash Equivalent Assets',fmt(c.totalB1()))}
    ${tdR('Schedule B-2 — Personal Property Assets',fmt(c.totalB2()))}
    ${tdR('Schedule B-3 — Intangible Assets',fmt(c.totalB3()))}
    ${tdR('Schedule B-4 — Liabilities / Secured and Unsecured<br>Debt / Notes / Loans','('+fmt(c.totalB4())+')')}
    <div class="tr total-row"><div class="td">Cash / Personal Property / Intangible Assets, Net of Liabilities</div><div class="td right">${fmt(c.netB())}</div></div>
  </div>
  <div class="doc-table-div">
    <div class="tr total-row"><div class="td"><strong>VERIFIED INITIAL INVENTORY OF GUARDIAN</strong></div><div class="td right"><strong>${fmt(c.total())}</strong></div></div>
  </div>
  </div>`;

  // Page 2 – Summary II
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Summary (Cont\'d)','2')}
  <div class="doc-schedule-title">SUMMARY II — SCHEDULE C: Other Financial Information</div>
  <div class="doc-table-div mb-3">
    ${tdR('Schedule C-1 — Income (Annualized)',fmt(c.totalC1()))}
    ${tdR('Schedule C-2 — Lawsuits Pending Against the Ward',fmt(c.totalC2()))}
    ${tdR('Schedule C-3 — Lawsuits Pending by the Ward',fmt(c.totalC3()))}
    ${tdR('Schedule C-4 — Value of Trusts for the Ward',fmt(c.totalC4()))}
    ${tdR("Schedule C-5 — Joint Owners of Ward's Assets",fmt(c.totalC5()))}
  </div>
  </div>`;

  // SECTION 2: Schedules A (A-1 and A-2 together)
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Schedule A-1','1')}
  <div class="doc-schedule-title">SCHEDULE A-1: Real Estate / Real Property</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule A-1: Real Estate / Real Property</caption>
    <thead>${th('#','Description / Address / Notes','Residence?','Income?','Full Value','Ward %',"Ward's Value")}</thead>
    <tbody>
    ${d.scheduleA1.length?d.scheduleA1.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.propertyDescription)}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small>${e.notes?`<br><small><em>${esc(e.notes)}</em></small>`:''}</td><td>${e.isPersonalResidence?'Yes':'No'}</td><td>${e.isIncomeProperty?'Yes':'No'}</td><td class="right">${fmt(e.fullAssetValue)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardVal(e))}</td></tr>`).join(''):printEmptyRow('a1',7,'real estate assets')}
    ${totRow("Schedule A-1 Total",c.totalA1(),6)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule A-2: Real Estate Liabilities (Mortgages / Notes / Loans)</caption>
    <thead>${th('#','Lender / Description / Account','Type','Full Balance','Ward %',"Ward's Balance")}</thead>
    <tbody>
    ${d.scheduleA2.length?d.scheduleA2.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.lenderName)}<br><small>${esc(e.lenderAddress)} ${esc(e.lenderCityStateZip)}</small>${e.accountNumber?`<br><small>Acct: ${esc(e.accountNumber)}</small>`:''}</td><td>${esc(e.liabilityType)}</td><td class="right">${fmt(e.fullDebtBalance)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardDebt(e))}</td></tr>`).join(''):printEmptyRow('a2',6,'real estate liabilities')}
    ${totRow("Schedule A-2 Total",c.totalA2(),5)}
    </tbody>
  </table>`;

  // SECTION 3: Schedules B (B-1, B-2, B-3, B-4 together)
  html+=`</div><div class="schedule-page doc-page">${docHeader(ward,caseNo,'Schedule B-1','1')}
  <div class="doc-schedule-title">SCHEDULE B-1: Cash Assets / Cash Equivalent Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-1: Cash Assets / Cash Equivalent Assets</caption>
    <thead>${th('#','Institution / Account / Address','Type','Restricted?','Full Amount','Ward %',"Ward's Amount","Restricted Amt")}</thead>
    <tbody>
    ${d.scheduleB1.length?d.scheduleB1.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.institutionName)}${e.accountNumber?`<br><small>Acct: ${esc(e.accountNumber)}</small>`:''}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small></td><td>${esc(e.accountType)}</td><td>${e.isRestricted?'Yes':'No'}</td><td class="right">${fmt(e.fullAssetAmount)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardAmt(e))}</td><td class="right">${e.isRestricted?fmt(calc.wardAmt(e)):'—'}</td></tr>`).join(''):printEmptyRow('b1',8,'cash assets')}
    <tr class="total-row"><td colspan="6">Schedule B-1 Total</td><td class="right">${fmt(c.totalB1())}</td><td class="right">${fmt(c.restrictedCash())}</td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-2: Personal Property Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-2: Personal Property Assets</caption>
    <thead>${th('#','Description / Location / Valuation','Full Value','Ward %',"Ward's Value",'In SDB?','SDB Amt')}</thead>
    <tbody>
    ${d.scheduleB2.length?d.scheduleB2.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.description)}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small>${e.valuationMethod?`<br><small><em>${esc(e.valuationMethod)}</em></small>`:''}</td><td class="right">${fmt(e.fullAssetValue)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardB2(e))}</td><td>${e.inSafeDepositBox?'Yes':'No'}</td><td class="right">${e.inSafeDepositBox?fmt(e.amountInSDB):'—'}</td></tr>`).join(''):printEmptyRow('b2',7,'personal property assets')}
    <tr class="total-row"><td colspan="4">Schedule B-2 Total</td><td class="right">${fmt(c.totalB2())}</td><td colspan="2"></td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-3: Intangible Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-3: Intangible Assets</caption>
    <thead>${th('#','Description / Location','Restricted?','Full Value','Ward %',"Ward's Value","Restricted Amt",'In SDB?')}</thead>
    <tbody>
    ${d.scheduleB3.length?d.scheduleB3.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.description)}<br><small>${esc(e.streetAddress)} ${esc(e.cityStateZip)}</small></td><td>${e.isRestricted?'Yes':'No'}</td><td class="right">${fmt(e.fullAssetValue)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardB3(e))}</td><td class="right">${e.isRestricted?fmt(calc.wardB3(e)):'—'}</td><td>${e.inSafeDepositBox?'Yes':'No'}</td></tr>`).join(''):printEmptyRow('b3',8,'intangible assets')}
    <tr class="total-row"><td colspan="5">Schedule B-3 Total</td><td class="right">${fmt(c.totalB3())}</td><td class="right">${fmt(c.restrictedIntang())}</td><td></td></tr>
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule B-4: Liabilities / Secured and Unsecured Debts / Notes / Loans</caption>
    <thead>${th('#','Creditor / Related Property / Account','Type','Full Balance','Ward %',"Ward's Balance")}</thead>
    <tbody>
    ${d.scheduleB4.length?d.scheduleB4.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.lenderName)}${e.relatedProperty?`<br><small>Re: ${esc(e.relatedProperty)}</small>`:''} ${e.accountNumber?`<br><small>Acct: ${esc(e.accountNumber)}</small>`:''}${e.lenderAddress?`<br><small>${esc(e.lenderAddress)}</small>`:''}</td><td>${esc(e.liabilityType)}</td><td class="right">${fmt(e.fullLiabilityBalance)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardB4(e))}</td></tr>`).join(''):printEmptyRow('b4',6,'personal property liabilities')}
    ${totRow("Schedule B-4 Total",c.totalB4(),5)}
    </tbody>
  </table>
  </div>`;

  // SECTION 4: Schedules C (C-1, C-2, C-3, C-4, C-5 together)
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Schedule C-1','1')}
  <div class="doc-schedule-title">SCHEDULE C-1: Income (Annualized)</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-1: Income (Annualized)</caption>
    <thead>${th('#','Payer / Address','Type','Frequency','Basis','Annual Amount','Ward %',"Ward's Income")}</thead>
    <tbody>
    ${d.scheduleC1.length?d.scheduleC1.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.payerName)}<br><small>${esc(e.payerAddress)} ${esc(e.payerCityStateZip)}</small></td><td>${esc(e.typeOfIncome)}</td><td>${esc(e.frequencyOfPayment)}</td><td>${esc(e.paymentBasis)}</td><td class="right">${fmt(e.annualIncomeAmount)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC1(e))}</td></tr>`).join(''):printEmptyRow('c1',8,'income sources')}
    ${totRow("Schedule C-1 Total (Annualized)",c.totalC1(),7)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-2: Lawsuits Pending Against the Ward</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-2: Lawsuits Pending Against the Ward</caption>
    <thead>${th('#','Claimant / Court / Case #','Date Filed','Claim Amount','Ward %',"Ward's Share")}</thead>
    <tbody>
    ${d.scheduleC2.length?d.scheduleC2.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.claimantName)} — ${esc(e.lawsuitDescription)}<br><small>${esc(e.courtJurisdiction)}</small>${e.caseNumber?`<br><small>Case #: ${esc(e.caseNumber)}</small>`:''}${e.claimantAddress?`<br><small>${esc(e.claimantAddress)}</small>`:''}</td><td>${fmtDate(e.dateFiled)}</td><td class="right">${fmt(e.amountOfClaim)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC2(e))}</td></tr>`).join(''):printEmptyRow('c2',6,'lawsuits pending against the ward')}
    ${totRow("Schedule C-2 Total",c.totalC2(),5)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-3: Lawsuits Pending by the Ward</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-3: Lawsuits Pending by the Ward</caption>
    <thead>${th('#','Defendant / Description / Status','Action Date','Est. Settlement','Ward %',"Ward's Share")}</thead>
    <tbody>
    ${d.scheduleC3.length?d.scheduleC3.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.defendantName)} — ${esc(e.actionDescription)}<br><small>${esc(e.status)}</small><br><small>${esc(e.courtJurisdiction)}${e.caseNumber?' | Case #: '+esc(e.caseNumber):''}</small></td><td>${fmtDate(e.actionDate)}</td><td class="right">${fmt(e.estimatedSettlement)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC3(e))}</td></tr>`).join(''):printEmptyRow('c3',6,'lawsuits pending by the ward')}
    ${totRow("Schedule C-3 Total",c.totalC3(),5)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-4: Value of Trusts for the Ward</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-4: Value of Trusts for the Ward</caption>
    <thead>${th('#','Trust Name / Trustee / Address','Type','Date Created','Acct #','Trust Amount','Ward %',"Ward's Share")}</thead>
    <tbody>
    ${d.scheduleC4.length?d.scheduleC4.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.trustName)}<br><small>${esc(e.trusteeName)}</small><br><small>${esc(e.trusteeAddress)} ${esc(e.trusteeCityStateZip)}</small></td><td>${esc(e.trustType)}</td><td>${fmtDate(e.dateCreated)}</td><td>${esc(e.accountNumber)}</td><td class="right">${fmt(e.trustAmount)}</td><td class="right">${e.wardPercent}%</td><td class="right">${fmt(calc.wardC4(e))}</td></tr>`).join(''):printEmptyRow('c4',8,'trusts')}
    ${totRow("Schedule C-4 Total",c.totalC4(),7)}
    </tbody>
  </table>
  <div class="doc-schedule-title mt-3">SCHEDULE C-5: Joint Owners of Ward's Assets</div>
  <table class="doc-table">
    <caption class="visually-hidden">Schedule C-5: Joint Owners of Ward's Assets</caption>
    <thead>${th('#','Asset / Owner / Address','Relationship','Total Asset Value',"Owner %","Owner's Value")}</thead>
    <tbody>
    ${d.scheduleC5.length?d.scheduleC5.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.assetDescription)}<br><small>${esc(e.ownerName)}</small><br><small>${esc(e.ownerAddress)} ${esc(e.ownerCityStateZip)}</small></td><td>${esc(e.relationshipToWard)}</td><td class="right">${fmt(e.totalAssetValue)}</td><td class="right">${e.jointOwnerPercent}%</td><td class="right">${fmt(calc.wardC5(e))}</td></tr>`).join(''):printEmptyRow('c5',6,'joint ownership entries')}
    ${totRow("Schedule C-5 Total",c.totalC5(),5)}
    </tbody>
  </table>
  </div>`;

  // SECTION 5: Part III & IV – Guardian Attestation + Preparer & Attorney (combined so the
  // page isn't left mostly blank when there's only one short guardian block)
  const pr=d.preparer, at=d.attorney;
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Part III &amp; IV','3')}
  <div class="doc-schedule-title">Part III — GUARDIAN(S) ATTESTATION(S)</div>
  <div class="attestation-text">UNDER PENALTIES OF PERJURY, I declare that I have read the foregoing, and the facts alleged are true, to the best of my knowledge and belief.</div>
  ${d.guardians.map((g,i)=>`
  <div class="doc-signature-block mb-4">
    <div class="row">
      <div class="col-6"><div class="doc-field-label">${i===0?"Guardian #1's Signature":`Co-Guardian #${i+1}'s Signature`}</div><div class="doc-signature-line"></div></div>
      <div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(g.signatureDate)}</div></div>
      <div class="col-3"><div class="doc-field-label">${i===0?"Guardian #1's Name":`Co-Guardian #${i+1}'s Name`}</div><div class="doc-signature-line">${esc(g.name)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(g.ssnEin)}</div></div>
      <div class="col-4"><div class="doc-field-label">Phone Number</div><div class="doc-signature-line">${esc(g.phone)}</div></div>
      <div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(g.streetAddress)}</div></div>
    </div>
    <div class="row mt-2">
      <div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(g.cityStateZip)}</div></div>
    </div>
  </div>`).join('')}
  <div class="doc-schedule-title">Part IV — PREPARER &amp; GUARDIAN ATTORNEY ATTESTATIONS</div>
  <p style="font-size:.76rem;font-style:italic;margin-bottom:.75rem;">I have compiled the accompanying Verified Initial Inventory of assets and liabilities arising from cash transactions, current market valuation, and current estimated market valuation of the guardianship of ${ward}. This compilation is limited to presenting information in the form of a Verified Initial Inventory and is the representation of the Guardian. I have not audited or reviewed the accompanying Verified Initial Inventory and, accordingly, do not express an opinion or any other form of assurance on it.</p>
  <p style="font-size:.76rem;color:var(--danger-text);font-weight:700;margin-bottom:.75rem;">If you are the Guardian, Co-Guardian, or Guardian Attorney — DO NOT SIGN HERE.</p>
  <div class="doc-signature-block mb-4">
    <div class="row"><div class="col-6"><div class="doc-field-label">Preparer's Signature</div><div class="doc-signature-line"></div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(pr.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Preparer's Name</div><div class="doc-signature-line">${esc(pr.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">SSN / EIN</div><div class="doc-signature-line">${esc(pr.ssnEin)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(pr.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(pr.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(pr.cityStateZip)}</div></div></div>
  </div>
  <div class="doc-schedule-title">GUARDIAN ATTORNEY SIGNATURE</div>
  <p style="font-size:.76rem;font-style:italic;margin-bottom:.6rem;">The undersigned Attorney hereby notifies the Court of the filing of the Verified Initial Inventory as of ${fmtDate(at.filingDate)}, ${county} County, Florida. This Verified Initial Inventory is the representation of the Guardian. The undersigned Attorney represents that he/she has examined the contents of the Inventory and that it conforms to the requirements of the Florida Guardianship Law.</p>
  <div class="doc-signature-block">
    <div class="row"><div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(at.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(at.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(at.barNumber)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(at.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(at.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(at.cityStateZip)}</div></div></div>
  </div>
  </div>`;

  // D-3, D-4 & Part VI – Audit Fee, Safe Deposit Box, Bond Calculation & Certificate of
  // Service (combined onto one page — each was previously forced onto its own near-empty page)
  const sa=d.serviceAttorney;
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Audit Fee, Bond &amp; Service','4')}
  <div class="doc-schedule-title">AUDIT FEE SCHEDULE</div>
  <div class="doc-table-div mb-3">
    ${tdR('Initial Verified Inventory Property Value in Excess of $25,000','$85.00')}
    ${tdR('Initial Verified Inventory Property Value at or below $25,000','$0.00')}
    <div class="tr total-row"><div class="td">Applicable Audit Fee (total inventory: ${fmt(c.total())})</div><div class="td right">${fmt(c.auditFee())}</div></div>
  </div>
  <div class="doc-schedule-title">SAFE DEPOSIT BOX</div>
  <div class="doc-table-div mb-3" style="font-size:.76rem;">
    ${td('Does the ward have a safe deposit box?',d.hasSafeDepositBox?'Yes':'No')}
    ${d.hasSafeDepositBox?td('SDB Inventory Filed?',d.safeDepositBoxFiled?'Yes':'No'):''}
  </div>
  <div class="doc-schedule-title">SURETY BOND REQUIREMENT — Bond Calculation</div>
  <div class="doc-table-div mb-3">
    ${tdR('Schedule B-1 — Cash Assets in RESTRICTED Depository',fmt(c.restrictedCash()))}
    ${tdR('Schedule B-3 — Intangible Assets RESTRICTED',fmt(c.restrictedIntang()))}
    ${tdR('Schedule B-1 — Cash Assets NOT in a Restricted Depository',fmt(c.unrestrictedCash()))}
    ${tdR('Schedule B-2 — Personal Property Assets',fmt(c.totalB2()))}
    ${tdR('Schedule B-3 — Intangible Assets NOT RESTRICTED',fmt(c.unrestrictedIntang()))}
    <div class="tr total-row"><div class="td">Total for BOND REQUIREMENT</div><div class="td right">${fmt(c.bondRequired())}</div></div>
  </div>
  <div class="doc-schedule-title">SURETY BOND DETAILS</div>
  <div class="doc-table-div mb-3" style="font-size:.76rem;">
    ${td('Bond Amount',esc(d.bondAmount))}
    ${td('Bond Period','From: '+fmtDate(d.bondPeriodFrom)+'&nbsp;&nbsp;To: '+fmtDate(d.bondPeriodTo))}
    ${td('Name of Bonding Company',esc(d.bondingCompany))}
    ${d.bondWaivedDate?td('Bond Waived — Order Date',esc(d.bondWaivedDate)):''}
  </div>
  </div>`;

  // Part VI on its own page. It used to sit on the end of the Audit Fee page,
  // where a filled-in bond section pushed the attorney signature past the foot
  // of the sheet: the filing then ended on a continuation page, which gets
  // neither the court header nor the half-inch margin, and read as cut off.
  html+=`<div class="schedule-page doc-page">${docHeader(ward,caseNo,'Certificate of Service','5')}
  <div class="doc-schedule-title">Part VI — GUARDIAN ATTORNEY — CERTIFICATE OF SERVICE</div>
  <p style="font-size:.78rem;margin-bottom:1rem;">Pursuant to Florida Statute 744.362(1), I hereby certify that a copy of this inventory has been furnished to:</p>
  <div class="row mb-3">
    ${d.serviceRecipients.map((r,i)=>`<div class="col-6 mb-2"><div class="doc-field-label">Name and Address of Recipient ${i+1}</div><div class="doc-signature-line">${esc(r.name)}</div><div class="doc-signature-line">${esc(r.address)}</div><div class="doc-signature-line">${esc(r.cityStateZip)}</div></div>`).join('')}
  </div>
  <p style="font-size:.78rem;">on this date: ${fmtDate(d.serviceDate)}</p>
  <div class="doc-signature-block">
    <div class="row"><div class="col-6"><div class="doc-field-label">Attorney Signature &nbsp;/s/</div><div class="doc-signature-line"></div></div><div class="col-3"><div class="doc-field-label">Date</div><div class="doc-signature-line">${fmtDate(sa.signatureDate)}</div></div><div class="col-3"><div class="doc-field-label">Attorney's Name</div><div class="doc-signature-line">${esc(sa.name)}</div></div></div>
    <div class="row mt-2"><div class="col-4"><div class="doc-field-label">Bar Number</div><div class="doc-signature-line">${esc(sa.barNumber)}</div></div><div class="col-4"><div class="doc-field-label">Phone</div><div class="doc-signature-line">${esc(sa.phone)}</div></div><div class="col-4"><div class="doc-field-label">Street Address</div><div class="doc-signature-line">${esc(sa.streetAddress)}</div></div></div>
    <div class="row mt-2"><div class="col-6"><div class="doc-field-label">City / State / Zip</div><div class="doc-signature-line">${esc(sa.cityStateZip)}</div></div></div>
    <p class="mt-3" style="font-size:.76rem;text-align:center;font-weight:700;">(End of Verified Initial Inventory)</p>
  </div>
  </div>`;

  return html;
}

function pagePrint(){
  const errors=validate();
  highlightErrors(errors);
  const errPanel=errors.length?validationPanel(errors):'';
  const canExport=errors.length===0;
  // Excel-only limit — the PDF path renders every entry, so overflow must
  // not disable PDF along with it.
  const capOver=checkExcelCapacity(GUARDIAN_EXCEL_CAPS);
  const canExportExcel=canExport&&capOver.length===0;
  return `<div>
  <h1 class="visually-hidden">Print Preview</h1>
  <div class="print-preview-banner no-print">
    <span><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> Print Preview — use <strong>Save as PDF</strong> or <strong>Save as Excel</strong>, or <strong>Print</strong>.</span>
    <div class="d-flex gap-2 align-items-center flex-wrap">
      <span id="export-status" style="font-size:.8rem;color:var(--ink-3);"></span>
      <button class="btn btn-outline-primary btn-sm" onclick="doSavePdf()" ${canExport?'':'disabled'}><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6.4 3.4h7l4.2 4.2v13H6.4Z"/><path d="M13.2 3.4v4.4h4.4"/><path d="M9.2 12.6h5.6M9.2 16h5.6"/></svg> Save as PDF</button>
      <button class="btn btn-outline-success btn-sm" onclick="doSaveExcel()" ${canExportExcel?'':'disabled'} ${capOver.length?'title="Some schedules have more entries than the Excel template can hold — save as PDF instead"':''}><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Save as Excel</button>
      <button class="btn btn-outline-secondary btn-sm" onclick="pvShowAll();window.print()"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7.2 9.2V3.6h9.6v5.6"/><rect x="4" y="9.2" width="16" height="6.6" rx="1.6"/><path d="M7.2 14.6h9.6v5.8H7.2Z"/></svg> Print</button>
      <button class="btn btn-outline-secondary btn-sm" onclick="openFloridaCourtPortal()" title="Opens the Florida Courts E-Filing Portal in a new tab"><svg class="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14.2 4.4h5.4v5.4"/><path d="m19.6 4.4-8 8"/><path d="M17.4 13.6v6H4.6V6.8h6"/></svg> Florida E-Filing Portal</button>
    </div>
  </div>
  ${errPanel}
  ${capOver.length?excelCapacityPanel(capOver):''}
  <div id="print-doc-container">${buildPrintHTML()}</div>
  ${pageNav('/print')}
  </div>`;
}

// Opens the Florida e-filing portal as a separate window sized and
// positioned to the right half of the screen, and best-effort snaps this
// app's own window to the left half — giving a side-by-side layout without
// embedding the portal in an iframe (their site's own security headers,
// X-Frame-Options: SAMEORIGIN and CSP frame-ancestors 'self', block that
// outright — verified directly against their server, not a guess).
// noopener/noreferrer: the portal window can't reach back into this one via
// window.opener (standard hardening for any window.open to an outside site).
function openFloridaCourtPortal(){
  const availW=screen.availWidth||window.innerWidth||1920;
  const availH=screen.availHeight||window.innerHeight||1080;
  const halfW=Math.floor(availW/2);

  window.open(
    'https://www.myflcourtaccess.com/default.aspx',
    '_blank',
    `left=${availW-halfW},top=0,width=${halfW},height=${availH},noopener,noreferrer`
  );

  // Repositioning THIS window only works in browsers that allow moveTo/
  // resizeTo on a window not opened via script — many block it as a
  // security measure. Wrapped so an unsupported browser just leaves this
  // window where it was, rather than erroring.
  try{
    window.moveTo(0,0);
    window.resizeTo(halfW,availH);
  }catch(e){/* not supported here — user can snap manually (Win+Left) */}
}

// ═══════════════════════════════════════════════════════
// EXPORT: PDF
// ═══════════════════════════════════════════════════════
async function doSavePdf(){
  const errors=validate();
  if(errors.length){renderPage('/print');alert(`Cannot export — ${errors.length} required field${errors.length===1?'':'s'} missing. See the list on this page.`);return;}
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Generating PDF…';
  const stem=(D.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
  const filename=`${stem}_InitialInventory.pdf`;
  const pdfDiv=document.getElementById('print-doc-container');
  if(!pdfDiv){alert('PDF export failed: content not found');return;}
  // Not 'avoid-all' — see the note in doSavePdfAnnual().
  const opt={margin:0,filename,image:{type:'jpeg',quality:.95},html2canvas:{scale:2,useCORS:true,logging:false},jsPDF:{unit:'in',format:'letter',orientation:'portrait'},pagebreak:{mode:['css','legacy'],before:'.schedule-page:not(:first-of-type)'}};
  let ungroup=()=>{};
  try{
    pvShowAll(); // never export a filtered preview
    document.body.classList.add('pdf-export-mode');
    ungroup=groupScheduleBlocksForPdf(pdfDiv);
    await html2pdf().set(opt).from(pdfDiv).save();
  }catch(e){
    console.error('PDF export failed',e);
    alert('PDF export failed: '+e.message);
  }finally{
    ungroup();
    document.body.classList.remove('pdf-export-mode');
    if(stat)stat.textContent='';
  }
}

// ═══════════════════════════════════════════════════════
// EXPORT: EXCEL
// ═══════════════════════════════════════════════════════
async function doSaveExcel(){
  const errors=validate();
  if(errors.length){renderPage('/print');return;}
  // Without this the overflow surfaces as a raw TypeError in the status
  // line below, which then clears itself after three seconds.
  const capOver=checkExcelCapacity(GUARDIAN_EXCEL_CAPS);
  if(capOver.length){
    alert('Cannot export to Excel — these schedules have more entries than the court\'s Excel template can hold:\n\n'
      +capOver.map(o=>`• ${o.label}: ${o.count} entries (template holds ${o.cap})`).join('\n')
      +'\n\nSave as PDF instead — the PDF includes every entry.');
    renderPage('/print');
    return;
  }
  const stat=document.getElementById('export-status');
  if(stat)stat.textContent='Preparing Excel export…';
  try{
    const inv=window.D;
    const templateB64=await ensureTemplate('guardian');
    if(!templateB64){alert('Template not loaded. Please import the Excel template first.');return;}
    
    const fmtD=s=>(s&&String(s).length>=10)?String(s).substring(0,10):(s||'');
    const yesNo=b=>b?'Yes':'No';
    const setCell=(sheet,addr,v)=>{const c=sheet.getCell(addr);if(v==null||v===''){c.value=null;}else if(typeof v==='number'){c.value=v;}else{c.value=sanitizeForExcel(String(v));}};
    
    if(stat)stat.textContent='Loading template…';
    const bin=atob(templateB64);
    const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);

    const workbook=new ExcelJS.Workbook();
    await workbook.xlsx.load(buf.buffer);

    const si=workbook.getWorksheet('SUMMARY I ');
    if(si){
      setCell(si,'C7',inv.wardName||'');
      setCell(si,'H7',inv.caseNumber||'');
      setCell(si,'F7',fmtD(inv.gid));
      setCell(si,'G3',inv.county||'');
      setCell(si,'D23',inv.guardianName||'');
      setCell(si,'D24',inv.attorneyForGuardian||'');
      setCell(si,'D25',inv.typeOfGuardianship||'');
      setCell(si,'D26',yesNo(inv.hasSafeDepositBox));
      setCell(si,'H26',yesNo(inv.safeDepositBoxFiled));
      setCell(si,'I8',yesNo(inv.isAmended));
    }
    
    const fillScheduleA1=(entries)=>{
      const sheet=workbook.getWorksheet('A-1-REAL ESTATE pg 1');
      if(!sheet)return;
      let idx=0;
      for(const e of entries||[]){
        const pages=[{name:'A-1-REAL ESTATE pg 1',rows:[27,32,37,42]},{name:'A-1-REAL ESTATE pg 2',rows:[7,12,17,22,27,32,37,42]},{name:'A-1-REAL ESTATE pg 3',rows:[7,12,17,22,27,32,37,42]}];
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.propertyDescription||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`C${r+3}`,e.notes||'');
        setCell(pg,`E${r}`,yesNo(e.isPersonalResidence));
        setCell(pg,`F${r}`,yesNo(e.isIncomeProperty));
        setCell(pg,`G${r}`,e.fullAssetValue||'');
        setCell(pg,`H${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleA2=(entries)=>{
      const pages=[{name:'A-2-REAL ESTATE MTG pg 1 ',rows:[30,35,40,45,50]},{name:'A-2-REAL ESTATE MTG pg 2',rows:[7,12,17,22,27,32,37,42,47]},{name:'A-2-REAL ESTATE MTG pg 3',rows:[7,12,17,22,27,32,37,42,47,52]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.lenderName||'');
        setCell(pg,`C${r+1}`,e.lenderAddress||'');
        setCell(pg,`C${r+2}`,e.lenderCityStateZip||'');
        setCell(pg,`C${r+3}`,e.accountNumber||'');
        setCell(pg,`E${r}`,e.liabilityType||'Mortgage');
        setCell(pg,`F${r}`,e.fullDebtBalance||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleB1=(entries)=>{
      const pages=[{name:'B-1 CASH pg 1',rows:[25,30,35,40,45,50]},{name:'B-1 CASH pg 2',rows:[7,12,17,22,27,32,37,42,47,52]},{name:'B-1 CASH pg 3',rows:[7,12,17,22,27,32,37,42,47,52]},{name:'B-1 CASH pg 4',rows:[7,12,17,22,27,32,37,42,47,52]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.institutionName||'');
        setCell(pg,`C${r+1}`,e.accountNumber||'');
        setCell(pg,`C${r+2}`,e.streetAddress||'');
        setCell(pg,`C${r+3}`,e.cityStateZip||'');
        setCell(pg,`E${r}`,yesNo(e.isRestricted));
        setCell(pg,`F${r}`,e.accountType||'');
        setCell(pg,`G${r}`,e.fullAssetAmount||'');
        setCell(pg,`H${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleB2=(entries)=>{
      const pages=[{name:'B-2 PER PROP pg 1',rows:[33,38,43,48,53,58]},{name:'B-2 PER PROP pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]},{name:'B-2 PER PROP pg 3',rows:[7,12,17,22,27,32,37,42,47,52,57]},{name:'B-2 PER PROP pg 4',rows:[7,12,17,22,27,32,37,42,47,52,57]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.description||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`C${r+3}`,e.valuationMethod||'');
        setCell(pg,`E${r}`,e.fullAssetValue||'');
        setCell(pg,`F${r}`,e.wardPercent||'');
        setCell(pg,`H${r}`,yesNo(e.inSafeDepositBox));
        idx++;
      }
    };
    
    const fillScheduleB3=(entries)=>{
      const pages=[{name:'B-3 INTANGIBLE pg 1;',rows:[22,27,32,37,42,47,52,57,62]},{name:'B-3 INTANGIBLE pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.description||'');
        setCell(pg,`C${r+1}`,e.streetAddress||'');
        setCell(pg,`C${r+2}`,e.cityStateZip||'');
        setCell(pg,`E${r}`,yesNo(e.isRestricted));
        setCell(pg,`F${r}`,e.fullAssetValue||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        setCell(pg,`J${r}`,yesNo(e.inSafeDepositBox));
        idx++;
      }
    };
    
    const fillScheduleB4=(entries)=>{
      const pages=[{name:'B-4 PERS PROP LIAB pg 1',rows:[23,28,33,38,43,48]},{name:'B-4 PERS PROP LIAB pg 2',rows:[8,13,18,23,28,33,38,43,48]},{name:'B-4 PERS PROP LIAB pg 3',rows:[8,13,18,23,28,33,38,43,48]},{name:'B-4 PERS PROP LIAB pg 4',rows:[8,13,18,23,28,33,38,43,48]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.lenderName||'');
        setCell(pg,`C${r+1}`,e.lenderAddress||'');
        setCell(pg,`C${r+2}`,e.relatedProperty||'');
        setCell(pg,`C${r+3}`,e.accountNumber||'');
        setCell(pg,`E${r}`,e.liabilityType||'Loan');
        setCell(pg,`F${r}`,e.fullLiabilityBalance||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleC1=(entries)=>{
      const pages=[{name:'C-1 INCOME pg 1',rows:[29,34,39,44,49]},{name:'C-1 INCOME pg 2',rows:[7,12,17,22,27,32,37,42,47]},{name:'C-1 INCOME pg 3',rows:[7,12,17,22,27,32,37,42,47]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.payerName||'');
        setCell(pg,`C${r+1}`,e.payerAddress||'');
        setCell(pg,`C${r+2}`,e.payerCityStateZip||'');
        setCell(pg,`E${r}`,e.typeOfIncome||'');
        setCell(pg,`G${r}`,e.frequencyOfPayment||'Monthly');
        setCell(pg,`E${r+2}`,e.paymentBasis||'');
        setCell(pg,`H${r}`,e.annualIncomeAmount||'');
        setCell(pg,`I${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleC2=(entries)=>{
      const pages=[{name:'C-2 LAWSUIT AGAINST 1',rows:[19,24,29,34,39,44]},{name:'C-2 LAWSUIT AGAINST pg 2',rows:[7,12,17,22,27,32,37]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        const desc=`${e.lawsuitDescription||''}${e.caseNumber?' / '+e.caseNumber:''}`;
        setCell(pg,`C${r}`,desc);
        setCell(pg,`C${r+1}`,e.courtJurisdiction||'');
        setCell(pg,`C${r+2}`,e.claimantName||'');
        setCell(pg,`C${r+3}`,e.claimantAddress||'');
        setCell(pg,`E${r}`,fmtD(e.dateFiled));
        setCell(pg,`F${r}`,e.amountOfClaim||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleC3=(entries)=>{
      const pages=[{name:'C-3 LAWSUIT BY WARD pg 1',rows:[20,25,30,35,40,45]},{name:'C-3 LAWSUIT BY WARD pg 2',rows:[7,12,17,22,27,32,37,42]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        const desc=`${e.actionDescription||''}${e.caseNumber?' / '+e.caseNumber:''}`;
        setCell(pg,`B${r}`,e.defendantName||'');
        setCell(pg,`C${r}`,desc);
        setCell(pg,`C${r+1}`,e.status||'');
        setCell(pg,`C${r+2}`,e.courtJurisdiction||'');
        setCell(pg,`E${r}`,fmtD(e.actionDate));
        setCell(pg,`F${r}`,e.estimatedSettlement||'');
        setCell(pg,`G${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleC4=(entries)=>{
      const pages=[{name:'C-4 TRUSTS pg 1',rows:[23,28,33,38,43,48,53]},{name:'C-4 TRUSTS pg 2',rows:[7,12,17,22,27,32,37,42,47]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.trustName||'');
        setCell(pg,`C${r+1}`,e.trusteeName||'');
        setCell(pg,`C${r+2}`,e.trusteeAddress||'');
        setCell(pg,`C${r+3}`,e.trusteeCityStateZip||'');
        setCell(pg,`E${r}`,fmtD(e.dateCreated));
        setCell(pg,`F${r}`,e.accountNumber||'');
        setCell(pg,`H${r}`,e.trustType||'Pooled');
        setCell(pg,`I${r}`,e.trustAmount||'');
        setCell(pg,`J${r}`,e.wardPercent||'');
        idx++;
      }
    };
    
    const fillScheduleC5=(entries)=>{
      const pages=[{name:'C-5 JOINT OWNERS pg 1 ',rows:[19,24,29,34,39,44,49]},{name:'C-5 JOINT OWNERS pg 2',rows:[7,12,17,22,27,32,37,42]}];
      let idx=0;
      for(const e of entries||[]){
        let pageIdx=0,rowIdxInPage=0;
        for(let i=0;i<=idx;i++){if(i>0&&pages[pageIdx].rows.length===rowIdxInPage){pageIdx++;rowIdxInPage=0;}if(i===idx)break;rowIdxInPage++;}
        const pg=workbook.getWorksheet(pages[pageIdx].name);
        if(!pg)continue;
        const r=pages[pageIdx].rows[rowIdxInPage];
        setCell(pg,`C${r}`,e.assetDescription||'');
        setCell(pg,`C${r+1}`,e.ownerAddress||'');
        setCell(pg,`C${r+2}`,e.ownerName||'');
        setCell(pg,`C${r+3}`,e.ownerCityStateZip||'');
        setCell(pg,`E${r}`,e.relationshipToWard||'');
        setCell(pg,`F${r}`,e.totalAssetValue||'');
        setCell(pg,`G${r}`,e.jointOwnerPercent||'');
        idx++;
      }
    };
    
    fillScheduleA1(inv.scheduleA1);
    fillScheduleA2(inv.scheduleA2);
    fillScheduleB1(inv.scheduleB1);
    fillScheduleB2(inv.scheduleB2);
    fillScheduleB3(inv.scheduleB3);
    fillScheduleB4(inv.scheduleB4);
    fillScheduleC1(inv.scheduleC1);
    fillScheduleC2(inv.scheduleC2);
    fillScheduleC3(inv.scheduleC3);
    fillScheduleC4(inv.scheduleC4);
    fillScheduleC5(inv.scheduleC5);
    
    const p3=workbook.getWorksheet('PART III');
    if(p3&&inv.guardians.length){
      for(let i=0;i<Math.min(inv.guardians.length,3);i++){
        const b=7+i*6;
        const g=inv.guardians[i];
        setCell(p3,`D${b}`,fmtD(g.signatureDate));
        setCell(p3,`F${b+1}`,g.name||'');
        setCell(p3,`B${b+2}`,g.ssnEin||'');
        setCell(p3,`F${b+2}`,g.streetAddress||'');
        setCell(p3,`B${b+4}`,g.phone||'');
        setCell(p3,`F${b+4}`,g.cityStateZip||'');
      }
    }
    
    const p4=workbook.getWorksheet('PART IV');
    if(p4){
      setCell(p4,'G12',fmtD(inv.preparer.signatureDate));
      setCell(p4,'I12',inv.preparer.name||'');
      setCell(p4,'B14',inv.preparer.ssnEin||'');
      setCell(p4,'I14',inv.preparer.streetAddress||'');
      setCell(p4,'B16',inv.preparer.phone||'');
      setCell(p4,'I16',inv.preparer.cityStateZip||'');
      setCell(p4,'G25',fmtD(inv.attorney.signatureDate));
      setCell(p4,'G26',fmtD(inv.attorney.filingDate));
      setCell(p4,'I25',inv.attorney.name||'');
      setCell(p4,'B27',inv.attorney.barNumber||'');
      setCell(p4,'I27',inv.attorney.streetAddress||'');
      setCell(p4,'B29',inv.attorney.phone||'');
      setCell(p4,'I29',inv.attorney.cityStateZip||'');
    }
    
    const p5=workbook.getWorksheet('PART V');
    if(p5){
      setCell(p5,'B26',inv.bondAmount||'');
      setCell(p5,'D27',fmtD(inv.bondPeriodFrom));
      setCell(p5,'F27',fmtD(inv.bondPeriodTo));
      setCell(p5,'D28',inv.bondingCompany||'');
      setCell(p5,'G15',inv.bondWaivedDate||'');
    }
    
    const p6=workbook.getWorksheet('PART VI');
    if(p6&&inv.serviceRecipients.length){
      const recs=inv.serviceRecipients;
      if(recs[0]){setCell(p6,'B13',recs[0].name||'');setCell(p6,'B14',recs[0].address||'');setCell(p6,'B15',recs[0].cityStateZip||'');}
      if(recs[1]){setCell(p6,'H13',recs[1].name||'');setCell(p6,'H14',recs[1].address||'');setCell(p6,'H15',recs[1].cityStateZip||'');}
      if(recs[2]){setCell(p6,'B19',recs[2].name||'');setCell(p6,'B20',recs[2].address||'');setCell(p6,'B21',recs[2].cityStateZip||'');}
      if(recs[3]){setCell(p6,'H19',recs[3].name||'');setCell(p6,'H20',recs[3].address||'');setCell(p6,'H21',recs[3].cityStateZip||'');}
      setCell(p6,'G24',fmtD(inv.serviceDate));
      setCell(p6,'G26',fmtD(inv.serviceAttorney.signatureDate));
      setCell(p6,'J27',inv.serviceAttorney.name||'');
      setCell(p6,'J29',inv.serviceAttorney.barNumber||'');
      setCell(p6,'J28',inv.serviceAttorney.streetAddress||'');
      setCell(p6,'B30',inv.serviceAttorney.phone||'');
      setCell(p6,'J30',inv.serviceAttorney.cityStateZip||'');
    }
    
    if(stat)stat.textContent='Writing file…';
    const stem=(inv.wardName||'GuardianInventory').trim().replace(/\s+/g,'_');
    try{workbook.definedNames.model=[];}catch(e){}
    const xlsx=await workbook.xlsx.writeBuffer();
    const blob=new Blob([xlsx],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`${stem}_InitialInventory.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(stat)stat.textContent='✓ Exported!';
  }catch(e){
    console.error(e);
    if(stat)stat.textContent='❌ '+e.message;
  }finally{
    setTimeout(()=>{if(stat)stat.textContent='';},3000);
  }
}

// ═══════════════════════════════════════════════════════
// IMPORT: EXCEL
// ═══════════════════════════════════════════════════════
async function importExcelFile(input){
  const file=input.files[0];
  if(!file)return;
  const prog=getImportProgressEl(input);
  try{
    if(prog)prog.textContent='Checking file…';
    const check=await validateImportFile(file,'xlsx');
    if(!check.ok){if(prog)prog.textContent='✗ '+check.message;return;}
    if(prog)prog.textContent='Reading file…';
    const buf=await file.arrayBuffer();
    const workbook=new ExcelJS.Workbook();
    if(prog)prog.textContent='Parsing Excel…';
    await workbook.xlsx.load(buf);
    assertWorkbookWithinLimits(workbook);
    // No template cache write here — see the note above ensureTemplate():
    // an imported file is never retained past this parse, so the app's own
    // bundled blank template is what every later "Export as Excel" uses.
    const importedData=sanitizeObjectData(parseInitialInventoryWorkbook(workbook));
    Object.assign(window.D,importedData);
    saveData();
    if(prog)prog.textContent='✓ Import complete!';
    setTimeout(()=>{if(prog)prog.textContent='';},3000);
    navigate('/');
  }catch(e){
    console.error('Initial Inventory import failed:',e);
    if(prog)prog.textContent='✗ Import failed: '+(e&&e.message?e.message:'the file could not be parsed.');
  }finally{
    input.value='';
  }
}
// Extracts the Initial Inventory fields from an already-loaded workbook.
// Takes the ExcelJS.Workbook directly (not a base64 string) — the previous
// version round-tripped the whole file through base64 solely to hand it to
// this function and to cache it via saveTemplate; neither is done
// anymore (see importExcelFile above), so there is no longer a buffer to
// smuggle across, and the raw workbook bytes are not retained past this call.
function parseInitialInventoryWorkbook(wb){
  const ws=name=>wb.getWorksheet(name);
  const rawv=(sheet,addr)=>sheet?unwrapCellValue(sheet.getCell(addr).value):null;
  const txt=(s,a)=>s?readCellText(s.getCell(a)):'';
  const num=(s,a)=>Number(rawv(s,a))||0;
  const dt=(s,a)=>{const v=rawv(s,a);if(!v)return null;if(v instanceof Date)return v.toISOString().substring(0,10);if(typeof v==='number'){const d=new Date((v-25569)*86400*1000);return d.toISOString().substring(0,10);}return typeof v==='string'?v.substring(0,10):null;};
  const bool=(s,a)=>txt(s,a).toLowerCase()==='yes';
  const pct=(s,a)=>Math.round(num(s,a)*100*1e6)/1e6;
  const readRows=(pages,reader)=>{const out=[];for(const{sheet:name,rows}of pages){const s=ws(name);if(!s)continue;for(const r of rows){const e=reader(s,r);if(e)out.push(e);}}return out;};
  const si=ws('SUMMARY I ');
  const inv={
    wardName:txt(si,'C7'),caseNumber:txt(si,'H7'),gid:dt(si,'F7'),county:txt(si,'G3'),
    guardianName:txt(si,'D23'),attorneyForGuardian:txt(si,'D24'),typeOfGuardianship:txt(si,'D25'),
    hasSafeDepositBox:bool(si,'D26'),safeDepositBoxFiled:bool(si,'H26'),isAmended:bool(si,'I8'),
    scheduleA1:readRows([{sheet:'A-1-REAL ESTATE pg 1',rows:[27,32,37,42]},{sheet:'A-1-REAL ESTATE pg 2',rows:[7,12,17,22,27,32,37,42]},{sheet:'A-1-REAL ESTATE pg 3',rows:[7,12,17,22,27,32,37,42]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`G${r}`);if(!desc&&!val)return null;return{propertyDescription:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),notes:txt(s,`C${r+3}`),isPersonalResidence:bool(s,`E${r}`),isIncomeProperty:bool(s,`F${r}`),fullAssetValue:val,wardPercent:pct(s,`H${r}`)}}),
    scheduleA2:readRows([{sheet:'A-2-REAL ESTATE MTG pg 1 ',rows:[30,35,40,45,50]},{sheet:'A-2-REAL ESTATE MTG pg 2',rows:[7,12,17,22,27,32,37,42,47]},{sheet:'A-2-REAL ESTATE MTG pg 3',rows:[7,12,17,22,27,32,37,42,47,52]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`F${r}`);if(!name&&!val)return null;return{lenderName:name,lenderAddress:txt(s,`C${r+1}`),lenderCityStateZip:txt(s,`C${r+2}`),accountNumber:txt(s,`C${r+3}`),notes:'',liabilityType:txt(s,`E${r}`)||'Mortgage',fullDebtBalance:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleB1:readRows([{sheet:'B-1 CASH pg 1',rows:[25,30,35,40,45,50]},{sheet:'B-1 CASH pg 2',rows:[7,12,17,22,27,32,37,42,47,52]},{sheet:'B-1 CASH pg 3',rows:[7,12,17,22,27,32,37,42,47,52]},{sheet:'B-1 CASH pg 4',rows:[7,12,17,22,27,32,37,42,47,52]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`G${r}`);if(!name&&!val)return null;return{institutionName:name,accountNumber:txt(s,`C${r+1}`),streetAddress:txt(s,`C${r+2}`),cityStateZip:txt(s,`C${r+3}`),isRestricted:bool(s,`E${r}`),accountType:txt(s,`F${r}`),fullAssetAmount:val,wardPercent:pct(s,`H${r}`)}}),
    scheduleB2:readRows([{sheet:'B-2 PER PROP pg 1',rows:[33,38,43,48,53,58]},{sheet:'B-2 PER PROP pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]},{sheet:'B-2 PER PROP pg 3',rows:[7,12,17,22,27,32,37,42,47,52,57]},{sheet:'B-2 PER PROP pg 4',rows:[7,12,17,22,27,32,37,42,47,52,57]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`E${r}`);if(!desc&&!val)return null;return{description:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),valuationMethod:txt(s,`C${r+3}`),fullAssetValue:val,wardPercent:pct(s,`F${r}`),inSafeDepositBox:bool(s,`H${r}`),amountInSDB:0}}),
    scheduleB3:readRows([{sheet:'B-3 INTANGIBLE pg 1;',rows:[22,27,32,37,42,47,52,57,62]},{sheet:'B-3 INTANGIBLE pg 2',rows:[7,12,17,22,27,32,37,42,47,52,57]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;return{description:desc,streetAddress:txt(s,`C${r+1}`),cityStateZip:txt(s,`C${r+2}`),isRestricted:bool(s,`E${r}`),fullAssetValue:val,wardPercent:pct(s,`G${r}`),inSafeDepositBox:bool(s,`J${r}`),amountInSDB:0}}),
    scheduleB4:readRows([{sheet:'B-4 PERS PROP LIAB pg 1',rows:[23,28,33,38,43,48]},{sheet:'B-4 PERS PROP LIAB pg 2',rows:[8,13,18,23,28,33,38,43,48]},{sheet:'B-4 PERS PROP LIAB pg 3',rows:[8,13,18,23,28,33,38,43,48]},{sheet:'B-4 PERS PROP LIAB pg 4',rows:[8,13,18,23,28,33,38,43,48]}],(s,r)=>{const name=txt(s,`C${r}`).trim(),val=num(s,`F${r}`);if(!name||val<=0)return null;return{lenderName:name,lenderAddress:txt(s,`C${r+1}`),relatedProperty:txt(s,`C${r+2}`),accountNumber:txt(s,`C${r+3}`),liabilityType:txt(s,`E${r}`)||'Loan',fullLiabilityBalance:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC1:readRows([{sheet:'C-1 INCOME pg 1',rows:[29,34,39,44,49]},{sheet:'C-1 INCOME pg 2',rows:[7,12,17,22,27,32,37,42,47]},{sheet:'C-1 INCOME pg 3',rows:[7,12,17,22,27,32,37,42,47]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`H${r}`);if(!name&&!val)return null;return{payerName:name,payerAddress:txt(s,`C${r+1}`),payerCityStateZip:txt(s,`C${r+2}`),typeOfIncome:txt(s,`E${r}`),frequencyOfPayment:txt(s,`G${r}`)||'Monthly',paymentBasis:txt(s,`E${r+2}`),annualIncomeAmount:val,wardPercent:pct(s,`I${r}`)}}),
    scheduleC2:readRows([{sheet:'C-2 LAWSUIT AGAINST 1',rows:[19,24,29,34,39,44]},{sheet:'C-2 LAWSUIT AGAINST pg 2',rows:[7,12,17,22,27,32,37]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;const parts=desc.split(' / ');return{lawsuitDescription:parts[0]||desc,caseNumber:parts[1]||'',courtJurisdiction:txt(s,`C${r+1}`),claimantName:txt(s,`C${r+2}`),claimantAddress:txt(s,`C${r+3}`),dateFiled:dt(s,`E${r}`),amountOfClaim:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC3:readRows([{sheet:'C-3 LAWSUIT BY WARD pg 1',rows:[20,25,30,35,40,45]},{sheet:'C-3 LAWSUIT BY WARD pg 2',rows:[7,12,17,22,27,32,37,42]}],(s,r)=>{const defendantName=txt(s,`B${r}`),desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc)return null;const parts=desc.split(' / ');return{defendantName,actionDescription:parts[0]||desc,caseNumber:parts[1]||'',status:txt(s,`C${r+1}`),courtJurisdiction:txt(s,`C${r+2}`),actionDate:dt(s,`E${r}`),estimatedSettlement:val,wardPercent:pct(s,`G${r}`)}}),
    scheduleC4:readRows([{sheet:'C-4 TRUSTS pg 1',rows:[23,28,33,38,43,48,53]},{sheet:'C-4 TRUSTS pg 2',rows:[7,12,17,22,27,32,37,42,47]}],(s,r)=>{const name=txt(s,`C${r}`),val=num(s,`I${r}`);if(!name&&!val)return null;return{trustName:name,trusteeName:txt(s,`C${r+1}`),trusteeAddress:txt(s,`C${r+2}`),trusteeCityStateZip:txt(s,`C${r+3}`),dateCreated:dt(s,`E${r}`),accountNumber:txt(s,`F${r}`),trustType:txt(s,`H${r}`)||'Pooled',trustAmount:val,wardPercent:pct(s,`J${r}`)}}),
    scheduleC5:readRows([{sheet:'C-5 JOINT OWNERS pg 1 ',rows:[19,24,29,34,39,44,49]},{sheet:'C-5 JOINT OWNERS pg 2',rows:[7,12,17,22,27,32,37,42]}],(s,r)=>{const desc=txt(s,`C${r}`),val=num(s,`F${r}`);if(!desc&&!val)return null;return{assetDescription:desc,ownerAddress:txt(s,`C${r+1}`),ownerName:txt(s,`C${r+2}`),ownerCityStateZip:txt(s,`C${r+3}`),relationshipToWard:txt(s,`E${r}`),totalAssetValue:val,jointOwnerPercent:pct(s,`G${r}`)}}),
    guardians:(()=>{const p3=ws('PART III');const gs=[];for(let i=0;i<3;i++){const b=7+i*6;const name=txt(p3,`F${b+1}`);if(!name&&i>0)continue;gs.push({signatureDate:dt(p3,`D${b}`),name,ssnEin:txt(p3,`B${b+2}`),streetAddress:txt(p3,`F${b+2}`),phone:txt(p3,`B${b+4}`),cityStateZip:txt(p3,`F${b+4}`)});}return gs.length?gs:[mk.guardian()];})(),
    preparer:(()=>{const p4=ws('PART IV');return{signatureDate:dt(p4,'G12'),name:txt(p4,'I12'),ssnEin:txt(p4,'B14'),streetAddress:txt(p4,'I14'),phone:txt(p4,'B16'),cityStateZip:txt(p4,'I16')};})(),
    attorney:(()=>{const p4=ws('PART IV');return{signatureDate:dt(p4,'G25'),filingDate:dt(p4,'G26'),name:txt(p4,'I25'),barNumber:txt(p4,'B27'),streetAddress:txt(p4,'I27'),phone:txt(p4,'B29'),cityStateZip:txt(p4,'I29')};})(),
    bondAmount:txt(ws('PART V'),'B26'),bondPeriodFrom:dt(ws('PART V'),'D27'),bondPeriodTo:dt(ws('PART V'),'F27'),bondingCompany:txt(ws('PART V'),'D28'),bondWaivedDate:txt(ws('PART V'),'G15'),
    serviceRecipients:(()=>{const p6=ws('PART VI');const all=[{name:txt(p6,'B13'),address:txt(p6,'B14'),cityStateZip:txt(p6,'B15')},{name:txt(p6,'H13'),address:txt(p6,'H14'),cityStateZip:txt(p6,'H15')},{name:txt(p6,'B19'),address:txt(p6,'B20'),cityStateZip:txt(p6,'B21')},{name:txt(p6,'H19'),address:txt(p6,'H20'),cityStateZip:txt(p6,'H21')}];const filtered=all.filter(r=>r.name||r.address||r.cityStateZip);return filtered.length>0?filtered:[mk.recipient()];})(),
    serviceDate:dt(ws('PART VI'),'G24'),
    serviceAttorney:(()=>{const p6=ws('PART VI');return{signatureDate:dt(p6,'G26'),name:txt(p6,'J27'),barNumber:txt(p6,'J29'),streetAddress:txt(p6,'J28'),phone:txt(p6,'B30'),cityStateZip:txt(p6,'J30')};})()
  };
  capitalizeImportedFields(inv);
  return inv;
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>navigate(btn.dataset.page));
});

// Hash-based routing
// Page routes for current wizard (dynamically set based on activeInventoryType)
const PAGES_SIMPLIFIED=[
  {id:'/',     label:'Cover & Part I'},
  {id:'/p2',   label:'Part II'},
  {id:'/p3',   label:'Part III'},
  {id:'/p4',   label:'Part IV'},
  {id:'/p5',   label:'Part V'},
  {id:'/p6',   label:'Part VI'},
  {id:'/p7',   label:'Part VII'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_ANNUAL=[
  {id:'/',     label:'Part I'},
  {id:'/p2',   label:'Part II'},
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
const PAGES_PLAN_SIMPLIFIED=[
  {id:'/',     label:'Cover'},
  {id:'/p2',   label:'The Plan'},
  {id:'/p3',   label:'Signatures'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_ANNUAL=[
  {id:'/',     label:'Cover'},
  {id:'/p2',   label:'1. Residences'},
  {id:'/p3',   label:'2–3. Residence & Care'},
  {id:'/p4',   label:'3G. Insurance & Benefits'},
  {id:'/p5',   label:'4. Medical Treatment'},
  {id:'/p6',   label:'5–7. Skills & Rights'},
  {id:'/p7',   label:'8. Daily Living'},
  {id:'/p8',   label:'9. Disabilities & Devices'},
  {id:'/p9',   label:'10. Advance Directives'},
  {id:'/p10',  label:'11. Remuneration'},
  {id:'/p11',  label:'Signatures'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_INITIAL=[
  {id:'/',     label:'Cover'},
  {id:'/p2',   label:'2–3. Setting & Medical Care'},
  {id:'/p3',   label:'4–5. Mental Health & Personal Care'},
  {id:'/p4',   label:'6–7. Socialization & Benefits'},
  {id:'/p5',   label:'9. Examining Providers'},
  {id:'/p6',   label:'10A. Daily Living'},
  {id:'/p7',   label:'10B–D. Disabilities & Devices'},
  {id:'/p8',   label:'11. Advance Directives'},
  {id:'/p9',   label:'Signatures'},
  {id:'/p10',  label:'Attorney Certification'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_MINOR=[
  {id:'/',     label:'Cover'},
  {id:'/p2',   label:'2. Prior Residences'},
  {id:'/p3',   label:'3. Treatment Providers'},
  {id:'/p4',   label:'4. Medical Services'},
  {id:'/p5',   label:'5. Education & Social Development'},
  {id:'/p6',   label:'Guardian Signatures'},
  {id:'/p7',   label:'Preparer & Attorney'},
  {id:'/print',label:'Print Preview'},
];
const PAGES={
  guardian: PAGES_GUARDIAN,
  finalAccounting: PAGES_ANNUAL,
  trustAccounting: PAGES_ANNUAL,
  simplified: PAGES_SIMPLIFIED,
  annual: PAGES_ANNUAL,
  planSimplified: PAGES_PLAN_SIMPLIFIED,
  planAnnual: PAGES_PLAN_ANNUAL,
  planInitial: PAGES_PLAN_INITIAL,
  planMinor: PAGES_PLAN_MINOR,
};

function updateNavActive(page){
  document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
    const isActive=btn.dataset.page===page;
    btn.classList.toggle('active',isActive);
    // aria-current, not aria-selected — these are navigation links to
    // different pages/sections, not tabs or options within one control.
    if(isActive)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
}

const SPECIAL_PAGES=['/dashboard','/inventory-select','/activity-log']; // valid regardless of activeInventoryType
function handleHash(){
  const h=window.location.hash.replace('#','');
  if(SPECIAL_PAGES.includes(h)){
    currentPage=h;
    renderPage(h);
    // renderPage() may have redirected (e.g. /dashboard with no wards yet
    // lands on /inventory-select instead) and updated currentPage itself —
    // reflect wherever it actually landed, not the hash this call started
    // with, or the nav highlight points at a page nothing rendered.
    updateNavActive(currentPage);
    return;
  }
  const wizardPages=PAGES[activeInventoryType]||PAGES_GUARDIAN;
  const valid=wizardPages.map(p=>p.id);
  const page=valid.includes(h)?h:'/';
  currentPage=page;
  renderPage(page);
  updateNavActive(currentPage);
  if(!_appState.walkthroughCompleted&&!_appState.firstLaunchSeen){
    _appState.firstLaunchSeen=true;
    saveAppState('firstLaunchSeen',true);
    _walkthroughAutoTriggered=true;
    setTimeout(startWalkthrough,1000);
  }
}

window.addEventListener('hashchange',handleHash);
window.addEventListener('beforeunload',flushPendingSave);
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushPendingSave();});

// beforeunload cannot reliably await either file or IndexedDB writes. The
// recovery snapshot is best-effort, so retain the native dirty-state warning.
// initApp() arms it only after startup completes.
function warnBeforeUnloadIfDirty(e){
  if(!_dirtySinceExport)return;
  e.preventDefault();
  e.returnValue=''; // required for Chrome to show its native confirmation
}

const TEMPLATE_FILES={
  simplified:'SimplifiedAccounting.xlsx',
  annual:'Annual Accounting 080123.xlsx',
  guardian:'a_InitialInventory (3).xlsx',
};

async function fetchAndCacheTemplate(type,filename){
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
          const b64=e.target.result.split(',')[1];
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

// Loads a template's base64 from the in-memory cache, falling back to
// fetching the bundled .xlsx on demand (e.g. the app-init pre-warm in
// autoLoadTemplates hasn't run yet, or previously failed for this type only).
// Blank templates bundled with the app (see src/templates/*.js). Checked
// before any network fetch so export works with nothing imported first, and
// so it still works when the app is opened straight from disk, where
// fetching a local file is blocked.
function embeddedTemplate(type){
  const t=(window.EMBEDDED_TEMPLATES||{})[type];
  return (typeof t==='string'&&t.length)?t:null;
}

// Imported spreadsheets are parsed and discarded. Only bundled blank
// templates enter the in-memory template cache and subsequent .sav writes.
async function ensureTemplate(type){
  const existing=await loadTemplate(type);
  if(existing)return existing;
  const bundled=embeddedTemplate(type);
  if(bundled){
    // Cache the bundled template so later exports skip the lookup.
    try{await saveTemplate(type,bundled);}catch(e){console.warn('Could not cache bundled template',type,e);}
    return bundled;
  }
  return fetchAndCacheTemplate(type,TEMPLATE_FILES[type]);
}

async function autoLoadTemplates(){
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

async function initApp(){
  // Migrate deprecated stores before current recovery/launch databases are
  // consulted. Resolve recovery or file selection before the unlock flow.
  await runLegacyBrowserStorageMigrationIfNeeded();
  try { await window.tauriInvoke('set_secure_permissions'); } catch (e) { console.warn('Could not set secure permissions:', e); }
  // Offer any unsaved recovery snapshot before the normal Open/Start choice.
  const restoredFromSessionCache=await checkSessionRestoreCacheAtLaunch();
  if(!restoredFromSessionCache)await promptOpenOrStartAtLaunch();
  await ensureUnlocked(); // blocks until a valid master-password key is in memory
  await loadGuardianData();
  await restoreFromFileBackupIfEmpty();
  await autoLoadTemplates();

  const activeWard=getActiveWard();
  if(activeWard){
    window.D=activeWard;
    activeInventoryType=activeWard.inventoryType;
  }

  updateSidebar();
  if(_openedFileAtLaunch)window.location.hash='/dashboard'; // opened an existing case — land on All Wards, not wherever it was last saved mid-edit
  handleHash();
  await loadAutoExportPrefs();
  setupAutoExportTimer();
  setupLastSavedTicker();
  setupFallbackSaveReminder();
  setupDragAndDropImport();
  window.addEventListener('beforeunload',warnBeforeUnloadIfDirty);
}

// Accessibility: Link labels to inputs that have IDs but no for attribute
function linkLabelsToInputs(){
  // First: ensure every input/select/textarea has an id BEFORE trying to
  // link labels to them — otherwise the linking pass below finds a blank
  // .id on fields like dateInput() and silently gives up on that label.
  document.querySelectorAll('input:not([id]), select:not([id]), textarea:not([id])').forEach(inp=>{
    inp.id='auto_'+Math.random().toString(36).slice(2,9);
  });

  // Then: link adjacent labels/inputs in the same parent
  document.querySelectorAll('label:not([for])').forEach(label=>{
    // Try next sibling
    let next=label.nextElementSibling;
    if(next&&(next.tagName==='INPUT'||next.tagName==='SELECT'||next.tagName==='TEXTAREA')&&next.id){
      label.setAttribute('for',next.id);
      return;
    }
    // Try next element after a div wrapper
    if(next&&next.tagName==='DIV'){
      const input=next.querySelector('input, select, textarea');
      if(input&&input.id){
        label.setAttribute('for',input.id);
        return;
      }
    }
    // Try parent div's siblings
    const parent=label.parentElement;
    if(parent){
      const input=parent.querySelector('input, select, textarea');
      if(input&&input.id){
        label.setAttribute('for',input.id);
        return;
      }
    }
  });
}

// Keep paired "From"/"To" date fields consistent: never let From be after To
// or To be before From. Pairs are detected by finding two date inputs that
// share a .row container with labels containing the words "From" and "To"
// (e.g. "Period From" / "Period To", "Bond Period – From" / "– To").
function enforceDateRanges(){
  const rows=new Set();
  document.querySelectorAll('input[type="date"]').forEach(inp=>{
    const row=inp.closest('.row');
    if(row)rows.add(row);
  });
  rows.forEach(row=>{
    const dateInputs=[...row.querySelectorAll('input[type="date"]')];
    const labelText=inp=>{
      const lbl=inp.id&&row.querySelector(`label[for="${inp.id}"]`);
      return lbl?lbl.textContent:'';
    };
    const fromInp=dateInputs.find(i=>/\bfrom\b/i.test(labelText(i)));
    const toInp=dateInputs.find(i=>/\bto\b/i.test(labelText(i)));
    if(!fromInp||!toInp||fromInp===toInp)return;
    wireDateRangePair(fromInp,toInp);
  });
}
// Was also setting min/max attributes on each other (toInp.min =
// fromInp.value, fromInp.max = toInp.value) to block out-of-order entry at
// the browser level. Dropped: a native <input type="date"> with a min/max
// set is the known cause of Chrome refusing straight digit-by-digit typing
// into that field (reported against Part I's Period To, which is exactly
// a paired field here) -- the swap-on-change below already keeps the pair
// sane without ever touching the HTML attribute that was blocking typing.
function wireDateRangePair(fromInp,toInp){
  const fire=el=>{
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
  };
  fromInp.addEventListener('change',()=>{
    if(fromInp.value&&toInp.value&&fromInp.value>toInp.value){
      toInp.value=fromInp.value;
      fire(toInp);
    }
  });
  toInp.addEventListener('change',()=>{
    if(fromInp.value&&toInp.value&&toInp.value<fromInp.value){
      fromInp.value=toInp.value;
      fire(fromInp);
    }
  });
}

// Guards against a native <input type="date"> committing an implausible
// year (e.g. "0002-05-10" left behind by a stray keystroke) -- HTML5 date
// inputs treat any 1-4 digit year as a "complete", non-empty value, so
// nothing else in the app ever sees this as invalid or unanswered. One
// delegated listener on `document`, registered once here rather than per
// input, so it covers every date field regardless of which of the app's
// several wiring conventions that field uses -- catching this everywhere
// without touching each of the ~50 individual date inputs.
// MUST be 'focusout', not 'change': Chrome fires 'change' on a date input
// the instant the year segment LOOKS complete, including every transient
// state while the user is still typing it digit-by-digit (typing "2026"
// passes through "0002", "0020", "0202" first). Hooking 'change' here
// blanked the field mid-keystroke on that transient "0002", which the
// browser's date control then treated as a fresh, empty field and
// restarted segment focus from the month -- so the rest of what the user
// was typing landed in the wrong segments (reported: typing "05102026"
// kept "0510" but the year ended up "0026" with month/day scrambled).
// 'focusout' only fires once the user actually leaves the control -- HTML5
// date inputs keep focus on the whole control while moving between their
// internal month/day/year segments, so this never fires mid-entry, only
// once a real (if implausible) value has actually been committed.
// Bubbles on its own (unlike 'blur'), so no capture flag is needed.
// Re-dispatches 'change' after clearing so bindForms()'s own listener
// (and anything else watching 'change') sees the correction and doesn't
// leave the blanked-out DOM value out of sync with window.D.
document.addEventListener('focusout',e=>{
  const el=e.target;
  if(!el||el.tagName!=='INPUT'||el.type!=='date'||!el.value)return;
  const m=el.value.match(/^(\d{4})-\d{2}-\d{2}$/);
  if(m&&(+m[1]<1900||+m[1]>new Date().getFullYear()+30)){
    el.value='';
    el.dispatchEvent(new Event('change',{bubbles:true}));
  }
});

// Start
setTimeout(()=>{
  linkLabelsToInputs();
},0);
initApp();

if('serviceWorker' in navigator){
  // A cache-first SW means an updated deploy only takes over on the *second*
  // load after the new worker installs. Auto-reload once when control
  // switches over so a single refresh is enough to pick up new files.
  let swRefreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(swRefreshing)return;
    swRefreshing=true;
    window.location.reload();
  });
  window.addEventListener('load',()=>{
    navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Service worker registration failed',e));
  });
}