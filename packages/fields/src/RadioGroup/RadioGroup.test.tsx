import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-formation-state';

import { RadioGroup } from './RadioGroup';

type Values = { delivery: string };

describe('RadioGroup', () => {
  afterEach(cleanup);

  it('stores the selected option as one field value', () => {
    const store = createRoot(() => createFormStore<Values>());
    render(() => (
      <FormContextProvider store={store}>
        <RadioGroup<Values, 'delivery'>
          name='delivery'
          label='Delivery'
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'express', label: 'Express' }
          ]}
        />
      </FormContextProvider>
    ));

    const express = screen.getByRole('radio', { name: 'Express' }) as HTMLInputElement;
    fireEvent.input(express, { target: { value: 'express' } });

    expect(express).toBeChecked();
    expect(store[0].getFieldValue('delivery')).toBe('express');
    expect(store[0].fields).toHaveLength(1);
  });
});
