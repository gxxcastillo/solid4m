---
'@gxxc/solid-forms': minor
---

Make `<Form isProcessing>` and `<Form isLoading>` actually do something.

Both props were declared on `Form` and documented in the API reference, and
nothing read either one. Passing `isProcessing` produced no spinner, no
`aria-disabled`, no click guard, and no screen-reader announcement; passing
`isLoading` did not disable anything. Every behavior they name was hung off the
matching `form.state` flag, and the props never reached it.

They now do, which is what you want when the async work is not running through
this form's `onSubmit` — a router action, a mutation, a resource loading the
initial values:

```tsx
<Form onSubmit={onSubmit} isLoading={user.loading} isProcessing={saveUser.pending}>
```

`isLoading` disables every registered field. `isProcessing` gives the submit
button the same in-flight treatment a real submit gets — spinner,
`aria-disabled`, blocked activation — and announces `processingLabel` in the
form's polite live region.

**They add to the form's own state rather than overriding it.** The form is
processing when you say so *or* when it is running a submit itself, so
`isProcessing={false}` cannot cut a real submit short. That is deliberate:
`isProcessing` is also the guard that stops a second submit starting on top of
one already in flight, and a `false` that won outright would let a double submit
through.

The two sources are tracked separately inside the store, which is what makes the
above safe. Sharing one slot meant two writers: with the prop held `true` across
an in-flight submit, the handler's `finally` cleared the flag and nothing put it
back, because an effect watching a prop whose value never changed does not
re-run. The form would quietly un-busy itself underneath a consumer who was
still working. `FormStateMutations` gains `setIsLoadingFromProps` and
`setIsProcessingFromProps` for the prop channel; `setIsLoading` and
`setIsProcessing` are unchanged and still drive the form's own source.
