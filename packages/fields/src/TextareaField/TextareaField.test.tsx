import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-formation-state';

import { TextAreaField } from './TextareaField';

type TestForm = { [key: string]: string; bio: string };

function makeStore() {
  return createRoot((d) => {
    const store = createFormStore<TestForm>();
    return { store, dispose: d };
  });
}

describe('TextAreaField', () => {
  afterEach(cleanup);

  it('renders a textarea with id matching the field name', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <TextAreaField<TestForm, 'bio'> name='bio' label='Bio' />
      </FormContextProvider>
    ));
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'bio');
  });

  it('updates form state when the user types', () => {
    const { store } = makeStore();
    const [state] = store;
    render(() => (
      <FormContextProvider store={store}>
        <TextAreaField<TestForm, 'bio'> name='bio' label='Bio' />
      </FormContextProvider>
    ));

    fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Hello there' } });

    expect(state.getFieldValue('bio')).toBe('Hello there');
  });

  it('sets aria-invalid=true and shows the error when errors are displayable', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('bio', 'hi', []);
    mutations.setFieldValue('bio', '', ['Required']);

    render(() => (
      <FormContextProvider store={store}>
        <TextAreaField<TestForm, 'bio'> name='bio' label='Bio' required />
      </FormContextProvider>
    ));

    const textarea = screen.getByRole('textbox');
    const alert = screen.getByRole('alert');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveTextContent('Required');
    expect(textarea).toHaveAttribute('aria-describedby', alert.id);
  });

  it('disables the textarea when disabled is set', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <TextAreaField<TestForm, 'bio'> name='bio' label='Bio' disabled />
      </FormContextProvider>
    ));
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('renders the optional title', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <TextAreaField<TestForm, 'bio'> name='bio' label='Bio' title='Tell us about yourself' />
      </FormContextProvider>
    ));
    expect(screen.getByText('Tell us about yourself')).toBeInTheDocument();
  });
});
