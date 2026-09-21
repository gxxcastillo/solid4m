import { createRoot } from 'solid-js';
import { generateHydrationScript, renderToString } from 'solid-js/web';
import { describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

import { InputField } from './InputField/InputField';
import { RadioGroup } from './RadioGroup/RadioGroup';
import { SelectField } from './SelectField/SelectField';

type TestForm = { [key: string]: string; email: string };

describe('SSR / renderToString', () => {
  it('renders InputField to a real HTML string', () => {
    // Keep the reactive root alive while the store is consumed by renderToString;
    // dispose only after the assertions run.
    let dispose: () => void = () => {};
    const store = createRoot((d) => {
      dispose = d;
      return createFormStore<TestForm>();
    });

    try {
      const html = renderToString(() => (
        <FormContextProvider store={store}>
          <InputField<TestForm, 'email'> name='email' label='Email' required />
        </FormContextProvider>
      ));

      expect(html).toContain('<input');
      expect(html).toContain('name="email"');
      // `required` maps to `aria-required` for assistive tech only via the
      // browser's implicit HTML-to-ARIA mapping at runtime — it is never a
      // separate serialized attribute, so the accessibility signal to assert
      // on here is the `required` attribute itself.
      expect(html).toContain('required');
      expect(html).toContain('Email');
    } finally {
      dispose();
    }
  });

  it('renders an error region with role="alert" when the field has an error', () => {
    let dispose: () => void = () => {};
    const store = createRoot((d) => {
      dispose = d;
      return createFormStore<TestForm>();
    });
    const [, mutations] = store;

    try {
      // getDisplayableErrors only surfaces errors once hasBeenValid or
      // hasBeenBlurred is set (see InputField.test.tsx) — a bare
      // setFieldErrors on an unregistered field renders aria-invalid=false.
      mutations.initializeField('email', 'valid@example.com', []);
      mutations.setFieldValue('email', '', ['Email is required']);

      const html = renderToString(() => (
        <FormContextProvider store={store}>
          <InputField<TestForm, 'email'> name='email' label='Email' required />
        </FormContextProvider>
      ));

      expect(html).toContain('role="alert"');
      expect(html).toContain('Email is required');
    } finally {
      dispose();
    }
  });

  it('generateHydrationScript does not throw', () => {
    expect(() => generateHydrationScript()).not.toThrow();
  });

  it('renders SelectField to a real HTML string', () => {
    const store = createRoot(() => createFormStore<TestForm>());

    const html = renderToString(() => (
      <FormContextProvider store={store}>
        <SelectField<TestForm, 'email'> name='email' label='Email kind'>
          <option value='work'>Work</option>
        </SelectField>
      </FormContextProvider>
    ));

    expect(html).toContain('<select');
    expect(html).toContain('<option');
    expect(html).toContain('Work');
  });

  // Found against a real SolidStart app: SelectField and RadioGroup spread the
  // field's plumbing onto their native controls, and the server render
  // serialized it — including `parse="function parse(val) {…}"`.
  it('does not serialize field plumbing into SelectField or RadioGroup markup', () => {
    const store = createRoot(() => createFormStore<TestForm>());

    const html = renderToString(() => (
      <FormContextProvider store={store}>
        <SelectField<TestForm, 'email'> name='email' label='Email kind'>
          <option value='work'>Work</option>
        </SelectField>
        <RadioGroup<TestForm, 'kind'>
          name='kind'
          label='Kind'
          options={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' }
          ]}
        />
      </FormContextProvider>
    ));

    expect(html).toContain('<select');
    expect(html).toContain('type="radio"');
    expect(html).not.toMatch(/\b(parse|format|setValue|isControlled|errors)=/i);
    expect(html).not.toContain('function');
  });
});
