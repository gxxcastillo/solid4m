import { describe, expect, it } from 'vitest';

import { type FormState } from '@gxxc/solid-forms-state';

import { constraintConfigs } from './constraintConfigs';
import { recordedStepCases } from './stepMismatch.chromium';
import { type ValidationConstraints } from './types';

// `step` reimplements a browser behavior that `noValidate` turned off, so the
// only test that means anything is agreement with a browser. stepMismatch.chromium.ts
// is a recording of real `<input>` elements in real Chromium — regenerate it with
// the script in this file's sibling comment if the table needs new rows:
//
//   node scripts/record-step-table.mjs <out>
//
// The script lives outside the repo deliberately (it needs a browser install and
// runs once, by hand); what is committed is its output, so this suite keeps
// checking the same agreement without needing Chromium at test time.

const formState = {} as FormState<Record<string, unknown>>;

function isStepValid(constraints: ValidationConstraints, value: string) {
  return constraintConfigs.step.validate(value, constraints.step, formState, constraints);
}

describe('step constraint vs Chromium', () => {
  // Sanity check on the fixture itself: a table with no violations in it would
  // pass every assertion below while proving nothing.
  it('recorded a meaningful spread of browser answers', () => {
    expect(recordedStepCases.length).toBeGreaterThan(100);
    expect(recordedStepCases.filter((c) => c.mismatch).length).toBeGreaterThan(20);
  });

  for (const recorded of recordedStepCases) {
    const label = `${recorded.type} step=${String(recorded.step)}${
      recorded.min === undefined ? '' : ` min=${String(recorded.min)}`
    } value=${JSON.stringify(recorded.value)}`;

    it(`agrees with Chromium: ${label}`, () => {
      const constraints: ValidationConstraints = {
        type: recorded.type,
        step: recorded.step as ValidationConstraints['step'],
        min: recorded.min as ValidationConstraints['min']
      };

      expect(isStepValid(constraints, recorded.value)).toBe(!recorded.mismatch);
    });
  }
});

describe('step constraint', () => {
  const numberField: ValidationConstraints = { type: 'number', step: 5 };

  it('skips an empty value, leaving emptiness to required', () => {
    expect(isStepValid(numberField, '')).toBe(true);
    expect(constraintConfigs.step.validate(undefined, 5, formState, numberField)).toBe(true);
    expect(constraintConfigs.step.validate(null, 5, formState, numberField)).toBe(true);
  });

  it('accepts an already-parsed number from a custom parse prop', () => {
    expect(constraintConfigs.step.validate(10, 5, formState, numberField)).toBe(true);
    expect(constraintConfigs.step.validate(7, 5, formState, numberField)).toBe(false);
  });

  // `type` is a free-form public string, so a bare index would reach an
  // inherited Object.prototype member and throw on `scale.toNumber`. Same guard,
  // and same reason, as the `type` constraint's own lookup.
  it('does not resolve inherited Object.prototype members as input types', () => {
    for (const type of ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__']) {
      expect(() => isStepValid({ type, step: 5 }, '7')).not.toThrow();
      expect(isStepValid({ type, step: 5 }, '7')).toBe(true);
    }
  });

  // A range input's value sanitization *snaps* to the nearest allowed step, so a
  // real one can never be in step mismatch — verified in the recording, where
  // value 7 against step 5 reads back as 5. Reporting an error the slider will
  // not let the user reach, and cannot show, would be a false positive.
  it('leaves range alone, which a browser can never report a mismatch for', () => {
    expect(isStepValid({ type: 'range', step: 5 }, '7')).toBe(true);
  });

  it('reports the unit for the types where step is not counted in the value units', () => {
    expect(constraintConfigs.step.message('Slot', 7, formState, { type: 'date', step: 7 })).toBe(
      '"Slot" must be in increments of 7 days'
    );
    expect(constraintConfigs.step.message('Start', 900, formState, { type: 'time', step: 900 })).toBe(
      '"Start" must be in increments of 900 seconds'
    );
    expect(constraintConfigs.step.message('Quantity', 5, formState, { type: 'number', step: 5 })).toBe(
      '"Quantity" must be in increments of 5'
    );
  });

  // The message is reachable with a step the spec replaces with the default
  // (`step={0}`), and reporting "increments of 0" would be nonsense.
  it('names the default step in the message when the given one is not positive', () => {
    expect(constraintConfigs.step.message('Quantity', 0, formState, { type: 'number', step: 0 })).toBe(
      '"Quantity" must be in increments of 1'
    );
  });
});
