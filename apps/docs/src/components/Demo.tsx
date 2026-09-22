import { type Component, Show } from 'solid-js';

import { type FieldValueMapping, FormContextProvider, useForm } from 'solid4m';
// Pins `data-sf-theme='minimal'`, so the frame brings its own theme rather
// than relying on the page to import it. No import needed for the structural
// CSS or default tokens: the docs alias `solid4m` to its source, whose
// components import their own styles.
import 'solid4m/themes/minimal.css';

import {
  ContactForm,
  DateParseForm,
  DraftPublishForm,
  ErrorVisibilityForm,
  FieldPaletteForm,
  LineItemsForm,
  LoadedProfileForm,
  TeamRosterForm
} from '@gxxc/solid4m-examples';

import styles from './Demo.module.css';
import { FormStateInspector } from './FormStateInspector';

// Guide pages embed a demo by key rather than importing the example directly,
// so every demo gets the same frame and the same optional state inspector
// without each page repeating the wiring.
const DEMOS: Record<string, Component> = {
  contact: ContactForm,
  dateParse: DateParseForm,
  draftPublish: DraftPublishForm,
  errorVisibility: ErrorVisibilityForm,
  fieldPalette: FieldPaletteForm,
  lineItems: LineItemsForm,
  loadedProfile: LoadedProfileForm,
  teamRoster: TeamRosterForm
};

interface DemoProps {
  demo: keyof typeof DEMOS;
  title?: string;
  // Renders a live view of the form's state beside it. The example reuses the
  // store provided here (the same pattern ThemeShowcase uses) instead of
  // creating its own, so the inspector reads the state the form is actually
  // using.
  inspect?: boolean;
}

export function Demo(props: DemoProps) {
  const form = useForm<FieldValueMapping>();
  const Example = DEMOS[props.demo];

  return (
    <section class={`${styles.demo} not-content`} data-sf-theme='minimal'>
      <div class={props.inspect ? styles.layoutInspect : styles.layout}>
        <div class={styles.card}>
          <Show when={props.title}>
            <h2 class={styles.cardTitle}>{props.title}</h2>
          </Show>
          <FormContextProvider store={form.store}>
            <Example />
          </FormContextProvider>
        </div>

        <Show when={props.inspect}>
          <FormStateInspector state={form.state} />
        </Show>
      </div>
    </section>
  );
}

export default Demo;
