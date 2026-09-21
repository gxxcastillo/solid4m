// Bundle-size budget for what a consumer actually ships: each scenario is a
// tiny app bundled and minified by esbuild against the built browser entry,
// with solid-js external (a peer every consumer already pays for once, so
// counting it would track solid-js's size rather than this package's).
//
// Measuring raw dist/index.js would be the wrong number: it is unminified and
// holds every component, while a real app tree-shakes to what it imports.
// Each scenario must use its imports observably (mount them); esbuild drops an
// import that is only referenced, which would measure 0 bytes.
//
// Usage: node scripts/check-bundle-size.mjs [path/to/dist/index.js]
// The optional path lets it check an extracted, packed tarball instead.
import esbuild from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distIndex = resolve(process.argv[2] ?? resolve(root, 'dist/index.js'));

const loginFields = `
  createComponent(InputField, { name: 'email', label: 'Email' }),
  createComponent(PasswordField, { name: 'password', label: 'Password' }),
  createComponent(SubmitButton, { children: 'Log in' })
`;

// Budgets are gzip bytes: the measured size when set plus about 10% headroom.
// Raise one only for growth you meant to add, and say so in the changeset.
const SCENARIOS = [
  {
    // Direct named imports, which tree-shake down to the fields used.
    name: 'login (named imports)',
    code: `
      import { createComponent } from 'solid-js';
      import { Form, InputField, PasswordField, SubmitButton } from 'solid4m';
      export const mount = (root) => root.appendChild(createComponent(Form, {
        onSubmit: () => {},
        get children() { return [${loginFields}]; }
      }));
    `,
    gzipLimit: 9500
  },
  {
    // The documented createForm pattern. It costs more than the named imports
    // above because createFields returns every field component in one object,
    // which bundlers cannot tree-shake by property.
    name: 'login (createForm)',
    code: `
      import { createComponent } from 'solid-js';
      import { SubmitButton, createForm } from 'solid4m';
      const { Form, InputField, PasswordField } = createForm();
      export const mount = (root) => root.appendChild(createComponent(Form, {
        onSubmit: () => {},
        get children() { return [${loginFields}]; }
      }));
    `,
    gzipLimit: 11600
  },
  {
    name: 'full palette',
    code: `
      import { createComponent } from 'solid-js';
      import { FieldArray, SubmitButton, createForm } from 'solid4m';
      const {
        Form, InputField, PasswordField, TextAreaField, CheckboxField,
        SelectField, RadioGroup, NumberField, DateField, FileField
      } = createForm();
      export const mount = (root) => root.appendChild(createComponent(Form, {
        onSubmit: () => {},
        get children() {
          return [
            createComponent(InputField, { name: 'username', label: 'Username' }),
            createComponent(PasswordField, { name: 'password', label: 'Password' }),
            createComponent(TextAreaField, { name: 'bio', label: 'Bio' }),
            createComponent(CheckboxField, { name: 'agree', label: 'I agree' }),
            createComponent(SelectField, { name: 'tz', label: 'Time zone' }),
            createComponent(RadioGroup, { name: 'delivery', label: 'Delivery', options: [] }),
            createComponent(NumberField, { name: 'age', label: 'Age' }),
            createComponent(DateField, { name: 'appt', label: 'Appointment' }),
            createComponent(FileField, { name: 'file', label: 'File' }),
            createComponent(FieldArray, { name: 'items', children: () => [] }),
            createComponent(SubmitButton, { children: 'Submit' })
          ];
        }
      }));
    `,
    gzipLimit: 12700
  }
];

/** @param {number} bytes */
const kb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`;
let failed = false;

console.log(`Bundle size against ${distIndex} (minified, solid-js external)\n`);

for (const scenario of SCENARIOS) {
  const result = await esbuild.build({
    stdin: { contents: scenario.code, resolveDir: dirname(distIndex), loader: 'js' },
    // Resolve the package straight to the file under test instead of through
    // node_modules, so the same script checks dist/ or an unpacked tarball.
    alias: { solid4m: distIndex },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    external: ['solid-js', 'solid-js/web', 'solid-js/store'],
    write: false
  });

  const code = result.outputFiles[0].contents;
  const gzip = gzipSync(code, { level: 9 }).length;
  const brotli = brotliCompressSync(code, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
  const over = gzip > scenario.gzipLimit;
  failed ||= over;

  console.log(
    `${over ? 'FAIL' : 'ok  '} ${scenario.name}: ${kb(gzip)} gzip (limit ${kb(scenario.gzipLimit)}), ` +
      `${kb(brotli)} brotli, ${kb(code.length)} raw`
  );
}

if (failed) {
  console.error('\nBundle size budget exceeded.');
  process.exit(1);
}
