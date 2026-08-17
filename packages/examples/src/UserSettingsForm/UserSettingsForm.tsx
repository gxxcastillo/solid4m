import { SubmitButton, createForm } from '@gxxc/solid-forms';

export interface UserSettingsValues {
  username: string;
  website: string;
  bio: string;
  reminderHour: string;
}

export interface UserSettingsFormProps {
  onSubmit?: (values: UserSettingsValues) => void | Promise<void>;
}

const { Form, InputField, TextAreaField } = createForm<UserSettingsValues>();

export function UserSettingsForm(props: UserSettingsFormProps) {
  return (
    <Form onSubmit={props.onSubmit ?? (() => undefined)}>
      <InputField name='username' label='Username' />
      {/* Optional but format-constrained, the same shape as `bio` below and for
          the same reason: an empty value must stay valid (emptiness is
          `required`'s business) while a malformed one must not. This is also the
          only place `type='url'` is exercised outside unit tests — it renders in
          all three themes and the docs showcase, so a regression is visible
          rather than merely untested. */}
      <InputField name='website' type='url' label='Website' />
      {/* Optional but length-bounded on purpose: this is the shape that used to
          report "is too long" while still empty, making a pristine form invalid
          on load. The a11y fixture submits this form untouched to keep that
          regression covered end to end. */}
      <TextAreaField name='bio' label='Bio' maxLength={500} />
      {/* The one place `step` is exercised outside unit tests. `type='time'`
          rather than a number on purpose: it is the case where `step` is least
          obviously right, because the units are the spec's (seconds) and not the
          ones the field displays — 1800 here means every half hour. Optional, so
          it also covers an empty step-constrained field staying valid. */}
      <InputField name='reminderHour' type='time' label='Daily reminder' step={1800} />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
