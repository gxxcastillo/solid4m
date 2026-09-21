import { mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type DateFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<InputFieldProps<M, N>, 'type'>;

// Date strings deliberately retain the browser's yyyy-mm-dd DOM format. That
// is the same format min/max and step use, so callers can opt into Date objects
// with parse/format without making the native constraint attributes ambiguous.
export function DateField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  props: DateFieldProps<M, N>
) {
  return <InputField {...mergeProps(props, { type: 'date' })} />;
}
