import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid4m-state';

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

  // Each radio is a raw <input> receiving the group's spread props, so the
  // field's plumbing (parse/format/setValue functions, errors, isControlled…)
  // would otherwise land on every radio as attributes, and under SSR as
  // serialized function source.
  it('does not leak field plumbing onto the native radios as attributes', () => {
    const store = createRoot(() => createFormStore<Values>());
    render(() => (
      <FormContextProvider store={store}>
        <RadioGroup<Values, 'delivery'>
          name='delivery'
          label='Delivery'
          required
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'express', label: 'Express' }
          ]}
        />
      </FormContextProvider>
    ));

    for (const radio of screen.getAllByRole('radio')) {
      const attributes = Array.from(radio.attributes, (a) => a.name.toLowerCase());
      for (const leaked of ['parse', 'format', 'setvalue', 'iscontrolled', 'errors']) {
        expect(attributes).not.toContain(leaked);
      }
    }
  });
});
