import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Form, InputField, SubmitButton, TextAreaField } from './index';

// End-to-end coverage of the failed-submit path through the real published
// surface. These have to live here rather than in packages/fields or
// packages/form: the behavior only emerges when Form, the field components, and
// the DOM attributes they render are combined, and neither package can import
// the other.
type LoginValues = { email: string; password: string };
type SettingsValues = { bio: string };

describe('submitting an invalid form', () => {
  afterEach(cleanup);

  it('keeps the submit button enabled so the form can be submitted at all', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()}>
        <InputField<LoginValues, 'email'> name='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  // Regression: constraint props render as real HTML attributes, so without
  // `noValidate` on the form the browser's own interactive validation blocks the
  // click, shows a native bubble, and the submit event never fires — meaning
  // none of this library's validation, error gating, or focus management runs.
  it('reveals field errors when the submit button is clicked', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()}>
        <InputField<LoginValues, 'email'> name='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('alert')).toHaveTextContent('"Email" is required');
  });

  it('moves focus to the first invalid field on a failed submit', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()}>
        <InputField<LoginValues, 'email'> name='email' label='Email' required />
        <InputField<LoginValues, 'password'> name='password' label='Password' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(document.activeElement).toBe(document.getElementById('email'));
  });

  it('does not call onSubmit for an invalid form', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit}>
        <InputField<LoginValues, 'email'> name='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sets noValidate so the browser does not pre-empt our own validation', () => {
    const { container } = render(() => (
      <Form<LoginValues> onSubmit={vi.fn()}>
        <InputField<LoginValues, 'email'> name='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(container.querySelector('form')).toHaveAttribute('novalidate');
  });
});

describe('submitting a form whose only constraint is a length bound', () => {
  afterEach(cleanup);

  // Regression: an empty optional field reported "too long", which made the form
  // invalid on load and silently blocked submission with nothing rendered to
  // explain it. This is the exact snippet the API docs recommend.
  it('submits an untouched optional maxLength field', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<SettingsValues> onSubmit={onSubmit}>
        <TextAreaField<SettingsValues, 'bio'> name='bio' label='Bio' maxLength={500} />
        <SubmitButton>Save</SubmitButton>
      </Form>
    ));

    expect(screen.getByRole('button')).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/is too long/)).toBeNull();
  });
});

describe('type-derived format validation', () => {
  afterEach(cleanup);

  // `noValidate` was required to stop the browser swallowing the submit event,
  // but it also turned off the format checks the browser derived from `type`
  // alone — for which this library had no equivalent, so a bad email submitted
  // clean with no error anywhere. These assert the replacement is actually wired
  // through the `type` prop, not merely present in the validation package.
  it('blocks submission of a malformed email and explains why', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit}>
        <InputField<LoginValues, 'email'> name='email' type='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.input(document.getElementById('email')!, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('"Email" must be a valid email address');
  });

  it('submits a well-formed email', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit}>
        <InputField<LoginValues, 'email'> name='email' type='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.input(document.getElementById('email')!, { target: { value: 'a@b.com' } });
    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  // `type` is read as a constraint (createFormField splits constraint props out
  // by name), but it must still render as a real attribute — it drives the
  // mobile keyboard and the native picker UI. This passes only because
  // createFormField merges from the full props rather than splitProps' rest;
  // "tidying" that into a rest-spread would silently turn every typed input back
  // into type='text'.
  it('still renders type as a real attribute', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()}>
        <InputField<LoginValues, 'email'> name='email' type='email' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(document.getElementById('email')).toHaveAttribute('type', 'email');
  });

  // The inert case, and the one that would break every existing form if the
  // `type` constraint were not type-aware: a plain text input must not acquire
  // validation just because it has a `type` attribute.
  it('leaves a plain text field unconstrained', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit}>
        <InputField<LoginValues, 'email'> name='email' type='text' label='Email' required />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.input(document.getElementById('email')!, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

// `<Form isProcessing>` and `<Form isLoading>` were declared and documented but
// read by nothing. The behaviors they are supposed to drive live in
// SubmitButton and createFormField, which is why proving them takes the whole
// facade: packages/fields cannot import packages/form.
describe('declaring in-flight work through Form props', () => {
  afterEach(cleanup);

  it('gives the submit button the in-flight treatment', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()} isProcessing>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    const button = screen.getByRole('button');
    // aria-disabled rather than disabled: the user who started the work is by
    // definition focused here, and a focused element that becomes `disabled`
    // drops focus to <body> with nothing to put it back.
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  // aria-disabled is advisory — the browser still activates the button — so the
  // block has to be enforced in the click handler too.
  it('blocks the button from acting on a click while processing', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit} isProcessing>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('announces the declared work in the form status region', () => {
    const { container } = render(() => (
      <Form<LoginValues> onSubmit={vi.fn()} isProcessing processingLabel='Signing in…'>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(container.querySelector('.sf-form-status')).toHaveTextContent('Signing in…');
  });

  // Loading makes the whole form unavailable: fields cannot be edited and a
  // submit cannot forward the partial values that have arrived so far.
  it('disables fields and prevents submitting while loading', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit} isLoading>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <InputField<LoginValues, 'password'> name='password' label='Password' />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(document.getElementById('email')).toBeDisabled();
    expect(document.getElementById('password')).toBeDisabled();
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).not.toBeDisabled();
    expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('announces loading rather than submitting, with an override', () => {
    const { container } = render(() => (
      <Form<LoginValues> onSubmit={vi.fn()} isLoading loadingLabel='Fetching account…'>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(container.querySelector('.sf-form-status')).toHaveTextContent('Fetching account…');
  });

  it('also refuses a native submit control while loading', () => {
    const onSubmit = vi.fn();
    render(() => (
      <Form<LoginValues> onSubmit={onSubmit} isLoading>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <button type='submit'>Native submit</button>
      </Form>
    ));

    fireEvent.click(screen.getByRole('button', { name: 'Native submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('leaves fields alone when not loading', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()}>
        <InputField<LoginValues, 'email'> name='email' label='Email' />
        <SubmitButton>Go</SubmitButton>
      </Form>
    ));

    expect(document.getElementById('email')).not.toBeDisabled();
  });
});

describe('a form with more than one submit button', () => {
  afterEach(cleanup);

  // Reported from the docs demo: pressing "Sign up" spun the "Save draft"
  // spinner too. `isProcessing` is form-level, so every SubmitButton showed one
  // — asserting two actions were running when one was. Note neither button here
  // carries a `name`, which is why matching on the submitter's name could not
  // have fixed it; each instance is stamped with its own token instead.
  it('spins only the button that was pressed', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    render(() => (
      <Form<LoginValues, void> onSubmit={() => gate}>
        <InputField<LoginValues, 'email'> name='email' type='email' label='Email' />
        <SubmitButton>Sign up</SubmitButton>
        <SubmitButton>Save draft</SubmitButton>
      </Form>
    ));

    const [signUp, saveDraft] = screen.getAllByRole('button');
    fireEvent.click(signUp);
    await vi.waitFor(() => expect(signUp.querySelector('[aria-hidden="true"]')).not.toBeNull());

    expect(saveDraft.querySelector('[aria-hidden="true"]')).toBeNull();

    // Unavailability is still form-wide: a second submit must not start while
    // the first is in flight, so both buttons report it.
    expect(signUp).toHaveAttribute('aria-disabled', 'true');
    expect(saveDraft).toHaveAttribute('aria-disabled', 'true');

    release();
    await vi.waitFor(() => expect(signUp.querySelector('[aria-hidden="true"]')).toBeNull());
  });

  it('spins the other button when that is the one pressed', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    render(() => (
      <Form<LoginValues, void> onSubmit={() => gate}>
        <InputField<LoginValues, 'email'> name='email' type='email' label='Email' />
        <SubmitButton>Sign up</SubmitButton>
        <SubmitButton>Save draft</SubmitButton>
      </Form>
    ));

    const [signUp, saveDraft] = screen.getAllByRole('button');
    fireEvent.click(saveDraft);
    await vi.waitFor(() => expect(saveDraft.querySelector('[aria-hidden="true"]')).not.toBeNull());

    expect(signUp.querySelector('[aria-hidden="true"]')).toBeNull();
    release();
  });

  // `<Form isProcessing>` names no button, and submission.md promises it the
  // same treatment a real submit gets — so the fallback is every busy button,
  // not none.
  it('spins every button when processing was declared rather than pressed', () => {
    render(() => (
      <Form<LoginValues> onSubmit={vi.fn()} isProcessing>
        <InputField<LoginValues, 'email'> name='email' type='email' label='Email' />
        <SubmitButton>Sign up</SubmitButton>
        <SubmitButton>Save draft</SubmitButton>
      </Form>
    ));

    for (const button of screen.getAllByRole('button')) {
      expect(button.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
