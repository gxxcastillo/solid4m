import { type JSX } from 'solid-js';

import {
  type FieldValueMapping,
  FormContextProvider,
  type FormState,
  type FormStore,
  createFormStore,
  useFormContext
} from '@gxxc/solid-formation-state';

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
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
> = BaseFormPropsWithSubmit<FieldValues, SubmitValues, R>;

export type UseFormOptions<S extends StandardSchemaV1 = StandardSchemaV1> = {
  schema?: S;
};

export type UseFormReturn<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
> = {
  Form: (props: FormComponentProps<FieldValues, SubmitValues, R>) => JSX.Element;
  readonly store: FormStore<FieldValues>;
  readonly state: FormState<FieldValues>;
};

export function useForm<
  S extends StandardSchemaV1,
  R extends SubmitResponse | SubmitResponseMapping<StandardSchemaSubmitValues<S>> = StandardSchemaSubmitValues<S>
>(
  options: UseFormOptions<S> & { schema: S }
): UseFormReturn<StandardSchemaFormValues<S>, StandardSchemaSubmitValues<S>, R>;
export function useForm<
  FieldValues extends RequestProps,
  SubmitValues extends RequestProps,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
>(
  // `schema` is a required key (unlike UseFormOptions) so FieldValues and
  // SubmitValues can't be pinned to different types without at least
  // acknowledging a schema is (or isn't) in play; omitting the whole call
  // falls through to the single-generic, schema-less overload below instead.
  options: { schema: StandardSchemaV1<FieldValues, SubmitValues> | undefined }
): UseFormReturn<FieldValues, SubmitValues, R>;
export function useForm<
  M extends RequestProps = FieldValueMapping,
  R extends SubmitResponse | SubmitResponseMapping<M> = M
>(options?: UseFormOptions): UseFormReturn<M, M, R>;
export function useForm<
  FieldValues extends RequestProps = FieldValueMapping,
  SubmitValues extends RequestProps = FieldValues,
  R extends SubmitResponse | SubmitResponseMapping<SubmitValues> = SubmitValues
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
