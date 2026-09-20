import { type FieldValueMapping, type FormFieldProps, type FormState, createForm } from 'solid-formation';
import type { StandardSchemaV1 } from 'solid-formation';

declare const state: FormState<{ email: string }>;
declare const fieldProps: FormFieldProps<'input', { email: string }, 'email'>;
declare const values: FieldValueMapping;

void state;
void fieldProps;
void values;

declare const schema: StandardSchemaV1<{ email: string }, { email: string }>;
const fields = createForm({ schema });
void fields.Form;
