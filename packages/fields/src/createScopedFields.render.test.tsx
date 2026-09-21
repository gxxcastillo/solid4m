import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { For } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, type FormStore, createFormStore } from '@gxxc/solid4m-state';

import inputStyles from './InputField/InputField.module.css';
import { createScopedFields } from './createScopedFields';
import { useFieldArray } from './hooks/useFieldArray';

type Row = { password: string; confirm: string };
type TestFields = Record<string, unknown>;
type FormStateSnapshot = {
  alreadyScopedPasswordName?: string;
  confirmErrors?: string[];
  fieldNames: string[];
  haveValuesChanged: boolean;
  isFormValid: boolean;
  missingFieldName?: string;
  passwordBlurred?: boolean;
  passwordChanged?: boolean;
  passwordFieldName?: string;
  passwordInitialized: boolean;
  passwordValid?: boolean;
  passwordValue: unknown;
  value: unknown;
  wasPasswordValid?: boolean;
};

function Rows() {
  const [items] = useFieldArray<Row>('rows', [
    { password: '', confirm: '' },
    { password: '', confirm: '' }
  ]);

  return (
    <For each={items()}>
      {(item, index) => {
        const fields = createScopedFields<Row>(() => `rows.${index()}`);
        return (
          <div>
            <fields.PasswordField
              name='password'
              label='Password'
              defaultValue={item.defaultValue.password}
              data-testid={`password-${index()}`}
            />
            <fields.PasswordField
              name='confirm'
              label='Confirm'
              match='password'
              defaultValue={item.defaultValue.confirm}
              data-testid={`confirm-${index()}`}
            />
          </div>
        );
      }}
    </For>
  );
}

function RowsWithCustomValidator() {
  const [items] = useFieldArray<Row>('rows', [
    { password: '', confirm: '' },
    { password: '', confirm: '' }
  ]);

  return (
    <For each={items()}>
      {(item, index) => {
        const fields = createScopedFields<Row>(() => `rows.${index()}`);
        return (
          <div>
            <fields.PasswordField
              name='password'
              label='Password'
              defaultValue={item.defaultValue.password}
              data-testid={`custom-password-${index()}`}
            />
            <fields.PasswordField
              name='confirm'
              label='Confirm'
              defaultValue={item.defaultValue.confirm}
              validator={(name, value, formState, setErrors) => {
                setErrors(value === formState.getFieldValue('password') ? [] : [`${name} mismatch`]);
              }}
              data-testid={`custom-confirm-${index()}`}
            />
          </div>
        );
      }}
    </For>
  );
}

function RowsWithDisplayCallbacks() {
  const [items] = useFieldArray<Row>('rows', [
    { password: '', confirm: '' },
    { password: '', confirm: '' }
  ]);

  return (
    <For each={items()}>
      {(item, index) => {
        const fields = createScopedFields<Row>(() => `rows.${index()}`);
        const shouldShow = (_value: unknown, formState?: { getFieldValue: (name: 'password') => unknown }) =>
          formState?.getFieldValue('password') === 'show';

        return (
          <div>
            <fields.PasswordField
              name='password'
              label='Password'
              defaultValue={item.defaultValue.password}
              data-testid={`display-password-${index()}`}
            />
            <fields.PasswordField
              name='confirm'
              label='Confirm'
              defaultValue={item.defaultValue.confirm}
              showLabel={shouldShow}
              showIcon={shouldShow}
              icon={<span data-testid={`display-icon-${index()}`}>ready</span>}
              data-testid={`display-confirm-${index()}`}
            />
          </div>
        );
      }}
    </For>
  );
}

function RowsWithFormStateInspector(props: { onSnapshot: (snapshot: FormStateSnapshot) => void }) {
  const [items] = useFieldArray<Row>('rows', [
    { password: '', confirm: '' },
    { password: '', confirm: '' }
  ]);

  return (
    <For each={items()}>
      {(item, index) => {
        const basePath = () => `rows.${index()}`;
        const fields = createScopedFields<Row>(basePath);

        return (
          <div>
            <fields.PasswordField
              name='password'
              label='Password'
              defaultValue={item.defaultValue.password}
              data-testid={`inspector-password-${index()}`}
            />
            <fields.PasswordField
              name='confirm'
              label='Confirm'
              defaultValue={item.defaultValue.confirm}
              validator={(_name, value, formState, setErrors) => {
                props.onSnapshot({
                  alreadyScopedPasswordName: formState.getField(`${basePath()}.password` as never)?.name,
                  confirmErrors: formState.getFieldErrors('confirm'),
                  fieldNames: formState.fields.map((field) => field.name),
                  haveValuesChanged: formState.haveValuesChanged,
                  isFormValid: formState.isFormValid,
                  missingFieldName: formState.getField('missing' as never)?.name,
                  passwordBlurred: formState.hasFieldBlurred('password'),
                  passwordChanged: formState.hasFieldChanged('password'),
                  passwordFieldName: formState.getField('password')?.name,
                  passwordInitialized: formState.hasFieldBeenInitialized('password'),
                  passwordValid: formState.isFieldValid('password'),
                  passwordValue: formState.getFieldValue('password'),
                  value,
                  wasPasswordValid: formState.hasFieldBeenValid('password')
                });

                setErrors(value === formState.getFieldValue('password') ? [] : ['mismatch']);
              }}
              data-testid={`inspector-confirm-${index()}`}
            />
          </div>
        );
      }}
    </For>
  );
}

function RowsExposingScopedState(props: { onScopedState: (state: Record<string, unknown>) => void }) {
  const [items] = useFieldArray<Row>('rows', [
    { password: '', confirm: '' },
    { password: '', confirm: '' }
  ]);

  return (
    <For each={items()}>
      {(item, index) => {
        const fields = createScopedFields<Row>(() => `rows.${index()}`);
        return (
          <div>
            <fields.PasswordField
              name='password'
              label='Password'
              defaultValue={item.defaultValue.password}
              data-testid={`exposed-password-${index()}`}
            />
            <fields.PasswordField
              name='confirm'
              label='Confirm'
              defaultValue={item.defaultValue.confirm}
              validator={(_name, _value, formState, setErrors) => {
                if (index() === 1) props.onScopedState(formState as unknown as Record<string, unknown>);
                setErrors([]);
              }}
            />
          </div>
        );
      }}
    </For>
  );
}

describe('createScopedFields + useFieldArray integration', () => {
  afterEach(cleanup);

  it("registers each row's fields under its own scoped path", () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    render(() => (
      <FormContextProvider store={store}>
        <Rows />
      </FormContextProvider>
    ));

    const [state] = store;
    expect(state.hasFieldBeenInitialized('rows.0.password')).toBe(true);
    expect(state.hasFieldBeenInitialized('rows.0.confirm')).toBe(true);
    expect(state.hasFieldBeenInitialized('rows.1.password')).toBe(true);
    expect(state.hasFieldBeenInitialized('rows.1.confirm')).toBe(true);
  });

  it('resolves `match` against the same row, not a sibling row or the top-level form', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    render(() => (
      <FormContextProvider store={store}>
        <Rows />
      </FormContextProvider>
    ));

    const [state] = store;

    // Row 0: mismatched password/confirm -> match error on row 0's confirm.
    fireEvent.input(screen.getByTestId('password-0'), { target: { value: 'row0-pass' } });
    fireEvent.input(screen.getByTestId('confirm-0'), { target: { value: 'row0-mismatch' } });
    expect(state.getFieldErrors('rows.0.confirm')).toContain('"Confirm" does not match "Password"');

    // Row 1's password happens to equal row 0's confirm entry. If `match`
    // were still bound to the unscoped `password` (or resolved against row
    // 0 instead of row 1), row 1's confirm would spuriously validate here.
    fireEvent.input(screen.getByTestId('password-1'), { target: { value: 'row0-mismatch' } });
    fireEvent.input(screen.getByTestId('confirm-1'), { target: { value: 'row0-mismatch' } });
    expect(state.getFieldErrors('rows.1.confirm')).toEqual([]);

    // Fixing row 0's confirm to actually match row 0's password clears its
    // own error without touching row 1.
    fireEvent.input(screen.getByTestId('confirm-0'), { target: { value: 'row0-pass' } });
    expect(state.getFieldErrors('rows.0.confirm')).toEqual([]);
    expect(state.getFieldErrors('rows.1.confirm')).toEqual([]);
  });

  it('passes custom validators a row-local form state', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    render(() => (
      <FormContextProvider store={store}>
        <RowsWithCustomValidator />
      </FormContextProvider>
    ));

    const [state] = store;

    fireEvent.input(screen.getByTestId('custom-password-0'), { target: { value: 'row0-pass' } });
    fireEvent.input(screen.getByTestId('custom-confirm-0'), { target: { value: 'row0-mismatch' } });
    expect(state.getFieldErrors('rows.0.confirm')).toEqual(['confirm mismatch']);

    fireEvent.input(screen.getByTestId('custom-password-1'), { target: { value: 'row0-mismatch' } });
    fireEvent.input(screen.getByTestId('custom-confirm-1'), { target: { value: 'row0-mismatch' } });
    expect(state.getFieldErrors('rows.1.confirm')).toEqual([]);
  });

  it('passes display callbacks a row-local form state', () => {
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    render(() => (
      <FormContextProvider store={store}>
        <RowsWithDisplayCallbacks />
      </FormContextProvider>
    ));

    fireEvent.input(screen.getByTestId('display-password-1'), { target: { value: 'show' } });

    expect(document.querySelector('label[for="rows.0.confirm"]')).toHaveClass(inputStyles.screenReaderOnly);
    expect(document.querySelector('label[for="rows.1.confirm"]')).toHaveClass(inputStyles.label);
    expect(screen.queryByTestId('display-icon-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('display-icon-1')).toHaveTextContent('ready');
  });

  it('passes validators a complete row-local form state facade', () => {
    const snapshots: FormStateSnapshot[] = [];
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    render(() => (
      <FormContextProvider store={store}>
        <RowsWithFormStateInspector onSnapshot={(snapshot) => snapshots.push(snapshot)} />
      </FormContextProvider>
    ));

    fireEvent.input(screen.getByTestId('inspector-password-0'), { target: { value: 'row0-pass' } });
    fireEvent.blur(screen.getByTestId('inspector-password-0'));
    fireEvent.input(screen.getByTestId('inspector-confirm-0'), { target: { value: 'row0-mismatch' } });

    const mismatchSnapshot = snapshots.find((snapshot) => snapshot.value === 'row0-mismatch');
    expect(mismatchSnapshot).toMatchObject({
      alreadyScopedPasswordName: 'password',
      confirmErrors: [],
      fieldNames: ['password', 'confirm'],
      haveValuesChanged: true,
      isFormValid: true,
      passwordBlurred: true,
      passwordChanged: true,
      passwordFieldName: 'password',
      passwordInitialized: true,
      passwordValid: true,
      passwordValue: 'row0-pass',
      wasPasswordValid: true
    });
    expect(mismatchSnapshot?.missingFieldName).toBeUndefined();
  });

  // Loops over the scoped state's own keys rather than a hand-kept list, so a
  // getter the scoped state forgets to override fails here too: it would fall
  // back to the store and read the top-level `password`, which doesn't exist.
  it('resolves every name-taking getter against the row, not the top level', () => {
    let scopedState: Record<string, unknown> | undefined;
    const store = createFormStore<TestFields>() as FormStore<TestFields>;
    render(() => (
      <FormContextProvider store={store}>
        <RowsExposingScopedState onScopedState={(state) => (scopedState = state)} />
      </FormContextProvider>
    ));

    fireEvent.input(screen.getByTestId('exposed-password-1'), { target: { value: 'row1-pass' } });
    fireEvent.blur(screen.getByTestId('exposed-password-1'));

    const [state] = store;
    const getterNames = Object.keys(scopedState!).filter(
      (key) => key !== 'getField' && typeof scopedState![key] === 'function'
    );
    expect(getterNames).toHaveLength(7);
    for (const key of getterNames) {
      const scopedGetter = scopedState![key] as (name: string) => unknown;
      const storeGetter = state[key as keyof typeof state] as (name: string) => unknown;
      const rowResult = storeGetter('rows.1.password');
      expect(rowResult, key).not.toEqual(storeGetter('password'));
      expect(scopedGetter('password'), key).toEqual(rowResult);
    }
  });
});
