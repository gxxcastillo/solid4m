import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Vitest 5's own configDefaults.exclude dropped dist/cypress/etc, unlike
    // earlier versions — tsc --build's outDir is this package's own dist/, so
    // without this, Vitest also picks up and runs every compiled test file
    // it emits there.
    exclude: [...configDefaults.exclude, '**/dist/**'],
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    }
  }
});
