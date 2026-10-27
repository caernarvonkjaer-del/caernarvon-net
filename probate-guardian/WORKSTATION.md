# Workstation Notes

What is true of the Windows workstation this repository is developed on, as
opposed to the rules in [`AGENTS.md`](AGENTS.md), which hold anywhere. Every
path and version below was checked on disk on the date given; they are
evidence, not defaults. Re-verify them after any Node, browser, Python or
Playwright upgrade, and confirm a path exists rather than trusting this file
or a resolver: a path a tool prints is a prediction of where a file would
be, not proof that it is there (`chromium.executablePath()` returns its path
whether or not the browser was ever downloaded).

The history of this material, including three claims it once made that were
wrong, is in [`MILESTONE-ARCHIVE.md`](MILESTONE-ARCHIVE.md) under "Archive:
AGENTS.md (before the 2026-10-27 cleanup)".

---

## Toolchain

Verified 2026-10-27. (The 2026-09-19 table was wrong by then: Node had moved
from `E:` and Git from `D:` to `C:\Program Files`, and Python and the
bundled browsers were under another user's profile.)

| Tool | Path | Version |
| --- | --- | --- |
| node | `C:\Program Files\nodejs\node.exe` | 24.16.0 |
| npm / npx | `C:\Program Files\nodejs\npm.ps1`, `npx.ps1` | 11.13.0 |
| git | `C:\Program Files\Git\cmd\git.exe` | 2.55.0.windows.3 |
| playwright | `node_modules\.bin\playwright.cmd` | 1.62.1 |
| vite | `node_modules\.bin\vite.cmd` | 8.2.2 |
| vitest | `node_modules\.bin\vitest.cmd` | 4.1.11 |
| tsc | `node_modules\.bin\tsc.cmd` | 7.0.2 |

`vite`, `vitest` and `tsc` are project-local only. None is on `PATH`, so
reach them through `npx` or `npm run`, never as a bare command.

PowerShell's execution policy is `RemoteSigned` for both `CurrentUser` and
`LocalMachine`, and does not block the `npm.ps1`/`npx.ps1` shims;
`npm.cmd`/`npx.cmd` work too but are not needed.

## Browsers

The bundled browsers are under `%LOCALAPPDATA%\ms-playwright\`
(`C:\Users\clkmt07\AppData\Local\ms-playwright\` on 2026-10-27);
`PLAYWRIGHT_BROWSERS_PATH` is unset, so this is Playwright's default.

| Project | Executable | Version |
| --- | --- | --- |
| `chromium` (default) | `chromium_headless_shell-1234\chrome-headless-shell-win64\chrome-headless-shell.exe` | 151.0.7922.34 |
| full Chromium | `chromium-1234\chrome-win64\chrome.exe` | 151.0.7922.34 |
| `firefox` | `firefox-1538\firefox\firefox.exe` | 153.0 |
| `webkit` | `webkit-2336\Playwright.exe` | 26.5 |
| `edge` (`channel: 'msedge'`) | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | 155.0.4283.45 |
| system Chrome (no project uses it by default) | `C:\Program Files\Google\Chrome\Application\chrome.exe` | 156.0.8078.48 |

- The default `chromium` project runs the **headless shell**, not
  `chrome.exe`: `defaultChromiumExecutablePath()` lists the headless shell
  first and returns the first candidate that exists. A crash naming
  `chrome-headless-shell.exe` is the normal browser, not a misconfiguration.
- The `edge` project has no `executablePath`; `channel: 'msedge'` launches
  the system Edge, so an Edge update changes the browser under test with no
  change to the repository.
- Both system browsers were confirmed to launch at their 2026-09-19
  versions (Chrome 151 through the 41 targeted Milestone 59A browser tests,
  Edge in a headless smoke check). Both have updated themselves since; the
  versions above were read from the files, not launched.
- No browser path needs setting: an unqualified `npx playwright test` finds
  the bundled browsers. `PG_CHROMIUM_EXECUTABLE_PATH` in
  `playwright.config.ts` is an escape hatch for pinning another Chromium,
  not a prerequisite.

## Python

Verified 2026-10-27: `py` is `%LOCALAPPDATA%\Programs\Python\Launcher\py.exe`
and `python` is `%LOCALAPPDATA%\Programs\Python\Python314\python.exe`, both
Python 3.14.6. `python3` resolves to
`%LOCALAPPDATA%\Microsoft\WindowsApps\python3.exe`, a 0-byte Microsoft Store
alias stub, which is why `AGENTS.md` §2 forbids `python3` here.

## The FAT32 drive

The repository is on `D:`, a FAT32 drive. Three consequences:

- **Browser tests run about twice as slowly there.** The summary-page test
  that walked all nine forms took 22–24 s from a copy on `C:` (NTFS) and
  47–49 s from `D:` (Milestone 72F). `playwright.config.ts` runs one worker
  on FAT32 and four on NTFS (asked with `fsutil fsinfo volumeinfo`), because
  at four workers on `D:` three browser contexts hung on teardown, two
  `.sav` downloads came out truncated, and the heavy specs took longer than
  serially. `PG_WORKERS=n` overrides either.
- **Long runs go from a copy on `C:`.** The copy used so far is `C:\pg-73m`,
  mirrored from `D:` with robocopy, leaving out folders the copy builds or
  installs for itself:

  ```sh
  robocopy 'D:\caernarvon-net\probate-guardian' 'C:\pg-73m' //MIR //XD node_modules .git test-results playwright-report dist fonts-src //NFL //NDL //NJH //NJS //NP
  ```

  (Git Bash syntax; from PowerShell, use single slashes.) The copy keeps its
  own `node_modules`. Re-mirror after every change on `D:`; the copy is
  never edited directly.
- **Git can't run against the repository from the copy**: git refuses a
  repository on a drive that records no file ownership ("dubious
  ownership"). Three tests read git history:
  `mixed-version.characterization.spec.ts` and `rollback.contract.spec.ts`
  extract an old build with `git archive` (once, then reused from
  `%TEMP%\ms70-sav-corpus\<sha>`), and `tests/unit/archive-catalogue.spec.js`
  reads the log. From the copy, set `PG_GIT_ROOT` to the repository that
  holds the tree: `PG_GIT_ROOT='D:\caernarvon-net' npm test`. Without it the
  catalogue fails naming the variable, and the old-build helper
  (`scripts/ms70-sav-corpus.mjs`) cannot extract (verified 2026-10-19 from
  `C:\pg-73m` into an empty temp folder).
- **Git housekeeping.** Windows on this drive won't replace a read-only file
  by renaming over it, so git's split commit-graph broke: every git command
  warned "unable to find all commit-graph files" and every automatic
  rewrite failed. Fixed 2026-10-27 by rebuilding a single commit-graph file
  and setting, in the repository's own `.git/config`,
  `gc.writeCommitGraph=false` and `fetch.writeCommitGraph=false`. To refresh
  the graph by hand: `git commit-graph write --reachable` (never `--split`).
- **Never pull with uncommitted work.** An autostash pull once deleted a
  modified file on this drive. Fetch first, and pull only when behind with a
  clean tree.

## Measured run times

One machine's figures, for planning only; re-measure from an NTFS copy
before relying on any of them.

| Run | Where | Result |
| --- | --- | --- |
| `npm test` | `D:`, one worker, 2026-09-29 | 980 browser tests, 1.7 h |
| `npm test` | `C:` copy, one worker, 2026-10-02 | 1,011 browser tests, 1.3 h |
| `npm test` | `C:` copy, one worker, 2026-10-12 (`tests/baseline/runtime-2026-10-12.json`) | 1,222 cases, 110 min |
| `npm test` | `C:` copy, four workers, 2026-10-14 (`tests/baseline/runtime-2026-10-14.json`) | 1,020 executed, 7 skipped, 43.1 min |
| `npm test` browser leg | `C:` copy, four workers, 2026-10-21 | 1,076 passed, 7 skipped, 4 load time-outs, 41.0 min |
| `npm run test:quick` | 2026-09-19 (`tests/baseline/milestone-59-runtime.json`) | about 2.2 min |
| GitHub workflow, first automatic run | 2026-10-15, run 38803541212 at `fb20e4e` | 5 min 24 s end to end (unit 3 min 52 s, browser tier 49 s) |
| `offline-firefox` profile | `D:` vs `C:`, 2026-10-15 | the partial-pack case outran its 5 s toast window from `D:`; passed from `C:` in 41 s |

## Other tools on this machine

- This machine's `zip` is a broken legacy build. Build packages with
  PowerShell's `Compress-Archive` (`AGENTS.md` §9), and check that whatever
  tool is used recursed into subfolders.
