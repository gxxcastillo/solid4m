import { mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type PasswordFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<InputFieldProps<M, N>, 'type'>;

export function PasswordField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  props: PasswordFieldProps<M, N>
) {
  return <InputField {...mergeProps(props, { type: 'password' })} />;
}
