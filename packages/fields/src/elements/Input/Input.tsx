import { type JSX } from 'solid-js';

import { stripInvalidProps } from '../utils';

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export function Input(initialProps: InputProps) {
  const props = stripInvalidProps(initialProps);

  return <input {...props} />;
}
