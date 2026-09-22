export type FieldName = string;

// File inputs expose a FileList, not a string; it's in this union so FileField
// can use the shared parse/format pipeline without pretending a file
// selection is text.
export type DisplayValue = string | number | string[] | FileList | undefined;
export type FieldValue = unknown;

// Recursion depth cap for dotted/array field paths (e.g. `items.0.title`).
// Deeper than any real form model needs (a row array nested inside another
// row array — `sections.0.items.1.title` — is depth 4), with headroom, while
// staying bounded so a self-referential or very wide M can't make `tsc`
// recurse indefinitely.
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

// Hand-rolled, not type-fest's `Paths`/`Get`: both were tried first and both
// broke real inference here, verified against `tsc` — not a hypothetical:
//
// - `Paths<M>` (at any `maxRecursionDepth`) falls back to `object`/`never`
//   instead of a real name/value when `N` is inferred through a second layer
//   of generics — exactly `createFields<M>()` and `createScopedFields<Item>()`,
//   this library's own pattern for binding M once. `createFields.fixture.tsx`'s
//   `@ts-expect-error` cases (bogus name, self-`match`) stopped erroring: the
//   bogus cases silently compiled.
// - `Get<M, P>` breaks schema-inferred value typing the same way:
//   `standardSchema.fixture.tsx`'s check that `getFieldValue` returns the
//   schema's *input* type stopped erroring on the wrong-type case.
//
// A plain recursive conditional type avoids both — verified the same way, by
// watching those `@ts-expect-error` lines go back to erring on the bad case.
//
// Known gap: no notion of a "leaf" class instance. `Date`/`RegExp`/`FileList`
// still satisfy `extends object`, so a nested instance-method name
// (`birthDate.getTime`) type-checks as a valid `FieldPath<M>` but silently
// resolves to `undefined` at runtime — `getValueAtFieldPath` only finds *own*
// enumerable properties. Not fixed here: type-fest's own `BuiltIns` exclusion
// is exactly the kind of extra branch that broke inference above, so excluding
// these safely needs the same fixture-driven verification.
type FieldPathImpl<T, Depth extends number> = Depth extends 0
  ? never
  : T extends readonly (infer Item)[]
    ? NonNullable<Item> extends object
      ? `${number}` | `${number}.${FieldPathImpl<NonNullable<Item>, Prev<Depth>>}`
      : `${number}`
    : T extends object
      ? {
          // NonNullable, not a bare `T[K] extends object` check: an optional
          // nested property (`customer?: {...}`) has `undefined` in `T[K]`,
          // which fails `extends object` and would silently drop every path
          // under it — even though the property nests normally at runtime
          // once it's set.
          [K in keyof T & string]: NonNullable<T[K]> extends object
            ? K | `${K}.${FieldPathImpl<NonNullable<T[K]>, Prev<Depth>>}`
            : K;
        }[keyof T & string]
      : never;

// The `string extends keyof M` branch is load-bearing, not an optimization.
// For the default `M extends object = FieldValueMapping` (a string-indexed
// record) — every default-`M`, untyped-forms call site — `FieldPathImpl`
// alone resolves to `never`: `keyof` a string-indexed type is all of
// `string`, not the finite set of literal keys the mapped type above needs
// to iterate, which would silently reject every field name. Short-circuiting
// to plain `string` here keeps every name valid for that case instead.
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
  /**
   * Bumps whenever `resetField`, `reset`, or `setValues` overwrites this
   * field — never on the field's own input/commit flow. Capture it as a
   * baseline to tell a stale write from a current one, e.g. to discard an
   * async validation result superseded by a later reset.
   */
  // Store-scoped: see `nextGeneration` in FormState.ts.
  generation: number;
  /**
   * True when the write that last bumped `generation` was `resetField`/
   * `reset` rather than `setValues`. Meaningful only alongside a `generation`
   * change in the same update.
   */
  // createFormField reads this to decide whether to auto-revalidate: a reset
  // cleared errors without checking constraints, so it needs a follow-up
  // pass; setValues preserves existing errors, so it must not trigger one.
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
 * The store's real backing shape: `BaseFormState` plus bookkeeping shared by
 * `BaseForm` and `SubmitButton` that consumers have no reason to read.
 * Deliberately not re-exported from the `solid4m` facade, so it stays
 * reachable in the workspace and invisible in the published surface.
 *
 * `processingSubmitter` names which submit button started the in-flight
 * submit, or is `undefined` when no button did — a caller-declared
 * `<Form isProcessing>`, or a programmatic submit. `isProcessing` is
 * form-wide, but a spinner is a claim about one action: a multi-button form
 * ("Sign up" / "Save draft") would otherwise spin both at once, claiming two
 * actions were running when only one was. `aria-disabled` still applies to
 * every submit button, since unavailability really is form-wide — only the
 * running-right-now affordance is scoped by this.
 *
 * An opaque string stamped by `SubmitButton`, **not** the submitter element,
 * even though the submit event hands one to us directly. A DOM node here
 * would be a live object Solid mutates in place (`aria-disabled`, the
 * spinner child) inside a store that proxies only plain objects and arrays,
 * so none of that would be tracked. It would also be this DOM-free package's
 * first DOM type, and a node that cannot exist under SSR. A string is inert,
 * survives hydration, and cannot go stale.
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
   * Removes the field at `name`. If `expectedGeneration` is given and the
   * field now at `name` has a different generation, this is a no-op instead:
   * the caller's original field was renamed away (e.g. by `remapFieldNames`,
   * as `useFieldArray` does on remove/insert/move) and a different field's
   * data has since moved into this name. Without this guard, a disposing
   * component's unmount cleanup — which always targets its last-rendered
   * name — could delete that unrelated field instead of correctly no-op'ing.
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
   * `submitter` records which button started this submit; see
   * `InternalFormState.processingSubmitter` for why. Omit it when no button
   * did — a caller-declared `<Form isProcessing>`, or a programmatic submit —
   * so every submit button shows the in-flight state. Ignored when
   * `isProcessing` is false, which clears the recorded button.
   */
  setIsProcessing: (isProcessing: boolean, submitter?: string) => void;
  /**
   * The `<Form isLoading>` / `<Form isProcessing>` channel. Kept separate from
   * `setIsLoading`/`setIsProcessing`, which have different owners: the submit
   * handler drives `isProcessing` around every submit, and a prop writing the
   * same slot would be a second writer whose value silently sticks or gets
   * clobbered depending on which fired last. Each channel owns its own
   * source; the published flag is their OR.
   *
   * OR, not override: a caller passing `false` must never un-busy a submit
   * the form is actually running, since `isProcessing` also guards the
   * submit handler against a concurrent second submit.
   */
  setIsLoadingFromProps: (isLoading: boolean) => void;
  setIsProcessingFromProps: (isProcessing: boolean) => void;
};
