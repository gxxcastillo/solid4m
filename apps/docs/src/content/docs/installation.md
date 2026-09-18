---
title: Installation
description: Install solid-formation and import the package styles.
---

Install `solid-formation` into a SolidJS 1.x app.

```bash
npm install solid-formation
# or
pnpm add solid-formation
```

## Styles

The components ship with structural CSS and default design tokens. Import the stylesheet once,
usually in your app entry.

```ts
import 'solid-formation/styles.css';
```

That file includes layout, focus behavior, the floating label implementation, and default `--sf-*`
tokens, so forms render as finished UI without a separate theme.

## Theme files

Bundled themes are optional. Import any theme files you plan to activate.

```ts
import 'solid-formation/styles.css';
import 'solid-formation/themes/midnight.css';
```

Then scope the theme with a `data-sf-theme` attribute or matching class.

```tsx
<div data-sf-theme='midnight'>
  <Form onSubmit={submit}>{/* fields */}</Form>
</div>
```
