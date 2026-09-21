# solid4m

**Typed, reactive forms for [SolidJS](https://www.solidjs.com/).**

**Docs:** https://gxxcastillo.github.io/solid4m/

**Demo:** https://gxxcastillo.github.io/solid4m/demo/

## Installation

```bash
npm install solid4m
# or
pnpm add solid4m
```

Requires SolidJS 1.x (1.8.20 or later) as a peer dependency.

Coming from `@gxxc/solid-forms`? This is the same library under its new name; see
[Upgrading](https://gxxcastillo.github.io/solid4m/installation/#upgrading-from-gxxcsolid-forms).

## Quick Start

Import the stylesheet once in your app entry:

```ts
import 'solid4m/styles.css';
```

Then bind your form's value type once with `createForm`, and every field name is checked against it,
including nested paths:

```tsx
import { SubmitButton, createForm } from 'solid4m';

interface SignupValues {
  email: string;
  password: string;
  profile: { name: string };
}

const { Form, InputField, PasswordField } = createForm<SignupValues>();

function SignupForm() {
  return (
    <Form onSubmit={(values) => console.log(values.profile.name)}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <InputField name='profile.name' label='Name' />
      <SubmitButton>Sign up</SubmitButton>
    </Form>
  );
}
```

Already have a schema? Any [Standard Schema](https://standardschema.dev/) library works (Zod, Valibot,
ArkType, …): `createForm({ schema })` infers the field types from it and validates on submit.

## What Is Included

- `Form`, `createForm`, and `useForm`, with typed submit handlers and field names typed as dotted paths
- `InputField`, `PasswordField`, `TextAreaField`, `CheckboxField`, `SelectField`, `RadioGroup`, `NumberField`,
  `DateField`, `FileField`, and `SubmitButton`
- `FieldArray` and `useFieldArray` for repeating sections, with reordering that keeps each row's state
- Standard Schema validation, built-in constraints (including `step` and date bounds), and custom validators
- `reset`, `setValues`, and `resetField` for loading and reverting data
- Accessible by default: focus moves to the first invalid field on submit, and errors and progress are
  announced through live regions
- Server rendering and hydration, including SolidStart
- Token-based styling with optional bundled themes: `minimal`, `midnight`, and `neobrutalist`

## Learn More

- [Installation](https://gxxcastillo.github.io/solid4m/installation/)
- [Field palette](https://gxxcastillo.github.io/solid4m/fields/)
- [Validation](https://gxxcastillo.github.io/solid4m/validation/)
- [Async submission](https://gxxcastillo.github.io/solid4m/submission/)
- [Field arrays](https://gxxcastillo.github.io/solid4m/field-arrays/)
- [Loading and resetting data](https://gxxcastillo.github.io/solid4m/loading-and-resetting/)
- [Accessibility](https://gxxcastillo.github.io/solid4m/accessibility/)
- [Server rendering](https://gxxcastillo.github.io/solid4m/server-rendering/)
- [Theming](https://gxxcastillo.github.io/solid4m/theming/)
- [Custom fields](https://gxxcastillo.github.io/solid4m/custom-fields/)
- [API reference](https://gxxcastillo.github.io/solid4m/api/)
- [Solid vs React mental model](https://gxxcastillo.github.io/solid4m/solid-vs-react/)
