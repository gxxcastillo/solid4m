import { expect, it } from 'vitest';

import * as solid4m from './index';

// Every barrel under the facade uses `export *`, so a helper one internal
// module exports for another lands in the public API without anyone deciding
// it should. If this fails because you meant to publish a new name, add it
// here, document it in apps/docs, and add a changeset. If you didn't, move it
// to a module the barrels don't re-export (see fields/src/hooks/fieldBindings.ts).
// Types aren't covered: they have no runtime form to enumerate.
const publicExports = [
  'CheckboxField',
  'DateField',
  'FieldArray',
  'FileField',
  'Form',
  'FormContextProvider',
  'InputField',
  'NumberField',
  'PasswordField',
  'RadioGroup',
  'SelectField',
  'SubmitButton',
  'TextAreaField',
  'createField',
  'createFields',
  'createForm',
  'createFormField',
  'createScopedFields',
  'useFieldArray',
  'useForm'
];

it('publishes exactly the intended runtime exports', () => {
  expect(Object.keys(solid4m).sort()).toEqual([...publicExports].sort());
});
