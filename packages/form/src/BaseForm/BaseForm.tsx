import { For, type JSX, children, createMemo, mergeProps } from 'solid-js';

import {
  type ErrorMessages,
  getComponentName as lookupComponentName,
  useFormContext
} from '@gxxc/solid-forms-state';

import {
  type BaseFormOnSubmit,
  type RequestProps,
  type StandardSchemaV1,
  type SubmitResponse,
  type SubmitResponseMapping
} from '../types';
import styles from './BaseForm.module.css';
import { createBaseFormOnSubmitHandler } from './helpers';

export type BaseFormPropsWithSubmit<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
> = {
  className?: string;
  fullWidthButtons?: boolean;
  align?: 'center' | 'left';
  isLoading?: boolean;
  isProcessing?: boolean;
  errors?: ErrorMessages;
  // Announced while a submit is in flight. Override it when "Submitting" is the
  // wrong word for the action ("Signing in", "Publishing"); set it to '' to opt
  // out of the announcement entirely.
  processingLabel?: string;
  schema?: StandardSchemaV1<FieldValues, SubmitValues>;
  onSubmit?: BaseFormOnSubmit<SubmitValues, R>;
  children: JSX.Element;
};

export type BaseFormProps<
  P extends RequestProps,
  R extends SubmitResponse | SubmitResponseMapping<P> = P
> = BaseFormPropsWithSubmit<P, P, R>;

export const baseFormDefaultProps = {
  align: 'left',
  fullWidthButtons: false,
  processingLabel: 'Submitting…'
} as const;

export type ClassifiedBaseFormChild = {
  child: JSX.Element;
  wrap: boolean;
};

function getComponentName(child: JSX.Element) {
  if (!child || typeof child !== 'object') {
    return undefined;
  }

  return lookupComponentName(child);
}

export function classifyBaseFormChildren(childrenArray: JSX.Element[]) {
  const bodyChildren: ClassifiedBaseFormChild[] = [];
  const footerLinks: JSX.Element[] = [];
  const formButtons: JSX.Element[] = [];

  for (const child of childrenArray) {
    const componentName = getComponentName(child);
    if (componentName?.includes('Button')) {
      formButtons.push(child);
    } else if (componentName === 'Link') {
      footerLinks.push(child);
    } else if (componentName?.includes('Field')) {
      bodyChildren.push({ child, wrap: false });
    } else {
      bodyChildren.push({ child, wrap: true });
    }
  }

  return { bodyChildren, footerLinks, formButtons };
}

export function BaseForm<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
>(initialProps: BaseFormPropsWithSubmit<FieldValues, SubmitValues, R>) {
  const props = mergeProps(baseFormDefaultProps, initialProps);
  const [formState, formStateMutations] = useFormContext<FieldValues>();

  const resolvedChildren = children(() => props.children);
  const formChildren = createMemo(() => classifyBaseFormChildren(resolvedChildren.toArray()));
  const formErrors = createMemo(() => [...(props.errors ?? []), ...formState.errors]);
  const onSubmitHandler = createBaseFormOnSubmitHandler<FieldValues, SubmitValues, R>(
    props,
    formState,
    formStateMutations
  );

  // `sf-form` is a stable, un-hashed hook consumers/themes can target, the rest
  // are hashed module classes that own the layout.
  const className = createMemo(() =>
    [
      'sf-form',
      styles.form,
      props.align === 'center' ? styles.alignCenter : styles.alignLeft,
      props.fullWidthButtons ? styles.fullWidthButtons : '',
      props.className ?? ''
    ]
      .filter(Boolean)
      .join(' ')
  );

  return (
    <form
      class={className()}
      // Constraint props (`required`, `minLength`, `pattern`, …) are spread onto
      // the underlying elements as real HTML attributes, which keeps their
      // semantics in the accessibility tree. Without `noValidate` the browser
      // also acts on them: interactive validation blocks the click and shows a
      // native bubble, so the submit event never fires and this library's own
      // validation, error gating, and focus management never run. `noValidate`
      // turns off only that interactive step — `required` still maps to
      // aria-required for assistive tech.
      //
      // This was unobservable until SubmitButton stopped disabling itself on an
      // invalid form: a disabled button can't be clicked, so nothing ever
      // reached native validation in the first place.
      noValidate
      onSubmit={(event) => {
        void onSubmitHandler(event);
      }}
    >
      <For each={formChildren().bodyChildren}>{({ child, wrap }) => (wrap ? <div>{child}</div> : child)}</For>
      <For each={formChildren().formButtons}>{(child) => <div>{child}</div>}</For>
      <For each={formChildren().footerLinks}>{(child) => <div>{child}</div>}</For>
      {/*
        Rendered unconditionally, even when empty: a live region has to already
        be in the accessibility tree when content lands in it, so wrapping this
        in a <Show> would silently drop the announcement for the first error —
        which is the one that matters. Per-field errors are announced separately
        via their own role='alert' (see InputField).
      */}
      {/*
        aria-live rather than role='alert': the container is always present, and
        an empty region permanently claiming the `alert` role would make
        getByRole('alert') ambiguous against the per-field errors that genuinely
        are alerts. aria-atomic re-reads the whole region so a second error is
        announced with the first rather than in isolation.
      */}
      {/*
        Always rendering it makes it a permanent flex child of `.form`, and the
        form's `gap` reserves a row for it even at zero height — so an errorless
        form would grow a stray field-gap of trailing space. `.formErrorsEmpty`
        cancels exactly that one gap; `display: none` would fix the spacing too
        but pull the region out of the accessibility tree, which is the whole
        reason it is rendered up front.
      */}
      <div
        class='sf-form-errors'
        classList={{ [styles.formErrorsEmpty]: formErrors().length === 0 }}
        aria-live='assertive'
        aria-atomic='true'
      >
        <For each={formErrors()}>{(child) => <div>{child}</div>}</For>
      </div>
      {/*
        Announces that a submit is in flight. SubmitButton already communicates
        this visually (it dims), and it keeps focus rather than dropping it, but
        nothing conveyed the state to a screen reader — press submit, hear
        nothing until it settles. Visually hidden precisely because the visual
        channel already works: rendering text would impose UI on every consumer
        to solve a problem sighted users do not have.

        `polite`, not `assertive`. Interrupting whatever the user is currently
        reading is what assertive is for, and that is the error region's job; a
        progress note waits its turn. Same reasoning as that region for why this
        is an aria-live attribute rather than role='status' — a permanently
        present element claiming a role makes getByRole queries ambiguous — and
        for why it renders even when empty: a live region must already be in the
        accessibility tree before content lands in it.

        Deliberately NOT `aria-busy` on the <form>. It reads like the obvious
        way to express "in flight", but aria-busy='true' tells assistive tech to
        *withhold* live-region updates beneath it until it flips false, which
        would suppress this announcement and the error one — the exact opposite
        of the intent.

        Unlike the error region this needs no gap correction: it is
        `position: absolute`, so it is not a flex item and `gap` never reserves
        a row for it.
      */}
      <div class={`sf-form-status ${styles.screenReaderOnly}`} aria-live='polite' aria-atomic='true'>
        {formState.isProcessing ? props.processingLabel : ''}
      </div>
    </form>
  );
}

export default BaseForm;
