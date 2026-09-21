import { type Accessor, type JSX, mergeProps } from 'solid-js';
import { type StringKeyOf } from 'type-fest';

import { type ErrorMessages, type FormField, type FormState } from '@gxxc/solid4m-state';

import { InputField, type InputFieldProps } from './InputField/InputField';
import { PasswordField, type PasswordFieldProps } from './PasswordField/PasswordField';

// Any field prop shape this wrapper knows how to re-scope: `name` always
// (the field's own registered path), and `match` when present — a sibling
// field's bare name, read by the `match` validation constraint, which needs
// the same base-path prefix or it resolves against the top-level form
// instead of the current row.
type RuntimeFormState = FormState<Record<string, unknown>>;
type RuntimeField = FormField<Record<string, unknown>, string>;
type ScopedValidator<Item extends object> = (
  fieldName: StringKeyOf<Item>,
  fieldValue: unknown,
  formState: FormState<Item>,
  setFieldErrors: (errors: ErrorMessages) => void
) => void;
type ScopedFormStateCallback<Item extends object> = (value: unknown, formState?: FormState<Item>) => boolean;

type ScopableProps<Item extends object> = {
  name: string;
  match?: string;
  validator?: ScopedValidator<Item>;
  showLabel?: ScopedFormStateCallback<Item>;
  showIcon?: ScopedFormStateCallback<Item>;
};

function joinPath(basePath: string, name: string) {
  if (!basePath || name.startsWith(`${basePath}.`)) return name;
  return `${basePath}.${name}`;
}

function isInScope(basePath: string, name: string) {
  return !basePath || name.startsWith(`${basePath}.`);
}

function unscopedName(basePath: string, name: string) {
  if (!basePath) return name;
  return name.startsWith(`${basePath}.`) ? name.slice(basePath.length + 1) : name;
}

function scopedField<Item extends object>(basePath: string, field: RuntimeField) {
  return mergeProps(field, {
    get name() {
      return unscopedName(basePath, field.name) as StringKeyOf<Item>;
    }
  }) as FormField<Item, StringKeyOf<Item>>;
}

function scopedFormState<Item extends object>(base: Accessor<string>, formState: RuntimeFormState) {
  const runtimeName = (name: string) => joinPath(base(), name);

  return mergeProps(formState, {
    get fields() {
      const basePath = base();
      return formState.fields
        .filter((field) => isInScope(basePath, field.name))
        .map((field) => scopedField<Item>(basePath, field));
    },
    get haveValuesChanged() {
      const basePath = base();
      return formState.fields.some((field) => isInScope(basePath, field.name) && field.hasChanged);
    },
    get isFormValid() {
      const basePath = base();
      return !formState.fields.some((field) => isInScope(basePath, field.name) && !!field.errors?.length);
    },
    isFieldValid<N extends StringKeyOf<Item>>(name: N) {
      return formState.isFieldValid(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    },
    getField<N extends StringKeyOf<Item>>(name: N) {
      const basePath = base();
      const field = formState.getField(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
      return field ? (scopedField<Item>(basePath, field) as FormField<Item, N>) : undefined;
    },
    getFieldValue<N extends StringKeyOf<Item>>(name: N) {
      return formState.getFieldValue(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    },
    getFieldErrors<N extends StringKeyOf<Item>>(name: N) {
      return formState.getFieldErrors(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    },
    hasFieldBeenInitialized<N extends StringKeyOf<Item>>(name: N) {
      return formState.hasFieldBeenInitialized(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    },
    hasFieldBeenValid<N extends StringKeyOf<Item>>(name: N) {
      return formState.hasFieldBeenValid(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    },
    hasFieldChanged<N extends StringKeyOf<Item>>(name: N) {
      return formState.hasFieldChanged(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    },
    hasFieldBlurred<N extends StringKeyOf<Item>>(name: N) {
      return formState.hasFieldBlurred(runtimeName(name) as StringKeyOf<Record<string, unknown>>);
    }
  }) as FormState<Item>;
}

function scoped<Item extends object, P extends ScopableProps<Item>>(base: Accessor<string>, props: P): P {
  return mergeProps(props, {
    get name() {
      return joinPath(base(), props.name);
    },
    get match() {
      return props.match === undefined ? undefined : joinPath(base(), props.match);
    },
    get validator() {
      const validator = props.validator;
      if (!validator) return undefined;

      return (
        _fieldName: string,
        fieldValue: unknown,
        formState: RuntimeFormState,
        setFieldErrors: (errors: ErrorMessages) => void
      ) => {
        validator(
          props.name as StringKeyOf<Item>,
          fieldValue,
          scopedFormState<Item>(base, formState),
          setFieldErrors
        );
      };
    },
    get showLabel() {
      const showLabel = props.showLabel;
      if (!showLabel) return undefined;

      return (value: unknown, formState?: RuntimeFormState) =>
        showLabel(value, formState ? scopedFormState<Item>(base, formState) : undefined);
    },
    get showIcon() {
      const showIcon = props.showIcon;
      if (!showIcon) return undefined;

      return (value: unknown, formState?: RuntimeFormState) =>
        showIcon(value, formState ? scopedFormState<Item>(base, formState) : undefined);
    }
  }) as P;
}

// Wraps a field component so every instance it renders registers under
// `${base()}.<name>` instead of `<name>` directly. `base` is read reactively
// (not captured once) so a useFieldArray row that shifts index on
// remove/insert/move keeps addressing wherever it currently lives, the same
// way createFormField already reads `props.name` live rather than at mount.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withBasePath<Item extends object>(Component: (props: any) => JSX.Element, base: Accessor<string>) {
  return (props: ScopableProps<Item> & Record<string, unknown>) => (
    <Component {...scoped<Item, typeof props>(base, props)} />
  );
}

export type ScopedFieldComponents<Item extends object> = {
  InputField: <N extends StringKeyOf<Item> = StringKeyOf<Item>>(
    props: InputFieldProps<Item, N>
  ) => JSX.Element;
  PasswordField: <N extends StringKeyOf<Item> = StringKeyOf<Item>>(
    props: PasswordFieldProps<Item, N>
  ) => JSX.Element;
};

/**
 * Like `createFields<M>()`, but every component it returns addresses its
 * fields under `${base()}.<name>` instead of `<name>` — used by
 * `<FieldArray>` so a row's fields type-check against the row's own item
 * type (not the whole form) while still landing at the right
 * `items.<index>.*` path at runtime. `match` is rewritten the same way as
 * `name`, so a `PasswordField`'s `match='password'` resolves against its
 * own row's password field, not a sibling row's or the top-level form's.
 *
 * Only InputField and PasswordField are wrapped so far — TextAreaField and
 * CheckboxField would follow the same pattern once this shape is exercised
 * for real.
 */
export function createScopedFields<Item extends object>(base: Accessor<string>): ScopedFieldComponents<Item> {
  return {
    InputField: withBasePath<Item>(InputField, base),
    PasswordField: withBasePath<Item>(PasswordField, base)
  } as ScopedFieldComponents<Item>;
}
