import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';

import { Select, type SelectElementProps } from './Select';

describe('Select', () => {
  afterEach(cleanup);

  it('renders a <select> with its options', () => {
    const { container } = render(() => (
      <Select id='role' value='admin'>
        <option value='admin'>Admin</option>
        <option value='member'>Member</option>
      </Select>
    ));
    const select = container.querySelector('select');

    expect(select).not.toBeNull();
    expect(select).toHaveAttribute('id', 'role');
    expect(select?.querySelectorAll('option')).toHaveLength(2);
  });

  it('forwards the disabled attribute', () => {
    const { container } = render(() => <Select id='role' disabled />);

    expect(container.querySelector('select')).toBeDisabled();
  });

  it('strips internal field-only props before reaching the DOM', () => {
    const props = { id: 'role', errors: ['Required'], parse: (v: string) => v } as unknown as SelectElementProps;
    const { container } = render(() => <Select {...props} />);

    const select = container.querySelector('select');
    expect(select).not.toHaveAttribute('errors');
    expect(select).not.toHaveAttribute('parse');
  });
});
