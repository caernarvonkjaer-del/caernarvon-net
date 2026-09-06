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
      pageBreakBefore: true,
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
