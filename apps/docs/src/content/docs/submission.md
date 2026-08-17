---
title: Async submission
description: Handle promise-based submit handlers and form-level errors.
---

Return a promise from `onSubmit` when your submit flow is asynchronous.

```tsx
async function onSubmit(values: LoginValues) {
  const response = await api.login(values);
  if (!response.ok) {
    throw new Error('Invalid credentials');
  }
}
```

While the promise is pending, the form sets `isProcessing` to `true` and submit buttons mark
themselves `aria-disabled` automatically, which blocks activation without dropping the focus of the
user who pressed the button. The button also shows a spinner, positioned inside its own padding so
the button does not change size mid-submit; it collapses to a static dot under
`prefers-reduced-motion`.

The form also announces the in-flight state to assistive technology through a polite live region, so
pressing submit is not met with silence. It is screen-reader-only — the dimmed button is already the
visual signal — and it says `Submitting…` by default. Reword it when that is not the action, or pass
an empty string to stay silent:

```tsx
<Form onSubmit={onSubmit} processingLabel='Signing in…'>
```

## Rejected submissions

If the handler throws or its returned promise rejects, `isProcessing` is reset in a `finally` block.
The error message is added to `form.state.errors` for display.

Each new submit attempt clears existing `form.state.errors` before calling the handler, so stale
server errors do not linger after a retry begins.

## Edits during an in-flight submit

Fields stay editable while a submit is in flight — locking the form would take focus away from
whatever the user is typing in. With a `schema`, that creates a race: validation runs against the
values captured when submit was pressed, so if any of them change before it resolves, the result
describes a form that no longer exists. That submit is discarded rather than sent, and
`form.state.errors` reports *The form changed while it was being submitted. Please submit again.* so
the discard is visible instead of looking like a button that did nothing.

Without a `schema` there is no async gap to race, and the handler receives the values captured at
press time.

## Reading processing state

Use `useForm` when you want to show state outside the form.

```tsx
const form = useForm<LoginValues>();

<Show when={form.state.isProcessing}>Signing in...</Show>;

<form.Form onSubmit={onSubmit}>
  <InputField name='email' type='email' label='Email' required />
  <PasswordField name='password' label='Password' required />
  <SubmitButton>Log in</SubmitButton>
</form.Form>;
```
