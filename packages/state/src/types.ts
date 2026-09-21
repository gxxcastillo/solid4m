export type FieldName = string;

// File inputs expose a FileList rather than a string. It belongs in the DOM
// display-value union so a FileField can use the shared parse/format pipeline
// without pretending a file selection is text.
export type DisplayValue = string | number | string[] | FileList | undefined;
export type FieldValue = unknown;

// Recursion depth cap for dotted/array field paths (e.g. `items.0.title`).
// Deeper than any real form model needs (a top-level array of row objects
// with a nested array inside a row — `sections.0.items.1.title` — is depth
// 4), with headroom, while staying bounded so a self-referential or very
// wide M can't make `tsc` recurse indefinitely.
type FieldPathDepth = 6;
type Prev<D extends number> = D extends 6
  ? 5
  : D extends 5
    ? 4
    : D extends 4
      ? 3
      : D extends 3
        ? 2
        : D extends 2
          ? 1
          : D extends 1
            ? 0
            : never;

// Hand-rolled, not type-fest's `Paths`/`Get`: both were tried first (already
// a devDependency, already proven to bundle into the published `.d.ts` via
// `StringKeyOf`) and both broke real inference in this codebase, verified
// directly against `tsc` — not a hypothetical:
//
// - `Paths<M>` (at *any* `maxRecursionDepth`, including 0) makes TS fall
//   back to `object`/`never` instead of a real name/value when `N` is
//   inferred through a second layer of generics — exactly `createFields<M>()`
//   and `createScopedFields<Item>()`, this library's own documented pattern
//   for binding M once. `packages/examples/src/createFields.fixture.tsx`'s
//   `@ts-expect-error` cases (bogus name, self-`match`) stopped erroring:
//   the bogus cases silently compiled.
// - `Get<M, P>` similarly breaks schema-inferred value typing:
//   `standardSchema.fixture.tsx`'s check that `form.state.getFieldValue`
//   returns the schema's *input* type (not its output type) stopped
//   erroring on the wrong-type case.
//
// A plain recursive conditional type (no options object, no bracket-notation
// branch, no separate depth/leavesOnly machinery) does not hit either
// failure — verified the same way, by watching those two fixtures'
// `@ts-expect-error` lines go back to actually erring on the bad case.
//
// Known gap: this has no notion of a "leaf" class instance. A field typed as
// `Date`/`RegExp`/`FileList`/etc. still satisfies `extends object`, so its
// own instance methods (`birthDate.getTime`, `avatar.item`, ...) type-check
// as valid `FieldPath<M>` values even though `getValueAtFieldPath` only ever
// finds *own* enumerable properties and reports them as not found — a
// method-shaped nested name compiles but silently resolves to `undefined` at
// runtime instead of failing to compile. Excluding those types was not
// attempted here: type-fest's own `BuiltIns` exclusion is exactly the kind of
// extra branch that broke inference above, so doing this safely needs the
// same fixture-driven verification before landing it.
type FieldPathImpl<T, Depth extends number> = Depth extends 0
  ? never
  : T extends readonly (infer Item)[]
    ? NonNullable<Item> extends object
      ? `${number}` | `${number}.${FieldPathImpl<NonNullable<Item>, Prev<Depth>>}`
      : `${number}`
    : T extends object
      ? {
          // NonNullable, not a bare `T[K] extends object` check: an optional
          // nested property (`customer?: {...}`) has a `T[K]` that includes
          // `undefined`, which fails `extends object` outright and would
          // otherwise silently drop every path under it (falling back to just
          // `K`) even though the property is present and nested at runtime
          // whenever it's actually set.
          [K in keyof T & string]: NonNullable<T[K]> extends object
            ? K | `${K}.${FieldPathImpl<NonNullable<T[K]>, Prev<Depth>>}`
            : K;
        }[keyof T & string]
      : never;

// The `string extends keyof M` branch is load-bearing, not an optimization:
// for `M extends object = FieldValueMapping` (`Record<string, FieldValue |
// undefined>`) — every default-`M` call site in this codebase, i.e. the
// untyped/dynamic-forms path — `FieldPathImpl` alone resolves to `never`
// (`keyof` a string-indexed type is the whole `string` type, not a finite
// set of literal keys for the mapped type above to iterate), which would
// silently reject every field name. Short-circuiting to plain `string` here
// reproduces exactly what `StringKeyOf<Record<string, X>>` gave before this
// type existed.
export type FieldPath<M extends object> = string extends keyof M ? string : FieldPathImpl<M, FieldPathDepth>;

type FieldPathValueImpl<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? FieldPathValueImpl<T[Head], Rest>
    : T extends readonly (infer Item)[]
      ? Head extends `${number}`
        ? FieldPathValueImpl<Item, Rest>
        : FieldValue
      : FieldValue
  : P extends keyof T
    ? T[P]
    : T extends readonly (infer Item)[]
      ? P extends `${number}`
        ? Item
        : FieldValue
      : FieldValue;

export type FieldPathValue<M extends object, P extends FieldPath<M>> = FieldPathValueImpl<M, P>;
export type FieldValueFor<M extends object, N extends FieldPath<M>> = FieldPathValue<M, N>;

export type ErrorMessage = string;
export type ErrorMessages = ErrorMessage[] | [];

export type FormField<M extends object, N extends FieldPath<M>> = {
  name: N;
  value: FieldValueFor<M, N> | undefined;
  initialValue: FieldValueFor<M, N> | undefined;
  errors: ErrorMessages;
  label?: string;
  hasBeenInitialized: boolean;
  hasBeenBlurred: boolean;
  hasChanged: boolean;
  hasBeenValid: boolean;
  // Drawn from a store-scoped sequence (not a per-field counter) and bumped by
  // resetField/reset/setValues (never by the field's own input/commit flow).
  // Lets a pending async custom validator tell "a newer commit of mine
  // superseded this call" (validationToken, in createFormField) apart from "an
  // external overwrite superseded this call" (this counter), so a slow
  // validator can't clobber a field that was reset out from under it. Must stay
  // store-scoped: a field that unmounts and re-registers under the same name
  // would otherwise restart at the same value a stale write already captured.
  generation: number;
  // Set alongside `generation` by whichever mutation just bumped it: `true` for
  // resetField/reset, `false` for setValues. Only meaningful in the same tick
  // as a `generation` change — createFormField reads it there to decide
  // whether to auto-revalidate (resetField/reset cleared errors without
  // checking constraints, so they need a follow-up validation pass; setValues
  // intentionally preserves existing errors, so it must not trigger one).
  wasReset: boolean;
};

export type FormFields<M extends object> = FormField<M, FieldPath<M>>[];

export type FieldValueMapping = Record<string, FieldValue | undefined>;

export type FormStore<M extends object = FieldValueMapping> = readonly [FormState<M>, FormStateMutations<M>];

export type BaseFormState<M extends object = FieldValueMapping> = {
  fields: FormFields<M>;
  errors: ErrorMessages;
  isReady: boolean;
  /**
   * True while work such as loading initial values means registered fields
   * should not accept input. Blocks submitting, the same as `isProcessing`,
   * since forwarding partially loaded values is never a useful outcome —
   * but unlike `isProcessing`, it is not itself submission work in flight.
   */
  isLoading: boolean;
  /**
   * True while the form has submission work in flight, whether it runs that
   * work itself or a caller declares equivalent work. Drives the in-flight UI
   * and guards against concurrent submissions. Unlike `isLoading`, it does not
   * disable registered fields.
   */
  isProcessing: boolean;
};

export type FormState<M extends object = FieldValueMapping> = BaseFormState<M> & FormStateGetters<M>;

/**
 * The store's real backing shape: `BaseFormState` plus the bookkeeping that
 * `BaseForm` and `SubmitButton` share but consumers have no reason to read.
 * Deliberately not re-exported from the `solid4m` facade, so it is
 * reachable inside the workspace and invisible in the published surface.
 *
 * `processingSubmitter` identifies which submit button started the in-flight
 * submit, or `undefined` when no button did — a caller-declared
 * `<Form isProcessing>`, or a programmatic submit. It exists because
 * `isProcessing` is form-level while a spinner is a claim about one action: a
 * multi-button form ("Sign up" / "Save draft") spun both buttons at once,
 * asserting two things were running when one was. Unavailability really is
 * form-wide, so `aria-disabled` still applies to every submit button — only the
 * running-right-now affordance is scoped by this.
 *
 * An opaque string stamped by `SubmitButton`, **not** the submitter element,
 * even though the submit event hands us that element directly. A DOM node here
 * would be a live object that solid mutates in place — `aria-disabled` toggling,
 * the spinner child appearing and vanishing — inside a store that tracks none of
 * it, since only plain objects and arrays are proxied. It would also put the
 * first DOM type into this otherwise DOM-free package, and hold a node that
 * cannot exist under SSR. A string is inert, survives hydration, and cannot go
 * stale.
 */
export type InternalFormState<M extends object = FieldValueMapping> = BaseFormState<M> & {
  processingSubmitter?: string;
};

export type FormStateGetters<M extends object = FieldValueMapping> = {
  haveValuesChanged: boolean;
  isFormValid: boolean;
  isFieldValid: <N extends FieldPath<M>>(n: N) => boolean | undefined;
  getField: <N extends FieldPath<M>>(n: N) => FormField<M, N> | undefined;
  getFieldValue: <N extends FieldPath<M>>(n: N) => FieldValueFor<M, N> | undefined;
  getFieldErrors: <N extends FieldPath<M>>(n: N) => ErrorMessages | undefined;
  hasFieldBeenInitialized: <N extends FieldPath<M>>(n: N) => boolean;
  hasFieldBeenValid: <N extends FieldPath<M>>(n: N) => boolean | undefined;
  hasFieldChanged: <N extends FieldPath<M>>(n: N) => boolean | undefined;
  hasFieldBlurred: <N extends FieldPath<M>>(n: N) => boolean | undefined;
};

export type FormStateMutations<M extends object = FieldValueMapping> = {
  /** Returns the field's resulting generation, so callers can capture a staleness baseline without a second lookup. */
  initializeField: <N extends FieldPath<M>>(
    name: N,
    value?: FieldValueFor<M, N>,
    errors?: ErrorMessages,
    label?: string
  ) => number | undefined;
  /**
   * Removes the field at `name`. If `expectedGeneration` is passed and the
   * field currently at `name` has a *different* generation, this is a no-op
   * instead — the field this caller originally owned was renamed away (e.g.
   * by `remapFieldNames`, as `useFieldArray` does on remove/insert/move),
   * and a different field's data has since moved into this name. Without
   * this guard, a disposing component's own unmount cleanup (which always
   * targets whatever name it was last rendered with) could delete the
   * unrelated field that now lives there instead of correctly no-op'ing.
   */
  removeField: <N extends FieldPath<M>>(name: N, expectedGeneration?: number) => void;
  /** Returns the field's resulting generation, so callers can capture a staleness baseline without a second lookup. */
  setFieldValue: <N extends FieldPath<M>>(
    name: N,
    value?: FieldValueFor<M, N>,
    errors?: ErrorMessages
  ) => number;
  setFieldErrors: <N extends FieldPath<M>>(name: N, errors?: ErrorMessages) => void;
  /**
   * Bulk-sets errors per field name in one pass, same as calling
   * `setFieldErrors` for each key — fields with no entry in the map are
   * cleared to `[]`. Keys for fields that are not currently registered are ignored.
   */
  setFieldsErrors: (errorsByField: ReadonlyMap<string, ErrorMessages>) => void;
  setChangedField: <N extends FieldPath<M>>(name: N) => void;
  setBlurredField: <N extends FieldPath<M>>(name: N) => void;
  /** Marks every registered field as blurred in one pass, same as calling `setBlurredField` for each one. */
  setBlurredFields: () => void;
  /**
   * Renames or removes registered fields in one pass, per a caller-supplied
   * `remap` function evaluated against each field's current name: `null`
   * removes the field, the same name is a no-op, anything else renames it
   * in place (preserving its value/errors/history). Used by `useFieldArray`
   * to re-address a shifted item's fields (e.g. `items.1.title` ->
   * `items.0.title`) without losing the field's live state. Throws if
   * `remap` produces a duplicate name across two different fields.
   */
  remapFieldNames: (remap: (name: string) => string | null) => void;
  /** Reverts one field to its initial value and clears its errors. No-op for an unregistered field. */
  resetField: <N extends FieldPath<M>>(name: N) => void;
  /**
   * Reverts every registered field to its initial value and clears form-level
   * errors. Passing `toValues` rebaselines the given fields' initial value to
   * the supplied one instead (so a later no-arg `reset()`/`resetField()`
   * reverts to that new baseline) — the "load these values, then let the user
   * edit" case. Keys for fields that are not currently registered are ignored.
   */
  reset: (toValues?: Partial<M>) => void;
  /**
   * Bulk-sets current values for already-registered fields, same as calling
   * `setFieldValue` for each key — unlike `reset`, it does not touch each
   * field's initial-value baseline or clear its errors. Keys for fields that
   * are not currently registered are ignored.
   */
  setValues: (values: Partial<M>) => void;
  setErrors: (errors?: ErrorMessages) => void;
  setIsReady: (isReady: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  /**
   * `submitter` identifies the button that initiated this submit, recorded so
   * that a multi-button form can show its in-flight spinner on the one button
   * actually running rather than on all of them. Omit it when no button did — a
   * caller-declared `<Form isProcessing>`, or a programmatic submit — in which
   * case every submit button shows the in-flight state. Ignored entirely when
   * `isProcessing` is false, which clears the recorded button.
   */
  setIsProcessing: (isProcessing: boolean, submitter?: string) => void;
  /**
   * The `<Form isLoading>` / `<Form isProcessing>` channel. Kept separate from
   * `setIsLoading`/`setIsProcessing` because the two have different owners: the
   * submit handler drives `isProcessing` around every submit, and a prop that
   * wrote the same slot would be a second writer whose value silently sticks or
   * gets clobbered depending on which fired last. Each channel owns its own
   * source; the published flag is their OR.
   *
   * OR, not override: a caller passing `false` must never be able to un-busy a
   * submit the form is actually running, because `isProcessing` is also the
   * submit handler's re-entrancy guard and clearing it would admit a concurrent
   * second submit.
   */
  setIsLoadingFromProps: (isLoading: boolean) => void;
  setIsProcessingFromProps: (isProcessing: boolean) => void;
};
