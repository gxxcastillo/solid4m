import { type JSX } from 'solid-js';

import { stripInvalidProps } from '../utils';

export type CheckboxElementProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export function Checkbox(initialProps: CheckboxElementProps) {
  const props = stripInvalidProps(initialProps);
  return <input type='checkbox' {...props} />;
}
