import { batch } from 'solid-js';

import {
  buildObjectFromFieldEntries,
  type FormFields,
  type FormState,
  type FormStateMutations,
  isObjectLike,
  setOwnEnumerableProperty
} from '@gxxc/solid-forms-state';
import { validateWithSchema } from '@gxxc/solid-forms-validation';

import {
  type BaseFormElementSubmitEvent,
  type BaseFormOnSubmit,
  type OnSubmitHandler,
  type OnSubmitHandlers,
  type RequestProps,
  type SubmitResponse,
  type SubmitResponseMapping
} from '../types';
import { type BaseFormPropsWithSubmit } from './BaseForm';
import { applySchemaValidationFailure } from './schema';

export function isSubmitHandlerFn<P extends RequestProps, R extends SubmitResponse>(
  onSubmit: unknown
): onSubmit is OnSubmitHandler<P, R> {
  return typeof onSubmit === 'function';
}

export function isSubmitHandlersObject<P extends RequestProps, R extends SubmitResponse | SubmitResponseMapping<P>>(
  onSubmit: BaseFormOnSubmit<P, R>
): onSubmit is R extends SubmitResponseMapping<P> ? OnSubmitHandlers<P, R> : never {
  return isObjectLike(onSubmit);
}

export function fieldsToProps<M extends object>(formFields: FormFields<M>) {
  return buildObjectFromFieldEntries(formFields.map((field) => [field.name, field.value])) as M;
}

// Captured separately from fieldsToProps so the staleness check can compare
// exactly the same value snapshot even if fieldsToProps changes shape later.
export function fieldsToValueSnapshot<M extends object>(formFields: FormFields<M>) {
  return formFields.reduce<Record<string, unknown>>((obj, field) => {
    setOwnEnumerableProperty(obj, field.name, field.value);
    return obj;
  }, {});
}

// Captured alongside fieldsToProps, at the same moment, so
// haveFieldValuesChangedSinceSnapshot can detect a resetField/reset/setValues
// call that bumps a field's generation without changing its value (e.g.
// resetting a field back to a value it already held) — a value-only
// comparison would miss that case even though the field's errors/hasBeenValid
// were rewritten out from under the in-flight validation.
export function fieldsToGenerationSnapshot<M extends object>(formFields: FormFields<M>) {
  return formFields.reduce<Record<string, number>>((obj, field) => {
    setOwnEnumerableProperty(obj, field.name, field.generation);
    return obj;
  }, {});
}

// Only compares fields the snapshot actually captured: a field mounting or
// unmounting between the snapshot and this check doesn't make the snapshot
// stale, since onSubmit/schema validation only ever sees the values captured
// at snapshot time, not a live re-read of the form's current fields.
export function haveFieldValuesChangedSinceSnapshot<M extends object>(
  formFields: FormFields<M>,
  snapshot: Readonly<Record<string, unknown>>,
  generationSnapshot: Readonly<Record<string, number>>
) {
  return formFields.some(
    (field) =>
      Object.hasOwn(snapshot, field.name) &&
      (snapshot[field.name] !== field.value || generationSnapshot[field.name] !== field.generation)
  );
}

export function resolveSubmitHandler<P extends RequestProps, R extends SubmitResponse | SubmitResponseMapping<P>>(
  onSubmit: BaseFormOnSubmit<P, R> | undefined,
  buttonName: string | undefined
): OnSubmitHandler<P, R> | undefined {
  if (isSubmitHandlerFn<P, R>(onSubmit)) return onSubmit;
  if (!onSubmit || !isSubmitHandlersObject<P, R>(onSubmit)) return undefined;

  const handlers = onSubmit as unknown as Record<string, OnSubmitHandler<P, R>>;
  const matched = buttonName ? handlers[buttonName] : undefined;
  if (matched) return matched;

  // No usable submitter name, or one that matches nothing. If the map has a
  // single handler it is unambiguous, so use it rather than silently doing
  // nothing; with multiple handlers we can't guess.
  //
  // (The old comment here offered "submitted via the Enter key" as the example
  // of a nameless submitter. That is wrong, and worth not repeating: Chromium
  // populates `event.submitter` for implicit submission too, attributing it to
  // the first submit button. The real nameless cases are buttons rendered
  // without a `name` and forms with no submit button at all.)
  const handlerList = Object.values(handlers);
  if (handlerList.length === 1) return handlerList[0];

  // Returning undefined here means the submit does nothing whatsoever: no
  // handler runs, no error is set, no field changes, and the button looks like
  // it worked. That silence is exactly the failure mode this library exists to
  // avoid elsewhere, so say something at the one point where it is detectable.
  //
  // Not gated behind a DEV flag: this codebase has no env-detection convention
  // to follow, and the condition is always a misconfiguration — a correctly
  // wired form never reaches it, so there is nothing to suppress in production.
  const available = Object.keys(handlers)
    .map((key) => `"${key}"`)
    .join(', ');
  console.warn(
    buttonName
      ? `[solid-forms] Submit did nothing: onSubmit has no handler named "${buttonName}". Available handlers: ${available}.`
      : `[solid-forms] Submit did nothing: onSubmit is a map of handlers (${available}) but the button that submitted the form has no \`name\`, so none of them could be selected. Give each SubmitButton a \`name\` matching one of those keys.`
  );

  return undefined;
}

export function getSubmitErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Reported when async schema validation finishes against a value snapshot the
// form has since moved past. Phrased as an instruction rather than a diagnosis
// because the only thing the user can do about it — and the only thing they need
// to know — is that the submit did not happen and pressing it again will work.
// Hardcoded English, consistent with every other message this library emits
// (see constraintConfigs.ts); it moves behind a prop when i18n arrives.
export const STALE_SUBMIT_MESSAGE = 'The form changed while it was being submitted. Please submit again.';

// Scoped to the submitted form rather than document.getElementById, because a
// field's id is its name and two forms on the same page routinely register the
// same name (the docs demo page renders four). Keyed on `el.id` instead of a
// selector lookup per field, which avoids escaping entirely — a field array's
// name contains dots (`items.0.title`), which are selector syntax — and walks
// the form's controls once rather than once per errored field.
function indexFieldElementsById(formElement: Element) {
  const byId = new Map<string, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>();
  const candidates = formElement.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    'input, select, textarea'
  );

  for (const candidate of candidates) {
    // First match wins, matching the old top-down scan: a duplicate id is
    // invalid HTML, but if one shows up the earlier (DOM-order) control is the
    // one the user would reach first.
    if (candidate.id && !byId.has(candidate.id)) byId.set(candidate.id, candidate);
  }

  return byId;
}

/**
 * Moves focus to the first field carrying an error after a failed submit, so
 * the user lands on the thing they have to fix instead of having to hunt for
 * it. Fields are walked in registration order, which is mount order and
 * therefore DOM order for any ordinary form.
 *
 * Disabled and missing elements are skipped rather than aborting the walk: a
 * disabled field cannot take focus, so stopping there would leave focus
 * wherever it was with no indication anything happened.
 */
export function focusFirstInvalidField<M extends object>(
  formElement: Element | null | undefined,
  formFields: FormFields<M>
) {
  if (!formElement) return;

  const elementsById = indexFieldElementsById(formElement);

  for (const field of formFields) {
    if (!field.errors?.length) continue;

    const element = elementsById.get(field.name);
    if (!element || element.disabled) continue;

    element.focus();
    // `disabled` is only the *detectable* reason focus can't land. focus() is
    // also a silent no-op on a field that is present but not rendered — inside a
    // collapsed accordion step, a `display: none` branch, or `type='hidden'` —
    // and it reports nothing back. Comparing activeElement is the only check
    // that works without measuring layout (which happy-dom can't do anyway), and
    // it lets the walk fall through to the next offender instead of stopping on
    // a field that never took focus and leaving the user on the submit button.
    if (element.ownerDocument.activeElement === element) return;
  }
}

export function createBaseFormOnSubmitHandler<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
>(
  props: BaseFormPropsWithSubmit<FieldValues, SubmitValues, R>,
  formState: FormState<FieldValues>,
  formStateMutations: FormStateMutations<FieldValues>
) {
  return async (event: BaseFormElementSubmitEvent) => {
    event.preventDefault();
    const submitter = event.submitter as HTMLButtonElement | HTMLInputElement | null;
    const buttonName = submitter?.name ?? '';
    // Recorded so SubmitButton can scope its spinner to the one button actually
    // running. Read off the token SubmitButton stamps rather than off `name`,
    // which cannot identify a button — `name` is optional, a form may hold
    // several unnamed submit buttons that all report `''`, and it is already
    // public API here (it selects the handler from an object-style `onSubmit`
    // map and reaches the consumer as `buttonName`). Not the element either,
    // even though we are holding it: see `InternalFormState`. Verified in
    // Chromium that `event.submitter` is populated for a click *and* for
    // Enter-key implicit submission, which the browser attributes to the first
    // submit button.
    const submitterId = submitter?.dataset?.sfSubmitter;
    // Captured synchronously: `currentTarget` is only valid during dispatch, and
    // the schema-failure path below needs the form element after an `await`.
    const formElement = event.currentTarget as Element | null;

    if (formState.isProcessing) {
      return;
    }

    if (!formState.isFormValid) {
      // Nothing may have been touched yet (e.g. a pristine required field), so
      // an invalid submit attempt must mark every field blurred to make its
      // errors visible instead of silently doing nothing. Focus then moves to
      // the first offender so the reveal is actionable rather than just visible
      // — SubmitButton stays enabled for an invalid form precisely so this path
      // is reachable.
      formStateMutations.setBlurredFields();
      focusFirstInvalidField(formElement, formState.fields);
      return;
    }

    const onSubmitFn = resolveSubmitHandler<SubmitValues, R>(props.onSubmit, buttonName);

    // resolveSubmitHandler also returns undefined for an ambiguous/unmatched
    // named handler (props.onSubmit is set but ambiguous) rather than for no
    // onSubmit at all. Only the latter should still validate via schema, since
    // the former will never invoke a handler regardless of validation outcome.
    if (!onSubmitFn && (props.onSubmit !== undefined || !props.schema)) return;

    const submitProps = fieldsToProps(formState.fields) as FieldValues;
    const submitValueSnapshot = fieldsToValueSnapshot(formState.fields);
    const submitGenerations = fieldsToGenerationSnapshot(formState.fields);

    // Set the processing flag before invoking schema validation or the submit
    // handler so a rapid second submit cannot slip past the guard while async
    // work is still awaited.
    formStateMutations.setIsProcessing(true, submitterId);
    formStateMutations.setErrors([]);
    try {
      // A thrown/rejected validate() call is a genuine error (network failure,
      // schema bug), not stale data, so it always propagates to the outer catch
      // below rather than being discarded when field values have since changed.
      const schemaResult = props.schema
        ? await validateWithSchema<FieldValues, SubmitValues>(props.schema, submitProps, formState.fields)
        : ({
            valid: true,
            value: submitProps as unknown as SubmitValues
          } as const);

      if (
        props.schema &&
        (haveFieldValuesChangedSinceSnapshot(formState.fields, submitValueSnapshot, submitGenerations) ||
          // A field's value and generation can stay exactly as snapshotted while
          // its *errors* change underneath the await: an async per-field
          // validator (createFormField's commit()) writes errors through
          // setFieldErrors without bumping generation when the value it
          // resolved against hasn't changed. That leaves the two checks above
          // blind to a field that flipped from valid to invalid during
          // validateWithSchema's own await window. formState.isFormValid was
          // last checked before that await (further up this function); checking
          // it again here is what actually catches that case.
          !formState.isFormValid)
      ) {
        // Discarding the result is correct — it was validated against values the
        // form no longer holds — but returning bare made it invisible: the
        // `finally` below clears isProcessing, so the button un-dims and nothing
        // else happens. The user watched their submit evaporate with no error,
        // no handler call, and no indication that pressing submit again is what
        // they need to do. Say so instead.
        formStateMutations.setErrors([STALE_SUBMIT_MESSAGE]);
        return;
      }

      if (!schemaResult.valid) {
        batch(() => {
          applySchemaValidationFailure(formState.fields, formStateMutations, schemaResult);
          formStateMutations.setBlurredFields();
        });
        // Read after the batch commits, so the walk sees the errors the schema
        // failure just attributed rather than the pre-submit state.
        focusFirstInvalidField(formElement, formState.fields);
        return;
      }

      if (!onSubmitFn) return;

      const result = onSubmitFn(schemaResult.value, buttonName);
      if (result?.then) {
        await result;
      }
    } catch (error) {
      formStateMutations.setErrors([getSubmitErrorMessage(error)]);
    } finally {
      // Always clear the processing flag, even when the handler throws/rejects.
      formStateMutations.setIsProcessing(false);
    }
  };
}
