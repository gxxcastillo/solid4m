import { type JSX, createMemo, splitProps } from 'solid-js';

import {
  type FieldPath,
  type FieldValueFor,
  type FieldValueMapping,
  type FormState,
  useFormContext
} from '@gxxc/solid4m-state';

import { Input } from '../elements';
import { createFormField } from '../hooks';
import { createFieldError } from '../shared/fieldError';
import { type FormFieldProps } from '../types';
import styles from './InputField.module.css';

export type ShowLabelFn<M extends object, N extends FieldPath<M>> = (
  value: FieldValueFor<M, N> | undefined,
  formState?: FormState<M>
) => boolean;

export type ShowIconFn<M extends object, N extends FieldPath<M>> = ShowLabelFn<M, N>;

export type InputFieldProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = FormFieldProps<'input', M, N> & {
  leadingIcon?: JSX.Element;
  showLabel?: ShowLabelFn<M, N>;
  showIcon?: ShowIconFn<M, N>;
  icon?: JSX.Element;
  context?: JSX.Element;
};

export function InputField<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
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
  const withLabel = createMemo(
    () => typeof localProps.showLabel === 'function' && localProps.showLabel(value(), formState)
  );
  const withIcon = createMemo(
    () => typeof localProps.showIcon === 'function' && localProps.showIcon(value(), formState)
  );
  // A JSX-valued prop's getter rebuilds the element on every read, and each of
  // leadingIcon/icon/context is read from a reactive computation that reruns
  // independently of it. These memos cache one instance each; removing them
  // breaks "instantiates each JSX-valued prop once" (InputField.test.tsx).
  const leadingIcon = createMemo(() => localProps.leadingIcon);
  const icon = createMemo(() => localProps.icon);
  const context = createMemo(() => localProps.context);
  const hasValue = createMemo(() => !!value());
  const error = createFieldError(() => props.errors);
  const placeholder = createMemo(() => (withLabel() ? undefined : props.label));

  // A thunk, not a plain object: calling it inline below lets Solid track
  // hasValue()/leadingIcon()/withLabel() and update the classes reactively.
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
        <Input {...props} class={styles.input} placeholder={placeholder()} {...error.aria} />
        {withIcon() && <div class={styles.icon}>{icon()}</div>}
        {context() && <div class={styles.context}>{context()}</div>}
        {props.label && (
          <label for={props.id} class={withLabel() ? styles.label : styles.screenReaderOnly}>
            {props.label}
          </label>
        )}
      </div>
      <error.Message class={styles.error} />
    </div>
  );
}
