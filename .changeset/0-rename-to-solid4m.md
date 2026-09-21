---
'solid4m': minor
---

**`@gxxc/solid-forms` is now `solid4m`.** This is the first release under the
new name. `0.2.0` and earlier were published as `@gxxc/solid-forms`, which
receives no further releases.

**Migrating from `@gxxc/solid-forms` 0.2.** Replace the package:

```sh
npm uninstall @gxxc/solid-forms
npm install solid4m
```

Then swap the import prefix. The stylesheet and theme subpaths keep their
names:

```ts
// Before
import { Form, InputField } from '@gxxc/solid-forms';
import '@gxxc/solid-forms/styles.css';
import '@gxxc/solid-forms/themes/midnight.css';

// After
import { Form, InputField } from 'solid4m';
import 'solid4m/styles.css';
import 'solid4m/themes/midnight.css';
```

CSS class names, `--sf-*` tokens, and `data-sf-theme` keep their `sf-` prefix,
so custom themes need no renaming.

Beyond the rename, these changes can affect an existing form. Each is described
in full in its own entry below.

- **`SubmitButton` is no longer disabled while the form is invalid.** Pressing
  it reveals every field's errors and moves focus to the first invalid field.
  Pass `isDisabled` if you need the button disabled for a reason of your own.
- **Forms set `noValidate`**, so the browser's native validation bubbles no
  longer appear. The library now checks `required`, `minLength`/`maxLength`,
  `pattern`, `min`/`max`, `step`, and `type='email'`/`type='url'` formats
  itself — but only on its own field components. A raw `<input required>`
  placed inside `<Form>` is no longer validated by anything.
- **The in-flight state is `aria-disabled`, not `disabled`.** A custom theme
  that styles the busy button with `:disabled` must also match
  `[aria-disabled='true']`.
- **`isDisabled={false}` now behaves exactly like an absent prop**, so that
  button gets the in-flight spinner and `aria-disabled` during a submit.
- **`<Form isProcessing>` and `<Form isLoading>` now take effect.** Both add to
  the form's own state rather than overriding it: `isProcessing={false}` cannot
  end a real submit early. A form cannot submit while `isLoading` is true.
- **`minLength`/`maxLength` no longer fail an empty value.** Emptiness is
  `required`'s concern, as it already was for `pattern` and `min`/`max`.
- **New DOM inside every form:** an always-present `.sf-form-errors` region
  (`aria-live="assertive"`), a screen-reader-only `.sf-form-status` region, and
  a `data-sf-submitter` attribute on each `SubmitButton`. `InputField` no
  longer renders an empty context container when it has no `context` prop.
  Snapshot tests and selectors that depend on a form's exact children may need
  updating.
- **`deepEqual` is no longer exported.**
- **New export conditions.** `node`, `worker`, and `deno` resolve a
  server-rendering entry, and `browser` and `import` a hydratable client entry,
  which is what makes forms server-render.
- **Field names are typed as full paths.** A nested name like `items.0.title`
  type-checks without a cast. Where TypeScript previously inferred a field's
  form type from its `name` alone, it may now need the type argument spelled
  out (`<InputField<MyValues>>`), or use `createFields<MyValues>()`.
