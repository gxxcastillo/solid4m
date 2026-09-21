---
title: Installation
description: Install solid4m and import the package styles.
---

Install `solid4m` into a SolidJS 1.x app (1.8.20 or later). `solid-js` is a peer dependency, so the
package uses your app's copy.

```bash
npm install solid4m
# or
pnpm add solid4m
```

It works in client-only apps and in server-rendered ones such as SolidStart; see
[Server rendering](../server-rendering/).

## Upgrading from `@gxxc/solid-forms`

`solid4m` is the new name of `@gxxc/solid-forms`, which published up to `0.2.0`. Swap the package and
the import prefix; the stylesheet and theme subpaths keep their names.

```bash
npm uninstall @gxxc/solid-forms
npm install solid4m
```

```ts
// Before
import { Form, InputField } from '@gxxc/solid-forms';
import '@gxxc/solid-forms/styles.css';

// After
import { Form, InputField } from 'solid4m';
import 'solid4m/styles.css';
```

`0.3.0` also changes some behavior a `0.2` form can notice, most visibly that `SubmitButton` is no
longer disabled while the form is invalid. The
[changelog](https://github.com/gxxcastillo/solid4m/blob/main/packages/solid4m/CHANGELOG.md) lists
each change under "Migrating from `@gxxc/solid-forms` 0.2".

## Styles

The components ship with structural CSS and default design tokens. Import the stylesheet once,
usually in your app entry.

```ts
import 'solid4m/styles.css';
```

That file includes layout, focus behavior, the floating label implementation, and default `--sf-*`
tokens, so forms render as finished UI without a separate theme.

## Theme files

Bundled themes are optional. Import any theme files you plan to activate.

```ts
import 'solid4m/styles.css';
import 'solid4m/themes/midnight.css';
```

Then scope the theme with a `data-sf-theme` attribute or matching class.

```tsx
<div data-sf-theme='midnight'>
  <Form onSubmit={submit}>{/* fields */}</Form>
</div>
```
