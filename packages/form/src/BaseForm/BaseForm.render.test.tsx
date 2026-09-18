import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot, createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-formation-state';

import { BaseForm } from './BaseForm';
import styles from './BaseForm.module.css';
import { STALE_SUBMIT_MESSAGE } from './helpers';

// A Standard Schema whose validation is held open by the test, so a field can be
// edited while the submit is genuinely mid-flight. Nothing else reproduces the
// stale-snapshot race: it only exists in the window between an async schema
// resolving and the handler reading values back.
function makeHeldSchema() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    release,
    schema: {
      '~standard': {
        version: 1 as const,
        vendor: 'test',
        validate: async (value: unknown) => {
          await gate;
          return { value };
        }
      }
    }
  };
}

type TestForm = { [key: string]: string; email: string };

function makeStore() {
  return createRoot((d) => {
    const store = createFormStore<TestForm>();
    return { store, dispose: d };
  });
}

describe('BaseForm (rendered)', () => {
  afterEach(cleanup);

  it('calls onSubmit with serialized field values when the form is valid', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    const onSubmit = vi.fn();

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={onSubmit}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com' }, '');
  });

  it('blocks submit and marks fields blurred when the form is invalid', () => {
    const { store } = makeStore();
    const [state, mutations] = store;
    mutations.initializeField('email', '', ['Required']);
    const onSubmit = vi.fn();

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={onSubmit}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(state.hasFieldBlurred('email')).toBe(true);
  });

  it('exposes the stable `sf-form` hook and left-aligns by default', () => {
    const { store } = makeStore();
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    const form = container.querySelector('form')!;
    expect(form.classList.contains('sf-form')).toBe(true);
    expect(form.classList.contains(styles.form)).toBe(true);
    expect(form.classList.contains(styles.alignLeft)).toBe(true);
    expect(form.classList.contains(styles.alignCenter)).toBe(false);
  });

  it('applies alignment, fullWidthButtons, and a custom className', () => {
    const { store } = makeStore();
    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()} align='center' fullWidthButtons className='my-form'>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    const form = container.querySelector('form')!;
    expect(form.classList.contains(styles.alignCenter)).toBe(true);
    expect(form.classList.contains(styles.alignLeft)).toBe(false);
    expect(form.classList.contains(styles.fullWidthButtons)).toBe(true);
    expect(form.classList.contains('my-form')).toBe(true);
  });

  it('renders the errors prop alongside form-state errors', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.setErrors(['State error']);

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()} errors={['Server error']}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    expect(screen.getByText('Server error')).toBeInTheDocument();
    expect(screen.getByText('State error')).toBeInTheDocument();
  });

  it('moves focus to the first invalid field on a failed submit', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    mutations.initializeField('username', '', ['Required']);

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <input id='email' />
          <input id='username' />
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(document.activeElement).toBe(document.getElementById('username'));
  });

  it('skips a disabled invalid field and focuses the next focusable one', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', '', ['Required']);
    mutations.initializeField('username', '', ['Required']);

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <input id='email' disabled />
          <input id='username' />
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(document.activeElement).toBe(document.getElementById('username'));
  });

  it('renders the form-level error container as a live region even when empty', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    // Present before any error lands in it — a live region added at the same
    // time as its content is not reliably announced.
    const region = container.querySelector('.sf-form-errors');
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region).toBeEmptyDOMElement();
    // Being permanent makes it a flex item, so the form's `gap` reserves a row
    // for it; the empty-state class cancels exactly that gap. Without it every
    // errorless form grows a stray field-gap of trailing space.
    expect(region).toHaveClass(styles.formErrorsEmpty);
  });

  it('drops the empty-state offset once the region has content', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()} errors={['Server error']}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    expect(container.querySelector('.sf-form-errors')).not.toHaveClass(styles.formErrorsEmpty);
  });

  it('announces form-level errors through the live region', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()} errors={['Server error']}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    expect(container.querySelector('.sf-form-errors')).toHaveTextContent('Server error');
  });

  // The in-flight submit was communicated only visually: the submit button dims.
  // A screen-reader user pressed submit and heard nothing until it settled.
  it('renders the status region before there is anything to announce', () => {
    const { store } = makeStore();

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    const region = container.querySelector('.sf-form-status');
    expect(region).not.toBeNull();
    // Polite, unlike the assertive error region: a progress note waits its turn
    // rather than interrupting whatever the user is reading.
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toHaveTextContent('');
  });

  it('announces the in-flight state and stops once the submit settles', () => {
    const { store } = makeStore();
    const [, mutations] = store;

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));
    const region = container.querySelector('.sf-form-status');

    mutations.setIsProcessing(true);
    expect(region).toHaveTextContent('Submitting…');

    mutations.setIsProcessing(false);
    expect(region).toHaveTextContent('');
  });

  it('lets the announcement be reworded for the action', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.setIsProcessing(true);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()} processingLabel='Signing in…'>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    expect(container.querySelector('.sf-form-status')).toHaveTextContent('Signing in…');
  });

  it('stays silent when the label is emptied', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.setIsProcessing(true);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()} processingLabel=''>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    // The region itself stays in the DOM — removing it would break the *next*
    // announcement, since a live region must pre-exist its content.
    const region = container.querySelector('.sf-form-status');
    expect(region).not.toBeNull();
    expect(region).toHaveTextContent('');
  });

  // `<Form isProcessing>` was declared, documented as a "controlled override",
  // and read by nothing: a consumer driving their own async submit got no
  // announcement, no spinner, and no click guard. The four behaviors hung off
  // `formState.isProcessing` by the accessibility work all consulted the store
  // and none consulted the prop.
  describe('the isProcessing prop', () => {
    it('announces in-flight work the form is not itself running', () => {
      const { store } = makeStore();

      const { container } = render(() => (
        <FormContextProvider store={store}>
          <BaseForm onSubmit={vi.fn()} isProcessing>
            <button type='submit'>Submit</button>
          </BaseForm>
        </FormContextProvider>
      ));

      expect(container.querySelector('.sf-form-status')).toHaveTextContent('Submitting…');
    });

    it('tracks the prop rather than latching on its first value', () => {
      const [isProcessing, setIsProcessing] = createSignal(false);
      const { store } = makeStore();

      const { container } = render(() => (
        <FormContextProvider store={store}>
          <BaseForm onSubmit={vi.fn()} isProcessing={isProcessing()}>
            <button type='submit'>Submit</button>
          </BaseForm>
        </FormContextProvider>
      ));
      const region = container.querySelector('.sf-form-status');

      expect(region).toHaveTextContent('');
      setIsProcessing(true);
      expect(region).toHaveTextContent('Submitting…');
      setIsProcessing(false);
      expect(region).toHaveTextContent('');
    });

    // The prop is an additional source, not an override: a consumer who says
    // they are busy must not be able to start a submit on top of it.
    it('blocks a submit while the prop says the consumer is busy', () => {
      const { store } = makeStore();
      const [, mutations] = store;
      mutations.initializeField('email', 'a@b.com', []);
      const onSubmit = vi.fn();

      render(() => (
        <FormContextProvider store={store}>
          <BaseForm onSubmit={onSubmit} isProcessing>
            <button type='submit'>Submit</button>
          </BaseForm>
        </FormContextProvider>
      ));

      fireEvent.click(screen.getByRole('button'));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    // The failure mode that ruled out wiring the prop through a single
    // `setIsProcessing` effect. The handler's `finally` clears the flag, and an
    // effect watching a prop whose value never changed does not re-run to put it
    // back — so the form would quietly un-busy itself underneath a consumer who
    // is still working.
    it('stays asserted after the form finishes a submit of its own', async () => {
      const [isProcessing, setIsProcessing] = createSignal(false);
      const { store } = makeStore();
      const [state, mutations] = store;
      mutations.initializeField('email', 'a@b.com', []);
      // The submit has to be genuinely held open. A synchronous onSubmit returns
      // no promise, so the handler runs to its `finally` inside the click
      // dispatch and there is no in-flight window to raise the prop during —
      // which is the whole ordering under test.
      let finishSubmit!: () => void;
      const submitted = new Promise<void>((resolve) => {
        finishSubmit = resolve;
      });

      const { container } = render(() => (
        <FormContextProvider store={store}>
          <BaseForm onSubmit={() => submitted} isProcessing={isProcessing()}>
            <button type='submit'>Submit</button>
          </BaseForm>
        </FormContextProvider>
      ));

      fireEvent.click(screen.getByRole('button'));
      expect(state.isProcessing).toBe(true);

      // Raised mid-flight, exactly as a consumer kicking off their own follow-up
      // work would. The prop's value does not change again after this.
      setIsProcessing(true);
      finishSubmit();

      // Awaiting the same promise the handler awaits: its continuation was
      // attached first, at click time, so by the time this one runs the handler
      // has resumed and run its `finally` to completion.
      await submitted;

      // That `finally` has now cleared the form's own source. Sharing one slot
      // would have cleared the published flag with it and never restored it —
      // an effect watching a prop that never changed does not re-run.
      expect(state.isProcessing).toBe(true);
      expect(container.querySelector('.sf-form-status')).toHaveTextContent('Submitting…');

      setIsProcessing(false);
      expect(state.isProcessing).toBe(false);
    });

    // The store outlives the form whenever useForm reuses an enclosing one, so a
    // form unmounting mid-flight must not latch its last value onto it forever.
    it('releases its claim on the store when the form unmounts', () => {
      const { store } = makeStore();
      const [state] = store;

      const { unmount } = render(() => (
        <FormContextProvider store={store}>
          <BaseForm onSubmit={vi.fn()} isProcessing isLoading>
            <button type='submit'>Submit</button>
          </BaseForm>
        </FormContextProvider>
      ));

      expect(state.isProcessing).toBe(true);
      expect(state.isLoading).toBe(true);

      unmount();

      expect(state.isProcessing).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('drives isLoading the same way', () => {
      const [isLoading, setIsLoading] = createSignal(true);
      const { store } = makeStore();
      const [state] = store;

      render(() => (
        <FormContextProvider store={store}>
          <BaseForm onSubmit={vi.fn()} isLoading={isLoading()}>
            <button type='submit'>Submit</button>
          </BaseForm>
        </FormContextProvider>
      ));

      expect(state.isLoading).toBe(true);
      setIsLoading(false);
      expect(state.isLoading).toBe(false);
    });
  });

  // aria-busy on an ancestor tells assistive tech to withhold live-region
  // updates until it clears, which would suppress both regions below it.
  it('never marks the form aria-busy while processing', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    mutations.setIsProcessing(true);

    const { container } = render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={vi.fn()}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    expect(container.querySelector('form')).not.toHaveAttribute('aria-busy');
  });

  // Regression: the stale-snapshot guard is right to discard a result validated
  // against values the form has moved past, but it used to `return` bare — the
  // finally cleared isProcessing, the button un-dimmed, and the submit
  // evaporated with no error, no handler call, and nothing telling the user to
  // press it again.
  it('reports when a submit is discarded because values changed mid-flight', async () => {
    const { store } = makeStore();
    const [state, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    const onSubmit = vi.fn();
    const { schema, release } = makeHeldSchema();

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={onSubmit} schema={schema}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));
    expect(state.isProcessing).toBe(true);

    // The edit lands while schema validation is still awaiting.
    mutations.setFieldValue('email', 'changed@b.com');
    release();

    await vi.waitFor(() => expect(state.isProcessing).toBe(false));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(state.errors).toEqual([STALE_SUBMIT_MESSAGE]);
  });

  it('leaves an untouched in-flight submit alone', async () => {
    const { store } = makeStore();
    const [state, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    const onSubmit = vi.fn();
    const { schema, release } = makeHeldSchema();

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={onSubmit} schema={schema}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));
    release();

    await vi.waitFor(() => expect(state.isProcessing).toBe(false));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(state.errors).toEqual([]);
  });

  it('surfaces a rejected onSubmit into form.state.errors', async () => {
    const { store } = makeStore();
    const [state, mutations] = store;
    mutations.initializeField('email', 'a@b.com', []);
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    render(() => (
      <FormContextProvider store={store}>
        <BaseForm onSubmit={onSubmit}>
          <button type='submit'>Submit</button>
        </BaseForm>
      </FormContextProvider>
    ));

    fireEvent.click(screen.getByRole('button'));

    await vi.waitFor(() => expect(state.errors).toEqual(['Invalid credentials']));
    expect(state.isProcessing).toBe(false);
  });
});
