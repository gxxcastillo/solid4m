---
'solid4m': minor
---

Rename the package, imports, styles, themes, documentation, and release
metadata to `solid4m`.

## Migrating from `solid-formation`

Replace the package and every import prefix:

```sh
npm uninstall solid-formation
npm install solid4m
```

```ts
// Before
import { Form, InputField } from 'solid-formation';
import 'solid-formation/styles.css';

// After
import { Form, InputField } from 'solid4m';
import 'solid4m/styles.css';
```

Theme subpaths are unchanged after the package prefix: for example,
`solid-formation/themes/midnight.css` becomes
`solid4m/themes/midnight.css`. The public API is otherwise unchanged.
