import { mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { Input } from '../elements';
import { createFormField } from '../hooks';
import { createFieldError } from '../shared/fieldError';
import { type FormFieldProps } from '../types';
import styles from './FileField.module.css';

export type FileFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<FormFieldProps<'input', M, N>, 'type' | 'value' | 'parse' | 'format'>;

export function FileField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  initialProps: FileFieldProps<M, N>
) {
  // format is overridden: the default calls `.toString()`, which would render
  // a FileList as the literal string "[object FileList]"
  const [props, createField] = createFormField<'input', M, N>(
    mergeProps(initialProps, { type: 'file', format: () => '' })
  )();
  const error = createFieldError(() => props.errors);

  return createField(
    'FileField',
    <div class={styles.FileField}>
      {props.label && (
        <label for={props.id} class={styles.label}>
          {props.label}
        </label>
      )}
      <Input {...props} class={styles.input} {...error.aria} />
      <error.Message />
    </div>
  );
}
