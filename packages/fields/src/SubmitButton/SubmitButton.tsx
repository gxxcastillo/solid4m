import { type JSX, Show, createMemo, createUniqueId, children as prepareChildren, splitProps } from 'solid-js';

import { type FieldPath, type FieldValueMapping, type InternalFormState, useFormContext } from '@gxxc/solid4m-state';

import { Button, type ButtonElementProps } from '../elements';
import { createField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './SubmitButton.module.css';

export type SubmitButtonProps<
  M extends object = FieldValueMapping,
  N extends FieldPath<M> = FieldPath<M>
> = Omit<FormFieldProps<'input', M, N>, 'name'> & {
  name?: string;
  variant?: 'approve' | 'primary';
  isFullWidth?: boolean;
};

export function SubmitButton<M extends object = FieldValueMapping, N extends FieldPath<M> = FieldPath<M>>(
  initialProps: SubmitButtonProps<M, N>
) {
  const [formState] = useFormContext<M>();
  const [localProps, parsedProps] = splitProps(initialProps, [
    'variant',
    'isDisabled',
    'isValid',
    'isFullWidth',
    'onClick'
  ]);

  const resolvedChildren = prepareChildren(() => parsedProps.children);
  const label = createMemo(() => resolvedChildren() ?? 'submit');
  const buttonType = createMemo(() => (localProps.variant === 'approve' ? 'button' : 'submit'));
  // Typed for 'input' (the props reuse FormFieldProps<'input'>), but Button
  // renders a <button>; a click handler behaves the same on either.
  const onClick = createMemo(() =>
    localProps.onClick
      ? (localProps.onClick as unknown as ButtonElementProps['onClick'])
      : parsedProps.name
        ? () => parsedProps.setValue?.(parsedProps.parse?.(parsedProps.value))
        : undefined
  );
  // Never disabled for an invalid form: a disabled button leaves the tab order
  // and cannot explain itself, and a bug in the validity check would become a
  // dead end. Submitting instead reveals every error and focuses the first
  // invalid field (createBaseFormOnSubmitHandler). Per GOV.UK Design System and
  // NN/g guidance.
  //
  // While busy it is `aria-disabled`, not `disabled`: the pressed button has
  // focus, and disabling a focused element drops focus to <body>, where nothing
  // restores it when the submit settles.
  //
  // An explicit `isDisabled` is a real `disabled`, already unavailable, so it
  // gets no in-flight treatment. Test its value, not its presence: it is usually
  // bound to a signal (`isDisabled={!termsAccepted()}`) that later reads false.
  const isBusy = createMemo(() => !localProps.isDisabled && (formState.isProcessing || formState.isLoading));
  // Tells the submit handler which button started the submit; see
  // `InternalFormState` for why the store holds this string, not the element.
  // Not `name`: that is public API (it picks the `onSubmit` map entry and
  // reaches user code as `buttonName`). `createUniqueId` is hydration-stable.
  const submitterId = createUniqueId();
  // Only the pressed button spins, though every busy button is aria-disabled
  // (see `InternalFormState`). With no recorded submitter (`<Form isProcessing>`,
  // a programmatic submit), every busy button spins, as the docs promise.
  const isSubmitter = createMemo(() => {
    if (!isBusy()) return false;
    const active = (formState as InternalFormState<M>).processingSubmitter;
    return active === undefined || active === submitterId;
  });
  // aria-disabled does not stop activation, so block it here. The submit handler
  // has its own guard; this one also covers `variant='approve'`, whose
  // `type='button'` never reaches it.
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (isBusy()) {
      event.preventDefault();
      return;
    }

    const handler = onClick();
    if (!handler) return;
    // Solid unwraps a bound `[handler, data]` pair only when it binds the handler
    // itself; calling one directly means unwrapping it here.
    if (typeof handler === 'function') handler(event);
    else handler[0](handler[1], event);
  };

  return createField(
    'SubmitButton',
    <div>
      <Button
        type={buttonType()}
        name={parsedProps.name}
        disabled={localProps.isDisabled}
        aria-disabled={isBusy() || undefined}
        data-sf-submitter={submitterId}
        onClick={handleClick}
        classList={{
          [styles.button]: true,
          [styles.approve]: localProps.variant === 'approve',
          [styles.fullWidth]: !!localProps.isFullWidth
        }}
      >
        {/*
          aria-hidden: BaseForm's `.sf-form-status` region announces the
          in-flight state, and the spinner must stay out of the accessible name.
          It sits in the button's padding (see `.spinner`), so the label never
          moves.
        */}
        <Show when={isSubmitter()}>
          <span class={styles.spinner} aria-hidden='true' />
        </Show>
        {label()}
      </Button>
    </div>
  );
}
