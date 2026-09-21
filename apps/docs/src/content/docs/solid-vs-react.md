---
title: Solid vs React mental model
description: How solid4m differs from React form libraries.
---

Solid and React both use JSX, but their update models are different. In React, form state often flows
through component state, props, context, and rerenders. In Solid, components run to set up reactive
relationships, then fine-grained reads update the DOM bindings, memos, and effects that depend on
them.

## State changes do not rerun component functions

In React, updating form state with a state setter usually reruns the component function, then React
reconciles the next render output. You often manage that with local state, memoized callbacks,
component boundaries, or context selectors.

solid4m writes field changes into a Solid store. When JSX reads `form.state.isFormValid` or
`form.state.getFieldValue('email')`, Solid tracks that read and updates the dependent binding. The
rest of the component tree does not rerun just because one field changed.

## Fields are form-aware components

In React, you usually choose between controlled inputs (`value` plus `onChange`) and uncontrolled
inputs (`defaultValue` plus refs or form reads). With solid4m, the field components provide the
input props, event handlers, validation state, and store synchronization for you.

You still declare normal JSX:

```tsx
<InputField name='email' type='email' label='Email' required />
```

The field reads the nearest form context and initializes its form-state entry when it is rendered.

## Read form state where you need it

In React, derived form UI is often lifted into parent state, passed through props, or read from
context. In Solid, read the form state directly where the UI needs it; that read becomes the reactive
dependency.

```tsx
const form = useForm<LoginValues>();

<Show when={!form.state.isFormValid}>Please fix the highlighted fields.</Show>;
```

There is no extra effect, selector, or memoized callback needed just to keep that UI current.

## `parse` and `format` instead of `valueAs`

Browser text inputs still emit strings. In React, type conversion often happens inside `onChange`,
inside submit handlers, or in a form helper. solid4m makes the conversion part of the field
contract.

```tsx
<InputField<{ age: number }, 'age'>
  name='age'
  label='Age'
  parse={(raw) => parseInt(raw ?? '', 10)}
  format={(value) => (value != null ? String(value) : '')}
/>
```

`parse` converts the raw DOM value before it enters form state. `format` converts typed state back to
a string for the input.

## Validation runs on input

Built-in constraints run when a field value is committed, including input and blur events. Errors are
stored immediately, but field-level messages become visible after the user has blurred the field or
submitted the form once.

```tsx
<InputField name='username' label='Username' required minLength={3} />
```

Validation constraints live next to the field that owns them, and form-level validity is derived
from the current field entries in the form store.
