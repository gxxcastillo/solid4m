import { SubmitButton, createForm } from 'solid4m';

export interface ContactValues {
  name: string;
  email: string;
}

const { Form, InputField } = createForm<ContactValues>();

// A synchronous handler would flip `isProcessing` true and back to false
// within the same tick, leaving no window in which the in-flight state — the
// button's spinner, its `aria-disabled`, the polite "Submitting…"
// announcement — could ever be observed. The delay stands in for a real
// network request.
async function onSubmit() {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 1200));
}

export function ContactForm() {
  return (
    <Form onSubmit={onSubmit}>
      <InputField name='name' label='Name' required />
      <InputField name='email' type='email' label='Email' required />
      <SubmitButton>Send message</SubmitButton>
    </Form>
  );
}
