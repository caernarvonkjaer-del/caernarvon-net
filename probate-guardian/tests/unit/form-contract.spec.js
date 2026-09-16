import { describe, it, expect, beforeEach, afterEach } from 'vitest';
global.window = global;
import {
  sanitizeStoredText,
  formatSafeTitleCase,
  formatCityStateZip,
  isMalformedCityStateZip,
  writeDraftValue,
  finalizeFieldValue,
  commitPendingFieldValues,
  getFieldDraftIssueMessages,
  yesNoText,
  triStateText,
  isTriStateAnswer,
  getControlKind,
  getControlPolicy,
} from '../../src/core/form/form-contract.js';
import { attributeBag, classListBag } from './support/dom-mocks.js';

function createMockInput(initial = {}) {
  return {
    value: initial.value || '',
    dataset: initial.dataset || {},
    type: initial.type || 'text',
    checked: initial.checked || false,
    classList: classListBag(initial.classes || []),
    ...attributeBag(),
  };
}

describe('form-contract', () => {
  beforeEach(() => {
    window.D = {};
    window._transientDrafts = {};
    window.setPath = (obj, path, val) => {
      const parts = path.split('.');
      let cur = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = val;
    };
    window.getPath = (obj, path) => {
      return path.split('.').reduce((acc, k) => acc?.[k], obj);
    };
    window.autoSave = () => {};
    window.updateNavDots = () => {};
    window.refreshWardInfoCard = () => {};
  });

  describe('sanitizeStoredText', () => {
    it('preserves legal and account identifier punctuation and characters', () => {
      expect(sanitizeStoredText('SNT-2024-778')).toBe('SNT-2024-778');
      expect(sanitizeStoredText('25-002487-GD')).toBe('25-002487-GD');
      expect(sanitizeStoredText('Acct 123-45 / POD')).toBe('Acct 123-45 / POD');
      expect(sanitizeStoredText('CHK-104A')).toBe('CHK-104A');
      expect(sanitizeStoredText('Trust u/a/d 04/12/2020')).toBe('Trust u/a/d 04/12/2020');
      expect(sanitizeStoredText("Ward's Trust (Special Needs)")).toBe("Ward's Trust (Special Needs)");
    });

    it('removes control characters and trims outer whitespace', () => {
      expect(sanitizeStoredText('  Sample Text\u0000\u0007\u001F  ')).toBe('Sample Text');
      expect(sanitizeStoredText(null)).toBe('');
      expect(sanitizeStoredText(undefined)).toBe('');
    });
  });

  describe('formatSafeTitleCase', () => {
    it('capitalizes purely lowercase words without uppercasing 2-letter honorifics, suffixes, or short names', () => {
      expect(formatSafeTitleCase('john doe')).toBe('John Doe');
      expect(formatSafeTitleCase('dr. sarah chen')).toBe('Dr. Sarah Chen');
      expect(formatSafeTitleCase('harold t. bennett jr.')).toBe('Harold T. Bennett Jr.');
      expect(formatSafeTitleCase('ed smith')).toBe('Ed Smith');
      expect(formatSafeTitleCase('main street')).toBe('Main Street');
      expect(formatSafeTitleCase('1425 sunset dr.')).toBe('1425 Sunset Dr.');
      expect(formatSafeTitleCase('100 oak st.')).toBe('100 Oak St.');
    });

    it('preserves uppercase acronyms and mixed-case names untouched', () => {
      expect(formatSafeTitleCase('SSI Benefit')).toBe('SSI Benefit');
      expect(formatSafeTitleCase('USAA Federal Savings')).toBe('USAA Federal Savings');
      expect(formatSafeTitleCase('Acme Holdings LLC')).toBe('Acme Holdings LLC');
      expect(formatSafeTitleCase("Jane O'Connor")).toBe("Jane O'Connor");
      expect(formatSafeTitleCase('Robert McLeod')).toBe('Robert McLeod');
    });

    // Milestone 40H-G: standard title-case convention -- minor connecting
    // words stay lowercase mid-phrase. Before this, every purely-lowercase
    // word capitalized unconditionally, turning "Sunrise Assisted Living of
    // Clearwater" into "...Living Of Clearwater".
    it('keeps minor connecting words lowercase mid-phrase, but capitalizes one as the first word', () => {
      expect(formatSafeTitleCase('sunrise assisted living of clearwater')).toBe('Sunrise Assisted Living of Clearwater');
      expect(formatSafeTitleCase('sale of ward\'s homestead')).toBe('Sale of ward\'s Homestead');
      expect(formatSafeTitleCase('bank of america')).toBe('Bank of America');
      expect(formatSafeTitleCase('of counsel')).toBe('Of Counsel');
      expect(formatSafeTitleCase('the guardian and the ward')).toBe('The Guardian and the Ward');
    });
  });

  describe('formatCityStateZip', () => {
    it('uppercases valid 2-letter state abbreviations while preserving city prefix title casing and zips', () => {
      expect(formatCityStateZip('tampa, fl 33602')).toBe('Tampa, FL 33602');
      expect(formatCityStateZip('tampa, fl')).toBe('Tampa, FL');
      expect(formatCityStateZip('st. petersburg, fl')).toBe('St. Petersburg, FL');
      expect(formatCityStateZip('mt. dora, fl 32757')).toBe('Mt. Dora, FL 32757');
      expect(formatCityStateZip('port st. lucie, fl 34984')).toBe('Port St. Lucie, FL 34984');
      expect(formatCityStateZip('ft. lauderdale, fl')).toBe('Ft. Lauderdale, FL');
      expect(formatCityStateZip('new york, ny 10001')).toBe('New York, NY 10001');
      expect(formatCityStateZip('33602')).toBe('33602');
      expect(formatCityStateZip('33602-1234')).toBe('33602-1234');
    });

    // Milestone 50C. A walkthrough reported these two literals folding into
    // a ZIP field; verified 2026-09-14 against current master (not
    // reproduced -- formatCityStateZip() never moves text between fields;
    // it only formats the one field it's given, and these two inputs are
    // simply shapes it declines to touch). Closed as not-reproducing, but
    // pinned here as the durable deliverable: a "we said we'd fixed X" claim
    // with no permanent test coverage is exactly how a regression could
    // slip in unnoticed, whether or not this specific report was accurate.
    // See MILESTONE-50-PROPOSAL.md's 50C "Verified" section.
    it('leaves malformed input unchanged rather than guessing -- these are the exact literals the walkthrough reported', () => {
      // No separator before the state code: the per-word regex requires a
      // token to be all-letters (or all-digits) to reformat it; a token
      // mixing letters and digits with no space passes through untouched.
      expect(formatCityStateZip('St.Petersburg,FL33704')).toBe('St.Petersburg,FL33704');
      // A lone word with an interior capital: deliberately NOT title-cased,
      // because the same rule that would fix "MAlvern" -> "Malvern" would
      // also flatten legitimately mixed-case Florida names on a court
      // document -- see the next test.
      expect(formatCityStateZip('MAlvern')).toBe('MAlvern');
    });

    it('never flattens an already-mixed-case name -- the guard the previous test\'s behavior protects', () => {
      // These are genuine Florida surnames/place names typed with their
      // correct interior capital already in place, not typos. If a future
      // "fix" for the MAlvern case above starts title-casing any word
      // containing an uppercase letter, these break -- that is the point:
      // it documents why formatCityStateZip() leaves such words alone
      // rather than "repairing" them. (A fully-lowercase "mckinney" still
      // gets title-cased to "Mckinney" by the existing, unrelated
      // all-lowercase branch -- that is pre-existing behavior, unrelated to
      // the interior-capital guard this test pins.)
      expect(formatCityStateZip('McKinney, FL')).toBe('McKinney, FL');
      expect(formatCityStateZip('DeLand, FL 32720')).toBe('DeLand, FL 32720');
      expect(formatCityStateZip("O'Brien, FL")).toBe("O'Brien, FL");
    });
  });

  // Milestone 50C, decision made 2026-09-15: flag a malformed entry to the
  // filer rather than silently repair it or leave it silently as typed.
  // isMalformedCityStateZip() is deliberately narrow -- a letter run
  // immediately followed by 4+ digits -- so it catches the reported
  // no-separator shape without also flagging legitimate punctuation-only
  // words the formatter already leaves alone on purpose (O'Brien,
  // Winter-Haven), which a broader "the formatter's regex didn't match"
  // check would have caught too.
  describe('isMalformedCityStateZip', () => {
    it('flags a state/zip run glued directly onto letters with no separating space', () => {
      expect(isMalformedCityStateZip('St.Petersburg,FL33704')).toBe(true);
      expect(isMalformedCityStateZip('Tampa33602')).toBe(true);
    });

    it('does not flag well-formed entries, digit-only zips, or the pre-existing punctuation-guard words', () => {
      expect(isMalformedCityStateZip('Tampa, FL 33602')).toBe(false);
      expect(isMalformedCityStateZip('Tampa')).toBe(false);
      expect(isMalformedCityStateZip('33602')).toBe(false);
      expect(isMalformedCityStateZip('33602-1234')).toBe(false);
      expect(isMalformedCityStateZip('MAlvern')).toBe(false);
      expect(isMalformedCityStateZip("O'Brien, FL")).toBe(false);
      expect(isMalformedCityStateZip('Winter-Haven, FL')).toBe(false);
      expect(isMalformedCityStateZip('')).toBe(false);
    });
  });

  describe('writeDraftValue & finalizeFieldValue two-phase commit', () => {
    it('keeps unparsed date drafts transient during input and canonicalizes on blur', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: 'Feb 14, 2026',
      });

      // 1. writeDraftValue (input event)
      writeDraftValue(input);
      // Model remains empty during typing
      expect(window.D.periodFrom).toBeUndefined();
      expect(window._transientDrafts.periodFrom).toBe('Feb 14, 2026');

      // 2. finalizeFieldValue (blur event)
      finalizeFieldValue(input);
      expect(window.D.periodFrom).toBe('2026-02-14');
      expect(input.value).toBe('02/14/2026');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(window._transientDrafts.periodFrom).toBeUndefined();
    });

    it('auto-masks unpunctuated 8-digit dates live during input and commits on blur', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodTo', fieldKind: 'date' },
        value: '07102027',
      });

      // 1. writeDraftValue (input event with 8 digits)
      writeDraftValue(input);
      // Automatically formatted to display format live
      expect(input.value).toBe('07/10/2027');
      expect(window._transientDrafts.periodTo).toBe('07/10/2027');
      expect(window.D.periodTo).toBeUndefined();

      // 2. finalizeFieldValue (blur event)
      finalizeFieldValue(input);
      expect(window.D.periodTo).toBe('2027-07-10');
      expect(input.value).toBe('07/10/2027');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.classList.contains('is-invalid')).toBe(false);
      expect(window._transientDrafts.periodTo).toBeUndefined();
    });

    it('canonicalizes unpunctuated 8-digit dates on blur even if unmasked', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'gid', fieldKind: 'date' },
        value: '07102026',
      });

      finalizeFieldValue(input);
      expect(window.D.gid).toBe('2026-07-10');
      expect(input.value).toBe('07/10/2026');
      expect(input.hasAttribute('aria-invalid')).toBe(false);
      expect(input.classList.contains('is-invalid')).toBe(false);
    });

    it('sets aria-invalid on blur when date text cannot be parsed', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: '02/30/2026', // invalid date
      });

      finalizeFieldValue(input);
      expect(window.D.periodFrom).toBeUndefined();
      expect(input.value).toBe('02/30/2026'); // stays visible
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.classList.contains('is-invalid')).toBe(true);
      expect(getFieldDraftIssueMessages()).toContain('Date entry - periodFrom must be a valid date using a four-digit year.');
    });

    it('sets aria-invalid on blur when 8-digit unpunctuated date is impossible calendar date', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: '13012026', // invalid month 13
      });

      finalizeFieldValue(input);
      expect(window.D.periodFrom).toBeUndefined();
      expect(input.value).toBe('13012026');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.classList.contains('is-invalid')).toBe(true);
    });

    it('keeps a prior committed date when a later draft is invalid', () => {
      window.D.periodFrom = '2026-02-14';
      const input = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date', fieldLabel: 'Period From' },
        value: '02/30/2026',
      });

      writeDraftValue(input);
      finalizeFieldValue(input);

      expect(window.D.periodFrom).toBe('2026-02-14');
      expect(window.D.__fieldDrafts.periodFrom.rawValue).toBe('02/30/2026');
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });

    it('does not let a stale rendered date control overwrite programmatic state', () => {
      window.D.periodFrom = '2026-02-14';
      const staleControl = createMockInput({
        dataset: { fieldPath: 'periodFrom', fieldKind: 'date' },
        value: '',
      });

      commitPendingFieldValues({ querySelectorAll: () => [staleControl] });

      expect(window.D.periodFrom).toBe('2026-02-14');
    });

    it('writes non-date fields directly on input and cleans on blur', () => {
      const input = createMockInput({
        dataset: { fieldPath: 'caseNumber', fieldKind: 'identifier' },
        value: '25-002487-GD',
      });

      writeDraftValue(input);
      expect(window.D.caseNumber).toBe('25-002487-GD');

      input.value = '  25-002487-GD\u0000  ';
      finalizeFieldValue(input);
      expect(window.D.caseNumber).toBe('25-002487-GD');
      expect(input.value).toBe('25-002487-GD');
    });
  });

  describe('yesNoText (read side of the yes-no contract)', () => {
    it('round-trips the strings the write side actually stores', () => {
      // writeDraftValue()/finalizeFieldValue() store these literals for any
      // control marked data-form-value="yes-no".
      expect(yesNoText('Yes')).toBe('Yes');
      expect(yesNoText('No')).toBe('No');
    });

    it("reports 'No' for a field the filer never answered", () => {
      // The bug this exists to prevent: 'No' is a truthy non-empty string, so
      // `d.amendedForm ? 'Yes' : 'No'` printed "Yes" in all three states.
      expect(yesNoText('')).toBe('No');
      expect(yesNoText(undefined)).toBe('No');
      expect(yesNoText(null)).toBe('No');
    });

    it('accepts real booleans from forms that store them that way', () => {
      expect(yesNoText(true)).toBe('Yes');
      expect(yesNoText(false)).toBe('No');
    });

    it('tolerates casing and stray whitespace from imported files', () => {
      expect(yesNoText('  yes ')).toBe('Yes');
      expect(yesNoText('NO')).toBe('No');
    });

    it('leaves an unanswered field blank when the caller asks for that', () => {
      expect(yesNoText('', '')).toBe('');
      expect(yesNoText('Yes', '')).toBe('Yes');
    });

    it('falls back to the blank value for unrecognized junk', () => {
      expect(yesNoText('maybe')).toBe('No');
      expect(yesNoText(0)).toBe('No');
    });
  });

  it('triStateText preserves unanswered distinct from explicit No', () => {
    expect(triStateText(undefined)).toBe('');
    expect(triStateText(null)).toBe('');
    expect(triStateText(false)).toBe('No');
    expect(triStateText(true)).toBe('Yes');
    expect(isTriStateAnswer(undefined)).toBe(false);
    expect(isTriStateAnswer(false)).toBe(true);
    expect(isTriStateAnswer('No')).toBe(true);
  });

  describe('getControlKind & boundary inference', () => {
    it('classifies checkbox and radio controls as boolean regardless of path substrings', () => {
      const chk = createMockInput({
        type: 'checkbox',
        dataset: { formPath: 'committeeIncorporated', formValue: 'yes-no' },
        checked: true,
      });
      expect(getControlKind(chk)).toBe('boolean');
    });

    it('does not classify mid-word ein substring in committeeIncorporated as ssn', () => {
      const textInput = createMockInput({
        type: 'text',
        dataset: { formPath: 'committeeIncorporated' },
      });
      expect(getControlKind(textInput)).toBe('text');
    });

    it('classifies genuine EIN identifiers as ssn', () => {
      const einInput = createMockInput({
        type: 'text',
        dataset: { formPath: 'guardian.ein' },
      });
      expect(getControlKind(einInput)).toBe('ssn');
    });

    // Milestone 43C: consolidated from types-contract.spec.js and
    // field-kind-inference.spec.js's own duplicate path/kind pairs -- this
    // describe block is getControlKind()'s one canonical home. Kept every
    // pair the two removed copies covered that wasn't already here.
    const kindOf = (path, extra = {}) => getControlKind(createMockInput({ type: 'text', dataset: { formPath: path, ...extra } }));

    it('classifies further identifier/name/zip/address/date fields by whole word (from types-contract.spec.js)', () => {
      expect(kindOf('caseNumber')).toBe('identifier');
      expect(getControlPolicy(createMockInput({ type: 'text', dataset: { formPath: 'caseNumber' } }))).toBe('preserve');
      const dateEl = createMockInput({ type: 'date', dataset: { formPath: 'periodFrom' } });
      expect(getControlKind(dateEl)).toBe('date');
      expect(getControlPolicy(dateEl)).toBe('normalize');
      expect(kindOf('wardName')).toBe('name');
      expect(getControlPolicy(createMockInput({ type: 'text', dataset: { formPath: 'wardName' } }))).toBe('display-only');
    });

    it('classifies genuine identifier fields by whole word (from field-kind-inference.spec.js)', () => {
      expect(kindOf('preparer.ssnEin')).toBe('ssn');
      expect(kindOf('ssn_ein')).toBe('ssn');
      expect(kindOf('attorney_bar_number')).toBe('identifier');
      expect(kindOf('guardianNames')).toBe('name');
      expect(kindOf('mailingCityStateZip')).toBe('zip');
      expect(kindOf('mailingStreet')).toBe('address');
      expect(kindOf('certServiceDate')).toBe('date');
    });

    it('retains Yes and No on yes-no checkbox finalize without SSN erasure', () => {
      window.formatSSN = (s) => String(s || '').replace(/\D/g, '');
      const chk = createMockInput({
        type: 'checkbox',
        dataset: { formPath: 'committeeIncorporated', formValue: 'yes-no' },
        checked: true,
      });
      finalizeFieldValue(chk);
      expect(window.D.committeeIncorporated).toBe('Yes');

      chk.checked = false;
      finalizeFieldValue(chk);
      expect(window.D.committeeIncorporated).toBe('No');
    });
  });

  // Annual/Final/Trust Accounting's own persistAnnualControl() write path was
  // retired in favour of this one; these are the formats only it had, now
  // keyed by attribute here so every filing type shares one implementation.
  describe('accounting-family formats absorbed from persistAnnualControl()', () => {
    beforeEach(() => {
      // Verbatim copies of legacy-app.js's helpers -- classic-script globals
      // at runtime, which this Node suite has to supply itself.
      window.sanitizeNonNegativeDecimal = (s) => {
        let v = String(s || '').replace(/[^0-9.]/g, '');
        const firstDot = v.indexOf('.');
        if (firstDot !== -1) v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
        return v;
      };
      window.sanitizeDecimal = (s) => {
        const str = String(s || '');
        return (str.trim().startsWith('-') ? '-' : '') + window.sanitizeNonNegativeDecimal(str);
      };
      window.applyZipLimit = (el) => {
        const digitCount = (el.value.match(/\d/g) || []).length;
        if (digitCount > 9) {
          const arr = el.value.split('');
          let removed = 0;
          for (let i = arr.length - 1; i >= 0 && removed < digitCount - 9; i--) {
            if (/\d/.test(arr[i])) { arr.splice(i, 1); removed++; }
          }
          el.value = arr.join('');
        }
      };
      window.validateSecurityInput = (_label, v) => String(v).replace(/[<>"`]/g, '');
      window.formatSSN = (s) => {
        const digits = String(s || '').replace(/\D/g, '').slice(0, 9);
        if (digits.length === 0) return '';
        if (digits.length <= 3) return digits;
        if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
      };
    });
    afterEach(() => {
      delete window.sanitizeNonNegativeDecimal;
      delete window.sanitizeDecimal;
      delete window.applyZipLimit;
      delete window.validateSecurityInput;
      delete window.formatSSN;
    });

    it('formats an SSN on blur even though renderFormField() stamps it policy="preserve"', () => {
      // The generic preserve branch used to sit above the ssn branch and
      // catch every renderer-built SSN field first, so blur left the raw
      // digits that the next render would then dash. Annual's retired write
      // path inserted the dashes itself; the shared one now does too.
      const ssn = createMockInput({ dataset: { fieldPath: 'guardians.0.ssn', fieldKind: 'ssn', fieldFormatPolicy: 'preserve' }, value: '123456789' });
      finalizeFieldValue(ssn);
      expect(ssn.value).toBe('123-45-6789');
      expect(window.D.guardians[0].ssn).toBe('123-45-6789');
    });

    it('classifies data-annual-format="signed-decimal" as signed-money with the normalize policy', () => {
      const loss = createMockInput({ dataset: { annualPath: 'schC.0.loss', annualFormat: 'signed-decimal' } });
      expect(getControlKind(loss)).toBe('signed-money');
      expect(getControlPolicy(loss)).toBe('normalize');
    });

    it('keeps a leading minus on a signed-money field, filtering live, and stores a Number on blur', () => {
      const loss = createMockInput({ dataset: { annualPath: 'schC.0.loss', annualFormat: 'signed-decimal' }, value: '-1,250.5' });
      writeDraftValue(loss);
      expect(loss.value).toBe('-1250.5');
      expect(window.D.schC[0].loss).toBe('-1250.5');
      finalizeFieldValue(loss);
      expect(window.D.schC[0].loss).toBe(-1250.5);
      expect(loss.value).toBe('-1250.5');
    });

    it('keeps a lone minus as an in-progress draft rather than wiping it', () => {
      const loss = createMockInput({ dataset: { annualPath: 'schC.0.loss', annualFormat: 'signed-decimal' }, value: '-' });
      writeDraftValue(loss);
      expect(loss.value).toBe('-');
      expect(window.D.schC[0].loss).toBe('-');
    });

    it('filters a money field live on input (caret-safe character rejection, minus included) and stores a Number on blur', () => {
      const amount = createMockInput({ dataset: { fieldPath: 'schA.0.amount', fieldKind: 'money' }, value: '-1,000' });
      writeDraftValue(amount);
      expect(amount.value).toBe('1000');
      expect(window.D.schA[0].amount).toBe('1000');
      finalizeFieldValue(amount);
      expect(window.D.schA[0].amount).toBe(1000);
    });

    it('applies the nine-digit ZIP+4 cap before formatting City / State / Zip', () => {
      const zip = createMockInput({ dataset: { fieldPath: 'preparer.cityStateZip', fieldKind: 'zip' }, value: 'clearwater, fl 33755-43219' });
      finalizeFieldValue(zip);
      expect(zip.value).toBe('Clearwater, FL 33755-4321');
      expect(window.D.preparer.cityStateZip).toBe('Clearwater, FL 33755-4321');
    });

    // Milestone 50C: flag, don't silently repair or stay silent. The mock
    // control has no `document`/insertAdjacentElement, so this exercises the
    // is-invalid/aria-invalid half that still applies without a real DOM --
    // the message-element half is covered by the e2e regression guard
    // instead (form-entry.contract.spec.ts), which runs against a real page.
    it('flags a malformed city/state/zip entry as invalid on blur, and clears the flag once corrected', () => {
      const zip = createMockInput({ dataset: { fieldPath: 'preparer.cityStateZip', fieldKind: 'zip' }, value: 'St.Petersburg,FL33704' });
      finalizeFieldValue(zip);
      expect(zip.value).toBe('St.Petersburg,FL33704');
      expect(zip.classList.contains('is-invalid')).toBe(true);
      expect(zip.getAttribute('aria-invalid')).toBe('true');

      zip.value = 'st. petersburg, fl 33704';
      finalizeFieldValue(zip);
      expect(zip.value).toBe('St. Petersburg, FL 33704');
      expect(zip.classList.contains('is-invalid')).toBe(false);
      expect(zip.getAttribute('aria-invalid')).toBeNull();
    });

    it('runs the security sanitizer only on fields stamped data-field-sanitize="security"', () => {
      const optedIn = createMockInput({ dataset: { fieldPath: 'schC.0.description', fieldKind: 'text', fieldSanitize: 'security', fieldLabel: 'Description' }, value: '<b>Sale</b> of homestead' });
      finalizeFieldValue(optedIn);
      expect(window.D.schC[0].description).toBe('bSale/b of homestead');

      const plain = createMockInput({ dataset: { fieldPath: 'notes', fieldKind: 'text' }, value: '<b>Sale</b> of homestead' });
      finalizeFieldValue(plain);
      expect(window.D.notes).toBe('<b>Sale</b> of homestead');
    });
  });
});
