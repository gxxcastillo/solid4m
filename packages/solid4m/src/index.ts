// Ships the default design tokens with the structural CSS so a bare
// `import 'solid4m/styles.css'` renders a complete, usable form; themes
// (themes/*.css) only override these variables.
//
// package.json must not declare `sideEffects`, even as `["**/*.css"]`: that
// marks this module side-effect-free, so a bundler treating solid4m as
// source (as the docs site's alias does) drops this import along with the
// tokens it ships. Vite and esbuild already tree-shake a single-file dist by
// statement, so sideEffects buys nothing anyway.
import '../themes/base.css';

export * from '@gxxc/solid4m-fields';
export * from '@gxxc/solid4m-form';
export * from './createForm';

// `useForm().state` is typed against these; without re-exporting them a
// consumer can't name the type (e.g. `state: FormState<M>`), only rely on
// structural inference.
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
// its own <Form>, never an external store) still expose live state to an
// ancestor: wrap it in <FormContextProvider store={outer.store}>, fed by the
// ancestor's own useForm(). The inner <Form> reuses that store instead of
// creating its own (see useForm's existing-context check), so `outer.state`
// stays live without the component separately exporting its fields.
export { FormContextProvider, type FormContextProviderProps } from '@gxxc/solid4m-state';
