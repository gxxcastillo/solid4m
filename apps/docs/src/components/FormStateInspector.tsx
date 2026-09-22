import { For, type JSX, Show, createMemo } from 'solid-js';

import type { FormState } from 'solid4m';

import styles from './FormStateInspector.module.css';

interface FormStateInspectorProps<M extends object> {
  title?: string;
  state: FormState<M>;
}

function formatValue(value: unknown): string {
  if (value === undefined) return '-';
  if (value === '') return '""';
  return JSON.stringify(value);
}

// Fields from one FieldArray row share a `<name>.<index>.` prefix (e.g.
// items.0.description, items.0.quantity); grouping on it boxes a row's
// fields together instead of listing each as an unrelated entry.
function fieldGroupKey(name: string): string {
  return name.match(/^(.+\.\d+)\./)?.[1] ?? name;
}

export function FormStateInspector<M extends object>(props: FormStateInspectorProps<M>): JSX.Element {
  const groups = createMemo(() => {
    const order: string[] = [];
    const byKey = new Map<string, typeof props.state.fields>();

    for (const field of props.state.fields) {
      const key = fieldGroupKey(field.name);
      const existing = byKey.get(key);
      if (existing) {
        existing.push(field);
      } else {
        byKey.set(key, [field]);
        order.push(key);
      }
    }

    return order.map((key) => ({ key, fields: byKey.get(key)! }));
  });

  return (
    <div class={styles.panel}>
      <h3 class={styles.heading}>{props.title ?? 'Form state'}</h3>

      <div class={styles.summary}>
        <span class={props.state.isFormValid ? styles.badgeGood : styles.badgeBad}>
          {props.state.isFormValid ? 'Valid' : 'Invalid'}
        </span>
        <span class={styles.badge}>{props.state.haveValuesChanged ? 'Changed' : 'Unchanged'}</span>
        <Show when={props.state.isProcessing}>
          <span class={styles.badge}>Processing...</span>
        </Show>
      </div>

      <Show when={props.state.fields.length} fallback={<p class={styles.empty}>No fields registered yet.</p>}>
        <dl class={styles.fields}>
          <For each={groups()}>
            {(group) => (
              <div class={styles.fieldGroup}>
                <For each={group.fields}>
                  {(field) => (
                    <div class={styles.fieldEntry}>
                      <dt class={styles.fieldName}>{field.label ?? field.name}</dt>
                      <dd class={styles.fieldValue}>{formatValue(field.value)}</dd>
                      <dd class={styles.fieldMeta}>
                        <span class={field.hasChanged ? styles.tagOn : styles.tagOff}>changed</span>
                        <span class={field.hasBeenBlurred ? styles.tagOn : styles.tagOff}>blurred</span>
                        <span class={field.errors.length ? styles.tagOff : styles.tagOn}>valid</span>
                      </dd>
                      <Show when={(field.hasBeenValid || field.hasBeenBlurred) && field.errors.length}>
                        <dd class={styles.fieldErrors}>
                          <ul class={styles.errors}>
                            <For each={field.errors}>{(err) => <li>{err}</li>}</For>
                          </ul>
                        </dd>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </dl>
      </Show>
    </div>
  );
}

export default FormStateInspector;
