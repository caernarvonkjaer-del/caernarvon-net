import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { walkSourceFiles } from './support/source-scan.js';

// Milestone 50G: every window.confirm()/alert()/prompt() call site in src/
// was converted to the awaitable confirmModal()/alertModal()/promptModal()
// in src/core/ui/dialogs.js, so app modals behave consistently everywhere
// (native dialogs render outside the DOM and block the whole browser tab,
// not just the page). Unlike the Milestone 42C window-bridge guard (an
// allow-list, since some window.* assignments are legitimate), the target
// here is zero native-dialog call sites anywhere -- a plain content scan is
// enough, no allow-list fixture needed. dialogs.js itself is exempt: its own
// doc comments reference native confirm()/alert()/prompt() by name to
// document the contract it replaces.
describe('Milestone 50G: native dialog removal guard', () => {
  it('ensures no window.confirm()/alert()/prompt() call site appears in src/, outside dialogs.js', () => {
    const srcDir = path.resolve(__dirname, '../../src');
    const exemptFile = path.resolve(srcDir, 'core/ui/dialogs.js');
    const nativeDialogPattern = /\b(?:window\.)?(?:alert|confirm|prompt)\(/;
    const filesWithNativeDialogs = [];

    for (const fullPath of walkSourceFiles(srcDir)) {
      if (fullPath === exemptFile) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      if (nativeDialogPattern.test(content)) {
        filesWithNativeDialogs.push(path.relative(srcDir, fullPath));
      }
    }

    expect(filesWithNativeDialogs, 'Native confirm()/alert()/prompt() call sites should be removed from all src files (use confirmModal()/alertModal()/promptModal() from src/core/ui/dialogs.js instead)').toEqual([]);
  });
});
