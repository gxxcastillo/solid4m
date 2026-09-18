import { createRoot } from 'solid-js';
import { describe, test } from 'vitest';

import { createFormStore } from './FormState';

// Vitest 5 moved `bench` from a top-level import to a test-context fixture
// (https://vitest.dev/guide/migration/) — each benchmark is now its own
// `test()`, with `bench(...).run()` awaited inside it.
describe('createFormStore — large form performance', () => {
  test('initialize 100 fields', async ({ bench }) => {
    await bench('initialize 100 fields', () => {
      createRoot((dispose) => {
        const [, mutations] = createFormStore();
        for (let i = 0; i < 100; i++) {
          mutations.initializeField(`field_${i}`, `value_${i}`, []);
        }
        dispose();
      });
    }).run();
  });

  test('set values on 100 initialized fields', async ({ bench }) => {
    await bench('set values on 100 initialized fields', () => {
      createRoot((dispose) => {
        const [, mutations] = createFormStore();
        for (let i = 0; i < 100; i++) {
          mutations.initializeField(`field_${i}`, `value_${i}`, []);
        }
        for (let i = 0; i < 100; i++) {
          mutations.setFieldValue(`field_${i}`, `updated_${i}`);
        }
        dispose();
      });
    }).run();
  });

  test('read 100 field values after update', async ({ bench }) => {
    await bench('read 100 field values after update', () => {
      createRoot((dispose) => {
        const [state, mutations] = createFormStore();
        for (let i = 0; i < 100; i++) {
          mutations.initializeField(`field_${i}`, `value_${i}`, []);
        }
        for (let i = 0; i < 100; i++) {
          state.getField(`field_${i}`);
        }
        dispose();
      });
    }).run();
  });
});
