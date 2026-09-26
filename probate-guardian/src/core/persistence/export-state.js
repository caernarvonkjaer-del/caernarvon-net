// Milestone 70, 70H: the case's export state -- changed since the last save to
// its file, and when that save was -- held on window for the monolith, which
// still owns both (its accessors are the store). Out of case-file.js so a
// module that only reads it (this tab's state for the other tabs) need not
// import the case file, which imports that module.
import { windowBackedRef } from './window-backed-ref.js';

const _dirtySinceExportRef = windowBackedRef(
  () => (typeof window !== 'undefined' ? window._dirtySinceExport : undefined),
  (v) => {
    if (typeof window !== 'undefined') {
      window._dirtySinceExport = v;
    }
  },
  false,
);
export const isDirtySinceExport = _dirtySinceExportRef.get;
export const setDirtySinceExport = _dirtySinceExportRef.set;

// The single "last successful save" clock. Every read and write goes through
// this pair, mirroring getCaseFileHandle/setCaseFileHandle above -- the
// previous code read window._lastExportAt in two places but wrote only the
// module-private variable, so the window value never advanced once set and
// every consumer of it (the Activity Log readout, the first-backup reminder
// in ward-lifecycle.js, which reads it as a bare property) saw a frozen
// value no matter how many real saves had succeeded.
const _lastExportAtRef = windowBackedRef(
  () => (typeof window !== 'undefined' ? window._lastExportAt : undefined),
  (v) => {
    if (typeof window !== 'undefined') {
      window._lastExportAt = v;
    }
  },
  null,
);
export const getLastExportAt = _lastExportAtRef.get;
export const setLastExportAt = _lastExportAtRef.set;
