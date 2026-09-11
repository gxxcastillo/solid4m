export function splitFieldPath(name: string): string[] {
  return name.split('.');
}

export type FieldPathLookup = { found: boolean; value: unknown };

const unsafePathSegments = new Set(['__proto__', 'constructor', 'prototype']);

function hasUnsafePathSegment(segments: readonly string[]): boolean {
  return segments.some((segment) => unsafePathSegments.has(segment));
}

export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

export function setOwnEnumerableProperty(target: Record<string, unknown>, name: string, value: unknown) {
  Object.defineProperty(target, name, {
    configurable: true,
    enumerable: true,
    value,
    writable: true
  });
}

// Reads a dotted path out of a nested object/array. Returns `found: false`
// (not just `value: undefined`) so callers can distinguish "path doesn't
// exist" from "path exists and is explicitly undefined", the same
// distinction `Object.hasOwn` gives a flat lookup.
export function getValueAtFieldPath(source: unknown, name: string): FieldPathLookup {
  if (!isObjectLike(source)) {
    return { found: false, value: undefined };
  }

  if (Object.hasOwn(source, name)) {
    return { found: true, value: source[name] };
  }

  const segments = splitFieldPath(name);
  if (segments.length < 2 || hasUnsafePathSegment(segments)) {
    return { found: false, value: undefined };
  }

  let current: unknown = source;

  for (const segment of segments) {
    if (!isObjectLike(current) || !Object.hasOwn(current, segment)) {
      return { found: false, value: undefined };
    }
    current = current[segment];
  }

  return { found: true, value: current };
}

// Inverse of getValueAtFieldPath: scatters flat (name, value) entries into a
// nested object, building an array instead of an object at any level whose
// *next* path segment is a bare integer (e.g. "items.0.title" creates
// `items: []`). A single-segment name is a no-op passthrough —
// buildObjectFromFieldEntries([["email", "x"]]) === { email: "x" }.
export function buildObjectFromFieldEntries(
  entries: ReadonlyArray<readonly [name: string, value: unknown]>
): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const [name, value] of entries) {
    const segments = splitFieldPath(name);

    if (segments.length < 2 || hasUnsafePathSegment(segments)) {
      setOwnEnumerableProperty(root, name, value);
      continue;
    }

    let target: Record<string, unknown> = root;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      const nextIsArrayIndex = /^\d+$/.test(segments[i + 1]);
      const current = Object.hasOwn(target, segment) ? target[segment] : undefined;

      if (isObjectLike(current)) {
        target = current;
        continue;
      }

      const next = nextIsArrayIndex ? [] : {};
      setOwnEnumerableProperty(target, segment, next);
      target = next;
    }

    setOwnEnumerableProperty(target, segments[segments.length - 1], value);
  }

  return root;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Re-addresses one field array's items after an add/remove/move/insert/swap:
// given a field's current name and the array's own field name, checks
// whether the name is `${arrayName}.<index>` (optionally followed by more
// path, e.g. `items.2.tags.0`), and if so re-splices in `shift(index)` in
// place of the index. `shift` returning `null` signals the field should be
// removed (its item was deleted); a name that isn't part of this array at
// all (no match) passes through unchanged. `arrayName` is regex-escaped
// before matching so a nested array's own name (e.g. `"a.b"`) can't
// accidentally match an unrelated field like `"axb.0"`.
export function shiftFieldArrayIndex(
  name: string,
  arrayName: string,
  shift: (index: number) => number | null
): string | null {
  const match = name.match(new RegExp(`^${escapeRegExp(arrayName)}\\.(\\d+)(\\..*)?$`));
  if (!match) return name;

  const nextIndex = shift(Number(match[1]));
  if (nextIndex === null) return null;

  return `${arrayName}.${nextIndex}${match[2] ?? ''}`;
}
