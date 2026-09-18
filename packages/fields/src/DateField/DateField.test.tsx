import { cleanup, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-formation-state';

import { DateField } from './DateField';

describe('DateField', () => {
  afterEach(cleanup);
  it('locks the native date input type and preserves date bounds', () => {
    const store = createRoot(() => createFormStore<{ appointment: string }>());
    render(() => (
      <FormContextProvider store={store}>
        <DateField name='appointment' label='Appointment' min='2026-01-01' />
      </FormContextProvider>
    ));
    expect(screen.getByLabelText('Appointment')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Appointment')).toHaveAttribute('min', '2026-01-01');
  });
});
