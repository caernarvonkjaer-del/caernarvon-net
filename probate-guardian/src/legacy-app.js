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
window.INVENTORY_TYPES=INVENTORY_TYPES;

// Ward types that are the Annual Accounting form under a different filing
// name. Kept as their own inventoryType so the dashboard, the ward picker
// and the finished document all say the right thing, but resolved through
// formEngine() wherever behaviour is chosen — pages, nav, empty data,
// totals, validation, export — so they cannot drift from Annual.
const ANNUAL_FORM_ALIASES = ['finalAccounting','trustAccounting'];

// ANNUAL_P67_CELLS moved to src/features/annual-accounting/excel.js
// (Milestone 7, Phase B) -- Annual Excel export is its only consumer.

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
window.guardianData = guardianData;

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
window.PG_APP_VERSION = '1.5.30';

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
window.fmt=fmt;
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
// before ever touching window.D; the extracted Simplified and Annual importers
// write straight onto window.D field-by-field, so this mutates it afterward.
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
  if(!s)return '';
  const raw=String(s).trim();
  const suffixMatch=raw.match(/[-_\s]?([A-Za-z]{1,4})$/);
  const suffix=suffixMatch?suffixMatch[1]:'';
  const withoutSuffix=suffixMatch?raw.slice(0,suffixMatch.index):raw;
  let digits=withoutSuffix.replace(/\D/g,'');
  if(digits.length>=8&&digits.startsWith('20')){
    digits=digits.slice(2);
  }
  digits=digits.slice(0,8);
  if(digits.length<=2){
    return suffix ? `${digits}-${suffix}` : digits;
  }
  const formattedDigits=`${digits.slice(0,2)}-${digits.slice(2)}`;
  return suffix ? `${formattedDigits}-${suffix}` : formattedDigits;
}

// Blur-time finalization: left-pads the sequence to 6 digits and appends
// the fixed "-GD" suffix, so "3-14-GD" from a guardian who typed "3145"
// becomes the properly formed "03-000145-GD". Only a bare year (0-2
// digits, nothing typed for the sequence yet) is left alone -- forcing a
// dangling "03--GD" onto a case number with no sequence at all would be
// worse than just leaving it incomplete for the required-field check to
// catch.
function finalizeCaseNumber(s){
  if(!s)return '';
  const raw=String(s).trim();
  if(!raw)return '';
  const suffixMatch=raw.match(/[-_\s]?([A-Za-z]{2,4})$/);
  const suffix=suffixMatch?suffixMatch[1].toUpperCase():'GD';
  const withoutSuffix=suffixMatch?raw.slice(0,suffixMatch.index):raw;
  let digits=withoutSuffix.replace(/\D/g,'');
  if(!digits)return raw;
  if(digits.length>=8&&digits.startsWith('20')){
    digits=digits.slice(2);
  }
  if(digits.length<=2)return digits;
  const year=digits.slice(0,2);
  const seq=digits.slice(2,8).padStart(6,'0');
  return `${year}-${seq}-${suffix}`;
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
function countyAutocompleteHTML(id,val,path){
  const binding=path?` data-form-path="${esc(path)}" data-annual-path="${esc(path)}"`:'';
  return `<div class="ward-combobox-wrap county-combobox-wrap">
    <input type="text" class="form-control" id="${id}" autocomplete="off" value="${esc(val||'')}"
      data-form-control="county"${binding}>
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
  dd.innerHTML=matches.map(c=>`<button type="button" class="county-combobox-item" data-form-mousedown="select-county" data-input-id="${esc(inp.id)}" data-county="${esc(c)}">${esc(c)}</button>`).join('');
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
      ? `<button type="button" class="validation-go" data-form-action="navigate" data-route="${esc(route)}">Go to section ${ic('external',13)}</button>`
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
  // .pdf-page: Milestone 19-3's canvas+text-layer preview page. .doc-page:
  // the pre-19-3 HTML reconstruction, kept here until Milestone 19-4 deletes
  // buildPrintHTML() and its markup outright.
  return [...cont.children].filter(el=>el.classList&&(el.classList.contains('doc-page')||el.classList.contains('pdf-page')));
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
            data-form-change="preview-page">
      ${opts}
      <option value="all">All pages (continuous)</option>
    </select>
    <span class="pv-count" id="pv-count"></span>
    <span class="pv-nav">
      <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-prev" data-form-action="preview-step" data-step="-1">← Prev</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" id="pv-next" data-form-action="preview-step" data-step="1">Next →</button>
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
// SECURITY: VALIDATION AND AUDIT LOGGING
// ═══════════════════════════════════════════════════════

async function auditLog(eventType, details, success = true, wardId = null) {
  const invoke = tauriInvoke();
  if (invoke) {
    try {
      await invoke('audit_log', {event_type: eventType, details, success, ward_id: wardId});
    } catch (e) {
      console.warn('Tauri audit_log failed, falling back to local log:', e);
    }
  }
  // Record locally in all environments so in-memory _auditLogEntries (used for
  // .sav packaging and in-app activity viewer) is always up-to-date.
  try {
    const entry = {timestamp: new Date().toISOString(), eventType, details, success};
    if (wardId) entry.wardId = wardId;
    await appendAuditLogEntry(entry);
  } catch (e) {
    console.warn('Audit log fallback failed:', e);
  }
}
window.auditLog = auditLog;

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
  if (window.releaseWardLock) await window.releaseWardLock();
  const activeWardIdBefore=guardianData.activeWardId;
  const lockedWardHandle=activeWardIdBefore?await loadWardZipHandle(activeWardIdBefore):null;
  const lockedArchiveHandle=await loadArchiveZipHandle();
  _cryptoKey=null;
  guardianData={guardianName:'',guardianEmail:'',wards:[],activeWardId:null};
  window.guardianData=guardianData;
  window.D={};
  activeInventoryType=null;
  document.getElementById('sidebar').style.display='none';
  document.getElementById('main-content').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink-3);">Locked</div>';
  await ensureUnlocked(true);
  const handleToReload=lockedWardHandle||lockedArchiveHandle;
  if(handleToReload){
    // Rebuild memory from the open .sav file now that the key is available.
    try{
      const handleFile=await handleToReload.getFile();
      const zip=await JSZip.loadAsync(handleFile);
      const manifestEntry=zip.file('manifest.json');
      if(manifestEntry){
        const manifest=JSON.parse(await manifestEntry.async('string'));
        const res=await loadStateFromSavZip(zip,manifest,_cryptoKey);
        if(res&&res.kind==='ward'&&res.wardId){
          await rememberWardZipHandle(res.wardId,handleToReload);
        }else{
          await rememberArchiveZipHandle(handleToReload);
        }
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
    const ok = await activateWard(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
    }
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
  // Tag with the active ward so per-ward files (version 3) can include only
  // their own entries. Entries created before this tagging, or app-level
  // events with no active ward, will have wardId undefined/null and are
  // excluded from per-ward exports (but preserved in version-2 "Export All").
  if(guardianData.activeWardId)entry.wardId=guardianData.activeWardId;
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
  const activeWardId=guardianData.activeWardId;
  let handle=activeWardId?await loadWardZipHandle(activeWardId):null;
  let isArchive=false;
  if(!handle){
    handle=await loadArchiveZipHandle();
    if(handle)isArchive=true;
  }
  if(!handle){
    host.textContent='No case file is open for auto-save this session. Use "Open Data File (.sav)" to resume auto-save, or "Save Backup" to start one.';
    return;
  }
  const fileName=handle.name||(isArchive?'your case file':'your ward file');
  const savedNote=_lastExportAt
    ? `last saved ${formatRelativeTime(_lastExportAt)}`
    : 'not saved yet this session';
  const typeDesc=isArchive?'case archive (all wards)':'ward file';
  host.innerHTML=`${ic('chart',14)} <strong>${esc(fileName)}</strong> (${typeDesc}) — ${_autoSaveArmed?'auto-save is on':'auto-save needs one manual save to re-arm'}, ${esc(savedNote)}.`;
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
      <span class="dashboard-search-wrap activity-log-search-wrap">${ic('search',15)}<input type="text" id="activity-log-search" class="form-control form-control-sm dashboard-search-input" placeholder="Search details…" data-form-input="activity-log"></span>
      <select id="activity-log-status" class="form-select form-select-sm activity-log-select" data-form-change="activity-log">
        <option value="all">All results</option>
        <option value="success">Successful only</option>
        <option value="failed">Failed only</option>
      </select>
      <select id="activity-log-type" class="form-select form-select-sm activity-log-select" data-form-change="activity-log">
        <option value="all">All event types</option>
        ${typeOptions}
      </select>
      <button class="btn btn-sm btn-outline-primary" data-form-action="export-activity-log">${ic('download',14)} Save as text file</button>
    </div>
    <div class="activity-log-count" id="activity-log-count"></div>
    <div id="activity-log-rows" class="activity-log-rows"><div class="dashboard-empty-inline">Loading…</div></div>
  </div>`;
}

async function autoSave(){
  _dirtySinceExport=true;
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
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
  if(!activeWard)return;
  const wardHandle=await loadWardZipHandle(activeWard.wardId);
  if(wardHandle){
    try{
      const perm=await wardHandle.queryPermission({mode:'readwrite'});
      if(perm!=='granted'){
        await refreshAutoSaveArmedStatus();
        return;
      }
      await writeWardToHandle(activeWard.wardId,wardHandle,true);
      _consecutiveSaveFailures=0;
      hideSaveError();
    }catch(e){
      console.error('save failed',e);
      _consecutiveSaveFailures++;
      if(_consecutiveSaveFailures>=SAVE_FAILURE_THRESHOLD)showSaveError();
    }
    return;
  }
  const archiveHandle=await loadArchiveZipHandle();
  if(archiveHandle){
    try{
      const perm=await archiveHandle.queryPermission({mode:'readwrite'});
      if(perm!=='granted'){
        await refreshAutoSaveArmedStatus();
        return;
      }
      await writeArchiveToHandle(archiveHandle,true);
      _consecutiveSaveFailures=0;
      hideSaveError();
    }catch(e){
      console.error('save failed',e);
      _consecutiveSaveFailures++;
      if(_consecutiveSaveFailures>=SAVE_FAILURE_THRESHOLD)showSaveError();
    }
    return;
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

function getProbateGuardianTabState(){
  const activeWard=getActiveWard();
  return {
    hasActiveCase: guardianData.wards.length>0,
    activeCase: activeWard?{
      wardId: activeWard.wardId||'',
      wardName: activeWard.wardName||'',
      caseNumber: activeWard.caseNumber||'',
      inventoryType: activeWard.inventoryType||''
    }:null,
    dirty: _dirtySinceExport,
    appVersion: window.PG_APP_VERSION||''
  };
}
window.getProbateGuardianTabState=getProbateGuardianTabState;
function notifyProbateGuardianTabStateChanged(){
  document.dispatchEvent(new CustomEvent('probate-guardian-state-change',{detail:getProbateGuardianTabState()}));
}
window.pgHasUnsavedChanges=function(){return _dirtySinceExport;};

// guardianData is a top-level `let`, reassigned wholesale in several places
// (lock/reset/load-from-.sav) -- a one-time `window.guardianData=guardianData`
// bridge would go stale after any of those. This accessor always returns the
// current object; src/features/dashboard/index.js reads through it live via
// a Proxy rather than caching a reference (see that file's own comment).
function getGuardianData(){ return guardianData; }
window.getGuardianData=getGuardianData;

// _appState has the same reassign-wholesale problem as guardianData above.
// Dashboard only ever needs this one flag, so a pair of small accessors is
// simpler than exposing the whole mutable object.
function isContinuePromptShown(){ return !!_appState.continuePromptShown; }
window.isContinuePromptShown=isContinuePromptShown;
function markContinuePromptShown(){
  _appState.continuePromptShown=true;
  saveAppState('continuePromptShown',true);
}
window.markContinuePromptShown=markContinuePromptShown;

function markDirtySinceExport(){ _dirtySinceExport=true; notifyProbateGuardianTabStateChanged(); }
window.markDirtySinceExport=markDirtySinceExport;

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
async function saveBlobAs(blob,suggestedName,preWriteValidator){
  if(window.showSaveFilePicker){
    try{
      const handle=await showSaveFilePicker({
        suggestedName,
        types:[{description:'Probate Guardian data file',accept:{'application/octet-stream':['.sav']}}]
      });
      if(typeof preWriteValidator==='function'){
        const proceed=await preWriteValidator(handle);
        if(!proceed){
          const abortErr=new Error('The user aborted a request.');
          abortErr.name='AbortError';
          throw abortErr;
        }
      }
      const writable=await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return handle;
    }catch(e){
      if(e&&e.name==='AbortError')throw e; // user cancelled Save As or refused preWriteValidator
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

// The active handles live in memory (keyed by wardId for per-ward files, or in
// _archiveZipHandle for whole-case multi-ward archives) and are persisted to
// IndexedDB (pg-launch-pref).
let _wardZipHandles=new Map();
let _archiveZipHandle=null;

async function rememberWardZipHandle(wardId,handle){
  if(!wardId||!handle)return;
  // If this handle points to the same file on disk as the archive handle,
  // disassociate the archive handle so a ward save cannot simultaneously
  // pretend to be a whole-case archive.
  const archiveHandle=await loadArchiveZipHandle();
  if(archiveHandle&&typeof handle.isSameEntry==='function'){
    try{
      if(await handle.isSameEntry(archiveHandle)){
        console.warn('Per-ward handle matches active archive handle; clearing archive handle');
        await forgetArchiveZipHandle();
      }
    }catch(e){/* non-critical */}
  }
  _wardZipHandles.set(wardId,handle);
  await savePersistedWardZipHandle(wardId,handle);
  await refreshAutoSaveArmedStatus();
}

async function loadWardZipHandle(wardId=guardianData.activeWardId){
  if(!wardId)return null;
  if(_wardZipHandles.has(wardId)){
    return _wardZipHandles.get(wardId);
  }
  const handle=await loadPersistedWardZipHandle(wardId);
  if(handle){
    _wardZipHandles.set(wardId,handle);
    return handle;
  }
  return null;
}

async function forgetWardZipHandle(wardId){
  if(!wardId)return;
  _wardZipHandles.delete(wardId);
  await forgetPersistedWardZipHandle(wardId);
  await refreshAutoSaveArmedStatus();
}

async function rememberArchiveZipHandle(handle){
  if(!handle)return;
  // If this archive handle points to the same file on disk as any existing
  // per-ward handle, disassociate that per-ward handle.
  if(typeof handle.isSameEntry==='function'){
    for(const [wId,wHandle] of _wardZipHandles.entries()){
      try{
        if(await handle.isSameEntry(wHandle)){
          console.warn(`Archive handle matches per-ward handle for ${wId}; clearing per-ward handle`);
          await forgetWardZipHandle(wId);
        }
      }catch(e){/* non-critical */}
    }
  }
  _archiveZipHandle=handle;
  await savePersistedArchiveZipHandle(handle);
  await refreshAutoSaveArmedStatus();
}

async function loadArchiveZipHandle(){
  if(_archiveZipHandle)return _archiveZipHandle;
  const handle=await loadPersistedArchiveZipHandle();
  if(handle){
    _archiveZipHandle=handle;
    return handle;
  }
  return null;
}

async function forgetArchiveZipHandle(){
  _archiveZipHandle=null;
  await forgetPersistedArchiveZipHandle();
  await refreshAutoSaveArmedStatus();
}

// True when a background write can happen with no user interaction: a file
// handle is known (either for the active ward or for the case archive) AND
// the browser still grants write permission on it.
let _autoSaveArmed=false;
async function refreshAutoSaveArmedStatus(){
  let armed=false;
  const activeWardId=guardianData.activeWardId;
  let handle=null;
  try{
    if(activeWardId){
      handle=await loadWardZipHandle(activeWardId);
    }else{
      handle=await loadArchiveZipHandle();
    }
    if(handle&&handle.queryPermission){
      armed=(await handle.queryPermission({mode:'readwrite'}))==='granted';
    }
  }catch(e){/* treat as not armed */}
  _autoSaveArmed=armed;
  const el=document.getElementById('auto-save-armed-indicator');
  if(el){
    const fileName=handle&&handle.name;
    if(armed){
      el.textContent=fileName?`Auto-save: ready ✓ (${fileName})`:'Auto-save: ready ✓';
      el.style.color='var(--ok-text)';
    }else if(handle){
      el.textContent=`Auto-save: click Save Backup once to re-enable (${fileName})`;
      el.style.color='var(--warn-text)';
    }else if(window.showSaveFilePicker){
      if(activeWardId){
        const activeWard=getActiveWard();
        const suggestedName=activeWard?getWardFileName(activeWard):'';
        el.textContent=suggestedName?`Auto-save: needs manual save (${suggestedName})`:'Auto-save: needs one manual save first';
      }else{
        el.textContent='Auto-save: no ward open';
      }
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
// Version 3 is per-ward: each ward saves as its own independent .sav file
// with ward.enc, auditLog.enc (filtered to that ward), and a manifest that
// carries wardId/wardName instead of a wards[] index array. Files written
// at version 2 are multi-ward archives; version 3 files are single-ward.
const WARD_FILE_VERSION=3;

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
    kind:'archive',
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

// ── Per-ward save (version 3) ──────────────────────────────────────────
// Builds a single-ward ZIP archive — the canonical save format from
// Milestone 17 onward. Each ward lives in its own file:
//
//   {wardName}-{wardId}.sav (ZIP)
//   ├── manifest.json   ← version 3, wardId, wardName, security fields
//   ├── ward.enc        ← encrypted ward data object
//   └── auditLog.enc    ← audit entries for this ward only
//
// Unlike buildExportZipBlob() (version 2, multi-ward), this does NOT
// include appState, templates, or a wards[] index — those live in launch
// preferences or are shared resources handled at the app level.
async function buildWardZipBlob(wardId){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)throw new Error(`buildWardZipBlob: ward "${wardId}" not found`);

  // Unlike buildExportZipBlob(), do NOT cancel _saveTimer here. That
  // function is on the saveData() → writeArchiveToHandle() recursion path
  // and must cancel to avoid looping; this function is not. Cancelling
  // here would silently drop a pending debounced save for the active ward
  // if a non-active ward is exported within the debounce window.

  // Reads directly from the live in-memory guardianData.wards — there is no
  // separate persisted store. The only field saveData() touches that could be
  // stale mid-debounce is lastModified; stamp it now so the export is fresh.
  if(ward.wardId===guardianData.activeWardId){
    ward.lastModified=new Date().toISOString();
  }

  const salt=(await loadAppState('cryptoSalt'))||null;
  const verifier=(await loadAppState('cryptoVerifier'))||null;

  const zip=new JSZip();
  zip.file('ward.enc',await encryptJSON(ward));

  // Only include audit entries tagged with this ward's id. Entries from
  // before wardId-tagging was added (or app-level events with no active
  // ward) are excluded — they're preserved in the version-2 "Export All"
  // archive and in the session-restore cache. Note: this means a per-ward
  // .sav is not a complete provenance record — unlock events and other
  // app-level entries with no active ward are absent. If this file is
  // ever used as a legal record, the "Export All" archive is the
  // authoritative source.
  const wardAuditEntries=_auditLogEntries.filter(e=>e&&e.wardId===wardId);
  zip.file('auditLog.enc',await encryptJSON(wardAuditEntries));

  zip.file('manifest.json',JSON.stringify({
    format:'probate-guardian-export',
    kind:'ward',
    version:WARD_FILE_VERSION,
    exportedAt:new Date().toISOString(),
    securityMode:_securityMode,
    salt,
    verifier,
    wardId:ward.wardId,
    wardName:ward.wardName||'',
    guardian:await encryptJSON({guardianName:guardianData.guardianName,guardianEmail:guardianData.guardianEmail}),
    auditLogScope:'ward-only',
    auditLogNote:'This file contains only audit entries tagged to this ward. App-level events (unlock, restore, lock) are absent. For a complete provenance record, use Export All Wards.'
  },null,2));

  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  return blob;
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
async function beginRecordingExport(message, wardId = null){
  const previousLastExportAt=_lastExportAt;
  const auditLenBefore=_auditLogEntries.length;
  _lastExportAt=Date.now();
  _appState.lastExportAt=_lastExportAt;
  await auditLog('DATA_EXPORT',message,true,wardId);
  return function rollback(){
    _lastExportAt=previousLastExportAt;
    _appState.lastExportAt=previousLastExportAt;
    _auditLogEntries.length=auditLenBefore; // no-op if auditLog() went to Tauri instead of the local array
  };
}
window.beginRecordingExport = beginRecordingExport;

// ── Multi-ward backup (version 3) ──────────────────────────────────────
// Builds a full backup ZIP archive containing all wards, app state,
// template caches, and unified audit log. Marked with kind: 'backup'
// and version: BACKUP_FILE_VERSION (3).
const BACKUP_FILE_VERSION=3;

async function buildBackupZipBlob(){
  if(_saveTimer){clearTimeout(_saveTimer);_saveTimer=null;}
  const salt=(await loadAppState('cryptoSalt'))||null;
  const verifier=(await loadAppState('cryptoVerifier'))||null;
  const zip=new JSZip();
  const wardIndex=[];
  for(const ward of guardianData.wards){
    const file=`wards/${ward.wardId}.enc`;
    zip.file(file,await encryptJSON(ward));
    wardIndex.push({wardId:ward.wardId,wardName:ward.wardName||'',file});
  }
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
  zip.file('auditLog.enc',await encryptJSON(_auditLogEntries));
  zip.file('manifest.json',JSON.stringify({
    format:'probate-guardian-export',
    kind:'backup',
    version:BACKUP_FILE_VERSION,
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
window.buildBackupZipBlob = buildBackupZipBlob;

async function exportGuardianDataZip(){
  let rollback=null;
  try{
    if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot export.');return;}
    const count=guardianData.wards.length;
    rollback=await beginRecordingExport(`Exported ${count} form(s) to archive`);
    const {blob}=await buildExportZipBlob();
    const handle=await saveBlobAs(blob,'guardianshipwarddata.sav');
    if(handle){
      await rememberArchiveZipHandle(handle);
      clearSessionRestoreCache(); // only discard cache when file landing is verified via handle
    }
    _dirtySinceExport=false;
    hideAutoExportReminder();
    updateLastSavedIndicator();
    notifyProbateGuardianTabStateChanged();
    markCaseOpenedBefore(); // a real .sav now exists — next launch offers the fast-path Open screen
    window.dispatchEvent(new CustomEvent('pg:backup-saved', {
      detail: { fileName: handle ? handle.name : 'guardianshipwarddata.sav', wardId: null, kind: 'archive' }
    }));
    alert(`Export complete: ${count} form(s) saved to guardianshipwarddata.sav`);
  }catch(e){
    if(rollback)rollback();
    if(e&&e.name==='AbortError')return; // user cancelled the Save As dialog
    console.error('export failed',e);
    auditLog('DATA_EXPORT',String(e&&e.message||e),false);
    alert('Export failed: '+(e&&e.message||e));
  }
}

async function backupAllWardsNow(){
  if(!guardianData.wards||guardianData.wards.length===0){
    alert('No wards to back up. Please add or open a ward first.');
    return;
  }
  if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot export backup.');return;}
  const count=guardianData.wards.length;
  let rollback=null;
  const defaultFilename='probate_guardian_all_wards_backup.sav';
  try{
    rollback=await beginRecordingExport(`Exported full backup of ${count} ward(s) to backup file`);
    const {blob}=await buildBackupZipBlob();
    const handle=await saveBlobAs(blob,defaultFilename);
    if(handle){
      await rememberArchiveZipHandle(handle);
      clearSessionRestoreCache();
    }
    _dirtySinceExport=false;
    hideAutoExportReminder();
    updateLastSavedIndicator();
    notifyProbateGuardianTabStateChanged();
    markCaseOpenedBefore();
    window.dispatchEvent(new CustomEvent('pg:backup-saved', {
      detail: { fileName: handle ? handle.name : defaultFilename, wardId: null, kind: 'backup' }
    }));
    alert(`Backup complete: ${count} ward(s) saved to ${handle ? handle.name : defaultFilename}`);
  }catch(e){
    if(rollback)rollback();
    if(e&&e.name==='AbortError')return;
    console.error('backup all wards failed',e);
    auditLog('DATA_EXPORT',String(e&&e.message||e),false);
    alert('Backup failed: '+(e&&e.message||e));
  }
}
window.backupAllWardsNow = backupAllWardsNow;

// Writes a single ward to its authorized handle. Used by auto-save,
// periodic background timer, and the Save Backup button.
async function writeWardToHandle(wardId,handle,viaTimer){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)throw new Error(`writeWardToHandle: ward "${wardId}" not found`);
  const wardName=ward.wardName||'ward';
  const message=viaTimer
    ? `Auto-saved "${wardName}" in the background`
    : `Saved "${wardName}" to existing backup file`;
  const rollback=await beginRecordingExport(message, wardId);
  try{
    const blob=await buildWardZipBlob(wardId);
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
  await refreshAutoSaveArmedStatus();
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  window.dispatchEvent(new CustomEvent('pg:backup-saved', {
    detail: { fileName: handle.name, wardId, kind: 'ward', viaTimer: !!viaTimer }
  }));
  return 1;
}

// Writes the full archive to an already-authorized handle. Retained for
// whole-case multi-ward backups ("Export All").
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
  await refreshAutoSaveArmedStatus();
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  window.dispatchEvent(new CustomEvent('pg:backup-saved', {
    detail: { fileName: handle.name, wardId: null, kind: 'archive', viaTimer: !!viaTimer }
  }));
  return count;
}

// Tries to silently re-write the remembered file handle for the active ward
// (or the case archive if no per-ward file is armed) — no dialog, no user
// gesture needed, as long as the browser still grants write permission.
async function silentAutoExport(){
  try{
    if(typeof JSZip==='undefined')return false;
    const activeWard=getActiveWard();
    if(activeWard){
      const wardHandle=await loadWardZipHandle(activeWard.wardId);
      if(wardHandle){
        const perm=await wardHandle.queryPermission({mode:'readwrite'});
        if(perm!=='granted'){await refreshAutoSaveArmedStatus();return false;}
        await writeWardToHandle(activeWard.wardId,wardHandle,true);
        return true;
      }
    }
    const archiveHandle=await loadArchiveZipHandle();
    if(archiveHandle){
      const perm=await archiveHandle.queryPermission({mode:'readwrite'});
      if(perm!=='granted'){await refreshAutoSaveArmedStatus();return false;}
      await writeArchiveToHandle(archiveHandle,true);
      return true;
    }
    return false;
  }catch(e){
    console.warn('Silent auto-export failed, will show reminder instead',e);
    await refreshAutoSaveArmedStatus();
    return false;
  }
}

function getWardFileStem(ward){
  const namePart=(ward&&ward.wardName||'Ward').trim().replace(/[\s_]+/g,'-').replace(/[^a-zA-Z0-9-]/g,'')||'Ward';
  const casePart=(ward&&ward.caseNumber||'').trim().replace(/[\s_]+/g,'-').replace(/[^a-zA-Z0-9-]/g,'');
  return casePart ? `${namePart}-${casePart}-guardianshipwarddata` : `${namePart}-guardianshipwarddata`;
}
function getWardFileName(ward){
  return `${getWardFileStem(ward)}.sav`;
}
window.getWardFileStem = getWardFileStem;
window.getWardFileName = getWardFileName;

async function validateWardBackupOverwrite(pickedHandle){
  const archiveHandle=await loadArchiveZipHandle();
  if(archiveHandle&&typeof pickedHandle.isSameEntry==='function'){
    try{
      if(await pickedHandle.isSameEntry(archiveHandle)&&guardianData.wards.length>1){
        return confirm('Warning: You selected your case file archive containing multiple wards. Overwriting it with this single ward will replace the other wards on disk. Are you sure you want to overwrite?');
      }
    }catch(e){/* non-critical */}
  }
  return true;
}
window.validateWardBackupOverwrite = validateWardBackupOverwrite;

async function finishWardExport(handle, ward){
  if(handle){
    const wardId = ward && ward.wardId;
    if(wardId){
      await rememberWardZipHandle(wardId, handle);
    }
    await clearSessionRestoreCache();
    await markCaseOpenedBefore();
  }
  _dirtySinceExport = false;
  hideAutoExportReminder();
  updateLastSavedIndicator();
  notifyProbateGuardianTabStateChanged();
  window.dispatchEvent(new CustomEvent('pg:backup-saved', {
    detail: {
      fileName: handle ? handle.name : (ward ? getWardFileName(ward) : 'guardianshipwarddata.sav'),
      wardId: ward && ward.wardId,
      kind: 'ward'
    }
  }));
}
window.finishWardExport = finishWardExport;

// The banner's Save Backup Now button. Runs inside a click, so a user
// gesture is available: re-authorizes the active ward's handle (or the archive
// handle) with one small prompt, or falls back to Save As single-ward export.
async function saveBackupNow(){
  const activeWard=getActiveWard();
  if(!activeWard){
    await exportGuardianDataZip();
    return;
  }
  try{
    const wardHandle=await loadWardZipHandle(activeWard.wardId);
    if(wardHandle&&wardHandle.requestPermission){
      const perm=await wardHandle.requestPermission({mode:'readwrite'});
      if(perm==='granted'){
        await writeWardToHandle(activeWard.wardId,wardHandle,false);
        alert(`Backup saved: ${activeWard.wardName||'Ward'} written to your backup file.`);
        return;
      }
    }
  }catch(e){
    console.warn('Reusing remembered ward backup file failed',e);
  }
  // If no ward handle or permission denied, save single ward via picker using its per-ward filename
  let rollback=null;
  try{
    const wardName=activeWard.wardName||'ward';
    rollback=await beginRecordingExport(`Exported single ward "${wardName}" to ward file`, activeWard.wardId);
    const blob=await buildWardZipBlob(activeWard.wardId);
    const fileName=getWardFileName(activeWard);
    const handle=await saveBlobAs(blob,fileName,validateWardBackupOverwrite);
    await finishWardExport(handle, activeWard);
    alert(`Backup saved for ${activeWard.wardName||'this ward'}.`);
  }catch(e){
    if(rollback)rollback();
    if(e&&e.name==='AbortError')return;
    console.error('Save backup failed',e);
    auditLog('DATA_EXPORT',String(e&&e.message||e),false,activeWard.wardId);
    alert('Save backup failed: '+(e&&e.message||e));
  }
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

async function importSavArchiveOrWard(file, options = {}){
  const { handle = null, isBackupFlow = false } = options;
  try{
    if(typeof JSZip==='undefined'){alert('ZIP library failed to load — cannot import.');return false;}
    const check=await validateImportFile(file,'sav');
    if(!check.ok){alert(check.message);return false;}
    if(_securityMode==='encrypted'&&!_cryptoKey){alert('Please unlock the app before importing a data file.');return false;}
    const zip=await JSZip.loadAsync(file);
    const manifestEntry=zip.file('manifest.json');
    if(!manifestEntry)throw new Error('Not a Probate Guardian data file (no manifest.json inside).');
    const manifest=JSON.parse(await manifestEntry.async('string'));
    if(manifest.format!=='probate-guardian-export')throw new Error('Not a Probate Guardian data file.');

    const kind=manifest.kind||(manifest.version>=3&&manifest.wardId?'ward':'archive');

    // Same install (same salt) → current key works. Different install →
    // ask for the password the file was exported under and re-derive.
    const currentSalt=await loadAppState('cryptoSalt');
    let key=_cryptoKey;
    if(manifest.securityMode!=='none'&&manifest.salt!==currentSalt){
      const pw=prompt('This file came from a different installation.\nEnter the master password that was in use when it was exported:');
      if(!pw)return false;
      key=await deriveKeyFromPassword(pw,manifest.salt);
    }

    let guardianInfo=null;
    if(manifest.guardian){
      try{
        guardianInfo=await decryptJSONWithKey(manifest.guardian,key);
      }catch(e){
        throw new Error('Wrong password for this file, or the file has been modified/corrupted.');
      }
    }

    const imported=[];
    if(kind==='ward'){
      const wardFile=zip.file('ward.enc');
      if(!wardFile)throw new Error('Per-ward .sav file missing ward.enc');
      let ward;
      try{
        ward=sanitizeObjectData(await decryptJSONWithKey(await wardFile.async('string'),key));
      }catch(err){
        throw new Error(`The file's data has been modified or corrupted since it was saved — nothing was imported.`);
      }
      if(ward&&ward.wardId)imported.push(ward);
    }else{
      for(const entry of (Array.isArray(manifest.wards)?manifest.wards:[])){
        const f=zip.file(entry.file);
        if(!f){console.warn('Archive entry missing:',entry.file);continue;}
        let ward;
        try{
          ward=sanitizeObjectData(await decryptJSONWithKey(await f.async('string'),key));
        }catch(err){
          throw new Error(`The archive's data for "${entry.file}" has been modified or corrupted since it was saved — nothing was imported.`);
        }
        if(ward&&ward.wardId)imported.push(ward);
      }
    }
    if(kind==='ward'&&!imported.length){
      throw new Error('Per-ward file contained no readable ward data.');
    }
    if(!imported.length&&!guardianInfo)throw new Error('File contained no readable data.');

    const replacing=imported.filter(w=>guardianData.wards.some(x=>x.wardId===w.wardId)).length;
    const adding=imported.length-replacing;
    const promptText = (isBackupFlow && kind === 'ward')
      ? `"${file.name}" is a single-ward save file, not an all-wards backup.\n\nWould you like to import ward "${imported[0].wardName||'this ward'}" instead?${replacing>0?'\n\n• Will replace existing ward data with the same ID':''}`
      : (isBackupFlow
          ? (guardianData.wards.length===0
              ? `Open backup containing ${imported.length} ward(s) from "${file.name}"?`
              : `Restore backup containing ${imported.length} ward(s) from "${file.name}"?\n\n• ${adding} new ward(s)\n• ${replacing} existing ward(s) will be updated\n\nDo you want to proceed?`)
          : (kind==='ward'
              ? `Import ward "${imported[0].wardName||'this ward'}" from "${file.name}"?${replacing>0?'\n\n• Will replace existing ward data with the same ID':''}`
              : `Import ${imported.length} form(s) from "${file.name}"?\n\n• ${adding} new form(s)\n• ${replacing} will replace existing form(s) with the same ID`));
    if(!confirm(promptText))return false;

    // Flush BEFORE swapping array entries so in-progress edits save under the
    // old objects and can't overwrite freshly imported data afterwards.
    await flushPendingSave();

    // Stage updates into a new array atomically before assigning
    const nextWards=[...guardianData.wards];
    for(const ward of imported){
      const idx=nextWards.findIndex(x=>x.wardId===ward.wardId);
      if(idx>=0)nextWards[idx]=ward;else nextWards.push(ward);
    }
    guardianData.wards=nextWards;

    for(const ward of imported){
      await saveWardToState(ward);
    }
    if(guardianInfo&&guardianInfo.guardianName)guardianData.guardianName=guardianInfo.guardianName;
    if(guardianInfo&&guardianInfo.guardianEmail)guardianData.guardianEmail=guardianInfo.guardianEmail;
    await saveData();

    // window.D references an object in guardianData.wards; rebind via switchWard
    // so open forms stay synchronized to the newly imported object and the
    // cross-tab exclusive lock (activateWard / Web Locks API) is acquired properly.
    if(guardianData.activeWardId&&guardianData.wards.some(w=>w.wardId===guardianData.activeWardId)){
      await switchWard(guardianData.activeWardId);
    }else if(guardianData.wards.length){
      await switchWard(guardianData.wards[0].wardId);
    }else{
      updateSidebar();
    }

    if(handle){
      await rememberArchiveZipHandle(handle);
    }

    const auditMsg=kind==='ward'
      ? `Imported ward "${imported[0].wardName||'ward'}" from file`
      : (isBackupFlow||kind==='backup'
          ? `Restored backup containing ${imported.length} ward(s) from "${file.name}"`
          : `Imported ${imported.length} form(s) from archive`);
    await auditLog('DATA_IMPORT',auditMsg,true);

    _dirtySinceExport=false;
    clearSessionRestoreCache();
    hideAutoExportReminder();
    updateLastSavedIndicator();
    notifyProbateGuardianTabStateChanged();

    if(!manifest.kind&&!manifest.wardId&&!(await hasSeenMigrationModal())){
      try{
        await showMigrationModal();
      }catch(e){
        console.warn('Could not show migration modal on import:',e);
      }
    }

    if(isBackupFlow && kind !== 'ward'){
      window.dispatchEvent(new CustomEvent('pg:backup-restored', {
        detail: { fileName: file.name, count: imported.length }
      }));
      if(typeof navigate==='function')await navigate('/dashboard');
      alert(`Backup restored: ${imported.length} ward(s) loaded.`);
    }else{
      alert(kind==='ward'?`Import complete: "${imported[0].wardName||'ward'}" loaded.`:`Import complete: ${imported.length} form(s) loaded.`);
    }
    return true;
  }catch(e){
    console.error('Import failed',e);
    auditLog('DATA_IMPORT',String(e&&e.message||e),false);
    alert((isBackupFlow?'Could not open backup file: ':'Import failed: ')+(e&&e.message||e));
    return false;
  }
}

async function importGuardianDataZip(file){
  return importSavArchiveOrWard(file, { isBackupFlow: false });
}
window.importGuardianDataZip = importGuardianDataZip;

async function triggerOpenBackupSav(){
  if(window.showOpenFilePicker){
    try{
      const [handle]=await window.showOpenFilePicker({
        types:[{description:'Probate Guardian backup file (.sav)',accept:{'application/octet-stream':['.sav','.zip']}}]
      });
      const file=await handle.getFile();
      await restoreBackupSavFile(file,handle);
      return;
    }catch(e){
      if(e&&e.name==='AbortError')return;
      console.warn('showOpenFilePicker failed or cancelled, falling back to input',e);
    }
  }
  const inp=document.getElementById('backup-import-input');
  if(inp){inp.value='';inp.click();}
}
window.triggerOpenBackupSav = triggerOpenBackupSav;

async function handleBackupImportChange(input){
  const file=input.files?.[0];
  input.value='';
  if(!file)return;
  await restoreBackupSavFile(file,null);
}
window.handleBackupImportChange = handleBackupImportChange;

async function restoreBackupSavFile(file, handle){
  return importSavArchiveOrWard(file, { handle, isBackupFlow: true });
}
window.restoreBackupSavFile = restoreBackupSavFile;

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
    notifyProbateGuardianTabStateChanged();
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
const LAUNCH_PREF_KEY_OPENED='hasOpenedBefore', LAUNCH_PREF_KEY_HANDLE='zipFileHandle', LAUNCH_PREF_KEY_MIGRATION_SEEN='migrationModalSeen';
const REMEMBERED_FILE_TIMEOUT_MS=10000;
let _rememberedFileUnavailable=false;
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
async function _launchPrefDelete(key){
  const db=await _launchPrefDb();
  return new Promise((resolve)=>{
    const tx=db.transaction(LAUNCH_PREF_STORE,'readwrite');
    tx.objectStore(LAUNCH_PREF_STORE).delete(key);
    tx.oncomplete=resolve;
    tx.onerror=resolve;
  });
}
async function hasOpenedCaseBefore(){
  try{return (await _launchPrefGet(LAUNCH_PREF_KEY_OPENED))===true;}
  catch(e){return false;} // IndexedDB unavailable (private browsing, etc.) — fall back to the full choice screen
}
async function markCaseOpenedBefore(){
  try{await _launchPrefPut(LAUNCH_PREF_KEY_OPENED,true);}catch(e){/* non-critical */}
}
async function hasSeenMigrationModal(){
  try{return (await _launchPrefGet(LAUNCH_PREF_KEY_MIGRATION_SEEN))===true;}
  catch(e){return false;}
}
async function markMigrationModalSeen(){
  try{await _launchPrefPut(LAUNCH_PREF_KEY_MIGRATION_SEEN,true);}catch(e){/* non-critical */}
}
async function savePersistedWardZipHandle(wardId,handle){
  if(!wardId||!handle)return;
  try{await _launchPrefPut('wardHandle_'+wardId,handle);}catch(e){/* non-critical */}
}
async function loadPersistedWardZipHandle(wardId){
  if(!wardId)return null;
  try{return (await _launchPrefGet('wardHandle_'+wardId))||null;}catch(e){return null;}
}
async function forgetPersistedWardZipHandle(wardId){
  if(!wardId)return;
  try{await _launchPrefDelete('wardHandle_'+wardId);}catch(e){/* non-critical */}
}
async function savePersistedArchiveZipHandle(handle){
  if(!handle)return;
  try{await _launchPrefPut(LAUNCH_PREF_KEY_HANDLE,handle);}catch(e){/* non-critical */}
}
async function loadPersistedArchiveZipHandle(){
  try{return (await _launchPrefGet(LAUNCH_PREF_KEY_HANDLE))||null;}catch(e){return null;}
}
async function forgetPersistedArchiveZipHandle(){
  try{await _launchPrefDelete(LAUNCH_PREF_KEY_HANDLE);}catch(e){/* non-critical */}
}
async function runRememberedHandleOperation(operation,timeoutMs=REMEMBERED_FILE_TIMEOUT_MS){
  let timeout;
  try{
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((resolve,reject)=>{
        timeout=setTimeout(()=>reject(new DOMException('The remembered case file did not respond.','TimeoutError')),timeoutMs);
      }),
    ]);
  }finally{
    clearTimeout(timeout);
  }
}
function readRememberedFile(handle,timeoutMs=REMEMBERED_FILE_TIMEOUT_MS){
  return runRememberedHandleOperation(()=>handle.getFile(),timeoutMs);
}
async function handleRememberedFileFailure(handle,error){
  _rememberedFileUnavailable=true;
  await forgetPersistedArchiveZipHandle();
  console.warn('Remembered case file is unavailable; it must be selected again',error);
}

// Case 1 above: a remembered handle whose read permission the browser
// still honors with no prompt at all. Runs before the startup screen even
// shows, so this is the only path that can be truly zero-click; everywhere
// else still needs the gesture openCaseFileAtLaunch() provides.
async function trySilentReopen(){
  let handle=null;
  try{
    handle=await loadPersistedArchiveZipHandle();
    if(!handle||!handle.queryPermission)return false;
    if((await runRememberedHandleOperation(()=>handle.queryPermission({mode:'read'})))!=='granted')return false;
    const file=await readRememberedFile(handle);
    const res=await loadCaseFileAtLaunch(file);
    if(res&&res.ok){
      if(res.kind==='ward'&&res.wardId){
        await rememberWardZipHandle(res.wardId,handle);
      }else{
        await rememberArchiveZipHandle(handle);
      }
      return true;
    }
    return false;
  }catch(e){
    await handleRememberedFileFailure(handle,e);
    return false;
  }
}

let _launchStateResolved=false;
let _openedFileAtLaunch=false; // set by loadCaseFileAtLaunch() on success; initApp() lands on the dashboard instead of the default page when this is true
let _needsMigrationModal=false;
let _startupChoiceResolve=null;
async function promptOpenOrStartAtLaunch(){
  if(await trySilentReopen())return;
  document.getElementById('startup-newcase-btn').style.display='';
  const linkEl=document.getElementById('startup-newcase-link');
  if(linkEl)linkEl.style.display='none';
  const fileStatus=document.getElementById('startup-file-status');
  fileStatus.style.display=_rememberedFileUnavailable?'block':'none';
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
async function startNewWardAtLaunch(){
  _resolveStartupChoice();
  try{ await forgetPersistedArchiveZipHandle(); }catch(e){}
}
const startNewCaseAtLaunch = startNewWardAtLaunch;
window.startNewWardAtLaunch = startNewWardAtLaunch;
window.startNewCaseAtLaunch = startNewCaseAtLaunch;

// Chrome/Edge: showOpenFilePicker() returns a handle that supports
// createWritable(), so opening a file arms silent auto-save immediately.
// Firefox/Safari implement neither picker — fall back to a plain
// <input type=file>, which can only ever hand back a read-only File.
// Those browsers can open a case file but can never auto-save it (see
// refreshAutoSaveArmedStatus() and the note on _wardZipHandles above); that
// is stated on screen once the file is open, not hidden.
//
// trySilentReopen() already tried the fully-silent path with no prompt at
// all before this screen ever showed; reaching here means that either
// failed or was never possible (this is a first visit, a different
// browser, or the earlier grant lapsed). This click is still a real user
// gesture, so it can re-request permission on that SAME remembered
// handle — a small native "Allow?" prompt, not the full picker — before
// falling back to showOpenFilePicker() itself.
async function openWardFileAtLaunch(){
  const remembered=await loadPersistedArchiveZipHandle();
  if(remembered&&remembered.requestPermission){
    try{
      if((await runRememberedHandleOperation(()=>remembered.requestPermission({mode:'read'})))==='granted'){
        const file=await readRememberedFile(remembered);
        const res=await loadCaseFileAtLaunch(file);
        if(res&&res.ok){
          if(res.kind==='ward'&&res.wardId){
            await rememberWardZipHandle(res.wardId,remembered);
          }else{
            await rememberArchiveZipHandle(remembered);
          }
          _resolveStartupChoice();
          return;
        }
      }
    }catch(e){
      await handleRememberedFileFailure(remembered,e);
      const statusEl=document.getElementById('startup-file-status');
      if(statusEl){
        statusEl.textContent='Your previously opened file could not be found or was moved. Click "Open a Ward File (.sav)" below to select your file.';
        statusEl.style.display='block';
      }
      return; // Return so user can click with a fresh gesture
    }
  }
  if(window.showOpenFilePicker){
    try{
      const [handle]=await window.showOpenFilePicker({
        types:[{description:'Probate Guardian data file',accept:{'application/octet-stream':['.sav']}}]
      });
      const file=await handle.getFile();
      const res=await loadCaseFileAtLaunch(file);
      if(res&&res.ok){
        if(res.kind==='ward'&&res.wardId){
          await rememberWardZipHandle(res.wardId,handle);
        }else{
          await rememberArchiveZipHandle(handle);
        }
        _resolveStartupChoice();
      }
    }catch(e){
      if(e&&e.name==='AbortError')return; // user cancelled the picker — leave the choice screen up
      if(e&&(String(e.message).includes('user gesture')||String(e).includes('user gesture'))){
        const statusEl=document.getElementById('startup-file-status');
        if(statusEl){
          statusEl.textContent='Click "Open a Ward File (.sav)" to select a file.';
          statusEl.style.display='block';
        }
        return;
      }
      console.error('Open ward file failed',e);
      alert('Could not open that file: '+(e&&e.message||e));
    }
    return;
  }
  document.getElementById('startup-open-input').click();
}
const openCaseFileAtLaunch = openWardFileAtLaunch;
window.openWardFileAtLaunch = openWardFileAtLaunch;
window.openCaseFileAtLaunch = openCaseFileAtLaunch;

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
window.handleStartupOpenInputChange = handleStartupOpenInputChange;

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
    if(!manifest.kind&&!manifest.wardId&&!(await hasSeenMigrationModal()))_needsMigrationModal=true;
    markCaseOpenedBefore();
    refreshAutoSaveArmedStatus(); // covers the plain-<input> path too, where no handle was ever remembered
    const kind=manifest.kind||(manifest.version>=3&&manifest.wardId?'ward':'archive');
    return { ok: true, kind, wardId: manifest.wardId || (guardianData.wards[0] && guardianData.wards[0].wardId) || null };
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
// own comment. Version-3 per-ward files are delegated to loadWardFromSavZip.
async function loadStateFromSavZip(zip,manifest,key){
  // Infer kind for files written before the kind field existed:
  // version-3 files with wardId but no kind were the first per-ward
  // exports; treat them as 'ward'. Older files without kind are archives.
  const kind=manifest.kind||(manifest.version>=3&&manifest.wardId?'ward':'archive');
  if(kind!=='ward'&&kind!=='archive'&&kind!=='backup'){
    throw new Error(`Unknown .sav file kind "${kind}" — this file may require a newer version of the app.`);
  }
  if(kind==='ward'){
    return loadWardFromSavZip(zip,manifest,key);
  }
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

// ── Per-ward reader (version 3) ────────────────────────────────────────
// Counterpart to buildWardZipBlob(). Reads a single ward from a version-3
// per-ward .sav file into guardianData.
//
// Both callers today (loadCaseFileAtLaunch and lockApp) run with
// guardianData.wards empty, so this appends unconditionally. If a future
// "import ward into current session" feature needs merge semantics
// (replace-by-id, audit dedup), add them at that point with tests.
async function loadWardFromSavZip(zip,manifest,key){
  // 1. Decrypt ward
  const wardFile=zip.file('ward.enc');
  if(!wardFile)throw new Error('Per-ward .sav file missing ward.enc');
  const ward=sanitizeObjectData(await decryptJSONWithKey(await wardFile.async('string'),key));
  if(!ward||!ward.wardId)throw new Error('Per-ward .sav file: ward data invalid or missing wardId');

  // 2. Append ward
  guardianData.wards.push(ward);

  // 3. Guardian identity
  if(manifest.guardian){
    try{
      const g=await decryptJSONWithKey(manifest.guardian,key);
      guardianData.guardianName=g.guardianName||'';
      guardianData.guardianEmail=g.guardianEmail||'';
    }catch(e){console.warn('Could not read guardian info from per-ward .sav file',e);}
  }

  // 4. Mark this ward as active. No lock is acquired here — both callers
  // (loadCaseFileAtLaunch → initApp, lockApp) call activateWard() after
  // this function returns. Assert that no lock is currently held; if one
  // is, a caller is using this function outside its expected context.
  if(window.getCurrentLockedWardId&&window.getCurrentLockedWardId()){
    console.error('loadWardFromSavZip: a ward lock is held ('+window.getCurrentLockedWardId()+') — callers must release before loading a new file.');
    if(window.releaseWardLock)await window.releaseWardLock();
  }
  guardianData.activeWardId=manifest.wardId||ward.wardId;

  // 5. Load audit log entries (callers start with empty _auditLogEntries)
  const auditFile=zip.file('auditLog.enc');
  if(auditFile){
    try{
      const entries=await decryptJSONWithKey(await auditFile.async('string'),key);
      if(Array.isArray(entries)){
        _auditLogEntries=entries;
        _auditLogNextId=entries.reduce((m,e)=>Math.max(m,(e&&e.id)||0),0)+1;
      }
    }catch(e){console.warn('Could not read audit log from per-ward .sav file',e);}
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
  return `<div class="inventory-convert-banner mb-3" data-form-action="load-ward-info" role="button" tabindex="0" aria-label="Load ward info from an existing ${esc(INVENTORY_TYPES[sourceType].name)} ward">
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

// ═══════════════════════════════════════════════════════
// WARD ACTIVATION / UNLOAD (Single Chokepoint)
// ═══════════════════════════════════════════════════════
async function activateWard(ward, opts = {}) {
  if (!ward || !ward.wardId) return false;

  // 1. If ward is already active and lock held, refresh UI and return true
  if (guardianData.activeWardId === ward.wardId && window.D === ward) {
    if (window.acquireWardLock) {
      const alreadyHeld = await window.acquireWardLock(ward.wardId);
      if (alreadyHeld) {
        updateSidebar();
        await refreshAutoSaveArmedStatus();
        return true;
      }
    } else {
      updateSidebar();
      await refreshAutoSaveArmedStatus();
      return true;
    }
  }

  // 2. Flush while outgoing ward's lock is still held
  await flushPendingSave();

  // 3. Acquire target ward lock (atomically acquires new lock before releasing previous)
  let acquired = true;
  if (window.acquireWardLock) {
    acquired = await window.acquireWardLock(ward.wardId);
  }

  // 4. On contention: previous lock is still held untouched in module
  if (!acquired) {
    showWardLockedModal();
    return false;
  }

  // 6. On success, set loaded state
  guardianData.activeWardId = ward.wardId;
  activeInventoryType = ward.inventoryType;
  window.D = ward;
  _visitedPages.clear();
  addToRecentlyOpened(ward);

  if (formEngine(activeInventoryType) === 'guardian') {
    await ensureGuardianFeatureReady();
  }

  try {
    await saveAppState('activeWardId', ward.wardId);
  } catch (e) {
    console.warn('saveAppState activeWardId failed', e);
  }

  updateSidebar();
  await refreshAutoSaveArmedStatus();
  notifyProbateGuardianTabStateChanged();
  return true;
}

async function unloadWard() {
  await flushPendingSave();
  if (window.releaseWardLock) {
    await window.releaseWardLock();
  }
  guardianData.activeWardId = null;
  window.D = {};
  activeInventoryType = null;
  try {
    await saveAppState('activeWardId', null);
  } catch (e) {
    console.warn('saveAppState activeWardId null failed', e);
  }
  updateSidebar();
  await refreshAutoSaveArmedStatus();
  notifyProbateGuardianTabStateChanged();
  navigate('/dashboard');
}

window.activateWard = activateWard;
window.unloadWard = unloadWard;
window.rememberWardZipHandle = rememberWardZipHandle;
window.loadWardZipHandle = loadWardZipHandle;
window.forgetWardZipHandle = forgetWardZipHandle;
window.rememberArchiveZipHandle = rememberArchiveZipHandle;
window.loadArchiveZipHandle = loadArchiveZipHandle;
window.forgetArchiveZipHandle = forgetArchiveZipHandle;
window.rememberZipHandle = async function(wardId, handle) {
  if (wardId && handle) {
    await rememberWardZipHandle(wardId, handle);
    return;
  }
  throw new Error('rememberZipHandle requires (wardId, handle). Use rememberArchiveZipHandle(handle) for case archives.');
};
window.loadZipHandle = loadWardZipHandle;
window.hasOpenedCaseBefore = hasOpenedCaseBefore;
window.markCaseOpenedBefore = markCaseOpenedBefore;

async function addWard(wardName,inventoryType){
  const wardId=createWardId();
  const isFirstWardEver=guardianData.wards.length===0;

  const newWard={
    wardId,
    inventoryType,
    createdDate:new Date().toISOString().split('T')[0],
    ...initializeEmptyData(inventoryType),
    wardName:wardName||''
  };
  guardianData.wards.push(newWard);
  await saveWardToState(newWard);

  await activateWard(newWard);
  _dirtySinceExport=true;
  updateLastSavedIndicator();

  if(isFirstWardEver){
    _appState.firstLaunchSeen=false;
  }
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
  collapseWardControls();
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
      return `<button type="button" class="recent-ward-item" data-modal-action="switch-ward" data-ward-id="${esc(w.wardId)}">
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
  if(!ward)return false;

  const ok=await activateWard(ward);
  if(!ok)return false;

  // Update UI in correct order
  currentPage='/';
  window.location.hash='';
  const el=document.getElementById('main-content');
  switch(formEngine(activeInventoryType)){
    case 'guardian':
      mountGuardianFeature('/');
      updateHelpContext();
      closeMobileSidebar();
      return true;
    case 'simplified': mountSimplifiedFeature('/');break;
    case 'annual': mountAnnualFeature('/');break;
    case 'planSimplified': mountPlanSimplifiedFeature('/');break;
    case 'planAnnual': mountPlanAnnualFeature('/');break;
    case 'planInitial': mountPlanInitialFeature('/');break;
    case 'planMinor': mountPlanMinorFeature('/');break;
  }
  linkLabelsToInputs();
  updateNavDots();
  updateHelpContext();
  closeMobileSidebar();
  return true;
}

async function deleteWard(wardId){
  const idx=guardianData.wards.findIndex(w=>w.wardId===wardId);
  if(idx===-1)return;

  if(guardianData.activeWardId===wardId){
    await unloadWard();
  }

  guardianData.wards.splice(idx,1);
  await deleteWardFromState(wardId);
  deleteAutosaveFile(wardId);
  await forgetWardZipHandle(wardId);

  updateSidebar();
  notifyProbateGuardianTabStateChanged();
  navigate('/dashboard');
}
window.deleteWard = deleteWard;

async function renameWard(wardId,newName){
  const ward=guardianData.wards.find(w=>w.wardId===wardId);
  if(!ward)return;
  ward.wardName=newName;
  await saveWardToState(ward);
  notifyProbateGuardianTabStateChanged();
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

// Explicit window assignments: these are bare top-level `const`s, which
// (unlike function declarations) do NOT become `window` properties on their
// own -- see src/core/state.js's file header for the full explanation. Both
// src/core/state.js's emptyDataPlanAnnual() and
// src/features/plan-annual/index.js read these via window, so they need to
// be real window properties (Milestone 4, Phase A).
window.PLAN_RIGHTS=PLAN_RIGHTS;
window.PLAN_RIGHT_STATES=PLAN_RIGHT_STATES;
window.PLAN_ADLS=PLAN_ADLS;
window.PLAN_ADL_RATINGS=PLAN_ADL_RATINGS;
window.PLAN_BENEFITS=PLAN_BENEFITS;

function emptyPlanResidence(){return {name:'',street:'',cityStateZip:'',phone:'',facilityType:'',from:'',to:''};}
function emptyPlanProvider(){return {name:'',street:'',cityStateZip:'',phone:'',providerType:'',visits:''};}
function emptyPlanDirective(){return {title:'',dateSigned:'',signedBy:'',agents:'',alternates:'',relationship:'',contact:'',courtRevoked:'',orderDate:'',orderCounty:''};}

// emptyDataPlanAnnual() and emptyDataPlanInitial() moved to
// src/core/state.js (Milestones 4 and 5, both Phase A), reached via
// window.emptyDataPlanAnnual()/window.emptyDataPlanInitial() from
// initializeEmptyData() below -- needed synchronously at ward-creation time,
// before the lazily-imported feature module loads. Both reach back into
// legacy globals here (PLAN_RIGHTS/PLAN_ADLS/PLAN_BENEFITS/
// emptyPlanResidence/emptyPlanProvider/emptyPlanDirective for the former,
// INITIAL_ADLS/emptyInitialProvider/emptyPlanDirective for the latter) that
// stay in this file because computeNavChecks()/resetYearlyFieldsForNewYear()
// need them directly.

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
// Bare top-level consts are not real `window` properties on their own (see
// core/state.js's file header) -- computeNavChecks()'s planInitial branch
// reads these via the plain identifier since it's the same classic script,
// but the lazily-imported features/plan-initial/ module can only reach them
// through window, so both need an explicit assignment here.
window.INITIAL_ADLS=INITIAL_ADLS;
window.INITIAL_ADL_RATINGS=INITIAL_ADL_RATINGS;

function emptyInitialProvider(){return {name:'',providerType:'',examDate:'',street:'',cityStateZip:'',phone:''};}

function emptyMinorResidence(){return {name:'',street:'',city:'',state:'',zip:'',phone:''};}
function emptyMinorProvider(){return {first:'',mi:'',last:'',street:'',city:'',state:'',zip:'',phone:'',providerType:'',visits:''};}
function emptyMinorGuardianSig(){return {name:'',tin:'',phone:'',mailingStreet:'',mailingCityStateZip:'',relationship:'',email:'',signatureDate:''};}

// emptyDataPlanMinor() moved to src/core/state.js (Milestone 6, Phase A),
// reached via window.emptyDataPlanMinor() from initializeEmptyData() below
// -- needed synchronously at ward-creation time, before the lazily-imported
// feature module loads. Unlike emptyDataPlanAnnual()/emptyDataPlanInitial(),
// this one is genuinely pure data: it only calls the three factory
// functions above (window.emptyMinorResidence/emptyMinorProvider/
// emptyMinorGuardianSig), not any bare top-level const -- computeNavChecks()'s
// planMinor branch never reads a rights/ADLs-style array directly, so there's
// nothing here that has to stay an eager legacy global purely for that
// reason (Milestone 6 plan's "Confirmed facts").

// emptyDataAnnual() moved to src/core/state.js (Milestone 7, Phase A),
// reached via window.emptyDataAnnual() from initializeEmptyData() below --
// needed synchronously at ward-creation time, before the lazily-imported
// feature module loads. Not pure data: reaches back into
// window.emptyRowAnnual('trust'/'remun'), which stays a legacy global here
// because convertGuardianSchedulesToAnnual() and
// resetYearlyFieldsForNewYear()'s annual branch call it directly.

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
    case 'annual': return window.emptyDataAnnual();
    case 'planSimplified': return window.emptyDataPlanSimplified();
    case 'planAnnual': return window.emptyDataPlanAnnual();
    case 'planInitial': return window.emptyDataPlanInitial();
    case 'planMinor': return window.emptyDataPlanMinor();
    default: return emptyDataGuardian();
  }
}

// ═══════════════════════════════════════════════════════
// MODAL FUNCTIONS
// ═══════════════════════════════════════════════════════
function closeModal(modalId){
  const el=document.getElementById(modalId);
  if(el)el.classList.remove('show');
  if(modalId==='migrationModal'){
    void markMigrationModalSeen();
  }
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
  const el=document.getElementById(modalId);
  if(!el)throw new Error(`Modal element "${modalId}" not found`);
  el.classList.add('show');
}

async function showMigrationModal(){
  await showModal('migrationModal');
}
window.showMigrationModal = showMigrationModal;

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
        window.guardianData=guardianData;
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
        window.guardianData=guardianData;
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
async function navigate(page){
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
window.INVENTORY_TYPE_META=INVENTORY_TYPE_META;
function typeIcon(type,size){
  return ic((INVENTORY_TYPE_META[type]||{}).iconName||'folder',size||16);
}

function formatDashboardCurrency(v){
  if(v===null||v===undefined)return '—';
  const abs=Math.abs(v);
  const str=abs.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
  return v<0?`($${str})`:`$${str}`;
}

function renderPage(page){
  const el=document.getElementById('main-content');
  window.disposeActiveFeature?.(el);

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
    mountDashboardFeature(page);
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
    case 'guardian':
      mountGuardianFeature(page);
      return;
    case 'simplified': mountSimplifiedFeature(page);break;
    case 'annual': mountAnnualFeature(page);break;
    case 'planSimplified': mountPlanSimplifiedFeature(page);break;
    case 'planAnnual': mountPlanAnnualFeature(page);break;
    case 'planInitial': mountPlanInitialFeature(page);break;
    case 'planMinor': mountPlanMinorFeature(page);break;
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
function collapseWardControls(){
  _wardControlsCollapsed=true;
  _wardControlsUserToggled=true;
  applyWardControlsCollapsedState();
}
function toggleWardControls(){
  _wardControlsCollapsed=!_wardControlsCollapsed;
  _wardControlsUserToggled=true;
  applyWardControlsCollapsedState();
}
window.collapseWardControls=collapseWardControls;

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
function collapseSaveControls(){
  _saveControlsCollapsed=true;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}
function toggleSaveControls(){
  _saveControlsCollapsed=!_saveControlsCollapsed;
  _saveControlsUserToggled=true;
  applySaveControlsCollapsedState();
}
window.collapseSaveControls=collapseSaveControls;

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
  const closeBtn=document.getElementById('close-ward-btn');
  const renameBtn=document.getElementById('rename-ward-btn');
  const deleteBtn=document.getElementById('delete-ward-btn');

  if(activeWardId){
    if(closeBtn)closeBtn.style.display='block';
    renameBtn.style.display='block';
    deleteBtn.style.display='block';
  }else{
    if(closeBtn)closeBtn.style.display='none';
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
    case 'guardian': mountGuardianNav(navContainer);break;
    case 'simplified': mountSimplifiedNav(navContainer);break;
    case 'annual': mountAnnualNav(navContainer);break;
    case 'planSimplified': mountPlanSimplifiedNav(navContainer);break;
    case 'planAnnual': mountPlanAnnualNav(navContainer);break;
    case 'planInitial': mountPlanInitialNav(navContainer);break;
    case 'planMinor': mountPlanMinorNav(navContainer);break;
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
  await saveWardToState(newWard);

  await activateWard(newWard);
  _dirtySinceExport=true;
  updateLastSavedIndicator();
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
  const carriedAssignee=typeof data.dashboardWorkflow?.assigneeName==='string'
    ? data.dashboardWorkflow.assigneeName.trim().replace(/\s+/g,' ').slice(0,120)
    : '';
  if(carriedAssignee)data.dashboardWorkflow={assigneeName:carriedAssignee};
  else delete data.dashboardWorkflow;
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
  notifyProbateGuardianTabStateChanged();
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
  notifyProbateGuardianTabStateChanged();
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
          <button type="button" class="btn btn-sm btn-outline-primary" data-form-action="edit-prior-year" data-ward-id="${esc(ward.wardId)}" data-year-key="${esc(y.key)}">Edit this year</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-form-action="confirm-delete-ward-year" data-ward-id="${esc(ward.wardId)}" data-year-key="${esc(y.key)}" title="Permanently delete this year">${ic('trash',13)}</button>
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
  notifyProbateGuardianTabStateChanged();
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
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="guardian" role="button" tabindex="0" aria-label="Create Initial Inventory ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M9 4.6H7.2a1.6 1.6 0 0 0-1.6 1.6V19a1.6 1.6 0 0 0 1.6 1.6h9.6A1.6 1.6 0 0 0 18.4 19V6.2a1.6 1.6 0 0 0-1.6-1.6H15"/><rect x="9" y="3" width="6" height="3.4" rx="1.1"/></svg> Initial Inventory</h2>
      <p>${INVENTORY_TYPES.guardian.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="simplified" role="button" tabindex="0" aria-label="Create Simplified Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M6 3.6h12v17l-3-1.8-3 1.8-3-1.8-3 1.8Z"/><path d="M9.2 8.4h5.6M9.2 12.4h5.6"/></svg> Simplified Accounting</h2>
      <p>${INVENTORY_TYPES.simplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="annual" role="button" tabindex="0" aria-label="Create Annual Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/></svg> Annual Accounting</h2>
      <p>${INVENTORY_TYPES.annual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="finalAccounting" role="button" tabindex="0" aria-label="Create Final Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.2 20h15.6"/><path d="M7.4 20v-6.4M12 20V5.6M16.6 20v-9.2"/><path d="m15.8 4.4 1.7 1.7 3.1-3.2"/></svg> Final Accounting</h2>
      <p>${INVENTORY_TYPES.finalAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="trustAccounting" role="button" tabindex="0" aria-label="Create Trust Accounting ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.6 9.4 12 4.2l7.4 5.2"/><path d="M6.6 10.8v7.4M11 10.8v7.4M15.4 10.8v7.4M19.8 10.8v7.4"/><path d="M4.2 20.2h15.6"/></svg> Trust Accounting</h2>
      <p>${INVENTORY_TYPES.trustAccounting.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planInitial" role="button" tabindex="0" aria-label="Create Initial Guardianship Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M12 8v5.4M12 16.4v.1"/></svg> Initial Guardianship Plan</h2>
      <p>${INVENTORY_TYPES.planInitial.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planSimplified" role="button" tabindex="0" aria-label="Create Simplified Annual Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="m9.4 12.1 1.9 1.9 3.4-3.6"/></svg> Simplified Annual Plan</h2>
      <p>${INVENTORY_TYPES.planSimplified.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planAnnual" role="button" tabindex="0" aria-label="Create Annual Guardianship Plan ward">
      <h2><svg class="ic" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3.4 5.2 6.1v5.3c0 4.2 2.9 8.1 6.8 9.2 3.9-1.1 6.8-5 6.8-9.2V6.1Z"/><path d="M9.2 10.6h5.6M9.2 13.6h5.6"/></svg> Annual Guardianship Plan</h2>
      <p>${INVENTORY_TYPES.planAnnual.description}</p>
      <span class="btn btn-primary btn-sm" aria-hidden="true">Create Form for a Ward</span>
    </div>
    <div class="inventory-card" data-form-action="add-ward-type" data-inventory-type="planMinor" role="button" tabindex="0" aria-label="Create Annual Plan — Minors ward">
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
    attorneyForGuardian:'',typeOfGuardianship:'',hasSafeDepositBox:null,
    safeDepositBoxFiled:null,isAmended:false,
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
window.PAGES_GUARDIAN=PAGES_GUARDIAN;

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

// ═══════════════════════════════════════════════════════
// Annual Accounting is extracted into src/features/annual-accounting/
// (Milestone 7, Phase A -- data/pages/nav/validate; print/PDF/Excel export
// stay here as legacy until Phase B). Also covers the finalAccounting/
// trustAccounting aliases -- formEngine() maps all three to 'annual'
// everywhere the app dispatches on type, so this one bridge serves all
// three ward types with no per-alias branching anywhere.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above) for why.
let _annualFeatureBridge=null;
function getAnnualFeatureBridge(){
  return _annualFeatureBridge??=window.createFeatureBridge(()=>window.loadAnnualFeature());
}
async function mountAnnualFeature(page){
  await getAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountAnnualNav(container){
  await getAnnualFeatureBridge().mountNav(container);
}

// buildNavAnnual()..pagePart11Annual()/validateAnnual() moved to
// src/features/annual-accounting/index.js (Milestone 7, Phase A).

// Guardian Inventory's page/nav/validation/row UI moved to
// src/features/guardian-inventory/index.js (Milestone 8, Phases A and B --
// print/PDF/Excel import-export now live in that feature's print.js/
// excel.js too). Shared capacity/PDF helpers (checkExcelCapacity(),
// excelCapacityPanel(), groupScheduleBlocksForPdf(), ensureTemplate()),
// openFloridaCourtPortal(), and dashboard calc/mk stay legacy -- shared
// with Annual/Simplified or needed synchronously before this feature loads.
let _guardianFeatureBridge=null;
function getGuardianFeatureBridge(){
  return _guardianFeatureBridge??=window.createFeatureBridge(()=>window.loadGuardianFeature());
}
async function mountGuardianFeature(page){
  await getGuardianFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountGuardianNav(container){
  await getGuardianFeatureBridge().mountNav(container);
}
async function ensureGuardianFeatureReady(){
  if(typeof window.loadGuardianFeature!=='function'){
    await new Promise(resolve=>document.addEventListener('features-loader-ready',resolve,{once:true}));
  }
  await window.loadGuardianFeature();
}

// Dashboard's own rendering (pageDashboard()..toggleWardArchived(),
// getWardProgress()) moved to src/features/dashboard/index.js (Milestone
// 9). Ward-management CRUD (addWard, switchWard, deleteWard, renameWard,
// convertWard, all modals, year management) stays legacy: it's called from
// the topnav on every page, not just the dashboard, so gating it behind
// this feature's lazy load would break "Switch Ward"/"+ New Form" on every
// other page. getWardHeadlineTotal(), typeIcon(), INVENTORY_TYPE_META, and
// formatDashboardCurrency() also stay legacy for the same reason --
// refreshWardInfoCard() and the ward-selector dropdown need them on every
// page too.
let _dashboardFeatureBridge=null;
function getDashboardFeatureBridge(){
  return _dashboardFeatureBridge??=window.createFeatureBridge(()=>window.loadDashboardFeature());
}
async function mountDashboardFeature(page){
  await getDashboardFeatureBridge().mountPage(document.getElementById('main-content'),page);
}

function inpS(id,label,val,req=false,type='text'){
  const isEmail=label.toLowerCase().includes('email');
  const isPhone=!isEmail&&label.toLowerCase().includes('phone');
  const isName=!isEmail&&(label.toLowerCase().includes('name')||label.toLowerCase().includes('payer')||label.toLowerCase().includes('payee')||label.toLowerCase().includes('lender')||label.toLowerCase().includes('creditor')||label.toLowerCase().includes('institution')||label.toLowerCase().includes('guardian')||label.toLowerCase().includes('attorney')||label.toLowerCase().includes('trustee')||label.toLowerCase().includes('claimant')||label.toLowerCase().includes('description')||label.toLowerCase().includes('bonding')||label.toLowerCase().includes('company')||label.toLowerCase().includes('trust'));
  const isZip=!isEmail&&label.toLowerCase().includes('zip');
  const isAddress=!isEmail&&!isZip&&(label.toLowerCase().includes('street')||label.toLowerCase().includes('address')||label.toLowerCase().includes('city'));
  const isSSN=!isEmail&&(label.toLowerCase().includes('ssn')||label.toLowerCase().includes('ein')||label.toLowerCase().includes('social security')||label.toLowerCase().includes('taxpayer id')||/\btin\b/i.test(label));
  const isCaseNumber=!isEmail&&label.toLowerCase().includes('case number')&&!label.toLowerCase().includes('related');
  const isBarNumber=!isEmail&&label.toLowerCase().includes('bar number');
  const isAmountField=type==='number';
  const format=isAmountField?'decimal':isPhone?'phone':isName?'name':isZip?'city-state-zip':isAddress?'address':isSSN?'ssn':isCaseNumber?'case-number':isBarNumber?'bar-number':type==='text'?'security':'';
  const syncWard=id==='wardName'?' data-sync-ward-name="true"':'';
  const syncGuardian=(id==='guardian'||id==='guardianName'||id==='guardianNames')?' data-sync-guardian-name="true"':'';
  const formatted=isPhone?formatPhone(val):isName?formatName(val):isZip?formatCityStateZip(val):isAddress?formatAddress(val):isSSN?formatSSN(val):isCaseNumber?formatCaseNumber(val):isBarNumber?formatBarNumber(val):val||'';
  const inputType=isAmountField?'text':isSSN?'password':type;
  const inputMode=isAmountField?' inputmode="decimal"':'';
  const cleanedValue=isAmountField?sanitizeNonNegativeDecimal(formatted):formatted;
  const isPercentField=isAmountField&&(label.toLowerCase().includes('%')||label.toLowerCase().includes('percent'));
  const isDollarField=isAmountField&&!isPercentField;
  const inputHtml=`<input type="${inputType}" class="form-control" id="${id}" autocomplete="off"${inputMode} value="${String(cleanedValue).replace(/"/g,'&quot;')}" data-form-path="${esc(id)}"${format?` data-form-format="${format}"`:''}${syncWard}${syncGuardian}>`;
  const wrappedInput=isDollarField?`<div class="input-group"><span class="input-group-text">$</span>${inputHtml}</div>`:isPercentField?`<div class="input-group">${inputHtml}<span class="input-group-text">%</span></div>`:isSSN?`<div class="ssn-mask-wrap">${inputHtml}<button type="button" class="ssn-reveal-btn" aria-label="Show ${esc(label)}" data-form-action="toggle-ssn">${ic('lock',14)}</button></div>`:inputHtml;
  return `<div class="mb-2"><label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>${wrappedInput}</div>`;
}
// Filtered-autocomplete text input for county fields, using the same
// D['id']=this.value write convention as the other Simplified/Plan field helpers.
function countyInputS(id,label,val,req=false){
  return `<div class="mb-2"><label class="form-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>${countyAutocompleteHTML(id,val,id)}</div>`;
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
    <textarea class="form-control" id="${id}" rows="${rows}" data-form-path="${esc(id)}">${esc(val||'')}</textarea>
  </div>`;
}

function chkP(id,label,checked){
  return `<div class="form-check plan-check">
    <input class="form-check-input" type="checkbox" id="${id}" ${checked?'checked':''} data-form-path="${esc(id)}" data-form-value="boolean">
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
function yesNoCheckboxHTML(id,label,val,path,req,route){
  return `<div class="form-check plan-check">
    <input class="form-check-input" type="checkbox" id="${id}" ${val==='Yes'?'checked':''} data-form-path="${esc(path)}" data-form-value="yes-no"${route?` data-form-route="${esc(route)}"`:''}>
    <label class="form-check-label" for="${id}">${label}${req?'<span class="req">*</span>':''}</label>
  </div>`;
}
function yesNoCheckboxS(id,label,val,req=false){
  return yesNoCheckboxHTML(id,label,val,id,req);
}
function yesNoCheckboxD(label,val,setter,req=false){
  const id='chk_'+Math.random().toString(36).slice(2,9);
  const path=(setter.match(/D(?:\[['"]([^'"]+)['"]\]|\.([\w.[\]]+))\s*=/)||[]).slice(1).find(Boolean)||'';
  const route=(setter.match(/navigate\(['"]([^'"]+)['"]\)/)||[])[1];
  return yesNoCheckboxHTML(id,label,val,path,req,route);
}

// Inline radio group. Also used later for the Annual/Initial plans' 3-way
// ADL ratings ("no help" / "some assistance" / "cannot do at all"), which is
// why the options are a parameter rather than hardcoded Yes/No.
function radioP(id,label,val,options=['Yes','No'],req=false,hint=''){
  const name=`radio_${id}`;
  const btns=options.map((o,i)=>`
    <div class="form-check form-check-inline">
      <input class="form-check-input" type="radio" name="${name}" id="${id}_${i}" value="${esc(o)}" ${val===o?'checked':''} data-form-path="${esc(id)}">
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
    ${prev?`<button class="btn btn-outline-primary btn-sm" data-form-action="navigate" data-route="${esc(prev)}">← Back</button>`:'<span></span>'}
    ${next?`<button class="btn btn-primary btn-sm" data-form-action="navigate" data-route="${esc(next)}">Next →</button>`:`<button class="btn btn-primary btn-sm" data-form-action="navigate" data-route="/print">Preview & Export →</button>`}
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

// Used by src/features/plan-simplified/print.js (via window.tdSig) --
// stays here rather than moving into that lazily-imported module. Despite
// an earlier comment's claim, Plan Annual's print builder never actually
// called this: it uses its own local y()/line()/fld()/boxes() helpers
// instead (confirmed by a fresh read while extracting it, Milestone 4).
function tdSig(label,val){return td(label,val);}


// ═══════════════════════════════════════════════════════
// Simplified Annual Plan is extracted into src/features/plan-simplified/
// (Milestone 3, Phases B and C -- data/validation/pages, and print/PDF
// export). See src/features/simplified-accounting/index.js's header
// comment and the Milestone 3 plan for the pattern and reasoning. txtP/
// chkP/yesNoCheckboxS/radioP/pageNavS above stay here as legacy globals,
// reached via window by every extracted Plan module (Problem 3) -- with
// planMinor extracted in Milestone 6, all four Plan types now share them
// this way, and moving them into a shared core module is a separate
// restructuring not required by this milestone.
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
// Annual Guardianship Plan is extracted into src/features/plan-annual/
// (Milestone 4, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 4 plan for the pattern and reasoning. planQ/planCheckGroup
// immediately below, and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow further down, stay here as legacy globals -- despite
// sitting in what reads as "this section," they are not planAnnual-
// exclusive (Milestone 4 plan's "Design decisions"), and with planMinor
// extracted in Milestone 6 all four Plan types now reach them via window.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planAnnualFeatureBridge=null;
function getPlanAnnualFeatureBridge(){
  return _planAnnualFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanAnnualFeature());
}
async function mountPlanAnnualFeature(page){
  await getPlanAnnualFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanAnnualNav(container){
  await getPlanAnnualFeatureBridge().mountNav(container);
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

// pagePlanACover()..pagePlanASignatures() moved to
// src/features/plan-annual/index.js (Milestone 4, Phase A).

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

// validatePlanAnnual() moved to src/features/plan-annual/index.js
// (Milestone 4, Phase A).

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
  // planReadinessChecksSimplified()/planReadinessChecksAnnual()/
  // planReadinessChecksInitial()/planReadinessChecksMinor() moved to their
  // respective feature modules' print.js (Milestones 3, 4, 5 and 6), reached
  // via window since this dispatcher is shared across all four Plan types
  // and can't import any of them directly.
  return activeInventoryType==='planAnnual'  ? window.planReadinessChecksAnnual()
    : activeInventoryType==='planInitial'    ? window.planReadinessChecksInitial()
    : activeInventoryType==='planMinor'      ? window.planReadinessChecksMinor()
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
// src/features/plan-simplified/print.js (Milestone 3, Phase C).

// planReadinessChecksAnnual()/docHeaderPlanAnnual()/buildPrintHTMLPlanAnnual()/
// pagePrintPlanAnnual()/doSavePdfPlanAnnual() moved to
// src/features/plan-annual/print.js (Milestone 4, Phase B). The lazy
// module bridge in that feature's index.js exposes doSavePdfPlanAnnual and
// planReadinessChecksAnnual on window so legacy-app.js's shared
// planReadinessChecks() dispatcher and the print page's
// onclick="doSavePdfPlanAnnual()" still resolve.

// ═══════════════════════════════════════════════════════
// Initial Guardianship Plan is extracted into src/features/plan-initial/
// (Milestone 5, Phase A -- data/validation/pages; print/PDF export stays
// here as legacy until Phase B). See src/features/plan-simplified/index.js's
// header comment and the Milestone 5 plan for the pattern and reasoning.
// planQ/planCheckGroup (defined above, in the Plan Annual section) and
// planEmptyRow/addPlanRow/removePlanRow/duplicatePlanRow (further below)
// stay legacy globals, reached via window (see the Plan Minor section
// below for why this no longer depends on any type being "not yet
// extracted"). INITIAL_ADLS/INITIAL_ADL_RATINGS/emptyInitialProvider stay
// legacy because computeNavChecks()'s planInitial branch reads them
// directly.
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planInitialFeatureBridge=null;
function getPlanInitialFeatureBridge(){
  return _planInitialFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanInitialFeature());
}
async function mountPlanInitialFeature(page){
  await getPlanInitialFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanInitialNav(container){
  await getPlanInitialFeatureBridge().mountNav(container);
}

// buildNavPlanInitial()..pagePlanIAttorney()/validatePlanInitial() moved to
// src/features/plan-initial/index.js (Milestone 5, Phase A).

// ═══════════════════════════════════════════════════════
// Annual Plan -- Minors is extracted into src/features/plan-minor/
// (Milestone 6, Phases A and B -- data/validation/pages, and print/PDF
// export). See src/features/plan-simplified/index.js's header comment and
// the Milestone 6 plan for the pattern and reasoning. This was the fourth
// and last Plan-family type, so planQ/planCheckGroup (defined above, in the
// Plan Annual section) and planEmptyRow/addPlanRow/removePlanRow/
// duplicatePlanRow (further below) now have no not-yet-extracted Plan type
// left to be shared with -- they stay legacy globals regardless, since
// every extracted Plan module already reaches them via window, and moving
// them into a shared core module is a separate restructuring not required
// by this milestone (see the Milestone 4/5 plans' deferred
// features/plans/ restructuring note).
//
// window.createFeatureBridge() is constructed lazily, not at this file's
// top level -- see getSimplifiedFeatureBridge()'s comment (above, in the
// Simplified Accounting section) for why.
let _planMinorFeatureBridge=null;
function getPlanMinorFeatureBridge(){
  return _planMinorFeatureBridge??=window.createFeatureBridge(()=>window.loadPlanMinorFeature());
}
async function mountPlanMinorFeature(page){
  await getPlanMinorFeatureBridge().mountPage(document.getElementById('main-content'),page);
}
async function mountPlanMinorNav(container){
  await getPlanMinorFeatureBridge().mountNav(container);
}

// buildNavPlanMinor()..pagePlanMPreparerAttorney()/validatePlanMinor() moved
// to src/features/plan-minor/index.js (Milestone 6, Phase A).

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
function n(v){return parseFloat(v)||0;}
function pct(v){const p=parseFloat(v);return isNaN(p)?0:p>1?p/100:p;}

// calcTotalsAnnual() and annualReconcileState() moved to src/features/annual-accounting/totals.js (Milestone 19E).
// Eagerly loaded via src/features-loader.js to serve as the single source of truth across
// the dashboard, forms, preview, Excel export, and accessible PDF generation.


// fmtD()/fmtAnnual()/DISB_CATS/docHdr()/sl()/slR()/buildPrintHTMLAnnual()
// moved to src/features/annual-accounting/print.js (Milestone 7, Phase B).

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
// Initial Inventory (feature-owned GUARDIAN_EXCEL_CAPS, in
// src/features/guardian-inventory/excel.js) overflows differently from the
// other two types: its fillScheduleXX() helpers walk a fixed list of
// template pages, and once the slots run out pageIdx runs past the end of
// pages[], so `pages[pageIdx].name` throws. The export then dies in its
// catch block and prints the raw TypeError into a status line that clears
// itself after three seconds — no file, no usable explanation. Same guard
// as the other types turns that into a clear, actionable message.

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
        <button type="button" class="validation-go" data-form-action="navigate" data-route="${esc(o.route)}">Go to section ${ic('external',13)}</button>
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


// pagePrintAnnual()/doSavePdfAnnual() moved to
// src/features/annual-accounting/print.js (Milestone 7, Phase B).

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

// doSaveExcelAnnual()/importExcelAnnual() moved to
// src/features/annual-accounting/excel.js (Milestone 7, Phase B).


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
window.mk=mk;

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
window.calc=calc;

// ═══════════════════════════════════════════════════════
// Page navigation helper moved to src/features/guardian-inventory/index.js
// (Milestone 8, Phase A), but legacy validation-derived nav checks still
// use this shared schedule key list synchronously.
const SCHEDULE_NAV_KEYS=['a1','a2','b1','b2','b3','b4','c1','c2','c3','c4','c5'];
window.SCHEDULE_NAV_KEYS=SCHEDULE_NAV_KEYS;
// A schedule's own "Next" button is disabled until computeNavChecks()
// says that schedule is complete (a real row, or the "no items" checkbox).
// afterChange() stays legacy in Milestone 8A and still needs this helper.
function isScheduleIncomplete(route){
  const key=route.startsWith('/')?route.slice(1):route;
  if(!SCHEDULE_NAV_KEYS.includes(key))return false;
  const r=computeNavChecks();
  return !!(r&&!r.checks[key]);
}
// ═══════════════════════════════════════════════════════
// FORM BINDING ENGINE
// ═══════════════════════════════════════════════════════
function toggleSsnReveal(btn){
  const input=btn.previousElementSibling;
  const revealing=input.type==='password';
  input.type=revealing?'text':'password';
  btn.setAttribute('aria-label',revealing?'Hide SSN/EIN':'Show SSN/EIN');
  btn.innerHTML=ic(revealing?'unlock':'lock',14);
}
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
    ${nextRoute?`<button type="button" class="ward-progress-jump" data-form-action="navigate" data-route="${esc(nextRoute)}">${ic('external',13)} Jump to ${esc(jumpLabel)}</button>`:''}`;
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

// Guardian page renderers moved to src/features/guardian-inventory/index.js
// (Milestone 8, Phase A). linkAccordions() stays shared because the
// extracted Cover page still calls it after mounting.
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
      <button type="button" class="btn btn-sm btn-outline-danger" data-form-action="remove-schedule-doc" data-schedule-key="${esc(scheduleKey)}" data-document-index="${i}">×</button>
    </div>`).join(''):`<div class="sched-doc-empty">No supporting documents uploaded${activeInventoryType==='guardian'?'':' for this period'}.</div>`;
  const inputId=`sched-doc-input-${scheduleKey}`;
  return `<div class="schedule-docs-section no-print">
    <h4>Supporting Documents${periodNote}</h4>
    <p class="schedule-docs-hint">Attach receipts, statements, or other records supporting this schedule. Stored on this device only, encrypted with the rest of this ward's data.</p>
    <input type="file" id="${inputId}" multiple style="display:none" data-form-change="schedule-doc-upload" data-schedule-key="${esc(scheduleKey)}">
    <button type="button" class="btn btn-outline-primary btn-sm mb-2" data-form-action="choose-schedule-docs" data-input-id="${esc(inputId)}">+ Upload File(s)</button>
    <div class="sched-doc-list">${filesHtml}</div>
    <h4 class="mt">Comments</h4>
    <textarea class="form-control" rows="3" placeholder="Notes about this schedule…" data-form-input="schedule-comment" data-schedule-key="${esc(scheduleKey)}">${esc(slot.comment)}</textarea>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// td()/tdR() emit display:table-row divs (not real <table> markup) — used only
// for the key-value "layout" blocks (Required Info, schedule totals, audit
// fee, etc). display:table-row/table-cell renders pixel-identical to a real
// table, but isn't flagged by accessibility tools as a misused layout table.
function td(...cols){return `<div class="tr">${cols.map(c=>`<div class="td">${c||''}</div>`).join('')}</div>`;}
function tdR(...cols){// last col right-aligned
  const all=cols.map((c,i)=>i===cols.length-1?`<div class="td right">${c||''}</div>`:`<div class="td">${c||''}</div>`);
  return `<div class="tr">${all.join('')}</div>`;
}
// th()/totRow()/printEmptyRow()/docHeader() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B) --
// Guardian-only, unlike td()/tdR() above which stay legacy/shared with
// Annual's print.js.

function validate(){
  return window.validateGuardian();
}

// pagePrint()/buildPrintHTML() moved to
// src/features/guardian-inventory/print.js (Milestone 8, Phase B).

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

// pagePrint()/buildPrintHTML()/doSavePdf()/doSaveExcel()/importExcelFile()/
// parseInitialInventoryWorkbook()/GUARDIAN_EXCEL_CAPS moved to
// src/features/guardian-inventory/print.js and excel.js (Milestone 8, Phase B).

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.nav-link-item[data-page]').forEach(btn=>{
  btn.addEventListener('click',()=>navigate(btn.dataset.page));
});

// Hash-based routing
// Page routes for current wizard (dynamically set based on activeInventoryType)
const PAGES_SIMPLIFIED=[
  {id:'/',        label:'Cover & Part I'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'Part II'},
  {id:'/p3',   label:'Part III'},
  {id:'/p4',   label:'Part IV'},
  {id:'/p5',   label:'Part V'},
  {id:'/p6',   label:'Part VI'},
  {id:'/p7',   label:'Part VII'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_ANNUAL=[
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
const PAGES_PLAN_SIMPLIFIED=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'The Plan'},
  {id:'/p3',   label:'Signatures'},
  {id:'/print',label:'Print Preview'},
];
const PAGES_PLAN_ANNUAL=[
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'1. Residences'},
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
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'2–3. Setting & Medical Care'},
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
  {id:'/',        label:'Cover'},
  {id:'/summary', label:'Summary'},
  {id:'/p2',      label:'2. Prior Residences'},
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
async function handleHash(){
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
    const ok = await activateWard(activeWard);
    if (!ok) {
      window.location.hash = '/dashboard';
    }
  }

  updateSidebar();
  if(_openedFileAtLaunch || !guardianData.activeWardId)window.location.hash='/dashboard'; // opened an existing case or blocked — land on All Wards, not wherever it was last saved mid-edit
  handleHash();
  await loadAutoExportPrefs();
  setupAutoExportTimer();
  setupLastSavedTicker();
  setupFallbackSaveReminder();
  setupDragAndDropImport();
  notifyProbateGuardianTabStateChanged();
  window.addEventListener('beforeunload',warnBeforeUnloadIfDirty);
  if(_needsMigrationModal){
    _needsMigrationModal=false;
    try{
      await showMigrationModal();
    }catch(e){
      console.warn('Could not show migration modal at launch:',e);
    }
  }
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

// Milestone 16: Modal helpers
let _wardLockedPreviousFocus = null;

window.showWardLockedModal = function() {
  const el = document.getElementById('ward-locked-overlay');
  if (el) {
    _wardLockedPreviousFocus = document.activeElement;
    el.classList.add('show');
    const btn = document.getElementById('close-ward-locked');
    if (btn) btn.focus();
  }
};
window.closeWardLockedModal = function() {
  const el = document.getElementById('ward-locked-overlay');
  if (el) {
    el.classList.remove('show');
    if (_wardLockedPreviousFocus && typeof _wardLockedPreviousFocus.focus === 'function') {
      try { _wardLockedPreviousFocus.focus(); } catch (e) {}
      _wardLockedPreviousFocus = null;
    }
  }
};

// Start
setTimeout(()=>{
  linkLabelsToInputs();
},0);
initApp();
