import { type JSX } from 'solid-js';

import {
  type FieldValueMapping,
  FormContextProvider,
  type FormState,
  type FormStore,
  createFormStore,
  useFormContext
} from '@gxxc/solid4m-state';

import { BaseForm, type BaseFormPropsWithSubmit } from '../BaseForm/BaseForm';
import {
  type RequestProps,
  type StandardSchemaFormValues,
  type StandardSchemaSubmitValues,
  type StandardSchemaV1,
  type SubmitResponse,
  type SubmitResponseMapping
} from '../types';

export type FormComponentProps<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitResponse
> = BaseFormPropsWithSubmit<FieldValues, SubmitValues, R>;

export type UseFormOptions<S extends StandardSchemaV1 = StandardSchemaV1> = {
  schema?: S;
};

export type UseFormReturn<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitResponse
> = {
  Form: (props: FormComponentProps<FieldValues, SubmitValues, R>) => JSX.Element;
  readonly store: FormStore<FieldValues>;
  readonly state: FormState<FieldValues>;
};

// `R` (what a submit handler's promise resolves to) defaults to any
// `SubmitResponse`, not to the values type. Unlike `<Form>`, whose `R` is
// inferred from the handler at each call, the hook fixes `R` when it is
// called, before any handler exists — and a values-type default rejected the
// ordinary `async (values) => { await save(values) }`, whose `Promise<void>`
// is not a `Promise<M>`, unless the caller wrote `useForm<M, void>()`.
export function useForm<
  S extends StandardSchemaV1,
  R extends SubmitResponse | SubmitResponseMapping<StandardSchemaSubmitValues<S>> = SubmitResponse
>(
  options: UseFormOptions<S> & { schema: S }
): UseFormReturn<StandardSchemaFormValues<S>, StandardSchemaSubmitValues<S>, R>;
export function useForm<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitResponse
>(
  // `schema` is a required key (unlike UseFormOptions) so FieldValues and
  // SubmitValues can't be pinned to different types without at least
  // acknowledging a schema is (or isn't) in play; omitting the whole call
  // falls through to the single-generic, schema-less overload below instead.
  options: { schema: StandardSchemaV1<FieldValues, SubmitValues> | undefined }
): UseFormReturn<FieldValues, SubmitValues, R>;
export function useForm<
  M extends RequestProps = FieldValueMapping,
  R extends SubmitResponse | SubmitResponseMapping<M> = SubmitResponse
>(options?: UseFormOptions): UseFormReturn<M, M, R>;
export function useForm<
  FieldValues extends RequestProps = FieldValueMapping,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitResponse
>(options: UseFormOptions<StandardSchemaV1<FieldValues, SubmitValues>> = {}) {
  const existingStore = useFormContext<FieldValues>();
  const hasExistingStore = !!existingStore.length;
  const formStore = hasExistingStore ? existingStore : createFormStore<FieldValues>();

  return {
    Form: (props: FormComponentProps<FieldValues, SubmitValues, R>) => {
      const schema = props.schema ?? options.schema;

      if (hasExistingStore) {
        return <BaseForm {...props} schema={schema} />;
      }

      return (
        <FormContextProvider store={formStore}>
          <BaseForm {...props} schema={schema} />
        </FormContextProvider>
      );
    },

    get store() {
      return formStore;
    },

    get state() {
      return formStore[0];
    }
  };
}
