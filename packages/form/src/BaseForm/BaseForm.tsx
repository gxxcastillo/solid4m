import { For, type JSX, children, createMemo, createRenderEffect, mergeProps, onCleanup } from 'solid-js';

import {
  type ErrorMessages,
  getComponentName as lookupComponentName,
  useFormContext
} from '@gxxc/solid4m-state';
import { type StandardSchemaV1 } from '@gxxc/solid4m-validation';

import {
  type BaseFormOnSubmit,
  type RequestProps,
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
  /** True while required form data loads. Disables fields and submission; ORed with the form's own state. */
  isLoading?: boolean;
  /**
   * True while submission work outside `onSubmit` runs (e.g. a router action).
   * ORed with the form's own state; awaited `onSubmit` work sets it automatically.
   */
  isProcessing?: boolean;
  errors?: ErrorMessages;
  /** Screen-reader status while submitting. Set `''` to suppress it. */
  processingLabel?: string;
  /** Screen-reader status while loading. Set `''` to suppress it. */
  loadingLabel?: string;
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
  processingLabel: 'Submitting…',
  loadingLabel: 'Loading…'
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
    } else if (componentName?.includes('Field') || componentName?.includes('Group')) {
      // Groups own their fieldset and errors, like fields; see ComponentName.
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

  // Avoid races with form-owned state; render before paint and in SSR. See
  // FormStateMutations.setIsProcessingFromProps.
  createRenderEffect(() => formStateMutations.setIsLoadingFromProps(!!props.isLoading));
  createRenderEffect(() => formStateMutations.setIsProcessingFromProps(!!props.isProcessing));

  // An enclosing store can outlive this form, so clear its prop state on cleanup.
  onCleanup(() => {
    formStateMutations.setIsLoadingFromProps(false);
    formStateMutations.setIsProcessingFromProps(false);
  });

  // `sf-form` is the stable consumer/theme hook; module classes own layout.
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
      // Keep constraint attributes semantic; noValidate only prevents native
      // submit handling, which would bypass this form's validation and focus.
      noValidate
      onSubmit={(event) => {
        void onSubmitHandler(event);
      }}
    >
      <For each={formChildren().bodyChildren}>{({ child, wrap }) => (wrap ? <div>{child}</div> : child)}</For>
      <For each={formChildren().formButtons}>{(child) => <div>{child}</div>}</For>
      <For each={formChildren().footerLinks}>{(child) => <div>{child}</div>}</For>
      {/* The permanent, atomic live region announces the first error; aria-live
          avoids colliding with per-field alerts. Empty styling removes its flex
          gap without display:none, which would remove it from assistive tech. */}
      <div
        class='sf-form-errors'
        classList={{ [styles.formErrorsEmpty]: formErrors().length === 0 }}
        aria-live='assertive'
        aria-atomic='true'
      >
        <For each={formErrors()}>{(child) => <div>{child}</div>}</For>
      </div>
      {/* Screen-reader-only polite status; see the error region for why it is
          permanent and uses aria-live. Not aria-busy: it withholds descendant
          live updates, including this announcement. */}
      <div class={`sf-form-status ${styles.screenReaderOnly}`} aria-live='polite' aria-atomic='true'>
        {formState.isProcessing ? props.processingLabel : formState.isLoading ? props.loadingLabel : ''}
      </div>
    </form>
  );
}
