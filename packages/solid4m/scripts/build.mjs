import { readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { dts } from 'rollup-plugin-dts';
import { build } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const bundledPackages = [
  '@gxxc/solid4m-fields',
  '@gxxc/solid4m-form',
  '@gxxc/solid4m-state',
  '@gxxc/solid4m-validation',
  'type-fest'
];

// See vite.server.config.ts for why one config/invocation can't produce both
// the browser and server entries.
await build({ configFile: resolve(root, 'vite.config.ts') });

const declarationBundle = await rollup({
  input: resolve(root, 'dist/index.d.ts'),
  plugins: [dts({ includeExternal: bundledPackages })],
  external: [/^solid-js(\/|$)/]
});
await declarationBundle.write({ file: resolve(root, 'dist/index.d.ts'), format: 'es' });
await declarationBundle.close();

await build({ configFile: resolve(root, 'vite.server.config.ts') });

// vite-plugin-dts writes source declarations before rollup-plugin-dts replaces
// index.d.ts with the public bundle. The intermediates resolve inside this
// workspace through private package symlinks, but not from the published
// tarball, so keep only the declaration package.json exposes.
for (const entry of await readdir(resolve(root, 'dist'))) {
  if (entry !== 'index.d.ts' && (entry.endsWith('.d.ts') || entry.endsWith('.d.ts.map'))) {
    await rm(resolve(root, 'dist', entry), { force: true });
  }
}

// A no-op under Vite 8's ssr build mode, which emits no CSS (verified: no
// dist/server/*.css after a build). Kept — `force: true` makes an absent file
// harmless — in case a future Vite version emits one again; nothing would
// import it anyway, since `./styles.css` always resolves to the browser
// build's file.
await rm(resolve(root, 'dist/server/index.css'), { force: true });
