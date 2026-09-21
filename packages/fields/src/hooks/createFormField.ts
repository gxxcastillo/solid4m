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

// The props a field component gets back from createFormField: its own props
// with the defaults filled in, plus the live bindings to the form store.
//
// Spelled out rather than inferred, and load-bearing for the published types:
// left to inference, this is solid-js's `mergeProps` result type applied
// twice, which tsc expands structurally into thousands of lines of nested
// `infer` conditionals in the emitted declaration. That expansion does not
// re-typecheck (TS2536), and bundling it into the single public `index.d.ts`
// leaves dangling renamed `infer` parameters (TS2304), so any consumer
// checking library types (`skipLibCheck: false`, which fresh SolidStart
// templates use) failed on this package's declarations.
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
      formState.getFieldValue(props.match as FieldPath<M>); // track the matched field
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

  // `mergeProps`'s result type is a chain of conditionals over G/M/N that tsc
  // cannot resolve while those are still generic, so it can't prove what this
  // cast asserts: the merged object is the caller's props, the defaults, and
  // the bindings above, which is exactly BoundFormFieldProps (see its note).
  return createMemo(() => [newProps as unknown as BoundFormFieldProps<G, M, N>, createField] as const);
}
