import { type Context, type JSX, createContext, useContext } from 'solid-js';

import { createFormStore } from './FormState';
import { type FieldValueMapping, type FormStore } from './types';

export const FormContext = createFormContext();

export type FormContextProviderProps<M extends object = FieldValueMapping> = {
  store?: FormStore<M>;
  children: JSX.Element;
};

export function createFormContext() {
  return createContext([]);
}

export function useFormContext<M extends object = FieldValueMapping>() {
  return useContext(FormContext) as unknown as FormStore<M>;
}

export function FormContextProvider<M extends object = FieldValueMapping>(
  props: FormContextProviderProps<M>
) {
  const Context = FormContext as unknown as Context<FormStore<M>>;
  const store: FormStore<M> = props.store ? props.store : createFormStore<M>();
  // Plain passthrough, not `children()`: this never inspects or transforms
  // children (unlike BaseForm.tsx, which needs `.toArray()`), so `children()`
  // buys nothing and breaks two cases. Called inline
  // (`children(() => props.children)()`), it sits inside the reactive
  // computation the JSX compiler wraps around this child position, so it
  // rebuilds a fresh children() memo — and re-invokes props.children — on
  // every re-run, not just once (visible once a descendant's own dynamic
  // content can change shape, e.g. a useFieldArray-backed <For> shrinking,
  // which reruns the whole wrapped subtree and discards its reactive state).
  // Hoisted above this function's `return` instead, `children(fn)` evaluates
  // `fn` eagerly at creation — before `<Context.Provider>` exists — so a
  // descendant reading `useFormContext()` during its own setup (e.g.
  // useFieldArray) sees the default, empty context instead of `store`.
  return <Context.Provider value={store}>{props.children}</Context.Provider>;
}
