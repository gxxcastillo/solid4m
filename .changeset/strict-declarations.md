---
'solid4m': patch
---

The published type declarations now pass a strict consumer check. With
`skipLibCheck` off — the default in fresh SolidStart templates, among others —
`tsc` reported errors inside this package's `index.d.ts` (TS2304 and TS2536)
even when your own code was correct; `0.2.0` failed the same check.

The cause was `createFormField`'s inferred return type, which TypeScript
expanded into thousands of lines of nested conditional types from solid-js's
`mergeProps`. It now has an explicit return type, and the props it returns
are exported as `BoundFormFieldProps` for custom field components that want to
name them. The bundled `index.d.ts` shrinks from about 420 KB to about 31 KB,
which also makes editors and `tsc` faster in projects that use this package.
