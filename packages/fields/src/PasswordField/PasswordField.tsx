import { type StringKeyOf } from 'type-fest';

import { type FieldValueMapping } from '@gxxc/solid-formation-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type PasswordFieldProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = InputFieldProps<M, N>;

export function PasswordField<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
>(props: PasswordFieldProps<M, N>) {
  props.type = 'password';
  return <InputField {...props} />;
}

export default PasswordField;
