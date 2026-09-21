---
'solid4m': minor
---

Forms now server-render; SolidStart is supported.

**`0.2.0` could not SSR.** The published bundle only externalized the bare
`solid-js` specifier, so `solid-js/web` and `solid-js/store` were inlined into
`dist/index.js` along with a client-only DOM runtime that assumes `document`
exists. Any server render — `renderToString` under Node, a SolidStart page
that isn't wrapped in `clientOnly` — crashed with `document is not defined`.

The package now ships two entries instead of one: a Node/SSR entry
(`dist/server/index.js`, `generate: 'ssr'`, hydratable) resolved through the
package's `node`/`worker`/`deno` export conditions, and a browser entry
(`dist/index.js`) that is now itself hydratable, so client-side markup matches
what the server rendered instead of assuming there was no server render to
match. `solid-js`/`solid-js/web`/`solid-js/store` are all externalized.

Not included: a `solid` export condition shipping preserved (uncompiled) JSX,
which is how SolidStart-ecosystem libraries typically let the consumer's own
build choose dom/ssr/hydratable output. It needs Vite's SSR module graph to
parse Rollup's still-new native `jsx: 'preserve'` output, which the pinned
Vite version here can't do yet — tracked as follow-up, not required for SSR to
work today.
