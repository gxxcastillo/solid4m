import AxeBuilder from '@axe-core/playwright';
import { type Page, expect, test } from '@playwright/test';

type AxeViolation = Awaited<ReturnType<AxeBuilder['analyze']>>['violations'][number];

const EXPECTED_ROUTES = [
  { path: '/minimal/login', heading: 'Minimal Login' },
  { path: '/minimal/signup', heading: 'Minimal Signup' },
  { path: '/minimal/lineItems', heading: 'Minimal Line items' },
  { path: '/minimal/settings', heading: 'Minimal Settings' },
  { path: '/minimal/palette', heading: 'Minimal Field palette' },
  { path: '/midnight/login', heading: 'Midnight Login' },
  { path: '/midnight/signup', heading: 'Midnight Signup' },
  { path: '/midnight/lineItems', heading: 'Midnight Line items' },
  { path: '/midnight/settings', heading: 'Midnight Settings' },
  { path: '/midnight/palette', heading: 'Midnight Field palette' },
  { path: '/neobrutalist/login', heading: 'Neobrutalist Login' },
  { path: '/neobrutalist/signup', heading: 'Neobrutalist Signup' },
  { path: '/neobrutalist/lineItems', heading: 'Neobrutalist Line items' },
  { path: '/neobrutalist/settings', heading: 'Neobrutalist Settings' },
  { path: '/neobrutalist/palette', heading: 'Neobrutalist Field palette' }
] as const;

function formatViolations(violations: AxeViolation[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          const target = node.target.join(', ');
          const summary = node.failureSummary ? `: ${node.failureSummary}` : '';

          return `  ${target}${summary}`;
        })
        .join('\n');

      return `${violation.id}: ${violation.help}\n${nodes}`;
    })
    .join('\n\n');
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations, formatViolations(results.violations)).toEqual([]);
}

for (const route of EXPECTED_ROUTES) {
  test(`${route.path} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(route.path);

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(page.locator('form')).toBeVisible();

    await expectNoAxeViolations(page);
  });
}

test('/minimal/signup invalid blurred state has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/minimal/signup');

  await page.getByLabel('Email').focus();
  await page.getByLabel('Username').fill('ab');
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Confirm password').fill('different');
  await page.getByLabel('I accept the terms of service').focus();

  await expect(page.getByText('"Email" is required')).toBeVisible();
  await expect(page.getByText('"Username" is too short')).toBeVisible();
  await expect(page.getByText('"Password" is too short')).toBeVisible();
  await expect(page.getByText('"Confirm password" does not match "Password"')).toBeVisible();

  await expectNoAxeViolations(page);
});

test('/midnight/login invalid blurred state has no detectable accessibility violations', async ({ page }) => {
  await page.goto('/midnight/login');

  await page.getByLabel('Email').focus();
  await page.getByLabel('Password', { exact: true }).fill('short');
  await page.getByLabel('Care to send a message?').focus();

  await expect(page.getByText('"Email" is required')).toBeVisible();
  await expect(page.getByText('"Password" is too short')).toBeVisible();

  await expectNoAxeViolations(page);
});

test('an untouched form can be submitted, revealing its errors and focusing the first', async ({ page }) => {
  await page.goto('/minimal/login');

  // Must stay reachable even on an invalid form (see SubmitButton.tsx).
  // LoginForm renders <SubmitButton /> with no children, so its label is the
  // 'submit' fallback.
  const submit = page.getByRole('button', { name: 'submit' });
  await expect(submit).toBeEnabled();

  await submit.click();

  await expect(page.getByText('"Email" is required')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();

  await expectNoAxeViolations(page);
});

test('an optional length-constrained field does not block submission while empty', async ({ page }) => {
  await page.goto('/minimal/settings');

  // Neither field is required, so an untouched, empty form is valid (see
  // constraintConfigs.ts's `required` note).
  await page.getByLabel('Bio').fill('');
  await page.getByRole('button', { name: 'Submit' }).click();

  // The live region stays in the DOM even when empty (see BaseForm.tsx), so
  // assert it carries no text rather than that it is absent.
  await expect(page.locator('.sf-form-errors')).toBeEmpty();
  await expect(page.getByText('is too long')).toHaveCount(0);
  await expect(page.getByText('is too short')).toHaveCount(0);
  await expect(page.getByText('must be a valid URL')).toHaveCount(0);

  await expectNoAxeViolations(page);
});

test('an optional url field rejects a malformed value but not an empty one', async ({ page }) => {
  await page.goto('/minimal/settings');

  await page.getByLabel('Website').fill('example.com');
  await page.getByRole('button', { name: 'Submit' }).click();

  // Matches the browser's absolute-URL requirement (see constraintConfigs.ts's
  // `url` format). This is the only end-to-end exercise of it in a real
  // browser, where the gap `noValidate` opened actually existed.
  await expect(page.getByText('"Website" must be a valid URL')).toBeVisible();
  await expect(page.getByLabel('Website')).toBeFocused();

  await expectNoAxeViolations(page);

  await page.getByLabel('Website').fill('https://example.com');
  await expect(page.getByText('must be a valid URL')).toHaveCount(0);
});

test('a step-constrained field rejects an off-step value but not an empty one', async ({ page }) => {
  await page.goto('/minimal/settings');

  // The end-to-end half of the step work: the unit suite diffs the constraint
  // against a recording of Chromium's `validity.stepMismatch`, but only a real
  // time input's own sanitization and picker prove the constraint is actually
  // reached.
  await page.getByLabel('Daily reminder').fill('09:15');
  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByText('"Daily reminder" must be in increments of 1800 seconds')).toBeVisible();
  await expect(page.getByLabel('Daily reminder')).toBeFocused();

  await expectNoAxeViolations(page);

  await page.getByLabel('Daily reminder').fill('09:30');
  await expect(page.getByText('must be in increments of')).toHaveCount(0);
});

test('a time field enforces its date-aware min and max bounds', async ({ page }) => {
  await page.goto('/minimal/settings');

  await page.getByLabel('Daily reminder').fill('08:30');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('"Daily reminder" is too small')).toBeVisible();

  await page.getByLabel('Daily reminder').fill('17:30');
  await expect(page.getByText('"Daily reminder" is too large')).toBeVisible();

  await page.getByLabel('Daily reminder').fill('09:30');
  await expect(page.getByText('"Daily reminder" is too large')).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test('a malformed email is caught in the browser now that native validation is off', async ({ page }) => {
  await page.goto('/minimal/login');

  // Needs a real browser: `noValidate` (see BaseForm.tsx) stops Chromium's own
  // validation, which also took its `type='email'` format check with it.
  // happy-dom has neither behavior, so only this proves the replacement check
  // fires where the gap was.
  await page.getByLabel('Email').fill('not-an-email');
  await page.getByLabel('Password', { exact: true }).fill('correct horse');
  await page.getByRole('button', { name: 'submit' }).click();

  await expect(page.getByText('"Email" must be a valid email address')).toBeVisible();
  await expect(page.getByLabel('Email')).toBeFocused();

  await expectNoAxeViolations(page);

  await page.getByLabel('Email').fill('a@b.com');
  await expect(page.getByText('"Email" must be a valid email address')).toHaveCount(0);
});

test('the submit button keeps focus while a submit is in flight', async ({ page }) => {
  // `?hold=1` holds the submit open so this state is observable (see App.tsx).
  await page.goto('/minimal/login?hold=1');

  await page.getByLabel('Email').fill('a@b.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse');

  const submit = page.getByRole('button', { name: 'submit' });
  await submit.focus();
  await page.keyboard.press('Enter');

  // `disabled` would drop the focused button from the tab order, resetting
  // focus to <body> with nothing to restore it (see SubmitButton.tsx).
  // happy-dom does not model that, so this is only meaningful in a real
  // browser.
  await expect(submit).toHaveAttribute('aria-disabled', 'true');
  // Not toBeEnabled(): Playwright folds aria-disabled into its own enabled-ness
  // check, so it cannot distinguish the two states. The attribute is the claim.
  await expect(submit).not.toHaveAttribute('disabled');
  await expect(submit).toBeFocused();

  await expectNoAxeViolations(page);

  await page.evaluate(() => window.releaseHeldSubmit?.());

  await expect(submit).not.toHaveAttribute('aria-disabled');
  await expect(submit).toBeFocused();
});

test('an in-flight submit is announced without being shown', async ({ page, context }) => {
  await page.goto('/minimal/login?hold=1');

  await page.getByLabel('Email').fill('a@b.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse');

  const status = page.locator('.sf-form-status');
  await expect(status).toHaveText('');

  await page.getByRole('button', { name: 'submit' }).click();
  await expect(status).toHaveText('Submitting…');

  // Not shown: the submit button already carries the visual signal, so the
  // region must add nothing to the layout. Playwright counts a clipped 1px
  // element as "visible", so assert the box rather than visibility.
  const box = await status.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(1);
  expect(box?.height).toBeLessThanOrEqual(1);

  // Announced: invisible and absent look identical in the DOM, so read the
  // real accessibility tree. This is what fails if the screen-reader-only CSS
  // is ever "tidied" into display:none or visibility:hidden, which would
  // silently prune the region while every other test here keeps passing.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: { ignored?: boolean }[] };
  const mentioning = nodes.filter((node) => JSON.stringify(node).includes('Submitting'));
  expect(mentioning.length).toBeGreaterThan(0);
  expect(mentioning.filter((node) => node.ignored)).toEqual([]);

  await expectNoAxeViolations(page);

  await page.evaluate(() => window.releaseHeldSubmit?.());
  await expect(status).toHaveText('');
});

test('the in-flight spinner does not resize the submit button', async ({ page }) => {
  await page.goto('/minimal/login?hold=1');

  await page.getByLabel('Email').fill('a@b.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse');

  const submit = page.getByRole('button', { name: 'submit' });
  const before = await submit.boundingBox();

  await submit.click();
  await expect(submit).toHaveAttribute('aria-disabled', 'true');
  // Assert the spinner is on screen first: every size assertion below would
  // pass trivially if it had simply failed to render. The class is a hashed
  // CSS-module name, so match the decorative span instead.
  const spinner = submit.locator('span[aria-hidden="true"]');
  await expect(spinner).toBeVisible();

  // The spinner sits in the button's padding, not as a flex child (see
  // SubmitButton.tsx), so it cannot resize the button under the user's cursor.
  // Only a real browser lays this out, so only this can catch a regression.
  const during = await submit.boundingBox();
  expect(during?.width).toBe(before?.width);
  expect(during?.height).toBe(before?.height);
  expect(during?.x).toBe(before?.x);

  // Decorative (see SubmitButton.tsx): the accessible name must survive the
  // submit intact.
  await expect(submit).toHaveAccessibleName('submit');

  await expectNoAxeViolations(page);

  await page.evaluate(() => window.releaseHeldSubmit?.());
  await expect(submit).not.toHaveAttribute('aria-disabled');
});

test('/minimal/lineItems stays accessible after adding and removing a row', async ({ page }) => {
  await page.goto('/minimal/lineItems');

  await page.getByRole('button', { name: 'Add line item' }).click();
  await expect(page.getByLabel('Description')).toHaveCount(2);

  // Type into the second row, then remove the first: the survivor keeps its
  // value because rows are re-addressed rather than remounted.
  await page.getByLabel('Description').nth(1).fill('Second row');
  await page.getByRole('button', { name: 'Remove' }).first().click();

  await expect(page.getByLabel('Description')).toHaveCount(1);
  await expect(page.getByLabel('Description')).toHaveValue('Second row');

  await expectNoAxeViolations(page);
});

// Chromium clears every option when a multiple select's `value` is set to a
// string matching none of them, which is what a raw array binds back as
// unconverted (e.g. "testing,performance"). happy-dom does not model this,
// so only this test can catch it.
test('a multiple select keeps its default, the user’s picks, and a reset', async ({ page }) => {
  await page.goto('/minimal/palette');
  const topics = page.getByLabel('Topics you would attend');
  const selected = () =>
    topics.evaluate((select: HTMLSelectElement) => Array.from(select.selectedOptions, (o) => o.value));

  await expect.poll(selected).toEqual(['a11y']);

  await topics.selectOption(['testing', 'performance']);
  await topics.blur();
  await expect.poll(selected).toEqual(['testing', 'performance']);

  await page.getByRole('button', { name: 'Reset form' }).click();
  await expect.poll(selected).toEqual(['a11y']);
});
