import { createSignal, onMount } from 'solid-js';

import { SubmitButton, createFields, useForm } from 'solid4m';

export interface ProfileValues {
  displayName: string;
  email: string;
}

// Stands in for a server response, arriving after LOAD_DELAY_MS.
const savedProfile: ProfileValues = { displayName: 'Ada Lovelace', email: 'ada@example.com' };

const LOAD_DELAY_MS = 900;

const { InputField } = createFields<ProfileValues>();

// Simulates loading a saved profile: the form mounts empty and disabled
// (isLoading), and once the fetch "resolves", reset(toValues) fills the
// fields in and rebaselines them, so the loaded values read as a fresh form
// rather than an in-progress edit. See loading-and-resetting.mdx.
export function LoadedProfileForm() {
  const form = useForm<ProfileValues>();
  const [isLoading, setIsLoading] = createSignal(true);

  onMount(() => {
    setTimeout(() => {
      form.store[1].reset(savedProfile);
      setIsLoading(false);
    }, LOAD_DELAY_MS);
  });

  return (
    <form.Form onSubmit={() => undefined} isLoading={isLoading()} loadingLabel='Loading profile…'>
      <InputField name='displayName' label='Display name' required />
      <InputField name='email' type='email' label='Email' required />
      {/* setValues overwrites the value without rebaselining it, so — unlike
          the loading reset() above — this reads as an edit: the field is
          marked changed even though nothing was typed. */}
      <SubmitButton
        variant='approve'
        onClick={() => form.store[1].setValues({ email: 'synced@example.com' })}
      >
        Sync email from server
      </SubmitButton>
      <SubmitButton variant='approve' onClick={() => form.store[1].resetField('email')}>
        Revert email
      </SubmitButton>
      <SubmitButton variant='approve' onClick={() => form.store[1].reset()}>
        Reset form
      </SubmitButton>
      <SubmitButton>Save</SubmitButton>
    </form.Form>
  );
}
