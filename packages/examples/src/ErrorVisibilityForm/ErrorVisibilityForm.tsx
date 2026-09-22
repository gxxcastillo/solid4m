import { SubmitButton, createForm } from 'solid4m';

// Demonstrates *when* a field's errors become visible, not what they say.
// Pair with <Demo inspect> to watch each field's `blurred`/`valid` tags flip
// alongside its error appearing or not.
export interface ErrorVisibilityValues {
  username: string;
  email: string;
}

const { Form, InputField } = createForm<ErrorVisibilityValues>();

export function ErrorVisibilityForm() {
  return (
    <Form onSubmit={() => undefined}>
      {/*
        Untouched and invalid (empty + required) on mount, but silent: neither
        hasBeenBlurred nor hasBeenValid is true yet. Typing below the
        3-character minimum stays silent too — only once the field has been
        valid does it show errors live for anything typed afterward.
      */}
      <InputField name='username' label='Username' required minLength={3} />
      {/* A second, independent field: blur it while still invalid to see the
          other trigger — a blur reveals errors immediately even if the field
          has never once been valid. */}
      <InputField name='email' type='email' label='Email' required />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
