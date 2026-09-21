import { SubmitButton, createForm } from 'solid4m';

export interface DateParseValues {
  deadlineText: string;
  deadlineDate: Date | undefined;
}

const { Form, DateField } = createForm<DateParseValues>();

// Same delay pattern as ContactForm/FieldPaletteForm: a synchronous handler
// never leaves isProcessing observably true.
async function onSubmit() {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 900));
}

// Two DateFields sharing the same min/max/step, so typing an out-of-range or
// off-step date into each shows the difference directly: the plain string
// field reports an error, the Date-backed one does not (its parsed value is
// no longer the DOM string min/max/step compare against). See fields.mdx.
export function DateParseForm() {
  return (
    <Form onSubmit={onSubmit}>
      <DateField name='deadlineText' label='Deadline (string)' min='2026-01-01' max='2026-12-31' step={7} />
      <DateField
        name='deadlineDate'
        label='Deadline (Date, via parse/format)'
        min='2026-01-01'
        max='2026-12-31'
        step={7}
        parse={(raw) => (typeof raw === 'string' && raw !== '' ? new Date(raw) : undefined)}
        format={(value) => (value ? value.toISOString().slice(0, 10) : '')}
      />
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}

export default DateParseForm;
