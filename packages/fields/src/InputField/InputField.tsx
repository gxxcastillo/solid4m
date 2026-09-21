import { type JSX, createMemo, createUniqueId, splitProps } from 'solid-js';

import { Input } from '@gxxc/solid4m-elements';
import {
  type FieldPath,
  type FieldValueFor,
  type FieldValueMapping,
  type FormState,
  useFormContext
} from '@gxxc/solid4m-state';

import { createFormField } from '../hooks';
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
  // A JSX-valued prop compiles to a getter that builds a new element on every
  // read, and leadingIcon and context are each read twice below. The memos
  // keep one instance of each.
  const leadingIcon = createMemo(() => localProps.leadingIcon);
  const icon = createMemo(() => localProps.icon);
  const context = createMemo(() => localProps.context);
  const hasValue = createMemo(() => !!value());
  const errorId = createUniqueId();
  const placeholder = createMemo(() => (withLabel() ? undefined : props.label));

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
          placeholder={placeholder()}
          aria-invalid={!!props.errors?.length}
          aria-describedby={props.errors?.length ? errorId : undefined}
        />
        {withIcon() && <div class={styles.icon}>{icon()}</div>}
        {context() && <div class={styles.context}>{context()}</div>}
        {props.label && (
          <label for={props.id} class={withLabel() ? styles.label : styles.screenReaderOnly}>
            {props.label}
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
