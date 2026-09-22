---
'solid4m': minor
---

**`@gxxc/solid-forms` is now `solid4m`.** This is the first release under the
new name. `0.2.0` and earlier were published as `@gxxc/solid-forms`, which
receives no further releases.

**Migrating from `@gxxc/solid-forms` 0.2.** Replace the package:

```sh
npm uninstall @gxxc/solid-forms
npm install solid4m
```

Then swap the import prefix. The stylesheet and theme subpaths keep their
names:

```ts
// Before
import { Form, InputField } from '@gxxc/solid-forms';
import '@gxxc/solid-forms/styles.css';
import '@gxxc/solid-forms/themes/midnight.css';

// After
import { Form, InputField } from 'solid4m';
import 'solid4m/styles.css';
import 'solid4m/themes/midnight.css';
```

CSS class names, `--sf-*` tokens, and `data-sf-theme` keep their `sf-` prefix,
so custom themes need no renaming.
