// A process-global registry tagging rendered field/form elements with their
// component name (e.g. "InputField", "SubmitButton"). Lives in `state`
// because it's the one dependency shared by `form` (reads names to classify
// children) and `fields` (writes them). `Symbol.for(...)` keys it so every
// copy of the library on the page resolves to the same WeakMap.
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
