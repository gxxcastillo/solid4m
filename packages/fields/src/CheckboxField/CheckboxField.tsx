import { createUniqueId, mergeProps, splitProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { Checkbox } from '@gxxc/solid4m-elements';
import { type FieldValueMapping } from '@gxxc/solid4m-state';

import { createFormField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './CheckboxField.module.css';

export type CheckboxFieldProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = FormFieldProps<'input', M, N>;

export function CheckboxField<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
>(initialProps: CheckboxFieldProps<M, N>) {
  const [localProps, parsedProps] = splitProps(initialProps, ['label', 'value']);
  const [props, createField] = createFormField<'input', M, N>(
    mergeProps({ isSelectable: true }, parsedProps)
  )();
  const errorId = createUniqueId();

  return createField(
    'CheckboxField',
    <div
      classList={{
        [styles.CheckboxFieldSet]: true,
        [styles.checked]: !!props.checked,
        [styles.disabled]: !!props.disabled
      }}
    >
      <Checkbox
        {...props}
        value={localProps.value}
        aria-invalid={!!props.errors?.length}
        aria-describedby={props.errors?.length ? errorId : undefined}
      />
      {localProps.label && (
        <label classList={{ [styles.label]: true, [styles.disabled]: !!props.disabled }} for={props.id}>
          {localProps.label}
        </label>
      )}
      {props.errors?.[0] && (
        <div id={errorId} class={styles.error} role='alert'>
          {props.errors[0]}
        </div>
      )}
    </div>
  );
}

export default CheckboxField;
