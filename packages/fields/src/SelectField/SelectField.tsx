import { createEffect, createUniqueId, splitProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping, useFormContext } from '@gxxc/solid4m-state';

import { Select } from '../elements';
import { createFormField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './SelectField.module.css';

export type SelectFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = FormFieldProps<'select', M, N> & { title?: string };

// Keep this separate from InputField even though both are string-valued: a
// select's visible label must always remain visible because it has no useful
// placeholder/floating-label state, and its children are the caller's options.
export function SelectField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  initialProps: SelectFieldProps<M, N>
) {
  const [localProps, parsedProps] = splitProps(initialProps, ['title']);
  const [props, createField] = createFormField<'select', M, N>(parsedProps)();
  const [formState] = useFormContext<M>();
  const [valueProps, selectProps] = splitProps(props, ['value']);
  const errorId = createUniqueId();
  const label = () => localProps.title ?? props.label;
  let select: HTMLSelectElement | undefined;

  // A multiple select can't be driven through `value`. HTMLSelectElement.value
  // names one option, and the stored array formats to "a,b", which matches
  // none — so binding it deselected every option, including the ones the user
  // had just picked (Chromium clears the selection; happy-dom does not, which
  // is why only a real browser shows it). Instead, leave `value` unbound and
  // mirror the stored array onto each option's `selected`. Options added after
  // this runs are only synced on the next value change.
  createEffect(() => {
    if (!props.multiple || !select) return;
    const stored = formState.getFieldValue(props.name);
    const selected = new Set(Array.isArray(stored) ? stored.map(String) : []);
    for (const option of Array.from(select.options)) option.selected = selected.has(option.value);
  });

  return createField(
    'SelectField',
    <div class={styles.SelectField}>
      {label() && (
        <label for={props.id} class={styles.title}>
          {label()}
        </label>
      )}
      <Select
        {...selectProps}
        {...(props.multiple ? {} : valueProps)}
        ref={(element: HTMLSelectElement) => {
          select = element;
          selectProps.ref(element);
        }}
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
