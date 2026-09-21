import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

import { CheckboxField } from './CheckboxField';

type TestForm = { [key: string]: boolean; acceptTerms: boolean };

function makeStore() {
  return createRoot((d) => {
    const store = createFormStore<TestForm>();
    return { store, dispose: d };
  });
}

describe('CheckboxField', () => {
  afterEach(cleanup);

  it('renders a checkbox input with id matching the field name', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <CheckboxField<TestForm, 'acceptTerms'> name='acceptTerms' label='Accept terms' />
      </FormContextProvider>
    ));
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('id', 'acceptTerms');
  });

  it('renders the label associated with the checkbox', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <CheckboxField<TestForm, 'acceptTerms'> name='acceptTerms' label='Accept terms' />
      </FormContextProvider>
    ));
    const label = screen.getByText('Accept terms');
    expect(label).toHaveAttribute('for', 'acceptTerms');
  });

  it('stores a boolean value in form state when toggled', () => {
    const { store } = makeStore();
    const [state] = store;
    render(() => (
      <FormContextProvider store={store}>
        <CheckboxField<TestForm, 'acceptTerms'> name='acceptTerms' label='Accept terms' />
      </FormContextProvider>
    ));

    const checkbox = screen.getByRole('checkbox');
    expect(state.getFieldValue('acceptTerms')).toBe(false);

    fireEvent.click(checkbox);

    expect(state.getFieldValue('acceptTerms')).toBe(true);
  });

  it('disables the input when disabled is set', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <CheckboxField<TestForm, 'acceptTerms'> name='acceptTerms' label='Accept terms' disabled />
      </FormContextProvider>
    ));
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('shows a displayable error with aria-invalid and aria-describedby', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('acceptTerms', true, []);
    mutations.setFieldValue('acceptTerms', false, ['You must accept the terms']);

    render(() => (
      <FormContextProvider store={store}>
        <CheckboxField<TestForm, 'acceptTerms'> name='acceptTerms' label='Accept terms' required />
      </FormContextProvider>
    ));

    const checkbox = screen.getByRole('checkbox');
    const alert = screen.getByRole('alert');
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveTextContent('You must accept the terms');
    expect(checkbox).toHaveAttribute('aria-describedby', alert.id);
  });
});
