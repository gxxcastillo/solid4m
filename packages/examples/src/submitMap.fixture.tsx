import { SubmitButton, type SubmitResponseMapping, createForm, useForm } from 'solid4m';

// Compile-only regression fixture for named-button submit maps
// (`onSubmit={{ saveDraft, publish }}`). TypeScript cannot infer the map's
// type from the object literal, so the documented form spells out
// `SubmitResponseMapping<M>` as the response type; this keeps that form
// compiling through every way of getting a Form, each handler still checked
// against the form's values.

interface PostValues {
  title: string;
}

// Declared as returning Promise<void>, the shape of a real async handler,
// without being async (there is nothing to await in a compile-only fixture).
function saveDraft(values: PostValues, buttonName: string): Promise<void> {
  void values.title.toUpperCase();
  void buttonName;
  return Promise.resolve();
}

function publish(values: PostValues): Promise<void> {
  void values.title.toUpperCase();
  return Promise.resolve();
}

const bound = createForm<PostValues>();

export function ThroughCreateForm() {
  return (
    <bound.Form<PostValues, SubmitResponseMapping<PostValues>> onSubmit={{ saveDraft, publish }}>
      <bound.InputField name='title' label='Title' />
      <SubmitButton name='saveDraft'>Save draft</SubmitButton>
      <SubmitButton name='publish'>Publish</SubmitButton>
    </bound.Form>
  );
}

export function ThroughUseForm() {
  const form = useForm<PostValues, SubmitResponseMapping<PostValues>>();
  return (
    <form.Form onSubmit={{ saveDraft, publish }}>
      <SubmitButton name='saveDraft'>Save draft</SubmitButton>
    </form.Form>
  );
}

function wrongValues(values: { body: number }): Promise<void> {
  void values.body.toFixed();
  return Promise.resolve();
}

export function HandlersWithDifferentValueShapesAreRejected() {
  return (
    // @ts-expect-error every handler in one map must accept the form's values
    <bound.Form<PostValues, SubmitResponseMapping<PostValues>> onSubmit={{ saveDraft, wrongValues }}>
      <SubmitButton name='saveDraft'>Save draft</SubmitButton>
    </bound.Form>
  );
}
