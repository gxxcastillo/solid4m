import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rm } from 'node:fs/promises';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Two full `vite build` passes — see vite.server.config.ts for why a single
// config/invocation can't produce both the browser and server entries.
await build({ configFile: resolve(root, 'vite.config.ts') });
await build({ configFile: resolve(root, 'vite.server.config.ts') });

// Under Vite 5, the server build also emitted its own style.css, extracted
// from the same CSS-module imports as the browser build, with identical
// class names — Vite's default generateScopedName hashes each .module.css
// file's own content, not the build, so both builds landed on the same hash
// (verified byte-for-byte against dist/index.css) — but nothing imports this
// copy: the package's `./styles.css` export always resolves to the browser
// build's file. Vite 8's ssr build mode no longer emits CSS output at all
// (verified: no dist/server/*.css after a build), making this a no-op today,
// but it's kept — with `force: true` making an absent file harmless — in
// case a future Vite version reintroduces it.
await rm(resolve(root, 'dist/server/index.css'), { force: true });
