import { test, expect } from '@playwright/test';

// Smoke: every locale renders, and NO page silently fails its API calls.
// A 200 shell with a dead XHR inside is the failure mode this catches.
const locales = ['en', 'id'];

for (const locale of locales) {
  test(`${locale}: homepage renders with no failed requests`, async ({ page }) => {
    const failures: string[] = [];
    const jsErrors: string[] = [];
    page.on('pageerror', e => jsErrors.push(String(e)));
    page.on('response', r => {
      if (r.status() >= 400) failures.push(`HTTP ${r.status()} ${r.url()}`);
    });
    page.on('requestfailed', r =>
      failures.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));

    await page.goto(`/${locale}`, { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/.+/);
    expect(jsErrors, `JS exceptions on /${locale}`).toEqual([]);
    expect(failures, `failed requests on /${locale}`).toEqual([]);
  });
}
