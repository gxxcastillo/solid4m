import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, type FormStore, createFormStore } from '@gxxc/solid-formation-state';

import { FieldArray } from './FieldArray';
import styles from './FieldArray.module.css';

type Row = { title: string };
type TestFields = Record<string, unknown>;

describe('FieldArray row layout', () => {
  afterEach(cleanup);

  it('wraps each row in an element carrying the stable hook and its own row-local flex/gap layout', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <FieldArray<Row> name='items' defaultValue={[{ title: 'a' }, { title: 'b' }]}>
          {(fields, item) => <fields.InputField name='title' label='Title' defaultValue={item.title} />}
        </FieldArray>
      </FormContextProvider>
    ));

    const rows = container.querySelectorAll('.sf-field-array-row');
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row.classList.contains(styles.row)).toBe(true));
  });

  it('composes a caller-supplied rowClass alongside the built-in hook classes', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <FieldArray<Row> name='items' defaultValue={[{ title: 'a' }]} rowClass='my-row'>
          {(fields, item) => <fields.InputField name='title' label='Title' defaultValue={item.title} />}
        </FieldArray>
      </FormContextProvider>
    ));

    const row = container.querySelector('.sf-field-array-row')!;
    expect(row.classList.contains('my-row')).toBe(true);
    expect(row.classList.contains(styles.row)).toBe(true);
  });

  it('starts with zero rows when defaultValue is omitted', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <FieldArray<Row> name='items'>
          {(fields, item) => <fields.InputField name='title' label='Title' defaultValue={item.title} />}
        </FieldArray>
      </FormContextProvider>
    ));

    expect(container.querySelectorAll('.sf-field-array-row')).toHaveLength(0);
  });

  it('hands helpersRef the same helpers append/remove use, synchronously on mount', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    let received: unknown;

    render(() => (
      <FormContextProvider store={store}>
        <FieldArray<Row> name='items' helpersRef={(helpers) => (received = helpers)}>
          {(fields, item) => <fields.InputField name='title' label='Title' defaultValue={item.title} />}
        </FieldArray>
      </FormContextProvider>
    ));

    expect(received).toMatchObject({
      append: expect.any(Function),
      prepend: expect.any(Function),
      insert: expect.any(Function),
      remove: expect.any(Function),
      move: expect.any(Function),
      swap: expect.any(Function),
      pathAt: expect.any(Function)
    });
  });
});
