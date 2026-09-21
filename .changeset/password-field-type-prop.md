---
'solid4m': patch
---

Fix `PasswordField` throwing `TypeError: Cannot set property type of #<Object>
which has only a getter` when a `type` prop was passed reactively. It forced
`type='password'` by assigning to its own props object, which Solid makes
read-only for any reactive prop. It now merges the type in instead, the same way
`DateField` and `NumberField` do.

`PasswordFieldProps` no longer accepts `type`, which a password field always
overrode anyway, matching `DateFieldProps` and `NumberFieldProps`.
