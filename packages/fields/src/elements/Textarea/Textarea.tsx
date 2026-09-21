import { type JSX } from 'solid-js';

import { stripInvalidProps } from '../utils';

export type TextareaElementProps = JSX.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea(initialProps: TextareaElementProps) {
  const props = stripInvalidProps(initialProps);
  return <textarea {...props} />;
}
