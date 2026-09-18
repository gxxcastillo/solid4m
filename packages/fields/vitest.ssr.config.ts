import solid from 'vite-plugin-solid';
import { defineConfig } from 'vitest/config';

// Separate from vitest.config.ts because it needs a different solid-plugin
// transform (ssr-generate, not dom-generate) and a different module
// resolution target (solid-js's real Node/server build, not its client
// build) — both are whole-config settings, not something a single project
// can vary per test file.
export default defineConfig({
  plugins: [solid({ ssr: true })],
  resolve: {
    conditions: ['node']
  },
  // Vite's SSR dev pipeline treats node_modules dependencies as external by
  // default, letting Node's own resolver handle them directly — bypassing
  // this config's `resolve.conditions` entirely. Left externalized, solid-js
  // ends up resolved twice, landing on two different (and differently
  // instantiated) builds for different imports in the same render, so
  // renderToString's hydration context never reaches components that read it
  // (e.g. createUniqueId). noExternal forces solid-js through Vite's own
  // resolver instead, where it resolves once, consistently.
  ssr: {
    noExternal: ['solid-js']
  },
  test: {
    name: 'ssr',
    environment: 'node',
    include: ['src/ssr.test.tsx']
  }
});
