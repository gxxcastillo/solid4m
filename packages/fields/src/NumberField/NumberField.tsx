import { mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type NumberFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<InputFieldProps<M, N>, 'type'>;

// Keep parsing explicit: number inputs still expose DOM strings, and coercing
// an empty one to zero would surprise a cleared optional field. Consumers who
// store numbers supply their own parse.
export function NumberField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  props: NumberFieldProps<M, N>
) {
  return <InputField {...mergeProps(props, { type: 'number' })} />;
}
