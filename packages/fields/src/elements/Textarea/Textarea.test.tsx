import { cleanup, render } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';

import { Textarea, type TextareaElementProps } from './Textarea';

describe('Textarea', () => {
  afterEach(cleanup);

  it('renders a <textarea> forwarding standard attributes', () => {
    const { container } = render(() => <Textarea id='bio' placeholder='Bio' value='Hello' />);
    const textarea = container.querySelector('textarea');

    expect(textarea).not.toBeNull();
    expect(textarea).toHaveAttribute('id', 'bio');
    expect(textarea).toHaveAttribute('placeholder', 'Bio');
    expect(textarea).toHaveValue('Hello');
  });

  it('strips internal field-only props before reaching the DOM', () => {
    const props = { id: 'bio', errors: ['Too long'] } as unknown as TextareaElementProps;
    const { container } = render(() => <Textarea {...props} />);

    expect(container.querySelector('textarea')).not.toHaveAttribute('errors');
  });
});
