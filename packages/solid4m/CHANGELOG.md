# solid4m

## 0.2.0

### Minor Changes

- 460044a: Add bulk field-state mutations:

  - `setFieldsErrors(errorsByField)`
  - `setBlurredFields()`

  `reset`, `setValues`, and schema-validation failures now use these bulk paths internally, so large forms update field errors/touched state in one pass instead of one store scan per field. The mutations are public for custom field integrations that need the same bulk-write behavior.

- a51522d: Close production-readiness gaps across submit handling, buttons, tests, and CI.

  **Submit pipeline**

  - Invalid submits are blocked and mark every field blurred, making errors visible immediately.
  - Thrown or rejected `onSubmit` errors are captured in `form.state.errors`. Each new submit clears previous form-level errors first.

  **`SubmitButton` (breaking)**

  - `SubmitButton` now renders a real `<button>`, so children render as normal DOM content. An empty `<SubmitButton />` still falls back to `submit`.
  - The old `type` variant prop is renamed to `variant` to avoid colliding with the native button `type` attribute. Update `<SubmitButton type="approve">` to `<SubmitButton variant="approve">`.

  **Fixes**

  - Removed a leftover debug `console.log` from `InputField`.

  **Quality gates**

  - Added coverage for elements, field components, form submit flows, and state helpers.
  - Added `no-console` linting and CI coverage enforcement.

- 909fbde: Export field-composition types from the public package, including `FormFieldProps`, `CustomValidator`, `ParseFunction`, and `FormatFunction`.

  These types are needed for custom field components and now resolve from the documented import path:

  ```ts
  import type { FormFieldProps } from '@gxxc/solid-forms';
  ```

- 06b57ef: Export the state types behind `useForm().state` and `useForm().store`, including `FormState`, `FormField`, `FormFields`, `FormStateMutations`, `FormStore`, `FieldValue`, and related error/name types.

  Consumers can now name these types directly, for example:

  ```ts
  import type { FormState } from '@gxxc/solid-forms';
  ```

- 460044a: Add field-array support for repeating form sections such as line items and address lists.

  `FieldArray` is the high-level row API. Its children receive row-scoped field components, so each row can use local field names while still registering under the correct runtime path (`items.0.title`, `items.1.title`, etc.).

  ```tsx
  function LineItemFields() {
    let itemsArray!: FieldArrayHelpers<{ title: string }>;

    return (
      <>
        <FieldArray<{ title: string }>
          name='items'
          defaultValue={[{ title: '' }]}
          helpersRef={(helpers) => (itemsArray = helpers)}
        >
          {(fields, item, remove) => (
            <>
              <fields.InputField name='title' label='Title' defaultValue={item.title} required />
              <button type='button' onClick={remove}>
                Remove
              </button>
            </>
          )}
        </FieldArray>
        <button type='button' onClick={() => itemsArray.append({ title: '' })}>
          Add line item
        </button>
      </>
    );
  }
  ```

  `createScopedFields` is also exported for lower-level composition. It currently provides scoped `InputField` and `PasswordField` components, rewriting row-local `name` and `match` props to the current row path. Custom validators, `showLabel`, and `showIcon` receive a row-local `FormState<Item>`, so sibling reads like `formState.getFieldValue('password')` resolve inside the same row.

  `useFieldArray` remains available when callers want to own the row markup and field naming directly:

  ```tsx
  function LineItemFields() {
    const [items, arr] = useFieldArray<{ title: string }>('items', [{ title: '' }]);

    return (
      <For each={items()}>
        {(item, index) => (
          <div>
            <InputField
              name={`items.${index()}.title`}
              label='Title'
              defaultValue={item.defaultValue.title}
            />
            <button type='button' onClick={() => arr.remove(index())}>
              Remove
            </button>
          </div>
        )}
      </For>
    );
  }
  ```

  `FieldArray` and `useFieldArray` must be rendered or called from a component inside `<Form>` or `<FormContextProvider>`, like any field.

  Removing, inserting, or moving items re-addresses affected fields without remounting their row components. A row's live value, focus, cursor position, touched state, and errors carry over under the new index.

  Supporting changes:

  - `FormStateMutations` gained `remapFieldNames`, which renames or removes registered fields in one pass.
  - `createFormField` now reads `props.name` live when writing values, so shifted rows keep writing to their current path.
  - `removeField` now accepts an expected-generation guard so a removed row's cleanup cannot delete a different field that has moved into the same name.
  - `FormContextProvider` now forwards `props.children` directly, fixing a re-invocation bug that affected dynamic children such as shrinking field arrays.

  Deep-path TypeScript inference for arbitrary nested form paths is still tracked separately. The runtime supports dotted paths today, and `FieldArray` avoids the common row-field typing friction by typing child fields against the row item.

- 460044a: `reset(toValues)` and `setValues(values)` now understand dotted and array-index field names. For example, `mutations.setValues({ items: [{ title: 'x' }] })` sets a field registered as `items.0.title`. If the source object also contains an exact literal key, the exact key still wins.

  Submitted values now nest dotted and array-index field names into real objects and arrays too. A field named `items.0.title` submits as `{ items: [{ title }] }`, matching nested schemas, instead of `{ 'items.0.title': ... }`.

  Unsafe path segments such as `__proto__`, `constructor`, and `prototype` are never descended into, preventing prototype-pollution behavior in submitted values or nested writes.

  Flat field names are unaffected. Full TypeScript deep-path inference is still tracked separately.

- 92c6867: Add `resetField`, `reset`, and `setValues` mutations for reverting or bulk-updating form state.

  - `resetField(name)` reverts one field to its initial value and clears its errors.
  - `reset(toValues?)` reverts every registered field to its initial value and clears form-level errors. Passing `toValues` also rebaselines those fields for future resets.
  - `setValues(values)` bulk-sets current values for already-registered fields without changing their reset baseline.

  All three are available through the existing mutation API:

  ```ts
  const [, mutations] = useForm().store;
  mutations.reset();
  ```

  Keys for unregistered fields are ignored. Resetting or bulk-setting a field while an async custom validator is in flight now discards the stale validator result. Mounted fields revalidate after `reset`/`resetField`, so `isFormValid` reflects the reverted values instead of just the cleared errors.

- 42b2123: Add Standard Schema validation support to `Form` and `useForm`.

  Pass `schema` to `<Form schema={schema}>` or `useForm({ schema })` to validate submitted values with any Standard Schema-compatible library.

  - Field-path issues are mapped back to registered fields.
  - Pathless or unregistered issues surface as form-level errors.
  - Successful schema output is passed to `onSubmit`.
  - Schema-backed forms infer field state from schema input and submit values from schema output, so transform/coercion schemas stay correctly typed.

  Plain form value interfaces no longer need index signatures just to satisfy the library.

- bb4d8ca: Add a CSS-custom-property theming system and ship three themes.

  **Theming**

  - Skinnable values now use `--sf-*` design tokens for color, spacing, radius, borders, fonts, shadows, and transitions.
  - Defaults live in `themes/base.css` and are bundled into `styles.css`, so forms still look finished with no explicit theme.
  - Themes are plain stylesheets that redeclare tokens under a scope. Consumers can skin forms without targeting hashed internal CSS-module classes.
  - Ships three importable themes: `minimal`, `midnight`, and `neobrutalist`. Activate them with `data-sf-theme="<name>"` or `sf-theme-<name>` on any ancestor.

  **New package exports**

  - `@gxxc/solid-forms/styles.css` — structural CSS + default tokens (import once).
  - `@gxxc/solid-forms/themes/{base,minimal,midnight,neobrutalist}.css` — token layers and individual themes.

  **Component styling**

  - `SubmitButton` is themed, including primary and `approve` variants plus `isFullWidth`.
  - `BaseForm` owns vertical rhythm via `--sf-field-gap`, honors `align`, `fullWidthButtons`, and `className`, and exposes a stable `sf-form` class hook.
  - The native checkbox is themed with `accent-color`.

  **Fixes**

  - `InputField` class state is now reactive, so floating labels and leading-icon spacing update as values change.
  - Corrected the `InputField` root class name (`InputFieldSet` → `InputField`), which had left the container's `display: block` rule unapplied.

- 6e92b84: Add typed factories that bind a form's value type once instead of repeating it on every field:

  - `createFields<M>()` returns typed field components.
  - `createForm<M>()` returns a typed `Form` plus typed field components.

  ```tsx
  const { Form, InputField, PasswordField } = createForm<SignupValues>();

  <Form onSubmit={(values) => ...}>
    <InputField name='email' label='Email' required />
    <PasswordField name='password' label='Password' required minLength={8} />
  </Form>;
  ```

  `createForm` also accepts a Standard Schema instead of a type argument. It infers field state from the schema input type and submit values from the schema output type, and the schema becomes the bound `Form`'s default.

  Also:

  - Fixed `match` typing so a bound field cannot match itself or a non-existent sibling field.
  - Exported `FormContextProvider` and `FormContextProviderProps` from the facade for shared-store composition.
  - Exported `SubmitResponse` and `SubmitResponseMapping` for typed submit-handler maps.
  - Removed unused field-composition types from the public type surface.

- 909fbde: Fields now unregister from form state when they unmount instead of leaving stale entries behind.

  Conditionally rendered fields, wizard steps, and accordion sections no longer keep counting toward `isFormValid`, `haveValuesChanged`, or submitted values after they leave the DOM. Re-mounted fields start fresh, matching fields that have never mounted before.

  Adds a `removeField` mutation to `FormStateMutations`.

- 7b14a95: The `errors` prop on `Form`/`BaseForm` now renders alongside `form.state.errors`.

  The prop is typed as `ErrorMessages` (`string[]`), matching the documented `errors={['Server error']}` usage. The unused `FormErrors` type was removed.

### Patch Changes

- 06b57ef: Fix two `InputField` floating-label (`showLabel`) bugs:

  - The label overlapped the input's top border once the field had a value, in themes with a thicker `--sf-border-width` (e.g. `neobrutalist`'s 3px). The label's lift was a fixed rem offset that didn't account for border thickness, so it cleared a 1px border but overlapped a 3px one. The offset now compensates for `--sf-border-width`, keeping consistent clearance across themes.
  - The extra top padding meant to make room for the floated label was applied whenever `showLabel` was on, even while the field was still empty and showing its plain placeholder (no floated label yet) — pushing that placeholder text down off-center for no reason. The padding is now scoped to only apply once the label has actually floated up (i.e. the field has a value).

- d739245: Fix a dev-server-only build error in some Vite/Solid pipelines:

  ```txt
  Transform failed: Identifier 'Form' has already been declared
  ```

  `Form` keeps the same public call signatures, but its implementation no longer relies on repeated same-named TypeScript overload declarations. This makes HMR transforms that do not fully strip overload signatures before wrapping components behave correctly. Production builds were not affected.

- 06b57ef: Validation error messages now use a field's configured `label` instead of its raw `name`, so e.g. a `PasswordField` named `confirm` with `label="Confirm password"` reports `"Confirm password" is required` instead of `"confirm" is required`. The `match` constraint resolves the matched field's label the same way (`"Confirm password" does not match "Password"`). Fields without a `label` fall back to their `name`, unchanged from before.

## 0.1.1

### Patch Changes

- Fix publish pipeline: disable moon's syncProjectWorkspaceDependencies so internal workspace packages are never injected into runtime dependencies. Add publishConfig.exports so pnpm strips the development export condition from the tarball automatically. Add CI pack smoke test to catch regressions. Fix publish script to propagate the changeset exit code.

## 0.1.0

### Minor Changes

- Production-readiness overhaul: state fixes, submit pipeline, field accessibility, validation improvements, and CI.

  **State fixes**

  - `isFieldValid` now returns `undefined` for unregistered fields instead of `true`
  - `hasBeenValid` computation corrected; initial field errors preserved on first `initializeField`
  - `setFieldValue` preserves existing errors when called without an errors argument (prevents disabled-field server errors being silently cleared)
  - Spurious reactive updates eliminated via shallow array equality on errors

  **Submit pipeline**

  - Double-submit window closed: `isProcessing` is set before the handler is invoked
  - `isProcessing` is always reset via `finally`, even on async handler failure
  - Submit guard fixed: `isProcessing || !haveValuesChanged` now evaluated correctly

  **Field components**

  - Checkbox values are now booleans (`true`/`false`) rather than strings (`'true'`/`'false'`)
  - `CheckboxField` now registers with form state, validates, and participates in changed-state tracking
  - Reactive field props (`value`, `disabled`, `errors`, `checked`, `isInitialized`) exposed through getters instead of mount-time snapshots
  - `createField` no longer mutates JSX element props; component names stored in a shared `WeakMap` registry

  **Accessibility**

  - `InputField`, `TextAreaField`, and `CheckboxField` now render `aria-invalid`, `aria-describedby`, and a `role="alert"` error element when validation errors are displayable

  **Validation**

  - Falsey constraints (`required={false}`, `pattern={undefined}`) are now correctly skipped
  - `pattern` accepts `RegExp` directly; string patterns are compiled once and cached
  - `match` constraint handles uninitialized target fields gracefully
  - Custom `validator` prop is now wired up in `createFormField`; async validators are protected against stale results via a sequencing token

  **Packaging**

  - Internal workspace packages are bundled into `dist/index.js` and stripped from published `dependencies`

  **Developer experience**

  - Full test suite: 90 unit, integration, and component tests across all packages
  - Coverage thresholds enforced per package
  - GitHub Actions CI runs types → lint → test → build on every push and PR
  - Complete API reference and usage docs in `packages/solid-forms/README.md`

## 0.0.11

### Patch Changes

- 05d16fd: Fixes inter-monorepo dependencies
- Fix exports?

## 0.0.10

### Patch Changes

- 05d16fd: Fixes inter-monorepo dependencies

## 0.0.9

### Patch Changes

- Fix types?

## 0.0.8

### Patch Changes

- Fixes some bugs

## 0.0.7

### Patch Changes

- Fix exported types

## 0.0.6

### Patch Changes

- Fix exported types

## 0.0.5

### Patch Changes

- general fixes

## 0.0.4

### Patch Changes

- Adds TS typings

## 0.0.3

### Patch Changes

- fix internal dependencies

## 0.0.2

### Patch Changes

- Update tsconfig settings
- Updated dependencies
  - @gxxc/solid-forms-fields@0.0.1
  - @gxxc/solid-forms-form@0.0.1

## 0.0.1

### Patch Changes

- Generally, most things are working
