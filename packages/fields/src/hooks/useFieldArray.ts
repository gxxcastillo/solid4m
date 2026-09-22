import { type Accessor, batch, createSignal, createUniqueId } from 'solid-js';

import { shiftFieldArrayIndex, useFormContext } from '@gxxc/solid4m-state';

export type FieldArrayItem<T> = {
  /**
   * Stable identity for `<For>` keying. Never derived from index and never
   * reused, so a row's component instance (and its focus, cursor, and
   * in-progress edits) survives when other rows are added, removed, or
   * reordered.
   */
  readonly key: string;
  /**
   * This row's initial value, used to seed its fields on first mount (like
   * any field's `defaultValue`). Not the live value — that lives in the form
   * store, addressed like any other field.
   */
  readonly defaultValue: T;
};

export type FieldArrayHelpers<T> = {
  append: (value: T) => void;
  prepend: (value: T) => void;
  insert: (index: number, value: T) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  swap: (a: number, b: number) => void;
  /**
   * This row's field-name base path (e.g. `'items.2'`), derived from its
   * (reactive) index. Pair with `createScopedFields` to address a row's
   * fields without re-typing this array's own `name`.
   */
  pathAt: (index: Accessor<number>) => Accessor<string>;
};

function moveIndex(index: number, from: number, to: number): number {
  if (index === from) return to;
  if (from < to) return index > from && index <= to ? index - 1 : index;
  return index >= to && index < from ? index + 1 : index;
}

/**
 * Backs a repeating form section (line items, address lists) addressed by
 * `${name}.<index>.*` field names. Owns only the list of stable identity
 * tokens driving rendering — field values live in the form store exactly
 * like every other field, addressed by index-based path.
 *
 * add/remove/move/insert/swap re-address every affected field's underlying
 * store record (via `remapFieldNames`/`shiftFieldArrayIndex`) in the same
 * `batch()` as the item-list update, before Solid re-renders shifted rows
 * with their new index — so a shifted row's live component instance never
 * remounts, and its value/focus/touched state carries over untouched.
 *
 * Like any field, must be called from a component rendered *inside*
 * `<Form>`/`<FormContextProvider>` — a child, not the component that itself
 * renders `<Form>`. Calling it at the top of a component that returns
 * `<Form>{...}</Form>` runs it before that `<Form>`'s context exists.
 */
export function useFieldArray<T = unknown>(
  name: string,
  defaultValue: readonly T[] = []
): [Accessor<FieldArrayItem<T>[]>, FieldArrayHelpers<T>] {
  const [, formStateMutations] = useFormContext();

  const [items, setItems] = createSignal<FieldArrayItem<T>[]>(
    defaultValue.map((value) => ({ key: createUniqueId(), defaultValue: value }))
  );

  const remap = (shift: (index: number) => number | null) =>
    formStateMutations.remapFieldNames((fieldName) => shiftFieldArrayIndex(fieldName, name, shift));

  const helpers: FieldArrayHelpers<T> = {
    append: (value) => {
      // Nothing existing shifts when adding at the end, so no remap is needed.
      setItems((current) => [...current, { key: createUniqueId(), defaultValue: value }]);
    },

    prepend: (value) => helpers.insert(0, value),

    insert: (index, value) => {
      batch(() => {
        remap((i) => (i >= index ? i + 1 : i));
        setItems((current) => [
          ...current.slice(0, index),
          { key: createUniqueId(), defaultValue: value },
          ...current.slice(index)
        ]);
      });
    },

    remove: (index) => {
      batch(() => {
        remap((i) => (i === index ? null : i > index ? i - 1 : i));
        setItems((current) => current.filter((_, i) => i !== index));
      });
    },

    move: (from, to) => {
      if (from === to) return;
      batch(() => {
        remap((i) => moveIndex(i, from, to));
        setItems((current) => {
          const next = [...current];
          const [moved] = next.splice(from, 1);
          next.splice(to, 0, moved);
          return next;
        });
      });
    },

    swap: (a, b) => {
      if (a === b) return;
      batch(() => {
        remap((i) => (i === a ? b : i === b ? a : i));
        setItems((current) => {
          const next = [...current];
          [next[a], next[b]] = [next[b], next[a]];
          return next;
        });
      });
    },

    pathAt: (index) => () => `${name}.${index()}`
  };

  return [items, helpers];
}
