import { type JSX, createEffect, createMemo, mergeProps, onCleanup, splitProps, untrack } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import {
  type DisplayValue,
  type FieldName,
  type FieldValue,
  type FieldValueFor,
  type FieldValueMapping,
  type FormState,
  type FormStateMutations,
  setComponentName,
  useFormContext
} from '@gxxc/solid4m-state';
import { type ValidationConstraints, constraintNames, validate } from '@gxxc/solid4m-validation';

import type {
  AnyFormFieldEvent,
  ComponentName,
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

export function parse<V>(val: DisplayValue) {
  return val as V;
}

export function format<V extends FieldValue>(val: V | undefined) {
  return val?.toString() ?? '';
}

export function getDisplayableErrors<M extends object, K extends FieldName>(
  fieldName: K,
  { hasFieldBeenValid, hasFieldBlurred, getFieldErrors }: FormState<M>
) {
  const name = fieldName as StringKeyOf<M>;
  return hasFieldBeenValid(name) || hasFieldBlurred(name) ? getFieldErrors(name) : undefined;
}

export function isSelectableEvent(
  event: AnyFormFieldEvent,
  isSelectable: boolean
): event is SelectableFormFieldEvent {
  return !!event && isSelectable;
}

export function createValueSetter<
  G extends FormElementTag,
  M extends object,
  N extends StringKeyOf<M>,
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

export function createOnInput<G extends FormElementTag, M extends object, N extends StringKeyOf<M>>(
  setValue: SetValue,
  props: FormFieldProps<G, M, N>
) {
  return function onInput(event: FormFieldInputEvent<HTMLElementTagNameMap[G]>) {
    applyFieldEvent(setValue, event, !!props.isSelectable);
  };
}

export function createOnBlur<G extends FormElementTag, M extends object, N extends StringKeyOf<M>>(
  setField: SetValue,
  props: FormFieldProps<G, M, N>,
  setBlurredField: (name: N) => void
) {
  return function onBlur(event: FormFieldBlurEvent<HTMLElementTagNameMap[G]>) {
    setBlurredField(props.name);
    applyFieldEvent(setField, event, !!props.isSelectable);
  };
}

export function createField(componentName: ComponentName, el: JSX.Element) {
  if (el && typeof el === 'object') {
    setComponentName(el, componentName);
  }

  return el;
}

export function createFormField<
  G extends FormElementTag,
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
>(initialProps: FormFieldProps<G, M, N>) {
  const [formState, formStateMutations] = useFormContext<M>();

  const props = mergeProps(formFieldDefaultProps, initialProps);
  const isSelectable = createMemo(
    () => props.isSelectable ?? (props.checked !== undefined || props.defaultChecked !== undefined)
  );
  const isInitialized = createMemo(() => formState.hasFieldBeenInitialized(props.name));
  const value = createMemo(() => formState.getFieldValue(props.name));
  const currentChecked = createMemo(() => (isSelectable() ? (props.checked ?? Boolean(value())) : undefined));
  const [validationConstraints] = splitProps(props, constraintNames);

  const setValue = createValueSetter<G, M, N, typeof validationConstraints>(
    formState,
    formStateMutations,
    validationConstraints,
    props
  );
  const onInput = createOnInput<G, M, N>(setValue, props);
  const onBlur = createOnBlur<G, M, N>(setValue, props, formStateMutations.setBlurredField);

  // Tracked by the generation-watching effect below and read only here, at
  // unmount. Without it, removeField(props.name) at cleanup time would
  // delete whatever field currently sits at that name — usually still this
  // one, but not always: a useFieldArray remove()/insert()/move() can
  // rename a *different*, surviving field into this exact name (proactively,
  // before this component's own disposal runs) as part of reindexing after
  // an earlier item shifts. Passing the generation this component last saw
  // for its own field lets removeField no-op instead of deleting that
  // unrelated field out from under its new owner.
  let lastKnownGeneration: number | undefined;

  // Without this cleanup, a conditionally-rendered field leaves a stale
  // entry in the store that keeps counting toward
  // isFormValid/haveValuesChanged/submitted values after it unmounts.
  onCleanup(() => formStateMutations.removeField(props.name, lastKnownGeneration));

  if (props.isControlled && !isInitialized()) {
    setValue(
      isSelectable()
        ? (props.checked ?? props.defaultChecked ?? props.defaultValue ?? false)
        : props.defaultValue,
      true
    );
  } else if (props.disabled && isInitialized()) {
    // Preserve the value the user already entered for a non-selectable field
    // when no explicit default is supplied — otherwise becoming disabled would
    // wipe the field's value (to undefined) out of the submitted payload.
    const currentValue = formState.getFieldValue(props.name);
    const disabledValue = (
      isSelectable()
        ? (props.checked ?? props.defaultChecked ?? props.defaultValue ?? false)
        : (props.defaultValue ?? currentValue)
    ) as FieldValueFor<M, N>;
    const errors = validate(props.name, disabledValue, validationConstraints, formState);
    // Only overwrite errors when the disabled value actually violates a
    // constraint; passing `undefined` preserves any existing error (e.g. one set
    // by the server) rather than silently clearing it as `[]` would.
    formStateMutations.setFieldValue(props.name, disabledValue, errors.length > 0 ? errors : undefined);
  }

  // A `match` constraint depends on another field's value, which changes outside
  // this field's own input handler. Re-validate whenever that field changes so a
  // stale "does not match" verdict can't linger after the matched field is edited.
  if (props.match) {
    createEffect(() => {
      formState.getFieldValue(props.match as StringKeyOf<M>); // track the matched field
      setValue.revalidate();
    });
  }

  // resetField/reset clear the field's errors without checking them against
  // constraints or the custom validator — they live in the state package, which
  // has no access to either. `wasReset` (set alongside `generation`) tells us
  // when a generation bump was one of theirs so we can follow up with a real
  // validation pass; a setValues-caused bump leaves `wasReset` false, since
  // setValues intentionally preserves whatever errors were already there.
  //
  // resetField/reset also force hasBeenBlurred to false, so getDisplayableErrors
  // (which only shows errors once a field hasBeenValid or hasBeenBlurred) would
  // otherwise hide a real error revealed by the revalidation below until the
  // user interacts with the field again — silently blocking submission with no
  // visible reason. A reset is an explicit, visible change to the field's value
  // (unlike a fresh mount, which is genuinely untouched), so treat it like a
  // blur: mark the field blurred so any error the revalidation finds shows up
  // immediately, even once an async custom validator resolves later.
  //
  // The baseline seeds from this field's generation at effect-creation time, so
  // the effect's own first run never fires this: a field can arrive already
  // initialized with wasReset already true (e.g. reset headlessly via the store
  // before this component ever mounted), and without a baseline that inherited
  // flag would trigger a revalidate+blur the user never asked for, showing the
  // field as already invalid/touched on its very first paint. Only a generation
  // bump that happens *after* this effect is watching reflects an actual reset
  // of the mounted field, which is what should trigger the follow-up pass.
  createEffect((prevGeneration: number | undefined) => {
    const fieldName = props.name as StringKeyOf<M>;
    const field = formState.getField(fieldName);
    if (field?.generation === undefined) return prevGeneration;
    lastKnownGeneration = field.generation;
    if (
      prevGeneration !== undefined &&
      field.generation !== prevGeneration &&
      untrack(() => field.wasReset)
    ) {
      setValue.revalidate();
      formStateMutations.setBlurredField(fieldName);
    }
    return field.generation;
  }, undefined);

  // Browsers reject every programmatic file-input value except clearing it, so
  // it cannot use the normal reactive value binding. Keep a native reference
  // solely for the permitted clear after state is reset. Gated on `props.type`
  // like the `match` effect above, since it never changes after mount.
  let fileInput: HTMLInputElement | undefined;
  if (props.type === 'file') {
    createEffect(() => {
      const files = value() as unknown as FileList | undefined;
      if (!files?.length && fileInput) fileInput.value = '';
    });
  }

  const formattedValue = createMemo(() => props.format(value()));
  const displayableErrors = createMemo(() => getDisplayableErrors(props.name, formState));
  const isDisabled = createMemo(() => Boolean(props.disabled || !props.name || formState.isLoading));

  const newProps = mergeProps(props, {
    get id() {
      return props.name;
    },
    get value() {
      return formattedValue();
    },
    get disabled() {
      return isDisabled();
    },
    get errors() {
      return displayableErrors();
    },
    get checked() {
      return currentChecked();
    },
    get isInitialized() {
      return isInitialized();
    },
    ref(element: HTMLElement) {
      if (element instanceof HTMLInputElement && props.type === 'file') fileInput = element;
      if (typeof props.ref === 'function') (props.ref as (node: HTMLElement) => void)(element);
    },
    setValue,
    onInput,
    onBlur
  });

  return createMemo(() => [newProps, createField] as const);
}
