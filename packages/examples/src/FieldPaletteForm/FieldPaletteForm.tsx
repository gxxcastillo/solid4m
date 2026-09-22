import { SubmitButton, createFields, useForm } from 'solid4m';

export interface FieldPaletteValues {
  track: string;
  topics: string[];
  mealPreference: string;
  guestCount: string;
  age: number | undefined;
  sessionDate: string;
  resume: FileList | undefined;
}

const { SelectField, RadioGroup, NumberField, DateField, FileField } = createFields<FieldPaletteValues>();

// See ContactForm: a synchronous handler never leaves `isProcessing`
// observable.
async function onSubmit() {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 900));
}

// createFields + useForm, not createForm, so this component can also call
// resetField/reset from its own buttons below (same pattern as
// LoadedProfileForm).
export function FieldPaletteForm() {
  const form = useForm<FieldPaletteValues>();

  return (
    <form.Form onSubmit={onSubmit}>
      <SelectField name='track' label='Preferred track'>
        <option value=''>Choose a track</option>
        <option value='frontend'>Frontend</option>
        <option value='backend'>Backend</option>
        <option value='design'>Design systems</option>
      </SelectField>

      <SelectField name='topics' label='Topics you would attend' multiple defaultValue={['a11y']}>
        <option value='testing'>Testing</option>
        <option value='a11y'>Accessibility</option>
        <option value='performance'>Performance</option>
      </SelectField>

      <RadioGroup
        name='mealPreference'
        label='Meal preference'
        options={[
          { value: 'anything', label: 'Anything' },
          { value: 'vegetarian', label: 'Vegetarian' },
          { value: 'vegan', label: 'Vegan' }
        ]}
      />

      <NumberField name='guestCount' label='Additional guests' defaultValue='0' />

      <NumberField
        name='age'
        label='Age (optional)'
        min={18}
        parse={(raw) => {
          const text = typeof raw === 'string' ? raw : '';
          return text === '' ? undefined : Number(text);
        }}
        format={(value) => (value === undefined ? '' : String(value))}
      />

      <DateField name='sessionDate' label='Preferred session date' min='2026-01-05' max='2026-02-23' step={7} />

      <FileField name='resume' label='Resume' required />

      <SubmitButton variant='approve' onClick={() => form.store[1].resetField('resume')}>
        Clear resume
      </SubmitButton>
      <SubmitButton variant='approve' onClick={() => form.store[1].reset()}>
        Reset form
      </SubmitButton>
      <SubmitButton>Register</SubmitButton>
    </form.Form>
  );
}

export default FieldPaletteForm;
