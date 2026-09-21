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
import { type StringKeyOf } from 'type-fest';

import { createFormField } from 'solid4m';
import type { FieldValueMapping, FormFieldProps } from 'solid4m';

function RatingField<M extends FieldValueMapping, N extends StringKeyOf<M>>(
  props: FormFieldProps<'input', M, N>
) {
  const [fieldProps, createField] = createFormField<'input', M, N>(props)();

  return createField(
    'InputField',
    <div>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type='button' onClick={() => fieldProps.setValue(n as M[N])}>
          {n}
        </button>
      ))}
      {fieldProps.errors?.[0] && <div>{fieldProps.errors[0]}</div>}
    </div>
  );
}
```

The returned `fieldProps` contains the current value, errors, and mutation helpers. `createField`
connects your rendered control to the surrounding form store.
