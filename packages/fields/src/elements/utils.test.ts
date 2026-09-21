import { describe, expect, it } from 'vitest';

import { stripInvalidProps } from './utils';

describe('stripInvalidProps', () => {
  it('removes internal field-only props', () => {
    const stripped = stripInvalidProps({
      isControlled: true,
      isInitialized: true,
      isValid: true,
      isDisabled: true,
      isSelectable: true,
      parse: () => undefined,
      setValue: () => undefined,
      errors: ['Required'],
      format: () => '',
      validator: () => undefined,
      match: 'password',
      showIcon: () => true,
      defaultValue: 'a',
      defaultChecked: true
    });

    expect(stripped).toEqual({});
  });

  it('preserves standard DOM attributes', () => {
    const stripped = stripInvalidProps({
      id: 'username',
      placeholder: 'Username',
      disabled: false,
      value: 'alice',
      errors: ['Required']
    });

    expect(stripped).toEqual({
      id: 'username',
      placeholder: 'Username',
      disabled: false,
      value: 'alice'
    });
  });
});
