import { createMemo, createUniqueId, splitProps } from 'solid-js';

import { Textarea } from '@gxxc/solid4m-elements';
import { type FieldPath, type FieldValueMapping, useFormContext } from '@gxxc/solid4m-state';

import { createFormField, useFormFieldLabel } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './TextareaField.module.css';

export type TextAreaFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = FormFieldProps<'textarea', M, N> & {
  title?: string;
};

export function TextAreaField<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
>(initialProps: TextAreaFieldProps<M, N>) {
  const [formState] = useFormContext<M>();
  const [localProps, parsedProps] = splitProps(initialProps, ['title']);

  const [props, createField] = createFormField<'textarea', M, N>(parsedProps)();
  const value = createMemo(() => formState.getFieldValue(props.name));
  const errorId = createUniqueId();
  const initialLabel = createMemo(() => props.label);
  const label = createMemo(() =>
    useFormFieldLabel({
      value: value(),
      label: initialLabel()
    })
  );
  const visibleLabel = createMemo(() => localProps.title ?? initialLabel());
  const placeholder = createMemo(() => (localProps.title ? label().placeholder : undefined));

  return createField(
    'TextareaField',
    <div class={styles.TextArea}>
      {visibleLabel() && (
        <label for={props.id} class={styles.title}>
          {visibleLabel()}
        </label>
      )}
      <div class={styles.textAreaContainer}>
        <Textarea
          {...props}
          placeholder={placeholder()}
          class={styles.textAreaEl}
          aria-invalid={!!props.errors?.length}
          aria-describedby={props.errors?.length ? errorId : undefined}
        />
      </div>
      {props.errors?.[0] && (
        <div id={errorId} class={styles.error} role='alert'>
          {props.errors[0]}
        </div>
      )}
    </div>
  );
}
