import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

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

  // A multiple select's selection can't round-trip through `value`: the
  // stored array formats to "author,editor", which matches no single option,
  // so binding it back as `select.value` deselected everything — including
  // what the user had just picked.
  describe('multiple', () => {
    function renderRoles(defaultValue?: string[]) {
      const { store } = createRoot((dispose) => ({ store: createFormStore<MultiSelectForm>(), dispose }));
      render(() => (
        <FormContextProvider store={store}>
          <SelectField<MultiSelectForm, 'roles'>
            name='roles'
            label='Roles'
            multiple
            defaultValue={defaultValue}
          >
            <option value='author'>Author</option>
            <option value='editor'>Editor</option>
            <option value='viewer'>Viewer</option>
          </SelectField>
        </FormContextProvider>
      ));
      const select = screen.getByLabelText('Roles') as HTMLSelectElement;
      // Per-option `selected`, not `select.selectedOptions`: happy-dom leaves
      // selectedOptions stale after options are toggled programmatically. It
      // also never cleared a multiple select through `value` the way Chromium
      // does, so the user-selection case only fails in a real browser — see
      // the palette test in apps/a11y.
      const selected = () =>
        Array.from(select.options)
          .filter((option) => option.selected)
          .map((option) => option.value);
      return { store, select, selected };
    }

    it('keeps the options the user selected', () => {
      const { select, selected } = renderRoles();
      select.options[0].selected = true;
      select.options[2].selected = true;
      fireEvent.input(select);

      expect(selected()).toEqual(['author', 'viewer']);
    });

    it('selects the options in its defaultValue', () => {
      const { store, selected } = renderRoles(['editor', 'viewer']);

      expect(store[0].getFieldValue('roles')).toEqual(['editor', 'viewer']);
      expect(selected()).toEqual(['editor', 'viewer']);
    });

    it('reflects setValues and reset in the selected options', () => {
      const { store, selected } = renderRoles(['author']);

      store[1].setValues({ roles: ['editor'] });
      expect(selected()).toEqual(['editor']);

      store[1].reset();
      expect(selected()).toEqual(['author']);
    });
  });

  // The field's own plumbing (parse/format/setValue functions, errors,
  // isControlled…) rides along in the props it spreads onto <Select>. Under SSR
  // those serialize as attributes, including each function's source text.
  it('does not leak field plumbing onto the native select as attributes', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SelectField<TestForm, 'role'> name='role' label='Role' required>
          <option value='admin'>Admin</option>
        </SelectField>
      </FormContextProvider>
    ));

    const attributes = Array.from(screen.getByLabelText('Role').attributes, (a) => a.name.toLowerCase());
    for (const leaked of ['parse', 'format', 'setvalue', 'iscontrolled', 'errors', 'label']) {
      expect(attributes).not.toContain(leaked);
    }
  });
});
