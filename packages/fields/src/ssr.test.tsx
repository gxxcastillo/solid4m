import { createRoot } from 'solid-js';
import { generateHydrationScript, renderToString } from 'solid-js/web';
import { describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-forms-state';

import { InputField } from './InputField/InputField';
import { SelectField } from './SelectField/SelectField';

type TestForm = { [key: string]: string; email: string };

describe('SSR / renderToString smoke tests', () => {
  it('renders InputField to string without throwing', () => {
    // Keep the reactive root alive while the store is consumed by renderToString;
    // dispose only after the assertions run.
    let dispose: () => void = () => {};
    const store = createRoot((d) => {
      dispose = d;
      return createFormStore<TestForm>();
    });

    try {
      let html: string | undefined;
      expect(() => {
        html = renderToString(() => (
          <FormContextProvider store={store}>
            <InputField<TestForm, 'email'> name='email' label='Email' required />
          </FormContextProvider>
        ));
      }).not.toThrow();

      // In a true SSR/Node environment html will be a string; in a browser
      // environment solid-js returns undefined (but does not throw).
      if (typeof html === 'string') {
        expect(html).toContain('input');
        expect(html).toContain('email');
      } else {
        expect(html).toBeUndefined();
      }
    } finally {
      dispose();
    }
  });

  it('generateHydrationScript does not throw', () => {
    expect(() => generateHydrationScript()).not.toThrow();
  });

  it('renders SelectField to string without throwing', () => {
    const store = createRoot(() => createFormStore<TestForm>());

    expect(() =>
      renderToString(() => (
        <FormContextProvider store={store}>
          <SelectField<TestForm, 'email'> name='email' label='Email kind'>
            <option value='work'>Work</option>
          </SelectField>
        </FormContextProvider>
      ))
    ).not.toThrow();
  });
});
