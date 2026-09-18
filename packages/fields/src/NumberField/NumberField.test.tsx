import { cleanup, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-forms-state';

import { NumberField } from './NumberField';

describe('NumberField', () => {
  afterEach(cleanup);
  it('locks the native number input type', () => {
    const store = createRoot(() => createFormStore<{ quantity: string }>());
    render(() => (
      <FormContextProvider store={store}>
        <NumberField name='quantity' label='Quantity' />
      </FormContextProvider>
    ));
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('type', 'number');
  });
});
