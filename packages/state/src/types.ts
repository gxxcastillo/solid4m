import { type StringKeyOf } from 'type-fest';

export type FieldName = string;

// File inputs expose a FileList rather than a string. It belongs in the DOM
// display-value union so a FileField can use the shared parse/format pipeline
// without pretending a file selection is text.
export type DisplayValue = string | number | string[] | FileList | undefined;
export type FieldValue = unknown;
export type FieldValueFor<M extends object, N extends StringKeyOf<M>> = N extends keyof M ? M[N] : FieldValue;

export type ErrorMessage = string;
export type ErrorMessages = ErrorMessage[] | [];

export type FormField<M extends object, N extends StringKeyOf<M>> = {
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

export type FormFields<M extends object> = FormField<M, StringKeyOf<M>>[];

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
  isFieldValid: <N extends StringKeyOf<M>>(n: N) => boolean | undefined;
  getField: <N extends StringKeyOf<M>>(n: N) => FormField<M, N> | undefined;
  getFieldValue: <N extends StringKeyOf<M>>(n: N) => FieldValueFor<M, N> | undefined;
  getFieldErrors: <N extends StringKeyOf<M>>(n: N) => ErrorMessages | undefined;
  hasFieldBeenInitialized: <N extends StringKeyOf<M>>(n: N) => boolean;
  hasFieldBeenValid: <N extends StringKeyOf<M>>(n: N) => boolean | undefined;
  hasFieldChanged: <N extends StringKeyOf<M>>(n: N) => boolean | undefined;
  hasFieldBlurred: <N extends StringKeyOf<M>>(n: N) => boolean | undefined;
};

export type FormStateMutations<M extends object = FieldValueMapping> = {
  /** Returns the field's resulting generation, so callers can capture a staleness baseline without a second lookup. */
  initializeField: <N extends StringKeyOf<M>>(
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
  removeField: <N extends StringKeyOf<M>>(name: N, expectedGeneration?: number) => void;
  /** Returns the field's resulting generation, so callers can capture a staleness baseline without a second lookup. */
  setFieldValue: <N extends StringKeyOf<M>>(
    name: N,
    value?: FieldValueFor<M, N>,
    errors?: ErrorMessages
  ) => number;
  setFieldErrors: <N extends StringKeyOf<M>>(name: N, errors?: ErrorMessages) => void;
  /**
   * Bulk-sets errors per field name in one pass, same as calling
   * `setFieldErrors` for each key — fields with no entry in the map are
   * cleared to `[]`. Keys for fields that are not currently registered are ignored.
   */
  setFieldsErrors: (errorsByField: ReadonlyMap<string, ErrorMessages>) => void;
  setChangedField: <N extends StringKeyOf<M>>(name: N) => void;
  setBlurredField: <N extends StringKeyOf<M>>(name: N) => void;
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
  resetField: <N extends StringKeyOf<M>>(name: N) => void;
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
