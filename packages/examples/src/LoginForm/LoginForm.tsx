import { SubmitButton, createForm } from 'solid4m';

export interface LoginValues {
  email: string;
  password: string;
  message: string;
}

export interface LoginFormProps {
  onSubmit?: (values: LoginValues) => void | Promise<void>;
  // Forwarded to `<Form>`; see LineItemsForm.
  isLoading?: boolean;
}

const { Form, InputField, PasswordField, TextAreaField } = createForm<LoginValues>();

export function LoginForm(props: LoginFormProps) {
  return (
    <Form onSubmit={props.onSubmit ?? (() => undefined)} isLoading={props.isLoading}>
      <InputField name='email' type='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <TextAreaField name='message' label='Care to send a message?' />
      <SubmitButton />
    </Form>
  );
}
