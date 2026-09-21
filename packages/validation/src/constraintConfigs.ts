import { type StringKeyOf } from 'type-fest';

import { type FormState } from '@gxxc/solid4m-state';

import { type ConstraintConfigs, type ConstraintName } from './types';

const PATTERN_CACHE_LIMIT = 100;
const patternCache = new Map<string, RegExp>();

function getCompiledPattern(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) {
    // Drop the stateful global/sticky flags: RegExp.test() advances lastIndex on
    // g/y patterns, which makes validation of the same value flip-flop between
    // calls when the RegExp instance is reused across renders.
    if (pattern.global || pattern.sticky) {
      return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    }
    return pattern;
  }
  let re = patternCache.get(pattern);
  if (!re) {
    re = new RegExp(pattern);
    // Keep the cache bounded — evict the oldest entry (Map preserves insertion
    // order) so an app with many distinct patterns can't grow it without limit.
    if (patternCache.size >= PATTERN_CACHE_LIMIT) {
      const oldest = patternCache.keys().next().value;
      if (oldest !== undefined) patternCache.delete(oldest);
    }
    patternCache.set(pattern, re);
  }
  return re;
}

// Measure a field value for the `minLength`/`maxLength` constraints. Strings
// and arrays measure directly; a number measures the digits of its *parsed*
// form, so a field with a custom `parse` is bounded rather than failing outright
// for not being a string. Note that parsing is lossy for this purpose — a
// leading-zero zip code (`01234` -> 1234) measures 4, and a negative number
// counts its sign — so a field where the typed text is what must be bounded
// should keep the default string `parse` and bound that.  Empty and
// unmeasurable values yield `undefined` (the constraint is skipped) — emptiness
// is `required`'s concern, the same way `pattern` and `min`/`max` already treat
// it. Without this, an optional `maxLength` field was invalid from the moment it
// mounted (an undefined value is not a string, so the old `typeof val ===
// 'string'` guard reported "too long" for an empty field), which silently
// blocked submission of a form the user had no way to fix.
function toLength(val: unknown): number | undefined {
  if (typeof val === 'string') return val === '' ? undefined : val.length;
  if (Array.isArray(val)) return val.length === 0 ? undefined : val.length;
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val).length;
  return undefined;
}

// Coerce a field value to a number for the numeric `min`/`max` constraints.
// Field values are strings by default (the raw DOM value) and only become
// numbers when a custom `parse` is supplied, so both shapes must be accepted.
// Empty and non-numeric values yield `undefined` (the constraint is skipped) —
// emptiness is `required`'s concern, not `min`/`max`'s.
function toNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return Number.isNaN(val) ? undefined : val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

// The HTML spec's normative "valid e-mail address" production, copied verbatim.
// Using the spec's own regex rather than a hand-rolled one is the entire point:
// this exists to reproduce what the browser used to check, so agreeing with the
// browser on the awkward cases matters more than agreeing with anyone's
// intuition about email addresses — including `a@b`, which is valid, and a
// leading/trailing/doubled dot in the local part (`.user@example.com`), which
// this production also accepts even though RFC 5322 would not. That looseness
// is the spec's, not a bug in this copy: verified against real Chromium
// `type='email'` input validation, which accepts it too.
const VALID_EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// `type` is checked per-type rather than as a single validator because only two
// input types carry a format the browser enforced for us. Everything else —
// `text`, `checkbox`, `tel`, `date`, … — passes, so this stays inert for the
// fields that never had type-derived validation in the first place.
//
// Deliberately absent: `number`. It looks like the obvious third case, but the
// browser's rejection of non-numeric text in a number input is the *value
// sanitization* algorithm, not validation — `input.value` reads back as `''`,
// verified in Chromium — so `noValidate` never disabled it and `required`
// already covers what reaches us. A `type='number'` check here would be
// unreachable code pretending to close a gap that does not exist.
const TYPE_FORMATS: Record<string, { test: (val: string) => boolean; expected: string }> = {
  email: {
    // A `multiple` email input accepts a comma-separated list; we cannot see
    // that attribute from here (constraints receive only their own value), so a
    // list is rejected the way a plain `type='email'` input rejects it. Use a
    // custom `validator` for the `multiple` case.
    test: (val) => VALID_EMAIL.test(val),
    expected: 'a valid email address'
  },
  url: {
    // Matches the browser: `type='url'` requires an *absolute* URL, which is
    // exactly the set `new URL()` parses without a base. `example.com` fails
    // here for the same reason it fails a real url input. Not `URL.canParse` —
    // it would raise this library's browser baseline to Chrome 120 / Safari 17
    // for a check `try`/`catch` performs identically everywhere.
    test: (val) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    },
    expected: 'a valid URL'
  }
};

// `type` is a free-form string off the field's own props, so a bare table
// lookup would resolve `type='constructor'`/`'toString'` to an inherited
// Object.prototype member — truthy, so it slips past a `!format`/`!scale`
// guard and then throws on the assumed shape, taking that field's validation
// (and every keystroke after it) down with it. The `typeof key === 'string'`
// half means a caller can pass the constraint's raw, not-yet-narrowed value
// straight through rather than narrowing it first — shared by both of this
// file's string-keyed constraint tables (`TYPE_FORMATS`, `STEP_SCALES`).
function safeLookup<T>(table: Record<string, T>, key: unknown): T | undefined {
  return typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 604_800_000;

// The spec's "valid floating-point number" production, which is deliberately
// stricter than `Number()`: `5.`, `0x10`, `Infinity` and ` 5 ` are all things
// `Number()` accepts and a number input does not.
const VALID_FLOAT = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/;

function parseSpecNumber(val: string): number | undefined {
  if (!VALID_FLOAT.test(val)) return undefined;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// `Date.UTC` is unusable here on two counts: it maps years 0-99 onto 1900-1999,
// and it silently rolls overflowing components over — `Date.UTC(2026, 1, 30)` is
// March 2nd, not an error — so an impossible date would be step-checked as if it
// were a real one. Building the date and reading the components back catches
// both.
function utcMs(year: number, month: number, day: number, timeMs = 0): number | undefined {
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }
  return date.getTime() + timeMs;
}

const DATE_RE = /^(\d{4,})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4,})-(\d{2})$/;
const WEEK_RE = /^(\d{4,})-W(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/;
const DATETIME_LOCAL_RE = /^(\d{4,})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)$/;

function parseDate(val: string): number | undefined {
  const parts = DATE_RE.exec(val);
  return parts ? utcMs(Number(parts[1]), Number(parts[2]), Number(parts[3])) : undefined;
}

// Months, not milliseconds. The spec measures a month input in months since
// January 1970 precisely so that `step={3}` means "quarterly" rather than
// "every 90-ish days", which is what a millisecond scale would give.
function parseMonth(val: string): number | undefined {
  const parts = MONTH_RE.exec(val);
  if (!parts) return undefined;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  if (year < 1 || month < 1 || month > 12) return undefined;
  return (year - 1970) * 12 + (month - 1);
}

// ISO-8601 week numbering, where week 1 is the week containing January 4th and
// weeks start on Monday. Anchoring on January 1st instead misnumbers every year
// that starts on a Friday, Saturday or Sunday.
function weeksInIsoYear(year: number): number {
  const jan1 = utcMs(year, 1, 1);
  const dec31 = utcMs(year, 12, 31);
  if (jan1 === undefined || dec31 === undefined) return 52;
  // A year has 53 ISO weeks exactly when it starts or ends on a Thursday.
  return new Date(jan1).getUTCDay() === 4 || new Date(dec31).getUTCDay() === 4 ? 53 : 52;
}

function parseWeek(val: string): number | undefined {
  const parts = WEEK_RE.exec(val);
  if (!parts) return undefined;
  const year = Number(parts[1]);
  const week = Number(parts[2]);
  if (year < 1 || week < 1 || week > weeksInIsoYear(year)) return undefined;
  const jan4 = utcMs(year, 1, 4);
  if (jan4 === undefined) return undefined;
  // getUTCDay() puts Sunday at 0; ISO puts Monday at 1 and Sunday at 7.
  const isoDayOfWeek = new Date(jan4).getUTCDay() || 7;
  return jan4 - (isoDayOfWeek - 1) * MS_PER_DAY + (week - 1) * MS_PER_WEEK;
}

function parseTime(val: string): number | undefined {
  const parts = TIME_RE.exec(val);
  if (!parts) return undefined;
  const hours = Number(parts[1]);
  const minutes = Number(parts[2]);
  const seconds = parts[3] === undefined ? 0 : Number(parts[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return undefined;
  // The fraction is a decimal, so it pads on the *right*: '.5' is 500ms, not 5.
  const millis = parts[4] === undefined ? 0 : Number(parts[4].padEnd(3, '0'));
  return hours * MS_PER_HOUR + minutes * MS_PER_MINUTE + seconds * MS_PER_SECOND + millis;
}

function parseDateTimeLocal(val: string): number | undefined {
  const parts = DATETIME_LOCAL_RE.exec(val);
  if (!parts) return undefined;
  const timeMs = parseTime(parts[4]);
  if (timeMs === undefined) return undefined;
  return utcMs(Number(parts[1]), Number(parts[2]), Number(parts[3]), timeMs);
}

// Everything the spec's step machinery needs, per input type. `step` cannot be
// checked without this table: `step={1}` is one unit on a number input, one
// *day* on a date, one *month* on a month, and one *second* on a time, and the
// ladder each counts from differs too.
type StepScale = {
  // The spec's "convert string to number" algorithm for this type. Strict on
  // purpose — see the `validate` note on why an unparseable value must skip the
  // constraint rather than fail it.
  toNumber: (val: string) => number | undefined;
  // What one unit of `step` is worth in the units `toNumber` returns.
  scaleFactor: number;
  // Used when `step` is present but not a positive number, per spec.
  defaultStep: number;
  // Where the ladder starts when `min` does not move it.
  defaultBase: number;
  // Names the scale factor in the error message. Absent for the bare-number
  // types, where `step` is counted in the field's own units and needs no noun.
  unit?: string;
};

// Deliberately absent: `range`. It looks like the obvious second entry — it has
// an allowed value step and honours the attribute — but a range input's value
// sanitization *snaps* to the nearest step instead of leaving a mismatch to
// report, so `validity.stepMismatch` is unreachable on one. Confirmed in the
// recorded table rather than assumed: value 7 against `step=5` reads back as 5,
// mismatch false. Checking it here would raise an error against a value the
// slider will not let the user reach and cannot display.
const STEP_SCALES: Record<string, StepScale> = {
  number: { toNumber: parseSpecNumber, scaleFactor: 1, defaultStep: 1, defaultBase: 0 },
  date: { toNumber: parseDate, scaleFactor: MS_PER_DAY, defaultStep: 1, defaultBase: 0, unit: 'days' },
  month: { toNumber: parseMonth, scaleFactor: 1, defaultStep: 1, defaultBase: 0, unit: 'months' },
  week: {
    toNumber: parseWeek,
    scaleFactor: MS_PER_WEEK,
    defaultStep: 1,
    // 1970-01-01 was a Thursday, so the Monday of the week containing the epoch
    // is three days earlier. The spec hardcodes that offset as week's default
    // step base; without it every `type='week'` step would count from a Thursday
    // and never line up with a real week boundary.
    defaultBase: -259_200_000,
    unit: 'weeks'
  },
  time: { toNumber: parseTime, scaleFactor: MS_PER_SECOND, defaultStep: 60, defaultBase: 0, unit: 'seconds' },
  'datetime-local': {
    toNumber: parseDateTimeLocal,
    scaleFactor: MS_PER_SECOND,
    defaultStep: 60,
    defaultBase: 0,
    unit: 'seconds'
  }
};

// The step amount as written by the caller, in the field's own units (a date's
// `step={7}` is 7, not 7 days-in-milliseconds) — `undefined` when `step` isn't
// a usable positive number. Shared by `resolveAllowedStep` (which still has to
// scale this) and `step.message` (which must not: it displays this amount
// verbatim), so a numeric-string `step` resolves identically in both instead
// of `message` re-deriving it with a narrower `typeof step === 'number'` check
// that silently fell back to the default step for `step='5'`.
function parseStepAmount(step: unknown): number | undefined {
  const parsed =
    typeof step === 'number' ? step : typeof step === 'string' ? parseSpecNumber(step.trim()) : undefined;
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

// The allowed value step, in the units `StepScale.toNumber` returns, or
// `undefined` when the spec says there is no step to check.
function resolveAllowedStep(step: unknown, scale: StepScale): number | undefined {
  // `'any'` is the spec's own opt-out, and the only value that disables the
  // check outright.
  if (typeof step === 'string' && step.trim().toLowerCase() === 'any') return undefined;

  // An unparseable or non-positive step falls back to the type's default step
  // rather than disabling the check, per spec — `step={0}` on a number input
  // still rejects 1.5, exactly as a browser does.
  const stepValue = parseStepAmount(step) ?? scale.defaultStep;
  return stepValue * scale.scaleFactor;
}

// Where the ladder starts. `min` moves it, which is why `min={1} step={2}`
// allows 1, 3, 5 rather than 0, 2, 4.
//
// The spec has a third source in between: with `min` absent, a browser falls
// back to the *value content attribute*, re-anchoring the ladder on whatever the
// input was initialized with. That is deliberately not reproduced. It would make
// the same constraint accept different values depending on where the field
// started — indistinguishable from a bug at the moment it bites — and it has no
// clean analogue here, where the initial value is a `defaultValue` prop that is
// not a rendered attribute. Anchor with `min` instead, which is explicit.
function resolveStepBase(min: unknown, scale: StepScale): number {
  if (typeof min === 'number' && Number.isFinite(min)) return min;
  // A date/time `min` arrives as its DOM string ('2026-01-01'), so it converts
  // through the same algorithm as the value it anchors.
  if (typeof min === 'string' && min !== '') {
    const parsed = scale.toNumber(min);
    if (parsed !== undefined) return parsed;
  }
  return scale.defaultBase;
}

// Range bounds and values have to be measured by the same algorithm. A date
// string is not a JavaScript number, and Number('2026-01-01') is NaN; using the
// field type's converter is what makes `min='2026-01-01'` mean the same thing
// to validation and the native control. Numeric date/time values are not DOM
// value formats, so browsers ignore them as bounds and validation must too.
// `scale.unit` is already the date/time discriminator (see `StepScale` above,
// which leaves it absent only for the bare-number scale) — types without a
// scale, and `number`'s scale, both keep the long-standing numeric behavior.
function toComparableValue(value: unknown, type: unknown): number | undefined {
  const scale = safeLookup(STEP_SCALES, type);
  if (scale?.unit === undefined) return toNumber(value);
  return typeof value === 'string' && value !== '' ? scale.toNumber(value) : undefined;
}

// Counts the decimal places of a number as written, including when JS writes it
// in exponent form (1e-7 has seven, not zero).
function decimalPlaces(n: number): number {
  const text = String(n);
  const exponentAt = text.indexOf('e');
  if (exponentAt === -1) {
    const dotAt = text.indexOf('.');
    return dotAt === -1 ? 0 : text.length - dotAt - 1;
  }
  const mantissa = text.slice(0, exponentAt);
  const dotAt = mantissa.indexOf('.');
  const mantissaPlaces = dotAt === -1 ? 0 : mantissa.length - dotAt - 1;
  return Math.max(0, mantissaPlaces - Number(text.slice(exponentAt + 1)));
}

// `(value - base) % step === 0` is wrong in binary floating point for exactly
// the steps people actually write: 0.3 divided by a step of 0.1 is
// 2.9999999999999996, so a price field with `step={0.1}` would reject 0.30.
// Chromium runs its step check in arbitrary-precision decimal for this reason.
// Scaling every operand by the largest decimal place among them and comparing as
// integers reproduces that exactly, for any value a form field realistically
// holds.
function isStepAligned(value: number, base: number, step: number): boolean {
  const scale = 10 ** Math.max(decimalPlaces(value), decimalPlaces(base), decimalPlaces(step));
  const scaledValue = Math.round(value * scale);
  const scaledBase = Math.round(base * scale);
  const scaledStep = Math.round(step * scale);
  const offset = scaledValue - scaledBase;

  if (
    scaledStep !== 0 &&
    Number.isSafeInteger(scaledValue) &&
    Number.isSafeInteger(scaledBase) &&
    Number.isSafeInteger(scaledStep) &&
    Number.isSafeInteger(offset)
  ) {
    return offset % scaledStep === 0;
  }

  // Past 2^53 the integer comparison stops being exact, so fall back to a
  // tolerance and err toward valid: a validator that cannot establish a
  // violation must not invent one.
  const ratio = (value - base) / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9;
}

export const constraintConfigs: ConstraintConfigs = {
  match: {
    validate: <M extends object>(val: unknown, matchFieldName: unknown, formState: FormState<M>) => {
      if (typeof matchFieldName !== 'string') return true;
      const name = matchFieldName as StringKeyOf<M>;
      if (!formState.hasFieldBeenInitialized(name)) return true;
      return val === formState.getFieldValue(name);
    },
    message: <M extends object>(fieldName: string, matchFieldName: unknown, formState: FormState<M>) => {
      const matchLabel =
        (typeof matchFieldName === 'string' && formState.getField(matchFieldName as StringKeyOf<M>)?.label) ||
        String(matchFieldName);
      return `"${fieldName}" does not match "${matchLabel}"`;
    }
  },

  required: {
    // `false` is an unsatisfied value (an unchecked required checkbox), not a
    // present one, so it must fail alongside `undefined`/`null`/`''`.
    validate: (val) => (Array.isArray(val) ? val.length > 0 : val != null && val !== '' && val !== false),
    message: (fieldName) => `"${fieldName}" is required`
  },

  pattern: {
    validate: (val, pattern) => {
      if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) return false;
      // Emptiness is `required`'s concern; an absent value can't violate a pattern.
      if (val === undefined || val === null || val === '') return true;
      // Anything without a meaningful textual form (an object, an array, a
      // File) is unmeasurable the same way `toLength` treats it, and skipped
      // rather than stringified to the useless "[object Object]".
      if (typeof val !== 'string' && typeof val !== 'number') return true;
      return getCompiledPattern(pattern).test(String(val));
    },
    message: (fieldName) => `"${fieldName}" is invalid`
  },

  minLength: {
    validate: (val, minLength) => {
      if (typeof minLength !== 'number') return true;
      const length = toLength(val);
      return length === undefined || length >= minLength;
    },
    message: (fieldName) => `"${fieldName}" is too short`
  },

  maxLength: {
    validate: (val, maxLength) => {
      if (typeof maxLength !== 'number') return true;
      const length = toLength(val);
      return length === undefined || length <= maxLength;
    },
    message: (fieldName) => `"${fieldName}" is too long`
  },

  min: {
    validate: (val, min, _formState, siblings) => {
      const value = toComparableValue(val, siblings.type);
      const bound = toComparableValue(min, siblings.type);
      return value === undefined || bound === undefined || value >= bound;
    },
    message: (fieldName: string) => `"${fieldName}" is too small`
  },

  max: {
    validate: (val, max, _formState, siblings) => {
      const value = toComparableValue(val, siblings.type);
      const bound = toComparableValue(max, siblings.type);
      return value === undefined || bound === undefined || value <= bound;
    },
    message: (fieldName: string) => `"${fieldName}" is too large`
  },

  // The other half of what `noValidate` turned off. `step` renders as a real
  // HTML attribute — it still drives the spinner arrows and the native picker —
  // but nothing validated it, so `<InputField type='number' min={0} step={5} />`
  // accepted 7 where the browser had reported a `stepMismatch`.
  //
  // Scope note: an *absent* `step` is not checked, and that is a deliberate
  // deviation from the browser. A bare `<input type='number'>` has a default
  // step of 1, so a browser rejects 19.99 in a price field that never opted in.
  // Reproducing that would invalidate every decimal number field in every
  // existing consumer form at once, to enforce the single most complained-about
  // wart of `type='number'`. Writing `step` is the opt-in; `step='any'` is the
  // opt-out for a field that renders the attribute but wants no checking.
  step: {
    validate: (val, step, _formState, siblings) => {
      const scale = safeLookup(STEP_SCALES, siblings.type);
      // No type, or a type with no allowed value step (text, email, checkbox…):
      // the attribute renders and means nothing, exactly as in a browser.
      if (!scale) return true;

      const allowedStep = resolveAllowedStep(step, scale);
      if (allowedStep === undefined) return true;

      // Emptiness is `required`'s concern, consistent with every constraint here.
      if (val === undefined || val === null || val === '') return true;

      // A number arrives already in the units the scale counts in — that is what
      // a custom `parse` produces. A string converts from its DOM value, same as
      // `toComparableValue`. Anything else has no step to be off of.
      const value = typeof val === 'number' ? val : typeof val === 'string' ? scale.toNumber(val) : undefined;
      // A value this type cannot parse is not a step mismatch. The browser's
      // value sanitization discards it before validity is ever consulted, so
      // reporting one here would invent an error the browser never showed — and
      // would fire on every keystroke of a half-typed date.
      if (value === undefined || !Number.isFinite(value)) return true;

      return isStepAligned(value, resolveStepBase(siblings.min, scale), allowedStep);
    },
    message: (fieldName, step, _formState, siblings) => {
      const scale = safeLookup(STEP_SCALES, siblings.type);
      const amount = parseStepAmount(step) ?? scale?.defaultStep ?? 1;
      // The unit appears only for the types where `step` is not counted in the
      // field's own units: `step={7}` on a date is seven *days*, and a message
      // that said just "7" would read as seven of whatever the user typed.
      return `"${fieldName}" must be in increments of ${amount}${scale?.unit ? ` ${scale.unit}` : ''}`;
    }
  },

  // Restores the format checking that `noValidate` turned off. Constraint props
  // render as real HTML attributes, so before `noValidate` the browser was
  // silently doing this for `type='email'` and `type='url'` — and when
  // `noValidate` landed to stop native validation from swallowing the submit
  // event, that went with it, leaving no error anywhere for a value the browser
  // had previously rejected. This is not a new feature; it is the half of the
  // browser's behavior worth keeping, reimplemented so it survives.
  type: {
    validate: (val, type) => {
      const format = safeLookup(TYPE_FORMATS, type);
      if (!format) return true;
      // Emptiness is `required`'s concern, consistent with every other
      // constraint here — an absent value has no format to be wrong about.
      if (val === undefined || val === null || val === '') return true;
      // Same as `pattern`: nothing without a meaningful textual form has a
      // format to be wrong about either.
      if (typeof val !== 'string' && typeof val !== 'number') return true;
      return format.test(String(val));
    },
    message: (fieldName, type) => {
      const format = safeLookup(TYPE_FORMATS, type);
      // Unreachable via validate() (an unknown type never fails), but message is
      // part of the public ConstraintConfig shape and callable on its own.
      return `"${fieldName}" must be ${format?.expected ?? 'valid'}`;
    }
  }
} as const;

export const constraintNames = Object.keys(constraintConfigs) as ConstraintName[];
