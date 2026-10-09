// Milestone 73N part 2: every question and certification the Plans and the
// accountings print is the court's own wording. Each entry of the court-text
// modules (src/core/filing/court-text/) is compared with the original it was
// taken from -- the Plans' with reference/plan-forms/*.txt, the accountings'
// with the Clerk's workbooks (templates/*-template.js) -- and each PDF model
// is shown to print the entries.
//
// Where an original has a plain typing error the app prints it corrected
// (decided by the requester, 2026-10-09). COURT_TEXT_CORRECTIONS names every
// one: it is applied to the original before the comparison, so a correction
// is never silent, and a new difference fails here until it is either fixed
// or named.
//
// Red-first: the court-text modules didn't exist, and the models printed
// shortened text ("...in accordance with them.", no "I have not audited the
// accompanying guardianship accounting").
import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { PLAN_SIMPLIFIED_TEXT } from '../../src/core/filing/court-text/plan-simplified.js';
import {
  PLAN_ANNUAL_CHOICES, PLAN_ANNUAL_DEVICES, PLAN_ANNUAL_DIRECTIVE_LABELS, PLAN_ANNUAL_TEXT,
  planAnnualAttorneyCertification, planAnnualMoveChoices, planAnnualNoRemuneration, planAnnualReceived,
} from '../../src/core/filing/court-text/plan-annual.js';
import { PLAN_INITIAL_BENEFITS, PLAN_INITIAL_CHOICES, PLAN_INITIAL_TEXT, planInitialAttorneyCertification } from '../../src/core/filing/court-text/plan-initial.js';
import { ANNUAL_DECLARATION, ANNUAL_RECEIPTS_CERTIFICATION, ATTORNEY_NOT_AUDITED } from '../../src/core/filing/court-text/accountings.js';
import { PLAN_ADLS, PLAN_RIGHTS } from '../../src/core/filing/models/plan-annual.js';
import { INITIAL_ADLS } from '../../src/core/filing/models/plan-initial.js';
import { buildPlanSimplifiedModel } from '../../src/features/plan-simplified/pdf-model.js';
import { buildPlanAnnualModel } from '../../src/features/plan-annual/pdf-model.js';
import { buildPlanInitialModel } from '../../src/features/plan-initial/pdf-model.js';
import { buildAnnualAccountingModel } from '../../src/features/annual-accounting/pdf-model.js';
import { buildSimplifiedAccountingModel } from '../../src/features/simplified-accounting/pdf-model.js';

const root = path.resolve(__dirname, '../..');

/** The originals' typing errors, as [original, printed]. */
export const COURT_TEXT_CORRECTIONS = {
  'plan-annual': [
    ['is or has been filed with this plan. plan.', 'is or has been filed with this plan.'],
    ['A The guardian states', 'A. The guardian states'],
    ['Other(Please Explain Below)', 'Other (Please Explain Below)'],
    ['the Annual Report of the Guardians(s) of the Person', 'the Annual Report of the Guardian(s) of the Person'],
    ['are( devices', 'are (devices'],
    ['char/bed', 'chair/bed'],
    ['any gift of disposition', 'any gift or disposition'],
    ['protect the Ward and other from', 'protect the Ward and others from'],
    // The rights are Question 6; the form's cross-reference said 5.
    ['any right in question 5,', 'any right in question 6,'],
    ['( a/k/a "DNR")', '(a/k/a "DNR")'],
  ],
  'plan-initial': [
    ["If the Wards' ability", "If the Ward's ability"],
    ["in accordance with the Wards' wishes", "in accordance with the Ward's wishes"],
    ['{FS 744.363(6)}', '[FS 744.363(6)]'],
    ['Walking Mobility', 'Walking/Mobility'],
    ['( a/k/a "DNR")', '(a/k/a "DNR")'],
  ],
  'plan-simplified': [],
  annual: [
    ['UNDER PENALITIES', 'UNDER PENALTIES'],
    ['I declare that l have read', 'I declare that I have read'],
    ['l have not audited', 'I have not audited'],
    ['F.S.744.3678 (3)', 'F.S. 744.3678 (3)'],
  ],
  simplified: [
    ['l have not audited', 'I have not audited'],
  ],
};

const norm = (t) => String(t).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
const corrected = (text, form) => COURT_TEXT_CORRECTIONS[form].reduce((t, [from, to]) => {
  expect(t.includes(from), `${form}: the correction "${from}" no longer matches the original`).toBe(true);
  return t.split(from).join(to);
}, norm(text));

const PLAN_ORIGINAL = Object.fromEntries(['plan-annual', 'plan-initial', 'plan-simplified'].map((form) => [
  form, corrected(fs.readFileSync(path.join(root, `reference/plan-forms/${form}-original.txt`), 'utf8'), form),
]));

/** Every value of a text module, as [where, text]. */
const entries = (name, obj) => Object.entries(obj).map(([k, v]) => [`${name}.${k}`, v]);

/** A sentence with blanks the filer fills: each fixed piece is the court's. */
const fixedPieces = (fill) => fill('\u0001', '\u0002', '\u0003').split(/[\u0001-\u0003]/).map((p) => p.trim()).filter(Boolean);

function expectInOriginal(form, list) {
  const original = PLAN_ORIGINAL[form];
  const missing = list.filter(([, text]) => !original.includes(norm(text))).map(([where]) => where);
  expect(missing, `not in ${form}'s original`).toEqual([]);
}

describe('each entry is the original form\'s text', () => {
  test('the Simplified Annual Plan', () => {
    const { declaration, ...rest } = PLAN_SIMPLIFIED_TEXT;
    expectInOriginal('plan-simplified', entries('PLAN_SIMPLIFIED_TEXT', rest));
    // The original prints the declaration twice, side by side, one per
    // signer: the text file reads across both columns, so each line is found.
    expect(declaration).toBe('Under penalty of perjury, I declare that I have read the foregoing and the facts alleged are true to the best of my knowledge and belief.');
    for (const line of ['Under penalty of perjury, I declare that I have', 'read the foregoing and the facts alleged are', 'true to the best of my knowledge and belief.']) {
      expect(PLAN_ORIGINAL['plan-simplified']).toContain(line);
    }
  });

  test('the Annual Guardianship Plan: questions, choices, devices, directive lines, rights and daily-living activities', () => {
    expectInOriginal('plan-annual', [
      ...entries('PLAN_ANNUAL_TEXT', PLAN_ANNUAL_TEXT),
      ...entries('PLAN_ANNUAL_CHOICES', PLAN_ANNUAL_CHOICES),
      ...PLAN_ANNUAL_DEVICES.map(([k, v]) => [`device ${k}`, v]),
      ...entries('PLAN_ANNUAL_DIRECTIVE_LABELS', PLAN_ANNUAL_DIRECTIVE_LABELS),
      ...PLAN_RIGHTS.map(([k, v]) => [`right ${k}`, v]),
      ...PLAN_ADLS.map(([k, v]) => [`ADL ${k}`, v]),
      ...entries('moves (Pinellas/Pasco)', planAnnualMoveChoices(true)),
      ...[planAnnualNoRemuneration, planAnnualReceived, planAnnualAttorneyCertification]
        .flatMap((fill) => fixedPieces(fill).map((piece) => [`${fill.name}: "${piece}"`, piece])),
    ]);
  });

  test('Question 2 names the Sixth Circuit\'s counties only on a Pinellas or Pasco filing; otherwise the same sentences without them', () => {
    const local = planAnnualMoveChoices(true);
    const other = planAnnualMoveChoices(false);
    for (const key of Object.keys(local)) {
      expect(other[key]).not.toMatch(/Pinellas|Pasco/);
      expect(local[key].replace(/ \((?:Pinellas to Pasco or Pasco to Pinellas|Pasco\/Pinellas)\)/, '')).toBe(other[key]);
    }
  });

  test('the Initial Guardianship Plan: questions, choices, benefits and daily-living activities', () => {
    expectInOriginal('plan-initial', [
      ...entries('PLAN_INITIAL_TEXT', PLAN_INITIAL_TEXT),
      ...entries('PLAN_INITIAL_CHOICES', PLAN_INITIAL_CHOICES),
      ...PLAN_INITIAL_BENEFITS.map(([k, v]) => [`benefit ${k}`, v]),
      ...INITIAL_ADLS.map(([k, v]) => [`ADL ${k}`, v]),
      ...fixedPieces(planInitialAttorneyCertification).map((piece) => [`attorney: "${piece}"`, piece]),
    ]);
  });

  test("the accountings' statements are the Clerk's workbooks' text", async () => {
    const workbookText = async (name) => {
      const js = fs.readFileSync(path.join(root, `templates/${name}-template.js`), 'utf8');
      const b64 = /export default "([A-Za-z0-9+/=]+)"/.exec(js)[1];
      const zip = await JSZip.loadAsync(Buffer.from(b64, 'base64'));
      const xml = await zip.file('xl/sharedStrings.xml').async('string');
      // Coarse on purpose (AGENTS.md §10, P2): whether a sentence appears in
      // the workbook's strings at all, never which cell holds it.
      // Each string's text runs, joined: a sentence may be split across
      // runs of different formatting ("UNDER PENALITIES OF PERJURY" bold).
      const strings = [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)]
        .map((m) => [...m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
      const decoded = strings.join(' • ').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      return corrected(decoded, name);
    };
    const annual = await workbookText('annual');
    const simplified = await workbookText('simplified');
    for (const [where, text] of [
      ['ANNUAL_RECEIPTS_CERTIFICATION', ANNUAL_RECEIPTS_CERTIFICATION],
      ['ANNUAL_DECLARATION.before', ANNUAL_DECLARATION.before.replace(/ from$/, '')],
      ['ANNUAL_DECLARATION.after', ANNUAL_DECLARATION.after],
      ['ATTORNEY_NOT_AUDITED (annual)', ATTORNEY_NOT_AUDITED],
    ]) expect(annual.includes(norm(text)), where).toBe(true);
    expect(simplified.includes(norm(ATTORNEY_NOT_AUDITED)), 'ATTORNEY_NOT_AUDITED (simplified)').toBe(true);
  });
});

/** Every word a model prints: titles, labels, values, notices, questions, answers and cells. */
function printed(model) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(model.sections);
  return norm(out.join(' • '));
}

describe('each PDF prints the entries', () => {
  test('the Simplified Annual Plan, numbered 1-9 as the form is', () => {
    const text = printed(buildPlanSimplifiedModel({ q7RestoreRights: 'Yes', q9Remuneration: 'Yes', q8DNR: true }));
    const T = PLAN_SIMPLIFIED_TEXT;
    for (const [n, key] of [[1, 'q1'], [2, 'q2'], [3, 'q3'], [4, 'q4'], [5, 'q5'], [6, 'q6'], [7, 'q7'], [8, 'q8'], [9, 'q9']]) {
      expect(text, `question ${n}`).toContain(norm(`${n}. ${T[key]}`));
    }
    for (const key of ['intro', 'q7Yes', 'q9Yes', 'declaration']) expect(text, key).toContain(norm(T[key]));
    expect(text, 'no "Q7." numbering').not.toMatch(/\bQ[789]\./);
  });

  test('the Annual Guardianship Plan, with every box ticked', () => {
    const d = { county: 'Pinellas', q10NoDirectives: true, q10Executed: true, q11NoRemuneration: true, q11NoRemunerationName: 'Pat Guardian' };
    for (const key of Object.keys(PLAN_ANNUAL_CHOICES)) d[key] = true;
    for (const [suffix] of PLAN_ANNUAL_DEVICES) { d[`q9Uses${suffix}`] = true; d[`q9Needs${suffix}`] = true; }
    const text = printed(buildPlanAnnualModel(d));
    const missing = [
      ...Object.entries(PLAN_ANNUAL_CHOICES).filter(([k]) => !['q3MedSpecialist', 'q10ExecOther'].includes(k)),
      ...Object.entries(planAnnualMoveChoices(true)),
      ...['due', 'wardLiving', 'submits', 'note1', 'q3A', 'q3B', 'q3G', 'q5A', 'q5B', 'q9A', 'q10Executed', 'certPreamble', 'perjury'].map((k) => [k, PLAN_ANNUAL_TEXT[k]]),
      ['q7', `7. ${PLAN_ANNUAL_TEXT.q7}`],
      ['q11', `11. ${PLAN_ANNUAL_TEXT.q11}`],
      ['q10NoDirectives', `10. ${PLAN_ANNUAL_TEXT.q10NoDirectives}`],
      ['remuneration', planAnnualNoRemuneration('Pat Guardian')],
    ].filter(([, t]) => !text.includes(norm(t))).map(([k]) => k);
    expect(missing).toEqual([]);
    expect(text).toContain(norm(planAnnualAttorneyCertification('__________', '__________', 'Pinellas')));
    const received = printed(buildPlanAnnualModel({ q11ReceivedName: 'Pat Guardian', q11Amount: 500, q11From: 'the ward', q11SubmittedToCourt: true }));
    expect(received).toContain(norm(planAnnualReceived('Pat Guardian', '$500.00', 'the ward')));
    expect(received).toContain(norm(PLAN_ANNUAL_TEXT.q11Submitted));
    expect(printed(buildPlanAnnualModel({ ...d, county: 'Orange' })), 'no Sixth Circuit names elsewhere').not.toMatch(/Pinellas to Pasco|Pasco\/Pinellas/);
  });

  test('the Initial Guardianship Plan: every box ticked, and 10E and 10F before Question 11', () => {
    const d = { county: 'Pasco', q11NoDirectives: true, q11Executed: true, committeeIncorporated: 'Yes' };
    for (const key of Object.keys(PLAN_INITIAL_CHOICES)) d[key] = true;
    const text = printed(buildPlanInitialModel(d));
    const missing = [
      ...Object.entries(PLAN_INITIAL_CHOICES).filter(([k]) => !['q3MedSpecialist', 'q11ExecOther'].includes(k)),
      ...PLAN_INITIAL_BENEFITS,
      ...['q10A', 'q10B', 'q10C', 'q10D', 'q10E', 'q10F', 'q11Executed', 'certPreamble', 'perjury', 'submits'].map((k) => [k, PLAN_INITIAL_TEXT[k]]),
      ...[1, 2, 3, 4, 5, 6, 7, 9, 10].map((n) => [`q${n}`, `${n}. ${PLAN_INITIAL_TEXT[`q${n}`]}`]),
      ['q11', `11. ${PLAN_INITIAL_TEXT.q11NoDirectives}`],
    ].filter(([, t]) => !text.includes(norm(t))).map(([k]) => k);
    expect(missing).toEqual([]);
    expect(text).toContain(norm(planInitialAttorneyCertification('__________', '__________', 'Pasco')));
    const order = ['q10D', 'q10E', 'q10F'].map((k) => text.indexOf(norm(PLAN_INITIAL_TEXT[k])));
    expect(order, '10D, 10E, 10F in order').toEqual([...order].sort((a, b) => a - b));
    expect(text.indexOf(norm(PLAN_INITIAL_TEXT.q10F)), '10F before Question 11').toBeLessThan(text.indexOf(norm(`11. ${PLAN_INITIAL_TEXT.q11NoDirectives}`)));
  });

  test("the Annual and Simplified Accountings' statements, in full", () => {
    const annual = printed(buildAnnualAccountingModel({ inventoryType: 'annual', wardName: 'Pat Ward', periodFrom: '2026-01-01', periodTo: '2026-12-31', attorney: 'Rob Attorney', attorney_county: 'Pinellas' }));
    expect(annual).toContain(norm(ANNUAL_RECEIPTS_CERTIFICATION));
    expect(annual).toContain(norm(`${ANNUAL_DECLARATION.before} 01/01/2026 through 12/31/2026 ${ANNUAL_DECLARATION.after}`));
    expect(annual).toContain(norm(`is the representation of the guardian. ${ATTORNEY_NOT_AUDITED} The undersigned attorney`));
    const simplified = printed(buildSimplifiedAccountingModel({ inventoryType: 'simplified', wardName: 'Pat Ward', attorney: 'Rob Attorney' }));
    expect(simplified).toContain(norm(`is the representation of the guardian. ${ATTORNEY_NOT_AUDITED} The undersigned attorney`));
  });
});

describe('the screens read the same text', () => {
  test('each form\'s screen imports its court text', () => {
    for (const [file, module] of [
      ['src/features/plan-simplified/index.js', 'court-text/plan-simplified.js'],
      ['src/features/plan-annual/index.js', 'court-text/plan-annual.js'],
      ['src/features/plan-initial/index.js', 'court-text/plan-initial.js'],
      ['src/features/annual-accounting/index.js', 'court-text/accountings.js'],
      ['src/features/simplified-accounting/index.js', 'court-text/accountings.js'],
    ]) expect(fs.readFileSync(path.join(root, file), 'utf8'), file).toContain(module);
  });
});
