---
title: Validation
description: Use schema validation, built-in constraints, and custom validators.
---

Use a Standard Schema-compatible schema when you want one source of truth for validation and submit
value types. Schema issues with field paths are mapped back onto registered fields on submit.

```tsx
import { z } from 'zod';

import { Form, InputField, PasswordField, SubmitButton } from '@gxxc/solid-forms';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

<Form
  schema={loginSchema}
  onSubmit={(values) => {
    values.email; // string
    values.password; // string
  }}
>
  <InputField name='email' label='Email' />
  <PasswordField name='password' label='Password' />
  <SubmitButton>Log in</SubmitButton>
</Form>;
```

Use `useForm({ schema })` for the same inference when you need state outside the form tree.

Field-level constraints are still available as field props. Errors appear after the user has blurred a
field or submitted the form.

```tsx
<InputField
  name='username'
  label='Username'
  required
  minLength={3}
  maxLength={20}
  pattern={/^[a-z0-9_]+$/}
/>

<InputField name='age' label='Age' min={18} max={120} />

<InputField name='confirm' label='Confirm password' match='password' />
```

| Constraint  | Type               | Description                                               |
| ----------- | ------------------ | --------------------------------------------------------- |
| `required`  | `boolean`          | Field must have a non-empty value                         |
| `minLength` | `number`           | Minimum measured length                                   |
| `maxLength` | `number`           | Maximum measured length                                   |
| `min`       | `number`           | Minimum numeric value, parsed with the field `parse` prop |
| `max`       | `number`           | Maximum numeric value, parsed with the field `parse` prop |
| `pattern`   | `string \| RegExp` | Value must match the pattern                              |
| `match`     | `string`           | Value must equal the named field's current value          |
| `step`      | `number \| 'any'`  | Value must land on a step, counted from `min`             |
| `type`      | `string`           | The input's own `type`; format-checks `email` and `url`   |

Set a constraint prop to `false` to disable that constraint entirely, for example
`required={false}`.

### Empty values and `required`

Only `required` decides whether a field must have a value. `minLength`, `maxLength`, `min`, `max`,
`pattern` and `type` all skip an empty value (`undefined`, `null` or `''`) rather than failing it, so
an optional bounded field is valid while untouched and an empty required field reports one error
instead of two. `minLength`, `maxLength`, `min` and `max` also skip an empty array. Combine them when
a field must be both present and bounded:

```tsx
<InputField name='username' label='Username' required minLength={3} />
```

`minLength`/`maxLength` measure whatever the field holds: a string by its characters, an array (for
example a multi-select) by its item count, and a number (from a custom `parse`) by its digits. The
number case measures the _parsed_ value, so it is not a stand-in for bounding the typed text — a
`parse` to a number drops leading zeros (`01234` measures 4, not 5) and counts a minus sign. Keep the
default string `parse` when the characters the user typed are what must be bounded.

### Format checking from the input type

`type='email'` and `type='url'` are format-checked from the `type` attribute itself — no extra prop:

```tsx
<InputField name='email' type='email' label='Email' required />
<InputField name='website' type='url' label='Website' />
```

An invalid value reports `"Email" must be a valid email address` or `"Website" must be a valid URL`.
Both follow the HTML specification exactly, so they accept and reject the same values a browser
does — including the surprising ones: `a@b` is a valid email address (there is no TLD requirement),
and `type='url'` requires an _absolute_ URL, so `example.com` fails but `mailto:a@b.com` passes. Like
every other constraint, an empty value is left to `required`.

Every other input type is unchecked, `type='number'` included — a number input's own value handling
already discards non-numeric text before this library sees it, so `required` is what catches an empty
one. A `multiple` email input's comma-separated list is not supported; use a custom `validator`.

### Stepped values

`step` checks that a value lands on one of the allowed increments, exactly as the browser used to:

```tsx
<InputField name='quantity' type='number' min={1} step={5} />
<InputField name='reminder' type='time' step={1800} />
```

The first accepts 1, 6, 11 — `min` is where the ladder starts, so it is _not_ multiples of 5. Without
a `min` the ladder starts at zero. The second accepts times on the half hour.

`step` is counted in the units the HTML specification defines for the input's `type`, which are not
always the units the field displays: one step is **1** on a `number`, one **day** on a `date`, one
**month** on a `month`, one **week** on a `week`, and one **second** on `time` and `datetime-local`.
That is why the reminder above is `1800` and not `30`. Every other type ignores `step` entirely, as
a browser does — including `range`, whose value snaps to the nearest step instead of ever being
invalid.

Pass `step='any'` to render the attribute while turning the check off.

An **absent** `step` is not checked, which is a deliberate difference from the browser. A bare
`<input type='number'>` has a default step of 1, so a browser rejects `19.99` in a price field that
never asked for stepping; reproducing that would invalidate decimal number fields everywhere at
once. Write `step={0.01}` to opt in.

### Date and time bounds

`min` and `max` use the native DOM format for date/time inputs and are validated
by the library as well as rendered for the picker:

```tsx
<InputField name='appointment' type='date' min='2026-01-01' max='2026-12-31' />
<InputField name='reminder' type='time' min='09:00' max='17:00' step={1800} />
```

The same applies to `month`, `week`, and `datetime-local`. Numeric inputs keep
using numeric bounds, such as `min={18}` and `max={120}`. A malformed or
mismatched bound is skipped rather than creating a false validation error.

### Native browser validation is off

The rendered `<form>` sets `noValidate`, because the browser's own interactive validation would
otherwise intercept the submit and prevent this library's validation, error display, and focus
management from running. Constraint props are still rendered as real HTML attributes, so `required`
still maps to `aria-required` for assistive tech, `step` still drives the spinner arrows and the
native picker, and the `email`/`url` format checks and `step` above replace the validation the
browser would have applied.

One piece of native behavior has no library equivalent yet: a raw `<input required>` written directly
inside `<Form>`, rather than through a field component, is not registered as a field and so is
validated by nobody.

## Custom validators

Use a `validator` function for logic that built-in constraints cannot express. Custom validators run
only when no built-in errors exist on the field.

```tsx
<InputField
  name='username'
  label='Username'
  validator={async (name, value, formState, setErrors) => {
    const taken = await api.checkUsername(value as string);
    if (taken) {
      setErrors(['Username is already taken']);
    }
  }}
/>
```

The validator signature is:

```ts
type CustomValidator<M, N extends keyof M> = (
  fieldName: N,
  fieldValue: M[N],
  formState: FormState<M>,
  setFieldErrors: (errors: string[]) => void
) => void | Promise<void>;
```

Sync validators call `setErrors` before returning. Async validators call `setErrors` when the promise
resolves.
