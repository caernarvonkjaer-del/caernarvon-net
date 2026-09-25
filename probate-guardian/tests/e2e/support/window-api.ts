// Milestone 42C: the app-defined `window.*` names the e2e suite reaches into.
//
// Specs historically wrote `(window as any).X` inside page.evaluate() -- 83
// distinct names at the time of writing, with no record of which are a
// contract and which were convenient. This file is that record for the
// most-used dozen, as a type (usable inside page.evaluate(), where imports
// are not available but type assertions are erased) and as Node-side
// wrappers for the common calls. Prefer these in new and touched specs;
// converting every existing call site is deliberately not this milestone's
// job. Add a name here when a spec starts depending on it.
import type { Page } from '@playwright/test';

export interface FilingRecord {
  wardId: string;
  wardName: string;
  inventoryType: string;
  [field: string]: unknown;
}

export interface CaseFileShape {
  activeWardId: string | null;
  guardianName: string;
  guardianEmail: string;
  wards: FilingRecord[];
  parties: unknown[];
  cases: unknown[];
  [field: string]: unknown;
}

export interface AdaptedIssue {
  code: string;
  section: string;
  path: string;
  label: string;
  route: string;
  severity: string;
  message: string;
}

// Milestone 43H: the shape a validateX() function itself returns (per
// issue-registry.js's createIssue()) -- the object adaptValidationErrors()
// later normalizes into AdaptedIssue by adding `severity`. Distinct from
// AdaptedIssue because a raw validator issue never has `severity` at all
// (not merely blank) -- casting to AdaptedIssue for a call site that only
// ever sees pre-adapt output would claim a field that isn't there.
export interface ValidatorIssue {
  code: string;
  message: string;
  section: string;
  label: string;
  path: string;
  route: string;
}

/**
 * Milestone 70, 70T: window.GuardianForms.testing (src/core/testing/testing-adapter.js),
 * the one way a browser spec reaches application state. Typed here for use
 * inside page.evaluate(), where imports are unavailable but type assertions
 * are erased: `const t = (window as unknown as TestWindow).GuardianForms.testing;`
 */
export interface GuardianFormsTesting {
  /** SETUP ONLY (D9): assign into the open filing (dotted keys allowed), then save. */
  patchFiling(patch: Record<string, unknown>, filingId?: string): void;
  seedFiling(record: { wardId: string } & Record<string, unknown>): void;
  /** SETUP ONLY (D9): make the open filing exactly this edited snapshot copy (removed keys included), then save. */
  replaceFiling(filing: FilingRecord): void;
  /** BEHAVIOR (D9): the edit a filer makes, through the rendered control for `path`. */
  setField(path: string, value: unknown): void;
  navigate(route: string): Promise<boolean>;
  save: { flush(): Promise<void>; auto(): void; markDirty(): void; markClean(): void; backupNow(): Promise<void>; saveData(): Promise<void> };
  createFiling: { openDialog(type: string): void; add(name: string, type: string): Promise<void>; emptyData(type: string): FilingRecord; addRow(schedule: string): void; duplicateRow(schedule: string, index: number): void };
  activateFiling: { open(filingId: string): Promise<boolean>; close(): Promise<void> };
  deleteFiling(filingId: string): Promise<void>;
  saveArchive: { all(): Promise<void>; blobAs(blob: Blob, name: string, validator?: unknown): Promise<unknown>; finishSingle(handle: unknown, filing: unknown): void };
  lock(): Promise<void>;
  refreshStatus(): void;
  snapshot(): { caseFile: CaseFileShape; filing: FilingRecord | null; activeFilingId: string | null; currentPage: string | null; activeInventoryType: string | null; dirtySinceExport: boolean; hasUnsavedChanges: boolean | null };
  field(path: string): unknown;
  constants(name: string): unknown;
  validate: {
    open(): Promise<unknown[]>;
    exportGate(): Promise<{ messages: string[]; canExport: boolean }>;
    fixture(fixture: Record<string, unknown>): Promise<Array<{ code: string; message: string; bypassable: boolean }>>;
  };
  status: { navChecks(): { checks: Record<string, boolean>; incomplete?: Record<string, unknown> }; progress(filingId: string): unknown };
  exportArchive: { caseFile(): Promise<Blob>; singleFiling(filingId: string): Promise<Blob> };
}

export interface TestWindow extends Window {
  GuardianForms: { testing: GuardianFormsTesting };
}

/** Node-side shortcuts for the commonest calls. */
export const testing = (page: Page) => ({
  navigate: (route: string) => page.evaluate((r) => (window as unknown as TestWindow).GuardianForms.testing.navigate(r), route),
  flush: () => page.evaluate(() => (window as unknown as TestWindow).GuardianForms.testing.save.flush()),
  snapshot: () => page.evaluate(() => (window as unknown as TestWindow).GuardianForms.testing.snapshot()),
  field: (path: string) => page.evaluate((p) => (window as unknown as TestWindow).GuardianForms.testing.field(p), path),
  patchFiling: (patch: Record<string, unknown>) => page.evaluate((pt) => (window as unknown as TestWindow).GuardianForms.testing.patchFiling(pt), patch),
  setField: (path: string, value: unknown) => page.evaluate(([p, v]) => (window as unknown as TestWindow).GuardianForms.testing.setField(p as string, v), [path, value] as const),
});
