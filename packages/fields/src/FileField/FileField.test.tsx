import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { createRoot } from 'solid-js';
import { afterEach, describe, expect, it } from 'vitest';

import { FormContextProvider, createFormStore } from '@gxxc/solid-forms-state';

import { FileField } from './FileField';

type TestForm = { upload: FileList | undefined };

function makeStore() {
  return createRoot((dispose) => ({ store: createFormStore<TestForm>(), dispose }));
}

describe('FileField', () => {
  afterEach(cleanup);

  it('treats clearing a required file input as missing in the real form store', () => {
    const { store } = makeStore();
    render(() => (
      <FormContextProvider store={store}>
        <FileField<TestForm, 'upload'> name='upload' label='Upload' required />
      </FormContextProvider>
    ));

    const input = screen.getByLabelText('Upload') as HTMLInputElement;
    Object.defineProperty(input, 'files', { configurable: true, value: { length: 0 } as FileList });
    fireEvent.input(input);

    expect(store[0].getFieldValue('upload')).toBeUndefined();
    expect(store[0].getFieldErrors('upload')).toEqual(['"Upload" is required']);
  });

  it('clears the native selection when resetField clears form state', () => {
    const { store } = makeStore();
    const [, mutations] = store;
    render(() => (
      <FormContextProvider store={store}>
        <FileField<TestForm, 'upload'> name='upload' label='Upload' />
      </FormContextProvider>
    ));

    const input = screen.getByLabelText('Upload') as HTMLInputElement;
    const selection = { length: 1 } as FileList;
    Object.defineProperty(input, 'files', { configurable: true, value: selection });
    const assignedValues: string[] = [];
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => '',
      set: (value: string) => assignedValues.push(value)
    });
    fireEvent.input(input);
    expect((store[0].getFieldValue('upload') as FileList).length).toBe(1);

    mutations.resetField('upload');

    expect(assignedValues).toEqual(['']);
  });
});
