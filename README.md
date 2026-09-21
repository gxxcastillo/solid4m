# solid4m

Typed, reactive forms for SolidJS.

**Documentation:** https://gxxcastillo.github.io/solid4m/

---

## Development

### Setup

Requires Node 22.12.0 and pnpm 9.7.0.

Recommended with [mise](https://mise.jdx.dev/):

```bash
mise install
corepack enable
pnpm install
```

The repo also keeps `.nvmrc` for compatibility:

```bash
nvm use          # reads .nvmrc → Node 22.12.0
corepack enable
pnpm install
```

### Common tasks

```bash
pnpm moon :build    # build all packages
pnpm moon :test     # run all tests
pnpm moon :types    # typecheck all packages
pnpm moon :lint     # lint all packages (reports only)
pnpm lint:fix       # lint and apply auto-fixes

# target a single project
pnpm moon state:test
pnpm moon docs:dev

# everything CI runs before packing
pnpm moon :types :lint :test :coverage :build :a11y

# what a consumer ships, minified + gzipped, against budgets (after a build)
node packages/solid4m/scripts/check-bundle-size.mjs

# pack the real tarball, install it outside the workspace, then
# type-check, server-render, and hydrate it in Chromium
cd verify-tarball && node run.mjs
```

### Run the docs site (includes the live demo)

```bash
pnpm moon docs:dev
```

---

## Contributing

### Changesets

Add a changeset with every PR that touches a published package:

```bash
pnpm changeset
```

### Release workflow

```bash
pnpm bump          # bump package versions based on changesets
pnpm run publish   # build, pack, and publish solid4m
```

pnpm uses `publishConfig.exports` in `packages/solid4m/package.json` to strip the `development` export condition from the published tarball. Internal workspace packages are listed only in `devDependencies` and are bundled into the two compiled entries (`dist/index.js` for the browser, `dist/server/index.js` for server rendering) and the single bundled `dist/index.d.ts` at build time, so they do not appear as runtime dependencies.

---

## Monorepo structure

| Path                       | Package                            | Description                                                                                                  |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `packages/solid4m` | `solid4m`                  | Public facade — re-exports the full API                                                                      |
| `packages/state`           | `@gxxc/solid4m-state`      | Form store, context, and field mutations                                                                     |
| `packages/form`            | `@gxxc/solid4m-form`       | `Form`, `useForm`, submit pipeline                                                                           |
| `packages/fields`          | `@gxxc/solid4m-fields`     | Field components, `SubmitButton`, `FieldArray`/`useFieldArray`, `createFields`                               |
| `packages/validation`      | `@gxxc/solid4m-validation` | Built-in constraint validation                                                                               |
| `packages/examples`        | —                                  | Example components, also used as the docs demos                                                              |
| `apps/docs`                | —                                  | Astro docs site with live demos                                                                              |
| `apps/a11y`                | —                                  | Playwright + axe accessibility checks in real Chromium                                                       |
| `verify-tarball`           | —                                  | Packed-tarball consumer check (outside the pnpm workspace)                                                   |
