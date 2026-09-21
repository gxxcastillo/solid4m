---
'solid4m': minor
---

Remove internal field helpers from the public exports: `parse`, `format`,
`formFieldDefaultProps`, `createValueSetter`, `createOnInput`, `createOnBlur`,
`isSelectableEvent`, `getDisplayableErrors`, `useFormFieldLabel`, and the
`UseFormFieldLabelProps` type.

They are the machinery behind `createFormField` and `TextAreaField`, and they
reached the `solid4m` facade only through wildcard re-exports. None was
documented or intended as API. A custom field needs only `createFormField`,
which still returns everything these helpers produced: `setValue`, `onInput`,
`onBlur`, the displayable `errors`, and the default `parse`/`format` already
applied. If you imported one directly, use `createFormField` instead, or inline
the few lines you need.
