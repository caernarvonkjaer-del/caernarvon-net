# Claude Handoff Notes

## Local Playwright Chromium Path

This Windows machine has Playwright's bundled Chromium browser installed at:

```text
C:\Users\No Name\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
```

Use this path if Playwright tries to launch the missing headless-shell path:

```text
C:\Users\No Name\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-win64\headless_shell.exe
```

The path was confirmed by querying the bundled Playwright package's
`chromium.executablePath()`.

For local E2E runs, Edge is also available through the project config:

```powershell
$env:PG_BROWSER='edge'
npx.cmd playwright test --reporter=list
```
