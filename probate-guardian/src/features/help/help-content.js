import { hasSixthCircuitLocalGuidance } from '../../core/filing/county-guidance.js';

export const HELP_CONTENT = Object.freeze({
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
    // content is a function (not the plain string every other entry uses)
    // because the Disaster Plan paragraph is Sixth Circuit (Pinellas/Pasco)
    // local guidance -- see core/filing/county-guidance.js -- gated on the active filing's county
    // per Milestone 37-1. showContextualHelp() calls this at render time so
    // it stays current across a county change or a filing switch.
    content: () => `<div class="help-section-title">Plan vs. Accounting</div>
    <p>A <strong>Plan</strong> reports on the ward as a person — where they live, the care they receive, their abilities. An <strong>Accounting</strong> reports on their money and property. These are two separate court filings.</p>
    <p>If you are guardian of both the person and the property, you file one of each. Create a separate form for each and give both the same case number — the dashboard will group them together.</p>
    <div class="help-section-title">When It's Due</div>
    <p>Within <strong>60 days</strong> after the Letters of Guardianship are signed (F.S. 744.362(1)) — this is a shorter deadline than the Annual Plan's 90 days. This is the very first person-side filing after a guardianship of the person is established, and it remains in effect until it's amended or replaced by an Annual Guardianship Plan.</p>
    ${hasSixthCircuitLocalGuidance(typeof window !== 'undefined' ? window.D?.county : undefined) ? `<div class="help-section-title">Don't Forget the Disaster Plan</div>
    <p>Local Sixth Judicial Circuit requirement (Administrative Order): a separate <strong>Disaster Plan</strong> must be filed alongside every initial guardianship plan, covering how the ward's needs will be met if the guardian or ward must relocate in an emergency. <strong>The app does not produce that document</strong> — you file it separately. If the ward is a minor child residing with their parent or another relative who is serving as guardian, that guardian is exempt from this requirement.</p>` : ''}
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
    <p>Use the <strong>Save Backup (.sav)</strong> button to download an encrypted backup. Store this file safely—it's your safeguard if your device is lost or damaged.</p>
    <div class="help-section-title">Auto-Save</div>
    <p>Adjust the Auto-Save interval (5 min, 10 min, 30 min, or Off) to control how often backups are created.</p>
    <div class="help-section-title">Restoring from Backup</div>
    <p>Use <strong>Open Backup (.sav)</strong> to restore from a backup file you previously saved.</p>
    <div class="help-section-title">Activity Log</div>
    <p>Every unlock and backup made on this device is recorded in the Activity Log, linked at the bottom of this help panel — useful for confirming a backup actually ran.</p>`
  }
});

if (typeof window !== 'undefined') {
  window.HELP_CONTENT = HELP_CONTENT;
}
