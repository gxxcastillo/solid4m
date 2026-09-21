import { splitProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { type FieldInternalProps } from '../types';

type FieldOnlyPropName =
  | keyof FieldInternalProps<FieldValueMapping, FieldPath<FieldValueMapping>>
  // FieldProps keys that are not HTML attributes.
  | 'label'
  | 'defaultValue'
  | 'defaultChecked';

// The props a field carries that must not reach the DOM, which renders any
// unknown prop as an attribute (and a function as its source under SSR).
// `satisfies` fails to compile when FieldInternalProps gains a key that is
// not listed here. Extra keys are allowed: showIcon and showLabel are split
// off by the component that uses them, and are listed in case another forgets.
const fieldOnlyProps = {
  isInitialized: true,
  isValid: true,
  isControlled: true,
  isDisabled: true,
  isSelectable: true,
  errors: true,
  match: true,
  setValue: true,
  validator: true,
  parse: true,
  format: true,
  label: true,
  defaultValue: true,
  defaultChecked: true,
  showIcon: true,
  showLabel: true
} satisfies Record<FieldOnlyPropName, true> & Record<string, true>;

type FieldOnlyProp = keyof typeof fieldOnlyProps;

export const fieldOnlyPropNames = Object.keys(fieldOnlyProps) as FieldOnlyProp[];

export function stripInvalidProps<P extends object>(props: P) {
  // splitProps only accepts keys P is known to have, which a generic P can't promise.
  return splitProps(props as P & Record<FieldOnlyProp, unknown>, fieldOnlyPropNames)[1];
}
