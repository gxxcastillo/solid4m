---
title: Custom fields
description: Parse values, format values, and integrate custom inputs.
---

By default, field values are strings because that is what the DOM gives you. Supply `parse` and
`format` to work with richer types.

```tsx
<InputField<{ age: number }, 'age'>
  name='age'
  label='Age'
  parse={(raw) => parseInt(raw ?? '', 10)}
  format={(val) => (val != null ? String(val) : '')}
  min={0}
  max={150}
/>
```

`parse` converts the raw string before it is written to form state. `format` converts the typed value
back to a string for the input.

## Wrap `createFormField`

Use `createFormField` to integrate any input element into the form.

```tsx
import { createUniqueId } from 'solid-js';

import { createFormField } from 'solid4m';
import type { FieldPath, FieldPathValue, FieldValueMapping, FormFieldProps } from 'solid4m';

function RatingField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  props: FormFieldProps<'input', M, N>
) {
  const [fieldProps, createField] = createFormField<'input', M, N>(props)();
  const errorId = createUniqueId();

  return createField(
    'InputField',
    <div
      role='group'
      aria-label={fieldProps.label}
      aria-invalid={!!fieldProps.errors?.length}
      aria-describedby={fieldProps.errors?.length ? errorId : undefined}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button type='button' onClick={() => fieldProps.setValue(n as FieldPathValue<M, N>)}>
          {n}
        </button>
      ))}
      {fieldProps.errors?.[0] && (
        <div id={errorId} role='alert'>
          {fieldProps.errors[0]}
        </div>
      )}
    </div>
  );
}
```

The returned `fieldProps` contains the current value, errors, and mutation helpers. `createField`
connects your rendered control to the surrounding form store.

`fieldProps.errors` holds only the errors that should be visible right now, so render the first
one the same way the built-in fields do: mark the control `aria-invalid`, point its
`aria-describedby` at the message, and give the message `role='alert'` so screen readers announce
it when it appears.

`FieldPath<M>` is every valid field name on `M`, including dotted paths, and `FieldPathValue<M, N>`
is the value type at that path. Typing your component with them gives it the same name and value
checking as the built-in fields:

```tsx
<RatingField<ReviewValues, 'review.stars'> name='review.stars' label='Stars' />
```
