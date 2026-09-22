import { Show, createSignal } from 'solid-js';

import { SubmitButton, type SubmitResponseMapping, createForm } from 'solid4m';

export interface DraftPublishValues {
  title: string;
}

const { Form, InputField } = createForm<DraftPublishValues>();

// Long enough to see the pressed button's own spinner, and only that one,
// while every submit button in the form goes aria-disabled underneath it.
const SUBMIT_DELAY_MS = 900;

function delay() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, SUBMIT_DELAY_MS);
  });
}

export function DraftPublishForm() {
  const [result, setResult] = createSignal<string>();

  // Each handler gets (values, buttonName); buttonName identifies which one
  // ran, not the map key — they match here only because each button's own
  // `name` prop repeats the key.
  async function saveDraft(values: DraftPublishValues, buttonName: string) {
    setResult(undefined);
    await delay();
    setResult(`"${buttonName}" handler saved "${values.title}" as a draft.`);
  }

  async function publish(values: DraftPublishValues, buttonName: string) {
    setResult(undefined);
    await delay();
    setResult(`"${buttonName}" handler published "${values.title}".`);
  }

  return (
    <>
      <Form<DraftPublishValues, SubmitResponseMapping<DraftPublishValues>> onSubmit={{ saveDraft, publish }}>
        <InputField name='title' label='Title' required />
        <SubmitButton name='saveDraft'>Save draft</SubmitButton>
        <SubmitButton name='publish'>Publish</SubmitButton>
      </Form>
      <Show when={result()}>
        <p>{result()}</p>
      </Show>
    </>
  );
}
