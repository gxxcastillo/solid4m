import { createUniqueId, splitProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { Select } from '@gxxc/solid4m-elements';
import { type FieldValueMapping } from '@gxxc/solid4m-state';

import { createFormField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './SelectField.module.css';

export type SelectFieldProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = FormFieldProps<'select', M, N> & { title?: string };

// Keep this separate from InputField even though both are string-valued: a
// select's visible label must always remain visible because it has no useful
// placeholder/floating-label state, and its children are the caller's options.
export function SelectField<M extends object = FieldValueMapping, N extends StringKeyOf<M> = StringKeyOf<M>>(
  initialProps: SelectFieldProps<M, N>
) {
  const [localProps, parsedProps] = splitProps(initialProps, ['title']);
  const [props, createField] = createFormField<'select', M, N>(parsedProps)();
  const errorId = createUniqueId();
  const label = () => localProps.title ?? props.label;

  return createField(
    'SelectField',
    <div class={styles.SelectField}>
      {label() && (
        <label for={props.id} class={styles.title}>
          {label()}
        </label>
      )}
      <Select
        {...props}
        class={styles.select}
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
