---
'@gxxc/solid-forms': minor
---

Add `SelectField` and `RadioGroup`, themed form-state-aware wrappers around
native choice controls. They provide labels, validation errors,
disabled/loading integration, and work with `createForm()`'s typed field palette.

Date, month, week, time, and datetime-local fields now enforce string `min` and
`max` bounds in their native DOM formats, such as `min='09:00'` and
`max='17:00'`. Bounds are compared using each input type's HTML value algorithm,
while numeric bounds retain their existing behavior.
