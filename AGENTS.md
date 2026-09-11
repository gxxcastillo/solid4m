> [!NOTE]
> **Agent working memory:** Read [`.agents/README.md`](.agents/README.md) before
> non-trivial work — coding or not — and keep it current as you go. It holds private
> working state; it does not replace the project's designated shared sources of truth.

# solid-forms — agent instructions

Typed, reactive forms for SolidJS. pnpm + moon monorepo. `@gxxc/solid-forms`
(`packages/solid-forms`) is the only published package; everything else is
private and bundled into it at build time.

## Conventions

**Keep private working notes out of public artifacts.** This repo is public and
published to npm. Never quote private working notes verbatim into commit
messages, changesets, or the docs site. A constraint future contributors must
honor should be distilled into code comments, tests, or `apps/docs` instead.

**Comments explain why, especially why-not.** This codebase's comments are load
bearing — see `FormState.ts`'s note on why `generation` must be store-scoped, or
`constraintConfigs.ts`'s note on stripping `g`/`y` regex flags. Match that
density and register. Do not add comments that restate the code.

**Verify empirically before diagnosing.** Several past bugs were misdiagnosed
from reading alone and only became clear from a minimal repro against a real
`createFormStore`. Mocked `state.getField` in particular cannot expose ordering
bugs in the real store's generation counter.

**Add a changeset** with every change to a published package (`pnpm changeset`).

## Verification baseline

Run under Node 22.12.0 (`mise install`, or `nvm use` via `.nvmrc`):

```bash
pnpm moon :types :lint :test :coverage :build :a11y
```

All six must pass before work is considered done. `:a11y` runs Playwright + axe
against `apps/a11y` and needs Chromium installed.

**moon's local task cache can desync from reality.** If you `rm -rf` a package's
`dist/` without clearing `.moon/cache`, moon keeps reporting a stale cached
success. If typecheck or build output looks inconsistent with the source,
`rm -rf .moon/cache` and re-run from a full `pnpm moon :build` before concluding
there is a real bug.

`packages/*/dist/` holds two declaration outputs that can silently disagree:
`tsc --build` (the `:types` task) emits per-file, while `vite build` (the
`:build` task) produces the bundled `index.d.ts` that `package.json`'s
`exports.types` actually points at. Run `:build` too before trusting a
facade-level type check.

## Testing notes

`renderToString` from `solid-js/web` does not reliably execute the component
tree under Vitest here — it hits solid's "not supported in the browser" guard
even in a `node` environment. See `packages/fields/src/ssr.test.tsx` for the
tolerant pattern, and prefer invoking JSX inside `createRoot` (see
`packages/state/src/FormContext.test.tsx`) to exercise context propagation.

Tests in `packages/fields` cannot import `@gxxc/solid-forms-form` (the
dependency runs the other way). Put cross-package integration tests in
`packages/solid-forms`, which depends on both.
