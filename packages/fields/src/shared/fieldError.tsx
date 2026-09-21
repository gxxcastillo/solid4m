import { Show, createUniqueId } from 'solid-js';

import { type ErrorMessages } from '@gxxc/solid4m-state';

import styles from './error.module.css';

// Ties a field's control to its first error message. Spread `aria` onto the
// control (RadioGroup puts it on its fieldset); its getters keep the spread
// reactive. Render `Message` where the error should appear.
export function createFieldError(errors: () => ErrorMessages | undefined) {
  const id = createUniqueId();

  return {
    aria: {
      get 'aria-invalid'() {
        return !!errors()?.length;
      },
      get 'aria-describedby'() {
        return errors()?.length ? id : undefined;
      }
    },
    Message(props: { class?: string }) {
      return (
        <Show when={errors()?.[0]}>
          {(message) => (
            <div id={id} class={props.class ? `${styles.error} ${props.class}` : styles.error} role='alert'>
              {message()}
            </div>
          )}
        </Show>
      );
    }
  };
}
