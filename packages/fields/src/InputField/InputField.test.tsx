import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { Show, createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

import { InputField } from './InputField';
import styles from './InputField.module.css';

type TestForm = { [key: string]: string; username: string; email: string };

function makeStore() {
  return createRoot((d) => {
    const store = createFormStore<TestForm>();
    return { store, dispose: d };
  });
}

describe('InputField', () => {
  afterEach(cleanup);

  it('renders an input with id matching the field name', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' />
      </FormContextProvider>
    ));
    expect(screen.getByRole('textbox')).toHaveAttribute('id', 'username');
  });

  it('omits the context container when no context is supplied', () => {
    // Regression: the guard tested the accessor function (always truthy) rather
    // than calling it, so every input rendered an empty context <div>.
    const { store } = makeStore();
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' />
      </FormContextProvider>
    ));

    expect(container.querySelector(`.${styles.context}`)).toBeNull();
  });

  it('renders the context container when context is supplied', () => {
    const { store } = makeStore();
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' context={<span>Hint</span>} />
      </FormContextProvider>
    ));

    expect(container.querySelector(`.${styles.context}`)).toHaveTextContent('Hint');
  });

  it('instantiates each JSX-valued prop once, even as the field value changes', () => {
    const calls = { leadingIcon: 0, icon: 0, context: 0 };
    const counted = (key: keyof typeof calls) => () => {
      calls[key]++;
      return <span />;
    };
    const LeadingIcon = counted('leadingIcon');
    const Icon = counted('icon');
    const Context = counted('context');
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'>
          name='username'
          label='Username'
          showIcon={() => true}
          leadingIcon={<LeadingIcon />}
          icon={<Icon />}
          context={<Context />}
        />
      </FormContextProvider>
    ));
    store[1].setFieldValue('username', 'ada', []);
    store[1].setFieldValue('username', '', []);

    expect(calls).toEqual({ leadingIcon: 1, icon: 1, context: 1 });
  });

  it('associates the default placeholder-style input with its label', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' />
      </FormContextProvider>
    ));

    const input = screen.getByLabelText('Username');
    const label = document.querySelector('label[for="username"]');

    expect(input).toHaveAttribute('placeholder', 'Username');
    expect(label).toHaveClass(styles.screenReaderOnly);
  });

  it('sets aria-invalid=false when there are no errors', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' />
      </FormContextProvider>
    ));
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('sets aria-invalid=true and shows error when errors are displayable', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    // Initialize with a valid value so hasBeenValid=true, then set errors.
    // getDisplayableErrors returns errors only when hasBeenValid OR (hasBeenValid===undefined AND hasBeenBlurred).
    mutations.initializeField('username', 'alice', []);
    mutations.setFieldValue('username', '', ['Required']);

    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' required />
      </FormContextProvider>
    ));

    const input = screen.getByRole('textbox');
    const alert = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveTextContent('Required');
    // aria-describedby must reference the error element by its (unique) id.
    expect(alert.id).toBeTruthy();
    expect(input).toHaveAttribute('aria-describedby', alert.id);
  });

  it('renders label with for attribute matching the input id when showLabel returns true', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' showLabel={() => true} />
      </FormContextProvider>
    ));
    const label = document.querySelector('label[for="username"]');
    expect(label).not.toBeNull();
  });

  it('reactively applies the floating-label state class once the field has a value', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'email'> name='email' label='Email' showLabel={() => true} />
      </FormContextProvider>
    ));

    const root = container.querySelector(`.${styles.InputField}`)!;
    expect(root.classList.contains(styles.withLabel)).toBe(true);
    expect(root.classList.contains(styles.hasValue)).toBe(false);

    // Updating the value must toggle the class — a static classList would not.
    mutations.setFieldValue('email', 'ada@example.com', []);
    expect(root.classList.contains(styles.hasValue)).toBe(true);
  });

  it('reverts to its initial value when resetField is called', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' defaultValue='alice' />
      </FormContextProvider>
    ));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'bob' } });
    expect(input.value).toBe('bob');

    mutations.resetField('username');

    expect(input.value).toBe('alice');
  });

  it('re-validates against constraints after resetField reverts to an invalid value', () => {
    const { store } = makeStore();
    const [state, mutations] = store;
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' required />
      </FormContextProvider>
    ));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'alice' } });
    expect(state.isFormValid).toBe(true);

    mutations.resetField('username');

    // The field's initial value was empty (no defaultValue), so reverting to it
    // should re-surface the "required" error instead of leaving isFormValid
    // incorrectly true just because resetField force-cleared errors.
    expect(input.value).toBe('');
    expect(state.isFormValid).toBe(false);

    // resetField is a visible, active change to the field (unlike a fresh
    // mount), so the re-surfaced error must render immediately rather than
    // waiting for a blur the user has no reason to trigger — otherwise the
    // form silently blocks submission with no visible explanation.
    expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('immediately displays a new error introduced right after resetField reverts to a valid value', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' defaultValue='alice' required />
      </FormContextProvider>
    ));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'bob' } });

    // Reverts to 'alice', which is itself valid — the post-reset revalidate
    // pass must still promote hasBeenValid back to true (not leave it stuck at
    // the reset's pessimistic `false`), or the very next error below would be
    // suppressed until blur instead of showing immediately.
    mutations.resetField('username');
    fireEvent.input(input, { target: { value: '' } });

    expect(screen.getByRole('alert')).toHaveTextContent(/required/i);
  });

  it('does not mark a field blurred or force an error display for a reset that happened before it ever mounted', () => {
    const { store } = makeStore();
    const [, mutations] = store;

    // Headless: a field is registered and reset (e.g. a multi-step wizard
    // pre-populating/resetting a later step) entirely before its component
    // ever mounts, so `wasReset` is already true on the field's first render.
    mutations.initializeField('username', '', []);
    mutations.resetField('username');

    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' required />
      </FormContextProvider>
    ));

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not re-validate after setValues, preserving whatever errors were already there', () => {
    const { store } = makeStore();
    const [state, mutations] = store;
    mutations.initializeField('username', 'alice', []);
    mutations.setFieldValue('username', '', ['Required']);

    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' required />
      </FormContextProvider>
    ));

    mutations.setValues({ username: 'bob' });

    // setValues intentionally preserves whatever errors were already there;
    // unlike resetField, it must not trigger the auto-revalidate effect.
    expect(state.getFieldErrors('username')).toEqual(['Required']);
  });

  it('reflects a value loaded via setValues', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' />
      </FormContextProvider>
    ));

    mutations.setValues({ username: 'loaded-alice' });

    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('loaded-alice');
  });

  it('applies a custom validator result on mount for a field that is not the first in the store', () => {
    const { store } = makeStore();
    const [state] = store;

    render(() => (
      <FormContextProvider store={store}>
        <InputField<TestForm, 'username'> name='username' label='Username' defaultValue='alice' />
        <InputField<TestForm, 'email'>
          name='email'
          label='Email'
          defaultValue='taken@example.com'
          validator={(_name, _value, _formState, setErrors) => setErrors(['Email is taken'])}
        />
      </FormContextProvider>
    ));

    // `username` is the first field ever registered in this store, so its
    // generation happens to be 0; `email` registers second, so its real
    // generation is 1. The custom validator's result must still land.
    expect(state.getFieldErrors('email')).toEqual(['Email is taken']);
  });

  it('unregisters the field from form state on unmount', () => {
    const { store } = makeStore();
    const [state] = store;
    const [show, setShow] = createSignal(true);

    render(() => (
      <FormContextProvider store={store}>
        <Show when={show()}>
          <InputField<TestForm, 'username'> name='username' label='Username' required />
        </Show>
      </FormContextProvider>
    ));

    expect(state.getField('username')).toBeDefined();
    expect(state.isFormValid).toBe(false); // required + empty

    setShow(false);

    expect(state.getField('username')).toBeUndefined();
    expect(state.isFormValid).toBe(true);
  });
});
