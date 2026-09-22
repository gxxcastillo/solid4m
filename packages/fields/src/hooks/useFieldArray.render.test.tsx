import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { For } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, type FormStore, createFormStore } from '@gxxc/solid4m-state';

import { InputField } from '../InputField/InputField';
import { useFieldArray } from './useFieldArray';

type Row = { title: string };
type TestFields = Record<string, unknown>;

function LineItems(props: { onRowKeys: (keys: string[]) => void }) {
  const [items, arr] = useFieldArray<Row>('items', [{ title: 'a' }, { title: 'b' }, { title: 'c' }]);
  props.onRowKeys(items().map((item) => item.key));

  return (
    <For each={items()}>
      {(item, index) => (
        <div>
          {/* Explicit <TestFields>: TS can't infer M from a template-literal
              `name` alone, so without it falls back to the `object`
              constraint instead of the `FieldValueMapping` default — matches
              the store's own <TestFields>. */}
          <InputField<TestFields>
            name={`items.${index()}.title`}
            label='Title'
            defaultValue={item.defaultValue.title}
            data-testid={`row-${item.key}`}
          />
          <button type='button' data-testid={`remove-${item.key}`} onClick={() => arr.remove(index())}>
            Remove
          </button>
        </div>
      )}
    </For>
  );
}

describe('useFieldArray + InputField integration', () => {
  afterEach(cleanup);

  it("preserves a later row's live DOM node, focus, and typed value when an earlier row is removed", () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    let keys: string[] = [];

    render(() => (
      <FormContextProvider store={store}>
        <LineItems onRowKeys={(k) => (keys = k)} />
      </FormContextProvider>
    ));

    const [rowAKey, rowBKey, rowCKey] = keys;
    const rowBInputBefore = screen.getByTestId(`row-${rowBKey}`) as HTMLInputElement;

    fireEvent.input(rowBInputBefore, { target: { value: 'b-edited' } });
    rowBInputBefore.focus();
    expect(document.activeElement).toBe(rowBInputBefore);

    fireEvent.click(screen.getByTestId(`remove-${rowAKey}`));

    // Same test id (keyed by stable identity, not shifted index) resolves to
    // literally the same DOM node, proving <For> never tore this row down.
    const rowBInputAfter = screen.getByTestId(`row-${rowBKey}`);
    expect(rowBInputAfter).toBe(rowBInputBefore);
    expect(rowBInputAfter).toHaveValue('b-edited');
    expect(document.activeElement).toBe(rowBInputAfter);

    // The removed row is gone; the row after it shifted from index 2 to 1
    // and still shows its own (untouched) value under its new field name.
    expect(screen.queryByTestId(`row-${rowAKey}`)).toBeNull();
    expect(screen.getByTestId(`row-${rowCKey}`)).toHaveValue('c');

    // The store itself was re-addressed, not just the DOM: the surviving
    // rows now live at items.0/items.1, with the edited value carried over.
    const [state] = store;
    expect(state.getFieldValue('items.0.title')).toBe('b-edited');
    expect(state.getFieldValue('items.1.title')).toBe('c');
    expect(state.getField('items.2.title')).toBeUndefined();
  });
});
