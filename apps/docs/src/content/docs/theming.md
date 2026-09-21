---
title: Theming
description: Customize solid4m with CSS custom properties and bundled themes.
---

Every skinnable value is a CSS custom property namespaced with `--sf-`: colors, spacing, radii,
borders, fonts, shadows, and transitions. Structural CSS reads tokens instead of hard-coding visual
values.

```css
.input {
  border: var(--sf-border-width) solid var(--sf-color-border);
  border-radius: var(--sf-radius-control);
  background: var(--sf-color-surface);
  color: var(--sf-color-text);
}
```

A theme is a stylesheet that redeclares those variables under a scope. Because component class names
are CSS-module generated, you should theme with tokens instead of targeting internal selectors.

## Bundled themes

Three themes ship with the package:

| Theme          | Use case                                                   |
| -------------- | ---------------------------------------------------------- |
| `minimal`      | Clean light UI with restrained borders and a blue accent   |
| `midnight`     | Dark UI with slate surfaces and a sky-blue accent          |
| `neobrutalist` | Bold, high-contrast UI with thick borders and hard shadows |

Import one or more themes and activate the one you want.

```ts
import 'solid4m/styles.css';
import 'solid4m/themes/midnight.css';
import 'solid4m/themes/minimal.css';
import 'solid4m/themes/neobrutalist.css';
```

```tsx
<div data-sf-theme='minimal'>
  <Form onSubmit={submit}>{/* fields */}</Form>
</div>
```

Use the attribute on `html` or `body` to theme the whole app, or on a wrapper to theme one region.

## Runtime switching

Because activation is a single attribute, runtime switching is just state.

```tsx
import { createSignal } from 'solid-js';

const [theme, setTheme] = createSignal('minimal');

<div data-sf-theme={theme()}>
  <Form onSubmit={submit}>{/* fields */}</Form>
  <button type='button' onClick={() => setTheme('midnight')}>
    Dark
  </button>
</div>;
```

## Custom theme

Set as many or as few tokens as you need. Omitted values fall back to the defaults.

```css
:root {
  --sf-color-primary: #e11d48;
  --sf-color-primary-hover: #be123c;
  --sf-color-border-focus: #e11d48;
  --sf-color-focus-ring: rgb(225 29 72 / 0.3);
  --sf-radius-control: 999px;
  --sf-font-family: 'Inter', system-ui, sans-serif;
}
```

If you only want tokens for surrounding UI, import `solid4m/themes/base.css` instead of the
full structural stylesheet.

## Token reference

All defaults live in `themes/base.css`.

| Group              | Tokens                                                                                                                                                                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surfaces and text  | `--sf-color-canvas`, `--sf-color-surface`, `--sf-color-surface-disabled`, `--sf-color-text`, `--sf-color-text-muted`, `--sf-color-label`, `--sf-color-placeholder`                                                                                                                                       |
| Borders and focus  | `--sf-color-border`, `--sf-color-border-hover`, `--sf-color-border-focus`, `--sf-color-focus-ring`                                                                                                                                                                                                       |
| Primary action     | `--sf-color-primary`, `--sf-color-primary-hover`, `--sf-color-primary-active`, `--sf-color-on-primary`                                                                                                                                                                                                   |
| Secondary action   | `--sf-color-secondary`, `--sf-color-secondary-hover`, `--sf-color-secondary-border`, `--sf-color-on-secondary`                                                                                                                                                                                           |
| Feedback and icons | `--sf-color-danger`, `--sf-color-icon`, `--sf-color-icon-muted`                                                                                                                                                                                                                                          |
| Typography         | `--sf-font-family`, `--sf-font-family-mono`, `--sf-font-size`, `--sf-font-size-title`, `--sf-font-size-error`, `--sf-font-weight`, `--sf-font-weight-label`, `--sf-font-weight-button`, `--sf-letter-spacing`, `--sf-letter-spacing-password`, `--sf-text-transform-label`, `--sf-text-transform-button` |
| Sizing and spacing | `--sf-control-height`, `--sf-control-padding-x`, `--sf-textarea-padding-y`, `--sf-textarea-min-height`, `--sf-field-gap`, `--sf-label-inset-x`, `--sf-checkbox-size`                                                                                                                                     |
| Borders and radii  | `--sf-border-width`, `--sf-radius-control`, `--sf-radius-button`, `--sf-radius-checkbox`                                                                                                                                                                                                                 |
| Effects            | `--sf-focus-ring-width`, `--sf-shadow-control`, `--sf-shadow-button`, `--sf-transition-duration`, `--sf-transition-easing`                                                                                                                                                                               |

`--sf-shadow-control` and `--sf-shadow-button` are composed into focus rings, so custom values must be
valid `box-shadow` values. Use `0 0 #0000` for no shadow.

## Stable class hook

For rare cases where a token is not enough, the rendered `<form>` carries a stable `sf-form` class.
Prefer tokens first; they are the most stable customization surface.
