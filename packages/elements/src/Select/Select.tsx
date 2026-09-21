import { type JSX } from 'solid-js';

import { stripInvalidProps } from '../utils';

export type SelectElementProps = JSX.SelectHTMLAttributes<HTMLSelectElement>;

export function Select(initialProps: SelectElementProps) {
  const props = stripInvalidProps(initialProps) as SelectElementProps;

  return <select {...props} />;
}
