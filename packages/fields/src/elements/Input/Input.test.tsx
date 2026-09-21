import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';

import { Input, type InputProps } from './Input';

describe('Input', () => {
  afterEach(cleanup);

  it('renders an <input> forwarding standard attributes', () => {
    const { container } = render(() => <Input id='email' placeholder='Email' value='a@b.com' />);
    const input = container.querySelector('input');

    expect(input).not.toBeNull();
    expect(input).toHaveAttribute('id', 'email');
    expect(input).toHaveAttribute('placeholder', 'Email');
    expect(input).toHaveValue('a@b.com');
  });

  it('strips internal field-only props before reaching the DOM', () => {
    const props = {
      id: 'username',
      errors: ['Required'],
      setValue: () => {}
    } as unknown as InputProps;
    const { container } = render(() => <Input {...props} />);
    const input = container.querySelector('input');

    expect(input).not.toHaveAttribute('errors');
    expect(input).not.toHaveAttribute('setValue');
  });
});
