// Milestone 76A (decision 76A-2, the requester's, 2026-10-19): what the filer
// sees when another tab or window saved the same case file.
//
// A save merges the file filing by filing (src/core/persistence/case-merge.js):
// another tab's changes come into this one, and this tab's go to the file.
// - A filing, person or case record changed both here and there since this tab
//   last saved is asked about: the file keeps the other tab's copy, this tab
//   keeps its own, until the filer chooses. "Decide later" asks again at the
//   next save.
// - Another tab's changes that came in are drawn: the dashboard shows them, and
//   the open filing is drawn again if its own copy was replaced, or closed if it
//   was deleted there.
import { getCurrentPage, renderPage } from '../navigation/router.js';
import { DRAW } from '../navigation/draw-reason.js';
import { filingLifecycle } from '../navigation/filing-lifecycle.js';
import { formDisplayName } from '../filing/filing-registry.js';
import { markFilingRevisionChanged } from '../filing/output-authorization.js';
import { resolveCaseConflicts } from '../persistence/case-file.js';
import { choicesModal } from '../ui/dialogs.js';

/** How a record is named in the question. */
export function describeConflictRecord({ list, mine, theirs }) {
  const r = mine || theirs || {};
  if (list === 'wards') {
    const who = r.wardName || '(unnamed)';
    const form = formDisplayName(r.inventoryType);
    return form ? `The ${form} for ${who}` : `The filing for ${who}`;
  }
  if (list === 'parties') return `The shared record for ${r.name || '(unnamed)'}`;
  return `The case record ${r.caseNumber || '(no case number)'}`;
}

/** The two answers, worded for a change on each side or a deletion on one. */
export function conflictOptions({ mine, theirs }) {
  if (!mine) {
    return [
      { value: 'mine', label: 'Delete it, as this tab did' },
      { value: 'theirs', label: "Keep the other tab's version" },
    ];
  }
  if (!theirs) {
    return [
      { value: 'mine', label: "Keep this tab's version" },
      { value: 'theirs', label: 'Delete it, as the other tab did' },
    ];
  }
  return [
    { value: 'mine', label: "Keep this tab's version" },
    { value: 'theirs', label: "Use the other tab's version" },
  ];
}

async function askAbout(conflicts) {
  const answers = await choicesModal({
    title: 'Changed in another tab too',
    message: 'Since this tab last saved, another tab or window of this case file saved changes to the same records. '
      + 'The case file keeps the other version of each until you choose; this tab keeps its own until then.',
    questions: conflicts.map((c) => ({ id: c.key, prompt: describeConflictRecord(c), options: conflictOptions(c) })),
    confirmLabel: 'Save my choices',
    cancelLabel: 'Decide later',
  });
  resolveCaseConflicts(answers);
}

async function drawMerged({ activeChanged, activeRemoved }) {
  if (activeRemoved) {
    await filingLifecycle.unload();
    return;
  }
  // The open filing is now another tab's copy: an override given for this
  // tab's no longer applies to it.
  if (activeChanged) markFilingRevisionChanged('case-merged');
  const page = getCurrentPage();
  if (activeChanged || page === '/dashboard') await renderPage(page, { reason: DRAW.BACKGROUND });
}

/** Installed once by main.js; the signal removes the listeners. */
export function installCaseConflictPrompts({ signal } = {}) {
  window.addEventListener('pg:case-conflicts', (event) => {
    void askAbout((event.detail && event.detail.conflicts) || []);
  }, { signal });
  window.addEventListener('pg:case-merged', (event) => {
    void drawMerged(event.detail || {});
  }, { signal });
}
