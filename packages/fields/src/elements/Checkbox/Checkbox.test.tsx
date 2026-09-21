import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';

import { Checkbox, type CheckboxElementProps } from './Checkbox';

describe('Checkbox', () => {
  afterEach(cleanup);

  it('renders an <input type="checkbox">', () => {
    const { container } = render(() => <Checkbox id='accept' checked />);
    const checkbox = container.querySelector('input');

    expect(checkbox).not.toBeNull();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
    expect(checkbox).toHaveAttribute('id', 'accept');
    expect(checkbox).toBeChecked();
  });

  it('defaults to type="checkbox" when no type is supplied', () => {
    const { container } = render(() => <Checkbox id='accept' />);

    expect(container.querySelector('input')).toHaveAttribute('type', 'checkbox');
  });

  it('strips internal field-only props before reaching the DOM', () => {
    const props = { id: 'accept', errors: ['Required'] } as unknown as CheckboxElementProps;
    const { container } = render(() => <Checkbox {...props} />);

    expect(container.querySelector('input')).not.toHaveAttribute('errors');
  });
});
