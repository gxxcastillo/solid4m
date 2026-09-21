---
'solid4m': patch
---

`useForm<M>()` now accepts an `async` submit handler. The hook fixed the
handler's response type to `M` by default, so the ordinary

```tsx
const form = useForm<ProfileValues>();
<form.Form onSubmit={async (values) => { await save(values); }}>
```

failed to compile — a `Promise<void>` is not a `Promise<ProfileValues>` —
unless you wrote `useForm<ProfileValues, void>()`. The default now accepts any
response, and an explicit second type argument still works.
