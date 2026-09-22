import { For, type JSX } from 'solid-js';

import { type ScopedFieldComponents, createScopedFields } from '../createScopedFields';
import { type FieldArrayHelpers, useFieldArray } from '../hooks/useFieldArray';
import styles from './FieldArray.module.css';

export interface FieldArrayProps<Item extends object> {
  name: string;
  defaultValue?: readonly Item[];
  /** Extra class on each row's wrapper element, alongside the stable `sf-field-array-row` hook. */
  rowClass?: string;
  /**
   * Called once, synchronously, with this array's helpers (`append`,
   * `remove`, `move`, …) — the same pattern as a DOM `ref` callback. Use it
   * to wire an "add" control of your own outside the rendered rows.
   */
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
 * Each row renders inside its own grouping element with its own flex/gap
 * layout (see `FieldArray.module.css`'s `.row`).
 *
 * Like `useFieldArray`, must be rendered from a component inside
 * `<Form>`/`<FormContextProvider>` — a child, not the component that itself
 * renders `<Form>`.
 */
export function FieldArray<Item extends object>(props: FieldArrayProps<Item>): JSX.Element {
  const [items, itemsArray] = useFieldArray<Item>(props.name, props.defaultValue ?? []);
  props.helpersRef?.(itemsArray);

  const rowClassName = () =>
    ['sf-field-array-row', styles.row, props.rowClass ?? ''].filter(Boolean).join(' ');

  return (
    <For each={items()}>
      {(item, index) => {
        const fields = createScopedFields<Item>(itemsArray.pathAt(index));
        return (
          <div class={rowClassName()}>
            {props.children(fields, item.defaultValue, () => itemsArray.remove(index()))}
          </div>
        );
      }}
    </For>
  );
}
