# solid4m

## 0.3.0

### Minor Changes

- 1ddca6d: **`@gxxc/solid-forms` is now `solid4m`.** This is the first release under the
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

- d782cbb: Field names are now typed all the way down. `name='items.0.title'` (a dotted
  object path, an array index, or both together) now type-checks against the
  form's real value type and infers the value type at that path — no cast
  needed, whether the field is used directly (`<InputField<M, N>>`), through
  `createFields<M>()`/`createForm<M>()`, or against a schema-inferred form. A
  misspelled nested name is now a compile error instead of silently accepting
  any string.

  This applies wherever a field name was previously typed `StringKeyOf<M>`: the
  raw field components, `createFields`/`createForm`'s bound components,
  `FormState`'s getters, and the store's mutations. Two new exported types
  support it directly — `FieldPath<M>`, the union of every valid dotted/array
  path on `M`, and `FieldPathValue<M, P>`, the value type at a given path — for
  a custom component that wants the same checking.

  Nesting is capped at 6 levels deep, comfortably past anything a real form
  needs; a path beyond that falls out of `FieldPath<M>` rather than failing to
  compile.

- 7e739e0: Make `<Form isProcessing>` and `<Form isLoading>` actually do something.

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
  processing when you say so _or_ when it is running a submit itself, so
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

- e93c2f5: Remove the `deepEqual` export.

  It was a leftover internal helper with no callers anywhere in the library, no
  tests, and no documentation — it reached the public `solid4m` facade
  only because of a wildcard re-export, never as an intended part of the API. If
  you were importing it, inline a deep-equality check of your own instead.

- 0d27acf: Remove internal field helpers from the public exports: `parse`, `format`,
  `formFieldDefaultProps`, `createValueSetter`, `createOnInput`, `createOnBlur`,
  `isSelectableEvent`, `getDisplayableErrors`, `useFormFieldLabel`, and the
  `UseFormFieldLabelProps` type.

  They are the machinery behind `createFormField` and `TextAreaField`, and they
  reached the `solid4m` facade only through wildcard re-exports. None was
  documented or intended as API. A custom field needs only `createFormField`,
  which still returns everything these helpers produced: `setValue`, `onInput`,
  `onBlur`, the displayable `errors`, and the default `parse`/`format` already
  applied. If you imported one directly, use `createFormField` instead, or inline
  the few lines you need.

- 755fb58: Add five fields to the palette: `SelectField`, `RadioGroup`, `NumberField`,
  `DateField`, and `FileField`. Each is a themed, form-state-aware wrapper around a
  native control, with a label, validation errors, and disabled/loading
  integration, and each is available from `createForm()` and `createFields()`.

  - `SelectField` wraps a native `<select>`. With `multiple`, it stores the
    selected values as a string array.
  - `RadioGroup` renders a native fieldset of radios from an `options` array and
    stores the chosen option as one value, rather than one boolean per option.
  - `NumberField` is an `InputField` locked to `type='number'`. It stores the
    input's value as a string, without coercing it, so clearing an optional field
    doesn't turn it into `0`. Pass your own `parse` to store numbers, choosing how an empty
    field should be represented.
  - `DateField` is an `InputField` locked to `type='date'`. Values stay in the
    browser's `yyyy-mm-dd` format, the same format `min`, `max`, and `step` use.
    You can use `parse` and `format` to work with `Date` objects instead, but
    `min`, `max`, and `step` are then not checked, since they compare the
    stored string; keep the string, or check bounds in a custom `validator`.
  - `FileField` stores the selected `FileList`. Clearing the selection stores
    `undefined`, so `required` rejects it, and `reset()` or `resetField()` clears
    the native control. Browsers don't allow setting a file input's value, so the
    field takes no `value`, `parse`, or `format` props.

  Date, month, week, time, and datetime-local fields now enforce string `min` and
  `max` bounds in their native DOM formats, such as `min='09:00'` and
  `max='17:00'`. Bounds are compared using each input type's HTML value algorithm,
  while numeric bounds retain their existing behavior.

- c687974: Forms now server-render; SolidStart is supported.

  **`0.2.0` could not SSR.** The published bundle only externalized the bare
  `solid-js` specifier, so `solid-js/web` and `solid-js/store` were inlined into
  `dist/index.js` along with a client-only DOM runtime that assumes `document`
  exists. Any server render — `renderToString` under Node, a SolidStart page
  that isn't wrapped in `clientOnly` — crashed with `document is not defined`.

  The package now ships two entries instead of one: a Node/SSR entry
  (`dist/server/index.js`, `generate: 'ssr'`, hydratable) resolved through the
  package's `node`/`worker`/`deno` export conditions, and a browser entry
  (`dist/index.js`) that is now itself hydratable, so client-side markup matches
  what the server rendered instead of assuming there was no server render to
  match. `solid-js`/`solid-js/web`/`solid-js/store` are all externalized.

  Not included: a `solid` export condition shipping preserved (uncompiled) JSX,
  which is how SolidStart-ecosystem libraries typically let the consumer's own
  build choose dom/ssr/hydratable output. It needs Vite's SSR module graph to
  parse Rollup's still-new native `jsx: 'preserve'` output, which the pinned
  Vite version here can't do yet — tracked as follow-up, not required for SSR to
  work today.

- 627d3a2: Add a `step` constraint, closing the rest of the `noValidate` gap.

  `step` renders as a real HTML attribute — it drives the spinner arrows and the
  native picker — but since forms started setting `noValidate`, nothing validated
  it. `<InputField type='number' min={0} step={5} />` accepted 7, where the browser
  had reported a `stepMismatch`. It is now checked, alongside the `type='email'`
  and `type='url'` format checks added for the same reason.

  `step` is counted in the units the HTML specification defines per input type,
  which are not always the units the field displays: one step is `1` on a `number`,
  one **day** on a `date`, one **month** on a `month`, one **week** on a `week`,
  and one **second** on `time` and `datetime-local`. So half-hourly reminders are
  `<InputField type='time' step={1800} />`. `min` is the step base, which is why
  `min={1} step={5}` allows 1, 6, 11 rather than multiples of 5. `step='any'`
  renders the attribute with the check off.

  Rather than trusting a reading of the spec, the implementation is diffed against
  a recording of Chromium's own `validity.stepMismatch` across 161 cases — every
  supported type, decimal steps, `min`-shifted bases, invalid and unparseable
  values, and the awkward corners (`step={0}` and a negative step both fall back to
  the type's default step, per spec; ISO week numbering means `2020-W53` exists and
  `2026-W53` does not). The recording is committed as a test fixture, so the
  comparison keeps running without a browser, and the script that produced it is in
  `apps/a11y/scripts/`.

  Three behaviors are deliberately not the browser's, each because matching it
  would cost more than it gives:

  - **An absent `step` is not checked.** A bare `<input type='number'>` has a
    default step of 1, so a browser rejects `19.99` in a price field that never
    opted in. Reproducing that would invalidate decimal number fields in every
    existing form at once, to enforce the most complained-about wart of
    `type='number'`. Writing `step` is the opt-in.
  - **`range` is not checked.** A range input's value sanitization snaps to the
    nearest step rather than leaving a mismatch, so `validity.stepMismatch` is
    unreachable on one — confirmed in the recording, where 7 against `step={5}`
    reads back as 5. An error there would be one the slider cannot show and the
    user cannot reach.
  - **The step base comes from `min` only.** The spec falls back to the `value`
    content attribute when `min` is absent, which re-anchors the ladder on whatever
    the field was initialized with — the same constraint then accepts different
    values depending on where it started. Anchor with `min`, which is explicit.

  Unparseable values are skipped rather than failed, matching the browser, whose
  value sanitization discards them before validity is consulted — so a half-typed
  date does not report a step error on every keystroke. Empty values remain
  `required`'s concern, as with every other constraint.

  `ConstraintConfig.validate` and `.message` now receive the field's other
  constraints as a fourth argument, since `step` cannot be decided from its own
  value alone (it needs `type` for its units and `min` for its base). Custom
  constraint configs are unaffected — the parameter is additive and optional to
  use.

- 627d3a2: Make an invalid form submittable, and make the failure explain itself.

  `SubmitButton` no longer disables itself when the form is invalid — it now marks
  itself unavailable only while a submit is in flight. Submitting an invalid form reveals
  every field's errors and moves focus to the first invalid field, instead of
  leaving the user with a dead button and no explanation. This follows current
  form-accessibility guidance (GOV.UK Design System, NN/g): a disabled button
  leaves the tab order entirely, so assistive-technology users may never discover
  it exists, and it gives no way to find out what is missing. Pass `isDisabled`
  when the action really is unavailable; that prop still renders a real `disabled`
  attribute, and a hard-disabled button gets no in-flight treatment layered on top.
  `isDisabled` is read as a value rather than as a presence, so the idiomatic
  `isDisabled={!termsAccepted()}` behaves exactly like an absent prop while it
  reads `false` — spinner and `aria-disabled` included.

  The in-flight state is now `aria-disabled` rather than `disabled`, for the same
  tab-order reason applied to the moment it actually bites: the user who pressed
  the button is focused on it, and disabling a focused element removes it from the
  tab order, so the browser resets focus to `<body>` and nothing restores it when
  the submit settles — a keyboard or screen-reader user is silently returned to the
  top of the document mid-submit. `aria-disabled` conveys the same unavailability
  while keeping focus and tab position. Because it is advisory rather than
  enforced, `SubmitButton` blocks the activation itself, which also covers
  `variant='approve'` — its `type='button'` never reaches the form's own re-entry
  guard. Styling keys off `[aria-disabled='true']` alongside `:disabled`, so a
  custom theme that targets `:disabled` for the in-flight look needs updating.

  Three fixes were required to make that path actually work, each a bug in its own
  right that the disabled button had been hiding:

  - **Forms now set `noValidate`.** Constraint props (`required`, `minLength`,
    `pattern`, …) render as real HTML attributes, so the browser's own interactive
    validation was intercepting the click and showing a native bubble — the submit
    event never fired, and none of this library's validation, error gating, or
    focus management ran. The attributes remain on the elements, so `required`
    still maps to `aria-required` for assistive technology.
  - **`minLength`/`maxLength` no longer fail empty values.** An optional
    `maxLength` field reported "is too long" while untouched, which made a pristine
    form invalid on load and silently blocked submission with nothing rendered to
    explain it. Emptiness is now `required`'s concern, matching how `pattern` and
    `min`/`max` already behaved.
  - **`minLength`/`maxLength` no longer fail non-string values.** A field with a
    custom `parse` (to a number, or to an array for a multi-select) could never
    satisfy either bound. Numbers are measured by their digits and arrays by their
    item count.

  **`SubmitButton` shows a spinner while a submit is in flight.** Dimming alone
  read as "disabled", not "working". The spinner is positioned inside the button's
  existing inline padding rather than added as a flex child, so the button neither
  changes size nor re-centers its label mid-submit — no layout shift under the
  cursor of a user who is waiting. It is `aria-hidden` (the live region below does
  the announcing, and a spinner in the accessible name would break
  `getByRole('button', { name })` during a submit), inherits `currentColor` so
  custom themes and the `approve` variant get a matching spinner for free, and
  collapses to a static dot under `prefers-reduced-motion`.

  The spinner is scoped to the button that was actually pressed. `isProcessing` is
  form-level, so a form with several submit buttons ("Sign up" / "Save draft") spun
  all of them at once, claiming several actions were running when one was. Only the
  spinner is scoped: every submit button keeps `aria-disabled`, because a second
  submit genuinely is unavailable while the first is in flight. When no button
  initiated the work — a caller-declared `<Form isProcessing>`, or a programmatic
  submit — every submit button shows the spinner, since there is no single action
  to attribute it to.

  Each `SubmitButton` carries a `data-sf-submitter` token so the form can tell
  which one was pressed. It is deliberately not keyed on `name`: `name` already
  selects the handler from an object-style `onSubmit` map and is handed to your
  handler as `buttonName`, so a generated value would leak into your code — and it
  cannot identify a button anyway, since it is optional and several unnamed submit
  buttons all report `''`.

  **A submit discarded for stale values now says so.** With a `schema`, editing a
  field while async validation is in flight causes the result to be discarded — it
  describes values the form no longer holds. That was correct but silent: the
  button un-dimmed and nothing else happened, so the submit appeared to simply not
  work. `form.state.errors` now reports _The form changed while it was being
  submitted. Please submit again._

  **An in-flight submit is now announced.** Keeping focus on the submit button
  fixes a loss but adds no signal: the dimmed button is visual only, so a screen
  reader user pressed submit and heard nothing at all until it settled. The form
  now renders a screen-reader-only polite live region carrying `Submitting…` while
  a submit is pending. Reword it with the new `processingLabel` prop on `Form`
  (`processingLabel='Signing in…'`) when that is not the action, or pass `''` to
  stay silent. It is polite rather than assertive so it waits its turn instead of
  interrupting — errors remain assertive — and it is deliberately not `aria-busy`
  on the form, which would tell assistive tech to withhold live-region updates and
  suppress the very announcements this adds.

  Form-level errors are now rendered into an always-present
  `aria-live="assertive"` region so they are announced when they appear, and
  `InputField` no longer renders an empty context container when no `context` prop
  is supplied. Because that region is a permanent flex child of the form, its empty
  state cancels the one `--sf-field-gap` the form's `gap` would otherwise reserve
  for it, so an errorless form keeps its previous spacing.

  The focus walk skips any invalid field that cannot actually take focus, not just
  `disabled` ones — a field inside a collapsed section or a `display: none` branch
  accepts `focus()` and silently ignores it, which would have stranded the user on
  the submit button.

  **`type='email'` and `type='url'` are now format-checked by this library**, which
  keeps `noValidate` from costing anything. Those checks previously came from the
  browser, derived from the input type alone, and `noValidate` turned them off
  along with the interactive validation it was added to suppress — leaving a
  malformed address to submit clean with no error anywhere. They are back with no
  API change: the `type` attribute you already write is what drives them, so
  `<InputField type='email' required />` validates format again exactly as before.

  Both implement the HTML specification rather than an approximation, and were
  verified case-by-case against Chromium's own `validity.typeMismatch`, so they
  accept and reject precisely what a browser does — including `a@b` (valid; the
  spec has no TLD requirement) and `example.com` (not a valid `type='url'` value,
  which requires an absolute URL). Messages are `"Email" must be a valid email
address` and `"Website" must be a valid URL`. As with every other constraint, an
  empty value is left to `required`.

  `type='number'` deliberately gets no such check: a number input's value
  sanitization already reads non-numeric text back as `''` before this library sees
  it, so `noValidate` never affected it and `required` covers the empty result. A
  `multiple` email input's comma-separated list is not supported — use a custom
  `validator`.

  **An unresolvable submit now says so.** A form whose `onSubmit` is a map of
  several handlers, submitted by a button with no `name` (or a name matching none
  of the keys), previously did nothing at all — no handler, no error, no visible
  change, from a button that looked like it worked. It now logs a console warning
  naming the available handlers and how to select one. Unchanged otherwise: a
  single-handler map still resolves without a name.

### Patch Changes

- dcb3a7a: Fix `pattern`, `type`, and `step` constraints coercing a non-string,
  non-number field value (an array, an object, a `File`) to a string before
  testing it, which could silently stringify to `"[object Object]"` and test a
  meaningless value against the pattern/format/step instead of skipping it.
  These constraints now skip a field value they cannot meaningfully express as
  text or a number, consistent with how `minLength`/`maxLength` already treat
  an unmeasurable value.
- c2a4edc: Prevent forms from submitting while `isLoading` is true. Submit buttons now receive
  the same unavailable treatment as an in-flight submit, and the submit handler also
  refuses native or programmatic submits while data is loading. The form announces
  `Loading…` in its status region by default; customize it with the new `loadingLabel`
  prop or pass an empty string to keep that announcement silent.
- 7d5dff4: Fix `PasswordField` throwing `TypeError: Cannot set property type of #<Object>
which has only a getter` when a `type` prop was passed reactively. It forced
  `type='password'` by assigning to its own props object, which Solid makes
  read-only for any reactive prop. It now merges the type in instead, the same way
  `DateField` and `NumberField` do.

  `PasswordFieldProps` no longer accepts `type`, which a password field always
  overrode anyway, matching `DateFieldProps` and `NumberFieldProps`.

- 1c20c85: The published type declarations now pass a strict consumer check. With
  `skipLibCheck` off — the default in fresh SolidStart templates, among others —
  `tsc` reported errors inside this package's `index.d.ts` (TS2304 and TS2536)
  even when your own code was correct; `0.2.0` failed the same check.

  The cause was `createFormField`'s inferred return type, which TypeScript
  expanded into thousands of lines of nested conditional types from solid-js's
  `mergeProps`. It now has an explicit return type, and the props it returns
  are exported as `BoundFormFieldProps` for custom field components that want to
  name them. The bundled `index.d.ts` shrinks from about 420 KB to about 31 KB,
  which also makes editors and `tsc` faster in projects that use this package.

- 382b224: No consumer-facing change. Bumped the build toolchain's TypeScript from 5.4.2
  to 6.0.3 (not 7, to stay within typescript-eslint's `<6.1.0` peer range).
  Fixed one internal type-only cast in `SubmitButton` that TypeScript 6's
  stricter `as`-cast overlap check now flags — a compile-time-only change with
  no runtime or published-type-signature effect.
- 127a40e: `useForm<M>()` now accepts an `async` submit handler. The hook fixed the
  handler's response type to `M` by default, so the ordinary

  ```tsx
  const form = useForm<ProfileValues>();
  <form.Form onSubmit={async (values) => { await save(values); }}>
  ```

  failed to compile — a `Promise<void>` is not a `Promise<ProfileValues>` —
  unless you wrote `useForm<ProfileValues, void>()`. The default now accepts any
  response, and an explicit second type argument still works.

- 6876681: No consumer-facing behavior change, but the built output's CSS filename
  changed internally. Moved the build toolchain to Vite 8, Vitest 5, and
  vite-plugin-dts 5 (from Vite 5, Vitest 2, and vite-plugin-dts 3), fixing
  `pnpm audit`'s remaining critical/high advisories.

  Vite 8's library-mode CSS output now follows the JS entry's `fileName`
  (`dist/index.css`) instead of the previous fixed `dist/style.css`. The
  `./styles.css` subpath export now points at the real file, so
  `import 'solid4m/styles.css'` keeps working exactly as before —
  caught by `verify-tarball/`'s real npm-install check before this ever
  reached a release.

## 0.2.0

Published as `@gxxc/solid-forms`, as were all earlier versions below.

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
