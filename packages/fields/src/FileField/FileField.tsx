import { createUniqueId, mergeProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { Input } from '@gxxc/solid-forms-elements';
import { type FieldValueFor, type FieldValueMapping } from '@gxxc/solid-forms-state';

import { createFormField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './FileField.module.css';

export type FileFieldProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = Omit<FormFieldProps<'input', M, N>, 'type' | 'value' | 'parse' | 'format'>;

export function FileField<M extends object = FieldValueMapping, N extends StringKeyOf<M> = StringKeyOf<M>>(
  initialProps: FileFieldProps<M, N>
) {
  const [props, createField] = createFormField<'input', M, N>(
    mergeProps(initialProps, { type: 'file', parse: (value: unknown) => value as FieldValueFor<M, N> })
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
