import { batch, mergeProps } from 'solid-js';
import { createStore } from 'solid-js/store';

import { getValueAtFieldPath } from './fieldPaths';
import {
  type BaseFormState,
  type InternalFormState,
  type FieldPath,
  type FieldValueFor,
  type FieldValueMapping,
  type FormField,
  type FormStore
} from './types';

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export const initialFormState = {
  fields: [],
  errors: [],
  isLoading: false,
  isProcessing: false,
  isReady: false
};

// Builds a fresh backing object per call so two stores never share state:
// under SolidJS's SSR build, createStore mutates the object it's given in
// place, so reusing one `state` reference across calls would share reactive
// state. `fields` and `errors` are cloned too — a plain spread would still
// share them.
function cloneBackingState<M extends object>(state?: BaseFormState<M>): BaseFormState<M> {
  const source = state ?? initialFormState;
  return {
    ...source,
    fields: source.fields?.map((field) => ({ ...field })) ?? [],
    errors: source.errors ? [...source.errors] : []
  };
}

export function createFormState<M extends object = FieldValueMapping>(state?: BaseFormState<M>) {
  const [formState, setFormState] = createStore<InternalFormState<M>>(cloneBackingState(state));
  const getters = {
    get haveValuesChanged() {
      return !!formState.fields.some((f) => f.hasChanged);
    },
    get isFormValid() {
      return !formState.fields.some((f) => !!f.errors?.length);
    },
    getField<N extends FieldPath<M>>(name: N) {
      return formState.fields?.find((f): f is FormField<M, N> => f.name === name);
    },
    getFieldValue<N extends FieldPath<M>>(name: N) {
      return getters.getField(name)?.value;
    },
    getFieldErrors<N extends FieldPath<M>>(name: N) {
      return getters.getField<N>(name)?.errors;
    },
    hasFieldBeenInitialized<N extends FieldPath<M>>(name: N) {
      return !!getters.getField<N>(name);
    },
    hasFieldBeenValid<N extends FieldPath<M>>(name: N) {
      return getters.getField<N>(name)?.hasBeenValid;
    },
    hasFieldChanged<N extends FieldPath<M>>(name: N) {
      return getters.getField<N>(name)?.hasChanged;
    },
    hasFieldBlurred<N extends FieldPath<M>>(name: N) {
      return getters.getField<N>(name)?.hasBeenBlurred;
    },
    isFieldValid<N extends FieldPath<M>>(name: N) {
      const field = getters.getField<N>(name);
      if (!field) return undefined;
      return !field.errors?.length;
    }
  };

  return [formState, getters, setFormState] as const;
}

export function createFormStore<M extends object = FieldValueMapping>(
  state?: BaseFormState<M>
): FormStore<M> {
  const [formState, getters, setFormState] = createFormState<M>(state);

  type FName = FieldPath<M>;
  type FErrors = (typeof formState)['fields'][number]['errors'];

  // Store-scoped, not per-field: removeField deletes a field's record, and a
  // later re-registration under the same name must get a generation no
  // earlier write could have captured. Restarting at 0 per field would let a
  // stale async validator from the removed instance collide with the fresh
  // one — both would read generation 0 (see createFormField.ts's commit()).
  let nextGeneration = 0;

  const buildFreshField = <N extends FName>(
    name: N,
    value: FieldValueFor<M, N> | undefined,
    errors: FErrors,
    label?: string
  ): FormField<M, N> => ({
    name,
    value,
    initialValue: value,
    errors,
    label,
    hasBeenInitialized: true,
    hasChanged: false,
    hasBeenBlurred: false,
    hasBeenValid: value !== undefined && !errors.length,
    generation: nextGeneration++,
    wasReset: false
  });

  // Pure: computes a field's next value without touching the store, so a bulk
  // op (setValues) runs one `fields.map()` pass instead of one O(n) store scan
  // per field. Returns `field` itself when nothing changes, so Solid doesn't
  // notify readers of an untouched slot.
  const computeFieldValueUpdate = (
    field: FormField<M, FName>,
    value: FieldValueFor<M, FName> | undefined,
    errors: FErrors | undefined,
    bumpGeneration: boolean
  ): FormField<M, FName> => {
    const currentValue = field.value;
    const currentErrors = field.errors ?? [];
    const effectiveErrors = errors !== undefined ? errors : currentErrors;

    const prevHasBeenValid = field.hasBeenValid ?? false;
    const nextHasBeenValid = prevHasBeenValid || !effectiveErrors.length;

    // A revalidation pass after resetField/reset can recompute the same value
    // and (empty) errors the reset already set — a no-op by value/errors alone.
    // But the reset also forced hasBeenValid to false without knowing whether
    // the reverted value is valid, so that recomputed hasBeenValid must still
    // land even when nothing else changed.
    if (currentValue === value && arraysEqual(effectiveErrors, currentErrors) && nextHasBeenValid === prevHasBeenValid) {
      return field;
    }

    const prevHasChanged = field.hasChanged ?? false;

    return {
      ...field,
      value,
      errors: effectiveErrors,
      hasBeenValid: nextHasBeenValid,
      hasChanged: prevHasChanged || currentValue !== value,
      ...(bumpGeneration ? { generation: nextGeneration++, wasReset: false } : {})
    };
  };

  const applyFieldValue = (
    field: FormField<M, FName>,
    value: FieldValueFor<M, FName> | undefined,
    errors: FErrors | undefined,
    bumpGeneration: boolean
  ) => {
    const next = computeFieldValueUpdate(field, value, errors, bumpGeneration);
    if (next === field) return next;

    setFormState('fields', (f) => f.name === field.name, () => next);
    return next;
  };

  // Pure counterpart to applyFieldReset, for the same reason as computeFieldValueUpdate above.
  const computeFieldReset = (
    field: FormField<M, FName>,
    value: FieldValueFor<M, FName> | undefined,
    initialValue: FieldValueFor<M, FName> | undefined
  ): FormField<M, FName> => ({
    ...field,
    value,
    initialValue,
    errors: [],
    hasChanged: false,
    hasBeenBlurred: false,
    // Real validity is unknown here — errors are force-cleared without
    // checking constraints — so this can't reuse the `value !== undefined &&
    // !errors.length` pattern initializeField/setFieldValue use: that would
    // wrongly call a defined-but-invalid reverted value "has been valid".
    // Leave it false; the follow-up revalidation pass (createFormField's
    // wasReset-triggered effect) promotes it once real validation confirms
    // the value.
    hasBeenValid: false,
    generation: nextGeneration++,
    wasReset: true
  });

  const applyFieldReset = (
    name: FName,
    value: FieldValueFor<M, FName> | undefined,
    initialValue: FieldValueFor<M, FName> | undefined
  ) => {
    setFormState('fields', (f) => f.name === name, (field) => computeFieldReset(field, value, initialValue));
  };

  // Two independent sources for isLoading/isProcessing, each published as
  // their OR; see FormStateMutations.setIsLoadingFromProps for why they're
  // split.
  //
  // Plain closure variables, not signals: they're only read by `publish*` on
  // the way to a store write, so the store field is the single reactive
  // surface — there's nothing for a reader to subscribe to twice.
  //
  // Seeded from the caller's backing state, so `createFormStore({ isProcessing:
  // true })` survives the first publish instead of being recomputed to
  // `false`. Read off the argument, not `formState`, so seeding never
  // registers a store dependency if this ever runs inside a tracking scope.
  let ownIsLoading = state?.isLoading ?? initialFormState.isLoading;
  let ownIsProcessing = state?.isProcessing ?? initialFormState.isProcessing;
  let propsIsLoading = false;
  let propsIsProcessing = false;

  const publishIsLoading = () => setFormState('isLoading', ownIsLoading || propsIsLoading);
  const publishIsProcessing = () => setFormState('isProcessing', ownIsProcessing || propsIsProcessing);

  return [
    mergeProps(formState, getters),
    {
      initializeField: <N extends FieldPath<M>>(
        name: N,
        value?: FieldValueFor<M, N>,
        errors: FErrors = [],
        label?: string
      ) => {
        const existing = getters.getField(name);
        if (existing || !name) {
          return existing?.generation;
        }

        const field = buildFreshField(name, value, errors, label);
        setFormState('fields', (fields) => [...fields, field]);
        return field.generation;
      },

      // A re-mounting field re-initializes fresh, matching a never-before-seen
      // field (see initializeField's hasFieldBeenInitialized guard) — the
      // removed field's prior value is not preserved.
      removeField: <N extends FName>(name: N, expectedGeneration?: number) =>
        setFormState('fields', (fields) =>
          fields.filter(
            (f) => !(f.name === name && (expectedGeneration === undefined || f.generation === expectedGeneration))
          )
        ),

      setFieldValue: <N extends FName>(name: N, value?: FieldValueFor<M, N>, errors?: FErrors) => {
        // Resolve the field once: runs every keystroke, so one O(n) lookup beats
        // five separate `.find()` scans. The returned generation lets callers
        // (createFormField's commit()) skip a second lookup for their baseline.
        const field = getters.getField(name);

        if (!field) {
          const fresh = buildFreshField(name, value, errors ?? []);
          setFormState('fields', (fields) => [...(fields || []), fresh]);
          return fresh.generation;
        }

        return applyFieldValue(field, value, errors, false).generation;
      },
      setFieldErrors: <N extends FName>(name: N, errors?: FErrors) =>
        setFormState('fields', (f) => f.name === name, 'errors', errors ?? []),
      setFieldsErrors: (errorsByField: ReadonlyMap<string, FErrors>) =>
        setFormState('fields', (fields) =>
          fields.map((field) => {
            const errors = errorsByField.get(field.name) ?? [];
            return arraysEqual(field.errors ?? [], errors) ? field : { ...field, errors };
          })
        ),
      setChangedField: <N extends FName>(name: N) =>
        setFormState('fields', (f) => f.name === name, 'hasChanged', true),
      setBlurredField: <N extends FName>(name: N) =>
        setFormState('fields', (f) => f.name === name, 'hasBeenBlurred', true),
      setBlurredFields: () =>
        setFormState('fields', (fields) =>
          fields.map((field) => (field.hasBeenBlurred ? field : { ...field, hasBeenBlurred: true }))
        ),

      remapFieldNames: (remap: (name: string) => string | null) => {
        setFormState('fields', (fields) => {
          const next: typeof fields = [];
          const seenNames = new Set<string>();

          for (const field of fields) {
            const nextName = remap(field.name);
            if (nextName === null) continue;

            if (seenNames.has(nextName)) {
              throw new Error(
                `remapFieldNames: remap produced a duplicate field name "${nextName}" — this is a bug in the caller's remap function, not a normal user error.`
              );
            }
            seenNames.add(nextName);

            next.push(nextName === field.name ? field : { ...field, name: nextName as FName });
          }

          return next;
        });
      },

      resetField: <N extends FName>(name: N) => {
        const field = getters.getField(name);
        if (!field) return;

        applyFieldReset(name, field.initialValue, field.initialValue);
      },

      reset: (toValues?: Partial<M>) => {
        batch(() => {
          setFormState('errors', []);

          // A single fields.map() pass instead of one applyFieldReset (itself
          // an O(n) store scan) per field, which would make this O(n²).
          setFormState('fields', (fields) =>
            fields.map((field) => {
              const lookup = toValues ? getValueAtFieldPath(toValues, field.name) : { found: false, value: undefined };
              const value = (lookup.found ? lookup.value : field.initialValue) as FieldValueFor<M, FName>;
              const initialValue = lookup.found ? value : field.initialValue;

              return computeFieldReset(field, value, initialValue);
            })
          );
        });
      },

      setValues: (values: Partial<M>) => {
        // Single fields.map() pass for the same reason as reset() above.
        setFormState('fields', (fields) =>
          fields.map((field) => {
            const lookup = getValueAtFieldPath(values, field.name);
            if (!lookup.found) return field;

            return computeFieldValueUpdate(field, lookup.value as FieldValueFor<M, FName>, undefined, true);
          })
        );
      },

      setErrors: (errors: BaseFormState<M>['errors'] = []) => setFormState('errors', errors),
      setIsReady: (isReady: boolean) => setFormState('isReady', isReady),

      setIsLoading: (isLoading: boolean) => {
        ownIsLoading = isLoading;
        publishIsLoading();
      },
      setIsProcessing: (isProcessing: boolean, submitter?: string) => {
        ownIsProcessing = isProcessing;
        // Batched: `processingSubmitter` and `isProcessing` are two writes for
        // one transition, and consumers (SubmitButton's `isSubmitter`) read
        // both — unbatched, they'd recompute twice per submit start/stop.
        batch(() => {
          // Cleared on the way out rather than left stale: a later submit that no
          // button initiated would otherwise inherit the previous submitter and
          // spin a button that is not running anything.
          setFormState('processingSubmitter', isProcessing ? submitter : undefined);
          publishIsProcessing();
        });
      },

      setIsLoadingFromProps: (isLoading: boolean) => {
        propsIsLoading = isLoading;
        publishIsLoading();
      },
      setIsProcessingFromProps: (isProcessing: boolean) => {
        propsIsProcessing = isProcessing;
        publishIsProcessing();
      }
    }
  ] as const;
}
