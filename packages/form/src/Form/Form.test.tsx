import { cleanup, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';

import { useFormContext } from '@gxxc/solid-formation-state';

import { Form } from './Form';

interface TestValues {
  email: string;
}

function ContextProbe() {
  const [state, mutations] = useFormContext<TestValues>();
  mutations.initializeField('email', 'test@example.com', []);

  return <span>{state.getFieldValue('email')}</span>;
}

describe('Form', () => {
  afterEach(cleanup);

  it('renders children inside the form context provider', () => {
    render(() => (
      <Form<TestValues, void> onSubmit={() => undefined}>
        <ContextProbe />
      </Form>
    ));

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
