import { createFields } from 'solid-formation';

// Compile-only regression fixture: proves createFields binds M once so
// individual field calls need no <M, N> generics, while still checking `name`
// and `match` against the real form value type — a bogus field name or a
// self-match are both rejected, same as the raw <PasswordField<M, N>> form.

interface SignupValues {
  password: string;
  confirm: string;
  terms: boolean;
}

const { CheckboxField: TypedCheckbox, PasswordField: TypedPassword } = createFields<SignupValues>();

export function ValidUsage() {
  return (
    <>
      <TypedPassword name='password' label='Password' minLength={8} />
      <TypedPassword name='confirm' label='Confirm password' match='password' />
      <TypedCheckbox name='terms' label='Accept terms' required />
    </>
  );
}

export function BogusFieldName() {
  // @ts-expect-error name must be a real key of SignupValues
  return <TypedPassword name='nonexistent' label='Nope' />;
}

export function SelfMatch() {
  // @ts-expect-error match must name a different field, not the field itself
  return <TypedPassword name='confirm' match='confirm' />;
}
