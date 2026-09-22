import { type JSX } from 'solid-js';

import { type FieldComponents, createFields } from '@gxxc/solid4m-fields';
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

/**
 * Binds `M` once for a matching `Form` and set of field components, so
 * neither needs `<M, ...>` repeated at every call site. Only needed when
 * different call sites use different value types; a single form can use the
 * plain `Form` export and a separate `createFields<M>()` instead.
 */
// Form is stateless per render, so binding M here is purely a type-level
// cast, the same trick createFields already uses.
export function createForm<M extends object = FieldValueMapping>(): FormComponents<M>;
/**
 * Infers `M` (for fields) from the schema's input type, and the bound
 * `Form`'s default submit type from the schema's *output* type — these
 * differ for a transform schema. The schema also becomes `Form`'s default, so
 * a plain `<Form onSubmit={...}>` validates against it without repeating
 * `schema={...}` (still overridable per call).
 */
// Mirrors useForm's schema overload.
export function createForm<S extends StandardSchemaV1>(options: {
  schema: S;
}): FormComponents<StandardSchemaFormValues<S>, StandardSchemaSubmitValues<S>>;
export function createForm(options?: { schema?: StandardSchemaV1 }): FormComponents<FieldValueMapping> {
  const schema = options?.schema;

  // Only wrap when a schema needs binding as a default: the plain `Form`
  // export already does the right thing schema-less, and stays the same
  // component reference for the common (no-schema) case.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BoundForm = schema ? (props: any) => <Form {...props} schema={props.schema ?? schema} /> : Form;

  return { Form: BoundForm, ...createFields() } as unknown as FormComponents<FieldValueMapping>;
}
