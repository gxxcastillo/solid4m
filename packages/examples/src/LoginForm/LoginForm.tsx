import { SubmitButton, createForm } from '@gxxc/solid-forms';

export interface LoginValues {
  email: string;
  password: string;
  message: string;
}

export interface LoginFormProps {
  onSubmit?: (values: LoginValues) => void | Promise<void>;
}

const { Form, InputField, PasswordField, TextAreaField } = createForm<LoginValues>();

export function LoginForm(props: LoginFormProps) {
  return (
    <Form onSubmit={props.onSubmit ?? (() => undefined)}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <TextAreaField name='message' label='Care to send a message?' />
      <SubmitButton />
    </Form>
  );
}
