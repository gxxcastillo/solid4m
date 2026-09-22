import { SubmitButton, createForm } from 'solid4m';

export interface ContactValues {
  name: string;
  email: string;
}

const { Form, InputField } = createForm<ContactValues>();

// A synchronous handler flips `isProcessing` true and back within one tick,
// so the in-flight state would never be observable. The delay stands in for
// a real request.
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
