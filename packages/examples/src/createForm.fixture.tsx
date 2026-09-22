import { type StandardSchemaV1, createForm } from 'solid4m';

// Compile-only regression fixture: proves createForm binds M once for both
// Form and the field components, so neither needs <M, ...> generics at the
// call site, while `onSubmit`'s value type and field `name`/`match` are
// still checked against the real form value type.

interface SignupValues {
  email: string;
  password: string;
  confirm: string;
}

const { Form, InputField, PasswordField } = createForm<SignupValues>();

export function ValidUsage() {
  return (
    <Form
      onSubmit={(values) => {
        // Proves `values` infers as SignupValues, not FieldValueMapping: an
        // unknown key would be a compile error.
        void values.email.toUpperCase();
        void values.password.toUpperCase();
        void values.confirm.toUpperCase();
      }}
    >
      <InputField name='email' label='Email' required />
      <PasswordField name='password' label='Password' required minLength={8} />
      <PasswordField name='confirm' label='Confirm password' required match='password' />
    </Form>
  );
}

export function UnknownSubmitField() {
  return (
    <Form
      onSubmit={(values) => {
        // @ts-expect-error `missing` is not a key of SignupValues
        void values.missing;
      }}
    >
      <InputField name='email' label='Email' />
    </Form>
  );
}

export function BogusFieldName() {
  return (
    <Form onSubmit={() => undefined}>
      {/* @ts-expect-error name must be a real key of SignupValues */}
      <InputField name='nonexistent' label='Nope' />
    </Form>
  );
}

// createForm({ schema }) infers M (for fields) from the schema's *input*
// type and the bound Form's default submit type from its *output* type; they
// differ here (age arrives as a string, submits as a number). The schema
// becomes Form's default, so AgeForm below need not repeat `schema={...}`.

interface AgeInput {
  age: string;
}

interface AgeOutput {
  age: number;
}

const ageSchema = {
  '~standard': {
    version: 1,
    vendor: 'fixture',
    validate: (value: unknown) => ({ value: { age: Number((value as AgeInput).age) } }),
    types: undefined as unknown as { input: AgeInput; output: AgeOutput }
  }
} satisfies StandardSchemaV1<AgeInput, AgeOutput>;

const { Form: AgeForm, InputField: AgeInputField } = createForm({ schema: ageSchema });

export function SchemaInferred() {
  return (
    <AgeForm
      onSubmit={(values) => {
        void values.age.toFixed();
        // @ts-expect-error onSubmit receives the schema's *output* (number), not its input (string)
        void values.age.toUpperCase();
      }}
    >
      {/* Field is typed against the schema's *input* — the raw DOM string, before validate() runs. */}
      <AgeInputField name='age' label='Age' />
      {/* @ts-expect-error `age` is the only real field on the schema's input side */}
      <AgeInputField name='bogus' label='Nope' />
    </AgeForm>
  );
}
