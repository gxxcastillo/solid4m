import { mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type NumberFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<InputFieldProps<M, N>, 'type'>;

// Keep parsing explicit: HTML number inputs still expose DOM strings, and
// coercing an empty value to zero would turn clearing an optional field into a
// surprising value. Consumers who store numbers can pass their parse function.
export function NumberField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  props: NumberFieldProps<M, N>
) {
  return <InputField {...mergeProps(props, { type: 'number' })} />;
}
