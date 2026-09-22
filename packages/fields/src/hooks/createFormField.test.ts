import { describe, expect, it, vi } from 'vitest';

import { createOnBlur, createOnInput, createValueSetter } from './fieldBindings';

function makeState(value?: unknown) {
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
    getFieldValue: () => value,
    getFieldErrors: () => undefined,
    hasFieldBeenInitialized: () => false,
    hasFieldBeenValid: () => undefined,
    hasFieldChanged: () => undefined,
    hasFieldBlurred: () => undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeMutations() {
  return {
    initializeField: vi.fn(),
    removeField: vi.fn(),
    setFieldValue: vi.fn(),
    setFieldErrors: vi.fn(),
    setChangedField: vi.fn(),
    setBlurredField: vi.fn(),
    resetField: vi.fn(),
    reset: vi.fn(),
    setValues: vi.fn(),
    setIsReady: vi.fn(),
    setIsLoading: vi.fn(),
    setIsProcessing: vi.fn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function makeInputEvent(checked: boolean, value = 'on') {
  return {
    currentTarget: { checked, value }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('createOnInput', () => {
  it('passes booleans for selectable fields', () => {
    const setValue = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInput = createOnInput(setValue, { name: 'accepted', isSelectable: true } as any);

    onInput(makeInputEvent(true));
    onInput(makeInputEvent(false));

    expect(setValue.mock.calls).toEqual([[true], [false]]);
  });
});

describe('createOnBlur', () => {
  it('marks the field blurred and passes a boolean for selectable fields', () => {
    const setValue = vi.fn();
    const setBlurredField = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onBlur = createOnBlur(setValue, { name: 'accepted', isSelectable: true } as any, setBlurredField);

    onBlur(makeInputEvent(true));

    expect(setBlurredField).toHaveBeenCalledWith('accepted');
    expect(setValue).toHaveBeenCalledWith(true);
  });
});

describe('createValueSetter', () => {
  it('stores selectable field values as booleans', () => {
    const state = makeState(false);
    const mutations = makeMutations();
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'accepted', isSelectable: true } as any
    );

    setValue(true);

    expect(mutations.setFieldValue).toHaveBeenCalledWith('accepted', true, []);
  });

  it('initializes non-selectable fields even when the parsed value is unchanged', () => {
    const state = makeState(undefined);
    const mutations = makeMutations();
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'username', parse: (value: unknown) => value } as any
    );

    setValue(undefined, true);

    expect(mutations.initializeField).toHaveBeenCalledWith('username', undefined, [], undefined);
  });

  it('calls a sync custom validator when built-in validation passes', () => {
    const state = makeState(undefined);
    const mutations = makeMutations();
    const validator = vi.fn(
      (_name: string, _val: unknown, _state: unknown, setErrors: (e: string[]) => void) => {
        setErrors(['taken']);
      }
    );
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'username', parse: (v: unknown) => v, validator } as any
    );

    setValue('alice');

    expect(validator).toHaveBeenCalledOnce();
    expect(mutations.setFieldErrors).toHaveBeenCalledWith('username', ['taken']);
  });

  it('skips the custom validator when built-in constraints fail', () => {
    const state = makeState(undefined);
    const mutations = makeMutations();
    const validator = vi.fn();
    const setValue = createValueSetter(
      state,
      mutations,
      { required: true },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'username', parse: (v: unknown) => v, validator } as any
    );

    setValue('');

    expect(validator).not.toHaveBeenCalled();
  });

  it('ignores a stale async validator result for a value that was superseded', () => {
    const state = makeState();
    let current: unknown = undefined;
    state.getFieldValue = () => current;
    const mutations = makeMutations();
    const pending: Array<(e: string[]) => void> = [];
    const validator = vi.fn((_n: string, _v: unknown, _s: unknown, setErrors: (e: string[]) => void) => {
      pending.push(setErrors);
    });
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'username', parse: (v: unknown) => v, validator } as any
    );

    setValue('al'); // validator #1 queued
    current = 'al'; // simulate the store committing the value
    setValue('alice'); // validator #2 queued
    current = 'alice';

    // Resolve out of order: the newer value first, then the stale one.
    pending[1](['result-for-alice']);
    pending[0](['result-for-al']);

    expect(mutations.setFieldErrors).toHaveBeenCalledTimes(1);
    expect(mutations.setFieldErrors).toHaveBeenCalledWith('username', ['result-for-alice']);
  });

  it('ignores an async validator result after the field was externally reset', () => {
    let generation = 0;
    const state = makeState();
    state.getField = () => ({ generation }) as never;
    const mutations = makeMutations();
    let pendingSetErrors!: (e: string[]) => void;
    const validator = vi.fn((_n: string, _v: unknown, _s: unknown, setErrors: (e: string[]) => void) => {
      pendingSetErrors = setErrors;
    });
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'username', parse: (v: unknown) => v, validator } as any
    );

    setValue('alice');

    // Simulates resetField/reset/setValues bumping generation mid-flight.
    generation++;
    pendingSetErrors(['stale']);

    expect(mutations.setFieldErrors).not.toHaveBeenCalled();
  });

  it('still applies an async validator result when the generation is unchanged', () => {
    const state = makeState();
    state.getField = () => ({ generation: 0 }) as never;
    const mutations = makeMutations();
    let pendingSetErrors!: (e: string[]) => void;
    const validator = vi.fn((_n: string, _v: unknown, _s: unknown, setErrors: (e: string[]) => void) => {
      pendingSetErrors = setErrors;
    });
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'username', parse: (v: unknown) => v, validator } as any
    );

    setValue('alice');
    pendingSetErrors(['taken']);

    expect(mutations.setFieldErrors).toHaveBeenCalledWith('username', ['taken']);
  });

  it('revalidate re-runs validation against the current value', () => {
    const state = makeState('secret');
    state.hasFieldBeenInitialized = () => true;
    const mutations = makeMutations();
    const setValue = createValueSetter(
      state,
      mutations,
      { match: 'password' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'confirm', parse: (v: unknown) => v } as any
    );

    setValue.revalidate();

    expect(mutations.setFieldValue).toHaveBeenCalledWith('confirm', 'secret', []);
  });

  it('revalidate is a no-op before the field is initialized', () => {
    const state = makeState('secret');
    state.hasFieldBeenInitialized = () => false;
    const mutations = makeMutations();
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'confirm', parse: (v: unknown) => v } as any
    );

    setValue.revalidate();

    expect(mutations.setFieldValue).not.toHaveBeenCalled();
  });

  it('writes to the current name after props.name changes post-mount, not a mount-time snapshot', () => {
    // Simulates a useFieldArray row when an earlier item is removed and
    // remapFieldNames re-addresses this row's field — the component instance
    // survives, so its props.name changes without a remount.
    const state = makeState('a');
    const mutations = makeMutations();
    const props: { name: string; parse: (v: unknown) => unknown } = {
      name: 'items.1.title',
      parse: (v: unknown) => v
    };
    const setValue = createValueSetter(state, mutations, {}, props as never);

    setValue('first');
    expect(mutations.setFieldValue).toHaveBeenLastCalledWith('items.1.title', 'first', []);

    props.name = 'items.0.title';
    setValue('second');
    expect(mutations.setFieldValue).toHaveBeenLastCalledWith('items.0.title', 'second', []);
  });

  it("reattaches an in-flight async validator result under the field's current name after a shift", () => {
    // remapFieldNames preserves a field's generation across a rename, so the
    // staleness guard still finds the same record and applies the result once
    // resolved — proven here with a fixed generation and props.name changed
    // mid-flight.
    const state = makeState();
    state.getField = () => ({ generation: 0 }) as never;
    const mutations = makeMutations();
    let pendingSetErrors!: (e: string[]) => void;
    const props: { name: string; parse: (v: unknown) => unknown; validator: unknown } = {
      name: 'items.1.title',
      parse: (v: unknown) => v,
      validator: vi.fn((_n: string, _v: unknown, _s: unknown, setErrors: (e: string[]) => void) => {
        pendingSetErrors = setErrors;
      })
    };
    const setValue = createValueSetter(state, mutations, {}, props as never);

    setValue('draft');
    props.name = 'items.0.title';
    pendingSetErrors(['taken']);

    expect(mutations.setFieldErrors).toHaveBeenCalledWith('items.0.title', ['taken']);
  });

  it('reads the current value when invoked instead of using a mount-time snapshot', () => {
    let currentValue = false;
    const state = makeState();
    state.getFieldValue = () => currentValue;
    const mutations = makeMutations();
    const setValue = createValueSetter(
      state,
      mutations,
      {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { name: 'accepted', isSelectable: true } as any
    );

    currentValue = true;
    setValue(true);

    expect(mutations.setFieldValue).not.toHaveBeenCalled();
  });
});
