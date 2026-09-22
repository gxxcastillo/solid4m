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

  // See SubmitButton.tsx's isBusy note for why this stays enabled.
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

  // See SubmitButton.tsx's isBusy note for aria-disabled vs disabled. The
  // `not.toBeDisabled()` half is load-bearing: happy-dom leaves activeElement
  // alone when disabled, so this would also pass against the old, wrong
  // behavior. The real focus claim is verified in a real browser — see 'the
  // submit button keeps focus while a submit is in flight' in
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

  // See SubmitButton.tsx: the spinner is aria-hidden so it can't reach the
  // accessible name, which would otherwise break getByRole('button', { name })
  // during a submit.
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

  // See SubmitButton.tsx's handleClick note: aria-disabled doesn't stop
  // activation, so the component blocks it manually.
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

  // See SubmitButton.tsx's isBusy note: a hard-disabled button gets no
  // in-flight treatment.
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

  // See SubmitButton.tsx's isBusy note: only isDisabled's value decides this,
  // never whether the prop is present.
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
