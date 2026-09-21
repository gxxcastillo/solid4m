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

// TypeScript cannot infer `R` through this conditional from an object literal,
// so a handler map needs `R` spelled out: `<Form<M, SubmitResponseMapping<M>>>`
// or `useForm<M, SubmitResponseMapping<M>>()`. Widening this type with
// `| SubmitResponseMapping<P>` would make a bare map compile, but it turns the
// contextual type into a union, which breaks inference for generic factories
// passed as the handler — `onSubmit={vi.fn()}` stops compiling. Overloading
// `Form` on the two onSubmit shapes is the fix that avoids both.
export type BaseFormOnSubmit<P extends RequestProps, R extends SubmitResponse | SubmitResponseMapping<P>> =
  R extends SubmitResponseMapping<P> ? OnSubmitHandlers<P, R> : OnSubmitHandler<P, R>;

export type BaseFormElementSubmitEvent = Event & { submitter: HTMLElement | null };
