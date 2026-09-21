import { expect, test } from '@playwright/test';

// Imports the built SSR bundle directly (plain Node ESM, no Vite at test
// time) — this is the artifact-level check B5 needed: solid4m
// resolved through its real, packed-and-installed exports map, not a
// workspace source alias. See run.mjs for the pack/install/build steps this
// depends on.
import { renderPage } from '../dist-ssr/ssr-entry.js';

test('SSR output hydrates in a real browser with no mismatch, and the form submits', async ({ page }) => {
  const { hydrationScript, appHtml } = renderPage();

  expect(appHtml).toContain('<input');
  expect(appHtml).toContain('name="email"');

  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await page.setContent(
    `<!doctype html><html><head>${hydrationScript}</head><body><div id="app">${appHtml}</div></body></html>`
  );
  await page.addScriptTag({ path: 'dist-client/client.js', type: 'module' });

  const email = page.getByLabel('Email');
  await expect(email).toBeVisible();
  await expect(page.getByTestId('status')).toHaveText('Not submitted');

  // A hydration mismatch shows up as solid-js rebuilding the DOM (or
  // console-warning while doing it) instead of adopting the SSR'd nodes —
  // check before interacting, since interaction alone wouldn't reveal it.
  expect(consoleErrors, `console errors during hydration:\n${consoleErrors.join('\n')}`).toEqual([]);

  await email.fill('person@example.com');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByTestId('status')).toHaveText('Submitted');
  expect(consoleErrors, `console errors after submit:\n${consoleErrors.join('\n')}`).toEqual([]);
});
