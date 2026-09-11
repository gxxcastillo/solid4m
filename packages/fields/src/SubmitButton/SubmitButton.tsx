import { type JSX, Show, createMemo, createUniqueId, children as prepareChildren, splitProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { Button, type ButtonElementProps } from '@gxxc/solid-forms-elements';
import { type FieldValueMapping, type InternalFormState, useFormContext } from '@gxxc/solid-forms-state';

import { createField } from '../hooks';
import { type FormFieldProps } from '../types';
import styles from './SubmitButton.module.css';

export type SubmitButtonProps<
  M extends object = FieldValueMapping,
  N extends StringKeyOf<M> = StringKeyOf<M>
> = Omit<FormFieldProps<'input', M, N>, 'name'> & {
  name?: string;
  variant?: 'approve' | 'primary';
  isFullWidth?: boolean;
};

export function SubmitButton<M extends object = FieldValueMapping, N extends StringKeyOf<M> = StringKeyOf<M>>(
  initialProps: SubmitButtonProps<M, N>
) {
  const [formState] = useFormContext();
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
  // localProps.onClick is typed against the 'input' element tag (SubmitButton reuses
  // FormFieldProps to inherit value/parse/setValue), but Button renders a real
  // <button>; a mouse click handler works identically on either element.
  const onClick = createMemo(() =>
    localProps.onClick
      ? (localProps.onClick as ButtonElementProps['onClick'])
      : parsedProps.name
        ? () => parsedProps.setValue?.(parsedProps.parse?.(parsedProps.value))
        : undefined
  );
  // Deliberately NOT disabled for an invalid form. A disabled button is removed
  // from the tab order entirely (so a screen reader user may never learn a
  // submit button exists), fires no pointer events (so it cannot explain
  // itself), and — the case that actually bit us — turns any bug in our own
  // validity computation into an unrecoverable dead end with no diagnostic.
  // Submitting an invalid form instead runs the reveal path in
  // createBaseFormOnSubmitHandler: every field is marked blurred so its errors
  // become visible, and focus moves to the first invalid one. This follows
  // current form-accessibility guidance (GOV.UK Design System, NN/g).
  //
  // `isProcessing` is the case that genuinely warrants signalling unavailable,
  // but it is signalled with `aria-disabled` rather than `disabled`, because the
  // user who started the submit is by definition focused on this button. A
  // focused element that becomes `disabled` leaves the tab order, so the browser
  // drops focus to <body> — and nothing puts it back when the submit settles,
  // leaving a keyboard or screen-reader user at the top of the document with no
  // announcement of what happened. `aria-disabled` conveys the same
  // unavailability while keeping focus, tab position, and hover/focus events.
  //
  // An explicit `isDisabled` is still a real `disabled` attribute: that is the
  // consumer asserting the action is unavailable for a reason of their own. A
  // hard-disabled button needs no in-flight treatment layered on top — it is
  // already unavailable, already unclickable, and already dimmed.
  //
  // Gated on the *value*, not on whether the prop was passed. `isDisabled` is
  // ordinarily bound to a signal (`isDisabled={!termsAccepted()}`), so testing
  // for `undefined` here stripped the spinner, the `aria-disabled`, and the
  // activation block from every form that gates its submit button — at exactly
  // the moment the gate opens and a submit becomes possible. That test was
  // carried over unexamined from the old `localProps.isDisabled ??
  // !formState.isFormValid` default, where `undefined` selected the fallback and
  // therefore meant something; with the fallback gone it distinguished nothing
  // worth distinguishing.
  const isBusy = createMemo(() => !localProps.isDisabled && formState.isProcessing);
  // Stamped onto the button so the submit handler can report which one started
  // the submit. The submit event does hand us the element directly, and this is
  // the deliberate cost of not keeping it: an element in the store is a live
  // node solid mutates in place while the store tracks nothing about it (see
  // `InternalFormState`). One inert attribute buys an inert store.
  //
  // Not `name`, which is already public API here — it picks the handler out of
  // an object-style `onSubmit` map and is handed to the consumer as
  // `buttonName`, so a generated value would leak into user code. `createUniqueId`
  // is hydration-stable, so the token survives SSR.
  const submitterId = createUniqueId();
  // The spinner is scoped where `isBusy` is not, and the split is the point.
  // Unavailability really is form-wide — while one submit is in flight every
  // other submit action is blocked too, so every button stays `aria-disabled`.
  // "Running right now" is a claim about a single action, and a form with
  // "Sign up" and "Save draft" spun both at once, saying two things were
  // happening when one was.
  //
  // Falls back to spinning every busy button when no submitter is recorded:
  // `<Form isProcessing>` describes work the consumer is doing outside any
  // button, and documentation promises that prop the same treatment a real
  // submit gets. Showing nothing there would withdraw the feature for the
  // caller-driven case; with the usual single button it is also exactly right.
  const isSubmitter = createMemo(() => {
    if (!isBusy()) return false;
    // Read through the internal shape: which button is running is bookkeeping
    // shared between BaseForm and this component, not part of the state surface
    // consumers are handed.
    const active = (formState as InternalFormState<M>).processingSubmitter;
    return active === undefined || active === submitterId;
  });
  // The flip side of aria-disabled is that it is advisory only — the browser
  // still activates the button and still submits the form — so the block has to
  // happen here. createBaseFormOnSubmitHandler guards the submit path
  // independently; this additionally covers `variant='approve'`, whose
  // `type='button'` never reaches that handler.
  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (event) => {
    if (isBusy()) {
      event.preventDefault();
      return;
    }

    const handler = onClick();
    if (!handler) return;
    // Solid unwraps the bound `[handler, data]` form of an event handler when it
    // binds one to an element; invoking one ourselves means unwrapping it here.
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
          Purely decorative, hence aria-hidden: the in-flight state is announced
          by the form's own polite live region (BaseForm's `.sf-form-status`),
          and a spinner contributing to the button's accessible name would both
          duplicate that and corrupt the name callers query by.

          It is absolutely positioned inside the button's own inline padding, so
          it costs nothing in layout: the label lives in the content box, the
          spinner in the padding box, and the button does not change size or
          re-center its label when a submit starts. That is why the label can
          stay exactly where it is rather than being swapped or shifted.
        */}
        <Show when={isSubmitter()}>
          <span class={styles.spinner} aria-hidden='true' />
        </Show>
        {label()}
      </Button>
    </div>
  );
}
