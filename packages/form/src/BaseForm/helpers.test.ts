import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createBaseFormOnSubmitHandler,
  fieldsToProps,
  fieldsToValueSnapshot,
  focusFirstInvalidField,
  getSubmitErrorMessage,
  resolveSubmitHandler
} from './helpers';

// resolveSubmitHandler warns on an unresolvable submit, so several tests mute
// console.warn. Nothing here configures restoreMocks, so restore explicitly —
// a spy left installed would silently swallow the warning a later test asserts.
afterEach(() => {
  vi.restoreAllMocks();
});

function makeEvent(name = '') {
  return {
    preventDefault: vi.fn(),
    submitter: { name, dataset: {} as Record<string, string> }
  } as unknown as Event & { submitter: HTMLElement };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    fields: [],
    errors: [],
    isReady: true,
    isLoading: false,
    isProcessing: false,
    haveValuesChanged: true,
    isFormValid: true,
    isFieldValid: () => undefined,
    getField: () => undefined,
    getFieldValue: () => undefined,
    getFieldErrors: () => undefined,
    hasFieldBeenInitialized: () => false,
    hasFieldBeenValid: () => undefined,
    hasFieldChanged: () => undefined,
    hasFieldBlurred: () => undefined,
    ...overrides
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeMutations() {
  return {
    initializeField: vi.fn(),
    removeField: vi.fn(),
    setFieldValue: vi.fn(),
    setFieldErrors: vi.fn(),
    setFieldsErrors: vi.fn(),
    setChangedField: vi.fn(),
    setBlurredField: vi.fn(),
    setBlurredFields: vi.fn(),
    resetField: vi.fn(),
    reset: vi.fn(),
    setValues: vi.fn(),
    setErrors: vi.fn(),
    setIsReady: vi.fn(),
    setIsLoading: vi.fn(),
    setIsProcessing: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('fieldsToProps', () => {
  it('converts fields array to a name→value map', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any[] = [
      { name: 'email', value: 'a@b.com' },
      { name: 'age', value: 30 }
    ];
    expect(fieldsToProps(fields)).toEqual({ email: 'a@b.com', age: 30 });
  });

  it('nests dotted and array-index field names into a real nested object', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any[] = [
      { name: 'items.0.title', value: 'a' },
      { name: 'items.1.title', value: 'b' },
      { name: 'user.email', value: 'c' },
      { name: 'email', value: 'a@b.com' }
    ];
    expect(fieldsToProps(fields)).toEqual({
      items: [{ title: 'a' }, { title: 'b' }],
      user: { email: 'c' },
      email: 'a@b.com'
    });
  });

  it('defines prototype-looking field names without mutating object prototypes', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any[] = [
      { name: '__proto__', value: { safe: true } },
      { name: '__proto__.polluted', value: true }
    ];
    const props = fieldsToProps(fields) as Record<string, unknown>;

    expect(Object.hasOwn(props, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(props)).toBe(Object.prototype);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(props['__proto__.polluted']).toBe(true);
  });
});

describe('fieldsToValueSnapshot', () => {
  it('keeps a flat name→value map for dotted field names', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any[] = [
      { name: 'items.0.title', value: 'a' },
      { name: 'email', value: 'a@b.com' }
    ];
    expect(fieldsToValueSnapshot(fields)).toEqual({ 'items.0.title': 'a', email: 'a@b.com' });
  });

  it('keeps prototype-looking field names as own snapshot keys', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fields: any[] = [{ name: '__proto__', value: 'literal' }];
    const snapshot = fieldsToValueSnapshot(fields);

    expect(Object.hasOwn(snapshot, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(snapshot)).toBe(Object.prototype);
    expect(snapshot['__proto__']).toBe('literal');
  });
});

describe('createBaseFormOnSubmitHandler', () => {
  it('calls onSubmit with serialized field values', async () => {
    const onSubmit = vi.fn();
    const state = makeState({
      fields: [
        {
          name: 'email',
          value: 'test@example.com',
          errors: [],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: true,
          hasBeenValid: false
        }
      ]
    });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' }, '');
  });

  it('does not call onSubmit while already processing', async () => {
    const onSubmit = vi.fn();
    const state = makeState({ isProcessing: true });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit while loading', async () => {
    const onSubmit = vi.fn();
    const state = makeState({ isLoading: true });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setIsProcessing).not.toHaveBeenCalled();
  });

  it('submits even when no field values have changed', async () => {
    // A pristine, pre-filled, or submit-to-validate form must still submit;
    // submission is only blocked while already processing.
    const onSubmit = vi.fn();
    const state = makeState({ haveValuesChanged: false });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('sets and resets isProcessing around a successful async submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  // The token SubmitButton stamps on itself, forwarded so it can scope its
  // spinner to the one action actually running. Not `name`, which cannot
  // identify a button and is already public API (it reaches the consumer as
  // `buttonName`).
  it('forwards the submitter token to setIsProcessing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    const event = makeEvent();
    (event.submitter as unknown as { dataset: Record<string, string> }).dataset.sfSubmitter = 'sf-7';
    await handler(event);

    expect(mutations.setIsProcessing.mock.calls).toEqual([[true, 'sf-7'], [false]]);
  });

  it('reports no submitter for a submit no button initiated', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler({ preventDefault: vi.fn(), submitter: null } as unknown as Parameters<typeof handler>[0]);

    expect(mutations.setIsProcessing.mock.calls).toEqual([[true, undefined], [false]]);
  });

  it('surfaces a failed async submit into form state instead of rejecting', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('submit failed'));
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    // The failure is captured into form state (via setErrors) rather than
    // rejecting the handler's promise, but isProcessing is always cleared via finally.
    await expect(handler(makeEvent())).resolves.toBeUndefined();

    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
    expect(mutations.setErrors).toHaveBeenCalledWith(['submit failed']);
  });

  it('stringifies a non-Error rejection reason', async () => {
    const onSubmit = vi.fn().mockRejectedValue('nope');
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(mutations.setErrors).toHaveBeenCalledWith(['nope']);
  });

  it('clears previous submit errors before invoking the handler again', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(mutations.setErrors).toHaveBeenCalledWith([]);
  });

  it('blocks submit and marks every field blurred when the form is invalid', async () => {
    const onSubmit = vi.fn();
    const state = makeState({
      isFormValid: false,
      fields: [
        {
          name: 'email',
          value: '',
          errors: ['Required'],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: false,
          hasBeenValid: false
        },
        {
          name: 'password',
          value: '',
          errors: ['Required'],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: false,
          hasBeenValid: false
        }
      ]
    });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setBlurredFields).toHaveBeenCalledOnce();
  });

  it('blocks submit and maps schema path issues onto fields', async () => {
    const onSubmit = vi.fn();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue({
          issues: [{ message: 'Email is invalid', path: ['email'] }]
        })
      }
    };
    const state = makeState({
      fields: [
        {
          name: 'email',
          value: 'not-an-email',
          errors: [],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: true,
          hasBeenValid: true
        }
      ]
    });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    await handler(makeEvent());

    expect(schema['~standard'].validate).toHaveBeenCalledWith({ email: 'not-an-email' });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setFieldsErrors).toHaveBeenCalledWith(new Map([['email', ['Email is invalid']]]));
    expect(mutations.setBlurredFields).toHaveBeenCalledOnce();
    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('validates via schema and surfaces field errors even when onSubmit is not provided', async () => {
    // A form can use `schema` purely to drive validation feedback without
    // wiring up `onSubmit` yet (or ever) — resolveSubmitHandler returning
    // undefined must not short-circuit schema validation, only invoking a
    // handler afterward (see the ambiguous-named-handler case below).
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue({
          issues: [{ message: 'Email is invalid', path: ['email'] }]
        })
      }
    };
    const state = makeState({
      fields: [
        {
          name: 'email',
          value: 'not-an-email',
          errors: [],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: true,
          hasBeenValid: true
        }
      ]
    });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ schema } as any, state, mutations);

    await handler(makeEvent());

    expect(schema['~standard'].validate).toHaveBeenCalledWith({ email: 'not-an-email' });
    expect(mutations.setFieldsErrors).toHaveBeenCalledWith(new Map([['email', ['Email is invalid']]]));
    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('surfaces pathless schema issues as form-level errors', async () => {
    const onSubmit = vi.fn();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue({
          issues: [{ message: 'Form is invalid' }]
        })
      }
    };
    const state = makeState({
      fields: [
        {
          name: 'email',
          value: 'test@example.com',
          errors: [],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: true,
          hasBeenValid: true
        }
      ]
    });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setErrors).toHaveBeenLastCalledWith(['Form is invalid']);
    expect(mutations.setFieldsErrors).toHaveBeenCalledWith(new Map());
  });

  it('passes the validated schema output to onSubmit', async () => {
    const onSubmit = vi.fn();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue({
          value: { email: 'trimmed@example.com' }
        })
      }
    };
    const state = makeState({
      fields: [
        {
          name: 'email',
          value: ' trimmed@example.com ',
          errors: [],
          hasBeenInitialized: true,
          hasBeenBlurred: false,
          hasChanged: true,
          hasBeenValid: true
        }
      ]
    });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    await handler(makeEvent());

    expect(onSubmit).toHaveBeenCalledWith({ email: 'trimmed@example.com' }, '');
  });

  it('ignores stale async schema errors when field values change before validation resolves', async () => {
    const onSubmit = vi.fn();
    const pending = deferred<{ issues: Array<{ message: string; path: string[] }> }>();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue(pending.promise)
      }
    };
    const fields = [
      {
        name: 'email',
        value: 'old@example.com',
        errors: [],
        hasBeenInitialized: true,
        hasBeenBlurred: false,
        hasChanged: true,
        hasBeenValid: true
      }
    ];
    const state = makeState({ fields });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    const submitted = handler(makeEvent());
    fields[0].value = 'new@example.com';
    pending.resolve({ issues: [{ message: 'Email is invalid', path: ['email'] }] });
    await submitted;

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setFieldsErrors).not.toHaveBeenCalled();
    expect(mutations.setBlurredFields).not.toHaveBeenCalled();
    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('does not submit stale async schema output when field values change before validation resolves', async () => {
    const onSubmit = vi.fn();
    const pending = deferred<{ value: { email: string } }>();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue(pending.promise)
      }
    };
    const fields = [
      {
        name: 'email',
        value: 'old@example.com',
        errors: [],
        hasBeenInitialized: true,
        hasBeenBlurred: false,
        hasChanged: true,
        hasBeenValid: true
      }
    ];
    const state = makeState({ fields });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    const submitted = handler(makeEvent());
    fields[0].value = 'new@example.com';
    pending.resolve({ value: { email: 'old@example.com' } });
    await submitted;

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('does not submit stale async schema output when a field is reset to its own value while validation is pending', async () => {
    // resetField/reset can revert a field to a value it already holds — its
    // value is unchanged, but its generation still bumps and its
    // errors/hasBeenValid are force-cleared out from under this validation.
    // A value-only staleness check would miss this; generation must be
    // compared too.
    const onSubmit = vi.fn();
    const pending = deferred<{ value: { email: string } }>();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue(pending.promise)
      }
    };
    const fields = [
      {
        name: 'email',
        value: 'old@example.com',
        errors: [],
        hasBeenInitialized: true,
        hasBeenBlurred: false,
        hasChanged: true,
        hasBeenValid: true,
        generation: 1
      }
    ];
    const state = makeState({ fields });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    const submitted = handler(makeEvent());
    fields[0].generation = 2;
    pending.resolve({ value: { email: 'old@example.com' } });
    await submitted;

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('still submits when an unrelated field mounts or unmounts while validation is pending', async () => {
    const onSubmit = vi.fn();
    const pending = deferred<{ value: { email: string } }>();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue(pending.promise)
      }
    };
    const fields = [
      {
        name: 'email',
        value: 'a@example.com',
        errors: [],
        hasBeenInitialized: true,
        hasBeenBlurred: false,
        hasChanged: true,
        hasBeenValid: true
      }
    ];
    const state = makeState({ fields });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    const submitted = handler(makeEvent());
    // An unrelated conditionally-rendered field mounts while the async schema
    // validation is in flight — the submitted email value never changed, so
    // this must not be treated as stale.
    fields.push({
      name: 'newsletter',
      value: 'yes',
      errors: [],
      hasBeenInitialized: true,
      hasBeenBlurred: false,
      hasChanged: false,
      hasBeenValid: true
    });
    pending.resolve({ value: { email: 'a@example.com' } });
    await submitted;

    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@example.com' }, '');
  });

  it('surfaces a genuine async schema error even if field values changed while it was pending', async () => {
    const onSubmit = vi.fn();
    const pending = deferred<never>();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn().mockReturnValue(pending.promise)
      }
    };
    const fields = [
      {
        name: 'email',
        value: 'old@example.com',
        errors: [],
        hasBeenInitialized: true,
        hasBeenBlurred: false,
        hasChanged: true,
        hasBeenValid: true
      }
    ];
    const state = makeState({ fields });
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit, schema } as any, state, mutations);

    const submitted = handler(makeEvent());
    fields[0].value = 'new@example.com';
    pending.promise.catch(() => {});
    pending.reject(new Error('validator unreachable'));
    await submitted;

    expect(onSubmit).not.toHaveBeenCalled();
    expect(mutations.setErrors).toHaveBeenCalledWith(['validator unreachable']);
    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('does not validate or touch fields when a named submit handler is ambiguous, even with a schema present', async () => {
    // Expected to warn: an ambiguous map is exactly the misconfiguration
    // resolveSubmitHandler reports. Muted so the suite output stays clean.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const saveDraft = vi.fn();
    const publish = vi.fn();
    const schema = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: vi.fn()
      }
    };
    const fields = [
      {
        name: 'title',
        value: '',
        errors: [],
        hasBeenInitialized: true,
        hasBeenBlurred: false,
        hasChanged: false,
        hasBeenValid: false
      }
    ];
    const state = makeState({ fields });
    const mutations = makeMutations();
    const handler = createBaseFormOnSubmitHandler(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { onSubmit: { saveDraft, publish }, schema } as any,
      state,
      mutations
    );

    // No submitter name (e.g. Enter key) with two handlers is ambiguous.
    await handler(makeEvent());

    expect(schema['~standard'].validate).not.toHaveBeenCalled();
    expect(mutations.setIsProcessing).not.toHaveBeenCalled();
    expect(mutations.setBlurredFields).not.toHaveBeenCalled();
    expect(saveDraft).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('sets and resets isProcessing for a sync submit handler', async () => {
    const onSubmit = vi.fn().mockReturnValue(undefined);
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit } as any, state, mutations);

    await handler(makeEvent());

    expect(mutations.setIsProcessing.mock.calls.map((call: unknown[]) => call[0])).toEqual([true, false]);
  });

  it('invokes the sole object handler when submitted without a named button (Enter key)', async () => {
    const login = vi.fn();
    const state = makeState();
    const mutations = makeMutations();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = createBaseFormOnSubmitHandler({ onSubmit: { login } } as any, state, mutations);

    await handler(makeEvent('')); // empty submitter name == no named button

    expect(login).toHaveBeenCalledOnce();
  });
});

describe('getSubmitErrorMessage', () => {
  it('returns the message of an Error instance', () => {
    expect(getSubmitErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('stringifies non-Error values', () => {
    expect(getSubmitErrorMessage('boom')).toBe('boom');
    expect(getSubmitErrorMessage(404)).toBe('404');
  });
});

describe('focusFirstInvalidField', () => {
  function makeForm(ids: string[]) {
    const form = document.createElement('form');
    for (const id of ids) {
      const input = document.createElement('input');
      input.id = id;
      form.append(input);
    }
    document.body.append(form);
    return form;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invalid = (name: string) => ({ name, errors: ['Required'] }) as any;

  it('focuses the first errored field', () => {
    const form = makeForm(['email', 'username']);
    focusFirstInvalidField(form, [invalid('email'), invalid('username')]);
    expect(document.activeElement).toBe(document.getElementById('email'));
    form.remove();
  });

  // `disabled` is the only reason focus can't land that is readable up front. A
  // field that is present but not rendered — a collapsed accordion step, a
  // `display: none` branch, `type='hidden'` — accepts focus() and silently
  // ignores it. happy-dom focuses anything, so the no-op is stubbed here; the
  // point is that the walk continues instead of stopping on a field that never
  // took focus and leaving the user stranded on the submit button.
  it('continues past a field whose focus() does not take', () => {
    const form = makeForm(['email', 'username']);
    const hidden = document.getElementById('email') as HTMLInputElement;
    hidden.focus = () => undefined;

    focusFirstInvalidField(form, [invalid('email'), invalid('username')]);

    expect(document.activeElement).toBe(document.getElementById('username'));
    form.remove();
  });
});

describe('resolveSubmitHandler', () => {
  it('returns a function-style handler directly', () => {
    const fn = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveSubmitHandler(fn as any, 'anything')).toBe(fn);
  });

  it('selects an object handler by submitter name', () => {
    const saveDraft = vi.fn();
    const publish = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveSubmitHandler({ saveDraft, publish } as any, 'publish')).toBe(publish);
  });

  it('falls back to the sole handler when there is no submitter name', () => {
    const login = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveSubmitHandler({ login } as any, undefined)).toBe(login);
  });

  it('returns undefined for an ambiguous map with no submitter name', () => {
    // Expected to warn — that is asserted below; muted here to keep the run readable.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const saveDraft = vi.fn();
    const publish = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(resolveSubmitHandler({ saveDraft, publish } as any, undefined)).toBeUndefined();
  });
});

// The one remaining silent no-op in the submit path: a handler map plus a button
// that cannot select from it means nothing runs at all — no handler, no error,
// no visible change. Measured before adding this: clicking either of two unnamed
// buttons against `{ saveDraft, publish }` called neither of them.
describe('resolveSubmitHandler — unresolvable submits are reported', () => {
  const handlers = { saveDraft: vi.fn(), publish: vi.fn() };

  it('warns when the submitting button has no name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSubmitHandler(handlers, '')).toBeUndefined();

    expect(warn).toHaveBeenCalledOnce();
    const message = warn.mock.calls[0][0] as string;
    // Names the fix, and lists the keys a name has to match.
    expect(message).toContain('has no `name`');
    expect(message).toContain('"saveDraft", "publish"');
  });

  it('warns when the name matches no handler', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSubmitHandler(handlers, 'archive')).toBeUndefined();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('no handler named "archive"');
  });

  it('stays quiet when a handler is selected', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSubmitHandler(handlers, 'publish')).toBe(handlers.publish);

    expect(warn).not.toHaveBeenCalled();
  });

  // The unambiguous fallback is not a misconfiguration — a single-handler map
  // needs no name, so warning there would train people to ignore the warning.
  it('stays quiet when a lone handler resolves it unambiguously', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const only = { publish: vi.fn() };

    expect(resolveSubmitHandler(only, '')).toBe(only.publish);

    expect(warn).not.toHaveBeenCalled();
  });
});
