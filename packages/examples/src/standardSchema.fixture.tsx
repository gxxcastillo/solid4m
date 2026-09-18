import {
  Form,
  InputField,
  PasswordField,
  type StandardSchemaV1,
  type StandardSchemaV1Types,
  SubmitButton,
  useForm
} from 'solid-formation';

// Compile-only regression fixture: proves a Standard Schema can infer the form
// value type without a hand-written generic or an index signature on the values.

interface LoginValues {
  email: string;
  password: string;
}

const loginSchema = {
  '~standard': {
    version: 1,
    vendor: 'fixture',
    validate: (value: unknown) => ({ value: value as LoginValues }),
    types: undefined as unknown as StandardSchemaV1Types<LoginValues, LoginValues>
  }
} satisfies StandardSchemaV1<LoginValues, LoginValues>;

interface AgeInputValues {
  age: string;
}

interface AgeSubmitValues {
  age: number;
}

const ageSchema = {
  '~standard': {
    version: 1,
    vendor: 'fixture',
    validate: (value: unknown) => ({ value: { age: Number((value as AgeInputValues).age) } }),
    types: undefined as unknown as StandardSchemaV1Types<AgeInputValues, AgeSubmitValues>
  }
} satisfies StandardSchemaV1<AgeInputValues, AgeSubmitValues>;

export function SchemaInferredUseForm() {
  const form = useForm({ schema: loginSchema });

  return (
    <form.Form
      onSubmit={(values) => {
        void values.email.toUpperCase();
        void values.password.toUpperCase();
        // @ts-expect-error schema inference should not add an open string index signature
        void values.missing;
      }}
    >
      <InputField name='email' label='Email' />
      <PasswordField name='password' label='Password' />
      <SubmitButton />
    </form.Form>
  );
}

export function SchemaInferredForm() {
  return (
    <Form
      schema={loginSchema}
      onSubmit={(values) => {
        void values.email.toUpperCase();
        void values.password.toUpperCase();
        // @ts-expect-error schema inference should not add an open string index signature
        void values.missing;
      }}
    >
      <InputField name='email' label='Email' />
      <PasswordField name='password' label='Password' />
      <SubmitButton />
    </Form>
  );
}

export function SchemaTransformUseForm() {
  const form = useForm({ schema: ageSchema });
  const age = form.state.getFieldValue('age');

  age?.toUpperCase();
  // @ts-expect-error form state keeps schema input values before submit validation
  age?.toFixed();

  return (
    <form.Form
      onSubmit={(values) => {
        void values.age.toFixed();
        // @ts-expect-error submit handler receives schema output values
        void values.age.toUpperCase();
      }}
    >
      <InputField name='age' label='Age' />
      <SubmitButton />
    </form.Form>
  );
}

export function SchemaTransformForm() {
  return (
    <Form
      schema={ageSchema}
      onSubmit={(values) => {
        void values.age.toFixed();
        // @ts-expect-error submit handler receives schema output values
        void values.age.toUpperCase();
      }}
    >
      <InputField name='age' label='Age' />
      <SubmitButton />
    </Form>
  );
}
