import { mergeProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { type FieldValueMapping } from '@gxxc/solid-formation-state';

import { InputField, type InputFieldProps } from '../InputField/InputField';

export type DateFieldProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = Omit<InputFieldProps<M, N>, 'type'>;

// Date strings deliberately retain the browser's yyyy-mm-dd DOM format. That
// is the same format min/max and step use, so callers can opt into Date objects
// with parse/format without making the native constraint attributes ambiguous.
export function DateField<M extends object = FieldValueMapping, N extends StringKeyOf<M> = StringKeyOf<M>>(
  props: DateFieldProps<M, N>
) {
  return <InputField {...mergeProps(props, { type: 'date' })} />;
}
