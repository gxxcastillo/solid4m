import { type JSX } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import {
  type DisplayValue,
  type ErrorMessages,
  type FieldValue,
  type FieldValueFor,
  type FieldValueMapping,
  type FormState
} from '@gxxc/solid-formation-state';
import { type ValidationConstraints } from '@gxxc/solid-formation-validation';

export type CustomValidator<M extends object, N extends StringKeyOf<M>> = (
  fieldName: N,
  fieldValue: FieldValueFor<M, N>,
  formState: FormState<M>,
  setFieldErrors: (e: ErrorMessages) => void
) => void;

export type FormElementTag = 'button' | 'input' | 'select' | 'textarea';

export type BaseFormFieldProps<G extends FormElementTag> = Omit<JSX.HTMLElementTags[G], 'name' | 'label'>;

export type FieldProps<M extends object, N extends StringKeyOf<M>> = {
  name: N;
  label?: string;
  defaultValue?: FieldValueFor<M, N>;
  defaultChecked?: boolean;
  readonly?: boolean;
  disabled?: boolean;
  checked?: boolean;
};

export type FieldInternalProps<M extends object, N extends StringKeyOf<M>> = {
  isInitialized?: boolean;
  isValid?: boolean;
  isControlled?: boolean;
  isDisabled?: boolean;
  isSelectable?: boolean;
  errors?: ErrorMessages;
  match?: Exclude<StringKeyOf<M>, N>;
  setValue?: (value?: FieldValue, initialize?: boolean) => void;
  validator?: CustomValidator<M, N>;
  parse?: ParseFunction<FieldValueFor<M, N>>;
  format?: FormatFunction<FieldValueFor<M, N>>;
};

export type FormFieldProps<
  G extends FormElementTag,
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = BaseFormFieldProps<G> & FieldProps<M, N> & FieldInternalProps<M, N> & ValidationConstraints;

export type SetValue = (value: FieldValue, isInitialization?: boolean) => void;
export type AnyFormFieldEvent = FormFieldEvent<FormFieldElement>;
export type SelectableFormFieldEvent = FormFieldEvent<HTMLInputElement>;
export type FormFieldEvent<E extends FormFieldElement> = FormFieldBlurEvent<E> | FormFieldInputEvent<E>;
export type FormFieldElement = HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export type FormFieldInputEvent<E extends FormFieldElement> = Parameters<JSX.EventHandler<E, InputEvent>>[0];
export type FormFieldBlurEvent<E extends FormFieldElement> = Parameters<JSX.EventHandler<E, FocusEvent>>[0];

export type ParseFunction<V extends FieldValue> = (val: DisplayValue) => V;
export type FormatFunction<V extends FieldValue> = (val: V | undefined) => string;

// Composite controls (such as RadioGroup) are still form components even
// though their public name does not end in Field/Button/Link.
export type ComponentName = `${string}${'Field' | 'Button' | 'Link' | 'Group'}`;
