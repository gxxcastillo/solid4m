import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-formation-state';

import { SelectField } from './SelectField';

type TestForm = { role: string };
type MultiSelectForm = { roles: string[] };

function makeStore() {
  return createRoot((dispose) => ({ store: createFormStore<TestForm>(), dispose }));
}

describe('SelectField', () => {
  afterEach(cleanup);

  it('associates its visible label, options, and validation state with one native select', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SelectField<TestForm, 'role'> name='role' label='Role' required>
          <option value=''>Choose a role</option>
          <option value='admin'>Admin</option>
        </SelectField>
      </FormContextProvider>
    ));

    const select = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(select).toHaveAttribute('id', 'role');
    expect(select).toHaveAttribute('aria-invalid', 'false');
    expect(select.options).toHaveLength(2);

    fireEvent.input(select, { target: { value: 'admin' } });
    expect(store[0].getFieldValue('role')).toBe('admin');
  });

  it('stores every selected option for a multiple select', () => {
    const { store } = createRoot((dispose) => ({ store: createFormStore<MultiSelectForm>(), dispose }));
    render(() => (
      <FormContextProvider store={store}>
        <SelectField<MultiSelectForm, 'roles'> name='roles' label='Roles' multiple>
          <option value='author'>Author</option>
          <option value='editor'>Editor</option>
          <option value='viewer'>Viewer</option>
        </SelectField>
      </FormContextProvider>
    ));

    const select = screen.getByLabelText('Roles') as HTMLSelectElement;
    select.options[0].selected = true;
    select.options[1].selected = true;
    fireEvent.input(select);

    expect(store[0].getFieldValue('roles')).toEqual(['author', 'editor']);
  });
});
