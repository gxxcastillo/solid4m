import { PasswordField } from 'solid4m';

// Compile-only regression fixture: with explicit <M, N> generics, `match`
// (typed `Exclude<FieldPath<M>, N>`) must accept a real field other than the
// field's own, and reject a self-match or an unknown field name.

interface SignupValues {
  password: string;
  confirm: string;
}

export function ValidMatch() {
  return <PasswordField<SignupValues, 'confirm'> name='confirm' match='password' />;
}

export function SelfMatch() {
  // @ts-expect-error match must name a different field, not the field itself
  return <PasswordField<SignupValues, 'confirm'> name='confirm' match='confirm' />;
}

export function UnknownFieldMatch() {
  // @ts-expect-error match must name a real field on the form's value type
  return <PasswordField<SignupValues, 'confirm'> name='confirm' match='nonexistent' />;
}
