import { type JSX } from 'solid-js';

import { SubmitButton, createForm } from 'solid4m';

export interface SignupValues {
  email: string;
  username: string;
  password: string;
  confirm: string;
  bio: string;
  terms: boolean;
}

export interface SignupFormProps {
  actionsClass?: string;
  onSubmit?: (values: SignupValues) => void | Promise<void>;
  // Forwarded to `<Form>`; see LineItemsForm.
  isLoading?: boolean;
}

const { CheckboxField, Form, InputField, PasswordField, TextAreaField } = createForm<SignupValues>();

function MailIcon(): JSX.Element {
  return (
    <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' aria-hidden='true'>
      <rect x='3' y='5' width='18' height='14' rx='2' />
      <path d='m3 7 9 6 9-6' />
    </svg>
  );
}

export function SignupForm(props: SignupFormProps) {
  return (
    <Form onSubmit={props.onSubmit ?? (() => undefined)} isLoading={props.isLoading}>
      <InputField
        name='email'
        type='email'
        label='Email'
        leadingIcon={<MailIcon />}
        showLabel={() => true}
        required
      />
      <InputField name='username' label='Username' required minLength={3} />
      <PasswordField name='password' label='Password' required minLength={8} />
      <PasswordField name='confirm' label='Confirm password' required match='password' />
      <TextAreaField name='bio' label='Short bio' title='About you' />
      <CheckboxField name='terms' label='I accept the terms of service' required />
      <div class={props.actionsClass}>
        <SubmitButton>Sign up</SubmitButton>
        <SubmitButton variant='approve'>Save draft</SubmitButton>
      </div>
    </Form>
  );
}
