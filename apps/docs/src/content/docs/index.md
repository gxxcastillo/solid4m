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

## Typed state with `useForm`

Pass your field shape as a type parameter to get typed `onSubmit` values and reactive state access
outside the form tree.

```tsx
import { InputField, PasswordField, SubmitButton, useForm } from 'solid4m';

interface LoginValues {
  [key: string]: string;
  email: string;
  password: string;
}

function LoginForm() {
  const form = useForm<LoginValues>();

  async function onSubmit(values: LoginValues) {
    await api.login(values);
  }

  return (
    <form.Form onSubmit={onSubmit}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <SubmitButton>Log in</SubmitButton>
    </form.Form>
  );
}
```

The type parameter must satisfy `Record<string, unknown>`. Add an index signature to interfaces you
pass into `useForm`, or use a type alias that widens to a record.

## Next steps

- See the [interactive demo](demo/) to try the themes and live form state inspector.
- Read [Theming](theming/) before customizing the visual system.
- Use the [API reference](api/) when you need exact component props and state APIs.
