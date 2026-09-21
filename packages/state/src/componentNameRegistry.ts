// A process-global registry that tags rendered field/form elements with their
// component name (e.g. "InputField", "SubmitButton"). It lives here in the state
// package because it is the only dependency shared by both the `form` package
// (which reads names to classify children) and the `fields` package (which
// writes them). Keyed off a `Symbol.for(...)` so every copy of the library on
// the page resolves to the same WeakMap.
const componentNameRegistryKey = Symbol.for('solid4m/component-name-registry');

type ComponentNameRegistry = WeakMap<object, string>;

function getRegistry(): ComponentNameRegistry {
  const registryGlobal = globalThis as unknown as Record<symbol, ComponentNameRegistry | undefined>;
  registryGlobal[componentNameRegistryKey] ??= new WeakMap<object, string>();
  return registryGlobal[componentNameRegistryKey];
}

export function setComponentName(el: object, name: string) {
  getRegistry().set(el, name);
}

export function getComponentName(el: object): string | undefined {
  return getRegistry().get(el);
}
