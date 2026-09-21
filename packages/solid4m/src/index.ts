// Ships the default design tokens with the structural CSS so a bare
// `import 'solid4m/styles.css'` renders a complete, usable form.
// Themes (themes/*.css) only override these variables.
import '../themes/base.css';

export * from '@gxxc/solid4m-fields';
export * from '@gxxc/solid4m-form';
export * from './createForm';

// `useForm().state` is typed against these — without re-exporting them a
// consumer can't name the type (e.g. to write their own `state: FormState<M>`
// prop), only rely on structural inference.
export type {
  BaseFormState,
  ErrorMessage,
  ErrorMessages,
  FieldName,
  FieldPath,
  FieldPathValue,
  FieldValue,
  FieldValueMapping,
  FormField,
  FormFields,
  FormState,
  FormStateGetters,
  FormStateMutations,
  FormStore
} from '@gxxc/solid4m-state';

// Lets a self-contained <Form>-rendering component (one that always renders
// its own <Form> and never accepts an external store) still expose live state
// to an ancestor: wrap it in <FormContextProvider store={outer.store}>, fed by
// the ancestor's own useForm(). The inner <Form> reuses the provided store
// instead of creating its own (see useForm's existing-context check), so
// `outer.state` reflects the same live values — no need for the component to
// separately export its fields to be reusable under a different store.
export { FormContextProvider, type FormContextProviderProps } from '@gxxc/solid4m-state';
