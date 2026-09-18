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

// The server build also emits its own style.css, extracted from the same
// CSS-module imports as the browser build. Its class names are identical —
// Vite's default generateScopedName hashes each .module.css file's own
// content, not the build, so both builds land on the same hash (verified
// byte-for-byte against dist/style.css) — but nothing imports this copy: the
// package's `./styles.css` export always resolves to the browser build's file.
await rm(resolve(root, 'dist/server/style.css'), { force: true });
