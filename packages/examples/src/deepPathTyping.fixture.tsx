import {
  InputField,
  type StandardSchemaV1,
  type StandardSchemaV1Types,
  createFields,
  createForm
} from 'solid4m';

// Compile-only regression fixture for deep-path field-name typing (dotted
// object paths, array-index paths): a nested name infers the value type at
// that path with no cast, and a typo'd nested name is a compile error, both
// on the raw <InputField<M, N>> form and through createFields<M>() and a
// schema-inferred createForm.

interface LineItem {
  title: string;
  quantity: number;
}

interface OrderValues {
  customer: { email: string; name: string };
  items: LineItem[];
  // Optional on purpose: FieldPathImpl must unwrap `undefined` before testing
  // `extends object`, or an optional nested value falls back to a bare `K`
  // (no dotted continuation) even though it nests fine at runtime once set.
  billing?: { email: string };
}

export function NestedObjectPath() {
  // No cast: `customer.email` infers `string` from OrderValues['customer']['email'].
  return <InputField<OrderValues, 'customer.email'> name='customer.email' defaultValue='a@b.com' />;
}

export function ArrayIndexPath() {
  // No cast: `items.0.title` infers `string` from LineItem['title'].
  return <InputField<OrderValues, 'items.0.title'> name='items.0.title' defaultValue='widget' />;
}

export function WrongValueTypeAtPath() {
  // @ts-expect-error `items.0.quantity` is a number, not a string
  return <InputField<OrderValues, 'items.0.quantity'> name='items.0.quantity' defaultValue='nope' />;
}

export function TypoedNestedPath() {
  // @ts-expect-error `titel` is not a real path on OrderValues
  return <InputField<OrderValues, 'items.0.titel'> name='items.0.titel' />;
}

export function OptionalNestedObjectPath() {
  // No cast: an optional nested object (`billing?`) still types its own
  // nested paths, not just its own top-level key.
  return <InputField<OrderValues, 'billing.email'> name='billing.email' defaultValue='a@b.com' />;
}

const { InputField: TypedInput } = createFields<OrderValues>();

export function NestedPathThroughCreateFields() {
  // No <M, N>: createFields<OrderValues>() already binds M, and N infers
  // from the literal `name` the same way a flat field name always has.
  return <TypedInput name='items.0.title' defaultValue='widget' />;
}

export function TypoedNestedPathThroughCreateFields() {
  // @ts-expect-error createFields-bound components reject a bad nested path too
  return <TypedInput name='items.0.titel' defaultValue='widget' />;
}

const orderSchema = {
  '~standard': {
    version: 1,
    vendor: 'fixture',
    validate: (value: unknown) => ({ value: value as OrderValues }),
    types: undefined as unknown as StandardSchemaV1Types<OrderValues, OrderValues>
  }
} satisfies StandardSchemaV1<OrderValues, OrderValues>;

const orderForm = createForm({ schema: orderSchema });

export function NestedPathThroughSchemaInferredForm() {
  return (
    <orderForm.Form
      onSubmit={(values) => {
        void values.items[0]?.title.toUpperCase();
      }}
    >
      {/* Schema-inferred M composes with deep-path typing the same way an
          explicit <M> does — no cast on the nested name here either. */}
      <orderForm.InputField name='items.0.title' defaultValue='widget' />
    </orderForm.Form>
  );
}
