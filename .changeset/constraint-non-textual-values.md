---
'solid-formation': patch
---

Fix `pattern`, `type`, and `step` constraints coercing a non-string,
non-number field value (an array, an object, a `File`) to a string before
testing it, which could silently stringify to `"[object Object]"` and test a
meaningless value against the pattern/format/step instead of skipping it.
These constraints now skip a field value they cannot meaningfully express as
text or a number, consistent with how `minLength`/`maxLength` already treat
an unmeasurable value.
