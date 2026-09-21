---
title: Installation
description: Install solid4m and import the package styles.
---

Install `solid4m` into a SolidJS 1.x app.

```bash
npm install solid4m
# or
pnpm add solid4m
```

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
