---
'solid4m': patch
---

No consumer-facing behavior change, but the built output's CSS filename
changed internally. Moved the build toolchain to Vite 8, Vitest 5, and
vite-plugin-dts 5 (from Vite 5, Vitest 2, and vite-plugin-dts 3), fixing
`pnpm audit`'s remaining critical/high advisories.

Vite 8's library-mode CSS output now follows the JS entry's `fileName`
(`dist/index.css`) instead of the previous fixed `dist/style.css`. The
`./styles.css` subpath export now points at the real file, so
`import 'solid4m/styles.css'` keeps working exactly as before —
caught by `verify-tarball/`'s real npm-install check before this ever
reached a release.
