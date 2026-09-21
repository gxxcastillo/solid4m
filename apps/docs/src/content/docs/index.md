---
title: Quick start
description: Build typed, reactive forms for SolidJS with solid4m.
---

**Typed, reactive forms for SolidJS.**

## Install

```bash
npm install solid4m
# or
pnpm add solid4m
```

Requires SolidJS 1.x as a peer dependency.

Import the stylesheet once, usually in your app entry — forms render unstyled without it:

```ts
import 'solid4m/styles.css';
```

See [Installation](installation/) for optional theme files.

## Your first form

The simplest form needs no type parameters. Import `Form`, add fields, and provide an `onSubmit`
handler.

```tsx
import { Form, InputField, PasswordField, SubmitButton } from 'solid4m';

function LoginForm() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <SubmitButton>Log in</SubmitButton>
    </Form>
  );
}
```

## Typed forms with `createForm`

Call `createForm<M>()` with your field shape and it binds that type once for `Form` and every field
component it returns, so neither needs a repeated `<Form<M>>` or `<InputField<M, 'name'>>` at each
call site. `onSubmit` receives typed values, and a field `name` or `match` that does not exist on `M`
is a compile error.

```tsx
import { SubmitButton, createForm } from 'solid4m';

interface LoginValues {
  email: string;
  password: string;
}

const { Form, InputField, PasswordField } = createForm<LoginValues>();

function LoginForm() {
  async function onSubmit(values: LoginValues) {
    await api.login(values);
  }

  return (
    <Form onSubmit={onSubmit}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <SubmitButton>Log in</SubmitButton>
    </Form>
  );
}
```

`LoginValues` needs nothing beyond its own fields — no index signature, no widening type alias. `M`
only has to satisfy `object`.

## Validating with a schema

Pass a Standard Schema-compatible schema (Zod, Valibot, and others all implement it) to
`createForm({ schema })` and it becomes the source of truth for both the field values and the
submitted values, which can differ when the schema transforms its input.

```tsx
import { z } from 'zod';

import { SubmitButton, createForm } from 'solid4m';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const { Form, InputField, PasswordField } = createForm({ schema: loginSchema });

function LoginForm() {
  return (
    <Form
      onSubmit={(values) => {
        values.email; // string
        values.password; // string
      }}
    >
      <InputField name='email' label='Email' />
      <PasswordField name='password' label='Password' />
      <SubmitButton>Log in</SubmitButton>
    </Form>
  );
}
```

`Form` also takes a `schema` prop directly, for the cases where binding one to `createForm` is more
setup than you want:

```tsx
<Form schema={loginSchema} onSubmit={(values) => console.log(values)}>
```

## Reading state with `useForm`

Reach for `useForm<M>()` when something outside the fields needs reactive access to the form's state —
validity, processing, field values — or its mutations, such as `reset`. It returns a `form.Form`
bound to `M` and a live `form.state`. Pair it with `createFields<M>()`, the field-only half of
`createForm`, so field names stay checked too.

```tsx
import { Show } from 'solid-js';

import { SubmitButton, createFields, useForm } from 'solid4m';

interface LoginValues {
  email: string;
  password: string;
}

const { InputField, PasswordField } = createFields<LoginValues>();

function LoginForm() {
  const form = useForm<LoginValues>();

  async function onSubmit(values: LoginValues) {
    await api.login(values);
  }

  return (
    <form.Form onSubmit={onSubmit}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <Show when={form.state.haveValuesChanged}>
        <p>You have unsaved changes.</p>
      </Show>
      <SubmitButton>Log in</SubmitButton>
    </form.Form>
  );
}
```

## Next steps

- [Installation](installation/) — theme files and scoping.
- [Validation](validation/) — schemas, built-in constraints, and custom validators.
- [Async submission](submission/) — promise-based `onSubmit`, in-flight state, and named submit
  buttons.
- [Fields](fields/) — the field component palette.
- [Field arrays](field-arrays/) — repeating groups of fields.
- [Loading and resetting data](loading-and-resetting/) — populating a form asynchronously.
- [Accessibility](accessibility/) — how focus, errors, and live regions are wired.
- [Server rendering](server-rendering/) — SSR and hydration.
- [API reference](api/) — exact component props and state APIs.
