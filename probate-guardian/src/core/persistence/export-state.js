// The case's save state: whether it changed since it was last saved to its
// file, when that save was, and how often the background sweep retries one.
// Out of case-file.js (Milestone 70, 70H) so a module that only reads it --
// this tab's state for the other tabs -- need not import the case file.
//
// This module's own since Milestone 70's 70I. Until then the first two were
// accessors onto legacy-app.js's variables, and the interval had two copies
// that never met: the one the auto-save setting changed (case-file.js's) and
// the one the case file saved and loaded (legacy-app.js's). So a filer's
// choice was never saved, and an opened file's was never used.
let dirtySinceExport = false;
let lastExportAt = null; // ms epoch of the last successful save to the file, or null if never
let autoExportIntervalMinutes = 10; // 0 means Off

export function isDirtySinceExport() {
  return dirtySinceExport;
}

export function setDirtySinceExport(value) {
  dirtySinceExport = value;
}

// The single "last successful save" clock: written when a save to the file is
// recorded (case-file.js's beginRecordingExport(), which takes it back if the
// write fails) and when a case file is opened (case-reader.js).
export function getLastExportAt() {
  return lastExportAt;
}

export function setLastExportAt(value) {
  lastExportAt = value;
}

/** How often, in minutes, the sweep retries an unsaved change (0: never). Saved with the case. */
export function getAutoExportIntervalMinutes() {
  return autoExportIntervalMinutes;
}

export function setAutoExportIntervalMinutes(minutes) {
  autoExportIntervalMinutes = minutes;
}
