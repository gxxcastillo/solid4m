import { describe, expect, it } from 'vitest';

import { setComponentName } from '@gxxc/solid-forms-state';

import { classifyBaseFormChildren } from './BaseForm';

function component(name: string) {
  // Tag the element via the shared registry, exactly as createField does in
  // production — names are no longer carried on a `.componentName` property.
  const el = {};
  setComponentName(el, name);
  return el;
}

const componentNameRegistryKey = Symbol.for('@gxxc/solid-forms/component-name-registry');

describe('classifyBaseFormChildren', () => {
  it('classifies fields, buttons, links, and other children without mutating during render', () => {
    const field = component('InputField');
    const button = component('SubmitButton');
    const link = component('Link');
    const text = 'extra content';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = classifyBaseFormChildren([field, button, link, text] as any);

    expect(result.bodyChildren).toEqual([
      { child: field, wrap: false },
      { child: text, wrap: true }
    ]);
    expect(result.formButtons).toEqual([button]);
    expect(result.footerLinks).toEqual([link]);
  });

  it('does not wrap a *Group component, matching *Field treatment', () => {
    const group = component('RadioGroup');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = classifyBaseFormChildren([group] as any);

    expect(result.bodyChildren).toEqual([{ child: group, wrap: false }]);
  });

  it('reads component names from the shared registry', () => {
    const field = {};
    const registry = new WeakMap<object, string>();
    registry.set(field, 'InputField');
    (globalThis as unknown as Record<symbol, WeakMap<object, string>>)[componentNameRegistryKey] = registry;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = classifyBaseFormChildren([field] as any);

    expect(result.bodyChildren).toEqual([{ child: field, wrap: false }]);
  });
});
