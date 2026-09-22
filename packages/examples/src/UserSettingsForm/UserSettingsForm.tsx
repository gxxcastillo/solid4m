import { SubmitButton, createForm } from 'solid4m';

export interface UserSettingsValues {
  username: string;
  website: string;
  bio: string;
  reminderHour: string;
  timezone: string;
  delivery: string;
  quantity: string;
  appointment: string;
  attachment: FileList;
}

export interface UserSettingsFormProps {
  onSubmit?: (values: UserSettingsValues) => void | Promise<void>;
  // Forwarded to `<Form>`; see LineItemsForm.
  isLoading?: boolean;
}

const { Form, DateField, FileField, InputField, NumberField, RadioGroup, SelectField, TextAreaField } =
  createForm<UserSettingsValues>();

export function UserSettingsForm(props: UserSettingsFormProps) {
  return (
    <Form onSubmit={props.onSubmit ?? (() => undefined)} isLoading={props.isLoading}>
      <InputField name='username' label='Username' />
      {/* Optional but format-constrained, like `bio` below: an empty value
          must stay valid (emptiness is `required`'s business) while a
          malformed one must not. Also the only place `type='url'` is
          exercised outside unit tests, rendered in all three themes and the
          docs showcase so a regression is visible. */}
      <InputField name='website' type='url' label='Website' />
      {/* Optional but length-bounded: an empty value must stay valid, or a
          pristine form loads invalid. The a11y fixture submits this form
          untouched to keep that covered end to end. */}
      <TextAreaField name='bio' label='Bio' maxLength={500} />
      {/* The one place `step` is exercised outside unit tests. `type='time'`
          on purpose: it's the case where `step` is least obviously right, since
          the units are the spec's (seconds), not the field's displayed ones —
          1800 here means every half hour. Optional, so this also covers an
          empty step-constrained field staying valid. */}
      <InputField
        name='reminderHour'
        type='time'
        label='Daily reminder'
        step={1800}
        min='09:00'
        max='17:00'
      />
      <SelectField name='timezone' label='Time zone'>
        <option value='America/Los_Angeles'>Pacific time</option>
        <option value='America/New_York'>Eastern time</option>
      </SelectField>
      <RadioGroup
        name='delivery'
        label='Notification delivery'
        options={[
          { value: 'email', label: 'Email' },
          { value: 'push', label: 'Push notification' }
        ]}
      />
      <NumberField name='quantity' label='Quantity' min={1} />
      <DateField name='appointment' label='Appointment date' min='2026-01-01' />
      <FileField name='attachment' label='Attachment' accept='.pdf,image/*' />
      <SubmitButton>Submit</SubmitButton>
    </Form>
  );
}
