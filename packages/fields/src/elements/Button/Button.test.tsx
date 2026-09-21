import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button, type ButtonElementProps } from './Button';

describe('Button', () => {
  afterEach(cleanup);

  it('renders a real <button> element, not an <input>', () => {
    const { container } = render(() => <Button type='submit'>Log in</Button>);

    expect(container.querySelector('button')).not.toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('renders JSX children as button content instead of an input value', () => {
    render(() => (
      <Button type='button'>
        <span>Log in</span>
      </Button>
    ));

    expect(screen.getByRole('button')).toHaveTextContent('Log in');
  });

  it('forwards type, disabled, and name attributes', () => {
    render(() => (
      <Button type='submit' name='publish' disabled>
        Publish
      </Button>
    ));
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'publish');
    expect(button).toBeDisabled();
  });

  it('invokes onClick when clicked', () => {
    const onClick = vi.fn();
    render(() => (
      <Button type='button' onClick={onClick}>
        Click me
      </Button>
    ));

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('strips internal field-only props before reaching the DOM', () => {
    const props = { type: 'submit', errors: ['Required'], isDisabled: true } as unknown as ButtonElementProps;
    render(() => <Button {...props} />);

    expect(screen.getByRole('button')).not.toHaveAttribute('errors');
    expect(screen.getByRole('button')).not.toHaveAttribute('isDisabled');
  });
});
