import { PasswordField } from 'solid-formation';

// Compile-only regression fixture: proves `match` is checked against the
// form's real field names once a field is given explicit <M, N> generics —
// a real field name other than the field's own compiles, the field's own
// name (self-match) and a nonexistent field name are both rejected. Before
// the fix, `match` was typed `Omit<StringKeyOf<M>, N>`, which doesn't
// actually exclude N from the union and accepted any string.

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
