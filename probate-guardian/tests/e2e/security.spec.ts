import { test, expect } from '@playwright/test';
import { gotoApp } from './support/target';

// Milestone 43G: the three page-less source-text audits that used to live
// here (event-attribute detector, source-markup scan, service-worker guard)
// moved to tests/unit/security-source-audit.spec.js -- pure Node fs/regex
// checks paying no benefit from a full Playwright browser launch. These
// three are genuinely page-driven and stay.

test.describe('Milestone 11 security boundaries', () => {
  test('CSP disallows inline and evaluated scripts', async ({ page }) => {
    await gotoApp(page);
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    const directives = new Map((policy || '').split(';').map((directive) => {
      const [name, ...values] = directive.trim().split(/\s+/);
      return [name, values];
    }));
    expect(directives.get('script-src')).toContain("'self'");
    expect(directives.get('script-src')).not.toContain("'unsafe-inline'");
    expect(directives.get('script-src')).not.toContain("'unsafe-eval'");
    expect(directives.get('script-src-elem') || []).not.toContain("'unsafe-inline'");
  });

  // "Unknown fragment names are rejected without a request" is checked on the
  // module itself, with every request recorded: tests/unit/fragment-loader.spec.js
  // (Milestone 70, 70T -- a browser spec names no app global but GuardianForms).

  test('hosted script and module responses use JavaScript MIME types', async ({ page }) => {
    const wrongMime: string[] = [];
    const checks: Promise<void>[] = [];
    page.on('response', (response) => {
      if (response.request().resourceType() !== 'script') return;
      checks.push(response.allHeaders().then((headers) => {
        const contentType = headers['content-type'] || '';
        if (!/(?:text|application)\/javascript/i.test(contentType)) wrongMime.push(`${response.url()} -> ${contentType}`);
      }));
    });
    await gotoApp(page);
    await page.waitForLoadState('networkidle');
    await Promise.all(checks);
    expect(wrongMime).toEqual([]);
  });
});
