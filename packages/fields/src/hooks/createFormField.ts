import {
  type Accessor,
  type JSX,
  createEffect,
  createMemo,
  mergeProps,
  onCleanup,
  splitProps,
  untrack
} from 'solid-js';

import {
  type ErrorMessages,
  type FieldPath,
  type FieldValue,
  type FieldValueFor,
  type FieldValueMapping,
  setComponentName,
  useFormContext
} from '@gxxc/solid4m-state';
import { constraintNames, validate } from '@gxxc/solid4m-validation';

import type {
  ComponentName,
  FormElementTag,
  FormFieldBlurEvent,
  FormFieldInputEvent,
  FormFieldProps,
  FormatFunction,
  ParseFunction
} from '../types';
import {
  createOnBlur,
  createOnInput,
  createValueSetter,
  formFieldDefaultProps,
  getDisplayableErrors
} from './fieldBindings';

export type FieldValueSetter = ((val?: FieldValue, isInitialization?: boolean) => void) & {
  revalidate(): void;
};

/** Props a custom field receives: resolved props plus live form bindings. */
// Explicit to keep bundled declarations valid with `skipLibCheck: false`;
// `mergeProps` inference emits broken nested conditionals.
export type BoundFormFieldProps<G extends FormElementTag, M extends object, N extends FieldPath<M>> = Omit<
  FormFieldProps<G, M, N>,
  | 'id'
  | 'value'
  | 'disabled'
  | 'errors'
  | 'checked'
  | 'isInitialized'
  | 'isControlled'
  | 'parse'
  | 'format'
  | 'ref'
  | 'setValue'
  | 'onInput'
  | 'onBlur'
> & {
  readonly id: N;
  readonly value: string;
  readonly disabled: boolean;
  readonly errors: ErrorMessages | undefined;
  readonly checked: boolean | undefined;
  readonly isInitialized: boolean;
  isControlled: boolean;
  parse: ParseFunction<FieldValueFor<M, N>>;
  format: FormatFunction<FieldValueFor<M, N>>;
  ref(element: HTMLElement): void;
  setValue: FieldValueSetter;
  onInput: (event: FormFieldInputEvent<HTMLElementTagNameMap[G]>) => void;
  onBlur: (event: FormFieldBlurEvent<HTMLElementTagNameMap[G]>) => void;
};

export function createField(componentName: ComponentName, el: JSX.Element) {
  if (el && typeof el === 'object') {
    setComponentName(el, componentName);
  }

  return el;
}

export function createFormField<
  G extends FormElementTag,
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
>(
  initialProps: FormFieldProps<G, M, N>
): Accessor<readonly [BoundFormFieldProps<G, M, N>, typeof createField]> {
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

  // Guards cleanup after FieldArray reindexing; see FormStateMutations.removeField.
  let lastKnownGeneration: number | undefined;

  onCleanup(() => formStateMutations.removeField(props.name, lastKnownGeneration));

  if (props.isControlled && !isInitialized()) {
    setValue(
      isSelectable()
        ? (props.checked ?? props.defaultChecked ?? props.defaultValue ?? false)
        : props.defaultValue,
      true
    );
  } else if (props.disabled && isInitialized()) {
    // Preserve a non-selectable field's value when disabling without a default.
    const currentValue = formState.getFieldValue(props.name);
    const disabledValue = (
      isSelectable()
        ? (props.checked ?? props.defaultChecked ?? props.defaultValue ?? false)
        : (props.defaultValue ?? currentValue)
    ) as FieldValueFor<M, N>;
    const errors = validate(props.name, disabledValue, validationConstraints, formState);
    // Preserve an existing error when validation finds none.
    formStateMutations.setFieldValue(props.name, disabledValue, errors.length > 0 ? errors : undefined);
  }

  // Revalidate `match` when its other field changes.
  if (props.match) {
    createEffect(() => {
      formState.getFieldValue(props.match as FieldPath<M>); // track the matched field
      setValue.revalidate();
    });
  }

  // Revalidate/reveal errors only for a mounted field's reset.
  createEffect((prevGeneration: number | undefined) => {
    const fieldName = props.name as FieldPath<M>;
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

  // File inputs allow only programmatic clearing, so reset uses a native ref.
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

  // Generic mergeProps cannot prove this cast; see BoundFormFieldProps.
  return createMemo(() => [newProps as unknown as BoundFormFieldProps<G, M, N>, createField] as const);
}
