import { type JSX } from 'solid-js';

// The Standard Schema protocol and the machinery for validating against it
// live in @gxxc/solid4m-validation (validating values is a validation
// concern, not a form-orchestration one) — re-exported here so existing
// imports from this package keep working.
export type {
  InferStandardSchemaInput,
  InferStandardSchemaOutput,
  StandardSchemaFormValues,
  StandardSchemaSubmitValues,
  StandardSchemaV1,
  StandardSchemaV1FailureResult,
  StandardSchemaV1Issue,
  StandardSchemaV1Options,
  StandardSchemaV1PathSegment,
  StandardSchemaV1Props,
  StandardSchemaV1Result,
  StandardSchemaV1SuccessResult,
  StandardSchemaV1Types
} from '@gxxc/solid4m-validation';

export type ErrorResult = {
  message: string;
  code: string;
};

export type RequestProps = object;

export type SubmitResponse = object | string | [] | null | void;
export type SubmitResponseMapping<P extends RequestProps> = Record<string, OnSubmitHandler<P, SubmitResponse>>;
export type OnSubmitHandler<P extends RequestProps, R extends SubmitResponse = void> = (
  props: P,
  buttonName: string
) => Promise<R> | void;

export type OnSubmitHandlers<P extends RequestProps, M extends SubmitResponseMapping<P>> = {
  [K in keyof M]: M[K];
};

export type BaseFormOnSubmit<P extends RequestProps, R extends SubmitResponse | SubmitResponseMapping<P>> =
  R extends SubmitResponseMapping<P> ? OnSubmitHandlers<P, R> : OnSubmitHandler<P, R>;

export type BaseFormElementSubmitEvent = Event & { submitter: HTMLElement | null };
export type BaseFormElementOnSubmitHandler = JSX.EventHandler<HTMLFormElement, BaseFormElementSubmitEvent>;
