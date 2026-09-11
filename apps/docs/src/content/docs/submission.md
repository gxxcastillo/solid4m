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

## Work the form does not run itself

Everything above happens automatically for work awaited by `onSubmit`. When the async work is
somewhere else — a router action, a mutation, a resource loading the form's initial values — tell
the form about it with `isProcessing` and `isLoading`:

```tsx
<Form onSubmit={onSubmit} isLoading={user.loading} isProcessing={saveUser.pending}>
```

`isLoading` disables every registered field. `isProcessing` gives you the same treatment a real
submit gets: the spinner, `aria-disabled`, the blocked activation, and the live-region
announcement. Because no button initiated that work, every submit button shows the spinner — a real
submit shows it only on the button that was pressed.

Both are *additional* sources rather than overrides — the form is processing when you say so **or**
when it is running a submit of its own. Passing `isProcessing={false}` therefore cannot cut a real
submit short. That is deliberate: the same flag guards against a second submit starting on top of
one already in flight, so a `false` that won outright would let a double submit through.

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
