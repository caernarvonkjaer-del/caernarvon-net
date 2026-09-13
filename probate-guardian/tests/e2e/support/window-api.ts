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

/** The subset of the bridge the e2e suite treats as a contract. */
export interface PgWindow extends Window {
  navigate(route: string, updateHash?: boolean): Promise<boolean>;
  D: FilingRecord | Record<string, never>;
  caseFile: CaseFileShape;
  getCaseFile(): CaseFileShape;
  addWard(name: string, inventoryType: string): Promise<void>;
  switchWard(wardId: string): Promise<boolean>;
  adaptValidationErrors(errors: Array<string | object>, formType?: string): AdaptedIssue[];
  focusFieldByPath(route: string, fieldPath: string): Promise<void>;
  autoSave(): void;
  flushPendingSave(options?: { requireRecovery?: boolean }): Promise<void>;
  validateGuardian(): Array<string | object>;
  loadGuardianPdf(): Promise<Record<string, unknown>>;
}

export const navigateTo = (page: Page, route: string) =>
  page.evaluate((r) => (window as unknown as PgWindow).navigate(r), route);

export const addFiling = (page: Page, name: string, inventoryType: string) =>
  page.evaluate(([n, t]) => (window as unknown as PgWindow).addWard(n, t), [name, inventoryType] as const);

export const activeFiling = (page: Page) =>
  page.evaluate(() => (window as unknown as PgWindow).D as FilingRecord);

export const caseFileSnapshot = (page: Page) =>
  page.evaluate(() => JSON.parse(JSON.stringify((window as unknown as PgWindow).getCaseFile())) as CaseFileShape);

export const flushSave = (page: Page) =>
  page.evaluate(() => (window as unknown as PgWindow).flushPendingSave());
