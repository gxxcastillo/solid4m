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

// Build a fresh backing object for the store on every call so two stores never
// share state. This matters under SolidJS's SSR build, where createStore returns
// the object it's given and mutates it in place — without a copy, two calls with
// the same `state` reference would share reactive state. The nested `fields`
// objects and the `errors` array are cloned too; a plain spread would share them.
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

  // Store-scoped, not per-field: a field that unmounts (removeField deletes
  // its record) and later re-registers under the same name must get a
  // generation no earlier write could have captured. Restarting each field at
  // 0 would let a stale async validator from the removed instance collide
  // with the freshly re-initialized one, since both would read generation 0
  // (see the guard in createFormField.ts's commit()).
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

  // Pure: computes the next value for a single field without touching the
  // store, so bulk operations (setValues) can run one `fields.map()` pass
  // instead of one O(n) store scan per field. Returns `field` itself
  // (same reference) when nothing changes, so an unaffected field's slot in
  // the mapped array is untouched and Solid doesn't notify its readers.
  const computeFieldValueUpdate = (
    field: FormField<M, FName>,
    value: FieldValueFor<M, FName> | undefined,
    errors: FErrors | undefined,
    bumpGeneration: boolean
  ): FormField<M, FName> => {
    const currentValue = field.value;
    const currentErrors = field.errors ?? [];
    // When errors is not explicitly provided, preserve current errors rather than clearing them.
    const effectiveErrors = errors !== undefined ? errors : currentErrors;

    const prevHasBeenValid = field.hasBeenValid ?? false;
    const nextHasBeenValid = prevHasBeenValid || !effectiveErrors.length;

    // A revalidation pass after resetField/reset can recompute the exact same
    // value and (empty) errors the reset already force-set — a true no-op by
    // value/errors alone. But resetField/reset also force hasBeenValid to
    // false without knowing whether the reverted value is actually valid, so
    // that recomputed hasBeenValid must still land even when nothing else changed.
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
    // Real validity is unknown here (errors are force-cleared above without
    // checking constraints), so this can't reuse the `value !== undefined &&
    // !errors.length` pattern the way initializeField/setFieldValue's fresh
    // branches do — that would wrongly claim a defined-but-invalid reverted
    // value as "has been valid". Leave it false and let the follow-up
    // revalidation pass (createFormField's wasReset-triggered effect, which
    // re-applies real errors via applyFieldValue's OR-forward) promote it to
    // true only once a real validation pass confirms it.
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

  // `isLoading` and `isProcessing` each have two independent sources, tracked
  // here and published as their OR. `isProcessing` is the one that forced this:
  // createBaseFormOnSubmitHandler drives it around every submit, and
  // `<Form isProcessing>` describes work the consumer is doing outside that
  // handler entirely. Routing both through one setter meant two writers on one
  // slot, and the failure was silent rather than loud — a prop of `true` held
  // across an in-flight submit ends up `false` the moment the handler's
  // `finally` runs, because nothing re-asserts a prop whose own value never
  // changed. Splitting the sources makes each one's writer unambiguous.
  //
  // Plain closure variables, not signals: they are only ever read by
  // `publish*` on the way to a store write, so the store field is the single
  // reactive surface and there is nothing for a reader to subscribe to twice.
  //
  // Seeded from the caller's backing state so `createFormStore({ isProcessing:
  // true })` survives the first publish instead of being recomputed away to
  // `false`. Read off the argument rather than off `formState`, so seeding can
  // never register a store dependency should this ever be called from inside a
  // tracking scope.
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

      // A re-mounting field re-initializes fresh (see initializeField's
      // hasFieldBeenInitialized guard) rather than preserving the removed
      // field's prior value — this matches how a never-before-seen field
      // behaves today.
      removeField: <N extends FName>(name: N, expectedGeneration?: number) =>
        setFormState('fields', (fields) =>
          fields.filter(
            (f) => !(f.name === name && (expectedGeneration === undefined || f.generation === expectedGeneration))
          )
        ),

      setFieldValue: <N extends FName>(name: N, value?: FieldValueFor<M, N>, errors?: FErrors) => {
        // Resolve the field once: this runs on every keystroke, so a single O(n)
        // lookup beats the five separate `.find()` scans the getters would do.
        // Returning the resulting generation lets callers (createFormField's
        // commit()) skip a second lookup to capture their staleness baseline.
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
        // Batched: `processingSubmitter` and `isProcessing` are two store writes
        // for one state transition, and consumers (SubmitButton's `isSubmitter`)
        // read both. Writing them unbatched would recompute such consumers twice
        // per submit start/stop instead of once.
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
