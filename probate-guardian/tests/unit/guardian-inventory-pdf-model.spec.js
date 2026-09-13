import { describe, expect, test } from 'vitest';
import { buildVerifiedInventoryModel } from '../../src/features/guardian-inventory/pdf-model.js';

describe('guardian inventory PDF model', () => {
  test('prints Part III as a body heading before the asset schedules', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      scheduleA1: [{ propertyDescription: 'Primary Residence', fullAssetValue: '275000', wardPercent: '100' }],
      scheduleA2: [],
      scheduleB1: [],
      scheduleB2: [],
      scheduleB3: [],
      scheduleB4: [],
      scheduleC1: [],
      scheduleC2: [],
      scheduleC3: [],
      scheduleC4: [],
      scheduleC5: [],
    });

    const assetsIndex = model.sections.findIndex(section => section.id === 'assets');
    const firstScheduleIndex = model.sections.findIndex(section => section.id === 'a1');

    expect(model.sections[assetsIndex]).toMatchObject({
      title: 'Part III — ASSETS OF THE WARD',
      bookmarkTitle: 'Part III - Assets of the Ward',
      level: 1,
      pageBreakBefore: false,
      blocks: [],
    });
    expect(firstScheduleIndex).toBe(assetsIndex + 1);
    expect(model.sections[firstScheduleIndex]).toMatchObject({
      title: 'Schedule A-1: Real Property Assets',
      parentBookmark: 'Part III - Assets of the Ward',
      level: 2,
      pageBreakBefore: false,
    });
  });

  // Milestone 40H-B: hasSafeDepositBox=false gates the child item out of the
  // Schedule D-3 table entirely, regardless of what safeDepositBoxFiled
  // holds in state -- so a stale/preserved child value while the parent is
  // No is never read, exported, or shown. Confirmed explicitly rather than
  // assumed, since Task 40H-B stops wiping that child value on parent
  // toggle-off and this is the guarantee that makes doing so safe.
  test('Schedule D-3 never emits the safe-deposit-box-filed answer while the parent is No, even if state holds a stale value', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      hasSafeDepositBox: false,
      safeDepositBoxFiled: true, // stale/preserved answer from before the parent was set to No
      scheduleA1: [], scheduleA2: [], scheduleB1: [], scheduleB2: [], scheduleB3: [], scheduleB4: [],
      scheduleC1: [], scheduleC2: [], scheduleC3: [], scheduleC4: [], scheduleC5: [],
    });

    const d3Section = model.sections.find((section) => section.id === 'd3_d4');
    const d3Table = d3Section.blocks.find((block) => block.title === 'Schedule D-3: Safe Deposit Box & Audit Fee');

    expect(d3Table.items.some((item) => item.label === 'Initial inventory of safe deposit box filed?')).toBe(false);
    expect(d3Table.items.find((item) => item.label === 'Does the ward have a safe deposit box?').value).toBe('No');
  });

  test('adds uploaded supporting documents to the matching schedule section', () => {
    const model = buildVerifiedInventoryModel({
      wardName: 'Harold Thomas Bennett',
      caseNumber: '26-002487-GD',
      county: 'Pasco',
      activeYearKey: 'initial',
      scheduleB1: [{ institutionName: 'Fifth Third Bank', fullAssetAmount: '68500', isRestricted: true }],
      scheduleDocs: {
        b1: {
          initial: {
            comment: 'Bank statement confirms account balance.',
            files: [{
            name: 'mock_bank_statement.pdf',
            type: 'application/pdf',
            size: 3600,
            dataUrl: 'data:application/pdf;base64,JVBERi0xLjQK',
            contentDigest: 'sha256-test',
            technicalStatus: 'ready',
            pageCount: 1,
          }],
          },
        },
      },
    });

    const b1 = model.sections.find(section => section.id === 'b1');
    expect(b1.blocks.at(-1)).toMatchObject({
      type: 'supporting-documents',
      title: 'Supporting Documents',
      comment: 'Bank statement confirms account balance.',
      files: [{
        name: 'mock_bank_statement.pdf',
        type: 'application/pdf',
        size: 3600,
        technicalStatus: 'ready',
        pageCount: 1,
      }],
    });
  });
});
