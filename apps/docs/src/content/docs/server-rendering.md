---
title: Server rendering
description: SSR and SolidStart support, and what is not covered yet.
---

`solid4m` server-renders. A form mounted on the server produces real markup — labels, `required`,
error containers, the live regions described in [accessibility](../accessibility/) — and the client
picks up that same markup on hydration instead of throwing it away and re-rendering from scratch. No
`clientOnly` wrapper is needed anywhere in the tree.

## What ships

The package resolves to one of two compiled entries, selected by
[export conditions](https://nodejs.org/api/packages.html#conditional-exports) in `package.json`:

```json
"exports": {
  ".": {
    "node": "./dist/server/index.js",
    "worker": "./dist/server/index.js",
    "deno": "./dist/server/index.js",
    "browser": "./dist/index.js",
    "import": "./dist/index.js"
  }
}
```

`node`/`worker`/`deno` — the conditions a server runtime resolves under — get `dist/server/index.js`,
compiled with Solid's `generate: 'ssr'` target. `browser`/`import` get `dist/index.js`, the DOM
entry. Both builds are compiled with hydration support turned on, so the DOM entry does not assume it
is mounting into an empty document; it adopts whatever markup the server entry already rendered
instead of discarding it. That is what makes hydration match rather than mismatch: the two entries
are separate builds of the same source for different targets, not one entry improvising a fallback
for the other.

Both entries also externalize `solid-js`, `solid-js/web`, and `solid-js/store` rather than bundling
them, so whichever copy your app (or SolidStart) already resolves for those is the one solid4m runs
against too.

Use it like any other component — no server/client branch of your own:

```tsx
import { Form, InputField, SubmitButton } from 'solid4m';

function ContactForm() {
  return (
    <Form onSubmit={(values) => submitContact(values)}>
      <InputField name='email' type='email' label='Email' required />
      <SubmitButton>Send</SubmitButton>
    </Form>
  );
}
```

## Styles

Import the stylesheet the same way you would in a client-only app, once in your app's entry:

```ts
import 'solid4m/styles.css';
```

See [Installation](../installation/#styles) for theme files and token customization; nothing about
importing them changes under SSR.

## Using it in a SolidStart route

A route is just a component, so a form dropped into one needs nothing SolidStart-specific:

```tsx
// src/routes/contact.tsx
import { Form, InputField, SubmitButton } from 'solid4m';

export default function Contact() {
  return (
    <Form onSubmit={(values) => submitContact(values)}>
      <InputField name='email' type='email' label='Email' required />
      <SubmitButton>Send</SubmitButton>
    </Form>
  );
}
```

No configuration is needed beyond installing the package: no `ssr.noExternal`, no aliases, no
`optimizeDeps` entries. Import `solid4m/styles.css` once, in `src/app.tsx` or in the route that
renders the form.

This was checked against fresh apps from both current SolidStart lines — 2.x (Vite 8) and 1.x (Vinxi,
Vite 6) — with the dev server and a production build: the server HTML contains the form, hydration
logs no mismatch warnings, an empty submit focuses the first invalid field, and a valid submit hands
`onSubmit` the nested values. Both templates' default `tsconfig.json` leaves `skipLibCheck` off, and
`tsc` reports no errors in this package's declarations under it.

## What changed from `0.2.0`

`0.2.0` could not be server-rendered at all. It shipped a single browser build that inlined
`solid-js/web`'s DOM runtime — code that assumes `document` exists — into `dist/index.js`. Any attempt
to render it on the server, including a SolidStart route not wrapped in `clientOnly`, crashed with
`document is not defined`. The two-entry setup above is what `0.3.0` adds to fix that.

CI checks this against the packed package itself, not just the source: it installs the real tarball
into a separate project, server-renders a form with `renderToString`, hydrates it in Chromium, and
fails on any console error or hydration mismatch.

## Not yet supported

- **No `solid` export condition.** Some Solid libraries ship a third, uncompiled entry (preserved
  JSX) under a `solid` condition, letting the consumer's own bundler decide the final DOM/SSR/
  hydratable output. `solid4m` does not yet — you always get one of the two pre-compiled entries
  above. This is planned as follow-up work, not committed to a release.
- **No server actions or progressive enhancement.** The rendered `<form>` carries no `action`; it is
  only ever submitted by the client-side `onSubmit` handler described in
  [async submission](../submission/). That means a form needs JavaScript to have loaded and hydrated
  before it can be submitted at all — there is no fallback path if it hasn't. `onSubmit` itself always
  runs on the client; if you want a server call, make it yourself inside your handler (a `fetch`, a
  SolidStart server action, or whatever your framework provides) rather than expecting the form to
  reach the server on its own.
