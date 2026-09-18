import { For, Show, createSignal, onCleanup, onMount } from 'solid-js';

import { FormContextProvider, useForm } from 'solid-formation';
import {
  LineItemsForm,
  type LineItemsValues,
  LoginForm,
  type LoginValues,
  SignupForm,
  type SignupValues,
  UserSettingsForm,
  type UserSettingsValues
} from '@gxxc/solid-formation-examples';

import { FormStateInspector } from './FormStateInspector';
import styles from './ThemeShowcase.module.css';

const THEMES = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'neobrutalist', label: 'Neobrutalist' }
] as const;

const SECTIONS = [
  { id: 'signup', label: 'Signup' },
  { id: 'login', label: 'Login' },
  { id: 'settings', label: 'User settings' },
  { id: 'lineItems', label: 'Line items' }
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

const SUBMIT_DELAY_MS = 1200;

function sectionFromHash(hash: string): SectionId | undefined {
  const id = hash.replace(/^#/, '');
  return SECTIONS.find((s) => s.id === id)?.id;
}

export function ThemeShowcase() {
  const [theme, setTheme] = createSignal<(typeof THEMES)[number]['id']>('minimal');
  const [section, setSection] = createSignal<SectionId>('signup');

  const signupForm = useForm<SignupValues, void>();
  const loginForm = useForm<LoginValues, void>();
  const settingsForm = useForm<UserSettingsValues, void>();
  const lineItemsForm = useForm<LineItemsValues, void>();

  const [isLoading, setIsLoading] = createSignal(false);
  const [failNextSubmit, setFailNextSubmit] = createSignal(false);

  // Every handler here used to be a synchronous no-op, which made most of the
  // form's own states unreachable from the demo: `isProcessing` went true and
  // false inside a single tick, so the inspector's Processing badge could never
  // light up and none of the in-flight treatment — the button spinner, the
  // aria-disabled state, focus staying put, the polite "Submitting..."
  // announcement — was ever visible on the page that exists to show it.
  //
  // The delay is the demo. It is short enough not to be tedious and long enough
  // to read.
  async function onSimulatedSubmit() {
    await new Promise((resolve) => {
      window.setTimeout(resolve, SUBMIT_DELAY_MS);
    });

    if (failNextSubmit()) {
      // Reset first so this is genuinely "the *next* submit", and a retry
      // succeeds — that also demonstrates BaseForm clearing form-level errors at
      // the start of each attempt.
      setFailNextSubmit(false);
      // BaseForm catches this and routes the message into form.state.errors,
      // which is the only way to see the assertive form-level live region.
      throw new Error('That did not work. Please try again.');
    }
  }

  onMount(() => {
    const fromHash = sectionFromHash(window.location.hash);
    if (fromHash) setSection(fromHash);

    const onHashChange = () => {
      setSection(sectionFromHash(window.location.hash) ?? SECTIONS[0].id);
    };
    window.addEventListener('hashchange', onHashChange);
    onCleanup(() => window.removeEventListener('hashchange', onHashChange));
  });

  function selectSection(id: SectionId) {
    setSection(id);
    window.location.hash = id;
  }

  return (
    <section class={`${styles.showcase} not-content`} data-sf-theme={theme()}>
      <div class={styles.switcher} role='group' aria-label='Theme'>
        <For each={THEMES}>
          {(t) => (
            <button
              type='button'
              class={theme() === t.id ? `${styles.switchBtn} ${styles.switchBtnActive}` : styles.switchBtn}
              aria-pressed={theme() === t.id}
              onClick={() => setTheme(t.id)}
            >
              {t.label}
            </button>
          )}
        </For>
      </div>

      <div class={styles.tabs} role='group' aria-label='Demo'>
        <For each={SECTIONS}>
          {(s) => (
            <button
              type='button'
              class={section() === s.id ? `${styles.tabBtn} ${styles.tabBtnActive}` : styles.tabBtn}
              aria-pressed={section() === s.id}
              onClick={() => selectSection(s.id)}
            >
              {s.label}
            </button>
          )}
        </For>
      </div>

      {/*
        The states you cannot reach by typing into the form. Everything else the
        inspector reports — valid/invalid, changed, and now processing — happens
        by interacting normally; these two do not, so they would otherwise be
        undemonstrable on the page whose job is demonstrating them.

        Both drive the documented consumer channel rather than the store behind
        it: `isLoading` is forwarded to <Form isLoading> by each example form,
        and the failure is thrown from onSubmit exactly as a real handler would
        throw. `isProcessing` needs no control at all now that submitting is
        genuinely async.
      */}
      <fieldset class={styles.simulate}>
        <legend class={styles.simulateLegend}>Simulate</legend>

        <label class={styles.simulateOption}>
          <input type='checkbox' checked={isLoading()} onChange={(e) => setIsLoading(e.currentTarget.checked)} />
          Loading
          <span class={styles.simulateHint}>disables every registered field</span>
        </label>

        <label class={styles.simulateOption}>
          <input
            type='checkbox'
            checked={failNextSubmit()}
            onChange={(e) => setFailNextSubmit(e.currentTarget.checked)}
          />
          Next submit fails
          <span class={styles.simulateHint}>rejects once, into the form-level error region</span>
        </label>
      </fieldset>

      <Show when={section() === 'signup'}>
        <div class={styles.layout}>
          <div class={styles.card}>
            <h2 class={styles.cardTitle}>Create your account</h2>
            <FormContextProvider store={signupForm.store}>
              <SignupForm onSubmit={onSimulatedSubmit} isLoading={isLoading()} actionsClass={styles.buttonRow} />
            </FormContextProvider>
          </div>

          <FormStateInspector title='Signup form state' state={signupForm.state} />
        </div>
      </Show>

      <Show when={section() === 'login'}>
        <div class={styles.layout}>
          <div class={styles.card}>
            <h2 class={styles.cardTitle}>Log in</h2>
            <FormContextProvider store={loginForm.store}>
              <LoginForm onSubmit={onSimulatedSubmit} isLoading={isLoading()} />
            </FormContextProvider>
          </div>

          <FormStateInspector title='Login form state' state={loginForm.state} />
        </div>
      </Show>

      <Show when={section() === 'settings'}>
        <div class={styles.layout}>
          <div class={styles.card}>
            <h2 class={styles.cardTitle}>User settings</h2>
            <FormContextProvider store={settingsForm.store}>
              <UserSettingsForm onSubmit={onSimulatedSubmit} isLoading={isLoading()} />
            </FormContextProvider>
          </div>

          <FormStateInspector title='User settings form state' state={settingsForm.state} />
        </div>
      </Show>

      <Show when={section() === 'lineItems'}>
        <div class={styles.layout}>
          <div class={styles.card}>
            <h2 class={styles.cardTitle}>Line items</h2>
            <FormContextProvider store={lineItemsForm.store}>
              <LineItemsForm onSubmit={onSimulatedSubmit} isLoading={isLoading()} />
            </FormContextProvider>
          </div>

          <FormStateInspector title='Line items form state' state={lineItemsForm.state} />
        </div>
      </Show>
    </section>
  );
}

export default ThemeShowcase;
