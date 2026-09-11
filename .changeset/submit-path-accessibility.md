---
'@gxxc/solid-forms': minor
---

Make an invalid form submittable, and make the failure explain itself.

`SubmitButton` no longer disables itself when the form is invalid — it now marks
itself unavailable only while a submit is in flight. Submitting an invalid form reveals
every field's errors and moves focus to the first invalid field, instead of
leaving the user with a dead button and no explanation. This follows current
form-accessibility guidance (GOV.UK Design System, NN/g): a disabled button
leaves the tab order entirely, so assistive-technology users may never discover
it exists, and it gives no way to find out what is missing. Pass `isDisabled`
when the action really is unavailable; that prop still renders a real `disabled`
attribute, and a hard-disabled button gets no in-flight treatment layered on top.
`isDisabled` is read as a value rather than as a presence, so the idiomatic
`isDisabled={!termsAccepted()}` behaves exactly like an absent prop while it
reads `false` — spinner and `aria-disabled` included.

The in-flight state is now `aria-disabled` rather than `disabled`, for the same
tab-order reason applied to the moment it actually bites: the user who pressed
the button is focused on it, and disabling a focused element removes it from the
tab order, so the browser resets focus to `<body>` and nothing restores it when
the submit settles — a keyboard or screen-reader user is silently returned to the
top of the document mid-submit. `aria-disabled` conveys the same unavailability
while keeping focus and tab position. Because it is advisory rather than
enforced, `SubmitButton` blocks the activation itself, which also covers
`variant='approve'` — its `type='button'` never reaches the form's own re-entry
guard. Styling keys off `[aria-disabled='true']` alongside `:disabled`, so a
custom theme that targets `:disabled` for the in-flight look needs updating.

Three fixes were required to make that path actually work, each a bug in its own
right that the disabled button had been hiding:

- **Forms now set `noValidate`.** Constraint props (`required`, `minLength`,
  `pattern`, …) render as real HTML attributes, so the browser's own interactive
  validation was intercepting the click and showing a native bubble — the submit
  event never fired, and none of this library's validation, error gating, or
  focus management ran. The attributes remain on the elements, so `required`
  still maps to `aria-required` for assistive technology.
- **`minLength`/`maxLength` no longer fail empty values.** An optional
  `maxLength` field reported "is too long" while untouched, which made a pristine
  form invalid on load and silently blocked submission with nothing rendered to
  explain it. Emptiness is now `required`'s concern, matching how `pattern` and
  `min`/`max` already behaved.
- **`minLength`/`maxLength` no longer fail non-string values.** A field with a
  custom `parse` (to a number, or to an array for a multi-select) could never
  satisfy either bound. Numbers are measured by their digits and arrays by their
  item count.

**`SubmitButton` shows a spinner while a submit is in flight.** Dimming alone
read as "disabled", not "working". The spinner is positioned inside the button's
existing inline padding rather than added as a flex child, so the button neither
changes size nor re-centers its label mid-submit — no layout shift under the
cursor of a user who is waiting. It is `aria-hidden` (the live region below does
the announcing, and a spinner in the accessible name would break
`getByRole('button', { name })` during a submit), inherits `currentColor` so
custom themes and the `approve` variant get a matching spinner for free, and
collapses to a static dot under `prefers-reduced-motion`.

The spinner is scoped to the button that was actually pressed. `isProcessing` is
form-level, so a form with several submit buttons ("Sign up" / "Save draft") spun
all of them at once, claiming several actions were running when one was. Only the
spinner is scoped: every submit button keeps `aria-disabled`, because a second
submit genuinely is unavailable while the first is in flight. When no button
initiated the work — a caller-declared `<Form isProcessing>`, or a programmatic
submit — every submit button shows the spinner, since there is no single action
to attribute it to.

Each `SubmitButton` carries a `data-sf-submitter` token so the form can tell
which one was pressed. It is deliberately not keyed on `name`: `name` already
selects the handler from an object-style `onSubmit` map and is handed to your
handler as `buttonName`, so a generated value would leak into your code — and it
cannot identify a button anyway, since it is optional and several unnamed submit
buttons all report `''`.

**A submit discarded for stale values now says so.** With a `schema`, editing a
field while async validation is in flight causes the result to be discarded — it
describes values the form no longer holds. That was correct but silent: the
button un-dimmed and nothing else happened, so the submit appeared to simply not
work. `form.state.errors` now reports *The form changed while it was being
submitted. Please submit again.*

**An in-flight submit is now announced.** Keeping focus on the submit button
fixes a loss but adds no signal: the dimmed button is visual only, so a screen
reader user pressed submit and heard nothing at all until it settled. The form
now renders a screen-reader-only polite live region carrying `Submitting…` while
a submit is pending. Reword it with the new `processingLabel` prop on `Form`
(`processingLabel='Signing in…'`) when that is not the action, or pass `''` to
stay silent. It is polite rather than assertive so it waits its turn instead of
interrupting — errors remain assertive — and it is deliberately not `aria-busy`
on the form, which would tell assistive tech to withhold live-region updates and
suppress the very announcements this adds.

Form-level errors are now rendered into an always-present
`aria-live="assertive"` region so they are announced when they appear, and
`InputField` no longer renders an empty context container when no `context` prop
is supplied. Because that region is a permanent flex child of the form, its empty
state cancels the one `--sf-field-gap` the form's `gap` would otherwise reserve
for it, so an errorless form keeps its previous spacing.

The focus walk skips any invalid field that cannot actually take focus, not just
`disabled` ones — a field inside a collapsed section or a `display: none` branch
accepts `focus()` and silently ignores it, which would have stranded the user on
the submit button.

**`type='email'` and `type='url'` are now format-checked by this library**, which
keeps `noValidate` from costing anything. Those checks previously came from the
browser, derived from the input type alone, and `noValidate` turned them off
along with the interactive validation it was added to suppress — leaving a
malformed address to submit clean with no error anywhere. They are back with no
API change: the `type` attribute you already write is what drives them, so
`<InputField type='email' required />` validates format again exactly as before.

Both implement the HTML specification rather than an approximation, and were
verified case-by-case against Chromium's own `validity.typeMismatch`, so they
accept and reject precisely what a browser does — including `a@b` (valid; the
spec has no TLD requirement) and `example.com` (not a valid `type='url'` value,
which requires an absolute URL). Messages are `"Email" must be a valid email
address` and `"Website" must be a valid URL`. As with every other constraint, an
empty value is left to `required`.

`type='number'` deliberately gets no such check: a number input's value
sanitization already reads non-numeric text back as `''` before this library sees
it, so `noValidate` never affected it and `required` covers the empty result. A
`multiple` email input's comma-separated list is not supported — use a custom
`validator`.

**An unresolvable submit now says so.** A form whose `onSubmit` is a map of
several handlers, submitted by a button with no `name` (or a name matching none
of the keys), previously did nothing at all — no handler, no error, no visible
change, from a button that looked like it worked. It now logs a console warning
naming the available handlers and how to select one. Unchanged otherwise: a
single-handler map still resolves without a name.
