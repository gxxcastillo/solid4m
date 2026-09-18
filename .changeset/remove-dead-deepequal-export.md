---
'solid-formation': minor
---

Remove the `deepEqual` export.

It was a leftover internal helper with no callers anywhere in the library, no
tests, and no documentation — it reached the public `solid-formation` facade
only because of a wildcard re-export, never as an intended part of the API. If
you were importing it, inline a deep-equality check of your own instead.
