import { type JSX } from 'solid-js';

import { createFields, type FieldComponents } from '@gxxc/solid4m-fields';
import {
  Form,
  type FormComponentProps,
  type StandardSchemaFormValues,
  type StandardSchemaSubmitValues,
  type StandardSchemaV1,
  type SubmitResponse,
  type SubmitResponseMapping
} from '@gxxc/solid4m-form';
import { type FieldValueMapping } from '@gxxc/solid4m-state';

export type FormComponents<M extends object, DefaultSubmitValues extends object = M> = FieldComponents<M> & {
  Form: <O extends object = DefaultSubmitValues, R extends SubmitResponse | SubmitResponseMapping<O> = O>(
    props: FormComponentProps<M, O, R>
  ) => JSX.Element;
};

// `Form` and the field components are only generic for the (uncommon) case
// where different call sites need different form value types — a single form
// component always uses one M. createFields already binds M once for the
// fields; this does the same for Form (itself stateless per render, so
// binding M here is purely a type-level cast, same as createFields) so a
// form's fields and its wrapper share one declaration instead of repeating M
// as `<Form<M, ...>>` plus a separate createFields<M>() call.
export function createForm<M extends object = FieldValueMapping>(): FormComponents<M>;
// Mirrors useForm's schema overload: M (for fields) is the schema's input
// type, and the bound Form's default submit type is the schema's *output*
// type — they can differ for a transform schema. The schema itself becomes
// Form's default too, so a plain `<Form onSubmit={...}>` validates against it
// without repeating `schema={...}` at the call site (still overridable per
// call, same as useForm's `schema={props.schema ?? options.schema}`).
export function createForm<S extends StandardSchemaV1>(
  options: { schema: S }
): FormComponents<StandardSchemaFormValues<S>, StandardSchemaSubmitValues<S>>;
export function createForm(options?: { schema?: StandardSchemaV1 }): FormComponents<FieldValueMapping> {
  const schema = options?.schema;

  // Only wrap when a schema needs binding as a default — the plain `Form`
  // export already does the right thing schema-less, and stays the exact
  // same component reference for the common (no-schema) case.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BoundForm = schema ? (props: any) => <Form {...props} schema={props.schema ?? schema} /> : Form;

  return { Form: BoundForm, ...createFields() } as unknown as FormComponents<FieldValueMapping>;
}
