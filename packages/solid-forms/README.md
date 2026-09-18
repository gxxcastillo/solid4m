# @gxxc/solid-forms

Typed, reactive forms for [SolidJS](https://www.solidjs.com/).

**Docs:** https://gxxcastillo.github.io/solid-forms/
**Demo:** https://gxxcastillo.github.io/solid-forms/demo/

## Installation

```bash
npm install @gxxc/solid-forms
# or
pnpm add @gxxc/solid-forms
```

Requires SolidJS 1.x as a peer dependency.

## Quick Start

Import the stylesheet once in your app entry, then use the form and field components.

```ts
import '@gxxc/solid-forms/styles.css';
```

```tsx
import { Form, InputField, PasswordField, SubmitButton } from '@gxxc/solid-forms';

function LoginForm() {
  return (
    <Form onSubmit={(values) => console.log(values)}>
      <InputField name='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <SubmitButton>Log in</SubmitButton>
    </Form>
  );
}
```

Use `useForm` when you need typed values or reactive form state outside the form tree:

```tsx
import { InputField, PasswordField, SubmitButton, useForm } from '@gxxc/solid-forms';

interface LoginValues {
  email: string;
  password: string;
}

function TypedLoginForm() {
  const form = useForm<LoginValues>();

  return (
    <form.Form onSubmit={(values) => console.log(values.email)}>
      <InputField name='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <SubmitButton>Log in</SubmitButton>
    </form.Form>
  );
}
```

If you already have a Standard Schema-compatible schema, pass it to `Form` or `useForm({ schema })`
to infer submit values from the schema instead of writing the values interface by hand.

## What Is Included

- `Form` and `useForm` for form composition and typed submit handlers
- `InputField`, `PasswordField`, `TextAreaField`, `CheckboxField`, `SelectField`, `RadioGroup`, and `SubmitButton`
- Standard Schema validation, built-in constraints, and custom validators
- Async submission state and form-level error rendering
- `parse` and `format` hooks for non-string field values
- Token-based styling with optional bundled themes: `minimal`, `midnight`, and `neobrutalist`

## Learn More

- [Installation](https://gxxcastillo.github.io/solid-forms/installation/)
- [Theming](https://gxxcastillo.github.io/solid-forms/theming/)
- [Validation](https://gxxcastillo.github.io/solid-forms/validation/)
- [Async submission](https://gxxcastillo.github.io/solid-forms/submission/)
- [Custom fields](https://gxxcastillo.github.io/solid-forms/custom-fields/)
- [API reference](https://gxxcastillo.github.io/solid-forms/api/)
- [Solid vs React mental model](https://gxxcastillo.github.io/solid-forms/solid-vs-react/)
