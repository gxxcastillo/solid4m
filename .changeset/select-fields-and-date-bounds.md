---
'solid-formation': minor
---

Add five fields to the palette: `SelectField`, `RadioGroup`, `NumberField`,
`DateField`, and `FileField`. Each is a themed, form-state-aware wrapper around a
native control, with a label, validation errors, and disabled/loading
integration, and each is available from `createForm()` and `createFields()`.

- `SelectField` wraps a native `<select>`. With `multiple`, it stores the
  selected values as a string array.
- `RadioGroup` renders a native fieldset of radios from an `options` array and
  stores the chosen option as one value, rather than one boolean per option.
- `NumberField` is an `InputField` locked to `type='number'`. It stores the
  input's value as a string, without coercing it, so clearing an optional field
  doesn't turn it into `0`. Pass your own `parse` to store numbers, choosing how an empty
  field should be represented.
- `DateField` is an `InputField` locked to `type='date'`. Values stay in the
  browser's `yyyy-mm-dd` format, the same format `min`, `max`, and `step` use;
  use `parse` and `format` to work with `Date` objects instead.
- `FileField` stores the selected `FileList`. Clearing the selection stores
  `undefined`, so `required` rejects it, and `reset()` or `resetField()` clears
  the native control. Browsers don't allow setting a file input's value, so the
  field takes no `value`, `parse`, or `format` props.

Date, month, week, time, and datetime-local fields now enforce string `min` and
`max` bounds in their native DOM formats, such as `min='09:00'` and
`max='17:00'`. Bounds are compared using each input type's HTML value algorithm,
while numeric bounds retain their existing behavior.
