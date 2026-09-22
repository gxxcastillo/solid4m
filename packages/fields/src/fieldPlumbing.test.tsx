import { cleanup, render } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

import { CheckboxField } from './CheckboxField/CheckboxField';
import { DateField } from './DateField/DateField';
import { FileField } from './FileField/FileField';
import { InputField } from './InputField/InputField';
import { NumberField } from './NumberField/NumberField';
import { PasswordField } from './PasswordField/PasswordField';
import { RadioGroup } from './RadioGroup/RadioGroup';
import { SelectField } from './SelectField/SelectField';
import { SubmitButton } from './SubmitButton/SubmitButton';
import { TextAreaField } from './TextareaField/TextareaField';
import { fieldOnlyPropNames } from './elements/utils';

afterEach(cleanup);

// Every field spreads its props onto a real element, and the DOM renders any
// unknown prop as an attribute. Renders each field with every piece of
// plumbing a caller can pass, so a new field or wrapper that skips
// stripInvalidProps fails here.
it('keeps field plumbing off every rendered element', () => {
  const plumbing: object = {
    label: 'Label',
    defaultValue: 'value',
    defaultChecked: true,
    isValid: true,
    isDisabled: false,
    match: 'other',
    validator: () => {},
    showIcon: () => true,
    showLabel: () => true
  };
  const store = createRoot(() => createFormStore());
  const { container } = render(() => (
    <FormContextProvider store={store}>
      <InputField name='input' {...plumbing} />
      <PasswordField name='password' {...plumbing} />
      <NumberField name='number' {...plumbing} />
      <DateField name='date' {...plumbing} />
      <TextAreaField name='textarea' {...plumbing} />
      <CheckboxField name='checkbox' {...plumbing} />
      <FileField name='file' {...plumbing} />
      <SelectField name='select' {...plumbing}>
        <option value='value'>Value</option>
      </SelectField>
      <RadioGroup name='radio' {...plumbing} options={[{ value: 'value', label: 'Value' }]} />
      <SubmitButton {...plumbing}>Submit</SubmitButton>
    </FormContextProvider>
  ));

  const controls = container.querySelectorAll('input, select, textarea, button');
  expect(controls).toHaveLength(10);
  const forbidden = new Set(fieldOnlyPropNames.map((name) => name.toLowerCase()));
  for (const element of container.querySelectorAll('*')) {
    const leaked = Array.from(element.attributes, (a) => a.name).filter((name) => forbidden.has(name));
    expect(leaked, element.outerHTML).toEqual([]);
  }
});
