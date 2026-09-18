import { type JSX, createMemo, createUniqueId, splitProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { Input } from '@gxxc/solid-formation-elements';
import {
  type FieldValueFor,
  type FieldValueMapping,
  type FormState,
  useFormContext
} from '@gxxc/solid-formation-state';

import { createFormField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './InputField.module.css';

export type ShowIconFn<M extends object, N extends StringKeyOf<M>> = (
  value: FieldValueFor<M, N> | undefined,
  formState?: FormState<M>
) => boolean;

export type ShowLabelFn<M extends object, N extends StringKeyOf<M>> = (
  value: FieldValueFor<M, N> | undefined,
  formState?: FormState<M>
) => boolean;

export type InputFieldProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = FormFieldProps<'input', M, N> & {
  leadingIcon?: JSX.Element;
  showLabel?: ShowLabelFn<M, N>;
  showIcon?: ShowIconFn<M, N>;
  icon?: JSX.Element;
  context?: JSX.Element;
};

export function InputField<M extends object = FieldValueMapping, N extends StringKeyOf<M> = StringKeyOf<M>>(
  initialProps: InputFieldProps<M, N>
) {
  const [formState] = useFormContext<M>();
  const [localProps, parsedProps] = splitProps(initialProps, [
    'showLabel',
    'leadingIcon',
    'showIcon',
    'icon',
    'context'
  ]);

  const [props, createField] = createFormField<'input', M, N>(parsedProps)();
  const value = createMemo(() => formState.getFieldValue(props.name));
  const leadingIcon = createMemo(() => localProps.leadingIcon);
  const withLabel = createMemo(
    () =>
      typeof localProps.showLabel === 'function' && localProps.showLabel(value()!, formState as FormState<M>)
  );
  const withIcon = createMemo(
    () =>
      typeof localProps.showIcon === 'function' && localProps.showIcon(value()!, formState as FormState<M>)
  );
  const icon = createMemo(() => localProps.icon);
  const context = createMemo(() => localProps.context);
  const initialLabel = createMemo(() => props.label);
  const hasValue = createMemo(() => !!value());
  const errorId = createUniqueId();
  const placeholder = createMemo(() => (withLabel() ? undefined : initialLabel()));

  // Returned as a thunk and applied inline below so Solid tracks the memos and
  // re-evaluates the classes (e.g. the floating-label `hasValue` state) reactively.
  const classList = () => ({
    [styles.InputField]: true,
    [styles.hasValue]: hasValue(),
    [styles.withLeadingIcon]: !!leadingIcon(),
    [styles.withLabel]: withLabel()
  });

  return createField(
    'InputField',
    <div classList={classList()}>
      {props.title && <div class={styles.title}>{props.title}</div>}
      <div class={styles.inputContainer}>
        <div class={styles.leadingIcon}>{leadingIcon()}</div>
        <Input
          {...props}
          class={styles.input}
          id={props.id}
          placeholder={placeholder()}
          aria-invalid={!!props.errors?.length}
          aria-describedby={props.errors?.length ? errorId : undefined}
        />
        {withIcon() && <div class={styles.icon}>{icon()}</div>}
        {context() && <div class={styles.context}>{context()}</div>}
        {initialLabel() && (
          <label for={props.id} class={withLabel() ? styles.label : styles.screenReaderOnly}>
            {initialLabel()}
          </label>
        )}
      </div>
      {props.errors?.[0] && (
        <div id={errorId} class={styles.error} role='alert'>
          {props.errors[0]}
        </div>
      )}
    </div>
  );
}
