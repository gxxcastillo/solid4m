import { mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type DateFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<InputFieldProps<M, N>, 'type'>;

// Keeps the browser's yyyy-mm-dd DOM format, the same one min/max and step
// use, so a caller opting into Date objects via parse/format doesn't make
// those native constraint attributes ambiguous.
export function DateField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  props: DateFieldProps<M, N>
) {
  return <InputField {...mergeProps(props, { type: 'date' })} />;
}
