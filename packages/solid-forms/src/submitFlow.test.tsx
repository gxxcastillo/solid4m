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
