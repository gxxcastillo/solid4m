# solid-forms — agent instructions

Typed, reactive forms for SolidJS. pnpm + moon monorepo. `@gxxc/solid-forms`
(`packages/solid-forms`) is the only published package; everything else is
private and bundled into it at build time.

## `.agents/` — the engineering journal

`.agents/` holds the long-form engineering history of this project:

- `current-state.md` — what has shipped, in what order, and **why each decision
  was made**: the empirical repro behind a fix, the alternative that was
  rejected, and the reasoning. Several entries record multiple review passes
  where a later pass found an earlier fix incomplete.
- `strategic-backlog.md` — feature-level gaps and differentiators, each
  self-contained with file evidence, approach, and acceptance notes. Status
  markers: `OPEN`, `IN PROGRESS`, `DONE`, `WONT`.

**Read both before starting non-trivial work.** They routinely explain why the
obvious approach was already tried and abandoned, which is not recoverable from
the code or the git history.

**`.agents/` is deliberately gitignored (`.gitignore:8`) and must stay that
way.** This repo is public and published to npm; the journal is candid internal
engineering notes — rejected designs, bugs found in our own prior fixes, blunt
assessments — written for the maintainer and for agents, not for users or
contributors. Do not `git add -f` it, do not move its content into tracked
files, and do not quote it verbatim into commit messages, changesets, or the
docs site. Anything users need belongs in `apps/docs` instead.

Because it is untracked, it exists in exactly one place and is not backed up by
git. Treat it as precious: append to it, don't rewrite history out of it.

**Update it as part of finishing a task**, not as an afterthought — a new dated
section in `current-state.md` describing what changed and why, and a status flip
in `strategic-backlog.md` for any tracked item the work touched.

## Conventions

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
