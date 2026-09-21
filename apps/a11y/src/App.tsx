import { Match, Switch } from 'solid-js';

import { FieldPaletteForm, LineItemsForm, LoginForm, SignupForm, UserSettingsForm } from '@gxxc/solid4m-examples';

import './App.css';
import { resolveFixtureRoute } from './routes';

// An `onSubmit` that never settles on its own, opted into with `?hold=1`. The
// in-flight state is otherwise unobservable from a test: every fixture form
// defaults to a synchronous no-op handler, so `isProcessing` goes true and back
// to false inside one tick and there is no window in which to assert what the
// submit button does while a submit is pending. `window.releaseHeldSubmit()`
// ends it, so the settled state is assertable too.
declare global {
  interface Window {
    releaseHeldSubmit?: () => void;
  }
}

function createHeldSubmit() {
  return () =>
    new Promise<void>((resolve) => {
      window.releaseHeldSubmit = resolve;
    });
}

export function App() {
  const route = resolveFixtureRoute(window.location.pathname);
  const onSubmit = new URLSearchParams(window.location.search).has('hold') ? createHeldSubmit() : undefined;

  return (
    <main class='fixture' data-sf-theme={route.theme}>
      <div class='fixture__inner'>
        <header class='fixture__header'>
          <p class='fixture__eyebrow'>{route.theme} theme</p>
          <h1 class='fixture__title'>{route.heading}</h1>
        </header>

        <section class='fixture__form' aria-labelledby='fixture-form-title'>
          <h2 class='fixture__formTitle' id='fixture-form-title'>
            {route.title}
          </h2>

          <Switch>
            <Match when={route.form === 'signup'}>
              <SignupForm actionsClass='fixture__actions' />
            </Match>
            <Match when={route.form === 'login'}>
              <LoginForm onSubmit={onSubmit} />
            </Match>
            <Match when={route.form === 'lineItems'}>
              <LineItemsForm />
            </Match>
            <Match when={route.form === 'settings'}>
              <UserSettingsForm />
            </Match>
            <Match when={route.form === 'palette'}>
              <FieldPaletteForm />
            </Match>
          </Switch>
        </section>
      </div>
    </main>
  );
}

export default App;
