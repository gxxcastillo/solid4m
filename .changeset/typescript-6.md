---
'solid4m': patch
---

No consumer-facing change. Bumped the build toolchain's TypeScript from 5.4.2
to 6.0.3 (not 7, to stay within typescript-eslint's `<6.1.0` peer range).
Fixed one internal type-only cast in `SubmitButton` that TypeScript 6's
stricter `as`-cast overlap check now flags — a compile-time-only change with
no runtime or published-type-signature effect.
