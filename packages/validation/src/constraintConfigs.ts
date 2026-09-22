import { type FieldPath, type FormState } from '@gxxc/solid4m-state';

import { type ConstraintConfigs, type ConstraintName } from './types';

const PATTERN_CACHE_LIMIT = 100;
const patternCache = new Map<string, RegExp>();

function getCompiledPattern(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) {
    // Strip g/y: test() advances lastIndex on those, so a RegExp reused across
    // renders flips the same value between valid and invalid.
    if (pattern.global || pattern.sticky) {
      return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
    }
    return pattern;
  }
  let re = patternCache.get(pattern);
  if (!re) {
    re = new RegExp(pattern);
    // A Map iterates in insertion order, so its first key is the oldest.
    if (patternCache.size >= PATTERN_CACHE_LIMIT) {
      const oldest = patternCache.keys().next().value;
      if (oldest !== undefined) patternCache.delete(oldest);
    }
    patternCache.set(pattern, re);
  }
  return re;
}

// `undefined` skips the constraint, for empty values (see `required`) and
// unmeasurable ones. A number measures its parsed digits, so a field with a
// custom `parse` is still bounded. That is lossy (`01234` parses to 1234, which
// measures 4; a sign counts), so to bound the typed text, keep the default `parse`.
function toLength(val: unknown): number | undefined {
  if (typeof val === 'string') return val === '' ? undefined : val.length;
  if (Array.isArray(val)) return val.length === 0 ? undefined : val.length;
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val).length;
  return undefined;
}

// Values are DOM strings unless a custom `parse` makes them numbers. `undefined`
// skips the constraint, for empty values (see `required`) and non-numeric ones.
function toNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return Number.isNaN(val) ? undefined : val;
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

// The HTML spec's "valid e-mail address" production, verbatim, so this agrees
// with the browser's own `type='email'` check on the awkward cases. It accepts
// `a@b` and a leading, trailing or doubled dot in the local part
// (`.user@example.com`), which RFC 5322 rejects; Chromium accepts them too.
const VALID_EMAIL =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// The input types whose format the browser validates; every other type passes.
// Not `number`: the browser drops non-numeric text by value sanitization, not
// validation (`input.value` reads `''` in Chromium), so `noValidate` leaves that
// in place and `required` covers what reaches us.
const TYPE_FORMATS: Record<string, { test: (val: string) => boolean; expected: string }> = {
  email: {
    // `multiple` is not a constraint, so it never reaches here and a
    // comma-separated list fails. A `multiple` input needs a custom `validator`.
    test: (val) => VALID_EMAIL.test(val),
    expected: 'a valid email address'
  },
  url: {
    // A url input requires an absolute URL: what `new URL()` parses without a
    // base, so `example.com` fails in both. Not `URL.canParse`, which would
    // raise the browser baseline to Chrome 120 / Safari 17.
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

// `type` is free-form, so a bare lookup would find an inherited member for
// `'constructor'` or `'toString'`, pass the `!format`/`!scale` guard, and throw
// on use. Takes `unknown` so callers can pass a constraint's raw value.
function safeLookup<T>(table: Record<string, T>, key: unknown): T | undefined {
  return typeof key === 'string' && Object.hasOwn(table, key) ? table[key] : undefined;
}

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 604_800_000;

// The spec's "valid floating-point number". Stricter than `Number()`, which
// also accepts `5.`, `0x10`, `Infinity` and ` 5 `.
const VALID_FLOAT = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/;

function parseSpecNumber(val: string): number | undefined {
  if (!VALID_FLOAT.test(val)) return undefined;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// Not `Date.UTC`: it maps years 0–99 onto 1900–1999 and rolls overflow over
// (`Date.UTC(2026, 1, 30)` is March 2nd). Reading the parts back rejects both.
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

// Months since January 1970, per spec, so `step={3}` means quarterly, not
// every 90-ish days.
function parseMonth(val: string): number | undefined {
  const parts = MONTH_RE.exec(val);
  if (!parts) return undefined;
  const year = Number(parts[1]);
  const month = Number(parts[2]);
  if (year < 1 || month < 1 || month > 12) return undefined;
  return (year - 1970) * 12 + (month - 1);
}

// ISO 8601: weeks start on Monday, and week 1 contains January 4th. Counting
// from January 1st misnumbers every year that starts Friday to Sunday.
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

// Per input type, what one `step` unit is and where counting starts: `step={1}`
// is one day on a date, one month on a month, one second on a time.
type StepScale = {
  // The spec's "convert a string to a number" for this type. Strict, since an
  // unparseable value skips the step check (see `step.validate`).
  toNumber: (val: string) => number | undefined;
  // What one unit of `step` is worth in the units `toNumber` returns.
  scaleFactor: number;
  // Used when `step` is present but not a positive number, per spec.
  defaultStep: number;
  // Where the ladder starts when `min` does not move it.
  defaultBase: number;
  // The error message's noun for a step. Absent only for `number`, which counts
  // in its own units; `toComparableValue` relies on that to spot date/time types.
  unit?: string;
};

// Not `range`: its value sanitization snaps to the nearest step, so
// `stepMismatch` is unreachable (`stepMismatch.chromium.ts`: 7 against `step=5`
// reads back as 5). A check here would flag a value the slider cannot hold.
const STEP_SCALES: Record<string, StepScale> = {
  number: { toNumber: parseSpecNumber, scaleFactor: 1, defaultStep: 1, defaultBase: 0 },
  date: { toNumber: parseDate, scaleFactor: MS_PER_DAY, defaultStep: 1, defaultBase: 0, unit: 'days' },
  month: { toNumber: parseMonth, scaleFactor: 1, defaultStep: 1, defaultBase: 0, unit: 'months' },
  week: {
    toNumber: parseWeek,
    scaleFactor: MS_PER_WEEK,
    defaultStep: 1,
    // The spec's week base: Monday 1969-12-29, three days before the Thursday
    // epoch, so steps land on week boundaries.
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

// The caller's step in the field's own units (a date's `step={7}` is 7), or
// `undefined` if not a positive number. Shared so `step.message` shows the
// amount validation used, including for a numeric string like `step='5'`.
function parseStepAmount(step: unknown): number | undefined {
  const parsed =
    typeof step === 'number' ? step : typeof step === 'string' ? parseSpecNumber(step.trim()) : undefined;
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

// The allowed value step, in the units `StepScale.toNumber` returns, or
// `undefined` when the spec says there is no step to check.
function resolveAllowedStep(step: unknown, scale: StepScale): number | undefined {
  // `'any'` is the spec's opt-out, and the only value that disables the check.
  if (typeof step === 'string' && step.trim().toLowerCase() === 'any') return undefined;

  // Per spec, any other invalid step falls back to the default step: `step={0}`
  // on a number input still rejects 1.5.
  const stepValue = parseStepAmount(step) ?? scale.defaultStep;
  return stepValue * scale.scaleFactor;
}

// Where the ladder starts: `min={1} step={2}` allows 1, 3, 5.
//
// Unlike a browser, a missing `min` does not fall back to the `value`
// attribute: the same constraint would then accept different values depending
// on the field's initial value, and `defaultValue` is not a rendered attribute
// anyway. `min` is the explicit anchor.
function resolveStepBase(min: unknown, scale: StepScale): number {
  if (typeof min === 'number' && Number.isFinite(min)) return min;
  // A date/time `min` is a DOM string ('2026-01-01'), converted like the value.
  if (typeof min === 'string' && min !== '') {
    const parsed = scale.toNumber(min);
    if (parsed !== undefined) return parsed;
  }
  return scale.defaultBase;
}

// `min`/`max` and the value go through one converter, so `min='2026-01-01'`
// means to validation what it means to a date input. A date/time type compares
// only DOM strings: browsers ignore a numeric date bound, and so does this.
// Every other type compares as a number.
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

// Not `(value - base) % step === 0`: in binary floating point 0.3 / 0.1 is
// 2.9999999999999996, so `step={0.1}` would reject 0.30. Chromium checks in
// decimal; scaling every operand to integers by the most decimal places among
// them matches it for any realistic form value.
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

  // Past 2^53 integers are inexact, so use a tolerance and err toward valid: a
  // validator that cannot establish a violation must not invent one.
  const ratio = (value - base) / step;
  return Math.abs(ratio - Math.round(ratio)) < 1e-9;
}

export const constraintConfigs: ConstraintConfigs = {
  match: {
    validate: <M extends object>(val: unknown, matchFieldName: unknown, formState: FormState<M>) => {
      if (typeof matchFieldName !== 'string') return true;
      const name = matchFieldName as FieldPath<M>;
      if (!formState.hasFieldBeenInitialized(name)) return true;
      return val === formState.getFieldValue(name);
    },
    message: <M extends object>(fieldName: string, matchFieldName: unknown, formState: FormState<M>) => {
      const matchLabel =
        (typeof matchFieldName === 'string' && formState.getField(matchFieldName as FieldPath<M>)?.label) ||
        String(matchFieldName);
      return `"${fieldName}" does not match "${matchLabel}"`;
    }
  },

  // Emptiness is `required`'s concern: every constraint but `match` passes an
  // empty value, so an optional field stays valid until filled. `false` counts
  // as empty, since it is an unchecked required checkbox.
  required: {
    validate: (val) => (Array.isArray(val) ? val.length > 0 : val != null && val !== '' && val !== false),
    message: (fieldName) => `"${fieldName}" is required`
  },

  pattern: {
    validate: (val, pattern) => {
      if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) return false;
      if (val === undefined || val === null || val === '') return true;
      // An object, array or File has no text to test; skip it rather than test
      // "[object Object]".
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

  // The browser's `stepMismatch`, which `noValidate` turns off.
  //
  // Unlike a browser, an absent `step` is not checked: a bare number input's
  // default step of 1 would reject 19.99 in every price field that never opted
  // in. Writing `step` opts in; `step='any'` renders the attribute unchecked.
  step: {
    validate: (val, step, _formState, siblings) => {
      const scale = safeLookup(STEP_SCALES, siblings.type);
      // Types without a step (text, email, checkbox…) ignore it, as in a browser.
      if (!scale) return true;

      const allowedStep = resolveAllowedStep(step, scale);
      if (allowedStep === undefined) return true;

      if (val === undefined || val === null || val === '') return true;

      // A number is already in the scale's units (a custom `parse` made it); a
      // string is a DOM value to convert.
      const value = typeof val === 'number' ? val : typeof val === 'string' ? scale.toNumber(val) : undefined;
      // An unparseable value is not a mismatch: the browser's sanitization drops
      // it before validity runs, and an error here would fire on every keystroke
      // of a half-typed date.
      if (value === undefined || !Number.isFinite(value)) return true;

      return isStepAligned(value, resolveStepBase(siblings.min, scale), allowedStep);
    },
    message: (fieldName, step, _formState, siblings) => {
      const scale = safeLookup(STEP_SCALES, siblings.type);
      const amount = parseStepAmount(step) ?? scale?.defaultStep ?? 1;
      return `"${fieldName}" must be in increments of ${amount}${scale?.unit ? ` ${scale.unit}` : ''}`;
    }
  },

  // The browser's email and url format checks, which `noValidate` turns off.
  type: {
    validate: (val, type) => {
      const format = safeLookup(TYPE_FORMATS, type);
      if (!format) return true;
      if (val === undefined || val === null || val === '') return true;
      // No text to check; see `pattern`.
      if (typeof val !== 'string' && typeof val !== 'number') return true;
      return format.test(String(val));
    },
    message: (fieldName, type) => {
      const format = safeLookup(TYPE_FORMATS, type);
      // validate() never fails an unknown type, but `message` is public
      // ConstraintConfig API and callable on its own.
      return `"${fieldName}" must be ${format?.expected ?? 'valid'}`;
    }
  }
} as const;

export const constraintNames = Object.keys(constraintConfigs) as ConstraintName[];
