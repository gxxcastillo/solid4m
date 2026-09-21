// The machinery behind createFormField. It is deliberately not re-exported
// from hooks/index.ts, which keeps it out of the published API; the facade's
// export allowlist test fails if any of it leaks back in.
import {
  type DisplayValue,
  type FieldName,
  type FieldPath,
  type FieldValue,
  type FieldValueFor,
  type FormState,
  type FormStateMutations
} from '@gxxc/solid4m-state';
import { type ValidationConstraints, validate } from '@gxxc/solid4m-validation';

import type {
  AnyFormFieldEvent,
  FormElementTag,
  FormFieldBlurEvent,
  FormFieldElement,
  FormFieldInputEvent,
  FormFieldProps,
  SelectableFormFieldEvent,
  SetValue
} from '../types';

export const formFieldDefaultProps = {
  parse,
  format,
  isControlled: true,
  disabled: false
};

function parse<V>(val: DisplayValue) {
  return val as V;
}

function format<V extends FieldValue>(val: V | undefined) {
  return val?.toString() ?? '';
}

export function getDisplayableErrors<M extends object, K extends FieldName>(
  fieldName: K,
  { hasFieldBeenValid, hasFieldBlurred, getFieldErrors }: FormState<M>
) {
  const name = fieldName as unknown as FieldPath<M>;
  return hasFieldBeenValid(name) || hasFieldBlurred(name) ? getFieldErrors(name) : undefined;
}

function isSelectableEvent(
  event: AnyFormFieldEvent,
  isSelectable: boolean
): event is SelectableFormFieldEvent {
  return !!event && isSelectable;
}

export function createValueSetter<
  G extends FormElementTag,
  M extends object,
  N extends FieldPath<M>,
  C extends ValidationConstraints
>(
  formState: FormState<M>,
  formStateMutations: FormStateMutations<M>,
  validationConstraints: C,
  props: FormFieldProps<G, M, N>
) {
  // Read live at each use site below (never captured to a local `name`
  // const) so a field whose `name` prop changes after mount — e.g. a
  // useFieldArray row re-addressed by remapFieldNames after an earlier item
  // shifts its index — keeps writing to wherever it currently lives, instead
  // of a stale mount-time snapshot.

  // Sequencing token: every commit bumps it, and an async custom validator only
  // applies its result while its captured token is still current. This stops a
  // slow validation of an older value from clobbering a newer value's errors.
  let validationToken = 0;

  function commit(value: FieldValueFor<M, N>, isInitialization: boolean) {
    const token = ++validationToken;
    const newErrors = validate(props.name, value, validationConstraints, formState, props.label);
    const errorsForDisplay = newErrors.length > 0 ? newErrors : [];

    // Captured from the mutation's own return value (which, for an
    // uninitialized field, is what actually assigns its generation from the
    // store-wide counter) rather than a follow-up formState.getField(name)
    // lookup — the mutation already resolved the field internally, so a
    // second scan would just repeat that work. The field's generation only
    // changes via resetField/reset/setValues from here on (never via this
    // field's own commit), so comparing it alongside the token tells apart "a
    // newer commit of mine superseded this" from "an external reset overwrote
    // the field out from under this pending validation."
    const generation = isInitialization
      ? (formStateMutations.initializeField(props.name, value, errorsForDisplay, props.label) ?? 0)
      : (formStateMutations.setFieldValue(props.name, value, errorsForDisplay) ?? 0);

    // Custom validators run after built-in constraints and only when no built-in errors exist.
    // Sync validators call setFieldErrors immediately; async validators call it when they resolve.
    if (newErrors.length === 0 && props.validator) {
      props.validator(props.name, value, formState, (errors) => {
        if (token !== validationToken) return;
        // Reads props.name live too: for a field re-addressed by a
        // useFieldArray shift while this validation was in flight, this
        // still finds the same record (remapFieldNames preserves identity
        // and doesn't bump generation) and correctly reattaches the result;
        // for a field that was actually removed, props.name is frozen at
        // whatever it was at disposal and getField correctly finds nothing.
        if ((formState.getField(props.name)?.generation ?? 0) !== generation) return;
        formStateMutations.setFieldErrors(props.name, errors);
      });
    }
  }

  const setValue = Object.assign(
    function setValue(val?: FieldValue, isInitialization = false) {
      let value: FieldValueFor<M, N>;
      const currentValue = formState.getFieldValue(props.name);

      if ((props.disabled || props.readonly) && !isInitialization) {
        return;
      }

      if (props.isSelectable) {
        if (!isInitialization && Boolean(currentValue) === val) {
          return;
        }

        value = val as FieldValueFor<M, N>;
      } else if (typeof props.parse === 'function') {
        value = props.parse(val as DisplayValue);

        if (!isInitialization && currentValue === value) {
          return;
        }
      } else {
        // There should always be a parser
        return;
      }

      commit(value, isInitialization);
    },
    {
      // Re-run validation against the field's current value without changing it.
      // Used to refresh a cross-field constraint (e.g. `match`) when the field it
      // depends on changes, since that change does not flow through this setValue.
      revalidate() {
        if (!formState.hasFieldBeenInitialized(props.name)) return;
        commit(formState.getFieldValue(props.name) as FieldValueFor<M, N>, false);
      }
    }
  );

  return setValue;
}

function resolveFieldEventValue<E extends FormFieldElement>(target: E): DisplayValue {
  if (target instanceof HTMLInputElement && target.type === 'file') {
    const files = target.files;
    // An empty FileList is truthy, but has the same required-field meaning as
    // no selection. Normalizing it here keeps native file clearing aligned
    // with the shared required constraint.
    return files?.length ? files : undefined;
  }
  if (target instanceof HTMLSelectElement && target.multiple) {
    return Array.from(target.selectedOptions, (option) => option.value);
  }
  return target.value;
}

function applyFieldEvent(setValue: SetValue, event: AnyFormFieldEvent, isSelectable: boolean) {
  if (isSelectableEvent(event, isSelectable)) {
    setValue(event.currentTarget.checked);
  } else {
    setValue(resolveFieldEventValue(event.currentTarget));
  }
}

export function createOnInput<G extends FormElementTag, M extends object, N extends FieldPath<M>>(
  setValue: SetValue,
  props: FormFieldProps<G, M, N>
) {
  return function onInput(event: FormFieldInputEvent<HTMLElementTagNameMap[G]>) {
    applyFieldEvent(setValue, event, !!props.isSelectable);
  };
}

export function createOnBlur<G extends FormElementTag, M extends object, N extends FieldPath<M>>(
  setField: SetValue,
  props: FormFieldProps<G, M, N>,
  setBlurredField: (name: N) => void
) {
  return function onBlur(event: FormFieldBlurEvent<HTMLElementTagNameMap[G]>) {
    setBlurredField(props.name);
    applyFieldEvent(setField, event, !!props.isSelectable);
  };
}
