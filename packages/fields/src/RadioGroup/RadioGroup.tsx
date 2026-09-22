import { For, createUniqueId, splitProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping } from '@gxxc/solid4m-state';

import { Input } from '../elements';
import { createFormField } from '../hooks';
import { createFieldError } from '../shared/fieldError';
import { type FormFieldProps } from '../types';
import styles from './RadioGroup.module.css';

export type RadioOption = { value: string; label: string; disabled?: boolean };

export type RadioGroupProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<FormFieldProps<'input', M, N>, 'type' | 'value'> & {
  options: readonly RadioOption[];
};

// One field with several native radio controls, not several boolean
// checkboxes. Keep `isSelectable` false so createFormField stores the
// selected value; its checkbox path would store `checked` instead and lose
// which option was chosen.
export function RadioGroup<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  initialProps: RadioGroupProps<M, N>
) {
  const [localProps, parsedProps] = splitProps(initialProps, ['options', 'label']);
  const [props, createField] = createFormField<'input', M, N>(parsedProps)();
  const error = createFieldError(() => props.errors);
  const labelId = createUniqueId();

  return createField(
    'RadioGroup',
    <fieldset class={styles.RadioGroup} {...error.aria}>
      {localProps.label && (
        <legend id={labelId} class={styles.legend}>
          {localProps.label}
        </legend>
      )}
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
                {/*
                  Input, not a raw <input>: it strips the field plumbing that
                  would otherwise render as attributes on every radio (see
                  stripInvalidProps in elements/utils.ts).
                */}
                <Input
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
      <error.Message />
    </fieldset>
  );
}
