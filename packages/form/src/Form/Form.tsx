import { type JSX } from 'solid-js';

import { type FieldValueMapping } from '@gxxc/solid4m-state';
import {
  type StandardSchemaFormValues,
  type StandardSchemaSubmitValues,
  type StandardSchemaV1
} from '@gxxc/solid4m-validation';

import { type BaseFormProps, type BaseFormPropsWithSubmit } from '../BaseForm/BaseForm';
import { useForm } from '../hooks/useForm';
import { type SubmitResponse, type SubmitResponseMapping } from '../types';

export type SchemaFormProps<
  S extends StandardSchemaV1,
  R extends SubmitResponse | SubmitResponseMapping<StandardSchemaSubmitValues<S>>
> = BaseFormPropsWithSubmit<StandardSchemaFormValues<S>, StandardSchemaSubmitValues<S>, R> & {
  schema: S;
};

// Not repeated `export function Form(...)` overload declarations (signature,
// signature, implementation) — valid TypeScript, but some build pipelines
// mis-handle multiple same-named function declarations in one module:
// vite-plugin-solid's HMR transform, under Vite's oxc-based TS transform,
// wraps the implementation into `const Form = ...` while leaving the bodyless
// overload signatures as literal (now-colliding) `function Form`
// declarations, producing a "Form has already been declared" parse error in
// dev. Attaching the same two call signatures to a type and casting one,
// differently-named implementation onto it gives callers identical overload
// resolution with only one real function declaration in the module.
type FormComponent = {
  <
    S extends StandardSchemaV1,
    R extends SubmitResponse | SubmitResponseMapping<StandardSchemaSubmitValues<S>> =
      StandardSchemaSubmitValues<S>
  >(
    props: SchemaFormProps<S, R>
  ): JSX.Element;
  <M extends object = FieldValueMapping, R extends SubmitResponse | SubmitResponseMapping<M> = M>(
    props: BaseFormProps<M, R>
  ): JSX.Element;
};

function formComponent<
  M extends object = FieldValueMapping,
  O extends object = M,
  R extends SubmitResponse | SubmitResponseMapping<O> = O
>(props: BaseFormPropsWithSubmit<M, O, R>) {
  const form = useForm<M, O, R>({ schema: props.schema });
  return <form.Form {...props} />;
}

export const Form = formComponent as unknown as FormComponent;
