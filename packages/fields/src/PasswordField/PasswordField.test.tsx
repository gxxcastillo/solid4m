import { cleanup, render, screen } from '@solidjs/testing-library';
import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

import { PasswordField } from './PasswordField';

type TestForm = { [key: string]: string; password: string };

function makeStore() {
  return createRoot((d) => {
    const store = createFormStore<TestForm>();
    return { store, dispose: d };
  });
}

describe('PasswordField', () => {
  afterEach(cleanup);

  it('renders an input with type="password"', () => {
    const { store } = makeStore();
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <PasswordField<TestForm, 'password'> name='password' label='Password' />
      </FormContextProvider>
    ));
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('id', 'password');
  });

  // A reactive prop compiles to a getter-only property, so the component
  // assigning `props.type` used to throw here.
  it('keeps type="password" when a reactive type is passed anyway', () => {
    const { store } = makeStore();
    const [type] = createSignal('text');
    const { container } = render(() => (
      <FormContextProvider store={store}>
        {/* @ts-expect-error `type` is fixed by PasswordField */}
        <PasswordField<TestForm, 'password'> name='password' label='Password' type={type()} />
      </FormContextProvider>
    ));
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('shows an error when errors are displayable', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('password', 'x', []);
    mutations.setFieldValue('password', '', ['Password must be at least 8 characters']);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <PasswordField<TestForm, 'password'> name='password' label='Password' minLength={8} />
      </FormContextProvider>
    ));

    const input = container.querySelector('input');
    const alert = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveTextContent('Password must be at least 8 characters');
  });
});
