import { createUniqueId, mergeProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { Input } from '../elements';
import { createFormField } from '../hooks';
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
  const errorId = createUniqueId();

  return createField(
    'FileField',
    <div class={styles.FileField}>
      {props.label && <label for={props.id}>{props.label}</label>}
      <Input
        {...props}
        class={styles.input}
        aria-invalid={!!props.errors?.length}
        aria-describedby={props.errors?.length ? errorId : undefined}
      />
      {props.errors?.[0] && (
        <div id={errorId} class={styles.error} role='alert'>
          {props.errors[0]}
        </div>
      )}
    </div>
  );
}
