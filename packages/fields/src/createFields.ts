import { type JSX } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { type FieldValueMapping } from '@gxxc/solid-forms-state';

import { CheckboxField, type CheckboxFieldProps } from './CheckboxField/CheckboxField';
import { DateField, type DateFieldProps } from './DateField/DateField';
import { FileField, type FileFieldProps } from './FileField/FileField';
import { InputField, type InputFieldProps } from './InputField/InputField';
import { NumberField, type NumberFieldProps } from './NumberField/NumberField';
import { PasswordField, type PasswordFieldProps } from './PasswordField/PasswordField';
import { RadioGroup, type RadioGroupProps } from './RadioGroup/RadioGroup';
import { SelectField, type SelectFieldProps } from './SelectField/SelectField';
import { TextAreaField, type TextAreaFieldProps } from './TextareaField/TextareaField';

export type FieldComponents<M extends object> = {
  InputField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: InputFieldProps<M, N>) => JSX.Element;
  NumberField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: NumberFieldProps<M, N>) => JSX.Element;
  DateField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: DateFieldProps<M, N>) => JSX.Element;
  FileField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: FileFieldProps<M, N>) => JSX.Element;
  PasswordField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: PasswordFieldProps<M, N>) => JSX.Element;
  TextAreaField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: TextAreaFieldProps<M, N>) => JSX.Element;
  CheckboxField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: CheckboxFieldProps<M, N>) => JSX.Element;
  SelectField: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: SelectFieldProps<M, N>) => JSX.Element;
  RadioGroup: <N extends StringKeyOf<M> = StringKeyOf<M>>(props: RadioGroupProps<M, N>) => JSX.Element;
};

// Field components are generic over both the form's value type (M) and each
// field's own name (N), but JSX has no way to thread a type parameter from
// `<Form<M>>` into a sibling field's independent generic inference — every
// `<InputField>` call is type-checked in isolation. Without `<M, N>` spelled
// out at each call site, `name`/`match` fall back to the untyped
// `FieldValueMapping` default and accept any string. Binding M once here
// (instead of on every field) restores real `name`/`match` checking for the
// rest of the form without repeating the form's value type at each field.
export function createFields<M extends object = FieldValueMapping>(): FieldComponents<M> {
  return {
    InputField,
    NumberField,
    DateField,
    FileField,
    PasswordField,
    TextAreaField,
    CheckboxField,
    SelectField,
    RadioGroup
  } as FieldComponents<M>;
}
