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

// Errors show only once a field has been valid or blurred, so a pristine
// field doesn't render as invalid before the user has had a chance to fill
// it in.
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
  // Read live at each use site (never captured to a local `name` const), so a
  // field whose `name` prop changes after mount — e.g. a useFieldArray row
  // re-addressed after an earlier item shifts — keeps writing to wherever it
  // currently lives, not a stale mount-time snapshot.

  // Sequencing token: every commit bumps it, and an async validator only
  // applies its result while its captured token is still current — stopping a
  // slow validation of an older value from clobbering a newer one's errors.
  let validationToken = 0;

  function commit(value: FieldValueFor<M, N>, isInitialization: boolean) {
    const token = ++validationToken;
    const newErrors = validate(props.name, value, validationConstraints, formState, props.label);
    const errorsForDisplay = newErrors.length > 0 ? newErrors : [];

    // Captured from the mutation's return value (which, for an uninitialized
    // field, is what assigns its generation) rather than a follow-up
    // formState.getField(name) lookup, which would just repeat work the
    // mutation already did. The field's generation only changes via
    // resetField/reset/setValues from here on, so comparing it with the token
    // tells apart "a newer commit of mine superseded this" from "an external
    // reset overwrote this field mid-validation."
    const generation = isInitialization
      ? (formStateMutations.initializeField(props.name, value, errorsForDisplay, props.label) ?? 0)
      : (formStateMutations.setFieldValue(props.name, value, errorsForDisplay) ?? 0);

    // Custom validators run only after built-in constraints pass. Sync ones
    // call setFieldErrors immediately; async ones call it once they resolve.
    if (newErrors.length === 0 && props.validator) {
      props.validator(props.name, value, formState, (errors) => {
        if (token !== validationToken) return;
        // Reads props.name live too: a field re-addressed by a useFieldArray
        // shift while validation is in flight still resolves to the same
        // record (remapFieldNames preserves identity and doesn't bump
        // generation); a removed field's props.name is frozen at disposal,
        // so getField finds nothing.
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
        // Unreachable: formFieldDefaultProps always supplies a function parse.
        return;
      }

      commit(value, isInitialization);
    },
    {
      // Re-runs validation against the current value without changing it, to
      // refresh a cross-field constraint (e.g. `match`) when its dependency
      // changes without flowing through this setValue.
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
    // An empty FileList is truthy but means the same as no selection.
    // Normalizing it here keeps file clearing aligned with `required`.
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
