---
'@gxxc/solid-forms': minor
---

Remove the `deepEqual` export.

It was a leftover internal helper with no callers anywhere in the library, no
tests, and no documentation — it reached the public `@gxxc/solid-forms` facade
only because of a wildcard re-export, never as an intended part of the API. If
you were importing it, inline a deep-equality check of your own instead.
