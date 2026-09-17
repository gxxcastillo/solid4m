---
title: API reference
description: Reference for form hooks, field components, and state APIs.
---

## `useForm<M, R>()`

Creates a self-contained form store.

| Property | Type           | Description                                                |
| -------- | -------------- | ---------------------------------------------------------- |
| `Form`   | Component      | Renders the form element; accepts the same props as `Form` |
| `state`  | `FormState<M>` | Reactive state object                                      |
| `store`  | `FormStore<M>` | Raw `[state, mutations]` tuple                             |

Use `useForm` when you need to read field values or validity outside the form tree. Use `Form`
directly when you only need a submit handler.

Pass a Standard Schema-compatible schema to infer values without a form generic:

```tsx
const form = useForm({ schema: loginSchema });

<form.Form onSubmit={(values) => values.email}>{/* fields */}</form.Form>;
```

## `Form`

A self-contained form that creates its own internal store.

```tsx
<Form<LoginValues> onSubmit={handleSubmit} errors={['Server error']} isLoading={isPageLoading}>
  {/* fields */}
</Form>

<Form schema={loginSchema} onSubmit={(values) => values.email}>
  {/* values inferred from loginSchema */}
</Form>
```

| Prop               | Type                                   | Description                                                                              |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `onSubmit`         | `(values: M) => void \| Promise<void>` | Submit handler                                                                           |
| `schema`           | `StandardSchemaV1`                     | Optional Standard Schema-compatible validator; successful output is passed to `onSubmit` |
| `children`         | `JSX.Element`                          | Field components and submit buttons                                                      |
| `errors`           | `string[]`                             | Form-level errors to display                                                             |
| `isLoading`        | `boolean`                              | Disables registered fields and makes submit actions unavailable while `true`             |
| `isProcessing`     | `boolean`                              | Marks the form in flight for work of your own; OR'd with the form's own submit state     |
| `processingLabel`  | `string`                               | Screen-reader announcement while a submit is in flight; defaults to `'Submitting…'`, `''` to disable |
| `loadingLabel`     | `string`                               | Screen-reader announcement while form data is loading; defaults to `'Loading…'`, `''` to disable |
| `className`        | `string`                               | CSS class on the form element                                                            |
| `align`            | `'left' \| 'center'`                   | Button alignment, defaults to `'left'`                                                   |
| `fullWidthButtons` | `boolean`                              | Stretch buttons to full width                                                            |

## `createForm<M>()`

`Form` and the field components are each generic over the form's value type (`M`), and field
components are also generic over their own `name` (`N`) — but JSX can't carry a type parameter from
`<Form<M>>` down into a sibling field's own generic inference, so every element is type-checked in
isolation. Spelling out `<M, 'name'>` on `Form` and every field works (see `InputField` below) but
gets repetitive for a component that only ever renders one form. Call `createForm<M>()` once instead
to bind `M` for `Form` and all field components together:

```tsx
const { Form, InputField, PasswordField } = createForm<LoginValues>();

<Form onSubmit={(values) => values.email}>
  <InputField name='email' type='email' label='Email' required />
  <PasswordField name='password' label='Password' required minLength={8} />
</Form>;
```

`onSubmit`'s `values`, `name='bogus'`, and a self-referencing `match` are all checked against `M`,
exactly as if you had written `<Form<LoginValues>>` and `<InputField<LoginValues, 'email'>>` at each
call site. The returned components are the real `Form`/`InputField`/`PasswordField`/`TextAreaField`/
`CheckboxField` — `createForm` only fixes `M` at the type level, it does not wrap or change their
behavior.

Pass a Standard Schema-compatible schema instead of a type argument to infer `M` from it, the same as
`useForm({ schema })`:

```tsx
const { Form, InputField, PasswordField } = createForm({ schema: loginSchema });

<Form onSubmit={(values) => values.email}>
  <InputField name='email' type='email' label='Email' required />
  <PasswordField name='password' label='Password' required />
</Form>;
```

Fields are typed against the schema's *input* (what the DOM gives you); `onSubmit` receives the
schema's *output*, which can differ for a transform/coercion schema. The schema also becomes `Form`'s
default, so it does not need to be repeated as a `schema` prop — though an individual `<Form
schema={other}>` call can still override it, same as `useForm`.

If several field groups need to share one `Form`/store — a multi-step form, for example — call
`createFields<M>()` instead to bind just the field components, and wire the shared store up with
`useForm`/`FormContextProvider` (see below).

## `createFields<M>()`

The field-only half of `createForm<M>()`, for when the fields don't own their `Form`:

```tsx
const { InputField, PasswordField } = createFields<LoginValues>();

<InputField name='email' type='email' label='Email' required />
<PasswordField name='password' label='Password' required minLength={8} />
```

## `InputField`

Renders a labeled `<input>`, defaulting to `type="text"`.

```tsx
<InputField<M, 'email'> name='email' type='email' label='Email address' defaultValue='user@example.com' required />

<InputField<M, 'slug'> name='slug' label='Slug' pattern={/^[a-z0-9-]+$/} />
```

Prefer `type='email'` over a hand-written `pattern` — it drives the on-screen keyboard and is
format-checked against the HTML specification. See
[validation](/validation/#format-checking-from-the-input-type).

| Prop                                                                   | Type                    | Description                                         |
| ---------------------------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| `name`                                                                 | `StringKeyOf<M>`        | Field name; must match a key in the form value type |
| `label`                                                                | `string`                | Visible label text                                  |
| `defaultValue`                                                         | `M[N]`                  | Initial value                                       |
| `disabled`                                                             | `boolean`               | Disables the input                                  |
| `readonly`                                                             | `boolean`               | Makes the input read-only                           |
| `parse`                                                                | `(raw: string) => M[N]` | Convert DOM string to typed value                   |
| `format`                                                               | `(val: M[N]) => string` | Convert typed value back to display string          |
| `validator`                                                            | `CustomValidator<M, N>` | Custom validation function                          |
| `required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `match`, `step` | Constraint props | Built-in validation constraints              |
| `type`                                                                 | `string`                | Standard input type; `email` and `url` are also format-checked |

All standard HTML input attributes are also accepted.

## `PasswordField`

Same props as `InputField`. Renders `<input type="password">`.

## `TextAreaField`

Same props as `InputField`, except `type`. Renders a `<textarea>`.

```tsx
<TextAreaField name='bio' label='Bio' maxLength={500} />
```

## `CheckboxField`

Renders a labeled checkbox. The field value in form state is a boolean.

```tsx
<CheckboxField name='acceptTerms' label='I accept the terms' required />
```

| Prop             | Type                    | Description                      |
| ---------------- | ----------------------- | -------------------------------- |
| `name`           | `StringKeyOf<M>`        | Field name                       |
| `label`          | `string`                | Label text                       |
| `defaultChecked` | `boolean`               | Initial checked state            |
| `disabled`       | `boolean`               | Disables the checkbox            |
| `required`       | `boolean`               | Field must be `true` to be valid |
| `validator`      | `CustomValidator<M, N>` | Custom validation function       |

## `SubmitButton`

Renders a submit button. It stays enabled while the form is invalid, and marks itself
`aria-disabled` while a submit is in flight.

Submitting an invalid form reveals every field's errors and moves focus to the first invalid field,
rather than silently doing nothing. A disabled submit button would leave the tab order entirely and
give no way to discover what is missing, so validity gates the *result* of the submit, not access to
it.

An in-flight submit is marked with `aria-disabled` rather than the `disabled` attribute for a
related reason: the user who pressed the button is focused on it, and disabling a focused element
removes it from the tab order, so the browser drops focus to `<body>` and nothing restores it when
the submit settles. `aria-disabled` announces the same unavailability while keeping focus and tab
position; the component blocks activation itself, since `aria-disabled` is advisory.

While in flight the button also shows a spinner. It is decorative (`aria-hidden`), because the form's
live region does the announcing, and it is positioned inside the button's own padding so the button
neither grows nor re-centers its label mid-submit. Under `prefers-reduced-motion` it renders as a
static dot.

In a form with more than one submit button, the spinner appears only on the button that was
pressed — every other submit button is still marked `aria-disabled`, because a second submit really
is unavailable while the first is running, but only one action is actually running. When nothing
pressed a button — a caller-declared `<Form isProcessing>`, or a programmatic submit — every submit
button shows the spinner, since there is no one action to attribute it to.

Pass `isDisabled` when the action is genuinely unavailable for a reason of your own — it renders a
real `disabled` attribute, unlike the in-flight state. It is read as a value, not as a presence, so
binding it to a signal works the way you would expect:

```tsx
<SubmitButton isDisabled={!termsAccepted()}>Sign up</SubmitButton>
```

While that reads `false` the button behaves exactly as if the prop were absent, in-flight spinner
included; while it reads `true` the button is hard-disabled and gets no in-flight treatment, since a
disabled button cannot be the one submitting.

```tsx
<SubmitButton>Log in</SubmitButton>

<SubmitButton name='saveDraft'>Save draft</SubmitButton>
<SubmitButton name='publish'>Publish</SubmitButton>
```

Named submit buttons select a handler from an object-style `onSubmit` map, for example
`onSubmit={{ saveDraft, publish }}`.

When `onSubmit` is a map of more than one handler, each `SubmitButton` needs a `name` matching one
of its keys — that name is what selects the handler. A button without one selects nothing, so the
submit does nothing at all; the library logs a console warning naming the available handlers rather
than failing silently. A single-handler map needs no name, since there is nothing to disambiguate,
and a plain function `onSubmit` never needs one.

| Prop          | Type                     | Description                                       |
| ------------- | ------------------------ | ------------------------------------------------- |
| `children`    | `JSX.Element`            | Button label                                      |
| `isDisabled`  | `boolean`                | Hard-disable the button with a real `disabled`    |
| `isFullWidth` | `boolean`                | Stretch to container width                        |
| `name`        | `string`                 | Optional field name for multi-button forms        |
| `variant`     | `'primary' \| 'approve'` | Visual variant; `approve` renders `type="button"` |

## State API

`form.state` is reactive. Access it inside Solid signals, `createEffect`, or JSX to get fine-grained
updates.

| Property or method              | Type                    | Description                                                    |
| ------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `isFormValid`                   | `boolean`               | `true` when no registered field has errors                     |
| `haveValuesChanged`             | `boolean`               | `true` when any field has changed from its initial value       |
| `isLoading`                     | `boolean`               | `<Form isLoading>` is set; every field is disabled              |
| `isProcessing`                  | `boolean`               | An async submit handler is in flight, or `<Form isProcessing>` is set |
| `errors`                        | `string[]`              | Form-level errors, including thrown or rejected submit errors  |
| `getFieldValue(name)`           | `M[N] \| undefined`     | Current parsed value for a field                               |
| `getFieldErrors(name)`          | `string[] \| undefined` | Current errors for a field                                     |
| `isFieldValid(name)`            | `boolean \| undefined`  | `false` if the field has errors; `undefined` if not registered |
| `hasFieldBeenValid(name)`       | `boolean \| undefined`  | `true` once the field has been error-free                      |
| `hasFieldBlurred(name)`         | `boolean \| undefined`  | `true` once the user has blurred the field                     |
| `hasFieldChanged(name)`         | `boolean \| undefined`  | `true` once the field value has changed                        |
| `hasFieldBeenInitialized(name)` | `boolean`               | `true` once the field has registered with the store            |

## Standard Schema Types

The package exports `StandardSchemaV1`, `StandardSchemaV1Types`, `InferStandardSchemaInput`,
`InferStandardSchemaOutput`, `StandardSchemaFormValues`, and `StandardSchemaSubmitValues` for custom
schema producers and helpers. `StandardSchemaFormValues` is the schema input type used by field
state; `StandardSchemaSubmitValues` is the schema output type passed to `onSubmit`.
