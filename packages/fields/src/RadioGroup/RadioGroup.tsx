import { For, createUniqueId, splitProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { type FieldValueMapping } from '@gxxc/solid4m-state';

import { createFormField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './RadioGroup.module.css';

export type RadioOption = { value: string; label: string; disabled?: boolean };

export type RadioGroupProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = Omit<FormFieldProps<'input', M, N>, 'type' | 'value'> & {
  options: readonly RadioOption[];
};

// A radio group is one field with several native radio controls, not several
// boolean checkbox-like fields. Keep `isSelectable` false so createFormField
// stores the selected input's value; its checkbox path would store `checked`
// and lose which option the user chose.
export function RadioGroup<M extends object = FieldValueMapping, N extends StringKeyOf<M> = StringKeyOf<M>>(
  initialProps: RadioGroupProps<M, N>
) {
  const [localProps, parsedProps] = splitProps(initialProps, ['options', 'label']);
  const [props, createField] = createFormField<'input', M, N>(parsedProps)();
  const errorId = createUniqueId();
  const labelId = createUniqueId();

  return createField(
    'RadioGroup',
    <fieldset
      class={styles.RadioGroup}
      aria-invalid={!!props.errors?.length}
      aria-describedby={props.errors?.length ? errorId : undefined}
    >
      {localProps.label && <legend id={labelId}>{localProps.label}</legend>}
      <div role='radiogroup' aria-labelledby={localProps.label ? labelId : undefined} class={styles.options}>
        <For each={localProps.options}>
          {(option, index) => {
            const optionId = `${props.id}-${index()}`;
            return (
              <label
                classList={{
                  [styles.option]: true,
                  [styles.disabled]: !!(props.disabled || option.disabled)
                }}
                for={optionId}
              >
                <input
                  {...props}
                  id={optionId}
                  type='radio'
                  value={option.value}
                  checked={(props.value ?? '') === option.value}
                  disabled={props.disabled || option.disabled}
                />
                {option.label}
              </label>
            );
          }}
        </For>
      </div>
      {props.errors?.[0] && (
        <div id={errorId} class={styles.error} role='alert'>
          {props.errors[0]}
        </div>
      )}
    </fieldset>
  );
}
