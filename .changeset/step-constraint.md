---
'@gxxc/solid-forms': minor
---

Add a `step` constraint, closing the rest of the `noValidate` gap.

`step` renders as a real HTML attribute — it drives the spinner arrows and the
native picker — but since forms started setting `noValidate`, nothing validated
it. `<InputField type='number' min={0} step={5} />` accepted 7, where the browser
had reported a `stepMismatch`. It is now checked, alongside the `type='email'`
and `type='url'` format checks added for the same reason.

`step` is counted in the units the HTML specification defines per input type,
which are not always the units the field displays: one step is `1` on a `number`,
one **day** on a `date`, one **month** on a `month`, one **week** on a `week`,
and one **second** on `time` and `datetime-local`. So half-hourly reminders are
`<InputField type='time' step={1800} />`. `min` is the step base, which is why
`min={1} step={5}` allows 1, 6, 11 rather than multiples of 5. `step='any'`
renders the attribute with the check off.

Rather than trusting a reading of the spec, the implementation is diffed against
a recording of Chromium's own `validity.stepMismatch` across 161 cases — every
supported type, decimal steps, `min`-shifted bases, invalid and unparseable
values, and the awkward corners (`step={0}` and a negative step both fall back to
the type's default step, per spec; ISO week numbering means `2020-W53` exists and
`2026-W53` does not). The recording is committed as a test fixture, so the
comparison keeps running without a browser, and the script that produced it is in
`apps/a11y/scripts/`.

Three behaviors are deliberately not the browser's, each because matching it
would cost more than it gives:

- **An absent `step` is not checked.** A bare `<input type='number'>` has a
  default step of 1, so a browser rejects `19.99` in a price field that never
  opted in. Reproducing that would invalidate decimal number fields in every
  existing form at once, to enforce the most complained-about wart of
  `type='number'`. Writing `step` is the opt-in.
- **`range` is not checked.** A range input's value sanitization snaps to the
  nearest step rather than leaving a mismatch, so `validity.stepMismatch` is
  unreachable on one — confirmed in the recording, where 7 against `step={5}`
  reads back as 5. An error there would be one the slider cannot show and the
  user cannot reach.
- **The step base comes from `min` only.** The spec falls back to the `value`
  content attribute when `min` is absent, which re-anchors the ladder on whatever
  the field was initialized with — the same constraint then accepts different
  values depending on where it started. Anchor with `min`, which is explicit.

Unparseable values are skipped rather than failed, matching the browser, whose
value sanitization discards them before validity is consulted — so a half-typed
date does not report a step error on every keystroke. Empty values remain
`required`'s concern, as with every other constraint.

`ConstraintConfig.validate` and `.message` now receive the field's other
constraints as a fourth argument, since `step` cannot be decided from its own
value alone (it needs `type` for its units and `min` for its base). Custom
constraint configs are unaffected — the parameter is additive and optional to
use.
