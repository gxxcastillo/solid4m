import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type PasswordFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = InputFieldProps<M, N>;

export function PasswordField<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
>(props: PasswordFieldProps<M, N>) {
  props.type = 'password';
  return <InputField {...props} />;
}

export default PasswordField;
