---
'solid-formation': patch
---

Prevent forms from submitting while `isLoading` is true. Submit buttons now receive
the same unavailable treatment as an in-flight submit, and the submit handler also
refuses native or programmatic submits while data is loading. The form announces
`Loading…` in its status region by default; customize it with the new `loadingLabel`
prop or pass an empty string to keep that announcement silent.
