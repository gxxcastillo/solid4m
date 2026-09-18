// Records Chromium's own `validity.stepMismatch` across a table of step cases.
// The `step` constraint in packages/validation is a reimplementation of browser
// behavior that `noValidate` turned off, so the only meaningful test of it is
// agreement with a real browser — not with anyone's reading of the spec.
//
// Writes packages/validation/src/stepMismatch.chromium.ts, which is committed so
// that the comparison (stepConstraint.test.ts) keeps running without a browser.
// Re-run by hand when the table needs new rows:
//
//   pnpm --filter a11y exec node scripts/record-step-mismatch-table.mjs
//
// It lives here rather than in packages/validation because this is the only
// workspace with Playwright and a browser install.
// From @playwright/test rather than 'playwright': that is the dependency this
// workspace actually declares, and pnpm's strict layout makes the bare
// 'playwright' package unresolvable from here.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const cases = [];
const add = (type, step, min, values, max) => {
  for (const value of values) cases.push({ type, step, min, max, value });
};

// --- number ----------------------------------------------------------------
add('number', 5, undefined, ['0', '5', '7', '10', '-5', '-7', '2.5', '']);
add('number', 5, 1, ['1', '6', '11', '0', '5', '7', '-4']);
add('number', 2, 1, ['1', '2', '3', '4', '-1']);
add('number', 0.1, undefined, ['0.1', '0.2', '0.3', '0.30', '0.35', '1', '1.1', '2.7755575615628914e-17']);
add('number', 0.01, undefined, ['19.99', '19.999', '0.07', '1']);
add('number', 0.25, 0.1, ['0.1', '0.35', '0.6', '0.2']);
add('number', 'any', undefined, ['1.5', '0.30000001', '7', '-3.3']);
add('number', 'ANY', undefined, ['1.5']);
add('number', 0, undefined, ['1.5', '2']);
add('number', -5, undefined, ['1.5', '2', '7']);
add('number', 'banana', undefined, ['1.5', '2']);
add('number', 3, undefined, ['1e2', '.5', '5.', '0x10', ' 6 ', 'abc', '99999999999999999999', '9']);
add('number', 1, undefined, ['1.5', '2', '-2', '1e21']);
add('number', 1e-7, undefined, ['0.0000002', '0.00000025']);
add('number', 7, 2, ['2', '9', '16', '3', '-5']);

// --- range -----------------------------------------------------------------
add('range', 5, undefined, ['0', '5', '7', '10']);
add('range', 25, 0, ['0', '25', '30', '50']);
add('range', 'any', undefined, ['7', '13']);

// --- date ------------------------------------------------------------------
// Default base is the epoch, 1970-01-01, which was a Thursday.
add('date', 7, undefined, ['1970-01-01', '1970-01-08', '2026-08-13', '2026-08-16', '2026-08-20']);
add('date', 1, undefined, ['2026-08-16', '2026-02-30', 'not-a-date', '']);
add('date', 7, '2026-08-16', ['2026-08-16', '2026-08-23', '2026-08-17', '2026-08-09']);
add('date', 2, undefined, ['1970-01-01', '1970-01-02', '1970-01-03']);
add('date', 'any', undefined, ['2026-08-17']);
add('date', 30, '2026-01-01', ['2026-01-01', '2026-01-31', '2026-01-15']);

// --- month -----------------------------------------------------------------
add('month', 3, undefined, ['1970-01', '1970-04', '1970-02', '2026-07', '2026-08', '2026-10']);
add('month', 1, undefined, ['2026-08', '2026-13', '']);
add('month', 6, '2026-02', ['2026-02', '2026-08', '2026-03']);
add('month', 12, undefined, ['1970-01', '2026-01', '2026-02']);

// --- week ------------------------------------------------------------------
// Default base is -259200000: the Monday of the week containing the epoch.
add('week', 2, undefined, ['1970-W01', '1970-W02', '1970-W03', '2026-W33', '2026-W34']);
add('week', 1, undefined, ['2026-W01', '2026-W53', '2020-W53', '2026-W00', '']);
add('week', 4, '2026-W05', ['2026-W05', '2026-W09', '2026-W06']);

// --- time ------------------------------------------------------------------
// Default step is 60 (one minute), scale factor 1000 (seconds).
add('time', 900, undefined, ['00:00', '00:15', '00:30', '00:10', '13:45', '13:50']);
add('time', 1, undefined, ['13:45:30', '13:45', '13:45:30.500']);
add('time', 60, undefined, ['13:45', '13:45:30']);
add('time', 1800, '09:00', ['09:00', '09:30', '09:15', '10:00']);
add('time', 'any', undefined, ['13:45:30.123']);
add('time', 0.5, undefined, ['13:45:30.500', '13:45:30.250']);
add('time', 1, undefined, ['25:00', 'nope', '']);

// --- datetime-local --------------------------------------------------------
add('datetime-local', 900, undefined, ['2026-08-16T00:00', '2026-08-16T00:15', '2026-08-16T00:10']);
add('datetime-local', 60, undefined, ['2026-08-16T13:45', '2026-08-16T13:45:30']);
add('datetime-local', 1, undefined, ['2026-08-16T13:45:30', '2026-08-16T13:45:30.500']);
add('datetime-local', 3600, '2026-08-16T00:30', ['2026-08-16T00:30', '2026-08-16T01:30', '2026-08-16T01:00']);

// --- min/max ---------------------------------------------------------------
// These bounds share the same per-type conversion as step but have independent
// browser validity flags. Keep cases with both edges: a hand-written date table
// is particularly prone to getting week/month ordering subtly wrong.
add('date', undefined, '2026-01-10', ['2026-01-09', '2026-01-10', '2026-01-20', '2026-01-21'], '2026-01-20');
add('month', undefined, '2026-02', ['2026-01', '2026-02', '2026-12', '2027-01'], '2026-12');
add('week', undefined, '2026-W05', ['2026-W04', '2026-W05', '2026-W40', '2026-W41'], '2026-W40');
add('time', undefined, '09:00', ['08:59', '09:00', '17:00', '17:01'], '17:00');
add(
  'datetime-local',
  undefined,
  '2026-01-10T09:00',
  ['2026-01-10T08:59', '2026-01-10T09:00', '2026-01-10T17:00', '2026-01-10T17:01'],
  '2026-01-10T17:00'
);

// --- types with no allowed value step --------------------------------------
add('text', 5, undefined, ['7', 'abc']);
add('email', 5, undefined, ['a@b.com']);
add('checkbox', 5, undefined, ['7']);
add('password', 3, undefined, ['7']);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body><input id="probe" /></body></html>');

const rows = [];
for (const testCase of cases) {
  const result = await page.evaluate(({ type, step, min, max, value }) => {
    // A fresh element per case: leftover attributes (and the value
    // sanitization a previous type applied) would leak between rows.
    const input = document.createElement('input');
    input.setAttribute('type', type);
    if (step !== undefined) input.setAttribute('step', String(step));
    if (min !== undefined) input.setAttribute('min', String(min));
    if (max !== undefined) input.setAttribute('max', String(max));
    // The IDL property, NOT setAttribute('value', …). The spec's step base
    // falls back to the *value content attribute* when `min` is absent, so
    // setting the attribute would silently re-anchor the ladder onto the very
    // value under test and make every case align. Setting the property sets
    // the dirty value flag and leaves the content attribute absent — which is
    // also what Solid does when it binds a value, so this matches the DOM the
    // library actually produces.
    document.body.append(input);
    input.value = String(value);
    // Read back what the browser actually kept: value sanitization discards
    // anything unparseable for the type, and that is exactly why an
    // unparseable value must not be reported as a step mismatch.
    const sanitized = input.value;
    const mismatch = input.validity.stepMismatch;
    const underflow = input.validity.rangeUnderflow;
    const overflow = input.validity.rangeOverflow;
    input.remove();
    return { sanitized, mismatch, underflow, overflow };
  }, testCase);
  rows.push({ ...testCase, ...result });
}

await browser.close();

const literal = (value) => (value === undefined ? 'undefined' : JSON.stringify(value));
const body = rows
  .map(
    (row) =>
      `  { type: ${literal(row.type)}, step: ${literal(row.step)}, min: ${literal(row.min)}, max: ${literal(row.max)}, ` +
      `value: ${literal(row.value)}, sanitized: ${literal(row.sanitized)}, mismatch: ${row.mismatch}, ` +
      `underflow: ${row.underflow}, overflow: ${row.overflow} }`
  )
  .join(',\n');

const header = `// RECORDED FROM CHROMIUM — do not hand-edit.
//
// Every row is a real \`<input>\` in a real browser: type, step and min set as
// content attributes, the value set through the IDL property, and
// \`validity.stepMismatch\`, range underflow/overflow, and the post-sanitization
// \`input.value\` read back out.
//
// The value goes through the property and never \`setAttribute('value', …)\`,
// because the spec's step base falls back to the *value content attribute* when
// \`min\` is absent — setting it would re-anchor the ladder onto the very value
// under test and make every row trivially align. Property assignment sets the
// dirty value flag and leaves the attribute absent, which is also the DOM Solid
// produces when it binds a value.
//
// \`sanitized\` is kept because it explains the \`mismatch: false\` rows that look
// wrong at a glance: a value the type cannot parse is discarded by value
// sanitization before validity is ever consulted, so it is never a step mismatch.
//
// Regenerate with apps/a11y/scripts/record-step-mismatch-table.mjs.

export type RecordedStepCase = {
  type: string;
  step: number | string | undefined;
  min: number | string | undefined;
  max: number | string | undefined;
  value: string;
  sanitized: string;
  mismatch: boolean;
  underflow: boolean;
  overflow: boolean;
};

export const recordedStepCases: RecordedStepCase[] = [
`;

const outPath = fileURLToPath(
  new URL('../../../packages/validation/src/stepMismatch.chromium.ts', import.meta.url)
);
writeFileSync(outPath, `${header}${body}\n];\n`);
process.stdout.write(
  `recorded ${rows.length} cases (${rows.filter((row) => row.mismatch).length} step mismatches) -> ${outPath}\n`
);
