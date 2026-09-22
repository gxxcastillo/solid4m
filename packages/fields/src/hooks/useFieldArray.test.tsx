import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';

import { FormContextProvider, type FormStore, createFormStore } from '@gxxc/solid4m-state';

import { type FieldArrayHelpers, type FieldArrayItem, useFieldArray } from './useFieldArray';

type Row = { title: string };
type TestFields = Record<string, unknown>;

function Capture(props: {
  name: string;
  defaultValue?: readonly Row[];
  onCapture: (result: readonly [() => FieldArrayItem<Row>[], FieldArrayHelpers<Row>]) => void;
}) {
  props.onCapture(useFieldArray<Row>(props.name, props.defaultValue));
  return null;
}

function setup(defaultValue?: readonly Row[]) {
  return createRoot((dispose) => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    let captured!: readonly [() => FieldArrayItem<Row>[], FieldArrayHelpers<Row>];

    (() => (
      <FormContextProvider store={store}>
        <Capture name='items' defaultValue={defaultValue} onCapture={(r) => (captured = r)} />
      </FormContextProvider>
    ))();

    const [state, mutations] = store;
    return { state, mutations, items: captured[0], helpers: captured[1], dispose };
  });
}

describe('useFieldArray', () => {
  it('seeds items from defaultValue with unique keys', () => {
    const { items, dispose } = setup([{ title: 'a' }, { title: 'b' }]);
    const [first, second] = items();

    expect(items()).toHaveLength(2);
    expect(first.defaultValue).toEqual({ title: 'a' });
    expect(second.defaultValue).toEqual({ title: 'b' });
    expect(first.key).not.toBe(second.key);
    dispose();
  });

  it('append adds a new item at the end without touching existing store fields', () => {
    const { state, mutations, items, helpers, dispose } = setup([{ title: 'a' }]);
    mutations.initializeField('items.0.title', 'a', []);

    helpers.append({ title: 'b' });

    expect(items()).toHaveLength(2);
    expect(items()[1].defaultValue).toEqual({ title: 'b' });
    expect(state.getFieldValue('items.0.title')).toBe('a');
    dispose();
  });

  it('prepend inserts a new item at the front, shifting existing fields', () => {
    const { state, mutations, items, helpers, dispose } = setup([{ title: 'a' }]);
    mutations.initializeField('items.0.title', 'a', []);

    helpers.prepend({ title: 'b' });

    expect(items()).toHaveLength(2);
    expect(items()[0].defaultValue).toEqual({ title: 'b' });
    expect(state.getFieldValue('items.1.title')).toBe('a');
    dispose();
  });

  it('remove renames survivors to their shifted index, preserving live value/errors/history', () => {
    const { state, mutations, items, helpers, dispose } = setup([
      { title: 'a' },
      { title: 'b' },
      { title: 'c' }
    ]);
    mutations.initializeField('items.0.title', 'a', []);
    mutations.initializeField('items.1.title', 'b', []);
    mutations.setFieldErrors('items.1.title', ['taken']);
    mutations.initializeField('items.2.title', 'c', []);
    const keysBefore = items().map((i) => i.key);

    helpers.remove(0);

    expect(state.getField('items.2.title')).toBeUndefined();
    expect(state.getFieldValue('items.0.title')).toBe('b');
    expect(state.getFieldErrors('items.0.title')).toEqual(['taken']);
    expect(state.getFieldValue('items.1.title')).toBe('c');

    // Surviving rows' identity tokens carry over unchanged, not regenerated —
    // proving useFieldArray tracks the same rows, not just the same count.
    expect(items().map((i) => i.key)).toEqual([keysBefore[1], keysBefore[2]]);
    dispose();
  });

  it('insert shifts existing fields at or after the index up by one', () => {
    const { state, mutations, helpers, dispose } = setup([{ title: 'a' }, { title: 'b' }]);
    mutations.initializeField('items.0.title', 'a', []);
    mutations.initializeField('items.1.title', 'b', []);

    helpers.insert(1, { title: 'new' });

    expect(state.getFieldValue('items.0.title')).toBe('a');
    expect(state.getFieldValue('items.2.title')).toBe('b');
    expect(state.getField('items.1.title')).toBeUndefined();
    dispose();
  });

  it('move permutes the fields between the source and destination index', () => {
    const { state, mutations, helpers, dispose } = setup([
      { title: 'a' },
      { title: 'b' },
      { title: 'c' }
    ]);
    mutations.initializeField('items.0.title', 'a', []);
    mutations.initializeField('items.1.title', 'b', []);
    mutations.initializeField('items.2.title', 'c', []);

    helpers.move(0, 2);

    expect(state.getFieldValue('items.0.title')).toBe('b');
    expect(state.getFieldValue('items.1.title')).toBe('c');
    expect(state.getFieldValue('items.2.title')).toBe('a');
    dispose();
  });

  // moveIndex's forward and backward shifts are different branches; the
  // forward case above alone never exercises this one.
  it('move permutes the fields when moving backward (to a lower index)', () => {
    const { state, mutations, helpers, dispose } = setup([
      { title: 'a' },
      { title: 'b' },
      { title: 'c' }
    ]);
    mutations.initializeField('items.0.title', 'a', []);
    mutations.initializeField('items.1.title', 'b', []);
    mutations.initializeField('items.2.title', 'c', []);

    helpers.move(2, 0);

    expect(state.getFieldValue('items.0.title')).toBe('c');
    expect(state.getFieldValue('items.1.title')).toBe('a');
    expect(state.getFieldValue('items.2.title')).toBe('b');
    dispose();
  });

  it('swap exchanges exactly the two targeted fields', () => {
    const { state, mutations, helpers, dispose } = setup([{ title: 'a' }, { title: 'b' }, { title: 'c' }]);
    mutations.initializeField('items.0.title', 'a', []);
    mutations.initializeField('items.1.title', 'b', []);
    mutations.initializeField('items.2.title', 'c', []);

    helpers.swap(0, 2);

    expect(state.getFieldValue('items.0.title')).toBe('c');
    expect(state.getFieldValue('items.1.title')).toBe('b');
    expect(state.getFieldValue('items.2.title')).toBe('a');
    dispose();
  });

  it('pathAt derives a row\'s base path from the array\'s own name and a reactive index', () => {
    const { helpers, dispose } = setup([{ title: 'a' }, { title: 'b' }]);
    const [index, setIndex] = createSignal(0);
    const path = helpers.pathAt(index);

    expect(path()).toBe('items.0');
    setIndex(1);
    expect(path()).toBe('items.1');
    dispose();
  });

  it('leaves an unrelated field untouched by a remove operation', () => {
    const { state, mutations, helpers, dispose } = setup([{ title: 'a' }, { title: 'b' }]);
    mutations.initializeField('items.0.title', 'a', []);
    mutations.initializeField('items.1.title', 'b', []);
    mutations.initializeField('email', 'x@y.com', []);

    helpers.remove(0);

    expect(state.getFieldValue('email')).toBe('x@y.com');
    dispose();
  });
});
