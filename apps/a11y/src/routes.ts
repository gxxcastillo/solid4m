export const fixtureThemes = [
  { id: 'minimal', label: 'Minimal' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'neobrutalist', label: 'Neobrutalist' }
] as const;

export const fixtureForms = [
  { id: 'login', label: 'Login', title: 'Log in' },
  { id: 'signup', label: 'Signup', title: 'Create your account' },
  // Repeating rows are the most a11y-hazardous UI the library renders — fields
  // are inserted and removed dynamically and are addressed by generated
  // `items.<index>.*` names — so the FieldArray example carries its own routes.
  { id: 'lineItems', label: 'Line items', title: 'Line items' },
  { id: 'settings', label: 'Settings', title: 'User settings' },
  // Every field in the palette, including a multiple select — whose selection
  // behavior differs between happy-dom and a real browser, so only this
  // harness can check it.
  { id: 'palette', label: 'Field palette', title: 'Workshop registration' }
] as const;

export type FixtureTheme = (typeof fixtureThemes)[number]['id'];
export type FixtureForm = (typeof fixtureForms)[number]['id'];

export interface FixtureRoute {
  path: `/${FixtureTheme}/${FixtureForm}`;
  theme: FixtureTheme;
  form: FixtureForm;
  heading: string;
  title: string;
}

export const fixtureRoutes = fixtureThemes.flatMap((theme) =>
  fixtureForms.map((form) => ({
    path: `/${theme.id}/${form.id}` as const,
    theme: theme.id,
    form: form.id,
    heading: `${theme.label} ${form.label}`,
    title: form.title
  }))
);

export const defaultRoute = fixtureRoutes[0];

export function resolveFixtureRoute(pathname: string): FixtureRoute {
  const normalized = pathname.replace(/\/$/, '') || defaultRoute.path;
  return fixtureRoutes.find((route) => route.path === normalized) ?? defaultRoute;
}
