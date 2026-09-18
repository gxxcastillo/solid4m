import { describe, expect, it } from 'vitest';

import { CheckboxField } from './CheckboxField/CheckboxField';
import { DateField } from './DateField/DateField';
import { FileField } from './FileField/FileField';
import { InputField } from './InputField/InputField';
import { NumberField } from './NumberField/NumberField';
import { PasswordField } from './PasswordField/PasswordField';
import { RadioGroup } from './RadioGroup/RadioGroup';
import { SelectField } from './SelectField/SelectField';
import { TextAreaField } from './TextareaField/TextareaField';
import { createFields } from './createFields';

describe('createFields', () => {
  it('returns the base field components bound to the requested form type', () => {
    const fields = createFields<{ username: string; accepted: boolean }>();

    expect(fields).toEqual({
      InputField,
      NumberField,
      DateField,
      FileField,
      PasswordField,
      TextAreaField,
      CheckboxField,
      SelectField,
      RadioGroup
    });
  });
});
