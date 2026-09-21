import { For, type JSX } from 'solid-js';

import { createScopedFields, type ScopedFieldComponents } from '../createScopedFields';
import { type FieldArrayHelpers, useFieldArray } from '../hooks/useFieldArray';
import styles from './FieldArray.module.css';

export interface FieldArrayProps<Item extends object> {
  name: string;
  defaultValue?: readonly Item[];
  // Composed onto each row's own grouping element (alongside the stable
  // `sf-field-array-row` hook and the module class giving the row its own
  // flex/gap layout), the same way `className` composes onto `<form>` itself.
  rowClass?: string;
  // Called once, synchronously, with this array's helpers — the same
  // pattern as a DOM `ref` callback. Lets a caller wire an "add" affordance
  // of its own choosing (label, placement, seed value) outside this
  // component's own children, since `append`'s seed value is a caller
  // decision `<FieldArray>` has no way to guess.
  helpersRef?: (helpers: FieldArrayHelpers<Item>) => void;
  children: (fields: ScopedFieldComponents<Item>, item: Item, remove: () => void) => JSX.Element;
}

/**
 * Renders one row per item in a `useFieldArray`-backed list, handing each
 * row's render function pre-scoped field components (typed against `Item`,
 * addressed under `${name}.<index>` at runtime) instead of requiring the
 * caller to hand-template field names or thread `useFieldArray` and
 * `createScopedFields` together itself.
 *
 * Each row is wrapped in its own grouping element with its own flex/gap
 * layout — `.form`'s own flex/gap only reaches its direct children, so
 * without a row-local layout a row's fields would fall back to plain block
 * stacking instead. The row's internal gap (`--sf-field-array-row-gap`) is
 * intentionally tighter than `.form`'s own (`--sf-field-gap`), so a row's
 * fields read as one group via proximity, distinct from the wider gap
 * between one row and the next.
 *
 * Like `useFieldArray`, must be rendered from a component inside
 * `<Form>`/`<FormContextProvider>` — a child, not the component that itself
 * renders `<Form>`.
 */
export function FieldArray<Item extends object>(props: FieldArrayProps<Item>): JSX.Element {
  const [items, itemsArray] = useFieldArray<Item>(props.name, props.defaultValue ?? []);
  props.helpersRef?.(itemsArray);

  const rowClassName = () => ['sf-field-array-row', styles.row, props.rowClass ?? ''].filter(Boolean).join(' ');

  return (
    <For each={items()}>
      {(item, index) => {
        const fields = createScopedFields<Item>(itemsArray.pathAt(index));
        return (
          <div class={rowClassName()}>{props.children(fields, item.defaultValue, () => itemsArray.remove(index()))}</div>
        );
      }}
    </For>
  );
}
