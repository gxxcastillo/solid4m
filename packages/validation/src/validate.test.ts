import { describe, expect, it } from 'vitest';

import { type FormState } from '@gxxc/solid-forms-state';

import { validate } from './validate';

type TestFields = {
  username: string;
  password: string;
  age: number;
  bio: string;
  zip: number;
  tags: string[];
};

function makeFormState(fields: Partial<TestFields> = {}): FormState<TestFields> {
  return {
    fields: [],
    errors: [],
    isReady: true,
    isLoading: false,
    isProcessing: false,
    haveValuesChanged: false,
    isFormValid: true,
    isFieldValid: () => undefined,
    getField: () => undefined,
    getFieldValue: (name: string) => fields[name as keyof TestFields] as never,
    getFieldErrors: () => undefined,
    hasFieldBeenInitialized: (name: string) => name in fields,
    hasFieldBeenValid: () => undefined,
    hasFieldChanged: () => undefined,
    hasFieldBlurred: () => undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('validate — falsey constraints', () => {
  it('skips required={false}', () => {
    expect(validate('username', '', { required: false }, makeFormState())).toEqual([]);
  });

  it('skips undefined constraints', () => {
    expect(validate('username', '', { pattern: undefined }, makeFormState())).toEqual([]);
  });

  it('enforces required={true}', () => {
    expect(validate('username', '', { required: true }, makeFormState())).toHaveLength(1);
  });

  it('treats min=0 as active (not falsey)', () => {
    expect(validate('age', -1 as never, { min: 0 }, makeFormState())).toHaveLength(1);
  });

  it('treats max=0 as active (not falsey)', () => {
    expect(validate('age', 1 as never, { max: 0 }, makeFormState())).toHaveLength(1);
  });

  it('passes max=0 when value is 0', () => {
    expect(validate('age', 0 as never, { max: 0 }, makeFormState())).toEqual([]);
  });

  it('treats a 0-valued length constraint as active (not falsey)', () => {
    // minLength=0 can never fail, so it can't prove the falsey filter left the
    // constraint in place — maxLength=0 against a non-empty value can.
    expect(validate('username', 'a', { minLength: 0 }, makeFormState())).toEqual([]);
    expect(validate('username', 'a', { maxLength: 0 }, makeFormState())).toHaveLength(1);
  });

  it('skips null constraints', () => {
    expect(validate('username', 'x', { pattern: null as never }, makeFormState())).toEqual([]);
  });
});

describe('date/time range bounds', () => {
  it('ignores numeric bounds that a native date control cannot parse', () => {
    expect(validate('username', '1970-01-01', { type: 'date', min: 5 }, makeFormState())).toEqual([]);
    expect(validate('username', '1970-01-01', { type: 'date', max: 5 }, makeFormState())).toEqual([]);
  });
});

describe('required', () => {
  const state = makeFormState();

  it('fails for empty string', () => {
    expect(validate('username', '', { required: true }, state)).toHaveLength(1);
  });

  it('fails for undefined', () => {
    expect(validate('username', undefined, { required: true }, state)).toHaveLength(1);
  });

  it('fails for empty array', () => {
    expect(validate('username', [] as never, { required: true }, state)).toHaveLength(1);
  });

  it('passes for a non-empty string', () => {
    expect(validate('username', 'alice', { required: true }, state)).toEqual([]);
  });

  it('passes for a non-empty array', () => {
    expect(validate('username', ['a'] as never, { required: true }, state)).toEqual([]);
  });

  it('fails for boolean false (an unchecked required checkbox)', () => {
    expect(validate('username', false as never, { required: true }, state)).toHaveLength(1);
  });

  it('passes for boolean true (a checked checkbox)', () => {
    expect(validate('username', true as never, { required: true }, state)).toEqual([]);
  });
});

describe('pattern', () => {
  const state = makeFormState();

  it('passes for a matching string pattern', () => {
    expect(validate('username', 'alice123', { pattern: '^[a-z0-9]+$' }, state)).toEqual([]);
  });

  it('fails for a non-matching string pattern', () => {
    expect(validate('username', 'ALICE', { pattern: '^[a-z0-9]+$' }, state)).toHaveLength(1);
  });

  it('accepts a RegExp pattern', () => {
    expect(validate('username', 'alice123', { pattern: /^[a-z0-9]+$/ }, state)).toEqual([]);
  });

  it('fails for a non-matching RegExp', () => {
    expect(validate('username', 'ALICE', { pattern: /^[a-z0-9]+$/ }, state)).toHaveLength(1);
  });

  it('caches compiled string patterns (no throw on repeated calls)', () => {
    const pattern = '^[a-z]+$';
    expect(validate('username', 'abc', { pattern }, state)).toEqual([]);
    expect(validate('username', 'def', { pattern }, state)).toEqual([]);
    expect(validate('username', 'ABC', { pattern }, state)).toHaveLength(1);
  });

  it("passes for an empty value (emptiness is required's concern)", () => {
    expect(validate('username', '', { pattern: '^[a-z]+$' }, state)).toEqual([]);
  });

  it('coerces a non-string value before testing', () => {
    expect(validate('age', 123 as never, { pattern: '^[0-9]+$' }, state)).toEqual([]);
    expect(validate('age', 12.5 as never, { pattern: '^[0-9]+$' }, state)).toHaveLength(1);
  });
});

describe('minLength / maxLength', () => {
  const state = makeFormState();

  it('minLength passes when string meets the minimum', () => {
    expect(validate('username', 'abc', { minLength: 3 }, state)).toEqual([]);
  });

  it('minLength fails when string is too short', () => {
    expect(validate('username', 'ab', { minLength: 3 }, state)).toHaveLength(1);
  });

  it('maxLength passes when string is within the limit', () => {
    expect(validate('username', 'ab', { maxLength: 5 }, state)).toEqual([]);
  });

  it('maxLength fails when string exceeds the limit', () => {
    expect(validate('username', 'abcdef', { maxLength: 5 }, state)).toHaveLength(1);
  });

  // Regression: an undefined value is what an optional field holds before the
  // user touches it. Reporting "too long" there made a pristine form invalid on
  // load, which disabled submission with no visible error to explain it.
  it('skips an undefined value instead of reporting it as too long', () => {
    expect(validate('bio', undefined, { maxLength: 500 }, state)).toEqual([]);
  });

  it('skips an empty and an undefined value for minLength', () => {
    expect(validate('bio', '', { minLength: 3 }, state)).toEqual([]);
    expect(validate('bio', undefined, { minLength: 3 }, state)).toEqual([]);
  });

  // Regression: the old `typeof val === 'string'` guard failed every value a
  // custom `parse` produced, so a numeric field could never satisfy either bound.
  it('measures a parsed number by its digits', () => {
    expect(validate('zip', 94107 as never, { maxLength: 5 }, state)).toEqual([]);
    expect(validate('zip', 941070 as never, { maxLength: 5 }, state)).toHaveLength(1);
    expect(validate('zip', 941 as never, { minLength: 5 }, state)).toHaveLength(1);
  });

  it('measures an array by its item count', () => {
    expect(validate('tags', ['a', 'b'] as never, { maxLength: 3 }, state)).toEqual([]);
    expect(validate('tags', ['a', 'b', 'c', 'd'] as never, { maxLength: 3 }, state)).toHaveLength(1);
    // An empty array is absent, not a length-0 violation — `required`'s concern.
    expect(validate('tags', [] as never, { minLength: 2 }, state)).toEqual([]);
  });

  it('skips a malformed constraint instead of failing the field', () => {
    expect(validate('bio', 'text', { maxLength: 'ten' as never }, state)).toEqual([]);
    expect(validate('bio', 'text', { minLength: 'ten' as never }, state)).toEqual([]);
  });
});

describe('min / max', () => {
  const state = makeFormState();

  it('min passes when value equals the minimum', () => {
    expect(validate('age', 5 as never, { min: 5 }, state)).toEqual([]);
  });

  it('min fails when value is below the minimum', () => {
    expect(validate('age', 4 as never, { min: 5 }, state)).toHaveLength(1);
  });

  it('max passes when value equals the maximum', () => {
    expect(validate('age', 5 as never, { max: 5 }, state)).toEqual([]);
  });

  it('max fails when value exceeds the maximum', () => {
    expect(validate('age', 6 as never, { max: 5 }, state)).toHaveLength(1);
  });

  it('coerces a numeric string value (default string fields)', () => {
    expect(validate('age', '25' as never, { min: 18 }, state)).toEqual([]);
    expect(validate('age', '10' as never, { min: 18 }, state)).toHaveLength(1);
    expect(validate('age', '25' as never, { max: 18 }, state)).toHaveLength(1);
  });

  it('skips an empty or non-numeric value (required handles emptiness)', () => {
    expect(validate('age', '' as never, { min: 18 }, state)).toEqual([]);
    expect(validate('age', 'abc' as never, { min: 18 }, state)).toEqual([]);
  });
});

describe('match — cross-field validation', () => {
  it('passes when both fields have the same value', () => {
    const state = makeFormState({ password: 'secret' });
    expect(validate('username', 'secret', { match: 'password' }, state)).toEqual([]);
  });

  it('fails when the values differ', () => {
    const state = makeFormState({ password: 'secret' });
    expect(validate('username', 'wrong', { match: 'password' }, state)).toHaveLength(1);
  });

  it('passes when the target field has not been initialized yet', () => {
    const state = makeFormState({});
    expect(validate('username', 'val', { match: 'password' }, state)).toEqual([]);
  });

  it('passes when match is undefined', () => {
    const state = makeFormState({});
    expect(validate('username', 'val', { match: undefined }, state)).toEqual([]);
  });
});

describe('multiple constraints', () => {
  it('collects errors from all failing constraints', () => {
    const state = makeFormState();
    const errors = validate('username', 'ab', { required: true, minLength: 3, maxLength: 1 }, state);
    expect(errors).toHaveLength(2);
  });

  it('reports only the required error for an empty value, not a length error too', () => {
    // Length constraints defer emptiness to `required`, so an empty value that
    // is also required produces one actionable error rather than two.
    const state = makeFormState();
    const errors = validate('username', '', { required: true, minLength: 3 }, state);
    expect(errors).toEqual(['"username" is required']);
  });

  it('returns an empty array when all constraints pass', () => {
    const state = makeFormState();
    const errors = validate('username', 'alice', { required: true, minLength: 3, maxLength: 10 }, state);
    expect(errors).toEqual([]);
  });

  it('skips disabled constraints alongside active ones', () => {
    const state = makeFormState();
    const errors = validate('username', 'alice', { required: false, minLength: 3 }, state);
    expect(errors).toEqual([]);
  });
});

// These exist because `noValidate` on the form turned off the browser's own
// type-derived format checking (see BaseForm.tsx). Every expectation below was
// verified to match Chromium's `validity.typeMismatch` for the same value, which
// is the bar: this reproduces browser behavior rather than inventing a stricter
// or looser notion of a valid email/URL.
describe('type', () => {
  it('passes for a valid email address', () => {
    expect(validate('username', 'a@b.com', { type: 'email' }, makeFormState())).toEqual([]);
  });

  it('fails for text that is not an email address', () => {
    expect(validate('username', 'not-an-email', { type: 'email' }, makeFormState())).toEqual([
      '"username" must be a valid email address'
    ]);
  });

  // The spec's email production has no TLD requirement and permits dots at the
  // edges of the local part. Chromium accepts all three; a hand-rolled regex
  // would reject them and diverge from the behavior this is restoring.
  it.each(['a@b', '.leading@b.com', 'trailing.@b.com', "o'brien+tag@sub.example.co.uk", 'UPPER@Example.COM'])(
    'accepts %s, as the browser does',
    (value) => {
      expect(validate('username', value, { type: 'email' }, makeFormState())).toEqual([]);
    }
  );

  it.each(['a b@c.com', 'a@-hyphen.com', 'a@@b.com'])('rejects %s, as the browser does', (value) => {
    expect(validate('username', value, { type: 'email' }, makeFormState())).toHaveLength(1);
  });

  // A `multiple` email input would accept this; the constraint cannot see that
  // attribute, so it matches a plain type='email' input and rejects the list.
  it('rejects a comma-separated address list', () => {
    expect(validate('username', 'a@b.com,c@d.com', { type: 'email' }, makeFormState())).toHaveLength(1);
  });

  it('passes for an absolute URL', () => {
    expect(validate('username', 'https://example.com', { type: 'url' }, makeFormState())).toEqual([]);
  });

  it.each(['example.com', 'not a url', '//example.com', '/relative/path', 'https://'])(
    'rejects %s, which is not an absolute URL',
    (value) => {
      expect(validate('username', value, { type: 'url' }, makeFormState())).toEqual([
        '"username" must be a valid URL'
      ]);
    }
  );

  it.each(['mailto:a@b.com', 'ftp://files.example.com'])('accepts the non-http URL %s, as the browser does', (value) => {
    expect(validate('username', value, { type: 'url' }, makeFormState())).toEqual([]);
  });

  it("skips an empty value (emptiness is required's concern)", () => {
    expect(validate('username', '', { type: 'email' }, makeFormState())).toEqual([]);
    expect(validate('username', undefined, { type: 'url' }, makeFormState())).toEqual([]);
  });

  it('reports only the required error for an empty required email', () => {
    const errors = validate('username', '', { required: true, type: 'email' }, makeFormState());
    expect(errors).toEqual(['"username" is required']);
  });

  // The overwhelmingly common case: `type` is present on every input field, and
  // must stay inert for the types the browser never format-checked either.
  it.each(['text', 'password', 'checkbox', 'tel', 'date', 'search'])('ignores type=%s', (type) => {
    expect(validate('username', 'anything at all', { type }, makeFormState())).toEqual([]);
  });

  // Verified in Chromium: a number input's value sanitization algorithm reads
  // non-numeric text back as '', so nothing was lost to noValidate here and
  // there is deliberately no number format check to exercise.
  it('ignores type=number', () => {
    expect(validate('username', 'abc', { type: 'number' }, makeFormState())).toEqual([]);
  });
});

// stepConstraint.test.ts checks `step` itself against a recording of Chromium.
// These check the wiring instead: `step` is the first constraint that cannot be
// decided from its own value, so it only works if validate() hands each
// validator the field's *other* constraints. Calling the validator directly, as
// that suite does, would pass even if the plumbing were missing entirely.
describe('validate — step reads its sibling constraints', () => {
  it('reads type, without which step has no units to count in', () => {
    expect(validate('age', 7 as never, { type: 'number', step: 5 }, makeFormState())).toEqual([
      '"age" must be in increments of 5'
    ]);
    // Same value, same step, no type: a bare <input> is type='text', which has
    // no allowed value step in any browser.
    expect(validate('age', 7 as never, { step: 5 }, makeFormState())).toEqual([]);
  });

  it('reads min as the step base', () => {
    // 6 is 1 + 5, so it is on the ladder only because min moved the base off 0.
    expect(validate('age', 6 as never, { type: 'number', min: 1, step: 5 }, makeFormState())).toEqual([]);
    // ...and 5 falls off the same ladder, though it would be on the default one.
    expect(validate('age', 5 as never, { type: 'number', min: 1, step: 5 }, makeFormState())).toEqual([
      '"age" must be in increments of 5'
    ]);
  });

  it('reports min and step separately when a value violates both', () => {
    expect(validate('age', -3 as never, { type: 'number', min: 0, step: 2 }, makeFormState())).toEqual([
      '"age" is too small',
      '"age" must be in increments of 2'
    ]);
  });

  it('leaves an empty value to required', () => {
    expect(validate('age', '' as never, { type: 'number', step: 5 }, makeFormState())).toEqual([]);
    expect(
      validate('age', '' as never, { type: 'number', required: true, step: 5 }, makeFormState())
    ).toEqual(['"age" is required']);
  });
});
