import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

import { SubmitButton } from './SubmitButton';
import styles from './SubmitButton.module.css';

type TestForm = { [key: string]: string; email: string };

function makeStore(state?: Parameters<typeof createFormStore<TestForm>>[0]) {
  return createRoot((d) => {
    const store = createFormStore<TestForm>(state);
    return { store, dispose: d };
  });
}

describe('SubmitButton', () => {
  afterEach(cleanup);

  it('renders a real <button>, not an <input>', () => {
    const { store } = makeStore();
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(container.querySelector('button')).not.toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('renders its children as the button label', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).toHaveTextContent('Log in');
  });

  it('falls back to a default label when no children are given', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton />
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).toHaveTextContent('submit');
  });

  it('defaults to type="submit"', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('renders type="button" when variant is "approve"', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton variant='approve'>Approve</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  // Stays enabled so submitting an invalid form can reveal the errors and move
  // focus to the first invalid field. A disabled button leaves the tab order
  // and cannot explain why it is blocked.
  it('stays enabled when the form is invalid', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', '', ['Required']);

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  // aria-disabled rather than disabled, so the button the user just pressed does
  // not fall out of the tab order mid-submit. The `not.toBeDisabled()` half is
  // the load-bearing assertion: happy-dom leaves activeElement alone when an
  // element becomes disabled, so a focus assertion here would pass against the
  // old behavior too. The focus claim is verified in a real browser instead —
  // see 'the submit button keeps focus while a submit is in flight' in
  // apps/a11y/tests/accessibility.a11y.ts.
  it('marks the button aria-disabled while a submit is in flight', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    mutations.setIsProcessing(true);

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
  });

  it('leaves aria-disabled off when no submit is in flight', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-disabled');
  });

  it('shows a spinner only while a submit is in flight', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(container.querySelector(`.${styles.spinner}`)).toBeNull();

    mutations.setIsProcessing(true);
    expect(container.querySelector(`.${styles.spinner}`)).not.toBeNull();

    mutations.setIsProcessing(false);
    expect(container.querySelector(`.${styles.spinner}`)).toBeNull();
  });

  // The spinner is decorative — the form's polite live region does the
  // announcing. If it reached the accessible name, it would both duplicate that
  // and break every getByRole('button', { name }) query during a submit.
  it('keeps the button label out of the spinner and the spinner out of the name', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    mutations.setIsProcessing(true);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));

    expect(container.querySelector(`.${styles.spinner}`)).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  // aria-disabled does not stop activation the way `disabled` does, so the
  // component has to block it. Matters most for variant='approve', whose
  // type='button' never reaches the form's own re-entry guard.
  it('blocks activation while a submit is in flight', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    const onClick = vi.fn();

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton variant='approve' onClick={onClick}>
          Approve
        </SubmitButton>
      </FormContextProvider>
    ));
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    mutations.setIsProcessing(true);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    mutations.setIsProcessing(false);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('enables the button when the form is valid', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('renders a real disabled attribute for isDisabled', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton isDisabled>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // A hard-disabled button is already unavailable and already unclickable, so
  // the in-flight treatment would only add a spinner to a button that cannot be
  // the thing in flight.
  it('leaves the in-flight treatment off a hard-disabled button', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    mutations.setIsProcessing(true);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <SubmitButton isDisabled>Log in</SubmitButton>
      </FormContextProvider>
    ));
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(container.querySelector(`.${styles.spinner}`)).toBeNull();
  });

  it('gives a loading form the unavailable treatment too', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    mutations.setIsLoading(true);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(container.querySelector(`.${styles.spinner}`)).not.toBeNull();
  });

  // The regression this pins: `isBusy` used to require `isDisabled === undefined`,
  // so binding the prop to a signal — the idiomatic way to gate a submit button —
  // silently removed the spinner, the aria-disabled, and the activation block the
  // moment the gate opened. Only the value can decide this, never the presence of
  // the prop.
  it('keeps the in-flight treatment when isDisabled is bound to a signal that reads false', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    const [termsAccepted, setTermsAccepted] = createSignal(false);
    const onClick = vi.fn();

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <SubmitButton variant='approve' isDisabled={!termsAccepted()} onClick={onClick}>
          Sign up
        </SubmitButton>
      </FormContextProvider>
    ));
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    setTermsAccepted(true);
    expect(button).not.toBeDisabled();

    mutations.setIsProcessing(true);
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(container.querySelector(`.${styles.spinner}`)).not.toBeNull();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the themeable button class', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Log in</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button').classList.contains(styles.button)).toBe(true);
  });

  it('adds the approve variant class only for variant="approve"', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton>Primary</SubmitButton>
        <SubmitButton variant='approve'>Secondary</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByText('Primary').classList.contains(styles.approve)).toBe(false);
    expect(screen.getByText('Secondary').classList.contains(styles.approve)).toBe(true);
  });

  it('adds the fullWidth class when isFullWidth is set', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton isFullWidth>Wide</SubmitButton>
        <SubmitButton>Narrow</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByText('Wide').classList.contains(styles.fullWidth)).toBe(true);
    expect(screen.getByText('Narrow').classList.contains(styles.fullWidth)).toBe(false);
  });

  it('sets the name attribute for multi-button forms', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    render(() => (
      <FormContextProvider store={store}>
        <SubmitButton name='publish'>Publish</SubmitButton>
      </FormContextProvider>
    ));
    expect(screen.getByRole('button')).toHaveAttribute('name', 'publish');
  });
});
