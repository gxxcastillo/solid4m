> [!NOTE]
> **Agent working memory:** Read [`.agents/README.md`](.agents/README.md) before
> non-trivial work — coding or not — and keep it current as you go. It holds private
> working state; it does not replace the project's designated shared sources of truth.

# solid-formation — agent instructions

Typed, reactive forms for SolidJS. pnpm + moon monorepo. `solid-formation`
(`packages/solid-formation`) is the only published package; everything else is
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

A seventh check, `verify-tarball/` (see Testing notes below), runs in CI but
is outside this moon baseline — it packs and installs the real tarball, which
none of the six tasks above do.

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

Real SSR under Vitest needs its own project: `packages/fields/vitest.ssr.config.ts`
(wired up via `vitest.workspace.ts`) sets `environment: 'node'`,
`resolve.conditions: ['node']`, and — the part that actually matters —
`ssr.noExternal: ['solid-js']`. Without `noExternal`, Vite's SSR dev pipeline
treats `solid-js` as an external Node dependency and lets Node resolve it
outside this config entirely, which can land different imports on different
builds of the package (dev vs. server, each with its own module-level state)
within the same render — `renderToString`'s hydration context then never
reaches the components that read it. See `packages/fields/src/ssr.test.tsx`.
For plain (non-SSR) context propagation, prefer invoking JSX inside
`createRoot` (see `packages/state/src/FormContext.test.tsx`).

That covers the component source; the built package's own SSR/hydration
correctness is a separate concern, covered by `verify-tarball/` at the repo
root: it packs the facade, installs the tarball outside the pnpm workspace (so
nothing resolves through a source alias, unlike `apps/docs`/`apps/a11y`), and
hydrates it in real Chromium via Playwright. Run it with
`cd verify-tarball && node run.mjs`. This is the check that would have caught
a published bundle that inlines `solid-js/web`'s DOM runtime and crashes under
SSR — it runs in CI but is not part of the `pnpm moon` baseline below.

Tests in `packages/fields` cannot import `@gxxc/solid-formation-form` (the
dependency runs the other way). Put cross-package integration tests in
`packages/solid-formation`, which depends on both.
