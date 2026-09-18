import { createSignal } from 'solid-js';
import { SubmitButton, createForm } from 'solid-formation';

interface Values {
  email: string;
}

const { Form, InputField } = createForm<Values>();

// Shared between the SSR entry and the client entry so both render the exact
// same tree — that's what makes a hydration mismatch (or its absence)
// meaningful to assert on.
export function App() {
  const [submitted, setSubmitted] = createSignal(false);

  return (
    <Form
      onSubmit={() => {
        setSubmitted(true);
      }}
    >
      <InputField name='email' label='Email' required />
      <SubmitButton>Send</SubmitButton>
      <p data-testid='status'>{submitted() ? 'Submitted' : 'Not submitted'}</p>
    </Form>
  );
}
