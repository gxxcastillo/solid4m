---
'solid4m': minor
---

Field names are now typed all the way down. `name='items.0.title'` (a dotted
object path, an array index, or both together) now type-checks against the
form's real value type and infers the value type at that path — no cast
needed, whether the field is used directly (`<InputField<M, N>>`), through
`createFields<M>()`/`createForm<M>()`, or against a schema-inferred form. A
misspelled nested name is now a compile error instead of silently accepting
any string.

This applies wherever a field name was previously typed `StringKeyOf<M>`: the
raw field components, `createFields`/`createForm`'s bound components,
`FormState`'s getters, and the store's mutations. Two new exported types
support it directly — `FieldPath<M>`, the union of every valid dotted/array
path on `M`, and `FieldPathValue<M, P>`, the value type at a given path — for
a custom component that wants the same checking.

Nesting is capped at 6 levels deep, comfortably past anything a real form
needs; a path beyond that falls out of `FieldPath<M>` rather than failing to
compile.
