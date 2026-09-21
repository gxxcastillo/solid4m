---
'solid4m': patch
---

Declare `"sideEffects": ["**/*.css"]` in `package.json`, so bundlers that rely
on the field, such as webpack, can drop the package's JavaScript when nothing
from it is used, while keeping its stylesheets. Vite and esbuild already
tree-shake unused components without it. For reference, a login form built
from named imports (`Form`, `InputField`, `PasswordField`, `SubmitButton`) adds
about 8.4 kB of minified, gzipped JavaScript beyond solid-js itself, plus
2.5 kB of CSS.
